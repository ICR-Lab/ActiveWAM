'use strict';
const data = window.ACTIVEWAM_DATA;
const $ = (selector, scope=document) => scope.querySelector(selector);
const $$ = (selector, scope=document) => [...scope.querySelectorAll(selector)];
Object.entries(window.ACTIVEWAM_LINKS || {}).forEach(([key, resource]) => {
  const link = $(`#project-${key}`);
  if (!link) return;
  const url = resource.url ? new URL(resource.url) : null;
  if (url && url.protocol === 'https:') {
    link.href = url.href;
    link.target = '_blank';
    link.rel = 'noopener';
    link.removeAttribute('aria-disabled');
    link.classList.remove('pending');
  } else {
    link.removeAttribute('href');
    link.setAttribute('aria-disabled', 'true');
    link.classList.add('pending');
  }
  $('.project-link-status', link).textContent = resource.status;
  link.setAttribute('aria-label', `${$('.project-link-copy', link).textContent.trim()} — ${resource.status}`);
});
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
let motionPaused = reduced.matches;
let task = data.tasks.find(t => t.id === 'place_bread_skillet');
let frameIndex = 3;
// Video playback is the primary demo view; keyframes remain available as an explicit toggle.
let viewerMode = 'video';
let domain = 'robotwin';

function setActive(buttons, chosen) {
  buttons.forEach(b => { const active = b === chosen; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
}
function node(tag, className, text) {
  const n=document.createElement(tag); if(className) n.className=className; if(text!==undefined)n.textContent=text; return n;
}

// Playback follows viewport visibility and the user's motion preference.
const ambient = $$('.ambient-video');
const videoVisibility = new WeakMap();
const observer = new IntersectionObserver(entries => {
  entries.forEach(({target,isIntersecting}) => {
    videoVisibility.set(target,isIntersecting);
    if(isIntersecting && !motionPaused && !document.hidden) target.play().catch(()=>{});
    else target.pause();
  });
}, {threshold:.1});
ambient.forEach(v=>observer.observe(v));
function updateMotion() {
  ambient.forEach(v=> {if(motionPaused || !videoVisibility.get(v) || document.hidden) v.pause(); else v.play().catch(()=>{});});
  $('#motion-toggle').setAttribute('aria-pressed',String(motionPaused));
  $('#motion-label').textContent=motionPaused?'Play motion':'Pause motion';
  $('#motion-icon').textContent=motionPaused?'▷':'Ⅱ';
}
$('#motion-toggle').addEventListener('click',()=>{motionPaused=!motionPaused;updateMotion();});
document.addEventListener('visibilitychange',updateMotion);
reduced.addEventListener('change', e=>{motionPaused=e.matches;updateMotion();});
updateMotion();

$('#menu-toggle').addEventListener('click',()=>{
  const open=$('#navigation').classList.toggle('open');
  $('#menu-toggle').setAttribute('aria-expanded',String(open));
  $('#menu-toggle').setAttribute('aria-label',open?'Close navigation':'Open navigation');
});
function closeNavigation(){
  $('#navigation').classList.remove('open');
  $('#menu-toggle').setAttribute('aria-expanded','false');
  $('#menu-toggle').setAttribute('aria-label','Open navigation');
}
$$('#navigation a').forEach(a=>a.addEventListener('click',closeNavigation));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeNavigation();});

