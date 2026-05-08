import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Song, Playlist, getSongKey } from "../types";

interface LibraryContextType {
  favorites: Song[];
  playlists: Playlist[];
  corsProxy: string;
  setCorsProxy: (url: string) => void;
  toggleFavorite: (song: Song) => void;
  isFavorite: (songId: number | string, source?: string) => boolean;
  createPlaylist: (name: string, initialSongs?: Song[]) => void;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (playlistId: string, song: Song) => void;
  removeFromPlaylist: (
    playlistId: string,
    songId: number | string,
    source?: string,
  ) => void;
  exportData: () => void;
  importData: (jsonData: string) => boolean;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

const DEFAULT_PROXY = "";
const getStoredValue = (key: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(key) || fallback;
};
const setStoredValue = (key: string, value: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, value);
};

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [favorites, setFavorites] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [corsProxy, setCorsProxyInternal] = useState<string>(
    () => getStoredValue("tunefree_cors_proxy", DEFAULT_PROXY),
  );

  const favoritesRef = useRef(favorites);
  const playlistsRef = useRef(playlists);
  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);
  useEffect(() => {
    playlistsRef.current = playlists;
  }, [playlists]);

  useEffect(() => {
    try {
      const storedFavs = localStorage.getItem("tunefree_favorites");
      const storedPlaylists = localStorage.getItem("tunefree_playlists");
      if (storedFavs) setFavorites(JSON.parse(storedFavs));
      if (storedPlaylists) setPlaylists(JSON.parse(storedPlaylists));
    } catch {
      // use empty defaults
    }
  }, []);

  useEffect(() => {
    setStoredValue("tunefree_favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    setStoredValue("tunefree_playlists", JSON.stringify(playlists));
  }, [playlists]);

  const setCorsProxy = useCallback((url: string) => {
    setCorsProxyInternal(url);
    setStoredValue("tunefree_cors_proxy", url);
  }, []);

  const toggleFavorite = useCallback((song: Song) => {
    setFavorites((prev) => {
      const songKey = getSongKey(song);
      if (prev.find((s) => getSongKey(s) === songKey)) {
        return prev.filter((s) => getSongKey(s) !== songKey);
      }
      return [song, ...prev];
    });
  }, []);

  const isFavorite = useCallback(
    (songId: number | string, source?: string) =>
      favorites.some(
        (s) =>
          String(s.id) === String(songId) && (!source || s.source === source),
      ),
    [favorites],
  );

  const createPlaylist = useCallback(
    (name: string, initialSongs: Song[] = []) => {
      const newPlaylist: Playlist = {
        id: Date.now().toString(),
        name: String(name),
        createTime: Date.now(),
        songs: initialSongs,
      };
      setPlaylists((prev) => [newPlaylist, ...prev]);
    },
    [],
  );

  const renamePlaylist = useCallback((id: string, name: string) => {
    setPlaylists((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: String(name) } : p)),
    );
  }, []);

  const deletePlaylist = useCallback((id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addToPlaylist = useCallback((playlistId: string, song: Song) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id !== playlistId) return p;
        const songKey = getSongKey(song);
        if (p.songs.find((s) => getSongKey(s) === songKey)) return p;
        return { ...p, songs: [...p.songs, song] };
      }),
    );
  }, []);

  const removeFromPlaylist = useCallback(
    (playlistId: string, songId: number | string, source?: string) => {
      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id !== playlistId) return p;
          return {
            ...p,
            songs: p.songs.filter(
              (s) => !(String(s.id) === String(songId) && (!source || s.source === source)),
            ),
          };
        }),
      );
    },
    [],
  );

  const exportData = useCallback(() => {
    const data = {
      version: 4,
      favorites: favoritesRef.current,
      playlists: playlistsRef.current,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tunefree_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const importData = useCallback((jsonData: string): boolean => {
    try {
      const data = JSON.parse(jsonData);
      if (data.favorites) setFavorites(data.favorites);
      if (data.playlists) setPlaylists(data.playlists);
      return true;
    } catch {
      return false;
    }
  }, []);

  return (
    <LibraryContext.Provider
      value={{
        favorites,
        playlists,
        corsProxy,
        setCorsProxy,
        toggleFavorite,
        isFavorite,
        createPlaylist,
        renamePlaylist,
        deletePlaylist,
        addToPlaylist,
        removeFromPlaylist,
        exportData,
        importData,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

const LIBRARY_DEFAULTS: LibraryContextType = {
  favorites: [],
  playlists: [],
  corsProxy: "",
  setCorsProxy: () => {},
  toggleFavorite: () => {},
  isFavorite: () => false,
  createPlaylist: () => {},
  renamePlaylist: () => {},
  deletePlaylist: () => {},
  addToPlaylist: () => {},
  removeFromPlaylist: () => {},
  exportData: () => {},
  importData: () => false,
};

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (!context) {
    console.warn("[useLibrary] Provider 未就绪，返回默认值（HMR 热更新中）");
    return LIBRARY_DEFAULTS;
  }
  return context;
};
