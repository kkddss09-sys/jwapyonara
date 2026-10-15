// 지뢰찾기 계산 및 게임 규칙 로직
(function () {
  /**
   * 보드 생성
   * @param {number} w - 가로 크기
   * @param {number} h - 세로 크기
   * @param {number} mines - 지뢰 개수
   * @param {number} safeX - 첫 클릭 X (주변 8칸 포함 안전)
   * @param {number} safeY - 첫 클릭 Y (주변 8칸 포함 안전)
   * @param {function} [rand] - 난수 함수 (기본 Math.random)
   * @returns {number[][]} board[y][x] (-1=지뢰, 0~8=주변 지뢰 수)
   */
  function makeBoard(w, h, mines, safeX, safeY, rand) {
    var rnd = rand || Math.random;
    var board = [];
    for (var y = 0; y < h; y++) {
      var row = [];
      for (var x = 0; x < w; x++) {
        row.push(0);
      }
      board.push(row);
    }

    // safe 구역(안전 영역) 판별: safeX, safeY 및 그 주변 8칸
    function isSafe(x, y) {
      if (safeX == null || safeY == null) return false;
      return Math.abs(x - safeX) <= 1 && Math.abs(y - safeY) <= 1;
    }

    // 지뢰를 놓을 수 있는 후보 위치 수집
    var candidates = [];
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        if (!isSafe(x, y)) {
          candidates.push({ x: x, y: y });
        }
      }
    }

    // 후보 셔플 (Fisher-Yates)
    for (var i = candidates.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var temp = candidates[i];
      candidates[i] = candidates[j];
      candidates[j] = temp;
    }

    // 지뢰 개수만큼 배치
    var placeCount = Math.min(mines, candidates.length);
    for (var m = 0; m < placeCount; m++) {
      var pos = candidates[m];
      board[pos.y][pos.x] = -1;
    }

    // 주변 지뢰 수 계산
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        if (board[y][x] === -1) continue;
        var count = 0;
        for (var dy = -1; dy <= 1; dy++) {
          for (var dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            var nx = x + dx;
            var ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              if (board[ny][nx] === -1) count++;
            }
          }
        }
        board[y][x] = count;
      }
    }

    return board;
  }

  /**
   * 칸 열기
   * @param {number[][]} board - 보드 상태
   * @param {boolean[][]} open - 열림 상태
   * @param {number} x - 열 칸 X
   * @param {number} y - 열 칸 Y
   * @returns {{x: number, y: number}[]} 새로 열린 칸 목록
   */
  function reveal(board, open, x, y) {
    var h = board.length;
    var w = board[0].length;
    if (x < 0 || x >= w || y < 0 || y >= h) return [];
    if (open[y][x]) return [];

    var revealed = [];

    // 지뢰이거나 0보다 큰 숫자인 경우 해당 칸만 열기
    if (board[y][x] === -1 || board[y][x] > 0) {
      open[y][x] = true;
      revealed.push({ x: x, y: y });
      return revealed;
    }

    // 0인 경우 연쇄 열기 (BFS)
    var queue = [{ x: x, y: y }];
    open[y][x] = true;
    revealed.push({ x: x, y: y });

    while (queue.length > 0) {
      var curr = queue.shift();
      var cx = curr.x;
      var cy = curr.y;

      for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          var nx = cx + dx;
          var ny = cy + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            if (!open[ny][nx]) {
              open[ny][nx] = true;
              revealed.push({ x: nx, y: ny });
              if (board[ny][nx] === 0) {
                queue.push({ x: nx, y: ny });
              }
            }
          }
        }
      }
    }

    return revealed;
  }

  /**
   * 승리 여부 판별 (지뢰가 아닌 모든 칸이 열렸는지)
   * @param {number[][]} board - 보드 상태
   * @param {boolean[][]} open - 열림 상태
   * @returns {boolean}
   */
  function isWin(board, open) {
    var h = board.length;
    var w = board[0].length;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        if (board[y][x] !== -1 && !open[y][x]) {
          return false;
        }
      }
    }
    return true;
  }

  var exportsObj = {
    makeBoard: makeBoard,
    reveal: reveal,
    isWin: isWin
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObj;
  }
  if (typeof window !== 'undefined') {
    window.MinesweeperCalc = exportsObj;
  }
})();
