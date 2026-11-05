import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rainVolume, rainDrop } from '../domain/rain';
test('rain volume clamps corrupted preferences and drops stay within window bounds',()=>{
 assert.equal(rainVolume(null),.35);assert.equal(rainVolume(NaN),.35);assert.equal(rainVolume(-1),0);assert.equal(rainVolume(5),1);
 for(const time of [0,1,40,200])for(let i=0;i<85;i++){const d=rainDrop(i,time);assert.ok(d.x>=13.6&&d.x<22.4);assert.ok(d.z>=42&&d.z<215);}
 assert.notDeepEqual(rainDrop(1,0),rainDrop(1,1));
});
