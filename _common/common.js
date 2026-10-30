// 좌표나라.com 모든 쪽이 같이 쓰는 머리·꼬리, 도구 목록, 숫자 다루는 작은 도우미.
// 도구를 새로 만들면 TOOLS에 한 줄을 넣는다(제작1/저관여웹/목록.txt와 같게). 끝 값이 true인 것만 눌린다.

// ▼ 좌표나라로 가는 길. 비어 있는 것은 화면에 나오지 않는다.
var LINKS = {
  // 카톡방 입장 주소 — 분류마다 다르다(2026-10-12 사용자가 알려 줌). 분류에 주소가 없으면 휴대폰 방으로 간다
  kakao: { '휴대폰': 'https://open.kakao.com/o/g12bW70b', '부동산': 'https://open.kakao.com/o/gLzKdIgc' },
  cafe: 'https://cafe.naver.com/whdrpzja',     // 네이버 카페 좌표나라(휴대폰 시세표)
  // 유튜브 채널 — 분류마다. 부동산 채널(노원구아파트)은 아직 없어 비워 둔다. 채널이 생기면 주소와 아래 YT_LIST를 채운다
  youtube: { '휴대폰': 'https://www.youtube.com/channel/UCBvT1VuPrklJ9rV4a5-s-Sw', '부동산': '' }
};
// ▼ 첫 화면의 "○○ 정보 유튜브" 칸에 보여 줄 영상 묶음. 채널 번호의 UC를 UU로 바꾼 것이 그 채널의 올린 영상 전체다
var YT_LIST = { '휴대폰': 'UUBvT1VuPrklJ9rV4a5-s-Sw', '부동산': '' };

// ▼ 큰 분류(첫 화면의 탭). 순서대로 보인다.
var CAT_PATH = { '휴대폰': 'phone', '부동산': 'realestate', '생활': 'life', '단축키': 'shortcuts', '재미': 'fun', '게임': 'games' };   // 하위 쪽(분류 첫 화면) 폴더. 2026-10-19 사용자 요청: 사이트를 상위(첫 화면)·하위(분류별 쪽)로 나눔
var CAT_DESC = { '휴대폰': '살 때 비교, 바꾸기 전 확인표, 성지가 처음이라면', '부동산': '대출·전월세·청약·면적 계산과 상담지', '생활': '나이·퍼센트·큐알·사진 줄이기', '단축키': '윈도우·크롬·갤럭시·아이폰 숨은 기능', '재미': '성향 테스트·추첨·사다리 타기', '게임': '지뢰찾기·숫자 합치기·뱀 게임 등 짧게 한 판' };
var BOARD_OPEN = true;   // 2026-10-24: 게시판 링크를 맨 위 메뉴에 보일지. 구글 로그인 공개 전환·시험 글 정리 뒤 true로 바꿔 올린다(사용자 "1004 게시판 마무리")
var CATS = ['휴대폰', '부동산', '생활', '단축키', '재미', '게임'];   // 단축키 = 2026-10-15 사용자 요청(따로 한 분류) · 생활 = 누구나 쓰는 도구(공학용 계산기, 그림판 등). 2026-10-12 사용자 요청
// ▼ 맨 위 메뉴와 휴대폰 아래 탭줄 구성 — NAV_MAIN과 NAV_TOOLS_GROUP만 고치면 위쪽 메뉴·도구 펼침·아래 탭줄·더보기 패널이 함께 바뀐다
var NAV_MAIN = ['휴대폰', '부동산'];   // 위쪽 메뉴와 휴대폰 아래 탭줄에 바로 꺼내 둘 분류(CATS 안의 이름)
var NAV_TOOLS_GROUP = CATS.filter(function (c) { return NAV_MAIN.indexOf(c) < 0; });   // 위쪽 '도구' 펼침과 아래 '더보기' 패널에 묶일 분류
var CAT_ICON = { '휴대폰': '📱', '부동산': '🏢', '생활': '🧰', '단축키': '⌨️', '재미': '🎲', '게임': '🎮' };

