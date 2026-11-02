import {isolatedOffice} from './isolated-office.mjs';
const isolated=await isolatedOffice();
import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true});
try{
 const p=await browser.newPage({viewport:{width:1800,height:1200}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const roster=Array.from({length:24},(_,i)=>({id:`demo-${i}`,name:`伙伴${String(i+1).padStart(2,'0')}`,avatar:['cat-grey','cat-white','cat-orange','cat-calico'][i%4]}));
 let reports={agents:roster.slice(0,21).map((a,i)=>({...a,state:i<2?'need_you':'working',task:i<2?'看我看我！这个方案需要你审批！':'今天也在认真整理很长很长的灵感记录',updatedAt:new Date().toISOString()}))};
 await p.route('**/config.json',r=>r.fulfill({json:{rosterMode:'manual',agents:roster,statusUrl:'/bubble-fixture',pollIntervalMs:250,staleBecomes:'idle',offlineAfterMinutes:5}}));
 await p.route('**/bubble-fixture?*',r=>r.fulfill({json:reports}));
 await p.goto(isolated.url+'/app/');await p.waitForFunction(()=>window.officeDebug?.getCats().length===24);
 await p.evaluate(()=>officeDebug.setView({target:[3,1,8],viewAngle:.30,viewHeight:25,camRadius:43,zoom:1}));
 const pending=await p.evaluate(()=>officeDebug.getState().agents.filter(a=>a.rosterPending));assert.equal(pending.length,3);
 await p.waitForTimeout(1800);
 for(let i=0;i<14;i++){
  const normal=await p.locator('.cat-bubble[data-showing="true"][data-pinned="false"]').count();assert.ok(normal<=3,`normal bubbles ${normal}`);
  assert.equal(await p.locator('.cat-bubble[data-pinned="true"]').count(),2);await p.waitForTimeout(300);
 }
 await p.locator('.cat-label').filter({hasText:'伙伴03'}).hover();await p.waitForTimeout(200);assert.match(await p.locator('#cat-hover-status').textContent(),/很长很长/);await p.mouse.move(1750,1100);
 await p.waitForFunction(()=>officeDebug.getCats().filter(c=>['demo-0','demo-1'].includes(c.id)).every(c=>c.routeLength===0),null,{timeout:60000});
 for(const i of [3,4,5])reports.agents[i].task='灵感来啦，先记下来～';await p.waitForFunction(()=>Array.from(document.querySelectorAll('.cat-bubble[data-showing="true"][data-pinned="false"]')).some(el=>el.textContent.includes('灵感来啦')));await mkdir('docs',{recursive:true});await p.screenshot({path:'docs/shot_bubbles.png'});
 // Fresh task change creates a bubble; normal polling does not keep it alive.
 reports.agents[4].task='新的任务来了';await p.waitForFunction(()=>officeDebug.getState().agents.find(a=>a.id==='demo-4').task==='新的任务来了');
 reports.agents[5].updatedAt='2000-01-01T00:00:00Z';await p.waitForFunction(()=>officeDebug.getCats().find(c=>c.id==='demo-5').status==='idle');
 assert.ok(await p.evaluate(()=>officeDebug.getCats().filter(c=>['demo-21','demo-22','demo-23'].includes(c.id)).every(c=>c.activity===null&&c.routeLength===0)));
 await p.locator('.cat-label').filter({hasText:'伙伴03'}).click();assert.match(await p.locator('#detail').textContent(),/很长很长/);
 assert.deepEqual(errors,[]);await writeFile('docs/bubbles-qa.json',JSON.stringify({cats:24,unreportedSeated:3,pinned:2,maxOrdinary:3,checks:['queue cap across frames','full hover/click text','stale idle remains available to leisure planner','unreported seats','task update','no browser errors'],errors},null,2));console.log('24-cat bubble and roster browser checks passed');
}finally{await browser.close();await isolated.stop();}

// Browser and assertions completed; do not retain driver housekeeping handles.
process.exit(0);
