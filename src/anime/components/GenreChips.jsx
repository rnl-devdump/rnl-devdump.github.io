export default function GenreChips({ genres, navigate, type = 'movie' }) {
  if (!genres?.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {genres.map((genre) => (
        <button
          key={genre.mal_id}
          className="genre-chip"
          onClick={() => navigate(`/genre/${type}/${genre.mal_id}`)}
        >
          {genre.name}
        </button>
      ))}
    </div>
  );
}
