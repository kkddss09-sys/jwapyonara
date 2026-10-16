// 청약 가점 계산 — 기준: 주택공급에 관한 규칙 [별표 1] 가점제 (84점 만점). 형 확인 전.
var CHEONGYAK = { noHouseMax: 32, familyMax: 35, accountMax: 17 };

// 무주택 기간: 집이 있으면 0, 1년 미만 2점, 1년마다 2점씩, 15년 이상 32점
function noHouseScore(hasHouse, years) {
  if (hasHouse) return 0;
  var y = Math.max(0, Number(years) || 0);
  return Math.min(CHEONGYAK.noHouseMax, 2 + 2 * Math.floor(y));
}
// 부양가족 수(본인 제외): 0명 5점, 1명마다 5점, 6명 이상 35점
function familyScore(n) {
  var k = Math.max(0, Math.floor(Number(n) || 0));
  return Math.min(CHEONGYAK.familyMax, 5 + 5 * k);
}
// 청약통장 가입 기간: 6개월 미만 1점, 6개월~1년 2점, 1년부터 1년마다 1점, 15년 이상 17점
function accountScore(years) {
  var m = Math.max(0, Number(years) || 0) * 12;
  if (m < 6) return 1;
  if (m < 12) return 2;
  return Math.min(CHEONGYAK.accountMax, 2 + Math.floor(m / 12));
}
function cheongyak(hasHouse, noHouseYears, family, accountYears) {
  var a = noHouseScore(hasHouse, noHouseYears), b = familyScore(family), c = accountScore(accountYears);
  return { noHouse: a, family: b, account: c, total: a + b + c };
}

if (typeof module !== 'undefined') module.exports = { noHouseScore: noHouseScore, familyScore: familyScore, accountScore: accountScore, cheongyak: cheongyak };
