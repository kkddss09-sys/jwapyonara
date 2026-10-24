// 좌표나라 게시판 관리자 스크립트 (site/board/admin/admin.js)
// 계약서(게시판/계약.md, 게시판/계약-추가-관리자.md)의 테이블·열·함수·규칙 이름을 한 글자도 바꾸지 않고 그대로 따른다.
// 모든 글자 출력은 textContent만 사용한다(innerHTML에 사용자 값을 넣지 않는다).

(function () {
  'use strict';

  var SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  var CONFIRM_RESET_MS = 5000;

  var sb = null;
  var currentUser = null;
  var roleState = 'none'; // 'none' | 'loading' | 'error' | 'loaded'
  var roles = { admin: false, submanager: false, vendor: false, vendor_name: null };

  function clearBox(el) {
    if (!el) return;
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }

  function injectStyles() {
    if (document.getElementById('zw-board-admin-style')) return;
    var st = document.createElement('style');
    st.id = 'zw-board-admin-style';
    st.textContent = [
      '.bd-subnav { display:flex; gap:8px; overflow-x:auto; margin:0 0 14px; padding-bottom:4px; scrollbar-width:none; }',
      '.bd-subnav::-webkit-scrollbar { display:none; }',
      '.bd-subnav a { flex:none; text-decoration:none; font-size:15px; font-weight:700; padding:8px 16px; border-radius:999px; border:1.5px solid var(--line); background:var(--card); color:var(--sub); }',
      '.bd-subnav a.on { background:var(--panel); border-color:var(--panel); color:#fff; }',
      '.bd-notice { background:var(--warnbg); border:1px solid var(--line); border-radius:16px; padding:14px 16px; margin-bottom:14px; font-size:15px; line-height:1.55; color:var(--ink); font-weight:600; }',
      '.bd-ready { background:var(--card); border:1.5px solid var(--line); border-radius:18px; padding:28px 18px; margin-bottom:16px; text-align:center; }',
      '.bd-ready b { display:block; font-size:20px; margin-bottom:6px; color:var(--ink); }',
      '.bd-ready p { margin:0; font-size:15px; color:var(--sub); }',
      '.bd-auth { background:var(--card); border:1px solid var(--line); border-radius:18px; padding:16px; margin-bottom:14px; }',
      '.bd-auth-top { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; }',
      '.bd-auth-user { font-size:15px; font-weight:700; color:var(--ink); display:flex; align-items:center; gap:8px; flex-wrap:wrap; word-break:break-all; }',
      '.adm-role-badge { display:inline-block; font-size:13px; font-weight:800; padding:4px 10px; border-radius:999px; background:var(--soft); color:var(--red); }',
      '.bd-auth-btns { display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:8px; margin-top:10px; }',
      '.bd-btn { font:inherit; font-size:15px; font-weight:700; border-radius:12px; padding:12px 14px; border:1.5px solid var(--line); background:var(--card); color:var(--ink); cursor:pointer; text-align:center; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; gap:6px; min-height:46px; }',
      '.bd-btn.primary { background:var(--red); border-color:var(--red); color:#fff; }',
      '.bd-btn.danger { background:var(--dangerbg); border-color:var(--danger); color:var(--danger); }',
      '.bd-btn.small { font-size:13px; padding:7px 12px; min-height:36px; border-radius:999px; }',
      '.bd-btn:disabled { opacity:0.55; cursor:default; }',
      '.bd-msg { border-radius:14px; padding:12px 14px; margin:10px 0; font-size:15px; font-weight:600; display:none; line-height:1.5; word-break:keep-all; overflow-wrap:anywhere; }',
      '.bd-msg.err { display:block; background:var(--dangerbg); color:var(--danger); }',
      '.bd-msg.ok { display:block; background:var(--okbg); color:var(--ok); }',
      '.bd-msg small { display:block; margin-top:4px; font-size:12px; font-weight:500; opacity:0.9; }',
      '.adm-form { display:grid; grid-template-columns:minmax(0, 1.3fr) minmax(0, 1fr) auto; gap:10px; align-items:end; margin-bottom:14px; }',
      '.adm-form .field { margin-bottom:0; min-width:0; }',
      '.adm-form label { display:block; font-size:13px; font-weight:700; color:var(--sub); margin-bottom:5px; }',
      '.adm-form input[type="text"], .adm-form input[type="email"] { width:100%; border:1.5px solid var(--line); border-radius:12px; background:var(--card); color:var(--ink); font:inherit; font-size:15px; padding:11px 12px; outline:0; min-height:46px; }',
      '.adm-form input[type="text"]:focus, .adm-form input[type="email"]:focus { border-color:var(--red); }',
      '.adm-sec-head { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; margin-bottom:12px; }',
      '.adm-sec-head h2 { margin:0; font-size:19px; }',
      '.adm-table-wrap { width:100%; overflow-x:auto; }',
      '.adm-table { width:100%; border-collapse:collapse; font-size:15px; }',
      '.adm-table th, .adm-table td { padding:11px 10px; border-bottom:1px solid var(--line); text-align:left; vertical-align:middle; }',
      '.adm-table th { font-size:13px; font-weight:700; color:var(--sub); background:var(--fill); }',
      '.adm-table td.adm-email { font-weight:600; word-break:break-all; overflow-wrap:anywhere; }',
      '.adm-table td.adm-name { font-weight:700; word-break:keep-all; overflow-wrap:anywhere; }',
      '.adm-table td.adm-date { font-size:13px; color:var(--sub); white-space:nowrap; }',
      '.adm-table td.adm-act { text-align:right; white-space:nowrap; }',
      '.adm-empty { text-align:center; color:var(--sub); font-size:14px; padding:20px 8px; margin:0; }',
      '.bd-legal-links { margin-top:28px; padding-top:16px; border-top:1px solid var(--line); display:flex; flex-wrap:wrap; gap:10px 14px; justify-content:center; font-size:14px; color:var(--sub); }',
      '.bd-legal-links a { color:var(--sub); text-decoration:none; font-weight:600; }',
      '.bd-legal-links a:hover { color:var(--red); text-decoration:underline; }',
      '@media (max-width:560px) {',
      '  .adm-form { grid-template-columns:1fr; }',
      '  .adm-form .bd-btn { width:100%; }',
      '  .adm-table, .adm-table tbody { display:block; width:100%; }',
      '  .adm-table thead { display:none; }',
      '  .adm-table tr { display:block; background:var(--fill); border:1px solid var(--line); border-radius:14px; padding:12px 14px; margin-bottom:10px; }',
      '  .adm-table td { display:flex; justify-content:space-between; align-items:center; gap:10px; padding:5px 0; border-bottom:0; text-align:right; }',
      '  .adm-table td::before { content:attr(data-label); font-size:13px; font-weight:700; color:var(--sub); flex:none; text-align:left; }',
      '  .adm-table td.adm-email { word-break:break-all; }',
      '  .adm-table td.adm-act { display:block; padding-top:8px; margin-top:6px; border-top:1px solid var(--line); text-align:center; white-space:normal; }',
      '  .adm-table td.adm-act::before { display:none; }',
      '  .adm-table td.adm-act .bd-btn { width:100%; }',
      '}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function getConfig() {
    var c = window.BOARD_CONFIG || {};
    return {
      SUPABASE_URL: (c.SUPABASE_URL || '').trim(),
      SUPABASE_ANON_KEY: (c.SUPABASE_ANON_KEY || '').trim(),
      NAVER_ENABLED: Boolean(c.NAVER_ENABLED)
    };
  }

  function isConfigured() {
    var cfg = getConfig();
    return Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  }

  function getRedirectUrl() {
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      var path = location.pathname || '/board/admin/index.html';
      if (path.slice(-1) === '/') path += 'index.html';
      return location.origin + path;
    }
    return 'https://jwapyonara.com/board/admin/index.html';
  }

  function formatDate(iso) {
    if (!iso) return '-';
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '-';
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, '0');
      var day = String(d.getDate()).padStart(2, '0');
      return y + '.' + m + '.' + day;
    } catch (e) {
      return '-';
    }
  }

  function isValidEmail(email) {
    if (!email || email.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function sanitizeTechnical(err) {
    var raw = String((err && err.message) || (typeof err === 'string' ? err : '') || '상세 오류 없음');
    return raw
      .replace(/https?:\/\/\S+/gi, '[주소 숨김]')
      .replace(/[^\s<>"'()]+@[^\s<>"'()]+/g, '[이메일 숨김]')
      .replace(/\b(?:bearer\s+\S+|(?:[\w-]*(?:key|token|secret|password)[\w-]*|authorization)\s*[:=]\s*[^\r\n]+)/gi, '[인증 정보 숨김]')
      .replace(/[A-Za-z0-9_.\/-]{32,}/g, '[긴 식별값 숨김]')
      .replace(/[\r\n]+/g, ' ')
      .slice(0, 240);
  }

  function parseErrorInfo(err) {
    if (!err) {
      return { main: '요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.', tech: '' };
    }
    var raw = '';
    if (typeof err === 'string') raw = err;
    else raw = [err.message, err.details, err.hint, err.error_description, err.code].filter(Boolean).join(' ');
    var low = raw.toLowerCase();

    if (low.indexOf('23505') >= 0 || low.indexOf('duplicate') >= 0 || low.indexOf('unique') >= 0 || low.indexOf('already exists') >= 0) {
      return { main: '이미 등록되어 있습니다', tech: '' };
    }
    if (low.indexOf('42501') >= 0 || low.indexOf('row-level security') >= 0 || low.indexOf('permission') >= 0 || low.indexOf('policy') >= 0) {
      return {
        main: '이 작업을 할 권한이 없습니다. 관리자 또는 부매니저 권한을 확인해 주세요.',
        tech: '기술 정보: ' + sanitizeTechnical(err)
      };
    }
    if (!currentUser || low.indexOf('jwt') >= 0 || low.indexOf('not authenticated') >= 0 || low.indexOf('401') >= 0) {
      return {
        main: '로그인이 만료되었거나 로그인이 필요합니다. 다시 로그인해 주세요.',
        tech: '기술 정보: ' + sanitizeTechnical(err)
      };
    }
    return {
      main: '요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
      tech: '기술 정보: ' + sanitizeTechnical(err)
    };
  }

  function showMessage(msgEl, type, mainText, techText) {
    if (!msgEl) return;
    clearBox(msgEl);
    if (!mainText) {
      msgEl.className = 'bd-msg';
      return;
    }
    msgEl.className = 'bd-msg ' + (type === 'ok' ? 'ok' : 'err');
    var span = document.createElement('span');
    span.textContent = mainText;
    msgEl.appendChild(span);
    if (techText) {
      var sm = document.createElement('small');
      sm.textContent = techText;
      msgEl.appendChild(sm);
    }
  }

  function renderStatusBox(container, titleText, descText) {
    clearBox(container);
    var box = document.createElement('div');
    box.className = 'bd-ready';
    box.setAttribute('role', 'status');
    var b = document.createElement('b');
    b.textContent = titleText;
    box.appendChild(b);
    if (descText) {
      var p = document.createElement('p');
      p.textContent = descText;
      box.appendChild(p);
    }
    container.appendChild(box);
  }

  function ensureSupabaseScript(cb) {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      cb(true);
      return;
    }
    var s = document.createElement('script');
    s.src = SUPABASE_CDN;
    s.onload = function () { cb(Boolean(window.supabase && window.supabase.createClient)); };
    s.onerror = function () { cb(false); };
    document.head.appendChild(s);
  }

  function fetchMyRoles() {
    roles = { admin: false, submanager: false, vendor: false, vendor_name: null };
    if (!sb || !currentUser) {
      roleState = 'none';
      return Promise.resolve();
    }
    roleState = 'loading';
    return sb.rpc('my_roles').then(function (res) {
      if (!res || res.error) {
        roleState = 'error';
        return;
      }
      var d = res.data;
      if (typeof d === 'string') {
        try { d = JSON.parse(d); } catch (e) { d = null; }
      }
      if (Array.isArray(d)) {
        d = d[0] || null;
      }
      if (!d || typeof d !== 'object') {
        roleState = 'error';
        return;
      }
      roles = {
        admin: Boolean(d.admin),
        submanager: Boolean(d.submanager),
        vendor: Boolean(d.vendor),
        vendor_name: d.vendor_name ? String(d.vendor_name) : null
      };
      roleState = 'loaded';
    }).catch(function () {
      roleState = 'error';
    });
  }

  function buildAuthBar(onLoggedOut) {
    var cfg = getConfig();
    var wrap = document.createElement('div');
    wrap.className = 'bd-auth';

    if (currentUser) {
      var top = document.createElement('div');
      top.className = 'bd-auth-top';

      var who = document.createElement('div');
      who.className = 'bd-auth-user';

      var emailSpan = document.createElement('span');
      emailSpan.textContent = '로그인 계정: ' + (currentUser.email || '이메일 없음');
      who.appendChild(emailSpan);

      if (roleState === 'loaded' && (roles.admin || roles.submanager)) {
        var badge = document.createElement('span');
        badge.className = 'adm-role-badge';
        badge.textContent = '내 역할: ' + (roles.admin ? '관리자' : '부매니저');
        who.appendChild(badge);
      }

      var outBtn = document.createElement('button');
      outBtn.type = 'button';
      outBtn.className = 'bd-btn small';
      outBtn.textContent = '로그아웃';
      outBtn.addEventListener('click', function () {
        outBtn.disabled = true;
        sb.auth.signOut().then(function () {
          currentUser = null;
          roleState = 'none';
          roles = { admin: false, submanager: false, vendor: false, vendor_name: null };
          if (onLoggedOut) onLoggedOut();
        }).catch(function () {
          outBtn.disabled = false;
        });
      });

      top.appendChild(who);
      top.appendChild(outBtn);
      wrap.appendChild(top);
    } else {
      var guide = document.createElement('div');
      guide.style.fontSize = '14px';
      guide.style.color = 'var(--sub)';
      guide.textContent = '관리자 페이지는 운영진(관리자·부매니저) 로그인이 필요합니다.';
      wrap.appendChild(guide);

      var btns = document.createElement('div');
      btns.className = 'bd-auth-btns';

      var msg = document.createElement('div');
      msg.className = 'bd-msg';

      function makeOAuthBtn(label, provider, enabled) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'bd-btn';
        if (!enabled) {
          b.disabled = true;
          b.textContent = label + ' (곧 열립니다)';
          return b;
        }
        b.textContent = label;
        b.addEventListener('click', function () {
          showMessage(msg, 'ok', '', '');
          sb.auth.signInWithOAuth({
            provider: provider,
            options: { redirectTo: getRedirectUrl() }
          }).then(function (res) {
            if (res && res.error) {
              var info = parseErrorInfo(res.error);
              showMessage(msg, 'err', info.main, info.tech);
            }
          }).catch(function (err) {
            var info = parseErrorInfo(err);
            showMessage(msg, 'err', info.main, info.tech);
          });
        });
        return b;
      }

      btns.appendChild(makeOAuthBtn('구글 로그인', 'google', true));
      btns.appendChild(makeOAuthBtn('카카오 로그인', 'kakao', true));
      btns.appendChild(makeOAuthBtn('네이버 로그인', 'naver', cfg.NAVER_ENABLED));
      wrap.appendChild(btns);
      wrap.appendChild(msg);
    }

    return wrap;
  }

  // 공통 권한 관리 섹션 생성기 (vendors / submanagers)
  function buildPermissionSection(spec) {
    // spec: { table, title, nameLabel, namePlaceholder, submitLabel, emptyText, idPrefix }
    var sec = document.createElement('section');
    sec.className = 'card';

    var head = document.createElement('div');
    head.className = 'adm-sec-head';

    var h2 = document.createElement('h2');
    h2.textContent = spec.title;

    var refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.className = 'bd-btn small';
    refreshBtn.textContent = '새로고침';

    head.appendChild(h2);
    head.appendChild(refreshBtn);
    sec.appendChild(head);

    // 등록 폼
    var form = document.createElement('div');
    form.className = 'adm-form';

    var fEmail = document.createElement('div');
    fEmail.className = 'field';
    var lEmail = document.createElement('label');
    lEmail.setAttribute('for', spec.idPrefix + 'Email');
    lEmail.textContent = '이메일';
    var iEmail = document.createElement('input');
    iEmail.id = spec.idPrefix + 'Email';
    iEmail.type = 'email';
    iEmail.inputMode = 'email';
    iEmail.autocomplete = 'off';
    iEmail.maxLength = 254;
    iEmail.placeholder = '예: user@gmail.com';
    fEmail.appendChild(lEmail);
    fEmail.appendChild(iEmail);

    var fName = document.createElement('div');
    fName.className = 'field';
    var lName = document.createElement('label');
    lName.setAttribute('for', spec.idPrefix + 'Name');
    lName.textContent = spec.nameLabel;
    var iName = document.createElement('input');
    iName.id = spec.idPrefix + 'Name';
    iName.type = 'text';
    iName.autocomplete = 'off';
    iName.maxLength = 80;
    iName.placeholder = spec.namePlaceholder;
    fName.appendChild(lName);
    fName.appendChild(iName);

    var addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'bd-btn primary';
    addBtn.textContent = spec.submitLabel;

    form.appendChild(fEmail);
    form.appendChild(fName);
    form.appendChild(addBtn);
    sec.appendChild(form);

    var msgBox = document.createElement('div');
    msgBox.className = 'bd-msg';
    sec.appendChild(msgBox);

    var tableWrap = document.createElement('div');
    tableWrap.className = 'adm-table-wrap';
    sec.appendChild(tableWrap);

    var loadedRows = [];

    function renderRows(rows) {
      loadedRows = Array.isArray(rows) ? rows : [];
      clearBox(tableWrap);

      if (!loadedRows.length) {
        var emptyP = document.createElement('p');
        emptyP.className = 'adm-empty';
        emptyP.textContent = spec.emptyText;
        tableWrap.appendChild(emptyP);
        return;
      }

      var table = document.createElement('table');
      table.className = 'adm-table';

      var thead = document.createElement('thead');
      var trHead = document.createElement('tr');
      ['이메일', spec.nameLabel, '등록일', '권한 해제'].forEach(function (colText, idx) {
        var th = document.createElement('th');
        th.scope = 'col';
        if (idx === 3) th.style.textAlign = 'right';
        th.textContent = colText;
        trHead.appendChild(th);
      });
      thead.appendChild(trHead);
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      loadedRows.forEach(function (row) {
        var tr = document.createElement('tr');

        var tdEmail = document.createElement('td');
        tdEmail.className = 'adm-email';
        tdEmail.setAttribute('data-label', '이메일');
        tdEmail.textContent = row.email || '';

        var tdName = document.createElement('td');
        tdName.className = 'adm-name';
        tdName.setAttribute('data-label', spec.nameLabel);
        tdName.textContent = row.name || '-';

        var tdDate = document.createElement('td');
        tdDate.className = 'adm-date';
        tdDate.setAttribute('data-label', '등록일');
        tdDate.textContent = formatDate(row.created_at);

        var tdAct = document.createElement('td');
        tdAct.className = 'adm-act';
        tdAct.setAttribute('data-label', '관리');

        var delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'bd-btn small danger';
        delBtn.textContent = '권한 해제';

        var confirming = false;
        var resetTimer = null;

        delBtn.addEventListener('click', function () {
          showMessage(msgBox, 'ok', '', '');
          if (!confirming) {
            confirming = true;
            delBtn.textContent = '정말 해제할까요? 한 번 더 누르면 해제';
            if (resetTimer) clearTimeout(resetTimer);
            resetTimer = setTimeout(function () {
              confirming = false;
              delBtn.textContent = '권한 해제';
              resetTimer = null;
            }, CONFIRM_RESET_MS);
            return;
          }

          if (resetTimer) {
            clearTimeout(resetTimer);
            resetTimer = null;
          }
          delBtn.disabled = true;
          delBtn.textContent = '해제 중…';

          sb.from(spec.table)
            .delete()
            .eq('email', row.email)
            .then(function (res) {
              if (res && res.error) throw res.error;
              showMessage(msgBox, 'ok', (row.email || '') + ' 권한을 해제했습니다.', '');
              loadList(true);
            })
            .catch(function (err) {
              confirming = false;
              delBtn.disabled = false;
              delBtn.textContent = '권한 해제';
              var info = parseErrorInfo(err);
              showMessage(msgBox, 'err', info.main, info.tech);
            });
        });

        tdAct.appendChild(delBtn);
        tr.appendChild(tdEmail);
        tr.appendChild(tdName);
        tr.appendChild(tdDate);
        tr.appendChild(tdAct);
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      tableWrap.appendChild(table);
    }

    function loadList(keepMessage) {
      if (!keepMessage) {
        showMessage(msgBox, 'ok', '', '');
      }
      clearBox(tableWrap);
      var loadingP = document.createElement('p');
      loadingP.className = 'adm-empty';
      loadingP.textContent = '목록을 불러오는 중입니다…';
      tableWrap.appendChild(loadingP);

      sb.from(spec.table)
        .select('email,name,created_at')
        .order('created_at', { ascending: false })
        .then(function (res) {
          if (res && res.error) throw res.error;
          renderRows((res && res.data) ? res.data : []);
        })
        .catch(function (err) {
          clearBox(tableWrap);
          var errP = document.createElement('p');
          errP.className = 'adm-empty';
          errP.textContent = '목록을 불러오지 못했습니다.';
          tableWrap.appendChild(errP);
          var info = parseErrorInfo(err);
          showMessage(msgBox, 'err', info.main, info.tech);
        });
    }

    function handleAdd() {
      showMessage(msgBox, 'ok', '', '');
      var normEmail = String(iEmail.value || '').trim().toLowerCase();
      var normName = String(iName.value || '').trim();
      iEmail.value = normEmail;
      iName.value = normName;

      if (!normEmail || !isValidEmail(normEmail)) {
        showMessage(msgBox, 'err', '올바른 이메일 주소를 입력해 주세요. (예: user@gmail.com)', '');
        iEmail.focus();
        return;
      }
      if (!normName) {
        showMessage(msgBox, 'err', spec.nameLabel + '을(를) 입력해 주세요.', '');
        iName.focus();
        return;
      }

      var exists = loadedRows.some(function (r) {
        return String(r.email || '').trim().toLowerCase() === normEmail;
      });
      if (exists) {
        showMessage(msgBox, 'err', '이미 등록되어 있습니다', '');
        return;
      }

      addBtn.disabled = true;
      addBtn.textContent = '등록 중…';

      sb.from(spec.table)
        .insert({ email: normEmail, name: normName })
        .then(function (res) {
          if (res && res.error) throw res.error;
          iEmail.value = '';
          iName.value = '';
          addBtn.disabled = false;
          addBtn.textContent = spec.submitLabel;
          showMessage(msgBox, 'ok', normEmail + ' (' + normName + ') 등록이 완료되었습니다.', '');
          loadList(true);
        })
        .catch(function (err) {
          addBtn.disabled = false;
          addBtn.textContent = spec.submitLabel;
          var info = parseErrorInfo(err);
          showMessage(msgBox, 'err', info.main, info.tech);
        });
    }

    addBtn.addEventListener('click', handleAdd);
    [iEmail, iName].forEach(function (inp) {
      inp.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          handleAdd();
        }
      });
    });
    refreshBtn.addEventListener('click', function () {
      loadList(false);
    });

    loadList(false);
    return sec;
  }

  function renderAdminPage(container) {
    if (!container) return;
    clearBox(container);

    // 1. 로그인 안 된 경우: 로그인 단추 안내만 표시
    if (!currentUser) {
      container.appendChild(buildAuthBar(function () {
        renderAdminPage(container);
      }));
      return;
    }

    // 2. 로그인 된 경우: 상단 로그인/역할 바 표시
    container.appendChild(buildAuthBar(function () {
      renderAdminPage(container);
    }));

    // 3. 역할 조회 중
    if (roleState === 'loading') {
      var loadingBox = document.createElement('div');
      loadingBox.className = 'bd-ready';
      loadingBox.setAttribute('role', 'status');
      var lb = document.createElement('b');
      lb.textContent = '권한을 확인하는 중입니다…';
      loadingBox.appendChild(lb);
      container.appendChild(loadingBox);
      return;
    }

    // 4. my_roles() 호출 실패 시: 안내 문구만 보이고 아무 관리 화면도 보이지 않게 함
    if (roleState === 'error') {
      var errBox = document.createElement('div');
      errBox.className = 'bd-ready';
      errBox.setAttribute('role', 'alert');
      var eb = document.createElement('b');
      eb.textContent = '권한을 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요.';
      errBox.appendChild(eb);
      container.appendChild(errBox);
      return;
    }

    // 5. 운영진(관리자·부매니저)이 아닌 경우: "운영진만 볼 수 있습니다."만 표시
    var isStaff = Boolean(roles.admin || roles.submanager);
    if (!isStaff) {
      var denyBox = document.createElement('div');
      denyBox.className = 'bd-ready';
      denyBox.setAttribute('role', 'status');
      var db = document.createElement('b');
      db.textContent = '운영진만 볼 수 있습니다.';
      denyBox.appendChild(db);
      container.appendChild(denyBox);
      return;
    }

    // 6. 운영진(관리자 또는 부매니저)인 경우: 이메일 안내 문구 + 업체 권한 칸 + (관리자 전용) 부매니저 권한 칸
    var notice = document.createElement('div');
    notice.className = 'bd-notice';
    notice.setAttribute('role', 'note');
    notice.textContent = '상대방이 구글 또는 카카오로 로그인한 계정의 이메일과 같아야 적용됩니다. 이메일을 주지 않는 카카오 계정은 연결할 수 없습니다.';
    container.appendChild(notice);

    // 업체 권한 칸 (관리자 + 부매니저 모두 표시)
    container.appendChild(buildPermissionSection({
      table: 'vendors',
      title: '업체 권한 (단가표 작성 허용)',
      nameLabel: '업체 이름',
      namePlaceholder: '예: ○○성지',
      submitLabel: '업체 등록',
      emptyText: '등록된 업체가 없습니다.',
      idPrefix: 'admVendor'
    }));

    // 부매니저 권한 칸 (관리자에게만 보임)
    if (roles.admin) {
      container.appendChild(buildPermissionSection({
        table: 'submanagers',
        title: '부매니저 권한 (관리자 전용)',
        nameLabel: '부매니저 이름',
        namePlaceholder: '예: 홍길동',
        submitLabel: '부매니저 등록',
        emptyText: '등록된 부매니저가 없습니다.',
        idPrefix: 'admSubmgr'
      }));
    }
  }

  var initialized = false;
  function init(options) {
    if (initialized && (!options || !options.force)) return;
    initialized = true;
    options = options || {};
    injectStyles();

    var container = document.getElementById(options.targetId || 'adminApp');
    if (!container) return;

    if (!isConfigured()) {
      renderStatusBox(container, '준비 중입니다', '관리자 페이지 설정을 준비하고 있습니다. 잠시만 기다려 주세요.');
      return;
    }

    ensureSupabaseScript(function (ok) {
      if (!ok || !window.supabase || typeof window.supabase.createClient !== 'function') {
        renderStatusBox(container, '준비 중입니다', '관리자 페이지 설정을 준비하고 있습니다. 잠시만 기다려 주세요.');
        return;
      }

      var cfg = getConfig();
      try {
        sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      } catch (e) {
        renderStatusBox(container, '준비 중입니다', '관리자 페이지 설정을 준비하고 있습니다. 잠시만 기다려 주세요.');
        return;
      }

      sb.auth.getSession().then(function (res) {
        var session = res && res.data && res.data.session;
        currentUser = session ? session.user : null;
        return fetchMyRoles();
      }).catch(function () {
        currentUser = null;
        roleState = 'none';
      }).then(function () {
        renderAdminPage(container);
      });

      sb.auth.onAuthStateChange(function (_event, session) {
        var nextUser = session ? session.user : null;
        var prevId = currentUser ? currentUser.id : null;
        var nextId = nextUser ? nextUser.id : null;
        if (prevId === nextId) return;
        currentUser = nextUser;
        fetchMyRoles().then(function () {
          renderAdminPage(container);
        });
      });
    });
  }

  window.ZW_BOARD_ADMIN = {
    init: init
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  } else {
    init();
  }
})();
