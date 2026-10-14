import { useCallback, useEffect, useRef, useState } from 'react';
import * as alphaTab from '@coderline/alphatab';

export interface TrackMix {
  mute: boolean;
  solo: boolean;
  volume: number; // 1.0 = 元の音量
}

export interface PlayerSnapshot {
  ready: boolean; // 再生可能(SoundFont + MIDI 準備完了)
  playing: boolean;
  soundFontProgress: number; // 0..1
  currentTime: number; // ms
  endTime: number; // ms
}

/**
 * alphaTab の API を React から扱うためのフック。
 * 譜面描画・シンセ再生・メトロノーム・トラック操作をまとめて提供する。
 */
export function useAlphaTab() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<alphaTab.AlphaTabApi | null>(null);

  const [score, setScore] = useState<alphaTab.model.Score | null>(null);
  const [renderedTrackIndex, setRenderedTrackIndex] = useState(0);
  const [playedBeat, setPlayedBeat] = useState<alphaTab.model.Beat | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [player, setPlayer] = useState<PlayerSnapshot>({
    ready: false,
    playing: false,
    soundFontProgress: 0,
    currentTime: 0,
    endTime: 0,
  });

  useEffect(() => {
    if (!mainRef.current || !viewportRef.current) return;

    const api = new alphaTab.AlphaTabApi(mainRef.current, {
      core: {
        fontDirectory: '/font/',
        logLevel: alphaTab.LogLevel.Warning,
      },
      display: {
        layoutMode: alphaTab.LayoutMode.Page,
        scale: 1.0,
      },
      player: {
        playerMode: alphaTab.PlayerMode.EnabledSynthesizer,
        soundFont: '/soundfont/sonivox.sf2',
        scrollElement: viewportRef.current,
        enableCursor: true,
        enableAnimatedBeatCursor: true,
        enableUserInteraction: true, // クリックで再生位置移動、ドラッグで区間選択(ループ範囲)
      },
    } as alphaTab.json.SettingsJson);
    apiRef.current = api;

    api.scoreLoaded.on((s) => {
      setScore(s);
      setPlayedBeat(null);
      setError(null);
    });
    api.renderStarted.on(() => setLoading(true));
    api.renderFinished.on(() => setLoading(false));
    api.error.on((e) => {
      setError(String((e as Error)?.message ?? e));
      setLoading(false);
    });
    api.soundFontLoad.on((e) => {
      setPlayer((p) => ({ ...p, soundFontProgress: e.total ? e.loaded / e.total : 0 }));
    });
    api.playerReady.on(() => setPlayer((p) => ({ ...p, ready: true, soundFontProgress: 1 })));
    api.playerStateChanged.on((e) => {
      setPlayer((p) => ({ ...p, playing: e.state === alphaTab.synth.PlayerState.Playing }));
    });
    api.playerPositionChanged.on((e) => {
      setPlayer((p) =>
        Math.abs(p.currentTime - e.currentTime) < 200 && p.endTime === e.endTime
          ? p
          : { ...p, currentTime: e.currentTime, endTime: e.endTime },
      );
    });
    api.playedBeatChanged.on((beat) => setPlayedBeat(beat));

    return () => {
      api.destroy();
      apiRef.current = null;
    };
  }, []);

  // ---------- 読み込み ----------
  const loadFile = useCallback(async (file: File) => {
    const api = apiRef.current;
    if (!api) return;
    setError(null);
    setLoading(true);
    setRenderedTrackIndex(0);
    const buf = new Uint8Array(await file.arrayBuffer());
    api.load(buf, [0]);
  }, []);

  const loadTex = useCallback((tex: string) => {
    const api = apiRef.current;
    if (!api) return;
    setError(null);
    setRenderedTrackIndex(0);
    api.tex(tex, [0]);
  }, []);

  // ---------- 再生 ----------
  const playPause = useCallback(() => apiRef.current?.playPause(), []);
  const stop = useCallback(() => apiRef.current?.stop(), []);

  const setSpeed = useCallback((v: number) => {
    if (apiRef.current) apiRef.current.playbackSpeed = v;
  }, []);
  const setMetronome = useCallback((v: number) => {
    if (apiRef.current) apiRef.current.metronomeVolume = v;
  }, []);
  const setCountIn = useCallback((v: number) => {
    if (apiRef.current) apiRef.current.countInVolume = v;
  }, []);
  const setLooping = useCallback((v: boolean) => {
    if (apiRef.current) apiRef.current.isLooping = v;
  }, []);
  const clearSelection = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    api.clearPlaybackRangeHighlight();
    api.playbackRange = null;
  }, []);

  // ---------- トラック ----------
  const selectTrack = useCallback((index: number) => {
    const api = apiRef.current;
    if (!api?.score) return;
    setRenderedTrackIndex(index);
    setPlayedBeat(null);
    api.renderTracks([api.score.tracks[index]]);
  }, []);

  const applyMix = useCallback((index: number, mix: TrackMix) => {
    const api = apiRef.current;
    if (!api?.score) return;
    const t = [api.score.tracks[index]];
    api.changeTrackMute(t, mix.mute);
    api.changeTrackSolo(t, mix.solo);
    api.changeTrackVolume(t, mix.volume);
  }, []);

  // ---------- 表示 ----------
  const setTabOnly = useCallback((tabOnly: boolean) => {
    const api = apiRef.current;
    if (!api) return;
    api.settings.display.staveProfile = tabOnly ? alphaTab.StaveProfile.Tab : alphaTab.StaveProfile.Default;
    api.updateSettings();
    api.render();
  }, []);

  return {
    viewportRef,
    mainRef,
    score,
    renderedTrackIndex,
    playedBeat,
    loading,
    error,
    player,
    loadFile,
    loadTex,
    playPause,
    stop,
    setSpeed,
    setMetronome,
    setCountIn,
    setLooping,
    clearSelection,
    selectTrack,
    applyMix,
    setTabOnly,
  };
}
