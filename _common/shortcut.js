// 단축키 쪽 공통(2026-10-15). 쪽마다 window.SC = { groups: [...], items: [[키, 하는 일, 묶음, 자주 쓰면 1, 덧붙임, 찾을 말], ...] } 를 먼저 두고 이 파일을 불러온다.
// 키는 ' + '(같이 누름), ' / '(또는), ' → '(차례로)로 나눠 쓰면 칸 모양으로 그린다.
(function () {
  var SC = window.SC; if (!SC) return;
  var q = document.getElementById('q'), chips = document.getElementById('chips'), list = document.getElementById('list'), cnt = document.getElementById('cnt');
  var STAR = '★ 자주 쓰는 것', cur = '전체';
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function keys(k) {
    return k.split(/( \+ | \/ | → )/).map(function (t) {
      if (t === ' + ') return '<span>+</span>';
      if (t === ' / ') return '<span>또는</span>';
      if (t === ' → ') return '<span>→</span>';
      return '<kbd>' + esc(t) + '</kbd>';
    }).join('');
  }
  function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ''); }
  chips.innerHTML = ['전체', STAR].concat(SC.groups).map(function (g) { return '<button type="button" data-g="' + esc(g) + '">' + esc(g) + '</button>'; }).join('');
  function draw() {
    var w = norm(q.value), n = 0, html = '';
    SC.items.forEach(function (it) {
      if (cur === STAR && !it[3]) return;
      if (cur !== '전체' && cur !== STAR && it[2] !== cur) return;
      if (w && norm(it[0] + it[1] + it[2] + (it[4] || '') + (it[5] || '')).indexOf(w) < 0) return;
      n++;
      html += '<div class="sc-item"><div class="sc-keys">' + keys(it[0]) + '</div><div class="sc-do">' + (it[3] ? '<span class="star">★</span>' : '') + esc(it[1]) + '</div>' + (it[4] ? '<div class="sc-sub">' + esc(it[4]) + '</div>' : '') + '</div>';
    });
    list.innerHTML = html || '<p class="sc-empty">찾는 단축키가 없어요. 다른 말로 찾아 보세요.<br>(예: 캡처, 복사, 탭, 재시작)</p>';
    cnt.textContent = (w || cur !== '전체' ? '찾은 것 ' : '모두 ') + n + '개';
    var bs = chips.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) bs[i].className = bs[i].getAttribute('data-g') === cur ? 'on' : '';
  }
  chips.addEventListener('click', function (e) { var g = e.target.getAttribute && e.target.getAttribute('data-g'); if (g) { cur = g; draw(); } });
  q.addEventListener('input', draw);
  draw();
})();
