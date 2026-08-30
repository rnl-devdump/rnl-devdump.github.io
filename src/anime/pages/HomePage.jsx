import { useState, useEffect } from 'react';
import { getTrending, getPopular, getTopRated, getNowPlaying } from '../api/jikan.js';
import HeroBanner from '../components/HeroBanner.jsx';
import TopTenRow from '../components/TopTenRow.jsx';
import ContentRow from '../components/ContentRow.jsx';
import ActiveRoomsRow from '../components/ActiveRoomsRow.jsx';

export default function HomePage({ navigate }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getTrending(1).catch(() => []),
      getPopular(1).catch(() => []),
      getTopRated(1).catch(() => []),
      getNowPlaying(1).catch(() => []),
    ]).then(([trending, popular, topRated, nowPlaying]) => {
      setData({
        trending: trending || [],
        popular: popular || [],
        topRated: topRated || [],
        nowPlaying: nowPlaying || [],
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <HeroBanner navigate={navigate} />

      <div style={{ marginTop: -40, position: 'relative', zIndex: 10 }}>
        <ActiveRoomsRow />

        <TopTenRow
          title="🔥 Trending Anime"
          items={data.trending}
          navigate={navigate}
        />

        <ContentRow
          title="Now Airing"
          items={data.nowPlaying}
          navigate={navigate}
          seeAllPath="/genre/anime/now_playing"
        />

        <ContentRow
          title="Most Popular"
          items={data.popular}
          navigate={navigate}
          seeAllPath="/browse/anime"
        />

        <ContentRow
          title="Top Rated"
          items={data.topRated}
          navigate={navigate}
          seeAllPath="/genre/anime/top_rated"
        />
      </div>
    </div>
  );
}
