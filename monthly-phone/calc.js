// 휴대폰 한 달 납부액 계산 (기기 할부금 + 요금)
// 원금(P), 개월수(n), 연 수수료율(rate, %), 월 요금(plan)
function calcMonthlyPhone(principal, months, annualRate, planFee) {
  var P = Math.max(0, Number(principal) || 0);
  var n = Math.max(1, Math.round(Number(months) || 24));
  var rate = Math.max(0, Number(annualRate) || 0);
  var plan = Math.max(0, Number(planFee) || 0);

  var deviceMonthly = 0;
  var interestTotal = 0;

  if (P > 0) {
    if (rate === 0) {
      deviceMonthly = Math.round(P / n);
      interestTotal = 0;
    } else {
      var r = rate / 100 / 12;
      var pow = Math.pow(1 + r, n);
      deviceMonthly = Math.round(P * r * pow / (pow - 1));
      interestTotal = Math.max(0, deviceMonthly * n - P);
    }
  }

  var monthlyTotal = deviceMonthly + plan;
  var totalPaid = monthlyTotal * n;

  return {
    deviceMonthly: deviceMonthly,
    planFee: plan,
    interestTotal: interestTotal,
    monthlyTotal: monthlyTotal,
    totalPaid: totalPaid,
    months: n
  };
}

if (typeof module !== 'undefined') {
  module.exports = { calcMonthlyPhone: calcMonthlyPhone };
}