// ▼ 도구 목록: [폴더 이름, 화면에 보일 이름, 한 줄 설명, 큰 분류, 만들어졌는지, 작은 묶음]
var TOOLS = [
  ['jagupje-seongji', '자급제 vs 성지 비교', '2년 동안 어느 쪽이 덜 드는지', '휴대폰', true, '살 때 비교'],
  ['', '공시지원금 vs 선택약정', '개통할 때 어느 쪽이 유리한지', '휴대폰', false, '살 때 비교'],
  ['monthly-phone', '한 달 납부액 계산기', '기기 할부와 요금을 합쳐서', '휴대폰', true, '살 때 비교'],
  ['plan-diff', '요금제 바꾸면 얼마 차이', '한 달과 약정 기간으로 보면', '휴대폰', true, '살 때 비교'],
  ['storage', '저장 공간 계산기', '사진과 영상으로 필요한 용량', '휴대폰', true, '살 때 비교'],
  ['per-day', '폰값, 하루로 치면', '오래 쓸수록 얼마나 싸지는지', '휴대폰', true, '바꾸기 전에'],
  ['upgrade-test', '지금 폰, 바꿀 때가 됐나', '해당하는 것을 누르면 결과가', '휴대폰', true, '바꾸기 전에'],
  ['switch-checklist', '폰 바꾸기 전 할 일', '백업부터 옮기기까지 하나씩', '휴대폰', true, '바꾸기 전에'],
  ['sell-checklist', '중고폰 팔기 전 확인표', '넘기기 전에 꼭 할 것', '휴대폰', true, '바꾸기 전에'],
  ['contract-end', '약정 끝나는 날', '언제 바꿔도 되는지', '휴대폰', true, '바꾸기 전에'],
  ['repair-or-new', '수리할까, 새로 살까', '한 달로 나눠 보면 어느 쪽이 덜 드는지', '휴대폰', true, '바꾸기 전에'],
  ['phone-insurance', '휴대폰 보험, 들까 말까', '낸 보험료와 고칠 때 드는 돈을 견주면', '휴대폰', true, '바꾸기 전에'],
  ['screen-inch', '화면 크기, 인치를 센티로', '지금 폰과 새 폰 화면 견주기', '휴대폰', true, '바꾸기 전에'],
  ['quote-compare', '매장 견적 견주기', '두 곳에서 들은 조건을 총액으로', '휴대폰', true, '살 때 비교'],
  ['', '새 폰 출시일까지', '며칠 남았는지', '휴대폰', false, '바꾸기 전에'],
  ['', '한 달 데이터 사용량', '요금제를 고르기 전에', '휴대폰', false, '바꾸기 전에'],
  ['', '시세표 용어 풀이', '처음 보는 말을 찾아보기', '휴대폰', false, '성지가 처음이라면'],
  ['', '성지 방문 전 확인표', '가서 무엇을 물어볼지', '휴대폰', false, '성지가 처음이라면'],

  ['sangdam', '부동산 상담 한 장', '조건 한 번 넣으면 A4 상담지로', '부동산', true, '상담'],
  ['sangdam2', '부동산 상담 종합 한 장', '대출·전월세·경매·재건축까지 묶음으로', '부동산', true, '상담'],
  ['pyeong', '평 ↔ 제곱미터', '84㎡는 몇 평일까', '부동산', true, '면적과 가격'],
  ['pyeongdang', '평당 가격 계산기', '이 집은 평당 얼마일까', '부동산', true, '면적과 가격'],
  ['loan', '대출 한 달 상환액', '얼마 빌리면 한 달에 얼마', '부동산', true, '대출'],
  ['dsr', '소득 대비 상환 비율', '내 소득으로 감당이 될까', '부동산', true, '대출'],
  ['dti', 'DTI 계산기', '소득 대비 대출 원리금 비율', '부동산', true, '대출'],
  ['rti', 'RTI 계산기', '임대소득으로 이자 낼 수 있을까', '부동산', true, '대출'],
  ['far', '용적률 · 건폐율', '땅에 건물을 얼마나 지었나', '부동산', true, '면적과 가격'],
  ['afford', '감당할 수 있는 대출금', '한 달에 낼 수 있는 돈으로 거꾸로', '부동산', true, '대출'],
  ['first-loan', '생애최초 대출 계산기', '첫 집, 얼마까지 빌릴까', '부동산', true, '대출'],
  ['rate-change', '금리가 바뀌면', '한 달에 얼마나 달라질까', '부동산', true, '대출'],
  ['refinance', '대출 갈아타기', '옮기면 이득일까 손해일까', '부동산', true, '대출'],
  ['prepay', '먼저 갚으면', '이자가 얼마나 줄어들까', '부동산', true, '대출'],
  ['compare-repay', '원리금균등 vs 원금균등', '이자가 얼마나 다를까', '부동산', true, '대출'],
  ['balance', '남은 원금 보기', '몇 년 갚으면 얼마 남나', '부동산', true, '대출'],
  ['grace', '거치 기간이 있는 대출', '이자만 내다가 갚으면', '부동산', true, '대출'],
  ['ltv', '필요한 내 돈', '집값의 몇 %를 빌리면', '부동산', true, '살 때와 팔 때'],
  ['housing-cost', '한 달 주거비', '대출·관리비·월세 합계', '부동산', true, '살 때와 팔 때'],
  ['mgmt', '평당 관리비', '이 집 관리비는 비싼 편일까', '부동산', true, '면적과 가격'],
  ['jeonwolse', '전세 ↔ 월세 바꿔 보기', '전세를 월세로, 월세를 전세로', '부동산', true, '전세와 월세'],
  ['jeonse-wolse', '전세 대출 vs 월세', '한 달에 어느 쪽이 덜 들까', '부동산', true, '전세와 월세'],
  ['raise', '보증금 · 월세 인상', '올리면 얼마가 될까', '부동산', true, '전세와 월세'],
  ['yield', '임대 수익률 계산기', '월세로 보면 몇 %일까', '부동산', true, '전세와 월세'],
  ['installments', '분양 대금 나누기', '계약금·중도금·잔금', '부동산', true, '살 때와 팔 때'],
  ['saving', '목표 금액까지', '몇 년을 모아야 할까', '부동산', true, '살 때와 팔 때'],
  ['profit', '차익과 수익률', '전세 끼고 사고팔아도 얼마 남았나', '부동산', true, '살 때와 팔 때'],
  ['cheongyak', '청약 가점 계산기', '84점 만점 내 점수', '부동산', true, '살 때와 팔 때'],
  ['', '취득세 계산기', '집 살 때 세금', '부동산', false, '세금과 비용'],
  ['', '중개 보수 계산기', '복비가 얼마일까', '부동산', false, '세금과 비용'],
  ['realestate-quiz', '부동산 용어 퀴즈', '처음 듣는 말, 알고 있나요?', '부동산', true, '퀴즈와 테스트'],
  ['pyeong-sense', '평수 감각 게임', '㎡를 보고 몇 평인지 맞혀 보기', '부동산', true, '퀴즈와 테스트'],
  ['home-type-test', '나에게 맞는 주거 스타일', '질문 6개로 보는 내 취향', '부동산', true, '퀴즈와 테스트'],

  ['hogang-test', '나는 호갱일까? 테스트', '살 때 얼마나 준비됐는지', '휴대폰', true, '살 때 비교'],
  ['ask-ai', 'AI에게 물어볼 말 만들기', '견적·요금제·아파트·전세 질문 글을 대신 짜 줌', '휴대폰', true, '살 때 비교'],
  ['story-first-visit', '성지 처음 가는 날', '가상의 이야기로 보는 방문 순서', '휴대폰', true, '읽을거리'],
  ['phone-test', '나에게 맞는 폰 테스트', '갤럭시일까 아이폰일까', '재미', true, '테스트와 뽑기'],
  ['draw', '추첨기', '이름을 넣고 뽑기', '재미', true, '테스트와 뽑기'],
  ['ladder', '사다리 타기', '순서와 당번 정하기', '재미', true, '테스트와 뽑기'],
  ['ranking', '게임 순위판', '게임마다 10등까지 한눈에', '게임', true, '순위판'],
  ['minesweeper', '지뢰찾기', '깃발 꽂고 지뢰 피하기', '게임', true, '퍼즐'],
  ['mental-math', '암산 속도 게임', '가입 없이 즐기는 무료 게임 · 점수는 화면에만 표시', '게임', true, '퍼즐'],
  ['chosung-quiz', '한글 초성 퀴즈', '가입 없이 즐기는 무료 게임 · 점수는 화면에만 표시', '게임', true, '퍼즐'],
  ['brick-breaker', '벽돌 깨기', '가입 없이 즐기는 무료 게임 · 점수는 화면에만 표시', '게임', true, '액션'],
  ['find-different', '다른 도형 찾기', '가입 없이 즐기는 무료 게임 · 점수는 화면에만 표시', '게임', true, '퍼즐'],
  ['hanoi-tower', '하노이의 탑', '가입 없이 즐기는 무료 게임 · 점수는 화면에만 표시', '게임', true, '퍼즐'],
  ['omok', '오목', '컴퓨터와 오목 한 판', '게임', true, '퍼즐'],
  ['merge-numbers', '숫자 합치기', '같은 숫자를 밀어서 합치기', '게임', true, '퍼즐'],
  ['memory-match', '휴대폰 짝 맞추기', '같은 그림 두 장 찾기', '게임', true, '퍼즐'],
  ['sci-calc', '공학용 계산기', '삼각함수, 로그, 제곱, 괄호', '생활', true, '계산'],
  ['paint', '그림판', '바로 그리고 저장하기', '생활', true, '글과 그림'],
  ['age', '만 나이 계산기', '만 나이, 연 나이, 다음 생일', '생활', true, '계산'],
  ['days-between', '날짜 사이 며칠', '두 날짜 사이의 날 수', '생활', true, '계산'],
  ['percent', '퍼센트 계산기', '몇 %인지, 몇 % 변했는지', '생활', true, '계산'],
  ['lunar-day', '손 없는 날 달력', '이사 날짜 고를 때 보는 음력', '생활', true, '계산'],
  ['deposit-interest', '예적금 이자 계산기', '단리·복리, 세후 이자까지', '생활', true, '계산'],
  ['hourly-wage', '월급 ↔ 시급', '주휴시간 넣어 바꿔 보기', '생활', true, '계산'],
  ['bmi', 'BMI 계산기', '키와 몸무게로 보는 체질량지수', '생활', true, '계산'],
  ['tenure', '근속기간 계산기', '입사일부터 몇 년 몇 개월', '생활', true, '계산'],
  ['workdays', '근무일수 계산기', '두 날짜 사이 평일은 며칠', '생활', true, '계산'],
  ['unit-price', '단위가격 비교', '어느 쪽이 더 싼지', '생활', true, '계산'],
  ['overdue-interest', '연체이자 계산기', '밀린 돈 이자는 얼마인지', '생활', true, '계산'],
  ['future-income', '미래 소득 계산기', '해마다 오르면 앞으로 총소득은', '생활', true, '계산'],
  ['commute', '출퇴근 시간 계산기', '길에서 보내는 시간은 얼마나', '생활', true, '계산'],
  ['trip-expense', '출장비 정산 계산기', '항목별 합계와 하루 평균', '생활', true, '계산'],
  ['fuel-cost', '유류비 계산기', '거리와 연비로 기름값', '생활', true, '계산'],
  ['time-convert', '시간 단위 변환', '초·분·시간·일 바꾸기', '생활', true, '계산'],
  ['length-convert', '길이 단위 변환', 'cm·인치·피트·마일·자', '생활', true, '계산'],
  ['calorie', '하루 칼로리 계산기', '기초대사량과 활동량', '생활', true, '계산'],
  ['auction-loan', '경락잔금대출 한도', '낙찰가로 대출과 내 돈', '부동산', true, '경매'],
  ['bid-price', '경매 적정 입찰가', '목표 수익으로 거꾸로', '부동산', true, '경매'],
  ['auction-cost', '경매 총비용', '낙찰가 말고 더 드는 돈', '부동산', true, '경매'],
  ['auction-dividend', '경매 배당 계산기', '순위대로 얼마씩 받을까', '부동산', true, '경매'],
  ['rebuild-year', '재건축 연한', '몇 년에 가능한지', '부동산', true, '면적과 가격'],
  ['land-share', '대지지분 계산기', '내 집 대지권은 몇 평', '부동산', true, '면적과 가격'],
  ['inherit-share', '법정상속분 계산기', '배우자·자녀 상속 비율', '부동산', true, '살 때와 팔 때'],
  ['building-residual', '건물 잔존가치', '감가상각으로 보는 지금 가치', '부동산', true, '살 때와 팔 때'],
  ['remodel-profit', '리모델링 수익', '사서 고쳐 팔면 얼마 남나', '부동산', true, '살 때와 팔 때'],
  ['appraisal-income', '수익환원법 계산기', '임대수익으로 본 가치', '부동산', true, '감정평가'],
  ['appraisal-cost', '원가법·적산법', '건물 가치와 적산 임대료', '부동산', true, '감정평가'],
  ['appraisal-compare', '비교방식 계산기', '사례 가격을 보정하면', '부동산', true, '감정평가'],
  ['dutch', '더치페이 계산기', '여럿이 나눠 낼 때', '생활', true, '계산'],
  ['count', '글자 수 세기', '띄어쓰기 포함·제외, 낱말, 줄', '생활', true, '글과 그림'],
  ['qr', '큐알코드 만들기', '링크를 큐알코드 그림으로', '생활', true, '글과 그림'],
  ['qr-read', '큐알코드 읽기', '열기 전에 링크 확인', '생활', true, '글과 그림'],
  ['photo-shrink', '사진 용량 줄이기', '사진이 커서 안 올라갈 때', '생활', true, '글과 그림'],
  ['shortcut-windows', '윈도우 단축키', '캡처, 창 나누기, 클립보드 기록', '단축키', true, '컴퓨터'],
  ['shortcut-chrome', '크롬 단축키', '닫은 탭 다시 열기, 시크릿 창', '단축키', true, '컴퓨터'],
  ['shortcut-galaxy', '갤럭시 단축키·숨은 기능', '캡처, 강제 재시작, 커서 이동', '단축키', true, '휴대폰'],
  ['shortcut-iphone', '아이폰 단축키·숨은 기능', '캡처, 강제 재시작, 뒷면 탭', '단축키', true, '휴대폰'],
  ['snake', '뱀 게임', '먹이를 먹고 길어지기', '게임', true, '반응과 손맛'],
  ['tictactoe', '틱택토', '컴퓨터와 세 줄 만들기', '게임', true, '두뇌'],
  ['reaction-time', '반응속도 테스트', '화면이 바뀌면 바로 누르기', '게임', true, '반응과 손맛'],
  ['number-updown', '숫자 맞히기', '업 다운으로 숫자 찾기', '게임', true, '두뇌'],
  ['whack-mole', '두더지 잡기', '튀어나온 두더지 누르기', '게임', true, '반응과 손맛'],
  ['rps', '가위바위보', '컴퓨터와 한 판', '게임', true, '두뇌'],
  ['number-baseball', '숫자 야구', '스트라이크와 볼로 세 자리 맞히기', '게임', true, '두뇌'],
  ['slide-puzzle', '숫자 밀기 퍼즐', '1부터 순서대로 맞추기', '게임', true, '퍼즐'],
  ['lights-out', '불 끄기 퍼즐', '눌러서 모든 불 끄기', '게임', true, '퍼즐'],
  ['color-memory', '색깔 기억하기', '불이 켜진 순서를 따라 누르기', '게임', true, '두뇌'],
  ['sudoku', '스도쿠', '빈칸에 1~9를 채워 보세요', '게임', true, '퍼즐'],
  ['goblin', '고블린 성장기', '선을 이어 고블린 군대 키우기', '게임', true, '퍼즐']
];

