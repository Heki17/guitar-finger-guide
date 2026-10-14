import * as alphaTab from '@coderline/alphatab';

type Beat = alphaTab.model.Beat;
type Note = alphaTab.model.Note;
type Track = alphaTab.model.Track;

/** 1=人差し指, 2=中指, 3=薬指, 4=小指, 0=開放弦, -1=ミュート(×) */
export type Finger = -1 | 0 | 1 | 2 | 3 | 4;

export interface FingeredNote {
  /** 表示用の弦インデックス(0 = 一番高い弦 = 1弦) */
  stringIndex: number;
  fret: number;
  finger: Finger;
  /** 譜面側で運指が指定されていたか */
  fromScore: boolean;
  /** タイで伸ばしている音(押さえ続ける) */
  sustained: boolean;
}

export interface Barre {
  fret: number;
  /** 表示用弦インデックスの範囲(含む) */
  fromString: number;
  toString: number;
}

export interface Fingering {
  notes: FingeredNote[];
  barre: Barre | null;
  /** 人差し指が担当するフレット(ポジション) */
  position: number;
  stringCount: number;
}

const MAX_FRET = 24;

/** 弦楽器トラック(指ガイド対象)かどうか */
export function isFrettedTrack(track: Track): boolean {
  const staff = track.staves[0];
  return !!staff && !staff.isPercussion && staff.tuning.length > 0;
}

function playableNotes(beat: Beat): Note[] {
  if (beat.isRest) return [];
  return beat.notes.filter((n) => n.fret >= 0 && !n.isPercussion);
}

function frettedOf(beat: Beat): Note[] {
  return playableNotes(beat).filter((n) => n.fret > 0 && !n.isDead);
}

/** alphaTab の note.string(1 = 最低音弦)を、表示用(0 = 最高音弦)に変換 */
function toStringIndex(note: Note, stringCount: number): number {
  return stringCount - note.string;
}

/**
 * ポジション p(人差し指のフレット)で 1 拍分の運指を決める。
 * - 譜面に運指(leftHandFinger)があればそれを優先
 * - 同フレットで複数弦 + 間に高いフレットの音がある → セーハ
 * - それ以外は「1フレット=1指」を基本に、低フレット・低音弦から順に指を割り当て
 */
export function fingerBeat(beat: Beat, p: number, stringCount: number): Fingering {
  const all = playableNotes(beat);
  const result: FingeredNote[] = [];

  for (const n of all) {
    if (n.isDead) {
      result.push({ stringIndex: toStringIndex(n, stringCount), fret: n.fret, finger: -1, fromScore: false, sustained: false });
    } else if (n.fret === 0) {
      result.push({ stringIndex: toStringIndex(n, stringCount), fret: 0, finger: 0, fromScore: false, sustained: n.isTieDestination });
    }
  }

  // 低フレット → 低音弦(note.string が小さい) の順
  const fretted = frettedOf(beat).sort((a, b) => a.fret - b.fret || a.string - b.string);
  let barre: Barre | null = null;

  if (fretted.length > 0) {
    const minFret = fretted[0].fret;
    const atMin = fretted.filter((n) => n.fret === minFret);
    const minStr = Math.min(...atMin.map((n) => n.string));
    const maxStr = Math.max(...atMin.map((n) => n.string));
    const higherBetween = fretted.some((n) => n.fret > minFret && n.string > minStr && n.string < maxStr);
    const isBarre = atMin.length >= 2 && (higherBetween || fretted.length > 4);

    const assigned = new Map<Note, number>();
    if (isBarre) {
      barre = {
        fret: minFret,
        fromString: stringCount - maxStr,
        toString: stringCount - minStr,
      };
      atMin.forEach((n) => assigned.set(n, 1));
      let last = 1;
      for (const n of fretted) {
        if (assigned.has(n)) continue;
        const desired = Math.min(4, Math.max(2, n.fret - minFret + 1));
        const f = Math.min(4, Math.max(desired, last + 1));
        assigned.set(n, f);
        last = f;
      }
    } else {
      let last = 0;
      let lastFret = -1;
      for (const n of fretted) {
        const desired = Math.min(4, Math.max(1, n.fret - p + 1));
        let f = Math.max(desired, last + 1);
        if (f > 4) f = n.fret === lastFret ? last : 4; // 指が足りない → 同フレットなら同じ指で押さえる
        assigned.set(n, f);
        last = f;
        lastFret = n.fret;
      }
    }

    for (const n of fretted) {
      const scoreFinger = n.leftHandFinger as number;
      const fromScore = scoreFinger >= 1 && scoreFinger <= 4;
      result.push({
        stringIndex: toStringIndex(n, stringCount),
        fret: n.fret,
        finger: (fromScore ? scoreFinger : assigned.get(n)!) as Finger,
        fromScore,
        sustained: n.isTieDestination,
      });
    }
  }

  // 和音(2音以上)のとき、弾かない弦にミュート(finger: -1)を補う
  if (all.length >= 2) {
    const playedStrings = new Set(result.map((r) => r.stringIndex));
    for (let s = 0; s < stringCount; s++) {
      if (!playedStrings.has(s)) {
        result.push({
          stringIndex: s,
          fret: 0,
          finger: -1,
          fromScore: false,
          sustained: false,
        });
      }
    }
  }

  return { notes: result, barre, position: p, stringCount };
}

