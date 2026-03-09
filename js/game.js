'use strict';
/* ── Single Player State ── */
const G = {
    diff: 'medium', lang: 'all', name: 'Player', movie: null, det: null,
    pts: 0, total: 0, round: 0, lives: 3, streak: 0,
    hints: new Set(), revealed: new Set(), guessedLetters: new Set(),
    recent: [], busy: false
};
const $ = id => document.getElementById(id);

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
    const title = G.movie.title.toUpperCase();
    [...title].forEach((ch, i) => {
        const d = document.createElement('div');
        if (ch === ' ') {
            d.className = 'tile tile--space';
        } else {
            const isAlphaNum = /[A-Z0-9]/.test(ch);
            // Revealed if: showing all (round end), OR pre-revealed by difficulty, OR player guessed this letter, OR not alpha (punctuation etc.)
            const rev = all || G.revealed.has(i) || (!isAlphaNum) || (isAlphaNum && G.guessedLetters.has(ch));
            d.className = `tile ${rev ? 'tile--revealed' : 'tile--hidden'}`;
            if (all && /[A-Z0-9]/.test(ch)) d.classList.add('tile--answer');
            d.textContent = rev ? ch : '_';
        }
        row.appendChild(d);
    });
}

/* ── Hearts / lives ── */
function renderHearts() {
    const c = $('heartsBox'); c.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'currentColor');
        svg.classList.add('heart');
        if (i >= G.lives) svg.classList.add('heart--lost');
        svg.innerHTML = '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>';
        c.appendChild(svg);
    }
}

/* ── UI Update ── */
function updateUI() {
    const pts = G.total.toLocaleString();
    const rd = `Round ${G.round} / ${CONFIG.TOTAL_ROUNDS}`;
    $('scoreVal').textContent = pts + ' PTS';
    const sr = $('scoreValRight'); if (sr) sr.textContent = pts + ' PTS';
    $('roundVal').textContent = rd;
    const r2 = $('roundVal2'); if (r2) r2.textContent = rd;
    const rm = $('roundValMob'); if (rm) rm.textContent = rd;
    $('mptVal').textContent = G.pts;
    const mr = $('mptValRight'); if (mr) mr.textContent = G.pts;
    $('streakVal').textContent = G.streak;
    renderHearts();
}

function updateSession() {
    const list = $('recentList'); list.innerHTML = '';
    [...G.recent].reverse().slice(0, 5).forEach(e => {
        const li = document.createElement('li');
        li.className = `recent-movies__item recent-movies__item--${e.w ? 'win' : 'skip'}`;
        const title = document.createElement('span');
        title.textContent = e.t.length > 18 ? e.t.slice(0, 18) + '…' : e.t;
        const pts = document.createElement('span');
        pts.className = 'recent-movies__pts';
        pts.textContent = e.w ? `+${e.p}` : 'Skip';
        li.appendChild(title); li.appendChild(pts);
        list.appendChild(li);
    });
}

/* ── Keyboard ── */
function resetKeyboard() {
    document.querySelectorAll('.key-btn').forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('key-btn--correct', 'key-btn--wrong');
    });
}

/* A smarter win check – verifies every alpha tile is revealed */
function isAllRevealed() {
    if (!G.movie) return false;
    const title = G.movie.title.toUpperCase();
    return [...title].every((ch, i) => {
        if (ch === ' ') return true;
        if (!/[A-Z0-9]/.test(ch)) return true;   // punctuation auto-passes
        return G.guessedLetters.has(ch) || G.revealed.has(i);
    });
}

/* ── Handle Key Press ── */
function handleKey(letter) {
    if (!G.movie || G.busy) return;
    letter = letter.toUpperCase();
    if (!/^[A-Z]$/.test(letter)) return;
    if (G.guessedLetters.has(letter)) return;

    G.guessedLetters.add(letter);

    const keyBtn = document.querySelector(`.key-btn[data-key="${letter}"]`);
    const titleUpper = G.movie.title.toUpperCase();
    const found = titleUpper.includes(letter);

    if (keyBtn) {
        keyBtn.disabled = true;
        keyBtn.classList.add(found ? 'key-btn--correct' : 'key-btn--wrong');
    }

    if (found) {
        renderTiles();
        if (isAllRevealed()) {
            // Win!
            G.total += G.pts; G.streak++;
            G.recent.push({ t: G.movie.title, p: G.pts, w: true });
            renderTiles(true); updateSession(); updateUI();
            toast(`✓ You got it! +${G.pts} pts`, 'success');
            G.busy = true;
            setTimeout(loadMovie, 1800);
        } else {
            toast(`✓ "${letter}" is in the title!`, 'success');
        }
    } else {
        G.lives--; G.pts = Math.max(0, G.pts - 50);
        updateUI();
        if (G.lives <= 0) {
            G.streak = 0;
            G.recent.push({ t: G.movie.title, p: 0, w: false });
            renderTiles(true); updateSession();
            toast(`✗ No "${letter}" — Out of lives! The answer was: ${G.movie.title}`, 'error');
            G.busy = true;
            setTimeout(loadMovie, 2500);
        } else {
            toast(`✗ No "${letter}" — ${G.lives} ${G.lives === 1 ? 'life' : 'lives'} left`, 'error');
        }
    }
}

