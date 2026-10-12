// Stdio MCP bridge. Never write logs to stdout.
async function main(){
 const {Server}=await import('@modelcontextprotocol/sdk/server/index.js');
 const {StdioServerTransport}=await import('@modelcontextprotocol/sdk/server/stdio.js');
 const {ListToolsRequestSchema,CallToolRequestSchema}=await import('@modelcontextprotocol/sdk/types.js');
 const base=new URL(process.env.BATON_URL || 'http://127.0.0.1:3210');
 if(!process.env.BATON_TOKEN)throw Error('Set BATON_TOKEN');
 const request=async(route,body)=>{
  const res=await fetch(new URL(route,base),{method:'POST',headers:{Authorization:'Bearer '+process.env.BATON_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
  const result=await res.json();if(!res.ok)throw Error(result.error || 'Baton request failed');return result;
 };
 const server=new Server({name:'baton-browser',version:'0.1.0'},{capabilities:{tools:{}}});
 server.setRequestHandler(ListToolsRequestSchema,async()=>{
  const result=await request('/api/browser',{});if(!result.ok)throw Error(result.error);
  return {tools:[...result.tools,{name:'request_takeover',description:'Ask the user to open the takeover page and select this page. Only the user can start or end takeover; do not solve verification challenges yourself.',inputSchema:{type:'object',properties:{pageId:{type:'integer'}},required:['pageId']}}]};
 });
 server.setRequestHandler(CallToolRequestSchema,async req=>{
  try{
   if(req.params.name==='request_takeover')return {content:[{type:'text',text:JSON.stringify({url:base.href,pageId:req.params.arguments?.pageId,instruction:'Open this URL, enter your token, and select the requested page. Return control when finished.'})}]};
   const result=await request('/api/browser',{tool:req.params.name,arguments:req.params.arguments || {}});
   // Standalone screenshots remain MCP image blocks; do not depend on house file markers.
   return {content:result.content || [{type:'text',text:JSON.stringify(result)}],isError:!result.ok};
  }catch(e){return {content:[{type:'text',text:e.message}],isError:true};}
 });
 await server.connect(new StdioServerTransport());
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
