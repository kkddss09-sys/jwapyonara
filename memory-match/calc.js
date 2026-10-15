// 휴대폰 짝 맞추기 계산 및 게임 규칙 로직
(function () {
  var ICONS = ['📱', '💻', '⌚', '🎧', '📷', '🔋', '📡', '🖨️'];

  /**
   * 덱 생성
   * @param {number} [pairs=8] - 쌍의 개수 (6 또는 8)
   * @param {function} [rand] - 난수 함수
   * @returns {string[]} 셔플된 카드 배열 (길이 pairs * 2)
   */
  function makeDeck(pairs, rand) {
    var pCount = pairs || 8;
    if (pCount > ICONS.length) pCount = ICONS.length;
    var rnd = rand || Math.random;

    var deck = [];
    for (var i = 0; i < pCount; i++) {
      deck.push(ICONS[i]);
      deck.push(ICONS[i]);
    }

    // Fisher-Yates 셔플
    for (var i = deck.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var temp = deck[i];
      deck[i] = deck[j];
      deck[j] = temp;
    }

    return deck;
  }

  /**
   * 두 카드가 같은 그림인지 확인
   * @param {string} a
   * @param {string} b
   * @returns {boolean}
   */
  function isPair(a, b) {
    return a === b;
  }

  var exportsObj = {
    ICONS: ICONS,
    makeDeck: makeDeck,
    isPair: isPair
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObj;
  }
  if (typeof window !== 'undefined') {
    window.MemoryCalc = exportsObj;
  }
})();
