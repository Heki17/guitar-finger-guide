import { useEffect, useState } from 'react';
import { useAlphaTab, type TrackMix } from './player/useAlphaTab';
import { TrackList } from './components/TrackList';
import { GuidePanel } from './components/GuidePanel';
import { SongsterrModal } from './components/SongsterrModal';
import { loadSongsterrAsAlphaTex } from './songsterr/api';
import { SAMPLE_TEX } from './guide/sample';

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function App() {
  const at = useAlphaTab();
  const { score, player } = at;

  const [speed, setSpeed] = useState(1);
  const [metronome, setMetronome] = useState(false);
  const [countIn, setCountIn] = useState(false);
  const [looping, setLooping] = useState(false);
  const [tabOnly, setTabOnly] = useState(false);
  const [showNext, setShowNext] = useState(true);
  const [mixes, setMixes] = useState<TrackMix[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // Songsterr モーダル
  const [songsterrOpen, setSongsterrOpen] = useState(false);
  const [songsterrLoading, setSongsterrLoading] = useState(false);
  const [songsterrStatus, setSongsterrStatus] = useState('');
  const [songsterrError, setSongsterrError] = useState<string | null>(null);

  const handleLoadSongsterr = async (urlOrId: string) => {
    setSongsterrLoading(true);
    setSongsterrStatus('Songsterr から曲データを取得中…');
    setSongsterrError(null);
    try {
      const { tex } = await loadSongsterrAsAlphaTex(urlOrId, (status) => {
        setSongsterrStatus(status);
      });
      at.loadTex(tex);
      setSongsterrOpen(false);
    } catch (err) {
      setSongsterrError(String((err as Error)?.message || err));
    } finally {
      setSongsterrLoading(false);
    }
  };

  // 起動時にサンプルを読み込む
  useEffect(() => {
    const id = setTimeout(() => at.loadTex(SAMPLE_TEX), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 曲が変わったらミキサーをリセット
  useEffect(() => {
    setMixes(score ? score.tracks.map(() => ({ mute: false, solo: false, volume: 1 })) : []);
  }, [score]);

  // Space で再生/一時停止
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        at.playPause();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [at.playPause]);

  const onMixChange = (i: number, mix: TrackMix) => {
    setMixes((m) => m.map((x, j) => (j === i ? mix : x)));
    at.applyMix(i, mix);
  };

  const onFile = (file: File | undefined) => {
    if (file) at.loadFile(file);
  };

  const track = score?.tracks[at.renderedTrackIndex] ?? null;

  return (
    <div
      className={`app ${dragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        onFile(e.dataTransfer.files[0]);
      }}
    >
      {/* ---------- ヘッダー / 再生コントロール ---------- */}
      <header className="toolbar">
        <div className="title">
          <span className="logo">🎸 Finger Guide</span>
          <span className="song">
            {score ? `${score.title || '無題'}${score.artist ? ' — ' + score.artist : ''}` : '読み込み中…'}
          </span>
        </div>

        <div className="controls">
          <button className="play" onClick={at.playPause} disabled={!player.ready} title="再生/一時停止 (Space)">
            {player.playing ? '⏸' : '▶'}
          </button>
          <button onClick={at.stop} disabled={!player.ready} title="停止">
            ⏹
          </button>
          <span className="time">
            {fmt(player.currentTime)} / {fmt(player.endTime)}
          </span>

          <label className="ctl">
            速度 {Math.round(speed * 100)}%
            <input
              type="range"
              min={0.25}
              max={1.5}
              step={0.05}
              value={speed}
              onChange={(e) => {
                const v = Number(e.target.value);
                setSpeed(v);
                at.setSpeed(v);
              }}
            />
          </label>

          <button
            className={`toggle ${metronome ? 'on' : ''}`}
            onClick={() => {
              setMetronome(!metronome);
              at.setMetronome(metronome ? 0 : 1);
            }}
            title="メトロノーム"
          >
            🕒 メトロノーム
          </button>
          <button
            className={`toggle ${countIn ? 'on' : ''}`}
            onClick={() => {
              setCountIn(!countIn);
              at.setCountIn(countIn ? 0 : 1);
            }}
            title="再生前に1小節カウント"
          >
            カウントイン
          </button>
          <button
            className={`toggle ${looping ? 'on' : ''}`}
            onClick={() => {
              setLooping(!looping);
              at.setLooping(!looping);
            }}
            title="ループ(譜面をドラッグして区間指定)"
          >
            🔁 ループ
          </button>
          <button onClick={at.clearSelection} title="区間選択を解除">
            選択解除
          </button>
        </div>

        <div className="controls right">
          <label className="toggle-check">
            <input
              type="checkbox"
              checked={tabOnly}
              onChange={(e) => {
                setTabOnly(e.target.checked);
                at.setTabOnly(e.target.checked);
              }}
            />
            TAB のみ
          </label>
          <label className="toggle-check">
            <input type="checkbox" checked={showNext} onChange={(e) => setShowNext(e.target.checked)} />
            次の指を表示
          </label>
          <button
            className="songsterr-btn"
            onClick={() => setSongsterrOpen(true)}
            title="Songsterr から曲を検索またはURL直接指定で開く"
          >
            🌐 Songsterr で探す
          </button>
          <label className="file-btn">
            📂 .gp を開く
            <input
              type="file"
              accept=".gp,.gp3,.gp4,.gp5,.gpx,.musicxml,.xml,.mxl"
              onChange={(e) => onFile(e.target.files?.[0])}
              hidden
            />
          </label>
          <button onClick={() => at.loadTex(SAMPLE_TEX)}>サンプル</button>
        </div>
      </header>

      {!player.ready && (
        <div className="sf-progress">
          音源(SoundFont)を読み込み中… {Math.round(player.soundFontProgress * 100)}%
        </div>
      )}
      {songsterrLoading && (
        <div className="songsterr-banner">
          ⏳ {songsterrStatus || 'Songsterr から曲データを読み込み中…'}
        </div>
      )}
      {songsterrError && <div className="error">Songsterr エラー: {songsterrError}</div>}
      {at.error && <div className="error">読み込みエラー: {at.error}</div>}

      <SongsterrModal
        isOpen={songsterrOpen}
        onClose={() => setSongsterrOpen(false)}
        onSelectSong={handleLoadSongsterr}
        loading={songsterrLoading}
        statusText={songsterrStatus}
      />

      <div className="body">
        {/* ---------- トラック一覧 ---------- */}
        <aside className="sidebar">
          <h3>パート</h3>
          {score && (
            <TrackList
              tracks={score.tracks}
              selected={at.renderedTrackIndex}
              mixes={mixes}
              onSelect={at.selectTrack}
              onMixChange={onMixChange}
            />
          )}
          <p className="hint">
            譜面をクリックで再生位置を移動、ドラッグで区間選択(ループ範囲)できます。
            <br />
            .gp ファイルは画面にドラッグ&ドロップでも開けます。
          </p>
        </aside>

        {/* ---------- 譜面 ---------- */}
        <main className="score-viewport" ref={at.viewportRef}>
          {at.loading && <div className="overlay">描画中…</div>}
          <div ref={at.mainRef} />
        </main>
      </div>

      {/* ---------- 指ガイド(画面下に固定) ---------- */}
      <footer className="guide-dock">
        <GuidePanel track={track} playedBeat={at.playedBeat} showNext={showNext} />
      </footer>
    </div>
  );
}
