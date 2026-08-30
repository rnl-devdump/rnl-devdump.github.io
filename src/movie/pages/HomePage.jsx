import { useState, useEffect } from 'react';
import { getTrending, getPopular, getTopRated, getNowPlaying, getOnTheAir } from '../api/tmdb.js';
import HeroBanner from '../components/HeroBanner.jsx';
import TopTenRow from '../components/TopTenRow.jsx';
import ContentRow from '../components/ContentRow.jsx';

export default function HomePage({ navigate }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getTrending('movie', 'week'),
      getTrending('tv', 'week'),
      getPopular('movie'),
      getTopRated('movie'),
      getPopular('tv'),
      getNowPlaying(),
      getOnTheAir(),
      getTopRated('tv'),
    ]).then(([trendingMovies, trendingTv, popular, topRated, popularTv, nowPlaying, onAir, topRatedTv]) => {
      setData({
        trendingMovies: trendingMovies.results,
        trendingTv: trendingTv.results,
        popular: popular.results,
        topRated: topRated.results,
        popularTv: popularTv.results,
        nowPlaying: nowPlaying.results,
        onAir: onAir.results,
        topRatedTv: topRatedTv.results,
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <HeroBanner navigate={navigate} />

      <div style={{ marginTop: -40, position: 'relative', zIndex: 10 }}>
        <TopTenRow
          title="🔥 Top 10 Movies This Week"
          items={data.trendingMovies}
          navigate={navigate}
        />

        <TopTenRow
          title="📺 Top 10 TV Shows This Week"
          items={data.trendingTv}
          navigate={navigate}
        />

        <ContentRow
          title="Popular Movies"
          items={data.popular}
          navigate={navigate}
          seeAllPath="/browse/movie"
        />

        <ContentRow
          title="Top Rated Movies"
          items={data.topRated}
          navigate={navigate}
          seeAllPath="/genre/movie/top_rated"
        />

        <ContentRow
          title="Now Playing"
          items={data.nowPlaying}
          navigate={navigate}
          seeAllPath="/genre/movie/now_playing"
        />

        <ContentRow
          title="Popular TV Shows"
          items={data.popularTv}
          navigate={navigate}
          seeAllPath="/browse/tv"
        />

        <ContentRow
          title="On The Air"
          items={data.onAir}
          navigate={navigate}
        />

        <ContentRow
          title="Top Rated TV Shows"
          items={data.topRatedTv}
          navigate={navigate}
          seeAllPath="/genre/tv/top_rated"
        />
      </div>
    </div>
  );
}
