diff --git a/js/game.js b/js/game.js
index 00987ce..feeb5f8 100644
--- a/js/game.js
+++ b/js/game.js
@@ -55,14 +55,14 @@ function renderHearts() {
 function updateUI() {
     const pts = G.total.toLocaleString();
     const rd = `Round ${G.round} / ${CONFIG.TOTAL_ROUNDS}`;
-    $('scoreVal').textContent = pts + ' PTS';
+    const sv = $('scoreVal'); if (sv) sv.textContent = pts + ' PTS';
     const sr = $('scoreValRight'); if (sr) sr.textContent = pts + ' PTS';
-    $('roundVal').textContent = rd;
+    const rv = $('roundVal'); if (rv) rv.textContent = rd;
     const r2 = $('roundVal2'); if (r2) r2.textContent = rd;
     const rm = $('roundValMob'); if (rm) rm.textContent = rd;
-    $('mptVal').textContent = G.pts;
+    const mt = $('mptVal'); if (mt) mt.textContent = G.pts;
     const mr = $('mptValRight'); if (mr) mr.textContent = G.pts;
-    $('streakVal').textContent = G.streak;
+    const stv = $('streakVal'); if (stv) stv.textContent = G.streak;
     renderHearts();
 }
 
@@ -199,7 +199,12 @@ function populateHintCards() {
     $('hintGenreEl').dataset.val = gn; $('hintGenreVal').textContent = '????';
 }
 function resetHintCards() {
-    ['hintYearEl', 'hintGenreEl', 'hintLetterEl', 'hintOverviewEl'].forEach(id => $(id)?.classList.remove('sp-hint--used'));
+    ['Year', 'Genre'].forEach(k => { $(`hint${k}Val`).textContent = '????'; });
+    document.querySelectorAll('.hint-action').forEach(el => {
+        el.classList.remove('hint-action--used');
+        el.style.opacity = '1';
+        el.style.pointerEvents = 'auto';
+    });
 }
 
 /* ── Use Hint ── */
@@ -208,11 +213,28 @@ function useHint(type) {
     G.hints.add(type);
     const cost = CONFIG.HINT_COSTS[type];
     G.pts = Math.max(50, G.pts - cost); updateUI();
-    const el = $({ year: 'hintYearEl', genre: 'hintGenreEl', letter: 'hintLetterEl', overview: 'hintOverviewEl' }[type]);
-    el?.classList.add('sp-hint--used');
-    if (type === 'year') { $('hintYearVal').textContent = $('hintYearEl').dataset.val; }
-    else if (type === 'genre') { $('hintGenreVal').textContent = $('hintGenreEl').dataset.val; }
-    else if (type === 'letter') {
+
+    let k, v; // k for element key, v for value to display
+    switch (type) {
+        case 'year': k = 'Year'; v = G.det?.release_date?.split('-')[0] || '????'; break;
+        case 'genre': k = 'Genre'; v = G.det?.genres?.[0]?.name || '????'; break;
+        case 'letter': k = 'Letter'; break; // Handled separately
+        case 'overview': k = 'Overview'; break; // Handled separately
+    }
+
+    if (k) { // For 'year', 'genre', 'letter', 'overview'
+        const card = $(`hint${k}El`);
+        card.classList.add('hint-action--used');
+        card.style.opacity = '0.3';
+        card.style.pointerEvents = 'none';
+
+        if (k === 'Year' || k === 'Genre') {
+            const span = $(`hint${k}Val`);
+            span.textContent = v;
+        }
+    }
+
+    if (type === 'letter') {
         const title = G.movie.title.toUpperCase();
         // Find letters that are in the title but not yet guessed or pre-revealed
         const unguessedInTitle = [...new Set([...title].filter(c => /[A-Z0-9]/.test(c)))]
@@ -247,7 +269,7 @@ function startGame() {
     G.lang = document.querySelector('#setupOverlay .diff-btn[data-lang].diff-btn--active')?.dataset.lang || 'all';
     // Update difficulty badge text
     const diffLabel = CONFIG.DIFFICULTIES[G.diff].label;
-    $('diffBadgeText').textContent = diffLabel;
+    const db = $('diffBadgeText'); if (db) db.textContent = diffLabel;
     const spd = $('spDiffBadge'); if (spd) spd.textContent = diffLabel;
     $('setupOverlay').classList.add('overlay--hidden');
     // Update player name + avatar
