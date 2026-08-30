const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

export function posterUrl(path, size = 'w500') {
  if (!path) return null;
  return `${IMG_BASE}/${size}${path}`;
}

export function backdropUrl(path, size = 'original') {
  if (!path) return null;
  return `${IMG_BASE}/${size}${path}`;
}

export function profileUrl(path, size = 'w185') {
  if (!path) return null;
  return `${IMG_BASE}/${size}${path}`;
}

export function logoUrl(path, size = 'w500') {
  if (!path) return null;
  return `${IMG_BASE}/${size}${path}`;
}

async function tmdbFetch(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', API_KEY);
  url.searchParams.set('language', 'en-US');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB API error: ${res.status}`);
  return res.json();
}

/* ─── Trending ─── */
export function getTrending(type = 'movie', timeWindow = 'week') {
  return tmdbFetch(`/trending/${type}/${timeWindow}`);
}

/* ─── Popular ─── */
export function getPopular(type = 'movie', page = 1) {
  return tmdbFetch(`/${type}/popular`, { page });
}

/* ─── Top Rated ─── */
export function getTopRated(type = 'movie', page = 1) {
  return tmdbFetch(`/${type}/top_rated`, { page });
}

/* ─── Now Playing / On Air ─── */
export function getNowPlaying(page = 1) {
  return tmdbFetch('/movie/now_playing', { page });
}

export function getOnTheAir(page = 1) {
  return tmdbFetch('/tv/on_the_air', { page });
}

/* ─── Details ─── */
export function getDetails(type, id) {
  return tmdbFetch(`/${type}/${id}`, {
    append_to_response: 'credits,similar,videos,external_ids,images',
    include_image_language: 'en,null',
  });
}

/* ─── Season Details ─── */
export function getSeasonDetails(tvId, seasonNumber) {
  return tmdbFetch(`/tv/${tvId}/season/${seasonNumber}`);
}

/* ─── Search ─── */
export function searchMulti(query, page = 1) {
  return tmdbFetch('/search/multi', { query, page });
}

/* ─── Genres ─── */
export function getGenres(type = 'movie') {
  return tmdbFetch(`/genre/${type}/list`);
}

/* ─── Discover ─── */
export function discoverByGenre(type = 'movie', genreId, page = 1, sortBy = 'popularity.desc') {
  return tmdbFetch(`/discover/${type}`, {
    with_genres: genreId,
    sort_by: sortBy,
    page,
  });
}

/* ─── Vidking embed URLs ─── */
export function getMovieEmbedUrl(tmdbId) {
  return `https://www.vidking.net/embed/movie/${tmdbId}?color=6366f1&autoPlay=true`;
}

export function getTvEmbedUrl(tmdbId, season = 1, episode = 1) {
  return `https://www.vidking.net/embed/tv/${tmdbId}/${season}/${episode}?color=6366f1&autoPlay=true&nextEpisode=true&episodeSelector=true`;
}
