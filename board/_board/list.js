// 좌표나라 게시판 글 목록 공통 도구 (site/board/_board/list.js)
// 글 목록 한 줄/카드 그리기, 더 보기 불러오기, 일반 게시판(단가표·이야기·후기·카드뉴스) 공통 화면 조립을 담당하는 파일입니다.

(function (window) {
  'use strict';

  var ZW_BOARD = window.ZW_BOARD = window.ZW_BOARD || {};

  function renderPostItem(post, boardType, onOpen) {
    var core = ZW_BOARD.core;
    var metaInfo = core.getBoardMeta(boardType) || {};
    var allowExcel = Boolean(metaInfo.allowExcel || boardType === 'danga');

    var item = document.createElement('div');
    item.className = 'bd-item';
    item.setAttribute('role', 'button');
    item.tabIndex = 0;

    var imgs = Array.isArray(post.image_paths) ? post.image_paths : [];
    if (imgs.length > 0) {
      var thumbUrl = core.getPublicUrl(imgs[0]);
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
    sAuthor.textContent = core.maskAuthor(post.author_name);
    var sDate = document.createElement('span');
    sDate.textContent = core.formatDate(post.created_at);

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

    if (allowExcel && post.file_path) {
      var fUrl = core.getPublicUrl(post.file_path);
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
      if (onOpen) onOpen(post);
    });
    item.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        if (onOpen) onOpen(post);
      }
    });

    return item;
  }

  function runPostBoard(container, boardType, opts) {
    if (!container) return;
    opts = opts || {};
    var core = ZW_BOARD.core;
    var auth = ZW_BOARD.auth;
    var detail = ZW_BOARD.detail;
    var write = ZW_BOARD.write;
    var state = core.state;
    var settings = ZW_BOARD.settings || {};
    var pageSize = settings.PAGE_SIZE || 20;
    var metaInfo = core.getBoardMeta(boardType) || {};
    var isGallery = Boolean(metaInfo.gallery || boardType === 'cardnews');

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
    listTitle.textContent = metaInfo.listTitle || ({
      danga: '등록된 단가표 목록',
      story: '이야기 글 목록',
      review: '후기 글 목록',
      cardnews: '카드뉴스 목록'
    }[boardType] || '글 목록');

    var refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.className = 'bd-btn small';
    refreshBtn.textContent = '새로고침';

    listHead.appendChild(listTitle);
    listHead.appendChild(refreshBtn);

    var listBox = document.createElement('div');
    listBox.className = 'bd-list' + (isGallery ? ' bd-gallery' : '');

    var listStatus = document.createElement('p');
    listStatus.className = 'note';
    listStatus.style.textAlign = 'center';
    listStatus.style.margin = '18px 0';

    var moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'bd-btn';
    moreBtn.style.width = '100%';
    moreBtn.style.display = 'none';
    moreBtn.textContent = '더 보기 (' + pageSize + '개씩)';

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

    function openPostDetail(post) {
      activePostId = post.id;
      detail.renderPostDetail(post, boardType, detailSlot, function () {
        activePostId = null;
      }, function () {
        activePostId = null;
        loadPosts(true);
      });
    }

    function loadPosts(reset) {
      if (reset) {
        offset = 0;
        listBox.innerHTML = '';
      }
      listStatus.style.display = 'block';
      listStatus.textContent = '글 목록을 불러오는 중입니다…';
      moreBtn.style.display = 'none';

      state.sb.from('posts')
        .select('id, board, user_id, author_name, title, body, image_paths, file_path, file_name, report_count, hidden, created_at')
        .eq('board', boardType)
        .eq('hidden', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)
        .then(function (res) {
          if (res && res.error) throw res.error;
          var rows = (res && res.data) ? res.data : [];
          rows.forEach(function (r) {
            listBox.appendChild(renderPostItem(r, boardType, openPostDetail));
          });
          offset += rows.length;

          if (offset === 0) {
            listStatus.style.display = 'block';
            listStatus.textContent = '아직 올라온 글이 없습니다.';
          } else {
            listStatus.style.display = 'none';
          }
          if (rows.length === pageSize) {
            moreBtn.style.display = 'inline-flex';
          } else {
            moreBtn.style.display = 'none';
          }
        })
        .catch(function (err) {
          listStatus.style.display = 'block';
          listStatus.textContent = core.friendlyError(err, boardType);
        });
    }

    refreshBtn.addEventListener('click', function () { loadPosts(true); });
    moreBtn.addEventListener('click', function () { loadPosts(false); });

    function redrawAll() {
      auth.renderAuthBar(authSlot, function () {
        auth.refreshUserPermissions().then(redrawAll);
      });
      write.renderWriteSection(writeSlot, boardType, opts, function () {
        loadPosts(true);
      });
      if (activePostId) {
        detailSlot.innerHTML = '';
        activePostId = null;
      }
    }

    redrawAll();
    loadPosts(true);
  }

  ZW_BOARD.list = {
    renderPostItem: renderPostItem,
    runPostBoard: runPostBoard
  };
})(window);
