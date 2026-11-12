import { levelProgress, skillXp, type Progress } from './progress';
export type GraphKind='skill'|'task'|'milestone'|'goal';
export const graphKindNames:Record<GraphKind,string>={skill:'Навык',task:'Выполненная задача',milestone:'Веха',goal:'Цель'};
export type GraphNode={id:string;kind:GraphKind;skillId:string;title:string;color:string;xp:number;at:string;description:string;level?:number;minutes?:number|null;radius:number;status?:string};
export type GraphEdge={source:string;target:string};
export type GraphContext={skill?:string;focus?:string};
export const taskRadius=(xp:number)=>Math.max(10,Math.min(20,7+Math.sqrt(Math.max(0,xp))*1.5));
export const skillNodeId=(id:string)=>`skill:${id}`;
export const taskNodeId=(id:string)=>`task:${id}`;
export const milestoneNodeId=(skillId:string,level:number)=>`milestone:${skillId}:${level}`;
export function progressGraph(state:Progress,context:GraphContext={},limit=50) {
  const all:GraphNode[]=[],links:GraphEdge[]=[];
  for(const skill of state.skills) {
    if(context.skill && skill.id!==context.skill)continue;
    const xp=skillXp(state,skill.id),level=levelProgress(xp).level;
    const events=state.completions.filter(e=>e.skillId===skill.id);
    all.push({id:skillNodeId(skill.id),kind:'skill',skillId:skill.id,title:skill.name,color:skill.color,xp,level,at:events.at(-1)?.at??'',description:skill.archived?'Навык в архиве. История сохранена.':'Опыт складывается из выполненных задач этого навыка.',radius:25});
    for(const goal of state.goals?.filter(g=>g.skillId===skill.id)??[]) {
      all.push({id:`goal:${goal.id}`,kind:'goal',skillId:skill.id,title:goal.title,color:skill.color,xp:0,at:goal.completedAt??goal.createdAt,description:goal.description,radius:19,status:goal.completedAt?'Завершена':'В работе'});
      links.push({source:skillNodeId(skill.id),target:`goal:${goal.id}`});
    }
    for(const e of events) {
      const task=state.tasks.find(t=>t.id===e.taskId)!;
      all.push({id:taskNodeId(e.taskId),kind:'task',skillId:skill.id,title:task.title,color:skill.color,xp:e.xp,at:e.at,description:task.description,minutes:e.minutes,radius:taskRadius(e.xp)});
      links.push({source:skillNodeId(skill.id),target:taskNodeId(e.taskId)});
      if(task.goalId)links.push({source:`goal:${task.goalId}`,target:taskNodeId(e.taskId)});
    }
    for(const m of state.milestones.filter(m=>m.skillId===skill.id)) {
      const id=milestoneNodeId(skill.id,m.level);
      all.push({id,kind:'milestone',skillId:skill.id,title:`Уровень ${m.level}`,color:skill.color,xp:0,level:m.level,at:m.at,description:'Наградная веха. Не начисляет опыт повторно.',radius:18});
      links.push({source:skillNodeId(skill.id),target:id});
      // Include exactly the completions that accumulated the threshold, not future work.
      const sourceIndex=events.findIndex(e=>e.taskId===m.taskId);
      for(const e of events.slice(0,sourceIndex+1))links.push({source:taskNodeId(e.taskId),target:id});
    }
  }
  const sorted=all.map((node,index)=>({node,index})).sort((a,b)=>b.node.at.localeCompare(a.node.at)||b.index-a.index).map(r=>r.node);
  const safeLimit=Math.max(2,Math.floor(limit));
  const visible=sorted.slice(0,safeLimit);
  const focus=all.find(n=>n.id===context.focus);
  if(focus&&!visible.some(n=>n.id===focus.id)){visible.pop();visible.push(focus);}
  // Keep each visible branch attached to its skill without exceeding the budget.
  for(const id of new Set(visible.map(n=>n.skillId))) {
    const root=all.find(n=>n.id===skillNodeId(id))!;
    if(!visible.some(n=>n.id===root.id))visible.push(root);
  }
  while(visible.length>safeLimit) {
    const index=visible.findLastIndex(n=>n.kind!=='skill'&&n.id!==focus?.id);
    if(index>=0)visible.splice(index,1);else {const root=visible.findLastIndex(n=>n.id!==focus?.id);visible.splice(root,1);}
  }
  const ids=new Set(visible.map(n=>n.id));
  return {allNodes:sorted,allEdges:links,nodes:visible,edges:links.filter(e=>ids.has(e.source)&&ids.has(e.target)),truncated:all.length>visible.length,total:all.length};
}
export type PositionedNode=GraphNode&{x:number;y:number};
/** Stable radial branches with bounded spacing; no animation or random drift. */
export function graphLayout(nodes:GraphNode[]):PositionedNode[] {
  const skills=[...new Set(nodes.map(n=>n.skillId))];
  const columns=Math.max(1,Math.ceil(Math.sqrt(skills.length)));
  const largest=Math.max(1,...skills.map(id=>nodes.filter(n=>n.skillId===id&&n.kind!=='skill').length));
  let ring=0,remaining=largest,capacity=12;
  while(remaining>capacity){remaining-=capacity;ring++;capacity=12*(ring+1);}
  const radius=95+ring*85,cell=radius*2+120;
  return skills.flatMap((id,group)=>{
    const cx=(group%columns)*cell+cell/2,cy=Math.floor(group/columns)*cell+cell/2;
    const children=nodes.filter(n=>n.skillId===id&&n.kind!=='skill').sort((a,b)=>a.kind.localeCompare(b.kind)||a.at.localeCompare(b.at)||a.id.localeCompare(b.id));
    return nodes.filter(n=>n.skillId===id&&n.kind==='skill').map(n=>({...n,x:cx,y:cy})).concat(children.map((n,index)=>{
      let ring=0,start=0,capacity=12;
      while(index>=start+capacity){start+=capacity;ring++;capacity=12*(ring+1);}
      const count=Math.min(capacity,children.length-start),angle=(index-start)/count*Math.PI*2-Math.PI/2;
      const distance=95+ring*85;
      return {...n,x:cx+Math.cos(angle)*distance,y:cy+Math.sin(angle)*distance};
    }));
  });
}
export function graphNeighbors(id:string,edges:GraphEdge[]) {
  return new Set([id,...edges.flatMap(e=>e.source===id?[e.target]:e.target===id?[e.source]:[])]);
}
export function graphHref(context:GraphContext={}) {const p=new URLSearchParams();if(context.skill)p.set('skill',context.skill);if(context.focus)p.set('focus',context.focus);return '/graph'+(p.size?'?'+p.toString():'');}
