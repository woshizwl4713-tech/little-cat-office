import {test} from 'node:test';import assert from 'node:assert/strict';import {normalizeStatus} from '../app/status-format.js';
test('canonical, unknown, meeting, and old payloads',()=>{
 const x=normalizeStatus({agents:[{id:'one',state:'meeting'},{id:'two',state:'surprise'},{id:'three',status:'thinking'}]});
 assert.equal(x.agents[0].state,'meeting');assert.equal(x.agents[0].status,'working');assert.equal(x.agents[1].status,'idle');assert.equal(x.agents[2].status,'thinking');assert.deepEqual(x.activity,[]);
});
test('expiry and malformed payload',()=>{assert.equal(normalizeStatus({agents:[{id:'a',updatedAt:'2000-01-01T00:00:00Z'}]}).agents[0].status,'idle');assert.throws(()=>normalizeStatus({agents:[{id:'x'},{id:'x'}]}));assert.throws(()=>normalizeStatus({agents:[{id:'x',updatedAt:'nonsense'}]}));});