/* ── Load Movie ── */
async function loadMovie() {
    if (G.round >= CONFIG.TOTAL_ROUNDS) { showGameOver(); return; }
    G.round++; G.busy = true;
    G.pts = CONFIG.DIFFICULTIES[G.diff].baseScore;
    G.lives = 3; G.hints = new Set(); G.revealed = new Set(); G.guessedLetters = new Set();
    $('tilesRow').innerHTML = '<div class="tile-loading">Fetching movie…</div>';
    $('overviewPanel').classList.add('panel--hidden');
    resetKeyboard(); resetHintCards(); updateUI();
    try {
        if (CONFIG.API_KEY === 'YOUR_TMDB_API_KEY_HERE') throw new Error('nokey');
        G.movie = await API.fetchRandomMovie(G.diff, G.lang);
        G.det = await API.fetchMovieDetails(G.movie.id);

        // Pre-reveal letters based on difficulty
        const letterIndices = [...G.movie.title].map((c, i) => [c, i])
            .filter(([c]) => /[A-Z0-9]/i.test(c))
            .map(([, i]) => i);

        let revealCount = 0;
        if (G.diff === 'easy') revealCount = Math.ceil(letterIndices.length * 0.4);
        else if (G.diff === 'medium') revealCount = Math.ceil(letterIndices.length * 0.2);
        else if (G.diff === 'hard') revealCount = Math.ceil(letterIndices.length * 0.1);

        const shuffled = [...letterIndices].sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(revealCount, shuffled.length); i++) {
            G.revealed.add(shuffled[i]);
        }

        renderTiles(); updateUI(); populateHintCards(); G.busy = false;
    } catch (e) {
        if (e.message === 'nokey') { toast('⚠ Add your TMDB API key in js/config.js', 'warn'); loadDemo(); }
        else { toast('Error loading movie – retrying…', 'error'); G.busy = false; setTimeout(loadMovie, 2000); }
    }
}

const DEMOS = ['Inception', 'The Godfather', 'Pulp Fiction', 'Interstellar', 'The Matrix', 'Parasite', 'Titanic', 'Goodfellas', 'The Dark Knight', 'Forrest Gump'];
function loadDemo() {
    G.movie = { id: 0, title: DEMOS[Math.floor(Math.random() * DEMOS.length)] };
    G.det = { release_date: '2010-07-16', genres: [{ name: 'Sci-Fi' }, { name: 'Action' }], overview: 'A legendary cinematic masterpiece that changed the world.' };
    renderTiles(); updateUI(); populateHintCards(); G.busy = false;
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
    ['hintYearEl', 'hintGenreEl', 'hintLetterEl', 'hintOverviewEl'].forEach(id => $(id)?.classList.remove('sp-hint--used'));
}

/* ── Use Hint ── */
function useHint(type) {
    if (!G.movie || G.busy || G.hints.has(type)) return;
    G.hints.add(type);
    const cost = CONFIG.HINT_COSTS[type];
    G.pts = Math.max(50, G.pts - cost); updateUI();
    const el = $({ year: 'hintYearEl', genre: 'hintGenreEl', letter: 'hintLetterEl', overview: 'hintOverviewEl' }[type]);
    el?.classList.add('sp-hint--used');
    if (type === 'year') { $('hintYearVal').textContent = $('hintYearEl').dataset.val; }
    else if (type === 'genre') { $('hintGenreVal').textContent = $('hintGenreEl').dataset.val; }
    else if (type === 'letter') {
        const title = G.movie.title.toUpperCase();
        // Find letters that are in the title but not yet guessed or pre-revealed
        const unguessedInTitle = [...new Set([...title].filter(c => /[A-Z0-9]/.test(c)))]
            .filter(c => !G.guessedLetters.has(c));
        // Also exclude letters fully pre-revealed
        const pool = unguessedInTitle.filter(c => {
            return [...title].some((ch, i) => ch === c && !G.revealed.has(i));
        });
        if (!pool.length) { toast('All letters already revealed!', 'info'); return; }
        const letter = pool[Math.floor(Math.random() * pool.length)];
        handleKey(letter);
        // Override toast since handleKey already showed one
    } else {
        $('overviewPanel').classList.remove('panel--hidden');
        $('overviewText').textContent = G.det?.overview || 'No overview available.';
    }
    if (type !== 'letter') toast(`Hint used: −${cost} pts`, 'warn');
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
    G.diff = document.querySelector('#setupOverlay .diff-btn[data-diff].diff-btn--active')?.dataset.diff || 'medium';
    G.lang = document.querySelector('#setupOverlay .diff-btn[data-lang].diff-btn--active')?.dataset.lang || 'all';
    // Update difficulty badge text
    const diffLabel = CONFIG.DIFFICULTIES[G.diff].label;
    $('diffBadgeText').textContent = diffLabel;
    const spd = $('spDiffBadge'); if (spd) spd.textContent = diffLabel;
    $('setupOverlay').classList.add('overlay--hidden');
    // Update player name + avatar
    document.querySelectorAll('.player-card__name').forEach(el => el.textContent = G.name);
    const av = $('spAvatar'); if (av) av.textContent = G.name.charAt(0).toUpperCase();
    G.total = 0; G.round = 0; G.streak = 0; G.recent = [];
    updateSession(); loadMovie();
}

/* ── Event Bindings ── */
document.querySelectorAll('#setupOverlay .diff-btn[data-diff]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('#setupOverlay .diff-btn[data-diff]').forEach(x => x.classList.remove('diff-btn--active'));
    b.classList.add('diff-btn--active');
}));
document.querySelectorAll('#setupOverlay .diff-btn[data-lang]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('#setupOverlay .diff-btn[data-lang]').forEach(x => x.classList.remove('diff-btn--active'));
    b.classList.add('diff-btn--active');
}));
$('startGameBtn').addEventListener('click', startGame);
$('playerNameInput').addEventListener('keydown', e => { if (e.key === 'Enter') startGame(); });

// On-screen keyboard buttons
document.querySelectorAll('.key-btn').forEach(btn => {
    btn.addEventListener('click', () => handleKey(btn.dataset.key));
});

// Physical keyboard support
document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return; // don't intercept text inputs
    if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toUpperCase());
});

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
