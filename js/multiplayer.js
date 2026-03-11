'use strict';
/* ── Multiplayer State ── */
const MP = {
    p: [{ name: 'Player 1', score: 0, hints: 0, streak: 0 }, { name: 'Player 2', score: 0, hints: 0, streak: 0 }],
    turn: 0, round: 0, lang: 'all', movie: null, det: null,
    pts: 0, att: 3, hints: new Set(), revealed: new Set(), busy: false,
    guessedLetters: new Set(), timer: null, startTime: 0, roundScore: 100, hasUsedHint: false,
    stealMode: false, timerEnabled: true
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
    const title = MP.movie.title.toUpperCase();
    [...title].forEach((ch, i) => {
        const d = document.createElement('div');
        if (ch === ' ') { d.className = 'tile tile--space'; }
        else {
            const isAlphaNum = /[A-Z0-9]/.test(ch);
            const rev = all || MP.revealed.has(i) || (!isAlphaNum) || (isAlphaNum && MP.guessedLetters.has(ch));
            d.className = `tile ${rev ? 'tile--revealed' : 'tile--hidden'}`;
            if (all && /[A-Z0-9]/.test(ch)) d.classList.add('tile--answer');
            d.textContent = rev ? ch : '_';
        }
        row.appendChild(d);
    });
}

/* ── Hearts ── */
function mpHearts() {
    function fillHearts(c) {
        if (!c) return;
        c.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'currentColor');
            s.classList.add('heart-icon'); if (i >= MP.att) s.classList.add('heart-icon--empty');
            s.innerHTML = '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>';
            c.appendChild(s);
        }
    }
    fillHearts(mpS('mpHeartsBox'));
    fillHearts(mpS('mpHeartsMob'));
}

/* ── UI Update ── */
function mpUI() {
    const p = MP.p, t = MP.turn;
    const turnName = p[t].name;
    const leader = p[0].score >= p[1].score ? p[0].name : p[1].name;
    // Desktop
    ['mpTurnText'].forEach(id => { const el = mpS(id); if (el) el.textContent = `${turnName}'s Turn`; });
    ['mpRound', 'mpRound2'].forEach(id => { const el = mpS(id); if (el) el.textContent = `Round ${MP.round} / 10`; });
    if (mpS('mpP1Score')) mpS('mpP1Score').textContent = p[0].score.toLocaleString() + ' PTS';
    if (mpS('mpP2Score')) mpS('mpP2Score').textContent = p[1].score.toLocaleString() + ' PTS';
    if (mpS('mpP1Name')) mpS('mpP1Name').textContent = p[0].name;
    if (mpS('mpP2Name')) mpS('mpP2Name').textContent = p[1].name;
    if (mpS('mpLeader')) mpS('mpLeader').textContent = leader;
    if (mpS('mpTurnRight')) mpS('mpTurnRight').textContent = turnName;
    if (mpS('mpP1Hints')) mpS('mpP1Hints').textContent = `${p[0].hints}/3`;
    if (mpS('mpP2Hints')) mpS('mpP2Hints').textContent = `${p[1].hints}/3`;
    // Avatar active state
    mpS('mpP1Wrap')?.classList.toggle('player-card__avatar-wrap--active', t === 0);
    mpS('mpP2Wrap')?.classList.toggle('player-card__avatar-wrap--active', t === 1);
    const r0 = mpS('mpP1Ring'), r1 = mpS('mpP2Ring');
    r0?.classList.toggle('ring--hidden', t !== 0);
    r1?.classList.toggle('ring--hidden', t !== 1);
    // Mobile drawer stats
    if (mpS('mpRoundMob')) mpS('mpRoundMob').textContent = `${MP.round} / 10`;
    if (mpS('mpTurnMob')) mpS('mpTurnMob').textContent = turnName;
    if (mpS('mpLeaderMob')) mpS('mpLeaderMob').textContent = leader;
    if (mpS('mpP1ScoreMob')) mpS('mpP1ScoreMob').textContent = p[0].score.toLocaleString() + ' PTS';
    if (mpS('mpP2ScoreMob')) mpS('mpP2ScoreMob').textContent = p[1].score.toLocaleString() + ' PTS';
    if (mpS('mpP1NameMobLabel')) mpS('mpP1NameMobLabel').textContent = p[0].name;
    if (mpS('mpP2NameMobLabel')) mpS('mpP2NameMobLabel').textContent = p[1].name;
    mpHearts();
}

