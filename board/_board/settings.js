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
    }
  };
})(window);
