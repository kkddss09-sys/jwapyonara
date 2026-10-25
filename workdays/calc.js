function calcWorkdays(startYmd, endYmd, holidaysText) {
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
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var canon = y + '-' + pad(m) + '-' + pad(d);
    return { y: y, m: m, d: d, utc: dt.getTime(), canon: canon, dayOfWeek: dt.getUTCDay() };
  }

  var s = parseDateYmd(startYmd);
  var e = parseDateYmd(endYmd);
  if (!s || !e) {
    return { ok: false };
  }

  var swapped = false;
  var sUtc = s.utc;
  var eUtc = e.utc;

  if (sUtc > eUtc) {
    var tmp = sUtc;
    sUtc = eUtc;
    eUtc = tmp;
    swapped = true;
  }

  var MS_PER_DAY = 86400000;
  var calendarDays = Math.round((eUtc - sUtc) / MS_PER_DAY) + 1;

  var weekdays = 0;
  for (var t = sUtc; t <= eUtc; t += MS_PER_DAY) {
    var dObj = new Date(t);
    var day = dObj.getUTCDay();
    if (day >= 1 && day <= 5) {
      weekdays++;
    }
  }

  var holidaysExcluded = 0;
  var holidaySet = {};

  if (holidaysText && typeof holidaysText === 'string') {
    var tokens = holidaysText.split(/[\r\n,]+/);
    for (var i = 0; i < tokens.length; i++) {
      var tok = tokens[i].trim();
      if (!tok) continue;
      var h = parseDateYmd(tok);
      if (!h) {
        return { ok: false };
      }
      if (h.utc >= sUtc && h.utc <= eUtc) {
        if (h.dayOfWeek >= 1 && h.dayOfWeek <= 5) {
          if (!holidaySet[h.canon]) {
            holidaySet[h.canon] = true;
            holidaysExcluded++;
          }
        }
      }
    }
  }

  var workdays = weekdays - holidaysExcluded;

  return {
    ok: true,
    swapped: swapped,
    calendarDays: calendarDays,
    weekdays: weekdays,
    holidaysExcluded: holidaysExcluded,
    workdays: workdays
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcWorkdays: calcWorkdays
  };
}
