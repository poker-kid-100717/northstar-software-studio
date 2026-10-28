// Serve the real production Angular bundle; API and Turnstile are test doubles.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root=resolve('dist/northstar/browser');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
createServer(async(req,res)=>{
 try {
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
  if(path!==root && !path.startsWith(root+sep)){res.writeHead(403).end();return;}
  let body,type;
  try{body=await readFile(path);type=types[extname(path)] ?? 'application/octet-stream';}
  catch{body=await readFile(resolve(root,'index.html'));type='text/html';}
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'}).end(body);
 } catch {res.writeHead(500).end();}
}).listen(4173,'127.0.0.1');
