// Pure scheduler: at most three ordinary bubbles, FIFO, one pending item per cat.
export class BubbleQueue {
 constructor({random=Math.random,limit=3,hold=3000,fade=450}={}){Object.assign(this,{random,limit,hold,fade});this.items=new Map();this.queue=[];}
 interval(){return 20000+this.random()*20000;}
 update(id,key,pinned,now){let item=this.items.get(id);if(!item){item={key,pinned,next:now+this.interval(),start:null};this.items.set(id,item);if(!pinned)this.enqueue(id);return;}
 if(item.key!==key||item.pinned!==pinned){item.key=key;item.pinned=pinned;item.start=null;item.next=now+this.interval();this.queue=this.queue.filter(x=>x!==id);if(!pinned)this.enqueue(id);}}
 enqueue(id){if(!this.queue.includes(id))this.queue.push(id);}
 tick(now,visible){let active=0;for(const [id,item] of this.items){if(item.pinned)continue;if(item.start!==null&&now-item.start>=this.hold+this.fade){item.start=null;item.next=now+this.interval();}if(item.start!==null)active++;else if(now>=item.next){this.enqueue(id);}}
 for(let i=0;i<this.queue.length&&active<this.limit;){const id=this.queue[i],item=this.items.get(id);if(!item||item.pinned){this.queue.splice(i,1);continue;}if(!visible.has(id)){i++;continue;}this.queue.splice(i,1);if(item.start===null){item.start=now;active++;}}
 }
 view(id,now){const x=this.items.get(id);if(!x)return {visible:false,opacity:0};if(x.pinned)return {visible:true,opacity:1,pinned:true};const age=x.start===null?Infinity:now-x.start;return {visible:age<this.hold+this.fade,opacity:Math.max(0,Math.min(1,1-(age-this.hold)/this.fade)),pinned:false};}
 retain(ids){for(const id of this.items.keys())if(!ids.has(id))this.items.delete(id);this.queue=this.queue.filter(id=>ids.has(id));}
}
export function shortBubble(text){const chars=Array.from(text);return chars.length>12?chars.slice(0,11).join('')+'…':text;}
