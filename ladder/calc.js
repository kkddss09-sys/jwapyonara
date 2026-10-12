function parseLines(text) {
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

function makeLadder(n, rows, customRnd) {
  var count = parseInt(n, 10);
  if (isNaN(count) || count < 2) {
    count = 2;
  }
  if (count > 10) {
    count = 10;
  }

  var numRows = parseInt(rows, 10);
  if (isNaN(numRows) || numRows < 1) {
    numRows = count * 3;
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

  // 1. 빈 rungs 초기화: rows개 행, 각 행은 길이 n - 1
  var rungs = [];
  for (var r = 0; r < numRows; r++) {
    var row = [];
    for (var c = 0; c < count - 1; c++) {
      row.push(false);
    }
    rungs.push(row);
  }

  // 2. 세로줄 사이(c = 0 ~ count - 2)마다 적어도 하나는 가로줄이 있도록 무작위 배정
  for (var c = 0; c < count - 1; c++) {
    var candidates = [];
    for (var r = 0; r < numRows; r++) {
      var leftConflict = (c > 0 && rungs[r][c - 1]);
      if (!leftConflict) {
        candidates.push(r);
      }
    }
    if (candidates.length > 0) {
      var randIdx = Math.floor(getRand() * candidates.length);
      var chosenRow = candidates[randIdx];
      rungs[chosenRow][c] = true;
    }
  }

  // 3. 나머지 자리에 무작위로 가로줄 추가 (인접 충돌 방지)
  for (var r = 0; r < numRows; r++) {
    for (var c = 0; c < count - 1; c++) {
      if (rungs[r][c]) continue; // 이미 배정됨
      var leftConflict = (c > 0 && rungs[r][c - 1]);
      var rightConflict = (c < count - 2 && rungs[r][c + 1]);
      if (!leftConflict && !rightConflict) {
        if (getRand() < 0.35) {
          rungs[r][c] = true;
        }
      }
    }
  }

  return rungs;
}

function traceLadder(rungs, n) {
  var count = parseInt(n, 10);
  if (isNaN(count) || count < 1) {
    count = 1;
  }

  var res = [];
  var numRows = rungs.length;

  for (var i = 0; i < count; i++) {
    var pos = i;
    for (var r = 0; r < numRows; r++) {
      var row = rungs[r];
      if (pos < count - 1 && row[pos]) {
        pos = pos + 1;
      } else if (pos > 0 && row[pos - 1]) {
        pos = pos - 1;
      }
    }
    res.push(pos);
  }

  return res;
}

function tracePath(rungs, n, startCol) {
  var count = parseInt(n, 10);
  if (isNaN(count) || count < 1) {
    count = 1;
  }

  var pos = parseInt(startCol, 10);
  if (isNaN(pos) || pos < 0) {
    pos = 0;
  }
  if (pos >= count) {
    pos = count - 1;
  }

  var path = [];
  path.push([-1, pos]); // 시작점 (상단)

  var numRows = rungs.length;
  for (var r = 0; r < numRows; r++) {
    var row = rungs[r];
    path.push([r, pos]); // 해당 행 도착

    if (pos < count - 1 && row[pos]) {
      pos = pos + 1;
      path.push([r, pos]); // 가로선 이동
    } else if (pos > 0 && row[pos - 1]) {
      pos = pos - 1;
      path.push([r, pos]); // 가로선 이동
    }
  }

  path.push([numRows, pos]); // 종료점 (하단)
  return path;
}

if (typeof module !== 'undefined') {
  module.exports = {
    parseLines: parseLines,
    makeLadder: makeLadder,
    traceLadder: traceLadder,
    tracePath: tracePath
  };
}
