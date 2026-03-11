const API = (() => {
    const get = async (path, params = {}) => {
        const url = new URL(CONFIG.BASE_URL + path);
        url.searchParams.set('include_adult', 'false');
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        const r = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${CONFIG.API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        if (!r.ok) throw new Error(`TMDB_${r.status}`);
        return r.json();
    };

    // Cache discovered total_pages per (lang+diff) key to avoid repeat probing
    const pageCache = {};

    const fetchRandomMovie = async (diff = 'medium', lang = 'all', seenIds = new Set(), attempt = 0) => {
        if (attempt > 8) return null; // hard circuit-breaker to prevent infinite loops

        const { voteMin, pageMax } = CONFIG.DIFFICULTIES[diff];
        const langCode = CONFIG.LANGUAGES[lang]?.code;

        // Language-specific pageMax cap (Hindi has far fewer pages)
        const langPageMax = CONFIG.LANGUAGES[lang]?.pageMax || pageMax;
        const cacheKey = `${lang}_${diff}`;

        // Probe real total_pages once per session if not cached
        if (!pageCache[cacheKey]) {
            const probe = await get('/discover/movie', {
                sort_by: 'popularity.desc',
                'vote_count.gte': voteMin,
                page: 1,
                ...(langCode ? { with_original_language: langCode } : {})
            });
            // Cap at langPageMax and TMDB's hard limit of 500
            pageCache[cacheKey] = Math.min(probe.total_pages || 1, langPageMax, 500);
        }

        const totalPages = pageCache[cacheKey];
        const page = Math.floor(Math.random() * totalPages) + 1;

        const params = {
            sort_by: 'popularity.desc',
            'vote_count.gte': voteMin,
            page
        };
        if (langCode) params['with_original_language'] = langCode;

        const data = await get('/discover/movie', params);

        // Filter by title length AND exclude already-seen movies this session
        const valid = (data.results || []).filter(
            m => m.title &&
                m.title.length >= 2 &&
                m.title.length <= 45 &&
                !seenIds.has(m.id)
        );

        if (!valid.length) {
            // All on this page seen or invalid — try another page
            return fetchRandomMovie(diff, lang, seenIds, attempt + 1);
        }

        return valid[Math.floor(Math.random() * valid.length)];
    };

    return {
        fetchRandomMovie,
        fetchMovieDetails: id => get(`/movie/${id}`),
        fetchMovieCredits: id => get(`/movie/${id}/credits`)
    };
})();
