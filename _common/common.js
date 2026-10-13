// 좌표나라.com 모든 쪽이 같이 쓰는 머리·꼬리, 도구 목록, 숫자 다루는 작은 도우미.
// 도구를 새로 만들면 TOOLS에 한 줄을 넣는다(제작1/저관여웹/목록.txt와 같게). 끝 값이 true인 것만 눌린다.

// ▼ 좌표나라로 가는 길. 비어 있는 것은 화면에 나오지 않는다.
var LINKS = {
  // 카톡방 입장 주소 — 분류마다 다르다(2026-10-12 사용자가 알려 줌). 분류에 주소가 없으면 휴대폰 방으로 간다
  kakao: { '휴대폰': 'https://open.kakao.com/o/g12bW70b', '부동산': 'https://open.kakao.com/o/gLzKdIgc' },
  cafe: 'https://cafe.naver.com/whdrpzja',     // 네이버 카페 좌표나라(휴대폰 시세표)
  // 유튜브 채널 — 분류마다. 부동산 채널(노원구아파트)은 아직 없어 비워 둔다. 채널이 생기면 주소와 아래 YT_LIST를 채운다
  youtube: { '휴대폰': 'https://www.youtube.com/channel/UCBvT1VuPrklJ9rV4a5-s-Sw', '부동산': '' }
};
// ▼ 첫 화면의 "○○ 정보 유튜브" 칸에 보여 줄 영상 묶음. 채널 번호의 UC를 UU로 바꾼 것이 그 채널의 올린 영상 전체다
var YT_LIST = { '휴대폰': 'UUBvT1VuPrklJ9rV4a5-s-Sw', '부동산': '' };

// ▼ 큰 분류(첫 화면의 탭). 순서대로 보인다.
var CATS = ['휴대폰', '부동산', '생활', '재미'];   // 생활 = 누구나 쓰는 도구(공학용 계산기, 그림판 등). 2026-10-12 사용자 요청

