import {test} from 'node:test';import assert from 'node:assert/strict';import {accumulateSnow,snowIntensity,snowCount,precipitation} from '../domain/snow';
test('enabled winter precipitation replaces rain; other seasons retain rain',()=>{
 for(const season of ['spring','summer','autumn','winter']){assert.equal(precipitation(season,false),'none');assert.equal(precipitation(season,true),season==='winter'?'snow':'rain');}
});
test('snow intensity defaults safely and survives serialization including zero',()=>{
 for(const value of [undefined,null,'90',NaN,Infinity])assert.equal(snowIntensity(value),50);
 for(const value of [0,25,50,100])assert.equal(snowIntensity(JSON.parse(JSON.stringify({snowIntensity:value})).snowIntensity),value);
 assert.equal(snowIntensity(-10),0);assert.equal(snowIntensity(200),100);
});
test('snow particles scale monotonically with a fixed performance budget',()=>{
 assert.equal(snowCount(0),0);assert.equal(snowCount(100),80);for(let i=1;i<=100;i++)assert.ok(snowCount(i)>=snowCount(i-1)&&snowCount(i)<=80);
});

 test('snow builds gradually, holds when stopped and bounds inactive gaps',()=>{
  assert.equal(accumulateSnow(.4,100,100,false),.4);
  assert.equal(accumulateSnow(.4,100,0,true),.4);
  assert.ok(accumulateSnow(.4,100,100,true)>accumulateSnow(.4,100,20,true));
  assert.equal(accumulateSnow(.4,100000,100,true),accumulateSnow(.4,100,100,true));
  assert.equal(accumulateSnow(1,100,100,true),1);
  assert.equal(accumulateSnow(.4,-10,100,true),.4);
  assert.equal(accumulateSnow(NaN,NaN,100,true),.2);
 });
