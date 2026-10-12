const {test}=require('node:test');const assert=require('node:assert/strict');const {validate,read}=require('../src/reader.cjs');
test('rejects file URLs, credentials, excessive requests and invalid limits',()=>{
 for(const urls of [['file:///etc/passwd'],['https://user:pass@example.org'],[],Array(4).fill('https://example.org')])assert.throws(()=>validate({urls}));
 assert.throws(()=>validate({urls:['https://example.org'],maxChars:50}));
 assert.equal(validate({urls:['https://example.org','https://example.org/']}).urls.length,1);
});
test('stops at verification and preserves page ID for takeover without retries',async()=>{
 const calls=[];const client={callTool:async req=>{calls.push(req);return {content:[{type:'text',text:req.name==='new_page'?'7: https://example.org [selected]':'```json\n'+JSON.stringify({title:'验证中心',url:'https://example.org/captcha',text:'请完成验证后继续'})+'\n```'}]};}};
 const r=await read(client,{urls:['https://example.org','https://example.net']});assert.equal(r.ok,false);assert.equal(r.pages[0].status,'verification_required');assert.equal(r.pages[0].pageId,7);assert.equal(r.unread.length,1);assert.equal(calls.length,2);
});
test('unknown output format stops instead of operating another page',async()=>{
 let calls=0;const r=await read({callTool:async()=>{calls++;return {content:[{type:'text',text:'unrecognized upstream format'}]};}},{urls:['https://example.org']});assert.equal(r.pages[0].status,'error');assert.equal(r.pages[0].pageId,null);assert.equal(calls,1);
});
