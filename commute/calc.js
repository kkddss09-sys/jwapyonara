function calcCommute(oneWayMin, daysPerYear, years) {
  if (typeof oneWayMin !== 'number' || isNaN(oneWayMin) ||
      typeof daysPerYear !== 'number' || isNaN(daysPerYear) ||
      typeof years !== 'number' || isNaN(years)) {
    return { ok: false };
  }

  if (oneWayMin <= 0 || daysPerYear <= 0 || daysPerYear > 366 || years <= 0) {
    return { ok: false };
  }

  var dailyMin = oneWayMin * 2;
  var yearMin = dailyMin * daysPerYear;
  var yearHours = yearMin / 60;
  var totalHours = yearHours * years;
  var totalDays24 = totalHours / 24;

  return {
    ok: true,
    dailyMin: dailyMin,
    yearMin: yearMin,
    yearHours: yearHours,
    totalHours: totalHours,
    totalDays24: totalDays24
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcCommute: calcCommute
  };
}
