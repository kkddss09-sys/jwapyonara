// 옆에서 밀려 나오는 사이드바 — 분류 > 묶음 > 도구 순서의 계층 목록(2026-10-26 사용자 요청).
// common.js가 불러온다. 목록은 common.js의 TOOLS(만들어진 것만)에서 만들므로 도구를 더해도 이 파일은 안 고친다.
// 분류 덩어리와 묶음 덩어리는 조각이라 순서를 바꿀 수 있다 — "순서 바꾸기"를 누르면 ▲▼ 또는 끌어서 옮기고, 이 기기에만 기억한다.
(function () {
  if (typeof TOOLS === 'undefined' || document.querySelector('.zw-side')) return;
  var me = document.currentScript && document.currentScript.src;
  var ROOT = me ? me.slice(0, me.indexOf('_common/')) : '/';
  var KEY = 'zw-side-v1';
  var store = {
    get: function () { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } },
    set: function (o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* 저장이 막힌 브라우저에서는 이번 방문에만 */ } }
  };
  var st = store.get();
  st.order = st.order || { cats: [], groups: {} };   // 바꾼 순서. 없으면 TOOLS에 적힌 순서
  st.opened = st.opened || {};                        // 펼쳐 둔 덩어리(처음에는 모두 접힌 상태)

  var css = '.zw-side-btn{font:inherit;font-size:20px;line-height:1;background:none;border:none;color:var(--ink);cursor:pointer;padding:6px 10px 6px 0;margin-right:2px}'
    + '.zw-side-btn:focus-visible,.zw-side button:focus-visible,.zw-side a:focus-visible{outline:2px solid var(--red);outline-offset:2px}'
    + '.zw-side-tab{position:fixed;left:0;top:42%;z-index:40;border:1px solid var(--line);border-left:none;background:var(--card);color:var(--sub);font:inherit;font-size:13px;font-weight:700;padding:14px 6px;border-radius:0 12px 12px 0;cursor:pointer;writing-mode:vertical-rl;box-shadow:0 2px 8px rgba(0,0,0,.12)}'
    + '.zw-side-tab:hover{color:var(--red)}'
    + '@media (max-width:640px){.zw-side-tab{display:none}}'
    + '.zw-side-wrap{position:fixed;inset:0;z-index:90;visibility:hidden;transition:visibility 0s .25s}'
    + '.zw-side-wrap.open{visibility:visible;transition:none}'
    + '.zw-side-dim{position:absolute;inset:0;background:rgba(0,0,0,.45);opacity:0;transition:opacity .25s}'
    + '.zw-side-wrap.open .zw-side-dim{opacity:1}'
    + '.zw-side{position:absolute;left:0;top:0;bottom:0;width:min(88vw,340px);background:var(--card);color:var(--ink);border-right:1px solid var(--line);display:flex;flex-direction:column;transform:translateX(-102%);transition:transform .25s ease;box-shadow:4px 0 24px rgba(0,0,0,.2)}'
    + '.zw-side-wrap.open .zw-side{transform:none}'
    + '@media (prefers-reduced-motion:reduce){.zw-side,.zw-side-dim{transition:none}}'
    + '.zw-side-top{display:flex;align-items:center;justify-content:space-between;padding:14px 14px 8px}'
    + '.zw-side-top b{font-size:17px}.zw-side-top b i{font-style:normal;color:var(--red)}'
    + '.zw-side-x{font:inherit;font-size:18px;background:none;border:none;color:var(--sub);cursor:pointer;padding:4px 8px}'
    + '.zw-side-q{margin:0 14px 8px;padding:10px 12px;font:inherit;font-size:14px;border:1px solid var(--line);border-radius:10px;background:var(--fill);color:var(--ink)}'
    + '.zw-side-bar{display:flex;gap:6px;padding:0 14px 8px;flex-wrap:wrap}'
    + '.zw-side-bar button{font:inherit;font-size:12.5px;font-weight:600;border:1px solid var(--line);background:var(--card);color:var(--sub);border-radius:999px;padding:5px 11px;cursor:pointer}'
    + '.zw-side-bar button[hidden]{display:none}'
    + '.zw-side-bar button.on{background:var(--panel);border-color:var(--panel);color:#fff}'
    + '.zw-side-body{flex:1;overflow-y:auto;padding:0 10px 24px;overscroll-behavior:contain}'
    + '.zw-blk{margin:4px 0;border-radius:12px}'
    + '.zw-blk.drag{opacity:.4}.zw-blk.over{outline:2px dashed var(--red);outline-offset:-2px}'
    + '.zw-cat-h,.zw-grp-h{display:flex;align-items:center;gap:6px}'
    + '.zw-cat-h>.tg{flex:1;display:flex;align-items:center;gap:8px;text-align:left;font:inherit;font-size:15px;font-weight:800;color:var(--ink);background:none;border:none;border-radius:10px;padding:10px 8px;cursor:pointer}'
    + '.zw-cat-h>.tg:hover,.zw-grp-h>.tg:hover{background:var(--fill)}'
    + '.zw-cat-h .n,.zw-grp-h .n{margin-left:auto;font-size:12px;font-weight:600;color:var(--sub)}'
    + '.zw-car{display:inline-block;transition:transform .15s;font-size:11px;color:var(--sub)}'
    + '.zw-blk.shut>.zw-cat-h .zw-car,.zw-blk.shut>.zw-grp-h .zw-car{transform:rotate(-90deg)}'
    + '.zw-blk.shut>.zw-kids{display:none}'
    + '.zw-kids{margin:0 0 6px 14px;padding-left:8px;border-left:2px solid var(--line)}'
    + '.zw-grp-h>.tg{flex:1;display:flex;align-items:center;gap:6px;text-align:left;font:inherit;font-size:13px;font-weight:700;color:var(--sub);background:none;border:none;border-radius:8px;padding:7px 6px;cursor:pointer}'
    + '.zw-kids a.t{display:block;font-size:14px;font-weight:600;color:var(--ink);text-decoration:none;padding:7px 9px;border-radius:8px;line-height:1.35}'
    + '.zw-kids a.t:hover{background:var(--fill)}'
    + '.zw-kids a.t.on{background:var(--soft);color:var(--red)}'
    + '.zw-kids a.t small{display:block;font-size:12px;font-weight:500;color:var(--sub)}'
    + '.zw-kids a.zw-hub{font-size:13px;font-weight:700;color:var(--red)}'
    + '.zw-mv{display:none;gap:2px;flex:none}'
    + '.zw-side.edit .zw-mv{display:inline-flex}'
    + '.zw-mv button{font:inherit;font-size:12px;border:1px solid var(--line);background:var(--card);color:var(--sub);border-radius:6px;width:26px;height:26px;cursor:pointer;padding:0}'
    + '.zw-mv .gp{cursor:grab}'
    + '.zw-side.edit .zw-blk{background:var(--fill)}'
    + '.zw-none{padding:18px 12px;color:var(--sub);font-size:14px}'
    + '.zw-dot{color:var(--red);font-size:10px;margin-left:2px}'
    + '.zw-side [hidden]{display:none !important}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var sortBy = function (arr, saved) {   // 저장한 순서를 앞에 두고, 새로 생긴 것은 원래 순서로 뒤에
    var out = (saved || []).filter(function (k) { return arr.indexOf(k) >= 0; });
    arr.forEach(function (k) { if (out.indexOf(k) < 0) out.push(k); });
    return out;
  };
  var here = location.href.split(/[?#]/)[0];
  var hereCat = '', hereGrp = '';   // 지금 보고 있는 곳(분류·묶음) — 줄 옆에 ● 표시
  TOOLS.forEach(function (t) { if (t[0] && here === ROOT + t[0] + '/index.html') { hereCat = t[3]; hereGrp = t[5] || '기타'; } });
  CATS.forEach(function (c) { if (!hereCat && CAT_PATH[c] && (here === ROOT + CAT_PATH[c] + '/index.html' || here === ROOT + CAT_PATH[c] + '/')) hereCat = c; });
  var hereDot = '<span class="zw-dot" title="지금 보고 있는 곳">●</span>';
  var keyOf = function (b) { return (b.getAttribute('data-kind') === 'cat' ? 'c:' : 'g:' + b.getAttribute('data-cat') + '/') + b.getAttribute('data-key'); };
  var mv = function () {
    return '<span class="zw-mv"><button type="button" class="gp" draggable="true" aria-label="끌어서 옮기기" title="끌어서 옮기기">⠿</button>'
      + '<button type="button" data-d="-1" aria-label="위로">▲</button><button type="button" data-d="1" aria-label="아래로">▼</button></span>';
  };

  var wrap = document.createElement('div');
  wrap.className = 'zw-side-wrap';
  wrap.innerHTML = '<div class="zw-side-dim"></div><aside class="zw-side" role="dialog" aria-modal="true" aria-label="전체 메뉴">'
    + '<div class="zw-side-top"><b>좌표<i>나라</i> 전체 메뉴</b><button type="button" class="zw-side-x" aria-label="닫기">✕</button></div>'
    + '<input class="zw-side-q" type="search" placeholder="도구 찾기 (예: 대출, 평)" aria-label="도구 찾기">'
    + '<div class="zw-side-bar"><button type="button" class="b-fold">모두 펴기</button><button type="button" class="b-edit">↕ 순서 바꾸기</button><button type="button" class="b-reset" hidden>처음 순서로</button></div>'
    + '<nav class="zw-side-body" aria-label="분류별 도구"></nav></aside>';
  document.body.appendChild(wrap);
  var side = wrap.querySelector('.zw-side'), body = wrap.querySelector('.zw-side-body'), q = wrap.querySelector('.zw-side-q');
  var editBtn = wrap.querySelector('.b-edit'), resetBtn = wrap.querySelector('.b-reset'), foldBtn = wrap.querySelector('.b-fold');

  function build() {
    var cats = sortBy(CATS.filter(function (c) { return CAT_PATH[c]; }), st.order.cats);
    var html = '';
    cats.forEach(function (c) {
      var tools = TOOLS.filter(function (t) { return t[4] && t[0] && t[3] === c; });
      if (!tools.length) return;
      var names = [];
      tools.forEach(function (t) { var g = t[5] || '기타'; if (names.indexOf(g) < 0) names.push(g); });
      names = sortBy(names, st.order.groups[c]);
      html += '<section class="zw-blk' + (st.opened['c:' + c] ? '' : ' shut') + '" data-kind="cat" data-key="' + esc(c) + '">'
        + '<div class="zw-cat-h"><button type="button" class="tg" aria-expanded="' + (!!st.opened['c:' + c]) + '"><span class="zw-car">▼</span>' + (CAT_ICON[c] || '📌') + ' ' + esc(c) + (c === hereCat ? hereDot : '') + '<span class="n">' + tools.length + '</span></button>' + mv() + '</div>'
        + '<div class="zw-kids"><a class="t zw-hub" href="' + ROOT + CAT_PATH[c] + '/index.html">' + esc(c) + ' 첫 화면 →</a>'
        + names.map(function (g) {
          var list = tools.filter(function (t) { return (t[5] || '기타') === g; });
          var gk = 'g:' + c + '/' + g;
          return '<div class="zw-blk' + (st.opened[gk] ? '' : ' shut') + '" data-kind="grp" data-key="' + esc(g) + '" data-cat="' + esc(c) + '">'
            + '<div class="zw-grp-h"><button type="button" class="tg" aria-expanded="' + (!!st.opened[gk]) + '"><span class="zw-car">▼</span>' + esc(g) + (c === hereCat && g === hereGrp ? hereDot : '') + '<span class="n">' + list.length + '</span></button>' + mv() + '</div>'
            + '<div class="zw-kids">' + list.map(function (t) {
              var href = ROOT + t[0] + '/index.html';
              return '<a class="t' + (here === href ? ' on' : '') + '"' + (here === href ? ' aria-current="page"' : '') + ' href="' + href + '" data-s="' + esc((t[1] + ' ' + t[2] + ' ' + g + ' ' + c).toLowerCase()) + '">' + esc(t[1]) + '<small>' + esc(t[2]) + '</small></a>';
            }).join('') + '</div></div>';
        }).join('') + '</div></section>';
    });
    if (typeof BOARD_OPEN !== 'undefined' && BOARD_OPEN) html += '<div class="zw-kids" style="border:none;margin-left:0"><a class="t zw-hub" href="' + ROOT + 'board/index.html">💬 게시판 →</a></div>';
    body.innerHTML = html || '<p class="zw-none">아직 목록이 없어요.</p>';
  }

  function saveOrder() {   // 화면에 보이는 순서를 그대로 저장
    var cats = [], groups = {};
    [].forEach.call(body.querySelectorAll(':scope > .zw-blk'), function (b) {
      var c = b.getAttribute('data-key'); cats.push(c);
      groups[c] = [].map.call(b.querySelectorAll(':scope > .zw-kids > .zw-blk'), function (g) { return g.getAttribute('data-key'); });
    });
    st.order = { cats: cats, groups: groups };
    store.set(st);
  }
  function move(blk, d) {
    var par = blk.parentNode, nb = d < 0 ? blk.previousElementSibling : blk.nextElementSibling;
    while (nb && !nb.classList.contains('zw-blk')) nb = d < 0 ? nb.previousElementSibling : nb.nextElementSibling;
    if (!nb) return;
    if (d < 0) par.insertBefore(blk, nb); else par.insertBefore(nb, blk);
    saveOrder();
  }

  // 덩어리 접기·펴기, ▲▼
  body.addEventListener('click', function (e) {
    var mvb = e.target.closest && e.target.closest('.zw-mv button[data-d]');
    if (mvb) { move(mvb.closest('.zw-blk'), +mvb.getAttribute('data-d')); mvb.focus(); return; }
    var tg = e.target.closest && e.target.closest('.tg');
    if (!tg) return;
    var blk = tg.closest('.zw-blk'), key = keyOf(blk);
    var shut = blk.classList.toggle('shut');
    tg.setAttribute('aria-expanded', String(!shut));
    if (shut) delete st.opened[key]; else st.opened[key] = 1;
    store.set(st);
  });
  // 끌어서 옮기기(컴퓨터). 같은 종류끼리, 같은 부모 안에서만 바뀐다
  var dragEl = null;
  body.addEventListener('dragstart', function (e) {
    var gp = e.target.closest && e.target.closest('.gp');
    if (!gp) return;
    dragEl = gp.closest('.zw-blk'); dragEl.classList.add('drag');
    if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', 'zw'); } catch (x) { /* 일부 브라우저는 데이터가 필요 없다 */ } }
  });
  body.addEventListener('dragover', function (e) {
    if (!dragEl) return;
    var t = e.target.closest && e.target.closest('.zw-blk');
    if (t && t !== dragEl && t.parentNode === dragEl.parentNode && t.getAttribute('data-kind') === dragEl.getAttribute('data-kind')) {
      e.preventDefault();
      [].forEach.call(body.querySelectorAll('.over'), function (o) { o.classList.remove('over'); });
      t.classList.add('over');
    }
  });
  body.addEventListener('drop', function (e) {
    var t = e.target.closest && e.target.closest('.zw-blk.over');
    if (!dragEl || !t) return;
    e.preventDefault();
    var after = dragEl.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING;
    t.parentNode.insertBefore(dragEl, after ? t.nextSibling : t);
    saveOrder();
  });
  body.addEventListener('dragend', function () {
    if (dragEl) dragEl.classList.remove('drag');
    dragEl = null;
    [].forEach.call(body.querySelectorAll('.over'), function (o) { o.classList.remove('over'); });
  });

  editBtn.addEventListener('click', function () {
    var on = side.classList.toggle('edit');
    editBtn.classList.toggle('on', on); resetBtn.hidden = !on;
    editBtn.textContent = on ? '✓ 끝내기' : '↕ 순서 바꾸기';
  });
  resetBtn.addEventListener('click', function () { st.order = { cats: [], groups: {} }; store.set(st); build(); });
  foldBtn.addEventListener('click', function () {
    var shut = foldBtn.textContent === '모두 접기';
    [].forEach.call(body.querySelectorAll('.zw-blk'), function (b) {
      b.classList.toggle('shut', shut);
      if (shut) delete st.opened[keyOf(b)]; else st.opened[keyOf(b)] = 1;
      var tg = b.querySelector('.tg'); if (tg) tg.setAttribute('aria-expanded', String(!shut));
    });
    store.set(st);
    foldBtn.textContent = shut ? '모두 펴기' : '모두 접기';
  });

  // 찾기: 맞는 도구만 보이고, 그 도구가 든 덩어리는 펼쳐 보인다
  q.addEventListener('input', function () {
    var v = q.value.trim().toLowerCase(), any = false;
    [].forEach.call(body.querySelectorAll('a.t[data-s]'), function (a) {
      var hit = !v || a.getAttribute('data-s').indexOf(v) >= 0;
      a.hidden = !hit; if (hit) any = true;
    });
    [].forEach.call(body.querySelectorAll('.zw-hub'), function (a) { a.hidden = !!v; });
    [].forEach.call(body.querySelectorAll('.zw-blk'), function (b) {
      var has = !!b.querySelector('a.t[data-s]:not([hidden])');
      b.hidden = !!v && !has;
      if (v && has) b.classList.remove('shut');
    });
    var none = body.querySelector('.zw-none-q');
    if (v && !any) { if (!none) { none = document.createElement('p'); none.className = 'zw-none zw-none-q'; none.textContent = '맞는 도구가 없어요.'; body.appendChild(none); } }
    else if (none) none.remove();
  });

  var opener = null;
  function open(from) {
    opener = from || document.activeElement;
    wrap.classList.add('open'); document.documentElement.style.overflow = 'hidden';
    body.scrollTop = 0;
  }
  function close() {
    if (!wrap.classList.contains('open')) return;
    wrap.classList.remove('open'); document.documentElement.style.overflow = '';
    if (opener && opener.focus) opener.focus();
  }
  wrap.querySelector('.zw-side-dim').addEventListener('click', close);
  wrap.querySelector('.zw-side-x').addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  body.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a.t') && !side.classList.contains('edit')) close(); });

  // 열기 단추: 머리 맨 앞 ☰, 컴퓨터는 왼쪽 가장자리 손잡이도
  var logo = document.querySelector('.zw-head .zw-logo');
  if (logo) {
    var hb = document.createElement('button');
    hb.type = 'button'; hb.className = 'zw-side-btn'; hb.setAttribute('aria-label', '전체 메뉴 열기'); hb.setAttribute('aria-haspopup', 'dialog'); hb.textContent = '☰';
    hb.addEventListener('click', function () { open(hb); });
    var box = document.createElement('span'); box.style.cssText = 'display:inline-flex;align-items:center';
    logo.parentNode.insertBefore(box, logo); box.appendChild(hb); box.appendChild(logo);
  }
  var tab = document.createElement('button');
  tab.type = 'button'; tab.className = 'zw-side-tab'; tab.textContent = '메뉴 ▸'; tab.setAttribute('aria-label', '전체 메뉴 열기');
  tab.addEventListener('click', function () { open(tab); });
  document.body.appendChild(tab);

  build();
})();
