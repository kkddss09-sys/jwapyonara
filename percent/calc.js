// 퍼센트 계산기 (A의 B%는 얼마, A는 B의 몇 %, A에서 B로 몇 % 변했는지)
function calcPercent(mode, a, b) {
  var na = Number(a);
  var nb = Number(b);

  if (isNaN(na) || isNaN(nb)) {
    return { ok: false, value: 0 };
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  if (mode === 'of') {
    // A의 B%는 얼마
    return { ok: true, value: round2((na * nb) / 100) };
  } else if (mode === 'ratio') {
    // A는 B의 몇 % (B가 0이면 계산 못 함)
    if (nb === 0) {
      return { ok: false, value: 0 };
    }
    return { ok: true, value: round2((na / nb) * 100) };
  } else if (mode === 'change') {
    // A에서 B로 몇 % 변했는지 (A가 0이면 계산 못 함)
    if (na === 0) {
      return { ok: false, value: 0 };
    }
    return { ok: true, value: round2(((nb - na) / na) * 100) };
  }

  return { ok: false, value: 0 };
}

if (typeof module !== 'undefined') {
  module.exports = { calcPercent: calcPercent };
}
