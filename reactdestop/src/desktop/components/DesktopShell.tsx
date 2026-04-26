import { FormEvent, useState } from 'react';
import { ExternalLinkIcon, HeartFillIcon, HomeIcon, LibraryIcon, SearchIcon, SettingsIcon, SidebarCollapseIcon, SidebarExpandIcon } from '../../core/components/Icons';
import DesktopHome from '../features/home/DesktopHome';
import DesktopLibrary from '../features/library/DesktopLibrary';
import DesktopSearch from '../features/search/DesktopSearch';
import type { DesktopView, LibraryView } from '../types';
import DesktopFullPlayer from './DesktopFullPlayer';
import DesktopTransport from './DesktopTransport';

interface DesktopShellProps {
  view: DesktopView;
  onViewChange: (view: DesktopView) => void;
}

const navItems: { view: DesktopView; label: string; icon: React.ReactNode }[] = [
  { view: 'home', label: '首页', icon: <HomeIcon size={17} /> },
  { view: 'search', label: '搜索', icon: <SearchIcon size={17} /> },
  { view: 'favorites', label: '收藏', icon: <HeartFillIcon size={17} /> },
  { view: 'playlists', label: '歌单', icon: <LibraryIcon size={17} /> },
  { view: 'settings', label: '管理', icon: <SettingsIcon size={17} /> },
  { view: 'about', label: '关于', icon: <ExternalLinkIcon size={17} /> },
];

const libraryViews: LibraryView[] = ['favorites', 'playlists', 'settings', 'about'];

export default function DesktopShell({ view, onViewChange }: DesktopShellProps) {
  const [commandQuery, setCommandQuery] = useState('');
  const [searchRequest, setSearchRequest] = useState({ query: '', nonce: 0 });
  const [fullPlayerOpen, setFullPlayerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const submitSearch = (query: string) => {
    const clean = query.trim();
    if (!clean) return;
    localStorage.setItem('tunefree_desktop_pending_query', clean);
    setSearchRequest((prev) => ({ query: clean, nonce: prev.nonce + 1 }));
    onViewChange('search');
  };

  const handleCommandSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitSearch(commandQuery);
  };

  return (
    <div className={`desktop-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <header className="window-bar">
        <div className="window-brand-lockup" aria-label="TuneFree Desktop">
          <img className="brand-mark" src="/icon.svg" alt="" aria-hidden="true" />
          <span>TuneFree</span>
        </div>
        {view !== 'search' ? (
          <form className="command-search" onSubmit={handleCommandSearch}>
            <SearchIcon size={15} />
            <input value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} placeholder="搜索" />
          </form>
        ) : <div />}
        <div />
      </header>

      <aside className="sidebar">
        <div className="sidebar-topline">
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={sidebarCollapsed ? '展开侧边菜单' : '收起侧边菜单'}
            title={sidebarCollapsed ? '展开侧边菜单' : '收起侧边菜单'}
            onClick={() => setSidebarCollapsed((prev) => !prev)}
          >
            {sidebarCollapsed ? <SidebarExpandIcon size={20} /> : <SidebarCollapseIcon size={20} />}
          </button>
        </div>
        <p className="sidebar-section-title">TuneFree</p>
        <nav className="nav-group" aria-label="主导航">
          {navItems.map((item) => (
            <button
              key={item.view}
              type="button"
              className={`nav-button ${view === item.view ? 'active' : ''}`}
              title={item.label}
              onClick={() => onViewChange(item.view)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="workspace">
        <div className="view-scroll" key={view}>
          <div className="view-transition-panel">
            {view === 'home' && <DesktopHome onViewChange={onViewChange} />}
            {view === 'search' && <DesktopSearch commandQuery={searchRequest.query} commandNonce={searchRequest.nonce} />}
            {libraryViews.includes(view as LibraryView) && <DesktopLibrary activeView={view as LibraryView} />}
          </div>
        </div>
      </main>

      <DesktopTransport onExpand={() => setFullPlayerOpen(true)} />
      <DesktopFullPlayer isOpen={fullPlayerOpen} onClose={() => setFullPlayerOpen(false)} onSearch={submitSearch} />
    </div>
  );
}
