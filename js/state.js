const GameStorage = (() => {
    const LB_KEY = 'cine_leaderboard';
    return {
        getLeaderboard: () => JSON.parse(localStorage.getItem(LB_KEY) || '[]'),
        addToLeaderboard(entry) {
            const board = JSON.parse(localStorage.getItem(LB_KEY) || '[]');
            board.push({ ...entry, date: new Date().toLocaleDateString() });
            board.sort((a, b) => b.score - a.score);
            localStorage.setItem(LB_KEY, JSON.stringify(board.slice(0, 100)));
        },
        clearLeaderboard: () => localStorage.removeItem(LB_KEY)
    };
})();
