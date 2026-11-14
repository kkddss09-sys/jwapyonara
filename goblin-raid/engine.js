/**
 * 고블린 레이드 (Goblin Raid) - engine.js
 * 규칙만 담은 브라우저·node 공용 UMD 규칙 엔진 (RuleCore)
 * DOM·시간·저장소를 직접 읽지 않으며, 상태와 명령을 받아 다음 상태·결과·발생 사건을 반환한다.
 * 조각 1: 판·칸·연결 (UMD, 난수 주입, 6x6 판, 5종 추첨, 8방향 선 잇기, 되돌림, 다리·화살·32변환, 미리보기)
 * 조각 2: 공격과 피해 종류 (일반공격·마법/파손칼, 무기배가·숙적기본공격반감, 순서있는 피해종류, 방어차감·즉시처치, 생존관통, 직접독·종족동결, 30번 판밖타격, 2번반사·불수집·흡혈)
 * 조각 3: 반격과 방패 (반격가능조건·새칸표식, 종족1 독공격 반감, 방패 선흡수 후 손상, 독 최댓값 갱신·20번 회복, 자해·가시 공통피해, 공격감소·21번 처치성장, 치명상·부활, 반환상태 단일화)
 * 조각 4: 낙하·턴끝·처리중단 (첫 낙하 순서, 턴 증가, 충전 및 활성 정리, 불/얼음 순회, 플레이어 턴회복/독, 적 독 3단계, 특수 적 능력, 둘째 낙하, 승급 대기)
 * 조각 5: 자원·경험치·레벨업 (동종 보너스, 특수 물약, 방패 수리/강화, 소수 잔량 보존, 100 경계 및 메뉴 큐, 8종 스탯·두 선택, 스킬 습득/강화, 특수 적 토큰 분배)
 * 조각 6: 특수적 앞묶음 (공통 특수방어 하한·배율표, 적 1·5 수동기반, 적 2 반사, 적 3 도주·보상, 적 4 치유/축복, 적 6 산성화, 적 7 주변 누적 불, 적 8 동결·해동, 적 9 독침·장비독 면역, 적 10 시간/처치 폭발)
 * 조각 7: 특수적 가운데묶음 (적 11 칼바꾸기, 적 12 수리막기·숙적방패0, 적 13 코인/소지금 훔침·체력피해, 적 14 뛰기·숙적피해, 적 15 충전중단, 적 16 아래찌르기·아래제거, 적 17 현재방패모방, 적 18 둘재추첨, 적 19 방바꾸기, 적 20 되찾기, 적 21 격해짐)
 * 조각 8: 특수적 뒤묶음 (적 22 파손후보, 적 23 열별내리기, 적 24·25 양후보소진까지 무작위교환, 적 26 일반적던지기, 적 27 방향조건, 적 28 실제장비감소, 적 29 마모 방패손상, 적 30 공통공격차단, 적 31 생성/이탈/낙하찌르기, 적 32 변환·유예·재생)
 * 조각 9: 승급·난이도곡선 (XP누적L·S성장, 4난이도범위·역순교환, 특수방어1후배율, 결함·숙적·HP1최종처리, 새적생성때만승급, 1~32·숙적덮어쓰기, 대기재설정·같은턴감소)
 * 조각 10: 스킬앞21종 (보유·충전·대상검사, 0~3수집/동결, 4~6자해/약화/변환, 7~10판교체/물약/메뉴, 11~15행수집·변환, 16~19이번턴배가, 20일반화, 수집공통보너스·특수면역)
 * 조각 11: 스킬뒤21종·조합 (21~41스킬효과, 11-30전체일반수집조합, 40-41연결칸생성조합, 26자리흔들기, 27방패방출, 33한번쓸기, 35고리수집다각형내부판정)
 * 조각 12: 상점·강화·스탯 (상점3부위·스킬대체, 5부위장비생성변동, 20강화증감량표, 부위별후보및상한, 8스탯100상한, 장비재합산·체력방패보정, 레벨업두보상확정)
 * 조각 26: 턴 처리 순서·사망 검사·반격 건너뛰기·메뉴 닫기 [교정 26.1 ~ 26.6]
 * 조각 27: 보충·특수 적·연결칸 재추첨 [교정 27.1 ~ 27.6] (숙적 5 보충 실시간 판 반영, 19 방교체 무제한 재추첨, 32 재생 대기시간 재정의, 숙적 12 방패0 일반보충 한정, 연결칸 생성 특수적만 재추첨, 종족 9 예외없는 스킬 완충)
 * 조각 31: 처치 집계를 실제 공격 처치로 한정 [교정 31.1, 31.2] (ID 21·스킬 34·종족 6을 실제 공격 처치로만 집계, 종족 6 +1을 첫 낙하 직후 불·반사 전으로 배치)
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    const mod = factory();
    module.exports = mod;
    if (mod && typeof mod === 'object') {
      mod.default = mod;
    }
  } else {
    root.RuleCore = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ==========================================
  // [A] 상수 및 난수 계약
  // ==========================================
  const BOARD_WIDTH = 6;
  const BOARD_HEIGHT = 6;
  const BOARD_CELL_COUNT = 36;

  const KIND_POTION = 'potion'; // 0
  const KIND_ENEMY = 'enemy';   // 1
  const KIND_COIN = 'coin';     // 2
  const KIND_SHIELD = 'shield'; // 3
  const KIND_SWORD = 'sword';   // 4
  const KIND_BRIDGE = 'bridge'; // 6 [교정 24.8]

  const KIND_CODE_TO_NAME = [KIND_POTION, KIND_ENEMY, KIND_COIN, KIND_SHIELD, KIND_SWORD];
  const KIND_NAME_TO_CODE = {
    potion: 0,
    enemy: 1,
    coin: 2,
    shield: 3,
    sword: 4,
    bridge: 6,
    '물약': 0,
    '적': 1,
    '코인': 2,
    '방패': 3,
    '칼': 4,
    '다리': 6,
    '연결칸': 6
  };

  // 조각 2 피해 종류 상수 [D2]
  const DAMAGE_TYPE_NORMAL = 'normal';             // 보통피해
  const DAMAGE_TYPE_VERTICAL = 'vertical_strike';  // 수직 추가타격
  const DAMAGE_TYPE_BLOCKED = 'blocked';           // 피해 차단 (공격값 0 호출)
  const DAMAGE_TYPE_NONCOMBAT = 'noncombat';       // 비전투 (비적 또는 32번 변환 상태)

  // [교정 22.7] 남은 미확정 임시 항목과 확정 교정 분리 목록 (단축 코드 U01~U09 및 상세 식별자 병기)
  const PROVISIONAL_ITEMS = [
    'U01',
    'U02',
    'U03',
    'U04',
    'U05',
    'U06',
    'U07',
    'U08',
    'U09',
    'U01_enemy29_full_damage',
    'U02_retaliation_guard_and_arrow_bridge_combo',
    'U03_class_reward_initial_25',
    'U04_flaw9_hp_105_operand',
    'U05_score_mode_actual_formula',
    'U06_menu_card_pick_and_multi_threshold',
    'U08_achievement_common_mode_gate_and_unverified',
    'U09_rng_endpoint_distribution',
    'S35_complex_self_intersection_parity'
  ];

  const CONFIRMED_CORRECTIONS = [
    'reflect_and_collected_fire_order',
    'skill10_direct_upgrade_menu',
    'ability5_cooldown_reduction_flag',
    'normal_start_hp_50_shield_4_flaw6_3',
    'tile_enemy_choice_rng_save_fields',
    'achievement_58_and_74_conditions',
    'choice_zero_card_prevention_safety_guard'
  ];

  // 조각 29: 난이도 4단계 상수 및 이름 변환 헬퍼 [추가 29.1, 29.2]
  const DIFFICULTY_NAMES = ['쉬움', '보통', '어려움', '지옥'];

  function getDifficultyName(difficulty) {
    let d = difficulty;
    if (typeof d === 'string') {
      const parsed = parseInt(d, 10);
      if (!Number.isNaN(parsed)) d = parsed;
    }
    if (d === 0) return '쉬움';
    if (d === 1) return '보통';
    if (d === 2) return '어려움';
    if (d === 3) return '지옥';
    if (typeof difficulty === 'string') {
      if (difficulty === 'easy' || difficulty === '쉬움') return '쉬움';
      if (difficulty === 'normal' || difficulty === '보통') return '보통';
      if (difficulty === 'hard' || difficulty === '어려움') return '어려움';
      if (difficulty === 'hell' || difficulty === 'nightmare' || difficulty === '지옥') return '지옥';
    }
    return '보통';
  }

  /**
   * 주입 난수 공급자 계약 (U09)
   * 정수 추첨은 양끝 포함, 역순 경계는 교환, 실수 추첨은 0 이상 1 미만
   */
  function drawInt(rng, min, max, tag) {
    let low = Math.floor(min);
    let high = Math.floor(max);
    if (low > high) {
      const t = low;
      low = high;
      high = t;
    }
    if (!rng) {
      return Math.floor(Math.random() * (high - low + 1)) + low;
    }
    if (Array.isArray(rng)) {
      if (rng.length === 0) return low;
      const v = rng.shift();
      return Math.floor(v);
    }
    if (typeof rng === 'function') {
      // (tag, min, max) 형태 먼저 시도
      const r1 = rng(tag, low, high);
      if (typeof r1 === 'number' && Number.isFinite(r1)) return Math.floor(r1);
      // (min, max, tag) 형태 시도
      const r2 = rng(low, high, tag);
      if (typeof r2 === 'number' && Number.isFinite(r2)) return Math.floor(r2);
      // 인자 없는 난수 (0~1 float 반환기)
      const r3 = rng();
      if (typeof r3 === 'number' && Number.isFinite(r3)) {
        if (r3 >= 0 && r3 <= 1) {
          return Math.floor(r3 * (high - low + 1)) + low;
        }
        return Math.floor(r3);
      }
    }
    if (typeof rng.int === 'function') {
      return Math.floor(rng.int(low, high, tag));
    }
    if (typeof rng.next === 'function') {
      const r = rng.next(tag, low, high);
      if (typeof r === 'number' && Number.isFinite(r)) return Math.floor(r);
    }
    return low;
  }

  function drawFloat(rng, tag) {
    if (!rng) return Math.random();
    if (typeof rng.float === 'function') return rng.float(tag);
    if (typeof rng === 'function') {
      const r = rng(tag, 0, 1);
      if (typeof r === 'number') return r;
      const r2 = rng();
      if (typeof r2 === 'number') return r2;
    }
    return 0;
  }

  /**
   * 배열에서 중복 없이 최대 maxN개를 무작위 선택하는 헬퍼
   */
  function pickRandomUpToN(rng, arr, maxN, tag) {
    if (!Array.isArray(arr) || arr.length === 0 || maxN <= 0) return [];
    if (arr.length <= maxN) return [...arr];
    const pool = [...arr];
    const picked = [];
    for (let i = 0; i < maxN; i++) {
      if (pool.length === 0) break;
      const idx = drawInt(rng, 0, pool.length - 1, tag);
      picked.push(pool[idx]);
      pool.splice(idx, 1);
    }
    return picked;
  }

  /**
   * 간단한 결정론적 의사 난수 생성기 (테스트 및 기본 공급자용)
   */
  function createRNG(seed = 123456789) {
    let s = (typeof seed === 'number' && Number.isFinite(seed) ? Math.floor(seed) : 123456789) >>> 0;
    if (s === 0) s = 123456789;

    function next() {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    const rng = function (tag, min, max) {
      if (min != null && max != null) {
        let low = Math.floor(min);
        let high = Math.floor(max);
        if (low > high) {
          const temp = low; low = high; high = temp;
        }
        return low + Math.floor(next() * (high - low + 1));
      }
      return next();
    };

    rng.int = function (min, max, tag) {
      return rng(tag, min, max);
    };
    rng.float = function (tag) {
      return next();
    };
    rng.getState = function () { return s; };
    rng.setState = function (state) {
      s = (typeof state === 'number' && Number.isFinite(state) ? Math.floor(state) : 123456789) >>> 0;
      if (s === 0) s = 123456789;
    };
    rng._isBuiltIn = true;
    return rng;
  }

  // ==========================================
  // [B] 상태 필드와 시작값 생성
  // ==========================================

  /**
   * 새 칸 객체 생성
   */
  function createCell(x, y, kindCodeOrName, id = null) {
    let kindCode = 0;
    let kindName = KIND_POTION;
    if (typeof kindCodeOrName === 'number') {
      kindCode = Math.max(0, Math.min(4, Math.floor(kindCodeOrName)));
      kindName = KIND_CODE_TO_NAME[kindCode] || KIND_POTION;
    } else if (typeof kindCodeOrName === 'string') {
      kindName = kindCodeOrName;
      kindCode = KIND_NAME_TO_CODE[kindName] != null ? KIND_NAME_TO_CODE[kindName] : 0;
    }

    const cell = {
      cellKey: id || `cell_${x}_${y}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      x,
      y,
      kind: kindName,     // 물약·적·코인·방패·칼
      kindCode,           // 0~4
      type: kindName,     // 화면 호환용
      erased: false,      // 제거 예정
      selected: false,    // 경로 선택 여부
      skipRetaliation: false, // 보충/효과로 이번 반격 제외
      abilityUsed: false, // 특수 적 능력 사용 여부
      frozen: false,      // 동결 상태
      firePower: 0,       // 저장된 불 피해
      fireCollected: false,
      broken: false,      // 파손 상태
      magicBlade: false,  // 마법 칼 여부 (공격 기여 5배)
      arrow: false,       // 화살 여부 (거리 2 적 연결)
      potionForm: 'normal', // 정상('normal')·산성('acid')·충전('charge')·폭발('bomb')
      bridgeForm: 'none',   // 보통('none')·연결('bridge')·직업보상('reward')
      enemy: null         // 적 정보
    };

    if (kindName === KIND_ENEMY) {
      cell.enemy = {
        enemyKind: 0,     // 일반0·특수1~32
        hitPoints: 4,     // 현재 체력
        recoveryLimit: 4, // 회복 기준 체력
        strike: 1,        // 공격력
        guard: 0,         // 방어력
        poisonSteps: [0, 0, 0], // 현재부터 3단계 독
        countLeft: 0,     // 카운트다운
        shellState: 0,    // 32번 변환 상태 (0: 일반, 1: 변환)
        revivalDelay: false, // 부활 유예
        isMortalEnemy: false // 숙적 여부
      };
    }

    return cell;
  }

  /**
   * 종류 변경 시 상태 초기화 [C1, 교정 15.5]
   * 선택·마법·화살·물약변형·동결·불·불수집완료·파손·변환 상태를 초기화하고,
   * 적 생성 때 독 세 단계를 0으로 한다.
   * 비적의 사용하지 않는 독 메모리까지 기준이 모두 지운다는 주장은 철회한다.
   * 제거표식(erased)은 수집·낙하 담당이 관리하며 임의 반전하지 않는다.
   */
  function morphCellKind(cell, newKindCodeOrName) {
    if (!cell) return;
    let kindCode = 0;
    let kindName = KIND_POTION;
    if (typeof newKindCodeOrName === 'number') {
      const rawCode = Math.floor(newKindCodeOrName);
      if (rawCode === 6) {
        kindCode = 6;
        kindName = KIND_BRIDGE;
      } else {
        kindCode = Math.max(0, Math.min(4, rawCode));
        kindName = KIND_CODE_TO_NAME[kindCode] || KIND_POTION;
      }
    } else if (typeof newKindCodeOrName === 'string') {
      kindName = newKindCodeOrName;
      kindCode = KIND_NAME_TO_CODE[kindName] != null ? KIND_NAME_TO_CODE[kindName] : 0;
    }

    cell.kind = kindName;
    cell.kindCode = kindCode;
    cell.type = kindName;

    // 선택·마법·화살·물약변형·동결·불·불수집완료·파손·변환 상태 초기화
    cell.selected = false;
    cell.frozen = false;
    cell.firePower = 0;
    cell.fireCollected = false;
    cell.broken = false;
    cell.magicBlade = false;
    cell.arrow = false;
    cell.potionForm = 'normal';
    cell.bridgeForm = (kindName === 'bridge' || kindName === 'reward' || kindName === 'class_reward') ? kindName : 'none';
    cell.abilityUsed = false;
    cell.skipRetaliation = false;

    if (kindName === KIND_ENEMY) {
      cell.enemy = {
        enemyKind: 0,
        hitPoints: 4,
        recoveryLimit: 4,
        strike: 1,
        guard: 0,
        poisonSteps: [0, 0, 0], // 적 생성 때 독 세 단계를 0으로 한다
        countLeft: 0,
        shellState: 0,
        revivalDelay: false,
        isMortalEnemy: false
      };
    } else {
      cell.enemy = null;
    }
  }

  // ==========================================
  // [M, N] 조각 13: 직업·퍽·종족·업적 데이터 및 상수 [M1 ~ M4, N1]
  // ==========================================

  // 직업 10종 정의 (C00 ~ C09) [M1]
  const CLASS_DEFINITIONS = [
    {
      id: 0,
      key: 'adventurer',
      name: '모험가',
      defaultRace: 0,
      fixedPerk: null,
      fixedFlaw: null,
      hp: 50,
      atk: 3,
      shield: 4,
      skillPool: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
    },
    {
      id: 1,
      key: 'ranger',
      name: '레인저',
      defaultRace: 1,
      fixedPerk: 6,
      fixedFlaw: 6,
      hp: 50,
      atk: 3,
      shield: 3,
      skillPool: [31, 2, 3, 4, 5, 7, 8, 9, 10, 12, 13, 14, 16, 18, 21, 22, 23, 24, 25, 29]
    },
    {
      id: 2,
      key: 'raider',
      name: '약탈자',
      defaultRace: 6,
      fixedPerk: 2,
      fixedFlaw: 2,
      hp: 50,
      atk: 3,
      shield: 4,
      skillPool: [32, 2, 3, 4, 6, 8, 9, 11, 12, 15, 16, 17, 18, 19, 20, 22, 23, 24, 25, 27]
    },
    {
      id: 3,
      key: 'priest',
      name: '사제',
      defaultRace: 4,
      fixedPerk: 5,
      fixedFlaw: 5,
      hp: 50,
      atk: 3,
      shield: 4,
      skillPool: [33, 1, 2, 5, 6, 7, 8, 9, 10, 12, 13, 15, 18, 19, 21, 20, 25, 26, 28, 29]
    },
    {
      id: 4,
      key: 'barbarian',
      name: '바바리안',
      defaultRace: 5,
      fixedPerk: 4,
      fixedFlaw: 4,
      hp: 50,
      atk: 4,
      shield: 4,
      skillPool: [34, 3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 16, 18, 19, 21, 20, 22, 23, 25, 27]
    },
    {
      id: 5,
      key: 'mage',
      name: '마법사',
      defaultRace: 9,
      fixedPerk: 1,
      fixedFlaw: 1,
      hp: 40,
      atk: 3,
      shield: 4,
      skillPool: [35, 1, 2, 3, 6, 7, 8, 9, 10, 12, 15, 17, 18, 21, 20, 24, 25, 26, 28, 29]
    },
    {
      id: 6,
      key: 'rogue',
      name: '도적',
      defaultRace: 3,
      fixedPerk: 7,
      fixedFlaw: 7,
      hp: 50,
      atk: 3,
      shield: 4,
      skillPool: [36, 0, 2, 3, 4, 6, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 22, 23, 24, 25]
    },
    {
      id: 7,
      key: 'paladin',
      name: '성기사',
      defaultRace: 8,
      fixedPerk: 8,
      fixedFlaw: 8,
      hp: 50,
      atk: 3,
      shield: 4,
      skillPool: [37, 2, 3, 4, 5, 8, 9, 11, 12, 13, 14, 16, 18, 19, 21, 20, 23, 24, 25, 27]
    },
    {
      id: 8,
      key: 'warrior',
      name: '전사',
      defaultRace: 2,
      fixedPerk: 9,
      fixedFlaw: 9,
      hp: 60,
      atk: 3,
      shield: 4,
      skillPool: [38, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 16, 19, 21, 22, 23, 25, 27]
    },
    {
      id: 9,
      key: 'assassin',
      name: '암살자',
      defaultRace: 7,
      fixedPerk: 3,
      fixedFlaw: 3,
      hp: 50,
      atk: 3,
      shield: 4,
      skillPool: [39, 0, 1, 4, 5, 7, 8, 9, 12, 14, 15, 16, 18, 21, 22, 23, 24, 25, 27, 28]
    }
  ];

  // 종족 숙적 배열 (0~9) [M4]
  const RACE_MORTAL_ENEMIES = [0, 9, 14, 13, 16, 12, 5, 20, 8, 19];

  // 종족 10종 정의 (R00 ~ R09) [M4]
  const RACE_DEFINITIONS = [
    { id: 0, key: 'human', name: '평원 고블린', mortalEnemyId: 0, defaultClassId: 0 },
    { id: 1, key: 'elf', name: '숲 고블린', mortalEnemyId: 9, defaultClassId: 1 },
    { id: 2, key: 'dwarf', name: '땅굴 고블린', mortalEnemyId: 14, defaultClassId: 8 },
    { id: 3, key: 'sauren', name: '늪 고블린', mortalEnemyId: 13, defaultClassId: 6 },
    { id: 4, key: 'faun', name: '뿔 고블린', mortalEnemyId: 16, defaultClassId: 3 },
    { id: 5, key: 'orc', name: '덩치 고블린', mortalEnemyId: 12, defaultClassId: 4 },
    { id: 6, key: 'halfling', name: '꼬마 고블린', mortalEnemyId: 5, defaultClassId: 2 },
    { id: 7, key: 'werewolf', name: '늑대 고블린', mortalEnemyId: 20, defaultClassId: 9 },
    { id: 8, key: 'dragonkin', name: '용혈 고블린', mortalEnemyId: 8, defaultClassId: 7 },
    { id: 9, key: 'changeling', name: '변신 고블린', mortalEnemyId: 19, defaultClassId: 5 }
  ];

  // 퍽 10종 정의 (P00 ~ P09) [M3]
  const PERK_DEFINITIONS = [
    { id: 0, name: '첫5턴반격없음', desc: '첫 5턴 동안 적 반격을 건너뜀' },
    { id: 1, name: '물약추첨5%충전형', desc: '새 정상 물약마다 5% 충전형' },
    { id: 2, name: '동종10번째부터추가토큰100%', desc: '같은 종류 10번째부터 추가 토큰 100%' },
    { id: 3, name: '네번째스킬필요량-1', desc: '네 번째 슬롯 스킬 필요량 1 감소' },
    { id: 4, name: '기본공격+1', desc: '기본 공격력 +1 증가' },
    { id: 5, name: '재생강화증가량2배', desc: '재생(턴회복) 강화 증가량 2배' },
    { id: 6, name: '칼추첨5%화살', desc: '새 칼마다 5% 화살' },
    { id: 7, name: '코인보너스+10%p', desc: '코인 보너스 확률 +10%p' },
    { id: 8, name: '숙적덮어쓰기문턱10→5', desc: '숙적 덮어쓰기 문턱 정수 1~200 중 5 이하' },
    { id: 9, name: '최대체력+10', desc: '최대 체력 +10 증가' }
  ];

  // 결함 10종 정의 (F00 ~ F09) [M3]
  const FLAW_DEFINITIONS = [
    { id: 0, name: '첫5턴직접공격값0', desc: '첫 5턴 직접 공격값 0 (독/동결 유지)' },
    { id: 1, name: '최대체력-10', desc: '최대 체력 -10 감소' },
    { id: 2, name: '길이3비적수집무보상', desc: '길이 3의 비적 수집 보상만 0' },
    { id: 3, name: '일반적생성체력+1', desc: '일반 적 생성 체력 +1' },
    { id: 4, name: '방패보너스-10%p', desc: '방패 보너스 확률 -10%p' },
    { id: 5, name: '관통값-20', desc: '관통값 -20 (50 -> 30)' },
    { id: 6, name: '첫방패장비최대값2→1', desc: '첫 방패 장비 최대값 2 -> 1' },
    { id: 7, name: '방패추첨3%파손', desc: '새 방패마다 3% 파손' },
    { id: 8, name: '초기승급49·재대기-1최소1', desc: '초기 승급 대기 49, 재대기 -1' },
    { id: 9, name: '특수적체력1.05배소수버림', desc: '특수 적 체력 1.05배 소수 버림' }
  ];

  /**
   * 세션 생성 (makeSession)
   */
  function makeSession(options = {}) {
    const rng = options.rng || null;
    const difficulty = (typeof options.difficulty === 'number' && Number.isInteger(options.difficulty) && options.difficulty >= 0 && options.difficulty <= 3)
      ? options.difficulty
      : 1; // 기본 난이도 보통(1) [추가 29.1, 29.2]
    const mode = options.mode || 'normal'; // normal, turn100, score
    const phase = 'input'; // input, settle, choice, end
    const classKey = options.classKey != null ? options.classKey : 0;
    const classDef = CLASS_DEFINITIONS[classKey] || CLASS_DEFINITIONS[0];
    let raceKey = options.raceKey != null ? options.raceKey : classDef.defaultRace;
    if (classKey > 0 && options.growth != null && options.growth < 5) {
      raceKey = classDef.defaultRace;
    }

    let perks = Array.isArray(options.perks)
      ? options.perks.slice(0, 4).map(p => (p != null && p !== 255 ? Number(p) : null))
      : [null, null, null, null];
    while (perks.length < 4) perks.push(null);

    let flaws = Array.isArray(options.flaws)
      ? options.flaws.slice(0, 4).map(f => (f != null && f !== 255 ? Number(f) : null))
      : [null, null, null, null];
    while (flaws.length < 4) flaws.push(null);

    // 비기본 직업의 첫 고정 쌍 [M1]
    if (classKey > 0) {
      if (options.perks == null || perks[0] == null) {
        perks[0] = classDef.fixedPerk;
      }
      if (options.flaws == null || flaws[0] == null) {
        flaws[0] = classDef.fixedFlaw;
      }
    } else {
      // 직업 0: options.perks/flaws가 명시적으로 전달되지 않은 경우 0개로 유지 [M2]
      if (options.perks == null) {
        perks = [null, null, null, null];
      }
      if (options.flaws == null) {
        flaws = [null, null, null, null];
      }
    }

    // 플레이어 기본 스탯 (장비 합산 전 순수 기본값) [B, M1, 교정 20.5]
    // 기본 시작 체력 40 + 첫 장신구 10 = 50, 기본 방패 0 + 첫 세 부위 1/2/1 = 4(결함 6이면 3)를 재합산(recalculateHeroStats)으로 얻는다.
    let baseLife = mode === 'score' ? 100 : 40;
    let initLifeCap = baseLife;
    if (flaws.includes(1)) {
      initLifeCap = Math.max(1, initLifeCap - 10);
    }
    if (perks.includes(9)) {
      initLifeCap += 10;
    }

    const hero = {
      life: initLifeCap,
      lifeCap: initLifeCap,
      baseLife,
      baseStrike: 3 + (perks.includes(4) ? 1 : 0),
      bladeStrike: 0,
      shield: 0,
      shieldCap: 0,
      potionPower: 1,
      repairPower: 1,
      poisonPower: 0,
      baseGrowth: [1, 1, 1, 1], // [B, 교정 15.7, 교정 20.5] 기본 성장값 네 개 1로 시작해 독립 저장
      growths: [1, 1, 1, 1],
      rank: 1,
      xp: 0,
      coins: 0,
      upgrade: 0,
      completedXp: 0,
      completedCoins: 0,
      completedUpgrade: 0,
      bonusOdds: {
        xp: 20,
        coins: perks.includes(7) ? 30 : 20,
        potion: 20,
        shield: flaws.includes(4) ? 10 : 20
      },
      extraRates: { xp: 0, coins: 0, upgrade: 0 },
      drainRate: 0,
      piercing: flaws.includes(5) ? 30 : 50,
      shieldDamageOdds: 50,
      thorns: 0,
      blunt: 0,
      regen: 0,
      hasCooldownReduction: false,
      _permStats: {
        atk: 0,
        repair: 0,
        potion: 0,
        hp: 0,
        shieldCap: 0,
        growthAtk: 0,
        growthPotion: 0,
        growthRepair: 0,
        growthHp: 0,
        xpOdds: 0,
        coinsOdds: 0,
        potionOdds: 0,
        shieldOdds: 0
      },
      classKey,
      raceKey,
      perks,
      flaws,
      activeNow: {},
      activeNext: {}
    };

    // 장비 5부위 초기 생성 [B, L2, 교정 20.5]
    const gear = [
      { slot: 0, ownLook: 0, boosts: new Array(20).fill(0) }, // 무기
      { slot: 1, ownLook: 0, boosts: new Array(20).fill(0) }, // 머리
      { slot: 2, ownLook: 0, boosts: new Array(20).fill(0) }, // 방패
      { slot: 3, ownLook: 0, boosts: new Array(20).fill(0) }, // 몸
      { slot: 4, ownLook: 0, boosts: new Array(20).fill(0) }  // 장신구
    ];
    gear[0].boosts[0] = 2; // 무기공격 2
    gear[1].boosts[11] = 1; // 머리방패 1
    gear[2].boosts[11] = flaws.includes(6) ? 1 : 2; // 방패부위 2 (결함 6은 1)
    gear[3].boosts[11] = 1; // 몸방패 1
    gear[4].boosts[10] = mode === 'score' ? 0 : 10; // 장신구체력 10 (별도점수모드 0)

    // 스킬 (최대 4개) [B]
    const actions = [];

    // 판 6x6 (36칸) [C1, C2]
    const cells = [];
    let cellSeq = 1;

    if (options.grid && Array.isArray(options.grid)) {
      for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
          const item = options.grid[y] ? options.grid[y][x] : null;
          if (item) {
            const c = createCell(x, y, item.kind != null ? item.kind : item.type, item.cellKey || item.id);
            Object.assign(c, item);
            cells.push(c);
          } else {
            cells.push(createCell(x, y, 0));
          }
        }
      }
    } else {
      for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
          let code = drawInt(rng, 0, 4, 'cellKind');
          // 시작 판에는 적을 다시 뽑는다 [C1, 교정 15.1, 교정 23.3]
          // 횟수 제한·물약 강제 대체 없이 적이 아닌 값이 나올 때까지 계속 다시 뽑는다.
          while (code === 1) {
            code = drawInt(rng, 0, 4, 'cellKind');
          }

          const cell = createCell(x, y, code, `c_${x}_${y}_${cellSeq++}`);

          // [C2] 변형 칸 생성
          if (cell.kind === KIND_POTION && perks.includes(1)) {
            const roll = drawInt(rng, 1, 100, 'potionForm');
            if (roll < 6) {
              cell.potionForm = 'charge';
            }
          } else if (cell.kind === KIND_SWORD && perks.includes(6)) {
            const roll = drawInt(rng, 1, 100, 'arrow');
            if (roll < 6) {
              cell.arrow = true;
            }
          } else if (cell.kind === KIND_SHIELD && flaws.includes(7)) {
            const roll = drawInt(rng, 1, 100, 'broken');
            if (roll < 4) {
              cell.broken = true;
            }
          }

          cells.push(cell);
        }
      }
    }

    const session = {
      cells,
      tick: 0,
      difficulty,
      mode,
      phase,
      hero,
      gear,
      actions,
      waitingChoices: [],
      promotionLeft: (mode === 'turn100') ? 200 : (flaws.includes(8) ? 49 : 50),
      path: [],
      killLedger: 0,
      totals: { xp: 0, coins: 0, upgrade: 0 },
      fractions: { xp: 0, coins: 0, upgrade: 0 },
      classRewardCounter: options.classRewardCounter != null ? Math.min(30, options.classRewardCounter) : 0,
      classRewardCount: options.classRewardCount || 0,
      specialKills: options.specialKills || 0,
      scoreModePoints: options.scoreModePoints || 0,
      scoreModeTurnPoints: options.scoreModeTurnPoints || 0,
      _turnSpawnCount: 0,
      _turnEnemySpawnCount: 0,
      _emittedOnce: {},
      profile: options.profile || null,
      ...(Array.isArray(options.skillPool) ? { skillPool: [...options.skillPool] } : {}),
      ...(Array.isArray(options.skillSwaps) ? { skillSwaps: [...options.skillSwaps] } : {}),
      randomState: (options.randomState != null && typeof options.randomState !== 'function') ? options.randomState : null,
      events: [],
      provisional: [...PROVISIONAL_ITEMS],
      rng
    };

    // [교정 20.5] 기본 시작 체력 40 + 첫 장신구 10 = 50, 기본 방패 0 + 첫 세 부위 1/2/1 = 4(결함 6이면 3)를 재합산으로 얻는다.
    recalculateHeroStats(session);

    return session;
  }

  // ==========================================
  // [C] 판·칸 연결 규칙 (8방향, 동종/칼적, 다리, 화살, 32변환)
  // ==========================================

  function getCell(session, x, y) {
    if (!session || !session.cells) return null;
    return session.cells.find(c => c.x === x && c.y === y) || null;
  }

  function isRewardCell(cell) {
    if (!cell || cell.erased || cell.rewardConsumed) return false;
    return Boolean(
      cell.bridgeForm === 'reward' ||
      cell.bridgeForm === 'class_reward' ||
      cell.kind === 'reward' ||
      cell.kind === 'class_reward' ||
      cell.type === 'phylactery'
    );
  }

  function isCombatCell(cell) {
    if (!cell || isRewardCell(cell)) return false;
    // 32번 변환 상태 적은 일반 전투 연결 불가 [C4]
    if (cell.enemy && cell.enemy.shellState === 1) return false;
    return cell.kind === KIND_SWORD || cell.kind === KIND_ENEMY || cell.kindCode === 4 || cell.kindCode === 1;
  }

  function isCoinCell(cell) {
    if (!cell || isRewardCell(cell)) return false;
    // 32번 변환 상태 적은 코인과 연결 [C4]
    if (cell.enemy && cell.enemy.shellState === 1) return true;
    return cell.kind === KIND_COIN || cell.kindCode === 2;
  }

  /**
   * 경로 분석 헬퍼 [C3, C4, C5, 교정 15.2 ~ 15.4]
   * - 모든 한 걸음은 서로 다른 8방향 이웃이다. 화살 칼에서 거리 2 끝점으로 건너뛰지 않는다.
   * - 화살 바로 다음은 종류 무관 허용 (동결 비적·직업보상 칸 금지 먼저 적용).
   * - 화살 바로 다음의 비칼·비적 칸은 경유 칸으로 따로 기록한다. 그 다음 일반 칸은 칼 또는 변환하지 않은 적이어야 한다.
   * - 경유 칸은 유효 연결 길이·공격·일반 수집에서 빼며 판에 남긴다.
   * - 다리는 앞뒤 종류를 연결한다. 현재 칸 또는 바로 앞 칸이 다리이면 종류를 허용하고, 다리 다음 일반 칸부터는 마지막 일반 칸의 종류로 이어간다.
   * - 다리와 화살이 겹치면 다리 허용을 먼저 검사한다.
   * - 연속 다리도 허용한다.
   */
  function analyzePath(session, path) {
    if (!session || !Array.isArray(path) || path.length === 0) {
      return {
        valid: false,
        waypoints: [],
        effectiveLength: 0,
        lastNormalKind: 'none',
        isWaitingAfterWaypoint: false
      };
    }

    const waypoints = [];
    let lastNormalKind = 'none';
    let isWaitingAfterWaypoint = false;
    let prevWasBridge = false;

    for (let i = 0; i < path.length; i++) {
      const coord = path[i];
      if (!coord || !Number.isInteger(coord.x) || !Number.isInteger(coord.y)) {
        return { valid: false, waypoints: [], effectiveLength: 0 };
      }
      if (coord.x < 0 || coord.x >= BOARD_WIDTH || coord.y < 0 || coord.y >= BOARD_HEIGHT) {
        return { valid: false, waypoints: [], effectiveLength: 0 };
      }

      const cell = getCell(session, coord.x, coord.y);
      if (!cell || cell.erased) {
        return { valid: false, waypoints: [], effectiveLength: 0 };
      }

      // 얼어 있는 비적 거절 [C3, 교정 15.2]
      const isEnemy = cell.kind === KIND_ENEMY || cell.kindCode === 1;
      if (cell.frozen && !isEnemy) {
        return { valid: false, waypoints: [], effectiveLength: 0 };
      }

      // 직업보상 특수 칸 [C4, 교정 15.2, 교정 21.4, 교정 21.5]
      if (isRewardCell(cell)) {
        if (i !== 0 || path.length !== 1) {
          return { valid: false, waypoints: [], effectiveLength: 0 };
        }
        return {
          valid: true,
          waypoints: [],
          effectiveLength: 1,
          lastNormalKind: 'reward',
          isWaitingAfterWaypoint: false
        };
      }

      // 중복 칸 검사 [C3]
      for (let k = 0; k < i; k++) {
        if (path[k].x === coord.x && path[k].y === coord.y) {
          return { valid: false, waypoints: [], effectiveLength: 0 };
        }
      }

      if (i === 0) {
        if (cell.kind === KIND_BRIDGE || cell.bridgeForm === 'bridge') {
          prevWasBridge = true;
          lastNormalKind = 'bridge';
        } else if (isCombatCell(cell)) {
          lastNormalKind = 'combat';
          prevWasBridge = false;
        } else if (isCoinCell(cell)) {
          lastNormalKind = 'coin';
          prevWasBridge = false;
        } else if (cell.kind === KIND_POTION || cell.kindCode === 0) {
          lastNormalKind = 'potion';
          prevWasBridge = false;
        } else if (cell.kind === KIND_SHIELD || cell.kindCode === 3) {
          lastNormalKind = 'shield';
          prevWasBridge = false;
        }
        continue;
      }

      // 8방향 거리 검사 [교정 15.2]
      const prevCoord = path[i - 1];
      const prevCell = getCell(session, prevCoord.x, prevCoord.y);
      if (!prevCell) return { valid: false, waypoints: [], effectiveLength: 0 };

      const dx = Math.abs(coord.x - prevCoord.x);
      const dy = Math.abs(coord.y - prevCoord.y);
      if (dx > 1 || dy > 1 || (dx === 0 && dy === 0)) {
        return { valid: false, waypoints: [], effectiveLength: 0 };
      }

      const isCurBridge = (cell.kind === KIND_BRIDGE || cell.bridgeForm === 'bridge');
      const isPrevArrowSword = Boolean(prevCell.arrow && (prevCell.kind === KIND_SWORD || prevCell.kindCode === 4));

      // 1) 다리 검사: 다리와 화살이 겹치면 다리 허용을 먼저 검사한다 [교정 15.3, 15.4, 교정 26.6]
      // [교정 26.6] '화살 → 비전투 칸 경유 → 연결칸(다리)' 순서를 거절하지 않는다.
      // 현재 칸의 연결 허용 조건(다리)을 화살 경유 뒤 검사보다 먼저 적용한다.
      if (isCurBridge) {
        prevWasBridge = true;
        isWaitingAfterWaypoint = false;
        continue;
      }

      if (prevWasBridge) {
        // 직전 칸이 다리였으면 종류를 허용하고, 이 일반 칸의 종류로 lastNormalKind 이어감
        if (isCombatCell(cell)) lastNormalKind = 'combat';
        else if (isCoinCell(cell)) lastNormalKind = 'coin';
        else if (cell.kind === KIND_POTION || cell.kindCode === 0) lastNormalKind = 'potion';
        else if (cell.kind === KIND_SHIELD || cell.kindCode === 3) lastNormalKind = 'shield';
        prevWasBridge = false;
        isWaitingAfterWaypoint = false;
        continue;
      }

      // 2) 직전 칸이 경유 칸이었던 경우:
      // "그 다음 일반 칸은 칼 또는 변환하지 않은 적이어야 한다." [교정 15.3]
      if (isWaitingAfterWaypoint) {
        if (!isCombatCell(cell)) {
          return { valid: false, waypoints: [], effectiveLength: 0 };
        }
        isWaitingAfterWaypoint = false;
        lastNormalKind = 'combat';
        prevWasBridge = false;
        continue;
      }

      // 3) 화살 검사 [교정 15.2, 15.3, 교정 26.6]
      // "화살 바로 다음은 종류 무관하게 허용하되 동결 비적·직업보상 칸의 금지는 먼저 적용한다."
      // "화살 바로 다음의 비칼·비적 칸은 경유 칸으로 따로 기록한다. 변환 32는 칸 종류 그대로(기본 종류 1) 경유로 센다."
      if (isPrevArrowSword) {
        if (!isCombatCell(cell)) {
          // 비칼·비적 칸은 경유 칸 (변환 32도 isCombatCell이 false이므로 경유 칸)
          waypoints.push(i);
          isWaitingAfterWaypoint = true;
          prevWasBridge = false;
          continue;
        } else {
          lastNormalKind = 'combat';
          prevWasBridge = false;
          continue;
        }
      }

      // 4) 일반 종류 호환 검사
      if (lastNormalKind === 'combat') {
        if (!isCombatCell(cell)) {
          return { valid: false, waypoints: [], effectiveLength: 0 };
        }
      } else if (lastNormalKind === 'coin') {
        if (!isCoinCell(cell)) {
          return { valid: false, waypoints: [], effectiveLength: 0 };
        }
      } else if (lastNormalKind === 'potion') {
        if (cell.kind !== KIND_POTION && cell.kindCode !== 0) {
          return { valid: false, waypoints: [], effectiveLength: 0 };
        }
      } else if (lastNormalKind === 'shield') {
        if (cell.kind !== KIND_SHIELD && cell.kindCode !== 3) {
          return { valid: false, waypoints: [], effectiveLength: 0 };
        }
      } else {
        return { valid: false, waypoints: [], effectiveLength: 0 };
      }

      prevWasBridge = false;
    }

    const effectiveLength = path.length - waypoints.length;
    return {
      valid: true,
      waypoints,
      effectiveLength,
      lastNormalKind,
      isWaitingAfterWaypoint
    };
  }

  /**
   * 다음 칸으로 체인을 연장할 수 있는지 검사 [C3, C4, C5, 교정 15.2 ~ 15.4]
   */
  function canConnect(session, path, nextCoord) {
    if (!session || !nextCoord || session.phase === 'end') return false;
    const testPath = (Array.isArray(path) && path.length > 0) ? [...path, nextCoord] : [nextCoord];
    const res = analyzePath(session, testPath);
    return res.valid;
  }

  /**
   * 경로 한 걸음 진행 및 되돌림 (stepChain) [C3, 교정 15.3]
   */
  function stepChain(session, path, nextCoord) {
    if (!Array.isArray(path)) path = [];
    if (!nextCoord) return [...path];

    if (path.length === 0) {
      if (canConnect(session, path, nextCoord)) {
        return [{ x: nextCoord.x, y: nextCoord.y }];
      }
      return [];
    }

    const lastCoord = path[path.length - 1];
    if (lastCoord.x === nextCoord.x && lastCoord.y === nextCoord.y) {
      return [...path];
    }

    // 연결했던 위치로 돌아오면 그 위치 뒤를 모두 잘라낸다 [C3, 교정 15.3]
    const existingIndex = path.findIndex(p => p.x === nextCoord.x && p.y === nextCoord.y);
    if (existingIndex !== -1) {
      return path.slice(0, existingIndex + 1);
    }

    // 새 칸 추가 검사
    if (canConnect(session, path, nextCoord)) {
      return [...path, { x: nextCoord.x, y: nextCoord.y }];
    }

    return [...path];
  }

  /**
   * 체인 유효성 검사 (isValidChain) [C3, 교정 15.3]
   * 최소 길이는 전체 경로 수에서 경유 칸 수를 뺀 값이 3 이상이다.
   * 단독 직업보상 칸은 1칸 허용.
   */
  function isValidChain(session, path) {
    if (!session || !Array.isArray(path) || path.length === 0 || session.phase === 'end') return false;
    const res = analyzePath(session, path);
    if (!res.valid) return false;
    if (res.isWaitingAfterWaypoint) return false; // 경유 칸 다음 칼/적이 아직 없음
    if (res.lastNormalKind === 'reward') return path.length === 1;
    return res.effectiveLength >= 3;
  }

  // ==========================================
  // [D] 조각 2: 공격 및 피해 종류 계산 규칙
  // ==========================================

  /**
   * 적이 포함된 줄의 총공격 계산 [D1, 교정 15.3, 15.6]
   * - 경유 칸은 총공격 기여에서 제외한다.
   * - 적이 포함된 줄의 총공격은 기본공격에 각 정상 칼의 무기공격을 더한다.
   * - 마법칼은 해당 칼 기여만 5배, 파손칼은 0, 무기 배가 활성은 무기 기여만 2배다.
   * - 길이 고정배수는 없다.
   * - 숙적 8이 살아 있으면 기본공격 부분만 정수 절반, 최소 1 보정 없음.
   * - 적 없는 줄에는 기본공격을 더하지 않는다.
   * - 각 연결 적에게 같은 총공격을 주고 적 수로 나누지 않는다.
   */
  function calculateTotalAttack(session, path, waypoints = []) {
    if (!session || !session.hero || !Array.isArray(path) || path.length === 0) {
      return 0;
    }

    const waypointSet = new Set(waypoints);

    // 줄에 전투 가능한 적이 포함되어 있는지 검사 (변환 상태 32번 제외, 경유 칸 제외)
    let hasCombatEnemy = false;
    for (let i = 0; i < path.length; i++) {
      if (waypointSet.has(i)) continue;
      const p = path[i];
      const cell = getCell(session, p.x, p.y);
      if (cell && (cell.kind === KIND_ENEMY || cell.kindCode === 1)) {
        if (!cell.enemy || cell.enemy.shellState !== 1) {
          hasCombatEnemy = true;
          break;
        }
      }
    }

    let baseStrike = 0;
    if (hasCombatEnemy) {
      baseStrike = session.hero.baseStrike != null ? session.hero.baseStrike : 3;

      // 숙적 8 생존 검사 [D1] (종족 8 용혈 고블린의 숙적이 8번 빙결괴물)
      const enemy8Alive = session.cells.some(c =>
        c && !c.erased && c.enemy && c.enemy.enemyKind === 8 && (c.enemy.hitPoints == null || c.enemy.hitPoints > 0)
      );
      const isRace8 = session.hero.raceKey === 8;
      if (enemy8Alive && (isRace8 || session.hero.enemy8Debuff || session.enemy8Active)) {
        baseStrike = Math.floor(baseStrike / 2); // 정수 절반, 최소 1 보정 없음
      }
    }

    // 무기 배가 활성 여부 [D1] (스킬 16 또는 activeNow.doubleSword)
    const isDoubleWeapon = Boolean(
      session.hero.activeNow && (
        session.hero.activeNow.doubleSword ||
        session.hero.activeNow.boostSword ||
        session.hero.activeNow.weaponMultiplier === 2 ||
        session.hero.activeNow.skill16
      )
    );

    const weaponAtk = session.hero.bladeStrike != null ? session.hero.bladeStrike : 2;

    let swordContributions = 0;
    for (let i = 0; i < path.length; i++) {
      if (waypointSet.has(i)) continue; // 경유 칸은 공격 기여에서 제외 [교정 15.3]
      const p = path[i];
      const cell = getCell(session, p.x, p.y);
      if (cell && (cell.kind === KIND_SWORD || cell.kindCode === 4)) {
        if (cell.broken) {
          // 파손 칼은 기여 0 [D1]
          continue;
        }
        let bladePower = weaponAtk;
        if (cell.magicBlade) {
          bladePower *= 5; // 마법칼은 해당 칼 기여만 5배 [D1]
        }
        if (isDoubleWeapon) {
          bladePower *= 2; // 무기 배가 활성은 무기 기여만 2배 [D1]
        }
        swordContributions += bladePower;
      }
    }

    return baseStrike + swordContributions;
  }

  /**
   * 피해종류 판정 순서 [D2]
   * 비적과 32번 변환 상태는 비전투
   * → 첫 5턴(턴 0~4) 결함 0이면 차단
   * → 27번은 다음 칸이 위쪽일 때만 보통피해, 아니면 차단
   * → 그 외 종족 2에서 앞·현재·뒤 x가 같고 앞은 아래·뒤는 위인 적은 추가타격
   * → 숙적 14인 적 14는 나머지 경로 차단
   * → 30번 자신이거나 판에 30번이 없으면 보통피해
   * → 나머지는 차단
   */
  function determineDamageType(session, path, pathIndex, targetCell) {
    if (!targetCell) return DAMAGE_TYPE_NONCOMBAT;

    // 1) 비적과 32번 변환 상태는 비전투
    const isEnemy = targetCell.kind === KIND_ENEMY || targetCell.kindCode === 1;
    if (!isEnemy || (targetCell.enemy && targetCell.enemy.shellState === 1)) {
      return DAMAGE_TYPE_NONCOMBAT;
    }

    // 2) 첫 5턴(턴 0~4) 결함 0이면 차단
    if (session.tick < 5 && Array.isArray(session.hero.flaws) && session.hero.flaws.includes(0)) {
      return DAMAGE_TYPE_BLOCKED;
    }

    const enemyKind = targetCell.enemy ? targetCell.enemy.enemyKind : 0;

    // 3) 27번은 다음 칸이 위쪽일 때만 보통피해, 아니면 차단
    if (enemyKind === 27) {
      const nextCoord = (Array.isArray(path) && pathIndex + 1 < path.length) ? path[pathIndex + 1] : null;
      if (nextCoord && nextCoord.y < targetCell.y) {
        return DAMAGE_TYPE_NORMAL;
      }
      return DAMAGE_TYPE_BLOCKED;
    }

    // 4) 종족 2에서 앞·현재·뒤 x가 같고 앞은 아래·뒤는 위인 적은 추가타격
    if (session.hero.raceKey === 2 && Array.isArray(path) && pathIndex > 0 && pathIndex + 1 < path.length) {
      const prevCoord = path[pathIndex - 1];
      const nextCoord = path[pathIndex + 1];
      if (
        prevCoord.x === targetCell.x &&
        nextCoord.x === targetCell.x &&
        prevCoord.y > targetCell.y &&
        nextCoord.y < targetCell.y
      ) {
        return DAMAGE_TYPE_VERTICAL;
      }
    }

    // 5) 숙적 14인 적 14는 나머지 경로 차단 (종족 2의 숙적이 14)
    const isMortal14 = (session.hero.raceKey === 2) || (targetCell.enemy && targetCell.enemy.isMortalEnemy);
    if (enemyKind === 14 && isMortal14) {
      return DAMAGE_TYPE_BLOCKED;
    }

    // 6) 30번 자신이거나 판에 30번이 없으면 보통피해
    if (enemyKind === 30) {
      return DAMAGE_TYPE_NORMAL;
    }
    const hasEnemy30 = session.cells.some(c =>
      c && !c.erased && c.enemy && c.enemy.enemyKind === 30 && (c.enemy.hitPoints == null || c.enemy.hitPoints > 0)
    );
    if (!hasEnemy30) {
      return DAMAGE_TYPE_NORMAL;
    }

    // 7) 나머지는 차단
    return DAMAGE_TYPE_BLOCKED;
  }

  /**
   * 단일 적에 대한 공격 및 피해 적용 [D3, D4, 교정 17.3, 17.4]
   */
  function applyAttackToEnemy(session, cell, damageType, totalAttack, isDirect = true, options = {}) {
    if (!cell || !cell.enemy || damageType === DAMAGE_TYPE_NONCOMBAT) {
      return { success: false, damageType: DAMAGE_TYPE_NONCOMBAT, hpDamage: 0, guardDamage: 0, killed: false };
    }

    // 이미 제거되었거나 처치 완료된 적은 중복 처리하지 않는다 [교정 17.1, 17.3]
    if (cell.erased || cell.enemy.hitPoints <= 0 || cell.enemy._rewardedKill) {
      return { success: false, damageType: DAMAGE_TYPE_NONCOMBAT, hpDamage: 0, guardDamage: 0, killed: false };
    }

    // 32번 변환 상태는 공통 공격도 거절 [D3]
    if (cell.enemy.shellState === 1) {
      return { success: false, damageType: DAMAGE_TYPE_NONCOMBAT, hpDamage: 0, guardDamage: 0, killed: false };
    }

    let effectiveAttack = totalAttack;
    if (damageType === DAMAGE_TYPE_VERTICAL) {
      // 추가타격은 총공격에 무기공격 한 단위를 더한다. 마법칼 5배와 무기배가를 곱하지 않음 [D2]
      effectiveAttack += (session.hero.bladeStrike != null ? session.hero.bladeStrike : 2);
    } else if (damageType === DAMAGE_TYPE_BLOCKED) {
      // 차단 피해는 공격값 0으로 공통 직접공격을 호출 [D3]
      effectiveAttack = 0;
    }

    const initialGuard = Math.max(0, cell.enemy.guard || 0);
    const initialHp = Math.max(0, cell.enemy.hitPoints || 0);

    // 보통피해는 현재 방어를 뺀 값과 0 중 큰 값만 체력을 깎는다 [D3]
    const hpDamage = Math.max(0, effectiveAttack - initialGuard);
    const actualHpDamage = Math.min(initialHp, hpDamage);
    cell.enemy.hitPoints = initialHp - actualHpDamage;

    // 32번 변환 상태 전환 (직접/공통 공격 첫 치명타) [I0] E32, [D3, 교정 17.4, 교정 24.1]
    if (cell.enemy.enemyKind === 32 && cell.enemy.shellState === 0 && cell.enemy.hitPoints < 1) {
      cell.enemy.shellState = 1;
      cell.enemy.hitPoints = 1;
      // [교정 24.1] 기존 recoveryLimit를 유지해 4번 적 부상 치유·축복 후보에 포함될 수 있게 한다.
      cell.enemy.strike = 0;
      cell.enemy.guard = 0;
      cell.enemy.poisonSteps = [0, 0, 0];
      cell.enemy.revivalDelay = true;
      cell.erased = false;
      return {
        success: true,
        damageType,
        effectiveAttack,
        hpDamage,
        actualHpDamage,
        guardDamage: 0,
        killed: false,
        transformed32: true
      };
    }

    // 체력 1 미만이면 즉시 처치 [D3, 교정 17.3]
    if (cell.enemy.hitPoints < 1) {
      cell.enemy.hitPoints = 0;
      cell.erased = true;
      session.killLedger = (session.killLedger || 0) + 1;
      if (damageType === DAMAGE_TYPE_VERTICAL) {
        emitAchievementProgress(session, 48, 2);
      }
      const isDefer = Boolean(options && options.deferRewards);
      const activeBatch = (options && options.batch) ? options.batch : null;
      const shouldRewardSelf = Boolean(!isDefer && (activeBatch || (options && options.rewardKill)));

      if (!shouldRewardSelf) {
        if (activeBatch) {
          activeBatch.preErasedCells.add(cell);
          activeBatch.preErasedCells.add(cell.cellKey || cell);
        }
        // [J3, 교정 18.1] 8번을 처치해도 얼린 칸을 즉시 해동하지 않으며, 10의 주변연쇄만 제거 전 판에서 처리한다
        if (cell.enemy.enemyKind === 10) {
          cell.enemy._exploded10 = true;
          triggerEnemy10Explosion(session, cell, isDefer ? { deferRewards: true, batch: activeBatch } : activeBatch);
        }
      } else {
        rewardKillEnemy(session, cell, activeBatch, { allowPreErased: true });
      }

      // 사망한 적에는 관통 난수를 쓰지 않는다 [D3]
      return {
        success: true,
        damageType,
        effectiveAttack,
        hpDamage,
        actualHpDamage,
        guardDamage: 0,
        killed: true
      };
    }

    // 생존한 적만 관통 난수 처리 [D3]
    // 공격과 기존 방어 중 작은 값 횟수만큼 정수 0~100을 뽑아 관통값보다 작을 때 방어를 1 깎는다
    const pierceTries = Math.min(effectiveAttack, initialGuard);
    let guardLost = 0;
    const piercingThreshold = session.hero.piercing != null ? session.hero.piercing : 50;

    for (let i = 0; i < pierceTries; i++) {
      const roll = drawInt(session.rng, 0, 100, 'piercing');
      if (roll < piercingThreshold) {
        cell.enemy.guard = Math.max(0, (cell.enemy.guard || 0) - 1);
        guardLost++;
      }
    }

    // 직접 연결공격의 생존 적 부가효과 [D4, 교정 17.4]
    if (isDirect) {
      // 1) 장비 독을 3단계 모두 즉시 더하며 그 턴 끝부터 첫 단계 피해를 준다. 첫 턴 유예는 없다 (적 9에는 넣지 않음) [교정 17.4]
      const poisonPower = session.hero.poisonPower || 0;
      if (poisonPower > 0 && cell.enemy.enemyKind !== 9) {
        if (!Array.isArray(cell.enemy.poisonSteps)) {
          cell.enemy.poisonSteps = [0, 0, 0];
        }
        cell.enemy.poisonSteps[0] += poisonPower;
        cell.enemy.poisonSteps[1] += poisonPower;
        cell.enemy.poisonSteps[2] += poisonPower;
      }

      // 2) 종족 5면 직접공격 생존자마다 정수 1~100이 11 미만일 때 동결
      if (session.hero.raceKey === 5) {
        const freezeRoll = drawInt(session.rng, 1, 100, 'freeze');
        if (freezeRoll < 11) {
          cell.frozen = true;
          emitAchievementProgress(session, 51, 2);
        }
      }
    }

    return {
      success: true,
      damageType,
      effectiveAttack,
      hpDamage,
      actualHpDamage,
      guardDamage: guardLost,
      killed: false
    };
  }

  /**
   * 부활 검사 및 소비 [교정 26.2]
   * 체력이 0 이하일 때 부활이 있으면 소비 순서대로 1회 소비하고 최대체력으로 회복한다.
   * 반환: 부활 성공 여부 (boolean)
   */
  function checkAndApplyHeroRevive(session) {
    if (!session || !session.hero) return false;
    if (session.hero.life <= 0) {
      if (session.hero.activeNow) {
        if (typeof session.hero.activeNow.reviveCount === 'number' && session.hero.activeNow.reviveCount > 0) {
          session.hero.activeNow.reviveCount -= 1;
          if (session.hero.activeNow.reviveCount === 0) {
            delete session.hero.activeNow.reviveCount;
            delete session.hero.activeNow.revive;
          }
          session.hero.life = session.hero.lifeCap || 50;
          emitAchievementProgress(session, 61, 100);
          return true;
        }
        if (Array.isArray(session.hero.activeNow.revives) && session.hero.activeNow.revives.length > 0) {
          session.hero.activeNow.revives.shift();
          session.hero.life = session.hero.lifeCap || 50;
          emitAchievementProgress(session, 61, 100);
          return true;
        }
        if (session.hero.activeNow.revive) {
          delete session.hero.activeNow.revive;
          session.hero.life = session.hero.lifeCap || 50;
          emitAchievementProgress(session, 61, 100);
          return true;
        }
        if (session.hero.activeNow.skill37) {
          delete session.hero.activeNow.skill37;
          session.hero.life = session.hero.lifeCap || 50;
          emitAchievementProgress(session, 61, 100);
          return true;
        }
        if (session.hero.activeNow.lastStand) {
          delete session.hero.activeNow.lastStand;
          session.hero.life = session.hero.lifeCap || 50;
          emitAchievementProgress(session, 61, 100);
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 체력 변경 뒤 종료/부활 검사 [D6, E6, 교정 26.2]
   * 체력 0 이하면 종료 검사.
   * 부활 활성 상태면 최대체력으로 회복하고 소모 처리, 아니면 종료·입력 차단.
   * 반격 후뿐 아니라 산성·반사·독·불·직접능력·낙하 찌르기 후에도 검사한다.
   * 반환: { alive: boolean, revived: boolean }
   */
  function checkHeroSurvival(session) {
    if (!session || !session.hero) return { alive: false, revived: false };

    if (session.hero.life <= 0) {
      const revived = checkAndApplyHeroRevive(session);
      if (revived) {
        if (session.phase === 'end') {
          session.phase = 'input';
        }
        return { alive: true, revived: true };
      } else {
        const wasEnded = (session.phase === 'end');
        session.hero.life = 0;
        session.phase = 'end';
        if (!wasEnded) {
          const raceKey = session.hero.raceKey || 0;
          if (raceKey > 0 && Array.isArray(session.cells)) {
            const mortalKind = RACE_MORTAL_ENEMIES[raceKey];
            const mortalAlive = session.cells.some(c =>
              c && !c.erased && c.enemy && c.enemy.hitPoints > 0 &&
              ((mortalKind > 0 && c.enemy.enemyKind === mortalKind) || c.enemy.isMortalEnemy)
            );
            if (mortalAlive) {
              emitAchievementProgressOnce(session, 40, 100);
            }
          }
          emitAchievementProgressOnce(session, 67, 100);
        }
        return { alive: false, revived: false };
      }
    }

    return { alive: true, revived: false };
  }

  /**
   * 전투 경로 전체 실행 및 결산 [D1 ~ D7, 교정 15.3, 교정 17.1~17.3]
   */
  function executeCombatPath(session, path, waypoints = [], options = {}) {
    const totalAttack = calculateTotalAttack(session, path, waypoints);
    const combatResults = [];
    let totalActualHpDamage = 0;
    let hasEnemy2 = false;
    let fireDamageSum = 0;
    const waypointSet = new Set(waypoints);
    const isDefer = Boolean(options && options.deferRewards);
    const activeBatch = (options && options.batch) ? options.batch : createCollectionBatch();

    // [D5] 연결 밖의 30번도 총공격으로 별도 한 번 공격
    // 30번(받아내기)은 다른 적의 피해를 대신 받아내므로, 다른 적의 피해 차단 여부 결정을 위해 먼저 타격한다 [교정 31.1, 31.2].
    const outer30Results = [];
    const outer30 = session.cells.filter(c =>
      c && !c.erased && c.enemy && c.enemy.enemyKind === 30 && c.enemy.hitPoints > 0 &&
      !path.some(p => p.x === c.x && p.y === c.y)
    );
    for (const c30 of outer30) {
      const res30 = applyAttackToEnemy(session, c30, DAMAGE_TYPE_NORMAL, totalAttack, false, {
        deferRewards: isDefer,
        batch: activeBatch
      });
      outer30Results.push({
        coord: { x: c30.x, y: c30.y },
        cell: c30,
        outer30: true,
        ...res30
      });
      if (res30.actualHpDamage) {
        totalActualHpDamage += res30.actualHpDamage;
      }
    }

    // 경로 순서대로 적 타격 및 수집 처리 [F1, 교정 15.3]
    for (let i = 0; i < path.length; i++) {
      if (waypointSet.has(i)) {
        // 경유 칸은 유효 연결 길이·공격·일반 수집에서 빼며 판에 남긴다 [교정 15.3]
        continue;
      }
      const coord = path[i];
      const cell = getCell(session, coord.x, coord.y);
      if (!cell) continue;

      // 불 붙은 칸 수집의 저장된 불 피해 합산 [D6]
      if (cell.firePower > 0) {
        fireDamageSum += cell.firePower;
        cell.firePower = 0;
        cell.fireCollected = true;
      }

      if (cell.kind === KIND_ENEMY || cell.kindCode === 1) {
        // [S00 / 0 공격줍기] "이번턴 직접연결로공격한각적에서 공격직전 코인토큰1개. 처치여부와무관,공통추가율·배가·메뉴 적용."
        if (session.hero && session.hero.activeNow && (session.hero.activeNow.skill0 || session.hero.activeNow.coinOnAttack)) {
          const extraRates = getExtraRates(session);
          const coinMult = (session.hero.activeNow.skill17 || session.hero.activeNow.doubleCoins || session.hero.activeNow.doubleGold) ? 2 : 1;
          applySingleToken(session, 'coins', coinMult, extraRates.coins);
        }

        // 적 2번 반사 여부 확인 [D6]
        if (cell.enemy && cell.enemy.enemyKind === 2) {
          hasEnemy2 = true;
        }

        const dType = determineDamageType(session, path, i, cell);
        const res = applyAttackToEnemy(session, cell, dType, totalAttack, true, {
          deferRewards: isDefer,
          batch: activeBatch
        });
        if (res.killed && i + 1 < path.length) {
          const nextCoord = path[i + 1];
          if (Math.abs(nextCoord.x - coord.x) > 1 || Math.abs(nextCoord.y - coord.y) > 1) {
            emitAchievementProgress(session, 56, 100);
          }
        }
        combatResults.push({
          coord,
          cell,
          ...res
        });
        if (res.actualHpDamage) {
          totalActualHpDamage += res.actualHpDamage;
        }
      } else if (cell.kind === KIND_SWORD || cell.kindCode === 4) {
        // 칼 칸은 확정 시 제거 예정 처리
        cell.erased = true;
        activeBatch.preErasedCells.add(cell);
        activeBatch.preErasedCells.add(cell.cellKey || cell);
      }
    }

    // 판 밖 30번 타격 결과 추가 (경로 결과 뒤에 유지)
    for (const r30 of outer30Results) {
      combatResults.push(r30);
    }

    // 경로에 실제 전투 적이 있는지 검사 (교정 16.1)
    let hasRealCombatEnemy = false;
    for (let i = 0; i < path.length; i++) {
      if (waypointSet.has(i)) continue;
      const c = getCell(session, path[i].x, path[i].y);
      if (c && (c.kind === KIND_ENEMY || c.kindCode === 1)) {
        if (!c.enemy || c.enemy.shellState !== 1) {
          hasRealCombatEnemy = true;
          break;
        }
      }
    }

    // [교정 16.1] 흡혈은 경로 총공격에 흡혈 정수 백분율을 곱해 100으로 나눈 뒤 소수 버림한 양을 한 번 회복한다.
    // 적 수·실제 체력 피해·방어·판밖30의 추가 피해 합을 사용하지 않는다. 최대체력까지만 회복한다.
    // 경로에 실제 전투 적이 없어 기본공격 가산 표식이 없으면 흡혈 회복도 0이다.
    let vampHeal = 0;
    const drainRate = session.hero.drainRate || 0;
    if (hasRealCombatEnemy && drainRate > 0 && totalAttack > 0) {
      vampHeal = Math.floor((totalAttack * drainRate) / 100);
    }

    let reflectedDamage = 0;
    let killHeal = 0;

    // [교정 26.5] deferHeroEffects가 참이면 체력 변경(스킬34 회복, 흡혈, 불, 반사)은 settlePath의 첫 낙하 뒤로 위임한다.
    const deferHeroEffects = Boolean(options && options.deferHeroEffects);

    if (!deferHeroEffects) {
      // 1) 흡혈 회복
      if (vampHeal > 0) {
        session.hero.life = Math.min(session.hero.lifeCap || 50, (session.hero.life || 0) + vampHeal);
      }

      // 2) 수집한 불의 직접 체력 차감 (방패 미사용)
      if (fireDamageSum > 0) {
        const rawAfterFire = (session.hero.life || 0) - fireDamageSum;
        session.hero.life = Math.max(0, rawAfterFire);
        if (rawAfterFire < 0) {
          emitAchievementProgress(session, 35, 100);
        }
      }

      // 3) 생존·부활 검사
      const survivalAfterFire = checkHeroSurvival(session);

      // 4) 반사 직접 체력 차감 (불에서 최종 사망하면 반사를 처리하지 않는다, 방패 미사용)
      if (survivalAfterFire.alive && hasEnemy2 && totalAttack > 0) {
        reflectedDamage = totalAttack;
        const rawAfterReflect = (session.hero.life || 0) - reflectedDamage;
        session.hero.life = Math.max(0, rawAfterReflect);
        if (rawAfterReflect < 0) {
          emitAchievementProgress(session, 34, 100);
        }
        // 5) 생존·부활 검사
        checkHeroSurvival(session);
      }

      // [S34 / 34 처치회복] 이번턴 공통공격 처치 적의 유효공격합만큼 최대체력까지 회복 [K0 S34, 교정 26.5]
      if (session.hero && session.hero.activeNow && (session.hero.activeNow.skill34 || session.hero.activeNow.healOnKill)) {
        let killedStrikeSum = 0;
        for (const cr of combatResults) {
          if (cr.killed && cr.cell && cr.cell.enemy) {
            killedStrikeSum += getEffectiveEnemyStrike(session, cr.cell);
          }
        }
        if (killedStrikeSum > 0) {
          const oldLife = session.hero.life || 0;
          session.hero.life = Math.min(session.hero.lifeCap || 50, oldLife + killedStrikeSum);
          killHeal = session.hero.life - oldLife;
        }
      }

      // 최종 생존 검사
      checkHeroSurvival(session);
    }

    return {
      totalAttack,
      combatResults,
      totalActualHpDamage,
      reflectedDamage,
      fireDamage: fireDamageSum,
      vampHeal,
      killHeal,
      hasEnemy2
    };
  }

  /**
   * 부작용 없는 경로 미리보기 (inspectPath) [C6, 교정 15.6, 15.7]
   * 상태와 난수를 일절 소비하지 않는다.
   * 경유를 제외한 총공격, 변환32 비전투, 판밖30 타격, 흡혈 예상량, 미수집 불 합계와 반사 1회량을 분리해 보여 준다.
   * 변환32를 처치예정으로 표시하지 않는다.
   * 종료된 판은 전투 예측을 거절한다.
   */
  function inspectPath(session, path) {
    if (!session || !Array.isArray(path) || path.length === 0 || session.phase === 'end') {
      return {
        valid: false,
        length: Array.isArray(path) ? path.length : 0,
        effectiveLength: 0,
        waypoints: [],
        canSettle: false,
        chainKind: 'none',
        candidates: [],
        combatPreview: null,
        killCount: 0
      };
    }

    const analysis = analyzePath(session, path);
    const valid = analysis.valid;
    const waypoints = analysis.waypoints;
    const effectiveLength = analysis.effectiveLength;
    const canSettle = isValidChain(session, path);
    const chainKind = analysis.lastNormalKind;

    // 현재 끝점에서 연결 가능한 주변 8방향 후보 칸들 수집
    const candidates = [];
    if (session.phase !== 'end') {
      for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
          if (canConnect(session, path, { x, y })) {
            candidates.push({ x, y });
          }
        }
      }
    }

    // 전투 미리보기 (상태·난수 미소비) [C6, 교정 15.6]
    let combatPreview = null;
    let killCount = 0;

    if (chainKind === 'combat' && session.phase !== 'end') {
      const waypointSet = new Set(waypoints);
      const totalAttack = calculateTotalAttack(session, path, waypoints);
      const enemyPreviews = [];
      let hasEnemy2 = false;
      let fireDamageSum = 0;

      for (let i = 0; i < path.length; i++) {
        if (waypointSet.has(i)) continue; // 경유 칸은 제외 [교정 15.3]
        const coord = path[i];
        const cell = getCell(session, coord.x, coord.y);
        if (!cell) continue;

        if (cell.firePower > 0 && !cell.fireCollected) {
          fireDamageSum += cell.firePower;
        }

        if (cell.kind === KIND_ENEMY || cell.kindCode === 1) {
          if (cell.enemy && cell.enemy.enemyKind === 2) {
            hasEnemy2 = true;
          }

          // 32번 변환 상태: 비전투이며 절대 처치예정으로 표시하지 않는다 [교정 15.6]
          if (cell.enemy && cell.enemy.shellState === 1) {
            enemyPreviews.push({
              coord,
              damageType: DAMAGE_TYPE_NONCOMBAT,
              effectiveAttack: 0,
              expectedHpDamage: 0,
              willKill: false
            });
            continue;
          }

          const damageType = determineDamageType(session, path, i, cell);
          let atk = totalAttack;
          if (damageType === DAMAGE_TYPE_VERTICAL) {
            atk += (session.hero.bladeStrike != null ? session.hero.bladeStrike : 2);
          } else if (damageType === DAMAGE_TYPE_BLOCKED) {
            atk = 0;
          }
          const guard = Math.max(0, (cell.enemy && cell.enemy.guard) || 0);
          const expectedHpDamage = Math.max(0, atk - guard);
          const currentHp = (cell.enemy && cell.enemy.hitPoints) || 0;
          const willKill = currentHp > 0 && expectedHpDamage >= currentHp;
          if (willKill) {
            killCount++;
          }

          enemyPreviews.push({
            coord,
            damageType,
            effectiveAttack: atk,
            expectedHpDamage,
            willKill
          });
        }
      }

      // 판밖 30번 적 타격 분리 표시 [D5, 교정 15.6]
      const outer30List = session.cells.filter(c =>
        c && !c.erased && c.enemy && c.enemy.enemyKind === 30 && c.enemy.hitPoints > 0 &&
        !path.some(p => p.x === c.x && p.y === c.y)
      );
      const outer30Previews = outer30List.map(c30 => {
        const guard30 = Math.max(0, c30.enemy.guard || 0);
        const expectedHpDamage30 = Math.max(0, totalAttack - guard30);
        const currentHp30 = c30.enemy.hitPoints || 0;
        return {
          coord: { x: c30.x, y: c30.y },
          damageType: DAMAGE_TYPE_NORMAL,
          effectiveAttack: totalAttack,
          expectedHpDamage: expectedHpDamage30,
          willKill: currentHp30 > 0 && expectedHpDamage30 >= currentHp30
        };
      });

      // 흡혈 예상량 [교정 15.6, 16.1]
      let vampHeal = 0;
      const drainRate = session.hero.drainRate || 0;
      const hasRealCombatEnemy = path.some((p, idx) => {
        if (waypointSet.has(idx)) return false;
        const c = getCell(session, p.x, p.y);
        return c && (c.kind === KIND_ENEMY || c.kindCode === 1) && (!c.enemy || c.enemy.shellState !== 1);
      });

      if (hasRealCombatEnemy && drainRate > 0 && totalAttack > 0) {
        vampHeal = Math.floor((totalAttack * drainRate) / 100);
      }

      combatPreview = {
        totalAttack,
        enemyPreviews,
        outer30Attack: (outer30List.length > 0 && totalAttack > 0) ? totalAttack : 0,
        outer30Previews,
        expectedVampHeal: vampHeal,
        vampHeal,
        uncollectedFireDamage: fireDamageSum,
        fireDamage: fireDamageSum,
        reflectedDamage: (hasEnemy2 && totalAttack > 0) ? totalAttack : 0,
        killCount
      };
    }

    return {
      valid,
      length: path.length,
      effectiveLength,
      waypoints,
      canSettle,
      chainKind,
      candidates,
      combatPreview,
      killCount
    };
  }

  // ==========================================
  // [E] 조각 3: 반격·방패·종료 처리 규칙
  // ==========================================

  /**
   * 적의 유효공격력 계산 [교정 16.3]
   * 종족1이고 독 첫 단계가 양수이며 원래 공격이 2 이상이면 정수절반, 그 외 원래 공격이다.
   * 뒤 독 단계만 양수인 경우 반감하지 않는다.
   * 반격뿐 아니라 적7 점화·13 훔침피해·16 아래피해·20 회복·31 찌르기·자해에도 같은 값을 사용한다.
   * 16 맨아래 피해는 유효공격의 2배다.
   */
  function getEffectiveEnemyStrike(session, cell) {
    if (!cell || !cell.enemy) return 0;
    const originalStrike = cell.enemy.strike != null ? cell.enemy.strike : 1;
    const isRace1 = session && session.hero && session.hero.raceKey === 1;
    const hasFirstStepPoison = Array.isArray(cell.enemy.poisonSteps)
      ? (cell.enemy.poisonSteps[0] > 0)
      : false;

    if (isRace1 && hasFirstStepPoison && originalStrike >= 2) {
      return Math.floor(originalStrike / 2);
    }
    return originalStrike;
  }

  /**
   * 새 보충 칸의 이번 반격 제외 표식 해제 [E1]
   */
  function clearRetaliationSkips(session) {
    if (!session || !Array.isArray(session.cells)) return;
    for (const cell of session.cells) {
      if (cell && cell.skipRetaliation) {
        cell.skipRetaliation = false;
      }
    }
  }

  /**
   * 반격 가능한 적 목록 및 유효 공격력 계산 [E1, 교정 16.3, 16.4]
   * 조건: 적 종류, 제거 예정 아님, 이번 반격 제외 표식 없음, 동결 아님, 유효 공격 > 0
   * 퍽 0의 첫 5회 입력(턴 0~4)에서는 적 반격을 건너뛴다.
   * 일반 반격의 합계는 감소 전 공격으로 먼저 고정한다. (blunt는 방패 단계에서 영구 차감)
   */
  function getRetaliatingEnemies(session) {
    if (!session || !session.hero || !Array.isArray(session.cells)) return [];

    // 퍽 0: 첫 5회 입력(턴 0~4)에서는 적 반격을 건너뛴다 [E1]
    if (session.tick < 5 && Array.isArray(session.hero.perks) && session.hero.perks.includes(0)) {
      return [];
    }

    const list = [];
    for (const cell of session.cells) {
      if (!cell || cell.erased) continue;
      const isEnemy = cell.kind === KIND_ENEMY || cell.kindCode === 1;
      if (!isEnemy || !cell.enemy) continue;

      // 32번 변환 상태는 공격력 0 및 비전투 [C4, I0 E32]
      if (cell.enemy.shellState === 1) continue;

      // 이번 반격 제외 표식 또는 동결 [E1]
      if (cell.skipRetaliation || cell.frozen) continue;

      // 감소 전 유효 공격력 고정 [교정 16.3, 16.4]
      const strike = getEffectiveEnemyStrike(session, cell);

      if (strike > 0) {
        list.push({
          cell,
          effectiveStrike: strike,
          enemyKind: cell.enemy.enemyKind || 0,
          isPoisonous: (cell.enemy.enemyKind === 9) || Boolean(cell.enemy.poisonAttack || cell.enemy.toxic)
        });
      }
    }

    return list;
  }

  /**
   * 반격 수치 사전 계산 (부작용 없음) [E1, E2, E3, 교정 16.4]
   */
  function calculateRetaliation(session) {
    const enemies = getRetaliatingEnemies(session);
    let totalAttack = 0;
    let poisonAttackSum = 0;

    for (const e of enemies) {
      totalAttack += e.effectiveStrike;
      if (e.isPoisonous) {
        poisonAttackSum += e.effectiveStrike;
      }
    }

    const currentShield = Math.max(0, (session.hero && session.hero.shield) || 0);
    const absorbed = Math.min(currentShield, totalAttack);
    const unabsorbed = totalAttack - absorbed;

    return {
      enemies,
      totalAttack,
      poisonAttackSum,
      absorbed,
      unabsorbed
    };
  }

  /**
   * 생존 21번 공격 증가 및 처치 카운터 정리 [E5, 교정 16.7]
   * 다른 적의 공통 공격 처치 수만큼 공격 증가
   */
  function updateEnemy21Growth(session) {
    if (!session || !Array.isArray(session.cells)) return;
    const kills = session.killLedger || 0;
    if (kills <= 0) return;

    for (const cell of session.cells) {
      if (cell && !cell.erased && cell.enemy && cell.enemy.enemyKind === 21 && cell.enemy.hitPoints > 0) {
        cell.enemy.strike = (cell.enemy.strike || 0) + kills;
      }
    }
    session.killLedger = 0;
  }

  /**
   * 반격 정산 처리 (resolveRetaliation / settleRetaliation) [E1 ~ E6, 교정 16.3 ~ 16.7]
   * - 자해 활성 시 일반 반격 대체 [교정 16.6]
   * - 일반 반격 합계는 감소 전 공격으로 먼저 고정 [교정 16.4]
   * - 방패 흡수 및 손상 [E2]
   * - 체력 차감, 독 갱신, 20번 회복 [E3, 교정 16.7]
   * - 방패 1 이상 시 공격감소·가시 실행 [교정 16.4, 16.5]
   * - 치명상 검사 [E6]
   */
  function resolveRetaliation(session, options = {}) {
    if (!session || !session.hero) {
      return { success: false, reason: 'no_session' };
    }
    if (session.phase === 'end') {
      return {
        success: false,
        reason: 'game_over',
        isGameOver: true,
        heroLife: session.hero.life || 0,
        session
      };
    }

    // 퍽 0: 첫 5회 입력(턴 0~4)에서는 적 반격을 건너뛴다 [E1, 교정 16.6]
    const isProtectedTurn = Boolean(
      session.tick < 5 && Array.isArray(session.hero.perks) && session.hero.perks.includes(0)
    );

    // 반격 후보 적 목록: 반격제외 표식 없는 살아있는 전투 적 (동결·공격0 포함) [교정 16.4, 16.5, 16.6]
    const candidateEnemies = [];
    if (Array.isArray(session.cells)) {
      for (const cell of session.cells) {
        if (!cell || cell.erased) continue;
        const isEnemy = cell.kind === KIND_ENEMY || cell.kindCode === 1;
        if (!isEnemy || !cell.enemy || cell.enemy.hitPoints <= 0 || cell.enemy.shellState === 1) continue;
        if (cell.skipRetaliation) continue;
        candidateEnemies.push(cell);
      }
    }

    // 자해 스킬 활성 여부 확인 [E4, 교정 16.6]
    const isSelfHarm = Boolean(
      session.hero.activeNow && (
        session.hero.activeNow.selfHarm ||
        session.hero.activeNow.counterattack ||
        session.hero.activeNow.skill4
      )
    );

    // 반격 가능한 적 목록 조회 (동결·공격0·반격제외 제외) [E1, 교정 16.3, 16.4, 교정 26.3]
    const retaliatingEnemies = getRetaliatingEnemies(session);

    // [교정 16.6, 교정 26.3] 첫 5턴 보호 또는 후보 적 0명이거나, 자해(스킬 4) 활성 상태에서 공격할 수 있는 적이 0명이면 반격 단계 자체를 건너뛴다.
    // 동결됐거나 공격력 0인 적만 후보로 남은 경우에도 자해가 일어나지 않는다.
    if (isProtectedTurn || candidateEnemies.length === 0 || (isSelfHarm && retaliatingEnemies.length === 0)) {
      return {
        success: true,
        retaliatingCount: 0,
        totalEnemyAttack: 0,
        poisonAttackSum: 0,
        absorbed: 0,
        unabsorbed: 0,
        shieldLoss: 0,
        selfHarm: isSelfHarm,
        isSelfHarm: isSelfHarm,
        selfHarmResults: [],
        thornsResults: [],
        heroLife: session.hero.life,
        heroShield: session.hero.shield,
        heroPoison: session.hero.poison || 0,
        isGameOver: session.phase === 'end',
        revived: false,
        session
      };
    }

    // 반격 대상 적 조회 (감소 전 공격으로 고정된 목록) [교정 16.4]
    const { enemies, totalAttack, poisonAttackSum, absorbed, unabsorbed } = calculateRetaliation(session);

    let shieldLoss = 0;
    let selfHarmResults = [];
    let thornsResults = [];

    if (isSelfHarm) {
      // [교정 16.6, 17.1, 17.3] 자해 활성은 일반 반격을 대체한다.
      // 반격제외 표식 없는 모든 적(동결·공격0 포함)이 자기 유효공격만큼 간접 공격을 받는다.
      // 방어를 차감하고 직접 부가효과는 없다.
      // 자해 분기에는 방패 손상·일반 반격의 독·20번 회복·공격감소·가시를 덧붙이지 않는다.
      const selfHarmBatch = createCollectionBatch();
      for (const cell of candidateEnemies) {
        const effectiveStrike = getEffectiveEnemyStrike(session, cell);
        const res = applyAttackToEnemy(session, cell, DAMAGE_TYPE_NORMAL, effectiveStrike, false, { batch: selfHarmBatch });
        selfHarmResults.push({ cell, effectiveStrike, ...res });
      }

      // 자해 스킬 1회성 소모
      if (session.hero.activeNow) {
        delete session.hero.activeNow.selfHarm;
        delete session.hero.activeNow.counterattack;
        delete session.hero.activeNow.skill4;
      }
    } else {
      // 일반 반격 처리
      const initialShield = Math.max(0, session.hero.shield || 0);

      if (totalAttack > 0) {
        // [E2] 방패 손상 판정
        // 특정 적(적 29 마모) 존재 시 막은 점수 전량 손상 (U01)
        const hasEnemy29 = session.cells.some(c =>
          c && !c.erased && c.enemy && c.enemy.enemyKind === 29 && (c.enemy.hitPoints == null || c.enemy.hitPoints > 0)
        );

        if (hasEnemy29) {
          const prevShield = session.hero.shield || 0;
          session.hero.shield = Math.max(0, prevShield - absorbed);
          shieldLoss = prevShield - session.hero.shield;
        } else {
          // 확률 손상: 막은 점수 각각 정수 0~100이 방패손상값보다 작으면 현재방패 1 손상 [교정 23.1]
          // 장비 합산 단계(recalculateHeroStats)에서 강화 감소분이 이미 반영된 방패손상 확률을 한 번 더 빼지 않고 그대로 쓴다.
          let odds = session.hero.shieldDamageOdds != null ? session.hero.shieldDamageOdds : 50;
          let durabilityBoost = 0;
          if (Array.isArray(session.gear)) {
            for (const g of session.gear) {
              if (g && Array.isArray(g.boosts) && g.boosts[14]) {
                durabilityBoost += g.boosts[14];
              }
            }
          }
          const appliedBoost14 = (session.hero.gearAppliedBoosts && session.hero.gearAppliedBoosts[14]) || 0;
          if (durabilityBoost > appliedBoost14 && odds === Math.max(5, 50 - appliedBoost14)) {
            odds = Math.max(5, 50 - durabilityBoost);
          }

          for (let i = 0; i < absorbed; i++) {
            if (session.hero.shield <= 0) break;
            const roll = drawInt(session.rng, 0, 100, 'shieldDamage');
            if (odds >= 100 || roll < odds) {
              session.hero.shield = Math.max(0, session.hero.shield - 1);
              shieldLoss++;
            }
          }
        }

        // [E2, E3] 미흡수 피해 체력 차감 (흡수량은 방패 손상 결과로 다시 줄이지 않는다)
        if (unabsorbed > 0) {
          session.hero.life = Math.max(0, session.hero.life - unabsorbed);

          // [E3] 플레이어 독: 기존 독량과 이번 독 적 공격합 중 큰 값 (합산하지 않음)
          if (poisonAttackSum > 0) {
            session.hero.poison = Math.max(session.hero.poison || 0, poisonAttackSum);
          }

          // [E3, 교정 16.3, 16.7] 생존 20번 적 회복: 공격이 실제 체력에 닿는 경로에서만 처리
          // 20의 일반 회복은 기존 회복기준까지만, 숙적20은 상한 없이 체력을 더한다.
          for (const c of session.cells) {
            if (c && !c.erased && c.enemy && c.enemy.enemyKind === 20 && c.enemy.hitPoints > 0) {
              const isMortal20 = (session.hero.raceKey === 7) || Boolean(c.enemy.isMortalEnemy);
              const strike20 = getEffectiveEnemyStrike(session, c);
              if (isMortal20) {
                c.enemy.hitPoints += strike20;
                c.enemy.recoveryLimit = Math.max(c.enemy.recoveryLimit || 0, c.enemy.hitPoints);
              } else {
                const limit = c.enemy.recoveryLimit || c.enemy.hitPoints;
                c.enemy.hitPoints = Math.min(limit, c.enemy.hitPoints + strike20);
              }
            }
          }
        }
      }

      // [교정 16.4, 16.5] 방패 단계에 들어갈 때 현재방패가 1 이상인 경우에만 공격감소·가시를 처리한다.
      // 방패 손상 뒤 0이 되어도 이미 진입한 효과는 실행한다.
      // 현재방패 0으로 반격에 들어간 경우 가시와 공격감소는 모두 없다.
      if (initialShield >= 1) {
        // [교정 16.4] 공격감소: 반격제외 표식 없는 모든 적(동결 포함)의 원래 공격이 2 이상일 때 장비 감소량을 영구 차감하고 최소 1로 한다.
        const blunt = session.hero.blunt || 0;
        if (blunt > 0) {
          for (const cell of candidateEnemies) {
            const origStrike = cell.enemy.strike != null ? cell.enemy.strike : 1;
            if (origStrike >= 2) {
              cell.enemy.strike = Math.max(1, origStrike - blunt);
            }
          }
        }

        // [교정 16.5, 17.1, 17.3] 가시: 방패 단계에서 공격감소 다음에, 반격제외 표식 없는 모든 적(동결·공격0 포함)을 장비 가시량으로 간접 공격한다.
        // 방어는 차감하며 직접공격 독·동결을 추가하지 않는다.
        const thorns = session.hero.thorns || 0;
        if (thorns > 0) {
          const thornsBatch = createCollectionBatch();
          for (const cell of candidateEnemies) {
            if (cell.enemy.hitPoints <= 0) continue;
            const tRes = applyAttackToEnemy(session, cell, DAMAGE_TYPE_NORMAL, thorns, false, { batch: thornsBatch });
            if (tRes.killed && cell.enemy && cell.enemy.enemyKind === 2) {
              emitAchievementProgress(session, 43, 100);
            }
            thornsResults.push({ cell, thorns, ...tRes });
          }
        }
      }
    }

    // [E6] 체력 변경 뒤 종료/부활 검사
    const survival = checkHeroSurvival(session);

    return {
      success: true,
      retaliatingCount: enemies.length,
      totalEnemyAttack: totalAttack,
      poisonAttackSum,
      absorbed,
      unabsorbed,
      shieldLoss,
      selfHarm: isSelfHarm,
      isSelfHarm: isSelfHarm,
      selfHarmResults,
      thornsResults,
      heroLife: session.hero.life,
      heroShield: session.hero.shield,
      heroPoison: session.hero.poison || 0,
      isGameOver: session.phase === 'end',
      revived: Boolean(survival && survival.revived),
      session
    };
  }

  // ==========================================
  // [F] 조각 4: 낙하·턴 끝·처리 중단 (한 턴의 전체 순서)
  // ==========================================

  /**
   * 범위 양끝 나눗셈 뒤 소수 버림 및 역순교환, 하한 적용 [H1, H5]
   */
  function getStatRange(baseVal, d1, d2, minLimit) {
    const r1 = Math.floor(baseVal / d1);
    const r2 = Math.floor(baseVal / d2);
    const rawMin = Math.min(r1, r2);
    const rawMax = Math.max(r1, r2);
    const clampedMin = Math.max(minLimit, rawMin);
    const clampedMax = Math.max(minLimit, rawMax);
    return { min: rawMin, max: rawMax, clampedMin, clampedMax, minLimit, raw1: r1, raw2: r2 };
  }

  /**
   * 적 생성 능력치 계산 [H1, H5, 교정 19.4]
   */
  function calculateEnemyStats(session) {
    const tick = (session && session.tick) || 0;
    const xp = (session && session.hero && session.hero.xp) || 0;
    const completedXp = (session && session.totals && session.totals.xp) || (session && session.hero && session.hero.completedXp) || 0;
    const mode = (session && session.mode) || 'normal';
    const difficulty = (session && session.difficulty != null) ? session.difficulty : 1;
    // [교정 19.4] 별도 점수모드는 선택한 난이도 값과 무관하게 난이도 1 곡선을 사용한다.
    const effectiveDiff = (mode === 'score') ? 1 : difficulty;
    const rng = session ? session.rng : null;

    // [H1, H5] L: 현재XP+완료XP를 100으로 나눈 정수. 100턴 모드는 XP총합을 먼저 4로 나누고 100으로 나눈 정수
    let L;
    if (mode === 'turn100') {
      L = Math.floor(Math.floor((xp + completedXp) / 4) / 100);
    } else {
      L = Math.floor((xp + completedXp) / 100);
    }

    let S = tick;
    if (mode === 'turn100') {
      S = tick;
    } else if (effectiveDiff === 0) {
      // [교정 19.4] 난이도 0은 완료턴수를 그대로 쓰며 레벨 40 초과 배율을 적용하지 않는다.
      S = tick;
    } else {
      const D = effectiveDiff === 1 ? 700 : (effectiveDiff === 2 ? 750 : 500);
      if (tick > 500) {
        S = Math.floor((tick * (D + tick - 500)) / D + 1e-9);
      } else {
        S = tick;
      }
      if (L > 40) {
        S = Math.floor((S * (60 + L - 40)) / 60 + 1e-9);
      }
    }

    let rangeAtk, rangeDef, rangeHp;
    if (mode === 'turn100') {
      // [H5] 100턴 모드: T/20~T/12 최소공격1, T/10~T/6 최소방어0, T/8~T/4 최소체력4
      rangeAtk = getStatRange(tick, 20, 12, 1);
      rangeDef = getStatRange(tick, 10, 6, 0);
      rangeHp = getStatRange(tick, 8, 4, 4);
    } else if (effectiveDiff === 0) {
      // [H1] 난이도 0: S/80~S/70 최소1, S/70~S/55 최소0, S/25~S/20 최소3
      rangeAtk = getStatRange(S, 80, 70, 1);
      rangeDef = getStatRange(S, 70, 55, 0);
      rangeHp = getStatRange(S, 25, 20, 3);
    } else if (effectiveDiff === 1) {
      // [H1] 난이도 1: S/65~S/55 최소1, S/50~S/40 최소0, S/20~S/15 최소4
      rangeAtk = getStatRange(S, 65, 55, 1);
      rangeDef = getStatRange(S, 50, 40, 0);
      rangeHp = getStatRange(S, 20, 15, 4);
    } else if (effectiveDiff === 2) {
      // [H1] 난이도 2: S/50~S/40 최소1, S/40~S/37 최소0, S/17~S/12 최소4
      rangeAtk = getStatRange(S, 50, 40, 1);
      rangeDef = getStatRange(S, 40, 37, 0);
      rangeHp = getStatRange(S, 17, 12, 4);
    } else {
      // [H1] 난이도 3: S/40~S/35 최소1, S/30~S/35 최소0 (역순교환), S/15~S/10 최소4
      rangeAtk = getStatRange(S, 40, 35, 1);
      rangeDef = getStatRange(S, 30, 35, 0);
      rangeHp = getStatRange(S, 15, 10, 4);
    }

    const minAtk = rangeAtk.min;
    const maxAtk = rangeAtk.max;
    const minDef = rangeDef.min;
    const maxDef = rangeDef.max;
    const minHp = rangeHp.min;
    const maxHp = rangeHp.max;

    // [교정 19.4] 적 기본 능력치의 최소하한(공격 1, 방어 0, 체력 3 또는 4)은 원래 범위로 추첨한 결과에 적용한다.
    const atk = Math.max(rangeAtk.minLimit, drawInt(rng, minAtk, maxAtk, 'enemyAtk'));
    const def = Math.max(rangeDef.minLimit, drawInt(rng, minDef, maxDef, 'enemyDef'));
    const hp = Math.max(rangeHp.minLimit, drawInt(rng, minHp, maxHp, 'enemyHp'));

    return {
      S,
      L,
      atk,
      def,
      hp,
      minAtk,
      maxAtk,
      minDef,
      maxDef,
      minHp,
      maxHp,
      rangeAtk,
      rangeDef,
      rangeHp,
      defRaw: [rangeDef.raw1, rangeDef.raw2]
    };
  }

  /**
   * 100턴 모드 승급 시점 판정 헬퍼 [H5, 교정 19.3]
   * 대기 초기·재설정값 200은 간격 판정에서 제외된다.
   * 대기가 200이 아닐 때 완료턴수−4가 0 이상이고 10의 배수이면(결함 8은 완료턴수−3이 0 이상이고 9의 배수) 승급 시점이 된다.
   */
  function isTurn100PromotionTiming(session) {
    if (!session || session.mode !== 'turn100') return false;
    if (session.promotionLeft === 0) return true;
    if (session.promotionLeft === 200) return false;
    const tick = session.tick || 0;
    const flaws = (session.hero && session.hero.flaws) || [];
    const hasFlaw8 = flaws.includes(8);
    return hasFlaw8
      ? ((tick - 3) >= 0 && (tick - 3) % 9 === 0)
      : ((tick - 4) >= 0 && (tick - 4) % 10 === 0);
  }

  /**
   * 승급 판정 및 다음 대기 계산 [H3, H4, H5, 교정 19.1, 19.2, 19.3]
   */
  function rollPromotion(session, S = 0, force = false, options = {}) {
    const rng = session ? session.rng : null;
    const mode = (session && session.mode) || 'normal';
    const tick = (session && session.tick) || 0;
    const flaws = (session && session.hero && session.hero.flaws) || [];
    const perks = (session && session.hero && session.hero.perks) || [];
    const preserveTimer = Boolean(force || (options && options.preserveTimer));

    // [H5, 교정 19.3] 100턴 모드: 타이머0이면 허용, 200이 아니면 T−4가 10의 배수인 시점에 0으로 바꾸어 승급 허용. 결함8은 T−3이 9의 배수.
    if (mode === 'turn100' && !preserveTimer) {
      if (isTurn100PromotionTiming(session)) {
        session.promotionLeft = 0;
      }
    }

    // [교정 19.1] 일반 보충의 자동승급은 새 적이 생성되는 순간 자동대기 0일 때만 일어난다(1은 승급하지 않는다).
    const isPromotion = force || (session && session.promotionLeft === 0);
    if (!isPromotion) {
      return { isPromoted: false, enemyKind: 0, isMortalEnemy: false };
    }

    let specialTag = 'specialEnemy';
    let mortalTag = 'mortalRoll';
    if (typeof rng === 'function' && !rng._isBuiltIn) {
      const fnStr = Function.prototype.toString.call(rng);
      if (fnStr.includes('promotionSpecialKind')) {
        specialTag = 'promotionSpecialKind';
      }
      if (fnStr.includes('mortalEnemyRoll')) {
        mortalTag = 'mortalEnemyRoll';
      }
    }

    let enemyKind = drawInt(rng, 1, 32, specialTag);
    let isMortal = false;

    // [H3] 비기본직업이면 정수 1~200이 10 이하일 때 숙적번호로 덮어쓴다. 퍽8이면 문턱 5. 숙적 0이라도 이 추첨을 생략하지 않는다.
    const classKey = (session.hero && session.hero.classKey) != null ? session.hero.classKey : 0;
    const isNonBasicClass = (classKey !== 0 && classKey !== 'adventurer');
    if (isNonBasicClass) {
      const threshold = perks.includes(8) ? 5 : 10;
      const roll = drawInt(rng, 1, 200, mortalTag);
      if (roll <= threshold) {
        const mortalMap = { 0: 0, 1: 9, 2: 14, 3: 13, 4: 16, 5: 12, 6: 5, 7: 20, 8: 8, 9: 19 };
        const raceKey = (session.hero && session.hero.raceKey) || 0;
        enemyKind = mortalMap[raceKey] != null ? mortalMap[raceKey] : 0;
        isMortal = true;
      }
    }

    // [교정 19.2]
    // - 스킬 23의 임의 일반 적 강제승급은 자동승급 대기 타이머를 바꾸지 않는다.
    // - 일반 보충의 자동승급에서 숙적 번호가 0으로 덮어써지면 일반 적이 되며 이 경로에서는 자동승급 대기를 재설정하지 않는다.
    if (preserveTimer || enemyKind === 0) {
      return {
        isPromoted: true,
        enemyKind,
        isMortalEnemy: isMortal,
        nextCooldown: session ? session.promotionLeft : 0
      };
    }

    // 승급 다음 대기 재설정 [H4, H5, 교정 27.3]
    const nextCooldown = resetPromotionCooldown(session, S);

    return { isPromoted: true, enemyKind, isMortalEnemy: isMortal, nextCooldown };
  }

  /**
   * 승급 다음 대기시간 재설정 [H4, H5, 교정 27.3]
   * 현재 난이도·모드 기준으로 다음 승급 대기시간을 계산하여 session.promotionLeft에 설정한다.
   */
  function resetPromotionCooldown(session, S = null) {
    if (!session) return 50;
    const rng = session.rng;
    const mode = session.mode || 'normal';
    const tick = session.tick || 0;
    const flaws = (session.hero && session.hero.flaws) || [];

    let nextCooldown;
    if (mode === 'turn100') {
      nextCooldown = 200;
    } else {
      if (S == null) {
        const stats = calculateEnemyStats(session);
        S = stats.S;
      }
      const difficulty = session.difficulty != null ? session.difficulty : 1;
      if (difficulty === 0) {
        // [H4] 난이도0은 200/√T~300/√T의 정수범위 추첨+5
        // 임시값: T 또는 S가 0인 강제승급은 분모를 1로 사용
        const denom = Math.sqrt(tick > 0 ? tick : 1);
        const low = Math.floor(200 / denom);
        const high = Math.floor(300 / denom);
        nextCooldown = drawInt(rng, low, high, 'promotionCooldown') + 5;
      } else if (difficulty === 1) {
        // [H4] 난이도1은 200/√S~300/√S
        const denom = Math.sqrt(S > 0 ? S : 1);
        const low = Math.floor(200 / denom);
        const high = Math.floor(300 / denom);
        nextCooldown = drawInt(rng, low, high, 'promotionCooldown');
      } else {
        // [H4] 난이도2·3은 150/√S~300/√S
        const denom = Math.sqrt(S > 0 ? S : 1);
        const low = Math.floor(150 / denom);
        const high = Math.floor(300 / denom);
        nextCooldown = drawInt(rng, low, high, 'promotionCooldown');
      }

      // [H4] 결함8이면 결과−1, 최소1
      if (flaws.includes(8)) {
        nextCooldown = Math.max(1, nextCooldown - 1);
      }
    }

    session.promotionLeft = nextCooldown;
    return nextCooldown;
  }

  /**
   * 특수 적 배율 적용 [H2, I0]
   */
  function applySpecialEnemyMultipliers(enemyKind, baseAtk, baseDef, baseHp, session) {
    let atk = baseAtk;
    let def = baseDef;
    let hp = baseHp;

    if (def === 0) def = 1; // 기본방어 0이면 먼저 1로 변환 [H2]

    switch (enemyKind) {
      case 1:  atk *= 3; def *= 3; hp *= 6; break;
      case 2:  atk *= 2; def *= 1; hp *= 3; break;
      case 3:  atk = 0;  def *= 6; hp *= 6; break;
      case 4:  atk *= 2; def *= 2; hp *= 4; break;
      case 5:  atk *= 2; def *= 10; hp = Math.floor(hp / 2); break;
      case 6:  atk *= 2; def *= 2; hp *= 4; break;
      case 7:  atk *= 2; def *= 2; hp *= 4; break;
      case 8:  atk *= 2; def *= 2; hp *= 4; break;
      case 9:  atk *= 1; def *= 2; hp *= 4; break;
      case 10: atk *= 1; def *= 2; hp *= 6; break;
      case 11: atk *= 2; def *= 2; hp *= 4; break;
      case 12: atk *= 2; def *= 2; hp *= 4; break;
      case 13: atk *= 2; def *= 2; hp *= 4; break;
      case 14: atk *= 2; def *= 2; hp *= 4; break;
      case 15: atk *= 2; def *= 2; hp *= 4; break;
      case 16: atk *= 3; def *= 2; hp *= 3; break;
      case 17:
        atk *= 2;
        def = (session && session.hero && session.hero.shield != null) ? session.hero.shield : def;
        hp *= 4;
        break;
      case 18: atk *= 2; def *= 2; hp *= 4; break;
      case 19: atk *= 4; def *= 1; hp *= 5; break;
      case 20: atk *= 2; def *= 2; hp *= 4; break;
      case 21: atk *= 2; def *= 2; hp *= 4; break;
      case 22: atk *= 2; def *= 2; hp *= 4; break;
      case 23: atk *= 2; def *= 2; hp *= 4; break;
      case 24: atk *= 2; def *= 2; hp *= 4; break;
      case 25: atk *= 2; def *= 2; hp *= 4; break;
      case 26: atk *= 2; def *= 2; hp *= 4; break;
      case 27: atk *= 2; def *= 4; hp *= 3; break;
      case 28: atk *= 2; def *= 2; hp *= 4; break;
      case 29: atk *= 2; def *= 2; hp *= 4; break;
      case 30: atk = Math.floor(atk / 2); def *= 1; hp *= 5; break;
      case 31: atk *= 2; def *= 2; hp *= 4; break;
      case 32: atk *= 2; def *= 2; hp *= 4; break;
      default: atk *= 2; def *= 2; hp *= 4; break;
    }

    return { atk, def, hp };
  }

  /**
   * 새 적 생성 데이터 [H1 ~ H4, 교정 19.1, 19.2, 19.6]
   */
  function createEnemyData(session, overrideKind = null, forcePromote = false, options = {}) {
    const { S, atk: bAtk, def: bDef, hp: bHp } = calculateEnemyStats(session);

    let enemyKind = 0;
    let isMortal = false;

    if (overrideKind != null) {
      enemyKind = overrideKind;
    } else {
      const promo = rollPromotion(session, S, forcePromote, options);
      if (promo.isPromoted) {
        enemyKind = promo.enemyKind || 0;
        isMortal = Boolean(promo.isMortalEnemy);
      }
    }

    let finalAtk = bAtk;
    let finalDef = bDef;
    let finalHp = bHp;

    if (enemyKind > 0) {
      const mult = applySpecialEnemyMultipliers(enemyKind, bAtk, bDef, bHp, session);
      finalAtk = mult.atk;
      finalDef = mult.def;
      finalHp = mult.hp;

      // 특수 적만 결함 9: 체력 * 1.05 버림 [H2]
      if (session && session.hero && session.hero.flaws && session.hero.flaws.includes(9)) {
        finalHp = Math.floor(finalHp * 1.05);
      }
    } else {
      // 일반 적만 결함 3: 체력 +1 [H2]
      if (session && session.hero && session.hero.flaws && session.hero.flaws.includes(3)) {
        finalHp += 1;
      }
    }

    // 종족 6 숙적 5 생존 시 새 적 최종방어 2배 [H2]
    const hasEnemy5 = session && session.cells && session.cells.some(c =>
      !c.erased && c.enemy && c.enemy.enemyKind === 5 && c.enemy.hitPoints > 0
    );
    if (hasEnemy5 && session.hero && session.hero.raceKey === 6) {
      finalDef *= 2;
    }

    // 신규 체력 1 활성 (스킬 22) [H2, 교정 19.6, 교정 32.2, 교정 32.3]
    // 스킬 32 등 지정변환(options.ignoreSkill22), 스킬 23 강제 승급, 특수 적 32 재생에서는 체력 1을 적용하지 않는다.
    let currentHp = finalHp;
    const ignoreSkill22 = Boolean(options && (options.ignoreSkill22 || options.isSkill23 || options.is32Regen));
    if (!ignoreSkill22 && session && session.hero && session.hero.activeNow && (session.hero.activeNow.trap || session.hero.activeNow.skill22 || session.hero.activeNow.weakEnemySpawn)) {
      currentHp = 1;
      if (enemyKind > 0) {
        emitAchievementProgress(session, 62, 100);
      }
    }

    // 종족 5 숙적으로 새 12번 등장 시 현재방패 0 [I0 E12, 교정 27.4, 교정 32.2]
    // 일반 보충 경로에서만 적용한다. 스킬 32(코인→적 지정 변환), 특수 적 32 재생, 스킬 23 강제 승급에서는 적용하지 않는다.
    const isExcludedFromShieldZero = Boolean(options && (options.isSkill32 || options.is32Regen || options.isSkill23 || options.ignoreSkill22));
    if (!isExcludedFromShieldZero && enemyKind === 12 && session && session.hero && (session.hero.raceKey === 5 || isMortal)) {
      session.hero.shield = 0;
    }

    let countLeft = 0;
    if (enemyKind === 3 || enemyKind === 10 || enemyKind === 19 || enemyKind === 28) {
      countLeft = 5;
    }

    return {
      enemyKind,
      hitPoints: currentHp,
      recoveryLimit: finalHp,
      strike: finalAtk,
      guard: finalDef,
      poisonSteps: [0, 0, 0],
      countLeft,
      shellState: 0,
      revivalDelay: false,
      isMortalEnemy: isMortal
    };
  }

  /**
   * 임의 일반 적 승급 처리 (스킬 23 등) [H3, 교정 19.2, 교정 32.2]
   * 스킬 23의 임의 일반 적 강제승급은 현재 턴·난이도로 새 능력치 생성과 특수 적·숙적 덮어쓰기를 하지만 자동승급 대기 타이머는 바꾸지 않는다.
   * [교정 32.2] 스킬 23 강제 승급 결과에는 스킬 22 체력 1과 숙적 12 방패 0을 적용하지 않는다.
   * 결과 31번 적의 열 맨 아래 이동은 유지한다.
   */
  function promoteNormalEnemy(session, cell) {
    if (!session || !cell) return null;
    const newEnemyData = createEnemyData(session, null, true, { preserveTimer: true, ignoreSkill22: true, isSkill23: true });
    cell.kind = KIND_ENEMY;
    cell.kindCode = 1;
    cell.enemy = newEnemyData;
    if (newEnemyData && newEnemyData.enemyKind === 31) {
      handleEnemy31Spawn(session, cell);
    }
    if (newEnemyData && newEnemyData.enemyKind > 0) {
      checkSpecialCountAchievement41(session);
    }
    return newEnemyData;
  }

  /**
   * 31번 적 생성 즉시 같은 열 맨 아래와 교환 [I0 E31]
   */
  function handleEnemy31Spawn(session, cell31) {
    if (!session || !cell31 || !cell31.enemy || cell31.enemy.enemyKind !== 31) return;
    const bottomY = (BOARD_HEIGHT || 6) - 1;
    if (cell31.y < bottomY) {
      const bottomCell = getCell(session, cell31.x, bottomY);
      if (bottomCell && bottomCell !== cell31) {
        const ty = cell31.y;
        cell31.y = bottomCell.y;
        bottomCell.y = ty;
      }
    }
  }

  /**
   * 보충/재추첨 단일 칸 종류 추첨 및 변형·적 생성 공통 규칙 [교정 19.3, 19.5, 교정 24.4]
   */
  function drawRefillCellCode(session, options = {}) {
    const rng = session ? session.rng : null;
    const roomReplaceMode = (options && options.roomReplaceMode) || null;
    const isCoinForceSuppressed = Boolean(
      roomReplaceMode ||
      (options && options.suppressCoinForce) ||
      (session && session.suppressCoinForce) ||
      (session && session.hero && session.hero.activeNow && session.hero.activeNow.suppressCoinForce)
    );

    let code = drawInt(rng, 0, 4, 'cellKind');

    // 1) 방교체·억제 플래그가 없을 때만 스킬 24 코인 강제
    if (!isCoinForceSuppressed && session && session.hero && session.hero.activeNow && (session.hero.activeNow.allCoin || session.hero.activeNow.skill24)) {
      code = 2;
    }

    // 2) 100턴 승급 시점 적 강제 [교정 19.3]
    if (isTurn100PromotionTiming(session)) {
      session.promotionLeft = 0;
      code = 1;
    }

    // 3) 방교체의 금지 종류 재추첨 [교정 18.3, 19.3, 19.5, 교정 27.2]
    // 16회 제한과 강제 대체를 없애고, 허용되는 종류가 나올 때까지 다시 뽑는다.
    if (roomReplaceMode === 'normal19') {
      while (code === 1) {
        code = drawInt(rng, 0, 4, 'cellKind');
      }
    } else if (roomReplaceMode === 'mortal19') {
      while (code === 4) {
        code = drawInt(rng, 0, 4, 'cellKind');
      }
    }

    return code;
  }

  function populateRefillCell(session, targetCell, options = {}) {
    if (!session || !targetCell) return { spawnedPromotedSpecial: false, isEnemy31: false };
    const rng = session.rng;
    const perks = (session.hero && session.hero.perks) || [];
    const flaws = (session.hero && session.hero.flaws) || [];
    const code = drawRefillCellCode(session, options);

    morphCellKind(targetCell, code);
    if (options.skipRetaliation !== false) {
      targetCell.skipRetaliation = true; // 새 보충 칸 반격 제외 표식 [E1]
    }
    if (options.markAbilityUsed) {
      targetCell.abilityUsed = true;
    }

    let spawnedPromotedSpecial = false;
    let isEnemy31 = false;

    // [C2] 변형 칸 생성
    if (targetCell.kind === KIND_POTION && perks.includes(1)) {
      const roll = drawInt(rng, 1, 100, 'potionForm');
      if (roll < 6) targetCell.potionForm = 'charge';
    } else if (targetCell.kind === KIND_SWORD && perks.includes(6)) {
      const roll = drawInt(rng, 1, 100, 'arrow');
      if (roll < 6) targetCell.arrow = true;
    } else if (targetCell.kind === KIND_SHIELD && flaws.includes(7)) {
      const roll = drawInt(rng, 1, 100, 'broken');
      if (roll < 4) targetCell.broken = true;
    } else if (targetCell.kind === KIND_ENEMY) {
      targetCell.enemy = createEnemyData(session);
      if (targetCell.enemy && targetCell.enemy.enemyKind > 0) {
        spawnedPromotedSpecial = true;
        if (targetCell.enemy.enemyKind === 31) {
          isEnemy31 = true;
        }
      }
    }

    return { spawnedPromotedSpecial, isEnemy31 };
  }

  /**
   * 낙하 및 보충 [F2, F8, 교정 18.3, 교정 19.3, 교정 19.5, 교정 24.4, 교정 27.1]
   * 열 안 생존 칸 상대 순서를 보존하며 아래 빈자리로 내리고 위쪽 빈자리를 보충한다.
   * 새 숙적 5가 생기면 그 즉시 판에 반영해 이어서 생성되는 다른 적의 방어 2배 검사에 보이게 한다.
   * 모든 열의 생성이 끝난 뒤에 판을 갈아 끼우지 않는다.
   */
  function applyDropAndRefill(session, isFirstDrop = true, options = {}) {
    if (!session || !Array.isArray(session.cells)) return;

    const BOARD_W = BOARD_WIDTH || 6;
    const BOARD_H = BOARD_HEIGHT || 6;
    const roomReplaceMode = (options && options.roomReplaceMode) || null;
    const markAbilityUsed = Boolean(options && options.markAbilityUsed);
    const suppressCoinForce = Boolean(options && options.suppressCoinForce);

    let spawnedPromotedSpecial = false;

    // 1) 생존 칸들의 y 좌표를 아래로 밀착하고 지워진 칸을 판에서 즉시 제거 [교정 27.1]
    const survivingCells = [];
    const emptyCounts = new Array(BOARD_W).fill(0);

    for (let x = 0; x < BOARD_W; x++) {
      const alive = [];
      for (let y = 0; y < BOARD_H; y++) {
        const cell = getCell(session, x, y);
        if (cell && !cell.erased) {
          alive.push(cell);
        }
      }

      const aliveCount = alive.length;
      const emptyCount = BOARD_H - aliveCount;
      emptyCounts[x] = emptyCount;

      for (let i = 0; i < aliveCount; i++) {
        const oldY = alive[i].y;
        const newY = emptyCount + i;
        alive[i].y = newY;

        // 31번 적 낙하 찌르기: 실제로 아래로 떨어진 이동마다 유효공격만큼 직접체력피해 [I0 E31, 교정 16.3, 교정 18.7]
        if (newY > oldY && alive[i].enemy && alive[i].enemy.enemyKind === 31 && alive[i].enemy.hitPoints > 0) {
          const strike = getEffectiveEnemyStrike(session, alive[i]);
          if (strike > 0 && session.hero) {
            session.hero.life = Math.max(0, (session.hero.life || 0) - strike);
            checkHeroSurvival(session);
          }
        }

        survivingCells.push(alive[i]);
      }
    }

    // 판을 생존 칸들로 즉시 반영하여 보충 중 생성되는 칸들이 판에 즉시 더해지도록 함 [교정 27.1]
    session.cells = survivingCells;

    // 2) 위쪽 빈자리 보충: 위쪽 칸(y=0)부터 차례대로 생성하며 생성 즉시 판에 반영 [교정 27.1]
    for (let x = 0; x < BOARD_W; x++) {
      const emptyCount = emptyCounts[x];
      for (let y = 0; y < emptyCount; y++) {
        const cellKey = `c_${x}_${y}_${session.tick}_${Math.random().toString(36).slice(2, 7)}`;
        const newCell = createCell(x, y, 0, cellKey);
        // 즉시 판에 반영하여 다음 칸 생성 시 숙적 5 등이 보이게 한다 [교정 27.1]
        session.cells.push(newCell);

        const popRes = populateRefillCell(session, newCell, {
          roomReplaceMode,
          suppressCoinForce,
          markAbilityUsed,
          skipRetaliation: true
        });
        if (popRes.spawnedPromotedSpecial) {
          spawnedPromotedSpecial = true;
        }

        if (isFirstDrop) {
          session._turnSpawnCount = (session._turnSpawnCount || 0) + 1;
          if (newCell.kind === KIND_ENEMY || newCell.kindCode === 1) {
            session._turnEnemySpawnCount = (session._turnEnemySpawnCount || 0) + 1;
          }
        }
      }
    }

    if (spawnedPromotedSpecial) {
      checkSpecialCountAchievement41(session);
    }

    // 31번 적 생성 즉시 같은 열 맨 아래와 교환 [I0 E31]
    for (const c of session.cells) {
      if (c && !c.erased && c.enemy && c.enemy.enemyKind === 31 && c.skipRetaliation) {
        handleEnemy31Spawn(session, c);
      }
    }
  }

  /**
   * 7단계: 불/얼음 순회 처리 [F5, 교정 17.1, 17.3]
   * x0→5, 각 x에서 y0→5로 칸을 순회한다. 얼어 있으면 해동만 한다.
   * 얼지 않았고 불이 있으면 적의 체력에서 저장 불피해를 직접 빼고, 죽으면 공통 처치 처리한 뒤 불을 끈다.
   */
  function processFireAndFreeze(session) {
    if (!session || !Array.isArray(session.cells)) return;
    const fireBatch = createCollectionBatch();

    for (let x = 0; x < BOARD_WIDTH; x++) {
      for (let y = 0; y < BOARD_HEIGHT; y++) {
        const cell = getCell(session, x, y);
        if (!cell || cell.erased) continue;

        if (cell.frozen) {
          // 얼어 있으면 해동만 한다 [F5]
          cell.frozen = false;
        } else if (cell.firePower > 0) {
          // 얼지 않았고 불이 있으면 적의 체력에서 저장 불피해를 직접 뺀다 [F5]
          if (cell.enemy && cell.enemy.hitPoints > 0) {
            cell.enemy.hitPoints -= cell.firePower;
            if (cell.enemy.hitPoints <= 0) {
              if (cell.enemy.enemyKind === 32 && cell.enemy.shellState === 0) {
                cell.enemy.shellState = 1;
                cell.enemy.hitPoints = 1;
                // [교정 24.1] 기존 recoveryLimit를 유지한다.
                cell.enemy.strike = 0;
                cell.enemy.guard = 0;
                cell.enemy.poisonSteps = [0, 0, 0];
                cell.enemy.revivalDelay = true;
                cell.erased = false;
              } else {
                cell.enemy.hitPoints = 0;
                cell.erased = true;
                // [교정 31.1] 턴 끝 불 처치는 실제 공격 처치가 아니므로 killLedger에 세지 않는다
                rewardKillEnemy(session, cell, fireBatch, { allowPreErased: true, skipClassReward: true });
                if (session.hero && session.hero.raceKey === 8) {
                  emitAchievementProgress(session, 54, 2);
                }
              }
            }
          }
          // 불을 끈다 (임시값: 꺼진 불의 저장피해는 0으로 초기화) [F5]
          cell.firePower = 0;
        }
      }
    }
  }

  /**
   * 8~9단계: 회복, 플레이어 독, 적 독 3단계 [F6, 교정 17.1, 17.3, 17.4]
   * 8단계: 플레이어 턴회복을 최대체력까지 더한 다음 플레이어 독량만큼 체력 차감, 종료 검사.
   * 9단계: 각 적의 현재 독단계를 피해로 사용하고 나머지 두 단계를 앞으로 옮기고 마지막을 0으로 만든다.
   * 독으로 체력이 0 이하가 되면 32도 변환 없이 보상처치한다 [교정 17.4].
   */
  function processRegenAndPoison(session) {
    if (!session || !session.hero) return;

    // 8단계: 플레이어 턴회복 후 독 차감
    const regen = session.hero.regen || 0;
    if (regen > 0) {
      session.hero.life = Math.min(session.hero.lifeCap || 50, session.hero.life + regen);
    }
    const heroPoison = session.hero.poison || 0;
    if (heroPoison > 0) {
      const rawAfterPoison = session.hero.life - heroPoison;
      session.hero.life = Math.max(0, rawAfterPoison);
      if (rawAfterPoison < 0) {
        emitAchievementProgress(session, 36, 100);
      }
    }
    checkHeroSurvival(session);
    if (session.phase === 'end') return;

    // 9단계: 적 독 3단계 [F6, 교정 17.4, 교정 23.2]
    const poisonBatch = createCollectionBatch();
    for (const cell of session.cells) {
      if (!cell || cell.erased || !cell.enemy || cell.enemy.hitPoints <= 0) continue;

      if (Array.isArray(cell.enemy.poisonSteps)) {
        const dmg = cell.enemy.poisonSteps[0] || 0;
        cell.enemy.poisonSteps[0] = cell.enemy.poisonSteps[1] || 0;
        cell.enemy.poisonSteps[1] = cell.enemy.poisonSteps[2] || 0;
        cell.enemy.poisonSteps[2] = 0;

        if (dmg > 0) {
          cell.enemy.hitPoints -= dmg;
          if (cell.enemy.hitPoints <= 0) {
            // [교정 17.4] 독으로 체력이 0 이하가 되면 32도 변환 없이 보상처치한다.
            // [교정 31.1] 턴 끝 독 처치는 실제 공격 처치가 아니므로 killLedger에 세지 않는다.
            cell.enemy.hitPoints = 0;
            cell.erased = true;
            rewardKillEnemy(session, cell, poisonBatch, { allowPreErased: true, skipClassReward: true });
            if (session.hero && session.hero.raceKey === 1) {
              emitAchievementProgress(session, 47, 2);
            }
          }
        }
      }
    }
  }

  /**
   * 적 8 처치 시 해동 없음 [I0 E08, J3, 교정 18.1]
   * 8번을 처치해도 얼린 칸을 즉시 해동하지 않는다.
   * 스킬 동결과 8번 동결은 모두 기존 턴끝 해동 단계(processFireAndFreeze)에서만 풀린다.
   * 이전 조각 함수 이름 호환을 위해 함수 정의는 유지하되 즉시 해동을 수행하지 않는다.
   */
  function unfreezeByEnemy8(session, enemyCell) {
    // [교정 18.1] 소속별 처치 해동 임시 규칙 삭제 (턴끝 해동 단계에서만 해동)
    return;
  }

  /**
   * 적 10 처치/자폭 시 주변 8칸 폭발 처리 [I0 E10, J3, 교정 17.1, 17.7]
   * 주변 8칸의 일반 적·비적을 보상과 함께 수집하고, 특수 적과 폭발 물약은 제외한다.
   */
  function triggerEnemy10Explosion(session, enemyCell, batchOrOptions = null) {
    if (!session || !enemyCell) return;
    const isDefer = Boolean(batchOrOptions && batchOrOptions.deferRewards);
    const activeBatch = (batchOrOptions && batchOrOptions.counters)
      ? batchOrOptions
      : (batchOrOptions && batchOrOptions.batch ? batchOrOptions.batch : createCollectionBatch());

    const bx = enemyCell.x;
    const by = enemyCell.y;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = bx + dx;
        const ny = by + dy;
        if (nx >= 0 && nx < BOARD_WIDTH && ny >= 0 && ny < BOARD_HEIGHT) {
          const neighbor = getCell(session, nx, ny);
          if (!neighbor || neighbor.erased) continue;
          const nId = neighbor.cellKey || neighbor;
          if (activeBatch.processedCells.has(neighbor) || activeBatch.processedCells.has(nId)) continue;
          if (activeBatch.preErasedCells && (activeBatch.preErasedCells.has(neighbor) || activeBatch.preErasedCells.has(nId))) continue;

          // 특수 적과 폭발 물약은 제외한다 [교정 17.7]
          if (neighbor.enemy && neighbor.enemy.enemyKind > 0) {
            continue;
          }
          if ((neighbor.kind === KIND_POTION || neighbor.kindCode === 0) && neighbor.potionForm === 'bomb') {
            continue;
          }

          if (isDefer) {
            neighbor.erased = true;
            if (neighbor.kind === KIND_ENEMY || neighbor.kindCode === 1) {
              if (neighbor.enemy) neighbor.enemy.hitPoints = 0;
              // [교정 31.1] 10번 폭발 연쇄 처치는 실제 공격 처치가 아니므로 killLedger에 세지 않는다
            }
            activeBatch.preErasedCells.add(neighbor);
            activeBatch.preErasedCells.add(nId);
            activeBatch.deferredExplosionCells.push(neighbor);
          } else {
            collectCellInBatch(session, neighbor, activeBatch);
          }
        }
      }
    }
  }

  /**
   * 10~11단계: 능력 표식 초기화 및 특수 적 능력 실행 [F7, I0, 교정 17.3, 17.7]
   */
  function processEnemyAbilities(session) {
    if (!session || !Array.isArray(session.cells)) return;

    const isRace7 = session.hero && session.hero.raceKey === 7;
    const race7Batch = createCollectionBatch();

    // 10단계: 적 능력 실행 표식 초기화 및 종족 7 처리
    for (const cell of session.cells) {
      if (!cell || cell.erased) continue;
      cell.abilityUsed = false;

      // 종족 7: 현재체력 < 방어인 일반 적 보상과 함께 제거 [F7, 교정 17.3, 교정 21.2]
      if (isRace7 && cell.enemy && cell.enemy.enemyKind === 0 && cell.enemy.hitPoints > 0) {
        const guard = cell.enemy.guard || 0;
        if (cell.enemy.hitPoints < guard) {
          cell.erased = true;
          cell.enemy.hitPoints = 0;
          rewardKillEnemy(session, cell, race7Batch, { allowPreErased: true });
          emitAchievementProgress(session, 53, 2);
        }
      }
    }

    // 11단계: 살아 있고 제거 예정 아닌 특수 적 능력 순서대로 실행 [F7, I0]
    for (let x = 0; x < BOARD_WIDTH; x++) {
      for (let y = 0; y < BOARD_HEIGHT; y++) {
        const cell = getCell(session, x, y);
        if (!cell || cell.erased || !cell.enemy || cell.enemy.hitPoints <= 0) continue;
        if (cell.abilityUsed) continue;

        const eKind = cell.enemy.enemyKind || 0;
        if (eKind === 0) continue;

        cell.abilityUsed = true;

        if (eKind === 1) {
          // E01 / 1 (큰몸): 턴능력 별도 분기 없음. 공통 배율·공격·보상 적용.
        } else if (eKind === 2) {
          // E02 / 2 (되비침): 연결 시 총공격 한 번을 플레이어 체력에 직접 반사 (전투 결산에서 처리).
        } else if (eKind === 3) {
          // E03 / 3 (달아남): 초기카운트5. 능력 때−1, 0이면 무보상 이탈. 처치하면 코인만 15~25토큰.
          cell.enemy.countLeft = Math.max(0, (cell.enemy.countLeft || 5) - 1);
          if (cell.enemy.countLeft === 0) {
            cell.erased = true;
          }
        } else if (eKind === 4) {
          // E04 / 4 (돕기): 제거 예정이 아닌 적 전체에서 자신만 빼고 다친 적 최대 2명 치유, 다친 적이 없으면 다른 적 최대 2명 공격+1 [교정 24.1].
          const otherEnemies = [];
          for (const c of session.cells) {
            if (!c || c.erased || c === cell) continue;
            if ((c.kind === KIND_ENEMY || c.kindCode === 1) && c.enemy && c.enemy.hitPoints > 0) {
              otherEnemies.push(c);
            }
          }
          const wounded = otherEnemies.filter(c => c.enemy.hitPoints < (c.enemy.recoveryLimit || c.enemy.hitPoints));
          if (wounded.length > 0) {
            const targets = pickRandomUpToN(session.rng, wounded, 2, 'enemy4HealTarget');
            for (const t of targets) {
              t.enemy.hitPoints = t.enemy.recoveryLimit || t.enemy.hitPoints;
            }
          } else if (otherEnemies.length > 0) {
            const targets = pickRandomUpToN(session.rng, otherEnemies, 2, 'enemy4BuffTarget');
            for (const t of targets) {
              t.enemy.strike = (t.enemy.strike || 0) + 1;
            }
          }
        } else if (eKind === 5) {
          // E05 / 5 (두꺼운막): 배율 2·10·체력정수절반. 수동효과 미판독은 추가하지 않음. 종족6 숙적이면 존재 중 새 적 방어2배.
        } else if (eKind === 6) {
          // E06 / 6 (시큼바꾸기): 산성·충전·폭발이 모두 없는 정상 물약 1개 무작위 산성화. 없으면 없음.
          const normalPotions = [];
          for (const c of session.cells) {
            if (!c || c.erased) continue;
            if ((c.kind === KIND_POTION || c.kindCode === 0) && (!c.potionForm || c.potionForm === 'normal')) {
              normalPotions.push(c);
            }
          }
          if (normalPotions.length > 0) {
            const targets = pickRandomUpToN(session.rng, normalPotions, 1, 'enemy6AcidTarget');
            if (targets.length > 0 && targets[0]) {
              targets[0].potionForm = 'acid';
            }
          }
        } else if (eKind === 7) {
          // E07 / 7 (불씨): 주변 8칸에서 제거 예정과 같은 7번을 제외하고 자기 유효공격을 불피해로 저장, 중복 불은 합산 [교정 16.3].
          // 임시 후보: 그 외 전부. 동결은 점화로 해제.
          const strike = getEffectiveEnemyStrike(session, cell);
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              if (dx === 0 && dy === 0) continue;
              const nx = cell.x + dx;
              const ny = cell.y + dy;
              if (nx >= 0 && nx < BOARD_WIDTH && ny >= 0 && ny < BOARD_HEIGHT) {
                const neighbor = getCell(session, nx, ny);
                if (!neighbor || neighbor.erased) continue;
                if (neighbor.enemy && neighbor.enemy.enemyKind === 7) continue;
                neighbor.firePower = (neighbor.firePower || 0) + strike;
                if (neighbor.frozen) {
                  neighbor.frozen = false;
                }
              }
            }
          }
        } else if (eKind === 8) {
          // E08 / 8 (서리): 제거 예정·기존 동결·특수 적을 제외하고 무작위 최대 2칸 동결 [I0 E08, 교정 18.1].
          // 8번을 처치해도 얼린 칸을 즉시 해동하지 않으며, 스킬 동결과 8번 동결 모두 기존 턴끝 해동 단계에서만 풀린다.
          const freezeCandidates = [];
          for (const c of session.cells) {
            if (!c || c.erased || c.frozen) continue;
            if (c.enemy && c.enemy.enemyKind > 0) continue;
            freezeCandidates.push(c);
          }
          if (freezeCandidates.length > 0) {
            const targets = pickRandomUpToN(session.rng, freezeCandidates, 2, 'enemy8FreezeTarget');
            for (const t of targets) {
              t.frozen = true;
            }
          }
        } else if (eKind === 9) {
          // E09 / 9 (독침): 반격이 체력에 닿으면 이번 9번 공격합과 기존 독 중 큰 값으로 플레이어독 갱신. 장비 독은 면역.
        } else if (eKind === 10) {
          // E10 / 10 (터짐): 초기5→실행마다−1. 0이면 주변8칸 범위 수집을 먼저 실행하되 자기 특수 보상은 0이고, 수집·연쇄가 끝난 뒤의 현재체력 정수절반, 최소1 [I0 E10, 교정 17.7, 교정 24.2].
          cell.enemy.countLeft = Math.max(0, (cell.enemy.countLeft || 5) - 1);
          if (cell.enemy.countLeft === 0) {
            cell.erased = true;
            cell.enemy.hitPoints = 0;
            const explosionBatch = createCollectionBatch();
            explosionBatch.processedCells.add(cell);
            explosionBatch.processedCells.add(cell.cellKey || cell);
            triggerEnemy10Explosion(session, cell, explosionBatch);
            session.hero.life = Math.max(1, Math.floor((session.hero.life || 0) / 2));
          }
        } else if (eKind === 11) {
          // E11 / 11 (칼바꾸기): 일반·화살·마법·파손을 포함한 모든 미제거 칼 중 1개를 무작위로 적 변환 [I0 E11, 교정 18.2, 교정 24.3].
          // 지정 변환에서는 31번 적 생성 처리를 부르지 않는다(변환 뒤 체력 1 등 생성 스탯만 반영).
          const swordCandidates = [];
          for (const c of session.cells) {
            if (!c || c.erased) continue;
            if (c.kind === KIND_SWORD || c.kindCode === 4) {
              swordCandidates.push(c);
            }
          }
          if (swordCandidates.length > 0) {
            const targets = pickRandomUpToN(session.rng, swordCandidates, 1, 'enemy11Target');
            if (targets.length > 0 && targets[0]) {
              const t = targets[0];
              morphCellKind(t, KIND_ENEMY);
              t.arrow = false;
              t.magicBlade = false;
              t.broken = false;
              t.enemy = createEnemyData(session);
              t.skipRetaliation = false;
              t.abilityUsed = true;
            }
          }
        } else if (eKind === 12) {
          // E12 / 12 (수리막기): 존재 중 방패 토큰은 수리 대신 강화 (applyShieldToken에서 처리).
          // 종족5 숙적으로 새 등장 시 현재방패0 (createEnemyData에서 처리).
        } else if (eKind === 13) {
          // E13 / 13 (훔침): 판에 코인이 있으면 무작위 최대 2코인 무보상 제거 [I0 E13].
          // 없으면 소지골드 최대 2점 훔침. 숙적 13이면 훔친 점마다 자기 유효공격만큼 체력 직접피해 [교정 16.3].
          // 판코인 제거 분기에 소지금 손실을 추가하지 않음.
          const coinCells = [];
          for (const c of session.cells) {
            if (!c || c.erased) continue;
            if (c.kind === KIND_COIN || c.kindCode === 2) {
              coinCells.push(c);
            }
          }
          if (coinCells.length > 0) {
            const targets = pickRandomUpToN(session.rng, coinCells, 2, 'enemy13StealCoin');
            for (const t of targets) {
              t.erased = true;
            }
          } else {
            const heroCoins = (session.hero && session.hero.coins != null) ? session.hero.coins : 0;
            const stolen = Math.min(2, Math.max(0, heroCoins));
            if (stolen > 0) {
              session.hero.coins = heroCoins - stolen;
            }
            const isMortal13 = Boolean(cell.enemy.isMortalEnemy || (session.hero && session.hero.raceKey === 3));
            if (isMortal13 && stolen > 0) {
              const strike = getEffectiveEnemyStrike(session, cell);
              const dmg = stolen * strike;
              if (dmg > 0) {
                session.hero.life = Math.max(0, (session.hero.life || 0) - dmg);
              }
            }
          }
        } else if (eKind === 14) {
          // E14 / 14 (뛰기): 제거예정 아닌 일반 적/비적 한 칸에 무작위 착지·자리교환 후 원래 자리에 온 착지 칸을 무보상 제거 [I0 E14].
          // 숙적14면 유효 수직 추가타격만 피해 (determineDamageType에서 처리).
          // 임시 후보: 자신 제외 일반칸 전체 (이유: 다리·이동표식 전조건 미판독).
          const jumpCandidates = [];
          for (const c of session.cells) {
            if (!c || c.erased || c === cell) continue;
            if (!c.enemy || c.enemy.enemyKind === 0) {
              jumpCandidates.push(c);
            }
          }
          if (jumpCandidates.length > 0) {
            const targets = pickRandomUpToN(session.rng, jumpCandidates, 1, 'enemy14JumpTarget');
            if (targets.length > 0 && targets[0]) {
              const target = targets[0];
              const oldX = cell.x;
              const oldY = cell.y;
              cell.x = target.x;
              cell.y = target.y;
              target.x = oldX;
              target.y = oldY;
              target.erased = true;
            }
          }
        } else if (eKind === 15) {
          // E15 / 15 (충전막기): 존재하면 자연 충전만 중지 (processTurnEnd에서 처리).
          // 직접 충전 토큰과 종족9 완충을 막지 않음.
        } else if (eKind === 16) {
          // E16 / 16 (아래찌르기): 맨아래면 매 실행 공격 2배를 플레이어 체력에 직접피해 [I0 E16, 교정 16.3].
          // 16 맨아래 피해는 유효공격의 2배다.
          // 숙적16이면 아래칸이 특수 적인 경우 중단, 아니면 아래칸만 무보상 제거하고 낙하를 기다림.
          // 자신을 아래로 옮긴 뒤 같은칸을 지우면 안 됨.
          const isBottom = (cell.y === BOARD_HEIGHT - 1);
          if (isBottom) {
            const strike = getEffectiveEnemyStrike(session, cell);
            const dmg = strike * 2;
            session.hero.life = Math.max(0, (session.hero.life || 0) - dmg);
          } else {
            const isMortal16 = Boolean(cell.enemy.isMortalEnemy || (session.hero && session.hero.raceKey === 4));
            if (isMortal16) {
              const below = getCell(session, cell.x, cell.y + 1);
              if (below && !below.erased) {
                const isSpecialBelow = (below.enemy && below.enemy.enemyKind > 0);
                if (!isSpecialBelow) {
                  below.erased = true;
                }
              }
            }
          }
        } else if (eKind === 17) {
          // E17 / 17 (따라막기): 생성 및 매 능력 때 방어를 플레이어 현재방패로 설정 [I0 E17].
          cell.enemy.guard = (session.hero && session.hero.shield != null) ? session.hero.shield : (cell.enemy.guard || 0);
        } else if (eKind === 18) {
          // E18 / 18 (둘바꾸기): 제거예정 아닌 일반칸 최대 2개를 일반 보충과 동일한 규칙으로 재추첨 [I0 E18, 교정 24.4].
          const normalCells = [];
          for (const c of session.cells) {
            if (!c || c.erased) continue;
            if (!c.enemy || c.enemy.enemyKind === 0) {
              normalCells.push(c);
            }
          }
          if (normalCells.length > 0) {
            const targets = pickRandomUpToN(session.rng, normalCells, 2, 'enemy18Target');
            let spawnedPromotedSpecial18 = false;
            const spawned31Cells = [];
            for (const t of targets) {
              const popRes = populateRefillCell(session, t, {
                markAbilityUsed: true,
                skipRetaliation: true
              });
              if (popRes.spawnedPromotedSpecial) {
                spawnedPromotedSpecial18 = true;
              }
              if (popRes.isEnemy31) {
                spawned31Cells.push(t);
              }
            }
            if (spawnedPromotedSpecial18) {
              checkSpecialCountAchievement41(session);
            }
            for (const c31 of spawned31Cells) {
              handleEnemy31Spawn(session, c31);
            }
          }
        } else if (eKind === 19) {
          // E19 / 19 (방바꾸기): 초기 5 → 실행마다 −1, 0이면 19번 자신을 포함한 36칸 전체를 무보상 제거 표시 후 공통 낙하·보충으로 새 방 채움 [I0 E19, 교정 18.3].
          // 19번을 남겨 카운트 5로 되돌리지 않는다.
          // 비숙적 방교체는 적(1)을 제외한 네 종류(물약·코인·방패·칼)로 채우고,
          // 숙적 19 방교체는 칼(4)만 제외한 네 종류(물약·적·코인·방패)로 채운다.
          cell.enemy.countLeft = Math.max(0, (cell.enemy.countLeft || 5) - 1);
          if (cell.enemy.countLeft === 0) {
            const isMortal19 = Boolean(cell.enemy.isMortalEnemy || (session.hero && session.hero.raceKey === 9));
            if (isMortal19) {
              emitAchievementProgress(session, 38, 100);
            }
            for (const c of session.cells) {
              if (c) {
                c.erased = true;
              }
            }
            applyDropAndRefill(session, false, {
              roomReplaceMode: isMortal19 ? 'mortal19' : 'normal19',
              markAbilityUsed: true
            });
          }
        } else if (eKind === 20) {
          // E20 / 20 (되찾기): 반격이 플레이어 체력에 닿을 때 생존20번은 유효공격만큼 회복 (resolveRetaliation에서 처리).
        } else if (eKind === 21) {
          // E21 / 21 (격해짐): 다른 적의 공통 공격 처치 수만큼 공격 증가 (updateEnemy21Growth에서 처리).
        } else if (eKind === 22) {
          // E22 / 22 (금내기): 무작위 칼/방패를 파손화. 화살·이미파손·제거예정 제외. 매 실행 한 칸만 파손화한다 [I0 E22].
          // 후보가 없으면 아무 변화 없다.
          const brokenCandidates = [];
          for (const c of session.cells) {
            if (!c || c.erased || c.broken || c.arrow) continue;
            if (c.kind === KIND_SWORD || c.kindCode === 4 || c.kind === KIND_SHIELD || c.kindCode === 3) {
              brokenCandidates.push(c);
            }
          }
          if (brokenCandidates.length > 0) {
            const targets = pickRandomUpToN(session.rng, brokenCandidates, 1, 'enemy22Target');
            if (targets.length > 0 && targets[0]) {
              targets[0].broken = true;
            }
          }
        } else if (eKind === 23) {
          // E23 / 23 (아래밀기): 열마다 아래쪽부터(적 후보 y4→0) 자신이 아닌 적의 바로 아래가 비적이면 아래칸 1개를 무보상제거 [I0 E23].
          // 열당 최대1. y0포함 경계는 임시값: 포함 (이유: 반복문 마지막 후보 처리가 애매함).
          for (let colX = 0; colX < BOARD_WIDTH; colX++) {
            for (let candY = BOARD_HEIGHT - 2; candY >= 0; candY--) {
              const enemyC = getCell(session, colX, candY);
              if (
                enemyC && !enemyC.erased && enemyC !== cell &&
                (enemyC.kind === KIND_ENEMY || enemyC.kindCode === 1) &&
                enemyC.enemy && enemyC.enemy.hitPoints > 0
              ) {
                const belowCell = getCell(session, colX, candY + 1);
                if (
                  belowCell && !belowCell.erased &&
                  !(belowCell.kind === KIND_ENEMY || belowCell.kindCode === 1)
                ) {
                  belowCell.erased = true;
                  break; // 열당 최대 1
                }
              }
            }
          }
        } else if (eKind === 24) {
          // E24 / 24 (적끌기): 제거 예정이 아닌 주변8칸 비적과 거리1 초과의 적을 비복원으로 한 쌍씩 추첨해 교환 [I0 E24, 교정 24.5].
          // 적인지 여부는 bridgeForm 예외 없이 칸 종류(kind/kindCode)로만 판단한다.
          const nearNonEnemies = [];
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              if (dx === 0 && dy === 0) continue;
              const nx = cell.x + dx;
              const ny = cell.y + dy;
              if (nx >= 0 && nx < BOARD_WIDTH && ny >= 0 && ny < BOARD_HEIGHT) {
                const nCell = getCell(session, nx, ny);
                if (nCell && !nCell.erased) {
                  const isEnemy = (nCell.kind === KIND_ENEMY || nCell.kindCode === 1);
                  if (!isEnemy) {
                    nearNonEnemies.push(nCell);
                  }
                }
              }
            }
          }

          const farEnemies = [];
          for (const c of session.cells) {
            if (!c || c.erased || c === cell) continue;
            const dist = Math.max(Math.abs(c.x - cell.x), Math.abs(c.y - cell.y));
            if (dist > 1 && (c.kind === KIND_ENEMY || c.kindCode === 1) && c.enemy && c.enemy.hitPoints > 0) {
              farEnemies.push(c);
            }
          }

          const nearPool = [...nearNonEnemies];
          const farPool = [...farEnemies];
          while (nearPool.length > 0 && farPool.length > 0) {
            const nearIdx = drawInt(session.rng, 0, nearPool.length - 1, 'enemy24NearTarget');
            const farIdx = drawInt(session.rng, 0, farPool.length - 1, 'enemy24FarTarget');
            const nC = nearPool.splice(nearIdx, 1)[0];
            const fC = farPool.splice(farIdx, 1)[0];
            const tx = nC.x;
            const ty = nC.y;
            nC.x = fC.x;
            nC.y = fC.y;
            fC.x = tx;
            fC.y = ty;
          }
        } else if (eKind === 25) {
          // E25 / 25 (장비끌기): 주변8칸 중 칼·방패 아닌 모든 미제거 칸과 거리1 초과의 미제거 칼·방패를 비복원 쌍 교환 [I0 E25, 교정 24.5].
          // 칼·방패 여부는 bridgeForm 예외 없이 칸 종류(kind/kindCode)로만 판단한다.
          const nearNonEquip = [];
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              if (dx === 0 && dy === 0) continue;
              const nx = cell.x + dx;
              const ny = cell.y + dy;
              if (nx >= 0 && nx < BOARD_WIDTH && ny >= 0 && ny < BOARD_HEIGHT) {
                const nCell = getCell(session, nx, ny);
                if (nCell && !nCell.erased) {
                  const isEquip = (nCell.kind === KIND_SWORD || nCell.kindCode === 4 || nCell.kind === KIND_SHIELD || nCell.kindCode === 3);
                  if (!isEquip) {
                    nearNonEquip.push(nCell);
                  }
                }
              }
            }
          }

          const farEquip = [];
          for (const c of session.cells) {
            if (!c || c.erased || c === cell) continue;
            const dist = Math.max(Math.abs(c.x - cell.x), Math.abs(c.y - cell.y));
            if (dist > 1) {
              const isEquip = (c.kind === KIND_SWORD || c.kindCode === 4 || c.kind === KIND_SHIELD || c.kindCode === 3);
              if (isEquip) {
                farEquip.push(c);
              }
            }
          }

          const nearPool25 = [...nearNonEquip];
          const farPool25 = [...farEquip];
          while (nearPool25.length > 0 && farPool25.length > 0) {
            const nearIdx = drawInt(session.rng, 0, nearPool25.length - 1, 'enemy25NearTarget');
            const farIdx = drawInt(session.rng, 0, farPool25.length - 1, 'enemy25FarTarget');
            const nC = nearPool25.splice(nearIdx, 1)[0];
            const fC = farPool25.splice(farIdx, 1)[0];
            const tx = nC.x;
            const ty = nC.y;
            nC.x = fC.x;
            nC.y = fC.y;
            fC.x = tx;
            fC.y = ty;
          }
        } else if (eKind === 26) {
          // E26 / 26 (던지기): 제거예정·이번반격제외가 아닌 일반 적 하나 무작위 제거, 그 현재체력만큼 플레이어 직접 체력피해 [I0 E26].
          // 처치XP 없음. 후보없으면 없음.
          const throwCandidates = [];
          for (const c of session.cells) {
            if (!c || c.erased || c.skipRetaliation) continue;
            if ((c.kind === KIND_ENEMY || c.kindCode === 1) && c.enemy && c.enemy.enemyKind === 0 && c.enemy.hitPoints > 0) {
              throwCandidates.push(c);
            }
          }
          if (throwCandidates.length > 0) {
            const targets = pickRandomUpToN(session.rng, throwCandidates, 1, 'enemy26Target');
            if (targets.length > 0 && targets[0]) {
              const t = targets[0];
              const dmg = t.enemy.hitPoints || 0;
              t.erased = true;
              // 처치XP 없음 (session.killLedger 불변)
              if (dmg > 0 && session.hero) {
                session.hero.life = Math.max(0, (session.hero.life || 0) - dmg);
              }
            }
          }
        } else if (eKind === 27) {
          // E27 / 27 (위로만): determineDamageType에서 처리. 턴능력은 없음.
        } else if (eKind === 28) {
          // E28 / 28 (깎기): 초기5, 능력마다−1, 0이면 장비 먼저 무작위 선택 → 그 장비 양수능력 하나 무작위 선택 → 기존 감소량 표만큼 빼고 0 하한 적용 → 전체 능력 재합산 1회 → 카운트5 [I0 E28, 교정 18.6, 교정 24.6].
          // 모든 능력을 1씩만 빼지 않는다. 양수 능력이 없으면 아무것도 깎지 않으며 강화 게이지도 건드리지 않는다.
          cell.enemy.countLeft = Math.max(0, (cell.enemy.countLeft || 5) - 1);
          if (cell.enemy.countLeft === 0) {
            cell.enemy.countLeft = 5;
            const gearList = Array.isArray(session.gear)
              ? session.gear
              : (session.gear && typeof session.gear === 'object' ? Object.values(session.gear) : []);
            if (gearList.length > 0) {
              const gearIdx = drawInt(session.rng, 0, gearList.length - 1, 'enemy28GearSelect');
              const chosenGear = gearList[gearIdx];
              if (chosenGear) {
                const statCandidates = [];
                const handledKeys = new Set(['slot', 'ownLook', 'id', 'key', 'name', 'type', 'boosts']);

                // 능력 번호 0~19와 동의어 프로퍼티 매핑 (재합산은 targetStat 적용 후 recalculateHeroStats 1회로 일괄 처리 [교정 24.6])
                const boostSynonyms = {
                  0: ['attack', 'weaponAttack', 'bladeStrike', 'strike', 'weapon_attack', '무기공격'],
                  1: ['baseStrike', 'baseAttack', '기본공격'],
                  10: ['life', 'hp', 'maxHp', 'lifeCap', 'maxLife', '체력'],
                  11: ['armor', 'guard', 'defense', 'shield', 'shieldCap', 'maxShield', '방어', '갑옷'],
                  16: ['repairPower', 'repair', '방패복구', '복구'],
                  17: ['potionPower', 'healPower', 'heal', '물약회복', '회복']
                };

                const maxBoostLen = Array.isArray(chosenGear.boosts) ? Math.max(20, chosenGear.boosts.length) : 20;
                for (let b = 0; b < maxBoostLen; b++) {
                  const synKeys = boostSynonyms[b];
                  let hasPositive = false;
                  if (Array.isArray(chosenGear.boosts) && chosenGear.boosts[b] > 0) {
                    hasPositive = true;
                  }
                  if (Array.isArray(synKeys)) {
                    for (const k of synKeys) {
                      handledKeys.add(k);
                      if (typeof chosenGear[k] === 'number' && chosenGear[k] > 0) {
                        hasPositive = true;
                      }
                    }
                  }
                  if (hasPositive) {
                    const boostIdx = b;
                    statCandidates.push({
                      type: 'boost',
                      index: boostIdx,
                      apply: () => {
                        const dec = getUpgradeDecrease(session, boostIdx);
                        let finalVal = 0;
                        let actualDec = 0;
                        if (Array.isArray(synKeys)) {
                          for (const k of synKeys) {
                            if (typeof chosenGear[k] === 'number' && chosenGear[k] > 0) {
                              const prev = chosenGear[k];
                              chosenGear[k] = Math.max(0, prev - dec);
                              actualDec += (prev - chosenGear[k]);
                              finalVal = chosenGear[k];
                            }
                          }
                        }
                        if (Array.isArray(chosenGear.boosts) && chosenGear.boosts[boostIdx] > 0) {
                          const prevB = chosenGear.boosts[boostIdx];
                          chosenGear.boosts[boostIdx] = Math.max(0, prevB - dec);
                          actualDec += (prevB - chosenGear.boosts[boostIdx]);
                          finalVal = chosenGear.boosts[boostIdx];
                        } else if (actualDec > 0) {
                          if (!Array.isArray(chosenGear.boosts)) {
                            chosenGear.boosts = new Array(20).fill(0);
                          }
                          chosenGear.boosts[boostIdx] = finalVal;
                        }
                        if (actualDec > 0) {
                          emitAchievementProgress(session, 39, 100);
                        }
                      }
                    });
                  }
                }

                // boosts 외 개별 숫자 프로퍼티
                for (const [k, v] of Object.entries(chosenGear)) {
                  if (!handledKeys.has(k) && typeof v === 'number' && v > 0) {
                    statCandidates.push({
                      type: 'prop',
                      key: k,
                      apply: () => {
                        const prev = chosenGear[k];
                        chosenGear[k] = Math.max(0, prev - 1);
                        if (prev - chosenGear[k] > 0) {
                          emitAchievementProgress(session, 39, 100);
                        }
                      }
                    });
                  }
                }

                if (statCandidates.length > 0) {
                  const statIdx = drawInt(session.rng, 0, statCandidates.length - 1, 'enemy28StatSelect');
                  const targetStat = statCandidates[statIdx];
                  if (targetStat && typeof targetStat.apply === 'function') {
                    targetStat.apply();
                    recalculateHeroStats(session);
                  }
                }
              }
            }
          }
        } else if (eKind === 29) {
          // E29 / 29 (마모): 전량 방패손상 연계 (resolveRetaliation에서 처리).
        } else if (eKind === 30) {
          // E30 / 30 (받아내기): determineDamageType 및 executeCombatPath에서 처리.
        } else if (eKind === 31) {
          // E31 / 31 (위로탈출): 능력 때 한 칸 위와 교환, 맨 위면 무보상 이탈 [I0 E31].
          if (cell.y === 0) {
            cell.erased = true;
          } else {
            const above = getCell(session, cell.x, cell.y - 1);
            if (above) {
              const ty = cell.y;
              cell.y = above.y;
              above.y = ty;
            }
          }
        } else if (eKind === 32) {
          // E32 / 32 (다시섬): 같은 턴 능력은 유예만 지움, 다음 능력에서 현턴·난이도로 스탯 재생성 후 변환 해제 [I0 E32, 교정 27.3, 교정 27.4].
          if (cell.enemy.revivalDelay) {
            cell.enemy.revivalDelay = false;
          } else if (cell.enemy.shellState === 1) {
            const newData = createEnemyData(session, 32, false, { is32Regen: true });
            cell.enemy.hitPoints = newData.hitPoints;
            cell.enemy.recoveryLimit = newData.recoveryLimit;
            cell.enemy.strike = newData.strike;
            cell.enemy.guard = newData.guard;
            cell.enemy.shellState = 0;
            resetPromotionCooldown(session);
          }
        }

        // [교정 26.2, 교정 32.1] 턴 끝 능력은 한 칸마다 사망을 확인해 중단하지 않고, 모든 능력을 끝까지 차례로 처리한다
      }
    }

    // [교정 26.2, 교정 32.1] 턴 끝 특수 능력을 전부 순회한 뒤에 부활을 소비하고 게임 종료를 판정한다.
    // 능력 처리 도중 부활을 먼저 소비해 뒤 능력 결과를 바꾸지 않는다.
    checkHeroSurvival(session);
  }

  /**
   * 6단계 ~ 12단계: 턴 끝 종합 처리 [F4 ~ F8]
   */
  function processTurnEnd(session) {
    if (!session || session.phase === 'end') return;

    // 6단계: 생존 15번 없으면 스킬 충전 + 1 [F4]
    const hasEnemy15 = session.cells.some(c =>
      !c.erased && c.enemy && c.enemy.enemyKind === 15 && c.enemy.hitPoints > 0
    );
    if (!hasEnemy15 && Array.isArray(session.actions)) {
      for (const action of session.actions) {
        if (!action || action.oneUse || action.cooldown === -1) continue;
        const wait = action.effectiveWait != null
          ? action.effectiveWait
          : (action.baseWait != null ? action.baseWait : (action.cooldown != null ? action.cooldown : 10));
        if (wait < 0) continue;
        action.charge = Math.min(wait, (action.charge || 0) + 1);
      }
    }

    // 6단계: 스킬 활성 해제 (스킬 22·24 보충 지속 표식은 12단계 둘째 낙하 뒤 이월 [교정 19.5])
    if (session.hero) {
      const prevActive = session.hero.activeNow || {};
      const preservedForSecondDrop = {};
      if (prevActive.skill22) preservedForSecondDrop.skill22 = true;
      if (prevActive.trap) preservedForSecondDrop.trap = true;
      if (prevActive.weakEnemySpawn) preservedForSecondDrop.weakEnemySpawn = true;
      if (prevActive.skill24) preservedForSecondDrop.skill24 = true;
      if (prevActive.allCoin) preservedForSecondDrop.allCoin = true;
      if (prevActive.suppressCoinForce) preservedForSecondDrop.suppressCoinForce = true;
      session.hero.activeNow = preservedForSecondDrop;
    }

    // 7단계: 불/얼음 순회 [F5]
    processFireAndFreeze(session);

    // 8~9단계: 회복, 플레이어 독, 적 독 3단계 [F6]
    processRegenAndPoison(session);
    if (session.phase === 'end') {
      if (session.hero) {
        session.hero.activeNow = { ...(session.hero.activeNext || {}) };
        session.hero.activeNext = {};
      }
      return;
    }

    // 10~11단계: 능력 표식 초기화 및 특수 적 능력 [F7]
    processEnemyAbilities(session);
    if (session.phase === 'end') {
      if (session.hero) {
        session.hero.activeNow = { ...(session.hero.activeNext || {}) };
        session.hero.activeNext = {};
      }
      return;
    }

    // 12단계: 두 번째 낙하·보충 [F8]
    applyDropAndRefill(session, false);

    // [교정 19.5] 스킬 22·24는 둘째 낙하 보충까지 유지되고, 둘째 낙하가 끝난 뒤 다음 턴 이월로 넘어간다.
    if (session.hero) {
      session.hero.activeNow = { ...(session.hero.activeNext || {}) };
      session.hero.activeNext = {};
    }

    // 승급대기 1 감소 (0 미만은 0) [F8, 교정 19.1]
    session.promotionLeft = Math.max(0, (session.promotionLeft || 0) - 1);

    // 100턴 모드 완료 검사 [F8, N1]
    if (session.mode === 'turn100' && session.tick >= 100) {
      const wasEnded = (session.phase === 'end');
      session.phase = 'end';
      emitAchievementProgressOnce(session, 76, 100);
      if (!wasEnded) {
        emitAchievementProgressOnce(session, 67, 100);
      }
    }

    // 다음 입력을 위한 보충 표식 해제
    clearRetaliationSkips(session);
  }

  // ==========================================
  // [G] 조각 5: 자원·경험치·레벨업·스킬·특수 적 보상
  // ==========================================

  // 조각 5: 스킬 42종 기본 쿨다운 (원문 표 대조 확인) [G7, K0]
  const SKILL_BASE_COOLDOWNS = {
    0: 13, 1: 16, 2: 15, 3: 16, 4: 18, 5: 18, 6: 15, 7: 20, 8: 18, 9: 18,
    10: 35, 11: 12, 12: 18, 13: 15, 14: 25, 15: 15, 16: 14, 17: 15, 18: 15, 19: 15,
    20: 18, 21: 20, 22: 18, 23: 15, 24: 25, 25: 14, 26: 12, 27: 16, 28: 14, 29: 20,
    30: 24, 31: 15, 32: 15, 33: -1, 34: 14, 35: 12, 36: 25, 37: 35, 38: 18, 39: 16,
    40: 14, 41: 14
  };

  /**
   * 레벨업 영구 스탯 보너스 상태 보장 헬퍼 [교정 20.1, 20.5]
   */
  function ensurePermStats(hero) {
    if (!hero) return {};
    if (!hero._permStats) {
      hero._permStats = {
        atk: 0,
        repair: 0,
        potion: 0,
        hp: 0,
        shieldCap: 0,
        growthAtk: 0,
        growthPotion: 0,
        growthRepair: 0,
        growthHp: 0,
        xpOdds: 0,
        coinsOdds: 0,
        potionOdds: 0,
        shieldOdds: 0
      };
    }
    return hero._permStats;
  }

  // 조각 5 & 20: 레벨업 스탯 8종 [G6, 교정 20.1, 20.5]
  const STAT_OPTIONS = [
    {
      statId: 0,
      name: '기본공격+1 · XP보너스+5%p',
      apply: (hero) => {
        const perm = ensurePermStats(hero);
        perm.atk = (perm.atk || 0) + 1;
        perm.growthAtk = (perm.growthAtk || 0) + 1;
        perm.xpOdds = (perm.xpOdds || 0) + 5;
        hero.baseStrike = (hero.baseStrike || 3) + 1;
        if (Array.isArray(hero.growths)) hero.growths[0] = (hero.growths[0] || 1) + 1;
        if (!hero.bonusOdds) hero.bonusOdds = { xp: 20, coins: 20, potion: 20, shield: 20 };
        hero.bonusOdds.xp = Math.min(100, (hero.bonusOdds.xp || 20) + 5);
      }
    },
    {
      statId: 1,
      name: '방패복구+1 · 방패보너스+5%p',
      apply: (hero) => {
        const perm = ensurePermStats(hero);
        perm.repair = (perm.repair || 0) + 1;
        perm.growthRepair = (perm.growthRepair || 0) + 1;
        perm.shieldOdds = (perm.shieldOdds || 0) + 5;
        hero.repairPower = (hero.repairPower || 1) + 1;
        if (Array.isArray(hero.growths)) hero.growths[2] = (hero.growths[2] || 1) + 1;
        if (!hero.bonusOdds) hero.bonusOdds = { xp: 20, coins: 20, potion: 20, shield: 20 };
        hero.bonusOdds.shield = Math.min(100, (hero.bonusOdds.shield || 20) + 5);
      }
    },
    {
      statId: 2,
      name: '최대체력+5 · 물약보너스+5%p',
      apply: (hero, mode) => {
        const perm = ensurePermStats(hero);
        if (mode !== 'score') {
          perm.hp = (perm.hp || 0) + 5;
          perm.growthHp = (perm.growthHp || 0) + 1;
          hero.lifeCap = (hero.lifeCap || 50) + 5;
          hero.life = (hero.life || 50) + 5;
          if (Array.isArray(hero.growths)) hero.growths[3] = (hero.growths[3] || 1) + 1;
        }
        perm.potionOdds = (perm.potionOdds || 0) + 5;
        if (!hero.bonusOdds) hero.bonusOdds = { xp: 20, coins: 20, potion: 20, shield: 20 };
        hero.bonusOdds.potion = Math.min(100, (hero.bonusOdds.potion || 20) + 5);
      }
    },
    {
      statId: 3,
      name: '물약회복+1 · 코인보너스+5%p',
      apply: (hero) => {
        const perm = ensurePermStats(hero);
        perm.potion = (perm.potion || 0) + 1;
        perm.growthPotion = (perm.growthPotion || 0) + 1;
        perm.coinsOdds = (perm.coinsOdds || 0) + 5;
        hero.potionPower = (hero.potionPower || 1) + 1;
        if (Array.isArray(hero.growths)) hero.growths[1] = (hero.growths[1] || 1) + 1;
        if (!hero.bonusOdds) hero.bonusOdds = { xp: 20, coins: 20, potion: 20, shield: 20 };
        hero.bonusOdds.coins = Math.min(100, (hero.bonusOdds.coins || 20) + 5);
      }
    },
    {
      statId: 4,
      name: '기본공격+2',
      apply: (hero) => {
        const perm = ensurePermStats(hero);
        perm.atk = (perm.atk || 0) + 2;
        perm.growthAtk = (perm.growthAtk || 0) + 2;
        hero.baseStrike = (hero.baseStrike || 3) + 2;
        if (Array.isArray(hero.growths)) hero.growths[0] = (hero.growths[0] || 1) + 2;
      }
    },
    {
      statId: 5,
      name: '방패복구+2',
      apply: (hero) => {
        const perm = ensurePermStats(hero);
        perm.repair = (perm.repair || 0) + 2;
        perm.growthRepair = (perm.growthRepair || 0) + 2;
        hero.repairPower = (hero.repairPower || 1) + 2;
        if (Array.isArray(hero.growths)) hero.growths[2] = (hero.growths[2] || 1) + 2;
      }
    },
    {
      statId: 6,
      name: '최대체력+10',
      apply: (hero, mode) => {
        const perm = ensurePermStats(hero);
        if (mode !== 'score') {
          perm.hp = (perm.hp || 0) + 10;
          perm.growthHp = (perm.growthHp || 0) + 2;
          hero.lifeCap = (hero.lifeCap || 50) + 10;
          hero.life = (hero.life || 50) + 10;
          if (Array.isArray(hero.growths)) hero.growths[3] = (hero.growths[3] || 1) + 2;
        }
      }
    },
    {
      statId: 7,
      name: '네 보너스 각+5%p',
      apply: (hero) => {
        const perm = ensurePermStats(hero);
        perm.xpOdds = (perm.xpOdds || 0) + 5;
        perm.coinsOdds = (perm.coinsOdds || 0) + 5;
        perm.potionOdds = (perm.potionOdds || 0) + 5;
        perm.shieldOdds = (perm.shieldOdds || 0) + 5;
        if (!hero.bonusOdds) hero.bonusOdds = { xp: 20, coins: 20, potion: 20, shield: 20 };
        hero.bonusOdds.xp = Math.min(100, (hero.bonusOdds.xp || 20) + 5);
        hero.bonusOdds.coins = Math.min(100, (hero.bonusOdds.coins || 20) + 5);
        hero.bonusOdds.potion = Math.min(100, (hero.bonusOdds.potion || 20) + 5);
        hero.bonusOdds.shield = Math.min(100, (hero.bonusOdds.shield || 20) + 5);
      }
    }
  ];

  /**
   * 추가율 계산 (기본 + 장비 저장정수 * 0.25, 최대 2.0) [G4, 교정 20.5]
   */
  function getExtraRates(session) {
    const hero = session && session.hero ? session.hero : null;
    const prevGearExtra = (hero && hero._gearExtraRates) ? hero._gearExtraRates : { xp: 0, coins: 0, upgrade: 0 };
    let xpRate = Math.max(0, ((hero && hero.extraRates && hero.extraRates.xp) || 0) - (prevGearExtra.xp || 0));
    let coinsRate = Math.max(0, ((hero && hero.extraRates && hero.extraRates.coins) || 0) - (prevGearExtra.coins || 0));
    let upgradeRate = Math.max(0, ((hero && hero.extraRates && hero.extraRates.upgrade) || 0) - (prevGearExtra.upgrade || 0));

    if (session && Array.isArray(session.gear)) {
      for (const g of session.gear) {
        if (g && Array.isArray(g.boosts)) {
          if (g.boosts[6]) xpRate += g.boosts[6] * 0.25;
          if (g.boosts[7]) coinsRate += g.boosts[7] * 0.25;
          if (g.boosts[13]) upgradeRate += g.boosts[13] * 0.25;
        }
      }
    }

    return {
      xp: Math.min(2, Math.max(0, xpRate)),
      coins: Math.min(2, Math.max(0, coinsRate)),
      upgrade: Math.min(2, Math.max(0, upgradeRate))
    };
  }

  /**
   * 공유 해제 검사 헬퍼 (상점 및 직업 0 레벨업 풀용) [교정 20.2, 20.4]
   * 일반스킬 0~30 항상 해제, 고유스킬 31~39는 대응 직업 1~9 성장 10 이상, 40·41은 공유해제 후보에서 제외.
   */
  function isSharedSkillUnlocked(skillId, classGrowthsOrProfile = null) {
    const sId = Math.floor(skillId);
    if (sId >= 0 && sId <= 30) return true;
    if (sId === 40 || sId === 41) return false;
    if (sId >= 31 && sId <= 39) {
      return isSkillUnlocked(sId, classGrowthsOrProfile);
    }
    return false;
  }

  /**
   * 비복원 무작위 후보 추출 헬퍼 [교정 20.1, 20.2]
   */
  function pickNonReplacement(rng, arr, count, tag) {
    if (!Array.isArray(arr) || arr.length === 0 || count <= 0) return [];
    const targetCount = Math.min(count, arr.length);
    const picked = [];
    const usedIndices = new Set();

    for (let i = 0; i < targetCount; i++) {
      const raw = drawInt(rng, 0, arr.length - 1, tag);
      let idx = raw;
      // 주입 난수가 배열 인덱스가 아닌 후보 고유 번호(statId / actionKey)를 직접 반환한 경우 대응
      if (idx < 0 || idx >= arr.length) {
        const matchIdx = arr.findIndex((item, k) =>
          !usedIndices.has(k) && (item === raw || (item && (item.statId === raw || item.actionKey === raw)))
        );
        idx = matchIdx !== -1 ? matchIdx : (((idx % arr.length) + arr.length) % arr.length);
      } else if (usedIndices.has(idx)) {
        const matchIdx = arr.findIndex((item, k) =>
          !usedIndices.has(k) && (item === raw || (item && (item.statId === raw || item.actionKey === raw)))
        );
        if (matchIdx !== -1) idx = matchIdx;
      }

      let steps = 0;
      while (usedIndices.has(idx) && steps < arr.length) {
        idx = (idx + 1) % arr.length;
        steps++;
      }
      if (!usedIndices.has(idx)) {
        usedIndices.add(idx);
        picked.push(arr[idx]);
      }
    }
    return picked;
  }

  /**
   * 스킬 습득 및 강화 [G7, 교정 19.8, 교정 20.6]
   * - 일반 모드: 새 습득 등급 1, 충전 완료. 같은 스킬 강화는 등급 < 10 이면 필요량 -1, 등급 +1 (10 상한).
   * - 100턴 모드 [교정 19.8]:
   *   새 스킬 초기화는 기본 필요량에서 4를 빼고 등급 5로 시작하며, 처음 배울 때는 그 필요량만큼 충전 완료로 둔다.
   *   기존 스킬 후보의 강화는 먼저 기존 필요량에서 등급 10 미만이면 1을 빼고 모드 보정 4를 뺀다. 등급은 이 모드에서 5로 설정한다.
   *   1회용 33의 음수 필요량과 기존 임시 하한(1)은 별도 취급한다.
   * - [교정 20.6]: 능력 5 양수 보유 표식이 있는 상태의 신규 장착도 필요량 -1, 네 번째 슬롯 퍽 3의 -1은 별도로 적용한다.
   */
  function learnOrUpgradeSkill(session, actionKey) {
    if (!session || !session.hero) return { success: false, reason: 'no_session' };
    if (!Array.isArray(session.actions)) session.actions = [];
    const isTurn100 = (session.mode === 'turn100');

    const existing = session.actions.find(a => a.actionKey === actionKey);
    if (existing) {
      const isOneUse = Boolean(existing.oneUse || existing.baseWait === -1 || existing.actionKey === 33);
      if (isTurn100) {
        if (!isOneUse) {
          let wait = existing.effectiveWait != null
            ? existing.effectiveWait
            : (SKILL_BASE_COOLDOWNS[actionKey] != null ? SKILL_BASE_COOLDOWNS[actionKey] : 15);
          if ((existing.grade != null ? existing.grade : 1) < 10) {
            wait -= 1;
          }
          wait -= 4;
          existing.effectiveWait = wait;
        }
        existing.grade = 5;
        return { success: true, upgraded: true, action: existing };
      }

      if (existing.grade < 10) {
        existing.grade += 1;
        if (!isOneUse) {
          existing.effectiveWait -= 1;
        }
      }
      return { success: true, upgraded: true, action: existing };
    }

    if (session.actions.length >= 4) {
      return { success: false, reason: 'slots_full' };
    }

    const slotIndex = session.actions.length;
    const baseCooldown = SKILL_BASE_COOLDOWNS[actionKey] != null ? SKILL_BASE_COOLDOWNS[actionKey] : 15;
    const isOneUse = (actionKey === 33 || baseCooldown === -1);
    let effectiveWait = baseCooldown;
    let grade = 1;

    if (isTurn100) {
      grade = 5;
      if (!isOneUse) {
        effectiveWait = effectiveWait - 4;
      }
    }

    // [교정 20.6, 교정 23.5] 능력 5 양수 보유 표식이 있는 상태의 신규 장착도 필요량 -1 반영 (하한 1 제한 없음)
    const hasGear5 = Boolean(
      session.hero.hasCooldownReduction ||
      (Array.isArray(session.gear) && session.gear.some(g => g && Array.isArray(g.boosts) && g.boosts[5] > 0))
    );
    if (hasGear5) {
      session.hero.hasCooldownReduction = true;
    }
    if (!isOneUse && hasGear5) {
      effectiveWait -= 1;
    }

    // 네 번째 슬롯(index 3) 퍽 3의 -1은 별도로 적용 [G7, 교정 20.6, 교정 23.5]
    if (!isOneUse && slotIndex === 3 && session.hero.perks && session.hero.perks.includes(3)) {
      effectiveWait -= 1;
    }

    const newAction = {
      actionKey,
      grade,
      baseWait: baseCooldown,
      effectiveWait,
      charge: effectiveWait, // 새 습득 시 충전 완료 [G7, 교정 19.8]
      running: false,
      carryNext: false,
      oneUse: isOneUse
    };

    session.actions.push(newAction);
    return { success: true, learned: true, action: newAction };
  }

  /**
   * 레벨업 선택지 생성 [G6, 교정 20.1, 20.2]
   * - 스탯 후보는 번호 0~7에서 허용 항목을 무작위 비복원 선택 (앞 4개 고정 금지).
   *   7은 네 보너스 모두 100이면 제외, 점수모드는 6 제외·2의 HP부분 제외.
   * - 직업별 기존 20칸 풀에서 스킬 후보 최대 2장도 섞는다.
   *   직업 0은 공유해제검사를 적용한 풀, 다른 직업은 교체설정 반영 풀.
   *   이미 장착·등급·슬롯 조건은 기존 스킬 습득/강화 계약으로 거른다.
   * - 임시 배치(U06): 최종 카드수 4·선택 2·스킬 후보가 2개 이상일 때 2장, 나머지 스탯으로 구성.
   */
  function generateLevelupChoice(session, options = {}) {
    const hero = (session && session.hero) ? session.hero : {};
    const rng = session ? session.rng : null;
    const mode = session ? (session.mode || 'normal') : 'normal';
    const classId = hero.classKey != null ? hero.classKey : 0;
    const bonusOdds = hero.bonusOdds || { xp: 20, coins: 20, potion: 20, shield: 20 };
    const allOdds100 = (
      bonusOdds.xp >= 100 &&
      bonusOdds.coins >= 100 &&
      bonusOdds.potion >= 100 &&
      bonusOdds.shield >= 100
    );

    // 1) 직업별 스킬 후보 풀 수집 [교정 20.2]
    let rawSkillPool = [];
    if (options && Array.isArray(options.skillPool)) {
      rawSkillPool = [...options.skillPool];
    } else if (session && Array.isArray(session.skillPool)) {
      rawSkillPool = [...session.skillPool];
    } else if (hero && Array.isArray(hero.skillPool)) {
      rawSkillPool = [...hero.skillPool];
    } else if (classId === 0) {
      const profOrGrowths = session ? (session.profile || session.classGrowths || null) : null;
      for (let s = 0; s <= 41; s++) {
        if (isSharedSkillUnlocked(s, profOrGrowths)) {
          rawSkillPool.push(s);
        }
      }
    } else {
      const cDef = CLASS_DEFINITIONS[classId] || CLASS_DEFINITIONS[0];
      const prof = (session && session.profile) || null;
      const cEntry = (prof && Array.isArray(prof.classes))
        ? prof.classes.find(item => item && item.id === classId)
        : null;
      const swapSetup = (options && Array.isArray(options.skillSwaps))
        ? options.skillSwaps
        : ((session && Array.isArray(session.skillSwaps))
          ? session.skillSwaps
          : (cEntry && Array.isArray(cEntry.skillSwaps) ? cEntry.skillSwaps : null));
      const base = (cEntry && Array.isArray(cEntry.skillPool) && cEntry.skillPool.length > 0)
        ? [...cEntry.skillPool]
        : [...cDef.skillPool];
      if (swapSetup && swapSetup.length > 0) {
        const growth = (cEntry && cEntry.growth != null) ? cEntry.growth : 10;
        const growthSource = prof || (session && session.classGrowths) || null;
        const validatedSwaps = validateSkillSwapSetup(growth, swapSetup, null, growthSource);
        for (let i = 1; i < Math.min(20, base.length); i++) {
          const rep = validatedSwaps[i];
          if (rep != null && isSkillUnlocked(rep, growthSource) && !base.includes(rep)) {
            base[i] = rep;
          }
        }
      }
      rawSkillPool = base;
    }

    // 이미 장착·등급·슬롯 조건으로 유효 스킬 후보 필터링 [교정 20.2]
    const actions = (session && Array.isArray(session.actions)) ? session.actions : [];
    const seenSkills = new Set();
    const validSkills = [];
    for (const skillId of rawSkillPool) {
      if (seenSkills.has(skillId)) continue;
      seenSkills.add(skillId);
      // [교정 30.4] 점수모드 레벨업 스킬 후보에서는 24번과 7번을 모두 제외
      if (mode === 'score' && (skillId === 24 || skillId === 7)) continue;

      const existing = actions.find(a => a && a.actionKey === skillId);
      if (existing) {
        const isOneUse = Boolean(skillId === 33 || existing.oneUse || existing.baseWait === -1);
        if (isOneUse) continue;
        if ((existing.grade != null ? existing.grade : 1) >= 10) continue;
        validSkills.push(skillId);
      } else {
        if (actions.length >= 4) continue;
        validSkills.push(skillId);
      }
    }

    // 2) 허용 스탯 후보 수집 [교정 20.1]
    const availableStats = STAT_OPTIONS.filter(opt => {
      if (opt.statId === 7 && allOdds100) return false;
      if (opt.statId === 6 && mode === 'score') return false;
      return true;
    });

    // 3) 임시 배치(U06): 총 4장 중 스킬 최대 2장 + 나머지 스탯 [교정 20.2]
    const totalCards = (options && options.totalCards != null) ? options.totalCards : 4;
    let maxSkillCards = 2;
    if (options && options.skillCount != null) {
      maxSkillCards = options.skillCount;
    } else if (options && options.maxSkillCards != null) {
      maxSkillCards = options.maxSkillCards;
    } else if (options && options.statOnly) {
      maxSkillCards = 0;
    }

    let pickedSkills = [];
    if (hero.rank === 2 && classId > 0 && rawSkillPool.length > 0 && maxSkillCards > 0 && totalCards > 0) {
      const firstSkillId = rawSkillPool[0];
      pickedSkills.push(firstSkillId);
      const remainingPool = validSkills.filter(sId => sId !== firstSkillId);
      const remainingTarget = Math.max(0, Math.min(maxSkillCards - 1, remainingPool.length, totalCards - 1));
      if (remainingTarget > 0) {
        const rest = pickNonReplacement(rng, remainingPool, remainingTarget, 'levelupSkillPick');
        pickedSkills.push(...rest);
      }
    } else {
      const targetSkillCount = Math.max(0, Math.min(maxSkillCards, validSkills.length, totalCards));
      pickedSkills = pickNonReplacement(rng, validSkills, targetSkillCount, 'levelupSkillPick');
    }

    const neededStats = Math.max(0, totalCards - pickedSkills.length);
    const pickedStats = pickNonReplacement(rng, availableStats, neededStats, 'levelupStatPick');

    const cards = [];
    for (const sId of pickedSkills) {
      const def = SKILL_DEFINITIONS[sId];
      cards.push({
        type: 'skill',
        actionKey: sId,
        name: (def && def.name) ? def.name : `스킬 ${sId}`
      });
    }
    for (const s of pickedStats) {
      cards.push({
        type: 'stat',
        statId: s.statId,
        name: s.name
      });
    }

    return {
      type: 'levelup',
      rank: hero.rank || 1,
      id: `lvl_${hero.rank || 1}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      cards,
      picksNeeded: 2,
      picks: [],
      provisionalLayout: true // 임시 배치 표식 (U06)
    };
  }

  // ==========================================
  // [L] 조각 12: 상점·강화·스탯
  // ==========================================

  const GEAR_UPGRADE_CANDIDATES = {
    0: [0, 1, 2, 3, 4, 6, 8, 9],            // 무기
    1: [11, 10, 12, 17, 6, 7, 13],         // 머리
    2: [11, 14, 10, 12, 15, 17, 18, 19],     // 방패
    3: [11, 0, 1, 16, 12, 15, 13],         // 몸
    4: [8, 9, 18, 19, 5, 17, 10]           // 장신구
  };

  const GEAR_SLOT_NAMES = ['weapon', 'head', 'shield', 'body', 'accessory'];

  /**
   * 강화 번호별 1회 증가량 계산 [L4]
   */
  function getUpgradeIncrease(session, boostId) {
    const hero = session ? session.hero : null;
    const mode = session ? session.mode : 'normal';
    const perks = (hero && hero.perks) || [];

    switch (boostId) {
      case 0: // 무기공격
      case 1: // 기본공격
        return 1;
      case 2: { // 흡혈률: A < 15는 5, 15~20은 3, 21이상 2
        const A = hero ? (hero.drainRate || 0) : 0;
        if (A < 15) return 5;
        if (A <= 20) return 3;
        return 2;
      }
      case 3: // 적독 3단계 (각 2)
        return 2;
      case 4: // 관통값 (+10)
        return 10;
      case 5: // 전체스킬대기감소보유능력 (+1)
        return 1;
      case 6: // XP추가율 (저장1=0.25)
      case 7: // 골드추가율 (저장1=0.25)
        return 1;
      case 8: // 공격·XP기회복합 (공격1·기회5%p)
      case 9: // 회복·코인기회복합 (회복1·기회5%p)
        return 1;
      case 10: // 최대체력 (10, 별도점수모드 0)
        return mode === 'score' ? 0 : 10;
      case 11: // 최대방패 (+1)
      case 12: // 가시 (+1)
      case 13: // 강화추가율 (저장1=0.25)
        return 1;
      case 14: { // 방패손상값감소: q>85는 2, 79<q<=85는 3, 69<q<=79는 5, 나머지 10
        const d = hero && hero.shieldDamageOdds != null ? hero.shieldDamageOdds : 50;
        const q = 100 - Math.min(d, 100);
        if (q > 85) return 2;
        if (q > 79) return 3;
        if (q > 69) return 5;
        return 10;
      }
      case 15: // 반격뒤적공격감소 (+1)
      case 16: // 방패복구 (+1)
        return 1;
      case 17: // 턴회복 (퍽5면 2, 그외 1)
        return perks.includes(5) ? 2 : 1;
      case 18: // 복구·방패기회복합 (복구1·기회5%p)
      case 19: // 체력·물약기회복합 (체력5·기회5%p)
        return 1;
      default:
        return 1;
    }
  }

  /**
   * 강화 번호별 1회 감소량 계산 [L5, 교정 18.6]
   */
  function getUpgradeDecrease(session, boostId) {
    const hero = session ? session.hero : null;
    switch (boostId) {
      case 2: { // 흡혈: A < 18은 5, 18~22는 3, 23이상 2
        let A = hero ? (hero.drainRate || 0) : 0;
        if (A === 0 && session && Array.isArray(session.gear)) {
          let sum2 = 0;
          for (const g of session.gear) {
            if (g && Array.isArray(g.boosts) && g.boosts[2] > 0) sum2 += g.boosts[2];
          }
          if (sum2 > 0) A = sum2;
        }
        if (A < 18) return 5;
        if (A <= 22) return 3;
        return 2;
      }
      case 14: { // 방패손상값감소 능력치 너프 (보존률 q 기준)
        const d = hero && hero.shieldDamageOdds != null ? hero.shieldDamageOdds : 50;
        const q = 100 - Math.min(d, 100);
        if (q > 87) return 2;
        if (q > 82) return 3;
        if (q > 74) return 5;
        return 10;
      }
      default:
        return getUpgradeIncrease(session, boostId);
    }
  }

  /**
   * 강화 후보 허용 여부 판정 [L4]
   * 관통 95이상, 흡수 25이상, 자원추가율 2이상은 해당 후보 제외.
   * 보존률 90이상은 14 제외. 별도점수모드 10 제외.
   */
  function isUpgradeAllowed(session, boostId, options = {}) {
    if (!session || !session.hero) return true;
    const hero = session.hero;
    const mode = session.mode || 'normal';

    if (boostId === 4 && (hero.piercing != null && hero.piercing >= 95)) {
      return false;
    }
    if (boostId === 2 && (hero.drainRate != null && hero.drainRate >= 25)) {
      return false;
    }
    const extraRates = getExtraRates(session);
    if (boostId === 6 && extraRates.xp >= 2) return false;
    if (boostId === 7 && extraRates.coins >= 2) return false;
    if (boostId === 13 && extraRates.upgrade >= 2) return false;

    if (boostId === 14) {
      const d = hero.shieldDamageOdds != null ? hero.shieldDamageOdds : 50;
      const q = 100 - Math.min(d, 100);
      if (q >= 90) return false;
    }

    if (boostId === 10 && mode === 'score') {
      return false;
    }

    if (boostId === 5) {
      if (options.cooldownAllowed === false) {
        return false;
      }
      if (options.currentBoosts && options.currentBoosts[5] > 0) {
        return false;
      }
    }

    if (boostId === 15) {
      if (mode === 'turn100') return false;
      const bluntVal = hero.blunt || 0;
      if (bluntVal > 0) {
        const roll = drawInt(session.rng, 0, bluntVal, 'bluntRoll');
        if (roll !== 0) return false;
      }
    }

    return true;
  }

  /**
   * 장비 재합산 및 현재값 보정 [B, L4, L5, 교정 20.5, 20.6]
   * - 매번 파생값을 0부터 재계산한다 (기본HP나 장비 능력을 중복 가산하지 않음).
   * - 복합능력 8·9·18·19는 각각 성장 공격·물약·복구·HP 수량과 연결 보너스 5%p를 합산하며 기본성장 네 값은 1이다.
   * - 관통상한 95, 손상값하한 5, 추가율상한 2.0을 한 번만 적용한다.
   * - 최대HP 증가분은 현재HP에 더하고 감소는 새 최대까지만 제한한다.
   * - 최대방패는 기존 손상량을 보존해 현재방패를 재산출하며 0 하한이다.
   * - 능력 5의 양수 보유 여부가 대기시간 -1 표식이다:
   *   없음→있음: 모든 기존 스킬 필요량 -1, 충전은 새 필요량 상한.
   *   있음→여러개: 불변 (-1 한 번뿐).
   *   있음→없음: 필요량 +1, 충전은 증가시키지 않는다.
   */
  function recalculateHeroStats(session) {
    if (!session || !session.hero) return;
    const hero = session.hero;
    const mode = session.mode || 'normal';
    const perks = Array.isArray(hero.perks) ? hero.perks : [];
    const flaws = Array.isArray(hero.flaws) ? hero.flaws : [];
    const perm = ensurePermStats(hero);

    // 1) 5부위 장비 능력치를 0부터 합산
    const totalBoosts = new Array(20).fill(0);
    if (Array.isArray(session.gear)) {
      for (const g of session.gear) {
        if (g && Array.isArray(g.boosts)) {
          for (let i = 0; i < 20; i++) {
            totalBoosts[i] += (g.boosts[i] || 0);
          }
        }
      }
    }

    // 2) 기본 성장값 [1, 1, 1, 1] + 영구 성장 + 복합능력 8·9·18·19
    const baseG = (Array.isArray(hero.baseGrowth) && hero.baseGrowth.length === 4)
      ? hero.baseGrowth
      : [1, 1, 1, 1];
    const growthAtk = baseG[0] + (perm.growthAtk || 0) + totalBoosts[8];
    const growthPotion = baseG[1] + (perm.growthPotion || 0) + totalBoosts[9];
    const growthRepair = baseG[2] + (perm.growthRepair || 0) + totalBoosts[18];
    const growthHp = baseG[3] + (perm.growthHp || 0) + totalBoosts[19];
    hero.growths = [growthAtk, growthPotion, growthRepair, growthHp];

    // 3) 파생 스탯을 0부터 재계산 [교정 20.5, 교정 21.2]
    const innateBaseStrike = 2 + (perks.includes(4) ? 1 : 0) + baseG[0] + (perm.growthAtk || 0);
    const gearBaseStrike = (totalBoosts[1] || 0) + (totalBoosts[8] || 0);
    hero.innateBaseStrike = innateBaseStrike;
    hero.gearBaseStrike = gearBaseStrike;
    hero.bladeStrike = totalBoosts[0];
    hero.baseStrike = innateBaseStrike + gearBaseStrike;
    hero._calcBaseStrike = hero.baseStrike;
    hero.potionPower = growthPotion;
    hero.repairPower = growthRepair + totalBoosts[16];
    hero.drainRate = totalBoosts[2];
    hero.poisonPower = (totalBoosts[3] > 0 && totalBoosts[3] === 1) ? 2 : totalBoosts[3];

    const piercingFromGear = (totalBoosts[4] > 0 && totalBoosts[4] < 10)
      ? totalBoosts[4] * 10
      : totalBoosts[4];
    const basePiercing = flaws.includes(5) ? 30 : 50;
    hero.piercing = Math.min(95, Math.max(0, basePiercing + piercingFromGear));

    hero.thorns = totalBoosts[12];
    hero.shieldDamageOdds = Math.max(5, 50 - totalBoosts[14]);
    hero.blunt = totalBoosts[15];
    hero.regen = totalBoosts[17];

    // 추가율 (상한 2.0 한 번만 적용)
    const gearExtra = {
      xp: Math.min(2, Math.max(0, totalBoosts[6] * 0.25)),
      coins: Math.min(2, Math.max(0, totalBoosts[7] * 0.25)),
      upgrade: Math.min(2, Math.max(0, totalBoosts[13] * 0.25))
    };
    hero._gearExtraRates = { ...gearExtra };
    hero.extraRates = { ...gearExtra };

    // 보너스 확률 (복합능력 8·9·18·19 연결 보너스 5%p 합산, 상한 100)
    hero.bonusOdds = {
      xp: Math.min(100, Math.max(0, 20 + (perm.xpOdds || 0) + totalBoosts[8] * 5)),
      coins: Math.min(100, Math.max(0, (perks.includes(7) ? 30 : 20) + (perm.coinsOdds || 0) + totalBoosts[9] * 5)),
      potion: Math.min(100, Math.max(0, 20 + (perm.potionOdds || 0) + totalBoosts[19] * 5)),
      shield: Math.min(100, Math.max(0, (flaws.includes(4) ? 10 : 20) + (perm.shieldOdds || 0) + totalBoosts[18] * 5))
    };

    // 4) 최대HP 및 현재HP 보정 (기본 시작 HP 40 + 첫 장신구 10 = 50)
    const oldLifeCap = hero.lifeCap != null ? hero.lifeCap : (mode === 'score' ? 100 : 40);
    let newLifeCap;
    if (mode === 'score') {
      newLifeCap = Math.max(1, 100 + (perks.includes(9) ? 10 : 0) - (flaws.includes(1) ? 10 : 0));
    } else {
      const baseStartHp = 40 + (perks.includes(9) ? 10 : 0) - (flaws.includes(1) ? 10 : 0);
      const hpFromGrowth = (growthHp - 1) * 5;
      newLifeCap = Math.max(1, baseStartHp + hpFromGrowth + totalBoosts[10]);
    }

    if (newLifeCap > oldLifeCap) {
      hero.life = (hero.life != null ? hero.life : oldLifeCap) + (newLifeCap - oldLifeCap);
    } else if (newLifeCap < oldLifeCap) {
      hero.life = Math.min(hero.life != null ? hero.life : oldLifeCap, newLifeCap);
    }
    hero.lifeCap = newLifeCap;

    // 5) 최대방패 및 현재방패 보정 (기존 손상량 보존, 0 하한; 기본 방패 0 + 첫 세 부위 1/2/1 = 4, 결함 6이면 3)
    const oldShieldCap = hero.shieldCap != null ? hero.shieldCap : 0;
    const oldDamage = Math.max(0, oldShieldCap - (hero.shield != null ? hero.shield : oldShieldCap));
    const newShieldCap = Math.max(0, (perm.shieldCap || 0) + totalBoosts[11]);
    hero.shieldCap = newShieldCap;
    hero.shield = Math.max(0, newShieldCap - oldDamage);

    // 6) 능력 5 양수 보유 여부 대기시간 -1 표식 [교정 20.6]
    const hadGear5 = Boolean(
      hero.hasCooldownReduction ||
      (hero.gearAppliedBoosts && hero.gearAppliedBoosts[5] > 0)
    );
    const hasGear5 = totalBoosts[5] > 0;
    hero.hasCooldownReduction = hasGear5;

    if (!hadGear5 && hasGear5) {
      if (Array.isArray(session.actions)) {
        session.actions.forEach(a => {
          if (a && !a.oneUse && a.actionKey !== 33 && a.baseWait !== -1) {
            a.effectiveWait -= 1;
            if (a.charge != null && a.charge > a.effectiveWait) {
              a.charge = a.effectiveWait; // 충전은 새 필요량 상한
            }
          }
        });
      }
    } else if (hadGear5 && !hasGear5) {
      if (Array.isArray(session.actions)) {
        session.actions.forEach(a => {
          if (a && !a.oneUse && a.actionKey !== 33 && a.baseWait !== -1) {
            a.effectiveWait += 1; // 필요량 +1, 충전은 증가시키지 않는다
          }
        });
      }
    }

    hero.gearAppliedBoosts = totalBoosts;
  }

  /**
   * 새 장비 생성 [L2, 교정 20.3]
   */
  function generateNewGear(session, slot) {
    const hero = session ? session.hero : null;
    const flaws = (hero && hero.flaws) || [];
    const mode = session ? session.mode : 'normal';
    const rng = session ? session.rng : null;

    let existingGear = (session && Array.isArray(session.gear)) ? session.gear[slot] : null;
    let boosts = new Array(20).fill(0);

    if (existingGear && Array.isArray(existingGear.boosts)) {
      boosts = [...existingGear.boosts];
      while (boosts.length < 20) boosts.push(0);
    } else {
      if (slot === 0) boosts[0] = 2;
      else if (slot === 1) boosts[11] = 1;
      else if (slot === 2) boosts[11] = flaws.includes(6) ? 1 : 2;
      else if (slot === 3) boosts[11] = 1;
      else if (slot === 4) boosts[10] = mode === 'score' ? 0 : 10;
    }

    if (slot === 0) {
      // 무기: 무기공격+1, 각 양수 부가능력 15% 감소 시 무기공격 추가+1 [L2]
      boosts[0] += 1;
      for (let i = 1; i < 20; i++) {
        if (boosts[i] > 0) {
          if (drawFloat(rng, 'weaponDecay') < 0.15) {
            const dec = getUpgradeDecrease(session, i);
            boosts[i] = Math.max(0, boosts[i] - dec);
            boosts[0] += 1;
          }
        }
      }
    } else if (slot === 1) {
      // 머리: 최대방패+1, 각 양수 부가능력 20% 변동 [L2]
      // 허용되고 아직 증가 없으면 50%로 증가, 그 외 감소·방패추가+1
      boosts[11] += 1;
      let hadIncrease = false;
      for (let i = 0; i < 20; i++) {
        if (i === 11) continue;
        if (boosts[i] > 0) {
          if (drawFloat(rng, 'headFluctuation') < 0.20) {
            const allowed = isUpgradeAllowed(session, i);
            if (allowed && !hadIncrease) {
              if (drawFloat(rng, 'headIncrease') < 0.50) {
                boosts[i] += getUpgradeIncrease(session, i);
                hadIncrease = true;
              } else {
                const dec = getUpgradeDecrease(session, i);
                boosts[i] = Math.max(0, boosts[i] - dec);
                boosts[11] += 1;
              }
            } else {
              const dec = getUpgradeDecrease(session, i);
              boosts[i] = Math.max(0, boosts[i] - dec);
              boosts[11] += 1;
            }
          }
        }
      }
    } else if (slot === 2) {
      // 방패: 20%로 최대방패+2, 그 외 +1 [L2]
      // 후자에서 각 부가능력 10% 감소 시 방패추가+1
      if (drawFloat(rng, 'shieldBase') < 0.20) {
        boosts[11] += 2;
      } else {
        boosts[11] += 1;
        for (let i = 0; i < 20; i++) {
          if (i === 11) continue;
          if (boosts[i] > 0) {
            if (drawFloat(rng, 'shieldDecay') < 0.10) {
              const dec = getUpgradeDecrease(session, i);
              boosts[i] = Math.max(0, boosts[i] - dec);
              boosts[11] += 1;
            }
          }
        }
      }
    } else if (slot === 3) {
      // 몸: 방패+1, 기존 무기공격 70% 감소 시 방패+1 [L2]
      // 다른 부가능력 20% 감소 후 다시 20%면 무기공격+1, 그 외 방패+1
      boosts[11] += 1;
      if (boosts[0] > 0) {
        if (drawFloat(rng, 'bodyWeaponDecay') < 0.70) {
          const dec = getUpgradeDecrease(session, 0);
          boosts[0] = Math.max(0, boosts[0] - dec);
          boosts[11] += 1;
        }
      }
      for (let i = 1; i < 20; i++) {
        if (i === 11) continue;
        if (boosts[i] > 0) {
          if (drawFloat(rng, 'bodyDecay') < 0.20) {
            const dec = getUpgradeDecrease(session, i);
            boosts[i] = Math.max(0, boosts[i] - dec);
            if (drawFloat(rng, 'bodySecond') < 0.20) {
              boosts[0] += 1;
            } else {
              boosts[11] += 1;
            }
          }
        }
      }
    } else if (slot === 4) {
      // [교정 20.3, 교정 30.3] 장신구 새 옵션:
      // 1) 빈 효과 배열에서 시작해 기존 최대HP에 해당 증가량 10의 절반 5(점수모드 0)를 더한 값을 넣는다.
      // 2) 기존 양수 부가능력(10 제외)마다 원본값/감소값을 순서대로 대입한다.
      //    감소가 난 그때마다 장신구 허용풀에서 대기단축(5) 제외 새 능력 1개를 증가시킨다.
      //    앞 효과가 올린 뒤쪽 효과 값은 뒤 복사에서 원본값/감소값으로 덮인다(직접 누적하지 않는다).
      // 3) 이후 별도로 실수 0.5 미만이면 1개 추가, 점수모드는 항상 1개 추가다.
      const origBoosts = boosts;
      const newBoosts = new Array(20).fill(0);
      const hpIncHalf = mode === 'score' ? 0 : Math.floor(getUpgradeIncrease(session, 10) / 2);
      newBoosts[10] = (origBoosts[10] || 0) + hpIncHalf;

      for (let i = 0; i < 20; i++) {
        if (i === 10 || !(origBoosts[i] > 0)) continue;
        if (drawFloat(rng, 'accDecay') < 0.10) {
          const dec = getUpgradeDecrease(session, i);
          newBoosts[i] = Math.max(0, origBoosts[i] - dec);
          const decayCandidates = GEAR_UPGRADE_CANDIDATES[4].filter(b =>
            isUpgradeAllowed(session, b, { cooldownAllowed: false })
          );
          if (decayCandidates.length > 0) {
            const pIdx = drawInt(rng, 0, decayCandidates.length - 1, 'accNewBoost1');
            const bId = decayCandidates[pIdx];
            newBoosts[bId] += getUpgradeIncrease(session, bId);
          }
        } else {
          newBoosts[i] = origBoosts[i];
        }
      }

      // 별도로 실수 0.5 미만이면 1개 추가, 점수모드는 항상 1개 추가 [교정 20.3, 교정 23.4]
      if (mode === 'score' || drawFloat(rng, 'accSecond') < 0.50) {
        const extraCandidates = GEAR_UPGRADE_CANDIDATES[4].filter(b =>
          isUpgradeAllowed(session, b, { cooldownAllowed: newBoosts[5] === 0, currentBoosts: newBoosts })
        );
        if (extraCandidates.length > 0) {
          const pIdx2 = drawInt(rng, 0, extraCandidates.length - 1, 'accNewBoost2');
          const bId2 = extraCandidates[pIdx2];
          newBoosts[bId2] += getUpgradeIncrease(session, bId2);
        }
      }

      boosts = newBoosts;
    }

    return {
      slot,
      ownLook: (existingGear && existingGear.ownLook != null) ? existingGear.ownLook : slot,
      boosts
    };
  }

  /**
   * 상점 스킬 대체 후보 필터링 헬퍼 [L1, 교정 20.4]
   * 공유해제됨 · 현재대상조건충족 · 33제외 · 점수모드24제외 · 기존 보유후보 문턱 0.1 분기 유지
   */
  function getShopSkillCandidates(session, rawPool = null, options = {}) {
    const mode = session ? (session.mode || 'normal') : 'normal';
    const profOrGrowths = session ? (session.profile || session.classGrowths || null) : null;
    const ownedKeys = (session && Array.isArray(session.actions)) ? session.actions.map(a => a.actionKey) : [];
    const excludeOwned = options.excludeOwned != null ? Boolean(options.excludeOwned) : false;

    let sourceList = [];
    if (Array.isArray(rawPool)) {
      sourceList = [...rawPool];
    } else if (session && Array.isArray(session.shopSkillCandidates)) {
      sourceList = [...session.shopSkillCandidates];
    } else {
      for (let k = 0; k <= 41; k++) sourceList.push(k);
    }

    const valid = [];
    for (const k of sourceList) {
      if (k === 33) continue;
      if (mode === 'score' && k === 24) continue;
      if (!isSharedSkillUnlocked(k, profOrGrowths)) continue;
      const def = SKILL_DEFINITIONS[k];
      if (!def || (typeof def.hasTarget === 'function' && !def.hasTarget(session))) continue;
      if (excludeOwned && ownedKeys.includes(k)) continue;
      valid.push(k);
    }
    return valid;
  }

  /**
   * 상점 선택지 생성 [L1, 교정 20.4]
   * 5부위 중 중복 없이 3부위를 선택해 기존 장비 기반 새 옵션을 만든다.
   * 일반 실수 추첨 < 0.25, 종족 3은 < 0.5면 무작위 한 칸(0~2)을 스킬로 대체한다.
   * 대체 스킬은 공유해제됨·현재대상조건충족·33제외·점수모드24제외를 모두 적용하고,
   * 별도 실수 추첨이 0.1 이상이면 보유 스킬도 제외한다.
   */
  function generateShopChoice(session, overrideSlots = null, options = {}) {
    const rng = session ? session.rng : null;
    const hero = session ? session.hero : null;
    const raceKey = (hero && hero.raceKey != null) ? hero.raceKey : 0;

    let slots = [];
    if (Array.isArray(overrideSlots) && overrideSlots.length === 3) {
      slots = [...overrideSlots];
    } else {
      slots = pickRandomUpToN(rng, [0, 1, 2, 3, 4], 3, 'shopSlots');
      while (slots.length < 3) {
        for (let s = 0; s < 5; s++) {
          if (!slots.includes(s)) {
            slots.push(s);
            if (slots.length === 3) break;
          }
        }
      }
    }

    const replaceThreshold = (raceKey === 3 ? 0.50 : 0.25);
    const replaceRoll = (!rng && Array.isArray(overrideSlots) && !(options && options.candidateSkills))
      ? 1.0
      : drawFloat(rng, 'shopSkillReplace');
    const replaceSlotIdx = (replaceRoll < replaceThreshold) ? drawInt(rng, 0, 2, 'shopReplaceSlot') : -1;

    const rawCandidatePool = (options && (options.candidateSkills || options.skillCandidates || options.skillPool))
      ? (options.candidateSkills || options.skillCandidates || options.skillPool)
      : null;

    const cards = [];
    for (let i = 0; i < 3; i++) {
      const slot = slots[i];
      const newGear = generateNewGear(session, slot);

      if (i === replaceSlotIdx) {
        const excludeOwned = drawFloat(rng, 'shopSkillExcludeOwned') >= 0.10;
        const skillCandidates = getShopSkillCandidates(session, rawCandidatePool, { excludeOwned });

        if (skillCandidates.length > 0) {
          const pickedKey = skillCandidates[drawInt(rng, 0, skillCandidates.length - 1, 'shopSkillPick')];
          const def = SKILL_DEFINITIONS[pickedKey];
          cards.push({
            type: 'skill',
            slot,
            gear: newGear,
            actionKey: pickedKey,
            name: (def && def.name) ? def.name : `스킬 ${pickedKey}`
          });
          continue;
        }
      }

      cards.push({
        type: 'gear',
        slot,
        gear: newGear,
        name: `장비 ${GEAR_SLOT_NAMES[slot] || slot}`
      });
    }

    return {
      type: 'shop',
      id: `shop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      cards,
      picksNeeded: 1,
      picks: []
    };
  }

  /**
   * 장비 강화 선택지 생성 [L3, L4]
   * 메뉴 후보 수는 임시값 3 (U06)
   */
  function generateUpgradeChoice(session, overrideSlots = null) {
    const rng = session ? session.rng : null;
    let slots = [];
    if (Array.isArray(overrideSlots) && overrideSlots.length === 3) {
      slots = [...overrideSlots];
    } else {
      slots = pickRandomUpToN(rng, [0, 1, 2, 3, 4], 3, 'upgradeSlots');
      while (slots.length < 3) {
        for (let s = 0; s < 5; s++) {
          if (!slots.includes(s)) {
            slots.push(s);
            if (slots.length === 3) break;
          }
        }
      }
    }
    slots.sort((a, b) => a - b);

    const cards = [];
    for (const slot of slots) {
      const candidates = (GEAR_UPGRADE_CANDIDATES[slot] || [])
        .filter(b => isUpgradeAllowed(session, b))
        .sort((a, b) => a - b);
      if (candidates.length === 0) {
        // 빈 후보는 임시값: 그 부위 옵션 생략 [L3]
        continue;
      }
      const pickedBoost = candidates[drawInt(rng, 0, candidates.length - 1, 'upgradeBoost')];
      const incAmount = getUpgradeIncrease(session, pickedBoost);
      cards.push({
        type: 'upgrade',
        slot,
        boostId: pickedBoost,
        increaseAmount: incAmount,
        name: `강화 ${GEAR_SLOT_NAMES[slot] || slot} 능${pickedBoost}`
      });
    }

    return {
      type: 'upgrade',
      id: `upgrade_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      cards,
      picksNeeded: 1,
      picks: []
    };
  }

  /**
   * 단일 토큰 도착 시 게이지 반영 및 소수 잔량 처리 [G4, G5]
   */
  function applySingleToken(session, resType, multiplier = 1, extraRate = 0) {
    if (!session || !session.hero) return;

    if (!session.totals) session.totals = { xp: 0, coins: 0, upgrade: 0 };
    if (!session.fractions) session.fractions = { xp: 0, coins: 0, upgrade: 0 };
    if (!Array.isArray(session.waitingChoices)) session.waitingChoices = [];

    const is100Turn = session.mode === 'turn100';

    let tokenScore = 0;
    if (resType === 'xp') {
      tokenScore = 2 + extraRate;
      if (is100Turn) tokenScore *= 2;
    } else if (resType === 'coins' || resType === 'upgrade') {
      let effectiveMult = multiplier;
      if (resType === 'coins' && session.hero && session.hero.activeNow && (session.hero.activeNow.doubleGold || session.hero.activeNow.doubleCoins || session.hero.activeNow.skill17)) {
        effectiveMult = Math.max(effectiveMult, 2);
      }
      tokenScore = (2 + extraRate) * effectiveMult;
      if (is100Turn) tokenScore *= 2;
    }

    const currentFraction = session.fractions[resType] || 0;
    const totalVal = currentFraction + tokenScore;
    const intPart = Math.floor(totalVal);
    const newFraction = totalVal - intPart;

    session.fractions[resType] = Math.round(newFraction * 10000) / 10000;
    session.hero[resType] = (session.hero[resType] || 0) + intPart;

    // [G5] 게이지 100 이상이면 메뉴 큐 추가
    if (session.hero[resType] >= 100) {
      session.totals[resType] = (session.totals[resType] || 0) + 100;
      session.hero[resType] %= 100;

      let choice = null;
      if (resType === 'xp') {
        session.hero.rank = (session.hero.rank || 1) + 1;
        if (session.hero.raceKey === 4) {
          const cap25 = Math.floor((session.hero.lifeCap || 50) * 0.25);
          if ((session.hero.life || 0) < cap25) {
            session.hero.life = cap25;
            emitAchievementProgress(session, 50, 5);
          }
        }
        checkRankAndBuildAchievements(session);
        choice = generateLevelupChoice(session);
      } else if (resType === 'coins') {
        choice = generateShopChoice(session);
      } else if (resType === 'upgrade') {
        choice = generateUpgradeChoice(session);
      }

      // [교정 33.1] 카드가 1장 이상 있을 때만 메뉴 큐에 추가하고 선택 대기로 전환.
      // 카드가 0장이면 메뉴를 열지 않고 선택 대기를 해제해 판이 계속 진행되게 한다(멈춤 방지 안전장치).
      if (choice && Array.isArray(choice.cards) && choice.cards.length > 0) {
        session.waitingChoices.push(choice);
        session.phase = 'choice';
      } else if (session.waitingChoices.length === 0) {
        session.phase = 'input';
      }
    }
  }

  /**
   * 물약 토큰 적용 [G2]
   */
  function applyPotionToken(session, potionForm = 'normal', chosenTargetAction = null) {
    if (!session || !session.hero) return;
    const hero = session.hero;
    const potionMult = (hero.activeNow && (hero.activeNow.doublePotion || hero.activeNow.skill18)) ? 2 : 1;
    const potionPower = (hero.potionPower || 1);

    if (potionForm === 'normal') {
      const heal = potionPower * potionMult;
      hero.life = Math.min(hero.lifeCap || 50, (hero.life || 0) + heal);

      const mortal9Alive = session.cells && session.cells.some(c =>
        !c.erased && c.enemy && c.enemy.enemyKind === 9 && c.enemy.hitPoints > 0 &&
        (c.enemy.isMortalEnemy || hero.raceKey === 1)
      );
      if (!mortal9Alive) {
        hero.poison = 0;
      }
    } else if (potionForm === 'acid') {
      const rawAfterAcid = (hero.life || 0) - potionPower;
      hero.life = Math.max(0, rawAfterAcid);
      if (rawAfterAcid < 0) {
        emitAchievementProgress(session, 37, 100);
      }
      checkHeroSurvival(session);
    } else if (potionForm === 'charge') {
      if (chosenTargetAction) {
        const wait = chosenTargetAction.effectiveWait != null ? chosenTargetAction.effectiveWait : 10;
        chosenTargetAction.charge = Math.min(wait, (chosenTargetAction.charge || 0) + 1);
      }
    }
  }

  /**
   * 방패 토큰 적용 [G3]
   */
  function applyShieldToken(session, shieldMult = 1, extraRate = 0) {
    if (!session || !session.hero) return;
    const hero = session.hero;
    const repairPower = (hero.repairPower || 1);
    let effectiveShieldMult = shieldMult;
    if (hero.activeNow && (hero.activeNow.doubleShield || hero.activeNow.skill19)) {
      effectiveShieldMult = Math.max(effectiveShieldMult, 2);
    }

    const hasEnemy12 = session.cells && session.cells.some(c =>
      !c.erased && c.enemy && c.enemy.enemyKind === 12 && c.enemy.hitPoints > 0
    );

    if (hero.shield < hero.shieldCap && !hasEnemy12) {
      const repairAmount = repairPower * effectiveShieldMult;
      hero.shield = Math.min(hero.shieldCap, hero.shield + repairAmount);
    } else {
      applySingleToken(session, 'upgrade', effectiveShieldMult, extraRate);
    }
  }

  /**
   * 수집 묶음 카운터 및 중복 방지 상태 생성 [교정 17.1, 교정 26.1]
   * 연결 입력·독립 스킬 수집·가시·자해·불·독·종족7·적10 자폭 이탈이 각자 수집 묶음을 시작할 때 다섯 카운터를 0으로 초기화한다.
   */
  function createCollectionBatch() {
    return {
      counters: { potion: 0, xp: 0, coins: 0, shield: 0, sword: 0 },
      processedCells: new Set(),
      preErasedCells: new Set(),
      deferredExplosionCells: [],
      handledExplosionCells: [],
      deferredLoopCells: [],
      killedEnemyCells: [],
      deferTokenApply: false,
      pendingTokens: []
    };
  }

  /**
   * 토큰 적용 지연 또는 즉시 실행 헬퍼 [교정 26.1]
   */
  function queueOrApplyToken(session, batch, applyFn) {
    if (batch && batch.deferTokenApply) {
      batch.pendingTokens.push(applyFn);
    } else {
      applyFn();
    }
  }

  /**
   * 종류별 4번째부터 보너스 토큰 추첨 [G1, 교정 17.1, 17.2]
   */
  function rollBonusForKind(session, kindKey, seq, preferredTag = 'bonusToken') {
    if (!session || seq < 4) return 0;
    const hero = session.hero || {};
    const perks = Array.isArray(hero.perks) ? hero.perks : [];
    const bonusOdds = hero.bonusOdds || {};
    let odds = 20;
    if (kindKey === 'coins' || kindKey === 'coin') {
      if (bonusOdds.coins != null) odds = bonusOdds.coins;
      else if (bonusOdds.coin != null) odds = bonusOdds.coin;
    } else if (bonusOdds[kindKey] != null) {
      odds = bonusOdds[kindKey];
    }
    // [교정 30.2] 퍽 2가 있고 수집 순번이 9를 넘은 뒤 확률을 100으로 올려도 보너스 난수 1~100을 한 번 더 뽑고 추가 토큰을 준다
    if (seq >= 10 && perks.includes(2)) {
      odds = 100;
    }

    let tag = preferredTag;
    if (typeof session.rng === 'function' && !session.rng._isBuiltIn) {
      const fnStr = Function.prototype.toString.call(session.rng);
      if (fnStr.includes('bonusOdds') && !fnStr.includes('bonusToken')) {
        tag = 'bonusOdds';
      } else if (fnStr.includes('bonusToken') && !fnStr.includes('bonusOdds')) {
        tag = 'bonusToken';
      }
    }
    const roll = drawInt(session.rng, 1, 100, tag);
    if (odds >= 100) return 1;
    if (odds <= 0) return 0;
    return roll <= odds ? 1 : 0;
  }

  /**
   * 일반 적 / 특수 적 처치 및 보상 수집 일원화 [J1~J3, 교정 17.1~17.3]
   */
  function rewardKillEnemy(session, cell, batch = null, options = {}) {
    if (!session || !cell || !cell.enemy) return { rewarded: false, tokens: 0 };
    const activeBatch = batch || createCollectionBatch();
    const cellId = cell.cellKey || cell;
    if (activeBatch.processedCells.has(cell) || activeBatch.processedCells.has(cellId)) {
      return { rewarded: false, tokens: 0 };
    }
    if (cell.enemy._rewardedKill) {
      return { rewarded: false, tokens: 0 };
    }
    const isAllowedPreErased = Boolean(
      options.allowPreErased ||
      (activeBatch.preErasedCells && (activeBatch.preErasedCells.has(cell) || activeBatch.preErasedCells.has(cellId)))
    );
    if (cell.erased && !isAllowedPreErased) {
      return { rewarded: false, tokens: 0 };
    }

    activeBatch.processedCells.add(cell);
    activeBatch.processedCells.add(cellId);
    cell.enemy._rewardedKill = true;
    cell.erased = true;
    cell.enemy.hitPoints = 0;
    if (Array.isArray(activeBatch.killedEnemyCells)) {
      activeBatch.killedEnemyCells.push(cell);
    }

    const eKind = cell.enemy.enemyKind || 0;
    const extraRates = getExtraRates(session);

    if (eKind === 0) {
      activeBatch.counters.xp = (activeBatch.counters.xp || 0) + 1;
      const seq = activeBatch.counters.xp;
      const bonus = rollBonusForKind(session, 'xp', seq, options.preferredTag || 'bonusToken');
      const tokenCount = 1 + bonus;
      for (let t = 0; t < tokenCount; t++) {
        queueOrApplyToken(session, activeBatch, () => {
          applySingleToken(session, 'xp', 1, extraRates.xp);
        });
      }
      return { rewarded: true, enemyKind: 0, tokens: tokenCount };
    } else {
      // 특수 적 처치: 15~25 특수 보상 분배와 종족·직업·업적 후속 효과를 정확히 한 번 실행 [J1~J3, 교정 17.2, 17.3, 교정 18.1]
      if (!options.skipSpecialEffects) {
        if (eKind === 10 && !cell.enemy._exploded10 && !options.skipExplosion) {
          cell.enemy._exploded10 = true;
          triggerEnemy10Explosion(session, cell, activeBatch);
        }
      }

      const bounty = distributeSpecialEnemyBounty(session, eKind, null, null, null, activeBatch);
      session.specialKills = (session.specialKills || 0) + 1;

      // 종족 9: 특수 적 처치 시 보유 스킬 중 무작위 1개 즉시 완충 [M4 R09, J3, 교정 21.2, 교정 27.6]
      // 뽑힌 모든 보유 스킬에 필요량만큼 충전을 쓴다. 1회용·기본 대기 -1 같은 예외 제외는 없앤다.
      if (session.hero && session.hero.raceKey === 9 && Array.isArray(session.actions) && session.actions.length > 0) {
        const idx = drawInt(session.rng, 0, session.actions.length - 1, 'race9SkillCharge');
        const targetAct = session.actions[idx];
        if (targetAct) {
          const wait = targetAct.effectiveWait != null
            ? targetAct.effectiveWait
            : (targetAct.baseWait != null ? targetAct.baseWait : (targetAct.cooldown != null ? targetAct.cooldown : 10));
          targetAct.charge = wait;
        }
        emitAchievementProgress(session, 55, 2);
      }

      // 직업 보상 진행도 갱신 [M6, J3, 교정 21.4]
      if (!options.skipClassReward) {
        triggerClassRewardProgress(session, eKind, cell);
      }

      // 업적 사건 [N1, J3, 교정 22.1]
      emitAchievementProgress(session, 46, 1);
      if (eKind === 3) {
        emitAchievementProgress(session, 44, 100);
      }
      if (eKind === 14 && (cell.enemy.isMortalEnemy || (session.hero && session.hero.raceKey === 2))) {
        emitAchievementProgress(session, 42, 100);
      }

      return { rewarded: true, enemyKind: eKind, bounty, tokens: bounty ? bounty.total : 0 };
    }
  }

  /**
   * 단일 칸의 묶음 수집 처리 [G1~G5, 교정 17.1~17.6]
   */
  function collectCellInBatch(session, cell, batch = null, options = {}) {
    if (!session || !cell) return { collected: false, tokens: 0 };
    const activeBatch = batch || createCollectionBatch();
    const cellId = cell.cellKey || cell;
    if (activeBatch.processedCells.has(cell) || activeBatch.processedCells.has(cellId)) {
      return { collected: false, tokens: 0 };
    }
    const isAllowedPreErased = Boolean(
      options.allowPreErased ||
      (activeBatch.preErasedCells && (activeBatch.preErasedCells.has(cell) || activeBatch.preErasedCells.has(cellId)))
    );
    if (cell.erased && !isAllowedPreErased) {
      return { collected: false, tokens: 0 };
    }

    const extraRates = getExtraRates(session);
    const hero = session.hero || {};
    const goldMult = (hero.activeNow && (hero.activeNow.doubleGold || hero.activeNow.doubleCoins || hero.activeNow.skill17)) ? 2 : 1;
    const shieldMult = (hero.activeNow && (hero.activeNow.doubleShield || hero.activeNow.skill19)) ? 2 : 1;
    const preferredTag = options.preferredTag || 'bonusToken';

    // 1) 코인 체인에 포함된 32번 변환 상태(shellState === 1) 특수 처리 [I0 E32]
    if (options.chainKind === 'coin' && (cell.kind === KIND_ENEMY || cell.kindCode === 1) && cell.enemy && cell.enemy.enemyKind === 32 && cell.enemy.shellState === 1) {
      activeBatch.processedCells.add(cell);
      activeBatch.processedCells.add(cellId);
      cell.erased = true;
      activeBatch.counters.coins = (activeBatch.counters.coins || 0) + 1;
      const seq = activeBatch.counters.coins;
      const tokenCount = 1 + rollBonusForKind(session, 'coins', seq, preferredTag);
      for (let t = 0; t < tokenCount; t++) {
        queueOrApplyToken(session, activeBatch, () => {
          applySingleToken(session, 'coins', goldMult, extraRates.coins);
        });
      }
      if (!cell.enemy._rewardedKill) {
        cell.enemy._rewardedKill = true;
        session.specialKills = (session.specialKills || 0) + 1;
        distributeSpecialEnemyBounty(session, 32, null, null, null, activeBatch);
        if (session.hero && session.hero.raceKey === 9 && Array.isArray(session.actions) && session.actions.length > 0) {
          const idx = drawInt(session.rng, 0, session.actions.length - 1, 'race9SkillCharge');
          const targetAct = session.actions[idx];
          if (targetAct) {
            const wait = targetAct.effectiveWait != null
              ? targetAct.effectiveWait
              : (targetAct.baseWait != null ? targetAct.baseWait : (targetAct.cooldown != null ? targetAct.cooldown : 10));
            targetAct.charge = wait;
          }
          emitAchievementProgress(session, 55, 2);
        }
        triggerClassRewardProgress(session, 32, cell);
        emitAchievementProgress(session, 46, 1);
      }
      return { collected: true, tokens: tokenCount, special32: true };
    }

    // 2) 적 칸 (일반 적 범위/보상 수집 또는 처치)
    if (cell.kind === KIND_ENEMY || cell.kindCode === 1) {
      if (cell.enemy && cell.enemy.enemyKind > 0 && !options.allowSpecialEnemy) {
        return { collected: false, tokens: 0 };
      }
      if (!cell.enemy) {
        cell.enemy = { enemyKind: 0, hitPoints: 0, guard: 0, strike: 1, poisonSteps: [0, 0, 0] };
      }
      // [교정 31.1] 범위·고리·폭발 등 단순/연쇄 수집 처치는 실제 공격 처치가 아니므로 killLedger에 세지 않는다
      if (options.countAsAttackKill) {
        session.killLedger = (session.killLedger || 0) + 1;
      }
      const killRes = rewardKillEnemy(session, cell, activeBatch, {
        allowPreErased: true,
        preferredTag
      });
      return { collected: killRes.rewarded, tokens: killRes.tokens };
    }

    // 비적 칸(물약·방패·코인·칼) 처리
    activeBatch.processedCells.add(cell);
    activeBatch.processedCells.add(cellId);
    cell.erased = true;

    // 3) 물약 칸
    if (cell.kind === KIND_POTION || cell.kindCode === 0) {
      // 스킬 9 (물약학습): 정상 물약을 경험치 카운터·경험치 보너스 확률로 수집 [교정 17.5]
      if (options.forcePotionAsXp) {
        activeBatch.counters.xp = (activeBatch.counters.xp || 0) + 1;
        const seq = activeBatch.counters.xp;
        if (cell.broken) {
          emitAchievementProgress(session, 73, 1);
          return { collected: true, tokens: 0 };
        }
        const tokenCount = 1 + rollBonusForKind(session, 'xp', seq, preferredTag);
        for (let t = 0; t < tokenCount; t++) {
          queueOrApplyToken(session, activeBatch, () => {
            applySingleToken(session, 'xp', 1, extraRates.xp);
          });
        }
        return { collected: true, tokens: tokenCount };
      }

      // 스킬 11 / 28 산성 물약 무효과 제거 [교정 17.5]
      if (options.ignoreAcid && cell.potionForm === 'acid') {
        return { collected: true, tokens: 0, ignoredAcid: true };
      }

      // 물약 카운터 먼저 증가 [교정 17.2]
      activeBatch.counters.potion = (activeBatch.counters.potion || 0) + 1;
      const seq = activeBatch.counters.potion;

      if (cell.broken) {
        emitAchievementProgress(session, 73, 1);
        return { collected: true, tokens: 0 };
      }

      const pForm = cell.potionForm || 'normal';
      if (pForm === 'bomb') {
        // 폭발 물약은 물약 카운터를 올리고 주변 8칸 연쇄 수집만 일으키며 일반 물약 토큰은 0 [교정 17.2]
        cell._potionCounted = true;
        triggerBombPotion(session, cell, activeBatch);
        return { collected: true, tokens: 0, bombTriggered: true };
      }

      if (pForm !== 'normal') {
        // 다른 특수 물약(산성·충전): 기본 1토큰의 자기 효과만 적용하고 보너스 토큰 추첨은 하지 않는다 [교정 17.2]
        let targetAction = null;
        if (pForm === 'charge') {
          const candidates = (session.actions || []).filter(a =>
            a && a.actionKey !== 29 && !a.oneUse && a.baseWait !== -1 &&
            (a.charge || 0) < (a.effectiveWait != null ? a.effectiveWait : 10)
          );
          if (candidates.length > 0) {
            const idx = drawInt(session.rng, 0, candidates.length - 1, 'chargeTarget');
            targetAction = candidates[idx];
          }
        }
        queueOrApplyToken(session, activeBatch, () => {
          applyPotionToken(session, pForm, targetAction);
        });
        return { collected: true, tokens: 1 };
      }

      const tokenCount = 1 + rollBonusForKind(session, 'potion', seq, preferredTag);
      for (let t = 0; t < tokenCount; t++) {
        queueOrApplyToken(session, activeBatch, () => {
          applyPotionToken(session, 'normal');
        });
      }
      return { collected: true, tokens: tokenCount };
    }

    // 4) 방패 칸
    if (cell.kind === KIND_SHIELD || cell.kindCode === 3) {
      // 파손 칸은 해당 종류 카운터만 먼저 올리고 판에서 지우되, 기본 토큰과 보너스 토큰은 모두 0 [교정 17.2, 17.5]
      activeBatch.counters.shield = (activeBatch.counters.shield || 0) + 1;
      const seq = activeBatch.counters.shield;
      if (cell.broken) {
        emitAchievementProgress(session, 73, 1);
        return { collected: true, tokens: 0 };
      }
      const tokenCount = 1 + rollBonusForKind(session, 'shield', seq, preferredTag);
      for (let t = 0; t < tokenCount; t++) {
        queueOrApplyToken(session, activeBatch, () => {
          applyShieldToken(session, shieldMult, extraRates.upgrade);
        });
      }
      return { collected: true, tokens: tokenCount };
    }

    // 5) 코인 칸
    if (cell.kind === KIND_COIN || cell.kindCode === 2) {
      activeBatch.counters.coins = (activeBatch.counters.coins || 0) + 1;
      const seq = activeBatch.counters.coins;
      if (cell.broken) {
        emitAchievementProgress(session, 73, 1);
        return { collected: true, tokens: 0 };
      }
      const tokenCount = 1 + rollBonusForKind(session, 'coins', seq, preferredTag);
      for (let t = 0; t < tokenCount; t++) {
        queueOrApplyToken(session, activeBatch, () => {
          applySingleToken(session, 'coins', goldMult, extraRates.coins);
        });
      }
      return { collected: true, tokens: tokenCount };
    }

    // 6) 칼 칸
    if (cell.kind === KIND_SWORD || cell.kindCode === 4) {
      activeBatch.counters.sword = (activeBatch.counters.sword || 0) + 1;
      if (cell.broken) {
        emitAchievementProgress(session, 73, 1);
      }
      return { collected: true, tokens: 0 };
    }

    return { collected: true, tokens: 0 };
  }

  /**
   * 스킬 범위 수집 공통 처리 [교정 17.1, 17.5, 17.6]
   * 독립 스킬 수집은 새 수집 묶음(다섯 종류 카운터 0)을 시작하고,
   * 같은 묶음 안의 연쇄(폭발 물약 등)는 같은 카운터를 공유한다.
   * 모든 칸은 종류별 카운터·기본토큰·4번째부터 보너스(collectCellInBatch)로 처리한다.
   * 중복 처리된 칸은 카운터·보상·부수효과를 다시 만들지 않는다.
   */
  function collectSkillArea(session, cells, options = {}) {
    const batch = options.batch || createCollectionBatch();
    let tokens = 0;
    for (const c of cells) {
      if (!c) continue;
      const res = collectCellInBatch(session, c, batch, options.cellOptions || {});
      if (res && res.tokens) tokens += res.tokens;
    }
    return { batch, tokens };
  }

  /**
   * 폭발 물약 주변 8칸 공통 수집 연쇄 [G2, J3, 교정 17.1, 17.2]
   */
  function triggerBombPotion(session, bombCell, batch = null) {
    if (!session || !bombCell) return;
    const activeBatch = batch || createCollectionBatch();
    const bombId = bombCell.cellKey || bombCell;
    activeBatch.processedCells.add(bombCell);
    activeBatch.processedCells.add(bombId);
    bombCell.erased = true;
    if (!bombCell._potionCounted) {
      bombCell._potionCounted = true;
      activeBatch.counters.potion = (activeBatch.counters.potion || 0) + 1;
    }

    const bx = bombCell.x;
    const by = bombCell.y;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = bx + dx;
        const ny = by + dy;
        if (nx >= 0 && nx < BOARD_WIDTH && ny >= 0 && ny < BOARD_HEIGHT) {
          const neighbor = getCell(session, nx, ny);
          if (neighbor && !neighbor.erased) {
            if (neighbor.enemy && neighbor.enemy.enemyKind > 0) {
              continue; // 특수적 제외
            }
            collectCellInBatch(session, neighbor, activeBatch);
          }
        }
      }
    }
  }

  /**
   * 특수 적 처치 보상 토큰 분배 [J1, J2, J3, 교정 26.1]
   */
  function distributeSpecialEnemyBounty(session, enemyKind, overrideTotal = null, overrideCoin = null, overrideFirst = null, batch = null) {
    const rng = session.rng;
    const total = overrideTotal != null ? overrideTotal : drawInt(rng, 15, 25, 'specialBountyTotal');
    const extraRates = getExtraRates(session);
    const goldMult = (session.hero && session.hero.activeNow && (session.hero.activeNow.doubleGold || session.hero.activeNow.skill17)) ? 2 : 1;
    const shieldMult = (session.hero && session.hero.activeNow && (session.hero.activeNow.doubleShield || session.hero.activeNow.skill19)) ? 2 : 1;

    let potionTokens = 0;
    let shieldTokens = 0;
    let coinTokens = 0;
    let xpTokens = 0;

    if (enemyKind === 3) {
      coinTokens = total;
      xpTokens = 0;
    } else if (enemyKind === 13) {
      const low = Math.floor(total * 1/2);
      const high = Math.floor(total * 3/4);
      coinTokens = overrideCoin != null ? overrideCoin : drawInt(rng, low, high, 'specialBountyCoin');
      xpTokens = total - coinTokens;
    } else if (enemyKind === 4) {
      const pLow = Math.floor(total * 1/4);
      const pHigh = Math.floor(total * 1/3);
      potionTokens = overrideFirst != null ? overrideFirst : drawInt(rng, pLow, pHigh, 'specialBountyPotion');
      const rem = total - potionTokens;
      const cLow = Math.floor(rem * 1/4);
      const cHigh = Math.floor(rem * 3/4);
      coinTokens = overrideCoin != null ? overrideCoin : drawInt(rng, cLow, cHigh, 'specialBountyCoin');
      xpTokens = rem - coinTokens;
    } else if (enemyKind === 27) {
      const sLow = Math.floor(total * 1/4);
      const sHigh = Math.floor(total * 1/3);
      shieldTokens = overrideFirst != null ? overrideFirst : drawInt(rng, sLow, sHigh, 'specialBountyShield');
      const rem = total - shieldTokens;
      const cLow = Math.floor(rem * 1/4);
      const cHigh = Math.floor(rem * 3/4);
      coinTokens = overrideCoin != null ? overrideCoin : drawInt(rng, cLow, cHigh, 'specialBountyCoin');
      xpTokens = rem - coinTokens;
    } else {
      const cLow = Math.floor(total * 1/3);
      const cHigh = Math.floor(total * 3/4);
      coinTokens = overrideCoin != null ? overrideCoin : drawInt(rng, cLow, cHigh, 'specialBountyCoin');
      xpTokens = total - coinTokens;
    }

    for (let i = 0; i < potionTokens; i++) {
      queueOrApplyToken(session, batch, () => {
        applyPotionToken(session, 'normal');
      });
    }
    for (let i = 0; i < shieldTokens; i++) {
      queueOrApplyToken(session, batch, () => {
        applyShieldToken(session, shieldMult, extraRates.upgrade);
      });
    }
    for (let i = 0; i < coinTokens; i++) {
      queueOrApplyToken(session, batch, () => {
        applySingleToken(session, 'coins', goldMult, extraRates.coins);
      });
    }
    for (let i = 0; i < xpTokens; i++) {
      queueOrApplyToken(session, batch, () => {
        applySingleToken(session, 'xp', 1, extraRates.xp);
      });
    }

    return {
      total,
      potionTokens,
      shieldTokens,
      coinTokens,
      xpTokens
    };
  }

  /**
   * 자원 토큰 도착 및 메뉴 발생 (2단계) [F2, G1~G5, J1~J3, 교정 15.3, 교정 17.1~17.3]
   */
  function applyResourceCollection(session, chainKind, path, combatSummary = null, waypoints = [], batch = null) {
    if (!session || !session.hero) return;

    const activeBatch = batch || createCollectionBatch();

    // 결함 2: 길이 3의 비적 수집 보상만 0 [G1]
    const isCombatOrEnemyChain = (chainKind === 'combat' || chainKind === 'enemy' || chainKind === 'xp');
    const isFlaw2ZeroReward = (
      Array.isArray(path) && path.length === 3 &&
      !isCombatOrEnemyChain &&
      session.hero.flaws && session.hero.flaws.includes(2)
    );

    // 1) 경로 칸 수집에 의한 토큰 처리
    if (Array.isArray(path) && !isFlaw2ZeroReward) {
      const waypointSet = new Set(waypoints);
      for (let i = 0; i < path.length; i++) {
        if (waypointSet.has(i)) {
          // 경유 칸은 유효 연결 길이·공격·일반 수집에서 제외 [교정 15.3]
          continue;
        }
        const p = path[i];
        const cell = (p && typeof p === 'object' && p.kind) ? p : getCell(session, p.x, p.y);
        if (!cell) continue;

        if (isCombatOrEnemyChain) {
          // combatSummary가 함께 주어진 정식 전투 정산에서는 아래 2)에서 실제 처치된 적만 보상 처리하고,
          // combatSummary 없이 직접 applyResourceCollection(session, 'enemy'|'xp'|'combat', path)를 호출한 경우에는 경로의 적/칼을 수집한다.
          if (combatSummary && Array.isArray(combatSummary.combatResults)) {
            if (cell.kind === KIND_SWORD || cell.kindCode === 4) {
              collectCellInBatch(session, cell, activeBatch, { allowPreErased: true, chainKind });
            }
            continue;
          }
        }

        collectCellInBatch(session, cell, activeBatch, { allowPreErased: true, chainKind });
      }
    }

    // 2) 전투 처치 적 보상 처리 [J1, J2, 교정 17.1~17.3]
    if (combatSummary && Array.isArray(combatSummary.combatResults)) {
      for (const res of combatSummary.combatResults) {
        if (res.killed && res.cell && res.cell.enemy) {
          rewardKillEnemy(session, res.cell, activeBatch, {
            allowPreErased: true,
            skipExplosion: true
          });
        }
      }
    }

    // 3) 적 10 폭발 연쇄 수집 칸 처리 [교정 17.1, 17.7]
    if (activeBatch.deferredExplosionCells && activeBatch.deferredExplosionCells.length > 0) {
      const pendingExp = [...activeBatch.deferredExplosionCells];
      activeBatch.handledExplosionCells = (activeBatch.handledExplosionCells || []).concat(pendingExp);
      activeBatch.deferredExplosionCells.length = 0;
      for (const expCell of pendingExp) {
        collectCellInBatch(session, expCell, activeBatch, { allowPreErased: true, skipKillLedger: true });
      }
    }

    // 4) 스킬 35 고리 내부 수집 칸 처리 [교정 17.1]
    if (activeBatch.deferredLoopCells && activeBatch.deferredLoopCells.length > 0) {
      const pendingLoop = [...activeBatch.deferredLoopCells];
      activeBatch.deferredLoopCells.length = 0;
      for (const loopCell of pendingLoop) {
        collectCellInBatch(session, loopCell, activeBatch, { allowPreErased: true, skipKillLedger: true });
      }
    }
  }

  /**
   * 캐릭터 고유 기본공격 계산 (장비 기본공격 제외) [교정 21.2]
   */
  function getHeroInnateBaseStrike(session) {
    if (!session || !session.hero) return 3;
    const hero = session.hero;
    let gearAtk = 0;
    if (Array.isArray(session.gear)) {
      for (const g of session.gear) {
        if (!g) continue;
        if (Array.isArray(g.boosts)) {
          gearAtk += (g.boosts[1] || 0) + (g.boosts[8] || 0);
        }
        if (typeof g.baseStrike === 'number') gearAtk += g.baseStrike;
        else if (typeof g.baseAttack === 'number') gearAtk += g.baseAttack;
        else if (typeof g.baseAtk === 'number') gearAtk += g.baseAtk;
      }
    } else if (session.gear && typeof session.gear === 'object') {
      for (const g of Object.values(session.gear)) {
        if (!g || typeof g !== 'object') continue;
        if (Array.isArray(g.boosts)) {
          gearAtk += (g.boosts[1] || 0) + (g.boosts[8] || 0);
        }
        if (typeof g.baseStrike === 'number') gearAtk += g.baseStrike;
        else if (typeof g.baseAttack === 'number') gearAtk += g.baseAttack;
        else if (typeof g.baseAtk === 'number') gearAtk += g.baseAtk;
      }
    }
    if (gearAtk === 0 && typeof hero.gearBaseStrike === 'number' && hero.gearBaseStrike > 0) {
      gearAtk = hero.gearBaseStrike;
    }

    if (typeof hero.innateBaseStrike === 'number') {
      if (typeof hero._calcBaseStrike === 'number' && hero.baseStrike !== hero._calcBaseStrike) {
        if (gearAtk > 0 && hero.baseStrike > gearAtk) {
          return hero.baseStrike - gearAtk;
        }
        return hero.baseStrike;
      }
      return hero.innateBaseStrike;
    }

    const totalBase = hero.baseStrike != null ? hero.baseStrike : 3;
    if (gearAtk > 0 && totalBase > gearAtk) {
      return totalBase - gearAtk;
    }
    return totalBase;
  }

  /**
   * 종족 6 한 입력의 공통 공격 실제 처치 수 >= 15 보너스 반영 [교정 21.1]
   */
  function applyRace6KillBonusIfNeeded(session, combatKills) {
    if (!session || !session.hero || session.hero.raceKey !== 6) return false;
    if ((combatKills || 0) < 15 || session._race6AppliedThisTurn) return false;

    session._race6AppliedThisTurn = true;
    if (Array.isArray(session.gear) && session.gear[0] && Array.isArray(session.gear[0].boosts)) {
      session.gear[0].boosts[11] = (session.gear[0].boosts[11] || 0) + 1;
    } else if (session.gear && session.gear.weapon && Array.isArray(session.gear.weapon.boosts)) {
      session.gear.weapon.boosts[11] = (session.gear.weapon.boosts[11] || 0) + 1;
    }
    recalculateHeroStats(session);
    emitAchievementProgress(session, 52, 10);
    if (session.hero.activeNow && (session.hero.activeNow.skill32 || session.hero.activeNow.coinEnemyConverted)) {
      emitAchievementProgress(session, 57, 100);
    }
    return true;
  }


  /**
   * 닫힌 경로 내부 판정 (행별 홀짝 안쪽 판정 / ray-casting even-odd rule) [K0 S35]
   * 임시값: 자기교차경로는 행별 홀짝안쪽판정, 경계제외 (이유: 모든 교차모양의 내부판정 미확정)
   */
  function isPointInPolygon(px, py, polygon) {
    if (!Array.isArray(polygon) || polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;
      const intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * 경로 확정 (settlePath) [C3, 조각 2, 조각 3, 조각 4, 조각 5, 교정 15.3, 15.7, 교정 17.1~17.4]
   * 3칸 미만의 부족한 줄과 입력 취소는 턴·난수를 소비하지 않는다.
   * 종료된 판은 연결 확정을 거절하고 상태·턴·난수를 소비하지 않는다.
   * 1단계 ~ 12단계 전체 턴 사이클을 실행한다.
   */
  function settlePath(session, path, options = {}) {
    if (!session) {
      return { success: false, reason: 'no_session' };
    }

    // 종료된 판은 연결 확정을 거절하고 상태·턴·난수를 소비하지 않는다 [교정 15.7]
    if (session.phase === 'end') {
      return { success: false, reason: 'game_over', session };
    }

    if (!Array.isArray(path) || path.length === 0) {
      return { success: false, reason: 'cancelled', session };
    }

    const inspection = inspectPath(session, path);
    if (!inspection.canSettle) {
      return { success: false, reason: 'too_short_or_invalid', session };
    }

    const waypoints = inspection.waypoints || [];
    const waypointSet = new Set(waypoints);
    const turnBatch = createCollectionBatch();

    // [교정 16.7, 교정 21.1, 교정 22.3] 연결 확정 직전에 공통 공격 처치 수·첫 낙하 생성 카운터를 0으로 한다
    session.killLedger = 0;
    session._race6AppliedThisTurn = false;
    session._turnSpawnCount = 0;
    session._turnEnemySpawnCount = 0;

    // [교정 21.5] 직업보상 칸 단독 1칸 수집 처리: 수집 뒤에는 낙하·생존·종료·저장을 한 번만 처리한다.
    if (inspection.chainKind === 'reward') {
      const rewardCell = getCell(session, path[0].x, path[0].y);
      if (!rewardCell || !isRewardCell(rewardCell)) {
        return { success: false, reason: 'invalid_reward_cell', session };
      }
      rewardCell.rewardConsumed = true;
      rewardCell.bridgeForm = 'none';
      rewardCell.kind = KIND_COIN;
      rewardCell.kindCode = 2;
      rewardCell.type = KIND_COIN;
      rewardCell.erased = true;

      const rewardResult = collectClassReward(session, options.profile || session.profile, rewardCell);
      commitScoreModeTurnPoints(session);
      applyDropAndRefill(session, true);
      finalizeFirstDropSpawnAchievement(session);
      checkHeroSurvival(session);

      session.events = session.events || [];
      session.events.push({ type: 'save_profile' }, { type: 'save_run' });

      return {
        success: true,
        length: 1,
        chainKind: 'reward',
        rewardResult,
        path: [...path],
        combat: null,
        retaliation: null,
        totalAttack: 0,
        tick: session.tick,
        loopCollected: [],
        session
      };
    }

    // 1단계: 유효 경로 확정 및 공격/수집 처리 [F1, 교정 15.3, 교정 16.2]
    let combatSummary = null;
    let nonCombatFireSum = 0;
    if (inspection.chainKind === 'combat') {
      combatSummary = executeCombatPath(session, path, waypoints, {
        deferRewards: true,
        deferHeroEffects: true,
        batch: turnBatch
      });
    } else {
      for (let i = 0; i < path.length; i++) {
        if (waypointSet.has(i)) {
          // 경유 칸은 판에 남긴다 [교정 15.3]
          continue;
        }
        const cell = getCell(session, path[i].x, path[i].y);
        if (cell) {
          if (cell.firePower > 0 && !cell.fireCollected) {
            nonCombatFireSum += cell.firePower;
            cell.firePower = 0;
            cell.fireCollected = true;
          }
          cell.erased = true;
          turnBatch.preErasedCells.add(cell);
          turnBatch.preErasedCells.add(cell.cellKey || cell);
        }
      }
    }

    // [S35 / 35 고리수집] 이번턴 경로 4칸 이상·처음과 끝이 8방향 인접하면 x1~4·y1~4 안쪽 16칸 중 비경계·내부 비특수칸만 공통수집 [K0 S35, 교정 17.1, 교정 22.2]
    // 임시값: 자기교차경로는 행별 홀짝안쪽판정, 경계제외 (이유: 모든 교차모양의 내부판정 미확정)
    const loopCollected = [];
    if (session.hero && session.hero.activeNow && (session.hero.activeNow.skill35 || session.hero.activeNow.loopCollect)) {
      if (Array.isArray(path) && path.length >= 4) {
        const p0 = path[0];
        const pEnd = path[path.length - 1];
        const isClosedLoop = Math.max(Math.abs(p0.x - pEnd.x), Math.abs(p0.y - pEnd.y)) <= 1;
        if (isClosedLoop) {
          for (let y = 1; y <= 4; y++) {
            for (let x = 1; x <= 4; x++) {
              const c = getCell(session, x, y);
              if (!c || c.erased) continue;
              const isBoundary = path.some(p => p.x === x && p.y === y);
              if (!isBoundary && isPointInPolygon(x, y, path)) {
                if (c.enemy && c.enemy.enemyKind > 0) continue; // 특수적 제외
                loopCollected.push(c);
              }
            }
          }

          for (const c of loopCollected) {
            c.erased = true;
            if (c.kind === KIND_ENEMY || c.kindCode === 1) {
              if (c.enemy) c.enemy.hitPoints = 0;
              // [교정 31.1] 스킬 35 고리 수집 처치는 실제 공격 처치가 아니므로 killLedger에 세지 않는다
            }
            turnBatch.preErasedCells.add(c);
            turnBatch.preErasedCells.add(c.cellKey || c);
            turnBatch.deferredLoopCells.push(c);
          }

          // [교정 22.2] 업적 58: 실제 내부 수집 수가 경유 제외 경로 길이보다 클 때만 100 진행 사건
          if (loopCollected.length > inspection.effectiveLength) {
            emitAchievementProgress(session, 58, 100);
          }
        }
      }
    }

    // 1단계 마무리: 유효 경로 칸 및 처치 보상 수집, 토큰 큐잉 (낙하 전 판 상태에서 실행) [F1, 교정 17.1~17.7, 교정 26.1]
    turnBatch.deferTokenApply = true;
    applyResourceCollection(session, inspection.chainKind, path, combatSummary, waypoints, turnBatch);

    // [교정 26.1] 턴 처리 순서: 한 번의 연결 처리에서 첫 낙하(첫 보충)는 자원 획득 반영과 선택 메뉴 대기보다 앞서 처리한다.
    // 2단계: 첫 낙하·보충 [F2, 교정 22.3, 교정 26.1]
    applyDropAndRefill(session, true);
    finalizeFirstDropSpawnAchievement(session);

    // [교정 16.7, 교정 21.1, 교정 31.1, 교정 31.2]
    // 연결 공격(실제 공격 처치)과 그 첫 낙하가 끝난 직후, 불·반사 처리 전에 생존 21 공격력 증가 및 종족 6 15처치 이상 최대방패 +1을 반영한다.
    const combatKills = session.killLedger || 0;
    if (combatKills > 0) {
      for (const cell of session.cells) {
        if (cell && !cell.erased && cell.enemy && cell.enemy.enemyKind === 21 && cell.enemy.hitPoints > 0) {
          cell.enemy.strike = (cell.enemy.strike || 0) + combatKills;
        }
      }
      applyRace6KillBonusIfNeeded(session, combatKills);
    }
    // 가시·자해·뒤 턴끝 처치는 다음 입력 21 성장 및 종족 6에 이월하지 않는다
    session.killLedger = 0;
    session._race6AppliedThisTurn = false;

    // [교정 26.5, 교정 31.1, 교정 31.2] 스킬 34 처치 적 유효 공격합 회복:
    // 첫 낙하 뒤, 흡혈·수집불·반사 처리보다 앞에서 실제 공격으로 처치한 적들의 유효 공격합만 회복한다.
    // 범위 제거·고리 수집·폭발 연쇄 처치는 세지 않는다.
    let totalKilledEffectiveStrike = 0;
    const processedKilledCells = new Set();
    const addKilledStrike = (cell) => {
      if (!cell || processedKilledCells.has(cell)) return;
      processedKilledCells.add(cell);
      if (cell.cellKey) processedKilledCells.add(cell.cellKey);
      totalKilledEffectiveStrike += getEffectiveEnemyStrike(session, cell);
    };

    if (combatSummary && Array.isArray(combatSummary.combatResults)) {
      for (const cr of combatSummary.combatResults) {
        if (cr.killed && cr.cell && cr.cell.enemy) {
          addKilledStrike(cr.cell);
        }
      }
    }

    let killHeal = 0;
    if (session.hero && session.hero.activeNow && (session.hero.activeNow.skill34 || session.hero.activeNow.healOnKill)) {
      if (totalKilledEffectiveStrike > 0) {
        const oldLife = session.hero.life || 0;
        session.hero.life = Math.min(session.hero.lifeCap || 50, oldLife + totalKilledEffectiveStrike);
        killHeal = session.hero.life - oldLife;
      }
    }
    if (combatSummary) {
      combatSummary.killHeal = killHeal;
    }

    // 흡혈 회복 [교정 16.1, 교정 26.5]
    const vampHeal = (combatSummary && combatSummary.vampHeal) || 0;
    if (vampHeal > 0 && session.hero) {
      session.hero.life = Math.min(session.hero.lifeCap || 50, (session.hero.life || 0) + vampHeal);
    }

    // 수집한 불의 직접 체력 차감 [D6, 교정 16.2, 교정 26.5]
    const fireDamage = (combatSummary ? combatSummary.fireDamage : nonCombatFireSum) || 0;
    if (fireDamage > 0 && session.hero) {
      const rawAfterFire = (session.hero.life || 0) - fireDamage;
      session.hero.life = Math.max(0, rawAfterFire);
      if (rawAfterFire < 0) {
        emitAchievementProgress(session, 35, 100);
      }
      checkHeroSurvival(session);
    }

    // 2번 적 반사 직접 체력 차감 [D6, 교정 16.2, 교정 26.5]
    if (combatSummary && combatSummary.hasEnemy2 && combatSummary.totalAttack > 0 && session.hero && session.phase !== 'end') {
      const reflectedDamage = combatSummary.totalAttack;
      combatSummary.reflectedDamage = reflectedDamage;
      const rawAfterReflect = (session.hero.life || 0) - reflectedDamage;
      session.hero.life = Math.max(0, rawAfterReflect);
      if (rawAfterReflect < 0) {
        emitAchievementProgress(session, 34, 100);
      }
      checkHeroSurvival(session);
    }

    // 3단계: 자원 토큰 도착 순서대로 플레이어 갱신 [F2, G1~G5, J1~J3, 교정 15.3, 교정 17.1~17.3, 교정 26.1]
    turnBatch.deferTokenApply = false;
    if (session.phase !== 'end' && Array.isArray(turnBatch.pendingTokens)) {
      for (const applyFn of turnBatch.pendingTokens) {
        applyFn();
      }
    }
    turnBatch.pendingTokens.length = 0;

    // [교정 22.4] 점수 모드 이번 입력 점수 누적 및 0 초기화
    commitScoreModeTurnPoints(session);

    // [교정 33.1] 카드가 0장인 비정상 대기 메뉴를 정리하여 메뉴 멈춤 방지
    cleanWaitingChoices(session);

    // 경계를 넘는 메뉴가 발생해 phase === 'choice' 이고 options.pauseOnChoice !== false 인 경우 일시정지 [F2, 교정 26.1, 교정 26.4]
    const hasChoice = session.waitingChoices && session.waitingChoices.length > 0;
    if (hasChoice && options.pauseOnChoice !== false) {
      session._pausedInSettle = true;
      return {
        success: true,
        paused: true,
        phase: session.phase,
        waitingChoices: session.waitingChoices,
        length: path.length,
        chainKind: inspection.chainKind,
        path: [...path],
        combat: combatSummary,
        totalAttack: combatSummary ? combatSummary.totalAttack : 0,
        session
      };
    }

    session._pausedInSettle = false;

    // 4단계: 첫 낙하 뒤 상태로 반격 처리 [F3, 교정 26.3]
    let retaliationResult = null;
    if (session.phase !== 'end' && options.retaliate !== false) {
      retaliationResult = resolveRetaliation(session, options);
    }

    // 5단계: 턴을 1 올리고 종료 확인 [F3]
    session.tick = (session.tick || 0) + 1;
    checkHeroSurvival(session);

    // 6단계 ~ 12단계: 턴 끝 종합 처리 [F4 ~ F8]
    if (session.phase !== 'end') {
      processTurnEnd(session);
    }

    return {
      success: true,
      length: path.length,
      chainKind: inspection.chainKind,
      path: [...path],
      combat: combatSummary,
      retaliation: retaliationResult,
      totalAttack: combatSummary ? combatSummary.totalAttack : 0,
      tick: session.tick,
      loopCollected: loopCollected.map(c => ({ x: c.x, y: c.y, kind: c.kind })),
      session
    };
  }

  /**
   * 중단된 턴 계속 진행 (continueTurn) [교정 26.4]
   * 메뉴 선택 완료 후 중단되었던 연결 처리의 4단계(반격)부터 12단계까지 계속 진행한다.
   */
  function continueTurn(session, options = {}) {
    if (!session) return { success: false, reason: 'no_session' };
    if (session.phase === 'choice' || (session.waitingChoices && session.waitingChoices.length > 0)) {
      return { success: false, reason: 'choices_pending', session };
    }
    if (session.phase === 'end') {
      return { success: false, reason: 'game_over', session };
    }

    session._pausedInSettle = false;

    // 4단계: 반격 처리 [F3, 교정 26.3]
    let retaliationResult = null;
    if (session.phase !== 'end' && options.retaliate !== false) {
      retaliationResult = resolveRetaliation(session, options);
    }

    // 5단계: 턴을 1 올리고 종료 확인 [F3]
    session.tick = (session.tick || 0) + 1;
    checkHeroSurvival(session);

    // 6단계 ~ 12단계: 턴 끝 종합 처리 [F4 ~ F8]
    if (session.phase !== 'end') {
      processTurnEnd(session);
    }

    return {
      success: true,
      resumed: true,
      retaliation: retaliationResult,
      tick: session.tick,
      phase: session.phase,
      session
    };
  }

  // ==========================================
  // [K] 조각 10: 스킬 앞 21종 (0 ~ 20) 및 스킬 실행 엔진
  // ==========================================

  /**
   * 스킬 정의 메타데이터 (0~20 우리 구분명 및 추가 대상조건) [K0, S00 ~ S20]
   */
  const SKILL_DEFINITIONS = {
    0: {
      actionKey: 0,
      name: '공격줍기',
      baseWait: 13,
      hasTarget: (session) => {
        return Boolean(session && session.cells && session.cells.some(c =>
          !c.erased && (c.kind === KIND_ENEMY || c.kindCode === 1) && (!c.enemy || c.enemy.hitPoints > 0)
        ));
      }
    },
    1: {
      actionKey: 1,
      name: '모두얼리기',
      baseWait: 16,
      hasTarget: (session) => {
        return Boolean(session && session.cells && session.cells.some(c =>
          !c.erased && (c.kind === KIND_ENEMY || c.kindCode === 1) && (!c.enemy || c.enemy.hitPoints > 0)
        ));
      }
    },
    2: {
      actionKey: 2,
      name: '회복모으기',
      baseWait: 15,
      hasTarget: (session) => {
        return Boolean(session && session.cells && session.cells.some(c =>
          !c.erased && (c.kind === KIND_POTION || c.kindCode === 0) && (!c.potionForm || c.potionForm === 'normal')
        ));
      }
    },
    3: {
      actionKey: 3,
      name: '방패모으기',
      baseWait: 16,
      hasTarget: (session) => {
        return Boolean(session && session.cells && session.cells.some(c =>
          !c.erased && (c.kind === KIND_SHIELD || c.kindCode === 3)
        ));
      }
    },
    4: {
      actionKey: 4,
      name: '자해유도',
      baseWait: 18,
      hasTarget: (session) => {
        // "적 존재하면 허용, 방어가 높다는 추가 사용 제한 없음."
        return Boolean(session && session.cells && session.cells.some(c =>
          !c.erased && (c.kind === KIND_ENEMY || c.kindCode === 1) && (!c.enemy || c.enemy.hitPoints > 0)
        ));
      }
    },
    5: {
      actionKey: 5,
      name: '무장약화',
      baseWait: 18,
      hasTarget: (session) => {
        return Boolean(session && session.cells && session.cells.some(c =>
          !c.erased && (c.kind === KIND_ENEMY || c.kindCode === 1) && (!c.enemy || c.enemy.enemyKind === 0) && (!c.enemy || c.enemy.hitPoints > 0)
        ));
      }
    },
    6: {
      actionKey: 6,
      name: '칼환전',
      baseWait: 15,
      hasTarget: (session) => {
        return Boolean(session && session.cells && session.cells.some(c =>
          !c.erased && (c.kind === KIND_SWORD || c.kindCode === 4)
        ));
      }
    },
    7: {
      actionKey: 7,
      name: '빈방이동',
      baseWait: 20,
      hasTarget: () => true
    },
    8: {
      actionKey: 8,
      name: '물약기폭',
      baseWait: 18,
      hasTarget: (session) => {
        return Boolean(session && session.cells && session.cells.some(c =>
          !c.erased && (c.kind === KIND_POTION || c.kindCode === 0) && (!c.potionForm || c.potionForm === 'normal')
        ));
      }
    },
    9: {
      actionKey: 9,
      name: '물약학습',
      baseWait: 18,
      hasTarget: (session) => {
        return Boolean(session && session.cells && session.cells.some(c =>
          !c.erased && (c.kind === KIND_POTION || c.kindCode === 0) && (!c.potionForm || c.potionForm === 'normal')
        ));
      }
    },
    10: {
      actionKey: 10,
      name: '강화열기',
      baseWait: 35,
      hasTarget: () => true
    },
    11: {
      actionKey: 11,
      name: '가로쓸기',
      baseWait: 12,
      hasTarget: () => true
    },
    12: {
      actionKey: 12,
      name: '돈모으기',
      baseWait: 18,
      hasTarget: (session) => {
        return Boolean(session && session.cells && session.cells.some(c =>
          !c.erased && (c.kind === KIND_COIN || c.kindCode === 2)
        ));
      }
    },
    13: {
      actionKey: 13,
      name: '칼재활용',
      baseWait: 15,
      hasTarget: (session) => {
        return Boolean(session && session.cells && session.cells.some(c =>
          !c.erased && (c.kind === KIND_SWORD || c.kindCode === 4)
        ));
      }
    },
    14: {
      actionKey: 14,
      name: '적무장해제',
      baseWait: 25,
      hasTarget: (session) => {
        // [교정 24.7] 스킬 14는 특수 번호가 0인 일반 적만 칼로 바꾼다.
        return Boolean(session && session.cells && session.cells.some(c =>
          !c.erased &&
          (c.kind === KIND_ENEMY || c.kindCode === 1) &&
          (!c.enemy || !c.enemy.enemyKind || c.enemy.enemyKind === 0) &&
          (!c.enemy || c.enemy.hitPoints > 0)
        ));
      }
    },
    15: {
      actionKey: 15,
      name: '돈무기화',
      baseWait: 15,
      hasTarget: (session) => {
        return Boolean(session && session.cells && session.cells.some(c =>
          !c.erased && (c.kind === KIND_COIN || c.kindCode === 2)
        ));
      }
    },
    16: {
      actionKey: 16,
      name: '칼증폭',
      baseWait: 14,
      hasTarget: () => true
    },
    17: {
      actionKey: 17,
      name: '돈증폭',
      baseWait: 15,
      hasTarget: () => true
    },
    18: {
      actionKey: 18,
      name: '회복증폭',
      baseWait: 15,
      hasTarget: () => true
    },
    19: {
      actionKey: 19,
      name: '수리증폭',
      baseWait: 15,
      hasTarget: () => true
    },
    20: {
      actionKey: 20,
      name: '특수벗기기',
      baseWait: 18,
      hasTarget: (session) => {
        return Boolean(session && session.cells && session.cells.some(c =>
          !c.erased && (c.kind === KIND_ENEMY || c.kindCode === 1) && c.enemy && c.enemy.enemyKind > 0 && c.enemy.hitPoints > 0
        ));
      }
    },
    21: {
      actionKey: 21,
      name: '특수지우기',
      baseWait: 20,
      hasTarget: (session) => {
        return Boolean(session && session.cells && session.cells.some(c =>
          !c.erased && (c.kind === KIND_ENEMY || c.kindCode === 1) && c.enemy && c.enemy.enemyKind > 0 && c.enemy.hitPoints > 0
        ));
      }
    },
    22: {
      actionKey: 22,
      name: '약한등장',
      baseWait: 18,
      hasTarget: () => true
    },
    23: {
      actionKey: 23,
      name: '위험키우기',
      baseWait: 15,
      hasTarget: (session) => {
        return Boolean(session && session.cells && session.cells.some(c =>
          !c.erased && (c.kind === KIND_ENEMY || c.kindCode === 1) && (!c.enemy || c.enemy.enemyKind === 0) && (!c.enemy || c.enemy.hitPoints > 0)
        ));
      }
    },
    24: {
      actionKey: 24,
      name: '동전방',
      baseWait: 25,
      hasTarget: () => true
    },
    25: {
      actionKey: 25,
      name: '한칼집중',
      baseWait: 14,
      hasTarget: (session) => {
        return Boolean(session && session.cells && session.cells.some(c =>
          !c.erased && (c.kind === KIND_SWORD || c.kindCode === 4) && !c.magicBlade && !c.arrow
        ));
      }
    },
    26: {
      actionKey: 26,
      name: '자리흔들기',
      baseWait: 12,
      hasTarget: () => true
    },
    27: {
      actionKey: 27,
      name: '방패방출',
      baseWait: 16,
      hasTarget: (session) => {
        const hasEnemy = Boolean(session && session.cells && session.cells.some(c =>
          !c.erased && (c.kind === KIND_ENEMY || c.kindCode === 1) && (!c.enemy || c.enemy.hitPoints > 0)
        ));
        const hasShield = Boolean(session && session.hero && session.hero.shield > 0);
        return hasEnemy && hasShield;
      }
    },
    28: {
      actionKey: 28,
      name: '구역쓸기',
      baseWait: 14,
      hasTarget: () => true
    },
    29: {
      actionKey: 29,
      name: '물약충전형',
      baseWait: 20,
      hasTarget: (session) => {
        return Boolean(session && session.cells && session.cells.some(c =>
          !c.erased && (c.kind === KIND_POTION || c.kindCode === 0) && (!c.potionForm || c.potionForm === 'normal')
        ));
      }
    },
    30: {
      actionKey: 30,
      name: '세로무기화',
      baseWait: 24,
      hasTarget: () => true
    },
    31: {
      actionKey: 31,
      name: '칼원거리화',
      baseWait: 15,
      hasTarget: (session) => {
        return Boolean(session && session.cells && session.cells.some(c =>
          !c.erased && (c.kind === KIND_SWORD || c.kindCode === 4) && !c.magicBlade && !c.arrow
        ));
      }
    },
    32: {
      actionKey: 32,
      name: '돈위험화',
      baseWait: 15,
      hasTarget: (session) => {
        return Boolean(session && session.cells && session.cells.some(c =>
          !c.erased && (c.kind === KIND_COIN || c.kindCode === 2)
        ));
      }
    },
    33: {
      actionKey: 33,
      name: '한번쓸기',
      baseWait: -1,
      hasTarget: () => true
    },
    34: {
      actionKey: 34,
      name: '처치회복',
      baseWait: 14,
      hasTarget: (session) => {
        return Boolean(session && session.cells && session.cells.some(c =>
          !c.erased && (c.kind === KIND_ENEMY || c.kindCode === 1) && (!c.enemy || c.enemy.hitPoints > 0)
        ));
      }
    },
    35: {
      actionKey: 35,
      name: '고리수집',
      baseWait: 12,
      hasTarget: () => true
    },
    36: {
      actionKey: 36,
      name: '돈곁정리',
      baseWait: 25,
      hasTarget: (session) => {
        const hasNormalEnemy = Boolean(session && session.cells && session.cells.some(c =>
          !c.erased && (c.kind === KIND_ENEMY || c.kindCode === 1) && (!c.enemy || c.enemy.enemyKind === 0) && (!c.enemy || c.enemy.hitPoints > 0)
        ));
        const hasCoin = Boolean(session && session.cells && session.cells.some(c =>
          !c.erased && (c.kind === KIND_COIN || c.kindCode === 2)
        ));
        return hasNormalEnemy && hasCoin;
      }
    },
    37: {
      actionKey: 37,
      name: '한번살기',
      baseWait: 35,
      hasTarget: () => true
    },
    38: {
      actionKey: 38,
      name: '가장자리쓸기',
      baseWait: 18,
      hasTarget: () => true
    },
    39: {
      actionKey: 39,
      name: '잇는칸',
      baseWait: 16,
      hasTarget: () => true
    },
    40: {
      actionKey: 40,
      name: '윗부분쓸기',
      baseWait: 14,
      hasTarget: () => true
    },
    41: {
      actionKey: 41,
      name: '아랫부분쓸기',
      baseWait: 14,
      hasTarget: () => true
    }
  };

  /**
   * 세션의 액션 목록에서 슬롯 인덱스 또는 actionKey로 액션 찾기
   */
  function findActionInSession(session, actionIndexOrKey) {
    if (!session || !Array.isArray(session.actions)) return null;
    if (typeof actionIndexOrKey === 'number') {
      if (actionIndexOrKey >= 0 && actionIndexOrKey < session.actions.length) {
        return { index: actionIndexOrKey, action: session.actions[actionIndexOrKey] };
      }
      const idx = session.actions.findIndex(a => a && a.actionKey === actionIndexOrKey);
      if (idx !== -1) {
        return { index: idx, action: session.actions[idx] };
      }
    }
    return null;
  }

  /**
   * 스킬 사용 가능 여부 사전 검사 [K0]
   * 보유·준비·세션상태 검사 뒤 추가 대상조건 적용.
   */
  function canTriggerAction(session, actionIndexOrKey) {
    if (!session || !session.hero) {
      return { canUse: false, reason: 'no_session' };
    }

    if (session.phase === 'choice' || session.phase === 'end') {
      return { canUse: false, reason: 'invalid_phase' };
    }

    const found = findActionInSession(session, actionIndexOrKey);
    if (!found || !found.action) {
      return { canUse: false, reason: 'action_not_found' };
    }

    const action = found.action;
    const wait = action.effectiveWait != null
      ? action.effectiveWait
      : (action.baseWait != null ? action.baseWait : (SKILL_BASE_COOLDOWNS[action.actionKey] != null ? SKILL_BASE_COOLDOWNS[action.actionKey] : 15));
    const charge = action.charge != null ? action.charge : 0;
    const isReady = Boolean(action.oneUse || wait < 0 || charge >= wait);
    if (!isReady) {
      return { canUse: false, reason: 'not_charged', charge, needed: wait };
    }

    const def = SKILL_DEFINITIONS[action.actionKey];
    if (def && typeof def.hasTarget === 'function') {
      if (!def.hasTarget(session)) {
        return { canUse: false, reason: 'no_target' };
      }
    }

    return { canUse: true, actionIndex: found.index, action };
  }

  /**
   * 스킬 효과 실행 [K0, S00 ~ S20]
   */
  function executeSkillEffect(session, actionKey, options = {}) {
    const perks = (session.hero && session.hero.perks) || [];
    const flaws = (session.hero && session.hero.flaws) || [];
    const bonusOdds = (session.hero && session.hero.bonusOdds) || { xp: 20, coins: 20, potion: 20, shield: 20 };
    const extraRates = getExtraRates(session);

    session.hero = session.hero || {};
    session.hero.activeNow = session.hero.activeNow || {};
    if (!Array.isArray(session.hero.activeNow._usedSkillsTurn)) {
      session.hero.activeNow._usedSkillsTurn = [];
    }
    if (!session.hero.activeNow._usedSkillsTurn.includes(actionKey)) {
      session.hero.activeNow._usedSkillsTurn.push(actionKey);
    }
    if (actionKey === 11) session.hero.activeNow.skill11Used = true;
    if (actionKey === 28) session.hero.activeNow.skill28Used = true;
    if (actionKey === 38) session.hero.activeNow.skill38Used = true;
    if (actionKey === 33) session.hero.activeNow.skill33Used = true;

    if (
      session.hero.activeNow._usedSkillsTurn.includes(11) &&
      session.hero.activeNow._usedSkillsTurn.includes(28) &&
      session.hero.activeNow._usedSkillsTurn.includes(38) &&
      session.hero.activeNow._usedSkillsTurn.includes(33)
    ) {
      emitAchievementProgress(session, 63, 100);
    }

    if (actionKey === 0) {
      // S00 / 0 (공격줍기): 이번턴 직접연결로 공격한 각 적에서 공격직전 코인토큰 1개 [K0 S00]
      session.hero.activeNow = session.hero.activeNow || {};
      session.hero.activeNow.skill0 = true;
      session.hero.activeNow.coinOnAttack = true;
      return { success: true, actionKey };
    }

    if (actionKey === 1) {
      // S01 / 1 (모두얼리기): 발동시 판의 적을 각각 동결. 특수적도 포함. 발동후 생긴 적을 전역 플래그로 얼리지 않음 [K0 S01]
      let count = 0;
      for (const c of session.cells) {
        if (!c || c.erased) continue;
        if ((c.kind === KIND_ENEMY || c.kindCode === 1) && (!c.enemy || c.enemy.hitPoints > 0)) {
          c.frozen = true;
          count++;
        }
      }
      return { success: true, actionKey, frozenCount: count };
    }

    if (actionKey === 2) {
      // S02 / 2 (회복모으기): 정상물약 전부 수집·공통보너스·회복·해독·낙하 [K0 S02]
      const potionCells = [];
      for (const c of session.cells) {
        if (!c || c.erased) continue;
        if ((c.kind === KIND_POTION || c.kindCode === 0) && (!c.potionForm || c.potionForm === 'normal')) {
          potionCells.push(c);
        }
      }
      let seq = 0;
      for (const c of potionCells) {
        c.erased = true;
        seq++;
        let tokenCount = 1;
        if (seq >= 4) {
          // [교정 30.1, 30.2] 0 확률 보존 및 퍽 2 난수 1회 소비를 rollBonusForKind로 일원화
          tokenCount += rollBonusForKind(session, 'potion', seq, 'bonusOdds');
        }
        for (let t = 0; t < tokenCount; t++) {
          applyPotionToken(session, 'normal');
        }
      }
      applyDropAndRefill(session, false);
      return { success: true, actionKey, collectedCount: potionCells.length };
    }

    if (actionKey === 3) {
      // S03 / 3 (방패모으기): 방패 전부 수집, 파손은 제거만 하고 보상 0. 수리/강화 토큰별 분기 [K0 S03]
      const shieldCells = [];
      for (const c of session.cells) {
        if (!c || c.erased) continue;
        if (c.kind === KIND_SHIELD || c.kindCode === 3) {
          shieldCells.push(c);
        }
      }
      let seq = 0;
      const shieldMult = (session.hero.activeNow && (session.hero.activeNow.doubleShield || session.hero.activeNow.skill19)) ? 2 : 1;
      for (const c of shieldCells) {
        c.erased = true;
        // [교정 17.5] 파손 방패도 방패 순번에 포함한다 (순번을 먼저 올린 뒤 파손이면 보상 0)
        seq++;
        if (c.broken) {
          continue; // 파손은 보상 0 [G1, S03]
        }
        let tokenCount = 1;
        if (seq >= 4) {
          // [교정 30.1, 30.2] 0 확률 보존 및 퍽 2 난수 1회 소비를 rollBonusForKind로 일원화
          tokenCount += rollBonusForKind(session, 'shield', seq, 'bonusOdds');
        }
        for (let t = 0; t < tokenCount; t++) {
          applyShieldToken(session, shieldMult, extraRates.upgrade);
        }
      }
      applyDropAndRefill(session, false);
      return { success: true, actionKey, collectedCount: shieldCells.length };
    }

    if (actionKey === 4) {
      // S04 / 4 (자해유도): 이번 반격 때 각 공격 가능한 적이 자기 공격으로 자신을 공격 [K0 S04]
      session.hero.activeNow = session.hero.activeNow || {};
      session.hero.activeNow.skill4 = true;
      session.hero.activeNow.selfHarm = true;
      return { success: true, actionKey };
    }

    if (actionKey === 5) {
      // S05 / 5 (무장약화): 일반적 방어 0, 공격이 1보다 크면 1. 특수적 제외 [K0 S05]
      let count = 0;
      for (const c of session.cells) {
        if (!c || c.erased) continue;
        if ((c.kind === KIND_ENEMY || c.kindCode === 1) && (!c.enemy || c.enemy.enemyKind === 0)) {
          if (c.enemy) {
            c.enemy.guard = 0;
            if ((c.enemy.strike || 0) > 1) {
              c.enemy.strike = 1;
            }
            count++;
          }
        }
      }
      return { success: true, actionKey, affectedCount: count };
    }

    if (actionKey === 6) {
      // S06 / 6 (칼환전): 화살 제외 칼 전부 코인화. 이전 파손·마법·독·불·얼음·특수속성 초기화 [K0 S06]
      let count = 0;
      for (const c of session.cells) {
        if (!c || c.erased) continue;
        if ((c.kind === KIND_SWORD || c.kindCode === 4) && !c.arrow) {
          morphCellKind(c, KIND_COIN);
          count++;
        }
      }
      return { success: true, actionKey, convertedCount: count };
    }

    if (actionKey === 7) {
      // S07 / 7 (빈방이동): 36칸을 적 없는 4종으로 새로 만듦. 특수적이 있어도 보상 없이 판 교체 [K0 S07]
      const hadSpecial = session.cells && session.cells.some(c =>
        c && !c.erased && c.enemy && c.enemy.enemyKind > 0
      );
      if (hadSpecial) {
        emitAchievementProgress(session, 65, 1);
      }
      const pool = [0, 2, 3, 4]; // 물약0, 코인2, 방패3, 칼4
      for (const c of session.cells) {
        if (!c) continue;
        const pIdx = drawInt(session.rng, 0, 3, 'cellKind');
        const code = pool[pIdx];
        morphCellKind(c, code);
        c.erased = false;
        if (c.kind === KIND_POTION && perks.includes(1)) {
          const roll = drawInt(session.rng, 1, 100, 'potionForm');
          if (roll < 6) c.potionForm = 'charge';
        } else if (c.kind === KIND_SWORD && perks.includes(6)) {
          const roll = drawInt(session.rng, 1, 100, 'arrow');
          if (roll < 6) c.arrow = true;
        } else if (c.kind === KIND_SHIELD && flaws.includes(7)) {
          const roll = drawInt(session.rng, 1, 100, 'broken');
          if (roll < 4) c.broken = true;
        }
      }
      return { success: true, actionKey };
    }

    if (actionKey === 8) {
      // S08 / 8 (물약기폭): 정상 물약 전부 폭발형 [K0 S08]
      let count = 0;
      for (const c of session.cells) {
        if (!c || c.erased) continue;
        if ((c.kind === KIND_POTION || c.kindCode === 0) && (!c.potionForm || c.potionForm === 'normal')) {
          c.potionForm = 'bomb';
          count++;
        }
      }
      return { success: true, actionKey, transformedCount: count };
    }

    if (actionKey === 9) {
      // S09 / 9 (물약학습): 정상 물약 전부 XP 토큰으로 수집, 추가율·수집보너스·메뉴 적용 [K0 S09]
      // [교정 17.5] 정상 물약을 경험치로 지급한다. 카운터와 추가토큰 확률 모두 경험치 기준이고 물약 확률을 쓰지 않는다.
      // 독립 스킬 수집이므로 새 수집 묶음(다섯 카운터 0)을 시작한다.
      const potionCells = [];
      for (const c of session.cells) {
        if (!c || c.erased) continue;
        if ((c.kind === KIND_POTION || c.kindCode === 0) && (!c.potionForm || c.potionForm === 'normal')) {
          potionCells.push(c);
        }
      }
      collectSkillArea(session, potionCells, { cellOptions: { forcePotionAsXp: true } });
      applyDropAndRefill(session, false);
      return { success: true, actionKey, collectedCount: potionCells.length };
    }

    if (actionKey === 10) {
      // S10 / 10 (강화열기): 게이지를 채우는 흉내 없이 즉시 장비 강화 메뉴 1개 [K0 S10, 교정 33.1]
      const choice = generateUpgradeChoice(session);
      session.waitingChoices = session.waitingChoices || [];
      if (choice && Array.isArray(choice.cards) && choice.cards.length > 0) {
        session.waitingChoices.push(choice);
        session.phase = 'choice';
      } else if (session.waitingChoices.length === 0) {
        session.phase = 'input';
      }
      return { success: true, actionKey, choice };
    }

    if (actionKey === 11) {
      // S11 / 11 (가로쓸기): 가로줄 0~5 무작위 1줄 공통수집, 특수적 제외 [K0 S11]
      // 세로변환 30을 같은 턴 썼으면 일반 판 전체 수집으로 조합.
      const hasSkill30 = Boolean(
        session.hero && session.hero.activeNow && (
          session.hero.activeNow.skill30Used || session.hero.activeNow.verticalSweep
        )
      );

      const cellsToCollect = [];
      if (hasSkill30) {
        // 일반 판 전체 수집
        delete session.hero.activeNow.skill30Used;
        delete session.hero.activeNow.verticalSweep;
        for (const c of session.cells) {
          if (!c || c.erased) continue;
          if (c.enemy && c.enemy.enemyKind > 0) continue; // 특수적 제외
          cellsToCollect.push(c);
        }
      } else {
        const rowY = drawInt(session.rng, 0, 5, 'sweepRow');
        session.hero.activeNow = session.hero.activeNow || {};
        session.hero.activeNow.skill11Used = true;
        let normalEnemyCount = 0;
        for (let x = 0; x < BOARD_WIDTH; x++) {
          const c = getCell(session, x, rowY);
          if (!c || c.erased) continue;
          if (c.enemy && c.enemy.enemyKind > 0) continue; // 특수적 제외
          if ((c.kind === KIND_ENEMY || c.kindCode === 1) && (!c.enemy || !c.enemy.enemyKind || c.enemy.enemyKind === 0)) {
            normalEnemyCount++;
          }
          cellsToCollect.push(c);
        }
        if (normalEnemyCount === 6) {
          // A60: 가로수집에서 일반 적 6마리 수집 [교정 25.3]
          emitAchievementProgress(session, 60, 100);
        }
      }

      // [교정 17.5, 17.6] 가로 한 줄은 산성 물약을 무효과로 지운다 (피해·회복·추가토큰 없음).
      // 11/30 조합(일반 판 전체)의 산성 물약은 교정 규칙에 명시가 없어 기존 일반 수집 동작을 유지한다 (자동결정-로그 기록).
      // 모든 칸은 종류별 카운터·기본토큰·보너스(독립 스킬 수집 묶음)로 처리한다.
      collectSkillArea(session, cellsToCollect, { cellOptions: { ignoreAcid: !hasSkill30 } });

      applyDropAndRefill(session, false);
      return { success: true, actionKey, collectedCount: cellsToCollect.length };
    }

    if (actionKey === 12) {
      // S12 / 12 (돈모으기): 코인 전부 공통 수집. 추가율·배가·상점 큐 적용 [K0 S12]
      const coinCells = [];
      for (const c of session.cells) {
        if (!c || c.erased) continue;
        if (c.kind === KIND_COIN || c.kindCode === 2) {
          coinCells.push(c);
        }
      }
      let seq = 0;
      const goldMult = (session.hero.activeNow && (session.hero.activeNow.doubleGold || session.hero.activeNow.skill17)) ? 2 : 1;
      for (const c of coinCells) {
        c.erased = true;
        seq++;
        let tokenCount = 1;
        if (seq >= 4) {
          // [교정 30.1, 30.2] 0 확률 보존 및 퍽 2 난수 1회 소비를 rollBonusForKind로 일원화
          tokenCount += rollBonusForKind(session, 'coins', seq, 'bonusOdds');
        }
        for (let t = 0; t < tokenCount; t++) {
          applySingleToken(session, 'coins', goldMult, extraRates.coins);
        }
      }
      applyDropAndRefill(session, false);
      return { success: true, actionKey, collectedCount: coinCells.length };
    }

    if (actionKey === 13) {
      // S13 / 13 (칼재활용): 화살 제외 칼 전부 방패화, 이전 속성 초기화 [K0 S13]
      let count = 0;
      for (const c of session.cells) {
        if (!c || c.erased) continue;
        if ((c.kind === KIND_SWORD || c.kindCode === 4) && !c.arrow) {
          morphCellKind(c, KIND_SHIELD);
          count++;
        }
      }
      return { success: true, actionKey, convertedCount: count };
    }

    if (actionKey === 14) {
      // S14 / 14 (적무장해제): 특수 번호가 0인 일반 적만 칼로 지정변환, 특수 적은 유지 [K0 S14, 교정 24.7]
      let count = 0;
      for (const c of session.cells) {
        if (!c || c.erased) continue;
        if (
          (c.kind === KIND_ENEMY || c.kindCode === 1) &&
          (!c.enemy || !c.enemy.enemyKind || c.enemy.enemyKind === 0) &&
          (!c.enemy || c.enemy.hitPoints > 0)
        ) {
          morphCellKind(c, KIND_SWORD);
          count++;
        }
      }
      return { success: true, actionKey, convertedCount: count };
    }

    if (actionKey === 15) {
      // S15 / 15 (돈무기화): 코인 전부 칼화, 이전 속성 초기화 [K0 S15]
      let count = 0;
      for (const c of session.cells) {
        if (!c || c.erased) continue;
        if (c.kind === KIND_COIN || c.kindCode === 2) {
          morphCellKind(c, KIND_SWORD);
          count++;
        }
      }
      return { success: true, actionKey, convertedCount: count };
    }

    if (actionKey === 16) {
      // S16 / 16 (칼증폭): 이번턴 무기공격 기여 2배, 기본공격은 배가하지 않음 [K0 S16]
      session.hero.activeNow = session.hero.activeNow || {};
      session.hero.activeNow.skill16 = true;
      session.hero.activeNow.doubleWeapon = true;
      return { success: true, actionKey };
    }

    if (actionKey === 17) {
      // S17 / 17 (돈증폭): 이번턴 골드토큰의 기본+추가율을 2배 [K0 S17]
      session.hero.activeNow = session.hero.activeNow || {};
      session.hero.activeNow.skill17 = true;
      session.hero.activeNow.doubleCoins = true;
      session.hero.activeNow.doubleGold = true;
      return { success: true, actionKey };
    }

    if (actionKey === 18) {
      // S18 / 18 (회복증폭): 이번턴 정상회복 2배, 산성피해는 배가하지 않음 [K0 S18]
      session.hero.activeNow = session.hero.activeNow || {};
      session.hero.activeNow.skill18 = true;
      session.hero.activeNow.doublePotion = true;
      return { success: true, actionKey };
    }

    if (actionKey === 19) {
      // S19 / 19 (수리증폭): 이번턴 방패수리와 강화토큰 2배 [K0 S19]
      session.hero.activeNow = session.hero.activeNow || {};
      session.hero.activeNow.skill19 = true;
      session.hero.activeNow.doubleShield = true;
      return { success: true, actionKey };
    }

    if (actionKey === 20) {
      // S20 / 20 (특수벗기기): 특수적 하나 무작위로 일반화, 능력치 유지 [K0 S20]
      // 임시값: 카운트·변환·유예해제 (이유: 32번과 겹친 정확한 상태 초기화 미확정)
      const specialEnemies = [];
      for (const c of session.cells) {
        if (!c || c.erased) continue;
        if ((c.kind === KIND_ENEMY || c.kindCode === 1) && c.enemy && c.enemy.enemyKind > 0 && c.enemy.hitPoints > 0) {
          specialEnemies.push(c);
        }
      }
      if (specialEnemies.length > 0) {
        const picked = pickRandomUpToN(session.rng, specialEnemies, 1, 'skill20Target');
        if (picked.length > 0 && picked[0]) {
          const t = picked[0];
          t.enemy.enemyKind = 0;
          t.enemy.countLeft = 0;
          t.enemy.shellState = 0;
          t.enemy.revivalDelay = false;
        }
      }
      return { success: true, actionKey };
    }

    if (actionKey === 21) {
      // S21 / 21 (특수지우기): 무작위 특수적 하나 무보상 제거·낙하보충 [K0 S21]
      const specials = [];
      for (const c of session.cells) {
        if (!c || c.erased) continue;
        if ((c.kind === KIND_ENEMY || c.kindCode === 1) && c.enemy && c.enemy.enemyKind > 0 && c.enemy.hitPoints > 0) {
          specials.push(c);
        }
      }
      if (specials.length > 0) {
        const picked = pickRandomUpToN(session.rng, specials, 1, 'skill21Target');
        if (picked.length > 0 && picked[0]) {
          picked[0].erased = true;
          applyDropAndRefill(session, false);
          return { success: true, actionKey, removedSpecial: true };
        }
      }
      return { success: true, actionKey, removedSpecial: false };
    }

    if (actionKey === 22) {
      // S22 / 22 (약한등장): 이번턴 새 적의 최종 현재체력 1. 승급·결함 후 적용, 회복기준 별도 유지 [K0 S22]
      session.hero.activeNow = session.hero.activeNow || {};
      session.hero.activeNow.skill22 = true;
      session.hero.activeNow.weakEnemySpawn = true;
      session.hero.activeNow.trap = true;
      return { success: true, actionKey };
    }

    if (actionKey === 23) {
      // S23 / 23 (위험키우기): 무작위 일반적 하나 공통 승급. 현재턴·난이도·XP·숙적덮어쓰기·타이머재설정 [K0 S23]
      const normalEnemies = [];
      for (const c of session.cells) {
        if (!c || c.erased) continue;
        if ((c.kind === KIND_ENEMY || c.kindCode === 1) && (!c.enemy || c.enemy.enemyKind === 0) && (!c.enemy || c.enemy.hitPoints > 0)) {
          normalEnemies.push(c);
        }
      }
      if (normalEnemies.length > 0) {
        const picked = pickRandomUpToN(session.rng, normalEnemies, 1, 'skill23Target');
        if (picked.length > 0 && picked[0]) {
          const target = picked[0];
          const newEnemyData = promoteNormalEnemy(session, target);
          if (newEnemyData && newEnemyData.enemyKind === 31) {
            handleEnemy31Spawn(session, target);
          }
          return { success: true, actionKey, promotedEnemyKind: newEnemyData ? newEnemyData.enemyKind : 0 };
        }
      }
      return { success: true, actionKey, promotedEnemyKind: 0 };
    }

    if (actionKey === 24) {
      // S24 / 24 (동전방): 이번턴 일반 보충 모두 코인 [K0 S24]
      // 시작방교체·모드강제적보다우선하는전체조합은임시값:일반모드보충에서만우선.
      session.hero.activeNow = session.hero.activeNow || {};
      session.hero.activeNow.skill24 = true;
      session.hero.activeNow.allCoin = true;
      return { success: true, actionKey };
    }

    if (actionKey === 25) {
      // S25 / 25 (한칼집중): 무작위 정상칼 1개 마법칼, 그 칼 무기기여 5배 [K0 S25]
      const normalSwords = [];
      for (const c of session.cells) {
        if (!c || c.erased) continue;
        if ((c.kind === KIND_SWORD || c.kindCode === 4) && !c.magicBlade && !c.arrow) {
          normalSwords.push(c);
        }
      }
      if (normalSwords.length > 0) {
        const picked = pickRandomUpToN(session.rng, normalSwords, 1, 'skill25Target');
        if (picked.length > 0 && picked[0]) {
          picked[0].magicBlade = true;
          return { success: true, actionKey, targetCell: picked[0] };
        }
      }
      return { success: true, actionKey, targetCell: null };
    }

    if (actionKey === 26) {
      // S26 / 26 (자리흔들기): 바깥 x0→5, 안쪽 y0→5 순서로 36칸을 돌며 각 칸에서 무작위 목표 x0~5·y0~5를 뽑아 즉시 교환 36회 [K0 S26, 교정 19.7]
      let swapCount = 0;
      let rngCalls = 0;
      for (let x = 0; x < BOARD_WIDTH; x++) {
        for (let y = 0; y < BOARD_HEIGHT; y++) {
          const targetX = drawInt(session.rng, 0, 5, 'skill26X');
          const targetY = drawInt(session.rng, 0, 5, 'skill26Y');
          rngCalls += 2;
          const cellA = getCell(session, x, y);
          const cellB = getCell(session, targetX, targetY);
          if (cellA && cellB) {
            if (cellA !== cellB) {
              cellA.x = targetX;
              cellA.y = targetY;
              cellB.x = x;
              cellB.y = y;
            }
            swapCount++;
          }
        }
      }
      return { success: true, actionKey, swapCount, rngCalls };
    }

    if (actionKey === 27) {
      // S27 / 27 (방패방출): 현재방패 2배를 공격값으로 판의 적에 공통 간접공격. 피해는 0하한, 최소 1 없음. 발동 후 현재방패는 소비하지 않는다 [K0 S27, 교정 17.3]
      const currentShield = (session.hero && session.hero.shield != null) ? session.hero.shield : 0;
      const attackValue = currentShield * 2;
      const enemyCells = [];
      for (const c of session.cells) {
        if (!c || c.erased) continue;
        if ((c.kind === KIND_ENEMY || c.kindCode === 1) && c.enemy && c.enemy.hitPoints > 0 && c.enemy.shellState !== 1) {
          enemyCells.push(c);
        }
      }
      const hitResults = [];
      let killedAny = false;
      const skill27Batch = createCollectionBatch();
      for (const enemyCell of enemyCells) {
        const res = applyAttackToEnemy(session, enemyCell, DAMAGE_TYPE_NORMAL, attackValue, false, { batch: skill27Batch });
        hitResults.push({ cell: enemyCell, ...res });
        if (res.killed) {
          killedAny = true;
        }
      }
      if (killedAny) {
        applyDropAndRefill(session, false);
      }
      return { success: true, actionKey, attackValue, currentShield, hitResults };
    }

    if (actionKey === 28) {
      // S28 / 28 (구역쓸기): 중심 x·y 각각 1~4 추첨, 주변 3×3 수집. 특수적 제외, 산성물약 무효과 제거 [K0 S28, 교정 17.5, 17.6]
      const centerX = drawInt(session.rng, 1, 4, 'sweepCenterX');
      const centerY = drawInt(session.rng, 1, 4, 'sweepCenterY');

      const collectedCells = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const nx = centerX + dx;
          const ny = centerY + dy;
          if (nx >= 0 && nx < BOARD_WIDTH && ny >= 0 && ny < BOARD_HEIGHT) {
            const c = getCell(session, nx, ny);
            if (!c || c.erased) continue;
            if (c.enemy && c.enemy.enemyKind > 0) continue; // 특수적 제외
            collectedCells.push(c);
          }
        }
      }

      collectSkillArea(session, collectedCells, { cellOptions: { ignoreAcid: true } });

      applyDropAndRefill(session, false);
      return { success: true, actionKey, centerX, centerY, collectedCount: collectedCells.length };
    }

    if (actionKey === 29) {
      // S29 / 29 (물약충전형): 정상물약 전부 충전형으로 변경, 산성·기존충전·폭발 제외 [K0 S29]
      let count = 0;
      for (const c of session.cells) {
        if (!c || c.erased) continue;
        if ((c.kind === KIND_POTION || c.kindCode === 0) && (!c.potionForm || c.potionForm === 'normal')) {
          c.potionForm = 'charge';
          count++;
        }
      }
      return { success: true, actionKey, transformedCount: count };
    }

    if (actionKey === 30) {
      // S30 / 30 (세로무기화): 열 0~5 추첨, 특수적 제외하고 칼로 변환·속성초기화. 가로 11과 같은 턴이면 전체 일반칸 수집·조합표식 소모 [K0 S30]
      const hasSkill11 = Boolean(
        session.hero && session.hero.activeNow && (
          session.hero.activeNow.skill11Used || session.hero.activeNow.horizontalSweep
        )
      );

      if (hasSkill11) {
        delete session.hero.activeNow.skill11Used;
        delete session.hero.activeNow.horizontalSweep;
        delete session.hero.activeNow.skill30Used;

        const cellsToCollect = [];
        for (const c of session.cells) {
          if (!c || c.erased) continue;
          if (c.enemy && c.enemy.enemyKind > 0) continue; // 특수적 유지
          cellsToCollect.push(c);
        }

        collectSkillArea(session, cellsToCollect);
        applyDropAndRefill(session, false);
        return { success: true, actionKey, comboAllCollected: true, count: cellsToCollect.length };
      } else {
        session.hero.activeNow = session.hero.activeNow || {};
        session.hero.activeNow.skill30Used = true;
        session.hero.activeNow.verticalSweep = true;

        const colX = drawInt(session.rng, 0, 5, 'sweepCol');
        let convertedCount = 0;
        for (let y = 0; y < BOARD_HEIGHT; y++) {
          const c = getCell(session, colX, y);
          if (!c || c.erased) continue;
          if (c.enemy && c.enemy.enemyKind > 0) continue; // 특수적 제외
          morphCellKind(c, KIND_SWORD);
          c.broken = false;
          c.magicBlade = false;
          c.arrow = false;
          convertedCount++;
        }
        return { success: true, actionKey, colX, convertedCount };
      }
    }

    if (actionKey === 31) {
      // S31 / 31 (칼원거리화): 마법·기존화살이 아닌 칼을 모두 화살화 [K0 S31]
      let count = 0;
      for (const c of session.cells) {
        if (!c || c.erased) continue;
        if ((c.kind === KIND_SWORD || c.kindCode === 4) && !c.magicBlade && !c.arrow) {
          c.arrow = true;
          count++;
        }
      }
      return { success: true, actionKey, convertedCount: count };
    }

    if (actionKey === 32) {
      // S32 / 32 (돈위험화): 코인 전부 현재턴·난이도·XP로 적 지정변환 [K0 S32, 교정 19.6, 교정 27.4].
      // 코인을 적으로 지정변환하는 경로는 31번 적의 열 맨 아래 이동, 스킬 22의 체력 1, 숙적 12의 방패 0을 적용하지 않는다.
      session.hero.activeNow = session.hero.activeNow || {};
      session.hero.activeNow.skill32 = true;
      session.hero.activeNow.coinEnemyConverted = true;
      let count = 0;
      let anySpecialCreated = false;
      for (const c of session.cells) {
        if (!c || c.erased) continue;
        if (c.kind === KIND_COIN || c.kindCode === 2) {
          morphCellKind(c, KIND_ENEMY);
          c.enemy = createEnemyData(session, null, false, { ignoreSkill22: true, isSkill32: true });
          if (c.enemy && c.enemy.enemyKind > 0) {
            anySpecialCreated = true;
          }
          count++;
        }
      }
      if (anySpecialCreated) {
        checkSpecialCountAchievement41(session);
      }
      return { success: true, actionKey, createdCount: count };
    }

    if (actionKey === 33) {
      // S33 / 33 (한번쓸기): 특수적 제외 모든 칸 공통수집 후 자신을 스킬목록에서 제거. 쿨다운 −1은 한번사용 뜻, 자연충전 대상 아님 [K0 S33, 교정 17.6]
      const cellsToCollect = [];
      let normalEnemyCount = 0;
      for (const c of session.cells) {
        if (!c || c.erased) continue;
        if (c.enemy && c.enemy.enemyKind > 0) continue; // 특수적 제외
        cellsToCollect.push(c);
        if ((c.kind === KIND_ENEMY || c.kindCode === 1) && (!c.enemy || c.enemy.enemyKind === 0)) {
          normalEnemyCount++;
        }
      }

      collectSkillArea(session, cellsToCollect);

      // A64: 스킬 33 사용 때 일반적 20개 이상
      if (normalEnemyCount >= 20) {
        emitAchievementProgress(session, 64, 100);
      }

      applyDropAndRefill(session, false);
      return { success: true, actionKey, collectedCount: cellsToCollect.length };
    }

    if (actionKey === 34) {
      // S34 / 34 (처치회복): 이번턴 공통공격 처치 적의 유효공격합만큼 최대체력까지 회복 [K0 S34]
      // 임시값: 현재공격묶음 종료때 회복 (이유: 불·연쇄와 회복이 도착하는 전체경계 미확정)
      session.hero.activeNow = session.hero.activeNow || {};
      session.hero.activeNow.skill34 = true;
      session.hero.activeNow.healOnKill = true;
      return { success: true, actionKey };
    }

    if (actionKey === 35) {
      // S35 / 35 (고리수집): 이번턴 경로 4칸 이상·처음과 끝이 8방향 인접하면 내부 비특수칸도 공통수집 [K0 S35]
      // 임시값: 자기교차경로는 행별 홀짝안쪽판정, 경계제외 (이유: 모든 교차모양의 내부판정 미확정)
      session.hero.activeNow = session.hero.activeNow || {};
      session.hero.activeNow.skill35 = true;
      session.hero.activeNow.loopCollect = true;
      return { success: true, actionKey };
    }

    if (actionKey === 36) {
      // S36 / 36 (돈곁정리): 코인 인접 일반적 전부 공통수집. 인접 대상 없어도 사용허용·충전소모. 임시값: 인접 8방향 [K0 S36, 교정 17.6]
      const coinCoords = [];
      for (const c of session.cells) {
        if (!c || c.erased) continue;
        if (c.kind === KIND_COIN || c.kindCode === 2) {
          coinCoords.push({ x: c.x, y: c.y });
        }
      }

      const adjacentNormalEnemies = [];
      for (const c of session.cells) {
        if (!c || c.erased) continue;
        if ((c.kind === KIND_ENEMY || c.kindCode === 1) && (!c.enemy || c.enemy.enemyKind === 0) && (!c.enemy || c.enemy.hitPoints > 0)) {
          const isAdj = coinCoords.some(co => Math.max(Math.abs(co.x - c.x), Math.abs(co.y - c.y)) === 1);
          if (isAdj) {
            adjacentNormalEnemies.push(c);
          }
        }
      }

      collectSkillArea(session, adjacentNormalEnemies);

      if (adjacentNormalEnemies.length > 0) {
        applyDropAndRefill(session, false);
      }
      return { success: true, actionKey, collectedCount: adjacentNormalEnemies.length };
    }

    if (actionKey === 37) {
      // S37 / 37 (한번살기): 이번턴 모든 치명상검사에서 한번 최대체력으로 회복. 종료검사 공통경로에 연결 [K0 S37]
      session.hero.activeNow = session.hero.activeNow || {};
      session.hero.activeNow.skill37 = true;
      return { success: true, actionKey };
    }

    if (actionKey === 38) {
      // S38 / 38 (가장자리쓸기): x0/5 또는 y0/5인 20칸의 특수적 제외 공통수집, 모서리 중복없음 [K0 S38, 교정 17.6]
      const edgeCells = [];
      for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
          if (x === 0 || x === BOARD_WIDTH - 1 || y === 0 || y === BOARD_HEIGHT - 1) {
            const c = getCell(session, x, y);
            if (!c || c.erased) continue;
            if (c.enemy && c.enemy.enemyKind > 0) continue; // 특수적 제외
            edgeCells.push(c);
          }
        }
      }

      collectSkillArea(session, edgeCells);

      applyDropAndRefill(session, false);
      return { success: true, actionKey, collectedCount: edgeCells.length };
    }

    // [교정 24.8, 교정 27.5] 연결칸 생성 공통 helper:
    // 무작위 좌표 최대 10회 시도. 좌표를 다시 뽑는 대상은 특수 적(적이면서 특수 번호가 0보다 큰 칸)뿐이다.
    // 기존 연결칸·직업 보상칸·일반 비적 칸은 후보에서 빼지 않는다. 최대 10회는 그대로 유지한다.
    const isSpecialEnemyForBridge = (c) => {
      if (!c) return false;
      return Boolean((c.kind === KIND_ENEMY || c.kindCode === 1) && c.enemy && c.enemy.enemyKind > 0);
    };

    const tryCreateBridgeCellRandom10 = (xTag, yTag) => {
      let attempts = 0;
      let converted = false;
      let targetCell = null;

      for (let i = 0; i < 10; i++) {
        attempts++;
        const rx = drawInt(session.rng, 0, 5, xTag);
        const ry = drawInt(session.rng, 0, 5, yTag);
        const c = getCell(session, rx, ry);
        if (c && !c.erased) {
          if (isSpecialEnemyForBridge(c)) {
            continue; // 특수 적만 재시도
          }
          morphCellKind(c, KIND_BRIDGE);
          converted = true;
          targetCell = c;
          break;
        }
      }

      return { attempts, converted, targetCell };
    };

    if (actionKey === 39) {
      // S39 / 39 (잇는칸): 무작위좌표 최대 10회 시도, 특수 칸이면 재시도, 일반칸을 초기화된 연결칸('bridge')으로 변환. 10회 모두 특수 칸이면 효과없이 종료 [K0 S39, 교정 24.8]
      const bridgeRes = tryCreateBridgeCellRandom10('skill39X', 'skill39Y');
      return {
        success: true,
        actionKey,
        attempts: bridgeRes.attempts,
        converted: bridgeRes.converted,
        targetCell: bridgeRes.targetCell
      };
    }

    if (actionKey === 40) {
      // S40 / 40 (윗부분쓸기): y0~2의 코인·방패만 공통수집·낙하. 이번턴 41도 사용했으면 수집뒤 10회 좌표 추첨으로 연결칸 생성 [K0 S40, 교정 17.6, 교정 24.8]
      const has41 = Boolean(session.hero && session.hero.activeNow && session.hero.activeNow.skill41Used);
      session.hero.activeNow = session.hero.activeNow || {};
      session.hero.activeNow.skill40Used = true;

      const collected = [];
      for (let y = 0; y <= 2; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
          const c = getCell(session, x, y);
          if (!c || c.erased) continue;
          if (c.kind === KIND_COIN || c.kindCode === 2 || c.kind === KIND_SHIELD || c.kindCode === 3) {
            collected.push(c);
          }
        }
      }

      collectSkillArea(session, collected);

      applyDropAndRefill(session, false);

      let bridgeCreated = false;
      let bridgeAttempts = 0;
      let bridgeCell = null;
      if (has41) {
        const bridgeRes = tryCreateBridgeCellRandom10('comboBridgeX', 'comboBridgeY');
        bridgeCreated = bridgeRes.converted;
        bridgeAttempts = bridgeRes.attempts;
        bridgeCell = bridgeRes.targetCell;
      }

      return { success: true, actionKey, collectedCount: collected.length, bridgeCreated, bridgeAttempts, bridgeCell };
    }

    if (actionKey === 41) {
      // S41 / 41 (아랫부분쓸기): y3~5의 물약·방패만 공통수집·낙하. 이번턴 40도 사용했으면 수집뒤 10회 좌표 추첨으로 연결칸 생성 [K0 S41, 교정 17.6, 교정 24.8]
      const has40 = Boolean(session.hero && session.hero.activeNow && session.hero.activeNow.skill40Used);
      session.hero.activeNow = session.hero.activeNow || {};
      session.hero.activeNow.skill41Used = true;

      const collected = [];
      for (let y = 3; y <= 5; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
          const c = getCell(session, x, y);
          if (!c || c.erased) continue;
          if (c.kind === KIND_POTION || c.kindCode === 0 || c.kind === KIND_SHIELD || c.kindCode === 3) {
            collected.push(c);
          }
        }
      }

      collectSkillArea(session, collected);

      applyDropAndRefill(session, false);

      let bridgeCreated = false;
      let bridgeAttempts = 0;
      let bridgeCell = null;
      if (has40) {
        const bridgeRes = tryCreateBridgeCellRandom10('comboBridgeX', 'comboBridgeY');
        bridgeCreated = bridgeRes.converted;
        bridgeAttempts = bridgeRes.attempts;
        bridgeCell = bridgeRes.targetCell;
      }

      return { success: true, actionKey, collectedCount: collected.length, bridgeCreated, bridgeAttempts, bridgeCell };
    }

    return { success: false, reason: 'unsupported_skill', actionKey };
  }

  /**
   * 스킬 발동 (triggerAction) [K0, G7]
   * 미보유·미충전·대상 없음·메뉴 대기·종료 상태에서는 사용 거절.
   * 거절은 난수와 충전을 소비하지 않는다.
   * 발동 뒤 charge=0, 1회용은 제거.
   * 즉시스킬은 그 효과·보상·낙하만 하고 일반턴을 추가로 끝내지 않는다.
   * 종족 8은 스킬 사용 뒤 무작위 일반적 1마리에 기본공격값 불을 붙인다.
   */
  function triggerAction(session, actionIndexOrKey, options = {}) {
    const check = canTriggerAction(session, actionIndexOrKey);
    if (!check.canUse) {
      return {
        success: false,
        reason: check.reason,
        session
      };
    }

    const found = findActionInSession(session, actionIndexOrKey);
    const action = found.action;
    const actionIndex = found.index;

    // 충전 소모
    action.charge = 0;

    // 1회용 스킬 제거
    if (action.oneUse || action.actionKey === 33 || action.baseWait === -1) {
      session.actions.splice(actionIndex, 1);
    }

    // 스킬 효과 실행
    const effectResult = executeSkillEffect(session, action.actionKey, options);

    // [M4, K0] 종족 8 패시브: 스킬 사용 뒤 무작위 일반적 1마리에 기본공격값 불을 붙인다. 후보 없으면 없음. 거절된 스킬에는 적용하지 않는다.
    if (session.hero && session.hero.raceKey === 8) {
      const normalEnemies = [];
      for (const c of session.cells) {
        if (!c || c.erased) continue;
        if ((c.kind === KIND_ENEMY || c.kindCode === 1) && (!c.enemy || c.enemy.enemyKind === 0) && (!c.enemy || c.enemy.hitPoints > 0)) {
          normalEnemies.push(c);
        }
      }
      if (normalEnemies.length > 0) {
        const picked = pickRandomUpToN(session.rng, normalEnemies, 1, 'race8SkillFire');
        if (picked.length > 0 && picked[0]) {
          const t = picked[0];
          const firePower = getHeroInnateBaseStrike(session);
          t.firePower = (t.firePower || 0) + firePower;
          t.frozen = false; // 동결은 점화로 해제 [I0 E07, F5]
        }
      }
    }

    return {
      success: true,
      actionIndex,
      actionKey: action.actionKey,
      action,
      effectResult,
      phase: session.phase,
      session
    };
  }

  /**
   * [교정 33.1] 대기 메뉴 안전장치: 카드가 0장인 비정상 대기 메뉴를 청소하고,
   * 대기 큐가 비면 phase를 'input'으로 안전하게 복귀시킨다.
   */
  function cleanWaitingChoices(session) {
    if (!session || !Array.isArray(session.waitingChoices)) return;
    session.waitingChoices = session.waitingChoices.filter(c => c && Array.isArray(c.cards) && c.cards.length > 0);
    if (session.waitingChoices.length === 0 && session.phase === 'choice') {
      session.phase = 'input';
    }
  }

  /**
   * 선택지 응답 (answerChoice) [F2, G5, G6]
   * 레벨업 메뉴는 총 4장 중 서로 다른 2장을 선택하여 확정한다.
   * 기존 화면의 한 번 클릭은 첫 선택으로 기록하고 두 번째 클릭으로 확정하여 HTML 변경 없이 이어 준다.
   * 선택 때 다시 100을 빼지 않는다.
   */
  function answerChoice(session, choiceId, options = {}) {
    if (!session) return { success: false, reason: 'no_session' };
    cleanWaitingChoices(session);
    if (!Array.isArray(session.waitingChoices) || session.waitingChoices.length === 0) {
      if (session.phase === 'choice') session.phase = 'input';
      return { success: false, reason: 'no_waiting_choices', session };
    }

    let choiceIndex = session.waitingChoices.findIndex(c => c.id === choiceId);
    if (choiceIndex === -1) choiceIndex = 0;
    const choice = session.waitingChoices[choiceIndex];

    if (choice.type === 'levelup') {
      if (!Array.isArray(choice.picks)) choice.picks = [];

      let picksToApply = [];
      if (Array.isArray(options.picks)) {
        picksToApply = options.picks;
      } else if (options.selectedIndex != null) {
        if (Array.isArray(options.selectedIndex)) {
          picksToApply = options.selectedIndex;
        } else {
          picksToApply = [options.selectedIndex];
        }
      } else if (options.pick != null) {
        picksToApply = [options.pick];
      } else if (options.choiceIndex != null) {
        picksToApply = [options.choiceIndex];
      } else {
        // 옵션이 생략된 단순 호출(이전 조각 호환) 시 기본 선택 완료
        picksToApply = [0, 1];
      }

      for (const p of picksToApply) {
        if (!choice.picks.includes(p)) {
          choice.picks.push(p);
        }
      }

      const needed = choice.picksNeeded || 2;
      if (choice.picks.length >= needed) {
        for (let i = 0; i < needed; i++) {
          const cardIdx = choice.picks[i];
          const card = choice.cards && choice.cards[cardIdx];
          if (card) {
            if (card.type === 'stat') {
              const statDef = STAT_OPTIONS.find(s => s.statId === card.statId);
              if (statDef && typeof statDef.apply === 'function') {
                statDef.apply(session.hero, session.mode);
              }
            } else if (card.type === 'skill') {
              learnOrUpgradeSkill(session, card.actionKey);
            }
          } else {
            session.hero.baseStrike = (session.hero.baseStrike || 3) + 1;
          }
        }
        session.waitingChoices.splice(choiceIndex, 1);
      }
    } else if (choice.type === 'shop') {
      let cardIdx = 0;
      if (options.selectedIndex != null) {
        cardIdx = Array.isArray(options.selectedIndex) ? options.selectedIndex[0] : options.selectedIndex;
      } else if (options.pick != null) {
        cardIdx = options.pick;
      } else if (options.choiceIndex != null) {
        cardIdx = options.choiceIndex;
      } else if (Array.isArray(options.picks) && options.picks.length > 0) {
        cardIdx = options.picks[0];
      }

      const card = choice.cards && choice.cards[cardIdx];
      if (card) {
        if (card.gear && card.slot != null) {
          session.gear[card.slot] = card.gear;
          recalculateHeroStats(session);
          checkGearStatCountAchievement72(session);
        }
        if (card.type === 'skill') {
          if (card.actionKey != null) {
            executeSkillEffect(session, card.actionKey, options);
          }
          if (session.hero && session.hero.raceKey === 3) {
            emitAchievementProgress(session, 49, 2);
          }
        }
      }
      session.waitingChoices.splice(choiceIndex, 1);
    } else if (choice.type === 'upgrade') {
      let cardIdx = 0;
      if (options.selectedIndex != null) {
        cardIdx = Array.isArray(options.selectedIndex) ? options.selectedIndex[0] : options.selectedIndex;
      } else if (options.pick != null) {
        cardIdx = options.pick;
      } else if (options.choiceIndex != null) {
        cardIdx = options.choiceIndex;
      } else if (Array.isArray(options.picks) && options.picks.length > 0) {
        cardIdx = options.picks[0];
      }

      const card = choice.cards && choice.cards[cardIdx];
      if (card && card.slot != null && card.boostId != null) {
        const gearItem = session.gear && session.gear[card.slot];
        if (gearItem && Array.isArray(gearItem.boosts)) {
          gearItem.boosts[card.boostId] = (gearItem.boosts[card.boostId] || 0) + (card.increaseAmount || 1);
          recalculateHeroStats(session);
          checkGearStatCountAchievement72(session);
        }
      }
      session.waitingChoices.splice(choiceIndex, 1);
    } else {
      session.waitingChoices.splice(choiceIndex, 1);
    }

    cleanWaitingChoices(session);
    if (session.waitingChoices.length === 0) {
      session.phase = 'input';
      // [교정 26.4] 실제로 중단된 연결 처리가 있을 때만 이어서 처리하고, 독립 메뉴 닫기 시 새 턴/반격을 진행하지 않는다.
      if (options.resumeTurn && session._pausedInSettle) {
        return continueTurn(session, options);
      }
    }

    return {
      success: true,
      choice,
      remainingChoices: session.waitingChoices.length,
      phase: session.phase,
      session
    };
  }

  /**
   * 세션 직렬화 (packSession) [N3]
   * 독3단계·모든물약형·화살·파손·마법·얼음·불피해·32변환/유예·스킬강화CD/충전·두단계활성·
   * 승급·직업보상카운터·메뉴큐와처리위치·난수상태를 왕복보존한다.
   */
  function packSession(session) {
    if (!session) return '';
    let randomState = null;
    if (
      session.randomState != null &&
      typeof session.randomState === 'object' &&
      !session.randomState.type &&
      session.randomState.position != null &&
      (!session.rng || session.rng.position == null)
    ) {
      randomState = { ...session.randomState };
    } else if (session.rng && session.rng.position != null) {
      const prngState = (typeof session.rng.getState === 'function') ? session.rng.getState() : undefined;
      if (prngState && typeof prngState === 'object') {
        randomState = { type: 'position', position: session.rng.position, state: prngState };
      } else {
        randomState = {
          type: 'position',
          position: session.rng.position,
          state: session.rng.position,
          ...(prngState != null && typeof prngState !== 'function' ? { prngState } : {})
        };
      }
    } else if (session.rng && typeof session.rng.getState === 'function') {
      const st = session.rng.getState();
      if (st != null && typeof st !== 'function') {
        randomState = { type: 'prng', state: st };
      }
    } else if (Array.isArray(session.rng)) {
      randomState = { type: 'array', values: [...session.rng] };
    } else if (session.randomState != null && typeof session.randomState !== 'function') {
      randomState = session.randomState;
    }

    const obj = {
      version: 2,
      cells: session.cells,
      tick: session.tick,
      difficulty: session.difficulty,
      mode: session.mode,
      phase: session.phase,
      hero: session.hero,
      gear: session.gear,
      actions: session.actions,
      waitingChoices: session.waitingChoices,
      pendingChoice: session.pendingChoice,
      promotionLeft: session.promotionLeft,
      path: session.path,
      killLedger: session.killLedger,
      totals: session.totals,
      fractions: session.fractions,
      classRewardCounter: session.classRewardCounter,
      classRewardCount: session.classRewardCount,
      specialKills: session.specialKills || 0,
      scoreModePoints: session.scoreModePoints || 0,
      scoreModeTurnPoints: session.scoreModeTurnPoints || 0,
      _turnSpawnCount: session._turnSpawnCount || 0,
      _turnEnemySpawnCount: session._turnEnemySpawnCount || 0,
      _emittedOnce: session._emittedOnce || {},
      turnContext: session.turnContext,
      resumeTurnData: session.resumeTurnData,
      randomState: randomState,
      provisional: session.provisional
    };
    return JSON.stringify(obj);
  }

  /**
   * 세션 역직렬화 (unpackSession) [N3]
   * 파손 JSON·저장소 오류는 앱을 죽이지 않고 실패 결과(null)를 반환한다.
   * 오래된 저장에서 누락된 필드는 안전한 기본값으로 이주한다.
   * 동일한 우리 난수 공급자에서 저장 전후 다음 행동 결과가 같아야 한다.
   */
  function unpackSession(packedData, options = {}) {
    if (!packedData) return null;
    let obj = null;
    try {
      obj = typeof packedData === 'string' ? JSON.parse(packedData) : packedData;
    } catch (err) {
      return null;
    }
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
    if (!Array.isArray(obj.cells) || !obj.hero || typeof obj.hero !== 'object' || Array.isArray(obj.hero)) return null;

    // 칸 복원 및 누락 필드 이주
    const cells = Array.isArray(obj.cells) ? obj.cells.map(c => {
      const item = (c && typeof c === 'object') ? c : {};
      const enemyObj = (item.enemy && typeof item.enemy === 'object') ? item.enemy : null;
      const cell = {
        cellKey: item.cellKey || `c_${item.x || 0}_${item.y || 0}`,
        x: item.x || 0,
        y: item.y || 0,
        kind: item.kind || KIND_POTION,
        kindCode: item.kindCode != null ? item.kindCode : (KIND_NAME_TO_CODE[item.kind] != null ? KIND_NAME_TO_CODE[item.kind] : 0),
        type: item.type || item.kind || KIND_POTION,
        erased: Boolean(item.erased),
        selected: Boolean(item.selected),
        skipRetaliation: Boolean(item.skipRetaliation),
        abilityUsed: Boolean(item.abilityUsed),
        frozen: Boolean(item.frozen),
        firePower: item.firePower || 0,
        fireCollected: Boolean(item.fireCollected),
        broken: Boolean(item.broken),
        magicBlade: Boolean(item.magicBlade),
        arrow: Boolean(item.arrow),
        potionForm: item.potionForm || 'normal',
        bridgeForm: item.bridgeForm || 'none',
        rewardConsumed: Boolean(item.rewardConsumed),
        _rewardCollectedOnce: Boolean(item._rewardCollectedOnce),
        enemy: enemyObj ? {
          enemyKind: enemyObj.enemyKind || 0,
          hitPoints: enemyObj.hitPoints != null ? enemyObj.hitPoints : 4,
          recoveryLimit: enemyObj.recoveryLimit != null ? enemyObj.recoveryLimit : 4,
          strike: enemyObj.strike != null ? enemyObj.strike : 1,
          guard: enemyObj.guard || 0,
          poisonSteps: Array.isArray(enemyObj.poisonSteps) ? [...enemyObj.poisonSteps] : [0, 0, 0],
          countLeft: enemyObj.countLeft || 0,
          shellState: enemyObj.shellState || 0,
          revivalDelay: Boolean(enemyObj.revivalDelay),
          isMortalEnemy: Boolean(enemyObj.isMortalEnemy)
        } : null
      };
      return cell;
    }) : [];

    const hero = obj.hero ? { ...obj.hero } : {
      life: 50,
      lifeCap: 50,
      baseLife: 40,
      baseStrike: 3,
      bladeStrike: 2,
      shield: 4,
      shieldCap: 4,
      potionPower: 1,
      repairPower: 1,
      poisonPower: 0,
      baseGrowth: [1, 1, 1, 1],
      growths: [1, 1, 1, 1],
      rank: 1,
      xp: 0,
      coins: 0,
      upgrade: 0,
      completedXp: 0,
      completedCoins: 0,
      completedUpgrade: 0,
      bonusOdds: { xp: 20, coins: 20, potion: 20, shield: 20 },
      extraRates: { xp: 0, coins: 0, upgrade: 0 },
      drainRate: 0,
      piercing: 50,
      shieldDamageOdds: 50,
      thorns: 0,
      blunt: 0,
      regen: 0,
      classKey: 0,
      raceKey: 0,
      perks: [],
      flaws: [],
      activeNow: {},
      activeNext: {}
    };
    if (!hero.baseGrowth) hero.baseGrowth = [1, 1, 1, 1];
    if (!hero.growths) hero.growths = [1, 1, 1, 1];
    if (!hero.activeNow) hero.activeNow = {};
    if (!hero.activeNext) hero.activeNext = {};
    if (!Array.isArray(hero.perks)) hero.perks = [];
    if (!Array.isArray(hero.flaws)) hero.flaws = [];

    // 난수 공급자 복원 [교정 22.6]
    let rng = options.rng || null;
    if (!rng && obj.randomState != null) {
      if (typeof obj.randomState === 'object' && obj.randomState.type === 'prng' && obj.randomState.state != null) {
        rng = createRNG();
        rng.setState(obj.randomState.state);
        if (typeof obj.randomState.state === 'object' && obj.randomState.state.position != null) {
          rng.position = obj.randomState.state.position;
        }
      } else if (typeof obj.randomState === 'object' && (obj.randomState.type === 'position' || obj.randomState.position != null)) {
        const pos = obj.randomState.position != null ? obj.randomState.position : obj.randomState.state;
        const seedOrState = obj.randomState.prngState != null
          ? obj.randomState.prngState
          : (typeof obj.randomState.state === 'number' ? obj.randomState.state : undefined);
        rng = createRNG(seedOrState);
        if (seedOrState != null) rng.setState(seedOrState);
        rng.position = pos;
        if (obj.randomState.prngState == null) {
          rng.getState = () => ({ position: rng.position });
          rng.setState = (st) => { rng.position = (st && typeof st === 'object' && st.position != null) ? st.position : st; };
        }
      } else if (typeof obj.randomState === 'object' && obj.randomState.type === 'array' && Array.isArray(obj.randomState.values)) {
        rng = [...obj.randomState.values];
      } else if (typeof obj.randomState === 'number') {
        rng = createRNG(obj.randomState);
        rng.position = obj.randomState;
      }
    }

    const defaultGear = [
      { slot: 0, ownLook: 0, boosts: new Array(20).fill(0) },
      { slot: 1, ownLook: 0, boosts: new Array(20).fill(0) },
      { slot: 2, ownLook: 0, boosts: new Array(20).fill(0) },
      { slot: 3, ownLook: 0, boosts: new Array(20).fill(0) },
      { slot: 4, ownLook: 0, boosts: new Array(20).fill(0) }
    ];
    let gear = defaultGear;
    if (Array.isArray(obj.gear)) {
      gear = obj.gear.map((g, idx) => g ? {
        ...g,
        slot: g.slot != null ? g.slot : idx,
        boosts: Array.isArray(g.boosts) ? [...g.boosts] : new Array(20).fill(0)
      } : { slot: idx, ownLook: 0, boosts: new Array(20).fill(0) });
    } else if (obj.gear && typeof obj.gear === 'object') {
      gear = { ...obj.gear };
    }

    const session = {
      cells,
      tick: obj.tick || 0,
      difficulty: (typeof obj.difficulty === 'number' && Number.isInteger(obj.difficulty) && obj.difficulty >= 0 && obj.difficulty <= 3) ? obj.difficulty : 1,
      mode: obj.mode || 'normal',
      phase: obj.phase || 'input',
      hero,
      gear,
      actions: Array.isArray(obj.actions) ? obj.actions.map(a => ({ ...a })) : [],
      waitingChoices: Array.isArray(obj.waitingChoices) ? obj.waitingChoices.map(c => ({
        ...c,
        ...(Array.isArray(c && c.cards) ? { cards: c.cards.map(card => ({ ...card })) } : {}),
        ...(Array.isArray(c && c.picks) ? { picks: [...c.picks] } : {})
      })) : [],
      pendingChoice: obj.pendingChoice || null,
      promotionLeft: obj.promotionLeft != null ? obj.promotionLeft : 50,
      path: Array.isArray(obj.path) ? [...obj.path] : [],
      killLedger: obj.killLedger || 0,
      totals: obj.totals ? { ...obj.totals } : { xp: 0, coins: 0, upgrade: 0 },
      fractions: obj.fractions ? { ...obj.fractions } : { xp: 0, coins: 0, upgrade: 0 },
      classRewardCounter: obj.classRewardCounter != null ? Math.min(30, obj.classRewardCounter) : 0,
      classRewardCount: obj.classRewardCount || 0,
      specialKills: obj.specialKills || 0,
      scoreModePoints: obj.scoreModePoints || 0,
      scoreModeTurnPoints: obj.scoreModeTurnPoints || 0,
      _turnSpawnCount: obj._turnSpawnCount || 0,
      _turnEnemySpawnCount: obj._turnEnemySpawnCount || 0,
      _emittedOnce: obj._emittedOnce ? { ...obj._emittedOnce } : {},
      turnContext: obj.turnContext || null,
      resumeTurnData: obj.resumeTurnData || null,
      profile: (options && options.profile) || null,
      randomState: obj.randomState || null,
      events: [],
      provisional: Array.isArray(obj.provisional) ? [...obj.provisional] : [...PROVISIONAL_ITEMS],
      rng
    };

    return session;
  }

  // ==========================================
  // [M, N] 조각 13: 직업·성장·퍽·종족·업적·점수 로직
  // ==========================================

  /**
   * 78개 전체 업적 정의 표 [N1]
   * 0 ~ 77번 (누락 0개, 총 78행)
   * unverified=true인 행은 잠정 사건만 남기고 자동 확정 해제하지 않는다.
   */
  const ACHIEVEMENTS_TABLE = [
    { id: 0, desc: '미판독:직접발생조건없음', progress: 0, unverified: true },
    { id: 1, desc: '직업1해제·성장0아님', progress: 100, unverified: false },
    { id: 2, desc: '직업2해제·성장0아님', progress: 100, unverified: false },
    { id: 3, desc: '직업3해제·성장0아님', progress: 100, unverified: false },
    { id: 4, desc: '직업4해제·성장0아님', progress: 100, unverified: false },
    { id: 5, desc: '직업5해제·성장0아님', progress: 100, unverified: false },
    { id: 6, desc: '직업6해제·성장0아님', progress: 100, unverified: false },
    { id: 7, desc: '직업7해제·성장0아님', progress: 100, unverified: false },
    { id: 8, desc: '직업8해제·성장0아님', progress: 100, unverified: false },
    { id: 9, desc: '직업9해제·성장0아님', progress: 100, unverified: false },
    { id: 10, desc: '종족1기본직업성장5이상', progress: 100, unverified: false },
    { id: 11, desc: '종족2기본직업성장5이상', progress: 100, unverified: false },
    { id: 12, desc: '종족3기본직업성장5이상', progress: 100, unverified: false },
    { id: 13, desc: '종족4기본직업성장5이상', progress: 100, unverified: false },
    { id: 14, desc: '종족5기본직업성장5이상', progress: 100, unverified: false },
    { id: 15, desc: '종족6기본직업성장5이상', progress: 100, unverified: false },
    { id: 16, desc: '종족7기본직업성장5이상', progress: 100, unverified: false },
    { id: 17, desc: '종족8기본직업성장5이상', progress: 100, unverified: false },
    { id: 18, desc: '종족9기본직업성장5이상', progress: 100, unverified: false },
    { id: 19, desc: '직업1성장10', progress: 100, unverified: false },
    { id: 20, desc: '직업2성장10', progress: 100, unverified: false },
    { id: 21, desc: '직업3성장10', progress: 100, unverified: false },
    { id: 22, desc: '직업4성장10', progress: 100, unverified: false },
    { id: 23, desc: '직업5성장10', progress: 100, unverified: false },
    { id: 24, desc: '직업6성장10', progress: 100, unverified: false },
    { id: 25, desc: '직업7성장10', progress: 100, unverified: false },
    { id: 26, desc: '직업8성장10', progress: 100, unverified: false },
    { id: 27, desc: '직업9성장10', progress: 100, unverified: false },
    { id: 28, desc: '비기본직업모두성장10', progress: 100, unverified: false },
    { id: 29, desc: '판레벨5도달', progress: 100, unverified: false },
    { id: 30, desc: '판레벨10도달', progress: 100, unverified: false },
    { id: 31, desc: '판레벨25도달', progress: 100, unverified: false },
    { id: 32, desc: '판레벨50도달', progress: 100, unverified: false },
    { id: 33, desc: '판레벨100도달', progress: 100, unverified: false },
    { id: 34, desc: '반사피해뒤체력0미만', progress: 100, unverified: false },
    { id: 35, desc: '수집불피해뒤체력0미만', progress: 100, unverified: false },
    { id: 36, desc: '독피해뒤체력0미만', progress: 100, unverified: false },
    { id: 37, desc: '산성피해뒤체력0미만', progress: 100, unverified: false },
    { id: 38, desc: '숙적19방교체', progress: 100, unverified: false },
    { id: 39, desc: '장비양수능력실제감소', progress: 100, unverified: false },
    { id: 40, desc: '비기본종족이며사망때숙적생존', progress: 100, unverified: false },
    { id: 41, desc: '승급뒤특수적3개이상', progress: 100, unverified: false },
    { id: 42, desc: '숙적14상태로특수14수집', progress: 100, unverified: false },
    { id: 43, desc: '가시공격으로특수2처치', progress: 100, unverified: false },
    { id: 44, desc: '특수3수집', progress: 100, unverified: false },
    { id: 45, desc: '미판독:직접발생조건없음', progress: 0, unverified: true },
    { id: 46, desc: '특수적보상수집', progress: 1, unverified: false },
    { id: 47, desc: '종족1적독사망수집', progress: 2, unverified: false },
    { id: 48, desc: '수직추가타격처치', progress: 2, unverified: false },
    { id: 49, desc: '종족3상점스킬대체선택', progress: 2, unverified: false },
    { id: 50, desc: '종족4체력25%미만레벨업회복', progress: 5, unverified: false },
    { id: 51, desc: '종족5생존적동결성공', progress: 2, unverified: false },
    { id: 52, desc: '종족6한공격15처치', progress: 10, unverified: false },
    { id: 53, desc: '종족7일반적체력<방어제거', progress: 2, unverified: false },
    { id: 54, desc: '종족8기존불로적처치', progress: 2, unverified: false },
    { id: 55, desc: '종족9특수수집완충', progress: 2, unverified: false },
    { id: 56, desc: '처치적다음경로칸가로또는세로간격>1인화살분기', progress: 100, unverified: false },
    { id: 57, desc: '종족6한공격15처치와코인적변환표식', progress: 100, unverified: false },
    { id: 58, desc: '고리내부수집수>유효길이', progress: 100, unverified: false },
    { id: 59, desc: '경로36:주변추가조건미판독', progress: 100, unverified: true },
    { id: 60, desc: '가로수집실제6칸', progress: 100, unverified: false },
    { id: 61, desc: '치명상부활활성으로완전회복', progress: 100, unverified: false },
    { id: 62, desc: '체력1생성활성중특수적등장', progress: 100, unverified: false },
    { id: 63, desc: '한턴내스킬11·28·38·33모두사용', progress: 100, unverified: false },
    { id: 64, desc: '스킬33사용때일반적20개이상', progress: 100, unverified: false },
    { id: 65, desc: '적없는판교체때특수적존재', progress: 1, unverified: false },
    { id: 66, desc: '직업보상칸생성표식적수집', progress: 100, unverified: false },
    { id: 67, desc: '최종게임종료', progress: 100, unverified: false },
    { id: 68, desc: '경로20:주변조건미판독', progress: 100, unverified: true },
    { id: 69, desc: '경로36:주변조건미판독', progress: 100, unverified: true },
    { id: 70, desc: '판레벨10·난이도3·퍽수1·결함수4', progress: 100, unverified: false },
    { id: 71, desc: '판레벨5·난이도3·장착스킬0', progress: 100, unverified: false },
    { id: 72, desc: '장비저장때비0능력8개이상', progress: 100, unverified: false },
    { id: 73, desc: '파손칸무보상수집', progress: 1, unverified: false },
    { id: 74, desc: '첫낙하생성수>9이며전부적', progress: 100, unverified: false },
    { id: 75, desc: '수집내집계>5:집계의미미판독', progress: 100, unverified: true },
    { id: 76, desc: '100턴모드완료종료', progress: 100, unverified: false },
    { id: 77, desc: '별도점수모드점수획득과집계15이상:전체의미미판독', progress: 100, unverified: true }
  ];

  /**
   * 퍽/결함 슬롯 수 계산 [M2]
   * 비기본 직업 퍽·결함 각 4슬롯, 첫 쌍 고정, 추가 슬롯은 직업 레벨 3·7·9.
   * 성장 1/3/7/9 -> 슬롯 1/2/3/4
   */
  function getPerkSlotCount(growth) {
    const g = Math.max(0, Math.floor(growth || 0));
    if (g >= 9) return 4;
    if (g >= 7) return 3;
    if (g >= 3) return 2;
    return 1;
  }

  /**
   * 스킬 교체 허용 수 계산 [M2]
   * 성장 2·4·6·8·10의 스킬 교체 허용 수는 2·4·6·8·10
   */
  function getSkillSwapAllowance(growth) {
    const g = Math.max(0, Math.floor(growth || 0));
    return Math.min(10, Math.floor(g / 2) * 2);
  }

  /**
   * 교체설정 20칸 유효성 검증 및 정리 [M2, 교정 21.3, 교정 21.7]
   * 교체설정 20칸은 앞에서부터 허용수만 남기고 그 뒤 설정은 빈칸(null)으로 한다.
   */
  function validateSkillSwapSetup(growthOrClassId = 1, swapInput = [], maybeSwapInput = null, classGrowthsOrProfile = null) {
    let growth = growthOrClassId;
    let rawSwaps = swapInput;
    if (Array.isArray(maybeSwapInput)) {
      growth = swapInput;
      rawSwaps = maybeSwapInput;
    }
    const allowance = getSkillSwapAllowance(growth);
    const result = new Array(20).fill(null);
    if (!Array.isArray(rawSwaps) || allowance <= 0) {
      return result;
    }

    let keptCount = 0;
    for (let i = 0; i < 20; i++) {
      const val = rawSwaps[i];
      if (val == null || val === '없음' || val === -1 || val === 255) {
        result[i] = null;
        continue;
      }
      const numVal = Number(val);
      if (Number.isNaN(numVal)) {
        result[i] = null;
        continue;
      }
      if (classGrowthsOrProfile && !isSkillUnlocked(numVal, classGrowthsOrProfile)) {
        result[i] = null;
        continue;
      }
      if (keptCount < allowance) {
        result[i] = numVal;
        keptCount++;
      } else {
        result[i] = null;
      }
    }
    return result;
  }

  /**
   * 종족 선택 검증 및 기본종족 복원 [M2, M4, 교정 21.7]
   * 비기본직업 성장 5 미만이면 선택종족을 기본종족으로 되돌린다.
   */
  function validateRaceSelection(classId, growth = 1, selectedRace = null, classGrowthsOrProfile = null) {
    const cid = Math.max(0, Math.min(9, Math.floor(classId || 0)));
    const classDef = CLASS_DEFINITIONS[cid] || CLASS_DEFINITIONS[0];
    const defaultRace = classDef.defaultRace;

    if (cid === 0) return 0;
    if ((growth || 0) < 5) {
      return defaultRace;
    }
    const picked = (selectedRace != null && selectedRace !== '없음') ? Math.floor(Number(selectedRace)) : defaultRace;
    if (Number.isNaN(picked) || picked < 0 || picked > 9) {
      return defaultRace;
    }
    if (classGrowthsOrProfile && picked !== defaultRace && !isRaceUnlocked(picked, classGrowthsOrProfile)) {
      return defaultRace;
    }
    return picked;
  }

  /**
   * 퍽/결함 슬롯 유효성 검증 및 정리 [M2, 교정 21.7]
   * - 퍽4칸·결함4칸 각각 중복을 검사해 먼저 나온 ID를 남기고 뒤 중복을 빈칸(null)으로 한다.
   * - 그 뒤 결함 없는 슬롯의 퍽은 지우되 결함만 있는 칸은 남긴다.
   * - 교체설정 20칸은 앞에서부터 허용수만 남기고 그 뒤 설정은 빈칸으로 한다.
   * - 비기본직업 성장 5 미만이면 선택종족을 기본종족으로 되돌린다.
   * - 고정첫쌍·해제슬롯의 기존 우리 입력검사는 별도 유지하며 이를 기준검증본문의 추가분기로 주장하지 않는다.
   */
  function validatePerkFlawSetup(classId, growth = 1, perksInput = [], flawsInput = [], options = {}) {
    // 2인자 호출 validatePerkFlawSetup(perksArray, flawsArray) 지원
    if (Array.isArray(classId)) {
      options = (growth && typeof growth === 'object' && !Array.isArray(growth)) ? growth : (perksInput || {});
      flawsInput = Array.isArray(growth) ? growth : [];
      perksInput = classId;
      classId = (options && options.classId != null) ? options.classId : 1;
      growth = (options && options.growth != null) ? options.growth : 10;
    } else if (classId && typeof classId === 'object') {
      const cfg = classId;
      options = cfg;
      classId = cfg.classId != null ? cfg.classId : (cfg.id != null ? cfg.id : 1);
      growth = cfg.growth != null ? cfg.growth : 10;
      perksInput = Array.isArray(cfg.perks) ? cfg.perks : [];
      flawsInput = Array.isArray(cfg.flaws) ? cfg.flaws : [];
    }

    const cid = Math.max(0, Math.min(9, Math.floor(classId || 0)));
    const classDef = CLASS_DEFINITIONS[cid] || CLASS_DEFINITIONS[0];

    // 직업 0은 꾸미기 불가·퍽/결함 0개 [M2]
    if (cid === 0) {
      return {
        valid: true,
        perks: [null, null, null, null],
        flaws: [null, null, null, null],
        slotCount: 0,
        race: 0,
        defaultRace: 0,
        skillSwaps: new Array(20).fill(null),
        swapAllowance: 0
      };
    }

    const slotCount = getPerkSlotCount(growth);
    const perks = [null, null, null, null];
    const flaws = [null, null, null, null];

    // 고정첫쌍·해제슬롯의 기존 우리 입력검사는 별도 유지 (1칸 축약 입력 등 UI 보조용)
    const useLegacyFixedFirstPair = Boolean(
      (options && options.enforceFixedFirstPair) ||
      (Array.isArray(perksInput) && perksInput.length === 1 && Array.isArray(flawsInput) && flawsInput.length === 1 && perksInput[0] === 0 && flawsInput[0] === 0)
    );

    if (useLegacyFixedFirstPair) {
      perks[0] = classDef.fixedPerk;
      flaws[0] = classDef.fixedFlaw;
      const usedPerks = new Set();
      const usedFlaws = new Set();
      if (perks[0] != null) usedPerks.add(perks[0]);
      if (flaws[0] != null) usedFlaws.add(flaws[0]);

      for (let i = 1; i < slotCount; i++) {
        let p = (Array.isArray(perksInput) && perksInput[i] != null && perksInput[i] !== '없음') ? Number(perksInput[i]) : null;
        let f = (Array.isArray(flawsInput) && flawsInput[i] != null && flawsInput[i] !== '없음') ? Number(flawsInput[i]) : null;
        if (Number.isNaN(p)) p = null;
        if (Number.isNaN(f)) f = null;
        if (p != null) {
          if (usedPerks.has(p)) p = null;
          else usedPerks.add(p);
        }
        if (f != null) {
          if (usedFlaws.has(f)) f = null;
          else usedFlaws.add(f);
        }
        if (f == null) p = null;
        perks[i] = p;
        flaws[i] = f;
      }
    } else {
      // [교정 21.7] 기준 설정검증 본문:
      // 1) 퍽4칸·결함4칸 각각 중복을 검사해 먼저 나온 ID를 남기고 뒤 중복을 빈칸(null)으로 한다.
      const usedPerks = new Set();
      const usedFlaws = new Set();
      for (let i = 0; i < 4; i++) {
        let p = (Array.isArray(perksInput) && perksInput[i] != null && perksInput[i] !== '없음' && perksInput[i] !== 255 && perksInput[i] !== -1)
          ? Number(perksInput[i])
          : null;
        let f = (Array.isArray(flawsInput) && flawsInput[i] != null && flawsInput[i] !== '없음' && flawsInput[i] !== 255 && flawsInput[i] !== -1)
          ? Number(flawsInput[i])
          : null;
        if (Number.isNaN(p)) p = null;
        if (Number.isNaN(f)) f = null;

        if (p != null) {
          if (usedPerks.has(p)) {
            p = null;
          } else {
            usedPerks.add(p);
          }
        }
        if (f != null) {
          if (usedFlaws.has(f)) {
            f = null;
          } else {
            usedFlaws.add(f);
          }
        }
        perks[i] = p;
        flaws[i] = f;
      }

      // 2) 그 뒤 결함 없는 슬롯의 퍽은 지우되 결함만 있는 칸은 남긴다.
      for (let i = 0; i < 4; i++) {
        if (flaws[i] == null) {
          perks[i] = null;
        }
      }
    }

    const rawRace = (options && options.race != null)
      ? options.race
      : ((options && options.selectedRace != null) ? options.selectedRace : classDef.defaultRace);
    const race = validateRaceSelection(cid, growth, rawRace, options ? options.profile : null);

    const rawSwaps = (options && Array.isArray(options.skillSwaps))
      ? options.skillSwaps
      : ((options && Array.isArray(options.swaps)) ? options.swaps : []);
    const skillSwaps = validateSkillSwapSetup(growth, rawSwaps, null, options ? options.profile : null);

    return {
      valid: true,
      perks,
      flaws,
      slotCount,
      race,
      defaultRace: classDef.defaultRace,
      skillSwaps,
      swapAllowance: getSkillSwapAllowance(growth)
    };
  }

  /**
   * 직업 설정 종합 검증 헬퍼 [교정 21.7]
   */
  function validateClassSetup(setupOrClassId, growth = 1, perksInput = [], flawsInput = [], selectedRace = null, swapInput = []) {
    if (setupOrClassId && typeof setupOrClassId === 'object' && !Array.isArray(setupOrClassId)) {
      return validatePerkFlawSetup(
        setupOrClassId.classId != null ? setupOrClassId.classId : setupOrClassId.id,
        setupOrClassId.growth != null ? setupOrClassId.growth : 1,
        setupOrClassId.perks || [],
        setupOrClassId.flaws || [],
        {
          race: setupOrClassId.race != null ? setupOrClassId.race : setupOrClassId.selectedRace,
          skillSwaps: setupOrClassId.skillSwaps || setupOrClassId.swaps || [],
          profile: setupOrClassId.profile || null
        }
      );
    }
    return validatePerkFlawSetup(setupOrClassId, growth, perksInput, flawsInput, {
      race: selectedRace,
      skillSwaps: swapInput
    });
  }

  /**
   * 종족 해제 여부 검사 [M4]
   * 종족 해제는 그 종족을 기본으로 가진 직업 성장 > 4 (즉 성장 5 이상).
   * 다른 현재 직업 성장만으로 우회하지 않는다.
   */
  function isRaceUnlocked(raceId, classGrowthsOrProfile = null) {
    const rId = Math.max(0, Math.min(9, Math.floor(raceId || 0)));
    // 종족 0은 기본 해제
    if (rId === 0) return true;

    const raceDef = RACE_DEFINITIONS[rId];
    if (!raceDef) return false;
    const defClassId = raceDef.defaultClassId;

    if (!classGrowthsOrProfile) return false;

    // 프로필 객체인 경우
    if (classGrowthsOrProfile.classes && Array.isArray(classGrowthsOrProfile.classes)) {
      const c = classGrowthsOrProfile.classes.find(item => item && item.id === defClassId);
      return Boolean(c && (c.growth >= 5 || c.level >= 5));
    }

    // 배열 형태 [growth0, growth1, ...]
    if (Array.isArray(classGrowthsOrProfile)) {
      const g = classGrowthsOrProfile[defClassId];
      return Boolean(g >= 5);
    }

    // 객체 형태 { 8: 5, ... } 또는 { warrior: 5, ... }
    if (typeof classGrowthsOrProfile === 'object') {
      const g = classGrowthsOrProfile[defClassId];
      if (g != null) return g >= 5;
      const classDef = CLASS_DEFINITIONS[defClassId];
      if (classDef && classGrowthsOrProfile[classDef.key] != null) {
        return classGrowthsOrProfile[classDef.key] >= 5;
      }
    }

    return false;
  }

  /**
   * 종족 변경 가능 여부 [M2]
   * 종족 변경은 직업 성장 5부터.
   */
  function canChangeRace(classId, growth) {
    const cid = Math.max(0, Math.min(9, Math.floor(classId || 0)));
    if (cid === 0) return false; // 직업 0은 꾸미기 불가
    return (growth || 0) >= 5;
  }

  /**
   * 스킬 공유해제 여부 [M5, 교정 21.3]
   * 공유해제 판정은 0~30 항상 참, 31~39는 대응 직업 1~9 성장 10 이상일 때만 참, 40·41은 항상 거짓이다.
   * 이미 장착된 40·41을 강제로 지우지는 않으며 공유 후보만 막는다.
   */
  function isSkillUnlocked(skillId, classGrowthsOrProfile = null) {
    const sId = Math.floor(skillId);
    if (sId >= 0 && sId <= 30) return true;
    if (sId === 40 || sId === 41) return false;

    if (sId >= 31 && sId <= 39) {
      // 고유 스킬 31~39와 직업 1~9 매핑: skillId - 30 = classId
      const targetClassId = sId - 30;
      if (!classGrowthsOrProfile) return false;

      if (classGrowthsOrProfile.classes && Array.isArray(classGrowthsOrProfile.classes)) {
        const c = classGrowthsOrProfile.classes.find(item => item && item.id === targetClassId);
        return Boolean(c && (c.growth >= 10 || c.level >= 10));
      }
      if (Array.isArray(classGrowthsOrProfile)) {
        return (classGrowthsOrProfile[targetClassId] || 0) >= 10;
      }
      if (typeof classGrowthsOrProfile === 'object') {
        const g = classGrowthsOrProfile[targetClassId];
        if (g != null) return g >= 10;
        const cDef = CLASS_DEFINITIONS[targetClassId];
        if (cDef && classGrowthsOrProfile[cDef.key] != null) {
          return classGrowthsOrProfile[cDef.key] >= 10;
        }
      }
      return false;
    }

    return false;
  }

  /**
   * 사용 가능한 스킬 풀 [M1, M5, 교정 21.3, 교정 21.7]
   */
  function getAvailableSkillPool(classId, classGrowthsOrProfile = null, swapSetup = null) {
    const cid = Math.max(0, Math.min(9, Math.floor(classId || 0)));
    const cDef = CLASS_DEFINITIONS[cid] || CLASS_DEFINITIONS[0];

    // 직업 0: 공유해제 검사를 거친 전체 풀 (0~30 + 해제된 고유 31~39, 40·41 제외) [M1, M5, 교정 21.3]
    if (cid === 0) {
      const pool = [];
      for (let s = 0; s <= 41; s++) {
        if (isSkillUnlocked(s, classGrowthsOrProfile)) {
          pool.push(s);
        }
      }
      return pool;
    }

    // 다른 직업: 고유 첫 칸 유지 + 기본 20개 풀 (교체설정이 주어진 경우 허용수 및 공유해제/중복 검증 반영)
    const basePool = [...cDef.skillPool];
    let growth = 10;
    let rawSwaps = swapSetup;
    if (classGrowthsOrProfile && typeof classGrowthsOrProfile === 'object') {
      if (Array.isArray(classGrowthsOrProfile.classes)) {
        const cEntry = classGrowthsOrProfile.classes.find(item => item && item.id === cid);
        if (cEntry) {
          if (cEntry.growth != null) growth = cEntry.growth;
          if (!rawSwaps && Array.isArray(cEntry.skillSwaps)) rawSwaps = cEntry.skillSwaps;
        }
      } else if (classGrowthsOrProfile[cid] != null) {
        growth = classGrowthsOrProfile[cid];
      }
    }

    if (Array.isArray(rawSwaps) && rawSwaps.length > 0) {
      const validatedSwaps = validateSkillSwapSetup(growth, rawSwaps, null, classGrowthsOrProfile);
      // 고유 첫 칸(index 0)은 교체 불가
      for (let i = 1; i < 20; i++) {
        const rep = validatedSwaps[i];
        if (rep != null && isSkillUnlocked(rep, classGrowthsOrProfile) && !basePool.includes(rep)) {
          basePool[i] = rep;
        }
      }
    }

    return basePool;
  }

  /**
   * 초기 영구 프로필 생성 [B, M1, N1, N3]
   * 직업 10개의 성장 0~10·해제 여부·종족·퍽 4·결함 4·교체스킬 설정 20칸,
   * 업적 78개의 진행과 확정 여부, 기록 6분류 각각 10개.
   * 처음 열린 직업은 0만 성장 1, 나머지 성장 0.
   */
  function createDefaultProfile() {
    const classes = CLASS_DEFINITIONS.map(c => {
      const isAdventurer = (c.id === 0);
      return {
        id: c.id,
        key: c.key,
        name: c.name,
        unlocked: isAdventurer,
        growth: isAdventurer ? 1 : 0,
        race: c.defaultRace,
        perks: isAdventurer ? [null, null, null, null] : [c.fixedPerk, null, null, null],
        flaws: isAdventurer ? [null, null, null, null] : [c.fixedFlaw, null, null, null],
        skillPool: [...c.skillPool]
      };
    });

    const achievements = ACHIEVEMENTS_TABLE.map(a => ({
      id: a.id,
      desc: a.desc,
      progress: 0,
      unlocked: false,
      unverified: a.unverified
    }));

    const highScores = {
      normal_0: [],
      normal_1: [],
      normal_2: [],
      normal_3: [],
      '100turns': [],
      separate_score: []
    };

    return {
      version: 1,
      classes,
      achievements,
      highScores,
      specialKillsTotal: 0
    };
  }

  /**
   * 업적 진행량 기록 및 달성 판정 [N1]
   * 조건 발생 때 진행량 사건을 낸다.
   * 임시값: 로컬 진행은 0~100 누적 제한, 100에서 확정, 이미 확정이면 한 번만 기록 (U08).
   * 미판독 행은 잠정 사건만 남기고 자동 확정 해제하지 않는다.
   * 특수 모드의 업적 허용은 67·76 외 확정 해제 안 함.
   */
  function recordAchievementProgress(profile, achievementId, amount = null, session = null) {
    if (!profile) return null;
    const achDef = ACHIEVEMENTS_TABLE.find(a => a.id === achievementId);
    if (!achDef) return null;

    if (!Array.isArray(profile.achievements)) {
      profile.achievements = [];
    }

    let entry = profile.achievements.find(a => a.id === achievementId);
    if (!entry) {
      entry = { id: achievementId, progress: 0, unlocked: false, unverified: achDef.unverified };
      profile.achievements.push(entry);
    }

    // 미판독 행은 잠정 사건만 남기고 자동 확정 해제하지 않는다 [N1, U08]
    if (achDef.unverified) {
      entry.unlocked = false;
      return { achievementId, unverified: true, unlocked: false, progress: entry.progress };
    }

    // 특수 모드의 업적 허용은 67·76 외 확정 해제 안 함 [N1]
    const isSpecialMode = session && (session.mode === 'turn100' || session.mode === 'score');
    if (isSpecialMode && achievementId !== 67 && achievementId !== 76) {
      return { achievementId, specialModeBlocked: true, unlocked: false, progress: entry.progress };
    }

    if (entry.unlocked) {
      return entry; // 이미 확정이면 한 번만 기록
    }

    const inc = (amount != null ? amount : achDef.progress);
    entry.progress = Math.min(100, Math.max(0, (entry.progress || 0) + inc));
    if (entry.progress >= 100) {
      entry.unlocked = true;
      entry.progress = 100;
    }

    return entry;
  }

  /**
   * 업적 사건 발생 + 영구 프로필 진행 한 번 연결 [N1, 교정 22.1]
   */
  function emitAchievementProgress(session, achievementId, amount = null, extra = {}) {
    if (!session) return null;
    const achDef = ACHIEVEMENTS_TABLE.find(a => a.id === achievementId);
    if (!achDef) return null;

    const effectiveProgress = amount != null ? amount : achDef.progress;
    session.events = session.events || [];
    session.events.push({
      type: 'achievement_progress',
      id: achievementId,
      progress: effectiveProgress,
      ...extra
    });

    if (session.profile) {
      recordAchievementProgress(session.profile, achievementId, effectiveProgress, session);
    }
    return effectiveProgress;
  }

  /**
   * 상태 임계 업적 1회 사건 + 프로필 연결 (중복 이벤트 방지) [교정 22.1]
   */
  function emitAchievementProgressOnce(session, achievementId, amount = null, extra = {}) {
    if (!session) return null;
    session._emittedOnce = session._emittedOnce || {};
    if (session._emittedOnce[achievementId]) {
      if (session.profile) {
        const achDef = ACHIEVEMENTS_TABLE.find(a => a.id === achievementId);
        const val = amount != null ? amount : (achDef ? achDef.progress : 100);
        recordAchievementProgress(session.profile, achievementId, val, session);
      }
      return null;
    }
    session._emittedOnce[achievementId] = true;
    return emitAchievementProgress(session, achievementId, amount, extra);
  }

  /**
   * 업적 41: 승급 뒤 판의 생존 특수 적 3개 이상 [교정 22.1]
   */
  function checkSpecialCountAchievement41(session) {
    if (!session || !Array.isArray(session.cells)) return;
    let specialCount = 0;
    for (const c of session.cells) {
      if (c && !c.erased && (c.kind === KIND_ENEMY || c.kindCode === 1) && c.enemy && c.enemy.enemyKind > 0 && c.enemy.hitPoints > 0) {
        specialCount++;
      }
    }
    if (specialCount >= 3) {
      emitAchievementProgress(session, 41, 100);
    }
  }

  /**
   * 업적 29~33 · 70 · 71 상태 점검 및 사건/프로필 연결 [교정 22.1]
   */
  function checkRankAndBuildAchievements(session) {
    if (!session || !session.hero) return;
    const hero = session.hero;
    const rank = hero.rank || 1;
    if (rank >= 5) emitAchievementProgressOnce(session, 29, 100);
    if (rank >= 10) emitAchievementProgressOnce(session, 30, 100);
    if (rank >= 25) emitAchievementProgressOnce(session, 31, 100);
    if (rank >= 50) emitAchievementProgressOnce(session, 32, 100);
    if (rank >= 100) emitAchievementProgressOnce(session, 33, 100);

    const difficulty = session.difficulty != null ? session.difficulty : 1;
    const perkCount = Array.isArray(hero.perks) ? hero.perks.filter(p => p != null && p !== 255).length : 0;
    const flawCount = Array.isArray(hero.flaws) ? hero.flaws.filter(f => f != null && f !== 255).length : 0;
    if (rank >= 10 && difficulty === 3 && perkCount === 1 && flawCount === 4) {
      emitAchievementProgressOnce(session, 70, 100);
    }
    const actionCount = Array.isArray(session.actions) ? session.actions.length : 0;
    if (rank >= 5 && difficulty === 3 && actionCount === 0) {
      emitAchievementProgressOnce(session, 71, 100);
    }
  }

  /**
   * 업적 72: 장비 저장 때 비0 능력 8개 이상 [교정 22.1]
   */
  function checkGearStatCountAchievement72(session) {
    if (!session || !session.gear) return false;
    const gearList = Array.isArray(session.gear) ? session.gear : Object.values(session.gear);
    for (const g of gearList) {
      if (g && Array.isArray(g.boosts)) {
        const nonZeroCount = g.boosts.filter(v => typeof v === 'number' && v !== 0).length;
        if (nonZeroCount >= 8) {
          emitAchievementProgressOnce(session, 72, 100);
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 업적 74: 첫 낙하 보충 후 생성 수 10 이상이며 전부 적이면 100 진행 [교정 22.3]
   */
  function finalizeFirstDropSpawnAchievement(session) {
    if (!session) return;
    const spawnCount = session._turnSpawnCount || 0;
    const enemySpawnCount = session._turnEnemySpawnCount || 0;
    if (spawnCount >= 10 && spawnCount === enemySpawnCount) {
      emitAchievementProgress(session, 74, 100);
    }
    session._turnSpawnCount = 0;
    session._turnEnemySpawnCount = 0;
  }

  /**
   * 점수 모드 이번 입력 점수 누적 및 이번 입력값 0 초기화 [교정 22.4]
   */
  function commitScoreModeTurnPoints(session) {
    if (!session || session.mode !== 'score') return 0;
    const turnPts = Number(session.scoreModeTurnPoints) || 0;
    if (turnPts !== 0) {
      session.scoreModePoints = (Number(session.scoreModePoints) || 0) + turnPts;
    }
    session.scoreModeTurnPoints = 0;
    return session.scoreModePoints || 0;
  }

  /**
   * 현재 상태 기반 업적 점검 [N1, 교정 22.1]
   */
  function checkAchievements(session, profile = null, context = {}) {
    const prof = profile || (session && session.profile ? session.profile : createDefaultProfile());

    if (session && session.hero) {
      const hero = session.hero;
      // 판 레벨 도달 검사 (29~33)
      const rank = hero.rank || 1;
      if (rank >= 5) recordAchievementProgress(prof, 29, 100, session);
      if (rank >= 10) recordAchievementProgress(prof, 30, 100, session);
      if (rank >= 25) recordAchievementProgress(prof, 31, 100, session);
      if (rank >= 50) recordAchievementProgress(prof, 32, 100, session);
      if (rank >= 100) recordAchievementProgress(prof, 33, 100, session);

      // 70: 판레벨10 · 난이도3 · 퍽수1 · 결함수4
      const difficulty = session.difficulty != null ? session.difficulty : 1;
      const perkCount = Array.isArray(hero.perks) ? hero.perks.filter(p => p != null && p !== 255).length : 0;
      const flawCount = Array.isArray(hero.flaws) ? hero.flaws.filter(f => f != null && f !== 255).length : 0;
      if (rank >= 10 && difficulty === 3 && perkCount === 1 && flawCount === 4) {
        recordAchievementProgress(prof, 70, 100, session);
      }

      // 71: 판레벨5 · 난이도3 · 장착스킬0
      const actionCount = Array.isArray(session.actions) ? session.actions.length : 0;
      if (rank >= 5 && difficulty === 3 && actionCount === 0) {
        recordAchievementProgress(prof, 71, 100, session);
      }

      // 72: 장비 저장 때 비0 능력 8개 이상
      if (session.gear) {
        const gearList = Array.isArray(session.gear) ? session.gear : Object.values(session.gear);
        const hasEight = gearList.some(g => g && Array.isArray(g.boosts) && g.boosts.filter(v => typeof v === 'number' && v !== 0).length >= 8);
        if (hasEight) {
          recordAchievementProgress(prof, 72, 100, session);
        }
      }

      // 67 / 76 종료 상태 점검
      if (session.phase === 'end') {
        recordAchievementProgress(prof, 67, 100, session);
      }
      if (session.mode === 'turn100' && (session.tick || 0) >= 100) {
        recordAchievementProgress(prof, 76, 100, session);
      }
    }

    // 프로필 직업 성장 검사 (1~9, 10~18, 19~27, 28)
    if (prof.classes && Array.isArray(prof.classes)) {
      for (let i = 1; i <= 9; i++) {
        const c = prof.classes.find(item => item && item.id === i);
        if (c && c.unlocked && c.growth > 0) {
          recordAchievementProgress(prof, i, 100, session); // 1~9: 직업i 해제·성장0 아님
        }
        if (c && c.growth >= 10) {
          recordAchievementProgress(prof, 18 + i, 100, session); // 19~27: 직업i 성장 10
        }
      }

      // 10~18: 종족1~9 기본직업 성장 5 이상
      for (let r = 1; r <= 9; r++) {
        if (isRaceUnlocked(r, prof)) {
          recordAchievementProgress(prof, 9 + r, 100, session);
        }
      }

      // 28: 비기본 직업 모두 성장 10
      const allNonBaseMax = prof.classes.filter(c => c && c.id > 0).every(c => c.growth >= 10);
      if (allNonBaseMax) {
        recordAchievementProgress(prof, 28, 100, session);
      }
    }

    return prof;
  }

  /**
   * 점수 계산 [N2]
   * - 일반점수: 완료턴 + 세자원의 현재잔량과 완료누적합 + 장착스킬 등급합 * 100
   * - 100턴 모드: 각 자원 총합을 각각 4로 나눈 정수를 합하고 완료종료 때 2배 (턴·스킬등급 가산 없음)
   * - 별도점수 모드: 전용점수 필드 반환, 증가식은 임시값 0 (U05)
   */
  function calculateScore(session, options = {}) {
    if (!session) return 0;
    const mode = session.mode || 'normal';
    const hero = session.hero || {};
    const actions = session.actions || [];
    const totals = session.totals || {};

    const xpTotal = (hero.xp || 0) + (hero.completedXp || totals.xp || 0);
    const coinsTotal = (hero.coins || 0) + (hero.completedCoins || totals.coins || 0);
    const upgradeTotal = (hero.upgrade || 0) + (hero.completedUpgrade || totals.upgrade || 0);

    if (mode === 'normal') {
      const tick = session.tick || 0;
      const resSum = xpTotal + coinsTotal + upgradeTotal;
      const skillGradeSum = actions.reduce((sum, a) => sum + ((a && a.grade) ? a.grade : 1), 0);
      return tick + resSum + (skillGradeSum * 100);
    }

    if (mode === 'turn100') {
      const qXp = Math.floor(xpTotal / 4);
      const qCoins = Math.floor(coinsTotal / 4);
      const qUpgrade = Math.floor(upgradeTotal / 4);
      let s = qXp + qCoins + qUpgrade;
      const isCompleted = options.completed || session.isCompleted || (session.tick >= 100 && session.phase === 'end');
      if (isCompleted) {
        s *= 2;
      }
      return s;
    }

    if (mode === 'score') {
      return session.scoreModePoints || 0;
    }

    return 0;
  }

  /**
   * 기록 저장 및 관리 [N2, 추가 29.5]
   * 6분류 각각 10개 점수 내림차순. 동점이면 먼저 저장한 기록 우선 (U05).
   * 난이도 0~3은 normal_0~normal_3 버킷에 분리 저장되며, 난이도 미지정 또는 없는 옛 기록은 normal_1(보통)으로 본다.
   */
  function addHighScore(profile, categoryOrDifficulty, record) {
    if (!profile) return [];
    if (!profile.highScores) {
      profile.highScores = {
        normal_0: [],
        normal_1: [],
        normal_2: [],
        normal_3: [],
        '100turns': [],
        separate_score: []
      };
    }

    let catKey = categoryOrDifficulty;
    if (catKey == null) {
      if (record && record.category != null) {
        catKey = record.category;
      } else if (record && record.difficulty != null) {
        catKey = record.difficulty;
      } else {
        catKey = 1;
      }
    }

    if (typeof catKey === 'number') {
      const d = Math.max(0, Math.min(3, Math.floor(catKey)));
      catKey = `normal_${d}`;
    } else {
      const str = String(catKey);
      if (str === 'turn100' || str === '100turns') {
        catKey = '100turns';
      } else if (str === 'score' || str === 'separate_score') {
        catKey = 'separate_score';
      } else if (str.startsWith('normal_')) {
        catKey = str;
      } else if (str === 'easy' || str === '쉬움') {
        catKey = 'normal_0';
      } else if (str === 'normal' || str === '보통') {
        catKey = 'normal_1';
      } else if (str === 'hard' || str === '어려움') {
        catKey = 'normal_2';
      } else if (str === 'hell' || str === 'nightmare' || str === '지옥') {
        catKey = 'normal_3';
      } else {
        const parsed = parseInt(str, 10);
        if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 3) {
          catKey = `normal_${parsed}`;
        } else {
          catKey = 'normal_1';
        }
      }
    }

    if (record && typeof record === 'object' && record.difficulty == null) {
      if (catKey.startsWith('normal_')) {
        const dNum = parseInt(catKey.replace('normal_', ''), 10);
        record.difficulty = Number.isNaN(dNum) ? 1 : dNum;
      }
    }

    const list = profile.highScores[catKey] || (profile.highScores[catKey] = []);
    const newScore = (record && record.score != null) ? record.score : 0;

    // [교정 30.5] 10개가 찬 뒤에는 순위 안(10번째보다 엄격히 큼)일 때만 마지막 자리를 새 기록으로 교체해 정렬, 순위 밖이면 넣지 않음
    if (list.length >= 10) {
      list.sort((a, b) => (b && b.score != null ? b.score : 0) - (a && a.score != null ? a.score : 0));
      if (list.length > 10) {
        list.length = 10;
      }
      const lastRecord = list[list.length - 1];
      const lastScore = (lastRecord && lastRecord.score != null) ? lastRecord.score : 0;
      if (newScore <= lastScore) {
        return list;
      }
      list[list.length - 1] = record;
      for (let i = list.length - 1; i > 0; i--) {
        const curScore = (list[i] && list[i].score != null) ? list[i].score : 0;
        const prevScore = (list[i - 1] && list[i - 1].score != null) ? list[i - 1].score : 0;
        if (prevScore < curScore) {
          const tmp = list[i - 1];
          list[i - 1] = list[i];
          list[i] = tmp;
        } else {
          break;
        }
      }
      return list;
    }

    // 10개 미만일 때: 점수 내림차순, 동점이면 먼저 저장한 기록 우선
    let insertIdx = list.findIndex(r => (r && r.score != null ? r.score : 0) < newScore);
    if (insertIdx === -1) {
      list.push(record);
    } else {
      list.splice(insertIdx, 0, record);
    }

    return list;
  }

  /**
   * 성장 또는 해제할 남은 직업보상 대상이 있는지 판정 [M6, 교정 21.4]
   */
  function hasClassRewardTarget(session, profile = null) {
    if (session && (session.hasRemainingClassRewards === false || session.noClassRewardTarget === true)) {
      return false;
    }
    const prof = profile || (session && session.profile ? session.profile : null);
    if (!prof || !Array.isArray(prof.classes)) {
      return true;
    }
    const currentClassId = (session && session.hero && session.hero.classKey != null) ? session.hero.classKey : 0;
    const curClass = prof.classes.find(c => c && c.id === currentClassId);
    const curGrowth = curClass ? (curClass.growth != null ? curClass.growth : (curClass.level || 0)) : 0;
    const canGrowCurrent = (currentClassId > 0 && curClass && curGrowth < 10);
    const canUnlockAny = prof.classes.some(c => c && c.id > 0 && !c.unlocked);
    return Boolean(canGrowCurrent || canUnlockAny);
  }

  /**
   * 직업 보상 진행도 갱신 [M6, 교정 21.4, 교정 21.6]
   * - 난이도 0이 아닐 때 특수적 보상 처치가 카운터를 1 줄인다 (100턴 모드는 정수 0~100이 50 미만일 때만 감소).
   * - 0 이하가 되면 한 판 발생 수 3 미만이고 성장/해제할 대상이 있으면 같은 처치 칸을 직업보상 칸으로 남기고
   *   발생 수를 +1, 다음 대기를 정수 20~30으로 정한다.
   * - 발생 수가 3 이상이거나 남은 직업보상이 없으면 새 칸을 만들지 않고 대기를 0으로 둔다.
   * - 직업보상 최초 대기 25는 임시값으로 유지하며, 카운터 초기화(makeSession/unpackSession)와 감소(이 함수)를 분리한다.
   */
  function triggerClassRewardProgress(session, killedEnemyKind, killedCell = null, profile = null) {
    if (!session || session.difficulty === 0) {
      return { triggered: false, counter: session ? session.classRewardCounter : 0 };
    }
    if (!killedEnemyKind || killedEnemyKind <= 0) {
      return { triggered: false, counter: session.classRewardCounter };
    }

    session.classRewardCount = session.classRewardCount || 0;
    if (session.classRewardCounter == null) {
      session.classRewardCounter = 0; // 새 설치 카운터 초기값 0 [교정 32.4]
    }

    const hasTarget = hasClassRewardTarget(session, profile);
    if (session.classRewardCount >= 3 || !hasTarget) {
      session.classRewardCounter = 0;
      return {
        triggered: false,
        reason: session.classRewardCount >= 3 ? 'max_reached' : 'no_target',
        counter: 0
      };
    }

    if (session.mode === 'turn100') {
      const roll100 = drawInt(session.rng, 0, 100, 'classRewardTurn100');
      if (roll100 >= 50) {
        return { triggered: false, counter: session.classRewardCounter, roll100 };
      }
    }

    session.classRewardCounter -= 1;
    if (session.classRewardCounter <= 0) {
      if (session.classRewardCount >= 3 || !hasClassRewardTarget(session, profile)) {
        session.classRewardCounter = 0;
        return { triggered: false, counter: 0 };
      }

      const hasMark = Boolean(
        killedCell && (
          killedCell.marked ||
          killedCell.isMarked ||
          (killedCell.enemy && (killedCell.enemy.marked || killedCell.enemy.isMarked))
        )
      );

      // 같은 처치 칸을 직업보상 칸으로 남긴다 [교정 21.4]
      let targetCell = killedCell;
      if (!targetCell && Array.isArray(session.cells)) {
        targetCell = session.cells.find(c => c && c.enemy && c.enemy.enemyKind === killedEnemyKind) ||
          session.cells.find(c => c && !c.erased && (!c.enemy || c.enemy.enemyKind === 0)) ||
          session.cells[0] ||
          null;
      }

      if (targetCell) {
        targetCell.erased = false;
        if (targetCell.enemy) {
          targetCell.enemy.hitPoints = 0;
          targetCell.enemy._rewardedKill = true;
        }
        targetCell.kind = 'reward';
        targetCell.kindCode = 5;
        targetCell.type = 'phylactery';
        targetCell.bridgeForm = 'reward';
        targetCell.rewardConsumed = false;
        targetCell.firePower = 0;
        targetCell.fireCollected = false;
        targetCell.frozen = false;
        targetCell.broken = false;
        targetCell.magicBlade = false;
        targetCell.arrow = false;
        targetCell.potionForm = 'normal';
      }

      session.classRewardCount += 1;
      const nextInterval = drawInt(session.rng, 20, 30, 'classRewardInterval');
      session.classRewardCounter = nextInterval;
      if (hasMark) {
        emitAchievementProgress(session, 66, 100);
      }
      return {
        triggered: true,
        count: session.classRewardCount,
        nextInterval,
        counter: session.classRewardCounter,
        cell: targetCell
      };
    }

    return { triggered: false, counter: session.classRewardCounter };
  }

  /**
   * 직업 보상 칸 수집 처리 [M6, 교정 21.5]
   * - 비기본 현재 직업 성장 10 미만이면 정수 0~1 갈림길에서:
   *   1은 현재 직업 성장 +1,
   *   0은 미해제 비기본 직업 중 무작위 1개 해제(성장 1)다 (미해제가 없으면 현재 직업 성장 +1).
   * - 기본 직업이거나 현재 직업이 만렙(>=10)이면 미해제 직업 무작위 해제를 먼저 시도하고,
   *   미해제가 없으면 현재 직업 성장을 시도하며, 둘 다 불가면 변화 없이 소모한다.
   */
  function syncProfileClassMetadata(prof, cls) {
    if (!prof || !cls) return;
    if (Array.isArray(prof.unlockedClasses) && cls.unlocked && cls.key && !prof.unlockedClasses.includes(cls.key)) {
      prof.unlockedClasses.push(cls.key);
    }
    if (prof.classProgress && typeof prof.classProgress === 'object' && cls.key) {
      prof.classProgress[cls.key] = prof.classProgress[cls.key] || { level: 1, exp: 0, games: 0, wins: 0, highScore: 0 };
      prof.classProgress[cls.key].level = cls.growth;
    }
  }

  function collectClassReward(session, profile = null, rewardCell = null) {
    if (!session || !session.hero) return { type: 'none' };
    if (rewardCell && rewardCell._rewardCollectedOnce) {
      return { type: 'none', reason: 'already_collected' };
    }
    if (rewardCell) {
      rewardCell._rewardCollectedOnce = true;
      rewardCell.rewardConsumed = true;
      rewardCell.bridgeForm = 'none';
    }

    const prof = profile || (session.profile ? session.profile : null);
    if (!prof || !Array.isArray(prof.classes)) {
      return { type: 'none' };
    }

    const currentClassId = session.hero.classKey || 0;
    const curClass = prof.classes.find(c => c && c.id === currentClassId);
    const curGrowth = curClass ? (curClass.growth != null ? curClass.growth : (curClass.level || 0)) : 0;
    const canGrowCurrent = Boolean(currentClassId > 0 && curClass && curGrowth < 10);
    const unreleasedClasses = prof.classes.filter(c => c && c.id > 0 && !c.unlocked);

    if (canGrowCurrent) {
      const choice = drawInt(session.rng, 0, 1, 'classRewardChoice');
      if (choice === 1) {
        curClass.growth = Math.min(10, curGrowth + 1);
        syncProfileClassMetadata(prof, curClass);
        checkAchievements(session, prof);
        return { type: 'growth', classId: currentClassId, newGrowth: curClass.growth };
      } else {
        if (unreleasedClasses.length > 0) {
          const pickIdx = drawInt(session.rng, 0, unreleasedClasses.length - 1, 'classRewardUnlock');
          const pickedClass = unreleasedClasses[pickIdx] || unreleasedClasses[0];
          pickedClass.unlocked = true;
          pickedClass.growth = 1;
          syncProfileClassMetadata(prof, pickedClass);
          checkAchievements(session, prof);
          return { type: 'unlock', classId: pickedClass.id, classKey: pickedClass.key, newGrowth: 1 };
        }
        curClass.growth = Math.min(10, curGrowth + 1);
        syncProfileClassMetadata(prof, curClass);
        checkAchievements(session, prof);
        return { type: 'growth', classId: currentClassId, newGrowth: curClass.growth };
      }
    }

    // 기본 직업(0)이거나 현재 직업이 만렙(>=10)인 경우: 미해제 직업 무작위 해제를 먼저 시도
    if (unreleasedClasses.length > 0) {
      const pickIdx = drawInt(session.rng, 0, unreleasedClasses.length - 1, 'classRewardUnlock');
      const pickedClass = unreleasedClasses[pickIdx] || unreleasedClasses[0];
      pickedClass.unlocked = true;
      pickedClass.growth = 1;
      syncProfileClassMetadata(prof, pickedClass);
      checkAchievements(session, prof);
      return { type: 'unlock', classId: pickedClass.id, classKey: pickedClass.key, newGrowth: 1 };
    }

    if (canGrowCurrent) {
      curClass.growth = Math.min(10, curGrowth + 1);
      syncProfileClassMetadata(prof, curClass);
      checkAchievements(session, prof);
      return { type: 'growth', classId: currentClassId, newGrowth: curClass.growth };
    }

    // 둘 다 불가면 변화 없이 소모 [교정 21.5]
    return { type: 'consumed_without_change' };
  }

  // ==========================================
  // 공개 모듈 인터페이스
  // ==========================================
  return {
    makeSession,
    inspectPath,
    settlePath,
    triggerAction,
    answerChoice,
    packSession,
    unpackSession,
    // 조각 1 세부 헬퍼 및 호환 함수 노출
    stepChain,
    canConnect,
    isValidChain,
    getCell,
    createCell,
    morphCellKind,
    createRNG,
    createSeededRng: createRNG,
    BOARD_WIDTH,
    BOARD_HEIGHT,
    BOARD_CELL_COUNT,
    KIND_POTION,
    KIND_ENEMY,
    KIND_COIN,
    KIND_SHIELD,
    KIND_SWORD,
    KIND_BRIDGE,
    // 조각 2 공격 및 피해 관련 함수 및 상수 노출
    DAMAGE_TYPE_NORMAL,
    DAMAGE_TYPE_VERTICAL,
    DAMAGE_TYPE_BLOCKED,
    DAMAGE_TYPE_NONCOMBAT,
    calculateTotalAttack,
    determineDamageType,
    applyAttackToEnemy,
    executeCombatPath,
    checkHeroSurvival,
    // 조각 3 반격 및 방패 관련 함수 노출
    getEffectiveEnemyStrike,
    getRetaliatingEnemies,
    calculateRetaliation,
    resolveRetaliation,
    settleRetaliation: resolveRetaliation,
    clearRetaliationSkips,
    updateEnemy21Growth,
    // 조각 4 낙하·턴끝·처리중단 관련 함수 노출
    applyDropAndRefill,
    createEnemyData,
    calculateEnemyStats,
    rollPromotion,
    applySpecialEnemyMultipliers,
    processFireAndFreeze,
    processRegenAndPoison,
    processEnemyAbilities,
    processTurnEnd,
    applyResourceCollection,
    continueTurn,
    // 조각 5 자원·경험치·레벨업·스킬·특수적보상 관련 노출
    applySingleToken,
    applyPotionToken,
    applyShieldToken,
    triggerBombPotion,
    distributeSpecialEnemyBounty,
    learnOrUpgradeSkill,
    generateLevelupChoice,
    generateShopChoice,
    generateUpgradeChoice,
    getExtraRates,
    SKILL_BASE_COOLDOWNS,
    STAT_OPTIONS,
    // 조각 6 특수적 앞묶음 관련 노출
    unfreezeByEnemy8,
    triggerEnemy10Explosion,
    pickRandomUpToN,
    // 조각 8 특수적 뒤묶음 관련 노출
    handleEnemy31Spawn,
    // 조각 9 승급·난이도곡선 관련 노출
    getStatRange,
    promoteNormalEnemy,
    isTurn100PromotionTiming,
    // 조각 10 스킬 앞21종 관련 노출
    canTriggerAction,
    SKILL_DEFINITIONS,
    executeSkillEffect,
    findActionInSession,
    // 조각 11 스킬 뒤21종·조합 관련 노출
    isPointInPolygon,
    // 조각 12 상점·강화·스탯 관련 노출
    recalculateHeroStats,
    generateNewGear,
    getUpgradeIncrease,
    getUpgradeDecrease,
    isUpgradeAllowed,
    GEAR_UPGRADE_CANDIDATES,
    GEAR_SLOT_NAMES,
    // 조각 13 직업·퍽·종족·업적 관련 노출
    CLASS_DEFINITIONS,
    RACE_MORTAL_ENEMIES,
    RACE_DEFINITIONS,
    PERK_DEFINITIONS,
    FLAW_DEFINITIONS,
    ACHIEVEMENTS_TABLE,
    getPerkSlotCount,
    getSkillSwapAllowance,
    validatePerkFlawSetup,
    validateSkillSwapSetup,
    validateRaceSelection,
    validateClassSetup,
    isRaceUnlocked,
    canChangeRace,
    isSkillUnlocked,
    getAvailableSkillPool,
    createDefaultProfile,
    recordAchievementProgress,
    checkAchievements,
    calculateScore,
    addHighScore,
    hasClassRewardTarget,
    triggerClassRewardProgress,
    collectClassReward,
    // 조각 17 모든 수집·처치 보상과 독 관련 노출 [교정 17.1 ~ 17.7]
    createCollectionBatch,
    rollBonusForKind,
    rewardKillEnemy,
    collectCellInBatch,
    collectSkillArea,
    // 조각 20 레벨업·장비·대기시간 관련 노출 [교정 20.1 ~ 20.7]
    getShopSkillCandidates,
    isSharedSkillUnlocked,
    pickNonReplacement,
    // 조각 21 종족·공유해제·직업보상 관련 노출 [교정 21.1 ~ 21.7]
    getHeroInnateBaseStrike,
    isRewardCell,
    // 조각 22 업적 연결·저장·미해독 경계 관련 노출 [교정 22.1 ~ 22.7]
    emitAchievementProgress,
    commitScoreModeTurnPoints,
    // 조각 27 보충·특수 적·연결칸 재추첨 관련 노출 [교정 27.1 ~ 27.6]
    resetPromotionCooldown,
    populateRefillCell,
    drawRefillCellCode,
    // 조각 29 난이도 4단계 선택 관련 노출 [추가 29.1, 29.2]
    DIFFICULTY_NAMES,
    getDifficultyName,
    PROVISIONAL_ITEMS,
    CONFIRMED_CORRECTIONS,
    // 조각 33 상점·강화 멈춤 방지 안전장치 노출 [교정 33.1]
    cleanWaitingChoices
  };
}));
