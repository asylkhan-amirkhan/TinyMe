import type {AtmospherePreset,AtmosphereState} from '@/domain/atmosphere';
export type AtmosphereControls={
 lighting:{choose:(value:AtmosphereState['lighting'])=>void};
 season:{choose:(value:AtmosphereState['season'])=>void};
 accentLights:{update:(value:AtmosphereState['lights'])=>void};
 rain:{configure:(value:AtmosphereState['rain'])=>void;setSoundEnabled:(on:boolean)=>Promise<boolean>};
 storm:{configure:(value:AtmosphereState['storm'])=>void;setSoundEnabled:(on:boolean)=>Promise<boolean>};
 wind:{changeVolume:(value:number)=>void;setSoundEnabled:(on:boolean)=>Promise<boolean>};
};
export function applyAtmosphere(preset:AtmospherePreset,controls:AtmosphereControls):Promise<boolean>{
 const s=preset.settings;
 controls.lighting.choose(s.lighting);controls.season.choose(s.season);controls.accentLights.update(s.lights);
 controls.rain.configure(s.rain);controls.storm.configure(s.storm);controls.wind.changeVolume(s.wind.volume);
 // Start every channel within the click's user gesture, before awaiting any audio load.
 return Promise.all([controls.rain.setSoundEnabled(s.rain.sound),controls.storm.setSoundEnabled(s.storm.sound),controls.wind.setSoundEnabled(s.wind.sound)]).then(results=>results.every(Boolean));
}
