import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public');
const source=fs.readFileSync(path.join(root,'data.js'),'utf8');
const data=JSON.parse(source.replace(/^window\.ACTIVEWAM_DATA\s*=\s*/, '').replace(/;\s*$/, ''));
const references=new Set();
function collect(value){
  if(typeof value==='string'&&value.startsWith('assets/'))references.add(value);
  else if(Array.isArray(value))value.forEach(collect);
  else if(value&&typeof value==='object')Object.values(value).forEach(collect);
}
collect(data);
for(const name of ['index.html','styles.css','app.js']){
  const text=fs.readFileSync(path.join(root,name),'utf8');
  for(const match of text.matchAll(/(?:src|href|data-lightbox)="([^"#]+)"|url\(['"]?([^)'"\s]+)['"]?\)/g)){
    const value=match[1]||match[2];
    if(!/^(?:https?:|data:|#)/.test(value))references.add(value);
  }
}
for(const ref of references){
  const file=path.resolve(root,ref);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).size)throw new Error('Missing or invalid asset: '+ref);
}
if(new Set(data.tasks.map(t=>t.id)).size!==data.tasks.length)throw new Error('Duplicate task ID');
for(const task of data.tasks){
  if(task.frames.length<6)throw new Error('Too few frames: '+task.id);
  for(const f of task.frames){
    if(!f.label||/[\u4e00-\u9fff]/.test(f.label))throw new Error('Missing English label: '+task.id);
    if(f.pose&&(!Number.isFinite(f.pan)||!Number.isFinite(f.tilt)))throw new Error('Pose without measured angles: '+task.id);
  }
}
for(const row of data.results.robotwin)if(row.values.length!==4||row.sd.length!==4)throw new Error('RoboTwin result dimensions');
for(const row of data.results.tavis)if(row.values.length!==12||row.sd.length!==12)throw new Error('TAVIS result dimensions');
if(data.inversion.length!==6||data.inversion.some(f=>f.levels.length!==6))throw new Error('Inversion dimensions');
const font=fs.readFileSync(path.join(root,'assets/fonts/manrope-latin.ttf'));
if(!font.includes(Buffer.from('fvar')))throw new Error('Expected a variable-weight font');
const endpoint=process.argv[2];
if(endpoint){
  const queue=[...references];
  await Promise.all(Array.from({length:8},async()=>{
    while(queue.length){
      const ref=queue.shift();
      const response=await fetch(new URL(ref,endpoint+'/'),{method:'HEAD'});
      if(!response.ok)throw new Error(`HTTP ${response.status}: ${ref}`);
    }
  }));
  const response=await fetch(new URL('assets/hero/real-head-motion.mp4',endpoint+'/'),{headers:{Range:'bytes=0-1023'}});
  if(response.status!==206||(await response.arrayBuffer()).byteLength!==1024)throw new Error('Video range request failed');
}
const files=[];
function walk(folder){for(const item of fs.readdirSync(folder,{withFileTypes:true})){const p=path.join(folder,item.name);if(item.isDirectory())walk(p);else files.push(p);}}
walk(root);
console.log(JSON.stringify({tasks:data.tasks.length,frames:data.tasks.reduce((n,t)=>n+t.frames.length,0),referencedAssets:references.size,packagedFiles:files.length,megabytes:Math.round(files.reduce((n,p)=>n+fs.statSync(p).size,0)/1e6),httpChecked:Boolean(endpoint),status:'PASS'},null,2));
