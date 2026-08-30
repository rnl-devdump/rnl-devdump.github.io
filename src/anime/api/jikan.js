const BASE_URL = 'https://api.jikan.moe/v4';

// Jikan API has rate limiting: 3 requests/second and 60 requests/minute.
// We'll add a simple delay helper to avoid hitting limits too easily on rapid clicks.
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
let lastRequestTime = 0;

async function jikanFetch(endpoint, params = {}) {
  const now = Date.now();
  if (now - lastRequestTime < 340) {
    await delay(340 - (now - lastRequestTime));
  }
  
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      url.searchParams.set(k, v);
    }
  });

  lastRequestTime = Date.now();
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Jikan API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

/* ─── Top Anime (Replaces Trending/Popular) ─── */
export function getTrending(page = 1) {
  // We'll use top anime with 'bypopularity' filter to act as "trending"
  return jikanFetch(`/top/anime`, { page, filter: 'bypopularity' });
}

export function getPopular(page = 1) {
  return jikanFetch(`/top/anime`, { page, filter: 'favorite' });
}

export function getTopRated(page = 1) {
  return jikanFetch(`/top/anime`, { page });
}

/* ─── Now Playing / Airing ─── */
export function getNowPlaying(page = 1) {
  return jikanFetch('/seasons/now', { page });
}

/* ─── Details ─── */
export function getDetails(id) {
  return jikanFetch(`/anime/${id}/full`);
}

/* ─── Search ─── */
export function searchMulti(query, page = 1) {
  return jikanFetch('/anime', { q: query, page, sfw: true });
}

/* ─── Images / URLs helper ─── */
// Jikan returns image URLs directly, so we just extract them safely.
export function posterUrl(images) {
  if (!images) return null;
  return images.webp?.large_image_url || images.jpg?.large_image_url || images.webp?.image_url;
}

export function backdropUrl(images) {
// Jikan doesn't provide backdrops the same way TMDB does. We'll use the large poster or a trailer image.
  return images?.webp?.large_image_url || images?.jpg?.large_image_url;
}

export function profileUrl(images) {
  return images?.jpg?.image_url || posterUrl(images);
}

export function logoUrl(images) {
  return posterUrl(images);
}