/* ── Load Movie ── */
async function mpLoad() {
    if (MP.round >= 10) { clearInterval(MP.timer); mpOver(); return; }
    MP.round++; MP.busy = true;
    MP.roundScore = 100;
    MP.att = 3; MP.hints = new Set(); MP.revealed = new Set(); MP.guessedLetters = new Set();
    MP.hasUsedHint = false; MP.stealMode = false;
    mpS('mpTilesRow').innerHTML = '<div class="tile-loading">Loading movie…</div>';
    mpS('mpActiveHints').innerHTML = '';

    if (MP.timer) clearInterval(MP.timer);

    const timerHud = document.querySelector('.timer-hud');
    if (timerHud) timerHud.style.display = MP.timerEnabled ? 'flex' : 'none';

    if (MP.timerEnabled) {
        MP.startTime = Date.now();
        MP.timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - MP.startTime) / 1000);
            const m = Math.floor(elapsed / 60), s = elapsed % 60;
            const tv = mpS('mpTimerVal'); if (tv) tv.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;

            let liveScore = 100 - (elapsed * CONFIG.SCORING.PENALTY_TIME);
            MP.hints.forEach(h => {
                if (h === 'year') liveScore -= CONFIG.SCORING.PENALTY_YEAR;
                if (h === 'genre') liveScore -= CONFIG.SCORING.PENALTY_GENRE;
                if (h === 'letter') liveScore -= CONFIG.SCORING.PENALTY_LETTER;
            });
            liveScore -= (3 - MP.att) * CONFIG.SCORING.PENALTY_WRONG;
            MP.roundScore = Math.max(0, liveScore);
            mpUI();
        }, 1000);
    } else {
        let liveScore = 100;
        MP.hints.forEach(h => {
            if (h === 'year') liveScore -= CONFIG.SCORING.PENALTY_YEAR;
            if (h === 'genre') liveScore -= CONFIG.SCORING.PENALTY_GENRE;
            if (h === 'letter') liveScore -= CONFIG.SCORING.PENALTY_LETTER;
        });
        liveScore -= (3 - MP.att) * CONFIG.SCORING.PENALTY_WRONG;
        MP.roundScore = Math.max(0, liveScore);
        mpUI();
    }

    mpResetKeyboard(); mpUI();
    try {
        MP.movie = await API.fetchRandomMovie(MP.diff || 'medium', MP.lang);
        MP.det = await API.fetchMovieDetails(MP.movie.id);
        
        // Reveal 20% of letters for multiplayer (medium difficulty)
        const letterIndices = [...MP.movie.title].map((c, i) => [c, i])
            .filter(([c]) => /[A-Z0-9]/.test(c))
            .map(([, i]) => i);

        let revealCount = 0;
        const diff = MP.diff || 'medium';
        if (diff === 'easy') revealCount = Math.ceil(letterIndices.length * 0.4);
        else if (diff === 'medium') revealCount = Math.ceil(letterIndices.length * 0.2);
        else if (diff === 'hard') revealCount = Math.ceil(letterIndices.length * 0.1);
        else if (diff === 'extreme') revealCount = Math.ceil(letterIndices.length * 0.05);

        const shuffled = [...letterIndices].sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(revealCount, shuffled.length); i++) {
            MP.revealed.add(shuffled[i]);
        }

        mpTiles(); mpUI(); MP.busy = false;
    } catch (e) {
        mpToast('Load error in local movie data – retrying…', 'error');
        MP.busy = false;
        setTimeout(mpLoad, 2000);
    }
}

/* ── Keyboard & Guess ── */
function mpResetKeyboard() {
    document.querySelectorAll('.key-btn').forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('key-btn--correct', 'key-btn--wrong');
    });
}

function mpIsAllRevealed() {
    if (!MP.movie) return false;
    const title = MP.movie.title.toUpperCase();
    return [...title].every((ch, i) => {
        if (ch === ' ') return true;
        if (!/[A-Z0-9]/.test(ch)) return true;
        return MP.guessedLetters.has(ch) || MP.revealed.has(i);
    });
}

