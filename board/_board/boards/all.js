// 좌표나라 전체글 보기 게시판 (site/board/_board/boards/all.js)
// 단가표·이야기·후기·카드뉴스의 모든 글을 걸러 보고 쪽 번호로 이동하는 파일입니다.

(function (window) {
  'use strict';

  var ZW_BOARD = window.ZW_BOARD = window.ZW_BOARD || {};
  var allBoardGeneration = 0;

  function buildBoardNames(settings) {
    var order = (settings && settings.ALL_BOARD_ORDER) || ['danga', 'story', 'review', 'cardnews'];
    var boards = (settings && settings.BOARDS) || {};
    var defaults = { danga: '단가표', story: '이야기', review: '후기', cardnews: '카드뉴스' };
    var names = {};
    order.forEach(function (key) {
      names[key] = (boards[key] && boards[key].name) ? boards[key].name : (defaults[key] || key);
    });
    return { order: order, names: names };
  }

  function runAllBoard(ctx) {
    var container = ctx.container;
    if (!container) return;
    var core = ctx.core;
    var auth = ctx.auth;
    var detail = ctx.detail;
    var settings = ctx.settings || {};
    var state = core.state;

    var generation = ++allBoardGeneration;
    var pageSizes = settings.ALL_PAGE_SIZES || [15, 30, 50];
    var sizeKey = settings.ALL_PAGE_SIZE_KEY || 'zw_board_all_page_size';
    var page = 1;
    var size = settings.ALL_DEFAULT_PAGE_SIZE || 15;
    var filter = '';
    var request = 0;
    var detailRequest = 0;

    var boardInfo = buildBoardNames(settings);
    var names = boardInfo.names;
    var filterOrder = boardInfo.order;

    try {
      var saved = Number(localStorage.getItem(sizeKey));
      if (pageSizes.indexOf(saved) >= 0) size = saved;
    } catch (e) {}

    function el(tag, text, cls) {
      var node = document.createElement(tag);
      if (text !== undefined) node.textContent = text;
      if (cls) node.className = cls;
      return node;
    }

    function button(text, action) {
      var node = el('button', text, 'bd-btn small');
      node.type = 'button';
      node.addEventListener('click', action);
      return node;
    }

    container.textContent = '';
    var authBox = el('div');
    container.appendChild(authBox);
    auth.renderAuthBar(authBox, function () {
      auth.refreshUserPermissions().then(function () { runAllBoard(ctx); });
    });

    var card = el('section', undefined, 'card bd-all');
    container.appendChild(card);
    var head = el('div', undefined, 'bd-all-controls');
    var count = el('strong', '글 수를 불러오는 중…');
    var label = el('label', '보여 줄 개수 ');
    var select = el('select', undefined, 'bd-select');
    pageSizes.forEach(function (n) {
      var option = el('option', n + '개');
      option.value = String(n);
      select.appendChild(option);
    });
    select.value = String(size);
    select.addEventListener('change', function () {
      size = Number(select.value);
      try { localStorage.setItem(sizeKey, String(size)); } catch (e) {}
      page = 1;
      load(true);
    });
    label.appendChild(select);
    head.appendChild(count);
    head.appendChild(label);
    head.appendChild(button('새로고침', function () { load(false); }));
    card.appendChild(head);

    var filters = el('div', undefined, 'bd-all-controls');
    filters.setAttribute('aria-label', '게시판 걸러 보기');
    var filterButtons = [];
    [''].concat(filterOrder).forEach(function (value) {
      var btn = button(value ? names[value] : '전체', function () {
        filter = value;
        page = 1;
        load(true);
      });
      filterButtons.push({ node: btn, value: value });
      filters.appendChild(btn);
    });
    card.appendChild(filters);

    var status = el('p', '', 'note');
    status.setAttribute('role', 'status');
    var list = el('div');
    var nav = el('nav', undefined, 'bd-all-controls');
    nav.setAttribute('aria-label', '전체글 쪽 이동');
    card.appendChild(status);
    card.appendChild(list);
    card.appendChild(nav);

    function open(post, slot) {
      var ticket = ++detailRequest;
      list.querySelectorAll('.bd-all-detail').forEach(function (node) { node.textContent = ''; });
      slot.textContent = '글을 불러오는 중입니다…';
      state.sb.from('posts')
        .select('id,board,user_id,author_name,title,body,image_paths,file_path,file_name,report_count,hidden,created_at')
        .eq('id', post.id).eq('board', post.board).maybeSingle()
        .then(function (res) {
          if (generation !== allBoardGeneration || ticket !== detailRequest) return;
          if (res && res.error) throw res.error;
          if (!res || !res.data) { slot.textContent = '글이 삭제되었거나 볼 수 없습니다.'; return; }
          detail.renderPostDetail(res.data, post.board, slot, function () {
            ++detailRequest;
          }, function () { load(false); });
        }).catch(function (err) {
          if (generation === allBoardGeneration && ticket === detailRequest) {
            slot.textContent = core.friendlyError(err, post.board);
          }
        });
    }

    function renderRow(post) {
      var row = el('div', undefined, 'bd-all-row');
      row.setAttribute('role', 'row');
      var board = el('div', names[post.board] || post.board, 'bd-all-board');
      var titleCell = el('div', undefined, 'bd-all-title');
      var slot;
      var title = button('', function () { open(post, slot); });
      title.className = 'bd-all-open';
      if (post.hidden) title.appendChild(el('small', '(숨김) '));
      title.appendChild(el('span', post.title || '(제목 없음)'));
      titleCell.appendChild(title);
      var author = el('div', core.maskAuthor(post.author_name), 'bd-all-author');
      var date = new Date(post.created_at);
      var dateText = core.formatDate(post.created_at);
      if (!isNaN(date.getTime()) && date.toDateString() === new Date().toDateString()) {
        dateText = String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
      }
      var time = el('div', dateText, 'bd-all-date');
      [board, titleCell, author, time].forEach(function (cell) {
        cell.setAttribute('role', 'cell');
        row.appendChild(cell);
      });
      var group = el('div');
      group.setAttribute('role', 'rowgroup');
      group.appendChild(row);
      var detailRow = el('div');
      detailRow.setAttribute('role', 'row');
      slot = el('div', undefined, 'bd-all-detail');
      slot.setAttribute('role', 'cell');
      slot.setAttribute('aria-colspan', '4');
      detailRow.appendChild(slot);
      group.appendChild(detailRow);
      return group;
    }

    function load(scroll) {
      var ticket = ++request;
      ++detailRequest;
      list.textContent = '';
      nav.textContent = '';
      count.textContent = '글 수를 불러오는 중…';
      status.textContent = '글 목록을 불러오는 중입니다…';
      filterButtons.forEach(function (entry) {
        var selected = entry.value === filter;
        entry.node.setAttribute('aria-pressed', String(selected));
        entry.node.className = 'bd-btn small' + (selected ? ' primary' : '');
      });
      if (scroll) {
        try { card.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
      }
      var from = (page - 1) * size;
      var query = state.sb.from('posts').select('id,board,title,author_name,created_at,hidden', { count: 'exact' });
      if (filter) query = query.eq('board', filter);
      query.order('created_at', { ascending: false }).order('id', { ascending: false })
        .range(from, from + size - 1).then(function (res) {
          if (generation !== allBoardGeneration || ticket !== request) return;
          if (res && res.error) throw res.error;
          var total = res && res.count != null ? res.count : 0;
          var pages = Math.max(1, Math.ceil(total / size));
          if (page > pages) { page = pages; load(false); return; }
          count.textContent = total + '개의 글';
          var rows = res && res.data ? res.data : [];
          status.textContent = rows.length ? '' : '아직 올라온 글이 없습니다.';
          var table = el('div', undefined, 'bd-all-table');
          table.setAttribute('role', 'table');
          table.setAttribute('aria-label', '전체글 목록');
          if (rows.length) {
            var header = el('div', undefined, 'bd-all-row bd-all-header');
            header.setAttribute('role', 'row');
            ['게시판', '제목', '작성자', '작성일'].forEach(function (text) {
              var cell = el('div', text);
              cell.setAttribute('role', 'columnheader');
              header.appendChild(cell);
            });
            table.appendChild(header);
            rows.forEach(function (post) { table.appendChild(renderRow(post)); });
          }
          list.appendChild(table);
          function pageButton(text, dest, disabled) {
            var btn = button(text, function () { page = dest; load(true); });
            btn.disabled = disabled;
            if (text === String(page)) btn.setAttribute('aria-current', 'page');
            nav.appendChild(btn);
          }
          if (total) {
            pageButton('맨 처음', 1, page === 1);
            pageButton('이전', page - 1, page === 1);
            var first = Math.max(1, Math.min(page - 2, pages - 4));
            for (var n = first; n <= Math.min(pages, first + 4); n++) pageButton(String(n), n, n === page);
            pageButton('다음', page + 1, page === pages);
            pageButton('맨 끝', pages, page === pages);
          }
        }).catch(function (err) {
          if (generation !== allBoardGeneration || ticket !== request) return;
          count.textContent = '글 수를 불러오지 못했습니다.';
          status.textContent = core.friendlyError(err, filter);
        });
    }

    load(false);
  }

  if (typeof ZW_BOARD.register === 'function') {
    ZW_BOARD.register('all', runAllBoard);
  }
})(window);
