"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarDays, Clock3, Headphones, Music2, Play, Pause, Disc3, ArrowRight } from "lucide-react";
import type { MusicState } from "@/lib/music-storage";
import { localDay } from "@/lib/music-storage";
import { listeningDashboard, listeningTime, listeningExactTime, type StatisticsPeriod } from "@/lib/music-statistics";

const periods: { value: StatisticsPeriod; label: string }[] = [
  { value: "1", label: "Сегодня" }, { value: "7", label: "7 дней" },
  { value: "30", label: "30 дней" }, { value: "all", label: "Всё время" },
];
function dateLabel(key: string, long = false) {
  return new Date(`${key.length === 7 ? key + "-01" : key}T12:00:00`).toLocaleDateString("ru-RU",
    key.length === 7 ? { month: "short", year: "numeric" } :
      { day: "numeric", month: long ? "long" : "short" });
}

export default function MusicStatistics({ music, period, onPeriod, playing, currentId, onPlay, onBrowse }: {
  music: MusicState; period: StatisticsPeriod; onPeriod: (period: StatisticsPeriod) => void;
  playing: boolean; currentId: string; onPlay: (id: string) => void; onBrowse: () => void;
}) {
  const today = localDay();
  const data = useMemo(() => listeningDashboard(music.stats, music.tracks, period, today),
    [music.stats, music.tracks, period, today]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [calendarDay, setCalendarDay] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const favorite = data.top[0];
  const favoriteAvailable = !!favorite && music.tracks.some(t => t.id === favorite.id);
  const favoritePlaying = favorite?.id === currentId && playing;
  const share = favorite && data.seconds > 0 ? Math.round(favorite.seconds / data.seconds * 100) : 0;
  const peak = data.buckets.reduce((best, b) => b.seconds >= best.seconds ? b : best, data.buckets[0]);
  const selected = data.buckets.find(b => b.key === selectedBucket) ?? peak;
  const calendarSelected = data.calendar.find(d => d.key === calendarDay) ?? data.calendar.at(-1)!;
  const calendarMax = Math.max(1, ...data.calendar.map(d => d.seconds));
  const previous = data.previousSeconds;
  const change = previous !== null && previous > 0 ? Math.round((data.seconds - previous) / previous * 100) : null;
  const compareText = previous === null ? "Вся сохранённая история" : change === null
    ? "Пока нет данных для сравнения" : `${change > 0 ? "+" : ""}${change}% к прошлому периоду`;
  return (
    <div className="music-statistics tabular-nums">
      <div className="page-heading listening-heading">
        <div><h1>Твой ритм.</h1><p>Любимые треки и время, которое стало твоим.</p></div>
        <div className="listening-period" style={{"--period-index": periods.findIndex(p => p.value === period)} as CSSProperties} role="group" aria-label="Период статистики">
          {periods.map(p => <button key={p.value} aria-pressed={period === p.value}
            onClick={() => { onPeriod(p.value); setSelectedBucket(null); }}>{p.label}</button>)}
        </div>
      </div>

      <div className="listening-metrics">
        <section className="listening-surface listening-metric"><span><Clock3 aria-hidden="true"/> Время с музыкой</span>
          <strong>{listeningTime(data.seconds).split(/(\d[\d\s]*\d|\d)/).map((part,index)=><span key={index} className={/\d/.test(part) ? "poster-time-number" : "poster-time-unit"}>{part}</span>)}</strong>
          <small className={change !== null && change > 0 ? "listening-growth" : ""}>
            {change !== null && (change >= 0 ? <ArrowUpRight aria-hidden="true"/> : <ArrowDownRight aria-hidden="true"/>)}{compareText}
          </small>
        </section>
        <section className="listening-surface listening-metric"><span><Headphones aria-hidden="true"/> Прослушиваний</span>
          <strong>{data.plays.toLocaleString("ru-RU")}</strong><small>Дослушано до конца: {data.completed}</small>
        </section>
        <section className="listening-surface listening-metric"><span><Music2 aria-hidden="true"/> Разных треков</span>
          <strong>{data.top.length}</strong><small>{data.activeDays ? `Дней с музыкой: ${data.activeDays} из ${data.dayCount}` : "Первый трек станет началом истории"}</small>
        </section>
      </div>

      <div className="listening-main-grid">
        <section className="listening-surface listening-chart-panel" aria-label="График прослушивания">
          <header className="listening-panel-heading"><div><h2>Как звучали твои дни</h2>
            <p>{dateLabel(data.start)} — {dateLabel(data.end)}{data.monthly ? " · по месяцам" : ""}</p></div>
            <span className="listening-dot-label"><i/> Прослушивание</span>
          </header>
          <div className="listening-chart-detail" aria-live="polite"><span>{dateLabel(selected.key, true)}</span>
            <strong>{listeningExactTime(selected.seconds).split(/(\d+ сек)/).map((part,index)=><span key={index} className={part.includes("сек") ? "poster-seconds" : undefined}>{part}</span>)}</strong><small>{selected.plays} прослушиваний</small></div>
          <div className="listening-chart-scroll">
            <div className="listening-chart">
              <div className="listening-chart-grid" aria-hidden="true"><span>{listeningTime(peak.seconds)}</span><i/><i/><i/></div>
              {data.buckets.map((b, index) => <button key={b.key} className="listening-bar" data-today={b.key === today} data-peak={b.key === peak.key && b.seconds > 0} aria-pressed={selected.key === b.key}
                aria-label={`${dateLabel(b.key, true)}: ${listeningExactTime(b.seconds)}, ${b.plays} прослушиваний`}
                onClick={() => setSelectedBucket(b.key)} onFocus={() => setSelectedBucket(b.key)} onMouseEnter={() => setSelectedBucket(b.key)}>
                <span className="poster-chart-tooltip" aria-hidden="true">{dateLabel(b.key, true)} · {listeningExactTime(b.seconds)} · {b.plays} прослушиваний</span>
                <span className="listening-bar-track"><i style={{ height: b.seconds > 0 ? `${Math.max(2, b.seconds / Math.max(1, peak.seconds) * 100)}%` : "2px" }} data-empty={b.seconds === 0}/></span>
                <small>{data.buckets.length <= 7 ? (data.monthly ? b.key.slice(5) : new Date(b.key + "T12:00:00").toLocaleDateString("ru-RU", { weekday: "short" })) : index % (data.monthly ? 1 : 5) === 0 || index === data.buckets.length - 1 ? (data.monthly ? b.key.slice(5) : b.key.slice(8)) : "·"}</small>
              </button>)}
            </div>
          </div>
          <div className="listening-chart-summary"><span>В среднем за день <b>{listeningTime(data.average)}</b></span>
            <button className="text-button" aria-expanded={showTable} onClick={() => setShowTable(!showTable)}>{showTable ? "Скрыть данные" : "Все значения"}</button></div>
          {showTable && <div className="listening-table-scroll"><table><caption>Прослушивания за выбранный период</caption><thead><tr><th>Дата</th><th>Время</th><th>Прослушиваний</th></tr></thead>
            <tbody>{data.buckets.map(b => <tr key={b.key}><td>{dateLabel(b.key, true)}</td><td>{listeningExactTime(b.seconds)}</td><td>{b.plays}</td></tr>)}</tbody></table></div>}
        </section>

        <section className="listening-surface listening-favorite" data-playing={favoritePlaying} aria-label="Любимый трек периода">
          <header><span><Disc3 aria-hidden="true"/> Твой фаворит</span><span className="listening-favorite-share">{share}% времени</span></header>
          <div className="listening-record-scene" aria-hidden="true"><div className="listening-record-sleeve"><span>myroom.</span><i/></div><div className="listening-record"><i><Music2/></i></div></div>
          <div className="listening-favorite-copy"><span>Трек этого периода</span><h2>{favorite?.title ?? "Здесь будет твой любимый трек"}</h2>
            <p>{favorite ? `${listeningTime(favorite.seconds)} вместе · ${favorite.plays} прослушиваний` : "Включи музыку — и история начнётся."}</p>
            {favoriteAvailable ? <button className="button primary" onClick={() => onPlay(favorite.id)}>
              {favoritePlaying ? <Pause/> : <Play/>}{favoritePlaying ? "На паузу" : "Послушать ещё"}</button> :
              <button className="button secondary" onClick={onBrowse}>{favorite ? "Открыть коллекцию" : "Выбрать музыку"}<ArrowRight/></button>}
            {favorite && !favoriteAvailable && <small>Трек удалён, история сохранена</small>}
          </div>
        </section>
      </div>

      <div className="listening-bottom-grid">
        <section className="listening-surface listening-calendar">
          <header className="listening-panel-heading"><div><h2>Музыкальный календарь</h2><p>Последние 28 дней · для всех периодов</p></div><CalendarDays aria-hidden="true"/></header>
          <div className="listening-calendar-weekdays" aria-hidden="true">{data.calendar.slice(0, 7).map(day => <span key={day.key}>{new Date(day.key + "T12:00:00").toLocaleDateString("ru-RU", { weekday: "short" })}</span>)}</div>
          <div className="listening-calendar-grid">{data.calendar.map(day => <button key={day.key}
            aria-label={`${dateLabel(day.key, true)}: ${listeningTime(day.seconds)}`} aria-pressed={day.key === calendarSelected.key} data-strong={day.seconds / calendarMax > .45} data-today={day.key === today} data-level={day.seconds === 0 ? 0 : day.seconds / calendarMax <= .33 ? 1 : day.seconds / calendarMax <= .66 ? 2 : 3}
            onClick={() => setCalendarDay(day.key)} onFocus={() => setCalendarDay(day.key)}
            style={{ "--day-strength": day.seconds > 0 ? .15 + .65 * day.seconds / calendarMax : 0 } as CSSProperties}>
            {Number(day.key.slice(8))}<span aria-hidden="true">{day.seconds > 0 ? "·" : ""}</span></button>)}</div>
          <div className="listening-calendar-detail" aria-live="polite"><span>{dateLabel(calendarSelected.key, true)}</span><strong>{listeningExactTime(calendarSelected.seconds)}</strong></div>
          <div className="listening-legend"><span>Меньше</span>{[0, .2, .45, .8].map(n => <i key={n} style={{ opacity: n || .07 }}/>)}<span>Больше музыки</span></div>
        </section>
        <section className="listening-surface listening-ranking">
          <header className="listening-panel-heading"><div><h2>Ближе остальных</h2><p>Треки по времени прослушивания</p></div><span className="listening-count">{data.top.length}</span></header>
          {data.top.length ? <ol>{data.top.slice(0, 5).map((track, index) => {
            const available = music.tracks.some(t => t.id === track.id);
            const trackShare = data.seconds ? track.seconds / data.seconds * 100 : 0;
            return <li key={track.id} data-playing={track.id === currentId && playing}><span className="listening-rank"><span>{String(index + 1).padStart(2, "0")}</span><span className="poster-equalizer" aria-hidden="true"><i/><i/><i/></span></span>
              <div className="listening-rank-info"><strong>{track.title}</strong><small>{track.plays} прослушиваний · {Math.round(trackShare)}% времени</small>
                <span className="listening-share-bar" aria-hidden="true"><i style={{ width: `${trackShare}%` }}/></span></div>
              <span className="listening-rank-time">{listeningTime(track.seconds)}</span>
              <button className="listening-track-play" disabled={!available} aria-label={`${track.id === currentId && playing ? "Приостановить" : "Воспроизвести"} ${track.title}`} title={available ? track.title : "Трек удалён из коллекции"} onClick={() => onPlay(track.id)}>
                {track.id === currentId && playing ? <Pause/> : <Play/>}</button></li>;
          })}</ol> : <div className="listening-empty"><Headphones aria-hidden="true"/><p>Пока тихо. Включи любимый трек,<br/>а мы сохраним время с ним.</p><button className="button secondary" onClick={onBrowse}>Открыть музыку</button></div>}
        </section>
      </div>
      <p className="footnote listening-footnote">Считаем только фактическое звучание, включая музыку в фоне. Паузы, перемотка и выключенный звук не добавляют время. История хранится на этом устройстве.</p>
    </div>
  );
}
