// AI에게 물어볼 말 만들기 — 빈칸 값으로 질문 글을 짓는다(AI를 부르지 않는다).
// 묶음마다 fields(칸)와 make(값 → 상황·조건·부탁 줄)를 둔다. 화면과 node 시험이 같은 함수를 쓴다.
// 칸 종류: text(글) · money(원) · num(숫자, unit) · pick(고르기, opts)
var ASK = (function () {
  function won(n) { n = Math.round(Number(n) || 0); return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '원'; }
  function has(v) { return v !== undefined && v !== null && String(v).trim() !== '' && v !== 0 && v !== '0'; }
  function line(label, v, fmt) { return has(v) ? '- ' + label + ': ' + (fmt ? fmt(v) : String(v).trim()) : null; }

  var TOPICS = [
    {
      id: 'pick', name: '나에게 맞는 폰 고르기', who: '새 폰을 사려는데 무엇을 골라야 할지 모를 때',
      fields: [
        { id: 'now', type: 'text', label: '지금 쓰는 폰', def: '갤럭시 S22', ph: '예: 아이폰 13' },
        { id: 'use', type: 'text', label: '주로 하는 것', def: '사진, 유튜브, 카톡', ph: '예: 게임, 업무 전화' },
        { id: 'want', type: 'pick', label: '가장 중요한 것', opts: ['카메라', '배터리', '가벼움', '큰 화면', '오래 쓰기'], def: '배터리' },
        { id: 'brand', type: 'pick', label: '브랜드', opts: ['갤럭시', '아이폰', '상관없음'], def: '상관없음' },
        { id: 'years', type: 'num', label: '한 번 사면 쓰는 기간', unit: '년', def: 3 },
        { id: 'budget', type: 'money', label: '생각하는 예산 (몰라도 됨)', def: 0 }
      ],
      make: function (v) {
        return {
          situation: '새 휴대폰을 사려고 합니다. 어떤 기종이 저에게 맞는지 고르는 것을 도와주세요.',
          facts: [line('지금 쓰는 폰', v.now), line('주로 하는 것', v.use), line('가장 중요한 것', v.want),
            line('원하는 브랜드', v.brand), line('한 번 사면 쓰는 기간', v.years, function (x) { return x + '년'; }),
            line('예산', v.budget, won)],
          asks: ['제 조건에 맞는 기종 두세 개와 각각을 고른 이유', '제가 지금 폰에서 바꾸면 실제로 달라지는 점', '사기 전에 매장에서 꼭 확인할 것']
        };
      }
    },
    {
      id: 'quote', name: '매장 견적이 괜찮은지', who: '매장에서 조건을 들었는데 괜찮은 건지 모를 때',
      fields: [
        { id: 'model', type: 'text', label: '기종과 용량', def: '갤럭시 S26 256GB', ph: '예: 아이폰 17 128GB' },
        { id: 'how', type: 'pick', label: '개통 방법', opts: ['기기변경', '번호이동', '신규'], def: '기기변경' },
        { id: 'plan', type: 'money', label: '요금제 한 달 금액', def: 69000 },
        { id: 'keep', type: 'num', label: '요금제를 유지해야 하는 기간', unit: '개월', def: 6 },
        { id: 'inst', type: 'num', label: '할부 기간', unit: '개월', def: 24 },
        { id: 'monthly', type: 'money', label: '매장에서 들은 한 달 납부액', def: 92000 },
        { id: 'extra', type: 'text', label: '같이 들라고 한 것 (없으면 비워 두기)', def: '부가서비스 2개', ph: '예: 보험, 부가서비스' }
      ],
      make: function (v) {
        return {
          situation: '휴대폰을 바꾸려고 매장에서 조건을 들었습니다. 이 조건이 어떤 내용인지 이해하고 싶습니다.',
          facts: [line('기종', v.model), line('개통 방법', v.how), line('요금제', v.plan, function (x) { return '한 달 ' + won(x); }),
            line('요금제 유지 기간', v.keep, function (x) { return x + '개월'; }), line('할부 기간', v.inst, function (x) { return x + '개월'; }),
            line('들은 한 달 납부액', v.monthly, won), line('같이 들라고 한 것', v.extra)],
          asks: ['이 한 달 납부액에 무엇이 들어 있을 수 있는지(기기값 할부, 할부 이자, 요금제, 부가서비스로 나눠서)', '전체 기간 동안 내는 돈을 어떻게 계산하면 되는지', '계약 전에 매장에 꼭 물어봐야 할 것과 계약서에서 확인할 줄']
        };
      }
    },
    {
      id: 'plan', name: '요금제 줄이기', who: '휴대폰 요금이 많이 나와서 줄이고 싶을 때',
      fields: [
        { id: 'fee', type: 'money', label: '지금 한 달 요금 (기기값 빼고)', def: 89000 },
        { id: 'gb', type: 'num', label: '한 달 데이터 사용량', unit: 'GB', def: 15 },
        { id: 'call', type: 'pick', label: '통화', opts: ['많이', '보통', '적게'], def: '보통' },
        { id: 'family', type: 'pick', label: '가족 결합 할인', opts: ['받고 있음', '안 받음', '모름'], def: '모름' },
        { id: 'left', type: 'num', label: '약정이 남은 기간 (모르면 0)', unit: '개월', def: 0 }
      ],
      make: function (v) {
        return {
          situation: '휴대폰 요금을 줄이고 싶습니다. 제 사용량에 맞게 요금을 낮추는 방법을 알려 주세요.',
          facts: [line('지금 한 달 요금(기기값 제외)', v.fee, won), line('한 달 데이터 사용량', v.gb, function (x) { return x + 'GB'; }),
            line('통화량', v.call), line('가족 결합 할인', v.family), line('약정 남은 기간', v.left, function (x) { return x + '개월'; })],
          asks: ['제 사용량이면 어느 정도 요금제가 맞는지(데이터 기준)', '요금제를 바꿀 때 약정 할인이나 위약금에 영향이 있는지 확인하는 방법', '통신사 고객센터에 전화해서 물어볼 말']
        };
      }
    },
    {
      id: 'apt', name: '이 아파트 살까', who: '아파트를 살지 말지 고민될 때',
      fields: [
        { id: 'where', type: 'text', label: '지역과 단지', def: '서울 노원구 ○○아파트', ph: '예: 노원구 상계동 ○○단지' },
        { id: 'size', type: 'num', label: '전용면적', unit: '㎡', def: 59 },
        { id: 'cash', type: 'money', label: '가진 돈 (내 돈)', def: 200000000 },
        { id: 'loan', type: 'money', label: '생각하는 대출', def: 300000000 },
        { id: 'work', type: 'text', label: '출퇴근하는 곳', def: '강남역', ph: '예: 종로' },
        { id: 'family', type: 'text', label: '함께 살 가족', def: '부부와 아이 1명', ph: '예: 혼자' },
        { id: 'stay', type: 'num', label: '살 계획인 기간', unit: '년', def: 5 }
      ],
      make: function (v) {
        return {
          situation: '아파트를 살지 고민하고 있습니다. 결정하기 전에 무엇을 따져 봐야 하는지 정리해 주세요.',
          facts: [line('지역과 단지', v.where), line('전용면적', v.size, function (x) { return x + '㎡'; }), line('가진 돈', v.cash, won),
            line('생각하는 대출', v.loan, won), line('출퇴근하는 곳', v.work), line('함께 살 가족', v.family),
            line('살 계획인 기간', v.stay, function (x) { return x + '년'; })],
          asks: ['이 조건에서 집을 고를 때 따져 볼 것(교통, 학교, 연식, 관리비, 주변 공급 등)을 순서대로', '대출을 이만큼 받으면 한 달 상환액과 생활비 부담을 어떻게 계산해 보면 되는지', '집을 보러 가서 확인할 것과 중개사무소에 물어볼 것']
        };
      }
    },
    {
      id: 'jeonse', name: '전세 계약 전에 확인할 것', who: '전세 계약을 앞두고 불안할 때',
      fields: [
        { id: 'kind', type: 'pick', label: '집 종류', opts: ['아파트', '빌라', '오피스텔'], def: '빌라' },
        { id: 'deposit', type: 'money', label: '전세 보증금', def: 250000000 },
        { id: 'price', type: 'money', label: '그 집 매매가 (아는 만큼, 몰라도 됨)', def: 0 },
        { id: 'term', type: 'num', label: '계약 기간', unit: '년', def: 2 },
        { id: 'worry', type: 'text', label: '걱정되는 것', def: '집주인이 보증금을 안 돌려줄까 봐', ph: '예: 대출이 많은 집 같음' }
      ],
      make: function (v) {
        return {
          situation: '전세 계약을 하려고 합니다. 보증금을 지키려면 계약 전에 무엇을 확인해야 하는지 알려 주세요.',
          facts: [line('집 종류', v.kind), line('전세 보증금', v.deposit, won), line('그 집 매매가', v.price, won),
            line('계약 기간', v.term, function (x) { return x + '년'; }), line('걱정되는 것', v.worry)],
          asks: ['계약 전에 확인할 서류와 보는 법(등기부등본 등)을 순서대로', '보증금을 지키는 방법(보증보험, 전입신고·확정일자 등)과 언제 해야 하는지', '집주인과 중개사무소에 물어볼 것']
        };
      }
    }
  ];

  // 묶음 id와 값 → 붙여 넣을 질문 글
  function build(id, v) {
    var t = TOPICS.filter(function (x) { return x.id === id; })[0];
    if (!t) return '';
    v = v || {};
    var m = t.make(v), facts = m.facts.filter(Boolean);
    var out = [m.situation, ''];
    if (facts.length) out.push('[제 조건]', facts.join('\n'), '');
    out.push('[알고 싶은 것]');
    m.asks.forEach(function (a, i) { out.push((i + 1) + '. ' + a); });
    out.push('', '[답할 때 부탁]',
      '- 처음 하는 사람도 알게 쉬운 말로, 번호를 붙여 짧게 답해 주세요.',
      '- 확실하지 않은 것은 "확실하지 않음"이라고 표시해 주세요. 가격·금리·제도는 바뀔 수 있으니 어디서 확인하면 되는지도 알려 주세요.',
      '- 더 알아야 정확히 답할 수 있으면, 답하기 전에 저에게 먼저 물어봐 주세요.');
    return out.join('\n');
  }

  function defaults(id) {
    var t = TOPICS.filter(function (x) { return x.id === id; })[0], v = {};
    if (t) t.fields.forEach(function (f) { v[f.id] = f.def; });
    return v;
  }

  return { TOPICS: TOPICS, build: build, defaults: defaults, won: won };
})();
if (typeof module !== 'undefined') module.exports = ASK;
