// 좌표나라 카드뉴스 게시판 (site/board/_board/boards/cardnews.js)
// JSON 파일(_data/cardnews.json)에서 카드뉴스를 읽어 3열 격자 목록과 쇼츠식 전체화면 보기를 제공합니다.

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

  function getScrollBehavior() {
    var reduce = Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    return reduce ? 'auto' : 'smooth';
  }

  function resolvePhotoUrl(rawPath) {
    var s = String(rawPath || '').trim();
    if (!s) return '';
    if (/^(?:https?:\/\/|\/|\.\.\/)/.test(s)) return s;
    // 사진 주소 앞부분은 settings.js의 MEDIA_BASE 한 곳(사진을 다른 서버로 옮길 때 이 값만 바꾼다)
    var mb = (ZW_BOARD.settings && ZW_BOARD.settings.MEDIA_BASE) || '../';
    return mb + s.replace(/^\.?\//, '');
  }

  function buildDataUrl(settings) {
    var base = (settings && settings.CARD_DATA_URL) || '../_data/cardnews.json';
    var ver = ZW_BOARD.BOARD_VERSION || '1';
    return base + (base.indexOf('?') >= 0 ? '&' : '?') + 'v=' + encodeURIComponent(ver);
  }

  function normalizeItem(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var id = String(raw.id || '').trim();
    var photos = Array.isArray(raw['사진']) ? raw['사진'].map(resolvePhotoUrl).filter(Boolean) : [];
    if (!id || !photos.length) return null;
    return {
      id: id,
      // 분류 탭은 한 줄: '일반' 글은 갈래(재미·감동·기쁨·슬픔·공감)가 곧 분류, 나머지는 구분(휴대폰·부동산)
      cat: (String(raw['구분'] || '').trim() === '일반' && String(raw['갈래'] || '').trim()) ? String(raw['갈래']).trim() : String(raw['구분'] || '').trim(),
      sub: '',
      date: String(raw['날짜'] || '').trim(),
      title: String(raw['제목'] || '(제목 없음)').trim(),
      body: String(raw['본문'] || '').trim(),
      photos: photos,
      thumb: resolvePhotoUrl(raw['썸네일']) || photos[0]
    };
  }


  // 네이버 블로그 글 주소(공식 RSS로 만든 목록 파일). 없거나 실패하면 단추만 없다. https://blog.naver.com/ 주소만 받는다.
  var blogMap = {};
  function loadBlogMap(settings) {
    var url = (settings && settings.BLOG_DATA_URL) || '../_data/blog.json';
    var ver = ZW_BOARD.BOARD_VERSION || '1';
    return fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + 'v=' + encodeURIComponent(ver))
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (j) {
        var m = (j && j['카드뉴스']) || {};
        blogMap = {};
        Object.keys(m).forEach(function (k) { if (typeof m[k] === 'string' && m[k].indexOf('https://blog.naver.com/') === 0) blogMap[k] = m[k]; });
      })
      .catch(function () { blogMap = {}; });
  }

  function runCardnewsBoard(ctx) {
    var container = ctx && ctx.container;
    if (!container) return;
    if (typeof activeCleanup === 'function') { activeCleanup(); activeCleanup = null; }

    var myGen = ++boardGen;
    var settings = (ctx && ctx.settings) || ZW_BOARD.settings || {};
    var categories = Array.isArray(settings.CARD_CATEGORIES) && settings.CARD_CATEGORIES.length
      ? settings.CARD_CATEGORIES
      : [
          { key: '휴대폰', subs: [] },
          { key: '일반', subs: ['웃음', '감동', '기쁨', '슬픔', '공감'] },
          { key: '부동산', subs: [] }
        ];
    var gridCols = Number(settings.CARD_GRID_COLUMNS) || 3;
    var pageSize = Number(settings.CARD_PAGE_SIZE) || 12;

    container.textContent = '';
    container.style.setProperty('--bd-card-cols', String(gridCols));

    var wrap = el('section', undefined, 'bd-cn-wrap');
    var tabsBar = el('div', undefined, 'bd-cn-tabs');
    tabsBar.setAttribute('role', 'tablist');
    tabsBar.setAttribute('aria-label', '카드뉴스 구분');

    var subsBar = el('div', undefined, 'bd-cn-subs');
    subsBar.setAttribute('role', 'group');
    subsBar.setAttribute('aria-label', '카드뉴스 갈래');
    subsBar.style.display = 'none';

    var statusBox = el('div', '카드뉴스를 불러오는 중입니다…', 'bd-cn-empty');
    statusBox.setAttribute('role', 'status');
    var listArea = el('div');
    var moreWrap = el('div', undefined, 'bd-cn-more-wrap');

    wrap.appendChild(tabsBar);
    wrap.appendChild(subsBar);
    wrap.appendChild(statusBox);
    wrap.appendChild(listArea);
    wrap.appendChild(moreWrap);
    container.appendChild(wrap);

    var allItems = [];
    var filteredItems = [];
    var activeCat = '';
    var activeSub = '';
    var visibleCount = pageSize;
    var subClickedEmpty = false;
    var cardBtnMap = {};
    var lastTriggerEl = null;

    var overlayEl = null;
    var vtrackEl = null;
    var pagePillEl = null;
    var slideStateList = [];
    var activeArticleIdx = 0;
    var slideObserver = null;
    var activeObserver = null;
    var pushedOverlayHistory = false;
    var toastTimer = null;

    function getCategoryObj(catKey) {
      for (var i = 0; i < categories.length; i++) {
        if (categories[i].key === catKey) return categories[i];
      }
      return null;
    }

    function readUrlState() {
      var params = new URLSearchParams(window.location.search || '');
      var cat = (params.get('cat') || '').trim();
      var sub = (params.get('sub') || '').trim();
      var card = (params.get('card') || '').trim();
      var catObj = getCategoryObj(cat);
      if (!catObj) { cat = ''; sub = ''; }
      else if (!Array.isArray(catObj.subs) || catObj.subs.indexOf(sub) < 0) { sub = ''; }
      return { cat: cat, sub: sub, card: card };
    }

    function writeUrlState(cardId, usePush) {
      try {
        var url = new URL(window.location.href);
        if (activeCat) url.searchParams.set('cat', activeCat); else url.searchParams.delete('cat');
        if (activeCat && activeSub) url.searchParams.set('sub', activeSub); else url.searchParams.delete('sub');
        if (cardId) url.searchParams.set('card', cardId); else url.searchParams.delete('card');
        var nextHref = url.pathname + (url.search || '') + (url.hash || '');
        if (usePush) window.history.pushState({ zwCard: cardId || '' }, '', nextHref);
        else window.history.replaceState({ zwCard: cardId || '' }, '', nextHref);
      } catch (e) {}
    }

    function countItems(catKey, subKey) {
      var n = 0;
      for (var i = 0; i < allItems.length; i++) {
        if (catKey && allItems[i].cat !== catKey) continue;
        if (subKey && allItems[i].sub !== subKey) continue;
        n++;
      }
      return n;
    }

    function renderTabsAndSubs() {
      tabsBar.textContent = '';
      [''].concat(categories.map(function (c) { return c.key; })).forEach(function (key) {
        var label = key || '전체';
        var cnt = countItems(key, '');
        var btn = el('button', label + ' ' + cnt, 'bd-cn-tab' + (activeCat === key ? ' on' : ''));
        btn.type = 'button';
        btn.setAttribute('aria-pressed', String(activeCat === key));
        btn.setAttribute('aria-label', label + ' ' + cnt + '개 보기');
        btn.addEventListener('click', function () {
          if (activeCat === key && !activeSub) return;
          activeCat = key;
          activeSub = '';
          subClickedEmpty = false;
          visibleCount = pageSize;
          writeUrlState('', false);
          refreshList();
        });
        tabsBar.appendChild(btn);
      });

      var catObj = getCategoryObj(activeCat);
      if (catObj && Array.isArray(catObj.subs) && catObj.subs.length) {
        subsBar.style.display = 'flex';
        subsBar.textContent = '';
        [''].concat(catObj.subs).forEach(function (sKey) {
          var sLabel = sKey || '전체';
          var sCnt = countItems(activeCat, sKey);
          var cls = 'bd-cn-chip' + (activeSub === sKey ? ' on' : '') + (sKey && sCnt === 0 ? ' is-empty' : '');
          var chip = el('button', sLabel + ' ' + sCnt, cls);
          chip.type = 'button';
          chip.setAttribute('aria-pressed', String(activeSub === sKey));
          chip.setAttribute('aria-label', sLabel + ' 갈래 ' + sCnt + '개 보기');
          chip.addEventListener('click', function () {
            activeSub = sKey;
            subClickedEmpty = Boolean(sKey && sCnt === 0);
            visibleCount = pageSize;
            writeUrlState('', false);
            refreshList();
          });
          subsBar.appendChild(chip);
        });
      } else {
        subsBar.style.display = 'none';
        subsBar.textContent = '';
      }
    }

    function renderGrid() {
      listArea.textContent = '';
      moreWrap.textContent = '';
      cardBtnMap = {};

      if (!filteredItems.length) {
        statusBox.style.display = 'block';
        statusBox.textContent = (activeSub || subClickedEmpty) ? '아직 글이 없어요' : '아직 올라온 카드뉴스가 없습니다.';
        return;
      }

      statusBox.style.display = 'none';
      var grid = el('div', undefined, 'bd-cn-grid');
      filteredItems.slice(0, visibleCount).forEach(function (item) {
        var cardBtn = el('button', undefined, 'bd-cn-card');
        cardBtn.type = 'button';
        cardBtn.setAttribute('aria-label', item.title + ' 카드뉴스 열기');

        var thumbWrap = el('div', undefined, 'bd-cn-thumb-wrap');
        var img = document.createElement('img');
        img.className = 'bd-cn-thumb';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.alt = item.title;
        img.src = item.thumb || item.photos[0];
        thumbWrap.appendChild(img);

        var info = el('div', undefined, 'bd-cn-info');
        var metaEl = el('div', undefined, 'bd-cn-meta');
        metaEl.appendChild(el('span', item.cat + (item.sub ? ' · ' + item.sub : '')));
        metaEl.appendChild(el('span', item.date));
        info.appendChild(el('p', item.title, 'bd-cn-title'));
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
        moreBtn.setAttribute('aria-label', '카드뉴스 더 보기');
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
        if (activeCat && activeSub && item.sub !== activeSub) return false;
        return true;
      });
      renderTabsAndSubs();
      renderGrid();
    }

    function showToast(msg) {
      var prev = document.getElementById('zw-cn-toast');
      if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
      if (toastTimer) clearTimeout(toastTimer);
      var t = el('div', msg, 'bd-cn-toast');
      t.id = 'zw-cn-toast';
      t.setAttribute('role', 'status');
      document.body.appendChild(t);
      toastTimer = setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2000);
    }

    function shareCurrentCard() {
      var st = slideStateList[activeArticleIdx];
      if (!st) return;
      var shareUrl = window.location.href;
      if (navigator.share && typeof navigator.share === 'function') {
        navigator.share({ title: st.item.title, url: shareUrl }).catch(function () {});
        return;
      }
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(shareUrl).then(function () { showToast('주소를 복사했습니다'); }).catch(function () { showToast('주소 복사에 실패했습니다'); });
        return;
      }
      try {
        var ta = document.createElement('textarea');
        ta.value = shareUrl;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('주소를 복사했습니다');
      } catch (e) { showToast('주소 복사에 실패했습니다'); }
    }

    function hydrateSlideImages(articleIdx) {
      for (var i = articleIdx - 1; i <= articleIdx + 1; i++) {
        var st = slideStateList[i];
        if (!st || st.loaded) continue;
        st.loaded = true;
        var imgs = st.slideEl.querySelectorAll('img[data-src]');
        for (var j = 0; j < imgs.length; j++) {
          var src = imgs[j].getAttribute('data-src');
          if (src) { imgs[j].src = src; imgs[j].removeAttribute('data-src'); }
        }
      }
    }

    function updateSlidePhotoUi(st, photoIdx) {
      var total = st.item.photos.length;
      photoIdx = Math.max(0, Math.min(total - 1, photoIdx));
      st.photoIdx = photoIdx;
      var label = (photoIdx + 1) + ' / ' + total;
      st.inlineCountEl.textContent = label;
      if (st.index === activeArticleIdx && pagePillEl) pagePillEl.textContent = label;
      st.prevBtn.disabled = photoIdx <= 0;
      st.nextBtn.disabled = photoIdx >= total - 1;
      for (var i = 0; i < st.dots.length; i++) {
        st.dots[i].className = 'bd-cn-dot' + (i === photoIdx ? ' on' : '');
      }
    }

    function scrollPhotoTo(st, targetIdx) {
      if (targetIdx < 0 || targetIdx >= st.item.photos.length) return;
      var w = st.htrack.clientWidth || window.innerWidth;
      st.htrack.scrollTo({ left: w * targetIdx, behavior: getScrollBehavior() });
      updateSlidePhotoUi(st, targetIdx);
    }

    function setActiveArticle(idx, syncUrl) {
      if (idx < 0 || idx >= slideStateList.length) return;
      activeArticleIdx = idx;
      hydrateSlideImages(idx);
      var st = slideStateList[idx];
      updateSlidePhotoUi(st, st.photoIdx);
      if (syncUrl) writeUrlState(st.item.id, false);
    }

    function scrollArticleTo(targetIdx) {
      if (!vtrackEl || targetIdx < 0 || targetIdx >= slideStateList.length) return;
      var h = vtrackEl.clientHeight || window.innerHeight;
      vtrackEl.scrollTo({ top: h * targetIdx, behavior: getScrollBehavior() });
      setActiveArticle(targetIdx, true);
    }

    function buildSlide(item, idx, totalArticles) {
      var vslide = el('article', undefined, 'bd-cn-vslide');
      vslide.setAttribute('data-index', String(idx));
      vslide.setAttribute('aria-label', item.title);

      var htrack = el('div', undefined, 'bd-cn-htrack');
      item.photos.forEach(function (pUrl, pIdx) {
        var hslide = el('div', undefined, 'bd-cn-hslide');
        var img = document.createElement('img');
        img.decoding = 'async';
        img.alt = item.title + ' (' + (pIdx + 1) + '/' + item.photos.length + ')';
        img.setAttribute('data-src', pUrl);
        hslide.appendChild(img);
        htrack.appendChild(hslide);
      });

      var prevBtn = el('button', '‹', 'bd-cn-arrow prev');
      prevBtn.type = 'button';
      prevBtn.setAttribute('aria-label', '이전 사진');
      var nextBtn = el('button', '›', 'bd-cn-arrow next');
      nextBtn.type = 'button';
      nextBtn.setAttribute('aria-label', '다음 사진');

      var bottom = el('div', undefined, 'bd-cn-bottom');
      var dotsWrap = el('div', undefined, 'bd-cn-dots');
      var dots = item.photos.map(function (_, pIdx) {
        var dot = el('button', undefined, 'bd-cn-dot' + (pIdx === 0 ? ' on' : ''));
        dot.type = 'button';
        dot.setAttribute('aria-label', (pIdx + 1) + '번째 사진으로 이동');
        dotsWrap.appendChild(dot);
        return dot;
      });

      var metaRow = el('div', undefined, 'bd-cn-overlay-meta');
      metaRow.appendChild(el('span', item.cat + (item.sub ? ' · ' + item.sub : ''), 'bd-cn-overlay-badge'));
      metaRow.appendChild(el('span', item.date));
      var inlineCountEl = el('span', '1 / ' + item.photos.length);
      metaRow.appendChild(inlineCountEl);
      if (blogMap[item.id]) {
        var blogA = el('a', '네이버 블로그에서 보기 ↗', 'bd-cn-blog-link');
        blogA.href = blogMap[item.id]; blogA.target = '_blank'; blogA.rel = 'noopener';
        metaRow.appendChild(blogA);
      }

      bottom.appendChild(dotsWrap);
      bottom.appendChild(metaRow);
      bottom.appendChild(el('h2', item.title, 'bd-cn-overlay-title'));

      if (item.body) {
        var bodyRow = el('div', undefined, 'bd-cn-body-row');
        var bodyEl = el('p', item.body, 'bd-cn-body collapsed');
        var toggleBtn = el('button', '더 보기', 'bd-cn-body-toggle');
        toggleBtn.type = 'button';
        toggleBtn.setAttribute('aria-label', '본문 더 보기');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.addEventListener('click', function () {
          var isCollapsed = bodyEl.classList.contains('collapsed');
          bodyEl.className = 'bd-cn-body ' + (isCollapsed ? 'expanded' : 'collapsed');
          toggleBtn.textContent = isCollapsed ? '접기' : '더 보기';
          toggleBtn.setAttribute('aria-label', isCollapsed ? '본문 접기' : '본문 더 보기');
          toggleBtn.setAttribute('aria-expanded', String(isCollapsed));
        });
        bodyRow.appendChild(bodyEl);
        bodyRow.appendChild(toggleBtn);
        bottom.appendChild(bodyRow);
      }

      if (idx === totalArticles - 1) {
        bottom.appendChild(el('div', '마지막 글입니다', 'bd-cn-end-note'));
      }

      vslide.appendChild(htrack);
      vslide.appendChild(prevBtn);
      vslide.appendChild(nextBtn);
      vslide.appendChild(bottom);

      var st = { index: idx, item: item, slideEl: vslide, htrack: htrack, prevBtn: prevBtn, nextBtn: nextBtn, dots: dots, inlineCountEl: inlineCountEl, photoIdx: 0, loaded: false };
      prevBtn.addEventListener('click', function () { scrollPhotoTo(st, st.photoIdx - 1); });
      nextBtn.addEventListener('click', function () { scrollPhotoTo(st, st.photoIdx + 1); });
      dots.forEach(function (dot, pIdx) { dot.addEventListener('click', function () { scrollPhotoTo(st, pIdx); }); });
      htrack.addEventListener('scroll', function () {
        var nextIdx = Math.round(htrack.scrollLeft / (htrack.clientWidth || 1));
        if (nextIdx !== st.photoIdx) updateSlidePhotoUi(st, nextIdx);
      }, { passive: true });
      updateSlidePhotoUi(st, 0);
      return st;
    }

    function closeViewer(fromPopState) {
      if (!overlayEl) return;
      if (slideObserver) { slideObserver.disconnect(); slideObserver = null; }
      if (activeObserver) { activeObserver.disconnect(); activeObserver = null; }
      if (overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
      overlayEl = null; vtrackEl = null; pagePillEl = null; slideStateList = [];
      document.body.classList.remove('bd-cn-lock');

      if (!fromPopState) {
        if (pushedOverlayHistory) {
          pushedOverlayHistory = false;
          try { window.history.back(); } catch (e) { writeUrlState('', false); }
        } else { writeUrlState('', false); }
      } else { pushedOverlayHistory = false; }

      var targetFocus = lastTriggerEl || (filteredItems[activeArticleIdx] && cardBtnMap[filteredItems[activeArticleIdx].id]);
      if (targetFocus && typeof targetFocus.focus === 'function') {
        try { targetFocus.focus(); } catch (e) {}
      }
    }

    function openViewer(cardId, usePush) {
      var startIdx = -1;
      for (var i = 0; i < filteredItems.length; i++) {
        if (filteredItems[i].id === cardId) { startIdx = i; break; }
      }
      if (startIdx < 0) {
        for (var j = 0; j < allItems.length; j++) {
          if (allItems[j].id === cardId) { activeCat = ''; activeSub = ''; refreshList(); break; }
        }
        for (var k = 0; k < filteredItems.length; k++) {
          if (filteredItems[k].id === cardId) { startIdx = k; break; }
        }
      }
      if (startIdx < 0) return;
      if (overlayEl) closeViewer(true);

      overlayEl = el('div', undefined, 'bd-cn-overlay');
      overlayEl.setAttribute('role', 'dialog');
      overlayEl.setAttribute('aria-modal', 'true');
      overlayEl.setAttribute('aria-label', '카드뉴스 보기');

      var topbar = el('div', undefined, 'bd-cn-topbar');
      pagePillEl = el('div', '1 / 1', 'bd-cn-page-pill');
      var topActions = el('div', undefined, 'bd-cn-top-actions');

      var shareBtn = el('button', '공유', 'bd-cn-icon-btn');
      shareBtn.type = 'button';
      shareBtn.setAttribute('aria-label', '카드뉴스 주소 공유');
      shareBtn.addEventListener('click', shareCurrentCard);

      var closeBtn = el('button', '✕ 닫기', 'bd-cn-icon-btn');
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', '카드뉴스 보기 닫기');
      closeBtn.addEventListener('click', function () { closeViewer(false); });

      topActions.appendChild(shareBtn);
      topActions.appendChild(closeBtn);
      topbar.appendChild(pagePillEl);
      topbar.appendChild(topActions);

      vtrackEl = el('div', undefined, 'bd-cn-vtrack');
      slideStateList = filteredItems.map(function (item, idx) {
        var st = buildSlide(item, idx, filteredItems.length);
        vtrackEl.appendChild(st.slideEl);
        return st;
      });

      overlayEl.appendChild(topbar);
      overlayEl.appendChild(vtrackEl);
      document.body.appendChild(overlayEl);
      document.body.classList.add('bd-cn-lock');

      pushedOverlayHistory = Boolean(usePush);
      writeUrlState(cardId, Boolean(usePush));
      setActiveArticle(startIdx, false);
      vtrackEl.scrollTop = (vtrackEl.clientHeight || window.innerHeight) * startIdx;

      if ('IntersectionObserver' in window) {
        slideObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            var idx = Number(entry.target.getAttribute('data-index'));
            if (isNaN(idx)) return;
            if (entry.isIntersecting) hydrateSlideImages(idx);
          });
        }, { root: vtrackEl, rootMargin: '100% 0px 100% 0px', threshold: [0.01] });
        slideStateList.forEach(function (st) { slideObserver.observe(st.slideEl); });
        // 지금 보는 글 판단은 여백 없는 관찰기로 따로(여백을 넓히면 옆 글도 "보이는 글"로 잡힌다)
        activeObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            var idx = Number(entry.target.getAttribute('data-index'));
            if (isNaN(idx)) return;
            if (entry.intersectionRatio >= 0.55 && idx !== activeArticleIdx) setActiveArticle(idx, true);
          });
        }, { root: vtrackEl, threshold: [0.55] });
        slideStateList.forEach(function (st) { activeObserver.observe(st.slideEl); });
      } else {
        vtrackEl.addEventListener('scroll', function () {
          var idx = Math.round(vtrackEl.scrollTop / (vtrackEl.clientHeight || 1));
          if (idx !== activeArticleIdx) setActiveArticle(idx, true);
        }, { passive: true });
      }

      try { closeBtn.focus(); } catch (e) {}
    }

    function onKeyDown(e) {
      if (!overlayEl) return;
      var st = slideStateList[activeArticleIdx];
      if (!st) return;
      if (e.key === 'Escape') { e.preventDefault(); closeViewer(false); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); scrollPhotoTo(st, st.photoIdx - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); scrollPhotoTo(st, st.photoIdx + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); scrollArticleTo(activeArticleIdx - 1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); scrollArticleTo(activeArticleIdx + 1); }
    }

    function onPopState() {
      var urlState = readUrlState();
      if (urlState.cat !== activeCat || urlState.sub !== activeSub) {
        activeCat = urlState.cat; activeSub = urlState.sub; visibleCount = pageSize;
        refreshList();
      }
      if (urlState.card) openViewer(urlState.card, false);
      else if (overlayEl) closeViewer(true);
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('popstate', onPopState);
    activeCleanup = function () {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('popstate', onPopState);
      if (overlayEl) closeViewer(true);
    };

    loadBlogMap(settings)
      .then(function () { return fetch(buildDataUrl(settings)); })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (myGen !== boardGen) return;
        var rawList = (data && Array.isArray(data['항목'])) ? data['항목'] : null;
        if (!rawList) throw new Error('Invalid schema');
        allItems = rawList.map(normalizeItem).filter(Boolean);
        var initUrl = readUrlState();
        activeCat = initUrl.cat; activeSub = initUrl.sub;
        refreshList();
        if (initUrl.card) openViewer(initUrl.card, false);
      })
      .catch(function () {
        if (myGen !== boardGen) return;
        tabsBar.textContent = ''; subsBar.style.display = 'none'; listArea.textContent = ''; moreWrap.textContent = '';
        statusBox.style.display = 'block';
        statusBox.textContent = '카드뉴스를 불러오지 못했습니다. 새로고침해 주세요.';
      });
  }

  if (typeof ZW_BOARD.register === 'function') {
    ZW_BOARD.register('cardnews', runCardnewsBoard);
  }
})(window);
