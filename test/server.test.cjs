const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {createApp}=require('../src/server.cjs');
const token='test-token-not-a-real-secret-123456789';
test('requires a strong operator token',()=>assert.throws(()=>createApp({token:'short'}),/24/));
test('authentication, same-origin guard, takeover errors and native images',async t=>{
 const calls=[];
 const browser={run:async body=>{calls.push(body);return {ok:true,content:[{type:'image',data:'AA==',mimeType:'image/png'}]};},control:async()=>{throw Error('Already controlled by a human');}};
 const server=http.createServer(createApp({token,browser}));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const url=`http://127.0.0.1:${server.address().port}`;
 const post=(route,headers={},body={})=>fetch(url+route,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 assert.equal((await post('/api/browser')).status,401);assert.equal(calls.length,0);
 assert.equal((await post('/api/browser',{Authorization:'Bearer wrong'})).status,401);
 assert.equal((await post('/api/browser',{Authorization:'Bearer '+token,Origin:'https://other.example'})).status,403);assert.equal(calls.length,0);
 const response=await post('/api/browser',{Authorization:'Bearer '+token},{tool:'take_screenshot',arguments:{pageId:1}});
 assert.equal(response.status,200);assert.equal((await response.json()).content[0].type,'image');assert.equal(calls.length,1);
 assert.equal((await post('/api/control',{Authorization:'Bearer '+token},{action:'start',pageId:1})).status,409);
 const page=await fetch(url);assert.equal(page.status,200);assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'none'/);
 assert.equal((await fetch(url+'/.env')).status,404);
});
test('VNC rejects unauthenticated upgrades before starting a desktop',async t=>{
 const server=http.createServer((req,res)=>res.end());require('../src/desktop.cjs').attach(server,()=>null);
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const {WebSocket}=require('ws');
 const ws=new WebSocket(`ws://127.0.0.1:${server.address().port}/api/desktop`,['binary','baton-wrong'],{origin:`http://127.0.0.1:${server.address().port}`});
 const status=await new Promise((resolve,reject)=>{ws.once('unexpected-response',(req,res)=>{resolve(res.statusCode);res.resume();ws.terminate();});ws.once('error',()=>{});setTimeout(()=>reject(Error('Upgrade did not finish')),3000).unref();});
 assert.equal(status,403);
});
