// Songsterr JSON から alphaTex に変換するコンバータ
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToAlphaTexTuning(midi: number): string {
  const note = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

export interface SongsterrMeta {
  songId: number;
  title: string;
  artist: string;
  image?: string;
  revisionId?: number;
  tracks: Array<{
    instrumentId: number;
    instrument: string;
    name: string;
    tuning?: number[];
    hash?: string;
    isVocalTrack?: boolean;
    isEmpty?: boolean;
  }>;
}

export interface SongsterrPart {
  partId: number;
  tuning?: number[];
  frets?: number;
  automations?: {
    tempo?: Array<{ measure: number; position: number; bpm: number }>;
  };
  measures: Array<{
    signature?: [number, number];
    voices: Array<{
      beats: Array<{
        notes?: Array<{ fret: number; string: number; tie?: boolean; dead?: boolean }>;
        duration?: [number, number];
        type?: number; // 1, 2, 4, 8, 16, 32, 64
        dots?: number;
        rest?: boolean;
        tuplet?: number;
      }>;
    }>;
  }>;
}

export interface TrackData {
  part: SongsterrPart;
  trackMeta: SongsterrMeta['tracks'][0];
}

/**
 * 1つまたは複数の Songsterr パートを 1 つのマルチトラック alphaTex にまとめる
 */
export function buildSongsterrAlphaTex(meta: SongsterrMeta, trackList: TrackData[]): string {
  if (trackList.length === 0) {
    return '\\tempo 120\n.\n\\track "Empty"\n\\staff {score tabs}\nr.1 |';
  }

  // 全トラックからテンポ自動化を収集
  const tempoMap = new Map<number, number>();
  for (const { part } of trackList) {
    if (part.automations?.tempo) {
      for (const t of part.automations.tempo) {
        if (t.measure !== undefined && t.bpm && !tempoMap.has(t.measure)) {
          tempoMap.set(t.measure, t.bpm);
        }
      }
    }
  }

  const initialBpm = tempoMap.get(0) || 120;

  const lines: string[] = [
    `\\title "${(meta.title || '').replace(/"/g, '\\"')}"`,
    `\\artist "${(meta.artist || '').replace(/"/g, '\\"')}"`,
    `\\tempo ${initialBpm}`,
  ];

  // 最長小節数
  const maxMeasures = Math.max(...trackList.map((t) => t.part.measures?.length || 0), 1);

  // 拍子マップ（全トラック共通の参照）
  const sigMap = new Map<number, [number, number]>();
  for (const { part } of trackList) {
    for (let m = 0; m < (part.measures?.length || 0); m++) {
      if (part.measures[m].signature && !sigMap.has(m)) {
        sigMap.set(m, part.measures[m].signature!);
      }
    }
  }

  for (const { part, trackMeta } of trackList) {
    const tuningMidis = part.tuning || trackMeta.tuning || [64, 59, 55, 50, 45, 40];
    const nStrings = tuningMidis.length;
    const tuningStr = tuningMidis.map(midiToAlphaTexTuning).join(' ');

    lines.push(`\\track "${(trackMeta.name || trackMeta.instrument || 'Guitar').replace(/"/g, '\\"')}"`);
    lines.push(`\\staff {score tabs}`);
    lines.push(`\\tuning(${tuningStr})`);

    const measures = part.measures || [];

    for (let mIdx = 0; mIdx < maxMeasures; mIdx++) {
      const meas = measures[mIdx];
      const barTokens: string[] = [];

      // テンポ変更
      if (mIdx > 0 && tempoMap.has(mIdx)) {
        barTokens.push(`\\tempo ${tempoMap.get(mIdx)}`);
      }

      // 拍子変更
      const sig = meas?.signature || sigMap.get(mIdx);
      if (sig) {
        barTokens.push(`\\ts(${sig[0]} ${sig[1]})`);
      }

      const voice = meas?.voices?.[0];
      if (!voice || !voice.beats || voice.beats.length === 0) {
        barTokens.push('r.1');
      } else {
        for (const beat of voice.beats) {
          let dur = beat.type || 4;
          if (![1, 2, 4, 8, 16, 32, 64].includes(dur)) dur = 4;
          const dots = beat.dots === 1 ? '.' : beat.dots === 2 ? '..' : '';
          const tupletMod = beat.tuplet && beat.tuplet > 1 ? `{tu ${beat.tuplet}}` : '';

          const playableNotes = (beat.notes || []).filter((n) => !n.dead);
          // Songsterr の string は 0 始まりなので +1 して 1〜nStrings に収める
          const validNotes = playableNotes
            .map((n) => ({ fret: n.fret, string: n.string + 1 }))
            .filter((n) => n.string >= 1 && n.string <= nStrings);

          if (beat.rest || validNotes.length === 0) {
            barTokens.push(`r.${dur}${dots}${tupletMod}`);
          } else if (validNotes.length === 1) {
            const n = validNotes[0];
            barTokens.push(`${n.fret}.${n.string}.${dur}${dots}${tupletMod}`);
          } else {
            // 和音: 同一弦の重複を排除
            const seen = new Set<number>();
            const unique = validNotes.filter((n) => {
              if (seen.has(n.string)) return false;
              seen.add(n.string);
              return true;
            });
            const chordNotes = unique.map((n) => `${n.fret}.${n.string}`).join(' ');
            barTokens.push(`(${chordNotes}).${dur}${dots}${tupletMod}`);
          }
        }
      }

      barTokens.push('|');
      lines.push(barTokens.join(' '));
    }
  }

  return lines.join('\n');
}
