// 생애최초 주택 구입 대출 한도 어림 — 셋 중 가장 작은 값
//   ① 집값 × LTV  ② 상품·지역 최대 한도  ③ 소득으로 갚을 수 있는 원금(연소득 × DSR ÷ 12를 한 달 상환액으로 보고 거꾸로)
// 비율·한도는 지역·상품·때에 따라 바뀌므로 화면에서 사람이 넣는다(기본값은 확인 중).
var FIRST_LOAN = { ltv: 70, cap: 600000000, dsr: 40, rate: 4, years: 30 };   // 기본값(확인 중)

function fl_pos(x) { return Math.max(0, Number(x) || 0); }
function fl_monthly(P, ratePct, years) {
  var n = Math.round(fl_pos(years) * 12), r = fl_pos(ratePct) / 100 / 12;
  if (!P || !n) return 0;
  return r === 0 ? P / n : P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}
function fl_principal(pay, ratePct, years) {
  var n = Math.round(fl_pos(years) * 12), r = fl_pos(ratePct) / 100 / 12;
  if (!pay || !n) return 0;
  return Math.floor(r === 0 ? pay * n : pay * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n)));
}
function firstLoan(price, ltvPct, cap, income, dsrPct, ratePct, years) {
  var byLtv = Math.floor(fl_pos(price) * fl_pos(ltvPct) / 100);
  var byCap = fl_pos(cap) > 0 ? fl_pos(cap) : Infinity;   // 0이면 한도 없음
  var byDsr = fl_principal(fl_pos(income) * fl_pos(dsrPct) / 100 / 12, ratePct, years);
  var loan = Math.min(byLtv, byCap, byDsr);
  var why = loan === byLtv ? '집값 기준(LTV)' : loan === byCap ? '최대 한도' : '소득 기준(DSR)';
  return { byLtv: byLtv, byCap: byCap, byDsr: byDsr, loan: loan, why: why,
    monthly: Math.round(fl_monthly(loan, ratePct, years)), mine: Math.max(0, fl_pos(price) - loan) };
}

if (typeof module !== 'undefined') module.exports = { firstLoan: firstLoan, fl_monthly: fl_monthly, fl_principal: fl_principal };
