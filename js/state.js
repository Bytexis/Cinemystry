const GameStorage = (() => {
    const LB_KEY = 'cine_leaderboard';
    const PREFIX = 'cine_';

    const safeParse = (value, fallback = null) => {
        try { return JSON.parse(value); } catch { return fallback; }
    };

    const setCookie = (name, value, days = 365) => {
        const d = new Date();
        d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
    };

    const getCookie = name => {
        const key = `${name}=`;
        const parts = document.cookie.split(';');
        for (let i = 0; i < parts.length; i++) {
            const c = parts[i].trim();
            if (c.indexOf(key) === 0) return decodeURIComponent(c.substring(key.length));
        }
        return null;
    };

    const setItem = (key, value) => {
        const raw = typeof value === 'string' ? value : JSON.stringify(value);
        try { localStorage.setItem(key, raw); }
        catch { setCookie(key, raw); }
    };

    const getItem = (key, fallbackRaw = null) => {
        try {
            const v = localStorage.getItem(key);
            if (v !== null) return v;
        } catch { }
        const c = getCookie(key);
        return c !== null ? c : fallbackRaw;
    };

    const removeItem = key => {
        try { localStorage.removeItem(key); } catch { }
        setCookie(key, '', -1);
    };

    return {
        getLeaderboard: () => safeParse(getItem(LB_KEY, '[]'), []),
        addToLeaderboard(entry) {
            const board = safeParse(getItem(LB_KEY, '[]'), []);
            board.push({ ...entry, date: new Date().toLocaleDateString() });
            board.sort((a, b) => b.score - a.score);
            setItem(LB_KEY, board.slice(0, 100));
        },
        clearLeaderboard: () => removeItem(LB_KEY),

        getProgress(mode) {
            return safeParse(getItem(`${PREFIX}progress_${mode}`, 'null'), null);
        },
        setProgress(mode, payload) {
            setItem(`${PREFIX}progress_${mode}`, payload);
        },
        clearProgress: mode => removeItem(`${PREFIX}progress_${mode}`),

        getPlayerName: mode => getItem(`${PREFIX}player_${mode}`, ''),
        setPlayerName(mode, name) {
            if (!name) return;
            setItem(`${PREFIX}player_${mode}`, String(name));
        },

        hasSeenTutorial(mode) {
            return getItem(`${PREFIX}tour_${mode}`, '0') === '1';
        },
        markTutorialSeen(mode) {
            setItem(`${PREFIX}tour_${mode}`, '1');
        }
    };
})();
