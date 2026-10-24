// 좌표나라 게시판 글 열기·신고·삭제 공통 도구 (site/board/_board/detail.js)
// 글 상세 화면(첨부 사진 크게 보기·엑셀 받기·신고 접수·내 글/운영진 삭제)을 그리는 파일입니다.

(function (window) {
  'use strict';

  var ZW_BOARD = window.ZW_BOARD = window.ZW_BOARD || {};

  function renderPostDetail(post, boardType, detailSlot, onClose, onDeleted) {
    if (!detailSlot || !post) return;
    var core = ZW_BOARD.core;
    var auth = ZW_BOARD.auth;
    var state = core.state;
    var settings = ZW_BOARD.settings || {};
    var metaInfo = core.getBoardMeta(boardType);

    detailSlot.innerHTML = '';

    var box = document.createElement('article');
    box.className = 'bd-detail';

    var topRow = document.createElement('div');
    topRow.style.display = 'flex';
    topRow.style.justifyContent = 'space-between';
    topRow.style.alignItems = 'flex-start';
    topRow.style.gap = '10px';

    var h2 = document.createElement('h2');
    h2.textContent = post.title || '';

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'bd-btn small';
    closeBtn.textContent = '닫기 ✕';
    closeBtn.addEventListener('click', function () {
      detailSlot.innerHTML = '';
      if (onClose) onClose();
    });

    topRow.appendChild(h2);
    topRow.appendChild(closeBtn);
    box.appendChild(topRow);

    var meta = document.createElement('div');
    meta.className = 'bd-detail-meta';
    var spanAuthor = document.createElement('span');
    var authorPrefix = (metaInfo && metaInfo.authorPrefix) ? metaInfo.authorPrefix : (boardType === 'danga' ? '올린 업체: ' : '글쓴이: ');
    spanAuthor.textContent = authorPrefix + core.maskAuthor(post.author_name);
    var spanDate = document.createElement('span');
    spanDate.textContent = core.formatDate(post.created_at);
    meta.appendChild(spanAuthor);
    meta.appendChild(spanDate);
    box.appendChild(meta);

    // 첨부 사진 크게 보기
    var imgs = Array.isArray(post.image_paths) ? post.image_paths : [];
    if (imgs.length) {
      var imgWrap = document.createElement('div');
      imgWrap.className = 'bd-detail-imgs';
      imgs.forEach(function (p, i) {
        var url = core.getPublicUrl(p);
        if (!url) return;
        var im = document.createElement('img');
        im.src = url;
        im.alt = (post.title || '첨부 사진') + ' (' + (i + 1) + ')';
        im.loading = 'lazy';
        if (boardType === 'cardnews' || (metaInfo && metaInfo.gallery)) {
          var figure = document.createElement('figure');
          figure.style.margin = '0';
          var caption = document.createElement('figcaption');
          caption.textContent = (i + 1) + ' / ' + imgs.length;
          figure.appendChild(im);
          figure.appendChild(caption);
          imgWrap.appendChild(figure);
        } else {
          imgWrap.appendChild(im);
        }
      });
      box.appendChild(imgWrap);
    }

    // 본문
    var bodyEl = document.createElement('div');
    bodyEl.className = 'bd-detail-body';
    bodyEl.textContent = post.body || '';
    box.appendChild(bodyEl);

    // 엑셀 받기 단추 (단가표)
    if (post.file_path) {
      var fUrl = core.getPublicUrl(post.file_path);
      if (fUrl) {
        var dlWrap = document.createElement('div');
        dlWrap.style.marginBottom = '14px';
        var dlLink = document.createElement('a');
        dlLink.className = 'bd-btn primary';
        dlLink.href = fUrl;
        dlLink.setAttribute('download', post.file_name || '단가표.xlsx');
        dlLink.target = '_blank';
        dlLink.rel = 'noopener';
        dlLink.textContent = '📥 엑셀 받기 (' + (post.file_name || '단가표.xlsx') + ')';
        dlWrap.appendChild(dlLink);
        box.appendChild(dlWrap);
      }
    }

    // 아래 조작 줄: 신고 단추 + 내 글 삭제 단추
    var bar = document.createElement('div');
    bar.className = 'bd-detail-bar';

    var actionMsg = document.createElement('div');
    actionMsg.className = 'bd-msg';

    var reportedMap = core.getReportedMap();
    var reportBtn = document.createElement('button');
    reportBtn.type = 'button';
    reportBtn.className = 'bd-btn small';
    if (reportedMap[post.id]) {
      reportBtn.disabled = true;
      reportBtn.textContent = '신고 완료';
    } else {
      reportBtn.textContent = '🚨 신고';
    }

    var reportBox = document.createElement('div');
    reportBox.className = 'bd-report-box';
    reportBox.style.display = 'none';

    var rLabel = document.createElement('label');
    rLabel.style.display = 'block';
    rLabel.style.fontSize = '14px';
    rLabel.style.fontWeight = '700';
    rLabel.style.marginBottom = '6px';
    rLabel.textContent = '신고 이유를 골라 주세요 (한 글에 한 번만 가능 · 10건 누적 시 자동 숨김)';

    var rSelect = document.createElement('select');
    rSelect.className = 'bd-select';
    rSelect.style.marginBottom = '8px';
    var reasons = settings.REPORT_REASONS || [
      '욕설·비방·혐오 표현',
      '스팸·도배·광고 글',
      '전화번호 등 개인정보 노출',
      '남의 글·사진 무단 복사',
      '정치·분란 유도·기타 부적절한 글'
    ];
    reasons.forEach(function (reasonText) {
      var opt = document.createElement('option');
      opt.value = reasonText;
      opt.textContent = reasonText;
      rSelect.appendChild(opt);
    });

    var rSubmit = document.createElement('button');
    rSubmit.type = 'button';
    rSubmit.className = 'bd-btn small primary';
    rSubmit.textContent = '신고 접수';

    rSubmit.addEventListener('click', function () {
      actionMsg.className = 'bd-msg';
      if (!state.currentUser) {
        actionMsg.className = 'bd-msg err';
        actionMsg.textContent = '로그인이 필요합니다. 먼저 로그인한 뒤에 신고해 주세요.';
        return;
      }
      if (core.getReportedMap()[post.id]) {
        actionMsg.className = 'bd-msg err';
        actionMsg.textContent = '이미 신고한 글입니다. 한 글에는 한 번만 신고할 수 있어요.';
        return;
      }
      rSubmit.disabled = true;
      state.sb.from('reports').insert({
        post_id: post.id,
        user_id: state.currentUser.id,
        reason: rSelect.value
      }).then(function (res) {
        if (res && res.error) throw res.error;
        core.markReported(post.id);
        reportBtn.disabled = true;
        reportBtn.textContent = '신고 완료';
        reportBox.style.display = 'none';
        actionMsg.className = 'bd-msg ok';
        actionMsg.textContent = '신고가 접수되었습니다. 신고가 10건 쌓이면 자동으로 숨겨집니다.';
      }).catch(function (err) {
        if (err && (String(err.code) === '23505' || String(err.message || '').toLowerCase().indexOf('duplicate') >= 0)) {
          core.markReported(post.id);
          reportBtn.disabled = true;
          reportBtn.textContent = '신고 완료';
          reportBox.style.display = 'none';
        }
        actionMsg.className = 'bd-msg err';
        actionMsg.textContent = core.friendlyError(err, boardType);
        rSubmit.disabled = false;
      });
    });

    reportBox.appendChild(rLabel);
    reportBox.appendChild(rSelect);
    reportBox.appendChild(rSubmit);

    reportBtn.addEventListener('click', function () {
      if (!state.currentUser) {
        actionMsg.className = 'bd-msg err';
        actionMsg.textContent = '로그인이 필요합니다. 먼저 로그인한 뒤에 신고해 주세요.';
        return;
      }
      reportBox.style.display = reportBox.style.display === 'none' ? 'block' : 'none';
    });

    bar.appendChild(reportBtn);

    // 내 글 삭제 (본인 또는 운영진)
    if (auth.canDeletePost(post)) {
      var deleteLabel = auth.getDeleteLabel(post);
      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'bd-btn small danger';
      delBtn.textContent = deleteLabel;
      var confirming = false;
      delBtn.addEventListener('click', function () {
        if (!confirming) {
          confirming = true;
          delBtn.textContent = deleteLabel + ': 정말 삭제할까요? (한 번 더 누르면 삭제)';
          return;
        }
        delBtn.disabled = true;
        delBtn.textContent = deleteLabel + ' 중…';
        var cfg = core.getConfig();
        var pathsToRemove = [];
        if (Array.isArray(post.image_paths)) pathsToRemove = pathsToRemove.concat(post.image_paths);
        if (post.file_path) pathsToRemove.push(post.file_path);

        state.sb.from('posts').delete().eq('id', post.id).then(function (delRes) {
          if (delRes && delRes.error) throw delRes.error;
          if (pathsToRemove.length) {
            try { state.sb.storage.from(cfg.STORAGE_BUCKET).remove(pathsToRemove); } catch (e) {}
          }
          detailSlot.innerHTML = '';
          if (onDeleted) onDeleted();
        }).catch(function (err) {
          confirming = false;
          delBtn.disabled = false;
          delBtn.textContent = deleteLabel;
          actionMsg.className = 'bd-msg err';
          actionMsg.textContent = core.friendlyError(err, boardType);
        });
      });
      bar.appendChild(delBtn);
    }

    box.appendChild(bar);
    box.appendChild(reportBox);
    box.appendChild(actionMsg);

    detailSlot.appendChild(box);
    try { box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
  }

  ZW_BOARD.detail = {
    renderPostDetail: renderPostDetail
  };
})(window);
