export default function GenreChips({ genres, navigate, type = 'movie' }) {
  if (!genres?.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {genres.map((genre) => (
        <button
          key={genre.id}
          className="genre-chip"
          onClick={() => navigate(`/genre/${type}/${genre.id}`)}
        >
          {genre.name}
        </button>
      ))}
    </div>
  );
}
