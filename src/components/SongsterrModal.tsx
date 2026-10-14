import { useState } from 'react';
import { searchSongsterr, type SongSearchResult } from '../songsterr/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectSong: (urlOrId: string) => void;
  loading: boolean;
  statusText: string;
}

const PRESET_SONGS = [
  { id: '22', title: 'Wonderwall', artist: 'Oasis' },
  { id: '5194', title: 'Creeping Death', artist: 'Metallica' },
  { id: '26', title: 'Smells Like Teen Spirit', artist: 'Nirvana' },
  { id: '92', title: 'Stairway to Heaven', artist: 'Led Zeppelin' },
  { id: '158', title: 'Canon Rock', artist: 'JerryC' },
];

export function SongsterrModal({ isOpen, onClose, onSelectSong, loading, statusText }: Props) {
  const [query, setQuery] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [results, setResults] = useState<SongSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setSearchErr(null);
    try {
      const list = await searchSongsterr(query);
      setResults(list);
      if (list.length === 0) {
        setSearchErr('見つかりませんでした。別のキーワードを試してください。');
      }
    } catch (err) {
      setSearchErr(String(err));
    } finally {
      setSearching(false);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onSelectSong(urlInput.trim());
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🌐 Songsterr から直接参照</h2>
          <button className="close-btn" onClick={onClose} disabled={loading}>
            ✕
          </button>
        </div>

        {loading ? (
          <div className="modal-loading">
            <div className="spinner" />
            <p className="loading-status">{statusText || 'Songsterr から読み込み中…'}</p>
          </div>
        ) : (
          <div className="modal-body">
            {/* 定番曲ショートカット */}
            <div className="preset-section">
              <span className="preset-label">おすすめ:</span>
              <div className="preset-pills">
                {PRESET_SONGS.map((p) => (
                  <button
                    key={p.id}
                    className="preset-pill"
                    onClick={() => onSelectSong(p.id)}
                    title={`${p.artist} - ${p.title}`}
                  >
                    🎸 {p.title} <small>({p.artist})</small>
                  </button>
                ))}
              </div>
            </div>

            {/* URL / ID 入力 */}
            <form className="url-form" onSubmit={handleUrlSubmit}>
              <label>Songsterr の URL または曲IDを直接入力:</label>
              <div className="input-row">
                <input
                  type="text"
                  placeholder="https://www.songsterr.com/a/wsa/... または 5194"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
                <button type="submit" disabled={!urlInput.trim()}>
                  開く
                </button>
              </div>
            </form>

            <div className="divider">
              <span>または曲名で検索</span>
            </div>

            {/* 検索フォーム */}
            <form className="search-form" onSubmit={handleSearch}>
              <div className="input-row">
                <input
                  type="text"
                  placeholder="曲名やアーティスト名 (例: Metallica, Oasis, Canon)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
                <button type="submit" disabled={searching || !query.trim()}>
                  {searching ? '検索中…' : '🔍 検索'}
                </button>
              </div>
            </form>

            {searchErr && <div className="modal-error">{searchErr}</div>}

            {/* 検索結果 */}
            <div className="search-results">
              {results.map((song) => {
                const guitarTracks = song.tracks.filter(
                  (t) => t.instrumentId !== 1024 && !t.name.toLowerCase().includes('vocal')
                );
                return (
                  <div key={song.songId} className="result-item" onClick={() => onSelectSong(String(song.songId))}>
                    <div className="result-main">
                      <div className="result-title">{song.title}</div>
                      <div className="result-artist">{song.artist}</div>
                    </div>
                    <div className="result-meta">
                      <span className="badge">{guitarTracks.length} パート</span>
                      <button className="load-btn">読み込む</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
