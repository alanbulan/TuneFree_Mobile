import {
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  RepeatIcon,
  RepeatOneIcon,
  ShuffleIcon,
} from '../../core/components/Icons';
import {
  usePlayerActions,
  usePlayerNowPlaying,
  usePlayerProgress,
  usePlayerQueueState,
  usePlayerSettings,
} from '../../core/contexts/PlayerContext';
import type { AudioQuality } from '../../core/types';
import CoverArt from './CoverArt';

interface DesktopTransportProps {
  onExpand: () => void;
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
};

const qualityOptions: AudioQuality[] = ['128k', '320k', 'flac', 'flac24bit'];

export default function DesktopTransport({ onExpand }: DesktopTransportProps) {
  const { currentSong, isPlaying, isLoading } = usePlayerNowPlaying();
  const { currentTime, duration } = usePlayerProgress();
  const { playMode } = usePlayerQueueState();
  const { audioQuality } = usePlayerSettings();
  const { togglePlay, playNext, playPrev, seek, togglePlayMode, setAudioQuality } = usePlayerActions();

  const modeIcon = playMode === 'shuffle' ? <ShuffleIcon size={17} /> : playMode === 'loop' ? <RepeatOneIcon size={17} /> : <RepeatIcon size={17} />;

  return (
    <div className="transport mini-player">
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
  );
}
