// 좌표나라 단가표 게시판 (site/board/_board/boards/danga.js)
// 단가표 게시판 전용 화면 처리 파일입니다. 앞으로 지역별 구역이나 단가표 전용 기능을 더할 때 이 파일만 고칩니다.

(function (window) {
  'use strict';

  var ZW_BOARD = window.ZW_BOARD = window.ZW_BOARD || {};

  if (typeof ZW_BOARD.register === 'function') {
    ZW_BOARD.register('danga', function (ctx) {
      ctx.list.runPostBoard(ctx.container, 'danga', ctx.options);
    });
  }
})(window);
