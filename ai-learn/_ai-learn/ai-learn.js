/* AI같이배워요 클라이언트 스크립트 (ai-learn.js) */
/* 외부 CDN 0개, 탭 필터링 및 복사 기능 */

(function () {
  'use strict';

  // 1. 탭 필터링 기능 (메인 페이지)
  function initTabs() {
    var chips = document.querySelectorAll('.al-chip[data-filter]');
    var cards = document.querySelectorAll('.al-post-card[data-type]');
    if (!chips.length || !cards.length) return;

    for (var i = 0; i < chips.length; i++) {
      chips[i].addEventListener('click', function () {
        var filter = this.getAttribute('data-filter');

        // 칩 활성화 상태 전환
        for (var c = 0; c < chips.length; c++) {
          chips[c].classList.remove('on');
        }
        this.classList.add('on');

        // 카드 표시/숨김 전환
        for (var k = 0; k < cards.length; k++) {
          var card = cards[k];
          var cardType = card.getAttribute('data-type');
          if (filter === 'all' || filter === cardType) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        }
      });
    }
  }

  // 2. 복사 버튼 기능
  function initCopyButtons() {
    var copyBtns = document.querySelectorAll('.al-copy-btn');
    for (var i = 0; i < copyBtns.length; i++) {
      copyBtns[i].addEventListener('click', function () {
        var btn = this;
        var targetBox = btn.closest('.al-copy-box');
        if (!targetBox) return;

        var textElem = targetBox.querySelector('.al-copy-text');
        if (!textElem) return;

        var textToCopy = textElem.innerText || textElem.textContent || '';
        if (!navigator.clipboard) {
          // 구형 브라우저 폴백
          var ta = document.createElement('textarea');
          ta.value = textToCopy;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          showCopied(btn);
          return;
        }

        navigator.clipboard.writeText(textToCopy).then(function () {
          showCopied(btn);
        }).catch(function () {
          btn.textContent = '실패';
        });
      });
    }

    function showCopied(button) {
      var orig = button.textContent;
      button.textContent = '복사됨!';
      button.style.background = 'var(--ok, #12805c)';
      setTimeout(function () {
        button.textContent = orig;
        button.style.background = '';
      }, 1500);
    }
  }

  // DOM 로드 시 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initTabs();
      initCopyButtons();
    });
  } else {
    initTabs();
    initCopyButtons();
  }
})();
