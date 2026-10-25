function calcRebuild(builtYear, thisYear, requiredYears) {
  if (typeof builtYear !== 'number' || typeof thisYear !== 'number' || typeof requiredYears !== 'number') {
    return { ok: false };
  }
  if (isNaN(builtYear) || isNaN(thisYear) || isNaN(requiredYears)) {
    return { ok: false };
  }
  if (Math.floor(builtYear) !== builtYear || Math.floor(thisYear) !== thisYear) {
    return { ok: false };
  }
  if (builtYear < 1900 || thisYear < 1900 || requiredYears <= 0) {
    return { ok: false };
  }

  var eligibleYear = builtYear + requiredYears;
  var remaining = eligibleYear - thisYear;
  var passed = remaining <= 0;

  return {
    ok: true,
    eligibleYear: eligibleYear,
    remaining: remaining,
    passed: passed
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcRebuild: calcRebuild
  };
}
