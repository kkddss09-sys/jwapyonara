function calcDaysBetween(startStr, endStr, includeStart) {
  function parseDateParts(str) {
    if (!str || typeof str !== 'string') return null;
    var parts = str.split('-');
    if (parts.length !== 3) return null;
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    var d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d) || m < 1 || m > 12 || d < 1 || d > 31) return null;
    var chk = new Date(Date.UTC(y, m - 1, d));
    if (chk.getUTCFullYear() !== y || chk.getUTCMonth() !== m - 1 || chk.getUTCDate() !== d) return null;
    return { y: y, m: m, d: d, utc: chk.getTime() };
  }

  var s = parseDateParts(startStr);
  var e = parseDateParts(endStr);
  if (!s || !e) {
    return { ok: false };
  }

  var swapped = false;
  var sy = s.y, sm = s.m, sd = s.d, startUtc = s.utc;
  var ey = e.y, em = e.m, ed = e.d, endUtc = e.utc;

  if (endUtc < startUtc) {
    swapped = true;
    var tempY = sy, tempM = sm, tempD = sd, tempUtc = startUtc;
    sy = ey; sm = em; sd = ed; startUtc = endUtc;
    ey = tempY; em = tempM; ed = tempD; endUtc = tempUtc;
  }

  var MS_PER_DAY = 86400000;
  var diffDays = Math.round((endUtc - startUtc) / MS_PER_DAY);
  var days = includeStart ? (diffDays + 1) : diffDays;
  var weeks = Math.floor(days / 7);
  var restDays = days % 7;

  function addMonthsUtc(y, m, d, mCount) {
    var totalMonths = (y * 12) + (m - 1) + mCount;
    var targetY = Math.floor(totalMonths / 12);
    var targetM = (totalMonths % 12) + 1;
    var lastDayOfTargetMonth = new Date(Date.UTC(targetY, targetM, 0)).getUTCDate();
    var targetD = Math.min(d, lastDayOfTargetMonth);
    return Date.UTC(targetY, targetM - 1, targetD);
  }

  var mCount = 0;
  while (true) {
    var nextUtc = addMonthsUtc(sy, sm, sd, mCount + 1);
    if (nextUtc <= endUtc) {
      mCount++;
    } else {
      break;
    }
  }

  var curMonthUtc = addMonthsUtc(sy, sm, sd, mCount);
  var monthRestDays = Math.round((endUtc - curMonthUtc) / MS_PER_DAY);
  var months = mCount;

  return {
    ok: true,
    days: days,
    swapped: swapped,
    weeks: weeks,
    restDays: restDays,
    months: months,
    monthRestDays: monthRestDays
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcDaysBetween: calcDaysBetween
  };
}
