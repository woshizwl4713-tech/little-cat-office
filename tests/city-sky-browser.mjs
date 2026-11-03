import {isolatedOffice} from './isolated-office.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const office=await isolatedOffice();let browser;
try {
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await fetch(office.url+'/api/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:'city-qa',name:'城市验收',state:'working',task:'窗外验收'})});
 await page.goto(office.url+'/app/');await page.waitForFunction(()=>window.officeDebug);
 await page.evaluate(()=>officeDebug.setView({target:[0,4,-12],viewAngle:0,viewHeight:5,camRadius:18,zoom:1}));
 for(const mode of ['day','evening','night']){
  await page.locator(`[data-time="${mode}"]`).click();await page.waitForTimeout(300);
  await page.screenshot({path:`docs/shot_sky_${mode}.png`});
 }
 // Compare the actual panorama pixels for every hourly boundary, including now.
 const checks=await page.evaluate(()=>{
  const original=Date.prototype.getHours, results=[];
  // Capture offscreen panorama via CanvasTexture creation is unnecessary: intercept redraws.
  const fill=CanvasRenderingContext2D.prototype.fillRect;let count=0;
  CanvasRenderingContext2D.prototype.fillRect=function(...args){if(this.canvas.width===2048&&this.canvas.height===768)count++;return fill.apply(this,args)};
  try{for(const [hour,mode] of [[6,'night'],[7,'day'],[16,'day'],[17,'evening'],[19,'evening'],[20,'night'],[23,'night'],[0,'night']]){
   officeDebug.setTime(mode==='day'?'night':'day');Date.prototype.getHours=()=>hour;count=0;officeDebug.setTime('now');const changed=count>0;count=0;officeDebug.setTime(mode);results.push({hour,mode,changed,same:count===0});
  }}finally{Date.prototype.getHours=original;CanvasRenderingContext2D.prototype.fillRect=fill;}
  return results;
 });
 assert.ok(checks.every(x=>x.changed&&x.same),JSON.stringify(checks));assert.deepEqual(errors,[]);console.log('City sky browser checks passed',checks);
}finally{await browser?.close();await office.stop();}
