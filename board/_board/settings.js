// 좌표나라 게시판 설정 모음 (site/board/_board/settings.js)
// 자주 바꾸는 값(게시판 종류·안내 문구·사진 한도·쪽 크기·화면 크기)을 한곳에 모아 둔 파일입니다.

(function (window) {
  'use strict';

  var ZW_BOARD = window.ZW_BOARD = window.ZW_BOARD || {};

  var BOARDS = {
    danga: {
      id: 'danga',
      name: '단가표',
      listTitle: '등록된 단가표 목록',
      writeTitle: '단가표 올리기 (등록 업체 전용)',
      writeRole: 'vendor_or_staff',
      maxImages: 5,
      allowExcel: true,
      gallery: false,
      authorPrefix: '올린 업체: ',
      titlePlaceholder: '예: 10월 넷째 주 단가표 안내',
      bodyPlaceholder: '주요 안내 사항을 적어 주세요. 전화번호·계좌번호 등 개인정보는 적지 마세요.',
      noPermNotice: '단가표 글 쓰기는 등록된 업체만 할 수 있습니다. 업체 등록은 문의 페이지로 안내해 드립니다. ',
      contactLinkText: '업체 등록은 문의 페이지로 ›',
      defaultContactHref: '../legal/contact.html'
    },
    story: {
      id: 'story',
      name: '이야기',
      listTitle: '이야기 글 목록',
      writeTitle: '새 이야기 쓰기',
      writeRole: 'user',
      maxImages: 5,
      allowExcel: false,
      gallery: false,
      authorPrefix: '글쓴이: ',
      titlePlaceholder: '제목을 입력해 주세요 (80자 이내)',
      bodyPlaceholder: '직접 겪은 이야기나 궁금한 점을 자유롭게 적어 주세요. 남의 글을 그대로 옮기거나 개인정보를 적지 마세요.',
      loginPrompt: '위에서 로그인하면 누구나 직접 쓴 이야기와 사진(최대 5장)을 올릴 수 있습니다.'
    },
    review: {
      id: 'review',
      name: '후기',
      listTitle: '후기 글 목록',
      writeTitle: '새 후기 쓰기',
      writeRole: 'user',
      maxImages: 5,
      allowExcel: false,
      gallery: false,
      authorPrefix: '글쓴이: ',
      titlePlaceholder: '제목을 입력해 주세요 (80자 이내)',
      bodyPlaceholder: '직접 경험한 후기를 적어 주세요. 남의 글을 옮기거나 개인정보를 적지 마세요.',
      loginPrompt: '위에서 로그인하면 누구나 직접 쓴 후기와 사진(최대 5장)을 올릴 수 있습니다.'
    },
    cardnews: {
      id: 'cardnews',
      name: '카드뉴스',
      listTitle: '카드뉴스 목록',
      writeTitle: '카드뉴스 올리기 (운영진 전용)',
      writeRole: 'staff',
      maxImages: 10,
      allowExcel: false,
      gallery: true,
      authorPrefix: '글쓴이: ',
      titlePlaceholder: '제목을 입력해 주세요 (80자 이내)',
      bodyPlaceholder: '카드뉴스 설명을 적어 주세요. 사진은 선택한 순서대로 표시됩니다.',
      noPermNotice: '운영진이 올리는 카드뉴스입니다'
    }
  };

  ZW_BOARD.settings = {
    SUPABASE_CDN: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',
    BOARDS: BOARDS,
    // 분류 탭(한 줄). 순서·이름은 여기서만 바꾼다. 데이터의 구분(휴대폰·부동산) 또는 일반 글의 갈래와 같은 글자여야 한다.
    CARD_CATEGORIES: [
      { key: '휴대폰', subs: [] },
      { key: '부동산', subs: [] },
      { key: '재미', subs: [] },
      { key: '감동', subs: [] },
      { key: '기쁨', subs: [] },
      { key: '슬픔', subs: [] },
      { key: '공감', subs: [] }
    ],
    // 사진 주소 앞부분. 사진을 다른 서버(예: https://media.jwapyonara.com/board/)로 옮기면 이 값만 바꾼다. 끝에 / 필수
    MEDIA_BASE: '../',
    BLOG_DATA_URL: '../_data/blog.json',
    CARD_DATA_URL: '../_data/cardnews.json',
    CARD_GRID_COLUMNS: 3,
    CARD_PAGE_SIZE: 12,
    VIDEO_CATEGORIES: [
      { key: '휴대폰' },
      { key: '부동산' },
      { key: '재미' },
      { key: '감동' },
      { key: '기쁨' },
      { key: '슬픔' },
      { key: '공감' }
    ],
    VIDEO_DATA_URL: '../_data/videos.json',
    VIDEO_GRID_COLUMNS: 3,
    VIDEO_PAGE_SIZE: 12,
    ALL_BOARD_ORDER: ['danga', 'story', 'review', 'cardnews'],
    ALL_PAGE_SIZES: [15, 30, 50],
    ALL_DEFAULT_PAGE_SIZE: 15,
    ALL_PAGE_SIZE_KEY: 'zw_board_all_page_size',
    PAGE_SIZE: 20,
    MAX_IMAGES: 5,
    MAX_IMAGE_BYTES: 5 * 1024 * 1024,   // 5MB
    MAX_EXCEL_BYTES: 10 * 1024 * 1024,  // 10MB
    ALLOWED_IMAGE_EXTS: ['jpg', 'jpeg', 'png', 'webp'],
    TITLE_MAX_LENGTH: 80,
    BODY_MAX_LENGTH: 5000,
    REPORT_STORAGE_KEY: 'zw_board_reported',
    REPORT_REASONS: [
      '욕설·비방·혐오 표현',
      '스팸·도배·광고 글',
      '전화번호 등 개인정보 노출',
      '남의 글·사진 무단 복사',
      '정치·분란 유도·기타 부적절한 글'
    ],
    UI: {
      thumbSize: '64px',
      galleryMinCardWidth: '260px',
      galleryColumns: 'repeat(auto-fit,minmax(min(100%,var(--bd-gallery-min,260px)),1fr))',
      galleryThumbMaxHeight: '420px',
      videoAspectRatio: '16/9',
      authBtnMinWidth: '140px'
    },
    // 유튜브 채널 정보 (핸들·채널번호·이름)
    YT_CHANNELS: {
      '좌표나라': {
        name: '좌표나라 김대성',
        handle: '좌표나라',
        channelId: 'UCBvT1VuPrklJ9rV4a5-s-Sw'
      },
      '좌표나라부동산': {
        name: '좌표나라 부동산',
        handle: '좌표나라부동산',
        channelId: 'UCp-epN89FDsX6FTbiRInncg'
      },
      '좌표나라김대성': {
        name: '좌표닷컴',
        handle: '좌표나라김대성',
        channelId: 'UCXt_llEWwRhPglCQJHKY0_A'
      }
    },
    // 영상 및 카드뉴스 주제별 유튜브 채널 연결 (핸들로 YT_CHANNELS 참조)
    YT_TOPIC_CHANNEL: {
      '영상': {
        '휴대폰': '좌표나라',
        '부동산': '좌표나라부동산'
      },
      '카드뉴스': {
        '휴대폰': '좌표나라김대성',
        '부동산': '좌표나라부동산',
        '그 밖의 주제': '좌표나라김대성'
      }
    },
    getYtChannelUrl: function (handle) {
      if (!handle) return '';
      return 'https://www.youtube.com/@' + encodeURIComponent(handle);
    },
    getYtSubscribeUrl: function (handle) {
      if (!handle) return '';
      return 'https://www.youtube.com/@' + encodeURIComponent(handle) + '?sub_confirmation=1';
    },
    getYtPostsUrl: function (handle) {
      if (!handle) return '';
      return 'https://www.youtube.com/@' + encodeURIComponent(handle) + '/posts';
    },
    // 관리자 바로가기 링크 모음 (그룹, 이름, 주소)
    ADMIN_SHORTCUTS: [
      { group: '유튜브', name: '💬 휴대폰 채널 댓글 확인', url: 'https://studio.youtube.com/channel/UCBvT1VuPrklJ9rV4a5-s-Sw/comments/inbox' },
      { group: '유튜브', name: '💬 부동산 채널 댓글 확인', url: 'https://studio.youtube.com/channel/UCp-epN89FDsX6FTbiRInncg/comments/inbox' },
      { group: '유튜브', name: '💬 카드뉴스 채널(좌표닷컴) 댓글 확인', url: 'https://studio.youtube.com/channel/UCXt_llEWwRhPglCQJHKY0_A/comments/inbox' },
      { group: '유튜브', name: '📝 휴대폰 채널 게시물', url: 'https://www.youtube.com/@%EC%A2%8C%ED%91%9C%EB%82%98%EB%9D%BC/posts' },
      { group: '유튜브', name: '📝 부동산 채널 게시물', url: 'https://www.youtube.com/@%EC%A2%8C%ED%91%9C%EB%82%98%EB%9D%BC%EB%B6%80%EB%8F%99%EC%82%B0/posts' },
      { group: '유튜브', name: '📝 카드뉴스 채널 게시물', url: 'https://www.youtube.com/@%EC%A2%8C%ED%91%9C%EB%82%98%EB%9D%BC%EA%B9%80%EB%8C%80%EC%84%B1/posts' },
      { group: '네이버', name: '✍️ 블로그 글쓰기', url: 'https://blog.naver.com/kds099/postwrite' },
      { group: '네이버', name: '⚙️ 블로그 관리', url: 'https://blog.naver.com/kds099' },
      { group: '네이버', name: '☕ 카페 좌표나라', url: 'https://cafe.naver.com/whdrpzja' },
      { group: '사이트 점검', name: '📊 구글 애널리틱스', url: 'https://analytics.google.com/analytics/web/#/p485160740/reports/intelligenthome' },
      { group: '사이트 점검', name: '🔍 서치 콘솔', url: 'https://search.google.com/search-console?resource_id=https%3A%2F%2Fjwapyonara.com%2F' },
      { group: '사이트 점검', name: '⚡ 수파베이스', url: 'https://supabase.com/dashboard/project/houqpzuwbdmzhkdruxmo' },
      { group: '사이트 안', name: '🖼️ 카드뉴스 게시판', url: '../cardnews/index.html' },
      { group: '사이트 안', name: '🎬 영상 게시판', url: '../video/index.html' },
      { group: '사이트 안', name: '📋 전체글', url: '../all/index.html' }
    ]
  };
})(window);
