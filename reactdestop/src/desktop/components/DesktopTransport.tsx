import { useMemo, useState } from 'react';
import {
  DownloadIcon,
  HeartFillIcon,
  HeartIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  RepeatIcon,
  RepeatOneIcon,
  ShuffleIcon,
} from '../../core/components/Icons';
import { useLibrary } from '../../core/contexts/LibraryContext';
import {
  usePlayerActions,
  usePlayerNowPlaying,
  usePlayerProgress,
  usePlayerQueueState,
  usePlayerSettings,
} from '../../core/contexts/PlayerContext';
import { getSongUrl, triggerDownload } from '../../core/services/api';
import type { AudioQuality } from '../../core/types';
import CoverArt from './CoverArt';

interface DesktopTransportProps {
  onExpand: () => void;
}

type MiniLyricRow = {
  time: number;
  text: string;
  translation?: string;
};

const timeTagPattern = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
const metadataPattern = /^\s*\[(ar|al|ti|by|offset|length|re|ve|kana):.*\]\s*$/i;

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

const parseMiniLyrics = (lrc?: string): MiniLyricRow[] => {
  if (!lrc?.trim()) return [];

  const grouped = new Map<number, string[]>();
  for (const rawLine of lrc.split('\n')) {
    const line = rawLine.trim();
    if (!line || metadataPattern.test(line)) continue;

    const matches = Array.from(line.matchAll(timeTagPattern));
    if (matches.length === 0) continue;

    const text = line.replace(timeTagPattern, '').replace(/\s+/g, ' ').trim();
    if (!text) continue;

    for (const match of matches) {
      const key = Math.round(parseTimeMatch(match) * 1000);
      const values = grouped.get(key) || [];
      if (!values.includes(text)) values.push(text);
      grouped.set(key, values);
    }
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a - b)
    .map(([time, values]) => ({
      time: time / 1000,
      text: values[0],
      translation: values.slice(1).find((value) => value !== values[0]),
    }));
};

const getActiveMiniLyric = (rows: MiniLyricRow[], currentTime: number): MiniLyricRow | null => {
  if (rows.length === 0) return null;

  let active = rows[0];
  for (const row of rows) {
    if (row.time <= currentTime + 0.22) active = row;
    else break;
  }
  return active;
};

const qualityOptions: AudioQuality[] = ['128k', '320k', 'flac', 'flac24bit'];
const downloadMeta: Record<string, { ext: string }> = {
  '128k': { ext: 'mp3' },
  '320k': { ext: 'mp3' },
  flac: { ext: 'flac' },
  flac24bit: { ext: 'flac' },
};

export default function DesktopTransport({ onExpand }: DesktopTransportProps) {
  const { currentSong, isPlaying, isLoading } = usePlayerNowPlaying();
  const { currentTime, duration } = usePlayerProgress();
  const { playMode } = usePlayerQueueState();
  const { audioQuality } = usePlayerSettings();
  const { toggleFavorite, isFavorite } = useLibrary();
  const { togglePlay, playNext, playPrev, seek, togglePlayMode, setAudioQuality } = usePlayerActions();
  const [downloading, setDownloading] = useState(false);

  const lyricRows = useMemo(() => parseMiniLyrics(currentSong?.lrc), [currentSong?.lrc]);
  const activeLyric = getActiveMiniLyric(lyricRows, currentTime);
  const favoriteActive = !!currentSong && isFavorite(currentSong.id, currentSong.source);
  const modeIcon = playMode === 'shuffle' ? <ShuffleIcon size={17} /> : playMode === 'loop' ? <RepeatOneIcon size={17} /> : <RepeatIcon size={17} />;

  const handleDownload = async () => {
    if (!currentSong || downloading) return;

    setDownloading(true);
    try {
      const url = await getSongUrl(currentSong.id, currentSong.source, audioQuality);
      if (!url) return;

      const meta = downloadMeta[audioQuality] || { ext: 'mp3' };
      triggerDownload(url, `${currentSong.artist} - ${currentSong.name}.${meta.ext}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="transport mini-player">
      <div className="transport-wave-bg mini-wave-bg" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <button type="button" className="transport-main mini-player-summary" onClick={onExpand} aria-label="打开全屏播放器">
        <CoverArt
          src={currentSong?.pic}
          alt={currentSong?.name || 'TuneFree'}
          className={`transport-cover spinning-cover ${isPlaying ? 'is-rotating' : ''}`}
          iconSize={20}
        />
        <span className="transport-info">
          <span className="transport-title">{currentSong?.name || '选择一首音乐开始'}</span>
          <span className="transport-artist">{currentSong?.artist || 'TuneFree Desktop'}</span>
        </span>
      </button>

      <div className="transport-center">
        <button type="button" className="transport-mini-lyric" onClick={onExpand} aria-label="打开全屏歌词">
          <span>{activeLyric?.text || currentSong?.name || 'TuneFree Desktop'}</span>
          {activeLyric?.translation ? <em>{activeLyric.translation}</em> : null}
        </button>
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
        <button
          type="button"
          className="icon-button"
          aria-label="下载当前歌曲"
          disabled={!currentSong || downloading}
          onClick={handleDownload}
        >
          <DownloadIcon size={16} />
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
  );
}
