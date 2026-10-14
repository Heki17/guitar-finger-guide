import type { Fingering, FingeredNote } from '../guide/fingering';

export const FINGER_COLORS: Record<number, string> = {
  1: '#3b82f6', // 人差し指
  2: '#22c55e', // 中指
  3: '#f59e0b', // 薬指
  4: '#ef4444', // 小指
};
export const FINGER_NAMES: Record<number, string> = { 1: '人差し指', 2: '中指', 3: '薬指', 4: '小指' };

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];

interface Props {
  current: Fingering | null;
  next: Fingering | null;
  showNext: boolean;
  /** MIDI 値(0 = 最高音弦) */
  tuning: number[];
}

const TOP = 26;
const FRET_W = 76;
const STRING_GAP = 30;
const DOT_R = 12;

// ギターイラストの各パーツ座標
const HEAD_X = 56; // ヘッド側(0フレット)の左端
const HEAD_W = 46; // ヘッドエリアの幅
const HEAD_CENTER_X = HEAD_X + HEAD_W / 2; // 開放弦(0)・ミュート(×)の中心X座標
const NUT_X = HEAD_X + HEAD_W; // ナット(上駒)のX座標 (102)
const NUT_W = 8; // ナットの厚み
const FRET_START_X = NUT_X + NUT_W; // 1フレット以降の指板開始X座標 (110)

