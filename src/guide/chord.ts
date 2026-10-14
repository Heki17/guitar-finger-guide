import * as alphaTab from '@coderline/alphatab';

const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// 優先度順(上ほど優先)
const TEMPLATES: { suffix: string; intervals: number[] }[] = [
  { suffix: '', intervals: [0, 4, 7] },
  { suffix: 'm', intervals: [0, 3, 7] },
  { suffix: '7', intervals: [0, 4, 7, 10] },
  { suffix: 'm7', intervals: [0, 3, 7, 10] },
  { suffix: 'maj7', intervals: [0, 4, 7, 11] },
  { suffix: 'sus4', intervals: [0, 5, 7] },
  { suffix: 'sus2', intervals: [0, 2, 7] },
  { suffix: 'add9', intervals: [0, 2, 4, 7] },
  { suffix: '6', intervals: [0, 4, 7, 9] },
  { suffix: 'm6', intervals: [0, 3, 7, 9] },
  { suffix: 'dim', intervals: [0, 3, 6] },
  { suffix: 'aug', intervals: [0, 4, 8] },
  { suffix: 'm7b5', intervals: [0, 3, 6, 10] },
  { suffix: '7sus4', intervals: [0, 5, 7, 10] },
  { suffix: '5', intervals: [0, 7] },
  // 5度省略形
  { suffix: '', intervals: [0, 4] },
  { suffix: 'm', intervals: [0, 3] },
  { suffix: '7', intervals: [0, 4, 10] },
];

function sameSet(a: number[], b: number[]) {
  return a.length === b.length && a.every((x) => b.includes(x));
}

/** 譜面にコード名があればそれを、なければ構成音から推定する */
export function chordName(beat: alphaTab.model.Beat): string | null {
  if (beat.chord?.name) return beat.chord.name;

  const notes = beat.notes.filter((n) => !n.isDead && n.fret >= 0);
  if (notes.length < 2) return null;

  const pitches = notes.map((n) => n.realValue).sort((a, b) => a - b);
  const pcs = [...new Set(pitches.map((p) => p % 12))];
  if (pcs.length < 2) return null;
  const bass = pitches[0] % 12;

  // ベース音をルートとする候補を優先し、次に他のルートを試す(分数コード)
  const roots = [bass, ...pcs.filter((p) => p !== bass)];
  for (const t of TEMPLATES) {
    for (const root of roots) {
      const rel = pcs.map((p) => (p - root + 12) % 12);
      if (sameSet(rel, t.intervals)) {
        const name = NOTE_NAMES[root] + t.suffix;
        return root === bass ? name : `${name}/${NOTE_NAMES[bass]}`;
      }
    }
  }
  return null;
}