// ▼ 게임 순위표 — 2026-10-19 사용자 요청. 서버 주소(RANK_API)가 비어 있으면 순위표 카드는 나오지 않는다.
// 서버를 올린 뒤 주소를 넣는다(예: 'https://jwapyonara-rank.계정이름.workers.dev'). 서버 쪽 게임 목록은 _순위서버/src/index.js의 GAMES와 같게 둔다.
// better: 'high' 클수록 좋음 · 'low' 작을수록 좋음 / unit: 점수 뒤에 붙는 말
var RANK_API = 'https://jwapyonara-rank.kkddss09.workers.dev';
var RANKS = {
  'snake': { label: '뱀 게임 · 점수', better: 'high', unit: '점' },
  'tictactoe': { label: '틱택토 · 최고 연승', better: 'high', unit: '연승' },
  'reaction-time': { label: '반응속도 · 가장 빠른 기록', better: 'low', unit: 'ms' },
  'number-updown': { label: '숫자 맞히기 · 가장 적은 횟수', better: 'low', unit: '번' },
  'whack-mole': { label: '두더지 잡기 · 점수', better: 'high', unit: '점' },
  'rps': { label: '가위바위보 · 최고 연승', better: 'high', unit: '연승' },
  'number-baseball': { label: '숫자 야구 · 가장 적은 횟수', better: 'low', unit: '번' },
  'slide-puzzle': { label: '숫자 밀기 · 가장 적게 움직인 횟수', better: 'low', unit: '번', variants: [{ id: 'slide-puzzle-3', key: 'zw_slide-puzzle_best_3', name: '3×3' }, { id: 'slide-puzzle-4', key: 'zw_slide-puzzle_best_4', name: '4×4' }] },
  'lights-out': { label: '불 끄기 · 가장 적게 누른 횟수', better: 'low', unit: '번' },
  'color-memory': { label: '색깔 기억하기 · 최고 단계', better: 'high', unit: '단계' },
  'realestate-quiz': { label: '부동산 용어 퀴즈 · 맞힌 개수', better: 'high', unit: '개' },
  'pyeong-sense': { label: '평수 감각 · 맞힌 개수', better: 'high', unit: '개' },
  'sudoku': { label: '스도쿠 · 가장 빠른 시간(힌트 없이)', better: 'low', unit: '초', variants: [{ id: 'sudoku-easy', key: 'zw_sudoku_best_easy', name: '쉬움' }, { id: 'sudoku-normal', key: 'zw_sudoku_best_normal', name: '보통' }, { id: 'sudoku-hard', key: 'zw_sudoku_best_hard', name: '어려움' }] },
  'minesweeper': { label: '지뢰찾기 · 가장 빠른 시간', better: 'low', unit: '초', variants: [{ id: 'minesweeper-easy', key: 'zw_minesweeper_best_easy', name: '쉬움 9×9' }, { id: 'minesweeper-med', key: 'zw_minesweeper_best_med', name: '보통 9×13' }] },
  'omok': { label: '오목 · 이긴 판의 가장 적은 수', better: 'low', unit: '수', variants: [{ id: 'omok-easy', key: 'zw_omok_best_easy', name: '쉬움' }, { id: 'omok-hard', key: 'zw_omok_best_hard', name: '어려움' }] },
  'merge-numbers': { label: '숫자 합치기 · 점수', better: 'high', unit: '점', key: 'zw_merge_numbers_best' },
  'memory-match': { label: '휴대폰 짝 맞추기 · 가장 적게 뒤집은 횟수', better: 'low', unit: '번', variants: [{ id: 'memory-match-6', key: 'zw_memory_match_best_6', name: '쉬움 6쌍' }, { id: 'memory-match-8', key: 'zw_memory_match_best_8', name: '보통 8쌍' }] }
};

