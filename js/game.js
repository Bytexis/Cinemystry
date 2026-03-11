'use strict';
/* ── Single Player State ── */
const G = {
    diff: 'medium', lang: 'all', name: 'Player', movie: null, det: null,
    pts: 0, total: 0, round: 0, lives: 3, streak: 0,
    hints: new Set(), revealed: new Set(), guessedLetters: new Set(),
    recent: [], busy: false,
    timer: null, startTime: 0, roundScore: 100, hasUsedHint: false,
    timerEnabled: true
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
    // Helper to fill a hearts container
    function fillHearts(c) {
        if (!c) return;
        c.innerHTML = '';
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
    fillHearts($('heartsBox'));
    fillHearts($('heartsBoxMob'));
}

/* ── UI Update ── */
function updateUI() {
    const pts = G.total.toLocaleString();
    const rd = `Round ${G.round} / ${CONFIG.TOTAL_ROUNDS}`;
    const sv = $('scoreVal'); if (sv) sv.textContent = pts + ' PTS';
    const sr = $('scoreValRight'); if (sr) sr.textContent = pts + ' PTS';
    const sm = $('scoreValMob'); if (sm) sm.textContent = pts + ' PTS';
    const rv = $('roundVal'); if (rv) rv.textContent = rd;
    const r2 = $('roundVal2'); if (r2) r2.textContent = rd;
    const rr = $('roundValRight'); if (rr) rr.textContent = rd;
    const rm = $('roundValMob'); if (rm) rm.textContent = rd;
    const rs = $('roundValSide'); if (rs) rs.textContent = rd.toUpperCase();
    const rm2 = $('roundValMob2'); if (rm2) rm2.textContent = `${G.round} / ${CONFIG.TOTAL_ROUNDS}`;
    const hnt = $('spHintsVal'); if (hnt) hnt.textContent = `${G.hints.size}/3`;
    const hntm = $('spHintsValMob'); if (hntm) hntm.textContent = `${G.hints.size}/3`;
    const stv = $('streakVal'); if (stv) stv.textContent = G.streak;
    const stm = $('streakValMob'); if (stm) stm.textContent = G.streak;
    const ppts = $('potentialPts'); if (ppts) ppts.textContent = Math.round(G.roundScore);
    renderHearts();
}

function updateSession() {
    const recent5 = [...G.recent].reverse().slice(0, 5);

    // Desktop list
    const list = $('recentList');
    if (list) {
        list.innerHTML = '';
        recent5.forEach(e => {
            const li = document.createElement('li');
            li.className = `recent-movies__item recent-movies__item--${e.w ? 'win' : 'skip'}`;
            li.title = e.t;
            const title = document.createElement('span');
            title.textContent = e.t.length > 18 ? e.t.slice(0, 18) + '…' : e.t;
            const pts = document.createElement('span');
            pts.className = 'recent-movies__pts';
            pts.textContent = e.w ? `+${e.p}` : 'Skip';
            li.appendChild(title); li.appendChild(pts);
            list.appendChild(li);
        });
    }

    // Mobile recent drawer list
    const mobList = $('mobileRecentList');
    if (mobList) {
        mobList.innerHTML = '';
        if (!recent5.length) {
            const empty = document.createElement('li');
            empty.className = 'mob-recent-empty';
            empty.textContent = 'No movies played yet';
            mobList.appendChild(empty);
        } else {
            recent5.forEach(e => {
                const li = document.createElement('li');
                li.className = `mob-recent-item mob-recent-item--${e.w ? 'win' : 'skip'}`;
                const titleEl = document.createElement('span');
                titleEl.className = 'mob-recent-item__title';
                titleEl.textContent = e.t;
                const ptsEl = document.createElement('span');
                ptsEl.className = 'mob-recent-item__pts';
                ptsEl.textContent = e.w ? `+${e.p} pts` : 'Skipped';
                li.appendChild(titleEl); li.appendChild(ptsEl);
                mobList.appendChild(li);
            });
        }
    }
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
    if (!/^[A-Z0-9]$/.test(letter)) return;
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
            if (G.timer) clearInterval(G.timer);
            const timeTaken = G.timerEnabled ? Math.floor((Date.now() - G.startTime) / 1000) : 0;
            let speedBonus = 0;
            if (G.timerEnabled) {
                for (const b of CONFIG.SCORING.SPEED_BONUSES) {
                    if (timeTaken < b.threshold) { speedBonus = b.bonus; break; }
                }
            }

            const mult = CONFIG.DIFFICULTIES[G.diff].multiplier;
            const perfectBonus = G.hasUsedHint ? 0 : CONFIG.SCORING.PERFECT_GUESS_BONUS;
            let finalRoundPts = Math.round((G.roundScore + speedBonus) * mult) + perfectBonus;

            G.total += finalRoundPts; G.streak++;

            // Streak Bonus
            if (CONFIG.SCORING.STREAK_BONUSES[G.streak]) {
                const sb = CONFIG.SCORING.STREAK_BONUSES[G.streak];
                finalRoundPts += sb; G.total += sb;
                toast(`🔥 ${G.streak} STREAK! +${sb} bonus`, 'success');
            }

            G.recent.push({ t: G.movie.title, p: finalRoundPts, w: true });
            renderTiles(true); updateSession(); updateUI();
            toast(`✓ You got it! +${finalRoundPts} pts`, 'success');
            G.busy = true;
            setTimeout(loadMovie, 1800);
        } else {
            toast(`✓ "${letter}" is in the title!`, 'success');
        }
    } else {
        G.lives--; G.roundScore = Math.max(0, G.roundScore - CONFIG.SCORING.PENALTY_WRONG);
        updateUI();
        if (G.lives <= 0) {
            clearInterval(G.timer);
            G.streak = 0;
            G.recent.push({ id: G.movie.id, t: G.movie.title, p: 0, w: false });
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
    if (G.round >= CONFIG.TOTAL_ROUNDS) { clearInterval(G.timer); showGameOver(); return; }
    G.round++; G.busy = true;
    G.roundScore = CONFIG.SCORING.BASE_SCORE;
    G.hasUsedHint = false;
    G.lives = 3; G.hints = new Set(); G.revealed = new Set(); G.guessedLetters = new Set();
    $('tilesRow').innerHTML = '<div class="tile-loading">Fetching movie…</div>';
    $('overviewPanel').classList.add('panel--hidden');

    if (G.timer) clearInterval(G.timer);

    const timerHud = document.querySelector('.timer-hud');
    if (timerHud) timerHud.style.display = G.timerEnabled ? 'flex' : 'none';

    if (G.timerEnabled) {
        G.startTime = Date.now();
        G.timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - G.startTime) / 1000);
            const m = Math.floor(elapsed / 60), s = elapsed % 60;
            const tv = $('timerVal'); if (tv) tv.textContent = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;

            let liveScore = CONFIG.SCORING.BASE_SCORE - (elapsed * CONFIG.SCORING.PENALTY_TIME);
            G.hints.forEach(h => {
                if (h === 'year') liveScore -= CONFIG.SCORING.PENALTY_YEAR;
                if (h === 'genre') liveScore -= CONFIG.SCORING.PENALTY_GENRE;
                if (h === 'letter') liveScore -= CONFIG.SCORING.PENALTY_LETTER;
            });
            liveScore -= (3 - G.lives) * CONFIG.SCORING.PENALTY_WRONG;
            G.roundScore = Math.max(0, liveScore);
            updateUI();
        }, 1000);
    } else {
        // Static score calculation if timer disabled
        let liveScore = CONFIG.SCORING.BASE_SCORE;
        G.hints.forEach(h => {
            if (h === 'year') liveScore -= CONFIG.SCORING.PENALTY_YEAR;
            if (h === 'genre') liveScore -= CONFIG.SCORING.PENALTY_GENRE;
            if (h === 'letter') liveScore -= CONFIG.SCORING.PENALTY_LETTER;
        });
        liveScore -= (3 - G.lives) * CONFIG.SCORING.PENALTY_WRONG;
        G.roundScore = Math.max(0, liveScore);
        updateUI();
    }

    resetKeyboard(); renderHintChips(); updateUI();
    try {
        if (CONFIG.API_KEY === 'YOUR_TMDB_API_KEY_HERE') throw new Error('nokey');
        // Build set of already-seen movie IDs to avoid repeats
        const seenIds = new Set(G.recent.map(e => e.id).filter(Boolean));
        let movie = await API.fetchRandomMovie(G.diff, G.lang, seenIds);
        if (!movie) {
            // Pool exhausted for this language — reset seen list and retry
            G.recent = G.recent.map(e => ({ ...e, id: undefined }));
            movie = await API.fetchRandomMovie(G.diff, G.lang, new Set());
        }
        if (!movie) throw new Error('no_results');
        G.movie = movie;
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

        renderTiles(); updateUI(); renderHintChips(); G.busy = false;
    } catch (e) {
        if (e.message === 'nokey') { toast('⚠ Add your TMDB API key in js/config.js', 'warn'); loadDemo(); }
        else { toast('Error loading movie – retrying…', 'error'); G.busy = false; setTimeout(loadMovie, 2000); }
    }
}

