/* 좌표나라 연재관 바닐라 리더 스크립트 - reader.js (외부 종속성 0개) */
(function() {
  'use strict';

  var FONT_SIZES = ['15px', '17px', '19px', '22px'];
  var LINE_HEIGHTS = ['1.6', '1.85', '2.1'];
  var THEMES = ['default', 'sepia', 'dark'];

  function initReader() {
    try {
      var root = document.documentElement;
      var body = document.body;

      // 1. 저장된 설정 복원
      var savedSize = localStorage.getItem('nv_font_size') || '17px';
      var savedHeight = localStorage.getItem('nv_line_height') || '1.85';
      var savedTheme = localStorage.getItem('nv_reader_theme') || 'default';

      applyFontSize(savedSize);
      applyLineHeight(savedHeight);
      applyTheme(savedTheme);

      // 2. 글자 크기 버튼 바인딩
      var btnFontSmall = document.getElementById('nvBtnFontSmall');
      var btnFontBig = document.getElementById('nvBtnFontBig');
      if (btnFontSmall) {
        btnFontSmall.addEventListener('click', function() {
          cycleFontSize(-1);
        });
      }
      if (btnFontBig) {
        btnFontBig.addEventListener('click', function() {
          cycleFontSize(1);
        });
      }

      // 3. 테마 토글 버튼 바인딩
      var themeBtns = document.querySelectorAll('[data-theme-set]');
      for (var i = 0; i < themeBtns.length; i++) {
        (function(btn) {
          btn.addEventListener('click', function() {
            var targetTheme = btn.getAttribute('data-theme-set');
            applyTheme(targetTheme);
            try {
              localStorage.setItem('nv_reader_theme', targetTheme);
            } catch (e) {}
          });
        })(themeBtns[i]);
      }

      // 4. 최근 읽은 회차 및 스크롤 위치 기록
      var readerWrap = document.querySelector('[data-novel-slug]');
      if (readerWrap) {
        var slug = readerWrap.getAttribute('data-novel-slug');
        var epNum = readerWrap.getAttribute('data-ep-num');
        var epUrl = window.location.pathname;

        if (slug && epNum) {
          try {
            localStorage.setItem('nv_last_ep_' + slug, JSON.stringify({
              num: epNum,
              url: epUrl,
              time: Date.now()
            }));
          } catch (e) {}
        }
      }

      // 5. 키보드 화 이동 (좌=이전, 우=다음)
      window.addEventListener('keydown', function(ev) {
        if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) {
          return;
        }
        if (ev.key === 'ArrowLeft') {
          var prevBtn = document.getElementById('nvPrevEpisode');
          if (prevBtn && prevBtn.getAttribute('href') && !prevBtn.classList.contains('disabled')) {
            window.location.href = prevBtn.getAttribute('href');
          }
        } else if (ev.key === 'ArrowRight') {
          var nextBtn = document.getElementById('nvNextEpisode');
          if (nextBtn && nextBtn.getAttribute('href') && !nextBtn.classList.contains('disabled')) {
            window.location.href = nextBtn.getAttribute('href');
          }
        }
      });

    } catch (err) {
      // private browsing 모드 등 localStorage 차단 시 조용히 기본값 유지
    }
  }

  function applyFontSize(size) {
    try {
      document.documentElement.style.setProperty('--nv-font-size', size);
      var display = document.getElementById('nvFontSizeDisplay');
      if (display) {
        display.textContent = size;
      }
    } catch (e) {}
  }

  function cycleFontSize(delta) {
    try {
      var current = localStorage.getItem('nv_font_size') || '17px';
      var idx = FONT_SIZES.indexOf(current);
      if (idx === -1) idx = 1;
      var nextIdx = idx + delta;
      if (nextIdx >= 0 && nextIdx < FONT_SIZES.length) {
        var newSize = FONT_SIZES[nextIdx];
        applyFontSize(newSize);
        localStorage.setItem('nv_font_size', newSize);
      }
    } catch (e) {}
  }

  function applyLineHeight(height) {
    try {
      document.documentElement.style.setProperty('--nv-line-height', height);
    } catch (e) {}
  }

  function applyTheme(theme) {
    try {
      if (theme === 'default') {
        document.body.removeAttribute('data-reader-theme');
      } else {
        document.body.setAttribute('data-reader-theme', theme);
      }
      var themeBtns = document.querySelectorAll('[data-theme-set]');
      for (var i = 0; i < themeBtns.length; i++) {
        if (themeBtns[i].getAttribute('data-theme-set') === theme) {
          themeBtns[i].classList.add('active');
        } else {
          themeBtns[i].classList.remove('active');
        }
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReader);
  } else {
    initReader();
  }
})();
