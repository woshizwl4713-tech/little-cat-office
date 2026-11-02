import {isolatedOffice} from './isolated-office.mjs';
const isolated=await isolatedOffice();
import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');const url=isolated.url;
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true});
try{
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 let pollIntervalMs=60000;await p.route('**/config.json',r=>r.fulfill({json:{agents:[{id:'coder',name:'小橘',avatar:'cat-orange'}],statusUrl:'/api/status',pollIntervalMs:pollIntervalMs,staleBecomes:'idle'}}));
 async function push(state){const r=await fetch(url+'/api/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:'coder',state,task:state==='need_you'?'审批一下～':'继续工作～'})});assert.equal(r.status,200);}
 await push('working');await p.goto(url+'/app/');await p.waitForFunction(()=>document.querySelector('#sync-note').textContent.includes('SSE'));
 const beforePos=await p.evaluate(()=>officeDebug.getCats().find(c=>c.id==='coder').position);const start=Date.now();await push('need_you');await p.waitForFunction(()=>officeDebug.getCats().find(c=>c.id==='coder')?.status==='need_you',null,{timeout:2000});await p.waitForFunction(old=>{const c=officeDebug.getCats().find(c=>c.id==='coder');return c.moving&&Math.hypot(c.position[0]-old[0],c.position[2]-old[2])>.005;},beforePos,{timeout:2000});const latency=Date.now()-start;assert.ok(latency<2000);
 await p.reload();await p.waitForFunction(()=>document.querySelector('#sync-note').textContent.includes('SSE'));await push('working');await p.waitForFunction(()=>officeDebug.getCats().find(c=>c.id==='coder')?.status==='working',null,{timeout:2000});pollIntervalMs=1000;await p.route('**/api/events',r=>r.abort());await p.reload();await p.waitForFunction(()=>window.officeDebug?.getCats().find(c=>c.id==='coder')?.status==='working');await push('need_you');await p.waitForFunction(()=>officeDebug.getCats().find(c=>c.id==='coder').status==='need_you',null,{timeout:10000});await p.unroute('**/api/events');await p.waitForFunction(()=>document.querySelector('#sync-note').textContent.includes('SSE'),null,{timeout:5000});assert.deepEqual(errors,[]);
 await writeFile('docs/sse-qa.json',JSON.stringify({latencyMs:latency,pollIntervalMs:60000,checks:['SSE header authenticated in Python integration test','push visible within 2 seconds without polling','fresh stream after page reload','poll fallback during SSE failure','automatic SSE reconnection'],errors},null,2));console.log(`SSE browser latency: ${latency} ms (polling interval 60 seconds)`);
}finally{await browser.close();await isolated.stop();}
