// 좌표나라 게시판 모양 모음 (site/board/_board/styles.js)
// 게시판 CSS를 섹션별로 모아 두고, 자주 바꾸는 크기·색·칸 수는 CSS 변수(--bd-*)로 뺀 파일입니다.

(function (window) {
  'use strict';

  var ZW_BOARD = window.ZW_BOARD = window.ZW_BOARD || {};

  function buildCssText() {
    var ui = (ZW_BOARD.settings && ZW_BOARD.settings.UI) || {};
    var thumbSize = ui.thumbSize || '64px';
    var galleryMin = ui.galleryMinCardWidth || '260px';
    var galleryCols = ui.galleryColumns || 'repeat(auto-fit,minmax(min(100%,var(--bd-gallery-min,260px)),1fr))';
    var galleryMaxH = ui.galleryThumbMaxHeight || '420px';
    var videoRatio = ui.videoAspectRatio || '16/9';
    var authBtnMin = ui.authBtnMinWidth || '140px';

    var variablesSection = [
      ':root {',
      '  --bd-accent: var(--red);',
      '  --bd-thumb-size: ' + thumbSize + ';',
      '  --bd-gallery-min: ' + galleryMin + ';',
      '  --bd-gallery-cols: ' + galleryCols + ';',
      '  --bd-gallery-max-h: ' + galleryMaxH + ';',
      '  --bd-video-ratio: ' + videoRatio + ';',
      '  --bd-auth-btn-min: ' + authBtnMin + ';',
      '}'
    ];

    var allBoardSection = [
      '.bd-all-controls { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-bottom:14px; }',
      '.bd-all-controls label { display:flex; align-items:center; gap:6px; }',
      '.bd-all-controls .bd-select { width:auto; }',
      '.bd-all-row { display:grid; grid-template-columns:80px minmax(0,1fr) 110px 100px; gap:12px; padding:12px 0; border-bottom:1px solid var(--line); align-items:center; }',
      '.bd-all-row > div { min-width:0; overflow-wrap:anywhere; }',
      '.bd-all-header { font-weight:700; color:var(--sub); }',
      '.bd-all-open { display:block; width:100%; border:0; background:none; color:var(--ink); font:inherit; font-weight:700; padding:4px 0; text-align:left; cursor:pointer; overflow-wrap:anywhere; }',
      '.bd-all-open small { color:var(--sub); font-weight:400; }',
      '.bd-all-detail:empty { display:none; }',
      '.bd-all-detail { margin:12px 0; }',
      '@media(max-width:600px) { .bd-all-header { display:none; } .bd-all-row { grid-template-columns:minmax(0,1fr) auto; gap:6px 12px; } .bd-all-board,.bd-all-title { grid-column:1 / -1; } .bd-all-board,.bd-all-author,.bd-all-date { font-size:13px; color:var(--sub); } }'
    ];

    var navAndNoticeSection = [
      '.bd-subnav { display:flex; gap:8px; overflow-x:auto; margin:0 0 14px; padding-bottom:4px; scrollbar-width:none; }',
      '.bd-subnav::-webkit-scrollbar { display:none; }',
      '.bd-subnav a { flex:none; text-decoration:none; font-size:15px; font-weight:700; padding:8px 16px; border-radius:999px; border:1.5px solid var(--line); background:var(--card); color:var(--sub); }',
      '.bd-subnav a.on { background:var(--panel); border-color:var(--panel); color:#fff; }',
      '.bd-notice { background:var(--warnbg); border:1px solid var(--line); border-radius:16px; padding:14px 16px; margin-bottom:14px; font-size:15px; line-height:1.55; color:var(--ink); font-weight:600; }',
      '.bd-ready { background:var(--card); border:1.5px solid var(--line); border-radius:18px; padding:28px 18px; margin-bottom:16px; text-align:center; }',
      '.bd-ready b { display:block; font-size:20px; margin-bottom:6px; color:var(--ink); }',
      '.bd-ready p { margin:0; font-size:15px; color:var(--sub); }',
      '.bd-legal-links { margin-top:28px; padding-top:16px; border-top:1px solid var(--line); display:flex; flex-wrap:wrap; gap:10px 14px; justify-content:center; font-size:14px; color:var(--sub); }',
      '.bd-legal-links a { color:var(--sub); text-decoration:none; font-weight:600; }',
      '.bd-legal-links a:hover { color:var(--bd-accent, var(--red)); text-decoration:underline; }',
      '.bd-draft-banner { background:var(--warnbg); border:1.5px solid var(--line); border-radius:14px; padding:12px 16px; margin-bottom:16px; font-size:15px; font-weight:800; color:var(--ink); text-align:center; }'
    ];

    var authAndFormSection = [
      '.bd-auth { background:var(--card); border:1px solid var(--line); border-radius:18px; padding:16px; margin-bottom:14px; }',
      '.bd-auth-top { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; }',
      '.bd-auth-user { font-size:15px; font-weight:700; color:var(--ink); }',
      '.bd-auth-btns { display:grid; grid-template-columns:repeat(auto-fit, minmax(var(--bd-auth-btn-min, 140px), 1fr)); gap:8px; margin-top:10px; }',
      '.bd-btn { font:inherit; font-size:15px; font-weight:700; border-radius:12px; padding:12px 14px; border:1.5px solid var(--line); background:var(--card); color:var(--ink); cursor:pointer; text-align:center; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; gap:6px; min-height:46px; }',
      '.bd-btn.primary { background:var(--bd-accent, var(--red)); border-color:var(--bd-accent, var(--red)); color:#fff; }',
      '.bd-btn.danger { background:var(--dangerbg); border-color:var(--danger); color:var(--danger); }',
      '.bd-btn.small { font-size:13px; padding:7px 12px; min-height:34px; border-radius:999px; }',
      '.bd-btn:disabled { opacity:0.55; cursor:default; }',
      '.bd-msg { border-radius:14px; padding:12px 14px; margin:10px 0; font-size:15px; font-weight:600; display:none; }',
      '.bd-msg.err { display:block; background:var(--dangerbg); color:var(--danger); }',
      '.bd-msg.ok { display:block; background:var(--okbg); color:var(--ok); }',
      '.bd-form .field { margin-bottom:14px; }',
      '.bd-form input[type="text"], .bd-form textarea, .bd-select { width:100%; border:1.5px solid var(--line); border-radius:12px; background:var(--card); color:var(--ink); font:inherit; font-size:16px; padding:12px 14px; outline:0; }',
      '.bd-form input[type="text"]:focus, .bd-form textarea:focus, .bd-select:focus { border-color:var(--bd-accent, var(--red)); }',
      '.bd-form textarea { min-height:140px; resize:vertical; line-height:1.6; }',
      '.bd-file-box { border:1.5px dashed var(--line); border-radius:12px; padding:12px; background:var(--fill); }',
      '.bd-file-box input[type="file"] { width:100%; font:inherit; font-size:14px; color:var(--ink); }'
    ];

    var listAndGallerySection = [
      '.bd-list { display:grid; gap:10px; margin-bottom:14px; }',
      '.bd-item { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:14px 16px; display:flex; align-items:center; gap:12px; cursor:pointer; }',
      '.bd-gallery { grid-template-columns:var(--bd-gallery-cols, repeat(auto-fit,minmax(min(100%,260px),1fr))); }',
      '.bd-gallery .bd-item { display:flex; flex-direction:column; align-items:stretch; }',
      '.bd-gallery .bd-thumb { width:100%; height:auto; max-height:var(--bd-gallery-max-h, 420px); object-fit:contain; }',
      '.bd-gallery .bd-item-title { white-space:normal; overflow-wrap:anywhere; }',
      '.bd-item:hover { border-color:var(--bd-accent, var(--red)); }',
      '.bd-thumb { width:var(--bd-thumb-size, 64px); height:var(--bd-thumb-size, 64px); border-radius:12px; object-fit:cover; background:var(--fill); flex:none; border:1px solid var(--line); }',
      '.bd-item-body { flex:1; min-width:0; }',
      '.bd-item-title { font-size:17px; font-weight:700; color:var(--ink); margin:0 0 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }',
      '.bd-item-meta { font-size:13px; color:var(--sub); display:flex; flex-wrap:wrap; gap:8px; align-items:center; }',
      '.bd-item-actions { flex:none; }'
    ];

    var detailAndReportSection = [
      '.bd-detail { background:var(--card); border:2px solid var(--bd-accent, var(--red)); border-radius:18px; padding:18px; margin-bottom:16px; }',
      '.bd-detail h2 { font-size:21px; margin:0 0 8px; line-height:1.35; color:var(--ink); word-break:keep-all; overflow-wrap:anywhere; }',
      '.bd-detail-meta { font-size:14px; color:var(--sub); padding-bottom:12px; border-bottom:1px solid var(--line); margin-bottom:14px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; }',
      '.bd-detail-body { font-size:16px; line-height:1.7; color:var(--ink); white-space:pre-wrap; word-break:keep-all; overflow-wrap:anywhere; margin-bottom:16px; }',
      '.bd-detail-imgs { display:grid; gap:12px; margin-bottom:16px; }',
      '.bd-detail-imgs img { width:100%; max-width:100%; height:auto; border-radius:14px; border:1px solid var(--line); background:var(--fill); display:block; }',
      '.bd-detail-bar { display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:space-between; padding-top:12px; border-top:1px solid var(--line); }',
      '.bd-report-box { margin-top:12px; padding:14px; border-radius:14px; background:var(--fill); border:1px solid var(--line); }'
    ];

    var videoSection = [
      '.bd-video-list { display:grid; gap:16px; margin-bottom:16px; }',
      '.bd-video-card { background:var(--card); border:1px solid var(--line); border-radius:18px; padding:16px; }',
      '.bd-video-card h2 { font-size:18px; margin:0 0 10px; color:var(--ink); }',
      '.bd-video-stage { position:relative; width:100%; aspect-ratio:var(--bd-video-ratio, 16/9); border-radius:14px; overflow:hidden; background:#000; }',
      '.bd-video-stage img { width:100%; height:100%; object-fit:cover; display:block; }',
      '.bd-video-stage iframe { position:absolute; inset:0; width:100%; height:100%; border:0; }',
      '.bd-play-trigger { position:absolute; inset:0; width:100%; height:100%; border:0; background:rgba(0,0,0,0.35); color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; font:inherit; font-size:17px; font-weight:800; }',
      '.bd-play-pill { background:var(--bd-accent, var(--red)); color:#fff; padding:12px 22px; border-radius:999px; box-shadow:0 4px 14px rgba(0,0,0,0.35); }'
    ];

    return []
      .concat(variablesSection)
      .concat(allBoardSection)
      .concat(navAndNoticeSection)
      .concat(authAndFormSection)
      .concat(listAndGallerySection)
      .concat(detailAndReportSection)
      .concat(videoSection)
      .join('\n');
  }

  function injectStyles() {
    if (document.getElementById('zw-board-style')) return;
    var st = document.createElement('style');
    st.id = 'zw-board-style';
    st.textContent = buildCssText();
    document.head.appendChild(st);
  }

  if (document.head) injectStyles();

  ZW_BOARD.styles = {
    injectStyles: injectStyles,
    buildCssText: buildCssText
  };
})(window);
