// 자급제 vs 성지 2년 총비용 계산. 화면과 시험(node)이 같은 함수를 쓴다.
// 식은 설계서.md의 "계산식" 그대로다. 요율은 없고 더하기와 곱하기뿐이다.
var MONTHS = 24;

function clampMonths(n) { n = Math.floor(Number(n) || 0); return Math.max(0, Math.min(MONTHS, n)); }
function won(n) { n = Number(n) || 0; return n < 0 ? 0 : n; }

function calc(v) {
  var keep = clampMonths(v.sjKeep);        // 처음 요금제를 유지하는 개월
  var addKeep = clampMonths(v.sjAddKeep);  // 부가서비스를 유지하는 개월
  var jg = won(v.jgDevice) + won(v.jgPlan) * MONTHS;
  var sj = won(v.sjDevice) + won(v.sjPlan1) * keep + won(v.sjPlan2) * (MONTHS - keep) + won(v.sjAdd) * addKeep;
  var diff = Math.abs(jg - sj);
  return {
    jg: jg, sj: sj, diff: diff,
    perMonth: Math.round(diff / MONTHS),
    winner: jg === sj ? 'same' : (jg < sj ? 'jg' : 'sj')
  };
}

if (typeof module !== 'undefined') module.exports = { calc: calc, MONTHS: MONTHS };
