// 좌표나라 영상 게시판 (site/board/_board/boards/video.js)
// 유튜브 목록 파일(_data/videos.json) 쇼츠 구역 + 운영진 전용 영상 링크 추가·삭제, 클릭 시 youtube-nocookie 재생을 담당하는 파일입니다.

(function (window) {
  'use strict';

  var ZW_BOARD = window.ZW_BOARD = window.ZW_BOARD || {};
  var activeCleanup = null;
  var boardGen = 0;

  function el(tag, text, cls) {
    var node = document.createElement(tag);
    if (text !== undefined && text !== null) node.textContent = String(text);
    if (cls) node.className = cls;
    return node;
  }

  // 허용한 유튜브 호스트와 경로만 해석한다. 외부 접속은 하지 않는다.
  function extractYoutubeId(value) {
    var invalid = '유튜브 영상 주소를 확인해 주세요. 공유 주소, watch, shorts 또는 embed 주소를 넣어 주세요.';
    var url;
    try { url = new URL(String(value || '').trim()); } catch (e) { throw new Error(invalid); }
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.port) throw new Error(invalid);
    var host = url.hostname.toLowerCase();
    var id = '';
    var match;
    if (host === 'youtu.be') {
      match = url.pathname.match(/^\/([A-Za-z0-9_-]{11})\/?$/);
      id = match ? match[1] : '';
    } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].indexOf(host) >= 0) {
      if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
      else {
        match = url.pathname.match(/^\/(?:shorts|embed)\/([A-Za-z0-9_-]{11})\/?$/);
        id = match ? match[1] : '';
      }
    }
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error(invalid);
    return id;
  }

  function buildVideoEmbedSrc(id) {
    return 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?rel=0&playsinline=1&autoplay=1';
  }

  function buildDataUrl(settings) {
    var base = (settings && settings.VIDEO_DATA_URL) || '../_data/videos.json';
    var ver = ZW_BOARD.BOARD_VERSION || '1';
    return base + (base.indexOf('?') >= 0 ? '&' : '?') + 'v=' + encodeURIComponent(ver);
  }

  function normalizeVideoItem(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var id = String(raw.id || '').trim();
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
    return {
      id: id,
      // 카드뉴스와 같은 분류(일반 글은 갈래가 분류)
      cat: (String(raw['구분'] || '').trim() === '일반' && String(raw['갈래'] || '').trim()) ? String(raw['갈래']).trim() : String(raw['구분'] || '').trim(),
      date: String(raw['날짜'] || '').trim(),
      title: String(raw['제목'] || '(제목 없음)').trim()
    };
  }

  function mountShortsSection(slot, ctx, myGen) {
    var settings = (ctx && ctx.settings) || ZW_BOARD.settings || {};
    var categories = Array.isArray(settings.VIDEO_CATEGORIES) && settings.VIDEO_CATEGORIES.length
      ? settings.VIDEO_CATEGORIES
      : [{ key: '휴대폰' }, { key: '부동산' }];
    var gridCols = Number(settings.VIDEO_GRID_COLUMNS) || 3;
    var pageSize = Number(settings.VIDEO_PAGE_SIZE) || 12;

    var allItems = [];
    var filteredItems = [];
    var activeCat = '';
    var visibleCount = pageSize;
    var cardBtnMap = {};
    var lastTriggerEl = null;

    var wrap = null;
    var tabsBar = null;
    var listArea = null;
    var moreWrap = null;

    var overlayEl = null;
    var iframeEl = null;
    var pagePillEl = null;
    var badgeEl = null;
    var dateEl = null;
    var ytLinkEl = null;
    var titleEl = null;
    var adjHintEl = null;
    var prevBtnEl = null;
    var nextBtnEl = null;
    var activeIdx = 0;
    var pushedOverlayHistory = false;
    var wheelLockUntil = 0;
    var touchStartY = null;

    function isValidCat(catKey) {
      for (var i = 0; i < categories.length; i++) {
        if (categories[i] && categories[i].key === catKey) return true;
      }
      return false;
    }

    function readUrlState() {
      var params = new URLSearchParams(window.location.search || '');
      var vcat = (params.get('vcat') || '').trim();
      var v = (params.get('v') || '').trim();
      if (!isValidCat(vcat)) vcat = '';
      if (v && !/^[A-Za-z0-9_-]{6,20}$/.test(v)) v = '';
      return { vcat: vcat, v: v };
    }

    function writeUrlState(videoId, usePush) {
      try {
        var url = new URL(window.location.href);
        if (activeCat) url.searchParams.set('vcat', activeCat); else url.searchParams.delete('vcat');
        if (videoId) url.searchParams.set('v', videoId); else url.searchParams.delete('v');
        var nextHref = url.pathname + (url.search || '') + (url.hash || '');
        if (usePush) window.history.pushState({ zwVideo: videoId || '' }, '', nextHref);
        else window.history.replaceState({ zwVideo: videoId || '' }, '', nextHref);
      } catch (e) {}
    }

    function countItems(catKey) {
      if (!catKey) return allItems.length;
      var n = 0;
      for (var i = 0; i < allItems.length; i++) {
        if (allItems[i].cat === catKey) n++;
      }
      return n;
    }

    function renderTabs() {
      if (!tabsBar) return;
      tabsBar.textContent = '';
      [''].concat(categories.map(function (c) { return c.key; })).forEach(function (key) {
        var label = key || '전체';
        var cnt = countItems(key);
        var btn = el('button', label + ' ' + cnt, 'bd-vid-tab' + (activeCat === key ? ' on' : ''));
        btn.type = 'button';
        btn.setAttribute('aria-pressed', String(activeCat === key));
        btn.setAttribute('aria-label', label + ' ' + cnt + '개 보기');
        btn.addEventListener('click', function () {
          if (activeCat === key) return;
          activeCat = key;
          visibleCount = pageSize;
          writeUrlState('', false);
          refreshList();
        });
        tabsBar.appendChild(btn);
      });
    }

    function renderGrid() {
      if (!listArea || !moreWrap) return;
      listArea.textContent = '';
      moreWrap.textContent = '';
      cardBtnMap = {};

      if (!filteredItems.length) {
        listArea.appendChild(el('div', '해당 구분에 영상이 없습니다.', 'bd-vid-empty'));
        return;
      }

      var grid = el('div', undefined, 'bd-vid-grid');
      filteredItems.slice(0, visibleCount).forEach(function (item) {
        var cardBtn = el('button', undefined, 'bd-vid-card');
        cardBtn.type = 'button';
        cardBtn.setAttribute('aria-label', item.title + ' 쇼츠 영상 열기');

        var thumbWrap = el('div', undefined, 'bd-vid-thumb-wrap');
        var img = document.createElement('img');
        img.className = 'bd-vid-thumb';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.alt = item.title;
        img.src = 'https://i.ytimg.com/vi/' + encodeURIComponent(item.id) + '/mqdefault.jpg';
        thumbWrap.appendChild(img);

        var info = el('div', undefined, 'bd-vid-info');
        var metaEl = el('div', undefined, 'bd-vid-meta');
        metaEl.appendChild(el('span', item.cat));
        metaEl.appendChild(el('span', item.date));
        info.appendChild(el('p', item.title, 'bd-vid-title'));
        info.appendChild(metaEl);

        cardBtn.appendChild(thumbWrap);
        cardBtn.appendChild(info);
        cardBtn.addEventListener('click', function () {
          lastTriggerEl = cardBtn;
          openViewer(item.id, true);
        });
        cardBtnMap[item.id] = cardBtn;
        grid.appendChild(cardBtn);
      });
      listArea.appendChild(grid);

      if (visibleCount < filteredItems.length) {
        var moreBtn = el('button', '더 보기', 'bd-btn');
        moreBtn.type = 'button';
        moreBtn.setAttribute('aria-label', '쇼츠 영상 더 보기');
        moreBtn.addEventListener('click', function () {
          visibleCount += pageSize;
          renderGrid();
        });
        moreWrap.appendChild(moreBtn);
      }
    }

    function refreshList() {
      filteredItems = allItems.filter(function (item) {
        if (activeCat && item.cat !== activeCat) return false;
        return true;
      });
      renderTabs();
      renderGrid();
    }

    function updateViewerContent(idx, syncUrl) {
      if (!overlayEl || idx < 0 || idx >= filteredItems.length) return;
      activeIdx = idx;
      var cur = filteredItems[idx];
      var prevItem = idx > 0 ? filteredItems[idx - 1] : null;
      var nextItem = idx < filteredItems.length - 1 ? filteredItems[idx + 1] : null;

      var nextSrc = buildVideoEmbedSrc(cur.id);
      if (iframeEl && iframeEl.getAttribute('data-vid') !== cur.id) {
        iframeEl.setAttribute('data-vid', cur.id);
        iframeEl.title = cur.title;
        iframeEl.src = nextSrc;
      }

      if (pagePillEl) pagePillEl.textContent = (idx + 1) + ' / ' + filteredItems.length;
      if (badgeEl) badgeEl.textContent = cur.cat || '영상';
      if (dateEl) dateEl.textContent = cur.date;
      if (titleEl) titleEl.textContent = cur.title;
      if (ytLinkEl) {
        ytLinkEl.href = 'https://www.youtube.com/watch?v=' + encodeURIComponent(cur.id);
        ytLinkEl.setAttribute('aria-label', cur.title + ' 유튜브에서 보기 (새 창)');
      }

      if (prevBtnEl) {
        prevBtnEl.disabled = !prevItem;
        prevBtnEl.setAttribute('aria-label', prevItem ? ('이전 영상: ' + prevItem.title) : '이전 영상 없음');
      }
      if (nextBtnEl) {
        nextBtnEl.disabled = !nextItem;
        nextBtnEl.setAttribute('aria-label', nextItem ? ('다음 영상: ' + nextItem.title) : '다음 영상 없음');
      }
      if (adjHintEl) {
        if (nextItem) adjHintEl.textContent = '다음: ' + nextItem.title;
        else if (prevItem) adjHintEl.textContent = '마지막 영상입니다 (이전: ' + prevItem.title + ')';
        else adjHintEl.textContent = '';
      }

      if (syncUrl) writeUrlState(cur.id, false);
    }

    function stepVideo(delta) {
      var target = activeIdx + delta;
      if (target < 0 || target >= filteredItems.length) return;
      updateViewerContent(target, true);
    }

    function closeViewer(fromPopState) {
      if (!overlayEl) return;
      if (iframeEl) {
        try { iframeEl.src = 'about:blank'; } catch (e) {}
      }
      if (overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
      overlayEl = null; iframeEl = null; pagePillEl = null;
      badgeEl = null; dateEl = null; ytLinkEl = null; titleEl = null; adjHintEl = null;
      prevBtnEl = null; nextBtnEl = null;
      document.body.classList.remove('bd-vid-lock');

      if (!fromPopState) {
        if (pushedOverlayHistory) {
          pushedOverlayHistory = false;
          try { window.history.back(); } catch (e) { writeUrlState('', false); }
          // 영상을 넘겨 본 뒤에는 뒤로 가도 ?v= 가 남을 수 있어, 닫힌 뒤에 한 번 더 지운다
          setTimeout(function () { if (!overlayEl && /[?&]v=/.test(window.location.search)) writeUrlState('', false); }, 200);
        } else {
          writeUrlState('', false);
        }
      } else {
        pushedOverlayHistory = false;
      }

      var focusTarget = (filteredItems[activeIdx] && cardBtnMap[filteredItems[activeIdx].id]) || lastTriggerEl;
      if (focusTarget && typeof focusTarget.focus === 'function') {
        try { focusTarget.focus(); } catch (e) {}
      }
    }

    function openViewer(videoId, usePush) {
      var startIdx = -1;
      for (var i = 0; i < filteredItems.length; i++) {
        if (filteredItems[i].id === videoId) { startIdx = i; break; }
      }
      if (startIdx < 0) {
        for (var j = 0; j < allItems.length; j++) {
          if (allItems[j].id === videoId) { activeCat = ''; refreshList(); break; }
        }
        for (var k = 0; k < filteredItems.length; k++) {
          if (filteredItems[k].id === videoId) { startIdx = k; break; }
        }
      }
      if (startIdx < 0) return;

      // 다른 겹침(카드뉴스 등)이 열려 있으면 닫아 두 겹침이 동시에 뜨지 않게 한다.
      var otherOverlay = document.querySelector('.bd-cn-overlay');
      if (otherOverlay && otherOverlay.parentNode) {
        otherOverlay.parentNode.removeChild(otherOverlay);
        document.body.classList.remove('bd-cn-lock');
      }
      if (overlayEl) closeViewer(true);

      overlayEl = el('div', undefined, 'bd-vid-overlay');
      overlayEl.setAttribute('role', 'dialog');
      overlayEl.setAttribute('aria-modal', 'true');
      overlayEl.setAttribute('aria-label', '좌표나라 쇼츠 영상 보기');

      var topbar = el('div', undefined, 'bd-vid-topbar');
      pagePillEl = el('div', '1 / 1', 'bd-vid-page-pill');
      var topActions = el('div', undefined, 'bd-vid-top-actions');

      var closeBtn = el('button', '✕ 닫기', 'bd-vid-icon-btn');
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', '쇼츠 영상 보기 닫기');
      closeBtn.addEventListener('click', function () { closeViewer(false); });
      topActions.appendChild(closeBtn);
      topbar.appendChild(pagePillEl);
      topbar.appendChild(topActions);

      var bodyWrap = el('div', undefined, 'bd-vid-body');
      var stageRow = el('div', undefined, 'bd-vid-stage-row');

      var frameBox = el('div', undefined, 'bd-vid-frame-box');
      iframeEl = document.createElement('iframe');
      iframeEl.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
      iframeEl.setAttribute('allowfullscreen', '');
      frameBox.appendChild(iframeEl);

      var navCol = el('div', undefined, 'bd-vid-nav-col');
      prevBtnEl = el('button', '↑', 'bd-vid-nav-btn');
      prevBtnEl.type = 'button';
      prevBtnEl.addEventListener('click', function () { stepVideo(-1); });
      nextBtnEl = el('button', '↓', 'bd-vid-nav-btn');
      nextBtnEl.type = 'button';
      nextBtnEl.addEventListener('click', function () { stepVideo(1); });
      navCol.appendChild(prevBtnEl);
      navCol.appendChild(nextBtnEl);

      stageRow.appendChild(frameBox);
      stageRow.appendChild(navCol);

      var bottomBox = el('div', undefined, 'bd-vid-bottom');
      var metaRow = el('div', undefined, 'bd-vid-overlay-meta');
      var metaLeft = el('div', undefined, 'bd-vid-overlay-meta-left');
      badgeEl = el('span', '', 'bd-vid-overlay-badge');
      dateEl = el('span', '');
      metaLeft.appendChild(badgeEl);
      metaLeft.appendChild(dateEl);

      ytLinkEl = el('a', '유튜브에서 보기 ↗', 'bd-vid-yt-link');
      ytLinkEl.target = '_blank';
      ytLinkEl.rel = 'noopener';
      metaRow.appendChild(metaLeft);
      metaRow.appendChild(ytLinkEl);

      titleEl = el('h2', '', 'bd-vid-overlay-title');
      adjHintEl = el('div', '', 'bd-vid-adj-hint');

      bottomBox.appendChild(metaRow);
      bottomBox.appendChild(titleEl);
      bottomBox.appendChild(adjHintEl);

      bodyWrap.appendChild(stageRow);
      bodyWrap.appendChild(bottomBox);

      overlayEl.appendChild(topbar);
      overlayEl.appendChild(bodyWrap);

      // 위/아래 쓸어 올리기 및 마우스 휠로 이전/다음 영상 전환
      overlayEl.addEventListener('wheel', function (e) {
        if (Math.abs(e.deltaY) < 32) return;
        var now = Date.now();
        if (now < wheelLockUntil) return;
        wheelLockUntil = now + 420;
        if (e.deltaY > 0) stepVideo(1);
        else stepVideo(-1);
      }, { passive: true });

      overlayEl.addEventListener('touchstart', function (e) {
        if (e.touches && e.touches.length === 1) touchStartY = e.touches[0].clientY;
      }, { passive: true });

      overlayEl.addEventListener('touchend', function (e) {
        if (touchStartY === null || !e.changedTouches || !e.changedTouches.length) return;
        var dy = touchStartY - e.changedTouches[0].clientY;
        touchStartY = null;
        if (Math.abs(dy) < 48) return;
        if (dy > 0) stepVideo(1);
        else stepVideo(-1);
      }, { passive: true });

      document.body.appendChild(overlayEl);
      document.body.classList.add('bd-vid-lock');

      pushedOverlayHistory = Boolean(usePush);
      writeUrlState(videoId, Boolean(usePush));
      updateViewerContent(startIdx, false);

      try { closeBtn.focus(); } catch (e) {}
    }

    function onKeyDown(e) {
      if (!overlayEl) return;
      if (e.key === 'Escape') { e.preventDefault(); closeViewer(false); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); stepVideo(-1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); stepVideo(1); }
    }

    function onPopState() {
      if (!allItems.length) return;
      var st = readUrlState();
      if (st.vcat !== activeCat) {
        activeCat = st.vcat;
        visibleCount = pageSize;
        refreshList();
      }
      if (st.v) openViewer(st.v, false);
      else if (overlayEl) closeViewer(true);
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('popstate', onPopState);
    activeCleanup = function () {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('popstate', onPopState);
      if (overlayEl) closeViewer(true);
    };

    fetch(buildDataUrl(settings))
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (myGen !== boardGen) return;
        var rawList = (data && Array.isArray(data['항목'])) ? data['항목'] : null;
        if (!rawList) return;
        allItems = rawList.map(normalizeVideoItem).filter(Boolean);
        if (!allItems.length) return;

        slot.style.setProperty('--bd-vid-cols', String(gridCols));
        wrap = el('section', undefined, 'bd-vid-wrap');
        wrap.appendChild(el('h2', '좌표나라 쇼츠', 'bd-vid-heading'));

        tabsBar = el('div', undefined, 'bd-vid-tabs');
        tabsBar.setAttribute('role', 'tablist');
        tabsBar.setAttribute('aria-label', '쇼츠 영상 구분');
        listArea = el('div');
        moreWrap = el('div', undefined, 'bd-vid-more-wrap');

        wrap.appendChild(tabsBar);
        wrap.appendChild(listArea);
        wrap.appendChild(moreWrap);
        slot.appendChild(wrap);

        var initUrl = readUrlState();
        activeCat = initUrl.vcat;
        refreshList();
        if (initUrl.v) openViewer(initUrl.v, false);
      })
      .catch(function () {
        // 데이터 파일이 없거나 불러오기 실패 시 조용히 숨긴다 (기존 화면 그대로)
      });
  }

  // 영상 게시판 화면 (상단: 유튜브 목록 파일 쇼츠 구역 / 하단: 기존 videos 테이블 DB 구역)
  function runVideoBoard(ctx) {
    var container = ctx && ctx.container;
    if (!container) return;
    if (typeof activeCleanup === 'function') { activeCleanup(); activeCleanup = null; }
    var myGen = ++boardGen;

    var core = ctx.core;
    var auth = ctx.auth;
    var state = core.state;

    container.innerHTML = '';

    var authSlot = document.createElement('div');
    container.appendChild(authSlot);
    auth.renderAuthBar(authSlot, function () {
      auth.refreshUserPermissions().then(function () { runVideoBoard(ctx); });
    });

    // 맨 위 새 구역: 좌표나라 쇼츠 (videos.json 데이터가 있을 때만 그려짐)
    var shortsSlot = document.createElement('div');
    container.appendChild(shortsSlot);
    mountShortsSection(shortsSlot, ctx, myGen);

    if (auth.isStaff()) {
      var form = document.createElement('form');
      form.className = 'card bd-form';
      var heading = document.createElement('h2');
      heading.textContent = '영상 링크 추가';
      form.appendChild(heading);

      function addInput(id, labelText, maxLength) {
        var field = document.createElement('div');
        field.className = 'field';
        var label = document.createElement('label');
        label.htmlFor = id;
        label.textContent = labelText;
        var input = document.createElement('input');
        input.id = id;
        input.type = 'text';
        input.required = true;
        input.maxLength = maxLength;
        field.appendChild(label);
        field.appendChild(input);
        form.appendChild(field);
        return input;
      }

      var urlInput = addInput('bdVideoUrl', '유튜브 영상 주소', 2048);
      var titleInput = addInput('bdVideoTitle', '제목 (1~80자)', 80);
      var msg = document.createElement('div');
      msg.className = 'bd-msg';
      msg.setAttribute('role', 'status');
      var addBtn = document.createElement('button');
      addBtn.type = 'submit';
      addBtn.className = 'bd-btn primary';
      addBtn.textContent = '추가';
      form.appendChild(msg);
      form.appendChild(addBtn);

      form.addEventListener('submit', function (event) {
        event.preventDefault();
        if (addBtn.disabled) return;
        msg.className = 'bd-msg err';
        if (!auth.isStaff()) {
          msg.textContent = '영상은 운영진만 추가할 수 있습니다.';
          return;
        }
        var youtubeId;
        try { youtubeId = extractYoutubeId(urlInput.value); }
        catch (err) { msg.textContent = err.message; urlInput.focus(); return; }
        var title = titleInput.value.trim();
        if (!title || title.length > 80) {
          msg.textContent = '제목을 1자 이상 80자 이하로 입력해 주세요.';
          titleInput.focus();
          return;
        }
        msg.className = 'bd-msg';
        addBtn.disabled = true;
        addBtn.textContent = '추가하는 중…';
        state.sb.from('videos').insert({ youtube_id: youtubeId, title: title }).then(function (res) {
          if (res && res.error) throw res.error;
          runVideoBoard(ctx);
        }).catch(function (err) {
          msg.className = 'bd-msg err';
          msg.textContent = core.friendlyError(err, 'video');
          addBtn.disabled = false;
          addBtn.textContent = '추가';
        });
      });
      container.appendChild(form);
    }

    var listWrap = document.createElement('div');
    listWrap.className = 'bd-video-list';

    var status = document.createElement('div');
    status.className = 'bd-ready';
    status.innerHTML = '<b>영상을 불러오는 중입니다…</b>';

    container.appendChild(status);
    container.appendChild(listWrap);

    state.sb.from('videos')
      .select('id, youtube_id, title, sort, created_at')
      .order('sort', { ascending: true })
      .order('created_at', { ascending: false })
      .then(function (res) {
        if (myGen !== boardGen) return;
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

          if (auth.isStaff()) {
            var deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'bd-btn small danger';
            deleteBtn.textContent = '삭제';
            var deleteMsg = document.createElement('div');
            deleteMsg.className = 'bd-msg';
            var confirming = false;
            deleteBtn.addEventListener('click', function () {
              if (!auth.isStaff()) return;
              if (!confirming) {
                confirming = true;
                deleteBtn.textContent = '정말 삭제할까요? (한 번 더 누르면 삭제)';
                return;
              }
              deleteBtn.disabled = true;
              state.sb.from('videos').delete().eq('id', v.id).select('id').then(function (res) {
                if (res && res.error) throw res.error;
                if (!res || !res.data || !res.data.length) throw new Error('permission');
                runVideoBoard(ctx);
              }).catch(function (err) {
                confirming = false;
                deleteBtn.disabled = false;
                deleteBtn.textContent = '삭제';
                deleteMsg.className = 'bd-msg err';
                deleteMsg.textContent = core.friendlyError(err, 'video');
              });
            });
            card.appendChild(deleteBtn);
            card.appendChild(deleteMsg);
          }
          listWrap.appendChild(card);
        });

        if (!listWrap.children.length) {
          status.style.display = 'block';
          status.innerHTML = '<b>곧 올라옵니다</b><p>재미있는 이야기 쇼츠 영상을 준비하고 있습니다.</p>';
        }
      })
      .catch(function (err) {
        if (myGen !== boardGen) return;
        status.textContent = core.friendlyError(err, 'video');
      });
  }

  ZW_BOARD.extractYoutubeId = extractYoutubeId;

  if (typeof ZW_BOARD.register === 'function') {
    ZW_BOARD.register('video', runVideoBoard);
  }
})(window);