// ▼ 도구 목록: [폴더 이름, 화면에 보일 이름, 한 줄 설명, 큰 분류, 만들어졌는지, 작은 묶음]
var TOOLS = [
  ['jagupje-seongji', '자급제 vs 성지 비교', '2년 동안 어느 쪽이 덜 드는지', '휴대폰', true, '살 때 비교'],
  ['', '공시지원금 vs 선택약정', '개통할 때 어느 쪽이 유리한지', '휴대폰', false, '살 때 비교'],
  ['monthly-phone', '한 달 납부액 계산기', '기기 할부와 요금을 합쳐서', '휴대폰', true, '살 때 비교'],
  ['plan-diff', '요금제 바꾸면 얼마 차이', '한 달과 약정 기간으로 보면', '휴대폰', true, '살 때 비교'],
  ['storage', '저장 공간 계산기', '사진과 영상으로 필요한 용량', '휴대폰', true, '살 때 비교'],
  ['per-day', '폰값, 하루로 치면', '오래 쓸수록 얼마나 싸지는지', '휴대폰', true, '바꾸기 전에'],
  ['upgrade-test', '지금 폰, 바꿀 때가 됐나', '해당하는 것을 누르면 결과가', '휴대폰', true, '바꾸기 전에'],
  ['switch-checklist', '폰 바꾸기 전 할 일', '백업부터 옮기기까지 하나씩', '휴대폰', true, '바꾸기 전에'],
  ['sell-checklist', '중고폰 팔기 전 확인표', '넘기기 전에 꼭 할 것', '휴대폰', true, '바꾸기 전에'],
  ['contract-end', '약정 끝나는 날', '언제 바꿔도 되는지', '휴대폰', true, '바꾸기 전에'],
  ['', '새 폰 출시일까지', '며칠 남았는지', '휴대폰', false, '바꾸기 전에'],
  ['', '한 달 데이터 사용량', '요금제를 고르기 전에', '휴대폰', false, '바꾸기 전에'],
  ['', '시세표 용어 풀이', '처음 보는 말을 찾아보기', '휴대폰', false, '성지가 처음이라면'],
  ['', '성지 방문 전 확인표', '가서 무엇을 물어볼지', '휴대폰', false, '성지가 처음이라면'],

  ['pyeong', '평 ↔ 제곱미터', '84㎡는 몇 평일까', '부동산', true, '면적과 가격'],
  ['pyeongdang', '평당 가격 계산기', '이 집은 평당 얼마일까', '부동산', true, '면적과 가격'],
  ['gap', '전세가율 · 갭 계산기', '매매가와 전세가의 차이', '부동산', true, '면적과 가격'],
  ['loan', '대출 한 달 상환액', '얼마 빌리면 한 달에 얼마', '부동산', true, '대출'],
  ['dsr', '소득 대비 상환 비율', '내 소득으로 감당이 될까', '부동산', true, '대출'],
  ['exclusive', '전용률 계산기', '공급면적 중 내가 쓰는 넓이', '부동산', true, '면적과 가격'],
  ['far', '용적률 · 건폐율', '땅에 건물을 얼마나 지었나', '부동산', true, '면적과 가격'],
  ['afford', '감당할 수 있는 대출금', '한 달에 낼 수 있는 돈으로 거꾸로', '부동산', true, '대출'],
  ['rate-change', '금리가 바뀌면', '한 달에 얼마나 달라질까', '부동산', true, '대출'],
  ['refinance', '대출 갈아타기', '옮기면 이득일까 손해일까', '부동산', true, '대출'],
  ['prepay', '먼저 갚으면', '이자가 얼마나 줄어들까', '부동산', true, '대출'],
  ['compare-repay', '원리금균등 vs 원금균등', '이자가 얼마나 다를까', '부동산', true, '대출'],
  ['balance', '남은 원금 보기', '몇 년 갚으면 얼마 남나', '부동산', true, '대출'],
  ['grace', '거치 기간이 있는 대출', '이자만 내다가 갚으면', '부동산', true, '대출'],
  ['ltv', '필요한 내 돈', '집값의 몇 %를 빌리면', '부동산', true, '살 때와 팔 때'],
  ['housing-cost', '한 달 주거비', '대출·관리비·월세 합계', '부동산', true, '살 때와 팔 때'],
  ['mgmt', '평당 관리비', '이 집 관리비는 비싼 편일까', '부동산', true, '면적과 가격'],
  ['jeonwolse', '전세 ↔ 월세 바꿔 보기', '전세를 월세로, 월세를 전세로', '부동산', true, '전세와 월세'],
  ['jeonse-wolse', '전세 대출 vs 월세', '한 달에 어느 쪽이 덜 들까', '부동산', true, '전세와 월세'],
  ['raise', '보증금 · 월세 인상', '올리면 얼마가 될까', '부동산', true, '전세와 월세'],
  ['yield', '임대 수익률 계산기', '월세로 보면 몇 %일까', '부동산', true, '전세와 월세'],
  ['installments', '분양 대금 나누기', '계약금·중도금·잔금', '부동산', true, '살 때와 팔 때'],
  ['saving', '목표 금액까지', '몇 년을 모아야 할까', '부동산', true, '살 때와 팔 때'],
  ['profit', '차익과 수익률', '사고팔아 얼마 남았나', '부동산', true, '살 때와 팔 때'],
  ['', '취득세 계산기', '집 살 때 세금', '부동산', false, '세금과 비용'],
  ['', '중개 보수 계산기', '복비가 얼마일까', '부동산', false, '세금과 비용'],

  ['hogang-test', '나는 호갱일까? 테스트', '살 때 얼마나 준비됐는지', '휴대폰', true, '살 때 비교'],
  ['story-first-visit', '성지 처음 가는 날', '가상의 이야기로 보는 방문 순서', '휴대폰', true, '읽을거리'],
  ['phone-test', '나에게 맞는 폰 테스트', '갤럭시일까 아이폰일까', '재미', true, '테스트와 뽑기'],
  ['draw', '추첨기', '이름을 넣고 뽑기', '재미', true, '테스트와 뽑기'],
  ['ladder', '사다리 타기', '순서와 당번 정하기', '재미', true, '테스트와 뽑기'],
  ['sci-calc', '공학용 계산기', '삼각함수, 로그, 제곱, 괄호', '생활', true, '계산'],
  ['paint', '그림판', '바로 그리고 저장하기', '생활', true, '글과 그림'],
  ['age', '만 나이 계산기', '만 나이, 연 나이, 다음 생일', '생활', true, '계산'],
  ['days-between', '날짜 사이 며칠', '두 날짜 사이의 날 수', '생활', true, '계산'],
  ['percent', '퍼센트 계산기', '몇 %인지, 몇 % 변했는지', '생활', true, '계산'],
  ['dutch', '더치페이 계산기', '여럿이 나눠 낼 때', '생활', true, '계산'],
  ['count', '글자 수 세기', '띄어쓰기 포함·제외, 낱말, 줄', '생활', true, '글과 그림'],
  ['qr', '큐알코드 만들기', '링크를 큐알코드 그림으로', '생활', true, '글과 그림'],
  ['qr-read', '큐알코드 읽기', '열기 전에 링크 확인', '생활', true, '글과 그림'],
  ['photo-shrink', '사진 용량 줄이기', '사진이 커서 안 올라갈 때', '생활', true, '글과 그림']
];

