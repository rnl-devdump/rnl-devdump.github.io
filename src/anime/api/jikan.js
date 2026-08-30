const BASE_URL = 'https://api.jikan.moe/v4';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let queue = Promise.resolve();

async function jikanFetch(endpoint, params = {}) {
  // Chain each request onto the queue to ensure they run sequentially with a 350ms delay
  const requestPromise = queue.then(async () => {
    const url = new URL(`${BASE_URL}${endpoint}`);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, v);
      }
    });

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Jikan API error: ${res.status}`);
    const json = await res.json();
    return json.data;
  });

  // Advance the queue by adding a 350ms delay after this request starts
  queue = queue.then(() => delay(350)).catch(() => delay(350));

  return requestPromise;
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
