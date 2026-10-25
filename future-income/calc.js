function calcFutureIncome(incomeYear, growthPct, years) {
  if (
    typeof incomeYear !== 'number' || isNaN(incomeYear) || incomeYear <= 0 ||
    typeof growthPct !== 'number' || isNaN(growthPct) || growthPct < -100 ||
    typeof years !== 'number' || isNaN(years)
  ) {
    return { ok: false };
  }

  var numYears = Math.floor(years);
  if (numYears < 1 || numYears > 50) {
    return { ok: false };
  }

  var rows = [];
  var sumRaw = 0;
  var rate = 1 + (growthPct / 100);

  for (var k = 1; k <= numYears; k++) {
    var rawIncome = incomeYear * Math.pow(rate, k - 1);
    sumRaw += rawIncome;
    var roundedIncome = Math.round(rawIncome);
    rows.push({
      year: k,
      income: roundedIncome
    });
  }

  var total = Math.round(sumRaw);
  var last = rows[rows.length - 1].income;

  return {
    ok: true,
    rows: rows,
    total: total,
    last: last
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcFutureIncome: calcFutureIncome
  };
}
