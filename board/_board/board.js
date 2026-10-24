// 좌표나라 게시판 공통 스크립트 (site/board/_board/board.js)
// 계약서(게시판/계약.md)의 테이블·열·버킷·규칙 이름을 한 글자도 바꾸지 않고 그대로 따른다.
// 수파베이스 라이브러리는 HTML에서 https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js 로 불러온다.

(function () {
  'use strict';

  var SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  var PAGE_SIZE = 20;
  var MAX_IMAGES = 5;
  var MAX_IMAGE_BYTES = 5 * 1024 * 1024;   // 5MB
  var MAX_EXCEL_BYTES = 10 * 1024 * 1024;  // 10MB
  var ALLOWED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp'];

  var sb = null;
  var currentUser = null;
  var vendorInfo = null; // { email, name }
  var isAdmin = false;

  // 화면 모양 (common.css의 색상·글자 변수를 그대로 따른다)
  function injectStyles() {
    if (document.getElementById('zw-board-style')) return;
    var st = document.createElement('style');
    st.id = 'zw-board-style';
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
      '.bd-auth-user { font-size:15px; font-weight:700; color:var(--ink); }',
      '.bd-auth-btns { display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:8px; margin-top:10px; }',
      '.bd-btn { font:inherit; font-size:15px; font-weight:700; border-radius:12px; padding:12px 14px; border:1.5px solid var(--line); background:var(--card); color:var(--ink); cursor:pointer; text-align:center; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; gap:6px; min-height:46px; }',
      '.bd-btn.primary { background:var(--red); border-color:var(--red); color:#fff; }',
      '.bd-btn.danger { background:var(--dangerbg); border-color:var(--danger); color:var(--danger); }',
      '.bd-btn.small { font-size:13px; padding:7px 12px; min-height:34px; border-radius:999px; }',
      '.bd-btn:disabled { opacity:0.55; cursor:default; }',
      '.bd-msg { border-radius:14px; padding:12px 14px; margin:10px 0; font-size:15px; font-weight:600; display:none; }',
      '.bd-msg.err { display:block; background:var(--dangerbg); color:var(--danger); }',
      '.bd-msg.ok { display:block; background:var(--okbg); color:var(--ok); }',
      '.bd-form .field { margin-bottom:14px; }',
      '.bd-form input[type="text"], .bd-form textarea, .bd-select { width:100%; border:1.5px solid var(--line); border-radius:12px; background:var(--card); color:var(--ink); font:inherit; font-size:16px; padding:12px 14px; outline:0; }',
      '.bd-form input[type="text"]:focus, .bd-form textarea:focus, .bd-select:focus { border-color:var(--red); }',
      '.bd-form textarea { min-height:140px; resize:vertical; line-height:1.6; }',
      '.bd-file-box { border:1.5px dashed var(--line); border-radius:12px; padding:12px; background:var(--fill); }',
      '.bd-file-box input[type="file"] { width:100%; font:inherit; font-size:14px; color:var(--ink); }',
      '.bd-list { display:grid; gap:10px; margin-bottom:14px; }',
      '.bd-item { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:14px 16px; display:flex; align-items:center; gap:12px; cursor:pointer; }',
      '.bd-item:hover { border-color:var(--red); }',
      '.bd-thumb { width:64px; height:64px; border-radius:12px; object-fit:cover; background:var(--fill); flex:none; border:1px solid var(--line); }',
      '.bd-item-body { flex:1; min-width:0; }',
      '.bd-item-title { font-size:17px; font-weight:700; color:var(--ink); margin:0 0 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }',
      '.bd-item-meta { font-size:13px; color:var(--sub); display:flex; flex-wrap:wrap; gap:8px; align-items:center; }',
      '.bd-item-actions { flex:none; }',
      '.bd-detail { background:var(--card); border:2px solid var(--red); border-radius:18px; padding:18px; margin-bottom:16px; }',
      '.bd-detail h2 { font-size:21px; margin:0 0 8px; line-height:1.35; color:var(--ink); word-break:keep-all; overflow-wrap:anywhere; }',
      '.bd-detail-meta { font-size:14px; color:var(--sub); padding-bottom:12px; border-bottom:1px solid var(--line); margin-bottom:14px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; }',
      '.bd-detail-body { font-size:16px; line-height:1.7; color:var(--ink); white-space:pre-wrap; word-break:keep-all; overflow-wrap:anywhere; margin-bottom:16px; }',
      '.bd-detail-imgs { display:grid; gap:12px; margin-bottom:16px; }',
      '.bd-detail-imgs img { width:100%; max-width:100%; height:auto; border-radius:14px; border:1px solid var(--line); background:var(--fill); display:block; }',
      '.bd-detail-bar { display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:space-between; padding-top:12px; border-top:1px solid var(--line); }',
      '.bd-report-box { margin-top:12px; padding:14px; border-radius:14px; background:var(--fill); border:1px solid var(--line); }',
      '.bd-video-list { display:grid; gap:16px; margin-bottom:16px; }',
      '.bd-video-card { background:var(--card); border:1px solid var(--line); border-radius:18px; padding:16px; }',
      '.bd-video-card h2 { font-size:18px; margin:0 0 10px; color:var(--ink); }',
      '.bd-video-stage { position:relative; width:100%; aspect-ratio:16/9; border-radius:14px; overflow:hidden; background:#000; }',
      '.bd-video-stage img { width:100%; height:100%; object-fit:cover; display:block; }',
      '.bd-video-stage iframe { position:absolute; inset:0; width:100%; height:100%; border:0; }',
      '.bd-play-trigger { position:absolute; inset:0; width:100%; height:100%; border:0; background:rgba(0,0,0,0.35); color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; font:inherit; font-size:17px; font-weight:800; }',
      '.bd-play-pill { background:var(--red); color:#fff; padding:12px 22px; border-radius:999px; box-shadow:0 4px 14px rgba(0,0,0,0.35); }',
      '.bd-legal-links { margin-top:28px; padding-top:16px; border-top:1px solid var(--line); display:flex; flex-wrap:wrap; gap:10px 14px; justify-content:center; font-size:14px; color:var(--sub); }',
      '.bd-legal-links a { color:var(--sub); text-decoration:none; font-weight:600; }',
      '.bd-legal-links a:hover { color:var(--red); text-decoration:underline; }',
      '.bd-draft-banner { background:var(--warnbg); border:1.5px solid var(--line); border-radius:14px; padding:12px 16px; margin-bottom:16px; font-size:15px; font-weight:800; color:var(--ink); text-align:center; }'
    ].join('\n');
    document.head.appendChild(st);
  }
  if (document.head) injectStyles();

  function getConfig() {
    var c = window.BOARD_CONFIG || {};
    return {
      SUPABASE_URL: (c.SUPABASE_URL || '').trim(),
      SUPABASE_ANON_KEY: (c.SUPABASE_ANON_KEY || '').trim(),
      STORAGE_BUCKET: (c.STORAGE_BUCKET || 'board-files').trim(),
      ADMIN_CONTACT: c.ADMIN_CONTACT || '문의 페이지 안내',
      NAVER_ENABLED: Boolean(c.NAVER_ENABLED)
    };
  }

  function isConfigured() {
    var cfg = getConfig();
    return Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  }

  // DB·스토리지·인증 오류 메시지를 초보자가 읽기 쉬운 한국어로 바꾼다
  function friendlyError(err, contextBoard) {
    if (!err) return '작업을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.';
    var raw = '';
    if (typeof err === 'string') raw = err;
    else raw = [err.message, err.details, err.hint, err.error_description, err.code].filter(Boolean).join(' ');
    var low = raw.toLowerCase();

    if (low.indexOf('23505') >= 0 || low.indexOf('duplicate') >= 0 || low.indexOf('unique') >= 0 || low.indexOf('reports_post_id_user_id') >= 0) {
      return '이미 신고한 글입니다. 한 글에는 한 번만 신고할 수 있어요.';
    }
    if (low.indexOf('daily') >= 0 || low.indexOf('하루') >= 0 || low.indexOf('5개') >= 0 || low.indexOf('초과') >= 0 || low.indexOf('too many') >= 0 || low.indexOf('rate') >= 0 || low.indexOf('limit') >= 0 || low.indexOf('quota') >= 0) {
      return '하루에 올릴 수 있는 글 수(5개)를 넘었습니다. 내일 다시 작성해 주세요.';
    }
    if (low.indexOf('banned') >= 0 || low.indexOf('금지어') >= 0 || low.indexOf('prohibit') >= 0 || low.indexOf('forbid') >= 0 || low.indexOf('bad_word') >= 0 || low.indexOf('word') >= 0) {
      return '글에 사용할 수 없는 말(금지어)이 들어 있어 올릴 수 없습니다. 내용을 다듬어 주세요.';
    }
    if (low.indexOf('vendor') >= 0 || low.indexOf('업체') >= 0 || (contextBoard === 'danga' && (low.indexOf('row-level security') >= 0 || low.indexOf('permission') >= 0 || low.indexOf('policy') >= 0))) {
      return '단가표는 등록된 업체만 올릴 수 있습니다. 업체 등록은 문의 페이지를 확인해 주세요.';
    }
    if (!currentUser || low.indexOf('jwt') >= 0 || low.indexOf('not authenticated') >= 0 || low.indexOf('auth') >= 0 || low.indexOf('login') >= 0 || low.indexOf('401') >= 0 || low.indexOf('row-level security') >= 0) {
      return '로그인이 필요합니다. 먼저 로그인한 뒤에 이용해 주세요.';
    }
    if (low.indexOf('payload too large') >= 0 || low.indexOf('413') >= 0 || low.indexOf('size') >= 0 || low.indexOf('mime') >= 0 || low.indexOf('extension') >= 0) {
      return '첨부 파일 크기나 형식이 기준에 맞지 않습니다. (사진 jpg/png/webp 5MB 이하, 엑셀 xlsx 10MB 이하)';
    }
    return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }

  // 이메일 전체가 다른 사람에게 노출되지 않게 앞부분 일부만 남긴다 (계약 3-7)
  function maskAuthor(nameOrEmail) {
    var s = String(nameOrEmail || '').trim();
    if (!s) return '익명';
    var at = s.indexOf('@');
    if (at > 0) {
      var prefix = s.slice(0, at);
      if (prefix.length <= 2) return prefix.charAt(0) + '**';
      return prefix.slice(0, 3) + '***';
    }
    return s;
  }

  function deriveAuthorName(user, boardType) {
    if (boardType === 'danga' && vendorInfo && vendorInfo.name) {
      return vendorInfo.name;
    }
    if (!user) return '익명';
    var meta = user.user_metadata || {};
    var nick = meta.nickname || meta.name || meta.full_name || meta.user_name || '';
    if (nick && nick.indexOf('@') < 0) return String(nick).trim().slice(0, 30);
    if (user.email) return maskAuthor(user.email);
    return '손님';
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, '0');
      var day = String(d.getDate()).padStart(2, '0');
      return y + '.' + m + '.' + day;
    } catch (e) {
      return '';
    }
  }

  function makeUuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getFileExt(filename) {
    var s = String(filename || '').trim();
    var idx = s.lastIndexOf('.');
    return idx >= 0 ? s.slice(idx + 1).toLowerCase() : '';
  }

  // [중요] 아래 파일 크기·확장자·개수 검사는 올리기 전에 화면에서도 먼저 확인하는 것이며,
  // 실제로 허용되지 않은 파일·용량·권한을 진짜 막는 것은 수파베이스 DB(RLS 정책)와 스토리지 보안 규칙입니다. (계약 4번)
  function validateFilesClientSide(imageFiles, excelFile, boardType) {
    var imgs = imageFiles ? Array.prototype.slice.call(imageFiles) : [];
    if (imgs.length > MAX_IMAGES) {
      return '사진은 한 글에 최대 ' + MAX_IMAGES + '장까지만 올릴 수 있습니다.';
    }
    for (var i = 0; i < imgs.length; i++) {
      var f = imgs[i];
      var ext = getFileExt(f.name);
      if (ALLOWED_IMAGE_EXTS.indexOf(ext) < 0) {
        return '사진은 jpg, png, webp 파일만 올릴 수 있습니다. (' + f.name + ')';
      }
      if (f.size > MAX_IMAGE_BYTES) {
        return '사진 한 장 크기는 5MB 이하여야 합니다. (' + f.name + ')';
      }
    }
    if (excelFile) {
      if (boardType !== 'danga') {
        return '엑셀 파일은 단가표 게시판에만 올릴 수 있습니다.';
      }
      var xExt = getFileExt(excelFile.name);
      if (xExt !== 'xlsx') {
        return '엑셀 파일은 .xlsx 형식만 올릴 수 있습니다. (' + excelFile.name + ')';
      }
      if (excelFile.size > MAX_EXCEL_BYTES) {
        return '엑셀 파일 크기는 10MB 이하여야 합니다. (' + excelFile.name + ')';
      }
    }
    return null;
  }

  function getPublicFileUrl(path) {
    if (!sb || !path) return '';
    var cfg = getConfig();
    var res = sb.storage.from(cfg.STORAGE_BUCKET).getPublicUrl(path);
    return (res && res.data && res.data.publicUrl) ? res.data.publicUrl : '';
  }

  function getReportedMap() {
    try {
      return JSON.parse(localStorage.getItem('zw_board_reported') || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function markReported(postId) {
    try {
      var m = getReportedMap();
      m[postId] = 1;
      localStorage.setItem('zw_board_reported', JSON.stringify(m));
    } catch (e) {}
  }

  function renderReadyBox(container) {
    if (!container) return;
    container.innerHTML = '<div class="bd-ready" role="status"><b>게시판 준비 중입니다. 곧 열려요.</b><p>단가표·이야기·영상 게시판을 연결하고 있습니다. 잠시만 기다려 주세요.</p></div>';
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

  function getRedirectUrl() {
    var cfg = getConfig();
    if (cfg.REDIRECT_URL) return cfg.REDIRECT_URL;
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      return location.origin + '/board/';
    }
    return 'https://jwapyonara.com/board/';
  }

  function refreshUserPermissions() {
    vendorInfo = null;
    isAdmin = false;
    if (!sb || !currentUser || !currentUser.email) return Promise.resolve();
    var email = currentUser.email;
    var pVendor = sb.from('vendors').select('email, name').eq('email', email).maybeSingle().then(function (r) {
      if (r && r.data && r.data.email) vendorInfo = r.data;
    }).catch(function () {});
    var pAdmin = sb.from('admins').select('email').eq('email', email).maybeSingle().then(function (r) {
      if (r && r.data && r.data.email) isAdmin = true;
    }).catch(function () {});
    return Promise.all([pVendor, pAdmin]);
  }

  // 로그인 영역 그리기
  function renderAuthBar(box, onAuthChanged) {
    if (!box) return;
    var cfg = getConfig();
    box.innerHTML = '';

    var wrap = document.createElement('div');
    wrap.className = 'bd-auth';

    if (currentUser) {
      var top = document.createElement('div');
      top.className = 'bd-auth-top';

      var who = document.createElement('div');
      who.className = 'bd-auth-user';
      var badge = isAdmin ? ' (관리자)' : (vendorInfo ? ' (등록 업체: ' + vendorInfo.name + ')' : '');
      who.textContent = '로그인됨: ' + deriveAuthorName(currentUser, vendorInfo ? 'danga' : 'story') + badge;

      var outBtn = document.createElement('button');
      outBtn.type = 'button';
      outBtn.className = 'bd-btn small';
      outBtn.textContent = '로그아웃';
      outBtn.addEventListener('click', function () {
        outBtn.disabled = true;
        sb.auth.signOut().then(function () {
          currentUser = null;
          vendorInfo = null;
          isAdmin = false;
          if (onAuthChanged) onAuthChanged();
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
      guide.textContent = '글 읽기·엑셀 받기·영상 보기는 로그인 없이 바로 됩니다. 글 쓰기와 신고는 로그인이 필요해요.';
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
          msg.className = 'bd-msg';
          msg.textContent = '';
          sb.auth.signInWithOAuth({
            provider: provider,
            options: { redirectTo: getRedirectUrl() }
          }).then(function (res) {
            if (res && res.error) {
              msg.className = 'bd-msg err';
              msg.textContent = friendlyError(res.error);
            }
          }).catch(function (err) {
            msg.className = 'bd-msg err';
            msg.textContent = friendlyError(err);
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

    box.appendChild(wrap);
  }

  // 단가표 / 이야기 게시판 화면
  function runPostBoard(container, boardType, opts) {
    opts = opts || {};
    container.innerHTML = '';

    var authSlot = document.createElement('div');
    var writeSlot = document.createElement('div');
    var detailSlot = document.createElement('div');
    var listCard = document.createElement('section');
    listCard.className = 'card';

    var listHead = document.createElement('div');
    listHead.style.display = 'flex';
    listHead.style.justifyContent = 'space-between';
    listHead.style.alignItems = 'center';
    listHead.style.marginBottom = '12px';

    var listTitle = document.createElement('h2');
    listTitle.style.margin = '0';
    listTitle.textContent = boardType === 'danga' ? '등록된 단가표 목록' : '이야기 글 목록';

    var refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.className = 'bd-btn small';
    refreshBtn.textContent = '새로고침';

    listHead.appendChild(listTitle);
    listHead.appendChild(refreshBtn);

    var listBox = document.createElement('div');
    listBox.className = 'bd-list';

    var listStatus = document.createElement('p');
    listStatus.className = 'note';
    listStatus.style.textAlign = 'center';
    listStatus.style.margin = '18px 0';

    var moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'bd-btn';
    moreBtn.style.width = '100%';
    moreBtn.style.display = 'none';
    moreBtn.textContent = '더 보기 (20개씩)';

    listCard.appendChild(listHead);
    listCard.appendChild(listBox);
    listCard.appendChild(listStatus);
    listCard.appendChild(moreBtn);

    container.appendChild(authSlot);
    container.appendChild(writeSlot);
    container.appendChild(detailSlot);
    container.appendChild(listCard);

    var offset = 0;
    var activePostId = null;

    function buildWriteSection() {
      writeSlot.innerHTML = '';
      var sec = document.createElement('section');
      sec.className = 'card bd-form';

      if (boardType === 'danga') {
        var canWriteDanga = Boolean(currentUser && (vendorInfo || isAdmin));
        if (!canWriteDanga) {
          var info = document.createElement('p');
          info.style.margin = '0';
          info.style.fontSize = '15px';
          info.style.color = 'var(--sub)';
          info.textContent = '단가표 글 쓰기는 등록된 업체만 할 수 있습니다. 업체 등록은 문의 페이지로 안내해 드립니다. ';
          var contactLink = document.createElement('a');
          contactLink.href = opts.contactHref || '../legal/contact.html';
          contactLink.style.color = 'var(--red)';
          contactLink.style.fontWeight = '700';
          contactLink.textContent = '업체 등록은 문의 페이지로 ›';
          info.appendChild(contactLink);
          sec.appendChild(info);
          writeSlot.appendChild(sec);
          return;
        }
      } else {
        if (!currentUser) {
          var loginPrompt = document.createElement('p');
          loginPrompt.style.margin = '0';
          loginPrompt.style.fontSize = '15px';
          loginPrompt.style.color = 'var(--sub)';
          loginPrompt.textContent = '위에서 로그인하면 누구나 직접 쓴 이야기와 사진(최대 5장)을 올릴 수 있습니다.';
          sec.appendChild(loginPrompt);
          writeSlot.appendChild(sec);
          return;
        }
      }

      var h2 = document.createElement('h2');
      h2.textContent = boardType === 'danga' ? '단가표 올리기 (등록 업체 전용)' : '새 이야기 쓰기';
      sec.appendChild(h2);

      // 제목
      var fTitle = document.createElement('div');
      fTitle.className = 'field';
      var lTitle = document.createElement('label');
      lTitle.setAttribute('for', 'bdTitle');
      lTitle.textContent = '제목 (1~80자)';
      var iTitle = document.createElement('input');
      iTitle.id = 'bdTitle';
      iTitle.type = 'text';
      iTitle.maxLength = 80;
      iTitle.placeholder = boardType === 'danga' ? '예: 10월 넷째 주 단가표 안내' : '제목을 입력해 주세요 (80자 이내)';
      fTitle.appendChild(lTitle);
      fTitle.appendChild(iTitle);
      sec.appendChild(fTitle);

      // 내용
      var fBody = document.createElement('div');
      fBody.className = 'field';
      var lBody = document.createElement('label');
      lBody.setAttribute('for', 'bdBody');
      lBody.textContent = '내용 (1~5,000자)';
      var tBody = document.createElement('textarea');
      tBody.id = 'bdBody';
      tBody.maxLength = 5000;
      tBody.placeholder = boardType === 'danga'
        ? '주요 안내 사항을 적어 주세요. 전화번호·계좌번호 등 개인정보는 적지 마세요.'
        : '직접 겪은 이야기나 궁금한 점을 자유롭게 적어 주세요. 남의 글을 그대로 옮기거나 개인정보를 적지 마세요.';
      fBody.appendChild(lBody);
      fBody.appendChild(tBody);
      sec.appendChild(fBody);

      // 사진 첨부
      var fImg = document.createElement('div');
      fImg.className = 'field';
      var lImg = document.createElement('label');
      lImg.setAttribute('for', 'bdImages');
      lImg.textContent = '사진 첨부 (선택 · jpg/png/webp · 한 장 5MB 이하 · 최대 5장)';
      var boxImg = document.createElement('div');
      boxImg.className = 'bd-file-box';
      var iImg = document.createElement('input');
      iImg.id = 'bdImages';
      iImg.type = 'file';
      iImg.multiple = true;
      iImg.accept = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
      boxImg.appendChild(iImg);
      fImg.appendChild(lImg);
      fImg.appendChild(boxImg);
      sec.appendChild(fImg);

      // 엑셀 첨부 (단가표 전용)
      var iExcel = null;
      if (boardType === 'danga') {
        var fExcel = document.createElement('div');
        fExcel.className = 'field';
        var lExcel = document.createElement('label');
        lExcel.setAttribute('for', 'bdExcel');
        lExcel.textContent = '엑셀 단가표 첨부 (선택 · .xlsx 파일만 · 10MB 이하 · 1개)';
        var boxExcel = document.createElement('div');
        boxExcel.className = 'bd-file-box';
        iExcel = document.createElement('input');
        iExcel.id = 'bdExcel';
        iExcel.type = 'file';
        iExcel.accept = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        var excelHelp = document.createElement('p');
        excelHelp.className = 'help';
        excelHelp.textContent = '※ 엑셀 파일 안에 고객 명단·전화번호 등 개인정보가 들어 있지 않은지 꼭 확인해 주세요.';
        boxExcel.appendChild(iExcel);
        fExcel.appendChild(lExcel);
        fExcel.appendChild(boxExcel);
        fExcel.appendChild(excelHelp);
        sec.appendChild(fExcel);
      }

      var formMsg = document.createElement('div');
      formMsg.className = 'bd-msg';

      var submitBtn = document.createElement('button');
      submitBtn.type = 'button';
      submitBtn.className = 'bd-btn primary';
      submitBtn.style.width = '100%';
      submitBtn.textContent = '글 올리기';

      submitBtn.addEventListener('click', function () {
        formMsg.className = 'bd-msg';
        formMsg.textContent = '';

        if (!currentUser) {
          formMsg.className = 'bd-msg err';
          formMsg.textContent = '로그인이 필요합니다. 먼저 로그인한 뒤에 이용해 주세요.';
          return;
        }
        var titleVal = iTitle.value.trim();
        var bodyVal = tBody.value.trim();
        if (!titleVal || titleVal.length > 80) {
          formMsg.className = 'bd-msg err';
          formMsg.textContent = '제목을 1자 이상 80자 이하로 입력해 주세요.';
          iTitle.focus();
          return;
        }
        if (!bodyVal || bodyVal.length > 5000) {
          formMsg.className = 'bd-msg err';
          formMsg.textContent = '내용을 1자 이상 5,000자 이하로 입력해 주세요.';
          tBody.focus();
          return;
        }

        var imgFiles = iImg.files ? Array.prototype.slice.call(iImg.files) : [];
        var excelFile = (iExcel && iExcel.files && iExcel.files[0]) ? iExcel.files[0] : null;
        var checkErr = validateFilesClientSide(imgFiles, excelFile, boardType);
        if (checkErr) {
          formMsg.className = 'bd-msg err';
          formMsg.textContent = checkErr;
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = '올리는 중…';

        var cfg = getConfig();
        var bucket = cfg.STORAGE_BUCKET;
        var postId = makeUuid();
        var uid = currentUser.id;
        var uploadedPaths = [];
        var imagePaths = [];
        var filePath = null;
        var fileName = null;

        // 순서대로 사진 올리기 -> 엑셀 올리기 -> posts 행 추가
        var chain = Promise.resolve();
        imgFiles.forEach(function (file, idx) {
          chain = chain.then(function () {
            var ext = getFileExt(file.name);
            if (ext === 'jpeg') ext = 'jpg';
            var storagePath = uid + '/' + postId + '/img-' + (idx + 1) + '.' + ext;
            return sb.storage.from(bucket).upload(storagePath, file, { upsert: false }).then(function (upRes) {
              if (upRes && upRes.error) throw upRes.error;
              uploadedPaths.push(storagePath);
              imagePaths.push(storagePath);
            });
          });
        });

        if (excelFile) {
          chain = chain.then(function () {
            var storagePath = uid + '/' + postId + '/file.xlsx';
            return sb.storage.from(bucket).upload(storagePath, excelFile, { upsert: false }).then(function (upRes) {
              if (upRes && upRes.error) throw upRes.error;
              uploadedPaths.push(storagePath);
              filePath = storagePath;
              fileName = String(excelFile.name || '단가표.xlsx').slice(0, 120);
            });
          });
        }

        chain.then(function () {
          var row = {
            id: postId,
            board: boardType,
            user_id: uid,
            author_name: deriveAuthorName(currentUser, boardType),
            title: titleVal,
            body: bodyVal,
            image_paths: imagePaths,
            file_path: filePath,
            file_name: fileName
          };
          return sb.from('posts').insert(row);
        }).then(function (insRes) {
          if (insRes && insRes.error) throw insRes.error;
          iTitle.value = '';
          tBody.value = '';
          iImg.value = '';
          if (iExcel) iExcel.value = '';
          formMsg.className = 'bd-msg ok';
          formMsg.textContent = '글이 올라갔습니다.';
          submitBtn.disabled = false;
          submitBtn.textContent = '글 올리기';
          loadPosts(true);
        }).catch(function (err) {
          // 글 저장이 거절된 경우 먼저 올린 파일도 정리 시도
          if (uploadedPaths.length) {
            try { sb.storage.from(bucket).remove(uploadedPaths); } catch (e) {}
          }
          formMsg.className = 'bd-msg err';
          formMsg.textContent = friendlyError(err, boardType);
          submitBtn.disabled = false;
          submitBtn.textContent = '글 올리기';
        });
      });

      sec.appendChild(formMsg);
      sec.appendChild(submitBtn);
      writeSlot.appendChild(sec);
    }

    // 글 상세 열기
    function openPostDetail(post) {
      activePostId = post.id;
      detailSlot.innerHTML = '';

      var box = document.createElement('article');
      box.className = 'bd-detail';

      var topRow = document.createElement('div');
      topRow.style.display = 'flex';
      topRow.style.justifyContent = 'space-between';
      topRow.style.alignItems = 'flex-start';
      topRow.style.gap = '10px';

      var h2 = document.createElement('h2');
      h2.textContent = post.title || '';

      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'bd-btn small';
      closeBtn.textContent = '닫기 ✕';
      closeBtn.addEventListener('click', function () {
        activePostId = null;
        detailSlot.innerHTML = '';
      });

      topRow.appendChild(h2);
      topRow.appendChild(closeBtn);
      box.appendChild(topRow);

      var meta = document.createElement('div');
      meta.className = 'bd-detail-meta';
      var spanAuthor = document.createElement('span');
      spanAuthor.textContent = (boardType === 'danga' ? '올린 업체: ' : '글쓴이: ') + maskAuthor(post.author_name);
      var spanDate = document.createElement('span');
      spanDate.textContent = formatDate(post.created_at);
      meta.appendChild(spanAuthor);
      meta.appendChild(spanDate);
      box.appendChild(meta);

      // 첨부 사진 크게 보기
      var imgs = Array.isArray(post.image_paths) ? post.image_paths : [];
      if (imgs.length) {
        var imgWrap = document.createElement('div');
        imgWrap.className = 'bd-detail-imgs';
        imgs.forEach(function (p, i) {
          var url = getPublicFileUrl(p);
          if (!url) return;
          var im = document.createElement('img');
          im.src = url;
          im.alt = (post.title || '첨부 사진') + ' (' + (i + 1) + ')';
          im.loading = 'lazy';
          imgWrap.appendChild(im);
        });
        box.appendChild(imgWrap);
      }

      // 본문
      var bodyEl = document.createElement('div');
      bodyEl.className = 'bd-detail-body';
      bodyEl.textContent = post.body || '';
      box.appendChild(bodyEl);

      // 엑셀 받기 단추 (단가표)
      if (post.file_path) {
        var fUrl = getPublicFileUrl(post.file_path);
        if (fUrl) {
          var dlWrap = document.createElement('div');
          dlWrap.style.marginBottom = '14px';
          var dlLink = document.createElement('a');
          dlLink.className = 'bd-btn primary';
          dlLink.href = fUrl;
          dlLink.setAttribute('download', post.file_name || '단가표.xlsx');
          dlLink.target = '_blank';
          dlLink.rel = 'noopener';
          dlLink.textContent = '📥 엑셀 받기 (' + (post.file_name || '단가표.xlsx') + ')';
          dlWrap.appendChild(dlLink);
          box.appendChild(dlWrap);
        }
      }

      // 아래 조작 줄: 신고 단추 + 내 글 삭제 단추
      var bar = document.createElement('div');
      bar.className = 'bd-detail-bar';

      var actionMsg = document.createElement('div');
      actionMsg.className = 'bd-msg';

      var reportHolder = document.createElement('div');
      var reportedMap = getReportedMap();
      var reportBtn = document.createElement('button');
      reportBtn.type = 'button';
      reportBtn.className = 'bd-btn small';
      if (reportedMap[post.id]) {
        reportBtn.disabled = true;
        reportBtn.textContent = '신고 완료';
      } else {
        reportBtn.textContent = '🚨 신고';
      }

      var reportBox = document.createElement('div');
      reportBox.className = 'bd-report-box';
      reportBox.style.display = 'none';

      var rLabel = document.createElement('label');
      rLabel.style.display = 'block';
      rLabel.style.fontSize = '14px';
      rLabel.style.fontWeight = '700';
      rLabel.style.marginBottom = '6px';
      rLabel.textContent = '신고 이유를 골라 주세요 (한 글에 한 번만 가능 · 3건 누적 시 자동 숨김)';

      var rSelect = document.createElement('select');
      rSelect.className = 'bd-select';
      rSelect.style.marginBottom = '8px';
      [
        '욕설·비방·혐오 표현',
        '스팸·도배·광고 글',
        '전화번호 등 개인정보 노출',
        '남의 글·사진 무단 복사',
        '정치·분란 유도·기타 부적절한 글'
      ].forEach(function (reasonText) {
        var opt = document.createElement('option');
        opt.value = reasonText;
        opt.textContent = reasonText;
        rSelect.appendChild(opt);
      });

      var rSubmit = document.createElement('button');
      rSubmit.type = 'button';
      rSubmit.className = 'bd-btn small primary';
      rSubmit.textContent = '신고 접수';

      rSubmit.addEventListener('click', function () {
        actionMsg.className = 'bd-msg';
        if (!currentUser) {
          actionMsg.className = 'bd-msg err';
          actionMsg.textContent = '로그인이 필요합니다. 먼저 로그인한 뒤에 신고해 주세요.';
          return;
        }
        if (getReportedMap()[post.id]) {
          actionMsg.className = 'bd-msg err';
          actionMsg.textContent = '이미 신고한 글입니다. 한 글에는 한 번만 신고할 수 있어요.';
          return;
        }
        rSubmit.disabled = true;
        sb.from('reports').insert({
          post_id: post.id,
          user_id: currentUser.id,
          reason: rSelect.value
        }).then(function (res) {
          if (res && res.error) throw res.error;
          markReported(post.id);
          reportBtn.disabled = true;
          reportBtn.textContent = '신고 완료';
          reportBox.style.display = 'none';
          actionMsg.className = 'bd-msg ok';
          actionMsg.textContent = '신고가 접수되었습니다. 신고가 3건 쌓이면 자동으로 숨겨집니다.';
        }).catch(function (err) {
          if (err && (String(err.code) === '23505' || String(err.message || '').toLowerCase().indexOf('duplicate') >= 0)) {
            markReported(post.id);
            reportBtn.disabled = true;
            reportBtn.textContent = '신고 완료';
            reportBox.style.display = 'none';
          }
          actionMsg.className = 'bd-msg err';
          actionMsg.textContent = friendlyError(err, boardType);
          rSubmit.disabled = false;
        });
      });

      reportBox.appendChild(rLabel);
      reportBox.appendChild(rSelect);
      reportBox.appendChild(rSubmit);

      reportBtn.addEventListener('click', function () {
        if (!currentUser) {
          actionMsg.className = 'bd-msg err';
          actionMsg.textContent = '로그인이 필요합니다. 먼저 로그인한 뒤에 신고해 주세요.';
          return;
        }
        reportBox.style.display = reportBox.style.display === 'none' ? 'block' : 'none';
      });

      bar.appendChild(reportBtn);

      // 내 글 삭제 (본인 또는 관리자)
      if (currentUser && (currentUser.id === post.user_id || isAdmin)) {
        var delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'bd-btn small danger';
        delBtn.textContent = '내 글 삭제';
        var confirming = false;
        delBtn.addEventListener('click', function () {
          if (!confirming) {
            confirming = true;
            delBtn.textContent = '정말 삭제할까요? (한 번 더 누르면 삭제)';
            return;
          }
          delBtn.disabled = true;
          var cfg = getConfig();
          var pathsToRemove = [];
          if (Array.isArray(post.image_paths)) pathsToRemove = pathsToRemove.concat(post.image_paths);
          if (post.file_path) pathsToRemove.push(post.file_path);

          sb.from('posts').delete().eq('id', post.id).then(function (delRes) {
            if (delRes && delRes.error) throw delRes.error;
            if (pathsToRemove.length) {
              try { sb.storage.from(cfg.STORAGE_BUCKET).remove(pathsToRemove); } catch (e) {}
            }
            activePostId = null;
            detailSlot.innerHTML = '';
            loadPosts(true);
          }).catch(function (err) {
            confirming = false;
            delBtn.disabled = false;
            delBtn.textContent = '내 글 삭제';
            actionMsg.className = 'bd-msg err';
            actionMsg.textContent = friendlyError(err, boardType);
          });
        });
        bar.appendChild(delBtn);
      }

      box.appendChild(bar);
      box.appendChild(reportBox);
      box.appendChild(actionMsg);

      detailSlot.appendChild(box);
      try { box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
    }

    function renderPostItem(post) {
      var item = document.createElement('div');
      item.className = 'bd-item';
      item.setAttribute('role', 'button');
      item.tabIndex = 0;

      var imgs = Array.isArray(post.image_paths) ? post.image_paths : [];
      if (imgs.length > 0) {
        var thumbUrl = getPublicFileUrl(imgs[0]);
        if (thumbUrl) {
          var thumb = document.createElement('img');
          thumb.className = 'bd-thumb';
          thumb.src = thumbUrl;
          thumb.alt = '첨부 사진 미리보기';
          thumb.loading = 'lazy';
          item.appendChild(thumb);
        }
      }

      var body = document.createElement('div');
      body.className = 'bd-item-body';

      var title = document.createElement('div');
      title.className = 'bd-item-title';
      title.textContent = post.title || '(제목 없음)';

      var meta = document.createElement('div');
      meta.className = 'bd-item-meta';

      var sAuthor = document.createElement('span');
      sAuthor.textContent = maskAuthor(post.author_name);
      var sDate = document.createElement('span');
      sDate.textContent = formatDate(post.created_at);

      meta.appendChild(sAuthor);
      meta.appendChild(sDate);
      if (imgs.length > 0) {
        var sImg = document.createElement('span');
        sImg.textContent = '📷 사진 ' + imgs.length;
        meta.appendChild(sImg);
      }

      body.appendChild(title);
      body.appendChild(meta);
      item.appendChild(body);

      if (boardType === 'danga' && post.file_path) {
        var fUrl = getPublicFileUrl(post.file_path);
        if (fUrl) {
          var act = document.createElement('div');
          act.className = 'bd-item-actions';
          var dl = document.createElement('a');
          dl.className = 'bd-btn small primary';
          dl.href = fUrl;
          dl.setAttribute('download', post.file_name || '단가표.xlsx');
          dl.target = '_blank';
          dl.rel = 'noopener';
          dl.textContent = '엑셀 받기';
          dl.addEventListener('click', function (ev) {
            ev.stopPropagation();
          });
          act.appendChild(dl);
          item.appendChild(act);
        }
      }

      item.addEventListener('click', function () {
        openPostDetail(post);
      });
      item.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          openPostDetail(post);
        }
      });

      return item;
    }

    function loadPosts(reset) {
      if (reset) {
        offset = 0;
        listBox.innerHTML = '';
      }
      listStatus.style.display = 'block';
      listStatus.textContent = '글 목록을 불러오는 중입니다…';
      moreBtn.style.display = 'none';

      sb.from('posts')
        .select('id, board, user_id, author_name, title, body, image_paths, file_path, file_name, report_count, hidden, created_at')
        .eq('board', boardType)
        .eq('hidden', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)
        .then(function (res) {
          if (res && res.error) throw res.error;
          var rows = (res && res.data) ? res.data : [];
          rows.forEach(function (r) {
            listBox.appendChild(renderPostItem(r));
          });
          offset += rows.length;

          if (offset === 0) {
            listStatus.style.display = 'block';
            listStatus.textContent = '아직 올라온 글이 없습니다.';
          } else {
            listStatus.style.display = 'none';
          }
          if (rows.length === PAGE_SIZE) {
            moreBtn.style.display = 'inline-flex';
          } else {
            moreBtn.style.display = 'none';
          }
        })
        .catch(function (err) {
          listStatus.style.display = 'block';
          listStatus.textContent = friendlyError(err, boardType);
        });
    }

    refreshBtn.addEventListener('click', function () { loadPosts(true); });
    moreBtn.addEventListener('click', function () { loadPosts(false); });

    function redrawAll() {
      renderAuthBar(authSlot, function () {
        refreshUserPermissions().then(redrawAll);
      });
      buildWriteSection();
      if (activePostId) {
        detailSlot.innerHTML = '';
        activePostId = null;
      }
    }

    redrawAll();
    loadPosts(true);
  }

  // 영상 게시판 화면 (videos 테이블 sort 순, 클릭 시에만 youtube-nocookie iframe 삽입)
  function runVideoBoard(container) {
    container.innerHTML = '';

    var listWrap = document.createElement('div');
    listWrap.className = 'bd-video-list';

    var status = document.createElement('div');
    status.className = 'bd-ready';
    status.innerHTML = '<b>영상을 불러오는 중입니다…</b>';

    container.appendChild(status);
    container.appendChild(listWrap);

    sb.from('videos')
      .select('id, youtube_id, title, sort, created_at')
      .order('sort', { ascending: true })
      .order('created_at', { ascending: false })
      .then(function (res) {
        if (res && res.error) throw res.error;
        var rows = (res && res.data) ? res.data : [];
        if (!rows.length) {
          status.innerHTML = '<b>곧 올라옵니다</b><p>재미있는 이야기 쇼츠 영상을 준비하고 있습니다.</p>';
          return;
        }
        status.style.display = 'none';

        rows.forEach(function (v) {
          var rawId = String(v.youtube_id || '').trim();
          if (!/^[A-Za-z0-9_-]{6,20}$/.test(rawId)) return;

          var card = document.createElement('section');
          card.className = 'bd-video-card';

          var h2 = document.createElement('h2');
          h2.textContent = v.title || '좌표나라 영상';
          card.appendChild(h2);

          var stage = document.createElement('div');
          stage.className = 'bd-video-stage';

          var img = document.createElement('img');
          img.src = 'https://i.ytimg.com/vi/' + encodeURIComponent(rawId) + '/hqdefault.jpg';
          img.alt = (v.title || '영상') + ' 미리보기 사진';
          img.loading = 'lazy';

          var playBtn = document.createElement('button');
          playBtn.type = 'button';
          playBtn.className = 'bd-play-trigger';
          playBtn.setAttribute('aria-label', (v.title || '영상') + ' 재생');

          var pill = document.createElement('span');
          pill.className = 'bd-play-pill';
          pill.textContent = '▶ 영상 재생';
          playBtn.appendChild(pill);

          // 눌렀을 때 비로소 youtube-nocookie iframe을 끼운다 (장식이나 가리는 요소 없음)
          playBtn.addEventListener('click', function () {
            stage.innerHTML = '';
            var ifr = document.createElement('iframe');
            ifr.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(rawId) + '?autoplay=1&rel=0';
            ifr.title = v.title || '좌표나라 유튜브 영상';
            ifr.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
            ifr.setAttribute('allowfullscreen', '');
            stage.appendChild(ifr);
          });

          stage.appendChild(img);
          stage.appendChild(playBtn);
          card.appendChild(stage);
          listWrap.appendChild(card);
        });

        if (!listWrap.children.length) {
          status.style.display = 'block';
          status.innerHTML = '<b>곧 올라옵니다</b><p>재미있는 이야기 쇼츠 영상을 준비하고 있습니다.</p>';
        }
      })
      .catch(function (err) {
        status.innerHTML = '<b>곧 올라옵니다</b><p>' + friendlyError(err, 'video') + '</p>';
      });
  }

  // 안내 첫 화면(hub)에서 로그인 상자 또는 준비 중 상자 표시
  function runHubBoard(container) {
    if (!container) return;
    renderAuthBar(container, function () {
      refreshUserPermissions().then(function () {
        renderAuthBar(container);
      });
    });
  }

  function init(options) {
    options = options || {};
    injectStyles();

    var page = options.page || 'hub'; // 'hub' | 'danga' | 'story' | 'video'
    var container = document.getElementById(options.targetId || 'boardApp');
    if (!container) return;

    // 설정이 비어 있으면 모든 쪽에 "게시판 준비 중입니다. 곧 열려요." 상자만 보이고 아무 오류도 내지 않는다
    if (!isConfigured()) {
      renderReadyBox(container);
      return;
    }

    ensureSupabaseScript(function (ok) {
      if (!ok || !window.supabase || typeof window.supabase.createClient !== 'function') {
        renderReadyBox(container);
        return;
      }
      var cfg = getConfig();
      try {
        sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      } catch (e) {
        renderReadyBox(container);
        return;
      }

      sb.auth.getSession().then(function (res) {
        var session = res && res.data && res.data.session;
        currentUser = session ? session.user : null;
        return refreshUserPermissions();
      }).catch(function () {
        currentUser = null;
      }).then(function () {
        if (page === 'danga' || page === 'story') {
          runPostBoard(container, page, options);
        } else if (page === 'video') {
          runVideoBoard(container);
        } else {
          runHubBoard(container);
        }
      });

      sb.auth.onAuthStateChange(function (_event, session) {
        var nextUser = session ? session.user : null;
        var prevId = currentUser ? currentUser.id : null;
        var nextId = nextUser ? nextUser.id : null;
        if (prevId === nextId) return;
        currentUser = nextUser;
        refreshUserPermissions().then(function () {
          if (page === 'danga' || page === 'story') {
            runPostBoard(container, page, options);
          } else if (page === 'hub') {
            runHubBoard(container);
          }
        });
      });
    });
  }

  window.ZW_BOARD = {
    init: init,
    friendlyError: friendlyError,
    validateFilesClientSide: validateFilesClientSide
  };
})();
