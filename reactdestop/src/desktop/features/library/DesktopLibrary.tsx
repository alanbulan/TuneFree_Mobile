import { useEffect, useMemo, useState } from 'react';
import {
  DownloadIcon,
  ExternalLinkIcon,
  FolderIcon,
  GithubIcon,
  HeartFillIcon,
  InfoIcon,
  KeyIcon,
  MusicIcon,
  PlusIcon,
  SettingsIcon,
  UploadIcon,
} from '../../../core/components/Icons';
import { useLibrary } from '../../../core/contexts/LibraryContext';
import { usePlayerActions, usePlayerNowPlaying } from '../../../core/contexts/PlayerContext';
import { DEFAULT_API_BASE, getPlaylistDetail } from '../../../core/services/api';
import type { Playlist } from '../../../core/types';
import type { LibraryView } from '../../types';
import { GD_STUDIO_ATTRIBUTION, GD_STUDIO_RATE_LIMIT_HINT, getMusicSourceLabel } from '../../../core/utils/musicSource';
import SongTable from '../../components/SongTable';

const viewMeta: Record<LibraryView, { eyebrow: string; title: string }> = {
  favorites: { eyebrow: 'Your Collection', title: '收藏' },
  playlists: { eyebrow: 'Playlists', title: '歌单' },
  settings: { eyebrow: 'Control Panel', title: '管理' },
  about: { eyebrow: 'About TuneFree', title: '关于' },
};
const importSourceOptions = ['netease', 'qq', 'kuwo'];

interface DesktopLibraryProps {
  activeView: LibraryView;
}

