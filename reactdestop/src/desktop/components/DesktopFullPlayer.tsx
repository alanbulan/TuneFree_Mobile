import { useMemo, type CSSProperties } from 'react';
import AudioVisualizer from '../../core/components/AudioVisualizer';
import {
  CloseIcon,
  MusicIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  QueueIcon,
  RepeatIcon,
  RepeatOneIcon,
  ShuffleIcon,
  TrashIcon,
} from '../../core/components/Icons';
import {
  usePlayerActions,
  usePlayerNowPlaying,
  usePlayerProgress,
  usePlayerQueueState,
  usePlayerSettings,
} from '../../core/contexts/PlayerContext';
import type { AudioQuality } from '../../core/types';
import { isSameSong } from '../../core/types';
import CoverArt from './CoverArt';
import VirtualList from './VirtualList';

interface DesktopFullPlayerProps {
  isOpen: boolean;
  onClose: () => void;
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

export default function DesktopFullPlayer({ isOpen, onClose }: DesktopFullPlayerProps) {
  const { currentSong, isPlaying, isLoading } = usePlayerNowPlaying();
  const { currentTime, duration } = usePlayerProgress();
  const { queue, playMode } = usePlayerQueueState();
  const { audioQuality } = usePlayerSettings();
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
  const lyricRows = useMemo(() => parseLyrics(currentSong?.lrc), [currentSong?.lrc]);
  const activeLyricIndex = getActiveLyricIndex(lyricRows, currentTime);
  const activeLyric = activeLyricIndex >= 0 ? lyricRows[activeLyricIndex] : null;
  const lyricWindow = lyricRows.length > 0
    ? lyricRows.slice(Math.max(0, activeLyricIndex - 2), Math.min(lyricRows.length, activeLyricIndex + 4)).map((row, offset) => ({
      row,
      index: Math.max(0, activeLyricIndex - 2) + offset,
    }))
    : [];
  const scoreText = activeLyric?.text || currentSong?.name || 'TuneFree Desktop';
  const scoreNotes = useMemo(() => buildScoreNotes(scoreText, currentTime), [currentTime, scoreText]);
  const panelStyle = currentSong?.pic
    ? ({ '--full-cover-bg': `url(${JSON.stringify(currentSong.pic)})` } as CoverPanelStyle)
    : undefined;

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
              <div className="lyric-scroll" aria-live="polite">
                {lyricWindow.map(({ row, index }) => {
                  const offset = index - activeLyricIndex;
                  const style = { '--lyric-offset': offset } as OffsetStyle;
                  return (
                    <p className={`lyric-line ${offset === 0 ? 'active' : ''} ${Math.abs(offset) > 1 ? 'dim' : ''}`} style={style} key={`${row.time}-${row.text}`}>
                      <span>{row.text}</span>
                      {row.translation ? <em>{row.translation}</em> : null}
                    </p>
                  );
                })}
              </div>
            ) : (
              <div className="lyric-scroll lyric-empty" aria-live="polite">
                <MusicIcon size={30} />
                <p className="lyric-line active">
                  <span>{currentSong?.name || 'TuneFree Desktop'}</span>
                  <em>{currentSong?.artist || '选择一首音乐开始'}</em>
                </p>
              </div>
            )}
          </div>
          <div className="full-visualizer">
            <AudioVisualizer isPlaying={isPlaying} />
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
            <h3 className="panel-title"><QueueIcon size={18} /> 播放队列</h3>
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
