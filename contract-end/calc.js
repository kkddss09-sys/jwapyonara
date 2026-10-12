function calcContractEnd(startStr, months, todayStr) {
  if (!startStr || typeof startStr !== 'string') {
    return { ok: false };
  }

  var parts = startStr.split('-');
  if (parts.length !== 3) {
    return { ok: false };
  }

  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  var d = parseInt(parts[2], 10);

  if (isNaN(y) || isNaN(m) || isNaN(d) || m < 1 || m > 12 || d < 1 || d > 31) {
    return { ok: false };
  }

  var chkDate = new Date(Date.UTC(y, m - 1, d));
  if (chkDate.getUTCFullYear() !== y || chkDate.getUTCMonth() !== m - 1 || chkDate.getUTCDate() !== d) {
    return { ok: false };
  }

  var mAdd = parseInt(months, 10);
  if (isNaN(mAdd) || mAdd < 0) {
    return { ok: false };
  }

  var ty, tm, td;
  if (todayStr && typeof todayStr === 'string') {
    var tParts = todayStr.split('-');
    if (tParts.length === 3) {
      ty = parseInt(tParts[0], 10);
      tm = parseInt(tParts[1], 10);
      td = parseInt(tParts[2], 10);
    }
  }

  if (isNaN(ty) || isNaN(tm) || isNaN(td)) {
    var now = new Date();
    ty = now.getFullYear();
    tm = now.getMonth() + 1;
    td = now.getDate();
  }

  var totalMonths = (y * 12) + (m - 1) + mAdd;
  var targetY = Math.floor(totalMonths / 12);
  var targetM = (totalMonths % 12) + 1;

  var lastDayOfTargetMonth = new Date(Date.UTC(targetY, targetM, 0)).getUTCDate();
  var targetD = Math.min(d, lastDayOfTargetMonth);

  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var endDate = targetY + '-' + pad(targetM) + '-' + pad(targetD);

  var MS_PER_DAY = 86400000;
  var startUtc = Date.UTC(y, m - 1, d);
  var endUtc = Date.UTC(targetY, targetM - 1, targetD);
  var todayUtc = Date.UTC(ty, tm - 1, td);

  var daysLeft = Math.round((endUtc - todayUtc) / MS_PER_DAY);
  var passed = daysLeft < 0;

  var totalDays = Math.round((endUtc - startUtc) / MS_PER_DAY);
  var passedDays = Math.round((todayUtc - startUtc) / MS_PER_DAY);
  var percent = 0;

  if (totalDays <= 0) {
    percent = 100;
  } else if (passedDays <= 0) {
    percent = 0;
  } else if (passedDays >= totalDays) {
    percent = 100;
  } else {
    percent = Math.round((passedDays / totalDays) * 100);
  }

  if (percent < 0) percent = 0;
  if (percent > 100) percent = 100;

  return {
    ok: true,
    endDate: endDate,
    daysLeft: daysLeft,
    passed: passed,
    percent: percent
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcContractEnd: calcContractEnd
  };
}
