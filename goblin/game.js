/**
 * 고블린 성장기 — 게임 핵심 규칙 (GoblinCore)
 * 브라우저 및 Node.js 공용 순수 계산 모듈 (외부 라이브러리 없음)
 */
(function(root, f) {
  if (typeof module === 'object' && module.exports) {
    module.exports = f();
  } else {
    (root || (typeof window !== 'undefined' ? window : globalThis)).GoblinCore = f();
  }
})(typeof window !== 'undefined' ? window : this, function() {
  'use strict';

  /**
   * Mulberry32 기반 시드 난수 생성기
   * @param {number} [seed] 시드 정수값
   * @returns {function(): number} 0 이상 1 미만의 난수를 반환하는 함수
   */
  function createRng(seed) {
    var s = (seed === undefined || seed === null ? Date.now() : seed) >>> 0;
    return function() {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * size x size 크기의 보드 2차원 배열 생성 (각 칸은 0..types-1 정수)
   * @param {number} size 보드 가로/세로 칸 수
   * @param {number} types 칸 종류 수 (예: 5)
   * @param {function(): number} [rng] 난수 생성기 (생략 시 Math.random)
   * @returns {number[][]} size x size 2차원 배열
   */
  function createBoard(size, types, rng) {
    var safeRng = typeof rng === 'function' ? rng : Math.random;
    var numTypes = types > 0 ? types : 5;
    var board = [];
    for (var r = 0; r < size; r++) {
      var row = [];
      for (var c = 0; c < size; c++) {
        row.push(Math.floor(safeRng() * numTypes));
      }
      board.push(row);
    }
    return board;
  }

  /**
   * 두 좌표 a, b가 가로·세로·대각선 이웃(8방향)인지 검사
   * @param {{r: number, c: number}} a
   * @param {{r: number, c: number}} b
   * @returns {boolean} 8방향 이웃이면 true, 같은 칸이거나 2칸 이상 떨어지면 false
   */
  function isAdjacent(a, b) {
    if (!a || !b) return false;
    if (typeof a.r !== 'number' || typeof a.c !== 'number') return false;
    if (typeof b.r !== 'number' || typeof b.c !== 'number') return false;
    var dr = Math.abs(a.r - b.r);
    var dc = Math.abs(a.c - b.c);
    if (dr === 0 && dc === 0) return false;
    return dr <= 1 && dc <= 1;
  }

  /**
   * 선 잇기 경로 확장 및 뒤로 가기
   * 원래 path는 바꾸지 않고 새 path 배열을 돌려준다.
   *
   * 규칙:
   * 1. path가 비었으면 [cell]
   * 2. cell이 path의 끝에서 두 번째 칸이면 [뒤로 가기]: 마지막 칸을 뺀 path
   * 3. cell이 이미 path에 있거나(위 뒤로 가기 제외), 끝 칸의 이웃이 아니거나, 첫 칸과 종류가 다르면 path 그대로
   * 4. 아니면 끝에 cell을 붙인 path
   *
   * @param {number[][]} board 현재 보드 2차원 배열
   * @param {Array<{r: number, c: number}>} path 현재 경로 배열
   * @param {{r: number, c: number}} cell 잇고자 하는 대상 칸
   * @returns {Array<{r: number, c: number}>} 새 경로 배열
   */
  function extendPath(board, path, cell) {
    if (!cell || typeof cell.r !== 'number' || typeof cell.c !== 'number') {
      return Array.isArray(path) ? path : [];
    }

    var currentPath = Array.isArray(path) ? path : [];

    // 1. 비어 있으면 [cell]
    if (currentPath.length === 0) {
      return [{ r: cell.r, c: cell.c }];
    }

    // 2. cell이 path의 끝에서 두 번째 칸이면 [뒤로 가기]: 마지막 칸을 뺀 path
    if (currentPath.length >= 2) {
      var secondToLast = currentPath[currentPath.length - 2];
      if (secondToLast.r === cell.r && secondToLast.c === cell.c) {
        return currentPath.slice(0, currentPath.length - 1);
      }
    }

    // 보드 유효 범위 검사
    var size = board ? board.length : 0;
    if (cell.r < 0 || cell.r >= size || cell.c < 0 || cell.c >= (board[cell.r] ? board[cell.r].length : 0)) {
      return currentPath;
    }

    // 3-1. cell이 이미 path에 있거나(위 뒤로 가기 제외) path 그대로
    for (var i = 0; i < currentPath.length; i++) {
      if (currentPath[i].r === cell.r && currentPath[i].c === cell.c) {
        return currentPath;
      }
    }

    // 3-2. 끝 칸의 이웃이 아니거나 path 그대로
    var last = currentPath[currentPath.length - 1];
    if (!isAdjacent(last, cell)) {
      return currentPath;
    }

    // 3-3. 첫 칸과 종류가 다르면 path 그대로
    var first = currentPath[0];
    var firstType = board[first.r][first.c];
    var cellType = board[cell.r][cell.c];
    if (firstType !== cellType) {
      return currentPath;
    }

    // 4. 아니면 끝에 cell을 붙인 path
    var nextPath = currentPath.slice();
    nextPath.push({ r: cell.r, c: cell.c });
    return nextPath;
  }

  /**
   * 경로 해결 (path 길이가 3 이상이면 칸들을 지우고 중력 + 새 칸 채우기)
   *
   * @param {number[][]} board 현재 보드 2차원 배열
   * @param {Array<{r: number, c: number}>} path 이은 경로
   * @param {function(): number} [rng] 새 칸 생성용 난수 생성기
   * @param {number} [types] 칸 종류 수 (생략 시 보드 내 값 기반 또는 기본 5)
   * @returns {{ board: number[][], cleared: number, type: number|null, big: boolean }}
   */
  function resolve(board, path, rng, types) {
    if (!board || !Array.isArray(board) || board.length === 0) {
      return { board: board, cleared: 0, type: null, big: false };
    }

    // 길이가 3 미만이면 { board(그대로), cleared: 0, type: null, big: false }
    if (!path || !Array.isArray(path) || path.length < 3) {
      return { board: board, cleared: 0, type: null, big: false };
    }

    var size = board.length;

    // 첫 번째 칸 유효성 및 보드 범위 검사
    var first = path[0];
    if (!first || typeof first.r !== 'number' || typeof first.c !== 'number' || isNaN(first.r) || isNaN(first.c)) {
      return { board: board, cleared: 0, type: null, big: false };
    }
    if (first.r < 0 || first.r >= size || first.c < 0 || !board[first.r] || first.c >= board[first.r].length) {
      return { board: board, cleared: 0, type: null, big: false };
    }

    var clearedType = board[first.r][first.c];
    if (typeof clearedType !== 'number') {
      return { board: board, cleared: 0, type: null, big: false };
    }

    var toRemove = {};
    toRemove[first.r + ',' + first.c] = true;

    // 경로 검증: 유효 좌표, 보드 범위, 중복 없음, 8방향 이웃, 종류 일치
    for (var i = 1; i < path.length; i++) {
      var curr = path[i];
      var prev = path[i - 1];

      if (!curr || typeof curr.r !== 'number' || typeof curr.c !== 'number' || isNaN(curr.r) || isNaN(curr.c)) {
        return { board: board, cleared: 0, type: null, big: false };
      }
      if (curr.r < 0 || curr.r >= size || curr.c < 0 || !board[curr.r] || curr.c >= board[curr.r].length) {
        return { board: board, cleared: 0, type: null, big: false };
      }

      var key = curr.r + ',' + curr.c;
      if (toRemove[key]) {
        // 중복 좌표 거부
        return { board: board, cleared: 0, type: null, big: false };
      }
      toRemove[key] = true;

      if (!isAdjacent(prev, curr)) {
        // 비인접 좌표 거부
        return { board: board, cleared: 0, type: null, big: false };
      }

      if (board[curr.r][curr.c] !== clearedType) {
        // 종류 불일치 거부
        return { board: board, cleared: 0, type: null, big: false };
      }
    }

    var clearedCount = path.length;

    // 종류 수 결정
    var numTypes = types;
    if (!numTypes || numTypes < 1) {
      var maxVal = 0;
      for (var r = 0; r < size; r++) {
        for (var c = 0; c < board[r].length; c++) {
          if (typeof board[r][c] === 'number' && board[r][c] > maxVal) {
            maxVal = board[r][c];
          }
        }
      }
      numTypes = Math.max(5, maxVal + 1);
    }

    var safeRng = typeof rng === 'function' ? rng : Math.random;

    // 새 보드 생성 및 중력 + 새 칸 채우기 (판은 언제나 가득 차 있어야 함)
    var newBoard = [];
    for (var r = 0; r < size; r++) {
      newBoard.push(new Array(size));
    }

    for (var col = 0; col < size; col++) {
      // 아래쪽(size-1)부터 위쪽(0)으로 남는 칸 수집
      var kept = [];
      for (var row = size - 1; row >= 0; row--) {
        if (!toRemove[row + ',' + col]) {
          kept.push(board[row][col]);
        }
      }

      // 새 열 채우기 (아래부터 남은 칸, 위에는 rng로 새 칸 채움)
      for (var row = size - 1; row >= 0; row--) {
        if (kept.length > 0) {
          newBoard[row][col] = kept.shift();
        } else {
          newBoard[row][col] = Math.floor(safeRng() * numTypes);
        }
      }
    }

    return {
      board: newBoard,
      cleared: clearedCount,
      type: clearedType,
      big: clearedCount >= 10
    };
  }

  /**
   * 주사위 6종 버프 테이블 (자동결정-로그.md 및 설계서 기준)
   */
  var DICE_BUFF_TABLE = {
    1: {
      dice: 1,
      id: 'fury',
      name: '고블린 대분노',
      desc: '다음 공격 데미지 2배',
      emoji: '⚔️',
      turns: 1,
      effect: { multiplier: 2 }
    },
    2: {
      dice: 2,
      id: 'stone_skin',
      name: '돌가죽',
      desc: '다음 적 공격 피해 0 완전 방어',
      emoji: '🛡️',
      turns: 1,
      effect: { absorbAll: true }
    },
    3: {
      dice: 3,
      id: 'first_aid',
      name: '응급 처치',
      desc: '고블린 체력 즉시 +10 회복',
      emoji: '💖',
      turns: 0,
      effect: { heal: 10 }
    },
    4: {
      dice: 4,
      id: 'wind_walk',
      name: '질풍노도',
      desc: '적 반격 1회 스킵',
      emoji: '⚡',
      turns: 1,
      effect: { skipEnemyTurn: true }
    },
    5: {
      dice: 5,
      id: 'bomb',
      name: '폭탄 투척',
      desc: '적 체력 즉시 -8 피해',
      emoji: '💣',
      turns: 0,
      effect: { damage: 8 }
    },
    6: {
      dice: 6,
      id: 'blessing',
      name: '대장의 축복',
      desc: '즉시 체력 +5 회복 및 3턴간 공격력 +1',
      emoji: '👑',
      turns: 3,
      effect: { heal: 5, bonusDmg: 1 }
    }
  };

  /**
   * 5종 보직 정의 (운전병, 보병, 포병, 통신병, 의무병)
   */
  var ROLE_DEFINITIONS = {
    driver: {
      id: 'driver',
      name: '운전병',
      emoji: '🚜',
      desc: '⛏️ 곡괭이 연결 시 전방 2칸 관통 추가 타격 (적 체력 -2)'
    },
    infantry: {
      id: 'infantry',
      name: '보병',
      emoji: '🪖',
      desc: '☠️ 해골 연결 시 기본 공격력 +1 보너스'
    },
    artillery: {
      id: 'artillery',
      name: '포병',
      emoji: '💣',
      desc: '5칸 이상 연결 시 주변 폭발 (적 체력 추가 -3)'
    },
    comms: {
      id: 'comms',
      name: '통신병',
      emoji: '📻',
      desc: '턴 시작 시 판의 2개 칸을 첫 칸 종류와 일치시킴'
    },
    medic: {
      id: 'medic',
      name: '의무병',
      emoji: '💉',
      desc: '🧪 물약 회복량 1.5배 및 최대 체력 초과분을 실드로 충전'
    }
  };

  /**
   * 3대 가문 특성 정의 (불꽃 이빨, 강철 뼈, 황금 손가락)
   */
  var FAMILY_DEFINITIONS = {
    fire_fang: {
      id: 'fire_fang',
      name: '불꽃 이빨',
      emoji: '🔥',
      desc: '☠️ 해골 연결 시 25% 확률로 1.5배 치명타'
    },
    iron_bone: {
      id: 'iron_bone',
      name: '강철 뼈',
      emoji: '🦴',
      desc: '최대 체력 기본 +10, 🛡️ 방패 칸 실드 충전량 20% 증가'
    },
    gold_finger: {
      id: 'gold_finger',
      name: '황금 손가락',
      emoji: '✨',
      desc: '💰 골드 획득 2배, 🎲 10칸 이상 시 주사위 2회 굴림 중 큰 값 선택'
    }
  };

  /**
   * 계급 승급 테이블 (이등병 ~ 대령 10단계)
   * 승급 시마다 maxHp +3, atk +1 씩 영구 증가
   */
  var RANK_TABLE = [
    { rankIndex: 0, title: '이등병', reqExp: 0, nextExp: 50 },
    { rankIndex: 1, title: '일병', reqExp: 50, nextExp: 120 },
    { rankIndex: 2, title: '상병', reqExp: 120, nextExp: 220 },
    { rankIndex: 3, title: '병장', reqExp: 220, nextExp: 350 },
    { rankIndex: 4, title: '소위', reqExp: 350, nextExp: 520 },
    { rankIndex: 5, title: '중위', reqExp: 520, nextExp: 730 },
    { rankIndex: 6, title: '대위', reqExp: 730, nextExp: 980 },
    { rankIndex: 7, title: '소령', reqExp: 980, nextExp: 1300 },
    { rankIndex: 8, title: '중령', reqExp: 1300, nextExp: 1700 },
    { rankIndex: 9, title: '대령', reqExp: 1700, nextExp: Infinity }
  ];

  /**
   * 새 고블린 성장 프로필 생성
   * @param {Object} [options]
   * @returns {Object} 프로필 객체
   */
  function createGoblinProfile(options) {
    var opts = options || {};
    var roleKey = (opts.role && ROLE_DEFINITIONS[opts.role]) ? opts.role : 'infantry';
    var familyKey = (opts.family && FAMILY_DEFINITIONS[opts.family]) ? opts.family : 'fire_fang';
    var rankIdx = (typeof opts.rankIndex === 'number' && opts.rankIndex >= 0 && opts.rankIndex <= 9) ? opts.rankIndex : 0;
    var rankInfo = RANK_TABLE[rankIdx] || RANK_TABLE[0];

    var baseHp = 20;
    if (familyKey === 'iron_bone') {
      baseHp += 10;
    }
    var baseAtk = 1;

    var maxHp = (opts.stats && typeof opts.stats.maxHp === 'number')
      ? opts.stats.maxHp
      : (baseHp + rankIdx * 3);
    var atk = (opts.stats && typeof opts.stats.atk === 'number')
      ? opts.stats.atk
      : (baseAtk + rankIdx * 1);

    var currentExp = (typeof opts.exp === 'number' && opts.exp >= 0) ? opts.exp : 0;
    var nextExp = rankInfo.nextExp;

    return {
      name: typeof opts.name === 'string' && opts.name.trim().length > 0 ? opts.name : '고블린 대장',
      role: roleKey,
      roleName: ROLE_DEFINITIONS[roleKey].name,
      rankIndex: rankIdx,
      rankTitle: rankInfo.title,
      exp: currentExp,
      nextExp: nextExp,
      stats: {
        maxHp: maxHp,
        atk: atk
      },
      family: familyKey
    };
  }

  /**
   * 프로필에 경험치 추가 및 계급 승급 반영 (순수 함수)
   * @param {Object} profile 현재 프로필 객체
   * @param {number} expGained 획득한 경험치
   * @returns {Object} 새 프로필 객체
   */
  function addExpToProfile(profile, expGained) {
    if (!profile || typeof profile !== 'object') {
      return profile;
    }

    var addExp = (typeof expGained === 'number' && !isNaN(expGained) && expGained > 0) ? expGained : 0;
    var currentExp = (typeof profile.exp === 'number') ? profile.exp : 0;
    var totalExp = currentExp + addExp;

    var currentRank = (typeof profile.rankIndex === 'number') ? profile.rankIndex : 0;
    var newRankIndex = currentRank;

    // 새 계급 산출 (EXP 테이블 대조)
    for (var i = RANK_TABLE.length - 1; i >= 0; i--) {
      if (totalExp >= RANK_TABLE[i].reqExp) {
        newRankIndex = Math.max(currentRank, i);
        break;
      }
    }

    var rankDiff = newRankIndex - currentRank;
    var curMaxHp = (profile.stats && typeof profile.stats.maxHp === 'number') ? profile.stats.maxHp : 20;
    var curAtk = (profile.stats && typeof profile.stats.atk === 'number') ? profile.stats.atk : 1;

    var newMaxHp = curMaxHp + (rankDiff * 3);
    var newAtk = curAtk + (rankDiff * 1);
    var nextExp = RANK_TABLE[newRankIndex].nextExp;
    var roleKey = profile.role || 'infantry';

    return {
      name: profile.name || '고블린 대장',
      role: roleKey,
      roleName: ROLE_DEFINITIONS[roleKey] ? ROLE_DEFINITIONS[roleKey].name : (profile.roleName || '보병'),
      rankIndex: newRankIndex,
      rankTitle: RANK_TABLE[newRankIndex].title,
      exp: totalExp,
      nextExp: nextExp,
      stats: {
        maxHp: newMaxHp,
        atk: newAtk
      },
      family: profile.family || 'fire_fang',
      leveledUp: rankDiff > 0,
      promotedTitle: rankDiff > 0 ? RANK_TABLE[newRankIndex].title : null
    };
  }

  /**
   * 5종 보직에 따른 퍼즐/전투 보너스 계산 (순수 함수)
   * @param {Object} profile 고블린 프로필
   * @param {Object} resolveResult 퍼즐 해결 결과 ({ cleared, type, big })
   * @param {Object} [battleState] 현재 전투 상태
   * @returns {Object} { role, bonusDamage, healMultiplier, overflowToShield, commsAlignTiles, desc }
   */
  function applyRoleBonus(profile, resolveResult, battleState) {
    var res = resolveResult || {};
    var role = (profile && profile.role) ? profile.role : 'infantry';
    var bonusDmg = 0;
    var healMul = 1.0;
    var overflowShield = false;
    var commsAlign = 0;
    var descParts = [];

    // 1. 운전병: 곡괭이(type 0) 연결 시 전방 2칸 관통 추가 타격 (적 hp 추가 -2)
    if (role === 'driver' && res.type === 0) {
      bonusDmg += 2;
      descParts.push('🚜 운전병 관통 타격(+2 피해)');
    }

    // 2. 보병: 해골(type 4) 연결 시 기본 공격력 +1 보너스
    if (role === 'infantry' && res.type === 4) {
      bonusDmg += 1;
      descParts.push('🪖 보병 전선 돌파(+1 공격력)');
    }

    // 3. 포병: 5칸 이상 연결 시 주변 폭발 (적 hp 추가 -3)
    if (role === 'artillery' && typeof res.cleared === 'number' && res.cleared >= 5) {
      bonusDmg += 3;
      descParts.push('💣 포병 지원 폭격(+3 광역 피해)');
    }

    // 4. 통신병: 판의 2개 칸을 첫 칸 종류와 일치
    if (role === 'comms') {
      commsAlign = 2;
      descParts.push('📻 통신병 신호 유도(2칸 동기화)');
    }

    // 5. 의무병: 물약(type 2) 회복량 1.5배 및 최대 체력 초과분을 실드로 충전
    if (role === 'medic' && res.type === 2) {
      healMul = 1.5;
      overflowShield = true;
      descParts.push('💉 의무병 응급 수혈(회복 1.5배 및 초과분 실드 전환)');
    }

    return {
      role: role,
      bonusDamage: bonusDmg,
      healMultiplier: healMul,
      overflowToShield: overflowShield,
      commsAlignTiles: commsAlign,
      desc: descParts.join(' ')
    };
  }

  /**
   * 3대 가문 특성 적용 (순수 함수)
   * @param {Object} profile 고블린 프로필
   * @param {Object} actionContext 행동 컨텍스트 ({ type, cleared, goldGained })
   * @param {function(): number} [rng] 난수 생성기
   * @returns {Object} { family, isCrit, critMultiplier, shieldMultiplier, goldMultiplier, extraDiceRoll, maxHpBonus, desc }
   */
  function applyFamilyBonus(profile, actionContext, rng) {
    var act = actionContext || {};
    var family = (profile && profile.family) ? profile.family : 'fire_fang';
    var safeRng = typeof rng === 'function' ? rng : Math.random;

    var isCrit = false;
    var critMul = 1.0;
    var shieldMul = 1.0;
    var goldMul = 1.0;
    var extraDice = false;
    var maxHpBonus = 0;
    var descParts = [];

    // 1. 불꽃 이빨: 해골(type 4) 치명타(1.5배) 25% 확률
    if (family === 'fire_fang') {
      if (act.type === 4) {
        var roll = safeRng();
        if (roll < 0.25) {
          isCrit = true;
          critMul = 1.5;
          descParts.push('🔥 불꽃 이빨 치명타 발동(1.5배)!');
        }
      }
    }

    // 2. 강철 뼈: 최대 체력 기본 +10, 방패(type 1) 실드 획득량 20% 증가
    if (family === 'iron_bone') {
      maxHpBonus = 10;
      if (act.type === 1) {
        shieldMul = 1.2;
        descParts.push('🦴 강철 뼈 방어막 증폭(+20%)');
      }
    }

    // 3. 황금 손가락: 골드 획득 2배, 10칸 이상 시 주사위 2회 굴림 중 큰 값 선택
    if (family === 'gold_finger') {
      extraDice = true;
      if (act.type === 3 || act.goldGained) {
        goldMul = 2.0;
        descParts.push('✨ 황금 손가락(골드 2배)');
      }
    }

    return {
      family: family,
      isCrit: isCrit,
      critMultiplier: critMul,
      shieldMultiplier: shieldMul,
      goldMultiplier: goldMul,
      extraDiceRoll: extraDice,
      maxHpBonus: maxHpBonus,
      desc: descParts.join(' ')
    };
  }

  /**
   * 10칸 이상 연결 시 호출되는 주사위 굴림 함수
   * @param {function(): number} [rng] 난수 생성기
   * @returns {{ dice: number, id: string, name: string, desc: string, emoji: string, turns: number, effect: Object }}
   */
  function rollDiceBuff(rng) {
    var safeRng = typeof rng === 'function' ? rng : Math.random;
    var roll = safeRng();
    if (typeof roll !== 'number' || isNaN(roll) || roll < 0) {
      roll = 0;
    }
    var dice = Math.floor(roll * 6) + 1;
    if (dice < 1) dice = 1;
    if (dice > 6) dice = 6;

    var template = DICE_BUFF_TABLE[dice];
    return {
      dice: template.dice,
      id: template.id,
      name: template.name,
      desc: template.desc,
      emoji: template.emoji,
      turns: template.turns,
      effect: Object.assign({}, template.effect)
    };
  }

  /**
   * 버프를 전투 상태에 적용 (즉발 효과 적용 및 지속 버프 등록, 순수 함수)
   * @param {Object} battleState 전투 상태 객체
   * @param {Object} buff 주사위 버프 객체
   * @returns {Object} 새 전투 상태 객체
   */
  function applyBuffToState(battleState, buff) {
    if (!battleState) return battleState;
    if (!buff || typeof buff !== 'object') {
      return battleState;
    }

    var nextState = {
      player: {
        maxHp: battleState.player.maxHp,
        hp: battleState.player.hp,
        atk: battleState.player.atk,
        shield: battleState.player.shield
      },
      enemy: {
        name: battleState.enemy.name,
        maxHp: battleState.enemy.maxHp,
        hp: battleState.enemy.hp,
        atk: battleState.enemy.atk,
        emoji: battleState.enemy.emoji
      },
      turn: battleState.turn,
      status: battleState.status,
      gold: battleState.gold,
      logs: Array.isArray(battleState.logs) ? battleState.logs.slice() : [],
      activeBuffs: Array.isArray(battleState.activeBuffs)
        ? battleState.activeBuffs.map(function(b) {
            return Object.assign({}, b, { effect: Object.assign({}, b.effect) });
          })
        : [],
      lastDiceBuff: Object.assign({}, buff, { effect: Object.assign({}, buff.effect) }),
      profile: battleState.profile ? Object.assign({}, battleState.profile, { stats: Object.assign({}, battleState.profile.stats) }) : null
    };

    var eff = buff.effect || {};

    // 1. 즉발 체력 회복
    if (typeof eff.heal === 'number' && eff.heal > 0) {
      nextState.player.hp = Math.min(nextState.player.maxHp, nextState.player.hp + eff.heal);
    }

    // 2. 즉발 적 피해
    if (typeof eff.damage === 'number' && eff.damage > 0) {
      nextState.enemy.hp = Math.max(0, nextState.enemy.hp - eff.damage);
      if (nextState.enemy.hp <= 0) {
        nextState.enemy.hp = 0;
        nextState.status = 'victory';
      }
    }

    // 3. 지속 효과 버프 등록 (turns > 0)
    if (typeof buff.turns === 'number' && buff.turns > 0) {
      nextState.activeBuffs.push({
        dice: buff.dice,
        id: buff.id,
        name: buff.name,
        desc: buff.desc,
        emoji: buff.emoji,
        turns: buff.turns,
        effect: Object.assign({}, eff)
      });
    }

    return nextState;
  }

  /**
   * 새 전투 상태 객체 생성
   * @param {Object} [options] 초기 상태 재정의 옵션
   * @returns {Object} 전투 상태 객체
   */
  function createBattleState(options) {
    var opts = options || {};
    var profile = opts.profile ? Object.assign({}, opts.profile, { stats: Object.assign({}, opts.profile.stats) }) : null;

    var defaultPlayer = {
      maxHp: (profile && profile.stats && typeof profile.stats.maxHp === 'number') ? profile.stats.maxHp : 20,
      hp: (profile && profile.stats && typeof profile.stats.maxHp === 'number') ? profile.stats.maxHp : 20,
      atk: (profile && profile.stats && typeof profile.stats.atk === 'number') ? profile.stats.atk : 1,
      shield: 0
    };
    var defaultEnemy = { name: '거대 개미 훈련병', maxHp: 15, hp: 15, atk: 2, emoji: '🐜' };

    var player = Object.assign({}, defaultPlayer, opts.player);
    var enemy = Object.assign({}, defaultEnemy, opts.enemy);

    var activeBuffs = [];
    if (Array.isArray(opts.activeBuffs)) {
      for (var i = 0; i < opts.activeBuffs.length; i++) {
        var b = opts.activeBuffs[i];
        activeBuffs.push(Object.assign({}, b, { effect: Object.assign({}, b.effect) }));
      }
    }

    return {
      player: player,
      enemy: enemy,
      turn: typeof opts.turn === 'number' ? opts.turn : 1,
      status: typeof opts.status === 'string' ? opts.status : 'playing',
      gold: typeof opts.gold === 'number' ? opts.gold : 0,
      logs: Array.isArray(opts.logs) ? opts.logs.slice() : [],
      activeBuffs: activeBuffs,
      lastDiceBuff: opts.lastDiceBuff ? Object.assign({}, opts.lastDiceBuff) : null,
      profile: profile
    };
  }

  /**
   * 플레이어 턴 계산 및 적 반격 수행 (순수 함수)
   * 원본 battleState는 변경하지 않고 깊은 복사된 새 battleState 반환
   *
   * @param {Object} battleState 현재 전투 상태 객체
   * @param {{cleared: number, type: number, big?: boolean}} resolveResult 퍼즐 해결 결과
   * @param {function(): number} [rng] 주사위/가문 난수 생성기 (생략 시 Math.random)
   * @param {Object} [profile] 고블린 성장 프로필 (생략 시 battleState.profile 사용)
   * @returns {Object} 새 전투 상태 객체
   */
  function applyPlayerTurn(battleState, resolveResult, rng, profile) {
    if (!battleState || !resolveResult || typeof resolveResult.cleared !== 'number' || resolveResult.cleared < 3) {
      return battleState;
    }

    if (battleState.status !== 'playing') {
      return battleState;
    }

    var activeProfile = profile || battleState.profile || null;
    var profileCopy = activeProfile ? Object.assign({}, activeProfile, { stats: Object.assign({}, activeProfile.stats) }) : null;

    var nextState = {
      player: {
        maxHp: battleState.player.maxHp,
        hp: battleState.player.hp,
        atk: battleState.player.atk,
        shield: battleState.player.shield
      },
      enemy: {
        name: battleState.enemy.name,
        maxHp: battleState.enemy.maxHp,
        hp: battleState.enemy.hp,
        atk: battleState.enemy.atk,
        emoji: battleState.enemy.emoji
      },
      turn: battleState.turn,
      status: battleState.status,
      gold: battleState.gold,
      logs: Array.isArray(battleState.logs) ? battleState.logs.slice() : [],
      activeBuffs: Array.isArray(battleState.activeBuffs)
        ? battleState.activeBuffs.map(function(b) {
            return Object.assign({}, b, { effect: Object.assign({}, b.effect) });
          })
        : [],
      lastDiceBuff: null,
      profile: profileCopy
    };

    var cleared = resolveResult.cleared;
    var type = resolveResult.type;
    var diceLog = '';

    // 1. 10칸 이상(big === true) 시 주사위 버프 자동 롤 및 적용
    // (황금 손가락 가문은 2회 굴려 높은 눈금 선택)
    if (resolveResult.big === true) {
      var diceBuff;
      if (activeProfile && activeProfile.family === 'gold_finger') {
        var d1 = rollDiceBuff(rng);
        var d2 = rollDiceBuff(rng);
        diceBuff = (d2.dice > d1.dice) ? d2 : d1;
      } else {
        diceBuff = rollDiceBuff(rng);
      }
      nextState = applyBuffToState(nextState, diceBuff);
      diceLog = '🎲 ' + diceBuff.emoji + ' 눈금 ' + diceBuff.dice + ' [' + diceBuff.name + '] 발동! (' + diceBuff.desc + ')';

      // 즉발 피해(폭탄 등)로 이미 적이 쓰러진 경우 처리
      if (nextState.status === 'victory') {
        // 프로필 승급 경험치 지급
        if (nextState.profile) {
          nextState.profile = addExpToProfile(nextState.profile, 30);
          nextState.gainedExp = 30;
        }
        nextState.logs.push('[' + nextState.turn + '턴] ' + diceLog + ' -> 💣 폭탄 피해로 ' + nextState.enemy.name + ' 처치! 전투 승리!');
        nextState.turn += 1;
        return nextState;
      }
    }

    // 2. 활성 버프 확인 (공격 배율, 추가 데미지)
    var atkMultiplier = 1;
    var bonusDmg = 0;
    var furyActive = false;

    for (var i = 0; i < nextState.activeBuffs.length; i++) {
      var b = nextState.activeBuffs[i];
      if (b.effect) {
        if (typeof b.effect.multiplier === 'number' && b.effect.multiplier > atkMultiplier) {
          atkMultiplier = b.effect.multiplier;
          furyActive = true;
        }
        if (typeof b.effect.bonusDmg === 'number' && b.effect.bonusDmg > 0) {
          bonusDmg += b.effect.bonusDmg;
        }
      }
    }

    // 3. 보직(Role) 및 가문(Family) 특성 보너스 계산
    var roleBonus = activeProfile ? applyRoleBonus(activeProfile, resolveResult, nextState) : { bonusDamage: 0, healMultiplier: 1.0, overflowToShield: false, commsAlignTiles: 0, desc: '' };
    var famBonus = activeProfile ? applyFamilyBonus(activeProfile, { type: type, cleared: cleared }, rng) : { isCrit: false, critMultiplier: 1.0, shieldMultiplier: 1.0, goldMultiplier: 1.0, extraDiceRoll: false, maxHpBonus: 0, desc: '' };

    var actionDesc = '';

    // 4. 칸 종류별 플레이어 행동
    if (type === 4) {
      // ☠️ 해골: 강력 타격 (기본 칸 수 + 보병 보직 공격력 +1 보너스 후 가문 치명타 1.5배 반영)
      var baseDmg = cleared;
      if (roleBonus.bonusDamage > 0) {
        baseDmg += roleBonus.bonusDamage;
      }
      var totalDmg = (baseDmg + bonusDmg) * atkMultiplier;
      if (famBonus.isCrit) {
        totalDmg = Math.floor(totalDmg * famBonus.critMultiplier);
      }
      nextState.enemy.hp -= totalDmg;
      actionDesc = '고블린 강력 타격(☠️) - 적에게 ' + totalDmg + ' 피해';
      if (furyActive) actionDesc += ' [대분노 2배!]';
      if (bonusDmg > 0) actionDesc += ' [축복 +' + bonusDmg + ']';
      if (famBonus.isCrit) actionDesc += ' [불꽃 이빨 치명타!]';
      if (roleBonus.desc) actionDesc += ' [' + roleBonus.desc + ']';
    } else if (type === 0) {
      // ⛏️ 곡괭이: 일반 공격
      var baseDmg = Math.max(1, Math.floor(cleared / 2));
      if (roleBonus.bonusDamage > 0) {
        baseDmg += roleBonus.bonusDamage;
      }
      var totalDmg = (baseDmg + bonusDmg) * atkMultiplier;
      nextState.enemy.hp -= totalDmg;
      actionDesc = '고블린 일반 공격(⛏️) - 적에게 ' + totalDmg + ' 피해';
      if (furyActive) actionDesc += ' [대분노 2배!]';
      if (bonusDmg > 0) actionDesc += ' [축복 +' + bonusDmg + ']';
      if (roleBonus.desc) actionDesc += ' [' + roleBonus.desc + ']';
    } else if (type === 1) {
      // 🛡️ 방패: 방어구 정비
      var shieldGain = Math.round(cleared * (famBonus.shieldMultiplier || 1.0));
      nextState.player.shield += shieldGain;
      actionDesc = '방어구 정비(🛡️) - 실드 +' + shieldGain + ' 충전 (현재 ' + nextState.player.shield + ')';
      if (famBonus.desc) actionDesc += ' [' + famBonus.desc + ']';

      // 포병 5칸 이상 주변 폭발 피해 보너스
      if (roleBonus.bonusDamage > 0) {
        nextState.enemy.hp -= roleBonus.bonusDamage;
        actionDesc += ' [' + roleBonus.desc + ' -> 적 HP -' + roleBonus.bonusDamage + ']';
      }
    } else if (type === 2) {
      // 🧪 물약: 체력 회복 (의무병: 1.5배 및 초과분 실드 전환)
      var rawHeal = Math.floor(cleared / 2);
      var healAmount = Math.floor(rawHeal * (roleBonus.healMultiplier || 1.0));
      var prevHp = nextState.player.hp;
      var targetHp = prevHp + healAmount;

      if (targetHp > nextState.player.maxHp) {
        if (roleBonus.overflowToShield) {
          var overflow = targetHp - nextState.player.maxHp;
          nextState.player.shield += overflow;
          actionDesc = '체력 회복(🧪) - HP +' + (nextState.player.maxHp - prevHp) + ' 및 실드 전환 +' + overflow;
        } else {
          actionDesc = '체력 회복(🧪) - HP +' + (nextState.player.maxHp - prevHp);
        }
        nextState.player.hp = nextState.player.maxHp;
      } else {
        nextState.player.hp = targetHp;
        actionDesc = '체력 회복(🧪) - HP +' + (nextState.player.hp - prevHp);
      }
      actionDesc += ' (현재 ' + nextState.player.hp + '/' + nextState.player.maxHp + ')';
      if (roleBonus.desc) actionDesc += ' [' + roleBonus.desc + ']';

      // 포병 폭발 보너스
      if (roleBonus.bonusDamage > 0) {
        nextState.enemy.hp -= roleBonus.bonusDamage;
        actionDesc += ' [' + roleBonus.desc + ' -> 적 HP -' + roleBonus.bonusDamage + ']';
      }
    } else if (type === 3) {
      // 💰 금화: 전리품 (황금 손가락: 2배)
      var goldGain = Math.round(cleared * (famBonus.goldMultiplier || 1.0));
      nextState.gold += goldGain;
      actionDesc = '전리품 획득(💰) - 골드 +' + goldGain + ' (총 ' + nextState.gold + ')';
      if (famBonus.desc) actionDesc += ' [' + famBonus.desc + ']';

      // 포병 폭발 보너스
      if (roleBonus.bonusDamage > 0) {
        nextState.enemy.hp -= roleBonus.bonusDamage;
        actionDesc += ' [' + roleBonus.desc + ' -> 적 HP -' + roleBonus.bonusDamage + ']';
      }
    } else {
      actionDesc = '행동 완료';
    }

    // 5. 적 체력 판정 (승리 여부)
    if (nextState.enemy.hp <= 0) {
      nextState.enemy.hp = 0;
      nextState.status = 'victory';

      // 프로필 승급 경험치 지급
      if (nextState.profile) {
        nextState.profile = addExpToProfile(nextState.profile, 30);
        nextState.gainedExp = 30;
      }

      var logMsg = '[' + nextState.turn + '턴] ';
      if (diceLog) logMsg += diceLog + ' | ';
      logMsg += actionDesc + ' -> 🐜 ' + nextState.enemy.name + ' 처치! 전투 승리!';
      if (nextState.profile && nextState.profile.leveledUp) {
        logMsg += ' 🎖️ [' + nextState.profile.rankTitle + '] 승급 완료!';
      }
      nextState.logs.push(logMsg);

      // 버프 턴 수 차감 및 만료 제거
      nextState.activeBuffs = nextState.activeBuffs
        .map(function(buff) {
          return Object.assign({}, buff, { turns: buff.turns - 1 });
        })
        .filter(function(buff) {
          return buff.turns > 0;
        });

      nextState.turn += 1;
      return nextState;
    }

    // 6. 적 반격 턴 (방어 버프 및 턴 스킵 버프 확인)
    var skipEnemyTurn = false;
    var absorbAll = false;

    for (var j = 0; j < nextState.activeBuffs.length; j++) {
      var ab = nextState.activeBuffs[j];
      if (ab.effect) {
        if (ab.effect.skipEnemyTurn) skipEnemyTurn = true;
        if (ab.effect.absorbAll) absorbAll = true;
      }
    }

    var enemyDesc = '';

    if (skipEnemyTurn) {
      enemyDesc = nextState.enemy.name + '의 반격 스킵! [⚡ 질풍노도 효과]';
    } else if (absorbAll) {
      enemyDesc = nextState.enemy.name + '의 반격! [🛡️ 돌가죽 0 피해 완전 흡수] (남은 HP: ' + nextState.player.hp + ')';
    } else {
      var enemyAtk = Math.max(0, typeof nextState.enemy.atk === 'number' ? nextState.enemy.atk : 2);
      var remainingDmg = enemyAtk;
      var absorbed = 0;

      if (nextState.player.shield > 0) {
        if (nextState.player.shield >= remainingDmg) {
          absorbed = remainingDmg;
          nextState.player.shield -= remainingDmg;
          remainingDmg = 0;
        } else {
          absorbed = nextState.player.shield;
          remainingDmg -= nextState.player.shield;
          nextState.player.shield = 0;
        }
      }

      if (remainingDmg > 0) {
        nextState.player.hp -= remainingDmg;
        if (nextState.player.hp <= 0) {
          nextState.player.hp = 0;
          nextState.status = 'defeat';
        }
      }

      enemyDesc = nextState.enemy.name + '의 반격! ';
      if (absorbed > 0) {
        enemyDesc += '실드가 ' + absorbed + ' 흡수, ';
      }
      enemyDesc += '고블린에게 ' + remainingDmg + ' 피해 (남은 HP: ' + nextState.player.hp + ')';
      if (nextState.status === 'defeat') {
        enemyDesc += ' -> 고블린 쓰러짐 (패배)';
      }
    }

    // 7. 버프 지속 턴 수 차감 및 만료 제거
    nextState.activeBuffs = nextState.activeBuffs
      .map(function(buff) {
        return Object.assign({}, buff, { turns: buff.turns - 1 });
      })
      .filter(function(buff) {
        return buff.turns > 0;
      });

    // 8. 로그 기록 및 턴 수 증가
    var combinedLog = '[' + nextState.turn + '턴] ';
    if (diceLog) combinedLog += diceLog + ' | ';
    combinedLog += actionDesc + ' | ' + enemyDesc;
    nextState.logs.push(combinedLog);

    nextState.turn += 1;
    return nextState;
  }

  var STORAGE_KEY_V1 = 'goblin_save_v1';
  var STORAGE_KEY_LEGACY_BEST = 'goblin_best_chain';

  // 스토리지 참조 헬퍼 (브라우저 window.localStorage, globalThis.localStorage, 인메모리 폴백 지원)
  var _memStorage = {};
  function getSafeStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
      }
      if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
        return globalThis.localStorage;
      }
    } catch (e) {}

    return {
      getItem: function(k) { return Object.prototype.hasOwnProperty.call(_memStorage, k) ? _memStorage[k] : null; },
      setItem: function(k, v) { _memStorage[k] = String(v); },
      removeItem: function(k) { delete _memStorage[k]; },
      clear: function() { _memStorage = {}; }
    };
  }

  /**
   * 게임 진행 상황 로컬 저장 (프로필 포함)
   * @param {Object} state { bestChain, totalWins, totalBattles, gold, lastPlayedAt, profile }
   * @returns {Object} 저장된 정규화 데이터
   */
  function saveGameState(state) {
    var rawProfile = (state && state.profile) ? state.profile : createGoblinProfile();
    var roleKey = (rawProfile.role && ROLE_DEFINITIONS[rawProfile.role]) ? rawProfile.role : 'infantry';
    var famKey = (rawProfile.family && FAMILY_DEFINITIONS[rawProfile.family]) ? rawProfile.family : 'fire_fang';
    var rankIdx = (typeof rawProfile.rankIndex === 'number' && rawProfile.rankIndex >= 0 && rawProfile.rankIndex <= 9) ? rawProfile.rankIndex : 0;

    var profileData = {
      name: typeof rawProfile.name === 'string' && rawProfile.name.trim().length > 0 ? rawProfile.name : '고블린 대장',
      role: roleKey,
      roleName: ROLE_DEFINITIONS[roleKey] ? ROLE_DEFINITIONS[roleKey].name : '보병',
      rankIndex: rankIdx,
      rankTitle: RANK_TABLE[rankIdx] ? RANK_TABLE[rankIdx].title : '이등병',
      exp: typeof rawProfile.exp === 'number' && rawProfile.exp >= 0 ? rawProfile.exp : 0,
      nextExp: RANK_TABLE[rankIdx] ? RANK_TABLE[rankIdx].nextExp : 50,
      stats: {
        maxHp: (rawProfile.stats && typeof rawProfile.stats.maxHp === 'number') ? rawProfile.stats.maxHp : 20,
        atk: (rawProfile.stats && typeof rawProfile.stats.atk === 'number') ? rawProfile.stats.atk : 1
      },
      family: famKey
    };

    var clearedStages = Array.isArray(state && state.clearedStages) ? state.clearedStages.slice() : [];
    var maxStage = (state && typeof state.maxStage === 'number' && state.maxStage >= 1) ? state.maxStage : 1;
    var unlockedHumanVillage = Boolean(state && state.unlockedHumanVillage);
    var isTwoStar = Boolean(state && state.isTwoStar);
    var endingSeen = Boolean(state && state.endingSeen);

    // 조각 7: 닉네임(userNickname) 및 랭킹 점수(rankPoints)
    var userNickname = (state && typeof state.userNickname === 'string' && state.userNickname.trim().length > 0)
      ? state.userNickname.trim()
      : ((profileData && profileData.name) ? profileData.name : '고블린 대장');
    var rankPoints = (state && typeof state.rankPoints === 'number' && !isNaN(state.rankPoints) && state.rankPoints >= 0)
      ? state.rankPoints
      : 0;

    // 조각 10: 던전 레이드 최고 점수 (raidBest)
    var raidBest = (state && typeof state.raidBest === 'number' && !isNaN(state.raidBest) && state.raidBest >= 0)
      ? state.raidBest
      : 0;

    if (profileData) {
      profileData.name = userNickname;
    }

    var data = {
      bestChain: state && typeof state.bestChain === 'number' && !isNaN(state.bestChain) ? state.bestChain : 0,
      totalWins: state && typeof state.totalWins === 'number' && !isNaN(state.totalWins) ? state.totalWins : 0,
      totalBattles: state && typeof state.totalBattles === 'number' && !isNaN(state.totalBattles) ? state.totalBattles : 0,
      gold: state && typeof state.gold === 'number' && !isNaN(state.gold) ? state.gold : 0,
      lastPlayedAt: (state && typeof state.lastPlayedAt === 'string') ? state.lastPlayedAt : new Date().toISOString(),
      profile: profileData,
      maxStage: maxStage,
      unlockedHumanVillage: unlockedHumanVillage,
      isTwoStar: isTwoStar,
      endingSeen: endingSeen,
      clearedStages: clearedStages,
      userNickname: userNickname,
      rankPoints: rankPoints,
      raidBest: raidBest
    };

    try {
      var storage = getSafeStorage();
      storage.setItem(STORAGE_KEY_V1, JSON.stringify(data));
    } catch (e) {
      // 로컬 스토리지 비활성화나 용량 초과 등 오류 시에도 무중단
    }

    return data;
  }

  /**
   * 저장된 게임 진행 상황 불러오기 (마이그레이션, 프로필 복구 포함)
   * @returns {Object} { bestChain, totalWins, totalBattles, gold, lastPlayedAt, profile }
   */
  function loadGameState() {
    var defaultState = {
      bestChain: 0,
      totalWins: 0,
      totalBattles: 0,
      gold: 0,
      lastPlayedAt: new Date().toISOString(),
      profile: createGoblinProfile(),
      maxStage: 1,
      unlockedHumanVillage: false,
      isTwoStar: false,
      endingSeen: false,
      clearedStages: [],
      userNickname: '고블린 대장',
      rankPoints: 0,
      raidBest: 0
    };

    try {
      var storage = getSafeStorage();
      var raw = storage.getItem(STORAGE_KEY_V1);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          var restoredProfile = parsed.profile ? createGoblinProfile(parsed.profile) : createGoblinProfile();
          var maxStage = (typeof parsed.maxStage === 'number' && parsed.maxStage >= 1) ? parsed.maxStage : 1;
          var unlockedHumanVillage = Boolean(parsed.unlockedHumanVillage || maxStage >= 6);
          var isTwoStar = Boolean(parsed.isTwoStar);
          var endingSeen = Boolean(parsed.endingSeen);
          var clearedStages = Array.isArray(parsed.clearedStages) ? parsed.clearedStages.slice() : [];

          var userNickname = (typeof parsed.userNickname === 'string' && parsed.userNickname.trim().length > 0)
            ? parsed.userNickname.trim()
            : (restoredProfile ? restoredProfile.name : '고블린 대장');
          var rankPoints = (typeof parsed.rankPoints === 'number' && !isNaN(parsed.rankPoints)) ? parsed.rankPoints : 0;
          var raidBest = (typeof parsed.raidBest === 'number' && !isNaN(parsed.raidBest) && parsed.raidBest >= 0) ? parsed.raidBest : 0;
          if (restoredProfile) {
            restoredProfile.name = userNickname;
          }

          return {
            bestChain: typeof parsed.bestChain === 'number' && !isNaN(parsed.bestChain) ? parsed.bestChain : 0,
            totalWins: typeof parsed.totalWins === 'number' && !isNaN(parsed.totalWins) ? parsed.totalWins : 0,
            totalBattles: typeof parsed.totalBattles === 'number' && !isNaN(parsed.totalBattles) ? parsed.totalBattles : 0,
            gold: typeof parsed.gold === 'number' && !isNaN(parsed.gold) ? parsed.gold : 0,
            lastPlayedAt: typeof parsed.lastPlayedAt === 'string' ? parsed.lastPlayedAt : new Date().toISOString(),
            profile: restoredProfile,
            maxStage: maxStage,
            unlockedHumanVillage: unlockedHumanVillage,
            isTwoStar: isTwoStar,
            endingSeen: endingSeen,
            clearedStages: clearedStages,
            userNickname: userNickname,
            rankPoints: rankPoints,
            raidBest: raidBest
          };
        }
      }

      // v1 데이터가 없을 때: 조각 1의 최고 연결 기록(goblin_best_chain) 마이그레이션 확인
      var legacyBest = storage.getItem(STORAGE_KEY_LEGACY_BEST);
      if (legacyBest !== null && legacyBest !== undefined) {
        var parsedLegacy = parseInt(legacyBest, 10);
        if (!isNaN(parsedLegacy) && parsedLegacy > 0) {
          defaultState.bestChain = parsedLegacy;
          saveGameState(defaultState);
        }
      }
    } catch (e) {
      // 오류 발생 시 안전하게 기본값 반환
    }

    return defaultState;
  }

  /**
   * 보스전 상태 객체 깊은 복사 헬퍼 (순수 함수 유지용)
   * @param {Object} state
   * @returns {Object}
   */
  function cloneBossState(state) {
    if (!state) return state;
    var bossCopy = Object.assign({}, state.boss);
    var minionsCopy = [];
    if (Array.isArray(state.minions)) {
      for (var i = 0; i < state.minions.length; i++) {
        var m = Object.assign({}, state.minions[i]);
        if (state.minions[i].buff) {
          m.buff = Object.assign({}, state.minions[i].buff);
        }
        minionsCopy.push(m);
      }
    }
    var playerCopy = Object.assign({}, state.player);
    var activeBuffsCopy = [];
    if (Array.isArray(state.activeBuffs)) {
      for (var b = 0; b < state.activeBuffs.length; b++) {
        activeBuffsCopy.push(Object.assign({}, state.activeBuffs[b], {
          effect: Object.assign({}, state.activeBuffs[b].effect)
        }));
      }
    }
    var profileCopy = state.profile ? Object.assign({}, state.profile, {
      stats: Object.assign({}, state.profile.stats)
    }) : null;

    return {
      stage: typeof state.stage === 'number' ? state.stage : 9,
      boss: bossCopy,
      enemy: bossCopy,
      minions: minionsCopy,
      player: playerCopy,
      turn: typeof state.turn === 'number' ? state.turn : 1,
      status: typeof state.status === 'string' ? state.status : 'playing',
      targetType: state.targetType || 'boss',
      targetIndex: typeof state.targetIndex === 'number' ? state.targetIndex : -1,
      gold: typeof state.gold === 'number' ? state.gold : 0,
      logs: Array.isArray(state.logs) ? state.logs.slice() : [],
      activeBuffs: activeBuffsCopy,
      lastDiceBuff: state.lastDiceBuff ? Object.assign({}, state.lastDiceBuff) : null,
      profile: profileCopy,
      reflectedDamage: typeof state.reflectedDamage === 'number' ? state.reflectedDamage : 0,
      minionKilledThisTurn: Boolean(state.minionKilledThisTurn)
    };
  }

  /**
   * 보스전(9·10 스테이지) 상태 객체 생성 (순수 함수)
   * @param {number} stageNumber 스테이지 번호 (9 또는 10)
   * @param {Object} [profile] 고블린 성장 프로필
   * @returns {Object} 보스전 상태 객체
   */
  function createBossBattle(stageNumber, profile) {
    var stage = (stageNumber === 10) ? 10 : 9;
    var activeProfile = null;
    if (profile) {
      activeProfile = (profile.stats && profile.role)
        ? Object.assign({}, profile, { stats: Object.assign({}, profile.stats) })
        : createGoblinProfile(profile);
    }

    var pMaxHp = (activeProfile && activeProfile.stats && typeof activeProfile.stats.maxHp === 'number')
      ? activeProfile.stats.maxHp
      : 20;
    var pAtk = (activeProfile && activeProfile.stats && typeof activeProfile.stats.atk === 'number')
      ? activeProfile.stats.atk
      : 1;

    var boss;
    var minions;

    if (stage === 9) {
      boss = {
        name: '성문 수문장',
        hp: 30,
        maxHp: 30,
        atk: 4,
        emoji: '🛡️',
        reflectTurns: 0
      };
      minions = [
        { id: 1, name: '경비병 A', hp: 8, maxHp: 8, atk: 2, shield: 0 },
        { id: 2, name: '경비병 B', hp: 8, maxHp: 8, atk: 2, shield: 0 }
      ];
    } else {
      boss = {
        name: '인간 마을 영주',
        hp: 50,
        maxHp: 50,
        atk: 6,
        emoji: '👑',
        reflectTurns: 0
      };
      minions = [
        { id: 1, name: '근위 기사', hp: 12, maxHp: 12, atk: 3, shield: 0 },
        { id: 2, name: '왕실 마법사', hp: 10, maxHp: 10, atk: 4, shield: 0 },
        { id: 3, name: '정예 궁수', hp: 8, maxHp: 8, atk: 3, shield: 0 }
      ];
    }

    return {
      stage: stage,
      boss: boss,
      enemy: boss,
      minions: minions,
      player: {
        maxHp: pMaxHp,
        hp: pMaxHp,
        atk: pAtk,
        shield: 0
      },
      turn: 1,
      status: 'playing',
      targetType: 'boss',
      targetIndex: -1,
      gold: 0,
      logs: [],
      activeBuffs: [],
      lastDiceBuff: null,
      profile: activeProfile,
      reflectedDamage: 0,
      minionKilledThisTurn: false
    };
  }

  /**
   * 보스 페이즈 계산: 살아있는 신하 버프 부여 및 10스테이지 반사 버프 가동 (순수 함수)
   * @param {Object} bossState 보스전 상태 객체
   * @param {function(): number} [rng] 난수 생성기
   * @returns {Object} 새 보스전 상태 객체
   */
  function applyBossPhase(bossState, rng) {
    if (!bossState || bossState.status !== 'playing') {
      return bossState;
    }
    var safeRng = typeof rng === 'function' ? rng : Math.random;
    var nextState = cloneBossState(bossState);

    // 1. 살아있는 신하 중 무작위 1~2마리에게 버프 부여 (방어막 +3 또는 공격력 +2)
    var aliveIndices = [];
    for (var i = 0; i < nextState.minions.length; i++) {
      if (nextState.minions[i].hp > 0) {
        aliveIndices.push(i);
      }
    }

    if (aliveIndices.length > 0) {
      var pickCount = 1;
      if (aliveIndices.length >= 2) {
        pickCount = safeRng() < 0.5 ? 1 : 2;
      }

      var chosenIndices = [];
      var pool = aliveIndices.slice();
      for (var k = 0; k < pickCount && pool.length > 0; k++) {
        var randIdx = Math.floor(safeRng() * pool.length);
        chosenIndices.push(pool[randIdx]);
        pool.splice(randIdx, 1);
      }

      for (var c = 0; c < chosenIndices.length; c++) {
        var m = nextState.minions[chosenIndices[c]];
        var isShield = safeRng() < 0.5;
        if (isShield) {
          m.shield = (m.shield || 0) + 3;
          m.buff = { type: 'shield', val: 3, label: '🛡️ 방어막 +3' };
          nextState.logs.push('[보스 버프] ' + m.name + '에게 방어막 +3 부여!');
        } else {
          m.atk = (typeof m.atk === 'number' ? m.atk : 2) + 2;
          m.buff = { type: 'atk', val: 2, label: '⚔️ 공격력 +2' };
          nextState.logs.push('[보스 버프] ' + m.name + '에게 공격력 +2 부여!');
        }
      }
    }

    // 2. 10스테이지 보스: 3턴마다 '반사 데미지 버프(reflectTurns: 2)'를 발동
    if (nextState.stage === 10) {
      if (nextState.turn % 3 === 0) {
        nextState.boss.reflectTurns = 2;
        nextState.logs.push('[보스 특수] 인간 마을 영주가 🪞 반사 방어막(2턴)을 가동했습니다!');
      }
    }

    return nextState;
  }

  /**
   * 보스전 플레이어 턴 및 적 합동 반격 계산 (순수 함수)
   * @param {Object} bossState 현재 보스전 상태 객체
   * @param {{cleared: number, type: number, big?: boolean}} resolveResult 퍼즐 해결 결과
   * @param {string} [targetType] 'boss' 또는 'minion'
   * @param {number} [targetIndex] 신하 인덱스 (0~2)
   * @param {function(): number} [rng] 난수 생성기
   * @returns {Object} 새 보스전 상태 객체
   */
  function applyPlayerBossTurn(bossState, resolveResult, targetType, targetIndex, rng) {
    if (!bossState || !resolveResult || typeof resolveResult.cleared !== 'number' || resolveResult.cleared < 3) {
      return bossState;
    }
    if (bossState.status !== 'playing') {
      return bossState;
    }

    var safeRng = typeof rng === 'function' ? rng : Math.random;
    var nextState = cloneBossState(bossState);
    var activeProfile = nextState.profile;

    nextState.reflectedDamage = 0;
    nextState.minionKilledThisTurn = false;

    var cleared = resolveResult.cleared;
    var type = resolveResult.type;
    var diceLog = '';

    // 1. 10칸 이상 시 주사위 버프 발동
    if (resolveResult.big === true) {
      var diceBuff;
      if (activeProfile && activeProfile.family === 'gold_finger') {
        var d1 = rollDiceBuff(safeRng);
        var d2 = rollDiceBuff(safeRng);
        diceBuff = (d2.dice > d1.dice) ? d2 : d1;
      } else {
        diceBuff = rollDiceBuff(safeRng);
      }
      nextState = applyBuffToState(nextState, diceBuff);
      diceLog = '🎲 ' + diceBuff.emoji + ' 눈금 ' + diceBuff.dice + ' [' + diceBuff.name + '] 발동! (' + diceBuff.desc + ')';

      if (nextState.boss.hp <= 0) {
        nextState.boss.hp = 0;
        nextState.status = 'victory';
        var expGained = (nextState.stage === 10) ? 100 : 50;
        if (nextState.profile) {
          nextState.profile = addExpToProfile(nextState.profile, expGained);
        }
        nextState.gainedExp = expGained;
        nextState.logs.push('[' + nextState.turn + '턴] ' + diceLog + ' -> 💣 폭탄 피해로 ' + nextState.boss.name + ' 처치! 보스전 승리!');
        nextState.turn += 1;
        return nextState;
      }
    }

    // 2. 활성 버프 확인 (공격 배율, 추가 데미지)
    var atkMultiplier = 1;
    var bonusDmg = 0;
    var furyActive = false;

    for (var i = 0; i < nextState.activeBuffs.length; i++) {
      var b = nextState.activeBuffs[i];
      if (b.effect) {
        if (typeof b.effect.multiplier === 'number' && b.effect.multiplier > atkMultiplier) {
          atkMultiplier = b.effect.multiplier;
          furyActive = true;
        }
        if (typeof b.effect.bonusDmg === 'number' && b.effect.bonusDmg > 0) {
          bonusDmg += b.effect.bonusDmg;
        }
      }
    }

    // 3. 보직 및 가문 특성 보너스 계산
    var roleBonus = activeProfile ? applyRoleBonus(activeProfile, resolveResult, nextState) : { bonusDamage: 0, healMultiplier: 1.0, overflowToShield: false, commsAlignTiles: 0, desc: '' };
    var famBonus = activeProfile ? applyFamilyBonus(activeProfile, { type: type, cleared: cleared }, safeRng) : { isCrit: false, critMultiplier: 1.0, shieldMultiplier: 1.0, goldMultiplier: 1.0, extraDiceRoll: false, maxHpBonus: 0, desc: '' };

    var actionDesc = '';
    var dealtDamage = 0;

    // 4. 칸 종류별 플레이어 행동
    if (type === 4) {
      // ☠️ 해골: 강력 타격
      var baseDmg = cleared;
      if (roleBonus.bonusDamage > 0) baseDmg += roleBonus.bonusDamage;
      dealtDamage = (baseDmg + bonusDmg) * atkMultiplier;
      if (famBonus.isCrit) dealtDamage = Math.floor(dealtDamage * famBonus.critMultiplier);
      actionDesc = '고블린 강력 타격(☠️) - ' + dealtDamage + ' 피해';
      if (furyActive) actionDesc += ' [대분노 2배!]';
      if (bonusDmg > 0) actionDesc += ' [축복 +' + bonusDmg + ']';
      if (famBonus.isCrit) actionDesc += ' [불꽃 이빨 치명타!]';
      if (roleBonus.desc) actionDesc += ' [' + roleBonus.desc + ']';
    } else if (type === 0) {
      // ⛏️ 곡괭이: 일반 공격
      var baseDmg = Math.max(1, Math.floor(cleared / 2));
      if (roleBonus.bonusDamage > 0) baseDmg += roleBonus.bonusDamage;
      dealtDamage = (baseDmg + bonusDmg) * atkMultiplier;
      actionDesc = '고블린 일반 공격(⛏️) - ' + dealtDamage + ' 피해';
      if (furyActive) actionDesc += ' [대분노 2배!]';
      if (bonusDmg > 0) actionDesc += ' [축복 +' + bonusDmg + ']';
      if (roleBonus.desc) actionDesc += ' [' + roleBonus.desc + ']';
    } else if (type === 1) {
      // 🛡️ 방패: 방어구 정비
      var shieldGain = Math.round(cleared * (famBonus.shieldMultiplier || 1.0));
      nextState.player.shield += shieldGain;
      actionDesc = '방어구 정비(🛡️) - 실드 +' + shieldGain + ' 충전 (현재 ' + nextState.player.shield + ')';
      if (famBonus.desc) actionDesc += ' [' + famBonus.desc + ']';
      if (roleBonus.bonusDamage > 0) {
        dealtDamage = roleBonus.bonusDamage;
        actionDesc += ' [' + roleBonus.desc + ' -> 추가 피해 ' + dealtDamage + ']';
      }
    } else if (type === 2) {
      // 🧪 물약: 체력 회복
      var rawHeal = Math.floor(cleared / 2);
      var healAmount = Math.floor(rawHeal * (roleBonus.healMultiplier || 1.0));
      var prevHp = nextState.player.hp;
      var targetHp = prevHp + healAmount;

      if (targetHp > nextState.player.maxHp) {
        if (roleBonus.overflowToShield) {
          var overflow = targetHp - nextState.player.maxHp;
          nextState.player.shield += overflow;
          actionDesc = '체력 회복(🧪) - HP +' + (nextState.player.maxHp - prevHp) + ' 및 실드 전환 +' + overflow;
        } else {
          actionDesc = '체력 회복(🧪) - HP +' + (nextState.player.maxHp - prevHp);
        }
        nextState.player.hp = nextState.player.maxHp;
      } else {
        nextState.player.hp = targetHp;
        actionDesc = '체력 회복(🧪) - HP +' + (nextState.player.hp - prevHp);
      }
      actionDesc += ' (현재 ' + nextState.player.hp + '/' + nextState.player.maxHp + ')';
      if (roleBonus.desc) actionDesc += ' [' + roleBonus.desc + ']';

      if (roleBonus.bonusDamage > 0) {
        dealtDamage = roleBonus.bonusDamage;
        actionDesc += ' [' + roleBonus.desc + ' -> 추가 피해 ' + dealtDamage + ']';
      }
    } else if (type === 3) {
      // 💰 금화: 전리품
      var goldGain = Math.round(cleared * (famBonus.goldMultiplier || 1.0));
      nextState.gold += goldGain;
      actionDesc = '전리품 획득(💰) - 골드 +' + goldGain + ' (총 ' + nextState.gold + ')';
      if (famBonus.desc) actionDesc += ' [' + famBonus.desc + ']';

      if (roleBonus.bonusDamage > 0) {
        dealtDamage = roleBonus.bonusDamage;
        actionDesc += ' [' + roleBonus.desc + ' -> 추가 피해 ' + dealtDamage + ']';
      }
    } else {
      actionDesc = '행동 완료';
    }

    // 5. 플레이어 공격 대상 타격
    var actualTarget = (targetType === 'minion') ? 'minion' : 'boss';
    var targetMinion = null;
    var targetIdx = (typeof targetIndex === 'number') ? targetIndex : 0;

    if (actualTarget === 'minion') {
      if (nextState.minions[targetIdx] && nextState.minions[targetIdx].hp > 0) {
        targetMinion = nextState.minions[targetIdx];
      } else {
        for (var mIdx = 0; mIdx < nextState.minions.length; mIdx++) {
          if (nextState.minions[mIdx].hp > 0) {
            targetMinion = nextState.minions[mIdx];
            targetIdx = mIdx;
            break;
          }
        }
        if (!targetMinion) {
          actualTarget = 'boss';
        }
      }
    }

    nextState.targetType = actualTarget;
    nextState.targetIndex = (actualTarget === 'minion') ? targetIdx : -1;

    if (dealtDamage > 0) {
      if (actualTarget === 'minion' && targetMinion) {
        var remainDmg = dealtDamage;
        if (targetMinion.shield && targetMinion.shield > 0) {
          if (targetMinion.shield >= remainDmg) {
            targetMinion.shield -= remainDmg;
            remainDmg = 0;
          } else {
            remainDmg -= targetMinion.shield;
            targetMinion.shield = 0;
          }
        }
        targetMinion.hp = Math.max(0, targetMinion.hp - remainDmg);
        actionDesc += ' -> ' + targetMinion.name + ' 타격(남은 HP: ' + targetMinion.hp + ')';

        // 신하 처치 시 보스 체력 -1 규칙 (설계서 핵심 반영)
        if (targetMinion.hp <= 0) {
          targetMinion.hp = 0;
          nextState.boss.hp = Math.max(0, nextState.boss.hp - 1);
          nextState.minionKilledThisTurn = true;
          actionDesc += ' 💥 ' + targetMinion.name + ' 처치! 보스 체력 즉시 -1 (보스 HP: ' + nextState.boss.hp + ')';
        }
      } else {
        nextState.boss.hp = Math.max(0, nextState.boss.hp - dealtDamage);
        actionDesc += ' -> 보스 ' + nextState.boss.name + '에게 ' + dealtDamage + ' 피해 (보스 HP: ' + nextState.boss.hp + ')';

        // 10스테이지 반사 데미지 규칙
        if (nextState.boss.reflectTurns && nextState.boss.reflectTurns > 0) {
          var reflectDmg = Math.max(1, Math.floor(dealtDamage * 0.3));
          nextState.player.hp = Math.max(0, nextState.player.hp - reflectDmg);
          nextState.reflectedDamage = reflectDmg;
          actionDesc += ' [🪞 반사 데미지 발동! 고블린 -' + reflectDmg + ' 피해]';

          if (nextState.player.hp <= 0) {
            nextState.player.hp = 0;
            nextState.status = 'defeat';
          }
        }
      }
    }

    // 6. 보스 사망 판정 (즉시 최종 승리)
    if (nextState.boss.hp <= 0) {
      nextState.boss.hp = 0;
      nextState.status = 'victory';

      var expReward = (nextState.stage === 10) ? 100 : 50;
      if (nextState.profile) {
        nextState.profile = addExpToProfile(nextState.profile, expReward);
      }
      nextState.gainedExp = expReward;

      var winLog = '[' + nextState.turn + '턴] ';
      if (diceLog) winLog += diceLog + ' | ';
      winLog += actionDesc + ' -> 👑 ' + nextState.boss.name + ' 격파! 레이드 승리!';
      if (nextState.profile && nextState.profile.leveledUp) {
        winLog += ' 🎖️ [' + nextState.profile.rankTitle + '] 승급 완료!';
      }
      nextState.logs.push(winLog);

      nextState.activeBuffs = nextState.activeBuffs
        .map(function(buff) { return Object.assign({}, buff, { turns: buff.turns - 1 }); })
        .filter(function(buff) { return buff.turns > 0; });

      if (nextState.boss.reflectTurns > 0) {
        nextState.boss.reflectTurns -= 1;
      }

      nextState.turn += 1;
      return nextState;
    }

    // 반사 피해로 고블린 패배 시 판정
    if (nextState.status === 'defeat') {
      var defeatLog = '[' + nextState.turn + '턴] ';
      if (diceLog) defeatLog += diceLog + ' | ';
      defeatLog += actionDesc + ' -> 고블린 쓰러짐 (반사 피해 패배)';
      nextState.logs.push(defeatLog);
      nextState.turn += 1;
      return nextState;
    }

    // 7. 살아있는 신하들과 보스의 합동 반격 계산 (고블린 실드 우선 흡수)
    var skipEnemyTurn = false;
    var absorbAll = false;

    for (var j = 0; j < nextState.activeBuffs.length; j++) {
      var ab = nextState.activeBuffs[j];
      if (ab.effect) {
        if (ab.effect.skipEnemyTurn) skipEnemyTurn = true;
        if (ab.effect.absorbAll) absorbAll = true;
      }
    }

    var counterDesc = '';

    if (skipEnemyTurn) {
      counterDesc = '적 합동 반격 스킵! [⚡ 질풍노도 효과]';
    } else if (absorbAll) {
      counterDesc = '적 합동 반격! [🛡️ 돌가죽 0 피해 완전 흡수] (남은 HP: ' + nextState.player.hp + ')';
    } else {
      var totalEnemyAtk = Math.max(0, typeof nextState.boss.atk === 'number' ? nextState.boss.atk : 4);
      var aliveMinionCount = 0;
      for (var m = 0; m < nextState.minions.length; m++) {
        if (nextState.minions[m].hp > 0) {
          totalEnemyAtk += (typeof nextState.minions[m].atk === 'number' ? nextState.minions[m].atk : 2);
          aliveMinionCount += 1;
        }
      }

      var remainingDmg = totalEnemyAtk;
      var absorbed = 0;

      if (nextState.player.shield > 0) {
        if (nextState.player.shield >= remainingDmg) {
          absorbed = remainingDmg;
          nextState.player.shield -= remainingDmg;
          remainingDmg = 0;
        } else {
          absorbed = nextState.player.shield;
          remainingDmg -= nextState.player.shield;
          nextState.player.shield = 0;
        }
      }

      if (remainingDmg > 0) {
        nextState.player.hp -= remainingDmg;
        if (nextState.player.hp <= 0) {
          nextState.player.hp = 0;
          nextState.status = 'defeat';
        }
      }

      counterDesc = '적 합동 반격(보스+신하 ' + aliveMinionCount + '마리, 총 ' + totalEnemyAtk + ' 피해)! ';
      if (absorbed > 0) counterDesc += '실드가 ' + absorbed + ' 흡수, ';
      counterDesc += '고블린에게 ' + remainingDmg + ' 피해 (남은 HP: ' + nextState.player.hp + ')';
      if (nextState.status === 'defeat') counterDesc += ' -> 고블린 쓰러짐 (패배)';
    }

    // 8. 버프 턴 및 반사 버프 턴 차감
    nextState.activeBuffs = nextState.activeBuffs
      .map(function(buff) { return Object.assign({}, buff, { turns: buff.turns - 1 }); })
      .filter(function(buff) { return buff.turns > 0; });

    if (nextState.boss.reflectTurns > 0) {
      nextState.boss.reflectTurns -= 1;
    }

    // 9. 로그 기록 및 턴 수 증가
    var combinedLog = '[' + nextState.turn + '턴] ';
    if (diceLog) combinedLog += diceLog + ' | ';
    combinedLog += actionDesc + ' | ' + counterDesc;
    nextState.logs.push(combinedLog);

    nextState.turn += 1;
    return nextState;
  }

  // ==========================================
  // 조각 6: 이야기·마을 시스템 및 난이도 순수 함수
  // ==========================================

  /**
   * 1~10 스테이지 및 스토리 컷씬 대사 테이블
   */
  var STORY_DIALOGUES = {
    '1:enter': [
      { speaker: '원스타 고블린 대장', text: '크하하! 위대한 투스타 대장이 되기 위해 첫 약탈을 시작한다!' },
      { speaker: '개미 정찰병', text: '더듬이가 위험을 감지했다 찌익!' }
    ],
    '1:clear': [
      { speaker: '원스타 고블린 대장', text: '일개미 따위는 내 상대가 안 되지! 더 깊은 곳으로 가자!' }
    ],
    '2:enter': [
      { speaker: '원스타 고블린 대장', text: '더 굵직한 녀석들이 나타났군. 전원 전투 대형!' },
      { speaker: '병정개미', text: '외피가 단단한 병정개미 군단이다 찌익!' }
    ],
    '2:clear': [
      { speaker: '원스타 고블린 대장', text: '단단한 껍질도 우리 곡괭이 앞에서는 부서질 뿐이다!' }
    ],
    '3:enter': [
      { speaker: '독침개미', text: '치명적인 개미산 독침 맛을 보아라!' }
    ],
    '3:clear': [
      { speaker: '원스타 고블린 대장', text: '독 따위는 고블린의 강인한 위장으로 씹어먹는다!' }
    ],
    '4:enter': [
      { speaker: '대형 개미전사', text: '여왕님의 굴을 더럽히는 침략자 녀석들을 짓밟아라!' }
    ],
    '4:clear': [
      { speaker: '원스타 고블린 대장', text: '거대 전사도 쓰러졌다! 여왕개미의 친위대만 남았군!' }
    ],
    '5:enter': [
      { speaker: '원스타 고블린 대장', text: '개미굴의 최종 심장부다! 전리품을 털어라!' },
      { speaker: '여왕개미 신하부대', text: '여왕 폐하를 지켜라! 개미굴의 모든 정예병 총출동이다!' }
    ],
    '5:clear': [
      { speaker: '원스타 고블린 대장', text: '개미굴을 완벽히 점령했다! 이제 인간 마을로 출정한다!' }
    ],
    '6:enter': [
      { speaker: '인간 자경단', text: '괴물 고블린들이 마을 성벽을 넘었다! 모두 무기를 들어라!' }
    ],
    '6:clear': [
      { speaker: '원스타 고블린 대장', text: '인간 자경단도 별거 아니군! 성벽으로 진격한다!' }
    ],
    '7:enter': [
      { speaker: '성벽 경비병', text: '성문을 굳게 걸어잠가라! 고블린들에게 활과 창을 퍼부어라!' }
    ],
    '7:clear': [
      { speaker: '원스타 고블린 대장', text: '성벽이 뚫렸다! 왕국 정규군 기사들이 몰려온다!' }
    ],
    '8:enter': [
      { speaker: '왕국 돌격기사', text: '국왕 폐하의 이름으로 사악한 녹색 괴물들을 섬멸하리라!' }
    ],
    '8:clear': [
      { speaker: '원스타 고블린 대장', text: '돌격기사도 무너졌다! 이제 관문 수문장만 남았다!' }
    ],
    '9:enter': [
      { speaker: '관문 수문장', text: '내가 이 관문을 지키는 한 단 한 마리의 고블린도 지나갈 수 없다!' }
    ],
    '9:clear': [
      { speaker: '원스타 고블린 대장', text: '관문이 열렸다! 영주의 저택이 눈앞이다! 전군 돌격!!' }
    ],
    '10:enter': [
      { speaker: '인간 영주', text: '감히 미천한 고블린 녀석들이 내 저택까지 기어오르다니... 반사 마법으로 재로 만들어주마!' }
    ],
    '10:clear': [
      { speaker: '원스타 고블린 대장', text: '영주를 꺾었다! 마침내 내가 전설의 투스타(⭐⭐) 고블린 대장이다!!' }
    ]
  };

  /**
   * 스테이지 입장/클리어 시 스토리 대사 배열 반환 (순수 함수)
   * @param {number|string} stageNumber 스테이지 번호 (1~10)
   * @param {'enter'|'clear'} moment 입장 시('enter') 또는 클리어 시('clear')
   * @returns {Array<{speaker: string, text: string}>} 대사 배열
   */
  function getStoryDialogue(stageNumber, moment) {
    var key = String(stageNumber) + ':' + String(moment);
    var list = STORY_DIALOGUES[key];
    if (!Array.isArray(list)) {
      return [];
    }
    return list.map(function(item) {
      return { speaker: item.speaker, text: item.text };
    });
  }

  /**
   * 1~10 전 스테이지 설정 및 마을/난이도 정의
   */
  var STAGE_CONFIGS = {
    1: {
      stage: 1,
      village: 'ant',
      villageName: '거대 개미 마을',
      difficulty: 'easy',
      enemy: { name: '거대 일개미', hp: 15, maxHp: 15, atk: 2, emoji: '🐜' },
      bgTheme: 'ant-cave',
      isBoss: false
    },
    2: {
      stage: 2,
      village: 'ant',
      villageName: '거대 개미 마을',
      difficulty: 'easy',
      enemy: { name: '병정개미', hp: 20, maxHp: 20, atk: 3, emoji: '🐜' },
      bgTheme: 'ant-cave',
      isBoss: false
    },
    3: {
      stage: 3,
      village: 'ant',
      villageName: '거대 개미 마을',
      difficulty: 'easy',
      enemy: { name: '독침개미', hp: 22, maxHp: 22, atk: 3, emoji: '🦂' },
      bgTheme: 'ant-cave',
      isBoss: false
    },
    4: {
      stage: 4,
      village: 'ant',
      villageName: '거대 개미 마을',
      difficulty: 'easy',
      enemy: { name: '대형 개미전사', hp: 28, maxHp: 28, atk: 4, emoji: '🦗' },
      bgTheme: 'ant-cave',
      isBoss: false
    },
    5: {
      stage: 5,
      village: 'ant',
      villageName: '거대 개미 마을',
      difficulty: 'easy',
      enemy: { name: '여왕개미 신하부대', hp: 35, maxHp: 35, atk: 4, emoji: '👑🐜' },
      bgTheme: 'ant-cave',
      isBoss: false
    },
    6: {
      stage: 6,
      village: 'human',
      villageName: '인간 마을',
      difficulty: 'hard',
      enemy: { name: '농민 자경단', hp: 35, maxHp: 35, atk: 5, emoji: '👨‍🌾' },
      bgTheme: 'human-town',
      isBoss: false
    },
    7: {
      stage: 7,
      village: 'human',
      villageName: '인간 마을',
      difficulty: 'hard',
      enemy: { name: '성벽 경비병', hp: 42, maxHp: 42, atk: 6, emoji: '🛡️' },
      bgTheme: 'human-town',
      isBoss: false
    },
    8: {
      stage: 8,
      village: 'human',
      villageName: '인간 마을',
      difficulty: 'hard',
      enemy: { name: '왕국 돌격기사', hp: 48, maxHp: 48, atk: 7, emoji: '⚔️' },
      bgTheme: 'human-town',
      isBoss: false
    },
    9: {
      stage: 9,
      village: 'human',
      villageName: '인간 마을',
      difficulty: 'hard',
      enemy: { name: '관문 수문장', hp: 30, maxHp: 30, atk: 4, emoji: '🛡️' },
      bgTheme: 'human-town',
      isBoss: true
    },
    10: {
      stage: 10,
      village: 'human',
      villageName: '인간 마을',
      difficulty: 'hard',
      enemy: { name: '인간 영주', hp: 50, maxHp: 50, atk: 6, emoji: '👑' },
      bgTheme: 'human-town',
      isBoss: true
    }
  };

  /**
   * 1~10 스테이지별 마을 및 적 설정 객체 반환 (순수 함수)
   * @param {number|string} stageNumber 스테이지 번호
   * @returns {{ stage: number, village: 'ant'|'human', villageName: string, difficulty: 'easy'|'hard', enemy: Object, bgTheme: string, isBoss: boolean }}
   */
  function getStageConfig(stageNumber) {
    var num = parseInt(stageNumber, 10);
    if (isNaN(num) || num < 1) num = 1;
    if (num > 10) num = 10;
    var cfg = STAGE_CONFIGS[num];
    return {
      stage: cfg.stage,
      village: cfg.village,
      villageName: cfg.villageName,
      difficulty: cfg.difficulty,
      enemy: Object.assign({}, cfg.enemy),
      bgTheme: cfg.bgTheme,
      isBoss: cfg.isBoss
    };
  }

  /**
   * 클리어한 스테이지를 반영하여 최고 도달 스테이지(maxStage) 및 마을 해금 갱신 (순수 함수)
   * @param {Object} saveState 현재 저장 상태
   * @param {number} clearedStage 방금 클리어한 스테이지 번호 (1~10)
   * @returns {Object} 갱신된 새 저장 상태 객체
   */
  function checkProgression(saveState, clearedStage) {
    var state = saveState || {};
    var stage = (typeof clearedStage === 'number' && !isNaN(clearedStage)) ? clearedStage : 0;
    var currentMax = (typeof state.maxStage === 'number' && state.maxStage >= 1) ? state.maxStage : 1;
    var nextMax = Math.max(currentMax, Math.min(10, stage + 1));

    var unlockedHuman = Boolean(state.unlockedHumanVillage || stage >= 5 || nextMax >= 6);
    var isTwoStar = Boolean(state.isTwoStar || stage >= 10);
    var endingSeen = Boolean(state.endingSeen || stage >= 10);

    var clearedList = Array.isArray(state.clearedStages) ? state.clearedStages.slice() : [];
    if (stage >= 1 && stage <= 10 && clearedList.indexOf(stage) === -1) {
      clearedList.push(stage);
      clearedList.sort(function(a, b) { return a - b; });
    }

    return Object.assign({}, state, {
      maxStage: nextMax,
      unlockedHumanVillage: unlockedHuman,
      isTwoStar: isTwoStar,
      endingSeen: endingSeen,
      clearedStages: clearedList
    });
  }

  // ==========================================
  // 조각 7: 닉네임·도전장·순위 (오프라인 로컬 버전)
  // ==========================================

  /**
   * 금지어 및 비속어, 패드립 정규식 패턴 목록 (고블린 법칙)
   */
  var PROFANITY_PATTERNS = [
    /느[금검]마/i,
    /느개비/i,
    /니애[미비]/i,
    /니[엄아][마빠]/i,
    /엠[창생]/i,
    /애[미비]/i,
    /[시씨][\s_.~*]*[발빨]/i,
    /ㅅ[\s_.~*]*ㅂ/i,
    /개[\s_.~*]*[새새끼]/i,
    /개새/i,
    /병[\s_.~*]*신/i,
    /[ㅂㅄ][\s_.~*]*ㅅ/i,
    /지[\s_.~*]*랄/i,
    /ㅈ[\s_.~*]*ㄹ/i,
    /존[\s_.~*]*[나낟]/i,
    /좆/i,
    /창[녀남]/i,
    /등신/i,
    /호구/i,
    /새끼/i,
    /싸가지/i,
    /닥쳐/i,
    /ㄲ[\s_.~*]*ㅈ/i
  ];

  /**
   * 순화어 치환 매핑 테이블
   */
  var PROFANITY_REPLACEMENTS = [
    { pattern: /느[금검]마|니애[미비]|느개비|엠[창생]|니[엄아][마빠]/g, replace: '효도고블린' },
    { pattern: /애[미비]/g, replace: '가족' },
    { pattern: /[시씨][\s_.~*]*[발빨]|ㅅ[\s_.~*]*ㅂ/g, replace: '착한고블린' },
    { pattern: /개[\s_.~*]*[새새끼]|개새/g, replace: '멋진대원' },
    { pattern: /병[\s_.~*]*신|[ㅂㅄ][\s_.~*]*ㅅ/g, replace: '멋진대장' },
    { pattern: /지[\s_.~*]*랄|ㅈ[\s_.~*]*ㄹ/g, replace: '신바람' },
    { pattern: /존[\s_.~*]*[나낟]/g, replace: '매우' },
    { pattern: /좆/g, replace: '고블린' },
    { pattern: /새끼/g, replace: '대원' },
    { pattern: /창[녀남]|등신|호구|싸가지|닥쳐|ㄲ[\s_.~*]*ㅈ/g, replace: '착한친구' }
  ];

  /**
   * 닉네임 유효성 검사 순수 함수 (고블린 법칙 포함)
   * @param {string} nickname 검사할 닉네임
   * @returns {{ valid: boolean, nickname?: string, code?: string, reason?: string }}
   */
  function validateNickname(nickname) {
    if (typeof nickname !== 'string') {
      return {
        valid: false,
        code: 'INVALID_FORMAT',
        reason: '닉네임은 2자 이상 12자 이하의 문자열이어야 합니다.'
      };
    }

    var trimmed = nickname.trim();

    // 1. 길이 검사 (앞뒤 공백 제외 2자 이상 12자 이하)
    if (trimmed.length < 2 || trimmed.length > 12) {
      return {
        valid: false,
        code: 'INVALID_LENGTH',
        reason: '닉네임은 공백 제외 2자 이상 12자 이하이어야 합니다.'
      };
    }

    // 2. 허용 문자 검사 (한글, 영문, 숫자만 허용 - 특수문자 및 내부 공백 불가)
    var allowedRegex = /^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]+$/;
    if (!allowedRegex.test(trimmed)) {
      return {
        valid: false,
        code: 'INVALID_CHARACTERS',
        reason: '닉네임은 한글, 영문, 숫자만 사용할 수 있습니다 (특수문자·공백 제외).'
      };
    }

    // 3. 고블린 법칙: 욕설, 패드립, 비속어 검사
    for (var i = 0; i < PROFANITY_PATTERNS.length; i++) {
      if (PROFANITY_PATTERNS[i].test(trimmed)) {
        return {
          valid: false,
          code: 'GOBLIN_LAW_VIOLATION',
          reason: '고블린 법칙 위반: 욕설·패드립은 금지되어 있습니다.'
        };
      }
    }

    return {
      valid: true,
      nickname: trimmed
    };
  }

  /**
   * 텍스트 내 비속어를 순화어로 치환하는 순수 함수
   * @param {string} text 원본 텍스트
   * @returns {string} 순화된 텍스트
   */
  function filterProfanity(text) {
    if (typeof text !== 'string') return '';
    var result = text;
    for (var i = 0; i < PROFANITY_REPLACEMENTS.length; i++) {
      result = result.replace(PROFANITY_REPLACEMENTS[i].pattern, PROFANITY_REPLACEMENTS[i].replace);
    }
    return result;
  }

  /**
   * 시드 난수 기반 100명 가짜 랭커 목록 및 내 순위 산출 순수 함수
   * @param {number} [seed] 난수 시드 (생략 시 기본 77777)
   * @param {number} [userScore] 플레이어 점수
   * @param {string} [userNickname] 플레이어 닉네임
   * @param {string} [userRankTitle] 플레이어 계급
   * @returns {{ top100: Array<Object>, myRank: number, userScore: number, userNickname: string, userRankTitle: string }}
   */
  function generateMockLeaderboard(seed, userScore, userNickname, userRankTitle) {
    var rng = createRng(seed !== undefined && seed !== null ? seed : 77777);
    var uScore = (typeof userScore === 'number' && !isNaN(userScore) && userScore >= 0) ? userScore : 0;
    var uNick = (typeof userNickname === 'string' && userNickname.trim().length > 0) ? userNickname.trim() : '고블린 대장';
    var uTitle = (typeof userRankTitle === 'string' && userRankTitle.trim().length > 0) ? userRankTitle.trim() : '이등병';

    var prefixes = ['원스타', '불꽃', '강철', '황금', '천둥', '그림자', '선봉', '무적', '질풍', '붉은', '철벽', '어둠', '백발', '번개', '돌격', '강습', '광전사'];
    var suffixes = ['도살자', '망치', '대장', '사냥꾼', '포병', '운전병', '전사', '영웅', '암살자', '수호자', '사령관', '파괴자', '정복자', '추적자', '타격대'];
    var roles = ['driver', 'infantry', 'artillery', 'comms', 'medic'];
    var roleNames = { driver: '운전병', infantry: '보병', artillery: '포병', comms: '통신병', medic: '의무병' };
    var rankTitles = ['대령', '중령', '소령', '대위', '중위', '소위', '병장', '상병'];

    var rankers = [];
    var baseScores = [];

    // 100명의 고유 점수 생성 (내림차순 기준 점수선: 1위 약 15820 ~ 100위 약 1200)
    for (var i = 0; i < 100; i++) {
      var scoreVal = Math.round(15820 - (i * 144) + (rng() * 40 - 20));
      if (scoreVal < 1000) scoreVal = 1000 + Math.floor(rng() * 200);
      baseScores.push(scoreVal);
    }
    // 엄격한 내림차순 정렬
    baseScores.sort(function(a, b) { return b - a; });

    for (var j = 0; j < 100; j++) {
      var pIdx = Math.floor(rng() * prefixes.length);
      var sIdx = Math.floor(rng() * suffixes.length);
      var rIdx = Math.floor(rng() * roles.length);
      var tIdx = Math.min(rankTitles.length - 1, Math.floor((j / 100) * rankTitles.length) + (rng() > 0.7 ? 1 : 0));
      if (tIdx < 0) tIdx = 0;

      var rRole = roles[rIdx];
      var nick = prefixes[pIdx] + suffixes[sIdx];
      if (j === 0) {
        nick = '원스타도살자';
      } else if (j > 0 && nick === '원스타도살자') {
        nick = '투스타도살자';
      }

      var bestChain = Math.min(30, Math.max(15, Math.round(28 - (j * 0.12) + (rng() * 3 - 1.5))));

      rankers.push({
        rank: j + 1,
        nickname: nick,
        rankTitle: rankTitles[tIdx],
        role: roleNames[rRole],
        roleKey: rRole,
        score: baseScores[j],
        bestChain: bestChain
      });
    }

    // 내 순위(myRank) 산출
    var higherCount = 0;
    for (var k = 0; k < rankers.length; k++) {
      if (rankers[k].score > uScore) {
        higherCount++;
      }
    }

    var myRank;
    if (higherCount < 100) {
      myRank = higherCount + 1;
    } else {
      // 100위 밖 추정 순위
      var lastScore = rankers[99].score;
      var diff = Math.max(1, lastScore - uScore);
      myRank = 100 + Math.min(9900, Math.max(1, Math.floor(diff / 25)));
    }

    return {
      top100: rankers,
      myRank: myRank,
      userScore: uScore,
      userNickname: uNick,
      userRankTitle: uTitle
    };
  }

  /**
   * 순위표 특정 랭커를 상대로 1:1 대전 상태 생성 (순수 함수)
   * @param {Object} ranker 도전 대상 랭커 객체
   * @param {Object} [profile] 플레이어 고블린 프로필
   * @returns {Object} 전투 상태 객체
   */
  function createChallengeBattle(ranker, profile) {
    var r = ranker || {};
    var rNick = typeof r.nickname === 'string' ? r.nickname : '미지의 랭커';
    var rTitle = typeof r.rankTitle === 'string' ? r.rankTitle : '도전자';
    var rScore = (typeof r.score === 'number' && !isNaN(r.score)) ? r.score : 2000;
    var rRole = typeof r.role === 'string' ? r.role : '보병';

    // 랭커 스펙 계산 (점수에 비례)
    var enemyHp = Math.min(90, Math.max(25, 25 + Math.floor(rScore / 350)));
    var enemyAtk = Math.min(10, Math.max(2, 2 + Math.floor(rScore / 2500)));

    var enemyObj = {
      name: rNick,
      rankTitle: rTitle,
      role: rRole,
      maxHp: enemyHp,
      hp: enemyHp,
      atk: enemyAtk,
      emoji: '⚔️',
      isRanker: true
    };

    var battle = createBattleState({
      enemy: enemyObj,
      profile: profile
    });

    battle.battleType = 'challenge';
    battle.challenger = {
      nickname: rNick,
      rankTitle: rTitle,
      role: rRole,
      score: rScore,
      bestChain: r.bestChain || 15
    };
    battle.logs = ['⚔️ [' + rTitle + ' ' + rNick + '] 랭커에게 도전장을 보냈습니다! 1:1 모의 대전 시작!'];

    return battle;
  }

  // ==========================================
  // 조각 9 & 10: 던전 레이드 기본 규칙 (6x6, 무한 서바이벌, 특수 몬스터)
  // ==========================================

  var DEFAULT_RAID_BOARD_SIZE = 6;

  var RAID_SPAWN_RATES = {
    sword: 0.26,
    shield: 0.18,
    potion: 0.18,
    coin: 0.18,
    monster: 0.20
  };

  /**
   * 확률 분포에 따른 단일 레이드 칸 객체 생성 (순수 함수)
   * 규칙: 몬스터는 hp = 2 + level, atk = 1 + floor(level / 3)
   * level 2부터 새 몬스터의 15%는 특수 몬스터(spiky 또는 regen)
   * 판에 몬스터가 40% 초과 시 몬스터 대신 칼 생성
   * @param {number} [level] 레벨/난이도 (기본 1)
   * @param {function(): number} [rng] 난수 생성기
   * @param {number} [currentMonsterRatio] 현재 판의 몬스터 비율 (0.40 초과 시 몬스터 대신 칼)
   * @returns {{ type: string, hp: number, maxHp: number, atk: number, trait: string|null }}
   */
  function createRaidCell(level, rng, currentMonsterRatio) {
    var safeRng = typeof rng === 'function' ? rng : Math.random;
    var roll = safeRng();
    var lvl = (typeof level === 'number' && level >= 1) ? level : 1;

    var type = 'sword';
    if (roll < 0.26) {
      type = 'sword';
    } else if (roll < 0.44) {
      type = 'shield';
    } else if (roll < 0.62) {
      type = 'potion';
    } else if (roll < 0.80) {
      type = 'coin';
    } else {
      type = 'monster';
    }

    // 판에 몬스터가 이미 40% 넘으면 그 칸은 몬스터 대신 칼
    if (type === 'monster' && typeof currentMonsterRatio === 'number' && currentMonsterRatio > 0.40) {
      type = 'sword';
    }

    if (type === 'monster') {
      var maxHp = 2 + lvl;
      var atk = 1 + Math.floor(lvl / 3);
      var trait = null;

      // 특수 몬스터 (level 2부터 새 몬스터의 15%)
      if (lvl >= 2) {
        var tRoll = safeRng();
        if (tRoll < 0.15) {
          // 절반은 가시(spiky), 절반은 재생(regen)
          trait = (tRoll < 0.075) ? 'spiky' : 'regen';
        }
      }

      return {
        type: 'monster',
        hp: maxHp,
        maxHp: maxHp,
        atk: atk,
        trait: trait
      };
    }

    return {
      type: type,
      hp: 0,
      maxHp: 0,
      atk: 0,
      trait: null
    };
  }

  /**
   * 칼 3칸 연속 연결 가능 경로 탐색 DFS 헬퍼
   */
  function findSwordChainDFS(board, path, targetLen) {
    if (path.length >= targetLen) return path;
    var last = path[path.length - 1];
    var size = board.length;
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        var nr = last.r + dr;
        var nc = last.c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < board[nr].length) {
          if (board[nr][nc] && board[nr][nc].type === 'sword') {
            var alreadyIn = false;
            for (var p = 0; p < path.length; p++) {
              if (path[p].r === nr && path[p].c === nc) {
                alreadyIn = true;
                break;
              }
            }
            if (!alreadyIn) {
              var found = findSwordChainDFS(board, path.concat([{ r: nr, c: nc }]), targetLen);
              if (found) return found;
            }
          }
        }
      }
    }
    return null;
  }

  /**
   * 6x6 레이드 보드 2차원 배열 생성 (순수 함수)
   * 규칙: 몬스터 4마리 이상 보장, 처음부터 3칸 이상 칼 줄 보장
   * @param {number} [size] 보드 크기 (기본 DEFAULT_RAID_BOARD_SIZE = 6)
   * @param {number} [stageOrLevel] 레벨/난이도 (기본 1)
   * @param {function(): number} [rng] 난수 생성기
   * @returns {Array<Array<{ type: string, hp: number, maxHp: number, atk: number, trait: string|null }>>}
   */
  function createRaidBoard(size, stageOrLevel, rng) {
    var boardSize = (typeof size === 'number' && size >= 3) ? size : DEFAULT_RAID_BOARD_SIZE;
    var lvl = (typeof stageOrLevel === 'number' && stageOrLevel >= 1) ? stageOrLevel : 1;
    var safeRng = typeof rng === 'function' ? rng : Math.random;

    var board = [];
    var monsterCount = 0;
    var totalCells = boardSize * boardSize;

    for (var r = 0; r < boardSize; r++) {
      var row = [];
      for (var c = 0; c < boardSize; c++) {
        var curRatio = monsterCount / totalCells;
        var cell = createRaidCell(lvl, safeRng, curRatio);
        if (cell.type === 'monster') {
          monsterCount++;
        }
        row.push(cell);
      }
      board.push(row);
    }

    // 1. 최소 3칸 이상 바로 이을 수 있는 칼 줄 보장
    var hasSwordChain = false;
    for (var r1 = 0; r1 < boardSize; r1++) {
      for (var c1 = 0; c1 < boardSize; c1++) {
        if (board[r1][c1].type === 'sword') {
          var chain = findSwordChainDFS(board, [{ r: r1, c: c1 }], 3);
          if (chain && chain.length >= 3) {
            hasSwordChain = true;
            break;
          }
        }
      }
      if (hasSwordChain) break;
    }

    // 만약 3칸 이상 칼 줄이 없으면 row 0의 첫 3칸을 칼로 강제 설정
    if (!hasSwordChain) {
      for (var sc = 0; sc < 3; sc++) {
        if (board[0][sc].type === 'monster') {
          monsterCount--;
        }
        board[0][sc] = { type: 'sword', hp: 0, maxHp: 0, atk: 0, trait: null };
      }
    }

    // 2. 몬스터 4마리 이상 보장
    if (monsterCount < 4) {
      for (var mr = boardSize - 1; mr >= 0; mr--) {
        for (var mc = boardSize - 1; mc >= 0; mc--) {
          if (board[mr][mc].type !== 'monster' && board[mr][mc].type !== 'sword') {
            var mHp = 2 + lvl;
            var mAtk = 1 + Math.floor(lvl / 3);
            var mTrait = null;
            if (lvl >= 2) {
              var tr = safeRng();
              if (tr < 0.15) {
                mTrait = (tr < 0.075) ? 'spiky' : 'regen';
              }
            }
            board[mr][mc] = { type: 'monster', hp: mHp, maxHp: mHp, atk: mAtk, trait: mTrait };
            monsterCount++;
            if (monsterCount >= 4) break;
          }
        }
        if (monsterCount >= 4) break;
      }
    }

    return board;
  }

  /**
   * 레이드 선 잇기 경로 확장 및 뒤로 가기 (순수 함수)
   * 규칙:
   * 1. 몬스터만 3칸 이상 이어도 됨 (몬스터로 시작 가능, 칼 0개 가능)
   * 2. 칼 줄에는 인접한 칼 또는 몬스터 칸 포함 가능 (몬스터로 시작해 칼을 잇는 것도 허용, 몬스터끼리 연결도 허용)
   * 3. 방패·물약·금화 줄은 오직 동일 종류만 연결 가능
   * 4. 8방향 이웃, 중복 방지, 끝에서 2번째 칸이면 뒤로 가기(마지막 칸 취소)
   * @param {Array<Array<Object>>} board 현재 레이드 보드
   * @param {Array<{r: number, c: number}>} path 현재 경로
   * @param {{r: number, c: number}} cell 잇고자 하는 좌표
   * @returns {Array<{r: number, c: number}>} 새 경로 배열
   */
  function extendRaidPath(board, path, cell) {
    if (!cell || typeof cell.r !== 'number' || typeof cell.c !== 'number') {
      return Array.isArray(path) ? path : [];
    }
    var currentPath = Array.isArray(path) ? path : [];
    var size = board ? board.length : 0;

    // 보드 유효 범위 검사
    if (cell.r < 0 || cell.r >= size || cell.c < 0 || !board[cell.r] || cell.c >= board[cell.r].length) {
      return currentPath;
    }

    var targetCell = board[cell.r][cell.c];
    if (!targetCell) {
      return currentPath;
    }

    // 1. 비어 있으면 [cell] (몬스터로 시작 허용)
    if (currentPath.length === 0) {
      return [{ r: cell.r, c: cell.c }];
    }

    // 2. 뒤로 가기: 끝에서 두 번째 칸이면 마지막 칸 취소
    if (currentPath.length >= 2) {
      var secondToLast = currentPath[currentPath.length - 2];
      if (secondToLast.r === cell.r && secondToLast.c === cell.c) {
        return currentPath.slice(0, currentPath.length - 1);
      }
    }

    // 3-1. 이미 경로에 존재하는 칸 거부 (중복 방지)
    for (var i = 0; i < currentPath.length; i++) {
      if (currentPath[i].r === cell.r && currentPath[i].c === cell.c) {
        return currentPath;
      }
    }

    // 3-2. 직전 칸의 8방향 이웃 검사
    var last = currentPath[currentPath.length - 1];
    if (!isAdjacent(last, cell)) {
      return currentPath;
    }

    // 3-3. 종류 연결 규칙 검사
    var firstPos = currentPath[0];
    if (firstPos.r < 0 || firstPos.r >= size || firstPos.c < 0 || !board[firstPos.r] || firstPos.c >= board[firstPos.r].length) {
      return currentPath;
    }
    var firstCell = board[firstPos.r][firstPos.c];
    if (!firstCell) {
      return currentPath;
    }

    if (firstCell.type === 'sword' || firstCell.type === 'monster') {
      // 칼/몬스터 줄: 칼 또는 몬스터만 허용 (칼로 시작해 몬스터 연결, 몬스터로 시작해 칼 연결, 몬스터끼리 연결 모두 허용)
      if (targetCell.type !== 'sword' && targetCell.type !== 'monster') {
        return currentPath;
      }
    } else {
      // 그 외(방패, 물약, 금화): 동일 종류만 허용
      if (targetCell.type !== firstCell.type) {
        return currentPath;
      }
    }

    // 4. 경로 추가
    var nextPath = currentPath.slice();
    nextPath.push({ r: cell.r, c: cell.c });
    return nextPath;
  }

  /**
   * 새 레이드 상태 객체 생성 (순수 함수)
   * 조각 10: 6x6 보드, 무한 서바이벌 모드 (turn, kills, score, level)
   * @param {Object} [options] { level, stage, profile, rng, boardSize, player, gold }
   * @returns {Object} { board, player, gold, turn, kills, score, level, status, logs, lastEvents, activeBuffs, lastDiceBuff, profile, stage, goalKills }
   */
  /**
   * 새 레이드 상태 객체 생성 (순수 함수)
   * 조각 10 & 11: 6x6 보드, 무한 서바이벌 모드, 장비 강화·골드 상점·경험치 게이지
   * @param {Object} [options] { level, stage, profile, rng, boardSize, player, gold, upgradeGauge, goldGauge, pendingChoices, pendingChoice }
   * @returns {Object}
   */
  function createRaidState(options) {
    var opts = options || {};
    var lvl = (typeof opts.level === 'number' && opts.level >= 1)
      ? opts.level
      : ((typeof opts.stage === 'number' && opts.stage >= 1) ? opts.stage : 1);
    var boardSize = (typeof opts.boardSize === 'number' && opts.boardSize >= 3) ? opts.boardSize : DEFAULT_RAID_BOARD_SIZE;
    var safeRng = typeof opts.rng === 'function' ? opts.rng : Math.random;
    var prof = opts.profile ? Object.assign({}, opts.profile, { stats: Object.assign({}, opts.profile.stats) }) : createGoblinProfile();

    var maxHp = (prof && prof.stats && typeof prof.stats.maxHp === 'number') ? prof.stats.maxHp : 20;
    var baseAtk = (opts.player && typeof opts.player.baseAtk === 'number') ? opts.player.baseAtk : 1;
    var weaponAtk = (opts.player && typeof opts.player.weaponAtk === 'number') ? opts.player.weaponAtk : 1;
    var maxShield = (opts.player && typeof opts.player.maxShield === 'number') ? opts.player.maxShield : 8;
    var shield = (opts.player && typeof opts.player.shield === 'number') ? opts.player.shield : 0;
    var playerLevel = (opts.player && typeof opts.player.playerLevel === 'number') ? opts.player.playerLevel : 1;
    var exp = (opts.player && typeof opts.player.exp === 'number') ? opts.player.exp : 0;
    var shieldBonus = (opts.player && typeof opts.player.shieldBonus === 'number') ? opts.player.shieldBonus : 0;
    var potionBonus = (opts.player && typeof opts.player.potionBonus === 'number') ? opts.player.potionBonus : 0;

    var player = {
      maxHp: (opts.player && typeof opts.player.maxHp === 'number') ? opts.player.maxHp : maxHp,
      hp: (opts.player && typeof opts.player.hp === 'number') ? opts.player.hp : maxHp,
      shield: shield,
      maxShield: maxShield,
      baseAtk: baseAtk,
      weaponAtk: weaponAtk,
      playerLevel: playerLevel,
      exp: exp,
      shieldBonus: shieldBonus,
      potionBonus: potionBonus
    };

    var board = createRaidBoard(boardSize, lvl, safeRng);
    var pendingChoices = Array.isArray(opts.pendingChoices)
      ? opts.pendingChoices.slice()
      : (opts.pendingChoice ? [opts.pendingChoice] : []);
    var pendingChoice = pendingChoices.length > 0 ? pendingChoices[0] : null;

    return {
      board: board,
      player: player,
      gold: (typeof opts.gold === 'number' && !isNaN(opts.gold)) ? opts.gold : 0,
      upgradeGauge: (typeof opts.upgradeGauge === 'number' && !isNaN(opts.upgradeGauge)) ? opts.upgradeGauge : 0,
      goldGauge: (typeof opts.goldGauge === 'number' && !isNaN(opts.goldGauge)) ? opts.goldGauge : 0,
      pendingChoices: pendingChoices,
      pendingChoice: pendingChoice,
      turn: (typeof opts.turn === 'number' && !isNaN(opts.turn)) ? opts.turn : 0,
      kills: (typeof opts.kills === 'number' && !isNaN(opts.kills)) ? opts.kills : 0,
      score: (typeof opts.score === 'number' && !isNaN(opts.score)) ? opts.score : 0,
      level: lvl,
      status: 'playing',
      logs: ['[Lv.' + lvl + ' 난이도] 던전 레이드 서바이벌 시작! 끝까지 생존하여 최고 점수를 기록하세요!'],
      lastEvents: [],
      activeBuffs: [],
      lastDiceBuff: null,
      profile: prof,
      // 하위 호환 필드 유지
      stage: lvl,
      goalKills: Infinity
    };
  }

  /**
   * 플레이어 레벨에 따른 다음 레벨업 필요 경험치 계산 (순수 함수)
   * 공식: 8 + playerLevel * 4
   * @param {number} [playerLevel]
   * @returns {number}
   */
  function getRaidExpToNext(playerLevel) {
    var lvl = (typeof playerLevel === 'number' && playerLevel >= 1) ? Math.floor(playerLevel) : 1;
    return 8 + lvl * 4;
  }

  /**
   * 레이드 선택지 적용 (순수 함수)
   * 원본 raidState는 변경하지 않고 깊은 복사본을 반환
   * 범위 밖 인덱스이거나 선택 대기 중이 아니면 raidState 그대로 반환
   * @param {Object} raidState
   * @param {number} choiceIndex 0, 1, 2
   * @returns {Object}
   */
  function applyRaidChoice(raidState, choiceIndex) {
    if (!raidState || typeof raidState !== 'object') {
      return raidState;
    }
    var choices = Array.isArray(raidState.pendingChoices)
      ? raidState.pendingChoices
      : (raidState.pendingChoice ? [raidState.pendingChoice] : []);
    if (choices.length === 0) {
      return raidState;
    }

    var curChoice = choices[0];
    if (!curChoice || !Array.isArray(curChoice.options)) {
      return raidState;
    }

    if (typeof choiceIndex !== 'number' || isNaN(choiceIndex)) {
      return raidState;
    }
    var idx = Math.floor(choiceIndex);
    if (idx < 0 || idx >= curChoice.options.length) {
      return raidState;
    }

    var selectedOption = curChoice.options[idx];

    // 깊은 복사
    var nextState = JSON.parse(JSON.stringify(raidState));
    if (raidState.profile) {
      nextState.profile = Object.assign({}, raidState.profile, { stats: Object.assign({}, raidState.profile.stats) });
    }

    var player = nextState.player || {};
    var pShield = typeof player.shield === 'number' ? player.shield : 0;
    var pMaxShield = typeof player.maxShield === 'number' ? player.maxShield : 8;
    var pMaxHp = typeof player.maxHp === 'number' ? player.maxHp : 20;
    var pHp = typeof player.hp === 'number' ? player.hp : pMaxHp;
    var pWeaponAtk = typeof player.weaponAtk === 'number' ? player.weaponAtk : 1;
    var pBaseAtk = typeof player.baseAtk === 'number' ? player.baseAtk : 1;
    var pShieldBonus = typeof player.shieldBonus === 'number' ? player.shieldBonus : 0;
    var pPotionBonus = typeof player.potionBonus === 'number' ? player.potionBonus : 0;

    var logMsg = '';

    if (curChoice.kind === 'upgrade') {
      // 선택지 3개: 0: 무기 강화(weaponAtk +1) / 1: 갑옷 강화(maxShield +3) / 2: 체력 강화(maxHp +3 이고 hp +3)
      var uEff = selectedOption.effect || selectedOption.id;
      if (uEff === 'weaponAtk' || uEff === 'weapon') {
        player.weaponAtk = pWeaponAtk + (selectedOption.amount || 1);
        logMsg = '🔨 [장비 강화] 무기 강화 (+1) -> 무기 공격력: ' + player.weaponAtk;
      } else if (uEff === 'maxShield' || uEff === 'shield') {
        player.maxShield = pMaxShield + (selectedOption.amount || 3);
        logMsg = '🛡️ [장비 강화] 갑옷 강화 (+3) -> 최대 방어막: ' + player.maxShield;
      } else if (uEff === 'maxHp' || uEff === 'health') {
        player.maxHp = pMaxHp + (selectedOption.amount || 3);
        player.hp = pHp + (selectedOption.amount || 3);
        logMsg = '💖 [장비 강화] 체력 강화 (+3) -> 체력: ' + player.hp + '/' + player.maxHp;
      } else {
        if (idx === 0) {
          player.weaponAtk = pWeaponAtk + 1;
          logMsg = '🔨 [장비 강화] 무기 강화 (+1) -> 무기 공격력: ' + player.weaponAtk;
        } else if (idx === 1) {
          player.maxShield = pMaxShield + 3;
          logMsg = '🛡️ [장비 강화] 갑옷 강화 (+3) -> 최대 방어막: ' + player.maxShield;
        } else if (idx === 2) {
          player.maxHp = pMaxHp + 3;
          player.hp = pHp + 3;
          logMsg = '💖 [장비 강화] 체력 강화 (+3) -> 체력: ' + player.hp + '/' + player.maxHp;
        }
      }
    } else if (curChoice.kind === 'shop') {
      // 상점 선택지: 무기 +1 / 갑옷 +3 / 체력 회복 전부 / 최대 체력 +3 / 방어막 가득
      var eff = selectedOption.effect || selectedOption.id;
      if (eff === 'weaponAtk' || eff === 'shop_weapon') {
        player.weaponAtk = pWeaponAtk + 1;
        logMsg = '🪙 [금화 상점] 무기 강화 구매 (+1) -> 무기 공격력: ' + player.weaponAtk;
      } else if (eff === 'maxShield' || eff === 'shop_shield') {
        player.maxShield = pMaxShield + 3;
        logMsg = '🪙 [금화 상점] 갑옷 강화 구매 (+3) -> 최대 방어막: ' + player.maxShield;
      } else if (eff === 'healAll' || eff === 'shop_heal_all') {
        player.hp = player.maxHp;
        logMsg = '🪙 [금화 상점] 체력 회복 구매 -> 체력 완전 회복 (' + player.hp + '/' + player.maxHp + ')';
      } else if (eff === 'maxHp' || eff === 'shop_max_hp') {
        player.maxHp = pMaxHp + 3;
        player.hp = pHp + 3;
        logMsg = '🪙 [금화 상점] 최대 체력 구매 (+3) -> 체력: ' + player.hp + '/' + player.maxHp;
      } else if (eff === 'shieldFull' || eff === 'shop_shield_full') {
        player.shield = player.maxShield;
        logMsg = '🪙 [금화 상점] 방어막 보강 구매 -> 방어막 가득 (' + player.shield + '/' + player.maxShield + ')';
      }
    } else if (curChoice.kind === 'levelup') {
      // 레벨업 선택지: 힘(baseAtk +1) / 체력(maxHp +3, hp +3) / 방패효율(shieldBonus +1) / 운(potionBonus +1)
      var lEff = selectedOption.effect || selectedOption.id;
      if (lEff === 'baseAtk' || lEff === 'str') {
        player.baseAtk = pBaseAtk + 1;
        logMsg = '⚡ [레벨업] 힘 특성 선택 -> 기본 공격력: ' + player.baseAtk;
      } else if (lEff === 'maxHp' || lEff === 'con') {
        player.maxHp = pMaxHp + 3;
        player.hp = pHp + 3;
        logMsg = '💖 [레벨업] 체력 특성 선택 -> 체력: ' + player.hp + '/' + player.maxHp;
      } else if (lEff === 'shieldBonus' || lEff === 'shield_eff') {
        player.shieldBonus = pShieldBonus + 1;
        logMsg = '🛡️ [레벨업] 방패효율 특성 선택 -> 방패 줄 방어막 +' + player.shieldBonus;
      } else if (lEff === 'potionBonus' || lEff === 'luck') {
        player.potionBonus = pPotionBonus + 1;
        logMsg = '🧪 [레벨업] 운 특성 선택 -> 물약 회복량 +' + player.potionBonus;
      }
    }

    nextState.player = player;
    nextState.pendingChoices.shift();
    nextState.pendingChoice = nextState.pendingChoices.length > 0 ? nextState.pendingChoices[0] : null;

    if (logMsg && Array.isArray(nextState.logs)) {
      nextState.logs.push(logMsg);
    }

    return nextState;
  }

  /**
   * 레이드 체인에서 몬스터들이 받을 예상 피해량 계산 (순수 함수)
   * 공식: 기본 공격력(player.baseAtk) + 칼 개수 x 무기 공격력(player.weaponAtk) + 보직/버프 보너스
   * 칼만 있는 줄(몬스터 0마리)이거나 비공격 줄이면 0 반환
   * @param {Object} raidState 현재 레이드 상태
   * @param {Array<{r: number, c: number}>} path 경로 좌표 배열
   * @returns {number} 몬스터 각각이 받는 피해량
   */
  function getRaidChainDamage(raidState, path) {
    if (!raidState || !path || !Array.isArray(path) || path.length < 3) {
      return 0;
    }
    var board = raidState.board;
    if (!board || !Array.isArray(board) || board.length === 0) {
      return 0;
    }

    var firstPt = path[0];
    if (!firstPt || !board[firstPt.r] || !board[firstPt.r][firstPt.c]) {
      return 0;
    }
    var firstCell = board[firstPt.r][firstPt.c];
    if (firstCell.type !== 'sword' && firstCell.type !== 'monster') {
      return 0;
    }

    var swordCount = 0;
    var monsterCount = 0;
    for (var i = 0; i < path.length; i++) {
      var pt = path[i];
      if (!pt || !board[pt.r] || !board[pt.r][pt.c]) return 0;
      var cell = board[pt.r][pt.c];
      if (cell.type === 'sword') {
        swordCount++;
      } else if (cell.type === 'monster') {
        monsterCount++;
      } else {
        return 0; // 유효하지 않은 칸
      }
    }

    // 칼만 있는 줄이면 몬스터가 없으므로 몬스터 피해는 0
    if (monsterCount === 0) {
      return 0;
    }

    var player = raidState.player || {};
    var baseAtk = (typeof player.baseAtk === 'number') ? player.baseAtk : 1;
    var weaponAtk = (typeof player.weaponAtk === 'number') ? player.weaponAtk : 1;

    // 버프 배율 및 추가 피해
    var atkMul = 1;
    var bonusDmg = 0;
    var buffs = raidState.activeBuffs || [];
    for (var b = 0; b < buffs.length; b++) {
      var ab = buffs[b];
      if (ab.effect) {
        if (typeof ab.effect.multiplier === 'number' && ab.effect.multiplier > atkMul) {
          atkMul = ab.effect.multiplier;
        }
        if (typeof ab.effect.bonusDmg === 'number') {
          bonusDmg += ab.effect.bonusDmg;
        }
      }
    }

    // 보직 보너스 (보병, 운전병, 포병 등)
    var roleBonus = raidState.profile ? applyRoleBonus(raidState.profile, { type: 4, cleared: swordCount }) : null;
    var roleBonusDmg = (roleBonus && roleBonus.bonusDamage) ? roleBonus.bonusDamage : 0;

    var rawDmg = baseAtk + (swordCount * weaponAtk) + roleBonusDmg + bonusDmg;
    var finalDmg = rawDmg * atkMul;

    return finalDmg;
  }

  /**
   * 레이드 체인 해결 및 효과·중력·반격·주사위·특수몬스터 판정 (순수 함수)
   * 원본 raidState는 변경하지 않고 깊은 복사된 새 raidState 반환
   * 무한 서바이벌 모드: 스테이지 승리 없이 체력 0 도달 시 defeat
   * @param {Object} raidState 현재 레이드 상태 객체
   * @param {Array<{r: number, c: number}>} path 연결한 경로
   * @param {function(): number} [rng] 난수 생성기
   * @returns {Object} 새 레이드 상태 객체
   */
  function resolveRaidChain(raidState, path, rng) {
    if (!raidState || typeof raidState !== 'object') {
      return raidState;
    }
    if (raidState.status !== 'playing') {
      return raidState;
    }
    // 조각 11: pendingChoice가 있는 동안 resolveRaidChain은 줄을 무시한다 (상태 그대로 반환)
    if (raidState.pendingChoice || (Array.isArray(raidState.pendingChoices) && raidState.pendingChoices.length > 0)) {
      return raidState;
    }
    if (!path || !Array.isArray(path) || path.length < 3) {
      return raidState;
    }

    var board = raidState.board;
    if (!board || !Array.isArray(board) || board.length === 0) {
      return raidState;
    }
    var size = board.length;

    // 1. 경로 유효성 검사 (범위, 중복 없음, 8방향 이웃)
    var visited = {};
    for (var i = 0; i < path.length; i++) {
      var pt = path[i];
      if (!pt || typeof pt.r !== 'number' || typeof pt.c !== 'number') {
        return raidState;
      }
      if (pt.r < 0 || pt.r >= size || pt.c < 0 || !board[pt.r] || pt.c >= board[pt.r].length) {
        return raidState;
      }
      var key = pt.r + ',' + pt.c;
      if (visited[key]) {
        return raidState;
      }
      visited[key] = true;

      if (i > 0) {
        if (!isAdjacent(path[i - 1], pt)) {
          return raidState;
        }
      }
    }

    // 2. 종류 규칙 검사
    var firstCell = board[path[0].r][path[0].c];
    if (!firstCell) {
      return raidState;
    }

    var isCombatChain = (firstCell.type === 'sword' || firstCell.type === 'monster');
    var chainType = firstCell.type;
    var swordCount = 0;
    var monsterCount = 0;

    for (var j = 0; j < path.length; j++) {
      var cell = board[path[j].r][path[j].c];
      if (!cell) return raidState;
      if (isCombatChain) {
        if (cell.type === 'sword') {
          swordCount++;
        } else if (cell.type === 'monster') {
          monsterCount++;
        } else {
          return raidState; // 칼/몬스터 줄에 다른 종류 포함 거부
        }
      } else {
        if (cell.type !== chainType) {
          return raidState; // 동일 종류가 아니면 거부
        }
      }
    }

    var safeRng = typeof rng === 'function' ? rng : Math.random;

    // 3. 깊은 복사 (원본 불변 보장)
    var newBoard = [];
    for (var r = 0; r < size; r++) {
      var newRow = [];
      for (var c = 0; c < board[r].length; c++) {
        var oldC = board[r][c];
        newRow.push({
          type: oldC.type,
          hp: oldC.hp,
          maxHp: oldC.maxHp,
          atk: oldC.atk,
          trait: oldC.trait || null
        });
      }
      newBoard.push(newRow);
    }

    var maxShield = (raidState.player && typeof raidState.player.maxShield === 'number') ? raidState.player.maxShield : 8;
    var playerLevel = (raidState.player && typeof raidState.player.playerLevel === 'number') ? raidState.player.playerLevel : 1;
    var exp = (raidState.player && typeof raidState.player.exp === 'number') ? raidState.player.exp : 0;
    var shieldBonus = (raidState.player && typeof raidState.player.shieldBonus === 'number') ? raidState.player.shieldBonus : 0;
    var potionBonus = (raidState.player && typeof raidState.player.potionBonus === 'number') ? raidState.player.potionBonus : 0;

    var playerCopy = {
      maxHp: raidState.player ? raidState.player.maxHp : 20,
      hp: raidState.player ? raidState.player.hp : 20,
      shield: raidState.player ? raidState.player.shield : 0,
      maxShield: maxShield,
      baseAtk: (raidState.player && typeof raidState.player.baseAtk === 'number') ? raidState.player.baseAtk : 1,
      weaponAtk: (raidState.player && typeof raidState.player.weaponAtk === 'number') ? raidState.player.weaponAtk : 1,
      playerLevel: playerLevel,
      exp: exp,
      shieldBonus: shieldBonus,
      potionBonus: potionBonus
    };

    var currentTurn = (typeof raidState.turn === 'number') ? raidState.turn : 0;
    var nextTurn = currentTurn + 1;
    var nextLevel = 1 + Math.floor(nextTurn / 8);

    var upgradeGauge = (typeof raidState.upgradeGauge === 'number') ? raidState.upgradeGauge : 0;
    var goldGauge = (typeof raidState.goldGauge === 'number') ? raidState.goldGauge : 0;
    var pendingChoices = Array.isArray(raidState.pendingChoices)
      ? raidState.pendingChoices.map(function(c) {
          return Object.assign({}, c, { options: Array.isArray(c.options) ? c.options.map(function(o) { return Object.assign({}, o); }) : [] });
        })
      : (raidState.pendingChoice ? [Object.assign({}, raidState.pendingChoice)] : []);

    var nextState = {
      board: newBoard,
      player: playerCopy,
      gold: typeof raidState.gold === 'number' ? raidState.gold : 0,
      upgradeGauge: upgradeGauge,
      goldGauge: goldGauge,
      pendingChoices: pendingChoices,
      pendingChoice: null,
      turn: nextTurn,
      kills: typeof raidState.kills === 'number' ? raidState.kills : 0,
      score: 0,
      level: nextLevel,
      stage: nextLevel, // 하위 호환
      goalKills: Infinity, // 무한 서바이벌 모드
      status: raidState.status,
      logs: Array.isArray(raidState.logs) ? raidState.logs.slice() : [],
      lastEvents: [],
      activeBuffs: Array.isArray(raidState.activeBuffs)
        ? raidState.activeBuffs.map(function(b) {
            return Object.assign({}, b, { effect: Object.assign({}, b.effect) });
          })
        : [],
      lastDiceBuff: null,
      profile: raidState.profile ? Object.assign({}, raidState.profile, { stats: Object.assign({}, raidState.profile.stats) }) : null
    };

    var toRemove = {};
    var actionLog = '';

    // 4. 줄 종류별 효과 적용
    if (isCombatChain) {
      var baseDamage = getRaidChainDamage(nextState, path);
      var famBonus = nextState.profile ? applyFamilyBonus(nextState.profile, { type: 4, cleared: swordCount }, safeRng) : null;
      var finalDamage = baseDamage;
      if (famBonus && famBonus.isCrit) {
        finalDamage = Math.floor(finalDamage * famBonus.critMultiplier);
      }

      // 칼 칸은 전부 제거
      for (var k = 0; k < path.length; k++) {
        var pPos = path[k];
        if (nextState.board[pPos.r][pPos.c].type === 'sword') {
          toRemove[pPos.r + ',' + pPos.c] = true;
        }
      }

      // 몬스터 칸 타격 및 특수 몬스터(가시) 반사 처리
      var hitCount = 0;
      var killedCount = 0;
      var goldEarned = 0;
      var totalSpikyReflect = 0;

      for (var m = 0; m < path.length; m++) {
        var mPos = path[m];
        var mCell = nextState.board[mPos.r][mPos.c];
        if (mCell.type === 'monster') {
          hitCount++;
          mCell.hp -= finalDamage;

          // 특수 몬스터 trait: 'spiky' (가시 몬스터: 맞을 때 받은 피해의 절반(올림)을 플레이어에게 반사, 방어막 우선 흡수)
          if (mCell.trait === 'spiky' && finalDamage > 0) {
            var reflectDmg = Math.ceil(finalDamage / 2);
            totalSpikyReflect += reflectDmg;
            var absorbReflect = 0;
            var remainReflect = reflectDmg;
            if (nextState.player.shield > 0) {
              if (nextState.player.shield >= remainReflect) {
                absorbReflect = remainReflect;
                nextState.player.shield -= remainReflect;
                remainReflect = 0;
              } else {
                absorbReflect = nextState.player.shield;
                remainReflect -= nextState.player.shield;
                nextState.player.shield = 0;
              }
            }
            if (remainReflect > 0) {
              nextState.player.hp -= remainReflect;
              if (nextState.player.hp <= 0) {
                nextState.player.hp = 0;
                nextState.status = 'defeat';
              }
            }
            nextState.lastEvents.push({
              kind: 'spikyReflect',
              row: mPos.r,
              col: mPos.c,
              dmg: reflectDmg,
              absorbed: absorbReflect,
              hpDmg: remainReflect
            });
          }

          if (mCell.hp <= 0) {
            mCell.hp = 0;
            killedCount++;
            nextState.kills++;
            toRemove[mPos.r + ',' + mPos.c] = true;

            // 조각 11: 처치 시 경험치 획득 (maxHp, 특수 몬스터는 +2)
            var gainedExp = (mCell.trait === 'spiky' || mCell.trait === 'regen') ? (mCell.maxHp + 2) : mCell.maxHp;
            nextState.player.exp += gainedExp;

            var dropGold = Math.floor(safeRng() * 2) + 1;
            if (famBonus && famBonus.goldMultiplier) {
              dropGold = Math.round(dropGold * famBonus.goldMultiplier);
            }
            goldEarned += dropGold;
            nextState.gold += dropGold;
            nextState.lastEvents.push({ kind: 'kill', row: mPos.r, col: mPos.c, gold: dropGold, exp: gainedExp });
          } else {
            nextState.lastEvents.push({ kind: 'hit', row: mPos.r, col: mPos.c, dmg: finalDamage });
          }
        }
      }

      // 조각 11: 몬스터 처치 후 레벨업 체크 루프
      var expToNext = getRaidExpToNext(nextState.player.playerLevel);
      while (nextState.player.exp >= expToNext) {
        nextState.player.exp -= expToNext;
        nextState.player.playerLevel += 1;
        expToNext = getRaidExpToNext(nextState.player.playerLevel);

        var lvlPool = [
          { id: 'str', label: '힘', desc: '기본 공격력 +1', effect: 'baseAtk', amount: 1 },
          { id: 'con', label: '체력', desc: '최대 체력 +3 & 체력 +3', effect: 'maxHp', amount: 3 },
          { id: 'shield_eff', label: '방패효율', desc: '방패 줄 방어막을 줄 길이 +1 만큼', effect: 'shieldBonus', amount: 1 },
          { id: 'luck', label: '운', desc: '물약 줄 회복 +1', effect: 'potionBonus', amount: 1 }
        ];
        var shuffledLvl = lvlPool.slice();
        for (var li = shuffledLvl.length - 1; li > 0; li--) {
          var lRand = Math.floor(safeRng() * (li + 1));
          var tempL = shuffledLvl[li];
          shuffledLvl[li] = shuffledLvl[lRand];
          shuffledLvl[lRand] = tempL;
        }
        nextState.pendingChoices.push({
          kind: 'levelup',
          title: '레벨 업!',
          desc: '새로운 능력을 하나 선택하세요 (Lv.' + nextState.player.playerLevel + ')',
          options: shuffledLvl.slice(0, 3)
        });
      }

      if (swordCount > 0 && hitCount === 0) {
        actionLog = '⚔️ 칼 ' + swordCount + '개 정리 (몬스터 타격 없음)';
      } else {
        actionLog = '⚔️ 공격 (칼 ' + swordCount + '개, 피해 ' + finalDamage + ') -> 👹 몬스터 ' + hitCount + '마리 피격(' + killedCount + '마리 처치, 🪙+' + goldEarned + ')';
      }
      if (totalSpikyReflect > 0) {
        actionLog += ' 🌵 가시 반사(' + totalSpikyReflect + ' 피해)';
      }

    } else if (chainType === 'shield') {
      var famBonusShield = nextState.profile ? applyFamilyBonus(nextState.profile, { type: 1, cleared: path.length }, safeRng) : null;
      var shieldMul = (famBonusShield && famBonusShield.shieldMultiplier) ? famBonusShield.shieldMultiplier : 1.0;
      var shieldGain = Math.round(path.length * shieldMul) + (nextState.player.shieldBonus || 0);

      var curShield = nextState.player.shield;
      var maxShieldVal = nextState.player.maxShield || 8;
      var newShield = curShield + shieldGain;
      var gainedToShield = shieldGain;
      var overflowShield = 0;

      if (newShield > maxShieldVal) {
        nextState.player.shield = maxShieldVal;
        overflowShield = newShield - maxShieldVal;
        gainedToShield = Math.max(0, maxShieldVal - curShield);
        nextState.upgradeGauge += overflowShield * 10;
      } else {
        nextState.player.shield = newShield;
      }

      while (nextState.upgradeGauge >= 100) {
        nextState.upgradeGauge -= 100;
        nextState.pendingChoices.push({
          kind: 'upgrade',
          title: '장비를 강화해요',
          desc: '원하는 장비 능력을 하나 선택하세요',
          options: [
            { id: 'weapon', label: '무기 강화', desc: '무기 공격력 +1', effect: 'weapon', amount: 1 },
            { id: 'shield', label: '갑옷 강화', desc: '최대 방어막 +3', effect: 'shield', amount: 3 },
            { id: 'health', label: '체력 강화', desc: '최대 체력 +3 & 체력 +3', effect: 'health', amount: 3 }
          ]
        });
      }

      nextState.lastEvents.push({ kind: 'shield', amount: gainedToShield, overflow: overflowShield });
      for (var s = 0; s < path.length; s++) {
        toRemove[path[s].r + ',' + path[s].c] = true;
      }
      actionLog = '🛡️ 방패 ' + path.length + '개 연결 -> 방어막 +' + gainedToShield + (overflowShield > 0 ? ' (초과 +' + overflowShield + ' -> 강화 게이지 +' + (overflowShield * 10) + ')' : '') + ' (현재 ' + nextState.player.shield + '/' + nextState.player.maxShield + ')';

    } else if (chainType === 'potion') {
      var roleBonusPotion = nextState.profile ? applyRoleBonus(nextState.profile, { type: 2, cleared: path.length }) : null;
      var healMul = (roleBonusPotion && roleBonusPotion.healMultiplier) ? roleBonusPotion.healMultiplier : 1.0;
      var healGain = Math.floor(path.length * healMul) + (nextState.player.potionBonus || 0);
      var oldHp = nextState.player.hp;
      var newHp = oldHp + healGain;
      if (newHp > nextState.player.maxHp) {
        if (roleBonusPotion && roleBonusPotion.overflowToShield) {
          var overflow = newHp - nextState.player.maxHp;
          nextState.player.shield = Math.min(nextState.player.maxShield || 8, nextState.player.shield + overflow);
        }
        nextState.player.hp = nextState.player.maxHp;
      } else {
        nextState.player.hp = newHp;
      }
      var actualHeal = nextState.player.hp - oldHp;
      nextState.lastEvents.push({ kind: 'heal', amount: actualHeal });
      for (var p = 0; p < path.length; p++) {
        toRemove[path[p].r + ',' + path[p].c] = true;
      }
      actionLog = '🧪 물약 ' + path.length + '개 연결 -> 체력 +' + actualHeal + ' (현재 ' + nextState.player.hp + '/' + nextState.player.maxHp + ')';

    } else if (chainType === 'coin') {
      var famBonusCoin = nextState.profile ? applyFamilyBonus(nextState.profile, { type: 3, cleared: path.length }, safeRng) : null;
      var coinMul = (famBonusCoin && famBonusCoin.goldMultiplier) ? famBonusCoin.goldMultiplier : 1.0;
      var coinGain = Math.round(path.length * coinMul);
      nextState.gold += coinGain;
      nextState.goldGauge += path.length * 8;

      while (nextState.goldGauge >= 100) {
        nextState.goldGauge -= 100;
        var shopPool = [
          { id: 'shop_weapon', label: '무기 구매', desc: '무기 공격력 +1', effect: 'weaponAtk', amount: 1 },
          { id: 'shop_shield', label: '갑옷 구매', desc: '최대 방어막 +3', effect: 'maxShield', amount: 3 },
          { id: 'shop_heal_all', label: '치료 물약', desc: '체력 회복 전부', effect: 'healAll' },
          { id: 'shop_max_hp', label: '생명력 영약', desc: '최대 체력 +3 & 체력 +3', effect: 'maxHp', amount: 3 },
          { id: 'shop_shield_full', label: '방어막 보강', desc: '방어막 가득', effect: 'shieldFull' }
        ];
        var shuffledShop = shopPool.slice();
        for (var si = shuffledShop.length - 1; si > 0; si--) {
          var sRand = Math.floor(safeRng() * (si + 1));
          var tempS = shuffledShop[si];
          shuffledShop[si] = shuffledShop[sRand];
          shuffledShop[sRand] = tempS;
        }
        nextState.pendingChoices.push({
          kind: 'shop',
          title: '상점이 열렸어요',
          desc: '골드로 구매할 아이템을 하나 고르세요',
          options: shuffledShop.slice(0, 3)
        });
      }

      nextState.lastEvents.push({ kind: 'gold', amount: coinGain });
      for (var c = 0; c < path.length; c++) {
        toRemove[path[c].r + ',' + path[c].c] = true;
      }
      actionLog = '🪙 금화 ' + path.length + '개 연결 -> 골드 +' + coinGain + ' (상점 게이지 +' + (path.length * 8) + ')';
    }

    // 5. 점수 갱신: score = kills * 10 + turn
    nextState.score = nextState.kills * 10 + nextState.turn;

    // 6. 중력 및 새 칸 보충
    // 중력 전 살아남은 피격 몬스터의 중력 후 위치(afterRow, afterCol) 사전 계산
    for (var evIdx = 0; evIdx < nextState.lastEvents.length; evIdx++) {
      var evItem = nextState.lastEvents[evIdx];
      if (evItem.kind === 'hit') {
        var removedBelow = 0;
        for (var rCheck = evItem.row + 1; rCheck < size; rCheck++) {
          if (toRemove[rCheck + ',' + evItem.col]) {
            removedBelow++;
          }
        }
        evItem.afterRow = evItem.row + removedBelow;
        evItem.afterCol = evItem.col;
      }
    }

    // 판에 살아남은 몬스터 수 계산 (40% 초과 방지용)
    var remainingMonsters = 0;
    var totalGridCells = size * size;
    for (var countR = 0; countR < size; countR++) {
      for (var countC = 0; countC < size; countC++) {
        if (!toRemove[countR + ',' + countC] && nextState.board[countR][countC].type === 'monster') {
          remainingMonsters++;
        }
      }
    }

    for (var col = 0; col < size; col++) {
      var kept = [];
      for (var row = size - 1; row >= 0; row--) {
        if (!toRemove[row + ',' + col]) {
          kept.push(nextState.board[row][col]);
        }
      }
      for (var row2 = size - 1; row2 >= 0; row2--) {
        if (kept.length > 0) {
          nextState.board[row2][col] = kept.shift();
        } else {
          var curRatio = remainingMonsters / totalGridCells;
          var newCell = createRaidCell(nextState.level, safeRng, curRatio);
          if (newCell.type === 'monster') {
            remainingMonsters++;
          }
          nextState.board[row2][col] = newCell;
        }
      }
    }

    // 7. 10칸 이상 줄이면 주사위 버프 발동 (원작에 없는 우리 고유 규칙 유지)
    var diceLog = '';
    if (path.length >= 10) {
      var diceBuff;
      if (nextState.profile && nextState.profile.family === 'gold_finger') {
        var d1 = rollDiceBuff(safeRng);
        var d2 = rollDiceBuff(safeRng);
        diceBuff = (d2.dice > d1.dice) ? d2 : d1;
      } else {
        diceBuff = rollDiceBuff(safeRng);
      }
      nextState.lastDiceBuff = diceBuff;

      var eff = diceBuff.effect || {};
      if (typeof eff.heal === 'number' && eff.heal > 0) {
        nextState.player.hp = Math.min(nextState.player.maxHp, nextState.player.hp + eff.heal);
      }
      if (typeof eff.damage === 'number' && eff.damage > 0) {
        for (var br = 0; br < size; br++) {
          for (var bc = 0; bc < size; bc++) {
            if (nextState.board[br][bc].type === 'monster' && nextState.board[br][bc].hp > 0) {
              nextState.board[br][bc].hp -= eff.damage;
              nextState.lastEvents.push({ kind: 'hit', row: br, col: bc, afterRow: br, afterCol: bc, dmg: eff.damage });
              if (nextState.board[br][bc].hp <= 0) {
                nextState.board[br][bc].hp = 0;
                nextState.kills++;
                nextState.gold += 1;
                nextState.score = nextState.kills * 10 + nextState.turn;
                nextState.board[br][bc] = createRaidCell(nextState.level, safeRng);
              }
              break;
            }
          }
        }
      }
      if (typeof diceBuff.turns === 'number' && diceBuff.turns > 0) {
        nextState.activeBuffs.push({
          dice: diceBuff.dice,
          id: diceBuff.id,
          name: diceBuff.name,
          desc: diceBuff.desc,
          emoji: diceBuff.emoji,
          turns: diceBuff.turns,
          effect: Object.assign({}, eff)
        });
      }
      diceLog = '🎲 ' + diceBuff.emoji + ' 눈금 ' + diceBuff.dice + ' [' + diceBuff.name + '] 발동! (' + diceBuff.desc + ')';
    }

    // 가시 반사로 인해 이미 플레이어가 쓰러졌는지 확인
    if (nextState.status === 'defeat') {
      var failLog = actionLog;
      if (diceLog) failLog += ' | ' + diceLog;
      failLog += ' | 💀 가시 반사로 인해 고블린 쓰러짐 (게임 오버)';
      nextState.logs.push(failLog);
      return nextState;
    }

    // 8. 살아남은 모든 몬스터의 반격 (원작 핵심 메커니즘)
    var skipEnemy = false;
    var absorbAll = false;
    for (var aIdx = 0; aIdx < nextState.activeBuffs.length; aIdx++) {
      var abf = nextState.activeBuffs[aIdx];
      if (abf.effect) {
        if (abf.effect.skipEnemyTurn) skipEnemy = true;
        if (abf.effect.absorbAll) absorbAll = true;
      }
    }

    var aliveMonsters = 0;
    var totalEnemyAtk = 0;
    for (var ar = 0; ar < size; ar++) {
      for (var ac = 0; ac < size; ac++) {
        var aCell = nextState.board[ar][ac];
        if (aCell.type === 'monster' && aCell.hp > 0) {
          aliveMonsters++;
          totalEnemyAtk += (typeof aCell.atk === 'number') ? Math.max(0, aCell.atk) : 1;
        }
      }
    }

    var enemyLog = '';
    if (aliveMonsters === 0) {
      enemyLog = '판 위에 몬스터가 없어 반격 없음';
    } else if (skipEnemy) {
      enemyLog = '몬스터 반격 스킵! [⚡ 질풍노도]';
    } else if (absorbAll) {
      enemyLog = '몬스터 반격! [🛡️ 돌가죽 0 피해 완전 흡수]';
    } else {
      var remainAtk = totalEnemyAtk;
      var absorbedShield = 0;
      if (nextState.player.shield > 0) {
        if (nextState.player.shield >= remainAtk) {
          absorbedShield = remainAtk;
          nextState.player.shield -= remainAtk;
          remainAtk = 0;
        } else {
          absorbedShield = nextState.player.shield;
          remainAtk -= nextState.player.shield;
          nextState.player.shield = 0;
        }
      }

      if (remainAtk > 0) {
        nextState.player.hp -= remainAtk;
        if (nextState.player.hp <= 0) {
          nextState.player.hp = 0;
          nextState.status = 'defeat';
        }
      }

      nextState.lastEvents.push({
        kind: 'enemyAttack',
        total: totalEnemyAtk,
        absorbed: absorbedShield,
        dmg: remainAtk
      });

      enemyLog = '👹 몬스터 ' + aliveMonsters + '마리 반격(총 ' + totalEnemyAtk + ' 피해)! 실드 ' + absorbedShield + ' 흡수, HP -' + remainAtk;
      if (nextState.status === 'defeat') {
        enemyLog += ' -> 고블린 쓰러짐 (게임 오버)';
      }
    }

    // 9. 특수 몬스터 trait: 'regen' (반격 뒤에 살아있으면 체력 +1, maxHp까지)
    if (nextState.status !== 'defeat') {
      for (var rr = 0; rr < size; rr++) {
        for (var rc = 0; rc < size; rc++) {
          var rCell = nextState.board[rr][rc];
          if (rCell.type === 'monster' && rCell.hp > 0 && rCell.trait === 'regen') {
            if (rCell.hp < rCell.maxHp) {
              rCell.hp = Math.min(rCell.maxHp, rCell.hp + 1);
              nextState.lastEvents.push({ kind: 'regen', row: rr, col: rc, hp: rCell.hp });
            }
          }
        }
      }
    }

    // 10. 버프 지속 턴 차감
    nextState.activeBuffs = nextState.activeBuffs
      .map(function(b) { return Object.assign({}, b, { turns: b.turns - 1 }); })
      .filter(function(b) { return b.turns > 0; });

    // 11. 로그 기록
    var finalLog = actionLog;
    if (diceLog) finalLog += ' | ' + diceLog;
    finalLog += ' | ' + enemyLog;
    nextState.logs.push(finalLog);

    // 조각 11: pendingChoices 동기화
    nextState.pendingChoice = nextState.pendingChoices.length > 0 ? nextState.pendingChoices[0] : null;

    return nextState;
  }

  return {
    createRng: createRng,
    createBoard: createBoard,
    isAdjacent: isAdjacent,
    extendPath: extendPath,
    resolve: resolve,
    createBattleState: createBattleState,
    applyPlayerTurn: applyPlayerTurn,
    saveGameState: saveGameState,
    loadGameState: loadGameState,
    // 조각 3 추가
    DICE_BUFF_TABLE: DICE_BUFF_TABLE,
    rollDiceBuff: rollDiceBuff,
    applyBuffToState: applyBuffToState,
    // 조각 4 추가
    ROLE_DEFINITIONS: ROLE_DEFINITIONS,
    FAMILY_DEFINITIONS: FAMILY_DEFINITIONS,
    RANK_TABLE: RANK_TABLE,
    createGoblinProfile: createGoblinProfile,
    addExpToProfile: addExpToProfile,
    applyRoleBonus: applyRoleBonus,
    applyFamilyBonus: applyFamilyBonus,
    // 조각 5 추가
    createBossBattle: createBossBattle,
    applyBossPhase: applyBossPhase,
    applyPlayerBossTurn: applyPlayerBossTurn,
    // 조각 6 추가
    getStoryDialogue: getStoryDialogue,
    getStageConfig: getStageConfig,
    checkProgression: checkProgression,
    // 조각 7 추가
    validateNickname: validateNickname,
    filterProfanity: filterProfanity,
    generateMockLeaderboard: generateMockLeaderboard,
    createChallengeBattle: createChallengeBattle,
    // 조각 9 & 10 추가 (던전 레이드 기본 규칙 및 원작 1차 규칙)
    DEFAULT_RAID_BOARD_SIZE: DEFAULT_RAID_BOARD_SIZE,
    RAID_SPAWN_RATES: RAID_SPAWN_RATES,
    createRaidCell: createRaidCell,
    createRaidBoard: createRaidBoard,
    extendRaidPath: extendRaidPath,
    createRaidState: createRaidState,
    getRaidChainDamage: getRaidChainDamage,
    resolveRaidChain: resolveRaidChain,
    // 조각 11 추가 (장비 강화 게이지, 금화 상점, 경험치 레벨업)
    getRaidExpToNext: getRaidExpToNext,
    applyRaidChoice: applyRaidChoice
  };
});
