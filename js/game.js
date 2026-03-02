'use strict';
/* ── Single Player State ── */
const G = {
    diff: 'medium', name: 'Player', movie: null, det: null,
    pts: 0, total: 0, round: 0, att: 3, streak: 0,
    hints: new Set(), revealed: new Set(), recent: [], busy: false
};
const $ = id => document.getElementById(id);
const norm = s => s.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '').replace(/ +/g, ' ').trim();
const isMatch = (g, t) => { const a = norm(g), b = norm(t); return a === b || a === b.replace(/^the /, ''); };

/* ── Toast ── */
function toast(msg, type = 'info') {
    const c = $('toastBox'), d = document.createElement('div');
    d.className = `toast toast--${type}`; d.textContent = msg; c.appendChild(d);
    requestAnimationFrame(() => d.classList.add('toast--show'));
    setTimeout(() => { d.classList.remove('toast--show'); setTimeout(() => d.remove(), 300); }, 2700);
}

/* ── Tile Rendering ── */
function renderTiles(all = false) {
    const row = $('tilesRow'); row.innerHTML = '';
    if (!G.movie) return;
    console.log('Rendering tiles for:', G.movie.title);
    [...G.movie.title.toUpperCase()].forEach((ch, i) => {
        const d = document.createElement('div');
        if (ch === ' ') { d.className = 'tile tile--space'; }
        else {
            const rev = all || G.revealed.has(i) || !/[A-Z0-9]/.test(ch);
            d.className = `tile ${rev ? 'tile--revealed' : 'tile--hidden'}`;
            if (all && rev && /[A-Z0-9]/.test(ch)) d.classList.add('tile--answer');
            d.textContent = rev ? ch : '?';
        }
        row.appendChild(d);
    });
}

/* ── Hearts ── */
function renderHearts() {
    const c = $('heartsBox'); c.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'currentColor');
        s.classList.add('heart-icon'); if (i >= G.att) s.classList.add('heart-icon--empty');
        s.innerHTML = '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>';
        c.appendChild(s);
    }
}

/* ── UI Update ── */
function updateUI() {
    $('scoreVal').textContent = G.total.toLocaleString();
    $('roundVal').textContent = `Round ${G.round} / ${CONFIG.TOTAL_ROUNDS}`;
    $('mptVal').textContent = G.pts;
    $('streakVal').textContent = G.streak;
    renderHearts();
}

function updateSession() {
    const list = $('recentList'); list.innerHTML = '';
    [...G.recent].reverse().slice(0, 3).forEach(e => {
        const li = document.createElement('li');
        li.className = `recent-movie recent-movie--${e.w ? 'win' : 'fail'}`;
        li.innerHTML = `<div class="recent-movie__info">
      <span class="recent-movie__name">${e.t}</span>
      <span class="recent-movie__pts recent-movie__pts--${e.w ? 'win' : 'fail'}">${e.w ? '+' + e.p + ' pts' : 'Failed'}</span>
    </div>
    <span class="recent-movie__icon recent-movie__icon--${e.w ? 'win' : 'fail'}">
      <svg viewBox="0 0 24 24" fill="currentColor">${e.w
                ? '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>'
                : '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>'}
      </svg>
    </span>`;
        list.appendChild(li);
    });
}

