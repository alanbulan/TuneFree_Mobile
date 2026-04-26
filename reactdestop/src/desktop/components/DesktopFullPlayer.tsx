import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import AudioVisualizer from '../../core/components/AudioVisualizer';
import {
  CloseIcon,
  DownloadIcon,
  HeartFillIcon,
  HeartIcon,
  MusicIcon,
  MoreIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  QueueIcon,
  RepeatIcon,
  PlusIcon,
  RepeatOneIcon,
  SearchIcon,
  ShareIcon,
  ShuffleIcon,
  TrashIcon,
} from '../../core/components/Icons';
import { useLibrary } from '../../core/contexts/LibraryContext';
import {
  usePlayerActions,
  usePlayerNowPlaying,
  usePlayerProgress,
  usePlayerQueueState,
  usePlayerSettings,
} from '../../core/contexts/PlayerContext';
import { getLyrics, getSongUrl, triggerDownload } from '../../core/services/api';
import type { AudioQuality } from '../../core/types';
import { getSongKey, isSameSong } from '../../core/types';
import CoverArt from './CoverArt';
import VirtualList from './VirtualList';

interface DesktopFullPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
}

type LyricRow = {
  time: number;
  text: string;
  translation?: string;
};

type CoverPanelStyle = CSSProperties & {
  '--full-cover-bg'?: string;
};

type OffsetStyle = CSSProperties & {
  '--lyric-offset'?: number;
};

type NoteStyle = CSSProperties & {
  '--note-delay'?: string;
  '--note-duration'?: string;
  '--note-drift'?: string;
};

const timeTagPattern = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
const metadataPattern = /^\s*\[(ar|al|ti|by|offset|length|re|ve):.*\]\s*$/i;
const noteGlyphs = ['♪', '♫', '♩', '♬', '♭', '♯'];

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
};

const parseTimeMatch = (match: RegExpMatchArray): number => {
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  const fraction = Number((match[3] || '0').padEnd(3, '0').slice(0, 3));
  return minutes * 60 + seconds + fraction / 1000;
};

const normalizeLyricText = (line: string): string =>
  line.replace(timeTagPattern, '').replace(/\s+/g, ' ').trim();

const parseLyrics = (lrc?: string): LyricRow[] => {
  if (!lrc?.trim()) return [];

  const grouped = new Map<number, string[]>();
  const plainLines: string[] = [];

  for (const rawLine of lrc.split('\n')) {
    const line = rawLine.trim();
    if (!line || metadataPattern.test(line)) continue;

    const matches = Array.from(line.matchAll(timeTagPattern));
    const text = normalizeLyricText(line);
    if (!text) continue;

    if (matches.length === 0) {
      plainLines.push(text);
      continue;
    }

    for (const match of matches) {
      const key = Math.round(parseTimeMatch(match) * 1000);
      const values = grouped.get(key) || [];
      if (!values.includes(text)) values.push(text);
      grouped.set(key, values);
    }
  }

  const timedRows = Array.from(grouped.entries())
    .sort(([a], [b]) => a - b)
    .map(([time, values]) => ({
      time: time / 1000,
      text: values[0],
      translation: values.slice(1).find((value) => value !== values[0]),
    }));

  if (timedRows.length > 0) return timedRows;

  return plainLines.slice(0, 80).map((text, index) => ({
    time: index * 4,
    text,
  }));
};

const getActiveLyricIndex = (rows: LyricRow[], currentTime: number): number => {
  if (rows.length === 0) return -1;

  let activeIndex = 0;
  for (let index = 0; index < rows.length; index += 1) {
    if (rows[index].time <= currentTime + 0.22) {
      activeIndex = index;
    } else {
      break;
    }
  }
  return activeIndex;
};

