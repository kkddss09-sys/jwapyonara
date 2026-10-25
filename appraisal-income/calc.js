function calcDirectCap(noiYear, capRatePct) {
  if (typeof noiYear !== 'number' || typeof capRatePct !== 'number' || isNaN(noiYear) || isNaN(capRatePct)) {
    return { ok: false };
  }
  if (noiYear < 0 || capRatePct <= 0) {
    return { ok: false };
  }
  var value = Math.round(noiYear / (capRatePct / 100));
  return {
    ok: true,
    value: value
  };
}

function calcDCF(noiFirst, growthPct, years, discountPct, terminalValue) {
  if (
    typeof noiFirst !== 'number' || typeof growthPct !== 'number' ||
    typeof years !== 'number' || typeof discountPct !== 'number' ||
    typeof terminalValue !== 'number' ||
    isNaN(noiFirst) || isNaN(growthPct) || isNaN(years) || isNaN(discountPct) || isNaN(terminalValue)
  ) {
    return { ok: false };
  }
  if (noiFirst < 0 || terminalValue < 0 || growthPct < -100 || discountPct <= -100) {
    return { ok: false };
  }
  if (years < 1 || years > 50 || Math.floor(years) !== years) {
    return { ok: false };
  }
  var r = discountPct / 100;
  var g = growthPct / 100;
  var sumPvIncome = 0;
  for (var k = 1; k <= years; k++) {
    var noiK = noiFirst * Math.pow(1 + g, k - 1);
    var pvK = noiK / Math.pow(1 + r, k);
    sumPvIncome += pvK;
  }
  var rawPvTerminal = terminalValue / Math.pow(1 + r, years);
  var pvIncome = Math.round(sumPvIncome);
  var pvTerminal = Math.round(rawPvTerminal);
  var value = Math.round(sumPvIncome + rawPvTerminal);
  return {
    ok: true,
    pvIncome: pvIncome,
    pvTerminal: pvTerminal,
    value: value
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcDirectCap: calcDirectCap,
    calcDCF: calcDCF
  };
}
