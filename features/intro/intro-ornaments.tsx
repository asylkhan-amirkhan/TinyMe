import styles from "./intro.module.css";

export function IntroOrnaments() {
  const stars = [[47, 103, 5], [202, 213, 9], [797, 74, 5], [1112, 161, 15], [1517, 96, 18], [1585, 165, 5], [1249, 368, 17], [501, 355, 16], [1368, 554, 8], [146, 767, 9], [1148, 594, 6], [604, 594, 6], [1585, 677, 8], [99, 420, 4], [210, 442, 6], [1203, 196, 4]];
  return <svg className={styles.ornaments} viewBox="0 0 1754 896" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
    <path d="M37 13H1717M1742 36V859M1717 882H37M12 859V36" stroke="#f2c48b" strokeWidth="1.3" />
    {[[12, 13], [1742, 13], [12, 882], [1742, 882]].map(([x, y], i) => <g key={i} transform={`translate(${x} ${y}) scale(${i % 2 ? -1 : 1} ${i > 1 ? -1 : 1})`} stroke="#efb58c" strokeWidth="2" shapeRendering="crispEdges">
      <path d="M0 21H5V15H10V10H16V5H23M0 7H8V0M15 0V6H21V0M0 0H4V-5" />
      <path d="M9 14H13V18H9Z" fill="#ffd49b" stroke="none" />
    </g>)}
    <g fill="#ffc791" shapeRendering="crispEdges">
      {stars.map(([x, y, r], i) => <path key={i} opacity={i % 3 === 0 ? .55 : .95} d={`M${x} ${y - r}l${r * .25} ${r * .7}l${r * .75} ${r * .3}l${-r * .75} ${r * .25}l${-r * .25} ${r * .75}l${-r * .25} ${-r * .75}l${-r * .75} ${-r * .25}l${r * .75} ${-r * .3}Z`} />)}
    </g>
  </svg>;
}

export function IntroSprout() {
  return <svg className={styles.sprout} viewBox="-48 -30 96 66" fill="#eda58f" stroke="#c88687" strokeWidth="2" shapeRendering="crispEdges" aria-hidden="true">
    <path d="M0 27V-5M-2 11Q-42 13 -42 -23Q-9 -25 -2 11ZM2 11Q42 13 42 -23Q9 -25 2 11Z" />
    <path d="M-2 11L-32 -16M2 11L32 -16" stroke="#73516c" strokeWidth="1.4" />
  </svg>;
}

export function Hourglass() {
  return <svg className={styles.hourglass} viewBox="0 0 100 110" fill="none" aria-hidden="true" shapeRendering="crispEdges">
    <path d="M18 14H82V29L75 39L55 54V60L75 75L82 86V99H18V86L25 75L45 60V54L25 39L18 29Z" fill="#b68189" fillOpacity=".35" stroke="#ffe0aa" strokeWidth="2" />
    <path d="M24 29H76L68 39L52 51H48L32 39Z" fill="#f3b887" />
    <path d="M27 91L40 81L49 69H51L60 81L73 91Z" fill="#f2b384" />
    <path d="M49 55H51V82H49Z" fill="#ffe0a1" />
    <path d="M12 7H88V15H12ZM12 98H88V106H12Z" fill="#e9a48d" stroke="#ffdaa2" strokeWidth="2" />
    <path d="M16 9H83M16 100H83" stroke="#ffddb0" strokeWidth="2" />
    <path d="M23 19V28M78 78V88" stroke="#ffe3b7" strokeWidth="3" />
    <path d="M2 47L-9 43M3 60L-11 62M7 77L-3 85M98 47L109 43M97 60L111 62M93 77L103 85" stroke="#f9cb92" strokeWidth="2" />
  </svg>;
}
