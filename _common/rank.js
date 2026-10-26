// 게임 쪽 아래에 붙는 "순위표" 카드. common.js가 RANKS에 있는 게임에서만 불러온다.
// 내 최고 기록은 게임이 이 기기에 저장해 둔 값(zw_<게임>_best)을 읽는다. 올릴 때는 닉네임과 점수만 보낸다.
// 서버 주소(ZW.RANK_API)가 비어 있으면 카드를 아예 만들지 않는다.
(function () {
  var cfg = ZW.RANKS[ZW.RANK_GAME];
  var API = ZW.RANK_API;
  if (!cfg || !API) return;

  var gameId = ZW.RANK_GAME;
  var lsGet = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (n) { return Number(n).toLocaleString('ko-KR') + cfg.unit; };

  // 슬라이드 퍼즐처럼 한 게임에 기록이 둘이면 보고 있는 쪽의 것을 읽는다
  var variants = cfg.variants || null;
  var current = function () {
    if (!variants) return { id: gameId, key: cfg.key || ('zw_' + gameId + '_best') };
    var v = variants[ZW.rankVariant ? ZW.rankVariant() : 0] || variants[0];
    return { id: v.id, key: v.key };
  };

  var sec = document.createElement('section');
  sec.className = 'wrap zw-rank';
  sec.innerHTML = '<h2>🏆 순위표 <small>' + esc(cfg.label) + '</small></h2>'
    + '<div class="rk-tabs"></div>'
    + '<ol class="rk-list"><li class="rk-wait">불러오는 중…</li></ol>'
    + '<div class="rk-mine"></div>'
    + '<div class="rk-form"><input class="rk-name" type="text" maxlength="8" placeholder="닉네임 (한글·영문·숫자 2~8자)" aria-label="닉네임" autocomplete="off">'
    + '<button type="button" class="rk-go">내 기록 올리기</button></div>'
    + '<p class="rk-msg" role="status"></p>'
    + '<p class="rk-note">닉네임과 점수만 올라갑니다. 이름·전화번호 같은 개인정보는 적지 마세요. 점수는 재미로 보는 참고용이라 조작될 수 있고, 이상한 닉네임은 지울 수 있습니다.</p>';
  var more = document.querySelector('section.more');
  if (more) more.parentNode.insertBefore(sec, more); else document.body.insertBefore(sec, document.querySelector('.zw-foot'));

  var $ = function (s) { return sec.querySelector(s); };
  var list = $('.rk-list'), mine = $('.rk-mine'), nameEl = $('.rk-name'), go = $('.rk-go'), msg = $('.rk-msg'), tabs = $('.rk-tabs');
  nameEl.value = lsGet('zw_nick') || '';

  // ── 맨 위 1·2·3등(제목 옆, 작게)과 "새로 하기" 옆 순위표 올리기 바로가기 (2026-10-26 사용자 요청) ──
  var st = document.createElement('style');
  st.textContent = '.zw-t3-top{display:inline-block;margin-left:10px;vertical-align:middle;font-size:12px;font-weight:600;line-height:1.4;font-style:normal;color:var(--sub)}'
    + '.zw-t3-top em{font-style:normal;margin-right:8px;white-space:nowrap}'
    + '.zw-rk-jump{grid-column:1/-1;flex:1 1 100%;width:100%;box-sizing:border-box;margin:8px 0 0;font:inherit;font-size:15px;font-weight:800;padding:0 14px;min-height:48px;border-radius:12px;border:1.5px solid var(--red);background:var(--soft);color:var(--red);cursor:pointer}'
    + '.zw-rank.flash{outline:3px solid var(--red);outline-offset:4px;transition:outline-color .6s}'
    + '.zw-t10-btn{text-decoration:none;white-space:nowrap;font-size:11px;font-weight:700;color:var(--red);cursor:pointer;padding:2px 8px;border-radius:8px;background:var(--soft)}'
    + '.zw-t10p{margin:8px 0 0;padding:8px 12px;border-radius:12px;background:var(--fill);font-size:12px;font-weight:500;line-height:1.55;color:var(--ink);max-width:340px}'
    + '.zw-t10p ol{list-style:none;margin:0;padding:0} .zw-t10p li{display:flex;gap:6px;white-space:nowrap;overflow:hidden}'
    + '.zw-t10p li i{font-style:normal;width:18px;color:var(--sub);flex:none} .zw-t10p li span{flex:1;overflow:hidden;text-overflow:ellipsis} .zw-t10p li b{font-weight:700}';
  document.head.appendChild(st);
  var MEDAL = ['🥇', '🥈', '🥉'];
  var h1 = document.querySelector('main h1') || document.querySelector('h1');
  var topEl = document.createElement('span');
  topEl.className = 'zw-t3-top';
  topEl.textContent = '';
  if (h1) h1.appendChild(topEl);
  var lastTop = [], boxP = null;
  function boxHtml() {
    return lastTop.length ? '<ol>' + lastTop.map(function (t, k) { return '<li><i>' + (k + 1) + '</i><span>' + esc(t.name) + '</span><b>' + esc(fmt(t.score)) + '</b></li>'; }).join('') + '</ol>' : '아직 기록이 없어요';
  }
  function paintTop(top) {
    lastTop = top || [];
    var v = variants ? (variants[ZW.rankVariant ? ZW.rankVariant() : 0] || variants[0]) : null;
    topEl.innerHTML = (lastTop.length ? lastTop.slice(0, 3).map(function (t, k) { return '<em>' + MEDAL[k] + esc(t.name) + ' ' + esc(fmt(t.score)) + '</em>'; }).join('') + (v ? '<em style="opacity:.7">· ' + esc(v.name) + '</em>' : '') : '<em style="opacity:.75">🥇 첫 기록에 도전!</em>')
      + '<u class="zw-t10-btn" role="button" tabindex="0">' + (boxP ? '10등 ▴' : '10등 ▾') + '</u>';
    if (boxP) boxP.innerHTML = boxHtml();
  }
  // 작은 "10등 ▾" 아이콘 단추: 누르면 제목 아래에 10등까지, 다시 누르면 접힘
  function toggleP(e) {
    var u = e.target.closest ? e.target.closest('.zw-t10-btn') : null;
    if (!u) return;
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (boxP) { boxP.remove(); boxP = null; u.textContent = '10등 ▾'; return; }
    boxP = document.createElement('div');
    boxP.className = 'zw-t10p';
    boxP.innerHTML = boxHtml();
    if (h1 && h1.parentNode) h1.parentNode.insertBefore(boxP, h1.nextSibling);
    u.textContent = '10등 ▴';
  }
  topEl.addEventListener('click', toggleP);
  topEl.addEventListener('keydown', toggleP);
  // 새로 하기(또는 다시 하기·게임 시작) 단추 바로 옆. 올릴 기록이 있을 때만 보인다
  var anchorBtn = document.getElementById('btnReset') || document.getElementById('btnRestart') || document.getElementById('btnMain');
  var jump = null;
  if (anchorBtn) {
    jump = document.createElement('button');
    jump.type = 'button';
    jump.className = 'zw-rk-jump';
    jump.textContent = '🏆 순위표 올리기';
    jump.style.display = 'none';
    anchorBtn.parentNode.insertBefore(jump, anchorBtn.nextSibling);
    jump.addEventListener('click', function () {
      sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      sec.classList.add('flash');
      setTimeout(function () { sec.classList.remove('flash'); }, 1800);
      setTimeout(function () { try { nameEl.focus({ preventScroll: true }); } catch (e) {} }, 450);
    });
  }

  if (variants) {
    tabs.innerHTML = variants.map(function (v, i) { return '<button type="button" data-i="' + i + '">' + esc(v.name) + '</button>'; }).join('');
    tabs.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; ZW.rankPick = Number(b.getAttribute('data-i')); load(); paint(); });
  } else tabs.style.display = 'none';
  if (variants) ZW.rankVariant = function () { return ZW.rankPick || 0; };

  function myBest() {
    var raw = lsGet(current().key), v = parseInt(raw, 10);
    if (!isFinite(v) && raw) { try { v = Number(JSON.parse(raw).moves); } catch (e) { v = NaN; } }   // 짝 맞추기는 {moves, sec}로 저장한다
    return isFinite(v) ? v : null;
  }
  function sentKey() { return 'zw_rank_sent_' + current().id; }

  function paint() {
    var b = myBest(), cur = current();
    if (variants) Array.prototype.forEach.call(tabs.children, function (x, i) { x.className = (i === (ZW.rankPick || 0)) ? 'on' : ''; });
    mine.innerHTML = b === null ? '게임을 한 판 하면 내 최고 기록이 여기에 보여요.' : '내 최고 기록: <b>' + fmt(b) + '</b>';
    var sent = parseInt(lsGet(sentKey()), 10);
    var already = b !== null && isFinite(sent) && (cfg.better === 'high' ? sent >= b : sent <= b);
    go.disabled = b === null || already;
    go.textContent = already ? '올렸어요' : '내 기록 올리기';
    if (jump) jump.style.display = go.disabled ? 'none' : '';
  }

  function load(fresh) {
    var cur = current();
    fetch(API.replace(/\/$/, '') + '/api/rank?game=' + encodeURIComponent(cur.id) + (fresh ? '&t=' + Date.now() : '')).then(function (r) { return r.json(); }).then(function (d) {
      paintTop(d.top);
      if (!d.top || !d.top.length) { list.innerHTML = '<li class="rk-wait">아직 기록이 없어요. 첫 번째가 되어 보세요!</li>'; return; }
      list.innerHTML = d.top.map(function (t, i) { return '<li><span class="n">' + (i + 1) + '</span><span class="nm">' + esc(t.name) + '</span><b>' + fmt(t.score) + '</b></li>'; }).join('');
    }).catch(function () { list.innerHTML = '<li class="rk-wait">순위표를 불러오지 못했어요. 잠시 뒤에 다시 열어 주세요.</li>'; });
  }

  go.addEventListener('click', function () {
    var b = myBest(), cur = current(), nick = nameEl.value.trim();
    if (b === null) return;
    if (!/^[가-힣A-Za-z0-9_]{2,8}$/.test(nick)) { msg.textContent = '닉네임은 한글·영문·숫자·밑줄로 2~8자만 쓸 수 있어요.'; return; }
    go.disabled = true; msg.textContent = '올리는 중…';
    fetch(API.replace(/\/$/, '') + '/api/rank', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game: cur.id, name: nick, score: b }) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (x) {
        if (x.ok) { lsSet('zw_nick', nick); lsSet(sentKey(), String(b)); msg.textContent = '올렸어요! 지금 ' + x.d.rank + '등입니다.'; load(true); }
        else msg.textContent = (x.d && x.d.error) || '올리지 못했어요.';
        paint();
      }).catch(function () { msg.textContent = '연결이 안 돼요. 잠시 뒤에 다시 해 주세요.'; paint(); });
  });

  paint(); load();
  // 게임에서 새 기록이 나오면(같은 쪽에서 저장하므로 이벤트가 없다) 가볍게 다시 읽는다
  setInterval(paint, 1500);
})();
