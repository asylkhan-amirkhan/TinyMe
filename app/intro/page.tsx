import { EnterRoomLink } from "@/features/intro/entry-transition";
import { IntroOrnaments, IntroSprout, Hourglass } from "@/features/intro/intro-ornaments";
import { PixelGears } from "@/features/intro/pixel-gears";
import { PixelHead } from "@/features/intro/pixel-head";
import styles from "@/features/intro/intro.module.css";

export default function IntroPage() {
  return <main className={styles.intro}>
    <IntroOrnaments />
    <span className={styles.corner}>TINYME / ДВОРЕЦ РАЗУМА</span>
    <div className={styles.scene}>
      <PixelGears />
      <div className={styles.ambientFog} aria-hidden="true" />
      <IntroSprout />
      <h1 className={styles.title}>
        <span className={styles.srOnly}>TinyMe</span>
        <svg viewBox="0 0 320 320" preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden="true">
          {[..."TINYME"].map((glyph, index) => {
            // Same coordinate system as the head: letters follow its crown.
            const [x, y, angle] = [
              [56, 39, -36], [99, 18, -23], [144, 8, -8],
              [190, 8, 8], [235, 18, 23], [278, 39, 36],
            ][index];
            return <g key={index} transform={`translate(${x} ${y}) rotate(${angle})`}>
              <g className={styles.letter} style={{ animationDelay: `${Math.min(index, 5 - index) * -.55}s`, animationDuration: `${3.2 + Math.min(index, 5 - index) * .17}s` }}>
                <text x="0" y="0" textAnchor="middle" dominantBaseline="central" className={styles.titleGlyph}>{glyph}</text>
              </g>
            </g>;
          })}
        </svg>
      </h1>
      <div className={styles.headLink}>
        <PixelHead className={styles.head} />
      </div>
      <div className={styles.invitation}>
        <Hourglass />
        <span className={styles.prompt}>Нажмите, чтобы продолжить</span>
      </div>
    </div>
    <p className={styles.caption}><span aria-hidden="true">N</span><span className={styles.captionText}>МАЛЕНЬКОЕ<br />ВНУТРЕННЕЕ<br />ПРОСТРАНСТВО</span></p>
    <EnterRoomLink />
  </main>;
}
