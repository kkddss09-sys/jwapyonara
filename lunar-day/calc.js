var dangiFormatter;
try {
  dangiFormatter = new Intl.DateTimeFormat('ko-KR-u-ca-dangi', {
    month: 'numeric',
    day: 'numeric',
    timeZone: 'UTC'
  });
} catch (e) {
  dangiFormatter = null;
}

function toLunar(ymd) {
  if (!ymd || typeof ymd !== 'string') return { ok: false };
  var parts = ymd.split('-');
  if (parts.length !== 3) return { ok: false };
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  var d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d) || m < 1 || m > 12 || d < 1 || d > 31) {
    return { ok: false };
  }
  var dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return { ok: false };
  }
  if (!dangiFormatter) {
    try {
      dangiFormatter = new Intl.DateTimeFormat('ko-KR-u-ca-dangi', {
        month: 'numeric',
        day: 'numeric',
        timeZone: 'UTC'
      });
    } catch (e) {
      return { ok: false };
    }
  }
  try {
    var p = dangiFormatter.formatToParts(dt);
    var mStr = '';
    var dStr = '';
    for (var i = 0; i < p.length; i++) {
      if (p[i].type === 'month') mStr = p[i].value;
      if (p[i].type === 'day') dStr = p[i].value;
    }
    if (!mStr || !dStr) return { ok: false };
    var leap = mStr.indexOf('윤') !== -1 || mStr.startsWith('윤');
    var monthNum = parseInt(mStr.replace(/[^0-9]/g, ''), 10);
    var dayNum = parseInt(dStr.replace(/[^0-9]/g, ''), 10);
    if (isNaN(monthNum) || isNaN(dayNum)) return { ok: false };
    return {
      ok: true,
      month: monthNum,
      day: dayNum,
      leap: leap
    };
  } catch (err) {
    return { ok: false };
  }
}

function isSonEopneun(lunarDay) {
  var d = parseInt(lunarDay, 10);
  if (isNaN(d)) return false;
  return d === 9 || d === 10 || d === 19 || d === 20 || d === 29 || d === 30;
}

function listMonth(year, month) {
  var y = parseInt(year, 10);
  var m = parseInt(month, 10);
  if (isNaN(y) || isNaN(m) || m < 1 || m > 12) return [];
  var lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var res = [];
  for (var d = 1; d <= lastDay; d++) {
    var ymd = y + '-' + pad(m) + '-' + pad(d);
    var dt = new Date(Date.UTC(y, m - 1, d));
    var lunar = toLunar(ymd);
    var lMonth = lunar.ok ? lunar.month : null;
    var lDay = lunar.ok ? lunar.day : null;
    var leap = lunar.ok ? lunar.leap : false;
    var son = lunar.ok ? isSonEopneun(lDay) : false;
    res.push({
      ymd: ymd,
      weekday: dt.getUTCDay(),
      lunarMonth: lMonth,
      lunarDay: lDay,
      leap: leap,
      son: son
    });
  }
  return res;
}

function nextSon(fromYmd) {
  if (!fromYmd || typeof fromYmd !== 'string') return { ok: false };
  var parts = fromYmd.split('-');
  if (parts.length !== 3) return { ok: false };
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  var d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d) || m < 1 || m > 12 || d < 1 || d > 31) {
    return { ok: false };
  }
  var dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return { ok: false };
  }
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var curTime = dt.getTime();
  for (var i = 1; i <= 40; i++) {
    var nextDt = new Date(curTime + i * 86400000);
    var ny = nextDt.getUTCFullYear();
    var nm = nextDt.getUTCMonth() + 1;
    var nd = nextDt.getUTCDate();
    var nYmd = ny + '-' + pad(nm) + '-' + pad(nd);
    var lunar = toLunar(nYmd);
    if (lunar.ok && isSonEopneun(lunar.day)) {
      return {
        ok: true,
        ymd: nYmd,
        lunarMonth: lunar.month,
        lunarDay: lunar.day
      };
    }
  }
  return { ok: false };
}

if (typeof module !== 'undefined') {
  module.exports = {
    toLunar: toLunar,
    isSonEopneun: isSonEopneun,
    listMonth: listMonth,
    nextSon: nextSon
  };
}
