import type { AccentLights } from './accent-lights';
/** Continuous cycles divide the room clock's 120π wrap exactly. No random flashes. */
export function garlandTarget(settings: AccentLights, time: number): AccentLights {
  if (settings.garlandMode === 'steady' || !settings.garland || !settings.garlandInstalled) return settings;
  const t=Number.isFinite(time)?time:0;
  const flow=settings.garlandMode==='flow' || settings.garlandMode==='flow-twinkle';
  const twinkle=settings.garlandMode==='twinkle' || settings.garlandMode==='flow-twinkle';
  const color=flow ? '#'+[0,2*Math.PI/3,4*Math.PI/3].map(phase=>Math.round(195+60*Math.cos(t/6+phase)).toString(16).padStart(2,'0')).join('') : settings.garlandColor;
  // A slow breathing shimmer, always between 65% and 100% of the chosen brightness.
  const intensity=twinkle ? .825+.175*Math.cos(t/2) : 1;
  return {...settings,garlandColor:color,garlandBrightness:settings.garlandBrightness*intensity};
}