// ▼ 숫자 도우미 — 도구마다 다시 만들지 않게 여기 둔다
var ZW = {
  LINKS: LINKS, CATS: CATS, TOOLS: TOOLS, YT_LIST: YT_LIST,
  num: function (s) { return Number(String(s).replace(/[^\d]/g, '')) || 0; },                 // "1,500,000" → 1500000
  dec: function (s) { s = String(s).replace(/[^\d.]/g, ''); var i = s.indexOf('.'); return i < 0 ? s : s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, ''); },
  fmt: function (n) { return Math.round(n).toLocaleString('ko-KR'); },                         // 1500000 → "1,500,000"
  pct: function (n, d) { return isFinite(n) ? n.toFixed(d == null ? 1 : d) : '-'; },
  // 큰 돈을 "3억", "3억 5,000만 원"처럼 읽어 준다(만 원 아래는 버린다 — 입력 칸 옆 도움말용)
  read: function (n) {
    if (n < 10000) return '';
    var eok = Math.floor(n / 100000000), man = Math.floor((n % 100000000) / 10000);
    return (eok ? eok.toLocaleString('ko-KR') + '억' : '') + (eok && man ? ' ' : '') + (man ? man.toLocaleString('ko-KR') + '만' : '') + ' 원';
  },
  // 돈 칸: 치는 대로 쉼표를 넣고, 옆 도움말(id+"Hint")이 있으면 "3억 원"처럼 읽어 준다
  money: function (id, onChange) {
    var e = document.getElementById(id), h = document.getElementById(id + 'Hint');
    var hint = function () { var n = ZW.num(e.value); if (h) h.textContent = n < 1000000 ? '' : ZW.read(n); };   // 백만 원 아래는 도움말을 뺀다(69,000원 옆에 "6만 원"이라 나오면 틀려 보인다)
    e.addEventListener('input', function () { e.value = e.value === '' ? '' : ZW.fmt(ZW.num(e.value)); hint(); onChange(); });
    e.addEventListener('focus', function () { e.select(); });
    hint();
    return function () { return ZW.num(e.value); };
  },
  // 소수 칸(이자율, 면적): 숫자와 점만 받고 max를 넘지 않게
  number: function (id, onChange, max) {
    var e = document.getElementById(id);
    e.addEventListener('input', function () { e.value = ZW.dec(e.value); if (max != null && Number(e.value) > max) e.value = String(max); onChange(); });
    e.addEventListener('focus', function () { e.select(); });
    return function () { return Number(e.value) || 0; };
  },
  // 고르는 단추 묶음(.seg). 고른 값(data-t)을 돌려주는 함수를 준다
  seg: function (onChange) {
    var b = document.querySelectorAll('.seg button'), cur = b.length ? b[0].getAttribute('data-t') : '';
    for (var i = 0; i < b.length; i++) b[i].addEventListener('click', function () {
      for (var j = 0; j < b.length; j++) b[j].className = '';
      this.className = 'on'; cur = this.getAttribute('data-t'); onChange();
    });
    return function () { return cur; };
  }
};