const DEMOS = ['Inception', 'The Godfather', 'Pulp Fiction', 'Interstellar', 'The Matrix', 'Parasite', 'Titanic', 'Goodfellas', 'The Dark Knight', 'Forrest Gump'];
function loadDemo() {
    G.movie = { id: 0, title: DEMOS[Math.floor(Math.random() * DEMOS.length)] };
    G.det = { release_date: '2010-07-16', genres: [{ name: 'Sci-Fi' }, { name: 'Action' }], overview: 'A legendary cinematic masterpiece that changed the world.' };
    renderTiles(); updateUI(); renderHintChips(); G.busy = false;
    toast('Demo mode – replace API key in js/config.js for live movies', 'warn');
}

/* ── Hints ── */
function renderHintChips() {
    const container = $('spActiveHints');
    if (!container) return;
    container.innerHTML = '';

    G.hints.forEach(type => {
        if (type === 'letter' || type === 'overview') return;
        const chip = document.createElement('div');
        chip.className = 'active-hint-chip';

        const label = type === 'year' ? 'Year' : 'Genre';
        const val = type === 'year' ? (G.det?.release_date?.split('-')[0] || '????') : (G.det?.genres?.[0]?.name || '????');
        const iconPath = type === 'year'
            ? 'M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z'
            : 'M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2z';

        chip.innerHTML = `<span class="active-hint-chip__label"><svg viewBox="0 0 24 24" fill="currentColor"><path d="${iconPath}"></path></svg>${label}</span> <span>${val}</span>`;
        container.appendChild(chip);
    });
}

