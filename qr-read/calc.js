// 큐알코드에서 읽은 글자를 분류하고 캔버스 크기를 맞춘다. 실제 읽기는 ../_vendor/jsQR.js가 한다.

function classifyQrText(text) {
  if (typeof text !== 'string') return { kind: 'empty', host: '' };
  var t = text.trim();
  if (!t) return { kind: 'empty', host: '' };

  if (/^https?:\/\/\S+$/i.test(t)) {
    var host = '';
    try {
      var u = new URL(t);
      host = (u.hostname || '').toLowerCase();
    } catch (e) {
      var m = t.match(/^https?:\/\/([^/?#:]+)/i);
      host = m ? m[1].toLowerCase() : '';
    }
    return { kind: 'link', host: host };
  }

  return { kind: 'text', host: '' };
}

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

if (typeof module !== 'undefined') {
  module.exports = {
    classifyQrText: classifyQrText,
    fitSize: fitSize
  };
}
