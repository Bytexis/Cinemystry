'use strict';
/* ── Multiplayer State ── */
const MP = {
    p: [{ name: 'Player 1', score: 0, hints: 0 }, { name: 'Player 2', score: 0, hints: 0 }],
    turn: 0, round: 0, movie: null, det: null,
    pts: 0, att: 3, hints: new Set(), revealed: new Set(), busy: false
};
const mpS = id => document.getElementById(id);
const mpNorm = s => s.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '').replace(/ +/g, ' ').trim();
const mpMatch = (g, t) => { const a = mpNorm(g), b = mpNorm(t); return a === b || a === b.replace(/^the /, ''); };

/* ── Toast ── */
function mpToast(msg, type = 'info') {
    const c = mpS('mpToast'), d = document.createElement('div');
    d.className = `toast toast--${type}`; d.textContent = msg; c.appendChild(d);
    requestAnimationFrame(() => d.classList.add('toast--show'));
    setTimeout(() => { d.classList.remove('toast--show'); setTimeout(() => d.remove(), 300); }, 2700);
}

/* ── Tiles ── */
function mpTiles(all = false) {
    const row = mpS('mpTilesRow'); row.innerHTML = '';
    if (!MP.movie) return;
    [...MP.movie.title.toUpperCase()].forEach((ch, i) => {
        const d = document.createElement('div');
        if (ch === ' ') { d.className = 'tile tile--space'; }
        else {
            const rev = all || MP.revealed.has(i) || !/[A-Z0-9]/.test(ch);
            d.className = `tile ${rev ? 'tile--revealed' : 'tile--hidden'}`;
            d.textContent = rev ? ch : '';
        }
        row.appendChild(d);
    });
}

/* ── Hearts ── */
function mpHearts() {
    const c = mpS('mpHeartsBox'); c.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'currentColor');
        s.classList.add('heart-icon'); if (i >= MP.att) s.classList.add('heart-icon--empty');
        s.innerHTML = '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>';
        c.appendChild(s);
    }
}

/* ── UI Update ── */
function mpUI() {
    const p = MP.p, t = MP.turn;
    mpS('mpTurnText').textContent = `${p[t].name}'s Turn`;
    mpS('mpRound').textContent = `Round ${MP.round} / 10`;
    mpS('mpP1Score').textContent = p[0].score.toLocaleString() + ' PTS';
    mpS('mpP2Score').textContent = p[1].score.toLocaleString() + ' PTS';
    mpS('mpP1Name').textContent = p[0].name;
    mpS('mpP2Name').textContent = p[1].name;
    mpS('mpLeader').textContent = p[0].score >= p[1].score ? p[0].name : p[1].name;
    mpS('mpP1Hints').textContent = `${p[0].hints}/3 used`;
    mpS('mpP2Hints').textContent = `${p[1].hints}/3 used`;
    mpS('mpP1Wrap')?.classList.toggle('player-card__avatar-wrap--active', t === 0);
    mpS('mpP2Wrap')?.classList.toggle('player-card__avatar-wrap--active', t === 1);
    const r0 = mpS('mpP1Ring'), r1 = mpS('mpP2Ring');
    r0?.classList.toggle('ring--hidden', t !== 0);
    r1?.classList.toggle('ring--hidden', t !== 1);
    mpHearts();
}

/* ── Load Movie ── */
const MP_DEMOS = ['Inception', 'The Godfather', 'Pulp Fiction', 'Interstellar', 'The Matrix', 'Parasite', 'Titanic', 'Avatar', 'Goodfellas', 'The Dark Knight'];

async function mpLoad() {
    if (MP.round >= 10) { mpOver(); return; }
    MP.round++; MP.busy = true;
    MP.pts = CONFIG.DIFFICULTIES['medium'].baseScore;
    MP.att = 3; MP.hints = new Set(); MP.revealed = new Set();
    mpS('mpTilesRow').innerHTML = '<div class="tile-loading">Loading movie…</div>';
    mpS('mpGuessInput').value = '';
    mpUI();
    try {
        if (CONFIG.API_KEY === 'YOUR_TMDB_API_KEY_HERE') throw new Error('nokey');
        MP.movie = await API.fetchRandomMovie('medium');
        MP.det = await API.fetchMovieDetails(MP.movie.id);
        mpTiles(); mpUI(); MP.busy = false; mpS('mpGuessInput').focus();
    } catch (e) {
        if (e.message === 'nokey') {
            MP.movie = { id: 0, title: MP_DEMOS[Math.floor(Math.random() * MP_DEMOS.length)] };
            MP.det = { release_date: '2012-01-01', genres: [{ name: 'Action' }], overview: 'A legendary film.' };
            mpTiles(); mpUI(); MP.busy = false; mpS('mpGuessInput').focus();
            mpToast('⚠ Demo mode – add API key in js/config.js', 'warn');
        } else { mpToast('Load error – retrying…', 'error'); MP.busy = false; setTimeout(mpLoad, 2000); }
    }
}

