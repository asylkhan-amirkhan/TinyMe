import styles from "./intro.module.css";

// Build a small sprite from whole pixels, then scale it without smoothing.
// Grouping each palette into one path keeps the scene light in the DOM.
function gearPixels() {
  const paths = ["", "", "", "", ""];
  function solid(x: number, y: number) {
    const r = Math.hypot(x, y);
    const a = Math.atan2(y, x);
    const tooth = ((a / (Math.PI * 2) * 20) % 1 + 1) % 1;
    const spoke = Math.abs(Math.sin(a * 2 + .25));
    return (r >= 32 && r <= 40) || (r > 39 && r < 46 && tooth > .22 && tooth < .78)
      || (r >= 11 && r <= 16) || (r >= 16 && r < 35 && spoke < .16)
      || (r > 3 && r < 8);
  }
  for (let iy = -94; iy <= 94; iy++) {
    for (let ix = -94; ix <= 94; ix++) {
      const x = ix / 2;
      const y = iy / 2;
      if (!solid(x, y)) continue;
      const r = Math.hypot(x, y);
      let tone = 2;
      if (!solid(x - .5, y - .5)) tone = 4;
      else if (!solid(x + .5, y + .5)) tone = 0;
      else if (r > 36 && r < 38 || r > 12 && r < 14) tone = 3;
      else if ((x * 13 + y * 7) % 19 === 0) tone = 1;
      // Rivets and inset panels around the rim.
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        const d = Math.hypot(x - Math.round(Math.cos(a) * 37), y - Math.round(Math.sin(a) * 37));
        if (d < 2.3) tone = d < 1 ? 4 : 0;
      }
      paths[tone] += `M${x} ${y}h.5v.5h-.5z`;
    }
  }
  return paths;
}

const pixels = gearPixels();
type GearSpec = [number, number, number];
const layers: { className: string; gears: GearSpec[]; speed: number }[] = [
  { className: styles.farGears, speed: 240, gears: [[190, 220, 165], [620, -30, 160], [1190, -80, 190], [1760, 0, 180], [1610, 850, 180]] },
  { className: styles.middleGears, speed: 190, gears: [[445, 590, 220], [1395, 385, 275], [1750, 895, 185]] },
  { className: styles.nearGears, speed: 160, gears: [[100, -130, 540], [90, 1000, 370], [1770, 1000, 580]] },
];

export function PixelGears() {
  return <svg className={styles.mechanism} viewBox="0 0 1754 896" preserveAspectRatio="xMidYMid slice" aria-hidden="true" fill="none">
    <defs>
      <radialGradient id="distant-mist">
        <stop stopColor="#c3b1d4" stopOpacity=".22" />
        <stop offset=".5" stopColor="#aaa3b4" stopOpacity=".1" />
        <stop offset="1" stopColor="#aaa3b4" stopOpacity="0" />
      </radialGradient>
    </defs>
    {layers.map(layer => <g key={layer.className} className={layer.className}>
      {layer.gears.map(([x, y, r], index) => <g key={index} transform={`translate(${x} ${y}) scale(${r / 46})`}>
        <g className={styles.gear} style={{ animationDuration: `${layer.speed + index * 9}s`, animationDirection: index % 2 ? "reverse" : "normal" }} shapeRendering="crispEdges">
          {pixels.map((d, tone) => <path key={tone} d={d} fill={`var(--gear-${tone})`} />)}
        </g>
      </g>)}
      {layer.className !== styles.nearGears && <g fill="url(#distant-mist)">
        <ellipse cx="770" cy="360" rx="1100" ry="230" />
        <ellipse cx="1350" cy="680" rx="800" ry="175" />
      </g>}
    </g>)}
  </svg>;
}
