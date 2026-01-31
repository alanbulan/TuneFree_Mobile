
import { Song, TopList, SystemHealth } from '../types';

const API_BASE = 'https://api.ygking.top';

// Helper to handle API response structure
const fetchApi = async (endpoint: string, params?: Record<string, string>) => {
  const searchParams = params ? new URLSearchParams(params) : null;
  const url = searchParams ? `${API_BASE}${endpoint}?${searchParams.toString()}` : `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      referrerPolicy: 'no-referrer',
      credentials: 'omit'
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (e) {
    console.error(`Fetch error for ${url}:`, e);
    throw e;
  }
};

// Build cover URL directly using QQ Music CDN pattern
const buildCoverUrl = (albumMid: string, size: number = 300): string => {
  if (!albumMid) return '';
  return `https://y.gtimg.cn/music/photo_new/T002R${size}x${size}M000${albumMid}.jpg`;
};

// Parse song from qq-music-api response format
const parseSong = (item: any): Song => {
  // Handle different response formats from search vs playlist
  const singers = item.singer || [];
  const artistName = singers.map((s: any) => s.name || s.title).join('/') || 'Unknown';

  const albumMid = item.album?.mid || item.album?.pmid || '';

  return {
    id: item.mid || item.songmid || item.id,
    name: item.name || item.title || item.songname || '',
    artist: artistName,
    album: item.album?.name || item.album?.title || item.albumname || '',
    source: 'qq',
    pic: albumMid ? buildCoverUrl(albumMid) : undefined,
    types: [] // Will be determined when fetching URL
  };
};

// 1. Get Song Detail
export const getSongInfo = async (mid: string | number): Promise<Partial<Song> | null> => {
  try {
    const data = await fetchApi('/api/song/detail', { mid: String(mid) });
    if (data.code === 0 && data.data) {
      const track = data.data.track_info || data.data;
      return {
        pic: track.album?.mid ? getCoverUrl(track.album.mid) : undefined,
        url: undefined, // Need separate call
        lrc: undefined  // Need separate call
      };
    }
    return null;
  } catch (e) {
    return null;
  }
};

// 2. Get Song URL
export const getSongUrl = async (mid: string | number, _source?: string, br: string = '320'): Promise<string | null> => {
  try {
    // Normalize quality format: 320k -> 320, flac -> flac
    const quality = br.replace('k', '');
    const data = await fetchApi('/api/song/url', { mid: String(mid), quality });

    if (data.code === 0 && data.data) {
      // Response format: { data: { [mid]: "url" }, quality: "320" }
      const url = data.data[String(mid)];
      if (url && url.length > 0) {
        return url;
      }
    }
    return null;
  } catch (e) {
    console.error('getSongUrl error:', e);
    return null;
  }
};

// 2b. Get Download URL with specific Quality
export const getDownloadUrl = async (mid: string | number, _source?: string, br: string = '320'): Promise<string> => {
  const url = await getSongUrl(mid, undefined, br);
  return url || '';
};

// 3. Get Cover URL by album_mid (direct CDN URL)
export const getCoverUrl = (albumMid: string, size: number = 300): string => {
  if (!albumMid) return '';
  return `https://y.gtimg.cn/music/photo_new/T002R${size}x${size}M000${albumMid}.jpg`;
};

// Get cover by song mid - fetches from API which resolves album_mid automatically
export const getPicUrl = (mid: string | number, _source?: string): string => {
  // For compatibility, return the API URL which will redirect/return the image
  return `${API_BASE}/api/song/cover?mid=${mid}&size=300&validate=false`;
};

// 4. Get Lyrics
export const getLyrics = async (mid: string | number, _source?: string): Promise<string> => {
  try {
    const data = await fetchApi('/api/lyric', { mid: String(mid) });
    if (data.code === 0 && data.data) {
      return data.data.lyric || '';
    }
    return '';
  } catch (e) {
    return '';
  }
};

// 5. Search Songs
export const searchSongs = async (keyword: string, _source?: string, page: number = 1): Promise<Song[]> => {
  try {
    const data = await fetchApi('/api/search', {
      keyword,
      type: 'song',
      num: '60',
      page: String(page)
    });

    if (data.code === 0 && data.data && data.data.list) {
      return data.data.list.map(parseSong);
    }
    return [];
  } catch (e) {
    console.error('searchSongs error:', e);
    return [];
  }
};

// 6. Aggregate Search - Now just calls searchSongs since we only support QQ Music
export const searchAggregate = async (keyword: string, page: number = 1): Promise<Song[]> => {
  return searchSongs(keyword, 'qq', page);
};

// 7. Get Playlist Detail (Import)
export const getOnlinePlaylist = async (id: string, _source?: string): Promise<{ name: string, songs: Song[] } | null> => {
  try {
    const data = await fetchApi('/api/playlist', { id });

    if (data.code === 0 && data.data) {
      const dirInfo = data.data.dirinfo || {};
      const songList = data.data.songlist || [];

      const songs: Song[] = songList.map((item: any) => {
        const singers = item.singer || [];
        const artistName = singers.map((s: any) => s.name).join('/') || 'Unknown';

        return {
          id: item.mid || item.songmid,
          name: item.name || item.songname,
          artist: artistName,
          album: item.album?.name || '',
          source: 'qq',
          pic: item.album?.mid ? getCoverUrl(item.album.mid) : undefined,
          types: []
        };
      });

      return {
        name: dirInfo.title || dirInfo.name || 'Imported Playlist',
        songs
      };
    }
    return null;
  } catch (e) {
    console.error('Playlist fetch failed', e);
    return null;
  }
};

// 8. Get Toplists
export const getTopLists = async (_source?: string): Promise<TopList[]> => {
  try {
    const data = await fetchApi('/api/top');

    if (data.code === 0 && data.data) {
      const groups = data.data.group || [];
      const topLists: TopList[] = [];

      // Flatten all groups into a single list
      for (const group of groups) {
        const lists = group.toplist || [];
        for (const item of lists) {
          topLists.push({
            id: item.topId || item.id,
            name: item.title || item.name,
            updateFrequency: item.updateTime || ''
          });
        }
      }

      return topLists;
    }
    return [];
  } catch (e) {
    console.warn('Toplist fetch failed', e);
    return [];
  }
};

// 9. Get Toplist Detail
export const getTopListDetail = async (id: string | number, _source?: string): Promise<Song[]> => {
  try {
    const data = await fetchApi('/api/top', { id: String(id), num: '100' });

    if (data.code === 0 && data.data) {
      const songList = data.data.songInfoList || data.data.songlist || [];
      return songList.map(parseSong);
    }
    return [];
  } catch (e) {
    console.error('Toplist detail fetch failed', e);
    return [];
  }
};

// 10. System Status (Not supported by qq-music-api)
export const getSystemStatus = async () => {
  return null;
};

// 11. System Health (Not supported by qq-music-api)
export const getSystemHealth = async (): Promise<SystemHealth | null> => {
  return null;
};

// Latency Checker
export const checkLatency = async (): Promise<number> => {
  const start = performance.now();
  try {
    await fetch(`${API_BASE}/api/top`, { method: 'HEAD', referrerPolicy: 'no-referrer' });
    const end = performance.now();
    return Math.round(end - start);
  } catch (e) {
    return -1;
  }
};

// --- Helpers ---
export const triggerDownload = (url: string, filename: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadMusic = async (song: Song) => {
  const url = await getSongUrl(song.id);
  if (!url) return;
  triggerDownload(url, `${song.artist} - ${song.name}.mp3`);
};
