function calcRTI(rentIncomeYear, principal, ratePct) {
  rentIncomeYear = Number(rentIncomeYear);
  principal = Number(principal);
  ratePct = Number(ratePct);

  if (isNaN(rentIncomeYear) || isNaN(principal) || isNaN(ratePct)) {
    return { ok: false };
  }
  if (principal * ratePct <= 0 || rentIncomeYear < 0 || principal < 0 || ratePct < 0) {
    return { ok: false };
  }

  var interestYear = Math.round((principal * ratePct) / 100);
  if (interestYear <= 0) {
    return { ok: false };
  }

  var rti = rentIncomeYear / interestYear;
  var rtiPct = rti * 100;

  return {
    ok: true,
    interestYear: interestYear,
    rti: Number(rti.toFixed(4)),
    rtiPct: Number(rtiPct.toFixed(2))
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcRTI: calcRTI
  };
}
