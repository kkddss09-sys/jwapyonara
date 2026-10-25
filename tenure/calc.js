function calcTenure(startYmd, endYmd) {
  function parseDateYmd(str) {
    if (!str || typeof str !== 'string') return null;
    var trimmed = str.trim();
    var parts = trimmed.split('-');
    if (parts.length !== 3) return null;
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    var d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d) || m < 1 || m > 12 || d < 1 || d > 31) return null;
    var dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return { y: y, m: m, d: d, utc: dt.getTime() };
  }

  var s = parseDateYmd(startYmd);
  var e = parseDateYmd(endYmd);
  if (!s || !e) {
    return { ok: false };
  }

  if (e.utc < s.utc) {
    return { ok: false };
  }

  var MS_PER_DAY = 86400000;
  var totalDays = Math.round((e.utc - s.utc) / MS_PER_DAY);

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
    var nextUtc = addMonthsUtc(s.y, s.m, s.d, mCount + 1);
    if (nextUtc <= e.utc) {
      mCount++;
    } else {
      break;
    }
  }

  var curMonthUtc = addMonthsUtc(s.y, s.m, s.d, mCount);
  var days = Math.round((e.utc - curMonthUtc) / MS_PER_DAY);
  var years = Math.floor(mCount / 12);
  var months = mCount % 12;

  return {
    ok: true,
    years: years,
    months: months,
    days: days,
    totalDays: totalDays
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcTenure: calcTenure
  };
}