function spUseHint() {
    if (!G.movie || G.busy || G.hints.size >= 3) return;

    // Cycle hints: Year -> Genre -> Letter
    let type = '';
    if (!G.hints.has('year')) type = 'year';
    else if (!G.hints.has('genre')) type = 'genre';
    else if (!G.hints.has('letter')) type = 'letter';

    if (!type) return;

    G.hints.add(type); G.hasUsedHint = true;
    const penalty = type === 'year' ? CONFIG.SCORING.PENALTY_YEAR : type === 'genre' ? CONFIG.SCORING.PENALTY_GENRE : CONFIG.SCORING.PENALTY_LETTER;
    G.roundScore = Math.max(0, G.roundScore - penalty);
    updateUI();

    if (type === 'year' || type === 'genre') {
        toast(`${type.charAt(0).toUpperCase() + type.slice(1)} hint used (−${penalty} pts)`, 'warn');
        renderHintChips();
    } else if (type === 'letter') {
        const title = G.movie.title.toUpperCase();
        const unguessedInTitle = [...new Set([...title].filter(c => /[A-Z0-9]/.test(c)))]
            .filter(c => !G.guessedLetters.has(c));
        const pool = unguessedInTitle.filter(c => {
            return [...title].some((ch, i) => ch === c && !G.revealed.has(i));
        });
        if (!pool.length) {
            toast('All letters already revealed!', 'info');
            G.hints.delete('letter'); // Refund or just don't count if impossible
            return;
        }
        const letter = pool[Math.floor(Math.random() * pool.length)];
        handleKey(letter);
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
    G.diff = document.querySelector('#setupOverlay .diff-btn[data-diff].diff-btn--active')?.dataset.diff || 'medium';
    G.lang = document.querySelector('#setupOverlay .diff-btn[data-lang].diff-btn--active')?.dataset.lang || 'all';
    G.timerEnabled = (document.querySelector('#setupOverlay .diff-btn[data-timer].diff-btn--active')?.dataset.timer === 'on');
    // Update difficulty badge text
    const diffLabel = CONFIG.DIFFICULTIES[G.diff].label;
    const db = $('diffBadgeText'); if (db) db.textContent = diffLabel;
    const spd = $('spDiffBadge'); if (spd) spd.textContent = diffLabel;
    const spdm = $('spDiffBadgeMob'); if (spdm) spdm.textContent = diffLabel;
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
document.querySelectorAll('#setupOverlay .diff-btn[data-timer]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('#setupOverlay .diff-btn[data-timer]').forEach(x => x.classList.remove('diff-btn--active'));
    b.classList.add('diff-btn--active');
}));
$('startGameBtn').addEventListener('click', startGame);
$('playerNameInput').addEventListener('keydown', e => { if (e.key === 'Enter') startGame(); });

