'use client';

import { useEffect, useState } from 'react';
import { LibraryProvider } from '../core/contexts/LibraryContext';
import { PlayerProvider } from '../core/contexts/PlayerContext';
import DesktopShell from './components/DesktopShell';
import type { DesktopView } from './types';

const getViewFromPath = (fallback: DesktopView): DesktopView => {
  if (typeof window === 'undefined') return fallback;
  const path = window.location.pathname;
  if (path.startsWith('/search')) return 'search';
  if (path.startsWith('/library/playlists')) return 'playlists';
  if (path.startsWith('/library/settings')) return 'settings';
  if (path.startsWith('/library/about')) return 'about';
  if (path.startsWith('/library')) return 'favorites';
  return fallback;
};

export default function DesktopApp({ initialView = 'home' }: { initialView?: DesktopView }) {
  const [view, setView] = useState<DesktopView>(() => getViewFromPath(initialView));

  useEffect(() => {
    const nextView = getViewFromPath(initialView);
    setView(nextView);
  }, [initialView]);

  const handleViewChange = (nextView: DesktopView) => {
    setView(nextView);
    const paths: Record<DesktopView, string> = {
      home: '/',
      search: '/search',
      favorites: '/library',
      playlists: '/library/playlists',
      settings: '/library/settings',
      about: '/library/about',
    };
    window.history.pushState({}, '', paths[nextView]);
  };

  return (
    <LibraryProvider>
      <PlayerProvider>
        <div className="desktop-app">
          <DesktopShell view={view} onViewChange={handleViewChange} />
        </div>
      </PlayerProvider>
    </LibraryProvider>
  );
}
