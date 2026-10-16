// 부동산 도구들의 계산. 화면과 시험(node)이 같은 함수를 쓴다.
// 세율·요율처럼 정해진 값은 하나도 없다. 비율은 모두 사용자가 넣는다.
var PYEONG = 400 / 121;   // 1평 = 400/121 ㎡

// 평당 가격: 가격 ÷ 평수
function perPyeong(price, m2) {
  var p = Math.max(0, Number(price) || 0), a = Math.max(0, Number(m2) || 0);
  if (!p || !a) return { pyeong: 0, perPyeong: 0, perM2: 0 };
  var py = a / PYEONG;
  return { pyeong: Math.round(py * 100) / 100, perPyeong: Math.round(p / py), perM2: Math.round(p / a) };
}

// 전세가율과 갭: 전세가 ÷ 매매가, 매매가 − 전세가
function gap(sale, jeonse) {
  var s = Math.max(0, Number(sale) || 0), j = Math.max(0, Number(jeonse) || 0);
  if (!s) return { ratio: 0, gap: 0 };
  return { ratio: j / s * 100, gap: s - j };
}

// 전세 → 월세: (전세금 − 월세 보증금) × 전환율 ÷ 12
function toWolse(jeonse, deposit, ratePct) {
  var diff = Math.max(0, (Number(jeonse) || 0) - (Number(deposit) || 0));
  return Math.round(diff * (Math.max(0, Number(ratePct) || 0) / 100) / 12);
}
// 월세 → 전세: 보증금 + 월세 × 12 ÷ 전환율
function toJeonse(deposit, wolse, ratePct) {
  var r = Math.max(0, Number(ratePct) || 0) / 100;
  if (!r) return 0;
  return Math.round((Number(deposit) || 0) + (Number(wolse) || 0) * 12 / r);
}

// 임대 수익률: (한 해 월세 − 한 해 대출 이자) ÷ (매입가 − 보증금 − 대출금)
function rentYield(price, deposit, wolse, loanAmt, loanRatePct) {
  var P = Math.max(0, Number(price) || 0), D = Math.max(0, Number(deposit) || 0), W = Math.max(0, Number(wolse) || 0);
  var L = Math.max(0, Number(loanAmt) || 0), lr = Math.max(0, Number(loanRatePct) || 0) / 100;
  var income = W * 12, interest = L * lr, mine = P - D - L;
  return { income: income, interest: Math.round(interest), net: Math.round(income - interest), mine: mine, pct: mine > 0 ? (income - interest) / mine * 100 : NaN };
}

// 원리금균등 한 달 상환액(대출 계산기와 같은 식)
function monthly(principal, yearRatePct, years) {
  var P = Math.max(0, Number(principal) || 0), n = Math.max(0, Math.round((Number(years) || 0) * 12)), r = Math.max(0, Number(yearRatePct) || 0) / 100 / 12;
  if (!P || !n) return 0;
  return r === 0 ? P / n : P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

// 소득 대비 상환 비율: (새 대출의 한 해 원리금 + 이미 갚고 있는 한 해 원리금) ÷ 한 해 소득
function burden(income, principal, yearRatePct, years, otherYearly) {
  var I = Math.max(0, Number(income) || 0), m = monthly(principal, yearRatePct, years), other = Math.max(0, Number(otherYearly) || 0);
  var yearly = m * 12 + other;
  return { monthly: Math.round(m), yearly: Math.round(yearly), pct: I > 0 ? yearly / I * 100 : NaN };
}

// ── 2026-10-12 둘째 묶음 ─────────────────────────────────────────────
function pos(x) { return Math.max(0, Number(x) || 0); }
function months(years) { return Math.max(0, Math.round((Number(years) || 0) * 12)); }

// 감당할 수 있는 대출금: 한 달에 낼 수 있는 돈으로 거꾸로 계산(원리금균등)
function affordable(pay, yearRatePct, years) {
  var M = pos(pay), n = months(years), r = pos(yearRatePct) / 100 / 12;
  if (!M || !n) return 0;
  return Math.floor(r === 0 ? M * n : M * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n)));
}

// 금리가 바뀌면: 같은 원금·기간에서 한 달 상환액이 얼마나 달라지나(원리금균등)
function rateChange(principal, yearRatePct, years, deltaPct) {
  var a = monthly(principal, yearRatePct, years), b = monthly(principal, Math.max(0, pos(yearRatePct) + (Number(deltaPct) || 0)), years);
  return { now: Math.round(a), after: Math.round(b), diff: Math.round(b - a), yearDiff: Math.round((b - a) * 12) };
}

