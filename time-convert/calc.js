function convertTime(value, unit) {
  value = Number(value);
  if (isNaN(value) || value < 0) {
    return { ok: false };
  }

  var sec;
  if (unit === 'second') {
    sec = value;
  } else if (unit === 'minute') {
    sec = value * 60;
  } else if (unit === 'hour') {
    sec = value * 3600;
  } else if (unit === 'day') {
    sec = value * 86400;
  } else if (unit === 'week') {
    sec = value * 604800;
  } else {
    return { ok: false };
  }

  var seconds = sec;
  var minutes = sec / 60;
  var hours = sec / 3600;
  var days = sec / 86400;
  var weeks = sec / 604800;

  var totalSec = Math.round(sec);
  var h = Math.floor(totalSec / 3600);
  var m = Math.floor((totalSec % 3600) / 60);
  var s = totalSec % 60;
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var hms = h + ':' + pad(m) + ':' + pad(s);

  return {
    ok: true,
    seconds: seconds,
    minutes: minutes,
    hours: hours,
    days: days,
    weeks: weeks,
    hms: hms
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    convertTime: convertTime
  };
}
