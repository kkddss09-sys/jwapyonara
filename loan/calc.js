// 대출 한 달 상환액. 이자율은 사용자가 넣는다(정해진 요율이 없다).
// type: 'equal'   원리금균등 — 매달 같은 돈
//       'principal' 원금균등 — 원금을 똑같이 나눠 갚고 이자는 줄어든다
//       'bullet'  만기일시 — 매달 이자만 내고 끝에 원금을 갚는다
function loan(principal, yearRate, years, type) {
  var P = Math.max(0, Number(principal) || 0);
  var n = Math.max(0, Math.round((Number(years) || 0) * 12));
  var r = Math.max(0, Number(yearRate) || 0) / 100 / 12;   // 한 달 이자율
  if (!P || !n) return { first: 0, last: 0, totalInterest: 0, total: 0, months: n };

  if (type === 'bullet') {
    var mi = P * r;
    return { first: Math.round(mi), last: Math.round(P + mi), totalInterest: Math.round(mi * n), total: Math.round(P + mi * n), months: n };
  }
  if (type === 'principal') {
    var part = P / n;
    // 매달 이자 = 남은 원금 × r. 남은 원금은 P, P-part, … 이므로 이자의 합 = r × part × n(n+1)/2
    var ti = r * part * n * (n + 1) / 2;
    return { first: Math.round(part + P * r), last: Math.round(part + part * r), totalInterest: Math.round(ti), total: Math.round(P + ti), months: n };
  }
  // 원리금균등
  var m = r === 0 ? P / n : P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  return { first: Math.round(m), last: Math.round(m), totalInterest: Math.round(m * n - P), total: Math.round(m * n), months: n };
}

// 해마다 남는 원금 배열. [0]은 시작 원금, [k]는 k년 뒤 남은 원금, 마지막은 0.
function loanBalances(principal, yearRate, years, type) {
  var P = Math.max(0, Number(principal) || 0);
  var y = Math.max(0, Math.round(Number(years) || 0));
  var r = Math.max(0, Number(yearRate) || 0);
  if (!P || y < 1) return [];

  var n = y * 12;
  var list = new Array(y + 1);
  list[0] = Math.round(P);

  if (type === 'bullet') {
    for (var k = 1; k < y; k++) list[k] = Math.round(P);
    list[y] = 0;
    return list;
  }

  if (type === 'principal') {
    for (var k = 1; k < y; k++) {
      var m = k * 12;
      list[k] = Math.round(P * (1 - m / n));
    }
    list[y] = 0;
    return list;
  }

  // equal (원리금균등)
  var i = r / 100 / 12;
  if (i === 0) {
    for (var k = 1; k < y; k++) {
      var m = k * 12;
      list[k] = Math.round(P * (1 - m / n));
    }
    list[y] = 0;
    return list;
  }

  var powN = Math.pow(1 + i, n);
  var denom = powN - 1;
  for (var k = 1; k < y; k++) {
    var m = k * 12;
    var powM = Math.pow(1 + i, m);
    list[k] = Math.round(P * (powN - powM) / denom);
  }
  list[y] = 0;
  return list;
}

if (typeof module !== 'undefined') module.exports = { loan: loan, loanBalances: loanBalances };
