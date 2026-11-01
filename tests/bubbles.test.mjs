import {test} from 'node:test';import assert from 'node:assert/strict';import {BubbleQueue,shortBubble} from '../app/bubbles.js';import {normalizeStatus} from '../app/status-format.js';
test('queue, hold, fade, repeat, pinned exemption and cleanup',()=>{
 const q=new BubbleQueue({random:()=>.5});const visible=new Set(['a','b','c','d','p']);for(const id of visible)q.update(id,'one',id==='p',0);q.tick(0,visible);
 assert.equal([...visible].filter(id=>q.view(id,0).visible&&!q.view(id,0).pinned).length,3);assert.equal(q.view('d',0).visible,false);assert.ok(q.view('p',100000).visible);
 q.tick(3000,visible);assert.equal(q.view('a',3000).opacity,1);assert.ok(q.view('a',3200).opacity<1);
 q.tick(3450,visible);assert.ok(q.view('d',3450).visible);assert.equal(q.view('a',3450).visible,false);
 q.tick(7000,visible);q.tick(33449,visible);assert.equal(q.view('a',33449).visible,false);q.tick(33450,visible);assert.ok(q.view('a',33450).visible);
 q.update('a','changed',true,33451);q.tick(33451,visible);assert.ok(q.view('a',33451).pinned);q.retain(new Set(['p']));assert.equal(q.items.size,1);
});
test('unchanged polling does not restart bubbles; task changes enqueue; offscreen waits',()=>{
 const q=new BubbleQueue({random:()=>0});q.update('a','x',false,0);q.tick(0,new Set());assert.equal(q.view('a',0).visible,false);q.tick(10,new Set(['a']));q.update('a','x',false,3000);q.tick(3460,new Set(['a']));assert.equal(q.view('a',3460).visible,false);q.update('a','y',false,4000);q.tick(4000,new Set(['a']));assert.ok(q.view('a',4000).visible);assert.equal(Array.from(shortBubble('这是一个非常长非常长的状态文字')).length,12);
});
test('roster is authoritative, preserves unreported seats and overrides display metadata',()=>{
 const roster=[{id:'a',name:'名册名字',avatar:'cat-white'},{id:'b',name:'未上报'}];const x=normalizeStatus({agents:[{id:'a',name:'来源名字',state:'working'},{id:'removed',state:'working'}]},{roster});assert.equal(x.agents.length,2);assert.equal(x.agents[0].name,'名册名字');assert.equal(x.agents[0].avatar,'cat-white');assert.ok(x.agents[1].rosterPending);assert.equal(normalizeStatus({agents:[{id:'a'}]},{roster:[]}).agents.length,0);assert.throws(()=>normalizeStatus({agents:[]},{roster:[{id:'a'},{id:'a'}]}));
});
test('stale policy defaults idle, optional offline, explicit offline remains offline',()=>{
 const payload={agents:[{id:'a',state:'need_you',updatedAt:'2000-01-01T00:00:00Z'}]};assert.equal(normalizeStatus(payload).agents[0].status,'idle');assert.equal(normalizeStatus(payload,{staleBecomes:'offline'}).agents[0].status,'offline');payload.agents[0].state='offline';assert.equal(normalizeStatus(payload).agents[0].status,'offline');
});
