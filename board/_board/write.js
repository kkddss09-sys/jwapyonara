// 좌표나라 게시판 글쓰기·첨부 올리기 공통 도구 (site/board/_board/write.js)
// 게시판별 권한 안내, 글쓰기 폼, 사진·엑셀 스토리지 업로드와 글 등록을 담당하는 파일입니다.

(function (window) {
  'use strict';

  var ZW_BOARD = window.ZW_BOARD = window.ZW_BOARD || {};

  function renderWriteSection(writeSlot, boardType, opts, onPostCreated) {
    if (!writeSlot) return;
    opts = opts || {};
    var core = ZW_BOARD.core;
    var auth = ZW_BOARD.auth;
    var state = core.state;
    var settings = ZW_BOARD.settings || {};
    var meta = core.getBoardMeta(boardType) || {};

    writeSlot.innerHTML = '';
    var sec = document.createElement('section');
    sec.className = 'card bd-form';

    if (boardType === 'cardnews' || meta.writeRole === 'staff') {
      if (!auth.isStaff()) {
        var cardNotice = document.createElement('p');
        cardNotice.textContent = meta.noPermNotice || '운영진이 올리는 카드뉴스입니다';
        sec.appendChild(cardNotice);
        writeSlot.appendChild(sec);
        return;
      }
    } else if (boardType === 'danga' || meta.writeRole === 'vendor_or_staff') {
      if (!auth.canWriteBoard(boardType)) {
        var info = document.createElement('p');
        info.style.margin = '0';
        info.style.fontSize = '15px';
        info.style.color = 'var(--sub)';
        info.textContent = meta.noPermNotice || '단가표 글 쓰기는 등록된 업체만 할 수 있습니다. 업체 등록은 문의 페이지로 안내해 드립니다. ';
        var contactLink = document.createElement('a');
        contactLink.href = opts.contactHref || meta.defaultContactHref || '../legal/contact.html';
        contactLink.style.color = 'var(--red)';
        contactLink.style.fontWeight = '700';
        contactLink.textContent = meta.contactLinkText || '업체 등록은 문의 페이지로 ›';
        info.appendChild(contactLink);
        sec.appendChild(info);
        writeSlot.appendChild(sec);
        return;
      }
    } else {
      if (!state.currentUser) {
        var loginPrompt = document.createElement('p');
        loginPrompt.style.margin = '0';
        loginPrompt.style.fontSize = '15px';
        loginPrompt.style.color = 'var(--sub)';
        loginPrompt.textContent = meta.loginPrompt || ('위에서 로그인하면 누구나 직접 쓴 ' + (boardType === 'review' ? '후기' : '이야기') + '와 사진(최대 5장)을 올릴 수 있습니다.');
        sec.appendChild(loginPrompt);
        writeSlot.appendChild(sec);
        return;
      }
    }

    var h2 = document.createElement('h2');
    h2.textContent = meta.writeTitle || ({
      danga: '단가표 올리기 (등록 업체 전용)',
      story: '새 이야기 쓰기',
      review: '새 후기 쓰기',
      cardnews: '카드뉴스 올리기 (운영진 전용)'
    }[boardType] || '새 글 쓰기');
    sec.appendChild(h2);

    var titleMax = settings.TITLE_MAX_LENGTH || 80;
    var bodyMax = settings.BODY_MAX_LENGTH || 5000;
    var maxImages = meta.maxImages || (boardType === 'cardnews' ? 10 : (settings.MAX_IMAGES || 5));
    var allowExcel = Boolean(meta.allowExcel || boardType === 'danga');

    // 제목
    var fTitle = document.createElement('div');
    fTitle.className = 'field';
    var lTitle = document.createElement('label');
    lTitle.setAttribute('for', 'bdTitle');
    lTitle.textContent = '제목 (1~' + titleMax + '자)';
    var iTitle = document.createElement('input');
    iTitle.id = 'bdTitle';
    iTitle.type = 'text';
    iTitle.maxLength = titleMax;
    iTitle.placeholder = meta.titlePlaceholder || (boardType === 'danga' ? '예: 10월 넷째 주 단가표 안내' : '제목을 입력해 주세요 (80자 이내)');
    fTitle.appendChild(lTitle);
    fTitle.appendChild(iTitle);
    sec.appendChild(fTitle);

    // 내용
    var fBody = document.createElement('div');
    fBody.className = 'field';
    var lBody = document.createElement('label');
    lBody.setAttribute('for', 'bdBody');
    lBody.textContent = '내용 (1~5,000자)';
    var tBody = document.createElement('textarea');
    tBody.id = 'bdBody';
    tBody.maxLength = bodyMax;
    tBody.placeholder = meta.bodyPlaceholder || (boardType === 'danga'
      ? '주요 안내 사항을 적어 주세요. 전화번호·계좌번호 등 개인정보는 적지 마세요.'
      : '직접 겪은 이야기나 궁금한 점을 자유롭게 적어 주세요. 남의 글을 그대로 옮기거나 개인정보를 적지 마세요.');
    if (!meta.bodyPlaceholder && boardType === 'review') {
      tBody.placeholder = '직접 경험한 후기를 적어 주세요. 남의 글을 옮기거나 개인정보를 적지 마세요.';
    }
    if (!meta.bodyPlaceholder && boardType === 'cardnews') {
      tBody.placeholder = '카드뉴스 설명을 적어 주세요. 사진은 선택한 순서대로 표시됩니다.';
    }
    fBody.appendChild(lBody);
    fBody.appendChild(tBody);
    sec.appendChild(fBody);

    // 사진 첨부
    var fImg = document.createElement('div');
    fImg.className = 'field';
    var lImg = document.createElement('label');
    lImg.setAttribute('for', 'bdImages');
    lImg.textContent = '사진 첨부 (선택 · jpg/png/webp · 한 장 5MB 이하 · 최대 ' + maxImages + '장)';
    var boxImg = document.createElement('div');
    boxImg.className = 'bd-file-box';
    var iImg = document.createElement('input');
    iImg.id = 'bdImages';
    iImg.type = 'file';
    iImg.multiple = true;
    iImg.accept = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
    boxImg.appendChild(iImg);
    fImg.appendChild(lImg);
    fImg.appendChild(boxImg);
    sec.appendChild(fImg);

    // 엑셀 첨부 (단가표 전용)
    var iExcel = null;
    if (allowExcel) {
      var fExcel = document.createElement('div');
      fExcel.className = 'field';
      var lExcel = document.createElement('label');
      lExcel.setAttribute('for', 'bdExcel');
      lExcel.textContent = '엑셀 단가표 첨부 (선택 · .xlsx 파일만 · 10MB 이하 · 1개)';
      var boxExcel = document.createElement('div');
      boxExcel.className = 'bd-file-box';
      iExcel = document.createElement('input');
      iExcel.id = 'bdExcel';
      iExcel.type = 'file';
      iExcel.accept = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      var excelHelp = document.createElement('p');
      excelHelp.className = 'help';
      excelHelp.textContent = '※ 엑셀 파일 안에 고객 명단·전화번호 등 개인정보가 들어 있지 않은지 꼭 확인해 주세요.';
      boxExcel.appendChild(iExcel);
      fExcel.appendChild(lExcel);
      fExcel.appendChild(boxExcel);
      fExcel.appendChild(excelHelp);
      sec.appendChild(fExcel);
    }

    var formMsg = document.createElement('div');
    formMsg.className = 'bd-msg';

    var submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'bd-btn primary';
    submitBtn.style.width = '100%';
    submitBtn.textContent = '글 올리기';

    submitBtn.addEventListener('click', function () {
      formMsg.className = 'bd-msg';
      formMsg.textContent = '';

      if (!state.currentUser) {
        formMsg.className = 'bd-msg err';
        formMsg.textContent = '로그인이 필요합니다. 먼저 로그인한 뒤에 이용해 주세요.';
        return;
      }
      var titleVal = iTitle.value.trim();
      var bodyVal = tBody.value.trim();
      if (!titleVal || titleVal.length > titleMax) {
        formMsg.className = 'bd-msg err';
        formMsg.textContent = '제목을 1자 이상 ' + titleMax + '자 이하로 입력해 주세요.';
        iTitle.focus();
        return;
      }
      if (!bodyVal || bodyVal.length > bodyMax) {
        formMsg.className = 'bd-msg err';
        formMsg.textContent = '내용을 1자 이상 5,000자 이하로 입력해 주세요.';
        tBody.focus();
        return;
      }

      var imgFiles = iImg.files ? Array.prototype.slice.call(iImg.files) : [];
      var excelFile = (iExcel && iExcel.files && iExcel.files[0]) ? iExcel.files[0] : null;
      var checkErr = core.validateFilesClientSide(imgFiles, excelFile, boardType);
      if (checkErr) {
        formMsg.className = 'bd-msg err';
        formMsg.textContent = checkErr;
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = '올리는 중…';

      var cfg = core.getConfig();
      var bucket = cfg.STORAGE_BUCKET;
      var postId = core.makeUuid();
      var uid = state.currentUser.id;
      var uploadedPaths = [];
      var imagePaths = [];
      var filePath = null;
      var fileName = null;
      var uploadStage = 'storage-upload';

      // 순서대로 사진 올리기 -> 엑셀 올리기 -> posts 행 추가
      var chain = Promise.resolve();
      imgFiles.forEach(function (file, idx) {
        chain = chain.then(function () {
          var ext = core.getFileExt(file.name);
          if (ext === 'jpeg') ext = 'jpg';
          var storagePath = uid + '/' + postId + '/img-' + (idx + 1) + '.' + ext;
          return state.sb.storage.from(bucket).upload(storagePath, file, { upsert: false }).then(function (upRes) {
            if (upRes && upRes.error) throw upRes.error;
            uploadedPaths.push(storagePath);
            imagePaths.push(storagePath);
          });
        });
      });

      if (excelFile) {
        chain = chain.then(function () {
          var storagePath = uid + '/' + postId + '/file.xlsx';
          return state.sb.storage.from(bucket).upload(storagePath, excelFile, { upsert: false }).then(function (upRes) {
            if (upRes && upRes.error) throw upRes.error;
            uploadedPaths.push(storagePath);
            filePath = storagePath;
            fileName = String(excelFile.name || '단가표.xlsx').slice(0, 120);
          });
        });
      }

      chain.then(function () {
        var row = {
          id: postId,
          board: boardType,
          user_id: uid,
          author_name: core.deriveAuthorName(state.currentUser, boardType),
          title: titleVal,
          body: bodyVal,
          image_paths: imagePaths,
          file_path: filePath,
          file_name: fileName
        };
        uploadStage = 'posts-insert';
        return state.sb.from('posts').insert(row);
      }).then(function (insRes) {
        if (insRes && insRes.error) throw insRes.error;
        iTitle.value = '';
        tBody.value = '';
        iImg.value = '';
        if (iExcel) iExcel.value = '';
        formMsg.className = 'bd-msg ok';
        formMsg.textContent = '글이 올라갔습니다.';
        submitBtn.disabled = false;
        submitBtn.textContent = '글 올리기';
        if (onPostCreated) onPostCreated();
      }).catch(function (err) {
        // 글 저장이 거절된 경우 먼저 올린 파일도 정리 시도
        if (uploadedPaths.length) {
          try { state.sb.storage.from(bucket).remove(uploadedPaths); } catch (e) {}
        }
        formMsg.className = 'bd-msg err';
        var errorLines = core.friendlyError(err, boardType, uploadStage).split('\n');
        formMsg.textContent = errorLines[0];
        if (errorLines.length > 1) {
          formMsg.appendChild(document.createElement('br'));
          var technicalInfo = document.createElement('small');
          technicalInfo.textContent = errorLines.slice(1).join(' ');
          formMsg.appendChild(technicalInfo);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = '글 올리기';
      });
    });

    sec.appendChild(formMsg);
    sec.appendChild(submitBtn);
    writeSlot.appendChild(sec);
  }

  ZW_BOARD.write = {
    renderWriteSection: renderWriteSection
  };
})(window);
