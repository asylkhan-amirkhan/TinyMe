import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialProgress, parseProgress, progressCommand, skillTemplates, skillXp, type Progress } from '../domain/progress';
import { graphHref, graphLayout, graphNeighbors, milestoneNodeId, progressGraph, taskRadius } from '../domain/progress-graph';
const at='2026-11-12T08:00:00.000Z';
const addSkill=(s:Progress,id:string)=>progressCommand(s,{kind:'addSkill',id,draft:{...skillTemplates[0],name:id}});
function finish(s:Progress,id:string,skillId='a',goalId?:string) {
  s=progressCommand(s,{kind:'addTask',id,at,draft:{title:id,description:'Описание',skillId,difficulty:'hard',dueDate:'',...(goalId?{goalId}:{})}});
  return progressCommand(s,{kind:'completeTask',id,at,minutes:15});
}
function history(count:number){let s=addSkill(initialProgress(),'a');for(let i=0;i<count;i++)s=finish(s,`task-${i}`);return s;}
test('graph projects skills, completions, milestones and goals from the same source without awarding XP',()=>{
  let s=history(6);
  s=progressCommand(s,{kind:'addGoal',id:'goal',title:'Моя цель',skillId:'a',description:'Результат',at});
  s=finish(s,'goal-task','a','goal');
  const before=JSON.stringify(s),g=progressGraph(s);
  assert.deepEqual(new Set(g.nodes.map(n=>n.kind)),new Set(['skill','task','milestone','goal']));
  assert.equal(g.nodes.find(n=>n.kind==='milestone')!.xp,0);
  assert.equal(g.nodes.find(n=>n.id==='task:goal-task')!.xp,50);
  assert.ok(g.edges.some(e=>e.source==='goal:goal'&&e.target==='task:goal-task'));
  assert.ok(!g.allNodes.some(n=>n.id==='trophy')); // trophy refers to a milestone, not duplicate XP
  assert.equal(JSON.stringify(s),before);
});
test('a milestone links to exactly the preceding completions including its source, never later tasks',()=>{
  const g=progressGraph(history(8));
  const neighbors=graphNeighbors(milestoneNodeId('a',3),g.allEdges);
  assert.ok(neighbors.has('task:task-0'));
  assert.ok(neighbors.has('task:task-5'));
  assert.ok(!neighbors.has('task:task-6'));
  assert.ok(!neighbors.has('task:task-7'));
});
test('skill filtering and the 50-node budget never leave links to missing nodes',()=>{
  let s=history(80);s=addSkill(s,'b');s=finish(s,'other','b');
  for(const context of [{},{skill:'a'},{skill:'b'},{skill:'missing'}]) {
    const graph=progressGraph(s,context),ids=new Set(graph.nodes.map(n=>n.id));
    assert.ok(graph.nodes.length<=50);
    assert.ok(graph.edges.every(e=>ids.has(e.source)&&ids.has(e.target)));
    if(context.skill)assert.ok(graph.allNodes.every(n=>n.skillId===context.skill));
  }
  const graph=progressGraph(s);
  assert.ok(graph.truncated);assert.ok(graph.allNodes.length>50);
  assert.equal(graph.allNodes.filter(n=>n.kind==='task').length,81);
});
test('a direct link can focus an old milestone outside the latest 50 without growing the limit',()=>{
  const g=progressGraph(history(100),{skill:'a',focus:milestoneNodeId('a',3)});
  assert.equal(g.nodes.length,50);
  assert.ok(g.nodes.some(n=>n.id===milestoneNodeId('a',3)));
  assert.ok(g.nodes.some(n=>n.id==='skill:a'));
  assert.ok(g.nodes.some(n=>n.id==='task:task-99'));
});
test('layout is stable, finite and non-overlapping for a full 50-node view',()=>{
  let s=history(70);s=addSkill(s,'b');for(let i=0;i<10;i++)s=finish(s,`b-${i}`,'b');
  const graph=progressGraph(s),layout=graphLayout(graph.nodes);
  assert.deepEqual(layout,graphLayout(graph.nodes));
  assert.equal(layout.length,graph.nodes.length);
  for(const n of layout){assert.ok(Number.isFinite(n.x)&&Number.isFinite(n.y));for(const other of layout)if(n.id!==other.id)assert.ok(Math.hypot(n.x-other.x,n.y-other.y)>n.radius+other.radius+5);}
});
test('task radii follow bounded square-root XP and milestone size is fixed',()=>{
  assert.equal(taskRadius(25),7+Math.sqrt(25)*1.5);
  assert.ok(taskRadius(10)<taskRadius(50));
  assert.equal(taskRadius(-1),10);assert.equal(taskRadius(100000),20);
  assert.ok(progressGraph(history(72)).allNodes.filter(n=>n.kind==='milestone').every(n=>n.radius===18));
});
test('goals inherit their skill, complete only after all tasks, and never grant extra XP',()=>{
  let s=addSkill(addSkill(initialProgress(),'a'),'b');
  s=progressCommand(s,{kind:'addGoal',id:'goal',title:'Цель',skillId:'a',description:'',at});
  assert.throws(()=>progressCommand(s,{kind:'completeGoal',id:'goal',at}));
  assert.throws(()=>progressCommand(s,{kind:'addTask',id:'bad',at,draft:{title:'bad',skillId:'b',difficulty:'easy',description:'',dueDate:'',goalId:'goal'}}));
  s=finish(s,'task','a','goal');
  s=progressCommand(s,{kind:'completeGoal',id:'goal',at});
  assert.equal(skillXp(s,'a'),50);assert.equal(s.goals![0].completedAt,at);
  assert.equal(progressCommand(s,{kind:'completeGoal',id:'goal',at}),s);
  assert.deepEqual(parseProgress(JSON.stringify(s)),s);
  s=progressCommand(s,{kind:'editTask',id:'task',draft:{...s.tasks[0],title:'Уточнение'}});
  assert.equal(skillXp(s,'a'),50);
  assert.throws(()=>progressCommand(s,{kind:'addTask',id:'late',at,draft:{...s.tasks[0],title:'Ещё'}}));
});
test('legacy profiles still load and graph context is URL-encoded without changing data',()=>{
  const old=history(1),s=parseProgress(JSON.stringify(old));
  assert.deepEqual(s,old);
  const href=graphHref({skill:'a / ?',focus:'milestone:a:3'}),url=new URL(href,'http://localhost');
  assert.equal(url.pathname,'/graph');assert.equal(url.searchParams.get('skill'),'a / ?');assert.equal(url.searchParams.get('focus'),'milestone:a:3');
});
