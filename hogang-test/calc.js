function calcHogang(checked, total) {
  var t = total === undefined ? 8 : Number(total);
  if (isNaN(t) || t <= 0) t = 8;

  if (checked === null || checked === undefined || typeof checked === 'boolean' || checked === '') {
    return { ok: false, score: 0, total: t, level: '', title: '', desc: '' };
  }
  var n = Number(checked);
  if (isNaN(n) || n < 0 || n > t || !isFinite(n) || Math.floor(n) !== n) {
    return { ok: false, score: 0, total: t, level: '', title: '', desc: '' };
  }

  var score = n;
  var level = '';
  var title = '';
  var desc = '';

  if (score <= 2) {
    level = 'low';
    title = '아직은 조심하세요';
    desc = '모르는 것이 많을수록 불리한 조건을 놓치기 쉽습니다. 아래에서 체크하지 못한 것부터 하나씩 알아보세요.';
  } else if (score <= 5) {
    level = 'mid';
    title = '절반은 알고 있어요';
    desc = '기본은 알고 있습니다. 체크하지 못한 것만 채우면 훨씬 든든합니다.';
  } else {
    level = 'high';
    title = '쉽게 속지 않아요';
    desc = '살 때 확인할 것을 잘 알고 있습니다. 계약서 숫자만 한 번 더 보면 됩니다.';
  }

  return {
    ok: true,
    score: score,
    total: t,
    level: level,
    title: title,
    desc: desc
  };
}

if (typeof module !== 'undefined') {
  module.exports = { calcHogang: calcHogang };
}
