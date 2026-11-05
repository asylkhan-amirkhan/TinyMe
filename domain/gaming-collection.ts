import type {Product} from './model';
export const games = ['Elden Ring','Sekiro','CS2'] as const;
export type Game = typeof games[number];
// Original miniature fan-art, with compact silhouettes that fit the shelf openings.
export const gamingCollection:Product[] = [
  {id:'figure-alexander',name:'Александр · Elden Ring',game:'Elden Ring',price:28,color:'#ba7956',decorHeight:28},
  {id:'figure-ranni',name:'Ранни · Elden Ring',game:'Elden Ring',price:35,color:'#a2b8d9',decorHeight:29},
  {id:'relic-rune',name:'Золотая руна · Elden Ring',game:'Elden Ring',price:18,color:'#d4b36a',decorHeight:25},
  {id:'figure-wolf',name:'Волк · Sekiro',game:'Sekiro',price:35,color:'#b67850',decorHeight:29},
  {id:'figure-idol',name:'Идол резчика · Sekiro',game:'Sekiro',price:24,color:'#87c6be',decorHeight:26},
  {id:'relic-katana',name:'Катана на подставке · Sekiro',game:'Sekiro',price:22,color:'#bca990',decorHeight:19},
  {id:'figure-agent',name:'Агент CT · CS2',game:'CS2',price:32,color:'#748ca8',decorHeight:29},
  {id:'relic-trophy',name:'Турнирный кубок · CS2',game:'CS2',price:28,color:'#dbb36b',decorHeight:27},
  {id:'relic-headset',name:'Игровая гарнитура · CS2',game:'CS2',price:18,color:'#d89657',decorHeight:25},
].map(p=>({...p,game:p.game as Game,category:'Фигурки',w:1,h:1,kind:'collectible',surface:'floor',collection:'gaming'}));
gamingCollection.push(...([
  ['poster-erdtree','Древо Эрд · Elden Ring','Elden Ring',18,'#c9ac68'],
  ['poster-malenia','Алая гниль · Elden Ring','Elden Ring',20,'#b76762'],
  ['poster-ashina','Замок Асина · Sekiro','Sekiro',18,'#b96950'],
  ['poster-moon','Лунный поединок · Sekiro','Sekiro',20,'#829faf'],
  ['poster-cs2','Counter-Strike 2 · постер','CS2',16,'#d89b59'],
  ['poster-dust','Dust II · CS2','CS2',18,'#ad9777'],
] as const).map(([id,name,game,price,color])=>({id,name,game,price,color,category:'Постеры',w:3,h:1,kind:'art' as const,surface:'wall' as const,collection:'gaming' as const})));
