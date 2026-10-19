// 매장 견적 적어 두고 견주기 — 약정 기간 동안 내는 돈 총액
// q: { device: 할부원금, plan1: 처음 요금, keep1: 처음 요금 유지 개월, plan2: 그 뒤 요금, addon: 부가 한 달, addonMonths: 부가 유지 개월, cash: 현금·사은품 }
function calcQuote(q, months) {
  var n = function (x) { return Math.max(0, Number(x) || 0); };
  var m = n(months), k = Math.min(n(q.keep1), m);
  var total = n(q.device) + n(q.plan1) * k + n(q.plan2) * (m - k) + n(q.addon) * Math.min(n(q.addonMonths), m) - n(q.cash);
  return { total: total, perMonth: m ? Math.round(total / m) : 0 };
}

if (typeof module !== 'undefined') module.exports = { calcQuote: calcQuote };
