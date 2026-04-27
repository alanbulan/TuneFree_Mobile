import { useEffect, useMemo, useState } from 'react';
import {
  BoxesIcon,
  CloudIcon,
  CodeIcon,
  DatabaseIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileCodeIcon,
  FolderIcon,
  GithubIcon,
  InfoIcon,
  KeyIcon,
  MusicIcon,
  PanelsIcon,
  PlusIcon,
  RocketIcon,
  ServerIcon,
  SettingsIcon,
  UploadIcon,
  WaveformIcon,
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
const desktopTechStack = [
  { name: 'Next.js 15', detail: 'App Router', icon: <RocketIcon size={18} /> },
  { name: 'React 19', detail: 'Client UI', icon: <CodeIcon size={18} /> },
  { name: 'TypeScript', detail: 'Typed Core', icon: <FileCodeIcon size={18} /> },
  { name: 'Static Export', detail: 'Edge Pages', icon: <CloudIcon size={18} /> },
  { name: 'Cloudflare Pages', detail: 'Deploy', icon: <ServerIcon size={18} /> },
  { name: 'Pages Functions', detail: 'API Proxy', icon: <DatabaseIcon size={18} /> },
  { name: 'Web Audio API', detail: 'Analyser', icon: <WaveformIcon size={18} /> },
  { name: 'Canvas', detail: 'Spectrum', icon: <PanelsIcon size={18} /> },
  { name: 'Virtual List', detail: 'Large Queue', icon: <BoxesIcon size={18} /> },
];

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
          <SongTable songs={favorites} currentSong={currentSong} isPlaying={isPlaying} emptyText="暂无收藏歌曲" onPlay={playSong} />
        </section>
      )}

      {activeView === 'playlists' && selectedPlaylist && renderPlaylistSongs(selectedPlaylist)}

      {activeView === 'playlists' && !selectedPlaylist && (
        <section className="playlist-grid">
          <div className="create-card playlist-action-card">
            <div className="playlist-action-card-body">
              <span className="playlist-card-icon"><PlusIcon size={36} /></span>
              <div className="playlist-action-copy">
                <p className="eyebrow">Create</p>
                <h3>新建歌单</h3>
                <p>从空白歌单开始整理收藏，适合按场景或心情归类。</p>
              </div>
              <div className="panel-field playlist-panel-field">
                <input className="panel-input" value={newPlaylistName} onChange={(event) => setNewPlaylistName(event.target.value)} placeholder="歌单名称" />
              </div>
              <button type="button" className="primary-button playlist-card-button" onClick={handleCreatePlaylist}>创建</button>
            </div>
          </div>

          <div className="create-card playlist-action-card playlist-import-card">
            <div className="playlist-action-card-body">
              <span className="playlist-card-icon"><DownloadIcon size={36} /></span>
              <div className="playlist-action-copy">
                <p className="eyebrow">Import</p>
                <h3>导入在线歌单</h3>
                <p>粘贴歌单 ID，一次同步到本地资料库。</p>
              </div>
              <div className="panel-field playlist-panel-field">
                <div className="source-option-row compact playlist-source-options" role="radiogroup" aria-label="选择导入音源">
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
              <button type="button" className="primary-button playlist-card-button" disabled={isImporting} onClick={handleImportOnlinePlaylist}>{isImporting ? '导入中…' : '导入'}</button>
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
        <section className="about-grid about-grid-rich">
          <div className="about-card about-hero-card glass-panel">
            <div className="about-app-icon"><MusicIcon size={38} /></div>
            <div className="about-hero-copy">
              <h3>TuneFree Desktop</h3>
              <p>一个与 iOS PWA 隔离的桌面音乐体验，保留移动端的多源聚合、无损音质、歌词解析和本地资料库，同时为 PC 端重做侧栏、表格、队列和底部播放器。</p>
              <span className="about-version">Desktop Web · v1.2.0</span>
            </div>
          </div>

          <div className="about-content-grid">
            <div className="about-card about-feature-card glass-panel">
              <InfoIcon size={30} />
              <h3>功能特性</h3>
              <div className="about-feature-list">
                {[
                  ['多源聚合搜索', '支持网易云、QQ 音乐、酷我音乐，以及 JOOX / Bilibili 等 GD Studio 扩展音源。'],
                  ['桌面级播放体验', '常驻底部迷你播放器、全屏播放器、播放队列、喜欢收藏、下载和音质切换。'],
                  ['逐行滚动歌词', '支持 LRC 时间轴、双语歌词合并、点击歌词跳转，以及基于歌词内容的乐谱动画。'],
                  ['本地资料库', '收藏、歌单、在线歌单导入、JSON 备份导入导出均保存在浏览器本地。'],
                  ['实时频谱动画', '复用移动端 Web Audio + Canvas 频谱，在进度条区域显示动态波谱背景。'],
                ].map(([title, desc], index) => (
                  <div className="about-feature-item" key={title}>
                    <span>{index + 1}</span>
                    <div>
                      <strong>{title}</strong>
                      <p>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="about-proof-panel">
                <p className="eyebrow">Source-backed details</p>
                <div className="about-proof-grid">
                  {[
                    ['持久化播放现场', '当前歌曲、播放队列、播放模式和默认音质会写入 localStorage，刷新后仍能恢复。'],
                    ['音质与下载一致', '底部播放器提供 128K、320K、FLAC、Hi-Res 选项，下载时按当前音质生成 mp3 / flac 文件名。'],
                    ['异常自动降级', '高音质地址不可用或浏览器拒播时，播放器会自动回退到 128K，减少播放中断。'],
                    ['系统媒体控制', '接入 Media Session，向系统提供歌曲名、艺人、封面、进度，以及播放 / 暂停 / 上下首 / 跳转控制。'],
                    ['歌词补全策略', '当当前歌词缺少翻译且音源支持时，会再次请求歌词并合并双语行。'],
                    ['资料库备份', '收藏和歌单使用 tunefree_favorites / tunefree_playlists 保存，导出 JSON 带 version 与 exportDate。'],
                  ].map(([title, desc]) => (
                    <div className="about-proof-item" key={title}>
                      <strong>{title}</strong>
                      <p>{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="about-side-stack">
              <div className="about-card about-tech-card glass-panel">
                <SettingsIcon size={30} />
                <h3>桌面端技术栈</h3>
                <div className="about-tech-grid">
                  {desktopTechStack.map((tech) => (
                    <span className="about-tech-chip" key={tech.name}>
                      <span className="about-tech-icon">{tech.icon}</span>
                      <span>
                        <strong>{tech.name}</strong>
                        <em>{tech.detail}</em>
                      </span>
                    </span>
                  ))}
                </div>
                <p>桌面版已提升到仓库根目录，使用 Next.js 静态导出部署；API 代理通过同源 Cloudflare Pages Functions 提供，不影响原 iOS PWA。</p>
              </div>

              <div className="about-card about-api-card glass-panel">
                <InfoIcon size={30} />
                <h3>后端 API 与数据源</h3>
                <p>音乐数据由 TuneHub API 与 {GD_STUDIO_ATTRIBUTION} 共同提供。TuneHub 负责原有解析链路；GD Studio 负责 JOOX、Bilibili 等扩展源。</p>
                <p>JOOX 扩展源建议控制频率：{GD_STUDIO_RATE_LIMIT_HINT}。歌词是否双语取决于上游返回字段，桌面端会自动合并 lyric / tlyric / trans / translation。</p>
                <div className="about-link-row">
                  <a href="https://linux.do/t/topic/1326425" target="_blank" rel="noopener noreferrer"><ExternalLinkIcon size={13} /> TuneHub 原帖</a>
                  <a href="https://music.gdstudio.xyz/" target="_blank" rel="noopener noreferrer"><ExternalLinkIcon size={13} /> GD 音乐台</a>
                </div>
              </div>
            </div>
          </div>

          <div className="about-link-grid">
            <a className="about-card glass-panel about-link-card" href="https://music.alanbulan.space/" target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon size={30} />
              <h3>在线演示</h3>
              <p>music.alanbulan.space</p>
            </a>
            <a className="about-card glass-panel about-link-card" href="https://github.com/alanbulan/musicxilan" target="_blank" rel="noopener noreferrer">
              <GithubIcon size={30} />
              <h3>GitHub 仓库</h3>
              <p>alanbulan/musicxilan</p>
            </a>
          </div>

          <div className="about-card about-notice-card glass-panel">
            <h3>声明</h3>
            <p>本项目仅供学习 React、Next.js 与现代前端工程实践使用。音乐资源来源于第三方 API，本项目不存储任何音频文件，请支持正版音乐。</p>
            <span>MIT License © 2026 TuneFree</span>
          </div>
        </section>
      )}
    </div>
  );
}
