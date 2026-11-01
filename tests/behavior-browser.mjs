import assert from 'node:assert/strict';import {writeFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
try{
 const p=await browser.newPage({viewport:{width:1800,height:1200}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const roster=Array.from({length:25},(_,i)=>({id:i?'worker-'+i:'lead',name:i?'伙伴'+i:'伦导',role:i?'employee':'lead',state:i%2?'working':'idle',task:'今天也在认真营业',avatar:'cat-grey'}));
 await p.route('**/config.json',r=>r.fulfill({json:{statusUrl:'/behavior-fixture',pollIntervalMs:1000,offlineAfterMinutes:60}}));await p.route('**/behavior-fixture?*',r=>r.fulfill({json:{agents:roster}}));
 await p.goto((process.env.OFFICE_URL||'http://127.0.0.1:8770')+'/app/');await p.waitForFunction(()=>window.officeDebug?.getCats().length===25);await p.evaluate(()=>officeDebug.setView({target:[4,1,7],viewAngle:.3,viewHeight:25,camRadius:43,zoom:1}));await mkdir('docs',{recursive:true});await p.screenshot({path:'docs/shot_lead.png'});
 const start=Date.now();let previous=start,personMs=0,awayMs=0,allMs=0,allAwayMs=0,maxAway=0,maxAllAway=0,maxClimb=0,samples=0,actions=new Set(),neighborConflicts=0;
 while(Date.now()-start<300000){await p.waitForTimeout(1000);const now=Date.now(),dt=now-previous;previous=now;const snapshot=await p.evaluate(()=>({stats:officeDebug.behaviorStats(),cats:officeDebug.getCats(),fps:officeDebug.fps}));const crew=snapshot.stats.filter(c=>c.role!=='lead');const away=crew.filter(c=>c.away).length,allAway=snapshot.stats.filter(c=>c.away).length,climb=crew.filter(c=>c.activity==='climb'&&c.leisure).length;personMs+=crew.length*dt;awayMs+=away*dt;allMs+=snapshot.stats.length*dt;allAwayMs+=allAway*dt;maxAway=Math.max(maxAway,away);maxAllAway=Math.max(maxAllAway,allAway);maxClimb=Math.max(maxClimb,climb);samples++;crew.forEach(c=>{if(c.action)actions.add(c.action);});
 for(let i=0;i<crew.length;i++)for(let j=i+1;j<crew.length;j++){const a=crew[i],b=crew[j],pa=snapshot.cats.find(c=>c.id===a.id).desk,pb=snapshot.cats.find(c=>c.id===b.id).desk;if(!a.away&&!b.away&&a.action&&a.action===b.action&&Math.hypot(pa[0]-pb[0],pa[1]-pb[1])<6.4)neighborConflicts++;}
 if(samples%30===0)console.log(JSON.stringify({seconds:Math.round((now-start)/1000),awayRatio:awayMs/personMs,maxAway,maxClimb,fps:snapshot.fps}));
 assert.ok(away<=5,`crew away ${away}`);assert.ok(climb<=1);
 }
 const report={wallSeconds:(Date.now()-start)/1000,cats:25,crew:24,samples,crewAwayRatio:awayMs/personMs,allAwayRatio:allAwayMs/allMs,maxCrewAway:maxAway,maxAllAway,maxClimbing:maxClimb,actions:[...actions],neighborConflicts,errors};await writeFile('docs/behavior-qa.json',JSON.stringify(report,null,2));assert.deepEqual(errors,[]);assert.equal(neighborConflicts,0);assert.equal(actions.size,10);assert.ok(report.crewAwayRatio>=.15&&report.crewAwayRatio<=.23);console.log(JSON.stringify(report));
 roster[1].state='need_you';roster[1].task='需要审批';await p.waitForFunction(()=>officeDebug.behaviorStats().find(c=>c.role==='lead').leadTrip==='pat',null,{timeout:120000});report.leaderComfortVisit=true;await writeFile('docs/behavior-qa.json',JSON.stringify(report,null,2));console.log('Leader comfort visit passed');
}finally{await browser.close();}

// Browser and assertions completed; do not retain driver housekeeping handles.
process.exit(0);
