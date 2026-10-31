import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const url=process.env.OFFICE_URL||'http://127.0.0.1:8770';
async function push(state){const r=await fetch(url+'/api/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:'coder',name:'小橘',state,task:state==='working'?'正在写代码':'看我看我！需要审批！',avatar:'cat-orange'})});assert.equal(r.status,200);}
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true});
try{const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await push('working');await p.goto(url+'/app/');await p.waitForFunction(()=>window.officeDebug?.getCats().some(c=>c.id==='coder'));
await p.waitForFunction(()=>officeDebug.getCats().find(c=>c.id==='coder').routeLength===0);await p.locator('[data-agent="coder"]').click();await p.waitForTimeout(3500);await p.locator('#detail button').first().click();await mkdir('docs',{recursive:true});await p.screenshot({path:'docs/sync-working.png'});
await push('need_you');await p.waitForFunction(()=>officeDebug.getCats().find(c=>c.id==='coder').status==='need_you');await p.waitForFunction(()=>officeDebug.getCats().find(c=>c.id==='coder').routeLength===0,null,{timeout:60000});await p.locator('[data-agent="coder"]').click();await p.locator('#detail button').first().click();await p.waitForTimeout(3500);await p.screenshot({path:'docs/sync-need-you.png'});
const before=await p.evaluate(()=>officeDebug.getCats().find(c=>c.id==='coder'));await p.waitForTimeout(250);const after=await p.evaluate(()=>officeDebug.getCats().find(c=>c.id==='coder'));assert.notEqual(before.arm0x,after.arm0x);assert.ok(after.position[0]>16);assert.ok(!after.spriteMode);
for(const mode of ['night','evening','day'])await p.locator(`[data-time="${mode}"]`).click();
const canvas=p.locator('canvas').first(),box=await canvas.boundingBox();await p.mouse.move(box.x+100,box.y+200);await p.mouse.down();await p.mouse.move(box.x+650,box.y+250,{steps:8});await p.mouse.up();assert.ok((await p.evaluate(()=>officeDebug.getCamera())).viewAngle>1.15);await p.click('#reset-view');
await p.click('#add-human');assert.ok(await p.locator('#human-dialog').isVisible());await p.click('#human-cancel');
await p.setViewportSize({width:390,height:844});await p.waitForTimeout(200);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
await writeFile('docs/browser-qa.json',JSON.stringify({passed:['HTTP push working→need_you','arrival at boss door','3D arm motion','day/night','360 camera','human entry','mobile width'],errors},null,2));console.log('Browser checks passed');
}finally{await browser.close();}
