function calcOverdue(principal, annualRatePct, days) {
  if (
    typeof principal !== 'number' || isNaN(principal) || principal < 0 ||
    typeof annualRatePct !== 'number' || isNaN(annualRatePct) || annualRatePct < 0 ||
    typeof days !== 'number' || isNaN(days) || days < 0
  ) {
    return { ok: false };
  }

  var interest = Math.round((principal * (annualRatePct / 100) * days) / 365);
  var total = principal + interest;

  return {
    ok: true,
    interest: interest,
    total: total
  };
}

function calcOverdueDates(principal, annualRatePct, startYmd, endYmd) {
  function parseYmd(ymd) {
    if (!ymd || typeof ymd !== 'string') return null;
    var parts = ymd.split('-');
    if (parts.length !== 3) return null;
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    var d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d) || m < 1 || m > 12 || d < 1 || d > 31) return null;
    var dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return dt.getTime();
  }

  var sUtc = parseYmd(startYmd);
  var eUtc = parseYmd(endYmd);
  if (sUtc === null || eUtc === null) {
    return { ok: false };
  }

  if (eUtc < sUtc) {
    return { ok: false };
  }

  var MS_PER_DAY = 86400000;
  var days = Math.round((eUtc - sUtc) / MS_PER_DAY);

  var base = calcOverdue(principal, annualRatePct, days);
  if (!base.ok) {
    return { ok: false };
  }

  return {
    ok: true,
    interest: base.interest,
    total: base.total,
    days: days
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcOverdue: calcOverdue,
    calcOverdueDates: calcOverdueDates
  };
}
