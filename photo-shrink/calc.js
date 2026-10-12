// 사진 크기 조절과 파일 용량 표시 계산 함수. 실제 리사이즈는 ../_vendor/pica.min.js가 한다.

function fitSize(width, height, maxLong) {
  var w = Number(width) || 0;
  var h = Number(height) || 0;
  var m = Number(maxLong) || 0;

  w = Math.round(w);
  h = Math.round(h);

  if (w <= 0 || h <= 0) return { w: 0, h: 0 };
  if (m <= 0) return { w: w, h: h };

  var longSide = Math.max(w, h);
  if (longSide > m) {
    var ratio = m / longSide;
    return {
      w: Math.max(1, Math.round(w * ratio)),
      h: Math.max(1, Math.round(h * ratio))
    };
  }

  return { w: w, h: h };
}

function formatBytes(bytes) {
  var b = Number(bytes);
  if (isNaN(b) || b < 0) return '0B';
  if (b < 1024) return Math.round(b) + 'B';
  if (Math.round(b / 1024) < 1024) return Math.round(b / 1024) + 'KB';
  return (b / (1024 * 1024)).toFixed(1) + 'MB';
}

function savedPercent(orig, shrunk) {
  var o = Number(orig) || 0;
  var s = Number(shrunk) || 0;
  if (o <= 0) return 0;
  return Math.round((o - s) / o * 100);
}

if (typeof module !== 'undefined') {
  module.exports = {
    fitSize: fitSize,
    formatBytes: formatBytes,
    savedPercent: savedPercent
  };
}
