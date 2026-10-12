var CONFIG = { LEAP_BIRTHDAY_IN_COMMON_YEAR: 'mar1' }; // 2월 29일생은 평년에 3월 1일부터 한 살 더 — 확인 필요

function calcAge(birthStr, todayStr) {
  if (!birthStr || typeof birthStr !== 'string') {
    return { ok: false };
  }

  var bParts = birthStr.split('-');
  if (bParts.length !== 3) {
    return { ok: false };
  }

  var by = parseInt(bParts[0], 10);
  var bm = parseInt(bParts[1], 10);
  var bd = parseInt(bParts[2], 10);

  if (isNaN(by) || isNaN(bm) || isNaN(bd) || bm < 1 || bm > 12 || bd < 1 || bd > 31) {
    return { ok: false };
  }

  var bDate = new Date(Date.UTC(by, bm - 1, bd));
  if (bDate.getUTCFullYear() !== by || bDate.getUTCMonth() !== bm - 1 || bDate.getUTCDate() !== bd) {
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

  var birthUtc = Date.UTC(by, bm - 1, bd);
  var todayUtc = Date.UTC(ty, tm - 1, td);

  if (birthUtc > todayUtc) {
    return { ok: false };
  }

  function isLeapYear(y) {
    return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
  }

  function getBirthdayInYear(targetY, birthMonth, birthDay) {
    if (birthMonth === 2 && birthDay === 29) {
      if (isLeapYear(targetY)) {
        return { m: 2, d: 29 };
      }
      if (CONFIG.LEAP_BIRTHDAY_IN_COMMON_YEAR === 'mar1') {
        return { m: 3, d: 1 };
      }
      return { m: 2, d: 28 };
    }
    return { m: birthMonth, d: birthDay };
  }

  var MS_PER_DAY = 86400000;
  var yearAge = ty - by;
  var countingAge = yearAge + 1;
  var daysLived = Math.round((todayUtc - birthUtc) / MS_PER_DAY);

  var thisBday = getBirthdayInYear(ty, bm, bd);
  var thisBdayUtc = Date.UTC(ty, thisBday.m - 1, thisBday.d);

  var age = 0;
  var daysToBirthday = 0;

  if (todayUtc === thisBdayUtc) {
    age = yearAge;
    daysToBirthday = 0;
  } else if (todayUtc > thisBdayUtc) {
    age = yearAge;
    var nextBday = getBirthdayInYear(ty + 1, bm, bd);
    var nextBdayUtc = Date.UTC(ty + 1, nextBday.m - 1, nextBday.d);
    daysToBirthday = Math.round((nextBdayUtc - todayUtc) / MS_PER_DAY);
  } else {
    age = yearAge - 1;
    daysToBirthday = Math.round((thisBdayUtc - todayUtc) / MS_PER_DAY);
  }

  return {
    ok: true,
    age: age,
    yearAge: yearAge,
    countingAge: countingAge,
    daysToBirthday: daysToBirthday,
    daysLived: daysLived
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcAge: calcAge,
    CONFIG: CONFIG
  };
}