/** ある拍で取りうるポジション候補(人差し指のフレット) */
function candidates(notes: Note[]): number[] {
  const frets = notes.map((n) => n.fret);
  const min = Math.min(...frets);
  const max = Math.max(...frets);
  if (max - min > 3) return [min]; // ストレッチが必要 → 最低フレットに人差し指
  const out: number[] = [];
  for (let p = Math.max(1, max - 3); p <= min; p++) out.push(p);
  return out;
}

/**
 * ボイス内の拍を順番に見て、手の移動量が最小になるポジション列を DP で求める。
 * コスト = |移動フレット数| + 移動ペナルティ + 「人差し指が最低音から離れる」小ペナルティ
 */
function solvePositions(beats: Beat[]): Map<Beat, number> {
  const seq = beats.map((b) => ({ beat: b, notes: frettedOf(b) })).filter((x) => x.notes.length > 0);
  const out = new Map<Beat, number>();
  if (seq.length === 0) return out;

  const N = MAX_FRET + 1;
  let cost = new Array<number>(N).fill(Infinity);
  const back: Int8Array[] = [];

  const localCost = (p: number, notes: Note[]) => 0.15 * (Math.min(...notes.map((n) => n.fret)) - p);

  for (const p of candidates(seq[0].notes)) cost[p] = localCost(p, seq[0].notes);
  back.push(new Int8Array(N).fill(-1));

  for (let i = 1; i < seq.length; i++) {
    const next = new Array<number>(N).fill(Infinity);
    const bk = new Int8Array(N).fill(-1);
    for (const p of candidates(seq[i].notes)) {
      for (let q = 0; q < N; q++) {
        if (cost[q] === Infinity) continue;
        const move = Math.abs(p - q);
        const c = cost[q] + move + (move > 0 ? 0.5 : 0) + localCost(p, seq[i].notes);
        if (c < next[p]) {
          next[p] = c;
          bk[p] = q;
        }
      }
    }
    cost = next;
    back.push(bk);
  }

  let p = cost.indexOf(Math.min(...cost));
  for (let i = seq.length - 1; i >= 0; i--) {
    out.set(seq[i].beat, p);
    p = back[i][p];
  }
  return out;
}

/** トラック全体の運指を事前計算(beat.id → Fingering) */
export function computeTrackFingering(track: Track): Map<number, Fingering> {
  const map = new Map<number, Fingering>();
  if (!isFrettedTrack(track)) return map;

  for (const staff of track.staves) {
    const stringCount = staff.tuning.length;
    const voiceCount = Math.max(0, ...staff.bars.map((b) => b.voices.length));
    for (let v = 0; v < voiceCount; v++) {
      const beats: Beat[] = [];
      for (const bar of staff.bars) {
        const voice = bar.voices[v];
        if (voice && !voice.isEmpty) beats.push(...voice.beats);
      }
      const positions = solvePositions(beats);
      let lastP = 1;
      for (const b of beats) {
        const p = positions.get(b) ?? lastP;
        lastP = p;
        map.set(b.id, fingerBeat(b, p, stringCount));
      }
    }
  }
  return map;
}

/** 音のある次の拍を探す(休符はスキップ) */
export function findNextSoundingBeat(beat: Beat, maxSteps = 64): Beat | null {
  let b: Beat | null = beat.nextBeat;
  for (let i = 0; b && i < maxSteps; i++) {
    if (playableNotes(b).length > 0 && !b.notes.every((n) => n.isTieDestination)) return b;
    b = b.nextBeat;
  }
  return null;
}

/** 拍の絶対 tick(リピートは考慮しない簡易版) */
export function absoluteTick(beat: Beat): number {
  return beat.voice.bar.masterBar.start + beat.playbackStart;
}

export function firstSoundingBeat(track: Track): Beat | null {
  const staff = track.staves[0];
  if (!staff) return null;
  for (const bar of staff.bars) {
    for (const b of bar.voices[0]?.beats ?? []) {
      if (playableNotes(b).length > 0) return b;
    }
  }
  return null;
}