// ▼ 계산기 한 쪽을 짧게 만드는 틀. 쪽에는 <div id="app"></div>만 두고 칸 목록과 계산 함수를 넘긴다.
//   fields: [{ id, label, type: 'money'|'num'|'seg', value, unit, max, short, options:[[값, 보이는 글자], …] }]
//           short: true 인 칸은 바로 앞 칸과 한 줄에 나란히 놓인다(개월·%·년처럼 짧은 값에만 쓴다. 돈 칸 둘을 나란히 두지 않는다)
//   compute(v): v.<id> 로 값을 받아 { html: 결과 문장, sub: 덧붙이는 말, rows: [[이름, 값], …], pct: 막대(0~100), pctLabel } 을 돌려준다
ZW.app = function (cfg) {
  var root = document.getElementById('app'), F = cfg.fields, seg = {};
  var field = function (f) {
    if (f.type === 'seg') {
      seg[f.id] = f.options[0][0];
      return '<div class="field"><label>' + f.label + '</label><div class="seg' + (f.options.length === 2 ? ' two' : '') + '" data-id="' + f.id + '">'
        + f.options.map(function (o, k) { return '<button type="button" data-t="' + o[0] + '"' + (k === 0 ? ' class="on"' : '') + '>' + o[1] + '</button>'; }).join('') + '</div></div>';
    }
    return '<div class="field"><label for="' + f.id + '">' + f.label + (f.type === 'money' ? ' <b class="hint" id="' + f.id + 'Hint"></b>' : '') + '</label><div class="inp"><input id="' + f.id + '" inputmode="'
      + (f.type === 'money' ? 'numeric' : 'decimal') + '" value="' + f.value + '"><span>' + f.unit + '</span></div></div>';
  };
  var h = '<section class="result" aria-live="polite"><div class="verdict" id="zv"></div><div class="sub" id="zs"></div><div id="zb"></div><dl class="rows" id="zr"></dl></section><section class="card">';
  for (var i = 0; i < F.length; i++) {
    if (F[i + 1] && F[i + 1].short) { h += '<div class="row2">' + field(F[i]) + field(F[i + 1]) + '</div>'; i++; } else h += field(F[i]);
  }
  root.innerHTML = h + '</section>';

  var get = {};
  var render = function () {
    var v = {}, k;
    for (k in get) v[k] = get[k]();
    for (k in seg) v[k] = seg[k];
    var o = cfg.compute(v) || {};
    document.getElementById('zv').innerHTML = o.html || '숫자를 넣어 보세요';
    document.getElementById('zs').textContent = o.sub || '';
    document.getElementById('zb').innerHTML = o.pct == null || !isFinite(o.pct) ? '' : '<div class="bars"><div class="bar win"><div class="top"><span>' + (o.pctLabel || '') + '</span><b>' + ZW.pct(o.pct) + '%</b></div><div class="track"><div class="fill" style="width:' + Math.max(0, Math.min(100, o.pct)) + '%"></div></div></div></div>';
    document.getElementById('zr').innerHTML = (o.rows || []).map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>'; }).join('');
  };
  F.forEach(function (f) {
    if (f.type === 'money') get[f.id] = ZW.money(f.id, render);
    else if (f.type === 'num') get[f.id] = ZW.number(f.id, render, f.max);
  });
  var groups = root.querySelectorAll('.seg');
  for (var g = 0; g < groups.length; g++) (function (box) {
    var b = box.querySelectorAll('button');
    for (var j = 0; j < b.length; j++) b[j].addEventListener('click', function () {
      for (var m = 0; m < b.length; m++) b[m].className = '';
      this.className = 'on'; seg[box.getAttribute('data-id')] = this.getAttribute('data-t'); render();
    });
  })(groups[g]);
  render();
};