function renderTaskOptions() {
  $('#task-select').replaceChildren(...data.tasks.filter(t=>t.group===domain).map(t=>{const n=node('option','',t.title);n.value=t.id;return n;}));
  $('#task-select').value=task.id;
  setActive($$('[data-domain]'),$(`[data-domain="${domain}"]`));
}
function renderFrame() {
  const frame=task.frames[frameIndex];
  if(!frame)return;
  const image=$('#gallery-image'); image.src=frame.image; image.alt=`${task.title}: ${frame.label}, source head-camera RGB`;
  const pose=$('#gallery-pose'); pose.hidden=!frame.pose;
  if(frame.pose){pose.src=frame.pose;pose.alt=`${task.title}, ${frame.label}: source pan ${frame.pan?.toFixed(1)} degrees, tilt ${frame.tilt?.toFixed(1)} degrees`;}
  else pose.removeAttribute('src');
  $('#no-pose').hidden=Boolean(frame.pose);
  $('.pose-live').style.visibility=frame.pose?'visible':'hidden';
  $('#pan-value').textContent=Number.isFinite(frame.pan)?`${frame.pan.toFixed(1)}°`:'—';
  $('#tilt-value').textContent=Number.isFinite(frame.tilt)?`${frame.tilt.toFixed(1)}°`:'—';
  $('#frame-time').textContent=Number.isFinite(frame.time)?`${frame.time.toFixed(2)} s`:'Source keyframe';
  $('#stage-name').textContent=frame.label;
  $('#frame-count').textContent=`${String(frameIndex+1).padStart(2,'0')} / ${String(task.frames.length).padStart(2,'0')}`;
  $('#frame-prev').disabled=frameIndex===0;$('#frame-next').disabled=frameIndex===task.frames.length-1;
  $$('#filmstrip button').forEach((b,i)=>{b.classList.toggle('active',i===frameIndex);b.setAttribute('aria-pressed',String(i===frameIndex));});
}
function setViewerMode(mode) {
  viewerMode=mode;
  $('#keyframe-view').hidden=mode!=='frames';$('#video-view').hidden=mode!=='video';
  setActive([$('#mode-frames'),$('#mode-video')],$(`#mode-${mode}`));
  if(mode==='video'){
    const player=$('#task-video');
    if(player.getAttribute('src')!==task.video){player.src=task.video;player.poster=task.poster;player.load();}
  } else $('#task-video').pause();
}
function renderTask() {
  $('#task-video').pause();
  $('#gallery-domain').textContent=`${task.domain.toUpperCase()} / SOURCE DEMONSTRATION`;
  $('#gallery-title').textContent=task.title;
  $('#gallery-note').textContent=task.note+' Gimbal geometry is schematic; stages are editorial labels.';
  $('#download-sequence').href=task.video;
  $('.video-description').textContent=task.poseAvailable
    ? 'RGB + source-aligned pan/tilt · original playback timing'
    : 'Edited source recording · synchronized head telemetry unavailable';
  const buttons=task.frames.map((f,i)=>{
    const b=node('button');b.type='button';b.setAttribute('aria-label',`Show keyframe ${i+1}: ${f.label}`);
    const img=node('img');img.src=f.image;img.alt='';img.loading='lazy';img.width=160;img.height=120;
    const caption=node('span');caption.append(node('b','',String(i+1).padStart(2,'0')),document.createTextNode(f.label));
    b.append(img,caption);b.addEventListener('click',()=>{frameIndex=i;renderFrame();});return b;
  });
  $('#filmstrip').replaceChildren(...buttons);$('#filmstrip').style.setProperty('--frames',task.frames.length);
  renderFrame();setViewerMode(viewerMode);
}
function chooseTask(id, index=0) {
  const selected=data.tasks.find(t=>t.id===id);if(!selected)return;
  task=selected;domain=task.group;frameIndex=Math.min(index,task.frames.length-1);renderTaskOptions();renderTask();
}
$$('[data-domain]').forEach(b=>b.addEventListener('click',()=>chooseTask(data.tasks.find(t=>t.group===b.dataset.domain).id)));
$('#task-select').addEventListener('change',e=>chooseTask(e.target.value));
$('#frame-prev').addEventListener('click',()=>{frameIndex=Math.max(0,frameIndex-1);renderFrame();});
$('#frame-next').addEventListener('click',()=>{frameIndex=Math.min(task.frames.length-1,frameIndex+1);renderFrame();});
$('#mode-frames').addEventListener('click',()=>setViewerMode('frames'));
$('#mode-video').addEventListener('click',()=>setViewerMode('video'));
$$('[data-open-task]').forEach(a=>a.addEventListener('click',()=>{chooseTask(a.dataset.openTask, a.dataset.openTask==='egg_cooking'?4:2);setViewerMode('video');}));
renderTaskOptions();renderTask();

