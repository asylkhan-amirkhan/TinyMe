export function rainVolume(value: unknown): number {return typeof value==='number'&&Number.isFinite(value)?Math.min(1,Math.max(0,value)):.35;}
export function rainDrop(index:number,time:number){
 const mod=(v:number,n:number)=>((v%n)+n)%n;
 return {x:13.6+mod(index*1.731+time*.17,8.8),z:42+mod(index*23.79-time*(92+(index%5)*12),173),length:7+(index%4)*3};
}
