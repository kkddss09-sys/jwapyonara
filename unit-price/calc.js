function calcUnitPrice(aPrice, aAmount, bPrice, bAmount, baseAmount) {
  aPrice = Number(aPrice);
  aAmount = Number(aAmount);
  bPrice = Number(bPrice);
  bAmount = Number(bAmount);
  baseAmount = Number(baseAmount);

  if (
    isNaN(aPrice) || isNaN(aAmount) ||
    isNaN(bPrice) || isNaN(bAmount) ||
    isNaN(baseAmount)
  ) {
    return { ok: false };
  }

  if (aPrice <= 0 || aAmount <= 0 || bPrice <= 0 || bAmount <= 0 || baseAmount <= 0) {
    return { ok: false };
  }

  var rawA = (aPrice / aAmount) * baseAmount;
  var rawB = (bPrice / bAmount) * baseAmount;

  var aUnit = Math.round(rawA * 100) / 100;
  var bUnit = Math.round(rawB * 100) / 100;

  var cheaper;
  var savePct = 0;

  if (rawA < rawB) {
    cheaper = 'a';
    var expensive = rawB;
    var cheap = rawA;
    savePct = Math.round(((expensive - cheap) / expensive * 100) * 100) / 100;
  } else if (rawB < rawA) {
    cheaper = 'b';
    var expensive = rawA;
    var cheap = rawB;
    savePct = Math.round(((expensive - cheap) / expensive * 100) * 100) / 100;
  } else {
    cheaper = 'same';
    savePct = 0;
  }

  return {
    ok: true,
    aUnit: aUnit,
    bUnit: bUnit,
    cheaper: cheaper,
    savePct: savePct
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcUnitPrice: calcUnitPrice
  };
}
