/* 클라우드 저장 2판 (2026-11-17)
 * 구글 로그인(게시판과 같은 Supabase 계정)으로 게임 기록을 서버에 보관·복원한다.
 * 2판에서 고친 것: 1판은 옛 이름의 저장 칸을 지켜봐서 실제 기록이 안 올라갔다. 이제 게임이 실제로 쓰는 칸을 쓴다.
 *   기록(profile) · 직업 해제(unlocks) · 점수(scores) · 난이도 · 마지막에 고른 직업(lastclass)  → 서버 줄 1개 (game = PFX)
 *   중간 저장(판 진행 run)                                                                   → 서버 줄 1개 (game = PFX + '_run')
 * - 로그인하지 않으면 아무것도 하지 않는다(브라우저에는 지금처럼 자동 저장). 로그인 흔적이 없는 방문자는 Supabase 코드를 불러오지도 않는다.
 * - 서버에는 이메일을 저장하지 않는다(사용자 번호만). 표: public.game_saves (게시판/supabase-patch-06-game-saves.sql)
 */
(function () {
  'use strict';
  var PFX = 'goblin_raid';          // 게임마다 다름 (goblin_raid / coord_explorer)
  var USE_HEADER = false;              // true: 맨 위 단추 줄(#cloud-slot)에 단추를 넣는다 / false: 왼쪽 아래 떠 있는 단추
  var SB_URL = 'https://houqpzuwbdmzhkdruxmo.supabase.co';
  var SB_KEY = 'sb_publishable_9GjdOgkxZZquoKwhePNSUw_LaWdckts'; // 공개용 키(게시판 config.js와 같음)
  var CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  var TOKEN_KEY = 'sb-houqpzuwbdmzhkdruxmo-auth-token';
  var GAME = PFX, GAME_RUN = PFX + '_run';
  var K = { profile: PFX + '_v1_profile', unlocks: PFX + '_v1_unlocks', scores: PFX + '_v1_scores', diff: PFX + '_v1_difficulty', last: PFX + '_v1_lastclass', run: PFX + '_v1_run' };
  var BAK = PFX + '_cloudbak';

  var sb = null, session = null, conflict = null, busy = false, mainSeen = null, runSeen = null, runPushed = false;
  var mainTimer = null, runTimer = null;
  var elLogin, elSave, elFloat, panel, statusEl, actionsEl, infoEl, toastEl;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (_) { return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (_) {} }
  function parse(s) { try { return JSON.parse(s); } catch (_) { return null; } }
  function hhmm(d) { d = d || new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }

  /* ---------- 기록 읽기·쓰기 (실제 저장 칸) ---------- */
  function readMain() {
    return { profile: parse(lsGet(K.profile)), unlocks: parse(lsGet(K.unlocks)), scores: parse(lsGet(K.scores)),
             difficulty: lsGet(K.diff), lastClass: lsGet(K.last) };
  }
  function mainSig() { return [lsGet(K.profile), lsGet(K.unlocks), lsGet(K.scores), lsGet(K.diff), lsGet(K.last)].join('|'); }
  function backupLocal() {
    var o = { at: new Date().toISOString() };
    ['profile', 'unlocks', 'scores', 'diff', 'last', 'run'].forEach(function (k) { o[k] = lsGet(K[k]); });
    lsSet(BAK, JSON.stringify(o));
  }
  function applyMain(m) {
    backupLocal();
    function put(key, v, isJson) { if (v == null) lsDel(key); else lsSet(key, isJson ? JSON.stringify(v) : String(v)); }
    put(K.profile, m.profile, true); put(K.unlocks, m.unlocks, true); put(K.scores, m.scores, true);
    put(K.diff, m.difficulty, false); put(K.last, m.lastClass, false);
  }

  function canon(o) { if (Array.isArray(o)) return o.map(canon); if (o && typeof o === 'object') { var r = {}; Object.keys(o).sort().forEach(function (k) { r[k] = canon(o[k]); }); return r; } return o; }
  function sameMain(a, b) { return JSON.stringify(canon([a.profile || null, a.unlocks || null, a.scores || null])) === JSON.stringify(canon([b.profile || null, b.unlocks || null, b.scores || null])); }
  function growthMax(m) {
    var mx = 0, g = (m.unlocks && m.unlocks.classGrowths) || {};
    for (var k in g) mx = Math.max(mx, +g[k] || 0);
    var p = m.profile || {};
    if (Array.isArray(p.classes)) p.classes.forEach(function (c) { mx = Math.max(mx, +c.growth || 0, +c.level || 0); });
    return mx;
  }
  function unlockedCount(m) {
    var n = (m.unlocks && Array.isArray(m.unlocks.unlockedClasses)) ? m.unlocks.unlockedClasses.length : 1;
    var p = m.profile || {};
    if (Array.isArray(p.classes)) n = Math.max(n, p.classes.filter(function (c) { return (+c.growth || 0) >= 1 || (+c.level || 0) >= 1; }).length);
    return Math.max(1, n);
  }
  function bestScore(m) {
    var b = 0, p = m.profile || {};
    if (Array.isArray(p.highScores)) p.highScores.forEach(function (h) { b = Math.max(b, +(h && h.score) || 0); });
    (function walk(o, d) { if (!o || d > 4) return; if (Array.isArray(o)) { o.forEach(function (x) { if (x && typeof x === 'object' && typeof x.score === 'number') b = Math.max(b, x.score); else walk(x, d + 1); }); }
      else if (typeof o === 'object') { for (var k in o) walk(o[k], d + 1); } })(m.scores, 0);
    return b;
  }
  function raceCount(m) { var c = 0, r = m.profile && m.profile.classRaceSettings; if (r) for (var k in r) if (r[k]) c++; return c; }
  function specialKills(m) { return (m.unlocks && +m.unlocks.specialKills) || (m.profile && +m.profile.specialKillsTotal) || 0; }
  function isFresh(m) { return unlockedCount(m) <= 1 && growthMax(m) <= 1 && bestScore(m) === 0 && specialKills(m) === 0 && raceCount(m) === 0; }
  function summary(m, savedAt) {
    if (!m || isFresh(m)) return '기록 없음(처음 상태)';
    var t = '직업 ' + unlockedCount(m) + '개 해제 · 최고 직업 레벨 ' + growthMax(m) + ' · 최고 ' + bestScore(m).toLocaleString() + '점';
    var r = raceCount(m); if (r) t += ' · 종족 선택 ' + r + '개';
    if (savedAt) { var d = new Date(savedAt); if (!isNaN(d)) t += ' · ' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + hhmm(d); }
    return t;
  }

  /* ---------- 앱 안 브라우저(카톡·네이버·인스타 등) 감지 → 바깥 브라우저로 보내기 ---------- */
  var UA = (navigator.userAgent || '');
  var IS_KAKAO = /KAKAOTALK/i.test(UA);
  var IS_INAPP = IS_KAKAO || /NAVER\(inapp|Instagram|FBAN|FBAV|FB_IAB|\bLine\/|DaumApps|; wv\)/i.test(UA);
  var IS_ANDROID = /Android/i.test(UA), IS_IOS = /iPhone|iPad|iPod/i.test(UA);
  function go(u) { if (typeof window.__csGo === 'function') window.__csGo(u); else window.location.href = u; }
  function returnUrl() { return location.origin + location.pathname + '?cs_login=1'; }
  function copyText(t, done) {
    function fallback() { try { window.prompt('이 주소를 길게 눌러 복사한 뒤 크롬(또는 사파리)에 붙여 넣으세요', t); } catch (_) {} done(false); }
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(function () { done(true); }, fallback); return; } } catch (_) {}
    fallback();
  }

  /* ---------- 화면 ---------- */
  function build() {
    var st = document.createElement('style');
    st.textContent =
      '.btn-cloud{font-size:15px!important;font-weight:800!important;padding:9px 14px!important;border-radius:10px!important;border:2px solid #6fd18a!important;color:#fff!important;background:#1f3d2a!important;cursor:pointer;line-height:1.2}' +
      '.btn-cloud.save{border-color:#ffd54a!important;background:#3f3512!important}' +
      '.btn-cloud.on{background:#2f7d4a!important}.btn-cloud.warn{border-color:#ff9a9a!important;background:#4a1f1f!important}' +
      '#cs-float{position:fixed;left:10px;bottom:10px;z-index:9998;font-size:16px!important;padding:12px 16px!important}' +
      '#cs-panel{position:fixed;left:10px;z-index:9999;width:min(340px,calc(100vw - 20px));box-sizing:border-box;background:#1c1e2b;color:#eee;border:1px solid rgba(255,255,255,.25);border-radius:12px;padding:14px;font:14px/1.5 system-ui,sans-serif;display:none}' +
      '#cs-panel.open{display:block}#cs-panel small{color:#aab;display:block;margin-top:6px;font-size:12px;white-space:pre-line}' +
      '#cs-panel button{font:700 14px system-ui,sans-serif;margin:8px 6px 0 0;padding:10px 13px;border-radius:8px;border:1px solid rgba(255,255,255,.3);background:#2b2f45;color:#fff;cursor:pointer}' +
      '#cs-panel button.pri{background:#2f7d4a;border-color:#6fd18a}#cs-panel button.warn{background:#6a2b2b;border-color:#e08a8a}' +
      '#cs-toast{position:fixed;left:50%;bottom:70px;transform:translateX(-50%);z-index:10000;background:rgba(20,22,32,.95);color:#fff;border:1px solid #6fd18a;border-radius:999px;padding:10px 18px;font:700 14px system-ui,sans-serif;display:none;max-width:92vw;text-align:center}';
    document.head.appendChild(st);

    var slot = USE_HEADER ? document.getElementById('cloud-slot') : null;
    if (slot) {
      elLogin = document.createElement('button'); elLogin.type = 'button'; elLogin.className = 'btn-icon btn-cloud'; elLogin.id = 'cs-login';
      elSave = document.createElement('button'); elSave.type = 'button'; elSave.className = 'btn-icon btn-cloud save'; elSave.id = 'cs-save';
      elSave.textContent = '💾 중간 저장';
      slot.appendChild(elLogin); slot.appendChild(elSave);
      elLogin.addEventListener('click', togglePanel);
      elSave.addEventListener('click', manualSave);
      panel = document.createElement('div'); panel.id = 'cs-panel';
      panel.style.top = '96px';
    } else {
      elFloat = document.createElement('button'); elFloat.type = 'button'; elFloat.className = 'btn-cloud'; elFloat.id = 'cs-float';
      elFloat.addEventListener('click', togglePanel); document.body.appendChild(elFloat);
      elLogin = elFloat; panel = document.createElement('div'); panel.id = 'cs-panel'; panel.style.bottom = '70px';
    }
    statusEl = document.createElement('div'); infoEl = document.createElement('div'); actionsEl = document.createElement('div');
    panel.appendChild(statusEl); panel.appendChild(infoEl); panel.appendChild(actionsEl); document.body.appendChild(panel);
    toastEl = document.createElement('div'); toastEl.id = 'cs-toast'; document.body.appendChild(toastEl);
    render();
  }
  var toastTimer = null;
  function toast(msg) { if (!toastEl) return; toastEl.textContent = msg; toastEl.style.display = 'block'; clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.style.display = 'none'; }, 3000); }
  function openPanel() {
    if (USE_HEADER && elSave) { var r = elSave.getBoundingClientRect(); panel.style.top = Math.round(r.bottom + 8) + 'px'; }
    panel.classList.add('open');
  }
  function togglePanel() {
    if (conflict) { showConflict(); return; }
    if (panel.classList.contains('open')) panel.classList.remove('open'); else openPanel();
  }
  function mkBtn(label, cls, fn) { var b = document.createElement('button'); b.type = 'button'; b.textContent = label; if (cls) b.className = cls; b.addEventListener('click', fn); actionsEl.appendChild(b); return b; }
  function say(msg, info) { if (statusEl) statusEl.textContent = msg; if (infoEl) { infoEl.textContent = ''; if (info) { var s = document.createElement('small'); s.textContent = info; infoEl.appendChild(s); } } }
  function setLoginLabel() {
    if (!elLogin) return;
    elLogin.classList.remove('on', 'warn');
    if (!session) elLogin.textContent = USE_HEADER ? '☁ 로그인' : '☁ 로그인하고 기록 보관';
    else if (conflict) { elLogin.textContent = '☁ 기록 선택!'; elLogin.classList.add('warn'); }
    else { elLogin.textContent = USE_HEADER ? '☁ 저장 중' : '☁ 기록 보관 중'; elLogin.classList.add('on'); }
  }
  function render() {
    if (!elLogin) return;
    setLoginLabel(); actionsEl.textContent = '';
    if (!session) {
      say('로그인하면 직업·종족 기록과 중간 저장이 서버에 보관돼요.', '로그인하지 않아도 이 브라우저에는 자동으로 저장돼요(중간 저장 포함). 다른 폰이나 다른 브라우저로 이어 하려면 로그인이 필요해요.\n받는 정보: 이메일·이름(구글 계정), 게임 기록. 자세한 내용은 개인정보처리방침에 있어요.');
      mkBtn(IS_INAPP ? '구글로 로그인 (브라우저로 열기)' : '구글로 로그인', 'pri', login);
      var a = document.createElement('a'); a.href = '/privacy/'; a.target = '_blank'; a.rel = 'noopener'; a.textContent = '개인정보처리방침'; a.style.cssText = 'color:#9cf;font-size:12px;margin-left:4px';
      actionsEl.appendChild(a);
      return;
    }
    if (conflict) return;
    say('☁ 로그인됨 — 기록과 판 진행이 서버에 자동으로 보관돼요.', '창을 닫거나 10초쯤 쉬면 자동으로 저장하고, "💾 중간 저장"을 누르면 바로 저장해요.\n다른 폰에서 같은 계정으로 로그인하면 이어 할 수 있어요.');
    mkBtn('지금 저장', 'pri', function () { manualSave(); });
    mkBtn('서버에서 불러오기', '', function () { pullAsk(); });
    mkBtn('로그아웃', '', logout);
    mkBtn('서버 기록 지우기', 'warn', wipe);
  }

  /* ---------- 로그인 ---------- */
  function ensureSdk(cb) {
    if (sb) return cb(true);
    function make() { try { sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, detectSessionInUrl: true } }); cb(true); } catch (_) { cb(false); } }
    if (window.supabase && window.supabase.createClient) return make();
    var s = document.createElement('script'); s.src = CDN; s.async = true; s.onload = make;
    s.onerror = function () { say('저장 서버에 연결하지 못했어요. 게임은 그대로 할 수 있어요.'); cb(false); };
    document.head.appendChild(s);
  }
  function openOutside() {
    var url = returnUrl();
    if (IS_KAKAO) go('kakaotalk://web/openExternal?url=' + encodeURIComponent(url));
    else if (IS_ANDROID) go('intent://' + url.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end');
    actionsEl.textContent = '';
    say(IS_IOS && !IS_KAKAO ? '이 앱 안에서는 구글 로그인이 불편해요. 아래 주소를 복사해서 사파리에 붙여 넣어 주세요.' : '크롬(기본 브라우저)으로 여는 중이에요. 열리지 않으면 아래 주소 복사를 눌러 주세요.',
        '그 브라우저에서 구글 계정만 고르면 로그인이 이어져요. 게임 기록은 서버에 보관되니 사라지지 않아요.');
    var b = mkBtn('주소 복사', 'pri', function () { copyText(url, function (ok) { b.textContent = ok ? '복사했어요 ✓' : '주소 복사'; }); });
    mkBtn('닫기', '', function () { render(); });
    openPanel();
  }
  function login() {
    if (IS_INAPP) { openOutside(); return; }
    ensureSdk(function (ok) {
      if (!ok) return;
      sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } })
        .then(function (r) { if (r && r.error) say('로그인을 시작하지 못했어요. 잠시 뒤 다시 눌러 주세요.'); })
        .catch(function () { say('로그인을 시작하지 못했어요. 잠시 뒤 다시 눌러 주세요.'); });
    });
  }
  function logout() { if (!sb) return; sb.auth.signOut().then(function () { session = null; conflict = null; render(); say('로그아웃했어요. 이 기기의 기록은 그대로 있어요.'); }); }

  /* ---------- 서버 읽기·쓰기 ---------- */
  function fetchRow(game, cb) {
    sb.from('game_saves').select('data,updated_at').eq('game', game).maybeSingle()
      .then(function (r) { if (r.error) cb(false); else cb(true, r.data ? r.data.data : null, r.data ? r.data.updated_at : null); })
      .catch(function () { cb(false); });
  }
  function upsertRow(game, data, cb) {
    sb.from('game_saves').upsert({ user_id: session.user.id, game: game, data: data, updated_at: new Date().toISOString() }, { onConflict: 'user_id,game' })
      .then(function (r) { cb(!r.error); }).catch(function () { cb(false); });
  }
  function deleteRow(game, cb) {
    sb.from('game_saves').delete().eq('user_id', session.user.id).eq('game', game)
      .then(function (r) { if (cb) cb(!r.error); }).catch(function () { if (cb) cb(false); });
  }
  function pushMain(manual, cb) {
    if (!sb || !session || conflict) { if (cb) cb(false); return; }
    var m = readMain(), sig = mainSig();
    if (!m.profile && !m.unlocks && !m.scores) { if (manual) toast('저장할 기록이 아직 없어요. 한 판 해 보세요.'); if (cb) cb(true); return; }
    var data = { v: 2, profile: m.profile, unlocks: m.unlocks, scores: m.scores, difficulty: m.difficulty, lastClass: m.lastClass, savedAt: new Date().toISOString() };
    if (JSON.stringify(data).length > 48000) { say('기록이 너무 커서 서버에 올리지 못했어요.'); if (cb) cb(false); return; }
    upsertRow(GAME, data, function (ok) { if (ok) mainSeen = sig; if (cb) cb(ok); });
  }
  function pushRun(manual, cb) {
    if (!sb || !session || conflict) { if (cb) cb(false); return; }
    var run = lsGet(K.run), sig = run || '';
    if (!run) { if (runPushed) { deleteRow(GAME_RUN, function (ok) { if (ok) { runPushed = false; runSeen = ''; } if (cb) cb(ok); }); } else { runSeen = ''; if (cb) cb(true); } return; }
    if (run.length > 45000) { say('판 진행 기록이 너무 커서 서버에 올리지 못했어요.'); if (cb) cb(false); return; }
    upsertRow(GAME_RUN, { v: 2, run: run, savedAt: new Date().toISOString() }, function (ok) { if (ok) { runSeen = sig; runPushed = true; } if (cb) cb(ok); });
  }
  function manualSave() {
    if (!session) {
      toast('이 브라우저에는 자동으로 저장되고 있어요. 서버에 보관하려면 로그인해 주세요.');
      render(); openPanel(); return;
    }
    if (conflict) { showConflict(); return; }
    var done = 0, bad = 0;
    function fin(ok) { done++; if (!ok) bad++; if (done === 2) { if (bad) toast('서버 저장에 실패한 부분이 있어요. 잠시 뒤 다시 눌러 주세요.'); else toast('☁ ' + hhmm() + ' 서버에 저장했어요 (기록 + 판 진행)'); } }
    pushMain(true, fin); pushRun(true, fin);
  }

  /* ---------- 불러오기·충돌 ---------- */
  function reloadSoon(msg) { say(msg + ' 화면을 다시 불러옵니다…'); setTimeout(function () { location.reload(); }, 700); }
  function pullAsk() {
    fetchRow(GAME, function (ok, main, at) {
      if (!ok) { toast('서버 기록을 읽지 못했어요.'); return; }
      fetchRow(GAME_RUN, function (ok2, run, at2) {
        if (!main && !run) { toast('서버에 보관된 기록이 아직 없어요.'); return; }
        conflict = { manual: true, main: main, mainAt: at, run: run, runAt: at2 }; render(); showConflict();
      });
    });
  }
  function showConflict() {
    if (!conflict) return;
    var c = conflict, local = readMain();
    actionsEl.textContent = ''; openPanel(); setLoginLabel();
    var hasMain = !!(c.main && c.main.profile !== undefined);
    var lines = [];
    if (c.main) lines.push('[기록] 이 기기: ' + summary(local) + '\n서버: ' + summary(c.main, c.mainAt));
    if (c.run) lines.push('[판 진행] 서버에 하던 판이 있어요 (' + (c.runAt ? (function (d) { return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + hhmm(d); })(new Date(c.runAt)) : '시각 모름') + ')' + (lsGet(K.run) ? ' · 이 기기에도 하던 판이 있어요' : ''));
    say(c.manual ? '서버에서 무엇을 불러올까요?' : '이 기기와 서버의 기록이 달라요. 어느 쪽을 쓸까요?', lines.join('\n\n'));
    if (c.main) mkBtn(c.manual ? '서버 기록 불러오기' : '서버 기록 쓰기', 'pri', function () { applyMain(c.main); if (c.run) { backupRunOnce(); lsSet(K.run, c.run.run); } conflict = null; reloadSoon('서버 기록을 불러왔어요.'); });
    if (!c.main && c.run) mkBtn('서버의 판 이어서 하기', 'pri', function () { backupRunOnce(); lsSet(K.run, c.run.run); conflict = null; reloadSoon('서버의 판을 불러왔어요. 이어하기 단추로 계속해요.'); });
    if (c.main && !c.manual) mkBtn('이 기기 기록으로 서버 덮어쓰기', 'warn', function () { conflict = null; mainSeen = null; render(); pushMain(true, function (ok) { toast(ok ? '이 기기 기록을 서버에 저장했어요.' : '서버 저장에 실패했어요.'); }); });
    mkBtn(c.manual ? '취소' : '나중에', '', function () { if (c.manual) conflict = null; render(); panel.classList.remove('open'); });
  }
  function backupRunOnce() { var cur = lsGet(K.run); if (cur) lsSet(BAK + '_run', cur); }

  function firstSync() {
    fetchRow(GAME, function (ok, main, at) {
      if (!ok) { toast('서버 기록을 읽지 못했어요. 게임은 그대로 할 수 있어요.'); return; }
      fetchRow(GAME_RUN, function (ok2, run, at2) {
        var local = readMain(), localRun = lsGet(K.run);
        var needMain = false, needRun = false;
        if (main) {
          var same = sameMain(local, main);
          if (isFresh(local)) { applyMain(main); needRun = false; if (run && !localRun) lsSet(K.run, run.run); reloadSoon('서버 기록을 불러왔어요.'); return; }
          if (!same) needMain = true;
        } else if (!isFresh(local)) { mainSeen = null; }   // 서버에 아직 없음 → 아래 자동 저장이 올린다
        if (run && run.run && run.run !== localRun) needRun = true;
        if (needMain || (needRun && localRun)) { conflict = { manual: false, main: needMain ? main : null, mainAt: at, run: needRun ? run : null, runAt: at2 }; render(); showConflict(); return; }
        if (needRun && !localRun) { conflict = { manual: false, main: null, run: run, runAt: at2 }; render(); showConflict(); return; }
        mainSeen = null; runSeen = null; render(); toast('☁ 로그인됐어요. 기록이 자동으로 서버에 보관돼요.');
      });
    });
  }

  function wipe() {
    if (!window.confirm('서버에 보관된 이 게임 기록(판 진행 포함)을 지울까요? (이 기기의 기록은 그대로 남아요)')) return;
    deleteRow(GAME, function (a) { deleteRow(GAME_RUN, function (b) { runPushed = false; toast(a && b ? '서버 기록을 지웠어요.' : '지우지 못한 부분이 있어요.'); }); });
  }

  /* ---------- 변화 감시 ---------- */
  function watch() {
    setInterval(function () {
      if (!session || conflict) return;
      var sig = mainSig();
      if (mainSeen === null || sig !== mainSeen) { clearTimeout(mainTimer); mainTimer = setTimeout(function () { pushMain(false); }, 3000); }
      var run = lsGet(K.run) || '';
      if (run !== runSeen) { clearTimeout(runTimer); runTimer = setTimeout(function () { pushRun(false); }, 8000); }
    }, 4000);
    function flush() { if (!session || conflict) return; if (mainSig() !== mainSeen) pushMain(false); if ((lsGet(K.run) || '') !== runSeen) pushRun(false); }
    document.addEventListener('visibilitychange', function () { if (document.hidden) flush(); });
    window.addEventListener('pagehide', flush);
  }

  function onSession(s) {
    var was = session; session = s || null;
    if (session && !was) { render(); firstSync(); }
    else if (!session && was) render();
  }

  function start() {
    build(); watch();
    var auto = /[?&]cs_login=1(&|$)/.test(location.search);
    if (auto) { try { history.replaceState(null, '', location.pathname + location.hash); } catch (_) {} }
    var back = /[?&#](code|access_token)=/.test(location.search + location.hash);
    if (auto && !IS_INAPP && !lsGet(TOKEN_KEY)) { setTimeout(login, 300); return; }
    if (!lsGet(TOKEN_KEY) && !back) return;
    ensureSdk(function (ok) {
      if (!ok) return;
      sb.auth.onAuthStateChange(function (_e, s) { onSession(s); });
      sb.auth.getSession().then(function (r) { onSession(r && r.data ? r.data.session : null); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
