export type LightingMode = 'auto' | 'day' | 'evening' | 'night';
export function validLightingMode(value: unknown): value is LightingMode { return value==='auto'||value==='day'||value==='evening'||value==='night'; }
export function daylightAt(hour: number): number {
 const h=((hour%24)+24)%24;
 const smooth=(t:number)=>t*t*(3-2*t);
 if(h<6||h>=20)return 0;
 if(h<8)return smooth((h-6)/2);
 if(h<18)return 1;
 return 1-smooth((h-18)/2);
}
export function resolveDaylight(mode: LightingMode, date: Date): number {
 return mode==='day'?1:mode==='evening'?.28:mode==='night'?0:daylightAt(date.getHours()+date.getMinutes()/60+date.getSeconds()/3600);
}
export function lightingName(daylight:number) {return daylight>=.8?'День':daylight<=.2?'Ночь':'Сумерки';}
