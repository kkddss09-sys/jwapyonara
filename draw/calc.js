function parseNames(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  var parts = text.split(/[\r\n,]+/);
  var res = [];
  for (var i = 0; i < parts.length; i++) {
    var item = parts[i].trim();
    if (item.length > 0) {
      res.push(item);
    }
  }
  return res;
}

function pickWinners(names, count, customRnd) {
  if (!names || !Array.isArray(names) || names.length === 0) {
    return [];
  }

  var pool = names.slice();
  var total = pool.length;
  var k = parseInt(count, 10);
  if (isNaN(k) || k < 1) {
    k = 1;
  }
  if (k > total) {
    k = total;
  }

  function getRand() {
    if (typeof customRnd === 'function') {
      return customRnd();
    }
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      var buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return buf[0] / (0xffffffff + 1);
    }
    return Math.random();
  }

  var winners = [];
  for (var i = 0; i < k; i++) {
    var randIdx = i + Math.floor(getRand() * (total - i));
    var temp = pool[i];
    pool[i] = pool[randIdx];
    pool[randIdx] = temp;
    winners.push(pool[i]);
  }

  return winners;
}

if (typeof module !== 'undefined') {
  module.exports = {
    parseNames: parseNames,
    pickWinners: pickWinners
  };
}
