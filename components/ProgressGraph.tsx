'use client';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { ArrowLeft, CircleDot, Flag, Focus, GitBranch, List, Minus, Plus, Trophy, X } from 'lucide-react';
import { levelProgress, type Progress } from '@/domain/progress';
import { graphHref, graphKindNames, graphLayout, graphNeighbors, progressGraph, type GraphContext, type PositionedNode } from '@/domain/progress-graph';

const dateLabel=(date:string)=>date?new Date(date).toLocaleString('ru-RU',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
type GraphData=ReturnType<typeof progressGraph>;
function GraphCanvas({graph,context,onSelect}:{graph:GraphData;context:GraphContext;onSelect:(id:string)=>void}) {
  const nodes=useMemo(()=>graphLayout(graph.nodes),[graph.nodes]);
  const svg=useRef<SVGSVGElement>(null);
  const [size,setSize]=useState({width:1000,height:600});
  useEffect(()=>{
    const element=svg.current;if(!element)return;
    const measure=()=>setSize({width:element.clientWidth||1000,height:element.clientHeight||600});
    measure();const observer=new ResizeObserver(measure);observer.observe(element);
    return()=>observer.disconnect();
  },[]);
  const drag=useRef<{id:number;x:number;y:number;panX:number;panY:number}|null>(null);
  const key=(context.skill??'')+'|'+(context.focus??'');
  const [stored,setView]=useState({key,x:0,y:0,zoom:1,centerAll:false});
  const view=stored.key===key?stored:{...stored,key,x:0,y:0,centerAll:false};
  const map=new Map(nodes.map(n=>[n.id,n]));
  const neighbors=context.focus?graphNeighbors(context.focus,graph.edges):new Set<string>();
  const labels=new Set([context.focus,...[...neighbors].filter(id=>id!==context.focus).slice(0,size.width<500?0:6),...nodes.filter(n=>n.kind==='skill').slice(0,8).map(n=>n.id)]);
  const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const scale=Math.min(1.5,Math.max(160,size.width-80)/Math.max(200,maxX-minX+100),Math.max(160,size.height-100)/Math.max(200,maxY-minY+100));
  const focused=!view.centerAll&&context.focus?map.get(context.focus):undefined;
  const cx=focused?.x??(minX+maxX)/2,cy=focused?.y??(minY+maxY)/2;
  const zoom=(factor:number)=>setView({...view,zoom:Math.max(.4,Math.min(4,view.zoom*factor))});
  const center=()=>setView({key,x:0,y:0,zoom:1,centerAll:true});
  const down=(e:PointerEvent<SVGSVGElement>)=>{
    if(e.button!==0||!e.isPrimary||(e.target as Element).closest('[data-graph-node]'))return;
    drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,panX:view.x,panY:view.y};
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move=(e:PointerEvent<SVGSVGElement>)=>{
    const start=drag.current,rect=e.currentTarget.getBoundingClientRect();
    if(!start||start.id!==e.pointerId||!rect.width)return;
    const units=Math.max(size.width/rect.width,size.height/rect.height);
    setView({...view,x:start.panX+(e.clientX-start.x)*units,y:start.panY+(e.clientY-start.y)*units});
  };
  const end=(e:PointerEvent<SVGSVGElement>)=>{if(drag.current?.id===e.pointerId){drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}};
  const select=(node:PositionedNode)=>onSelect(node.id);
  return <div className="graph-canvas-wrap">
    <div className="graph-zoom-controls" aria-label="Управление графом"><button aria-label="Уменьшить граф" onClick={()=>zoom(1/1.25)} disabled={view.zoom<=.4}><Minus size={18}/></button><span aria-live="polite">{Math.round(view.zoom*100)}%</span><button aria-label="Увеличить граф" onClick={()=>zoom(1.25)} disabled={view.zoom>=4}><Plus size={18}/></button><button aria-label="Вернуть граф к центру" onClick={center}><Focus size={18}/></button></div>
    <svg ref={svg} className="progress-graph-svg" viewBox={`0 0 ${size.width} ${size.height}`} role="group" aria-label="Интерактивный граф прогресса" tabIndex={0} onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={()=>{drag.current=null;}} onKeyDown={e=>{
      if(e.target!==e.currentTarget)return;
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','+','=','-'].includes(e.key))e.preventDefault();
      if(e.key==='Home')center();else if(e.key==='+'||e.key==='=')zoom(1.25);else if(e.key==='-')zoom(1/1.25);else if(e.key.startsWith('Arrow'))setView({...view,x:view.x+(e.key==='ArrowLeft'?40:e.key==='ArrowRight'?-40:0),y:view.y+(e.key==='ArrowUp'?40:e.key==='ArrowDown'?-40:0)});
    }}>
      <defs><pattern id="graph-dot-grid" width="25" height="25" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".8" fill="var(--graph-grid)"/></pattern></defs>
      <rect width={size.width} height={size.height} fill="url(#graph-dot-grid)"/>
      <g transform={`translate(${size.width/2+view.x} ${size.height/2+view.y}) scale(${scale*view.zoom}) translate(${-cx} ${-cy})`}>
        {graph.edges.map(edge=>{
          const a=map.get(edge.source)!,b=map.get(edge.target)!;
          const active=edge.source===context.focus||edge.target===context.focus;
          const opacity=context.focus && active===false ? .35 : 1;
          return <line key={edge.source+'|'+edge.target} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={active?a.color:'var(--graph-edge)'} strokeWidth={active?2.8:1.2} opacity={opacity} vectorEffect="non-scaling-stroke"/>;
        })}
        {nodes.map(node=>{
          const selected=node.id===context.focus,near=!context.focus||neighbors.has(node.id);
          return <g data-graph-node={node.id} key={node.id} transform={`translate(${node.x} ${node.y})`} role="button" tabIndex={0} aria-label={`${graphKindNames[node.kind]}: ${node.title}, ${node.kind==='skill'?`уровень ${node.level}, ${node.xp} XP`:`${node.xp} XP`}`} aria-pressed={selected} className={`graph-node ${selected?'is-selected':''}`} opacity={near?1:.35} onClick={()=>select(node)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(node);}}}>
            <title>{graphKindNames[node.kind]}: {node.title}</title>
            <circle className="graph-node-hit" r={Math.max(24/(scale*view.zoom),node.radius+8)} fill="transparent"/>
            {selected&&<circle r={node.radius+8} fill="none" stroke="var(--graph-text)" strokeWidth={2} strokeDasharray="4 4"/>}
            {node.kind==='goal'?<rect x={-node.radius} y={-node.radius} width={node.radius*2} height={node.radius*2} rx={5} fill={node.color} stroke="var(--graph-outline)" strokeWidth={2}/>:node.kind==='milestone'?<rect x={-13} y={-13} width={26} height={26} transform="rotate(45)" fill={node.color} stroke="var(--graph-outline)" strokeWidth={2}/>:<circle r={node.radius} fill={node.kind==='skill'?'var(--graph-surface)':node.color} stroke={node.kind==='skill'?node.color:'var(--graph-outline)'} strokeWidth={node.kind==='skill'?4:1.5}/>}
            {node.kind==='skill'&&<circle r={7} fill={node.color}/>}
            {node.kind==='skill'&&<circle r={node.radius+2} fill="none" stroke="var(--graph-outline)" strokeWidth={1.5}/>}
            {node.kind==='task'&&<path d="M-5 0 -1 4 6-5" fill="none" stroke="#292333" strokeWidth={2}/>}
            {node.kind==='milestone'&&<path d="M0-8 2-2 8-2 3 2 5 8 0 4 -5 8 -3 2 -8-2 -2-2Z" fill="#292333"/>}
            {node.kind==='goal'&&<path d="M-5 8V-8H6L3-3 6 1H-5" fill="none" stroke="#292333" strokeWidth={2}/>}
            {labels.has(node.id)&&<text y={node.radius+20/(scale*view.zoom)} textAnchor="middle" className="graph-node-label" style={{fontSize:12/(scale*view.zoom),strokeWidth:3/(scale*view.zoom)}}>{node.title.length>25?node.title.slice(0,24)+'…':node.title}</text>}
          </g>;
        })}
      </g>
    </svg>
    <p className="graph-canvas-hint">Перетаскивай фон. С клавиатуры: стрелки, + / −, Home. Узел — Enter.</p>
  </div>;
}

