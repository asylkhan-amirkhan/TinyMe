export type Lightning = { at: number; seed: number; strength: number; delay: number };

export function stormStrike(now: number, random = Math.random): Lightning {
 const distance = random();
 return {at: now, seed: Math.floor(random()*100000), strength: .65 + (1-distance)*.35, delay: 1.2 + distance*3.3};
}
export function nextStormDelay(random = Math.random) { return 24000 + random()*18000; }
// One soft pulse, never a strobe. The renderer also respects reduced motion.
export function lightningIntensity(strike: Lightning | null, now: number) {
 if (!strike) return 0;
 const age = (now-strike.at)/1000;
 if (age < 0 || age >= .9) return 0;
 return strike.strength * (age < .09 ? age/.09 : Math.exp(-(age-.09)*6)*(1-age/.9));
}
export function lightningPath(seed: number) {
 const points: [number,number][]=[];
 let state=seed>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const center=15+random()*5;
 for(let i=0;i<9;i++)points.push([center+(random()-.5)*2.3,214-i*18]);
 return points;
}
