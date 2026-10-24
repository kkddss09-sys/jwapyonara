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
    var cardCols = (ZW_BOARD.settings && ZW_BOARD.settings.CARD_GRID_COLUMNS) || 3;
    var vidCols = (ZW_BOARD.settings && ZW_BOARD.settings.VIDEO_GRID_COLUMNS) || 3;

    var variablesSection = [
      ':root {',
      '  --bd-accent: var(--red);',
      '  --bd-thumb-size: ' + thumbSize + ';',
      '  --bd-gallery-min: ' + galleryMin + ';',
      '  --bd-gallery-cols: ' + galleryCols + ';',
      '  --bd-gallery-max-h: ' + galleryMaxH + ';',
      '  --bd-video-ratio: ' + videoRatio + ';',
      '  --bd-auth-btn-min: ' + authBtnMin + ';',
      '  --bd-card-cols: ' + cardCols + ';',
      '  --bd-card-overlay-bg: rgba(10, 12, 16, 0.96);',
      '  --bd-card-stage-bg: #000000;',
      '  --bd-card-fg: #ffffff;',
      '  --bd-card-sub: rgba(255, 255, 255, 0.74);',
      '  --bd-card-ui-bg: rgba(20, 24, 32, 0.76);',
      '  --bd-card-ui-border: rgba(255, 255, 255, 0.22);',
      '  --bd-card-dot: rgba(255, 255, 255, 0.35);',
      '  --bd-card-dot-on: #ffffff;',
      '  --bd-card-grad: linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.58) 68%, rgba(0, 0, 0, 0) 100%);',
      '  --bd-vid-cols: ' + vidCols + ';',
      '  --bd-vid-thumb-ratio: 9 / 16;',
      '  --bd-vid-overlay-bg: rgba(10, 12, 16, 0.96);',
      '  --bd-vid-stage-bg: #000000;',
      '  --bd-vid-stage-max-h: 90vh;',
      '  --bd-vid-fg: #ffffff;',
      '  --bd-vid-sub: rgba(255, 255, 255, 0.74);',
      '  --bd-vid-ui-bg: rgba(20, 24, 32, 0.78);',
      '  --bd-vid-ui-border: rgba(255, 255, 255, 0.24);',
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

    // 카드뉴스 보기
    var cardnewsSection = [
      '.bd-cn-wrap { margin-bottom:18px; }',
      '.bd-cn-head-bar { display:flex; justify-content:flex-end; align-items:center; margin-bottom:8px; }',
      '.bd-cn-channel-link { font-size:13px; font-weight:700; color:var(--sub); text-decoration:underline; }',
      '.bd-cn-channel-link:hover { color:var(--ink); }',
      '.bd-cn-tabs { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px; }',
      '.bd-cn-tab { font:inherit; font-size:15px; font-weight:700; padding:8px 16px; border-radius:999px; border:1.5px solid var(--line); background:var(--card); color:var(--ink); cursor:pointer; }',
      '.bd-cn-tab.on { background:var(--bd-accent, var(--red)); border-color:var(--bd-accent, var(--red)); color:var(--bd-card-fg); }',
      '.bd-cn-subs { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:14px; padding:10px 12px; background:var(--card); border:1px solid var(--line); border-radius:14px; }',
      '.bd-cn-chip { font:inherit; font-size:13px; font-weight:700; padding:6px 12px; border-radius:999px; border:1px solid var(--line); background:var(--fill); color:var(--ink); cursor:pointer; }',
      '.bd-cn-chip.on { background:var(--panel); border-color:var(--panel); color:var(--bd-card-fg); }',
      '.bd-cn-chip.is-empty { opacity:0.42; }',
      '.bd-cn-grid { display:grid; grid-template-columns:repeat(var(--bd-card-cols, 3), minmax(0, 1fr)); gap:12px; margin-bottom:16px; }',
      '@media(max-width:520px) { .bd-cn-grid { gap:8px; } }',
      '.bd-cn-card { display:flex; flex-direction:column; align-items:stretch; text-align:left; padding:0; border:1px solid var(--line); border-radius:14px; overflow:hidden; background:var(--card); color:var(--ink); font:inherit; cursor:pointer; }',
      '.bd-cn-card:hover, .bd-cn-card:focus-visible { border-color:var(--bd-accent, var(--red)); outline:none; }',
      '.bd-cn-thumb-wrap { position:relative; width:100%; aspect-ratio:1 / 1; background:var(--fill); overflow:hidden; border-bottom:1px solid var(--line); }',
      '.bd-cn-thumb { width:100%; height:100%; object-fit:cover; display:block; }',
      '.bd-cn-info { padding:10px; display:flex; flex-direction:column; gap:6px; flex:1; }',
      '@media(max-width:520px) { .bd-cn-info { padding:8px; gap:4px; } }',
      '.bd-cn-title { font-size:14px; font-weight:700; line-height:1.38; color:var(--ink); margin:0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; text-overflow:ellipsis; word-break:keep-all; overflow-wrap:anywhere; }',
      '@media(max-width:520px) { .bd-cn-title { font-size:13px; } }',
      '.bd-cn-meta { font-size:12px; color:var(--sub); display:flex; flex-wrap:wrap; justify-content:space-between; gap:4px; margin-top:auto; }',
      '.bd-cn-more-wrap { text-align:center; margin:8px 0 18px; }',
      '.bd-cn-empty { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:28px 16px; text-align:center; font-size:15px; font-weight:600; color:var(--sub); margin-bottom:16px; }',
      'body.bd-cn-lock { overflow:hidden !important; }',
      '.bd-cn-overlay { position:fixed; inset:0; z-index:9999; background:var(--bd-card-overlay-bg); color:var(--bd-card-fg); display:flex; flex-direction:column; overscroll-behavior:contain; }',
      '.bd-cn-topbar { position:absolute; top:0; left:0; right:0; z-index:20; display:flex; align-items:center; justify-content:space-between; padding:12px 16px; pointer-events:none; }',
      '.bd-cn-topbar > * { pointer-events:auto; }',
      '.bd-cn-page-pill { background:var(--bd-card-ui-bg); color:var(--bd-card-fg); border:1px solid var(--bd-card-ui-border); border-radius:999px; padding:6px 12px; font-size:13px; font-weight:700; }',
      '.bd-cn-top-actions { display:flex; align-items:center; gap:8px; }',
      '.bd-cn-icon-btn { font:inherit; font-size:14px; font-weight:700; color:var(--bd-card-fg); background:var(--bd-card-ui-bg); border:1px solid var(--bd-card-ui-border); border-radius:999px; padding:7px 14px; min-height:38px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:4px; }',
      '.bd-cn-vtrack { width:100%; height:100%; overflow-y:auto; overflow-x:hidden; scroll-snap-type:y mandatory; overscroll-behavior-y:contain; touch-action:pan-y pinch-zoom; scrollbar-width:none; }',
      '.bd-cn-vtrack::-webkit-scrollbar { display:none; }',
      '.bd-cn-vslide { position:relative; width:100%; height:100%; scroll-snap-align:start; scroll-snap-stop:always; display:flex; flex-direction:column; justify-content:center; overflow:hidden; background:var(--bd-card-stage-bg); }',
      '.bd-cn-htrack { display:flex; width:100%; height:100%; overflow-x:auto; overflow-y:hidden; scroll-snap-type:x mandatory; overscroll-behavior-x:contain; scrollbar-width:none; }',
      '.bd-cn-htrack::-webkit-scrollbar { display:none; }',
      '.bd-cn-hslide { flex:0 0 100%; width:100%; height:100%; scroll-snap-align:start; scroll-snap-stop:always; display:flex; align-items:center; justify-content:center; padding:56px 0 136px; box-sizing:border-box; }',
      '.bd-cn-hslide img { max-width:100%; max-height:100%; width:100%; height:100%; object-fit:contain; display:block; user-select:none; -webkit-user-drag:none; }',
      '.bd-cn-arrow { position:absolute; top:50%; transform:translateY(-50%); z-index:15; width:44px; height:44px; border-radius:999px; border:1px solid var(--bd-card-ui-border); background:var(--bd-card-ui-bg); color:var(--bd-card-fg); font:inherit; font-size:24px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; }',
      '.bd-cn-arrow.prev { left:14px; }',
      '.bd-cn-arrow.next { right:14px; }',
      '.bd-cn-arrow:disabled { opacity:0.25; cursor:default; pointer-events:none; }',
      '@media(max-width:768px) { .bd-cn-arrow { display:none; } }',
      '.bd-cn-bottom { position:absolute; left:0; right:0; bottom:0; z-index:15; background:var(--bd-card-grad); padding:24px 16px 16px; display:flex; flex-direction:column; gap:6px; max-width:680px; margin:0 auto; box-sizing:border-box; }',
      '.bd-cn-dots { display:flex; justify-content:center; align-items:center; gap:6px; margin-bottom:4px; flex-wrap:wrap; }',
      '.bd-cn-dot { width:7px; height:7px; border-radius:999px; border:0; padding:0; background:var(--bd-card-dot); cursor:pointer; }',
      '.bd-cn-dot.on { width:18px; background:var(--bd-card-dot-on); }',
      '.bd-cn-overlay-meta { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--bd-card-sub); font-weight:600; flex-wrap:wrap; }',
      '.bd-cn-overlay-badge { background:var(--bd-accent, var(--red)); color:var(--bd-card-fg); padding:2px 8px; border-radius:6px; font-size:12px; font-weight:700; }',
      '.bd-cn-overlay-title { font-size:17px; font-weight:800; line-height:1.35; color:var(--bd-card-fg); margin:0; word-break:keep-all; overflow-wrap:anywhere; }',
      '.bd-cn-body-row { display:flex; align-items:flex-end; gap:8px; }',
      '.bd-cn-body { font-size:14px; line-height:1.55; color:var(--bd-card-sub); margin:0; flex:1; min-width:0; word-break:keep-all; overflow-wrap:anywhere; }',
      '.bd-cn-body.collapsed { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
      '.bd-cn-body.expanded { white-space:pre-wrap; max-height:28vh; overflow-y:auto; color:var(--bd-card-fg); }',
      '.bd-cn-body-toggle { flex:none; border:0; background:none; color:var(--bd-card-fg); font:inherit; font-size:13px; font-weight:700; padding:2px 4px; cursor:pointer; text-decoration:underline; }',
      '.bd-cn-end-note { text-align:center; font-size:12px; font-weight:700; color:var(--bd-card-sub); padding-top:4px; }',
      '.bd-cn-toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); z-index:10001; background:var(--bd-card-ui-bg); color:var(--bd-card-fg); border:1px solid var(--bd-card-ui-border); padding:8px 16px; border-radius:999px; font-size:13px; font-weight:700; pointer-events:none; }',
      '@media(prefers-reduced-motion:reduce) { .bd-cn-vtrack, .bd-cn-htrack { scroll-behavior:auto !important; } .bd-cn-dot, .bd-cn-tab, .bd-cn-chip { transition:none !important; } }'
    ];

    // 영상 목록 보기 (좌표나라 쇼츠)
    var videoListSection = [
      '.bd-vid-wrap { margin-bottom:22px; }',
      '.bd-vid-head-row { display:flex; align-items:baseline; justify-content:space-between; gap:8px; margin-bottom:12px; }',
      '.bd-vid-heading { font-size:19px; font-weight:800; color:var(--ink); margin:0; }',
      '.bd-vid-channel-link { font-size:13px; font-weight:700; color:var(--sub); text-decoration:underline; }',
      '.bd-vid-channel-link:hover { color:var(--ink); }',
      '.bd-vid-tabs { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }',
      '.bd-vid-tab { font:inherit; font-size:15px; font-weight:700; padding:8px 16px; border-radius:999px; border:1.5px solid var(--line); background:var(--card); color:var(--ink); cursor:pointer; }',
      '.bd-vid-tab.on { background:var(--bd-accent, var(--red)); border-color:var(--bd-accent, var(--red)); color:var(--bd-vid-fg); }',
      '.bd-vid-grid { display:grid; grid-template-columns:repeat(var(--bd-vid-cols, 3), minmax(0, 1fr)); gap:12px; margin-bottom:16px; }',
      '@media(max-width:520px) { .bd-vid-grid { gap:8px; } }',
      '.bd-vid-card { display:flex; flex-direction:column; align-items:stretch; text-align:left; padding:0; border:1px solid var(--line); border-radius:14px; overflow:hidden; background:var(--card); color:var(--ink); font:inherit; cursor:pointer; }',
      '.bd-vid-card:hover, .bd-vid-card:focus-visible { border-color:var(--bd-accent, var(--red)); outline:none; }',
      '.bd-vid-thumb-wrap { position:relative; width:100%; aspect-ratio:var(--bd-vid-thumb-ratio, 9 / 16); background:#000; overflow:hidden; border-bottom:1px solid var(--line); }',
      '.bd-vid-thumb { width:100%; height:100%; object-fit:cover; object-position:center; display:block; }',
      '.bd-vid-info { padding:10px; display:flex; flex-direction:column; gap:6px; flex:1; }',
      '@media(max-width:520px) { .bd-vid-info { padding:8px; gap:4px; } }',
      '.bd-vid-title { font-size:14px; font-weight:700; line-height:1.38; color:var(--ink); margin:0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; text-overflow:ellipsis; word-break:keep-all; overflow-wrap:anywhere; }',
      '@media(max-width:520px) { .bd-vid-title { font-size:13px; } }',
      '.bd-vid-meta { font-size:12px; color:var(--sub); display:flex; flex-wrap:wrap; justify-content:space-between; gap:4px; margin-top:auto; }',
      '.bd-vid-more-wrap { text-align:center; margin:8px 0 18px; }',
      '.bd-vid-empty { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:24px 16px; text-align:center; font-size:15px; font-weight:600; color:var(--sub); margin-bottom:16px; }',
      'body.bd-vid-lock { overflow:hidden !important; }',
      '.bd-vid-overlay { position:fixed; inset:0; z-index:9999; background:var(--bd-vid-overlay-bg); color:var(--bd-vid-fg); display:flex; flex-direction:column; overscroll-behavior:contain; }',
      '.bd-vid-topbar { position:absolute; top:0; left:0; right:0; z-index:25; display:flex; align-items:center; justify-content:space-between; padding:12px 16px; pointer-events:none; }',
      '.bd-vid-topbar > * { pointer-events:auto; }',
      '.bd-vid-page-pill { background:var(--bd-vid-ui-bg); color:var(--bd-vid-fg); border:1px solid var(--bd-vid-ui-border); border-radius:999px; padding:6px 12px; font-size:13px; font-weight:700; }',
      '.bd-vid-top-actions { display:flex; align-items:center; gap:8px; }',
      '.bd-vid-icon-btn { font:inherit; font-size:14px; font-weight:700; color:var(--bd-vid-fg); background:var(--bd-vid-ui-bg); border:1px solid var(--bd-vid-ui-border); border-radius:999px; padding:7px 14px; min-height:38px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:4px; text-decoration:none; }',
      '.bd-vid-icon-btn:disabled { opacity:0.35; cursor:default; pointer-events:none; }',
      '.bd-vid-body { flex:1; min-height:0; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:54px 12px 14px; box-sizing:border-box; gap:10px; }',
      '.bd-vid-stage-row { flex:1; min-height:0; width:100%; display:flex; align-items:center; justify-content:center; gap:12px; }',
      '.bd-vid-frame-box { position:relative; height:min(var(--bd-vid-stage-max-h, 90vh), calc(100vh - 150px)); max-height:var(--bd-vid-stage-max-h, 90vh); aspect-ratio:9 / 16; max-width:calc(100vw - 24px); background:var(--bd-vid-stage-bg); border-radius:16px; overflow:hidden; border:1px solid var(--bd-vid-ui-border); flex:none; }',
      '.bd-vid-frame-box iframe { width:100%; height:100%; border:0; display:block; }',
      '.bd-vid-nav-col { display:flex; flex-direction:column; gap:8px; z-index:20; }',
      '@media(max-width:560px) { .bd-vid-nav-col { position:absolute; right:12px; top:50%; transform:translateY(-50%); } }',
      '.bd-vid-nav-btn { width:44px; height:44px; border-radius:999px; border:1px solid var(--bd-vid-ui-border); background:var(--bd-vid-ui-bg); color:var(--bd-vid-fg); font:inherit; font-size:18px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; }',
      '.bd-vid-nav-btn:disabled { opacity:0.3; cursor:default; pointer-events:none; }',
      '.bd-vid-bottom { width:100%; max-width:520px; background:var(--bd-vid-ui-bg); border:1px solid var(--bd-vid-ui-border); border-radius:14px; padding:10px 14px; box-sizing:border-box; display:flex; flex-direction:column; gap:6px; z-index:20; }',
      '.bd-vid-overlay-meta { display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:13px; color:var(--bd-vid-sub); font-weight:600; flex-wrap:wrap; }',
      '.bd-vid-overlay-meta-left { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }',
      '.bd-vid-overlay-badge { background:var(--bd-accent, var(--red)); color:var(--bd-vid-fg); padding:2px 8px; border-radius:6px; font-size:12px; font-weight:700; }',
      '.bd-cn-overlay-links { display:flex; align-items:center; gap:8px; margin-left:auto; flex-wrap:wrap; }',
      '.bd-cn-blog-link { color:var(--bd-vid-fg, #fff); font-size:13px; font-weight:700; text-decoration:underline; white-space:nowrap; }',
      '.bd-cn-yt-link { color:var(--bd-card-fg, #fff); font-size:13px; font-weight:700; text-decoration:underline; white-space:nowrap; }',
      '.bd-vid-links-group { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }',
      '.bd-vid-yt-link { color:var(--bd-vid-fg); font-size:13px; font-weight:700; text-decoration:underline; white-space:nowrap; }',
      '.bd-vid-overlay-title { font-size:15px; font-weight:800; line-height:1.35; color:var(--bd-vid-fg); margin:0; word-break:keep-all; overflow-wrap:anywhere; }',
      '.bd-vid-adj-hint { font-size:12px; color:var(--bd-vid-sub); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }',
      '@media(prefers-reduced-motion:reduce) { .bd-vid-tab, .bd-vid-card, .bd-vid-icon-btn, .bd-vid-nav-btn { transition:none !important; animation:none !important; } }'
    ];

    return []
      .concat(variablesSection)
      .concat(allBoardSection)
      .concat(navAndNoticeSection)
      .concat(authAndFormSection)
      .concat(listAndGallerySection)
      .concat(detailAndReportSection)
      .concat(videoSection)
      .concat(cardnewsSection)
      .concat(videoListSection)
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
