// 부동산 상담 한 장 — 손님 조건을 한 번 넣으면 여러 계산을 한꺼번에(2026-10-16)
// 쓰는 함수: _common/re-calc.js(monthly, equalPrincipal, gap, gapProfit), cheongyak/calc.js(cheongyak), first-loan/calc.js(fl_principal)
if (typeof module !== 'undefined') {
  var RC = require('../_common/re-calc.js'), CY = require('../cheongyak/calc.js'), FL = require('../first-loan/calc.js');
  var monthly = RC.monthly, equalPrincipal = RC.equalPrincipal, gap = RC.gap, gapProfit = RC.gapProfit, cheongyak = CY.cheongyak, fl_principal = FL.fl_principal;
}

function consult(v) {
  var P = Math.max(0, v.price || 0), r = {};
  // 집
  r.pyeong = v.m2 > 0 ? v.m2 / 3.3058 : 0;
  r.perPyeong = r.pyeong > 0 ? P / r.pyeong : 0;
  // 대출 한도: 집값×LTV, 최대 한도(0이면 없음), 소득 기준(연소득×DSR − 다른 대출 원리금 → 한 달 → 원금)
  r.byLtv = Math.floor(P * Math.max(0, v.ltv || 0) / 100);
  r.byCap = v.cap > 0 ? v.cap : Infinity;
  var payMonth = Math.max(0, (v.income || 0) * Math.max(0, v.dsr || 0) / 100 - (v.other || 0)) / 12;
  r.byDsr = fl_principal(payMonth, v.rate, v.years);
  r.maxLoan = Math.min(r.byLtv, r.byCap, r.byDsr);
  r.why = r.maxLoan === r.byLtv ? '집값 기준(LTV)' : r.maxLoan === r.byCap ? '최대 한도' : '소득 기준(DSR)';
  r.loan = v.want > 0 ? Math.min(v.want, r.maxLoan) : r.maxLoan;
  r.monthly = Math.round(monthly(r.loan, v.rate, v.years));
  var ep = equalPrincipal(r.loan, v.rate, v.years);
  r.epFirst = ep.first;
  r.interest = Math.max(0, Math.round(r.monthly * Math.round((v.years || 0) * 12) - r.loan));
  r.dsrPct = v.income > 0 ? (r.monthly * 12 + (v.other || 0)) / v.income * 100 : NaN;
  r.monthlyUp = Math.round(monthly(r.loan, (v.rate || 0) + 1, v.years));   // 금리 1%p 오르면(변동금리 대비)
  r.need = Math.max(0, P - r.loan) + (v.cost || 0);       // 직접 살 때 필요한 내 돈
  r.left = (v.cash || 0) - r.need;                         // +면 남고 −면 모자람
  // 가진 돈 + 대출로 살 수 있는 집값 최대: 집값 − min(집값×LTV, 한도, 소득 기준) + 부대비용 ≤ 가진 돈
  // ⇔ 집값 ≤ (가진 돈 − 부대비용) ÷ (1 − LTV) 이고 집값 ≤ 가진 돈 − 부대비용 + min(한도, 소득 기준)
  var base = (v.cash || 0) - (v.cost || 0), l = Math.min(1, Math.max(0, v.ltv || 0) / 100);
  r.maxPrice = base <= 0 ? 0 : Math.floor(Math.min(l < 1 ? base / (1 - l) : Infinity, base + Math.min(r.byCap, r.byDsr)));
  // 전세 끼고 살 때(대출 없이)
  var g = gap(P, v.deposit);
  r.jeonseRatio = v.deposit > 0 ? g.ratio : NaN;
  r.gapNeed = v.deposit > 0 ? Math.max(0, P - v.deposit) + (v.cost || 0) : NaN;
  // 팔 때
  r.sale = v.sell > 0 ? gapProfit(P, v.sell, v.hold, v.cost, v.deposit) : null;
  // 청약
  r.cy = cheongyak(v.hasHouse, v.noHouse, v.family, v.account);
  return r;
}

if (typeof module !== 'undefined') module.exports = { consult: consult };
