import { useMemo } from 'react';
import type * as alphaTab from '@coderline/alphatab';
import {
  absoluteTick,
  computeTrackFingering,
  findNextSoundingBeat,
  firstSoundingBeat,
  isFrettedTrack,
  fingerBeat,
  type Fingering,
} from '../guide/fingering';
import { chordName } from '../guide/chord';
import { Fretboard, FINGER_COLORS, FINGER_NAMES } from './Fretboard';

interface Props {
  track: alphaTab.model.Track | null;
  playedBeat: alphaTab.model.Beat | null;
  showNext: boolean;
}

const TICKS_PER_QUARTER = 960;

export function GuidePanel({ track, playedBeat, showNext }: Props) {
  // トラック全体の運指は読み込み/切り替え時に一度だけ計算
  const fingeringMap = useMemo(() => (track ? computeTrackFingering(track) : new Map<number, Fingering>()), [track]);

  if (!track) return <div className="guide empty">譜面を読み込むと、ここに指ガイドが表示されます。</div>;
  if (!isFrettedTrack(track)) {
    return <div className="guide empty">このパート({track.name})は弦楽器ではないため、指ガイドはありません。</div>;
  }

  const staff = track.staves[0];
  const tuning = staff.tuning;

  // 別トラックの拍が来た場合(切り替え直後など)は無視
  const beat =
    playedBeat && playedBeat.voice.bar.staff.track === track ? playedBeat : firstSoundingBeat(track);
  const nextBeat = beat ? findNextSoundingBeat(beat) : null;

  const getFingering = (b: alphaTab.model.Beat | null) =>
    b ? fingeringMap.get(b.id) ?? fingerBeat(b, 1, b.voice.bar.staff.tuning.length) : null;

  const current = getFingering(beat);
  const next = getFingering(nextBeat);
  const curChord = beat ? chordName(beat) : null;
  const nextChord = nextBeat ? chordName(nextBeat) : null;
  const beatsUntilNext =
    beat && nextBeat ? Math.max(0, (absoluteTick(nextBeat) - absoluteTick(beat)) / TICKS_PER_QUARTER) : null;

  const usedFingers: number[] = [...new Set(current?.notes.map((n) => n.finger as number).filter((f) => f > 0) ?? [])];

  return (
    <div className="guide">
      <div className="guide-info">
        <div className="chord-now">
          <span className="label">今</span>
          <span className="chord">{beat?.isRest ? '休符' : curChord ?? '—'}</span>
        </div>
        {showNext && (
          <div className="chord-next">
            <span className="label">次</span>
            <span className="chord">{nextChord ?? (nextBeat ? '単音' : '—')}</span>
            {beatsUntilNext !== null && (
              <span className="countdown">あと {Number.isInteger(beatsUntilNext) ? beatsUntilNext : beatsUntilNext.toFixed(1)} 拍</span>
            )}
          </div>
        )}
        <div className="position">
          ポジション: <b>{current?.position ?? 1}</b> フレット
          {current?.barre && <span className="barre-tag">セーハ {current.barre.fret}F</span>}
        </div>
        <div className="legend">
          {[1, 2, 3, 4].map((f) => (
            <span key={f} className={`legend-item ${usedFingers.includes(f) ? 'active' : ''}`}>
              <i style={{ background: FINGER_COLORS[f] }}>{f}</i>
              {FINGER_NAMES[f]}
            </span>
          ))}
          <span className="legend-item">
            <i style={{ background: '#0f172a', border: '1.5px solid #38bdf8', color: '#38bdf8' }}>0</i>
            開放
          </span>
          <span className="legend-item">
            <i style={{ background: '#7f1d1d', border: '1.5px solid #ef4444', color: '#fff' }}>✕</i>
            ミュート
          </span>
        </div>
      </div>
      <div className="guide-board">
        <Fretboard current={current} next={next} showNext={showNext} tuning={tuning} />
      </div>
    </div>
  );
}
