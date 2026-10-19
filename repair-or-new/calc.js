// 수리할까, 새로 살까 — 한 달로 나눠 견준다
// repair: 수리비, keep: 수리하면 더 쓸 개월, price: 새 폰에 실제로 내는 돈, months: 새 폰 쓸 개월, resale: 지금 폰 팔면 받을 돈
function calcRepairOrNew(repair, keep, price, months, resale) {
  var r = Math.max(0, Number(repair) || 0), k = Math.max(0, Number(keep) || 0);
  var p = Math.max(0, Number(price) || 0), m = Math.max(0, Number(months) || 0), s = Math.max(0, Number(resale) || 0);
  if (!k || !m) return { ok: false };
  var repairMonth = Math.round(r / k);
  var newMonth = Math.round(Math.max(0, p - s) / m);
  return { ok: true, repairMonth: repairMonth, newMonth: newMonth, diff: Math.abs(repairMonth - newMonth), better: repairMonth <= newMonth ? 'repair' : 'new' };
}

if (typeof module !== 'undefined') module.exports = { calcRepairOrNew: calcRepairOrNew };
