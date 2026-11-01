export const DESK_ACTIONS=['typing','thinking','stretch','tail','coffee','papers','nod','swivel','yawn','tumble'];
// Ten authored samples per continuous clip; endpoints return to the seated pose.
export const CLIPS={
 typing:[0,.8,.15,.9,.2,1,.2,.8,.1,0],thinking:[0,.2,.7,1,1,1,1,.8,.3,0],
 stretch:[0,.15,.5,.85,1,1,.85,.5,.15,0],tail:[0,.7,1,.3,-.7,-1,-.3,.7,.3,0],
 coffee:[0,.1,.5,.9,1,1,.9,.5,.1,0],papers:[0,.2,.7,1,.8,.5,.2,.1,.05,0],
 nod:[0,.3,.8,.1,.7,.1,.6,.1,.2,0],swivel:[0,.4,.8,1,.5,-.5,-1,-.8,-.4,0],
 yawn:[0,.1,.4,.8,1,1,.8,.4,.1,0],tumble:[0,.05,.18,.35,.48,.6,.75,.9,.98,1]
};
export function sampleClip(action,phase){const keys=CLIPS[action],x=Math.max(0,Math.min(1,phase))*(keys.length-1),i=Math.min(keys.length-2,Math.floor(x)),u=x-i,s=u*u*(3-2*u);return keys[i]+(keys[i+1]-keys[i])*s;}
export class LeisurePlanner{
 constructor(random=Math.random){this.random=random;this.outings=new Map();this.lastReturn=new Map();this.nextLaunch=0;}
 step(now,members){const events=[],eligible=members.filter(m=>m.eligible),byId=new Map(members.map(m=>[m.id,m]));
 for(const [id,o] of this.outings){const m=byId.get(id);if(!m?.eligible){this.outings.delete(id);events.push({id,type:'cancel'});continue;}
 if(o.phase==='outbound'&&m.settled){o.phase='play';o.until=now+6+this.random()*4;events.push({id,type:'play',activity:o.activity});}
 else if(o.phase==='play'&&now>=o.until){o.phase='return';events.push({id,type:'return'});}
 else if(o.phase==='return'&&m.atDesk&&m.settled){this.outings.delete(id);this.lastReturn.set(id,now);events.push({id,type:'end'});}}
 const limit=Math.ceil(eligible.length*.2);
 if(now>=this.nextLaunch&&this.outings.size<limit){const candidates=eligible.filter(m=>!this.outings.has(m.id)&&m.atDesk&&m.settled&&now-(this.lastReturn.get(m.id)??-Infinity)>60).sort((a,b)=>(this.lastReturn.get(a.id)??-Infinity)-(this.lastReturn.get(b.id)??-Infinity));
 if(candidates.length){const m=candidates[0],climbing=[...this.outings.values()].some(o=>o.activity==='climb'),options=m.human||climbing?['walk','sleep']:['walk','sleep','climb'],activity=options[Math.floor(this.random()*options.length)];this.outings.set(m.id,{phase:'outbound',activity});events.push({id:m.id,type:'start',activity});this.nextLaunch=now+2;}}
 return events;
 }
}