/* ── Load Movie ── */
async function loadMovie() {
    if (G.round >= CONFIG.TOTAL_ROUNDS) { showGameOver(); return; }
    G.round++; G.busy = true;
    G.pts = CONFIG.DIFFICULTIES[G.diff].baseScore;
    G.att = 3; G.hints = new Set(); G.revealed = new Set();
    $('tilesRow').innerHTML = '<div class="tile-loading">Fetching movie…</div>';
    $('overviewPanel').classList.add('panel--hidden');
    $('guessInput').value = '';
    resetHintCards(); updateUI();
    try {
        if (CONFIG.API_KEY === 'YOUR_TMDB_API_KEY_HERE') throw new Error('nokey');
        G.movie = await API.fetchRandomMovie(G.diff);
        console.log('Fetched movie:', G.movie);
        G.det = await API.fetchMovieDetails(G.movie.id);
        console.log('Movie details:', G.det);
        
        // Reveal letters based on difficulty
        const letterIndices = [...G.movie.title].map((c, i) => [c, i])
            .filter(([c]) => /[A-Z0-9]/i.test(c))
            .map(([, i]) => i);
        
        let revealCount = 0;
        if (G.diff === 'easy') {
            revealCount = Math.ceil(letterIndices.length * 0.4); // 40% of letters
        } else if (G.diff === 'medium') {
            revealCount = Math.ceil(letterIndices.length * 0.2); // 20% of letters
        } else if (G.diff === 'hard') {
            revealCount = Math.ceil(letterIndices.length * 0.1); // 10% of letters
        }
        
        // Randomly reveal letters
        const shuffled = [...letterIndices].sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(revealCount, shuffled.length); i++) {
            G.revealed.add(shuffled[i]);
        }
        
        renderTiles(); updateUI(); populateHintCards(); G.busy = false; $('guessInput').focus();
    } catch (e) {
        console.error('Error loading movie:', e);
        if (e.message === 'nokey') { toast('⚠ Add your TMDB API key in js/config.js', 'warn'); loadDemo(); }
        else { toast('Error loading movie – retrying…', 'error'); G.busy = false; setTimeout(loadMovie, 2000); }
    }
}

const DEMOS = ['Inception', 'The Godfather', 'Pulp Fiction', 'Interstellar', 'The Matrix', 'Parasite', 'Titanic', 'Goodfellas', 'The Dark Knight', 'Forrest Gump'];
function loadDemo() {
    G.movie = { id: 0, title: DEMOS[Math.floor(Math.random() * DEMOS.length)] };
    G.det = { release_date: '2010-07-16', genres: [{ name: 'Sci-Fi' }, { name: 'Action' }], overview: 'A legendary cinematic masterpiece that changed the world.' };
    renderTiles(); updateUI(); populateHintCards(); G.busy = false; $('guessInput').focus();
    toast('Demo mode – replace API key in js/config.js for live movies', 'warn');
}

/* ── Hint Cards ── */
function populateHintCards() {
    const yr = G.det?.release_date?.split('-')[0] || '????';
    const gn = G.det?.genres?.[0]?.name || '????';
    $('hintYearEl').dataset.val = yr; $('hintYearVal').textContent = '????';
    $('hintGenreEl').dataset.val = gn; $('hintGenreVal').textContent = '????';
}
function resetHintCards() {
    ['hintYearEl', 'hintGenreEl', 'hintLetterEl', 'hintOverviewEl'].forEach(id => $(id)?.classList.remove('hint-card--disabled'));
}

/* ── Use Hint ── */
function useHint(type) {
    if (!G.movie || G.busy || G.hints.has(type)) return;
    G.hints.add(type);
    const cost = CONFIG.HINT_COSTS[type];
    G.pts = Math.max(50, G.pts - cost); updateUI();
    const el = $({ year: 'hintYearEl', genre: 'hintGenreEl', letter: 'hintLetterEl', overview: 'hintOverviewEl' }[type]);
    el?.classList.add('hint-card--disabled');
    if (type === 'year') { $('hintYearVal').textContent = $('hintYearEl').dataset.val; }
    else if (type === 'genre') { $('hintGenreVal').textContent = $('hintGenreEl').dataset.val; }
    else if (type === 'letter') {
        const pool = [...G.movie.title.toUpperCase()].map((c, i) => [c, i])
            .filter(([c, i]) => c !== ' ' && /[A-Z0-9]/.test(c) && !G.revealed.has(i)).map(([, i]) => i);
        if (!pool.length) { toast('All letters already revealed!', 'info'); return; }
        G.revealed.add(pool[Math.floor(Math.random() * pool.length)]); renderTiles();
    } else {
        $('overviewPanel').classList.remove('panel--hidden');
        $('overviewText').textContent = G.det?.overview || 'No overview available.';
    }
    toast(`Hint used: −${cost} pts`, 'warn');
}

