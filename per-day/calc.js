// 폰값, 하루로 치면 계산 (기기값, 사용 기간, 중고 판매가 반영)
// price: 기기값, years: 사용할 기간(년), resale: 나중에 팔 때 받을 돈
function calcPerDay(price, years, resale) {
  var p = Math.max(0, Math.round(Number(price) || 0));
  var y = Math.max(1, Math.round(Number(years) || 2));
  var r = Math.max(0, Math.round(Number(resale) || 0));

  var net = Math.max(0, p - r);
  var perDay = Math.round(net / (y * 365));
  var perMonth = Math.round(net / (y * 12));
  var perDayNext = Math.round(net / ((y + 1) * 365));

  return {
    net: net,
    perDay: perDay,
    perMonth: perMonth,
    perDayNext: perDayNext,
    years: y
  };
}

if (typeof module !== 'undefined') {
  module.exports = { calcPerDay: calcPerDay };
}
