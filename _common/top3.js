// 게임 이름 옆에 1·2·3등을 작게 보여 주고, 작은 "10등 ▾"을 누르면 10등까지 펼쳐 보여 준다 (2026-10-26 사용자 요청). common.js가 불러온다.
// 대상: 쪽 안의 모든 도구 카드(a.tool) 중 순위가 있는 게임. 서버에서 한 번에(/api/rank?top3=1&n=10) 받아 60초 동안 이 기기에 기억한다.
// 기록이 없으면 아무것도 붙이지 않는다. 서버가 안 열리면 조용히 넘어간다(카드는 그대로).
(function () {
  if (!window.ZW || !ZW.RANK_API || !ZW.RANKS) return;
  var API = ZW.RANK_API.replace(/\/$/, '');
  var KEY = 'zw-top10-v1', MEDAL = ['🥇', '🥈', '🥉'];
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  var style = document.createElement('style');
  style.textContent = '.zw-t3{display:inline;margin-left:6px;font-style:normal;font-size:11px;font-weight:600;line-height:1.35;color:var(--sub);letter-spacing:-0.01em;white-space:normal}'
    + '.zw-t3 em{font-style:normal;white-space:nowrap;margin-right:6px}'
    + '.zw-t3 u{text-decoration:none;white-space:nowrap;font-size:11px;font-weight:700;color:var(--red);cursor:pointer;padding:2px 6px;border-radius:8px;background:var(--soft)}'
    + '.zw-t10{display:block;margin-top:8px;padding:8px 10px;border-radius:10px;background:var(--fill);font-size:11px;font-weight:500;line-height:1.5;color:var(--ink)}'
    + '.zw-t10 h4{margin:6px 0 2px;font-size:11px;color:var(--sub)} .zw-t10 h4:first-child{margin-top:0}'
    + '.zw-t10 ol{list-style:none;margin:0;padding:0}'
    + '.zw-t10 li{display:flex;gap:4px;break-inside:avoid;white-space:nowrap;overflow:hidden}'
    + '.zw-t10 li i{font-style:normal;width:16px;color:var(--sub);flex:none} .zw-t10 li span{flex:1;overflow:hidden;text-overflow:ellipsis} .zw-t10 li b{font-size:11px;font-weight:700;margin:0;display:inline}';
  document.head.appendChild(style);

  function load() {
    try { var c = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (c && Date.now() - c.t < 60000) return Promise.resolve(c.d); } catch (e) {}
    return fetch(API + '/api/rank?top3=1&n=10').then(function (r) { return r.json(); }).then(function (d) {
      var g = d && d.games ? d.games : null;
      if (g) { try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d: g })); } catch (e) {} }
      return g;
    }).catch(function () { return null; });
  }

  // 카드 주소에서 게임 폴더 이름을 읽는다 (…/snake/index.html → snake)
  var idOf = function (a) { var m = (a.getAttribute('href') || '').match(/([a-z0-9-]+)\/(?:index\.html)?(?:[?#].*)?$/i); return m ? m[1] : ''; };
  var fmt = function (cfg, n) { return Number(n).toLocaleString('ko-KR') + cfg.unit; };

  var data = null, queued = false;
  function box(cfg, vars) {
    var parts = vars.map(function (v) {
      var top = data[v.id] || [];
      return (v.name ? '<h4>' + esc(v.name) + '</h4>' : '')
        + (top.length ? '<ol>' + top.map(function (t, k) { return '<li><i>' + (k + 1) + '</i><span>' + esc(t.name) + '</span><b>' + esc(fmt(cfg, t.score)) + '</b></li>'; }).join('') + '</ol>' : '<div style="color:var(--sub)">아직 기록이 없어요</div>');
    }).join('');
    return parts;
  }
  function paint() {
    queued = false;
    if (!data) return;
    var cards = document.querySelectorAll('a.tool');
    Array.prototype.forEach.call(cards, function (a) {   // 카드마다 따로 닫힘(var가 겹치지 않게 함수로 감쌈)
      if (a.getAttribute('data-t3')) return;
      var g = idOf(a), cfg = ZW.RANKS[g];
      if (!cfg) return;
      a.setAttribute('data-t3', '1');
      var vars = cfg.variants || [{ id: g, name: '' }];
      var any = vars.some(function (v) { return (data[v.id] || []).length; });
      var first = vars.filter(function (v) { return (data[v.id] || []).length; })[0] || vars[0];
      var b = a.querySelector('b');
      if (!b) return;
      var small = document.createElement('i');
      small.className = 'zw-t3';
      small.innerHTML = (any ? data[first.id].slice(0, 3).map(function (t, k) { return '<em>' + MEDAL[k] + esc(t.name) + ' ' + esc(fmt(cfg, t.score)) + '</em>'; }).join('')
        + (first.name ? '<em style="opacity:.7">· ' + esc(first.name) + '</em>' : '') : '<em style="opacity:.75">🥇 첫 기록에 도전!</em>') + '<u role="button" tabindex="0">10등 ▾</u>';
      b.appendChild(small);
      var btn = small.querySelector('u'), open = null;
      var toggle = function (e) {
        e.preventDefault(); e.stopPropagation();
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        if (open) { open.remove(); open = null; btn.textContent = '10등 ▾'; return; }
        open = document.createElement('span');
        open.className = 'zw-t10';
        open.innerHTML = box(cfg, vars);
        open.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopPropagation(); });
        a.appendChild(open);
        btn.textContent = '10등 ▴';
      };
      btn.addEventListener('click', toggle);
      btn.addEventListener('keydown', toggle);
    });
  }
  function schedule() { if (queued) return; queued = true; setTimeout(paint, 80); }

  load().then(function (d) {
    data = d;
    if (!d) return;
    paint();
    // 도구 목록이 나중에 그려지는 쪽(분류 첫 화면·홈)을 위해 새 카드가 생기면 다시 훑는다
    if (window.MutationObserver) new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  });
})();
