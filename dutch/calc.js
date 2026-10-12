// 더치페이 계산기 (합친 금액, 사람 수, 올림 단위)
function calcDutch(total, people, unit) {
  var tot = Math.max(0, Number(total) || 0);
  var p = Math.max(1, Math.floor(Number(people) || 1));
  var u = Number(unit) || 100;
  if (u <= 0) u = 1;

  var each = Math.ceil(tot / p / u) * u;
  var collected = each * p;
  var extra = collected - tot;
  var exact = Math.round((tot / p) * 10) / 10;

  return {
    each: each,
    collected: collected,
    extra: extra,
    exact: exact,
    people: p
  };
}

if (typeof module !== 'undefined') {
  module.exports = { calcDutch: calcDutch };
}