// 대출 갈아타기: 남은 원금을 새 금리로 옮길 때. 수수료 = 남은 원금 × 수수료율, 그 밖의 비용은 직접 넣는다
function refinance(balance, years, oldRatePct, newRatePct, feePct, otherCost) {
  var P = pos(balance), n = months(years), a = monthly(P, oldRatePct, years), b = monthly(P, newRatePct, years);
  var cost = P * pos(feePct) / 100 + pos(otherCost), save = (a - b) * n;
  return { old: Math.round(a), neu: Math.round(b), monthSave: Math.round(a - b), cost: Math.round(cost), net: Math.round(save - cost),
           breakeven: a - b > 0 ? Math.ceil(cost / (a - b)) : NaN };
}

// 중도상환: 일부를 먼저 갚고 남은 기간은 그대로 둘 때 줄어드는 한 달 상환액과 이자
function prepay(balance, yearRatePct, years, amount) {
  var P = pos(balance), X = Math.min(P, pos(amount)), n = months(years);
  var a = monthly(P, yearRatePct, years), b = monthly(P - X, yearRatePct, years);
  var before = a * n - P, after = b * n - (P - X);
  return { before: Math.round(a), after: Math.round(b), monthSave: Math.round(a - b), interestSave: Math.round(before - after) };
}

// 전세(대출 이자)와 월세의 한 달 비용 견주기
function jeonseVsWolse(jeonse, mine, loanRatePct, wolse) {
  var loan = Math.max(0, pos(jeonse) - pos(mine)), interest = loan * pos(loanRatePct) / 100 / 12, w = pos(wolse);
  return { loan: loan, interest: Math.round(interest), wolse: w, diff: Math.round(Math.abs(interest - w)), yearDiff: Math.round(Math.abs(interest - w) * 12), winner: Math.round(interest) === w ? 'same' : (interest < w ? 'jeonse' : 'wolse') };
}

// 목표 금액까지 몇 달: 매달 넣고, 한 달마다 수익이 붙는다고 보고 한 달씩 세어 본다(최대 100년)
function savingMonths(target, have, perMonth, yearReturnPct) {
  var T = pos(target), bal = pos(have), add = pos(perMonth), r = pos(yearReturnPct) / 100 / 12, m = 0;
  if (bal >= T) return 0;
  if (!add && !(bal > 0 && r > 0)) return NaN;
  while (bal < T && m < 1200) { bal = bal * (1 + r) + add; m++; }
  return bal >= T ? m : NaN;
}

// 사고판 차익과 한 해 평균 수익률(세금은 넣지 않는다. 비용은 직접 넣은 합계)
function profit(buy, sell, years, cost) {
  var B = pos(buy), S = pos(sell), C = pos(cost), y = Number(years) || 0, gain = S - B - C;
  return { gain: gain, totalPct: B > 0 ? gain / B * 100 : NaN, yearPct: B > 0 && y > 0 && S - C > 0 ? (Math.pow((S - C) / B, 1 / y) - 1) * 100 : NaN };
}

// 건폐율 = 건축면적 ÷ 대지면적, 용적률 = 연면적 ÷ 대지면적
function landRatio(land, building, total) {
  var L = pos(land);
  return { cover: L > 0 ? pos(building) / L * 100 : NaN, floor: L > 0 ? pos(total) / L * 100 : NaN };
}

// 보증금·월세를 몇 % 올리면
function raise(deposit, wolse, pct) {
  var k = 1 + pos(pct) / 100, d = pos(deposit), w = pos(wolse);
  return { deposit: Math.floor(d * k), wolse: Math.floor(w * k), dDiff: Math.floor(d * k) - d, wDiff: Math.floor(w * k) - w };
}

// 분양 대금 나누기: 계약금·중도금 비율과 중도금 횟수를 넣으면 회차별 금액
function installments(price, downPct, midPct, midCount) {
  var P = pos(price), d = Math.min(100, pos(downPct)), m = Math.min(100 - d, pos(midPct)), c = Math.max(1, Math.round(pos(midCount)) || 1);
  var down = Math.round(P * d / 100), mid = Math.round(P * m / 100);
  return { down: down, mid: mid, midEach: Math.round(mid / c), count: c, rest: P - down - mid, restPct: 100 - d - m };
}

// 전용률 = 전용면적 ÷ 공급면적
function exclusiveRatio(exclusive, supply) {
  var e = pos(exclusive), s = pos(supply);
  return { pct: s > 0 ? e / s * 100 : NaN, ePy: Math.round(e / PYEONG * 100) / 100, sPy: Math.round(s / PYEONG * 100) / 100 };
}

// ── 2026-10-12 셋째 묶음 ─────────────────────────────────────────────
// 집값에 비율을 곱한 대출금과, 그때 필요한 내 돈(비율은 사용자가 넣는다)
function ltv(price, ratioPct, cost) {
  var P = pos(price), loan = Math.floor(P * Math.min(100, pos(ratioPct)) / 100);
  return { loan: loan, mine: P - loan + pos(cost) };
}