export default function DesktopLibrary({ activeView }: DesktopLibraryProps) {
  const {
    favorites,
    playlists,
    apiKey,
    corsProxy,
    apiBase,
    setApiKey,
    setCorsProxy,
    setApiBase,
    createPlaylist,
    importPlaylist,
    deletePlaylist,
    renamePlaylist,
    removeFromPlaylist,
    exportData,
    importData,
  } = useLibrary();
  const { playSong } = usePlayerActions();
  const { currentSong, isPlaying } = usePlayerNowPlaying();
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [importId, setImportId] = useState('');
  const [importSource, setImportSource] = useState('netease');
  const [isImporting, setIsImporting] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [tempProxy, setTempProxy] = useState(corsProxy);
  const [tempApiBase, setTempApiBase] = useState(apiBase);
  const [message, setMessage] = useState('');

  const selectedPlaylist = useMemo(
    () => playlists.find((playlist) => playlist.id === selectedPlaylistId) || null,
    [playlists, selectedPlaylistId],
  );
  const meta = viewMeta[activeView];

  useEffect(() => {
    setSelectedPlaylistId(null);
  }, [activeView]);

  const showMessage = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 2200);
  };

  const handleCreatePlaylist = () => {
    const name = newPlaylistName.trim();
    if (!name) return;
    createPlaylist(name);
    setNewPlaylistName('');
    showMessage(`已创建「${name}」`);
  };

  const handleImportOnlinePlaylist = async () => {
    if (!importId.trim()) return;
    setIsImporting(true);
    const result = await getPlaylistDetail(importId.trim(), importSource);
    if (result) {
      importPlaylist(result.name, result.songs);
      showMessage(`成功导入「${result.name}」`);
    } else {
      showMessage('导入失败，请检查 Key、ID 或音源');
    }
    setIsImporting(false);
  };

  const handleFileImport = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const success = event.target?.result ? importData(event.target.result as string) : false;
      showMessage(success ? '数据导入成功' : '数据导入失败');
    };
    reader.readAsText(file);
  };

  const renderPlaylistSongs = (playlist: Playlist) => (
    <div>
      <button type="button" className="soft-button" onClick={() => setSelectedPlaylistId(null)}>← 返回歌单列表</button>
      <div className="content-card glass-panel" style={{ margin: '14px 0' }}>
        <div className="panel-label-row">
          <div>
            <p className="eyebrow">Playlist</p>
            <h2 className="section-title">{playlist.name}</h2>
            <p>{playlist.songs.length} 首歌曲</p>
          </div>
          <div className="inline-actions">
            <button
              type="button"
              className="soft-button"
              onClick={() => {
                const nextName = window.prompt('重命名歌单', playlist.name);
                if (nextName?.trim()) renamePlaylist(playlist.id, nextName.trim());
              }}
            >
              重命名
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={() => {
                if (window.confirm('确定删除这个歌单？')) {
                  deletePlaylist(playlist.id);
                  setSelectedPlaylistId(null);
                }
              }}
            >
              删除歌单
            </button>
          </div>
        </div>
      </div>
      <SongTable
        songs={playlist.songs}
        currentSong={currentSong}
        isPlaying={isPlaying}
        emptyText="这个歌单还没有歌曲"
        actionLabel="操作"
        onPlay={playSong}
        onMore={(song) => removeFromPlaylist(playlist.id, song.id, song.source)}
      />
    </div>
  );

  return (
    <div>
      <div className="page-header library-page-header">
        <div>
          <p className="eyebrow">{meta.eyebrow}</p>
          <h1 className="page-title">{meta.title}</h1>
        </div>
        {message && <span className="source-badge">{message}</span>}
      </div>

      {activeView === 'favorites' && (
        <section>
          <div className="section-header">
            <h2 className="section-title"><HeartFillIcon size={20} /> 我喜欢的音乐</h2>
            <span className="source-badge">{favorites.length} 首</span>
          </div>
          <SongTable songs={favorites} currentSong={currentSong} isPlaying={isPlaying} emptyText="暂无收藏歌曲" onPlay={playSong} />
        </section>
      )}

      {activeView === 'playlists' && selectedPlaylist && renderPlaylistSongs(selectedPlaylist)}

      {activeView === 'playlists' && !selectedPlaylist && (
        <section className="playlist-grid">
          <div className="create-card">
            <div style={{ width: '100%' }}>
              <PlusIcon size={32} />
              <h3>新建歌单</h3>
              <div className="panel-field">
                <input className="panel-input" value={newPlaylistName} onChange={(event) => setNewPlaylistName(event.target.value)} placeholder="歌单名称" />
              </div>
              <button type="button" className="primary-button" onClick={handleCreatePlaylist}>创建</button>
            </div>
          </div>

          <div className="create-card">
            <div style={{ width: '100%' }}>
              <DownloadIcon size={32} />
              <h3>导入在线歌单</h3>
              <div className="panel-field">
                <div className="source-option-row compact" role="radiogroup" aria-label="选择导入音源">
                  {importSourceOptions.map((source) => (
                    <button
                      type="button"
                      key={source}
                      role="radio"
                      aria-checked={importSource === source}
                      className={`source-option ${importSource === source ? 'active' : ''}`}
                      onClick={() => setImportSource(source)}
                    >
                      {getMusicSourceLabel(source, 'full')}
                    </button>
                  ))}
                </div>
                <input className="panel-input" value={importId} onChange={(event) => setImportId(event.target.value)} placeholder="歌单 ID" />
              </div>
              <button type="button" className="primary-button" disabled={isImporting} onClick={handleImportOnlinePlaylist}>{isImporting ? '导入中…' : '导入'}</button>
            </div>
          </div>

          {isImporting && (
            <div className="library-card skeleton-library-card" aria-busy="true" aria-label="歌单导入中">
              <span className="skeleton-block skeleton-card-icon" />
              <span className="skeleton-line skeleton-card-title" />
              <span className="skeleton-line skeleton-card-subtitle" />
              <span className="skeleton-line skeleton-card-subtitle short" />
            </div>
          )}

          {playlists.map((playlist) => (
            <button type="button" className="library-card" key={playlist.id} onClick={() => setSelectedPlaylistId(playlist.id)}>
              <FolderIcon size={34} className="muted-text" />
              <h3>{playlist.name || '未命名歌单'}</h3>
              <p>{playlist.songs.length} 首歌曲</p>
              <div className="library-card-meta">
                <span className="source-badge">本地</span>
                <span className="muted-text">打开</span>
              </div>
            </button>
          ))}
        </section>
      )}

      {activeView === 'settings' && (
        <section className="settings-grid">
          <div className="settings-card glass-panel">
            <h3><SettingsIcon size={18} /> 核心设置</h3>
            <div className="panel-field">
              <label>TuneHub API Key</label>
              <input className="panel-input" type="password" placeholder="th_xxxxxxxxxxxx" value={tempApiKey} onChange={(event) => setTempApiKey(event.target.value)} />
            </div>
            <div className="panel-field">
              <label>API Base URL</label>
              <input className="panel-input" placeholder={DEFAULT_API_BASE} value={tempApiBase} onChange={(event) => setTempApiBase(event.target.value)} />
              <p className="muted-text">默认为 {DEFAULT_API_BASE}，如遇接口故障可尝试更换。</p>
            </div>
            <div className="panel-field">
              <label>CORS 代理</label>
              <input className="panel-input" placeholder="留空使用内置代理（推荐）" value={tempProxy} onChange={(event) => setTempProxy(event.target.value)} />
            </div>
            <button type="button" className="primary-button" onClick={() => {
              setApiKey(tempApiKey);
              setCorsProxy(tempProxy);
              setApiBase(tempApiBase);
              showMessage('设置已保存');
            }}>
              <KeyIcon size={16} /> 保存配置
            </button>
          </div>

          <div className="settings-card glass-panel">
            <h3><UploadIcon size={18} /> 数据备份</h3>
            <p>桌面端与移动 PWA 使用相同 localStorage key，因此可以导出/导入同一份收藏与歌单数据。</p>
            <div className="panel-actions">
              <button type="button" className="soft-button" onClick={exportData}>导出 JSON</button>
              <label className="soft-button">
                导入数据
                <input type="file" accept=".json" style={{ display: 'none' }} onChange={(event) => handleFileImport(event.target.files?.[0])} />
              </label>
            </div>
          </div>
        </section>
      )}

      {activeView === 'about' && (
        <section className="about-grid">
          <div className="about-card glass-panel">
            <MusicIcon size={38} />
            <h3>TuneFree Desktop</h3>
            <p>一个与 iOS PWA 隔离的桌面音乐体验，保留多源聚合、无损音质、歌词解析和本地资料库。</p>
          </div>
          <div className="about-card glass-panel">
            <InfoIcon size={30} />
            <h3>后端 API</h3>
            <p>音乐数据由 TuneHub API 与 {GD_STUDIO_ATTRIBUTION} 共同提供。JOOX 扩展源建议控制频率：{GD_STUDIO_RATE_LIMIT_HINT}。</p>
          </div>
          <a className="about-card glass-panel" href="https://music.alanbulan.space/" target="_blank" rel="noopener noreferrer">
            <ExternalLinkIcon size={30} />
            <h3>在线演示</h3>
            <p>music.alanbulan.space</p>
          </a>
          <a className="about-card glass-panel" href="https://github.com/alanbulan/musicxilan" target="_blank" rel="noopener noreferrer">
            <GithubIcon size={30} />
            <h3>GitHub 仓库</h3>
            <p>alanbulan/musicxilan</p>
          </a>
        </section>
      )}
    </div>
  );
}
