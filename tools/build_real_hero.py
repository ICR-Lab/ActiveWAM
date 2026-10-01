"""Build the real head-motion reel from frame-aligned RGB/encoder exports.

Requires numpy, Pillow and imageio-ffmpeg. Original exports are local research
inputs; only the curated reel and measured angle samples are published.
"""
from pathlib import Path
import csv
import hashlib
import io
import json
import re
import subprocess
from fractions import Fraction

import imageio_ffmpeg
import numpy as np
from PIL import Image

SITE = Path(__file__).resolve().parents[1]
WORK = SITE.parent
DEST = SITE / 'public/assets/hero'
QA = SITE / 'qa/real-head-motion-20261001'
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_source(group, ident):
    folder = WORK / f'outputs/moma_dual_arm_head_pan_tilt_{group}_videos_20260911'
    manifest = json.loads((folder / 'manifest.json').read_text())
    item = next(t for t in manifest['trajectories'] if t['video'] == f'{ident}.mp4')
    video = folder / item['video']
    if digest(video) != item['video_sha256']:
        raise ValueError(f'Source video hash mismatch: {video}')
    csv_path = WORK / f'outputs/moma_dual_arm_head_pan_tilt_trajectories_20260913/{group}/{ident}.csv'
    with csv_path.open(newline='') as stream:
        rows = list(csv.DictReader(stream))
    if len(rows) != item['frame_count']:
        raise ValueError('RGB/telemetry frame-count mismatch')
    if [int(r['frame_index']) for r in rows] != list(range(len(rows))):
        raise ValueError('Non-contiguous source frame indices')
    return video, rows, item, csv_path


def encode(video, ranges, output, fps):
    select = '+'.join(f'between(n\\,{start}\\,{end-1})' for start,end in ranges)
    rate = str(Fraction(fps).limit_denominator(1_000_000))
    # Reindex kept frames at the source rate, avoiding concat's last-frame boundary gap.
    filters = f'select={select},setpts=N/({fps}*TB),setsar=1'
    subprocess.run([FFMPEG, '-v', 'error', '-y', '-i', str(video), '-vf', filters,
                    '-an', '-r', rate, '-c:v', 'libx264', '-crf', '21', '-preset', 'medium',
                    '-pix_fmt', 'yuv420p', '-fps_mode', 'cfr', '-movflags', '+faststart', str(output)], check=True)
    frames, _duration = imageio_ffmpeg.count_frames_and_secs(str(output))
    if frames != sum(b-a for a,b in ranges):
        raise ValueError(f'Unexpected encoded frame count: {frames}')
    info = subprocess.run([FFMPEG, '-hide_banner', '-i', str(output), '-vf', 'showinfo', '-f', 'null', '-'],capture_output=True,text=True,check=True)
    pts = [float(s) for s in re.findall(r'\bn:\s*\d+\s+pts:\s*\d+\s+pts_time:([\d.e+-]+)',info.stderr)]
    if len(pts) != frames or not np.allclose(pts,np.arange(frames)/fps,atol=0.0001,rtol=0):
        raise ValueError('Reel frame timestamps do not match telemetry sampling')
    return frames, frames/fps


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    QA.mkdir(parents=True, exist_ok=True)
    video, rows, source, csv_path = load_source('egg', '1')
    # Cut only the long stationary grasp interval. Both head sweeps remain continuous.
    ranges = [(315, 420), (535, 675)]
    target = DEST / 'real-head-motion.mp4'
    fps = source['encoded_fps']
    count, duration = encode(video, ranges, target, fps)
    indices = [i for a,b in ranges for i in range(a,b)]
    selected = [rows[i] for i in indices]
    samples = [[round(float(r['measured_yaw_deg']),4), round(float(r['measured_pitch_deg']),4)] for r in selected]
    trajectory = {
        'source': 'egg/1', 'fps': fps, 'frameCount': count,
        'playbackRate': 1, 'angleSource': 'measured head encoder; source-frame alignment',
        'sourceFrameIndices': indices, 'samples': samples,
        'segments': [{'sourceStartFrame': a, 'sourceEndFrameExclusive': b,
                      'sourceStartSeconds': a/fps, 'sourceEndSeconds': b/fps} for a,b in ranges],
    }
    (SITE / 'public/hero-motion.js').write_text('window.ACTIVEWAM_HERO_MOTION = '+json.dumps(trajectory,separators=(',',':'))+';\n')
    with (DEST / 'real-head-motion.csv').open('w',newline='') as stream:
        writer=csv.writer(stream)
        writer.writerow(['reel_frame_index','reel_time_s','source_frame_index','source_rgb_log_time_ns','measured_pan_deg','measured_tilt_deg'])
        for i, r in enumerate(selected):
            writer.writerow([i, f'{i/fps:.9f}', r['frame_index'], r['rgb_log_time_ns'], r['measured_yaw_deg'], r['measured_pitch_deg']])
    # Poster uses the first displayed source frame, preventing a view jump on start.
    result=subprocess.run([FFMPEG,'-v','error','-i',str(target),'-frames:v','1','-f','image2pipe','-vcodec','png','-'],capture_output=True,check=True)
    Image.open(io.BytesIO(result.stdout)).convert('RGB').save(DEST/'real-head-motion.webp',quality=92,method=6)
    # Keep an uncut excerpt and an independently measured cucumber alternative for review.
    encode(video,[(315,675)],QA/'egg-1-uncut-head-motion.mp4',fps)
    alt_video, alt_rows, alt_item, alt_csv = load_source('test','1')
    encode(alt_video,[(235,385)],QA/'cucumber-1-head-motion.mp4',alt_item['encoded_fps'])
    angle=np.array(samples)
    receipt={
        **trajectory, 'source_video':str(video), 'source_video_sha256':digest(video),
        'source_csv':str(csv_path), 'source_csv_sha256':digest(csv_path),
        'output_sha256':digest(target), 'duration_seconds':duration,
        'pan_min_max_deg':[float(angle[:,0].min()),float(angle[:,0].max())],
        'tilt_min_max_deg':[float(angle[:,1].min()),float(angle[:,1].max())],
        'processing':'Chronological frame trims and H.264 encoding only; native timing; no crop, zoom, stabilization, synthetic motion, optical flow or interpolation.',
        'omitted_source_frames':[420,535],
        'alternative':{'source':'test/1','source_frames':[235,385],'source_fps':alt_item['encoded_fps'],
            'measured_pan_range':[min(float(r['measured_yaw_deg']) for r in alt_rows[235:385]),max(float(r['measured_yaw_deg']) for r in alt_rows[235:385])]}
    }
    (QA/'selected-reel.json').write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps({k:receipt[k] for k in ['frameCount','duration_seconds','pan_min_max_deg','tilt_min_max_deg','output_sha256']},indent=2))


if __name__ == '__main__':
    main()
