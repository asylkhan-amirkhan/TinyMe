import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advanceMotion, canAnimate } from '../domain/motion';
test('music advances the record; pausing freezes its angle while the room stays alive',()=>{
 const start={time:5,recordAngle:1};const playing=advanceMotion(start,50,true);
 assert.ok(playing.recordAngle>start.recordAngle);assert.equal(playing.time,5.05);
 const paused=advanceMotion(playing,50,false);assert.equal(paused.recordAngle,playing.recordAngle);assert.ok(paused.time>playing.time);
});
test('motion ignores negative elapsed time and clamps resume gaps',()=>{
 const start={time:0,recordAngle:0};assert.deepEqual(advanceMotion(start,-5,true),start);
 assert.equal(advanceMotion(start,60000,true).time,.1);
 assert.ok(advanceMotion({time:1,recordAngle:Math.PI*2-.01},100,true).recordAngle<Math.PI*2);
});
test('animation stops when hidden, off screen, editing or disabled',()=>{
 assert.equal(canAnimate(true,false,true,false),true);
 assert.equal(canAnimate(false,false,true,false),false);
 assert.equal(canAnimate(true,true,true,false),false);
 assert.equal(canAnimate(true,false,false,false),false);
 assert.equal(canAnimate(true,false,true,true),false);
});
