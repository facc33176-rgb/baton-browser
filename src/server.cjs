const express = require('express');
const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
function createApp({token, browser = require('./browser.cjs')} = {}) {
  if (typeof token !== 'string' || token.length < 24) throw Error('BATON_TOKEN must contain at least 24 characters');
  const app = express();
  app.disable('x-powered-by');
  app.use((req,res,next)=>{res.set('Cache-Control','no-store');res.set('X-Content-Type-Options','nosniff');res.set('Referrer-Policy','no-referrer');res.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");next();});
  app.use('/api', (req,res,next)=>{
    const supplied=Buffer.from(req.headers.authorization || ''), expected=Buffer.from('Bearer '+token);
    if(supplied.length!==expected.length || !crypto.timingSafeEqual(supplied,expected)) return res.status(401).json({ok:false,error:'Unauthorized'});
    if(req.headers.origin){let origin;try{origin=new URL(req.headers.origin).host;}catch{}if(origin!==req.headers.host)return res.status(403).json({ok:false,error:'Origin mismatch'});}
    next();
  });
  app.use(express.json({limit:'64kb'}));
  app.get('/api/health', (req,res)=>res.json({ok:true,version:'0.1.0'}));
  app.post('/api/browser',async(req,res,next)=>{try{res.json(await browser.run(req.body));}catch(e){next(e);}});
  app.post('/api/control',async(req,res)=>{try{res.json(await browser.control(req.body));}catch(e){res.status(409).json({ok:false,error:e.message});}});
  app.use(express.static(path.join(__dirname,'../web'),{dotfiles:'deny',index:'index.html'}));
  app.use((err,req,res,next)=>res.status(err.status || 500).json({ok:false,error:err.status===400?'Invalid JSON':err.message}));
  return app;
}
function start(){
  const browser=require('./browser.cjs'), app=createApp({token:process.env.BATON_TOKEN,browser});
  const server=http.createServer(app);browser.attach(server);
  server.listen(Number(process.env.BATON_PORT || 3210),process.env.BATON_HOST || '127.0.0.1',()=>console.error('Baton listening on',server.address()));
  const stop=()=>{server.close();browser.close().finally(()=>process.exit(0));};
  process.once('SIGTERM',stop);process.once('SIGINT',stop);
  return server;
}
if(require.main===module)start();
module.exports={createApp,start};