export function Fretboard({ current, next, showNext, tuning }: Props) {
  const stringCount = tuning.length || 6;

  // 表示するフレット範囲(現在と次の押弦がすべて収まるように)
  const frets = [...(current?.notes ?? []), ...(showNext ? next?.notes ?? [] : [])]
    .filter((n) => n.fret > 0)
    .map((n) => n.fret);
  const minF = frets.length ? Math.min(...frets) : 1;
  const maxF = frets.length ? Math.max(...frets) : 5;
  const start = maxF <= 5 ? 1 : Math.max(1, minF - 1);
  const count = Math.max(5, maxF - start + 1);

  const boardWidth = count * FRET_W;
  const totalSvgWidth = FRET_START_X + boardWidth + 24;
  const boardH = (stringCount - 1) * STRING_GAP + 24;
  const totalSvgHeight = TOP + boardH + 34;

  const yOf = (s: number) => TOP + s * STRING_GAP;
  const xOf = (fret: number) =>
    fret <= 0 ? HEAD_CENTER_X : FRET_START_X + (fret - start + 0.5) * FRET_W;
  const boardBottom = yOf(stringCount - 1);

  const renderNote = (n: FingeredNote, kind: 'current' | 'next', key: string) => {
    const y = yOf(n.stringIndex);
    const x = xOf(n.fret);
    const isNext = kind === 'next';

    // ミュート (×)
    if (n.finger === -1) {
      return (
        <g key={key} className={isNext ? 'is-next' : 'is-current'}>
          <circle
            cx={x}
            cy={y}
            r={isNext ? DOT_R + 1 : DOT_R}
            fill={isNext ? 'none' : '#7f1d1d'}
            stroke="#ef4444"
            strokeWidth={isNext ? 2 : 1.5}
            strokeDasharray={isNext ? '3 3' : undefined}
          />
          <text
            x={x}
            y={y + 4.5}
            textAnchor="middle"
            fill={isNext ? '#ef4444' : '#ffffff'}
            fontSize={13}
            fontWeight={800}
            pointerEvents="none"
          >
            ✕
          </text>
        </g>
      );
    }

    // 開放弦 (0)
    if (n.finger === 0) {
      return (
        <g key={key} className={isNext ? 'is-next' : 'is-current'}>
          <circle
            cx={x}
            cy={y}
            r={isNext ? DOT_R + 1 : DOT_R}
            fill={isNext ? 'none' : '#0f172a'}
            stroke={isNext ? '#38bdf8' : '#38bdf8'}
            strokeWidth={isNext ? 2 : 2.5}
            strokeDasharray={isNext ? '3 3' : undefined}
          />
          <text
            x={x}
            y={y + 4.5}
            textAnchor="middle"
            fill={isNext ? '#38bdf8' : '#38bdf8'}
            fontSize={12}
            fontWeight={800}
            pointerEvents="none"
          >
            0
          </text>
        </g>
      );
    }

    // フレット押弦 (1〜4)
    const color = FINGER_COLORS[n.finger];
    return (
      <g key={key} className={isNext ? 'is-next' : 'is-current'}>
        <circle
          cx={x}
          cy={y}
          r={isNext ? DOT_R + 2 : DOT_R}
          fill={isNext ? 'none' : color}
          stroke={color}
          strokeWidth={isNext ? 2 : 0}
          strokeDasharray={isNext ? '4 3' : undefined}
          opacity={n.sustained && !isNext ? 0.6 : 1}
        />
        {!isNext && (
          <text x={x} y={y + 4.5} textAnchor="middle" className="finger-num">
            {n.finger}
          </text>
        )}
        {isNext && (
          <text x={x + DOT_R + 6} y={y - DOT_R + 2} textAnchor="middle" className="finger-num-next" fill={color}>
            {n.finger}
          </text>
        )}
      </g>
    );
  };

  return (
    <svg className="fretboard" viewBox={`0 0 ${totalSvgWidth} ${totalSvgHeight}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        {/* 指板の木目調グラデーション */}
        <linearGradient id="fretboardWood" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2e1f17" />
          <stop offset="50%" stopColor="#3d2a1f" />
          <stop offset="100%" stopColor="#2e1f17" />
        </linearGradient>
        {/* ヘッド側のグラデーション */}
        <linearGradient id="headWood" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e140f" />
          <stop offset="100%" stopColor="#2a1b14" />
        </linearGradient>
      </defs>

      {/* ===== ギターイラスト本体 ===== */}

      {/* 1. ヘッドストック(0フレット・開放/ミュートの乗るエリア) */}
      <rect
        x={HEAD_X}
        y={TOP - 12}
        width={HEAD_W}
        height={boardH}
        rx={4}
        fill="url(#headWood)"
        stroke="#4a3728"
        strokeWidth="1"
      />

      {/* 2. 指板本体(フレットボード) */}
      <rect
        x={FRET_START_X}
        y={TOP - 12}
        width={boardWidth}
        height={boardH}
        fill="url(#fretboardWood)"
        stroke="#4a3728"
        strokeWidth="1"
      />

      {/* 3. ナット(上駒) */}
      <rect
        x={NUT_X}
        y={TOP - 12}
        width={NUT_W}
        height={boardH}
        rx={2}
        fill="#eae3d2"
        stroke="#b8ac96"
        strokeWidth="1"
      />

      {/* ネック上下のバインディング(縁取り) */}
      <line x1={HEAD_X} x2={FRET_START_X + boardWidth} y1={TOP - 12} y2={TOP - 12} stroke="#c9bea9" strokeWidth="2" />
      <line
        x1={HEAD_X}
        x2={FRET_START_X + boardWidth}
        y1={TOP - 12 + boardH}
        y2={TOP - 12 + boardH}
        stroke="#c9bea9"
        strokeWidth="2"
      />

      {/* インレイ(ポジションマーク) */}
      {Array.from({ length: count }, (_, i) => start + i).map((f) =>
        f % 12 === 0 ? (
          <g key={`in${f}`}>
            <circle cx={xOf(f)} cy={yOf(1.5)} r={4.5} fill="#e5ded0" opacity={0.6} />
            <circle cx={xOf(f)} cy={yOf(stringCount - 2.5)} r={4.5} fill="#e5ded0" opacity={0.6} />
          </g>
        ) : INLAYS.includes(f) ? (
          <circle key={`in${f}`} cx={xOf(f)} cy={(TOP + boardBottom) / 2} r={4.5} fill="#e5ded0" opacity={0.5} />
        ) : null
      )}

      {/* フレット線 */}
      {Array.from({ length: count + 1 }, (_, i) => {
        const fx = FRET_START_X + i * FRET_W;
        return (
          <line
            key={`f${i}`}
            x1={fx}
            x2={fx}
            y1={TOP - 12}
            y2={TOP - 12 + boardH}
            stroke="#a3a3a3"
            strokeWidth={i === 0 ? 3 : 2}
          />
        );
      })}

      {/* 弦(ヘッドから指板の端まで一気に貫く) */}
      {Array.from({ length: stringCount }, (_, s) => {
        const y = yOf(s);
        const thickness = 1.2 + (s / Math.max(1, stringCount - 1)) * 2.2;
        const stringColor = s < 3 ? '#e2e8f0' : '#cbd5e1';
        return (
          <g key={`s${s}`}>
            <line
              x1={HEAD_X}
              x2={FRET_START_X + boardWidth}
              y1={y}
              y2={y}
              stroke={stringColor}
              strokeWidth={thickness}
            />
            {/* 弦の影 */}
            <line
              x1={HEAD_X}
              x2={FRET_START_X + boardWidth}
              y1={y + 1}
              y2={y + 1}
              stroke="#000000"
              strokeWidth={0.8}
              opacity={0.3}
            />
            {/* 弦ラベル (1 E, 2 B 等) */}
            <text x={HEAD_X - 12} y={y + 4} textAnchor="end" className="string-label">
              {s + 1} <tspan fill="#64748b">{NOTE_NAMES[(tuning[s] ?? 0) % 12]}</tspan>
            </text>
          </g>
        );
      })}

      {/* フレット番号ラベル */}
      {/* 0フレット(ヘッド側) */}
      <text x={HEAD_CENTER_X} y={TOP + boardH + 16} textAnchor="middle" className="fret-label-zero">
        0
      </text>
      {/* 1〜Nフレット */}
      {Array.from({ length: count }, (_, i) => (
        <text key={`n${i}`} x={xOf(start + i)} y={TOP + boardH + 16} textAnchor="middle" className="fret-label">
          {start + i}
        </text>
      ))}

      {/* ===== ノート・運指ガイドの描画 ===== */}

      {/* 次の押さえ方: セーハ (点線) */}
      {showNext && next?.barre && (
        <rect
          x={xOf(next.barre.fret) - DOT_R - 2}
          y={yOf(next.barre.fromString) - DOT_R - 2}
          width={(DOT_R + 2) * 2}
          height={yOf(next.barre.toString) - yOf(next.barre.fromString) + (DOT_R + 2) * 2}
          rx={DOT_R + 2}
          fill="none"
          stroke={FINGER_COLORS[1]}
          strokeWidth={2}
          strokeDasharray="4 3"
        />
      )}
      {/* 次の押さえ方: ノート */}
      {showNext && next?.notes.map((n, i) => renderNote(n, 'next', `next-${i}`))}

      {/* 現在の押さえ方: セーハ */}
      {current?.barre && (
        <rect
          x={xOf(current.barre.fret) - DOT_R}
          y={yOf(current.barre.fromString) - DOT_R}
          width={DOT_R * 2}
          height={yOf(current.barre.toString) - yOf(current.barre.fromString) + DOT_R * 2}
          rx={DOT_R}
          fill={FINGER_COLORS[1]}
          opacity={0.88}
        />
      )}
      {/* 現在の押さえ方: ノート */}
      {current?.notes.map((n, i) => renderNote(n, 'current', `cur-${i}`))}
    </svg>
  );
}
