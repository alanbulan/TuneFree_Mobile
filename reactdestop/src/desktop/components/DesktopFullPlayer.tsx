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

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
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

  return (
    <div className={`full-player-layer ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
      <div className="full-player-backdrop" onClick={onClose} />
      <section className="full-player-panel" aria-label="全屏播放器">
        <button type="button" className="full-close-button" aria-label="收起播放器" onClick={onClose}>
          <CloseIcon size={20} />
        </button>

        <div className="full-player-art">
          <CoverArt src={currentSong?.pic} alt={currentSong?.name || '当前播放'} className="full-cover-art" iconSize={64} />
          <div className="full-song-meta">
            <h2>{currentSong?.name || '未在播放'}</h2>
            <p>{currentSong?.artist || '从排行榜、搜索或资料库中选择音乐'}</p>
          </div>
        </div>

        <div className="full-lyrics-stage">
          <div className="lyric-orbit" aria-hidden="true" />
          <div className="full-lyrics-content">
            <MusicIcon size={32} />
            <p className="lyric-line active">{currentSong?.name || 'TuneFree Desktop'}</p>
            <p className="lyric-line">歌词与频谱将在这里独立展示</p>
            <p className="lyric-line dim">不再占用普通页面右侧空间</p>
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
                maxHeight={430}
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
            <CoverArt src={currentSong?.pic} alt={currentSong?.name || 'TuneFree'} className="transport-cover" iconSize={20} />
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