const buildScoreNotes = (text: string, currentTime: number) => {
  const chars = Array.from(text.replace(/\s+/g, ''));
  const source = chars.length > 0 ? chars : Array.from('TuneFree');
  const count = Math.min(18, Math.max(10, source.length + 4));

  return Array.from({ length: count }, (_, index) => {
    const char = source[index % source.length] || '♪';
    const code = char.codePointAt(0) || 0;
    const duration = 3.4 + (code % 7) * 0.18;

    return {
      glyph: noteGlyphs[(code + index) % noteGlyphs.length],
      top: 18 + ((code + index * 13) % 62),
      left: count === 1 ? 50 : 6 + index * (88 / (count - 1)),
      delay: -((currentTime * 0.38 + index * 0.23) % duration),
      duration,
      drift: ((code % 9) - 4) * 2,
    };
  });
};

const qualityOptions: AudioQuality[] = ['128k', '320k', 'flac', 'flac24bit'];

const downloadMeta: Record<string, { label: string; ext: string }> = {
  '128k': { label: '128K', ext: 'mp3' },
  '320k': { label: '320K', ext: 'mp3' },
  flac: { label: 'FLAC', ext: 'flac' },
  flac24bit: { label: 'Hi-Res', ext: 'flac' },
};

const playModeLabel = {
  sequence: '列表循环',
  loop: '单曲循环',
  shuffle: '随机播放',
};

