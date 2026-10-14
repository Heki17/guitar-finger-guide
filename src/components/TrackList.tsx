import type * as alphaTab from '@coderline/alphatab';
import type { TrackMix } from '../player/useAlphaTab';
import { isFrettedTrack } from '../guide/fingering';

interface Props {
  tracks: alphaTab.model.Track[];
  selected: number;
  mixes: TrackMix[];
  onSelect: (index: number) => void;
  onMixChange: (index: number, mix: TrackMix) => void;
}

/** Songsterr 風のトラック(パート)切り替え + ミュート/ソロ/音量 */
export function TrackList({ tracks, selected, mixes, onSelect, onMixChange }: Props) {
  return (
    <div className="tracks">
      {tracks.map((t, i) => {
        const mix = mixes[i] ?? { mute: false, solo: false, volume: 1 };
        const fretted = isFrettedTrack(t);
        return (
          <div key={i} className={`track ${i === selected ? 'selected' : ''}`}>
            <button className="track-name" onClick={() => onSelect(i)} title="このパートを表示・ガイド対象にする">
              <span className="track-icon">{t.staves[0]?.isPercussion ? '🥁' : fretted ? '🎸' : '🎹'}</span>
              {t.name || `Track ${i + 1}`}
            </button>
            <button
              className={`tbtn ${mix.mute ? 'on mute' : ''}`}
              onClick={() => onMixChange(i, { ...mix, mute: !mix.mute })}
              title="ミュート"
            >
              M
            </button>
            <button
              className={`tbtn ${mix.solo ? 'on solo' : ''}`}
              onClick={() => onMixChange(i, { ...mix, solo: !mix.solo })}
              title="ソロ"
            >
              S
            </button>
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.05}
              value={mix.volume}
              onChange={(e) => onMixChange(i, { ...mix, volume: Number(e.target.value) })}
              title={`音量 ${Math.round(mix.volume * 100)}%`}
            />
          </div>
        );
      })}
    </div>
  );
}
