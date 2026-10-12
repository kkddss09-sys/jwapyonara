function judgeUpgrade(count) {
  var n = Number(count);
  if (isNaN(n) || n < 0) n = 0;
  n = Math.floor(n);

  if (n <= 1) {
    return {
      level: 0,
      title: '아직 쓸 만합니다',
      text: '급하게 바꿀 이유는 없어 보입니다. 배터리만 문제라면 배터리 교체도 방법입니다.'
    };
  } else if (n <= 3) {
    return {
      level: 1,
      title: '슬슬 알아볼 때입니다',
      text: '고쳐 쓰는 값과 새로 사는 값을 견줘 보세요.'
    };
  } else {
    return {
      level: 2,
      title: '바꿀 때가 됐습니다',
      text: '불편을 참는 값이 더 커 보입니다. 어떻게 사는 것이 덜 드는지 계산해 보세요.'
    };
  }
}

if (typeof module !== 'undefined') {
  module.exports = { judgeUpgrade: judgeUpgrade };
}
