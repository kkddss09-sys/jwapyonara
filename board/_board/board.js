// 좌표나라 게시판 진입 스크립트 (site/board/_board/board.js)
// 각 HTML 쪽은 이 파일 하나만 불러오며, 버전 번호(?v=BOARD_VERSION)를 붙여 하위 조각들을 순서대로 불러옵니다.

(function (window) {
  'use strict';

  var BOARD_VERSION = '20261025-1';
  var MODULES = [
    'settings.js',
    'styles.js',
    'core.js',
    'auth.js',
    'detail.js',
    'list.js',
    'write.js',
    'boards/danga.js',
    'boards/story.js',
    'boards/cardnews.js',
    'boards/video.js',
    'boards/all.js'
  ];

  var ZW_BOARD = window.ZW_BOARD = window.ZW_BOARD || {};
  ZW_BOARD.BOARD_VERSION = BOARD_VERSION;
  ZW_BOARD._pages = ZW_BOARD._pages || {};

  var pendingInits = [];
  var loadStatus = 'idle'; // 'idle' | 'loading' | 'ready' | 'error'

  function getBasePath() {
    var cs = document.currentScript;
    if (cs && cs.src) return cs.src.replace(/\/[^\/?#]*([?#].*)?$/, '/');
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || '';
      if (/\/board\.js(?:[?#].*)?$/.test(src)) return src.replace(/\/board\.js(?:[?#].*)?$/, '/');
    }
    return '../_board/';
  }

  var basePath = getBasePath();

  function renderLoadFailure(options) {
    var container = document.getElementById((options && options.targetId) || 'boardApp');
    if (!container) return;
    container.innerHTML = '<div class="bd-ready" role="status"><b>게시판을 불러오지 못했습니다. 새로고침해 주세요</b></div>';
  }

  function flushQueue() {
    var queue = pendingInits.slice();
    pendingInits.length = 0;
    queue.forEach(function (opts) {
      if (loadStatus === 'ready' && typeof ZW_BOARD._boot === 'function') ZW_BOARD._boot(opts);
      else renderLoadFailure(opts);
    });
  }

  function loadModules() {
    if (loadStatus !== 'idle') return;
    if (typeof ZW_BOARD._boot === 'function') { loadStatus = 'ready'; flushQueue(); return; }
    loadStatus = 'loading';
    var remaining = MODULES.length;
    var failed = false;
    var head = document.head || document.getElementsByTagName('head')[0] || document.documentElement;

    MODULES.forEach(function (relPath) {
      var s = document.createElement('script');
      s.async = false;
      s.src = basePath + relPath + '?v=' + encodeURIComponent(BOARD_VERSION);
      s.onload = function () {
        if (failed) return;
        if (--remaining === 0) {
          loadStatus = (typeof ZW_BOARD._boot === 'function') ? 'ready' : 'error';
          flushQueue();
        }
      };
      s.onerror = function () {
        if (failed) return;
        failed = true;
        loadStatus = 'error';
        flushQueue();
      };
      head.appendChild(s);
    });
  }

  ZW_BOARD.register = function (pageName, handler) {
    if (pageName && typeof handler === 'function') ZW_BOARD._pages[pageName] = handler;
  };

  ZW_BOARD.init = function (options) {
    options = options || {};
    if (loadStatus === 'ready' && typeof ZW_BOARD._boot === 'function') { ZW_BOARD._boot(options); return; }
    if (loadStatus === 'error') { renderLoadFailure(options); return; }
    pendingInits.push(options);
    loadModules();
  };

  loadModules();
})(window);