// ▼ 숫자 도우미 — 도구마다 다시 만들지 않게 여기 둔다
var ZW = {
  LINKS: LINKS, RANK_API: RANK_API, RANKS: RANKS, CATS: CATS, CAT_PATH: CAT_PATH, CAT_DESC: CAT_DESC, CAT_ICON: CAT_ICON, BOARD_OPEN: BOARD_OPEN, NAV_MAIN: NAV_MAIN, NAV_TOOLS_GROUP: NAV_TOOLS_GROUP, TOOLS: TOOLS, YT_LIST: YT_LIST,
  num: function (s) { return Number(String(s).replace(/[^\d]/g, '')) || 0; },                 // "1,500,000" → 1500000
  dec: function (s) { s = String(s).replace(/[^\d.]/g, ''); var i = s.indexOf('.'); return i < 0 ? s : s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, ''); },
  fmt: function (n) { return Math.round(n).toLocaleString('ko-KR'); },                         // 1500000 → "1,500,000"
  pct: function (n, d) { return isFinite(n) ? n.toFixed(d == null ? 1 : d) : '-'; },
  // 큰 돈을 "3억", "3억 5,000만 원"처럼 읽어 준다(만 원 아래는 버린다 — 입력 칸 옆 도움말용)
  read: function (n) {
    if (n < 10000) return '';
    var eok = Math.floor(n / 100000000), man = Math.floor((n % 100000000) / 10000);
    return (eok ? eok.toLocaleString('ko-KR') + '억' : '') + (eok && man ? ' ' : '') + (man ? man.toLocaleString('ko-KR') + '만' : '') + ' 원';
  },
  // 돈 칸: 치는 대로 쉼표를 넣고, 옆 도움말(id+"Hint")이 있으면 "3억 원"처럼 읽어 준다
  money: function (id, onChange) {
    var e = document.getElementById(id), h = document.getElementById(id + 'Hint');
    var hint = function () { var n = ZW.num(e.value); if (h) h.textContent = n < 1000000 ? '' : ZW.read(n); };   // 백만 원 아래는 도움말을 뺀다(69,000원 옆에 "6만 원"이라 나오면 틀려 보인다)
    e.addEventListener('input', function () { e.value = e.value === '' ? '' : ZW.fmt(ZW.num(e.value)); hint(); onChange(); });
    e.addEventListener('focus', function () { e.select(); });
    hint();
    return function () { return ZW.num(e.value); };
  },
  // 소수 칸(이자율, 면적): 숫자와 점만 받고 max를 넘지 않게
  number: function (id, onChange, max) {
    var e = document.getElementById(id);
    e.addEventListener('input', function () { e.value = ZW.dec(e.value); if (max != null && Number(e.value) > max) e.value = String(max); onChange(); });
    e.addEventListener('focus', function () { e.select(); });
    return function () { return Number(e.value) || 0; };
  },
  // 고르는 단추 묶음(.seg). 고른 값(data-t)을 돌려주는 함수를 준다
  seg: function (onChange) {
    var b = document.querySelectorAll('.seg button'), cur = b.length ? b[0].getAttribute('data-t') : '';
    for (var i = 0; i < b.length; i++) b[i].addEventListener('click', function () {
      for (var j = 0; j < b.length; j++) b[j].className = '';
      this.className = 'on'; cur = this.getAttribute('data-t'); onChange();
    });
    return function () { return cur; };
  }
};

