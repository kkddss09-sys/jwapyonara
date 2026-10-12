// 요금제 바꾸면 얼마 차이 계산 (한 달 차이, 약정 기간 차이, 총합)
// now: 지금 내는 한 달 요금, next: 바꾸려는 한 달 요금, months: 약정 개월 수
function calcPlanDiff(now, next, months) {
  var nowFee = Math.max(0, Math.round(Number(now) || 0));
  var nextFee = Math.max(0, Math.round(Number(next) || 0));
  var m = Math.max(1, Math.round(Number(months) || 24));

  var diffMonthly = nowFee - nextFee;
  var diffTotal = diffMonthly * m;
  var nowTotal = nowFee * m;
  var nextTotal = nextFee * m;

  return {
    diffMonthly: diffMonthly,
    diffTotal: diffTotal,
    nowTotal: nowTotal,
    nextTotal: nextTotal,
    months: m
  };
}

if (typeof module !== 'undefined') {
  module.exports = { calcPlanDiff: calcPlanDiff };
}
