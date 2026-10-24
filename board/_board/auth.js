// 좌표나라 게시판 로그인·권한 도구 (site/board/_board/auth.js)
// 로그인 단추, 로그아웃, my_roles 권한 조회, 로그인 줄, 관리자 페이지 링크를 담당하는 파일입니다.

(function (window) {
  'use strict';

  var ZW_BOARD = window.ZW_BOARD = window.ZW_BOARD || {};
  var state = ZW_BOARD._state = ZW_BOARD._state || {
    sb: null,
    currentUser: null,
    vendorInfo: null,
    isAdmin: false,
    isSubmanager: false,
    permissionsRequest: 0
  };

  function getRedirectUrl() {
    var cfg = ZW_BOARD.core.getConfig();
    if (cfg.REDIRECT_URL) return cfg.REDIRECT_URL;
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      return location.origin + '/board/';
    }
    return 'https://jwapyonara.com/board/';
  }

  function refreshUserPermissions() {
    var request = ++state.permissionsRequest;
    state.vendorInfo = null;
    state.isAdmin = false;
    state.isSubmanager = false;
    if (!state.sb || !state.currentUser) return Promise.resolve();
    var userId = state.currentUser.id;
    return Promise.resolve().then(function () {
      return state.sb.rpc('my_roles');
    }).then(function (r) {
      if (request !== state.permissionsRequest || !state.currentUser || state.currentUser.id !== userId) return;
      if (!r || r.error || !r.data) throw (r && r.error) || new Error('역할 응답 없음');
      state.isAdmin = r.data.admin === true;
      state.isSubmanager = r.data.submanager === true;
      state.vendorInfo = r.data.vendor === true ? { name: r.data.vendor_name || '' } : null;
    }).catch(function () {
      // 패치 적용 전/RPC 오류에도 로그인은 유지하고 일반 손님으로 계속 표시한다.
      if (request !== state.permissionsRequest || !state.currentUser || state.currentUser.id !== userId) return;
      state.vendorInfo = null;
      state.isAdmin = false;
      state.isSubmanager = false;
      console.warn('게시판 my_roles 권한 조회 실패: 일반 손님으로 표시합니다.');
    });
  }

  function isStaff() {
    return Boolean(state.currentUser && (state.isAdmin || state.isSubmanager));
  }

  function canWriteBoard(boardType) {
    var meta = ZW_BOARD.core.getBoardMeta(boardType);
    var role = meta ? meta.writeRole : 'user';
    if (role === 'staff') {
      return isStaff();
    }
    if (role === 'vendor_or_staff') {
      return Boolean(state.currentUser && (state.vendorInfo || state.isAdmin || state.isSubmanager));
    }
    return Boolean(state.currentUser);
  }

  function canDeletePost(post) {
    if (!state.currentUser || !post) return false;
    return Boolean(state.currentUser.id === post.user_id || state.isAdmin || state.isSubmanager);
  }

  function getDeleteLabel(post) {
    if (state.currentUser && post && state.currentUser.id === post.user_id) {
      return '내 글 삭제';
    }
    return state.isAdmin ? '관리자 삭제' : '부매니저 삭제';
  }

  // 로그인 영역 그리기
  function renderAuthBar(box, onAuthChanged) {
    if (!box) return;
    var core = ZW_BOARD.core;
    var cfg = core.getConfig();
    box.innerHTML = '';

    var wrap = document.createElement('div');
    wrap.className = 'bd-auth';

    if (state.currentUser) {
      var top = document.createElement('div');
      top.className = 'bd-auth-top';

      var who = document.createElement('div');
      who.className = 'bd-auth-user';
      var badge = state.isAdmin ? ' (관리자)' : (state.isSubmanager ? ' (부매니저)' : (state.vendorInfo ? ' (업체: ' + state.vendorInfo.name + ')' : ''));
      who.textContent = '로그인됨: ' + core.deriveAuthorName(state.currentUser, state.vendorInfo ? 'danga' : 'story') + badge;

      var outBtn = document.createElement('button');
      outBtn.type = 'button';
      outBtn.className = 'bd-btn small';
      outBtn.textContent = '로그아웃';
      outBtn.addEventListener('click', function () {
        outBtn.disabled = true;
        state.sb.auth.signOut().then(function () {
          state.currentUser = null;
          state.vendorInfo = null;
          state.isAdmin = false;
          state.isSubmanager = false;
          ++state.permissionsRequest;
          if (onAuthChanged) onAuthChanged();
        }).catch(function () {
          outBtn.disabled = false;
        });
      });

      top.appendChild(who);
      if (state.isAdmin || state.isSubmanager) {
        var adminLink = document.createElement('a');
        adminLink.className = 'bd-btn small';
        adminLink.href = '/board/admin/index.html';
        adminLink.textContent = '관리자 페이지';
        top.appendChild(adminLink);
      }
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
          state.sb.auth.signInWithOAuth({
            provider: provider,
            options: { redirectTo: getRedirectUrl() }
          }).then(function (res) {
            if (res && res.error) {
              msg.className = 'bd-msg err';
              msg.textContent = core.friendlyError(res.error);
            }
          }).catch(function (err) {
            msg.className = 'bd-msg err';
            msg.textContent = core.friendlyError(err);
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

  // 안내 첫 화면(hub)에서 로그인 상자 표시
  function runHubBoard(container) {
    if (!container) return;
    renderAuthBar(container, function () {
      refreshUserPermissions().then(function () {
        renderAuthBar(container);
      });
    });
  }

  ZW_BOARD.auth = {
    getRedirectUrl: getRedirectUrl,
    refreshUserPermissions: refreshUserPermissions,
    renderAuthBar: renderAuthBar,
    runHubBoard: runHubBoard,
    isStaff: isStaff,
    canWriteBoard: canWriteBoard,
    canDeletePost: canDeletePost,
    getDeleteLabel: getDeleteLabel
  };

  if (typeof ZW_BOARD.register === 'function') {
    ZW_BOARD.register('hub', function (ctx) {
      runHubBoard(ctx.container);
    });
  }
})(window);
