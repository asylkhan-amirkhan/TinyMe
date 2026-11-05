export const seasons=['spring','summer','autumn','winter'] as const;
export type Season=typeof seasons[number];
export type SeasonMode=Season|'auto';
export const seasonNames:Record<Season,string>={spring:'Весна',summer:'Лето',autumn:'Осень',winter:'Зима'};
export const seasonKey='myroom:season';
export function parseSeason(value:unknown):SeasonMode {return value==='auto'||seasons.includes(value as Season)?value as SeasonMode:'auto';}
export function resolveSeason(mode:SeasonMode,date=new Date()):Season {
 if(mode!=='auto')return mode;
 const month=date.getMonth();return month>=2&&month<=4?'spring':month>=5&&month<=7?'summer':month>=8&&month<=10?'autumn':'winter';
}
export const seasonPalette:Record<Season,{sky:string;horizon:string;foliage:string;beam:string;particle:string}>={
 spring:{sky:'#93bfd7',horizon:'#f4d9db',foliage:'#cba3b9',beam:'255,222,210',particle:'#ffd9e4'},
 summer:{sky:'#73b9df',horizon:'#ffe2ae',foliage:'#54866c',beam:'255,224,170',particle:'#ffe8a4'},
 autumn:{sky:'#9aabc3',horizon:'#edba8b',foliage:'#bd8055',beam:'255,195,139',particle:'#e4a05e'},
 winter:{sky:'#91a9c5',horizon:'#e0eaf0',foliage:'#b8c9dd',beam:'205,225,255',particle:'#edf7ff'}
};
/** Deterministic particles follow the room's pauseable clock. */
export function seasonParticle(index:number,time:number,season:Season){
 const t=Number.isFinite(time)?((time%(120*Math.PI))+120*Math.PI)%(120*Math.PI):0, period=Math.PI*(season==='winter'?12:20);
 const phase=((t/period+index*.137)%1+1)%1;
 return {x:14+((index*1.37)%7.6)+Math.sin(t*.5+index)*.22,z:season==='summer'?76+((index*23)%100)+Math.sin(t*.6+index)*5:210-phase*166,alpha:Math.sin(phase*Math.PI)*.75};
}