/* ── Guess Handling ── */
function shake() { const i = $('guessInput'); i.classList.add('input--shake'); setTimeout(() => i.classList.remove('input--shake'), 400); }

function handleGuess() {
    if (!G.movie || G.busy) return;
    const val = $('guessInput').value.trim();
    if (!val) { shake(); return; }
    $('guessInput').value = '';
    if (isMatch(val, G.movie.title)) {
        G.total += G.pts; G.streak++;
        G.recent.push({ t: G.movie.title, p: G.pts, w: true });
        renderTiles(true); updateSession(); updateUI();
        toast(`✓ Correct! +${G.pts} pts`, 'success');
        setTimeout(loadMovie, 1800);
    } else {
        G.att--; G.pts = Math.max(0, G.pts - 50);
        shake(); updateUI();
        toast(G.att > 0 ? `✗ Wrong! −50 pts (${G.att} left)` : 'Out of attempts!', 'error');
        if (!G.att) {
            G.streak = 0; G.recent.push({ t: G.movie.title, p: 0, w: false });
            renderTiles(true); updateSession();
            setTimeout(loadMovie, 2100);
        }
    }
}

/* ── Game Over ── */
function showGameOver() {
    $('finalScore').textContent = G.total.toLocaleString();
    $('finalStreak').textContent = G.streak;
    $('saveNameInput').value = G.name;
    $('gameOverOverlay').classList.remove('overlay--hidden');
}

/* ── Start Game ── */
function startGame() {
    G.name = $('playerNameInput').value.trim() || 'Player';
    G.diff = document.querySelector('.diff-btn.diff-btn--active')?.dataset.diff || 'medium';
    $('diffBadgeText').textContent = CONFIG.DIFFICULTIES[G.diff].label;
    $('setupOverlay').classList.add('overlay--hidden');
    document.querySelectorAll('.sidebar__profile-name').forEach(el => el.textContent = G.name);
    G.total = 0; G.round = 0; G.streak = 0; G.recent = [];
    updateSession(); loadMovie();
}

/* ── Event Bindings ── */
document.querySelectorAll('.diff-btn').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(x => x.classList.remove('diff-btn--active'));
    b.classList.add('diff-btn--active');
}));
$('startGameBtn').addEventListener('click', startGame);
$('playerNameInput').addEventListener('keydown', e => { if (e.key === 'Enter') startGame(); });
$('guessBtn').addEventListener('click', handleGuess);
$('guessInput').addEventListener('keydown', e => { if (e.key === 'Enter') handleGuess(); });
$('skipBtn').addEventListener('click', () => {
    if (!G.movie || G.busy) return;
    G.streak = 0; G.recent.push({ t: G.movie.title, p: 0, w: false });
    renderTiles(true); updateSession();
    toast('Movie skipped', 'warn'); setTimeout(loadMovie, 1600);
});
$('hintYearEl').addEventListener('click', () => useHint('year'));
$('hintGenreEl').addEventListener('click', () => useHint('genre'));
$('hintLetterEl').addEventListener('click', () => useHint('letter'));
$('hintOverviewEl').addEventListener('click', () => useHint('overview'));
$('saveBtn').addEventListener('click', () => {
    const name = $('saveNameInput').value.trim() || G.name;
    GameStorage.addToLeaderboard({ name, score: G.total, difficulty: G.diff, streak: G.streak });
    toast('Score saved to leaderboard!', 'success');
    $('saveBtn').textContent = 'Saved ✓'; $('saveBtn').disabled = true;
});
$('playAgainBtn').addEventListener('click', () => {
    $('gameOverOverlay').classList.add('overlay--hidden');
    G.total = 0; G.round = 0; G.streak = 0; G.recent = [];
    updateSession(); loadMovie();
});
(() => {
    const t = $('sidebarToggle'), s = $('sidebar'), o = $('sidebarOverlay');
    t?.addEventListener('click', () => { s?.classList.toggle('sidebar--open'); o?.classList.toggle('sidebar-overlay--visible'); });
    o?.addEventListener('click', () => { s?.classList.remove('sidebar--open'); o?.classList.remove('sidebar-overlay--visible'); });
})();
