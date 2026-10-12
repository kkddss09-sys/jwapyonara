// 글자 수 세기 (공백 포함, 공백 제외, 단어, 줄, 바이트)
function countText(text) {
  var str = text == null ? '' : String(text);
  if (str === '') {
    return {
      chars: 0,
      noSpace: 0,
      words: 0,
      lines: 0,
      bytes: 0
    };
  }

  // 1. chars: 이모지(서로게이트 페어)도 1글자, 줄바꿈도 1글자
  var chars = Array.from(str).length;

  // 2. noSpace: 띄어쓰기, 탭, 줄바꿈 등 공백 문자를 뺀 글자 수
  var withoutSpaces = str.replace(/\s/g, '');
  var noSpace = Array.from(withoutSpaces).length;

  // 3. words: 공백으로 나눈 덩어리 수 (빈 글이면 0)
  var trimmed = str.trim();
  var words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;

  // 4. lines: 빈 글이면 0, 아니면 줄바꿈 수 + 1
  var normalized = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  var lines = (normalized.match(/\n/g) || []).length + 1;

  // 5. bytes: UTF-8 바이트 수
  var bytes = 0;
  if (typeof TextEncoder !== 'undefined') {
    bytes = new TextEncoder().encode(str).length;
  } else {
    for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i);
      if (code <= 0x7f) {
        bytes += 1;
      } else if (code <= 0x7ff) {
        bytes += 2;
      } else if (code >= 0xd800 && code <= 0xdfff) {
        bytes += 4;
        i++;
      } else {
        bytes += 3;
      }
    }
  }

  return {
    chars: chars,
    noSpace: noSpace,
    words: words,
    lines: lines,
    bytes: bytes
  };
}

if (typeof module !== 'undefined') {
  module.exports = { countText: countText };
}
