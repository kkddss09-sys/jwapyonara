// 좌표나라 영상 게시판 (site/board/_board/boards/video.js)
// 유튜브 주소 추출, 운영진 전용 영상 링크 추가·삭제, 클릭 시 youtube-nocookie 재생을 담당하는 파일입니다.

(function (window) {
  'use strict';

  var ZW_BOARD = window.ZW_BOARD = window.ZW_BOARD || {};

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

  // 영상 게시판 화면 (videos 테이블 sort 순, 클릭 시에만 youtube-nocookie iframe 삽입)
  function runVideoBoard(ctx) {
    var container = ctx.container;
    if (!container) return;
    var core = ctx.core;
    var auth = ctx.auth;
    var state = core.state;

    container.innerHTML = '';

    var authSlot = document.createElement('div');
    container.appendChild(authSlot);
    auth.renderAuthBar(authSlot, function () {
      auth.refreshUserPermissions().then(function () { runVideoBoard(ctx); });
    });

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
        status.textContent = core.friendlyError(err, 'video');
      });
  }

  ZW_BOARD.extractYoutubeId = extractYoutubeId;

  if (typeof ZW_BOARD.register === 'function') {
    ZW_BOARD.register('video', runVideoBoard);
  }
})(window);
