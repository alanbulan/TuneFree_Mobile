import { useEffect, useMemo, useState } from 'react';
import {
  BoxesIcon,
  CloudIcon,
  CodeIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  FileCodeIcon,
  FolderIcon,
  GithubIcon,
  InfoIcon,
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
import type { Playlist } from '../../../core/types';
import type { LibraryView } from '../../types';
import { GD_STUDIO_ATTRIBUTION, GD_STUDIO_RATE_LIMIT_HINT } from '../../../core/utils/musicSource';
import SongTable from '../../components/SongTable';

const viewMeta: Record<LibraryView, { eyebrow: string; title: string }> = {
  favorites: { eyebrow: 'Your Collection', title: '收藏' },
  playlists: { eyebrow: 'Playlists', title: '歌单' },
  settings: { eyebrow: 'Control Panel', title: '管理' },
  about: { eyebrow: 'About TuneFree', title: '关于' },
};
const desktopTechStack = [
  { name: 'Next.js 15', detail: 'App Router', icon: <RocketIcon size={18} /> },
  { name: 'React 18', detail: 'Client UI', icon: <CodeIcon size={18} /> },
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
    corsProxy,
    setCorsProxy,
    createPlaylist,
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
  const [tempProxy, setTempProxy] = useState(corsProxy);
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
          <div className="settings-card settings-core-card glass-panel">
            <h3><SettingsIcon size={18} /> 核心设置</h3>
            <div className="panel-field">
              <label>CORS 代理</label>
              <input className="panel-input" placeholder="留空使用内置代理（推荐）" value={tempProxy} onChange={(event) => setTempProxy(event.target.value)} />
            </div>
            <div className="settings-save-row">
              <button type="button" className="primary-button" onClick={() => {
                setCorsProxy(tempProxy);
                showMessage('设置已保存');
              }}>
                保存配置
              </button>
            </div>
          </div>

          <div className="settings-card settings-backup-card glass-panel">
            <span className="settings-card-icon"><UploadIcon size={22} /></span>
            <h3>数据备份</h3>
            <p>收藏与本地歌单都保存在浏览器本地；导出的 JSON 会包含版本号、导出时间、收藏列表和歌单列表。</p>
            <div className="backup-detail-list">
              <span>同一 localStorage key 可在桌面端与移动 PWA 间迁移</span>
              <span>导入 JSON 后会覆盖并恢复收藏与歌单数据</span>
            </div>
            <div className="panel-actions backup-actions">
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
              <p>一个与 iOS PWA 隔离的桌面音乐体验，保留多源聚合、无损音质、歌词解析和本地资料库，并在 v1.2.0 加入更稳定的播放链路与可拖动 Mira 桌面宠物。</p>
              <span className="about-version">Desktop Web · v1.2.0</span>
            </div>
          </div>

          <div className="about-content-grid">
            <div className="about-card about-feature-card glass-panel">
              <div className="about-card-heading">
                <InfoIcon size={30} />
                <h3>功能特性</h3>
              </div>
              <div className="about-feature-list">
                {[
                  ['多源聚合搜索', '支持网易云、QQ 音乐、酷我音乐，以及 JOOX / Bilibili 等 GD Studio 扩展音源。'],
                  ['TuneHub 解耦', '移除已关闭的 TuneHub / TuneFree API，搜索与播放不再依赖失效链路。'],
                  ['桌面级播放体验', '常驻底部迷你播放器、全屏播放器、播放队列、喜欢收藏、下载和音质切换。'],
                  ['稳定播放链路', '修复 URL 解析竞态、duration 同步、无音频 URL 清理和下一首预加载。'],
                  ['Mira 桌面宠物', '左下角常驻、可拖动、保存位置，并按加载、播放、暂停和左右移动展示状态反馈。'],
                  ['逐行滚动歌词', '支持 LRC 时间轴、双语歌词合并、点击歌词跳转，以及基于歌词内容的乐谱动画。'],
                  ['本地资料库', '收藏、歌单、JSON 备份导入导出均保存在浏览器本地。'],
                  ['实时频谱动画', '复用移动端 Web Audio + Canvas 频谱，在进度条区域显示动态波谱背景。'],
                  ['播放状态恢复', '当前歌曲、播放队列、播放模式和默认音质会在浏览器本地保存，刷新后仍能延续。'],
                  ['系统媒体控制', '接入 Media Session，支持系统层面的播放、暂停、上一首、下一首和进度跳转。'],
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
            </div>

            <div className="about-side-stack">
              <div className="about-card about-tech-card glass-panel">
                <div className="about-card-heading">
                  <SettingsIcon size={30} />
                  <h3>桌面端技术栈</h3>
                </div>
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
                <div className="about-card-heading">
                  <InfoIcon size={30} />
                  <h3>后端 API 与数据源</h3>
                </div>
                <p>桌面版已移除 TuneHub / TuneFree API 依赖：网易云、QQ 音乐、酷我音乐使用直连接口与同源 /api/url 解析；JOOX、Bilibili 等扩展源由 {GD_STUDIO_ATTRIBUTION} 提供。</p>
                <p>JOOX 扩展源建议控制频率：{GD_STUDIO_RATE_LIMIT_HINT}。歌词是否双语取决于上游返回字段，桌面端会自动合并 lyric / tlyric / trans / translation。</p>
                <div className="about-link-row">
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