// On-screen keyboard buttons
document.querySelectorAll('.key-btn').forEach(btn => {
    btn.addEventListener('click', () => handleKey(btn.dataset.key));
});

// Physical keyboard support (letters + digits)
document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toUpperCase());
    if (/^[0-9]$/.test(e.key)) handleKey(e.key);
});

$('skipBtn').addEventListener('click', () => {
    if (!G.movie || G.busy) return;
    clearInterval(G.timer);
    G.streak = 0; G.recent.push({ t: G.movie.title, p: 0, w: false });
    renderTiles(true); updateSession();
    toast('Movie skipped', 'warn'); setTimeout(loadMovie, 1600);
});
$('spHintBtn').addEventListener('click', spUseHint);
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

/* ── Mobile Stats Drawer ── */
(function () {
    const drawer = $('mobileStatsDrawer');
    const openBtn = $('statsToggleBtn');
    const closeBtn = $('statsCloseBtn');
    const backdrop = $('statsBackdrop');
    if (!drawer || !openBtn) return;
    function openDrawer() { drawer.classList.add('drawer--open'); }
    function closeDrawer() { drawer.classList.remove('drawer--open'); }
    openBtn.addEventListener('click', openDrawer);
    closeBtn?.addEventListener('click', closeDrawer);
    backdrop?.addEventListener('click', closeDrawer);
})();

/* ── Mobile Recent Drawer ── */
(function () {
    const drawer = $('mobileRecentDrawer');
    const openBtn = $('recentToggleBtn');
    const closeBtn = $('recentCloseBtn');
    const backdrop = $('recentBackdrop');
    if (!drawer || !openBtn) return;
    function openDrawer() { drawer.classList.add('drawer--open'); }
    function closeDrawer() { drawer.classList.remove('drawer--open'); }
    openBtn.addEventListener('click', openDrawer);
    closeBtn?.addEventListener('click', closeDrawer);
    backdrop?.addEventListener('click', closeDrawer);
})();

/* ── Hamburger Nav Drawer ── */
(function () {
    const drawer = $('mobNavDrawer');
    const openBtn = $('menuToggleBtn');
    const closeBtn = $('menuCloseBtn');
    const backdrop = $('menuBackdrop');
    if (!drawer || !openBtn) return;
    function openDrawer() { drawer.classList.add('drawer--open'); }
    function closeDrawer() { drawer.classList.remove('drawer--open'); }
    openBtn.addEventListener('click', openDrawer);
    closeBtn?.addEventListener('click', closeDrawer);
    backdrop?.addEventListener('click', closeDrawer);
})();
