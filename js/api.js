const API = (() => {
    const get = async (path, params = {}) => {
        const url = new URL(CONFIG.BASE_URL + path);
        url.searchParams.set('api_key', CONFIG.API_KEY);
        url.searchParams.set('include_adult', 'false');
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        const r = await fetch(url.toString());
        if (!r.ok) throw new Error(`TMDB_${r.status}`);
        return r.json();
    };

    const fetchRandomMovie = async (diff = 'medium') => {
        const { voteMin, pageMax } = CONFIG.DIFFICULTIES[diff];
        const page = Math.floor(Math.random() * pageMax) + 1;
        const data = await get('/discover/movie', {
            sort_by: 'popularity.desc',
            'vote_count.gte': voteMin,
            page
        });
        const valid = (data.results || []).filter(
            m => m.title && m.title.length >= 2 && m.title.length <= 45
        );
        if (!valid.length) return fetchRandomMovie(diff);
        return valid[Math.floor(Math.random() * valid.length)];
    };

    return {
        fetchRandomMovie,
        fetchMovieDetails: id => get(`/movie/${id}`),
        fetchMovieCredits: id => get(`/movie/${id}/credits`)
    };
})();
