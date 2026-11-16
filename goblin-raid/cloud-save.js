/* 고블린 레이드 클라우드 저장 (2026-11-16)
 * 구글 로그인(게시판과 같은 Supabase 계정)으로 영구 기록(goblin_raid_profile_v1)을 서버에 보관·복원한다.
 * - 로그인하지 않으면 아무것도 하지 않는다(지금처럼 브라우저 저장으로 그대로 게임).
 * - 로그인 흔적이 없는 방문자는 Supabase 코드를 불러오지도 않는다(느려지지 않게).
 * - 게임 코드(game.js)는 건드리지 않고, 저장 칸(localStorage)만 지켜본다.
 * - 서버에는 이메일을 저장하지 않는다(사용자 번호 uid만). 표: public.game_saves (게시판/supabase-patch-06-game-saves.sql)
 */
(function () {
  'use strict';
  var SB_URL = 'https://houqpzuwbdmzhkdruxmo.supabase.co';
  var SB_KEY = 'sb_publishable_9GjdOgkxZZquoKwhePNSUw_LaWdckts'; // 공개용 키(게시판 config.js와 같음)
  var CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  var GAME = 'goblin_raid';
  var PKEY = 'goblin_raid_profile_v1';
  var BAK = 'goblin_raid_profile_v1_cloudbak';
  var TOKEN_KEY = 'sb-houqpzuwbdmzhkdruxmo-auth-token';

  var sb = null, session = null, lastSeen = null, pushTimer = null, conflict = false, busy = false, pending = null;
  var btn, panel, statusEl, actionsEl, infoEl;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (_) { return false; } }
  function parse(s) { try { var o = JSON.parse(s); return o && typeof o === 'object' ? o : null; } catch (_) { return null; } }
  function hhmm(d) { d = d || new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }

  function isFresh(p) {
    if (!p) return true;
    var noScores = !Array.isArray(p.highScores) || p.highScores.length === 0;
    var fewClasses = !Array.isArray(p.unlockedClasses) || p.unlockedClasses.length <= 1;
    return noScores && fewClasses && !(p.specialKills > 0);
  }
  function summary(p) {
    if (!p) return '기록 없음';
    var best = Array.isArray(p.highScores) && p.highScores[0] ? Number(p.highScores[0].score || 0).toLocaleString() + '점' : '점수 없음';
    var n = Array.isArray(p.unlockedClasses) ? p.unlockedClasses.length : 1;
    var when = p.updatedAt ? new Date(p.updatedAt) : null;
    var ts = when && !isNaN(when) ? (when.getMonth() + 1) + '/' + when.getDate() + ' ' + hhmm(when) : '시각 모름';
    return '직업 ' + n + '개 해제 · 최고 ' + best + ' · ' + ts;
  }


  /* ---------- 앱 안 브라우저(카톡·네이버·인스타 등) 감지 → 바깥 브라우저로 보내기 ---------- */
  var UA = (navigator.userAgent || '');
  var IS_KAKAO = /KAKAOTALK/i.test(UA);
  var IS_INAPP = IS_KAKAO || /NAVER\(inapp|Instagram|FBAN|FBAV|FB_IAB|\bLine\/|DaumApps|Whale\/.*Mobile.*inapp|; wv\)/i.test(UA);
  var IS_ANDROID = /Android/i.test(UA);
  var IS_IOS = /iPhone|iPad|iPod/i.test(UA);
  function go(u) { if (typeof window.__csGo === 'function') window.__csGo(u); else window.location.href = u; }
  function returnUrl() { return location.origin + location.pathname + '?cs_login=1'; }
  function copyText(t, done) {
    function fallback() { try { window.prompt('이 주소를 길게 눌러 복사한 뒤 크롬(또는 사파리)에 붙여 넣으세요', t); } catch (_) {} done(false); }
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(function () { done(true); }, fallback); return; } } catch (_) {}
    fallback();
  }
  function openOutside() {
    var url = returnUrl();
    if (IS_KAKAO) go('kakaotalk://web/openExternal?url=' + encodeURIComponent(url));
    else if (IS_ANDROID) go('intent://' + url.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end');
    // 아이폰의 카톡 밖 앱은 바깥 브라우저를 강제로 열 수 없다 → 아래 안내만 보여 준다
    actionsEl.textContent = '';
    say(IS_IOS && !IS_KAKAO ? '이 앱 안에서는 구글 로그인이 불편해요. 아래 주소를 복사해서 사파리에 붙여 넣어 주세요.' : '크롬(기본 브라우저)으로 여는 중이에요. 열리지 않으면 아래 주소 복사를 눌러 주세요.',
        '그 브라우저에서 구글 계정만 고르면 로그인이 이어져요. 게임 기록은 서버에 보관되니 사라지지 않아요.');
    var b = mkBtn('주소 복사', 'pri', function () { copyText(url, function (ok) { b.textContent = ok ? '복사했어요 ✓' : '주소 복사'; }); });
    mkBtn('닫기', '', function () { render(); });
    panel.classList.add('open');
  }

  /* ---------- 화면 ---------- */
  function build() {
    var st = document.createElement('style');
    st.textContent =
      '#cs-btn{position:fixed;left:10px;bottom:10px;z-index:9998;font:600 12px/1 system-ui,sans-serif;color:#fff;background:rgba(30,32,44,.82);border:1px solid rgba(255,255,255,.28);border-radius:999px;padding:9px 12px;cursor:pointer;backdrop-filter:blur(4px)}' +
      '#cs-btn.on{border-color:#6fd18a}' +
      '#cs-panel{position:fixed;left:10px;bottom:48px;z-index:9999;width:min(320px,calc(100vw - 20px));box-sizing:border-box;background:#1c1e2b;color:#eee;border:1px solid rgba(255,255,255,.25);border-radius:12px;padding:14px;font:14px/1.5 system-ui,sans-serif;display:none}' +
      '#cs-panel.open{display:block}' +
      '#cs-panel b{color:#ffd54a}#cs-panel small{color:#aab;display:block;margin-top:6px;font-size:12px}' +
      '#cs-panel button{font:600 13px system-ui,sans-serif;margin:8px 6px 0 0;padding:9px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.3);background:#2b2f45;color:#fff;cursor:pointer}' +
      '#cs-panel button.pri{background:#2f7d4a;border-color:#6fd18a}#cs-panel button.warn{background:#6a2b2b;border-color:#e08a8a}';
    document.head.appendChild(st);
    btn = document.createElement('button');
    btn.id = 'cs-btn'; btn.type = 'button';
    btn.addEventListener('click', function () {
      if (conflict && pending) { resolve(pending.local, pending.remote, pending.manual); return; }
      panel.classList.toggle('open');
    });
    document.body.appendChild(btn);
    panel = document.createElement('div');
    panel.id = 'cs-panel';
    statusEl = document.createElement('div');
    infoEl = document.createElement('div');
    actionsEl = document.createElement('div');
    panel.appendChild(statusEl); panel.appendChild(infoEl); panel.appendChild(actionsEl);
    document.body.appendChild(panel);
    render();
  }
  function mkBtn(label, cls, fn) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = label;
    if (cls) b.className = cls;
    b.addEventListener('click', fn); actionsEl.appendChild(b); return b;
  }
  function say(msg, info) { if (statusEl) statusEl.textContent = msg; if (infoEl) { infoEl.textContent = ''; if (info) { var s = document.createElement('small'); s.textContent = info; infoEl.appendChild(s); } } }
  function render() {
    if (!btn) return;
    actionsEl.textContent = '';
    if (!session) {
      btn.textContent = '☁ 로그인하고 기록 보관';
      btn.className = '';
      say('로그인하면 직업·종족 기록이 서버에 보관돼요.', '게임은 로그인 없이도 그대로 할 수 있어요. 받는 정보: 이메일·이름(구글 계정), 게임 기록. 자세한 내용은 개인정보처리방침에 있어요.');
      mkBtn(IS_INAPP ? '구글로 로그인 (브라우저로 열기)' : '구글로 로그인', 'pri', login);
      var a = document.createElement('a'); a.href = '/privacy/'; a.target = '_blank'; a.rel = 'noopener'; a.textContent = '개인정보처리방침'; a.style.cssText = 'color:#9cf;font-size:12px;margin-left:4px';
      actionsEl.appendChild(a);
      return;
    }
    btn.textContent = conflict ? '☁ 기록 선택 필요' : '☁ 기록 보관 중';
    btn.className = conflict ? '' : 'on';
    if (conflict) return; // 충돌 안내는 resolve()가 그린다
    mkBtn('지금 저장', 'pri', function () { push(true); });
    mkBtn('서버에서 불러오기', '', function () { pullAsk(); });
    mkBtn('로그아웃', '', logout);
    mkBtn('서버 기록 지우기', 'warn', wipe);
  }

  /* ---------- 로그인 ---------- */
  function ensureSdk(cb) {
    if (sb) return cb(true);
    function make() {
      try {
        sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, detectSessionInUrl: true } });
        cb(true);
      } catch (_) { cb(false); }
    }
    if (window.supabase && window.supabase.createClient) return make();
    var s = document.createElement('script'); s.src = CDN; s.async = true;
    s.onload = make;
    s.onerror = function () { say('저장 서버에 연결하지 못했어요. 게임은 그대로 할 수 있어요.'); cb(false); };
    document.head.appendChild(s);
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
  function logout() {
    if (!sb) return;
    sb.auth.signOut().then(function () { session = null; conflict = false; render(); say('로그아웃했어요. 이 기기의 기록은 그대로 있어요.'); });
  }

  /* ---------- 서버 읽기·쓰기 ---------- */
  function fetchRemote(cb) {
    sb.from('game_saves').select('data,updated_at').eq('game', GAME).maybeSingle()
      .then(function (r) { if (r.error) { say('서버 기록을 읽지 못했어요. 잠시 뒤 다시 해 주세요.'); cb(false); } else cb(true, r.data); })
      .catch(function () { say('서버 기록을 읽지 못했어요.'); cb(false); });
  }
  function push(manual) {
    if (!sb || !session || conflict || busy) return;
    var raw = lsGet(PKEY); var p = parse(raw);
    if (!p) { if (manual) say('저장할 기록이 아직 없어요. 한 판 해 보세요.'); return; }
    if (raw.length > 50000) { say('기록이 너무 커서 서버에 올리지 못했어요.'); return; }
    busy = true;
    sb.from('game_saves').upsert({ user_id: session.user.id, game: GAME, data: p, updated_at: new Date().toISOString() }, { onConflict: 'user_id,game' })
      .then(function (r) {
        busy = false;
        if (r.error) { say('서버 저장에 실패했어요. 잠시 뒤 자동으로 다시 해요.'); lastSeen = null; return; }
        lastSeen = raw; say('☁ ' + hhmm() + ' 서버에 저장했어요.', summary(p));
      }).catch(function () { busy = false; lastSeen = null; say('서버 저장에 실패했어요.'); });
  }
  function applyRemote(remote) {
    var cur = lsGet(PKEY); if (cur) lsSet(BAK, cur); // 덮어쓰기 전 이 기기 기록은 백업 칸에 남긴다
    if (lsSet(PKEY, JSON.stringify(remote))) { say('서버 기록을 불러왔어요. 화면을 다시 불러옵니다…'); setTimeout(function () { location.reload(); }, 600); }
    else say('이 기기에 기록을 쓰지 못했어요(저장 공간 막힘).');
  }
  function pullAsk() {
    fetchRemote(function (ok, row) {
      if (!ok) return;
      if (!row || !row.data) { say('서버에 보관된 기록이 아직 없어요.'); return; }
      conflict = true; render(); resolve(parse(lsGet(PKEY)), row.data, true);
    });
  }
  function wipe() {
    if (!window.confirm('서버에 보관된 이 게임 기록을 지울까요? (이 기기의 기록은 그대로 남아요)')) return;
    sb.from('game_saves').delete().eq('user_id', session.user.id).eq('game', GAME)
      .then(function (r) { say(r.error ? '지우지 못했어요. 잠시 뒤 다시 해 주세요.' : '서버 기록을 지웠어요.'); });
  }

  /* 두 기록이 다를 때 사용자가 고른다(자동으로 덮어쓰지 않는다) */
  function resolve(local, remote, manual) {
    pending = { local: local, remote: remote, manual: manual };
    actionsEl.textContent = '';
    panel.classList.add('open');
    say('이 기기와 서버의 기록이 달라요. 어느 쪽을 쓸까요?', '이 기기: ' + summary(local) + '\n서버: ' + summary(remote));
    infoEl.firstChild.style.whiteSpace = 'pre-line';
    mkBtn('서버 기록 쓰기', 'pri', function () { conflict = false; pending = null; applyRemote(remote); });
    mkBtn('이 기기 기록으로 서버 덮어쓰기', 'warn', function () { conflict = false; pending = null; render(); lastSeen = null; push(true); });
    mkBtn('나중에', '', function () { if (manual) { conflict = false; pending = null; } render(); panel.classList.remove('open'); });
  }

  function firstSync() {
    fetchRemote(function (ok, row) {
      if (!ok) return;
      var raw = lsGet(PKEY), local = parse(raw), remote = row && row.data ? row.data : null;
      if (!remote) { if (local && !isFresh(local)) push(false); else say('로그인됐어요. 한 판 하면 자동으로 보관돼요.'); render(); return; }
      if (!local || isFresh(local)) { applyRemote(remote); return; }
      if (JSON.stringify(local) === JSON.stringify(remote) || local.updatedAt === remote.updatedAt) { lastSeen = raw; say('☁ 서버와 같은 기록이에요.', summary(local)); render(); return; }
      conflict = true; render(); resolve(local, remote, false);
    });
  }

  /* ---------- 변화 감시: 기록이 바뀌면 3초 뒤 자동 저장 ---------- */
  function watch() {
    setInterval(function () {
      if (!session || conflict) return;
      var raw = lsGet(PKEY);
      if (raw && raw !== lastSeen) { clearTimeout(pushTimer); pushTimer = setTimeout(function () { push(false); }, 3000); }
    }, 4000);
    document.addEventListener('visibilitychange', function () { if (document.hidden && session && !conflict) { var raw = lsGet(PKEY); if (raw && raw !== lastSeen) push(false); } });
  }

  function onSession(s) {
    var was = session; session = s || null;
    if (session && !was) { render(); firstSync(); }
    else if (!session && was) { render(); }
  }

  function start() {
    build(); watch();
    var auto = /[?&]cs_login=1(&|$)/.test(location.search);
    if (auto) { try { history.replaceState(null, '', location.pathname + location.hash); } catch (_) {} }
    // 로그인 흔적(저장된 토큰이나 로그인 돌아오는 주소)이 있을 때만 SDK를 미리 불러온다
    var back = /[?&#](code|access_token)=/.test(location.search + location.hash);
    if (auto && !IS_INAPP && !lsGet(TOKEN_KEY)) { setTimeout(login, 300); return; } // 바깥 브라우저로 넘어온 경우: 바로 구글 로그인 시작
    if (!lsGet(TOKEN_KEY) && !back) return;
    ensureSdk(function (ok) {
      if (!ok) return;
      sb.auth.onAuthStateChange(function (_e, s) { onSession(s); });
      sb.auth.getSession().then(function (r) { onSession(r && r.data ? r.data.session : null); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