const methodDetails={
  train:{tag:'TRAINING ONLY',title:'Transform appearance. Preserve task evidence.',copy:'A frozen Wan video prior transforms each camera’s observed history independently. Task-weighted source preservation and temporal-change constraints guide partial inversion. Raw and accepted transformed histories share the same original action and future-video targets.'},
  history:{tag:'OBSERVED EVIDENCE',title:'A history that knows where and when.',copy:'Camera identity, measured pose, relative exposure time, and frame validity accompany each camera’s history tokens. A temporal resampler forms a fixed-size summary. Current RGB retains a fine-detail path for contact and manipulation.'},
  act:{tag:'RAW-HISTORY DEPLOYMENT',title:'Move the head and hands in one trajectory.',copy:'The shared generator predicts bimanual and pan/tilt actions, including stay. Execute a short prefix, acquire new RGB, and recompute context. Future-video prediction is a training signal; deployment requires neither online inversion nor candidate ranking.'}
};
$$('[data-method]').forEach(b=>b.addEventListener('click',()=>{
  setActive($$('[data-method]'),b);const d=methodDetails[b.dataset.method];$('#method-tag').textContent=d.tag;$('#method-title').textContent=d.title;$('#method-copy').textContent=d.copy;
}));

let invStage=4;
function renderInversion(){
  const level=+$('#strength').value;const selected=data.inversion[invStage];
  $('#inversion-raw').src=selected.levels[0];$('#inversion-raw').alt=`Original RGB, ${selected.label}`;
  $('#inversion-processed').src=selected.levels[level];$('#inversion-processed').alt=`Illustrative RGB perturbation, ${selected.label}, visual strength level ${level}`;
  $('#inv-stage-name').textContent=selected.label;$('#inv-level-name').textContent=`Level ${level} / 5`;
  $('#strength-output').value=String(level);$('#strength').setAttribute('aria-valuetext',`Illustrative strength ${level} of 5`);
  $$('#inversion-stages button').forEach((b,i)=>{b.classList.toggle('active',i===invStage);b.setAttribute('aria-pressed',String(i===invStage));});
}
data.inversion.forEach((f,i)=>{const b=node('button','',f.label);b.type='button';b.addEventListener('click',()=>{invStage=i;renderInversion();});$('#inversion-stages').append(b);});
$('#strength').addEventListener('input',renderInversion);renderInversion();
data.inversionExamples.forEach(e=>{
  const f=node('figure');const c=node('figcaption','',e.title);const b=node('button','figure-button');b.dataset.lightbox=e.image;b.dataset.caption=`${e.title} · illustrative appearance study`;b.setAttribute('aria-label',`Enlarge ${e.title} appearance study`);
  const img=node('img');img.src=e.image;img.loading='lazy';img.alt=`${e.title}, RGB history and illustrative appearance study`;b.append(img);f.append(c,b);$('#inversion-examples').append(f);
});

