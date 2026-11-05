import {test} from 'node:test';import assert from 'node:assert/strict';
import {seasons,parseSeason,resolveSeason,seasonParticle} from '../domain/season';
test('auto seasons follow local month boundaries and manual modes override the date',()=>{
 const expected=['winter','winter','spring','spring','spring','summer','summer','summer','autumn','autumn','autumn','winter'];
 for(let month=0;month<12;month++){assert.equal(resolveSeason('auto',new Date(2026,month,1)),expected[month]);for(const season of seasons)assert.equal(resolveSeason(season,new Date(2026,month,1)),season);}
 assert.equal(resolveSeason('auto',new Date(2026,2,0,23,59)),'winter');assert.equal(resolveSeason('auto',new Date(2026,2,1)),'spring');
});
test('season storage accepts only supported modes and safely migrates missing data',()=>{
 for(const mode of ['auto',...seasons])assert.equal(parseSeason(mode),mode);
 for(const invalid of [null,undefined,'snow',{},0])assert.equal(parseSeason(invalid),'auto');
});
test('season particles are bounded, repeatable, and continuous at the shared clock wrap',()=>{
 for(const season of seasons)for(let i=0;i<32;i++){
  const a=seasonParticle(i,0,season),b=seasonParticle(i,120*Math.PI,season);
  for(const key of ['x','z','alpha'] as const)assert.ok(Math.abs(a[key]-b[key])<1e-8);
  for(const t of [0,3,30,200]){const p=seasonParticle(i,t,season);assert.ok(p.x>=13.7&&p.x<=22&&p.z>=40&&p.z<=215&&p.alpha>=0&&p.alpha<=.75);assert.deepEqual(p,seasonParticle(i,t,season));}
 }
});
