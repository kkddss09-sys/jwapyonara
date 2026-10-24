// 좌표나라 카드뉴스 게시판 (site/board/_board/boards/cardnews.js)
// 운영진이 올리는 갤러리형 카드뉴스 게시판(사진 최대 10장) 전용 파일입니다.

(function (window) {
  'use strict';

  var ZW_BOARD = window.ZW_BOARD = window.ZW_BOARD || {};

  if (typeof ZW_BOARD.register === 'function') {
    ZW_BOARD.register('cardnews', function (ctx) {
      ctx.list.runPostBoard(ctx.container, 'cardnews', ctx.options);
    });
  }
})(window);
