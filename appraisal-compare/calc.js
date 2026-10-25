function calcComparable(casePricePerM2, circumstance, timeAdj, regional, individual, areaM2) {
  if (
    typeof casePricePerM2 !== 'number' || typeof circumstance !== 'number' ||
    typeof timeAdj !== 'number' || typeof regional !== 'number' ||
    typeof individual !== 'number' || typeof areaM2 !== 'number' ||
    isNaN(casePricePerM2) || isNaN(circumstance) || isNaN(timeAdj) ||
    isNaN(regional) || isNaN(individual) || isNaN(areaM2)
  ) {
    return { ok: false };
  }
  if (
    casePricePerM2 <= 0 || circumstance <= 0 || timeAdj <= 0 ||
    regional <= 0 || individual <= 0 || areaM2 <= 0
  ) {
    return { ok: false };
  }

  var rawFactor = circumstance * timeAdj * regional * individual;
  var factor = parseFloat(rawFactor.toFixed(6));
  var unitPrice = Math.round(casePricePerM2 * rawFactor);
  var total = Math.round(casePricePerM2 * rawFactor * areaM2);

  return {
    ok: true,
    unitPrice: unitPrice,
    total: total,
    factor: factor
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcComparable: calcComparable
  };
}