// 원금균등: 원금을 똑같이 나눠 갚는다. 첫 달·마지막 달 상환액과 이자 합계
function equalPrincipal(principal, yearRatePct, years) {
  var P = pos(principal), n = months(years), r = pos(yearRatePct) / 100 / 12;
  if (!P || !n) return { first: 0, last: 0, interest: 0 };
  var part = P / n;
  return { first: Math.round(part + P * r), last: Math.round(part + part * r), interest: Math.round(r * part * n * (n + 1) / 2) };
}

// 두 방식 견주기
function compareRepay(principal, yearRatePct, years) {
  var P = pos(principal), n = months(years), m = monthly(P, yearRatePct, years), e = equalPrincipal(P, yearRatePct, years);
  var ei = Math.round(m * n - P);
  return { equalMonthly: Math.round(m), equalInterest: P && n ? ei : 0, pFirst: e.first, pLast: e.last, pInterest: e.interest, diff: P && n ? ei - e.interest : 0 };
}

// 원리금균등으로 k년 갚은 뒤 남은 원금과 그때까지 낸 이자
function balanceAfter(principal, yearRatePct, years, afterYears) {
  var P = pos(principal), n = months(years), k = Math.min(n, months(afterYears)), r = pos(yearRatePct) / 100 / 12, m = monthly(P, yearRatePct, years);
  if (!P || !n) return { balance: 0, paidInterest: 0, paidPrincipal: 0 };
  var bal = r === 0 ? P - m * k : P * Math.pow(1 + r, k) - m * (Math.pow(1 + r, k) - 1) / r;
  bal = Math.max(0, bal);
  return { balance: Math.round(bal), paidPrincipal: Math.round(P - bal), paidInterest: Math.round(m * k - (P - bal)) };
}

// 평당 관리비
function mgmtPer(fee, m2) {
  var f = pos(fee), a = pos(m2);
  if (!f || !a) return { perPyeong: 0, perM2: 0, year: f * 12 };
  return { perPyeong: Math.round(f / (a / PYEONG)), perM2: Math.round(f / a), year: f * 12 };
}

// 한 달 주거비 합계와 소득에서 차지하는 비율
function housingCost(repay, mgmt, wolse, etc, income) {
  var total = pos(repay) + pos(mgmt) + pos(wolse) + pos(etc), I = pos(income);
  return { total: total, year: total * 12, pct: I > 0 ? total / I * 100 : NaN };
}

// 거치 기간이 있는 대출: 거치 동안은 이자만, 그 뒤 남은 기간에 원리금균등
function grace(principal, yearRatePct, years, graceYears) {
  var P = pos(principal), n = months(years), g = Math.min(n, months(graceYears)), r = pos(yearRatePct) / 100 / 12;
  if (!P || !n) return { during: 0, after: 0, interest: 0, plain: 0 };
  var during = P * r, rest = n - g, after = rest > 0 ? monthly(P, yearRatePct, rest / 12) : 0;
  var interest = during * g + (rest > 0 ? after * rest - P : 0);
  return { during: Math.round(during), after: Math.round(after), interest: Math.round(interest), plain: Math.round(monthly(P, yearRatePct, years) * n - P), restMonths: rest };
}

// 전세 끼고 사서 팔 때(2026-10-16): 차익은 같고, 실제 들어간 내 돈 = 산 가격 + 든 비용 − 전세 보증금
//   내 돈 대비 = 차익 ÷ 내 돈, 한 해 평균(내 돈 기준) = ((내 돈 + 차익) ÷ 내 돈)^(1÷기간) − 1
//   내 돈이 0 이하(전세가 산 가격 + 비용보다 큼)면 수익률은 계산하지 않는다(NaN)
function gapProfit(buy, sell, years, cost, deposit) {
  var base = profit(buy, sell, years, cost), y = Number(years) || 0;
  var mine = pos(buy) + pos(cost) - pos(deposit), g = base.gain;
  return { gain: g, totalPct: base.totalPct, yearPct: base.yearPct, mine: mine,
    minePct: mine > 0 ? g / mine * 100 : NaN,
    mineYearPct: mine > 0 && y > 0 && mine + g > 0 ? (Math.pow((mine + g) / mine, 1 / y) - 1) * 100 : NaN };
}

if (typeof module !== 'undefined') module.exports = { gapProfit: gapProfit, perPyeong: perPyeong, gap: gap, toWolse: toWolse, toJeonse: toJeonse, rentYield: rentYield, monthly: monthly, burden: burden,
  ltv: ltv, equalPrincipal: equalPrincipal, compareRepay: compareRepay, balanceAfter: balanceAfter, mgmtPer: mgmtPer, housingCost: housingCost, grace: grace,
  affordable: affordable, rateChange: rateChange, refinance: refinance, prepay: prepay, jeonseVsWolse: jeonseVsWolse, savingMonths: savingMonths, profit: profit,
  landRatio: landRatio, raise: raise, installments: installments, exclusiveRatio: exclusiveRatio };