function mpHandleKey(letter) {
    if (!MP.movie || MP.busy) return;
    letter = letter.toUpperCase();
    if (!/^[A-Z0-9]$/.test(letter)) return;
    if (MP.guessedLetters.has(letter)) return;

    MP.guessedLetters.add(letter);

    const keyBtn = document.querySelector(`.key-btn[data-key="${letter}"]`);
    const titleUpper = MP.movie.title.toUpperCase();
    const found = titleUpper.includes(letter);

    if (keyBtn) {
        keyBtn.disabled = true;
        keyBtn.classList.add(found ? 'key-btn--correct' : 'key-btn--wrong');
    }

    if (found) {
        mpTiles();
        if (mpIsAllRevealed()) {
            if (MP.timer) clearInterval(MP.timer);
            let finalRoundPts = MP.roundScore;
            if (MP.stealMode) {
                finalRoundPts = Math.floor(finalRoundPts * 0.5);
                mpToast(`🧤 STEAL! ${MP.p[MP.turn].name} gets +${finalRoundPts} pts`, 'success');
            } else {
                const timeTaken = MP.timerEnabled ? Math.floor((Date.now() - MP.startTime) / 1000) : 0;
                let speedBonus = 0;
                if (MP.timerEnabled) {
                    for (const b of CONFIG.SCORING.SPEED_BONUSES) {
                        if (timeTaken < b.threshold) { speedBonus = b.bonus; break; }
                    }
                }
                const mult = CONFIG.DIFFICULTIES[MP.diff || 'medium'].multiplier;
                const perfectBonus = MP.hasUsedHint ? 0 : CONFIG.SCORING.PERFECT_GUESS_BONUS;
                finalRoundPts = Math.round((finalRoundPts + speedBonus) * mult) + perfectBonus;
                mpToast(`✓ ${MP.p[MP.turn].name} wins round! +${finalRoundPts} pts`, 'success');
            }
            MP.p[MP.turn].score += finalRoundPts;
            if (!MP.stealMode) MP.p[MP.turn].streak++;

            mpTiles(true); mpUI();
            MP.busy = true;
            setTimeout(nextTurn, 1800);
        } else {
            mpToast(`✓ "${letter}" is in the title!`, 'success');
        }
    } else {
        MP.att--; MP.roundScore = Math.max(0, MP.roundScore - CONFIG.SCORING.PENALTY_WRONG);
        mpUI();
        if (MP.att <= 0) {
            if (!MP.stealMode) {
                MP.stealMode = true; MP.att = 1;
                MP.turn = (MP.turn + 1) % 2;
                mpToast(`⚡ P1 FAILED! ${MP.p[MP.turn].name} can STEAL! (1 try)`, 'warn');
                mpUI();
            } else {
                clearInterval(MP.timer);
                mpTiles(true);
                mpToast(`✗ Both failed!`, 'error');
                MP.busy = true;
                setTimeout(nextTurn, 2500);
            }
        } else {
            mpToast(`✗ No "${letter}" — ${MP.att} attempts left`, 'error');
        }
    }
}

/* ── Hint ── */
function mpUseHint() {
    if (!MP.movie || MP.busy || MP.p[MP.turn].hints >= 3 || MP.stealMode) return;
    const used = MP.hints;
    const type = !used.has('year') ? 'year' : !used.has('genre') ? 'genre' : 'letter';
    used.add(type); MP.p[MP.turn].hints++; MP.hasUsedHint = true;
    const penalty = type === 'year' ? CONFIG.SCORING.PENALTY_YEAR : type === 'genre' ? CONFIG.SCORING.PENALTY_GENRE : CONFIG.SCORING.PENALTY_LETTER;
    MP.roundScore = Math.max(0, MP.roundScore - penalty); mpUI();

    const addPersistentHint = (label, value) => {
        const chip = document.createElement('div');
        chip.className = 'active-hint-chip';
        chip.innerHTML = `<span class="active-hint-chip__label"><svg viewBox="0 0 24 24" fill="currentColor"><path d="${label === 'Year' ? 'M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z' : 'M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2z'}"></path></svg>${label}</span> <span>${value}</span>`;
        mpS('mpActiveHints').appendChild(chip);
    };

    if (type === 'year') {
        const yr = MP.det?.release_date?.split('-')[0] || '????';
        mpToast(`Year hint used (−${penalty} pts)`, 'warn');
        addPersistentHint('Year', yr);
    }
    else if (type === 'genre') {
        const gn = MP.det?.genres?.[0]?.name || '????';
        mpToast(`Genre hint used (−${penalty} pts)`, 'warn');
        addPersistentHint('Genre', gn);
    }
    else {
        const title = MP.movie.title.toUpperCase();
        const unguessedInTitle = [...new Set([...title].filter(c => /[A-Z0-9]/.test(c)))]
            .filter(c => !MP.guessedLetters.has(c));
        const pool = unguessedInTitle.filter(c => {
            return [...title].some((ch, i) => ch === c && !MP.revealed.has(i));
        });
        if (!pool.length) { mpToast('All letters already revealed!', 'info'); return; }
        const letter = pool[Math.floor(Math.random() * pool.length)];
        mpHandleKey(letter);
    }
}