(function () {
  // 이 파일이 있는 곳을 기준으로 사이트 맨 위 폴더를 찾는다(내 컴퓨터에서 열어도, 올린 뒤에도 같게)
  var me = document.currentScript.src;
  var ROOT = me.slice(0, me.indexOf('_common/'));
  var home = ROOT + 'index.html';
  var kakaoOf = function (cat) { return LINKS.kakao[cat] || LINKS.kakao['휴대폰'] || LINKS.cafe; };
  ZW.ROOT = ROOT;

  // 지금 보고 있는 도구(폴더 이름으로 찾는다)
  var here = null;
  for (var i = 0; i < TOOLS.length; i++) if (TOOLS[i][0] && location.href.indexOf(ROOT + TOOLS[i][0] + '/') === 0) here = TOOLS[i];

  var head = document.createElement('header');
  head.className = 'zw-head';
  head.innerHTML = '<div class="in"><a class="zw-logo" href="' + home + '">좌표<b>나라</b></a><nav class="zw-nav">'
    + CATS.map(function (c) { return '<a href="' + home + '#' + encodeURIComponent(c) + '"' + (here && here[3] === c ? ' class="on"' : '') + '>' + c + '</a>'; }).join('')
    + '</nav></div>';
  document.body.insertBefore(head, document.body.firstChild);

  // 이 사람이 어떤 도구를 몇 번 열었는지 이 사람의 기기에만 적어 둔다(서버로 보내지 않는다).
  // 첫 화면이 이 숫자로 "자주 쓴 도구"를 앞에 보여 준다. 모든 사람의 합계 순서는 방문 통계를 붙인 뒤 TOOLS의 순서로 맞춘다.
  ZW.uses = function () { try { return JSON.parse(localStorage.getItem('zw-uses') || '{}') || {}; } catch (e) { return {}; } };
  if (here) { try { var u = ZW.uses(); u[here[0]] = (u[here[0]] || 0) + 1; localStorage.setItem('zw-uses', JSON.stringify(u)); } catch (e) { /* 저장이 막힌 브라우저에서는 그냥 넘어간다 */ } }

  // 도구 쪽 아래에 "같은 분류의 다른 도구"를 붙인다 — 한 도구만 쓰고 나가지 않게
  if (here) {
    var others = TOOLS.filter(function (t) { return t[4] && t[0] && t[3] === here[3] && t !== here; });
    if (others.length) {
      var more = document.createElement('section');
      more.className = 'wrap more';
      more.innerHTML = '<h2>다른 ' + here[3] + ' 도구</h2><div class="tools">' + others.map(function (t) {
        return '<a class="tool" href="' + ROOT + t[0] + '/index.html"><b>' + t[1] + '</b><span>' + t[2] + '</span></a>';
      }).join('') + '</div>';
      document.body.appendChild(more);
    }
  }

  var cat = here ? here[3] : '';
  var kakao = kakaoOf(cat || '휴대폰');
  var out = function (href, text) { return '<a href="' + href + '" target="_blank" rel="noopener">' + text + '</a>'; };

  // 부동산 도구에는 쪽 안에 카톡방 단추가 없으므로, 도구 아래에 부동산 카톡방 단추를 하나 붙인다
  if (cat === '부동산' && LINKS.kakao['부동산'] && !document.querySelector('[data-zw="kakao"]')) {
    var main = document.querySelector('main.wrap');
    if (main) { var cta = document.createElement('a'); cta.className = 'cta'; cta.setAttribute('data-zw', 'kakao'); cta.innerHTML = '부동산 카톡방 들어가기<small>궁금한 것은 카톡방에서 물어보세요</small>'; main.appendChild(cta); }
  }

  var foot = document.createElement('footer');
  foot.className = 'zw-foot';
  // 도구 쪽에서는 그 분류의 카톡방만, 첫 화면에서는 두 방을 다 보여 준다. 휴대폰 시세표는 부동산 쪽에는 안 보인다
  var links = (cat ? out(kakao, cat + ' 카톡방 들어가기') : out(kakaoOf('휴대폰'), '휴대폰 카톡방') + (LINKS.kakao['부동산'] ? out(LINKS.kakao['부동산'], '부동산 카톡방') : ''))
    + (LINKS.cafe && cat !== '부동산' ? out(LINKS.cafe, '오늘 휴대폰 시세표') : '')
    + (cat ? (LINKS.youtube[cat] ? out(LINKS.youtube[cat], cat + ' 정보 유튜브') : '')
           : (LINKS.youtube['휴대폰'] ? out(LINKS.youtube['휴대폰'], '휴대폰 정보 유튜브') : '') + (LINKS.youtube['부동산'] ? out(LINKS.youtube['부동산'], '부동산 정보 유튜브') : ''));
  foot.innerHTML = '<div class="links">' + links + '</div><p>좌표나라 · 휴대폰과 부동산, 무료 도구 모음</p><p>가입 없이 쓰고, 넣은 값은 어디에도 저장하지 않습니다.</p>';
  document.body.appendChild(foot);

  // 쪽 안의 카톡방 단추(data-zw="kakao")에 주소를 넣는다
  var btns = document.querySelectorAll('[data-zw="kakao"]');
  for (var k = 0; k < btns.length; k++) { btns[k].href = kakao; btns[k].target = '_blank'; btns[k].rel = 'noopener'; }
})();

// ▼ 방문 수 세기(구글 애널리틱스 4). 2026-10-13 붙임 — 이 묶음은 맨 아래에 그대로 둔다. 쪽마다 따로 넣지 않는다.
// GA_ID가 비어 있으면 아무 일도 하지 않는다. jwapyonara.com에서 열렸을 때만 센다(내 컴퓨터에서 열거나 시험할 때는 세지 않는다).
// 바깥 주소에서 불러오는 것은 이 하나뿐이다(방문 수는 세는 곳의 파일을 불러와야만 세어진다). 계산기에 넣은 값은 보내지 않는다.
var GA_ID = 'G-LJC5VYYKQL';   // 예: 'G-XXXXXXXXXX' — 사용자가 구글 애널리틱스에서 받아 알려 준 것을 넣는다
(function () {
  try {
    if (!GA_ID) return;
    var h = location.hostname;
    if (h !== 'jwapyonara.com' && h !== 'www.jwapyonara.com') return;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
    var foot = document.querySelector('.zw-foot');
    if (foot) { var p = document.createElement('p'); p.textContent = '방문 수를 세려고 구글 애널리틱스를 씁니다.'; foot.appendChild(p); }
  } catch (e) {}
})();
