import {test} from 'node:test';import assert from 'node:assert/strict';import {frameDue} from '../domain/frame-clock';
test('small display timing jitter keeps a stable cadence without repeated frame skips',()=>{
 let next=0;const paints:number[]=[];
 for(let i=0;i<120;i++){const now=100+i*1000/60+(i%3-1)*.18;const result=frameDue(now,next);next=result.next;if(result.due)paints.push(now);}
 assert.equal(paints.length,60);
 for(let i=1;i<paints.length;i++)assert.ok(Math.abs(paints[i]-paints[i-1]-1000/30)<1);
});
test('a stalled or resumed clock paints once and never queues catch-up frames',()=>{
 const stalled=frameDue(5000,100);assert.equal(stalled.due,true);assert.ok(stalled.next>5000);
 assert.equal(frameDue(5001,stalled.next).due,false);assert.equal(frameDue(6000,0).due,true);
});

test('60 fps deadlines stay aligned with a jittery 60 Hz display',()=>{
 let next=0,count=0;for(let i=0;i<180;i++){const frame=frameDue(100+i*1000/60+(i%3-1)*.1,next,1000/60);next=frame.next;if(frame.due)count++;}assert.equal(count,180);
});
