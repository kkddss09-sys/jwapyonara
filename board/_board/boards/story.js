// 좌표나라 이야기·후기 게시판 (site/board/_board/boards/story.js)
// 이야기(story)와 후기(review) 게시판이 같은 틀을 재사용하는 파일입니다.

(function (window) {
  'use strict';

  var ZW_BOARD = window.ZW_BOARD = window.ZW_BOARD || {};

  function runStoryLikeBoard(ctx) {
    var boardType = ctx.page === 'review' ? 'review' : 'story';
    ctx.list.runPostBoard(ctx.container, boardType, ctx.options);
  }

  if (typeof ZW_BOARD.register === 'function') {
    ZW_BOARD.register('story', runStoryLikeBoard);
    ZW_BOARD.register('review', runStoryLikeBoard);
  }
})(window);
