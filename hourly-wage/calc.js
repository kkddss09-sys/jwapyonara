function calcWage(mode, value, weekHours) {
  if (mode !== 'monthToHour' && mode !== 'hourToMonth') {
    return { ok: false };
  }
  if (
    typeof value !== 'number' || isNaN(value) || value <= 0 ||
    typeof weekHours !== 'number' || isNaN(weekHours) || weekHours <= 0 || weekHours > 84
  ) {
    return { ok: false };
  }

  var weeklyHolidayHours = weekHours >= 15 ? Math.min(weekHours / 5, 8) : 0;
  var monthlyHours = Math.round((weekHours + weeklyHolidayHours) * 365 / 7 / 12);

  var hourly = 0;
  var monthly = 0;

  if (mode === 'monthToHour') {
    hourly = Math.round(value / monthlyHours);
    monthly = value;
  } else {
    monthly = Math.round(value * monthlyHours);
    hourly = value;
  }

  return {
    ok: true,
    weeklyHolidayHours: weeklyHolidayHours,
    monthlyHours: monthlyHours,
    hourly: hourly,
    monthly: monthly
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcWage: calcWage
  };
}