// ▼ 계산기 한 쪽을 짧게 만드는 틀. 쪽에는 <div id="app"></div>만 두고 칸 목록과 계산 함수를 넘긴다.
//   fields: [{ id, label, type: 'money'|'num'|'seg', value, unit, max, short, options:[[값, 보이는 글자], …] }]
//           short: true 인 칸은 바로 앞 칸과 한 줄에 나란히 놓인다(개월·%·년처럼 짧은 값에만 쓴다. 돈 칸 둘을 나란히 두지 않는다)
//   compute(v): v.<id> 로 값을 받아 { html: 결과 문장, sub: 덧붙이는 말, rows: [[이름, 값], …], pct: 막대(0~100), pctLabel } 을 돌려준다
ZW.app = function (cfg) {
  var root = document.getElementById('app'), F = cfg.fields, seg = {};
  var field = function (f) {
    if (f.type === 'seg') {
      seg[f.id] = f.options[0][0];
      return '<div class="field"><label>' + f.label + '</label><div class="seg' + (f.options.length === 2 ? ' two' : '') + '" data-id="' + f.id + '">'
        + f.options.map(function (o, k) { return '<button type="button" data-t="' + o[0] + '"' + (k === 0 ? ' class="on"' : '') + '>' + o[1] + '</button>'; }).join('') + '</div></div>';
    }
    return '<div class="field"><label for="' + f.id + '">' + f.label + (f.type === 'money' ? ' <b class="hint" id="' + f.id + 'Hint"></b>' : '') + '</label><div class="inp"><input id="' + f.id + '" inputmode="'
      + (f.type === 'money' ? 'numeric' : 'decimal') + '" value="' + f.value + '"><span>' + f.unit + '</span></div></div>';
  };
  var h = '<section class="result" aria-live="polite"><div class="verdict" id="zv"></div><div class="sub" id="zs"></div><div id="zb"></div><dl class="rows" id="zr"></dl></section><section class="card">';
  for (var i = 0; i < F.length; i++) {
    if (F[i + 1] && F[i + 1].short) { h += '<div class="row2">' + field(F[i]) + field(F[i + 1]) + '</div>'; i++; } else h += field(F[i]);
  }
  root.innerHTML = h + '</section>';

  var get = {};
  var render = function () {
    var v = {}, k;
    for (k in get) v[k] = get[k]();
    for (k in seg) v[k] = seg[k];
    var o = cfg.compute(v) || {};
    document.getElementById('zv').innerHTML = o.html || '숫자를 넣어 보세요';
    document.getElementById('zs').textContent = o.sub || '';
    document.getElementById('zb').innerHTML = o.pct == null || !isFinite(o.pct) ? '' : '<div class="bars"><div class="bar win"><div class="top"><span>' + (o.pctLabel || '') + '</span><b>' + ZW.pct(o.pct) + '%</b></div><div class="track"><div class="fill" style="width:' + Math.max(0, Math.min(100, o.pct)) + '%"></div></div></div></div>';
    document.getElementById('zr').innerHTML = (o.rows || []).map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>'; }).join('');
  };
  F.forEach(function (f) {
    if (f.type === 'money') get[f.id] = ZW.money(f.id, render);
    else if (f.type === 'num') get[f.id] = ZW.number(f.id, render, f.max);
  });
  var groups = root.querySelectorAll('.seg');
  for (var g = 0; g < groups.length; g++) (function (box) {
    var b = box.querySelectorAll('button');
    for (var j = 0; j < b.length; j++) b[j].addEventListener('click', function () {
      for (var m = 0; m < b.length; m++) b[m].className = '';
      this.className = 'on'; seg[box.getAttribute('data-id')] = this.getAttribute('data-t'); render();
    });
  })(groups[g]);
  render();
};

