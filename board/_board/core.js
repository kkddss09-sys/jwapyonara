// 좌표나라 게시판 공통 도구 (site/board/_board/core.js)
// 설정 읽기, 수파베이스 클라이언트, 날짜·글자 도구, friendlyError, 공개 주소 만들기(getPublicUrl) 등 공통 도구를 모은 파일입니다.

(function (window) {
  'use strict';

  var ZW_BOARD = window.ZW_BOARD = window.ZW_BOARD || {};
  var state = ZW_BOARD._state = ZW_BOARD._state || {
    sb: null,
    currentUser: null,
    vendorInfo: null, // { name }: my_roles()에서 받은 내 업체 정보
    isAdmin: false,
    isSubmanager: false,
    permissionsRequest: 0
  };

  function getSettings() {
    return ZW_BOARD.settings || {};
  }

  function getBoardMeta(boardType) {
    var boards = getSettings().BOARDS || {};
    return boards[boardType] || null;
  }

  function getConfig() {
    var c = window.BOARD_CONFIG || {};
    return {
      SUPABASE_URL: (c.SUPABASE_URL || '').trim(),
      SUPABASE_ANON_KEY: (c.SUPABASE_ANON_KEY || '').trim(),
      STORAGE_BUCKET: (c.STORAGE_BUCKET || 'board-files').trim(),
      ADMIN_CONTACT: c.ADMIN_CONTACT || '문의 페이지 안내',
      NAVER_ENABLED: Boolean(c.NAVER_ENABLED),
      REDIRECT_URL: (c.REDIRECT_URL || '').trim()
    };
  }

  function isConfigured() {
    var cfg = getConfig();
    return Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  }

  // DB·스토리지·인증 오류 메시지를 초보자가 읽기 쉬운 한국어로 바꾼다
  function friendlyError(err, contextBoard, stage) {
    // 기술 정보는 message만 사용하고 개인정보·인증값으로 보이는 부분은 가린다.
    var technical = String((err && err.message) || (typeof err === 'string' ? err : '') || '상세 오류 없음')
      .replace(/https?:\/\/\S+/gi, '[주소 숨김]')
      .replace(/[^\s<>"'()]+@[^\s<>"'()]+/g, '[이메일 숨김]')
      .replace(/\b(?:bearer\s+\S+|(?:[\w-]*(?:key|token|secret|password)[\w-]*|authorization)\s*[:=]\s*[^\r\n]+)/gi, '[인증 정보 숨김]')
      .replace(/[A-Za-z0-9_.\/-]{32,}/g, '[긴 식별값 숨김]')
      .replace(/[\r\n]+/g, ' ').slice(0, 300);
    var general = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    if (stage === 'storage-upload') {
      return '첨부 파일을 올리지 못했습니다.\n(기술 정보: ' + technical + ')';
    }
    if (!err) return '작업을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.';
    var raw = '';
    if (typeof err === 'string') raw = err;
    else raw = [err.message, err.details, err.hint, err.error_description, err.code].filter(Boolean).join(' ');
    var low = raw.toLowerCase();
    if (contextBoard === 'video') {
      if (low.indexOf('23505') >= 0 || low.indexOf('duplicate') >= 0) return '이미 등록된 영상입니다. 목록을 확인해 주세요.';
      if (low.indexOf('23514') >= 0 || low.indexOf('23502') >= 0) return '영상 주소와 제목(1~80자)을 확인해 주세요.';
      if (low.indexOf('42501') >= 0 || low.indexOf('permission') >= 0 || low.indexOf('row-level security') >= 0) return '영상 추가와 삭제는 운영진만 할 수 있습니다. 로그인 상태를 확인해 주세요.';
    }
    if (low.indexOf('카드뉴스는 운영진') >= 0) return '카드뉴스는 운영진만 올릴 수 있습니다.';

    if (low.indexOf('23505') >= 0 || low.indexOf('duplicate') >= 0 || low.indexOf('unique') >= 0 || low.indexOf('reports_post_id_user_id') >= 0) {
      return '이미 신고한 글입니다. 한 글에는 한 번만 신고할 수 있어요.';
    }
    if (low.indexOf('daily') >= 0 || low.indexOf('하루') >= 0 || low.indexOf('5개') >= 0 || low.indexOf('초과') >= 0 || low.indexOf('too many') >= 0 || low.indexOf('rate') >= 0 || low.indexOf('limit') >= 0 || low.indexOf('quota') >= 0) {
      return '하루에 올릴 수 있는 글 수(5개)를 넘었습니다. 내일 다시 작성해 주세요.';
    }
    if (low.indexOf('banned') >= 0 || low.indexOf('금지어') >= 0 || low.indexOf('prohibit') >= 0 || low.indexOf('forbid') >= 0 || low.indexOf('bad_word') >= 0 || low.indexOf('word') >= 0) {
      return '글에 사용할 수 없는 말(금지어)이 들어 있어 올릴 수 없습니다. 내용을 다듬어 주세요.';
    }
    if (low.indexOf('vendor') >= 0 || low.indexOf('업체') >= 0 || low.indexOf('row-level security') >= 0 || low.indexOf('permission') >= 0 || low.indexOf('policy') >= 0) {
      // 권한 조회 실패도 vendorInfo=null/isAdmin=false라 비업체라고 단정할 수 없다.
      return general + (stage === 'posts-insert' ? '\n(기술 정보: ' + technical + ')' : '');
    }
    if (!state.currentUser || low.indexOf('jwt') >= 0 || low.indexOf('not authenticated') >= 0 || low.indexOf('auth') >= 0 || low.indexOf('login') >= 0 || low.indexOf('401') >= 0 || low.indexOf('row-level security') >= 0) {
      return '로그인이 필요합니다. 먼저 로그인한 뒤에 이용해 주세요.';
    }
    if (low.indexOf('payload too large') >= 0 || low.indexOf('413') >= 0 || low.indexOf('size') >= 0 || low.indexOf('mime') >= 0 || low.indexOf('extension') >= 0) {
      return '첨부 파일 크기나 형식이 기준에 맞지 않습니다. (사진 jpg/png/webp 5MB 이하, 엑셀 xlsx 10MB 이하)';
    }
    return general + (stage === 'posts-insert' ? '\n(기술 정보: ' + technical + ')' : '');
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
    if (boardType === 'danga' && state.vendorInfo && state.vendorInfo.name) {
      return state.vendorInfo.name;
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
    var s = getSettings();
    var meta = getBoardMeta(boardType);
    var imgs = imageFiles ? Array.prototype.slice.call(imageFiles) : [];
    var maxImages = (meta && meta.maxImages) ? meta.maxImages : (boardType === 'cardnews' ? 10 : (s.MAX_IMAGES || 5));
    var allowedExts = s.ALLOWED_IMAGE_EXTS || ['jpg', 'jpeg', 'png', 'webp'];
    var maxImgBytes = s.MAX_IMAGE_BYTES || (5 * 1024 * 1024);
    var maxExcelBytes = s.MAX_EXCEL_BYTES || (10 * 1024 * 1024);

    if (imgs.length > maxImages) {
      return '사진은 한 글에 최대 ' + maxImages + '장까지만 올릴 수 있습니다.';
    }
    for (var i = 0; i < imgs.length; i++) {
      var f = imgs[i];
      var ext = getFileExt(f.name);
      if (allowedExts.indexOf(ext) < 0) {
        return '사진은 jpg, png, webp 파일만 올릴 수 있습니다. (' + f.name + ')';
      }
      if (f.size > maxImgBytes) {
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
      if (excelFile.size > maxExcelBytes) {
        return '엑셀 파일 크기는 10MB 이하여야 합니다. (' + excelFile.name + ')';
      }
    }
    return null;
  }

  function getPublicUrl(path) {
    if (!state.sb || !path) return '';
    var cfg = getConfig();
    var res = state.sb.storage.from(cfg.STORAGE_BUCKET).getPublicUrl(path);
    return (res && res.data && res.data.publicUrl) ? res.data.publicUrl : '';
  }

  function getReportedMap() {
    var key = getSettings().REPORT_STORAGE_KEY || 'zw_board_reported';
    try {
      return JSON.parse(localStorage.getItem(key) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function markReported(postId) {
    var key = getSettings().REPORT_STORAGE_KEY || 'zw_board_reported';
    try {
      var m = getReportedMap();
      m[postId] = 1;
      localStorage.setItem(key, JSON.stringify(m));
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
    var cdn = getSettings().SUPABASE_CDN || 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
    var s = document.createElement('script');
    s.src = cdn;
    s.onload = function () { cb(Boolean(window.supabase && window.supabase.createClient)); };
    s.onerror = function () { cb(false); };
    document.head.appendChild(s);
  }

  function dispatchPage(page, container, options) {
    var ctx = {
      page: page,
      container: container,
      options: options,
      settings: ZW_BOARD.settings,
      styles: ZW_BOARD.styles,
      core: ZW_BOARD.core,
      auth: ZW_BOARD.auth,
      list: ZW_BOARD.list,
      detail: ZW_BOARD.detail,
      write: ZW_BOARD.write
    };
    var pages = ZW_BOARD._pages || {};
    if (typeof pages[page] === 'function') {
      pages[page](ctx);
    } else if (ZW_BOARD.auth && typeof ZW_BOARD.auth.runHubBoard === 'function') {
      ZW_BOARD.auth.runHubBoard(container);
    }
  }

  function boot(options) {
    options = options || {};
    if (ZW_BOARD.styles && typeof ZW_BOARD.styles.injectStyles === 'function') {
      ZW_BOARD.styles.injectStyles();
    }

    var page = options.page || 'hub'; // 'hub' | 'all' | 'danga' | 'story' | 'review' | 'cardnews' | 'video'
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
        state.sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      } catch (e) {
        renderReadyBox(container);
        return;
      }

      var refreshPerms = (ZW_BOARD.auth && ZW_BOARD.auth.refreshUserPermissions)
        ? ZW_BOARD.auth.refreshUserPermissions
        : function () { return Promise.resolve(); };

      state.sb.auth.getSession().then(function (res) {
        var session = res && res.data && res.data.session;
        state.currentUser = session ? session.user : null;
        return refreshPerms();
      }).catch(function () {
        state.currentUser = null;
      }).then(function () {
        dispatchPage(page, container, options);
      });

      state.sb.auth.onAuthStateChange(function (_event, session) {
        var nextUser = session ? session.user : null;
        var prevId = state.currentUser ? state.currentUser.id : null;
        var nextId = nextUser ? nextUser.id : null;
        if (prevId === nextId) return;
        state.currentUser = nextUser;
        refreshPerms().then(function () {
          dispatchPage(page, container, options);
        });
      });
    });
  }

  ZW_BOARD.core = {
    state: state,
    getSb: function () { return state.sb; },
    getUser: function () { return state.currentUser; },
    getConfig: getConfig,
    getBoardMeta: getBoardMeta,
    isConfigured: isConfigured,
    friendlyError: friendlyError,
    maskAuthor: maskAuthor,
    deriveAuthorName: deriveAuthorName,
    formatDate: formatDate,
    makeUuid: makeUuid,
    getFileExt: getFileExt,
    validateFilesClientSide: validateFilesClientSide,
    getPublicUrl: getPublicUrl,
    getPublicFileUrl: getPublicUrl,
    getReportedMap: getReportedMap,
    markReported: markReported,
    renderReadyBox: renderReadyBox,
    ensureSupabaseScript: ensureSupabaseScript,
    boot: boot
  };

  ZW_BOARD._boot = boot;
  ZW_BOARD.friendlyError = friendlyError;
  ZW_BOARD.validateFilesClientSide = validateFilesClientSide;
})(window);