export default function ProgressGraph({data,loaded,error,context,onNavigate,onRoom,onProgress}:{data:Progress;loaded:boolean;error:string;context:GraphContext;onNavigate:(context:GraphContext)=>void;onRoom:()=>void;onProgress:()=>void}) {
  const graph=useMemo(()=>progressGraph(data,context),[data,context]);
  const [theme,setTheme]=useState<'obsidian'|'whiteboard'>('obsidian');
  const [themeError,setThemeError]=useState(''),[listOpen,setListOpen]=useState(false),[search,setSearch]=useState('');
  useEffect(()=>{const load=()=>{try{setTheme(localStorage.getItem('tinyme:graph-theme')==='whiteboard'?'whiteboard':'obsidian');}catch{setThemeError('Настройка темы доступна только в этой сессии.');}};load();},[]);
  const selected=graph.allNodes.find(n=>n.id===context.focus);
  const neighbors=selected?graphNeighbors(selected.id,graph.allEdges):new Set<string>();
  const select=(id:string)=>onNavigate({...context,focus:id});
  const list=graph.allNodes.filter(n=>!search||n.title.toLocaleLowerCase('ru').includes(search.toLocaleLowerCase('ru')));
  const focusMissing=!!context.focus&&!selected;
  if(!loaded)return <p role="status">Собираем твой граф…</p>;
  return <div className="graph-page">
    <div className="page-heading"><div><h1>Твой путь.<br/>Связь за связью.</h1><p>Навыки, реальные шаги и вехи, из которых складывается твой рост.</p></div></div>
    <button className="button secondary" onClick={onRoom}><ArrowLeft size={16}/>В комнату</button>
    {error&&<p role="alert" className="progress-error">{error}</p>}
    <div className="graph-filter-bar"><label>Навык графа<select value={context.skill??''} onChange={e=>onNavigate({skill:e.target.value||undefined})}><option value="">Все навыки</option>{data.skills.map(skill=><option key={skill.id} value={skill.id}>{skill.name}{skill.archived?' (архив)':''}</option>)}{context.skill&&!data.skills.some(s=>s.id===context.skill)&&<option value={context.skill}>Неизвестный навык</option>}</select></label><label>Тема графа<select value={theme} onChange={e=>{const value=e.target.value as typeof theme;setTheme(value);try{localStorage.setItem('tinyme:graph-theme',value);setThemeError('');}catch{setThemeError('Тема изменена для этой сессии. Не удалось сохранить настройку.');}}}><option value="obsidian">Obsidian</option><option value="whiteboard">Белая доска</option></select></label></div>
    {themeError&&<p role="status" className="progress-hint">{themeError}</p>}
    {focusMissing&&<p role="status" className="progress-hint">Узел не найден в выбранном навыке. Проверь ссылку или сбрось фильтр.</p>}
    <div className="graph-legend" aria-label="Типы узлов"><span><CircleDot size={16}/>Навык</span><span><span className="graph-legend-task"/>Задача</span><span><Trophy size={16}/>Веха · 0 XP</span><span><Flag size={16}/>Цель · 0 XP</span></div>
    <div className="graph-explorer"><div className="graph-surface" data-graph-theme={theme}>
      <div className="graph-count"><GitBranch size={16}/><span>Показано {graph.nodes.length} из {graph.total} узлов</span></div>
      {graph.nodes.length?<GraphCanvas graph={graph} context={context} onSelect={select}/>:<div className="graph-empty"><GitBranch size={36}/><h2>Здесь начнётся твой путь</h2><p>{data.skills.length?'В выбранном навыке пока нет узлов.':'Создай навык и выполни первую задачу. Граф построится из твоих действий.'}</p><button className="button secondary" onClick={data.skills.length?()=>onNavigate({}):onProgress}>{data.skills.length?'Показать все навыки':'К навыкам и задачам'}</button></div>}
      {graph.truncated&&<p className="graph-limit" role="status">Показаны последние узлы с контекстом навыков, максимум 50.{selected?' Узел из ссылки включён в граф.':''} Все {graph.total} доступны в текстовом списке.</p>}
    </div>
    <section className="graph-node-card" aria-label="Карточка узла" aria-live="polite" aria-atomic="true">
      {selected?<><div className="graph-card-heading"><span>{graphKindNames[selected.kind]}</span><button className="progress-icon-button" aria-label="Снять выбор узла" onClick={()=>onNavigate({skill:context.skill})}><X size={18}/></button></div><h2>{selected.title}</h2><p>{data.skills.find(s=>s.id===selected.skillId)?.name}{selected.level?` · уровень ${selected.level}`:''}</p><div className="graph-card-facts"><strong>{selected.kind==='skill'?`${selected.xp} XP всего`:`${selected.xp>0?'+':''}${selected.xp} XP`}</strong>{selected.kind==='skill'&&<span>Ещё {levelProgress(selected.xp).remaining} XP до следующего уровня</span>}{selected.at&&<time dateTime={selected.at}>{dateLabel(selected.at)}</time>}{selected.minutes!==undefined&&selected.minutes!==null&&<span>{selected.minutes} мин</span>}{selected.status&&<span>{selected.status}</span>}</div>{selected.description&&<p className="graph-card-description">{selected.description}</p>}<h3>Связанные узлы</h3><div className="graph-card-links">{graph.allNodes.filter(n=>n.id!==selected.id&&neighbors.has(n.id)).map(n=><button className="button secondary" key={n.id} onClick={()=>select(n.id)}>{graphKindNames[n.kind]}: {n.title}</button>)}</div></>:<><h2>Из каких шагов сложился результат?</h2><p>Выбери узел, чтобы увидеть его данные и связанные действия. Можно воспользоваться текстовым списком ниже.</p></>}
    </section></div>
    <button className="button secondary graph-list-toggle" aria-expanded={listOpen} aria-controls="graph-full-list" onClick={()=>setListOpen(!listOpen)}><List size={17}/>{listOpen?'Скрыть':'Показать'} полный текстовый список ({graph.total})</button>
    {listOpen&&<section id="graph-full-list" className="graph-full-list" aria-label="Полный список узлов"><label>Поиск по названию<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Найти шаг или веху"/></label><ol>{list.map(n=><li key={n.id}><a href={graphHref({...context,focus:n.id})} onClick={e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();select(n.id);}} style={{'--skill-color':n.color} as CSSProperties}><span className="graph-list-kind">{graphKindNames[n.kind]}</span><strong>{n.title}</strong><span>{data.skills.find(s=>s.id===n.skillId)?.name} · {n.xp} XP{n.at?' · '+dateLabel(n.at):''}</span></a></li>)}</ol>{!list.length&&<p>Подходящих узлов пока нет.</p>}</section>}
    <p className="progress-local-note">Граф читает локальный прогресс. Фильтры, темы и просмотр узлов не начисляют XP.</p>
  </div>;
}