(function () {
  // 이 파일이 있는 곳을 기준으로 사이트 맨 위 폴더를 찾는다(내 컴퓨터에서 열어도, 올린 뒤에도 같게)
  var me = document.currentScript.src;
  var ROOT = me.slice(0, me.indexOf('_common/'));
  var home = ROOT + 'index.html';
  var kakaoOf = function (cat) { return LINKS.kakao[cat] || LINKS.kakao['휴대폰'] || LINKS.cafe; };
  ZW.ROOT = ROOT;

  // 지금 보고 있는 도구(폴더 이름으로 찾는다)와 현재 분야·쪽 위치
  var here = null;
  for (var i = 0; i < TOOLS.length; i++) if (TOOLS[i][0] && location.href.indexOf(ROOT + TOOLS[i][0] + '/') === 0) here = TOOLS[i];
  var cleanHref = location.href.split(/[?#]/)[0];
  var isCatOn = function (c) {
    return Boolean(c && CAT_PATH[c] && ((here && here[3] === c) || location.href.indexOf(ROOT + CAT_PATH[c] + '/') === 0));
  };
  var isBoardOn = location.href.indexOf(ROOT + 'board/') === 0 || location.pathname.indexOf('/board/') === 0;
  var isToolsGroupOn = NAV_TOOLS_GROUP.some(isCatOn);
  var isHomeOn = !here && !isBoardOn && !CATS.some(isCatOn) && (cleanHref === home || cleanHref === ROOT || cleanHref + 'index.html' === home);

  var head = document.createElement('header');
  head.className = 'zw-head';
  head.innerHTML = '<div class="in"><a class="zw-logo" href="' + home + '">좌표<b>나라</b></a><div class="zw-tools"><button type="button" class="zw-pwa" aria-haspopup="dialog">📲 좌표나라 바로가기</button><button type="button" class="zw-theme" role="switch" aria-checked="true" aria-label="다크 모드"><span class="lb">다크</span><span class="sw"></span></button></div><nav class="zw-nav" aria-label="주요 메뉴">'
    + NAV_MAIN.filter(function (c) { return CAT_PATH[c]; }).map(function (c) { return '<a href="' + ROOT + CAT_PATH[c] + '/index.html"' + (isCatOn(c) ? ' class="on"' : '') + '>' + c + '</a>'; }).join('')
    + (BOARD_OPEN ? '<a href="' + ROOT + 'board/index.html"' + (isBoardOn ? ' class="on"' : '') + '>게시판</a>' : '')
    + (NAV_TOOLS_GROUP.length ? '<div class="zw-nav-more"><button type="button" class="zw-nav-btn' + (isToolsGroupOn ? ' on' : '') + '" aria-haspopup="true" aria-expanded="false">도구 <span class="zw-caret" aria-hidden="true">▾</span></button><div class="zw-nav-drop" role="menu" hidden>'
      + NAV_TOOLS_GROUP.filter(function (c) { return CAT_PATH[c]; }).map(function (c) { return '<a role="menuitem" href="' + ROOT + CAT_PATH[c] + '/index.html"' + (isCatOn(c) ? ' class="on"' : '') + '>' + c + '</a>'; }).join('')
      + '</div></div>' : '')
    + '</nav></div>';
  document.body.insertBefore(head, document.body.firstChild);

  // 위쪽 '도구' 펼침 목록 동작(누르면 열리고 바깥 클릭·Esc로 닫힘)
  (function () {
    var wrap = head.querySelector('.zw-nav-more');
    if (!wrap) return;
    var btn = wrap.querySelector('.zw-nav-btn'), drop = wrap.querySelector('.zw-nav-drop');
    function closeDrop() {
      if (drop.hidden) return;
      drop.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var nextOpen = drop.hidden;
      drop.hidden = !nextOpen;
      btn.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (!drop.hidden && !wrap.contains(e.target)) closeDrop();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !drop.hidden) { closeDrop(); btn.focus(); }
    });
  })();

  // 다크 모드 스위치 — 처음 방문하면 켜져(어둡게) 있고, 누르면 끄고 켠다. 고른 것은 이 기기에만 기억한다(localStorage zw-theme)
  (function () {
    var root = document.documentElement, sw = head.querySelector('.zw-theme'), lb = sw.querySelector('.lb');
    var meta = document.querySelector('meta[name="theme-color"]');
    var lightColor = meta ? meta.getAttribute('content') : '#1b64da';
    var apply = function (dark) {
      root.setAttribute('data-theme', dark ? 'dark' : 'light');
      sw.setAttribute('aria-checked', dark ? 'true' : 'false');
      lb.textContent = dark ? '다크 켬' : '다크 끔';
      if (meta) meta.setAttribute('content', dark ? '#0e131c' : lightColor);
    };
    apply(root.getAttribute('data-theme') !== 'light');
    sw.addEventListener('click', function () {
      var dark = root.getAttribute('data-theme') !== 'dark';
      apply(dark);
      try { localStorage.setItem('zw-theme', dark ? 'dark' : 'light'); } catch (e) { /* 저장이 막힌 브라우저에서는 이번 방문에만 적용 */ }
    });
  })();

  // 이 사람이 어떤 도구를 몇 번 열었는지 이 사람의 기기에만 적어 둔다(서버로 보내지 않는다).
  // 첫 화면이 이 숫자로 "자주 쓴 도구"를 앞에 보여 준다. 모든 사람의 합계 순서는 방문 통계를 붙인 뒤 TOOLS의 순서로 맞춘다.
  ZW.uses = function () { try { return JSON.parse(localStorage.getItem('zw-uses') || '{}') || {}; } catch (e) { return {}; } };
  if (here) { try { var u = ZW.uses(); u[here[0]] = (u[here[0]] || 0) + 1; localStorage.setItem('zw-uses', JSON.stringify(u)); } catch (e) { /* 저장이 막힌 브라우저에서는 그냥 넘어간다 */ } }

  // 도구 쪽 아래에 "같은 분류의 다른 도구"를 붙인다 — 한 도구만 쓰고 나가지 않게
  if (here) {
    var others = TOOLS.filter(function (t) { return t[4] && t[0] && t[3] === here[3] && t !== here; });
    if (others.length) {
      var more = document.createElement('section');
      more.className = 'wrap more';
      more.innerHTML = '<h2>다른 ' + here[3] + ' 도구 <a class="allgo" href="' + ROOT + CAT_PATH[here[3]] + '/index.html">' + here[3] + ' 전체 보기</a></h2><div class="tools">' + others.map(function (t) {
        return '<a class="tool" href="' + ROOT + t[0] + '/index.html"><b>' + t[1] + '</b><span>' + t[2] + '</span></a>';
      }).join('') + '</div>';
      document.body.appendChild(more);
    }
  }

  // 옆에서 밀려 나오는 계층 사이드바(분류 > 묶음 > 도구, 조각 순서 바꾸기) — 2026-10-26 사용자 요청. 따로 파일이라 이 줄만 지우면 빠진다
  var sideJs = document.createElement('script');
  sideJs.src = ROOT + '_common/sidebar.js';
  document.body.appendChild(sideJs);
  // 게임 이름 옆에 1·2·3등을 작게 보여 준다(2026-10-26 사용자 요청). 따로 파일이라 이 세 줄만 지우면 빠진다
  var t3Js = document.createElement('script');
  t3Js.src = ROOT + '_common/top3.js';
  document.body.appendChild(t3Js);

  var cat = here ? here[3] : '';
  var kakao = kakaoOf(cat || '휴대폰');
  var out = function (href, text) { return '<a href="' + href + '" target="_blank" rel="noopener">' + text + '</a>'; };

  // 부동산 도구에는 쪽 안에 카톡방 단추가 없으므로, 도구 아래에 부동산 카톡방 단추를 하나 붙인다
  if (cat === '부동산' && LINKS.kakao['부동산'] && !document.querySelector('[data-zw="kakao"]')) {
    var main = document.querySelector('main.wrap');
    if (main) { var cta = document.createElement('a'); cta.className = 'cta'; cta.setAttribute('data-zw', 'kakao'); cta.innerHTML = '부동산 카톡방 들어가기<small>궁금한 것은 카톡방에서 물어보세요</small>'; main.appendChild(cta); }
  }

  var foot = document.createElement('footer');
  foot.className = 'zw-foot';
  // 도구 쪽에서는 그 분류의 카톡방만, 첫 화면에서는 두 방을 다 보여 준다. 휴대폰 시세표는 부동산 쪽에는 안 보인다
  var links = (cat ? out(kakao, cat + ' 카톡방 들어가기') : out(kakaoOf('휴대폰'), '휴대폰 카톡방') + (LINKS.kakao['부동산'] ? out(LINKS.kakao['부동산'], '부동산 카톡방') : ''))
    + (LINKS.cafe && cat !== '부동산' ? out(LINKS.cafe, '오늘 휴대폰 시세표') : '')
    + (cat ? (LINKS.youtube[cat] ? out(LINKS.youtube[cat], cat + ' 정보 유튜브') : '')
           : (LINKS.youtube['휴대폰'] ? out(LINKS.youtube['휴대폰'], '휴대폰 정보 유튜브') : '') + (LINKS.youtube['부동산'] ? out(LINKS.youtube['부동산'], '부동산 정보 유튜브') : ''));
  foot.innerHTML = '<div class="links">' + links + '</div><p>좌표나라 · 휴대폰과 부동산, 무료 도구 모음</p><p>좌표나라® 등록상표 제40-1790026호</p><p>' + (location.pathname.indexOf('/board/') === 0 ? '도구는 가입 없이 쓰고 넣은 값은 저장하지 않습니다. 게시판은 로그인이 필요하며 올린 글·사진·파일은 서버에 저장됩니다.' : '가입 없이 쓰고, 넣은 값은 어디에도 저장하지 않습니다.') + '</p>';
  document.body.appendChild(foot);

  // 휴대폰 아래 고정 탭줄(폭 640px 이하)과 '더보기' 패널
  var tabbar = document.createElement('nav');
  tabbar.className = 'zw-tabbar';
  tabbar.setAttribute('aria-label', '아래 고정 메뉴');
  tabbar.innerHTML = '<a href="' + home + '"' + (isHomeOn ? ' class="on" aria-current="page"' : '') + '><i aria-hidden="true">🏠</i><span>홈</span></a>'
    + NAV_MAIN.filter(function (c) { return CAT_PATH[c]; }).map(function (c) {
      return '<a href="' + ROOT + CAT_PATH[c] + '/index.html"' + (isCatOn(c) ? ' class="on" aria-current="page"' : '') + '><i aria-hidden="true">' + (CAT_ICON[c] || '📌') + '</i><span>' + c + '</span></a>';
    }).join('')
    + (BOARD_OPEN ? '<a href="' + ROOT + 'board/index.html"' + (isBoardOn ? ' class="on" aria-current="page"' : '') + '><i aria-hidden="true">💬</i><span>게시판</span></a>' : '')
    + '<button type="button" class="zw-tab-more' + (isToolsGroupOn ? ' on' : '') + '" aria-haspopup="dialog" aria-expanded="false"><i aria-hidden="true">➕</i><span>더보기</span></button>';
  document.body.appendChild(tabbar);

  var moreSheet = document.createElement('div');
  moreSheet.className = 'zw-more-sheet';
  moreSheet.hidden = true;
  moreSheet.innerHTML = '<div class="zw-more-box" role="dialog" aria-modal="true" aria-labelledby="zwmt">'
    + '<div class="zw-more-top"><b id="zwmt">도구 더보기</b><button type="button" class="zw-more-close" aria-label="닫기">✕</button></div>'
    + '<div class="zw-more-grid">'
    + NAV_TOOLS_GROUP.filter(function (c) { return CAT_PATH[c]; }).map(function (c) {
      return '<a class="zw-more-item' + (isCatOn(c) ? ' on' : '') + '" href="' + ROOT + CAT_PATH[c] + '/index.html"><b>' + (CAT_ICON[c] ? CAT_ICON[c] + ' ' : '') + c + '</b><span>' + (CAT_DESC[c] || '') + '</span></a>';
    }).join('')
    + '</div>'
    + '<button type="button" class="zw-more-pwa" aria-haspopup="dialog">📲 좌표나라 바로가기</button>'
    + '</div>';
  document.body.appendChild(moreSheet);

  var moreBtn = tabbar.querySelector('.zw-tab-more');
  var moreCloseBtn = moreSheet.querySelector('.zw-more-close');
  var morePwaBtn = moreSheet.querySelector('.zw-more-pwa');
  function openMore() {
    moreSheet.hidden = false;
    if (moreBtn) moreBtn.setAttribute('aria-expanded', 'true');
  }
  function closeMore() {
    if (moreSheet.hidden) return;
    moreSheet.hidden = true;
    if (moreBtn) moreBtn.setAttribute('aria-expanded', 'false');
  }
  if (moreBtn) {
    moreBtn.addEventListener('click', function () {
      if (moreSheet.hidden) openMore(); else closeMore();
    });
  }
  if (moreCloseBtn) moreCloseBtn.addEventListener('click', closeMore);
  moreSheet.addEventListener('click', function (e) { if (e.target === moreSheet) closeMore(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !moreSheet.hidden) { closeMore(); if (moreBtn) moreBtn.focus(); }
  });

  // 좌표나라 바로가기(앱 설치) — 브라우저가 멋대로 설치를 권하는 창은 막고(preventDefault), 맨 위 단추를 눌렀을 때만 부드러운 안내창을 띄운다.
  // 모든 쪽에서 쓸 수 있게 manifest와 서비스워커를 여기서 붙인다(쪽에 이미 manifest가 있으면 그것을 쓴다). 이미 설치해서 연 화면에서는 단추를 숨긴다. 2026-10-19 사용자 요청
  (function () {
    var btn = head.querySelector('.zw-pwa');
    var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
    if (!document.querySelector('link[rel="manifest"]')) { var ml = document.createElement('link'); ml.rel = 'manifest'; ml.href = ROOT + 'manifest.json'; document.head.appendChild(ml); }
    if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) { try { navigator.serviceWorker.register(ROOT + 'sw.js').catch(function () {}); } catch (e) {} }
    var deferred = null, ua = navigator.userAgent, ios = /iphone|ipad|ipod/i.test(ua), kakao = /KAKAOTALK/i.test(ua);
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; });

    var sheet = document.createElement('div');
    sheet.className = 'zw-sheet'; sheet.hidden = true;
    sheet.innerHTML = '<div class="box" role="dialog" aria-modal="true" aria-labelledby="zwpt"><h2 id="zwpt">좌표나라 바로가기</h2>'
      + '<p class="lead">휴대폰 첫 화면에 좌표나라를 올려 두면, 아이콘 한 번으로 바로 열려요.</p>'
      + '<ul><li>가입도 결제도 없이 무료예요</li><li>용량은 거의 차지하지 않아요</li><li>마음에 안 들면 아이콘만 지우면 끝이에요</li></ul>'
      + '<button type="button" class="go">내 휴대폰에 바로가기 추가</button>'
      + '<p class="how" role="status"></p>'
      + '<button type="button" class="later">다음에 할게요</button></div>';
    document.body.appendChild(sheet);
    var how = sheet.querySelector('.how');
    function open() { how.textContent = ''; sheet.hidden = false; sheet.querySelector('.go').focus(); }
    function close() { sheet.hidden = true; }
    window.addEventListener('appinstalled', function () { btn.style.display = 'none'; close(); });
    if (standalone) { btn.style.display = 'none'; }
    btn.addEventListener('click', open);
    if (morePwaBtn) {
      morePwaBtn.addEventListener('click', function () {
        closeMore();
        open();
      });
    }
    sheet.addEventListener('click', function (e) { if (e.target === sheet) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    sheet.querySelector('.later').addEventListener('click', close);
    sheet.querySelector('.go').addEventListener('click', function () {
      if (standalone) { how.textContent = '이미 바로가기 앱으로 열고 계세요.'; return; }
      if (deferred) { deferred.prompt(); deferred.userChoice.then(function (c) { deferred = null; if (c && c.outcome === 'accepted') close(); }); how.textContent = ''; return; }
      if (kakao) how.textContent = '카카오톡 안에서는 추가가 안 돼요. 오른쪽 아래 점 세 개(⋮)를 누르고 "다른 브라우저로 열기"를 고른 뒤 다시 눌러 주세요.';
      else if (ios) how.textContent = '화면 아래쪽 공유 단추(네모에 위쪽 화살표)를 누르고 "홈 화면에 추가"를 고르면 끝이에요.';
      else how.textContent = '브라우저 메뉴(점 세 개 ⋮ 또는 줄 세 개 ≡)를 누르고 "홈 화면에 추가" 또는 "앱 설치"를 고르면 끝이에요.';
    });
  })();

  // 게임 순위표 카드(서버 주소가 있을 때만)
  // 내 컴퓨터(localhost)에서 시험할 때만, 저장해 둔 시험 서버 주소를 쓴다
  try { if (/^(localhost|127.0.0.1)$/.test(location.hostname) && localStorage.getItem('zw_rank_api')) ZW.RANK_API = localStorage.getItem('zw_rank_api'); } catch (e) {}
  if (here && RANKS[here[0]] && ZW.RANK_API) {
    ZW.RANK_GAME = here[0];
    var rs = document.createElement('script');
    rs.src = ROOT + '_common/rank.js';
    document.body.appendChild(rs);
  }

  // 쪽 안의 카톡방 단추(data-zw="kakao")에 주소를 넣는다
  var btns = document.querySelectorAll('[data-zw="kakao"]');
  for (var k = 0; k < btns.length; k++) { btns[k].href = kakao; btns[k].target = '_blank'; btns[k].rel = 'noopener'; }
})();

