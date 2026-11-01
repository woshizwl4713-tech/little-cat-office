import assert from 'node:assert/strict';import {chromium} from 'playwright';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true});
try{
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/config.json',r=>r.fulfill({json:{statusUrl:'/custom-status',pollIntervalMs:100,offlineAfterMinutes:.01}}));
 let fail=false;
 await p.route('**/custom-status?*',r=>fail?r.abort():r.fulfill({json:{agents:[{id:'transport',name:'测试伙伴',state:'meeting',task:'讨论',updatedAt:new Date().toISOString()}]}}));
 await p.goto((process.env.OFFICE_URL||'http://127.0.0.1:8770')+'/app/');await p.waitForFunction(()=>window.officeDebug?.getCats()[0]?.meeting===true);fail=true;
 await p.waitForFunction(()=>officeDebug.getCats()[0].status==='idle');assert.match(await p.locator('#connection').textContent(),/异常/);
 fail=false;await p.unroute('**/custom-status?*');await p.route('**/custom-status?*',r=>r.fulfill({json:{agents:[{id:'transport',state:'working',updatedAt:new Date().toISOString()}]}}));await p.waitForFunction(()=>officeDebug.getCats()[0].status==='working');
 assert.deepEqual(errors,[]);console.log('Pull, idle expiry during failure, and recovery passed');
}finally{await browser.close();}
