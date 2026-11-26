import type * as alphaTab from '@coderline/alphatab';
import type { Fingering } from './fingering';

export type MuteMethod =
  | 'thumb' // 親指でネックの上から触れる
  | 'tip' // 押弦指の先端で上の弦に軽く触れる
  | 'pad' // 人差し指などの腹・側面を寝かせて触れる
  | 'brushing' // 左手全体で軽く弦に触れてブラッシング
  | 'palm' // 右手パームミュート
  | 'general'; // 通常の消音

export interface StringMuteAdvice {
  /** 0 = 1弦 (最高音弦), 5 = 6弦 */
  stringIndex: number;
  /** 1-based (1〜6弦) */
  stringNumber: number;
  method: MuteMethod;
  badge: string; // "親指(T)", "指の腹", "指先", "✕"
  shortAdvice: string;
  detailAdvice: string;
}

export interface MuteGuideInfo {
  /** ミュートが必要な弦があるか */
  hasMutedStrings: boolean;
  /** パームミュート(右手ブリッジミュート)が指定されているか */
  isPalmMute: boolean;
  /** 全弦ブラッシング(デッドノート)か */
  isAllDead: boolean;
  /** 弦ごとの消音アドバイス */
  stringAdvices: StringMuteAdvice[];
  /** 全体の要約・演奏のコツ */
  summary: string;
}

/**
 * 押弦状態と弦の位置関係から、初心者に最適なミュート方法を判定する
 */