// ▼ 하위 쪽(분류별 첫 화면) 그리기 — phone/·realestate/·life/·shortcuts/·fun/ 의 index.html이 ZW.hub('휴대폰')처럼 부른다
ZW.hub = function (cat) {
  document.body.setAttribute('data-hub', cat);
  var list = document.getElementById('list');
  var base = location.href.slice(0, location.href.lastIndexOf(CAT_PATH[cat] + '/'));
  var ready = function (t) { return t[4] && t[0]; };
  var card = function (t) { return '<a class="tool' + (ready(t) ? '' : ' soon') + '" href="' + (ready(t) ? base + t[0] + '/index.html' : '#') + '"><b>' + t[1] + '</b><span>' + t[2] + '</span></a>'; };
  var uses = ZW.uses ? ZW.uses() : {};
  var mine = TOOLS.filter(function (t) { return t[3] === cat; });
  var groups = {}, order = [];
  mine.forEach(function (t) { if (!groups[t[5]]) { groups[t[5]] = []; order.push(t[5]); } groups[t[5]].push(t); });
  var has = function (g) { return groups[g].some(ready) ? 0 : 1; };
  order.sort(function (a, b) { return has(a) - has(b); });
  var html = '';
  var top = mine.filter(function (t) { return ready(t) && uses[t[0]] > 0; }).sort(function (a, b) { return uses[b[0]] - uses[a[0]]; }).slice(0, 4);
  if (top.length) html += '<section class="cat"><h2>자주 쓴 도구 <small>이 기기에서 많이 연 순서</small></h2><div class="tools" style="margin-top:10px">' + top.map(card).join('') + '</div></section>';
  html += order.map(function (g) {
    groups[g].sort(function (a, b) { return ((ready(a) ? 0 : 1) - (ready(b) ? 0 : 1)) || ((uses[b[0]] || 0) - (uses[a[0]] || 0)); });
    return '<div class="group"><h2>' + g + '</h2><div class="tools">' + groups[g].map(card).join('') + '</div></div>';
  }).join('');
  var yl = YT_LIST[cat], yu = LINKS.youtube[cat];
  if (cat === '휴대폰' || cat === '부동산') {
    html += yl
      ? '<section class="cat"><h2>' + cat + ' 정보 유튜브 <small>새 영상이 올라오면 여기에도 보입니다</small></h2><div class="yt"><iframe loading="lazy" src="https://www.youtube.com/embed/videoseries?list=' + yl + '" title="' + cat + ' 정보 유튜브" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>' + (yu ? '<a class="ytgo" href="' + yu + '" target="_blank" rel="noopener">유튜브에서 ' + cat + ' 영상 더 보기</a>' : '') + '</section>'
      : '<section class="cat"><h2>' + cat + ' 정보 유튜브 <small>준비 중</small></h2><div class="tool soon ytsoon"><b>' + cat + ' 영상</b><span>채널을 준비하고 있습니다. 열리면 여기에서 바로 볼 수 있어요.</span></div></section>';
  }
  list.innerHTML = html;
  var sub = document.getElementById('hubcount'); if (sub) sub.textContent = '쓸 수 있는 도구 ' + mine.filter(ready).length + '개';
};

// ▼ 방문 수 세기(구글 애널리틱스 4). 2026-10-13 붙임 — 이 묶음은 맨 아래에 그대로 둔다. 쪽마다 따로 넣지 않는다.
// GA_ID가 비어 있으면 아무 일도 하지 않는다. jwapyonara.com에서 열렸을 때만 센다(내 컴퓨터에서 열거나 시험할 때는 세지 않는다).
// 바깥 주소에서 불러오는 것은 이 하나뿐이다(방문 수는 세는 곳의 파일을 불러와야만 세어진다). 계산기에 넣은 값은 보내지 않는다.
var GA_ID = 'G-444W8XPZ1Z';   // 예: 'G-XXXXXXXXXX' — 사용자가 구글 애널리틱스에서 받아 알려 준 것을 넣는다
(function () {
  try {
    if (!GA_ID) return;
    var h = location.hostname;
    if (h !== 'jwapyonara.com' && h !== 'www.jwapyonara.com') return;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
    var foot = document.querySelector('.zw-foot');
    if (foot) { var p = document.createElement('p'); p.textContent = '방문 수를 세려고 구글 애널리틱스를 씁니다.'; foot.appendChild(p); }
  } catch (e) {}
})();
