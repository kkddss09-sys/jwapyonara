// 휴대폰 보험, 들까 말까 — 낸 보험료와 고칠 때 드는 돈을 견준다
// monthly: 한 달 보험료, months: 가입 개월, deductible: 한 번 고칠 때 내 부담금, repair: 보험 없이 고치면 드는 돈, times: 고장 날 것 같은 횟수
function calcInsurance(monthly, months, deductible, repair, times) {
  var mo = Math.max(0, Number(monthly) || 0), m = Math.max(0, Number(months) || 0);
  var d = Math.max(0, Number(deductible) || 0), r = Math.max(0, Number(repair) || 0), t = Math.max(0, Number(times) || 0);
  var premium = mo * m;
  var withIns = premium + t * d;
  var without = t * r;
  var breakEven = r > d ? Math.round((premium / (r - d)) * 100) / 100 : null;
  return { premium: premium, withIns: withIns, without: without, diff: Math.abs(withIns - without), better: withIns < without ? 'ins' : 'none', breakEven: breakEven };
}

if (typeof module !== 'undefined') module.exports = { calcInsurance: calcInsurance };
