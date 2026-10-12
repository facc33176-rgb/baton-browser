// A private X display and loopback-only VNC server for the shared browser.
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const net=require('node:net');
let state,pending;
function stop(){if(state){state.vnc?.kill();state.x?.kill();fs.rmSync(state.dir,{recursive:true,force:true});state=null;}}
function deadline(p,ms,label){let t;return Promise.race([p,new Promise((_,reject)=>{t=setTimeout(()=>reject(Error(label)),ms);})]).finally(()=>clearTimeout(t));}
async function start(){
 if(state?.ready)return state;
 if(pending)return pending;
 pending=(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'baton-desktop-'));fs.chmodSync(dir,0o700);
  state={dir};
  try{
   const x=state.x=spawn('Xvfb',['-displayfd','3','-screen','0','1280x960x24','-nolisten','tcp'],{stdio:['ignore','ignore','ignore','pipe']});
   const display=await deadline(new Promise((resolve,reject)=>{let s='';x.on('error',reject);x.once('exit',()=>reject(Error('虚拟屏幕未能启动')));x.stdio[3].on('data',b=>{s+=b;if(s.includes('\n'))resolve(':'+s.trim());});}),8000,'虚拟屏幕启动超时');
   state.display=display;
   // Local Unix socket in a mode-0700 directory; no TCP VNC listener.
   state.socket=path.join(dir,'vnc.sock');
   const vnc=state.vnc=spawn('x11vnc',['-display',display,'-unixsock',state.socket,'-rfbport','0','-no6','-forever','-shared','-nopw','-noxdamage','-quiet'],{stdio:['ignore','ignore','ignore']});
   await deadline(new Promise((resolve,reject)=>{const poll=setInterval(()=>{if(fs.existsSync(state?.socket||'')){clearInterval(poll);resolve();}},50);vnc.once('error',e=>{clearInterval(poll);reject(e);});vnc.once('exit',()=>{clearInterval(poll);reject(Error('远程桌面未能启动'));});setTimeout(()=>clearInterval(poll),8000).unref();}),8000,'远程桌面启动超时');
   state.ready=true;return state;
  }catch(e){stop();throw e;}
 })().finally(()=>{pending=null;});return pending;
}
function attach(server,active){
 const {WebSocketServer}=require('ws');
 const wss=new WebSocketServer({noServer:true,maxPayload:1024*1024,handleProtocols:()=> 'binary'});
 server.on('upgrade',(req,socket,head)=>{
  if(req.url!=='/api/desktop'){socket.destroy();return;}
  const protocols=(req.headers['sec-websocket-protocol']||'').split(',').map(s=>s.trim());
  const token=protocols.find(s=>s.startsWith('baton-'))?.slice(6);
  let origin;try{origin=new URL(req.headers.origin).host;}catch{}
  const h=active();
  if(!h||!token||token!==h.id||!state?.ready||origin!==req.headers.host||h.socket){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>{
   h.socket=ws;
   const tcp=net.createConnection(state.socket);
   const expiry=setTimeout(()=>ws.close(1000,'接管已结束'),Math.max(1,h.expires-Date.now()));
   const cleanup=()=>{clearTimeout(expiry);tcp.destroy();if(h.socket===ws)h.socket=null;};
   ws.on('message',(data,binary)=>{if(active()!==h){ws.close();return;}if(!binary){ws.close(1003);return;}tcp.write(data);if(tcp.writableLength>2*1024*1024)ws.close(1009);});
   tcp.on('data',data=>{if(ws.readyState===1){ws.send(data);if(ws.bufferedAmount>4*1024*1024)ws.close(1009);}});
   tcp.on('error',()=>ws.close(1011,'桌面连接中断'));tcp.on('close',()=>ws.close());
   ws.on('close',cleanup);ws.on('error',cleanup);
  });
 });
 server.on('close',()=>wss.close());
}
process.once('exit',stop);
module.exports={start,stop,attach};