/* ── Turn / Game Over ── */
function nextTurn() { clearInterval(MP.timer); MP.turn = (MP.turn + 1) % 2; mpLoad(); }

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
    MP.lang = document.querySelector('#mpSetupOverlay .diff-btn[data-lang].diff-btn--active')?.dataset.lang || 'all';
    MP.diff = document.querySelector('#mpSetupOverlay .diff-btn[data-diff].diff-btn--active')?.dataset.diff || 'medium';
    MP.timerEnabled = (document.querySelector('#mpSetupOverlay .diff-btn[data-timer].diff-btn--active')?.dataset.timer === 'on');
    MP.round = 0; MP.turn = 0;
    MP.p[0].score = MP.p[1].score = MP.p[0].hints = MP.p[1].hints = 0;
    mpS('mpSetupOverlay').classList.add('overlay--hidden');
    mpLoad();
}

/* ── Bindings ── */
document.querySelectorAll('#mpSetupOverlay .diff-btn[data-lang], #mpSetupOverlay .diff-btn[data-diff], #mpSetupOverlay .diff-btn[data-timer]').forEach(b => b.addEventListener('click', () => {
    let key = '';
    if (b.hasAttribute('data-lang')) key = 'lang';
    else if (b.hasAttribute('data-diff')) key = 'diff';
    else if (b.hasAttribute('data-timer')) key = 'timer';

    document.querySelectorAll(`#mpSetupOverlay .diff-btn[data-${key}]`).forEach(x => x.classList.remove('diff-btn--active'));
    b.classList.add('diff-btn--active');
}));
mpS('mpStartBtn').addEventListener('click', mpStart);
[mpS('mp_p1name'), mpS('mp_p2name')].forEach(el => el?.addEventListener('keydown', e => { if (e.key === 'Enter') mpStart(); }));
document.querySelectorAll('.key-btn').forEach(btn => {
    btn.addEventListener('click', () => mpHandleKey(btn.dataset.key));
});

document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (/^[a-zA-Z]$/.test(e.key)) mpHandleKey(e.key.toUpperCase());
    if (/^[0-9]$/.test(e.key)) mpHandleKey(e.key);
});
mpS('mpSkipBtn').addEventListener('click', () => {
    if (!MP.movie || MP.busy) return;
    clearInterval(MP.timer);
    mpTiles(true); mpToast(`${MP.p[MP.turn].name} skipped`, 'warn'); setTimeout(nextTurn, 1500);
});
mpS('mpHintBtn').addEventListener('click', mpUseHint);
mpS('mpPlayAgain').addEventListener('click', () => {
    mpS('mpGameOver').classList.add('overlay--hidden');
    MP.p[0].score = MP.p[1].score = MP.p[0].hints = MP.p[1].hints = 0;
    MP.round = 0; MP.turn = 0; mpLoad();
});

/* ── Mobile Nav Drawer ── */
(function () {
    const drawer = mpS('mpNavDrawer'), openBtn = mpS('mpMenuToggleBtn'),
        closeBtn = mpS('mpMenuCloseBtn'), backdrop = mpS('mpMenuBackdrop');
    if (!drawer || !openBtn) return;
    const open = () => drawer.classList.add('drawer--open');
    const close = () => drawer.classList.remove('drawer--open');
    openBtn.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    backdrop?.addEventListener('click', close);
})();

/* ── Mobile Stats Drawer ── */
(function () {
    const drawer = mpS('mpStatsDrawer'), openBtn = mpS('mpStatsToggleBtn'),
        closeBtn = mpS('mpStatsCloseBtn'), backdrop = mpS('mpStatsBackdrop');
    if (!drawer || !openBtn) return;
    const open = () => drawer.classList.add('drawer--open');
    const close = () => drawer.classList.remove('drawer--open');
    openBtn.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    backdrop?.addEventListener('click', close);
})();
