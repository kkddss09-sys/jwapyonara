// 평 ↔ 제곱미터. 1평 = 400/121 ㎡ (약 3.3058㎡) — 법으로 정해진 환산값이라 바뀌지 않는다.
var M2_PER_PYEONG = 400 / 121;

function round2(n) { return Math.round(n * 100) / 100; }
function toM2(pyeong) { var p = Number(pyeong); return isFinite(p) && p > 0 ? round2(p * M2_PER_PYEONG) : 0; }
function toPyeong(m2) { var m = Number(m2); return isFinite(m) && m > 0 ? round2(m / M2_PER_PYEONG) : 0; }

if (typeof module !== 'undefined') module.exports = { toM2: toM2, toPyeong: toPyeong, M2_PER_PYEONG: M2_PER_PYEONG };
