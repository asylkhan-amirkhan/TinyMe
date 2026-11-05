export const posterArt:Record<string,{src:string;description:string}>={
  'poster-erdtree':{src:'/art/posters/poster-erdtree-v3.webp',description:'Золотое Древо Эрд над башнями Лейнделла. Светящиеся ветви, туман и одинокий Погасший на краю скалы.'},
  'poster-malenia':{src:'/art/posters/poster-malenia-v3.webp',description:'Маления: крылатый шлем, золотой протез и катана среди алых лепестков и бабочек.'},
  'poster-ashina':{src:'/art/posters/poster-ashina-v3.webp',description:'Замок Асина среди заснеженных гор: многоярусные крыши, каменные стены, туман и красные клёны.'},
  'poster-moon':{src:'/art/posters/poster-moon-v3.webp',description:'Однорукий Волк на крыше замка: протез, потрёпанный шарф и катана в холодном лунном свете.'},
  'poster-cs2':{src:'/art/posters/poster-cs2-v3.webp',description:'Контртеррористы в стиле CS2: противогаз SAS, детальная экипировка и контрастный янтарный свет.'},
  'poster-dust':{src:'/art/posters/poster-dust-v3.webp',description:'По мотивам Dust II: массивные двойные двери, песчаные стены, голубой купол и солнечная пыль.'},
};

const pending=new Set<string>();
const listeners=new Set<()=>void>();
export function subscribePosterArt(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}

/** Replace the cached fallback in place, then repaint even when room animation is off. */
export function loadPosterArt(id:string,canvas:HTMLCanvasElement){
  const art=posterArt[id];
  if(!art||pending.has(id))return;
  pending.add(id);
  const image=new Image();
  image.decoding='async';
  image.onload=()=>{
    const g=canvas.getContext('2d');
    if(g){g.save();g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,canvas.width,canvas.height);g.drawImage(image,0,0,canvas.width,canvas.height);g.restore();}
    listeners.forEach(listener=>listener());
  };
  // Keep the already drawn procedural artwork if the local file cannot load.
  image.onerror=()=>{};
  image.src=art.src;
}
