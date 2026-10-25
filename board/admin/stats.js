// 좌표나라 게시판 관리자 현황 스크립트 (site/board/admin/stats.js)
// 계약서(게시판/계약.md, 게시판/계약-추가-관리자.md, 게시판/계약-추가-현황.md)의 테이블·열·함수·규칙 이름을 한 글자도 바꾸지 않고 그대로 따른다.
// 모든 글자 출력은 textContent만 사용한다(innerHTML에 사용자 값을 넣지 않는다).

(function () {
  'use strict';

  function clearBox(el) {
    if (!el) return;
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }

  function injectStatsStyles() {
    if (document.getElementById('zw-board-stats-style')) return;
    var st = document.createElement('style');
    st.id = 'zw-board-stats-style';
    st.textContent = [
      '.adm-stat-head { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:14px; }',
      '.adm-stat-head h2 { margin:0; font-size:19px; }',
      '.adm-stat-actions { display:inline-flex; align-items:center; gap:8px; flex-wrap:wrap; }',
      '.adm-kpi-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:14px; }',
      '.adm-kpi-card { background:var(--fill); border:1.5px solid var(--line); border-radius:14px; padding:14px 12px; text-align:center; }',
      '.adm-kpi-title { font-size:13px; font-weight:700; color:var(--sub); margin-bottom:6px; word-break:keep-all; }',
      '.adm-kpi-val { font-size:22px; font-weight:800; color:var(--ink); line-height:1.2; }',
      '.adm-kpi-unit { font-size:13px; font-weight:600; color:var(--sub); margin-left:2px; }',
      '.adm-sub-card { background:var(--card); border:1.5px solid var(--line); border-radius:16px; padding:16px; margin-bottom:14px; }',
      '.adm-sub-card h3 { margin:0 0 10px; font-size:15px; font-weight:700; color:var(--ink); }',
      '.adm-pill-list { display:flex; flex-wrap:wrap; gap:8px; }',
      '.adm-pill { display:inline-flex; align-items:center; gap:6px; background:var(--fill); border:1px solid var(--line); border-radius:999px; padding:6px 14px; font-size:14px; font-weight:700; color:var(--ink); }',
      '.adm-pill b { color:var(--red); }',
      '.adm-period-btns { display:inline-flex; gap:4px; background:var(--fill); padding:3px; border-radius:10px; border:1px solid var(--line); }',
      '.adm-period-btn { font:inherit; font-size:13px; font-weight:700; padding:6px 12px; border-radius:8px; border:0; background:transparent; color:var(--sub); cursor:pointer; }',
      '.adm-period-btn.on { background:var(--card); color:var(--ink); box-shadow:0 1px 3px rgba(0,0,0,0.1); }',
      '.adm-stat-bar-wrap { display:inline-flex; align-items:center; justify-content:flex-end; gap:6px; min-width:84px; }',
      '.adm-stat-bar-track { width:44px; height:8px; background:var(--line); border-radius:4px; overflow:hidden; display:inline-block; vertical-align:middle; flex:none; }',
      '.adm-stat-bar-fill { height:100%; background:var(--red); border-radius:4px; display:block; }',
      '.adm-row-today { background:var(--soft) !important; font-weight:700; }',
      '.adm-row-today td { font-weight:700; }',
      '.adm-badge-today { display:inline-block; font-size:11px; font-weight:800; padding:2px 6px; border-radius:6px; background:var(--red); color:#fff; margin-left:6px; vertical-align:middle; line-height:1.2; }',
      '.adm-stat-note { font-size:13px; color:var(--sub); line-height:1.6; margin-top:14px; padding:0 4px; word-break:keep-all; }',
      '.adm-row-total { background:var(--fill); font-weight:800; border-top:2px solid var(--line); }',
      '.adm-row-total td { font-weight:800; }',
      '@media (max-width:560px) {',
      '  .adm-kpi-grid { grid-template-columns:repeat(2, 1fr); }',
      '  .adm-stat-head { flex-direction:column; align-items:flex-start; }',
      '  .adm-stat-actions { width:100%; justify-content:space-between; }',
      '  .adm-stat-bar-wrap { justify-content:flex-end; }',
      '}'
    ].join('\n');
    document.head.appendChild(st);
  }

  // 한국 시간(Asia/Seoul, UTC+9) Date 변환
  function toKoreaDate(val) {
    if (!val) return null;
    var d = new Date(val);
    if (isNaN(d.getTime())) return null;
    var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    return new Date(utc + (9 * 3600000));
  }

  // M월 D일 형식 (최근 가입 표, 한국 시간)
  function formatDateMD(val) {
    if (!val) return '-';
    var kd = toKoreaDate(val);
    if (!kd) return '-';
    return (kd.getMonth() + 1) + '월 ' + kd.getDate() + '일';
  }

  // YYYY-MM-DD 형식 (일간 현황 표, 한국 시간)
  function formatDateYMD(val) {
    if (!val) return '-';
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
      return val.trim();
    }
    var kd = toKoreaDate(val);
    if (!kd) return '-';
    var y = kd.getFullYear();
    var m = String(kd.getMonth() + 1).padStart(2, '0');
    var d = String(kd.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  // 오늘 한국 날짜 (YYYY-MM-DD)
  function getKoreaTodayYMD() {
    var now = new Date();
    var utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    var kd = new Date(utc + (9 * 3600000));
    var y = kd.getFullYear();
    var m = String(kd.getMonth() + 1).padStart(2, '0');
    var d = String(kd.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  // 가입 경로 한글 표기 변환
  function translateProvider(p) {
    if (!p) return '기타';
    var low = String(p).trim().toLowerCase();
    if (low === 'google') return '구글';
    if (low === 'kakao') return '카카오';
    if (low === 'naver') return '네이버';
    return String(p).trim();
  }

  // 현황 로딩 실패 시 표시할 오류 박스 (기술 정보는 콘솔에만)
  function renderErrorBox(container, titleText, onRetry) {
    clearBox(container);
    var box = document.createElement('div');
    box.className = 'bd-ready';
    box.setAttribute('role', 'alert');

    var b = document.createElement('b');
    b.textContent = titleText || '현황을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.';
    box.appendChild(b);

    if (onRetry) {
      var retryWrap = document.createElement('div');
      retryWrap.style.marginTop = '14px';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bd-btn small primary';
      btn.textContent = '새로 불러오기';
      btn.addEventListener('click', onRetry);
      retryWrap.appendChild(btn);
      box.appendChild(retryWrap);
    }

    container.appendChild(box);
  }

  var membersCache = {
    loaded: false,
    summary: null,
    recent: []
  };

  var dailyCache = {
    loaded: false,
    days: 14,
    rows: []
  };

  function resetCache() {
    membersCache.loaded = false;
    membersCache.summary = null;
    membersCache.recent = [];

    dailyCache.loaded = false;
    dailyCache.days = 14;
    dailyCache.rows = [];
  }

  // [회원 현황] 탭 렌더링
  function renderMembersView(container, sb, roles, summary, recent) {
    clearBox(container);
    injectStatsStyles();

    var sec = document.createElement('section');
    sec.className = 'card';

    // 머리 (제목 + 새로 불러오기 단추)
    var head = document.createElement('div');
    head.className = 'adm-stat-head';

    var h2 = document.createElement('h2');
    h2.textContent = '회원 현황';
    head.appendChild(h2);

    var refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.className = 'bd-btn small';
    refreshBtn.textContent = '새로 불러오기';
    refreshBtn.addEventListener('click', function () {
      loadMembersTab(container, sb, roles, true);
    });
    head.appendChild(refreshBtn);
    sec.appendChild(head);

    // 1. 숫자 카드 4개 (전체 회원 · 오늘 가입 · 최근 7일 가입 · 최근 7일 접속)
    var kpiGrid = document.createElement('div');
    kpiGrid.className = 'adm-kpi-grid';

    var kpis = [
      { title: '전체 회원', val: Number(summary && summary.total) || 0 },
      { title: '오늘 가입', val: Number(summary && summary.today) || 0 },
      { title: '최근 7일 가입', val: Number(summary && summary.week) || 0 },
      { title: '최근 7일 접속', val: Number(summary && summary.active_week) || 0 }
    ];

    kpis.forEach(function (k) {
      var card = document.createElement('div');
      card.className = 'adm-kpi-card';

      var t = document.createElement('div');
      t.className = 'adm-kpi-title';
      t.textContent = k.title;

      var v = document.createElement('div');
      v.className = 'adm-kpi-val';
      v.textContent = k.val.toLocaleString('ko-KR');

      var u = document.createElement('span');
      u.className = 'adm-kpi-unit';
      u.textContent = '명';
      v.appendChild(u);

      card.appendChild(t);
      card.appendChild(v);
      kpiGrid.appendChild(card);
    });
    sec.appendChild(kpiGrid);

    // 2. 가입 경로 (providers)
    var provCard = document.createElement('div');
    provCard.className = 'adm-sub-card';

    var provH3 = document.createElement('h3');
    provH3.textContent = '가입 경로';
    provCard.appendChild(provH3);

    var provObj = (summary && summary.providers && typeof summary.providers === 'object') ? summary.providers : {};
    var provKeys = Object.keys(provObj);

    if (!provKeys.length) {
      var pEmpty = document.createElement('p');
      pEmpty.className = 'adm-empty';
      pEmpty.textContent = '가입 경로 정보가 없습니다.';
      provCard.appendChild(pEmpty);
    } else {
      var provList = document.createElement('div');
      provList.className = 'adm-pill-list';

      provKeys.forEach(function (key) {
        var count = Number(provObj[key]) || 0;
        var pill = document.createElement('span');
        pill.className = 'adm-pill';

        var nameSpan = document.createElement('span');
        nameSpan.textContent = translateProvider(key) + ' ';

        var countSpan = document.createElement('b');
        countSpan.textContent = count.toLocaleString('ko-KR') + '명';

        pill.appendChild(nameSpan);
        pill.appendChild(countSpan);
        provList.appendChild(pill);
      });
      provCard.appendChild(provList);
    }
    sec.appendChild(provCard);

    // 3. 역할 (업체·부매니저·관리자 수)
    var roleCard = document.createElement('div');
    roleCard.className = 'adm-sub-card';

    var roleH3 = document.createElement('h3');
    roleH3.textContent = '역할';
    roleCard.appendChild(roleH3);

    var roleList = document.createElement('div');
    roleList.className = 'adm-pill-list';

    var roleItems = [
      { label: '업체', count: Number(summary && summary.vendors) || 0 },
      { label: '부매니저', count: Number(summary && summary.submanagers) || 0 },
      { label: '관리자', count: Number(summary && summary.admins) || 0 }
    ];

    roleItems.forEach(function (r) {
      var pill = document.createElement('span');
      pill.className = 'adm-pill';

      var labelSpan = document.createElement('span');
      labelSpan.textContent = r.label + ' ';

      var countSpan = document.createElement('b');
      countSpan.textContent = r.count.toLocaleString('ko-KR') + '명';

      pill.appendChild(labelSpan);
      pill.appendChild(countSpan);
      roleList.appendChild(pill);
    });
    roleCard.appendChild(roleList);
    sec.appendChild(roleCard);

    // 4. 최근 가입 20명 표 (관리자에게만 표시, 부매니저에게는 명단 칸 자체를 그리지 않음)
    if (roles && roles.admin) {
      var recSec = document.createElement('div');
      recSec.className = 'adm-sub-card';

      var recH3 = document.createElement('h3');
      recH3.textContent = '최근 가입 20명';
      recSec.appendChild(recH3);

      var tableWrap = document.createElement('div');
      tableWrap.className = 'adm-table-wrap';

      if (!recent || !recent.length) {
        var emptyP = document.createElement('p');
        emptyP.className = 'adm-empty';
        emptyP.textContent = '최근 가입한 회원이 없습니다.';
        tableWrap.appendChild(emptyP);
      } else {
        var table = document.createElement('table');
        table.className = 'adm-table';

        var thead = document.createElement('thead');
        var trHead = document.createElement('tr');
        ['가입일', '가입 경로', '이름', '이메일', '마지막 접속일'].forEach(function (h) {
          var th = document.createElement('th');
          th.scope = 'col';
          th.textContent = h;
          trHead.appendChild(th);
        });
        thead.appendChild(trHead);
        table.appendChild(thead);

        var tbody = document.createElement('tbody');
        recent.forEach(function (row) {
          var tr = document.createElement('tr');

          var tdJoin = document.createElement('td');
          tdJoin.className = 'adm-date';
          tdJoin.setAttribute('data-label', '가입일');
          tdJoin.textContent = formatDateMD(row.joined_at);

          var tdProv = document.createElement('td');
          tdProv.setAttribute('data-label', '가입 경로');
          tdProv.textContent = translateProvider(row.provider);

          var tdName = document.createElement('td');
          tdName.className = 'adm-name';
          tdName.setAttribute('data-label', '이름');
          tdName.textContent = row.display_name || '-';

          var tdEmail = document.createElement('td');
          tdEmail.className = 'adm-email';
          tdEmail.setAttribute('data-label', '이메일');
          tdEmail.textContent = row.email_masked || '-';

          var tdLast = document.createElement('td');
          tdLast.className = 'adm-date';
          tdLast.setAttribute('data-label', '마지막 접속일');
          tdLast.textContent = formatDateMD(row.last_sign_in_at);

          tr.appendChild(tdJoin);
          tr.appendChild(tdProv);
          tr.appendChild(tdName);
          tr.appendChild(tdEmail);
          tr.appendChild(tdLast);
          tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        tableWrap.appendChild(table);
      }
      recSec.appendChild(tableWrap);
      sec.appendChild(recSec);
    }

    container.appendChild(sec);
  }

  // [회원 현황] 탭 데이터 호출 및 진입
  function loadMembersTab(container, sb, roles, force) {
    if (!container || !sb) return;

    if (!force && membersCache.loaded) {
      if (!container.firstChild) {
        renderMembersView(container, sb, roles, membersCache.summary, membersCache.recent);
      }
      return;
    }

    clearBox(container);
    injectStatsStyles();

    var loadingBox = document.createElement('div');
    loadingBox.className = 'bd-ready';
    loadingBox.setAttribute('role', 'status');
    var lb = document.createElement('b');
    lb.textContent = '회원 현황을 불러오는 중입니다…';
    loadingBox.appendChild(lb);
    container.appendChild(loadingBox);

    var calls = [sb.rpc('admin_member_summary')];
    // 부매니저에게는 admin_recent_members를 부르지 않는다
    if (roles && roles.admin) {
      calls.push(sb.rpc('admin_recent_members', { n: 20 }));
    }

    Promise.all(calls).then(function (results) {
      var sumRes = results[0];
      var recRes = results[1] || null;

      if (!sumRes || sumRes.error) {
        throw (sumRes && sumRes.error) || new Error('admin_member_summary failed');
      }
      if (roles && roles.admin && (!recRes || recRes.error)) {
        throw (recRes && recRes.error) || new Error('admin_recent_members failed');
      }

      var sData = sumRes.data;
      if (typeof sData === 'string') {
        try { sData = JSON.parse(sData); } catch (e) { sData = null; }
      }
      if (Array.isArray(sData)) {
        sData = sData[0] || {};
      }
      if (!sData || typeof sData !== 'object') {
        sData = {};
      }

      var rData = (recRes && Array.isArray(recRes.data)) ? recRes.data : [];

      membersCache.loaded = true;
      membersCache.summary = sData;
      membersCache.recent = rData;

      renderMembersView(container, sb, roles, sData, rData);
    }).catch(function (err) {
      console.error('admin_member_summary or admin_recent_members error:', err);
      renderErrorBox(container, '현황을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.', function () {
        loadMembersTab(container, sb, roles, true);
      });
    });
  }

  // [일간 현황] 탭 렌더링
  function renderDailyView(container, sb, roles, rawRows, days) {
    clearBox(container);
    injectStatsStyles();

    var sec = document.createElement('section');
    sec.className = 'card';

    // 머리 (제목 + 기간 선택 7·14·30일 + 새로 불러오기)
    var head = document.createElement('div');
    head.className = 'adm-stat-head';

    var h2 = document.createElement('h2');
    h2.textContent = '일간 현황';
    head.appendChild(h2);

    var actions = document.createElement('div');
    actions.className = 'adm-stat-actions';

    var pWrap = document.createElement('div');
    pWrap.className = 'adm-period-btns';
    [7, 14, 30].forEach(function (d) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'adm-period-btn' + (d === days ? ' on' : '');
      btn.textContent = d + '일';
      btn.addEventListener('click', function () {
        if (d !== days) {
          loadDailyTab(container, sb, roles, true, d);
        }
      });
      pWrap.appendChild(btn);
    });
    actions.appendChild(pWrap);

    var refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.className = 'bd-btn small';
    refreshBtn.textContent = '새로 불러오기';
    refreshBtn.addEventListener('click', function () {
      loadDailyTab(container, sb, roles, true, days);
    });
    actions.appendChild(refreshBtn);

    head.appendChild(actions);
    sec.appendChild(head);

    // 데이터 처리: DB 반환은 오래된 날→최근 날 순이므로 역순(reverse)으로 정렬해 "오늘"이 맨 위에 오도록 배치
    var rows = (Array.isArray(rawRows) ? rawRows : []).slice().reverse();

    var tableWrap = document.createElement('div');
    tableWrap.className = 'adm-table-wrap';

    if (!rows.length) {
      var emptyP = document.createElement('p');
      emptyP.className = 'adm-empty';
      emptyP.textContent = '표시할 현황 데이터가 없습니다.';
      tableWrap.appendChild(emptyP);
    } else {
      var maxSignups = 1;
      rows.forEach(function (r) {
        var s = Number(r.signups) || 0;
        if (s > maxSignups) maxSignups = s;
      });

      var todayStr = getKoreaTodayYMD();

      var table = document.createElement('table');
      table.className = 'adm-table';

      var thead = document.createElement('thead');
      var trHead = document.createElement('tr');
      ['날짜', '신규 가입', '접속 회원', '단가표 글', '이야기 글', '신고', '자동 숨김'].forEach(function (colName, idx) {
        var th = document.createElement('th');
        th.scope = 'col';
        if (idx >= 1) th.style.textAlign = 'right';
        th.textContent = colName;
        trHead.appendChild(th);
      });
      thead.appendChild(trHead);
      table.appendChild(thead);

      var tbody = document.createElement('tbody');

      var sumSignups = 0;
      var sumDanga = 0;
      var sumStory = 0;
      var sumReports = 0;
      var sumHidden = 0;

      rows.forEach(function (row, idx) {
        var rowDateStr = formatDateYMD(row.day);
        var isToday = (rowDateStr === todayStr) || (idx === 0 && rowDateStr >= todayStr);

        var s = Number(row.signups) || 0;
        var act = Number(row.active) || 0;
        var dg = Number(row.posts_danga) || 0;
        var st = Number(row.posts_story) || 0;
        var rp = Number(row.reports) || 0;
        var hd = Number(row.hidden_posts) || 0;

        sumSignups += s;
        sumDanga += dg;
        sumStory += st;
        sumReports += rp;
        sumHidden += hd;

        var tr = document.createElement('tr');
        if (isToday) {
          tr.className = 'adm-row-today';
        }

        // 날짜 (오늘이면 [오늘] 뱃지)
        var tdDate = document.createElement('td');
        tdDate.className = 'adm-date';
        tdDate.setAttribute('data-label', '날짜');
        tdDate.textContent = rowDateStr;
        if (isToday) {
          var todayBadge = document.createElement('span');
          todayBadge.className = 'adm-badge-today';
          todayBadge.textContent = '오늘';
          tdDate.appendChild(todayBadge);
        }

        // 신규 가입 (숫자 + CSS 막대)
        var tdSignups = document.createElement('td');
        tdSignups.style.textAlign = 'right';
        tdSignups.setAttribute('data-label', '신규 가입');

        var barWrap = document.createElement('span');
        barWrap.className = 'adm-stat-bar-wrap';

        var numSpan = document.createElement('span');
        numSpan.textContent = s.toLocaleString('ko-KR') + '명';
        barWrap.appendChild(numSpan);

        if (s > 0) {
          var pct = Math.max(8, Math.round((s / maxSignups) * 100));
          var track = document.createElement('span');
          track.className = 'adm-stat-bar-track';
          track.setAttribute('aria-hidden', 'true');

          var fill = document.createElement('span');
          fill.className = 'adm-stat-bar-fill';
          fill.style.width = pct + '%';

          track.appendChild(fill);
          barWrap.appendChild(track);
        }
        tdSignups.appendChild(barWrap);

        // 접속 회원
        var tdActive = document.createElement('td');
        tdActive.style.textAlign = 'right';
        tdActive.setAttribute('data-label', '접속 회원');
        tdActive.textContent = act.toLocaleString('ko-KR') + '명';

        // 단가표 글
        var tdDanga = document.createElement('td');
        tdDanga.style.textAlign = 'right';
        tdDanga.setAttribute('data-label', '단가표 글');
        tdDanga.textContent = dg.toLocaleString('ko-KR') + '건';

        // 이야기 글
        var tdStory = document.createElement('td');
        tdStory.style.textAlign = 'right';
        tdStory.setAttribute('data-label', '이야기 글');
        tdStory.textContent = st.toLocaleString('ko-KR') + '건';

        // 신고
        var tdReports = document.createElement('td');
        tdReports.style.textAlign = 'right';
        tdReports.setAttribute('data-label', '신고');
        tdReports.textContent = rp.toLocaleString('ko-KR') + '건';

        // 자동 숨김
        var tdHidden = document.createElement('td');
        tdHidden.style.textAlign = 'right';
        tdHidden.setAttribute('data-label', '자동 숨김');
        tdHidden.textContent = hd.toLocaleString('ko-KR') + '건';

        tr.appendChild(tdDate);
        tr.appendChild(tdSignups);
        tr.appendChild(tdActive);
        tr.appendChild(tdDanga);
        tr.appendChild(tdStory);
        tr.appendChild(tdReports);
        tr.appendChild(tdHidden);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);

      // 아래 합계 한 줄 (접속 회원은 합계 대신 "—")
      var tfoot = document.createElement('tfoot');
      var trTotal = document.createElement('tr');
      trTotal.className = 'adm-row-total';

      var tdTotLabel = document.createElement('td');
      tdTotLabel.setAttribute('data-label', '구분');
      tdTotLabel.textContent = '합계 (' + days + '일간)';

      var tdTotSignups = document.createElement('td');
      tdTotSignups.style.textAlign = 'right';
      tdTotSignups.setAttribute('data-label', '신규 가입 합계');
      tdTotSignups.textContent = sumSignups.toLocaleString('ko-KR') + '명';

      var tdTotActive = document.createElement('td');
      tdTotActive.style.textAlign = 'right';
      tdTotActive.setAttribute('data-label', '접속 회원');
      tdTotActive.textContent = '—'; // 접속 회원은 합계 대신 대시 표시

      var tdTotDanga = document.createElement('td');
      tdTotDanga.style.textAlign = 'right';
      tdTotDanga.setAttribute('data-label', '단가표 글 합계');
      tdTotDanga.textContent = sumDanga.toLocaleString('ko-KR') + '건';

      var tdTotStory = document.createElement('td');
      tdTotStory.style.textAlign = 'right';
      tdTotStory.setAttribute('data-label', '이야기 글 합계');
      tdTotStory.textContent = sumStory.toLocaleString('ko-KR') + '건';

      var tdTotReports = document.createElement('td');
      tdTotReports.style.textAlign = 'right';
      tdTotReports.setAttribute('data-label', '신고 합계');
      tdTotReports.textContent = sumReports.toLocaleString('ko-KR') + '건';

      var tdTotHidden = document.createElement('td');
      tdTotHidden.style.textAlign = 'right';
      tdTotHidden.setAttribute('data-label', '자동 숨김 합계');
      tdTotHidden.textContent = sumHidden.toLocaleString('ko-KR') + '건';

      trTotal.appendChild(tdTotLabel);
      trTotal.appendChild(tdTotSignups);
      trTotal.appendChild(tdTotActive);
      trTotal.appendChild(tdTotDanga);
      trTotal.appendChild(tdTotStory);
      trTotal.appendChild(tdTotReports);
      trTotal.appendChild(tdTotHidden);
      tfoot.appendChild(trTotal);
      table.appendChild(tfoot);

      tableWrap.appendChild(table);
    }
    sec.appendChild(tableWrap);

    // 안내 문구 (작은 글씨)
    var noteP = document.createElement('p');
    noteP.className = 'adm-stat-note';
    noteP.textContent = '삭제된 글은 숫자에 들어가지 않습니다. 접속 회원은 마지막 접속 기준이라 나중에 다시 접속하면 과거 숫자가 줄어들 수 있습니다. 방문자 수는 구글 애널리틱스에서 따로 봅니다.';
    sec.appendChild(noteP);

    container.appendChild(sec);
  }

  // [일간 현황] 탭 데이터 호출 및 진입
  function loadDailyTab(container, sb, roles, force, days) {
    if (!container || !sb) return;

    var targetDays = days || dailyCache.days || 14;

    if (!force && dailyCache.loaded && dailyCache.days === targetDays) {
      if (!container.firstChild) {
        renderDailyView(container, sb, roles, dailyCache.rows, targetDays);
      }
      return;
    }

    clearBox(container);
    injectStatsStyles();

    var loadingBox = document.createElement('div');
    loadingBox.className = 'bd-ready';
    loadingBox.setAttribute('role', 'status');
    var lb = document.createElement('b');
    lb.textContent = '일간 현황을 불러오는 중입니다…';
    loadingBox.appendChild(lb);
    container.appendChild(loadingBox);

    sb.rpc('admin_daily_stats', { days: targetDays }).then(function (res) {
      if (!res || res.error) {
        throw (res && res.error) || new Error('admin_daily_stats failed');
      }

      var rawRows = Array.isArray(res.data) ? res.data : [];
      dailyCache.loaded = true;
      dailyCache.days = targetDays;
      dailyCache.rows = rawRows;

      renderDailyView(container, sb, roles, rawRows, targetDays);
    }).catch(function (err) {
      console.error('admin_daily_stats error:', err);
      renderErrorBox(container, '현황을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.', function () {
        loadDailyTab(container, sb, roles, true, targetDays);
      });
    });
  }

  window.ZW_BOARD_STATS = {
    loadMembersTab: loadMembersTab,
    loadDailyTab: loadDailyTab,
    resetCache: resetCache
  };
})();
