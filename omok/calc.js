// 오목 규칙 및 AI 계산 모듈
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    var exp = factory();
    root.SIZE = exp.SIZE;
    root.omokNewBoard = exp.omokNewBoard;
    root.omokCheckWin = exp.omokCheckWin;
    root.omokIsFull = exp.omokIsFull;
    root.omokAiMove = exp.omokAiMove;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var SIZE = 13;

  /**
   * 13×13 빈 보드 생성 (0: 빈칸, 1: 흑, 2: 백)
   * @returns {number[][]}
   */
  function omokNewBoard() {
    var b = [];
    for (var r = 0; r < SIZE; r++) {
      var row = [];
      for (var c = 0; c < SIZE; c++) {
        row.push(0);
      }
      b.push(row);
    }
    return b;
  }

  /**
   * (r, c)에 놓인 돌을 기준으로 4방향에서 5개 이상 연속 연결 여부 검사
   * @param {number[][]} board
   * @param {number} r
   * @param {number} c
   * @returns {{ win: boolean, line: number[][] }}
   */
  function omokCheckWin(board, r, c) {
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) {
      return { win: false, line: [] };
    }
    var color = board[r][c];
    if (color === 0) {
      return { win: false, line: [] };
    }

    var directions = [
      { dr: 0, dc: 1 },  // 가로 (-)
      { dr: 1, dc: 0 },  // 세로 (|)
      { dr: 1, dc: 1 },  // 대각선 ↘ (\)
      { dr: -1, dc: 1 }  // 대각선 ↗ (/)
    ];

    var maxLine = [];
    var isWin = false;

    for (var i = 0; i < directions.length; i++) {
      var dr = directions[i].dr;
      var dc = directions[i].dc;

      // 정방향 수집
      var forward = [];
      var step = 1;
      while (true) {
        var nr = r + step * dr;
        var nc = c + step * dc;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) break;
        if (board[nr][nc] === color) {
          forward.push([nr, nc]);
          step++;
        } else {
          break;
        }
      }

      // 역방향 수집
      var backward = [];
      step = 1;
      while (true) {
        var pr = r - step * dr;
        var pc = c - step * dc;
        if (pr < 0 || pr >= SIZE || pc < 0 || pc >= SIZE) break;
        if (board[pr][pc] === color) {
          backward.push([pr, pc]);
          step++;
        } else {
          break;
        }
      }

      // 역방향은 먼 곳부터 가까운 곳 순으로 정렬
      var currentLine = [];
      for (var b = backward.length - 1; b >= 0; b--) {
        currentLine.push(backward[b]);
      }
      currentLine.push([r, c]);
      for (var f = 0; f < forward.length; f++) {
        currentLine.push(forward[f]);
      }

      if (currentLine.length >= 5) {
        isWin = true;
        if (currentLine.length > maxLine.length) {
          maxLine = currentLine;
        }
      }
    }

    return {
      win: isWin,
      line: isWin ? maxLine : []
    };
  }

  /**
   * 판에 빈 칸이 없는지 검사
   * @param {number[][]} board
   * @returns {boolean}
   */
  function omokIsFull(board) {
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) return false;
      }
    }
    return true;
  }

  /**
   * 시드 기반 결정적 난수 생성기 (Mulberry32)
   * @param {number} seed
   * @returns {function(): number} 0 이상 1 미만의 난수
   */
  function mulberry32(seed) {
    var s = (seed !== undefined ? Number(seed) : 12345) >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * (r, c)에 color 돌을 둘 때 4방향의 줄 모양 점수를 합산
   * 모양 점수:
   * 다섯 이상: 100000
   * 열린 넷: 10000, 막힌 넷: 1500
   * 열린 셋: 1200, 막힌 셋: 150
   * 열린 둘: 100, 막힌 둘: 10
   * 외돌: 1
   * @param {number[][]} board
   * @param {number} r
   * @param {number} c
   * @param {number} color
   * @param {boolean} isEasyDefend - true일 경우 열린 셋 이하 항목을 0으로 계산
   * @returns {number}
   */
  function getPatternScore(board, r, c, color, isEasyDefend) {
    var directions = [
      { dr: 0, dc: 1 },  // 가로
      { dr: 1, dc: 0 },  // 세로
      { dr: 1, dc: 1 },  // 대각선 ↘
      { dr: -1, dc: 1 }  // 대각선 ↗
    ];

    var total = 0;

    for (var i = 0; i < directions.length; i++) {
      var dr = directions[i].dr;
      var dc = directions[i].dc;

      // 정방향 연속 돌
      var count1 = 0;
      var step = 1;
      while (true) {
        var nr = r + step * dr;
        var nc = c + step * dc;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) break;
        if (board[nr][nc] === color) {
          count1++;
          step++;
        } else {
          break;
        }
      }
      var end1Open = false;
      var er1 = r + (count1 + 1) * dr;
      var ec1 = c + (count1 + 1) * dc;
      if (er1 >= 0 && er1 < SIZE && ec1 >= 0 && ec1 < SIZE && board[er1][ec1] === 0) {
        end1Open = true;
      }

      // 역방향 연속 돌
      var count2 = 0;
      step = 1;
      while (true) {
        var pr = r - step * dr;
        var pc = c - step * dc;
        if (pr < 0 || pr >= SIZE || pc < 0 || pc >= SIZE) break;
        if (board[pr][pc] === color) {
          count2++;
          step++;
        } else {
          break;
        }
      }
      var end2Open = false;
      var er2 = r - (count2 + 1) * dr;
      var ec2 = c - (count2 + 1) * dc;
      if (er2 >= 0 && er2 < SIZE && ec2 >= 0 && ec2 < SIZE && board[er2][ec2] === 0) {
        end2Open = true;
      }

      var len = 1 + count1 + count2;
      var openEnds = (end1Open ? 1 : 0) + (end2Open ? 1 : 0);

      var score = 0;
      if (len >= 5) {
        score = 100000;
      } else if (len === 4) {
        if (openEnds === 2) score = 10000;
        else if (openEnds === 1) score = 1500;
      } else if (len === 3) {
        if (!isEasyDefend) {
          if (openEnds === 2) score = 1200;
          else if (openEnds === 1) score = 150;
        }
      } else if (len === 2) {
        if (!isEasyDefend) {
          if (openEnds === 2) score = 100;
          else if (openEnds === 1) score = 10;
        }
      } else if (len === 1) {
        if (!isEasyDefend) {
          if (openEnds >= 1) score = 1;
        }
      }

      total += score;
    }

    return total;
  }

  /**
   * AI 착수 위치 결정 함수
   * @param {number[][]} board
   * @param {number} aiColor - 2 (백)
   * @param {string} level - 'easy' | 'normal'
   * @param {number} [seed] - 결정적 난수 시드
   * @returns {{ r: number, c: number } | null}
   */
  function omokAiMove(board, aiColor, level, seed) {
    var rnd = mulberry32(typeof seed === 'number' ? seed : 12345);
    var humanColor = (aiColor === 1 ? 2 : 1);

    // 판 전체 돌 개수 확인
    var totalStones = 0;
    var aiStones = 0;
    var humanStones = 0;
    var firstHumanPos = null;

    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var val = board[r][c];
        if (val !== 0) {
          totalStones++;
          if (val === aiColor) {
            aiStones++;
          } else {
            humanStones++;
            if (!firstHumanPos) {
              firstHumanPos = { r: r, c: c };
            }
          }
        }
      }
    }

    // 1. 판이 비었으면 중앙(6,6)
    if (totalStones === 0) {
      return { r: 6, c: 6 };
    }

    // 2. 사람 돌만 있고 컴퓨터 돌이 없으면 사람 돌 바로 옆(8방향 중 하나)
    if (aiStones === 0 && humanStones > 0 && firstHumanPos) {
      var adjList = [];
      for (var dr = -1; dr <= 1; dr++) {
        for (var dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          var nr = firstHumanPos.r + dr;
          var nc = firstHumanPos.c + dc;
          if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] === 0) {
            adjList.push({ r: nr, c: nc });
          }
        }
      }
      if (adjList.length > 0) {
        var adjIdx = Math.floor(rnd() * adjList.length);
        return adjList[adjIdx];
      }
    }

    // 3. 후보는 이미 놓인 돌에서 2칸 안의 빈 칸만
    var candidates = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (board[r][c] !== 0) continue;
        var hasNear = false;
        for (var dr = -2; dr <= 2 && !hasNear; dr++) {
          for (var dc = -2; dc <= 2 && !hasNear; dc++) {
            var nr = r + dr;
            var nc = c + dc;
            if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && board[nr][nc] !== 0) {
              hasNear = true;
            }
          }
        }
        if (hasNear) {
          candidates.push({ r: r, c: c });
        }
      }
    }

    if (candidates.length === 0) {
      // 후보가 없으면 전체 빈 칸 중 첫 번째
      for (var r = 0; r < SIZE; r++) {
        for (var c = 0; c < SIZE; c++) {
          if (board[r][c] === 0) return { r: r, c: c };
        }
      }
      return null;
    }

    // 각 후보에 대해 A(공격), D(수비) 점수 평가
    var winMoves = [];
    var blockMoves = [];
    var scoredMoves = [];

    for (var i = 0; i < candidates.length; i++) {
      var cand = candidates[i];
      var scoreA = getPatternScore(board, cand.r, cand.c, aiColor, false);
      var scoreD = getPatternScore(board, cand.r, cand.c, humanColor, false);
      var scoreDEasy = getPatternScore(board, cand.r, cand.c, humanColor, true);

      if (scoreA >= 100000) {
        winMoves.push(cand);
      }
      if (scoreD >= 100000) {
        blockMoves.push(cand);
      }

      var normalTotal = scoreA + scoreD * 1.1;
      var easyTotal = scoreA + scoreDEasy * 1.1;

      scoredMoves.push({
        r: cand.r,
        c: cand.c,
        normalScore: normalTotal,
        easyScore: easyTotal,
        rnd: rnd()
      });
    }

    // normal, easy 공통: 이길 수 있으면 반드시 이긴다
    if (winMoves.length > 0) {
      var winIdx = Math.floor(rnd() * winMoves.length);
      return { r: winMoves[winIdx].r, c: winMoves[winIdx].c };
    }

    // normal, easy 공통: 사람이 다섯을 이으려 하면 반드시 막는다
    if (blockMoves.length > 0) {
      var blockIdx = Math.floor(rnd() * blockMoves.length);
      return { r: blockMoves[blockIdx].r, c: blockMoves[blockIdx].c };
    }

    // 그 밖의 경우
    if (level === 'easy') {
      // easy: normal 점수로 상위 5개 후보 중 seed로 무작위 선택하되,
      // 열린 셋 막기는 하지 않고(D 중 열린 셋 이하 항목을 0으로 계산) 상위 5개에서 고른다.
      scoredMoves.sort(function (a, b) {
        if (b.easyScore !== a.easyScore) {
          return b.easyScore - a.easyScore;
        }
        return a.rnd - b.rnd;
      });

      var k = Math.min(5, scoredMoves.length);
      var pickIdx = Math.floor(rnd() * k);
      return { r: scoredMoves[pickIdx].r, c: scoredMoves[pickIdx].c };
    } else {
      // normal: A + D*1.1 이 가장 큰 칸(같으면 seed로 하나를 고른다)
      var maxScore = -1;
      for (var i = 0; i < scoredMoves.length; i++) {
        if (scoredMoves[i].normalScore > maxScore) {
          maxScore = scoredMoves[i].normalScore;
        }
      }

      var bestMoves = [];
      for (var i = 0; i < scoredMoves.length; i++) {
        if (Math.abs(scoredMoves[i].normalScore - maxScore) < 1e-6) {
          bestMoves.push(scoredMoves[i]);
        }
      }

      var bestIdx = Math.floor(rnd() * bestMoves.length);
      return { r: bestMoves[bestIdx].r, c: bestMoves[bestIdx].c };
    }
  }

  return {
    SIZE: SIZE,
    omokNewBoard: omokNewBoard,
    omokCheckWin: omokCheckWin,
    omokIsFull: omokIsFull,
    omokAiMove: omokAiMove
  };
});
