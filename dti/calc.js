function calcDTI(income, principal, ratePct, years, existingInterestYear) {
  if (existingInterestYear === undefined || existingInterestYear === null) {
    existingInterestYear = 0;
  }
  income = Number(income);
  principal = Number(principal);
  ratePct = Number(ratePct);
  years = Number(years);
  existingInterestYear = Number(existingInterestYear);

  if (isNaN(income) || isNaN(principal) || isNaN(ratePct) || isNaN(years) || isNaN(existingInterestYear)) {
    return { ok: false };
  }
  if (income <= 0 || principal < 0 || years <= 0 || ratePct < 0 || existingInterestYear < 0) {
    return { ok: false };
  }

  var n = years * 12;
  var monthlyPayment;
  if (ratePct === 0) {
    monthlyPayment = principal / n;
  } else {
    var r = ratePct / 100 / 12;
    monthlyPayment = (principal * r) / (1 - Math.pow(1 + r, -n));
  }
  var roundedMonthly = Math.round(monthlyPayment);
  var annualPayment = roundedMonthly * 12;
  var dtiPct = ((annualPayment + existingInterestYear) / income) * 100;
  dtiPct = Math.round(dtiPct * 100) / 100;

  return {
    ok: true,
    monthlyPayment: roundedMonthly,
    annualPayment: annualPayment,
    dtiPct: dtiPct
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcDTI: calcDTI
  };
}
