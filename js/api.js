const API = (() => {
    const normalizeMovie = movie => ({
        ...movie,
        release_date: String(movie.year || ''),
        genres: [{ name: (movie.genre || '').split('/')[0] || 'Unknown' }],
        overview: movie.description || 'No description available.'
    });

    const getPool = (diff, lang = 'all') => {
        const byLanguage = lang === 'all'
            ? MOVIE_DB
            : MOVIE_DB.filter(movie => movie.language === lang);
        const exact = byLanguage.filter(movie => movie.difficulty === diff);
        if (exact.length) return exact;
        return [...byLanguage];
    };

    const fetchRandomMovie = async (diff = 'medium', lang = 'all', seenIds = new Set()) => {
        const pool = getPool(diff, lang).filter(movie => !seenIds.has(movie.id));
        const fallbackPool = pool.length ? pool : getPool(diff, lang);
        if (!fallbackPool.length) return null;
        const pick = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
        return normalizeMovie(pick);
    };

    const fetchMovieDetails = async id => {
        const movie = MOVIE_DB.find(entry => entry.id === id);
        return movie ? normalizeMovie(movie) : null;
    };

    return {
        fetchRandomMovie,
        fetchMovieDetails,
        fetchMovieCredits: async () => ({ cast: [], crew: [] })
    };
})();
