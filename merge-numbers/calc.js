// 숫자 합치기 계산 및 게임 규칙 로직
(function () {
  /**
   * 한 행을 왼쪽으로 밀어 합치기
   * @param {number[]} row - 길이 4 배열
   * @returns {{ row: number[], gained: number }}
   */
  function slideRow(row) {
    var nonZero = [];
    for (var i = 0; i < row.length; i++) {
      if (row[i] !== 0) nonZero.push(row[i]);
    }

    var merged = [];
    var gained = 0;
    var idx = 0;

    while (idx < nonZero.length) {
      if (idx + 1 < nonZero.length && nonZero[idx] === nonZero[idx + 1]) {
        var sum = nonZero[idx] * 2;
        merged.push(sum);
        gained += sum;
        idx += 2;
      } else {
        merged.push(nonZero[idx]);
        idx += 1;
      }
    }

    while (merged.length < row.length) {
      merged.push(0);
    }

    return {
      row: merged,
      gained: gained
    };
  }

  /**
   * 전체 판 밀기
   * @param {number[][]} grid - 4x4 배열
   * @param {'left'|'right'|'up'|'down'} dir - 이동 방향
   * @returns {{ grid: number[][], gained: number, moved: boolean }}
   */
  function move(grid, dir) {
    var size = 4;
    var newGrid = [];
    for (var r = 0; r < size; r++) {
      newGrid.push(grid[r].slice());
    }
    var totalGained = 0;

    if (dir === 'left') {
      for (var r = 0; r < size; r++) {
        var res = slideRow(newGrid[r]);
        newGrid[r] = res.row;
        totalGained += res.gained;
      }
    } else if (dir === 'right') {
      for (var r = 0; r < size; r++) {
        var rev = newGrid[r].slice().reverse();
        var res = slideRow(rev);
        newGrid[r] = res.row.reverse();
        totalGained += res.gained;
      }
    } else if (dir === 'up') {
      for (var c = 0; c < size; c++) {
        var col = [];
        for (var r = 0; r < size; r++) col.push(newGrid[r][c]);
        var res = slideRow(col);
        totalGained += res.gained;
        for (var r = 0; r < size; r++) newGrid[r][c] = res.row[r];
      }
    } else if (dir === 'down') {
      for (var c = 0; c < size; c++) {
        var col = [];
        for (var r = 0; r < size; r++) col.push(newGrid[r][c]);
        col.reverse();
        var res = slideRow(col);
        totalGained += res.gained;
        res.row.reverse();
        for (var r = 0; r < size; r++) newGrid[r][c] = res.row[r];
      }
    }

    var moved = false;
    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        if (grid[r][c] !== newGrid[r][c]) {
          moved = true;
          break;
        }
      }
      if (moved) break;
    }

    return {
      grid: newGrid,
      gained: totalGained,
      moved: moved
    };
  }

  /**
   * 더 움직일 수 있는지 확인
   * @param {number[][]} grid - 4x4 배열
   * @returns {boolean}
   */
  function canMove(grid) {
    var size = 4;
    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        if (grid[r][c] === 0) return true;
        if (c + 1 < size && grid[r][c] === grid[r][c + 1]) return true;
        if (r + 1 < size && grid[r][c] === grid[r + 1][c]) return true;
      }
    }
    return false;
  }

  /**
   * 빈 칸에 무작위 숫자(2 또는 4, 4는 10%) 추가
   * @param {number[][]} grid - 4x4 배열
   * @param {function} [rand] - 난수 함수
   * @returns {{ r: number, c: number, val: number }|null}
   */
  function addRandomTile(grid, rand) {
    var rnd = rand || Math.random;
    var emptySpots = [];
    var size = grid.length;
    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        if (grid[r][c] === 0) {
          emptySpots.push({ r: r, c: c });
        }
      }
    }
    if (emptySpots.length === 0) return null;
    var chosen = emptySpots[Math.floor(rnd() * emptySpots.length)];
    var val = rnd() < 0.1 ? 4 : 2; // 4는 10%, 2는 90%
    grid[chosen.r][chosen.c] = val;
    return { r: chosen.r, c: chosen.c, val: val };
  }

  var exportsObj = {
    slideRow: slideRow,
    move: move,
    canMove: canMove,
    addRandomTile: addRandomTile
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObj;
  }
  if (typeof window !== 'undefined') {
    window.MergeCalc = exportsObj;
  }
})();
