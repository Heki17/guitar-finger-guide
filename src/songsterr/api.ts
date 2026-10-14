import {
  buildSongsterrAlphaTex,
  type SongsterrMeta,
  type SongsterrPart,
  type TrackData,
} from './converter';

const NORMAL_HOSTS = ['dqsljvtekg760', 'd34shlm8p2ums2', 'd3cqchs6g3b5ew'];
const STAGE_HOST = 'd3d3l6a6rcgkaf';
const LEGACY_HOSTS = ['d3rrfvx08uyjp1', 'dodkcbujl0ebx', 'dj1usja78sinh'];

export interface SongSearchResult {
  songId: number;
  artistId: number;
  artist: string;
  title: string;
  hasPlayer: boolean;
  tracks: Array<{
    instrumentId: number;
    instrument: string;
    name: string;
    tuning?: number[];
    difficulty?: number;
    views?: number;
  }>;
}

/**
 * Songsterr の曲URLまたはIDから songId を抽出する
 * 例:
 * - "https://www.songsterr.com/a/wsa/oasis-wonderwall-tab-s22" -> 22
 * - "https://www.songsterr.com/a/wa/song?id=5194" -> 5194
 * - "5194" -> 5194
 */
export function extractSongId(input: string): number | null {
  const s = input.trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10);

  const m1 = s.match(/-s(\d+)\b/);
  if (m1) return parseInt(m1[1], 10);

  const m2 = s.match(/[?&]id=(\d+)/);
  if (m2) return parseInt(m2[1], 10);

  const m3 = s.match(/(\d{3,})/);
  if (m3) return parseInt(m3[1], 10);

  return null;
}

/**
 * Songsterr で曲・アーティストを検索
 */
export async function searchSongsterr(query: string): Promise<SongSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const res = await fetch(`/api/songsterr/songs?pattern=${encodeURIComponent(trimmed)}`);
  if (!res.ok) {
    throw new Error(`Songsterr 検索エラー (${res.status})`);
  }
  const data = (await res.json()) as SongSearchResult[];
  return data.filter((d) => d.hasPlayer);
}

/**
 * 曲のメタデータを取得
 */
export async function getSongMeta(songId: number): Promise<SongsterrMeta> {
  const res = await fetch(`/api/songsterr/meta/${songId}`);
  if (!res.ok) {
    throw new Error(`曲情報の取得に失敗しました (ID: ${songId}, status: ${res.status})`);
  }
  return (await res.json()) as SongsterrMeta;
}

function getPartUrl(
  image: string | undefined,
  songId: number,
  revisionId: number,
  partId: number,
  attempt = 0
): string {
  if (image && image.endsWith('-stage')) {
    return `https://${STAGE_HOST}.cloudfront.net/${songId}/${revisionId}/${image}/${partId}.json`;
  }
  if (image) {
    const host = NORMAL_HOSTS[attempt % NORMAL_HOSTS.length];
    return `https://${host}.cloudfront.net/${songId}/${revisionId}/${image}/${partId}.json`;
  }
  const host = LEGACY_HOSTS[attempt % LEGACY_HOSTS.length];
  return `https://${host}.cloudfront.net/part/${revisionId}/${partId}`;
}

/**
 * 1パートの note データを取得 (CloudFront ホストをフォールバック)
 */
export async function fetchPart(
  songId: number,
  revisionId: number,
  image: string | undefined,
  partId: number
): Promise<SongsterrPart> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < NORMAL_HOSTS.length; attempt++) {
    const url = getPartUrl(image, songId, revisionId, partId, attempt);
    try {
      const res = await fetch(url);
      if (res.ok) {
        return (await res.json()) as SongsterrPart;
      }
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`パート ${partId} の取得に失敗しました: ${String(lastErr || 'Unknown error')}`);
}

/**
 * 曲全体のメタデータと全ギタートラックを取得し、alphaTex を生成する
 */
export async function loadSongsterrAsAlphaTex(
  urlOrId: string,
  onProgress?: (msg: string) => void
): Promise<{ title: string; artist: string; tex: string }> {
  const songId = extractSongId(urlOrId);
  if (!songId) {
    throw new Error('有効な Songsterr の URL または曲IDを入力してください。');
  }

  onProgress?.('曲のメタデータを取得中…');
  const meta = await getSongMeta(songId);

  const revisionId = meta.revisionId;
  if (!revisionId) {
    throw new Error('リビジョン情報が見つかりませんでした。');
  }

  // 弦楽器トラック（ギター、ベース等）を中心に取得
  const targetTracks = meta.tracks
    .map((t, idx) => ({ t, idx }))
    .filter(({ t }) => !t.isVocalTrack && !t.isEmpty && t.tuning && t.tuning.length > 0);

  // 弦楽器が見つからない場合は全トラック対象
  const selected = targetTracks.length > 0 ? targetTracks : meta.tracks.map((t, idx) => ({ t, idx }));

  const trackDataList: TrackData[] = [];
  for (let i = 0; i < selected.length; i++) {
    const { t, idx } = selected[i];
    onProgress?.(`パート読み込み中 (${i + 1}/${selected.length}): ${t.name || t.instrument}`);
    try {
      const part = await fetchPart(songId, revisionId, meta.image, idx);
      trackDataList.push({ part, trackMeta: t });
    } catch (err) {
      console.warn(`Part ${idx} failed to load, skipping:`, err);
    }
  }

  if (trackDataList.length === 0) {
    throw new Error('演奏パートのノートデータを読み込めませんでした。');
  }

  onProgress?.('タブ譜を構築中…');
  const tex = buildSongsterrAlphaTex(meta, trackDataList);

  return {
    title: meta.title,
    artist: meta.artist,
    tex,
  };
}
