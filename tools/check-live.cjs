// Local disposable fixture only. Never opens a real account or submits outside localhost.
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const http=require('node:http');const crypto=require('node:crypto');
async function main(){
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'baton-check-'));process.env.BATON_DATA_DIR=data;
 const browser=require('../src/browser.cjs');const {createApp}=require('../src/server.cjs');
 const token=crypto.randomBytes(32).toString('hex');
 const fixture=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><title>Baton local test</title><h1>Local test account</h1><input id="message" aria-label="Test message"><button onclick="document.cookie=\'baton_fixture=ok; Max-Age=3600; Path=/\'">Test login</button>');});
 const service=http.createServer(createApp({token,browser}));browser.attach(service);
 let mobile,mcp;
 try{
  await Promise.all([new Promise(r=>fixture.listen(0,'127.0.0.1',r)),new Promise(r=>service.listen(0,'127.0.0.1',r))]);
  const target=`http://127.0.0.1:${fixture.address().port}`,base=`http://127.0.0.1:${service.address().port}`;
  const {Client}=await import('@modelcontextprotocol/sdk/client/index.js');const {StdioClientTransport}=await import('@modelcontextprotocol/sdk/client/stdio.js');
  mcp=new Client({name:'baton-check',version:'0.1.0'});await mcp.connect(new StdioClientTransport({command:process.execPath,args:[path.resolve(__dirname,'../src/mcp.cjs')],env:{...process.env,BATON_URL:base,BATON_TOKEN:token},stderr:'pipe'}));
  const tools=await mcp.listTools();assert.ok(tools.tools.some(t=>t.name==='request_takeover'));console.log('PASS MCP handshake and tool listing');
  const opened=await mcp.callTool({name:'new_page',arguments:{url:target}});assert.ok(!opened.isError);const raw=opened.content.filter(x=>x.type==='text').map(x=>x.text).join('\n');const id=Number(raw.match(/^(\d+):.*\[selected\]/m)[1]);
  const login=await browser.run({tool:'evaluate_script',arguments:{pageId:id,function:"() => { document.querySelector('button').click(); document.querySelector('input').focus(); return document.cookie; }"}});assert.ok(login.ok);console.log('PASS local fixture login');
  const {chromium}=require('playwright');mobile=await chromium.launch({headless:true,executablePath:process.env.BATON_EXECUTABLE,args:process.env.BATON_NO_SANDBOX==='1'?['--no-sandbox']:[]});const p=await mobile.newPage({viewport:{width:390,height:780},deviceScaleFactor:2});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base);await p.locator('#token').fill(token);await p.locator('#connect').click();await p.locator('#list button').filter({hasText:'Local test'}).first().click();await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('已连接'),{},{timeout:20000});
  assert.equal((await browser.run({tool:'list_pages',arguments:{}})).ok,false);console.log('PASS live desktop connection and assistant pause');
  await p.screenshot({path:process.env.BATON_SCREENSHOT || '/tmp/baton-mobile.png',fullPage:true});
  await p.locator('#text').fill('Baton');await p.locator('#text-form button').click();
  await p.locator('#end').click();await p.locator('#pages').waitFor({state:'visible'});
  const typed=await browser.run({tool:'evaluate_script',arguments:{pageId:id,function:"() => document.querySelector('input').value"}});assert.ok(typed.content.some(x=>x.text?.includes('Baton')));console.log('PASS remote keyboard input');
  const read=await browser.run({tool:'read_pages',arguments:{urls:[target]}});assert.ok(read.ok);console.log('PASS control returned and rendered reading');
  const shot=await mcp.callTool({name:'take_screenshot',arguments:{pageId:id}});assert.ok(!shot.isError);assert.ok(shot.content.some(x=>x.type==='image'));console.log('PASS native MCP screenshot');
  assert.deepEqual(errors,[]);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));console.log('PASS mobile UI, no console errors or horizontal overflow');
  await mcp.close();mcp=null;await browser.close();
  const reopened=await browser.run({tool:'new_page',arguments:{url:target}});assert.ok(reopened.ok);const pid=Number(reopened.content.filter(x=>x.type==='text').map(x=>x.text).join('\n').match(/^(\d+):.*\[selected\]/m)[1]);
  const cookie=await browser.run({tool:'evaluate_script',arguments:{pageId:pid,function:'() => document.cookie'}});assert.ok(cookie.content.some(x=>x.text?.includes('baton_fixture=ok')));console.log('PASS login persisted after browser restart');
 }finally{
  await mcp?.close().catch(()=>{});await mobile?.close().catch(()=>{});await browser.close().catch(()=>{});
  await Promise.all([new Promise(r=>service.close(r)),new Promise(r=>fixture.close(r))]);fs.rmSync(data,{recursive:true,force:true});
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
