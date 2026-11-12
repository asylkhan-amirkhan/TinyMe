import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialProgress, parseProgress, progressCommand, skillTemplates, skillXp, type Progress, type SkillDraft } from '../domain/progress';
import { displayedSkillRewards, masteryOf, skillActivities, skillRewards, type SkillActivity } from '../domain/skill-growth';
import { advanceResident, commandSkillResident, createResident, residentBlocked, residentStatus, syncResidentSkills } from '../domain/resident';
import { residentArtwork } from '../engine/resident-art';
import { defaultResidentLook } from '../domain/resident-look';
import { rewardPixels } from '../engine/skill-reward-art';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RewardArtwork } from '../components/SkillRewards';
const at='2026-11-12T08:00:00.000Z';
function skill(state: Progress,id:string,behavior:SkillDraft['behavior']='study') {return progressCommand(state,{kind:'addSkill',id,draft:{...skillTemplates[3],name:id,behavior}});}
function earn(state:Progress,id:string,count:number) {
  let s=state;
  for(let n=0;n<count;n++) {
    const task=`${id}-${s.tasks.length}`;
    s=progressCommand(s,{kind:'addTask',id:task,at,draft:{title:task,skillId:id,difficulty:'hard',description:'',dueDate:''}});
    s=progressCommand(s,{kind:'completeTask',id:task,at,minutes:null});
  }
  return s;
}
test('each skill has independent mastery and only practiced active skills become autonomous activities',()=>{
  let s=skill(skill(initialProgress(),'reading'),'sport','exercise');
  assert.deepEqual(skillActivities(s),[]);
  s=earn(s,'reading',30); // 1500 XP = level 6
  s=earn(s,'sport',1);
  assert.deepEqual(skillActivities(s).map(a=>[a.name,a.level,a.mastery]),[['reading',6,'master'],['sport',1,'beginner']]);
  assert.equal(masteryOf(2),'beginner');assert.equal(masteryOf(3),'confident');assert.equal(masteryOf(5),'confident');assert.equal(masteryOf(6),'master');
  const archived=progressCommand(s,{kind:'archiveSkill',id:'reading',archived:true});
  assert.deepEqual(skillActivities(archived).map(a=>a.name),['sport']);
  assert.equal(skillXp(archived,'reading'),1500);
});
test('reward issuance, trophy and source tasks survive reload without extra XP or duplication',()=>{
  const s=earn(skill(initialProgress(),'reading'),'reading',72); // level 9
  const rewards=skillRewards(s);
  assert.deepEqual(rewards.map(r=>r.id),['reading:3','reading:6','reading:9','trophy']);
  assert.equal(skillXp(s,'reading'),3600);
  const reloaded=parseProgress(JSON.stringify(s));
  assert.deepEqual(skillRewards(reloaded),rewards);
  const last=s.completions.at(-1)!;
  const replay=progressCommand(reloaded,{kind:'completeTask',id:last.taskId,at,minutes:null});
  assert.deepEqual(skillRewards(replay),rewards);
  assert.ok(rewards.every(r=>s.tasks.some(t=>t.id===r.sourceTaskId)));
});
test('earned reward art stays immutable when the selected future reward template changes',()=>{
  let s=earn(skill(initialProgress(),'reading'),'reading',6);
  s=progressCommand(s,{kind:'editSkill',id:'reading',draft:{...s.skills[0],reward:'laptop'}});
  assert.equal(skillRewards(s)[0].template,'books');
  s=earn(s,'reading',24);
  assert.deepEqual(skillRewards(s).map(r=>r.template),['books','laptop']);
});
test('legacy local profiles upgrade without losing XP, milestone source or changing the wardrobe',()=>{
  const old=earn(skill(initialProgress(),'reading'),'reading',6);
  delete old.milestones[0].reward;
  const s=parseProgress(JSON.stringify(old));
  assert.equal(s.milestones[0].reward,'books');
  assert.equal(skillXp(s,'reading'),300);
  assert.deepEqual(displayedSkillRewards(s),[]);
});
test('six award slots, one stage per skill, preserve the whole collection and reject locked rewards',()=>{
  let s=initialProgress();
  for(let i=0;i<7;i++) s=earn(skill(s,`skill-${i}`),`skill-${i}`,6);
  assert.throws(()=>progressCommand(s,{kind:'displayReward',id:'skill-0:9',show:true}));
  assert.throws(()=>progressCommand(s,{kind:'displayReward',id:'trophy',show:true}));
  for(let i=0;i<6;i++)s=progressCommand(s,{kind:'displayReward',id:`skill-${i}:3`,show:true});
  assert.equal(displayedSkillRewards(s).length,6);
  assert.throws(()=>progressCommand(s,{kind:'displayReward',id:'skill-6:3',show:true}));
  s=earn(s,'skill-0',24);
  s=progressCommand(s,{kind:'displayReward',id:'skill-0:6',show:true});
  assert.equal(displayedSkillRewards(s).length,6);
  assert.ok(!s.displayedRewards!.includes('skill-0:3'));
  assert.equal(skillRewards(s).length,8);
  s=progressCommand(s,{kind:'displayReward',id:'skill-0:6',show:false});
  assert.equal(displayedSkillRewards(parseProgress(JSON.stringify(s))).length,5);
});
test('autonomous skill animation never writes XP, and archived skills stop being performed',()=>{
  const s=earn(skill(initialProgress(),'reading'),'reading',1), before=JSON.stringify(s);
  const activities=skillActivities(s);
  let r=advanceResident({...createResident([]),elapsed:5},100,[],true,activities);
  assert.equal(r.activity?.skillId,'reading');
  for(let i=0;i<100;i++)r=advanceResident(r,100,[],true,activities);
  assert.equal(JSON.stringify(s),before);
  assert.equal(syncResidentSkills(r,[],[]).activity,undefined);
  const calm=advanceResident({...createResident([]),elapsed:5},100,[],true,[]);
  assert.equal(calm.activity,undefined);
  assert.ok(['walk','rest','idle'].includes(calm.action));
});
test('every category has grounded portable tools, three distinct static stages and unchanged clothing',()=>{
  const look={...defaultResidentLook,glasses:true}, original=JSON.stringify(look);
  const light={daylight:1,overcast:false,blockers:[],sources:[]};
  const project=(x:number,y:number,z=0):[number,number]=>[120+(x-y)*23,150+(x+y)*12-z];
  for(const behavior of ['study','desk','exercise','drawing','music','universal'] as const) {
    const stages=[];
    for(const [level,mastery] of [[1,'beginner'],[3,'confident'],[6,'master']] as const) {
      const activity:SkillActivity={skillId:'a',name:'Мой навык',behavior,level,mastery,sourceTaskId:'task',sourceTitle:'Первый шаг'};
      const r=commandSkillResident({...createResident([]),x:0.5,y:0.5},[],activity,true)!;
      assert.equal(r.path.length,0);assert.equal(r.activity?.level,level);
      assert.ok(!residentBlocked([]).has(Math.floor(r.y)*24+Math.floor(r.x)));
      assert.match(residentStatus(r),/Мой навык/);
      const art=residentArtwork(r,light,project,look);
      assert.ok(art.length>100);assert.ok(art.flatMap(f=>f.points).flat().every(Number.isFinite));
      assert.deepEqual(art,residentArtwork(r,light,project,look));
      stages.push(JSON.stringify(art));
    }
    assert.equal(new Set(stages).size,3,behavior);
  }
  assert.equal(JSON.stringify(look),original);
});
test('all reward templates have distinct finite pixel artwork for levels 3, 6 and 9',()=>{
  for(const template of ['laptop','globe','books','dumbbells','plant','trophy'] as const) {
    const stages=[3,6,9].map(level=>rewardPixels(template,level));
    assert.equal(new Set(stages.map(s=>JSON.stringify(s))).size,3);
    assert.ok(stages.flat().every(p=>p.x>=0&&p.y>=0&&p.w>0&&p.h>0&&p.x+p.w<=48&&p.y+p.h<=48));
  }
});
test('the collection emits visible SVG rectangles with width and height',()=>{
  const html=renderToStaticMarkup(createElement(RewardArtwork,{template:'books',level:3}));
  const rects=html.match(/<rect\b[^>]*>/g)!;
  assert.ok(rects.length>5);
  assert.ok(rects.every(rect=>/\bwidth="[1-9]\d*"/.test(rect)&&/\bheight="[1-9]\d*"/.test(rect)));
});
