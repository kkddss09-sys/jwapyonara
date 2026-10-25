function calcCostMethod(replacementCost, usefulLife, elapsedYears, salvagePct) {
  if (
    typeof replacementCost !== 'number' || typeof usefulLife !== 'number' ||
    typeof elapsedYears !== 'number' || typeof salvagePct !== 'number' ||
    isNaN(replacementCost) || isNaN(usefulLife) || isNaN(elapsedYears) || isNaN(salvagePct)
  ) {
    return { ok: false };
  }
  if (replacementCost <= 0 || usefulLife <= 0 || elapsedYears < 0 || salvagePct < 0 || salvagePct > 100) {
    return { ok: false };
  }
  var salvage = replacementCost * (salvagePct / 100);
  var depreciable = replacementCost - salvage;
  var rawDepreciation = (depreciable / usefulLife) * elapsedYears;
  var depreciation = Math.min(rawDepreciation, depreciable);
  depreciation = Math.round(depreciation);
  var value = replacementCost - depreciation;
  var depRatePct = (depreciation / replacementCost) * 100;

  return {
    ok: true,
    depreciation: depreciation,
    value: value,
    depRatePct: depRatePct
  };
}

function calcRentCost(baseValue, expectedRatePct, costsYear) {
  if (
    typeof baseValue !== 'number' || typeof expectedRatePct !== 'number' || typeof costsYear !== 'number' ||
    isNaN(baseValue) || isNaN(expectedRatePct) || isNaN(costsYear)
  ) {
    return { ok: false };
  }
  if (baseValue <= 0 || expectedRatePct < 0 || costsYear < 0) {
    return { ok: false };
  }
  var rentYear = Math.round((baseValue * expectedRatePct / 100) + costsYear);
  var rentMonth = Math.round(rentYear / 12);

  return {
    ok: true,
    rentYear: rentYear,
    rentMonth: rentMonth
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcCostMethod: calcCostMethod,
    calcRentCost: calcRentCost
  };
}