export function analyzeMuteGuide(
  fingering: Fingering | null,
  beat: alphaTab.model.Beat | null,
  tuning: number[]
): MuteGuideInfo {
  if (!fingering || !beat || beat.isRest) {
    return {
      hasMutedStrings: false,
      isPalmMute: false,
      isAllDead: false,
      stringAdvices: [],
      summary: beat?.isRest ? '休符です。左手を軽く弦に乗せて全弦を消音しましょう。' : '演奏指示はありません。',
    };
  }

  const stringCount = fingering.stringCount || tuning.length || 6;
  const notes = fingering.notes;
  const mutedNotes = notes.filter((n) => n.finger === -1);
  const soundingNotes = notes.filter((n) => n.finger >= 0);

  // 1. パームミュート (P.M.) の判定
  const isPalmMute = beat.notes.some((n) => n.isPalmMute) || !!fingering.hasPalmMute;

  // 2. ブラッシング (Dead notes) の判定
  const isAllDead =
    beat.notes.length > 0 &&
    beat.notes.every((n) => n.isDead) &&
    soundingNotes.length === 0;

  if (isAllDead) {
    const stringAdvices: StringMuteAdvice[] = Array.from({ length: stringCount }, (_, i) => ({
      stringIndex: i,
      stringNumber: i + 1,
      method: 'brushing',
      badge: 'ブラッシング',
      shortAdvice: '弦を浮かせたまま触れる',
      detailAdvice: 'フレットを押さえ込まず、指を軽く弦全体に乗せてチャカチャカとリズムを刻みます。',
    }));

    return {
      hasMutedStrings: true,
      isPalmMute: false,
      isAllDead: true,
      stringAdvices,
      summary: '【左手ブラッシング】弦全体に指を軽く触れたままストローク（チャカ音）',
    };
  }

  // 3. 各ミュート弦の消音方法判定
  const stringAdvices: StringMuteAdvice[] = [];

  // 発音している弦のインデックス一覧
  const soundingIndices = soundingNotes.map((n) => n.stringIndex);
  const minSounding = soundingIndices.length > 0 ? Math.min(...soundingIndices) : -1; // 最も高音弦
  const maxSounding = soundingIndices.length > 0 ? Math.max(...soundingIndices) : -1; // 最も低音弦

  // 人差し指(1)で押弦しているか
  const indexFingerNote = soundingNotes.find((n) => n.finger === 1);
  // 最低音弦（最も数字の大きい stringIndex）を押弦しているノート
  const lowestSoundingNote = soundingNotes.find((n) => n.stringIndex === maxSounding);

  for (const n of mutedNotes) {
    const sIdx = n.stringIndex;
    const strNum = sIdx + 1; // 1 = 1弦, 6 = 6弦

    // 6弦(最も低音の弦: 通常 sIdx === stringCount - 1)
    if (sIdx === stringCount - 1) {
      if (lowestSoundingNote && lowestSoundingNote.finger === 3) {
        // Cコードなど: 5弦を薬指(3)で押さえている
        stringAdvices.push({
          stringIndex: sIdx,
          stringNumber: strNum,
          method: 'thumb',
          badge: '親指(T) / 薬指先',
          shortAdvice: '親指または薬指の先端で触れる',
          detailAdvice: `${strNum}弦は親指を上から回して触れるか、5弦を押さえる薬指の先を軽く当てて消音します。`,
        });
      } else if (lowestSoundingNote && lowestSoundingNote.finger === 2) {
        // 中指で5弦を押さえている場合
        stringAdvices.push({
          stringIndex: sIdx,
          stringNumber: strNum,
          method: 'thumb',
          badge: '親指(T)',
          shortAdvice: '親指で上から触れる',
          detailAdvice: `${strNum}弦はネックの上から親指を出してそっと触れ、ストローク時の濁りを防ぎます。`,
        });
      } else {
        // 一般的な6弦ミュート(A, Dコード等)
        stringAdvices.push({
          stringIndex: sIdx,
          stringNumber: strNum,
          method: 'thumb',
          badge: '親指(T)',
          shortAdvice: '親指で上から触れる',
          detailAdvice: `親指をネックの上から軽く${strNum}弦に乗せて消音します（ストロークに巻き込まれても鳴りません）。`,
        });
      }
    }
    // 5弦(インデックス = stringCount - 2)
    else if (sIdx === stringCount - 2 && sIdx > maxSounding) {
      // 4弦ルートコード(Dコードなど)
      stringAdvices.push({
        stringIndex: sIdx,
        stringNumber: strNum,
        method: 'thumb',
        badge: '親指(T)',
        shortAdvice: '親指で触れるか弾かない',
        detailAdvice: `${strNum}弦は親指の先端で軽く触れるか、4弦より上を狙ってピッキングします。`,
      });
    }
    // 5弦で、6弦は鳴っているが5弦だけミュートの場合（オクターブ奏法や変則フォーム）
    else if (sIdx === stringCount - 2 && maxSounding === stringCount - 1) {
      stringAdvices.push({
        stringIndex: sIdx,
        stringNumber: strNum,
        method: 'pad',
        badge: '指の腹',
        shortAdvice: '6弦を押さえる指の腹で触れる',
        detailAdvice: `6弦を押さえている指（人差し指や中指）の腹を少し寝かせて${strNum}弦に触れ、消音します。`,
      });
    }
    // 発音弦の間にある弦（オクターブ奏法の4弦や3弦など）
    else if (sIdx > minSounding && sIdx < maxSounding) {
      stringAdvices.push({
        stringIndex: sIdx,
        stringNumber: strNum,
        method: 'pad',
        badge: '指の腹',
        shortAdvice: '低音弦側の指の腹で触れる',
        detailAdvice: `低音側の弦を押さえている指の腹（側面）を寝かせて${strNum}弦に触れさせ、ピッキング時の雑音をカットします。`,
      });
    }
    // 1弦〜2弦などの高音弦側（sIdx < minSounding）
    else if (sIdx < minSounding) {
      if (indexFingerNote) {
        stringAdvices.push({
          stringIndex: sIdx,
          stringNumber: strNum,
          method: 'pad',
          badge: '人差し指の腹',
          shortAdvice: '人差し指を寝かせて触れる',
          detailAdvice: `人差し指の腹を自然に寝かせて${strNum}弦に軽く触れておきます。`,
        });
      } else {
        stringAdvices.push({
          stringIndex: sIdx,
          stringNumber: strNum,
          method: 'pad',
          badge: '指の腹',
          shortAdvice: '空いている指の腹で触れる',
          detailAdvice: `${strNum}弦には指の腹を軽く添えて、不要な共鳴や引っ掛かりを防ぎます。`,
        });
      }
    }
    // その他の弦
    else {
      stringAdvices.push({
        stringIndex: sIdx,
        stringNumber: strNum,
        method: 'general',
        badge: '✕ 消音',
        shortAdvice: '近接する指で触れて消音',
        detailAdvice: `${strNum}弦は近くの指の側面や腹で軽く触れて消音してください。`,
      });
    }
  }

  // 要約テキストの組み立て
  let summary = '';
  if (isPalmMute) {
    summary = '【P.M. パームミュート】右手のひらの付け根（小指球）をブリッジサドル付近に乗せてピッキング';
  } else if (stringAdvices.length > 0) {
    const badges = stringAdvices.map((a) => `${a.stringNumber}弦(${a.badge})`).join('、');
    summary = `【ミュート】${badges} を消音して不要な音の濁りを防ぎます`;
  } else {
    summary = '【全弦発音】ミュートなし。押さえた弦や開放弦をきれいに響かせましょう。';
  }

  return {
    hasMutedStrings: stringAdvices.length > 0,
    isPalmMute,
    isAllDead,
    stringAdvices,
    summary,
  };
}
