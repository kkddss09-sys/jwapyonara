// 큐알코드의 칸(검정·흰색) 배열을 만든다. 실제 부호화는 ../_vendor/qrcode.js(qrcode-generator 2.0.4, MIT)가 한다.
// 한글이 깨지지 않게 글자는 UTF-8로 넣는다.
var QR_MAX_CHARS = 500;

function makeQrMatrix(text, level) {
  var lib = (typeof qrcode !== 'undefined') ? qrcode : (typeof require !== 'undefined' ? require('../_vendor/qrcode.js') : null);
  if (!lib) return { ok: false, reason: 'nolib' };
  if (typeof text !== 'string') return { ok: false, reason: 'empty' };
  var t = text.trim();
  if (!t) return { ok: false, reason: 'empty' };
  if (Array.from(t).length > QR_MAX_CHARS) return { ok: false, reason: 'long' };
  var lv = (level === 'L' || level === 'M' || level === 'Q' || level === 'H') ? level : 'M';
  try {
    var qr = lib(0, lv);
    var keep = lib.stringToBytes;
    lib.stringToBytes = lib.stringToBytesFuncs['UTF-8'];
    try { qr.addData(t, 'Byte'); qr.make(); } finally { lib.stringToBytes = keep; }
    var n = qr.getModuleCount();
    var cells = [];
    for (var r = 0; r < n; r++) {
      var row = [];
      for (var c = 0; c < n; c++) row.push(qr.isDark(r, c));
      cells.push(row);
    }
    return { ok: true, size: n, cells: cells, text: t };
  } catch (e) {
    return { ok: false, reason: 'long' };
  }
}

// 링크처럼 보이는지(안내 문구를 고르는 데만 쓴다)
function looksLikeLink(text) {
  return /^https?:\/\/\S+$/i.test(String(text || '').trim());
}

if (typeof module !== 'undefined') module.exports = { makeQrMatrix: makeQrMatrix, looksLikeLink: looksLikeLink, QR_MAX_CHARS: QR_MAX_CHARS };