const realRows=[{name:'π₀.₅',values:[10,35,55,100/3]},{name:'Fast-WAM',values:[5,30,35,100*14/60]},{name:'EasyWAM-Unified',values:[5,35,45,100*17/60]},{name:'Without inversion',values:[20,35,55,100*22/60]},{name:'ActiveWAM',values:[35,55,60,50]}];
const benchmarks={
  robotwin:{rows:data.results.robotwin,conditions:['Clean','Appearance shift','Head-pose shift','Compound shift'],initial:3,protocol:'50 tasks · 3 seeds · 100 episodes per task, seed and condition.',source:'Means ± reported sample SD across three seeds; percentages. All methods share the sensor and action interfaces. Full evaluation details are available in the manuscript.',heading:'Success under appearance + head-pose shifts.'},
  tavis:{rows:data.results.tavis,conditions:['Head / GR1T2 · ID','Head / GR1T2 · Spatial','Head / GR1T2 · Pose','Head / Reachy2 · ID','Head / Reachy2 · Spatial','Head / Reachy2 · Pose','Hands / GR1T2 · ID','Hands / GR1T2 · Spatial','Hands / GR1T2 · Pose','Hands / Reachy2 · ID','Hands / Reachy2 · Spatial','Hands / Reachy2 · Pose'],initial:1,protocol:'Native demonstrations and sensors · 3 environment seeds · 96 episodes per task, seed and condition.',source:'Means ± SD across evaluation environment seeds for a fixed checkpoint. The comparison shows methods evaluated under matched conditions; the original author-reported π₀ results are listed separately in the manuscript.',heading:'Active observation under distribution shift.'},
  real:{rows:realRows,conditions:['Cucumber · full task','Egg · full task','Mixture · full task','All tasks · full task'],initial:3,protocol:'20 complete attempts per task · 3 tasks · 60 attempts per method.',source:'Full-task successes out of 20: π₀.₅ 2/7/11; Fast-WAM 1/6/7; EasyWAM-Unified 1/7/9; without inversion 4/7/11; ActiveWAM 7/11/12. Each segment composes two policies with prescribed stage switching; not autonomous execution of an entire recipe.',heading:'Full-task completion in physical kitchen trials.'}
};
let benchmark='robotwin';
function renderResults(){
  const b=benchmarks[benchmark],index=+$('#condition-select').value||0;
  const ours=b.rows.find(r=>r.name.includes('ActiveWAM'));
  const fast=b.rows.find(r=>r.name==='Fast-WAM');
  $('#result-condition').textContent=b.conditions[index].toUpperCase();
  $('#result-value').textContent=ours.values[index].toFixed(1);
  $('#result-heading').textContent=benchmark==='robotwin'?['Success on the clean 50-task suite.','Success under appearance shifts.','Success under head-pose shifts.','Success under appearance + head-pose shifts.'][index]:b.heading;
  $('#result-protocol').textContent=b.protocol;
  const delta=ours.values[index]-fast.values[index];$('#result-delta').textContent=`${delta>=0?'+':''}${delta.toFixed(1)} pp vs. Fast-WAM`;
  const chart=$('#result-chart');chart.replaceChildren();
  b.rows.forEach(r=>{
    const own=r===ours,row=node('div',`chart-row${own?' ours':''}`),track=node('div','bar-track'),bar=node('div','bar-fill');
    row.append(node('span','chart-name',r.name.replace(' (ours)','')));track.append(bar);row.append(track,node('span','chart-score',r.values[index].toFixed(1)));chart.append(row);
    requestAnimationFrame(()=>{bar.style.width=`${r.values[index]}%`;});
  });
  chart.setAttribute('aria-label',`${benchmark}, ${b.conditions[index]}, success rates: ${b.rows.map(r=>`${r.name} ${r.values[index].toFixed(1)} percent`).join('; ')}`);
  $('#table-caption').textContent=`${benchmark==='robotwin'?'RoboTwin-AV':benchmark==='tavis'?'TAVIS':'Real robot'} · success rate (%)${benchmark==='real'?'':' ± SD'}`;
  const tr=node('tr');tr.append(node('th','','Method'));b.conditions.forEach(c=>tr.append(node('th','',c)));$('#results-table thead').replaceChildren(tr);
  $('#results-table tbody').replaceChildren(...b.rows.map(r=>{const tr=node('tr');tr.append(node('td','',r.name));r.values.forEach((v,i)=>tr.append(node('td','',`${v.toFixed(1)}${r.sd?` ± ${r.sd[i].toFixed(1)}`:''}`)));return tr;}));
  $('#table-protocol').textContent=b.source;
}
function selectBenchmark(name){benchmark=name;const b=benchmarks[name];setActive($$('[data-benchmark]'),$(`[data-benchmark="${name}"]`));$('#condition-select').replaceChildren(...b.conditions.map((c,i)=>{const o=node('option','',c);o.value=i;return o;}));$('#condition-select').value=b.initial;renderResults();}
$$('[data-benchmark]').forEach(b=>b.addEventListener('click',()=>selectBenchmark(b.dataset.benchmark)));
$('#condition-select').addEventListener('change',renderResults);selectBenchmark(benchmark);

$('#copy-citation').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText($('#citation').textContent.trim());$('#copy-status').textContent='BibTeX copied.';}
  catch{const selection=window.getSelection(),range=document.createRange();range.selectNodeContents($('#citation'));selection.removeAllRanges();selection.addRange(range);$('#copy-status').textContent='Citation selected. Press Ctrl+C (or Cmd+C) to copy.';}
});
const dialog=$('#figure-dialog');let dialogTrigger;
$$('[data-lightbox]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();dialogTrigger=b;$('#figure-image').src=b.dataset.lightbox;$('#figure-image').alt=b.dataset.caption;$('#figure-caption').textContent=b.dataset.caption;dialog.showModal();}));
$('#close-dialog').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
dialog.addEventListener('close',()=>dialogTrigger?.focus());