export default function DesktopFullPlayer({ isOpen, onClose, onSearch }: DesktopFullPlayerProps) {
  const { currentSong, isPlaying, isLoading } = usePlayerNowPlaying();
  const { currentTime, duration } = usePlayerProgress();
  const { queue, playMode } = usePlayerQueueState();
  const { audioQuality } = usePlayerSettings();
  const { toggleFavorite, isFavorite, playlists, addToPlaylist, createPlaylist } = useLibrary();
  const [downloadQuality, setDownloadQuality] = useState<AudioQuality | null>(null);
  const [lyricsOverride, setLyricsOverride] = useState('');
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [showMorePanel, setShowMorePanel] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const lyricListRef = useRef<HTMLDivElement>(null);
  const {
    playSong,
    clearQueue,
    removeFromQueue,
    togglePlay,
    playNext,
    playPrev,
    seek,
    togglePlayMode,
    setAudioQuality,
  } = usePlayerActions();
  const modeIcon = playMode === 'shuffle' ? <ShuffleIcon size={17} /> : playMode === 'loop' ? <RepeatOneIcon size={17} /> : <RepeatIcon size={17} />;
  const rawLyrics = currentSong?.lrc || lyricsOverride;
  const lyricRows = useMemo(() => parseLyrics(rawLyrics), [rawLyrics]);
  const activeLyricIndex = getActiveLyricIndex(lyricRows, currentTime);
  const activeLyric = activeLyricIndex >= 0 ? lyricRows[activeLyricIndex] : null;
  const lyricWindow = lyricRows.map((row, index) => ({ row, index }));
  const scoreText = activeLyric?.text || currentSong?.name || 'TuneFree Desktop';
  const scoreNotes = useMemo(() => buildScoreNotes(scoreText, currentTime), [currentTime, scoreText]);
  const panelStyle = currentSong?.pic
    ? ({ '--full-cover-bg': `url(${JSON.stringify(currentSong.pic)})` } as CoverPanelStyle)
    : undefined;
  const hasSong = !!currentSong;
  const favoriteActive = hasSong && isFavorite(currentSong.id, currentSong.source);
  const currentSongKey = currentSong ? getSongKey(currentSong) : '';
  const canCreatePlaylist = newPlaylistName.trim().length > 0;

  useEffect(() => {
    if (!isOpen || !currentSong || currentSong.lrc) {
      setLyricsOverride('');
      setLyricsLoading(false);
      return;
    }

    let cancelled = false;
    setLyricsOverride('');
    setLyricsLoading(true);

    getLyrics(currentSong.id, currentSong.source).then((lrc) => {
      if (!cancelled) setLyricsOverride(lrc || '');
    }).finally(() => {
      if (!cancelled) setLyricsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [currentSong, isOpen]);

  useEffect(() => {
    if (!lyricListRef.current || activeLyricIndex < 0) return;

    const activeEl = lyricListRef.current.querySelector<HTMLElement>('[data-active="true"]');
    if (!activeEl) return;

    const container = lyricListRef.current;
    container.scrollTo({
      top: activeEl.offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2,
      behavior: 'smooth',
    });
  }, [activeLyricIndex]);

  const handleDownload = async (quality: AudioQuality) => {
    if (!currentSong || downloadQuality) return;

    setDownloadQuality(quality);
    try {
      const url = await getSongUrl(currentSong.id, currentSong.source, quality);
      if (!url) return;

      const meta = downloadMeta[quality] || { label: quality.toUpperCase(), ext: 'mp3' };
      triggerDownload(url, `${currentSong.artist} - ${currentSong.name}.${meta.ext}`);
    } finally {
      setDownloadQuality(null);
    }
  };

  const handleShare = async () => {
    if (!currentSong) return;

    const text = `我在 TuneFree 发现了一首好歌：${currentSong.artist} - ${currentSong.name}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: currentSong.name, text, url: window.location.origin });
      } else {
        await navigator.clipboard.writeText(`${text} ${window.location.origin}`);
      }
    } catch {
      // share cancelled
    }
  };

  const handleCreatePlaylist = () => {
    if (!currentSong || !canCreatePlaylist) return;
    createPlaylist(newPlaylistName.trim(), [currentSong]);
    setNewPlaylistName('');
  };

  return (
    <div className={`full-player-layer ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
      <div className="full-player-backdrop" onClick={onClose} />
      <section
        className={`full-player-panel ${currentSong?.pic ? 'has-cover-bg' : ''} ${isPlaying ? 'is-playing' : ''}`}
        style={panelStyle}
        aria-label="全屏播放器"
      >
        <button type="button" className="full-close-button" aria-label="收起播放器" onClick={onClose}>
          <CloseIcon size={20} />
        </button>

        <div className="full-player-art">
          <CoverArt
            src={currentSong?.pic}
            alt={currentSong?.name || '当前播放'}
            className={`full-cover-art spinning-cover ${isPlaying ? 'is-rotating' : ''}`}
            iconSize={64}
          />
          <div className="full-song-meta">
            <h2>{currentSong?.name || '未在播放'}</h2>
            <p>{currentSong?.artist || '从排行榜、搜索或资料库中选择音乐'}</p>
            <div className="full-song-actions" aria-label="歌曲操作">
              <button
                type="button"
                className={`full-action-button ${favoriteActive ? 'active' : ''}`}
                disabled={!currentSong}
                onClick={() => currentSong && toggleFavorite(currentSong)}
              >
                {favoriteActive ? <HeartFillIcon size={18} /> : <HeartIcon size={18} />}
                {favoriteActive ? '已喜欢' : '喜欢'}
              </button>
              <button
                type="button"
                className={`full-action-button ${showMorePanel ? 'active' : ''}`}
                disabled={!currentSong}
                onClick={() => setShowMorePanel((prev) => !prev)}
              >
                <MoreIcon size={18} />
                更多
              </button>
              <div className="download-action-group" aria-label="下载音质">
                {qualityOptions.map((quality) => {
                  const meta = downloadMeta[quality];
                  return (
                    <button
                      type="button"
                      className="full-action-button"
                      disabled={!currentSong || !!downloadQuality}
                      onClick={() => handleDownload(quality)}
                      key={quality}
                    >
                      <DownloadIcon size={16} />
                      {downloadQuality === quality ? '获取中' : meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {currentSong && showMorePanel ? (
              <div className="full-more-panel" aria-label="更多播放操作">
                <div className="full-more-row compact">
                  <button type="button" className="full-more-button" onClick={handleShare}>
                    <ShareIcon size={15} /> 分享
                  </button>
                  <button type="button" className="full-more-button" disabled={!currentSong.artist} onClick={() => onSearch(currentSong.artist)}>
                    <SearchIcon size={15} /> 搜索歌手
                  </button>
                  <button type="button" className="full-more-button" disabled={!currentSong.album} onClick={() => onSearch(currentSong.album)}>
                    <SearchIcon size={15} /> 搜索专辑
                  </button>
                </div>
                <div className="full-more-playlist">
                  <div className="full-more-title">添加到歌单</div>
                  <div className="full-more-create">
                    <input value={newPlaylistName} onChange={(event) => setNewPlaylistName(event.target.value)} placeholder="新建歌单" />
                    <button type="button" disabled={!canCreatePlaylist} onClick={handleCreatePlaylist}>
                      <PlusIcon size={14} /> 创建
                    </button>
                  </div>
                  <div className="full-more-playlist-list">
                    {playlists.length === 0 ? (
                      <span className="full-more-empty">还没有歌单</span>
                    ) : playlists.slice(0, 6).map((playlist) => {
                      const added = playlist.songs.some((song) => getSongKey(song) === currentSongKey);
                      return (
                        <button type="button" key={playlist.id} className="full-more-playlist-button" onClick={() => addToPlaylist(playlist.id, currentSong)}>
                          <span>{playlist.name}</span>
                          <em>{added ? '已添加' : `${playlist.songs.length} 首`}</em>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="full-lyrics-stage">
          <div className="lyric-orbit" aria-hidden="true" />
          <div className="lyric-score" aria-hidden="true">
            <div className="score-staff">
              {Array.from({ length: 5 }).map((_, index) => <span key={index} />)}
            </div>
            {scoreNotes.map((note, index) => {
              const style = {
                top: `${note.top}%`,
                left: `${note.left}%`,
                '--note-delay': `${note.delay.toFixed(2)}s`,
                '--note-duration': `${note.duration.toFixed(2)}s`,
                '--note-drift': `${note.drift}px`,
              } as NoteStyle;

              return (
                <span className="score-note" style={style} key={`${note.glyph}-${index}`}>
                  {note.glyph}
                </span>
              );
            })}
          </div>
          <div className="full-lyrics-content">
            {lyricWindow.length > 0 ? (
              <div ref={lyricListRef} className="lyric-scroll lyric-scrollable" aria-live="polite">
                {lyricWindow.map(({ row, index }) => {
                  const offset = index - activeLyricIndex;
                  const style = { '--lyric-offset': offset } as OffsetStyle;
                  return (
                    <button
                      type="button"
                      className={`lyric-line ${offset === 0 ? 'active' : ''} ${Math.abs(offset) > 2 ? 'dim' : ''}`}
                      style={style}
                      key={`${row.time}-${row.text}`}
                      data-active={offset === 0 ? 'true' : undefined}
                      onClick={() => seek(row.time)}
                    >
                      <span>{row.text}</span>
                      {row.translation ? <em>{row.translation}</em> : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="lyric-scroll lyric-empty" aria-live="polite">
                {lyricsLoading ? <span className="lyric-loading-dot" /> : <MusicIcon size={30} />}
                <p className="lyric-line active">
                  <span>{lyricsLoading ? '加载歌词中...' : currentSong?.name || 'TuneFree Desktop'}</span>
                  <em>{lyricsLoading ? currentSong?.name || '' : currentSong?.artist || '选择一首音乐开始'}</em>
                </p>
              </div>
            )}
          </div>
        </div>

        <aside className="full-queue-card">
          <div className="queue-now-card">
            <CoverArt src={currentSong?.pic} alt={currentSong?.name || '当前播放'} className="queue-now-cover" iconSize={26} />
            <div className="queue-now-meta">
              <p>正在播放</p>
              <h3>{currentSong?.name || '未在播放'}</h3>
              <span>{currentSong?.artist || '选择一首音乐开始'}</span>
            </div>
          </div>
          <div className="queue-header">
            <div>
              <h3 className="panel-title"><QueueIcon size={18} /> 播放队列</h3>
              <button type="button" className="queue-mode-chip" onClick={togglePlayMode}>{playModeLabel[playMode]}</button>
            </div>
            <button type="button" className="icon-button" aria-label="清空队列" onClick={clearQueue}>
              <TrashIcon size={16} />
            </button>
          </div>
          <div className="queue-list full-queue-list">
            {queue.length === 0 ? (
              <div className="empty-state">
                <p>队列还是空的。播放任意歌曲后，这里会显示接下来的音乐。</p>
              </div>
            ) : (
              <VirtualList
                items={queue}
                itemHeight={68}
                maxHeight={340}
                className="queue-virtual-list"
                getKey={(song, index) => `${song.source}-${song.id}-${index}`}
                renderItem={(song, index, style) => {
                  const active = isSameSong(currentSong, song);
                  return (
                    <div className={`queue-item ${active ? 'active' : ''}`} key={`${song.source}-${song.id}-${index}`} style={style}>
                      <button type="button" className="queue-play-button" onClick={() => playSong(song)} aria-label={`播放 ${song.name}`}>
                        <span className="queue-number">{active ? '▶' : index + 1}</span>
                        <CoverArt src={song.pic} alt={song.name || '队列歌曲'} className="queue-cover" iconSize={15} />
                        <span className="queue-song-meta">
                          <span className="queue-title">{song.name}</span>
                          <span className="queue-artist">{song.artist || '未知歌手'}</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="table-action"
                        aria-label="从队列移除"
                        onClick={() => removeFromQueue(song.id, song.source)}
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  );
                }}
              />
            )}
          </div>
        </aside>

        <div className="full-player-controls">
          <div className="transport-wave-bg" aria-hidden="true">
            <AudioVisualizer isPlaying={isPlaying} />
          </div>
          <div className="transport-main">
            <CoverArt
              src={currentSong?.pic}
              alt={currentSong?.name || 'TuneFree'}
              className={`transport-cover spinning-cover ${isPlaying ? 'is-rotating' : ''}`}
              iconSize={20}
            />
            <div className="transport-info">
              <div className="transport-title">{currentSong?.name || '选择一首音乐开始'}</div>
              <div className="transport-artist">{currentSong?.artist || 'TuneFree Desktop'}</div>
            </div>
          </div>
          <div className="transport-center">
            <div className="transport-controls">
              <button type="button" className="control-button" aria-label="上一首" onClick={() => playPrev()}>
                <PrevIcon size={19} />
              </button>
              <button type="button" className="control-button primary" aria-label="播放或暂停" onClick={() => togglePlay()} disabled={!currentSong && !isPlaying}>
                {isLoading ? <span>…</span> : isPlaying ? <PauseIcon size={23} /> : <PlayIcon size={23} />}
              </button>
              <button type="button" className="control-button" aria-label="下一首" onClick={() => playNext(true)}>
                <NextIcon size={19} />
              </button>
            </div>
            <div className="progress-row">
              <span>{formatTime(currentTime)}</span>
              <input
                className="progress-bar"
                aria-label="播放进度"
                type="range"
                min={0}
                max={duration || 0}
                value={duration ? Math.min(currentTime, duration) : 0}
                onChange={(event) => seek(Number(event.target.value))}
              />
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          <div className="transport-tools">
            <button
              type="button"
              className={`icon-button transport-like-button ${favoriteActive ? 'active' : ''}`}
              aria-label={favoriteActive ? '取消喜欢' : '喜欢当前歌曲'}
              disabled={!currentSong}
              onClick={() => currentSong && toggleFavorite(currentSong)}
            >
              {favoriteActive ? <HeartFillIcon size={16} /> : <HeartIcon size={16} />}
            </button>
            <button type="button" className="icon-button" aria-label="切换播放模式" onClick={togglePlayMode}>
              {modeIcon}
            </button>
            {qualityOptions.map((quality) => (
              <button
                key={quality}
                type="button"
                className={`quality-button ${audioQuality === quality ? 'active' : ''}`}
                onClick={() => setAudioQuality(quality)}
              >
                {quality === 'flac24bit' ? 'Hi-Res' : quality.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
