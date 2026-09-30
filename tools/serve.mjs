import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public');
const port=Number(process.argv[2]||18106);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp4':'video/mp4','.pdf':'application/pdf','.woff2':'font/woff2','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  let requestPath;
  try{requestPath=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}catch{res.writeHead(400);res.end();return;}
  const file=path.resolve(root,`.${requestPath.endsWith('/')?requestPath+'index.html':requestPath}`);
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  let stat;try{stat=fs.statSync(file);if(!stat.isFile())throw new Error('not a file');}catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');return;}
  const headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'};
  const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range||'');
  let start=0,end=stat.size-1,status=200;
  if(req.headers.range){
    if(!match){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return;}
    if(match[1]===''){const suffix=Number(match[2]);start=Math.max(0,stat.size-suffix);}else{start=Number(match[1]);if(match[2])end=Math.min(Number(match[2]),end);}
    if(start>end||start>=stat.size||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return;}
    status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;
  }
  headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(status,headers);
  if(req.method==='HEAD'){res.end();return;}
  const stream=fs.createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
}).listen(port,'127.0.0.1',()=>console.log(`ActiveWAM preview: http://127.0.0.1:${port}`));