/* ── Guess ── */
function mpGuess() {
    if (!MP.movie || MP.busy) return;
    const val = mpS('mpGuessInput').value.trim();
    if (!val) { const i = mpS('mpGuessInput'); i.classList.add('input--shake'); setTimeout(() => i.classList.remove('input--shake'), 400); return; }
    mpS('mpGuessInput').value = '';
    if (mpMatch(val, MP.movie.title)) {
        MP.p[MP.turn].score += MP.pts;
        mpTiles(true); mpUI();
        mpToast(`✓ ${MP.p[MP.turn].name} correct! +${MP.pts} pts`, 'success');
        setTimeout(nextTurn, 1800);
    } else {
        MP.att--; MP.pts = Math.max(0, MP.pts - 50);
        const i = mpS('mpGuessInput'); i.classList.add('input--shake'); setTimeout(() => i.classList.remove('input--shake'), 400);
        mpUI(); mpToast(MP.att > 0 ? `✗ Wrong! −50 pts (${MP.att} left)` : 'No attempts left!', 'error');
        if (!MP.att) { mpTiles(true); setTimeout(nextTurn, 2000); }
    }
}

/* ── Hint ── */
function mpUseHint() {
    if (!MP.movie || MP.busy || MP.p[MP.turn].hints >= 3) return;
    const used = MP.hints;
    const type = !used.has('year') ? 'year' : !used.has('genre') ? 'genre' : 'letter';
    used.add(type); MP.p[MP.turn].hints++;
    const cost = CONFIG.HINT_COSTS[type]; MP.pts = Math.max(50, MP.pts - cost); mpUI();
    if (type === 'year') { mpToast(`Year: ${MP.det?.release_date?.split('-')[0] || '????'} (−${cost} pts)`, 'warn'); }
    else if (type === 'genre') { mpToast(`Genre: ${MP.det?.genres?.[0]?.name || '????'} (−${cost} pts)`, 'warn'); }
    else {
        const pool = [...MP.movie.title.toUpperCase()].map((c, i) => [c, i])
            .filter(([c, i]) => c !== ' ' && /[A-Z0-9]/.test(c) && !MP.revealed.has(i)).map(([, i]) => i);
        if (!pool.length) { mpToast('All letters shown!', 'info'); return; }
        MP.revealed.add(pool[Math.floor(Math.random() * pool.length)]); mpTiles();
        mpToast(`Letter revealed (−${cost} pts)`, 'warn');
    }
}

/* ── Turn / Game Over ── */
function nextTurn() { MP.turn = (MP.turn + 1) % 2; mpLoad(); }

function mpOver() {
    const p = MP.p;
    const winner = p[0].score > p[1].score ? p[0].name : p[1].score > p[0].score ? p[1].name : 'Tie';
    mpS('mpWinner').textContent = winner === 'Tie' ? "🤝 It's a Tie!" : `🏆 ${winner} Wins!`;
    mpS('mpFinalP1').textContent = `${p[0].name}: ${p[0].score.toLocaleString()} pts`;
    mpS('mpFinalP2').textContent = `${p[1].name}: ${p[1].score.toLocaleString()} pts`;
    mpS('mpGameOver').classList.remove('overlay--hidden');
}

/* ── Start ── */
function mpStart() {
    MP.p[0].name = mpS('mp_p1name').value.trim() || 'Player 1';
    MP.p[1].name = mpS('mp_p2name').value.trim() || 'Player 2';
    MP.round = 0; MP.turn = 0;
    MP.p[0].score = MP.p[1].score = MP.p[0].hints = MP.p[1].hints = 0;
    mpS('mpSetupOverlay').classList.add('overlay--hidden');
    mpLoad();
}

/* ── Bindings ── */
mpS('mpStartBtn').addEventListener('click', mpStart);
[mpS('mp_p1name'), mpS('mp_p2name')].forEach(el => el?.addEventListener('keydown', e => { if (e.key === 'Enter') mpStart(); }));
mpS('mpGuessBtn').addEventListener('click', mpGuess);
mpS('mpGuessInput').addEventListener('keydown', e => { if (e.key === 'Enter') mpGuess(); });
mpS('mpSkipBtn').addEventListener('click', () => {
    if (!MP.movie || MP.busy) return;
    mpTiles(true); mpToast(`${MP.p[MP.turn].name} skipped`, 'warn'); setTimeout(nextTurn, 1500);
});
mpS('mpHintBtn').addEventListener('click', mpUseHint);
mpS('mpPlayAgain').addEventListener('click', () => {
    mpS('mpGameOver').classList.add('overlay--hidden');
    MP.p[0].score = MP.p[1].score = MP.p[0].hints = MP.p[1].hints = 0;
    MP.round = 0; MP.turn = 0; mpLoad();
});
