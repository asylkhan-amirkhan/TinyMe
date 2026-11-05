import type {AccentLights} from './accent-lights';
import type {LightingMode} from './lighting';
import type {SeasonMode} from './season';
export type AtmosphereState={
 lighting:LightingMode;season:SeasonMode;lights:AccentLights;
 rain:{enabled:boolean;sound:boolean;volume:number;snowIntensity:number};
 storm:{enabled:boolean;sound:boolean;volume:number};
 wind:{sound:boolean;volume:number};
};
export type AtmospherePreset={id:'evening'|'rainy-night'|'winter-cozy';name:string;description:string;detail:string;settings:AtmosphereState};
const warm:AccentLights={garlandInstalled:true,garland:true,desk:true,garlandMode:'steady',garlandColor:'#ffbb6b',deskColor:'#ffbe7b',garlandBrightness:55,deskBrightness:35};
export const atmospherePresets:readonly AtmospherePreset[]=[
 {id:'evening',name:'Тихий вечер',description:'Лето, закат и мягкий янтарный свет',detail:'Без фоновых звуков',settings:{lighting:'evening',season:'summer',lights:{...warm},rain:{enabled:false,sound:false,volume:.22,snowIntensity:60},storm:{enabled:false,sound:false,volume:.18},wind:{sound:false,volume:.18}}},
 {id:'rainy-night',name:'Дождливая ночь',description:'Осень, дождь и лавандовая подсветка',detail:'Тихий дождь · без грома',settings:{lighting:'night',season:'autumn',lights:{...warm,garlandColor:'#c4a5ff',deskColor:'#a3c9df',garlandBrightness:35,deskBrightness:28},rain:{enabled:true,sound:true,volume:.22,snowIntensity:60},storm:{enabled:false,sound:false,volume:.18},wind:{sound:false,volume:.18}}},
 {id:'winter-cozy',name:'Зимний уют',description:'Снег, вечер и золотистая гирлянда',detail:'Мягкий ветер · снег 60%',settings:{lighting:'evening',season:'winter',lights:{...warm,garlandMode:'twinkle',garlandBrightness:65,deskBrightness:45},rain:{enabled:true,sound:false,volume:.22,snowIntensity:60},storm:{enabled:false,sound:false,volume:.18},wind:{sound:true,volume:.18}}},
];
/** Compare effective settings: an inaudible channel's stored level cannot change the atmosphere. */
export function matchingAtmosphere(state:AtmosphereState):AtmospherePreset['id']|null {
 return atmospherePresets.find(({settings:s})=>s.lighting===state.lighting&&s.season===state.season&&
  (Object.keys(s.lights) as (keyof AccentLights)[]).every(k=>s.lights[k]===state.lights[k])&&
  s.rain.enabled===state.rain.enabled&&s.storm.enabled===state.storm.enabled&&
  (s.season!=='winter'||!s.rain.enabled||s.rain.snowIntensity===state.rain.snowIntensity)&&
  (['rain','storm','wind'] as const).every(k=>s[k].sound===state[k].sound&&(!s[k].sound||Math.abs(s[k].volume-state[k].volume)<.001)))?.id??null;
}
