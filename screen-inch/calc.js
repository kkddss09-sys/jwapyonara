// 화면 크기, 인치를 센티로 — 대각선·가로·세로와 두 화면 넓이 차이
// inch: 대각선 인치, ratio: 긴 쪽 ÷ 짧은 쪽 (19.5:9 → 19.5/9)
function calcScreen(inch, ratio) {
  var d = Math.max(0, Number(inch) || 0) * 2.54, r = Number(ratio) || 19.5 / 9;
  var short = d / Math.sqrt(r * r + 1);
  return { diag: d, width: short, height: short * r };
}
function areaDiff(nowInch, newInch) {
  var a = Number(nowInch) || 0, b = Number(newInch) || 0;
  if (!a || !b) return null;
  return Math.round((b * b / (a * a) - 1) * 1000) / 10;
}

if (typeof module !== 'undefined') module.exports = { calcScreen: calcScreen, areaDiff: areaDiff };
