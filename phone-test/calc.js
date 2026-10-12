// 나에게 맞는 폰 테스트 점수 계산
function judgePhone(answers) {
  var ans = Array.isArray(answers) ? answers : [];
  var galaxy = 0;
  var iphone = 0;

  for (var i = 0; i < 5; i++) {
    var a = ans[i];
    if (a === 'A') galaxy++;
    else if (a === 'B') iphone++;
  }

  // 6번 문항: 5번 문항(인덱스 4)의 선택을 따름
  var q5Chosen = ans[4] === 'B' ? 'iphone' : 'galaxy';
  var q6 = ans[5];

  if (q6 === 'A') {
    // 5번에서 고른 쪽에 +1
    if (q5Chosen === 'galaxy') galaxy++;
    else iphone++;
  } else if (q6 === 'B') {
    // 5번에서 고르지 않은 쪽에 +1
    if (q5Chosen === 'galaxy') iphone++;
    else galaxy++;
  }

  var result = 'both';
  if (galaxy - iphone >= 2) {
    result = 'galaxy';
  } else if (iphone - galaxy >= 2) {
    result = 'iphone';
  } else {
    result = 'both';
  }

  return {
    galaxy: galaxy,
    iphone: iphone,
    result: result
  };
}

if (typeof module !== 'undefined') {
  module.exports = { judgePhone: judgePhone };
}
