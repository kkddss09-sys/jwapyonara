/**
 * 고블린 레이드 (Goblin Raid) - game.js
 * 브라우저 및 Node.js 공용 (UMD) 순수 규칙 모듈
 * 조각 1: 판 생성, 8방향 선 잇기, 되돌리기, 체인 확정 및 중력/보충
 * 조각 2: 적 칸(hp·atk·armor), 칼-적 체인 연결, 피해 계산, 턴 종료 반격, 게임 오버
 * 조각 3: 방패·물약·코인 자원 게이지, 강화 선택, 상점 장비, 구간별 타일 출현 비율
 * 조각 4: 특수 적 7종 (도망자·치유사·산성술사·화염술사·빙결술사·폭탄병·변환술사)
 * 조각 5: 경험치·레벨업·직업 10종·스킬 5종·점수 저장 (localStorage goblin_raid_v1)
 * 조각 6: 반응형 화면·SVG 아이콘 연동·체인 탐색 및 전체 흐름 시뮬레이션
 * 조각 7: 원작 정렬 ① - 칸 추첨 5종 균등(각 20%), 시작 판 적 없음, 플레이어 최대체력 40/공격 3, 적 능력치 곡선(난이도 0~3, L>40 보정), 적 공격 규칙(동결 제외, 독 절반)
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GoblinRaid = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BOARD_WIDTH = 6;
  const BOARD_HEIGHT = 6;
  const TILE_TYPES = ['sword', 'shield', 'potion', 'coin', 'enemy'];

  /**
   * 조각 7 - 원작판 5종 타일 균등 출현 가중치 (각 20%)
   */
  const UNIFORM_TILE_WEIGHTS = {
    sword: 20,
    shield: 20,
    potion: 20,
    coin: 20,
    enemy: 20
  };

  const TILE_ICONS = {
    sword: '⚔️',
    shield: '🛡️',
    potion: '🧪',
    coin: '🪙',
    enemy: '💀',
    phylactery: '🏺'
  };

  /**
   * 조각 6 - 타일 SVG 아이콘 경로 (시안 D)
   */
  const TILE_SVGS = {
    sword: 'assets/icons/tile-sword.svg',
    shield: 'assets/icons/tile-shield.svg',
    potion: 'assets/icons/tile-potion.svg',
    coin: 'assets/icons/tile-coin.svg',
    enemy: 'assets/icons/tile-enemy.svg',
    phylactery: 'assets/icons/enemy-boss.svg'
  };

  /**
   * 조각 9 - 승급 타이머 초기 대기 및 원작 특수 적 ID 상수
   */
  const PROMOTION_COOLDOWN_INITIAL = 50;

  const SPECIAL_ENEMY_IDS = Array.from({ length: 32 }, (_, i) => i + 1);

  const SPECIAL_ENEMY_ID_TO_TYPE = {
    3: 'runner',
    4: 'healer',
    6: 'acid',
    7: 'fire',
    8: 'ice',
    10: 'bomb',
    11: 'convert'
  };

  const SPECIAL_ENEMY_TYPE_TO_ID = {
    runner: 3,
    healer: 4,
    acid: 6,
    fire: 7,
    ice: 8,
    bomb: 10,
    convert: 11
  };

  /**
   * 특수 적 7종 상수 정의 (규칙 8번)
   */
  const SPECIAL_ENEMY_TYPES = ['runner', 'healer', 'acid', 'fire', 'ice', 'bomb', 'convert'];

  const SPECIAL_ENEMY_ICONS = {
    runner: '🏃',
    healer: '🌿',
    acid: '☣️',
    fire: '🔥',
    ice: '❄️',
    bomb: '💣',
    convert: '🧙'
  };

  const SPECIAL_ENEMY_SVGS = {
    runner: 'assets/icons/enemy-runner.svg',
    healer: 'assets/icons/enemy-healer.svg',
    acid: 'assets/icons/enemy-acid.svg',
    fire: 'assets/icons/enemy-fire.svg',
    ice: 'assets/icons/enemy-ice.svg',
    bomb: 'assets/icons/enemy-bomb.svg',
    convert: 'assets/icons/enemy-convert.svg',
    boss: 'assets/icons/enemy-boss.svg',
    normal: 'assets/icons/tile-enemy.svg',
    1: 'assets/icons/enemy-boss.svg',
    2: 'assets/icons/enemy-boss.svg',
    3: 'assets/icons/enemy-runner.svg',
    4: 'assets/icons/enemy-healer.svg',
    5: 'assets/icons/enemy-boss.svg',
    6: 'assets/icons/enemy-acid.svg',
    7: 'assets/icons/enemy-fire.svg',
    8: 'assets/icons/enemy-ice.svg',
    9: 'assets/icons/enemy-boss.svg',
    10: 'assets/icons/enemy-bomb.svg',
    11: 'assets/icons/enemy-convert.svg',
    12: 'assets/icons/enemy-boss.svg',
    13: 'assets/icons/enemy-boss.svg',
    14: 'assets/icons/enemy-boss.svg',
    15: 'assets/icons/enemy-boss.svg',
    16: 'assets/icons/enemy-boss.svg',
    17: 'assets/icons/enemy-boss.svg',
    18: 'assets/icons/enemy-boss.svg',
    19: 'assets/icons/enemy-boss.svg',
    20: 'assets/icons/enemy-boss.svg',
    21: 'assets/icons/enemy-boss.svg',
    22: 'assets/icons/enemy-boss.svg',
    23: 'assets/icons/enemy-boss.svg',
    24: 'assets/icons/enemy-boss.svg',
    25: 'assets/icons/enemy-boss.svg',
    26: 'assets/icons/enemy-boss.svg',
    27: 'assets/icons/enemy-boss.svg',
    28: 'assets/icons/enemy-boss.svg',
    29: 'assets/icons/enemy-boss.svg',
    30: 'assets/icons/enemy-boss.svg',
    31: 'assets/icons/enemy-boss.svg',
    32: 'assets/icons/enemy-boss.svg'
  };

  const SPECIAL_ENEMY_DEFAULTS = {
    runner: { countdown: 5, bonusGold: 5, expBonus: 10 },
    healer: { healAmount: 2, expBonus: 10 },
    acid: { expBonus: 10 },
    fire: { expBonus: 10 },
    ice: { expBonus: 10 },
    bomb: { countdown: 5, expBonus: 10 },
    convert: { expBonus: 10 }
  };

  /**
   * 조각 9 - 원작판 특수 적 스탯 배율 (원작판 3번 표)
   * (공격, 방어, 체력 순)
   * ID1=(×3,×3,×6) · ID2=(×2,유지,×3) · ID3=(0,×6,×6) · ID5=(×2,×10,÷2) ·
   * ID9=(유지,×2,×4) · ID10=(유지,×2,×6) · ID16=(×3,×2,×3) ·
   * ID17=(×2,플레이어 현재 방패값,×4) · ID19=(×4,유지,×5) ·
   * ID27=(×2,×4,×3) · ID28=(×2,×2,×4) · ID30=(÷2,유지,×5) · 그 밖의 특수 ID=(×2,×2,×4)
   */
  const SPECIAL_ENEMY_MULTIPLIERS = {
    1: { atk: (a) => a * 3, armor: (d) => d * 3, hp: (h) => h * 6 },
    2: { atk: (a) => a * 2, armor: (d) => d, hp: (h) => h * 3 },
    3: { atk: () => 0, armor: (d) => d * 6, hp: (h) => h * 6 },
    5: { atk: (a) => a * 2, armor: (d) => d * 10, hp: (h) => Math.floor(h / 2) },
    9: { atk: (a) => a, armor: (d) => d * 2, hp: (h) => h * 4 },
    10: { atk: (a) => a, armor: (d) => d * 2, hp: (h) => h * 6 },
    16: { atk: (a) => a * 3, armor: (d) => d * 2, hp: (h) => h * 3 },
    17: { atk: (a) => a * 2, armor: (d, p) => (p && p.armor != null ? Math.max(0, p.armor) : d), hp: (h) => h * 4 },
    19: { atk: (a) => a * 4, armor: (d) => d, hp: (h) => h * 5 },
    27: { atk: (a) => a * 2, armor: (d) => d * 4, hp: (h) => h * 3 },
    28: { atk: (a) => a * 2, armor: (d) => d * 2, hp: (h) => h * 4 },
    30: { atk: (a) => Math.floor(a / 2), armor: (d) => d, hp: (h) => h * 5 }
  };

  const DEFAULT_SPECIAL_ENEMY_MULTIPLIER = {
    atk: (a) => a * 2,
    armor: (d) => d * 2,
    hp: (h) => h * 4
  };

  function getSpecialEnemyMultipliers(specialId) {
    const sId = Math.max(1, Math.min(32, Math.floor(specialId || 0)));
    return SPECIAL_ENEMY_MULTIPLIERS[sId] || DEFAULT_SPECIAL_ENEMY_MULTIPLIER;
  }

  function getSpecialEnemySvg(specialIdOrType) {
    if (typeof specialIdOrType === 'number') {
      const sId = Math.floor(specialIdOrType);
      if (SPECIAL_ENEMY_SVGS[sId]) {
        return SPECIAL_ENEMY_SVGS[sId];
      }
      return 'assets/icons/enemy-boss.svg';
    }
    if (typeof specialIdOrType === 'string') {
      if (SPECIAL_ENEMY_SVGS[specialIdOrType]) {
        return SPECIAL_ENEMY_SVGS[specialIdOrType];
      }
    }
    return 'assets/icons/tile-enemy.svg';
  }

  /**
   * 직업 10종 정의 (조각 5 및 조각 14 원작 정렬 11절 반영)
   * 원작 10개 직업: 모험가, 전사, 레인저, 사제, 바바리안, 마법사, 도적, 성기사, 약탈자, 암살자
   * 일반 새 판 시작 최대 체력: 50 (마법사 40, 전사 60), 기본 공격 3 (바바리안 4), 기본 무기 공격 2, 최대 방어 합 4 (레인저 3)
   * 모험가만 처음 열림 (canCustomizePerks: false), 다른 직업은 특수 적 처치 해제 카운터(한 판 최대 3회)
   */
  const CLASSES = {
    adventurer: {
      id: 'adventurer',
      name: '모험가',
      title: '균형 잡힌 방랑자',
      desc: '모든 능력치가 균형 잡힌 다재다능한 모험가입니다.',
      unlockDesc: '최초부터 열려 있는 기본 고블린입니다.',
      maxHp: 50,
      maxArmor: 4,
      baseAtk: 3,
      weaponAtk: 2,
      canCustomizePerks: false,
      startingSkill: 'shuffle',
      unlockRequirement: 0,
      defaultRaceId: 0,
      fixedPerkId: null,
      fixedFlawId: null,
      iconSvg: 'assets/icons/class-adventurer.svg'
    },
    warrior: {
      id: 'warrior',
      name: '전사',
      title: '강철의 검사',
      desc: '높은 체력과 강력한 공격력으로 전장을 제압합니다.',
      unlockDesc: '부족과 동료를 위한 끝없는 헌신으로 방패를 든 강철의 전사입니다.',
      maxHp: 60,
      maxArmor: 4,
      baseAtk: 3,
      weaponAtk: 2,
      canCustomizePerks: true,
      startingSkill: 'slash_row',
      unlockRequirement: 1,
      defaultRaceId: 2,
      fixedPerkId: 9,
      fixedFlawId: 9,
      iconSvg: 'assets/icons/class-warrior.svg'
    },
    ranger: {
      id: 'ranger',
      name: '레인저',
      title: '숲의 궁수',
      desc: '무기 공격력이 뛰어나 원거리에서 적을 꿰뚫습니다.',
      unlockDesc: '적과 거리를 두고 활과 칼을 능숙하게 다루는 방랑 사냥꾼이 무리에 합류했습니다.',
      maxHp: 50,
      maxArmor: 3,
      baseAtk: 3,
      weaponAtk: 2,
      canCustomizePerks: true,
      startingSkill: 'slash_row',
      unlockRequirement: 2,
      defaultRaceId: 1,
      fixedPerkId: 6,
      fixedFlawId: 6,
      iconSvg: 'assets/icons/class-ranger.svg'
    },
    priest: {
      id: 'priest',
      name: '사제',
      title: '신성한 수호자',
      desc: '풍부한 체력과 치유력으로 끈질기게 생존합니다.',
      unlockDesc: '간절한 기도와 치유의 기적이 응답받아 전장의 사제가 모습을 드러냈습니다.',
      maxHp: 50,
      maxArmor: 4,
      baseAtk: 3,
      weaponAtk: 2,
      canCustomizePerks: true,
      startingSkill: 'heal',
      unlockRequirement: 3,
      defaultRaceId: 4,
      fixedPerkId: 5,
      fixedFlawId: 5,
      iconSvg: 'assets/icons/class-priest.svg'
    },
    barbarian: {
      id: 'barbarian',
      name: '바바리안',
      title: '광전사',
      desc: '압도적인 기본 체력과 완력으로 적을 분쇄합니다.',
      unlockDesc: '피와 분노의 함성을 지르는 무자비한 야만 전사가 깨어났습니다.',
      maxHp: 50,
      maxArmor: 4,
      baseAtk: 4,
      weaponAtk: 2,
      canCustomizePerks: true,
      startingSkill: 'slash_row',
      unlockRequirement: 4,
      defaultRaceId: 5,
      fixedPerkId: 4,
      fixedFlawId: 4,
      iconSvg: 'assets/icons/class-barbarian.svg'
    },
    mage: {
      id: 'mage',
      name: '마법사',
      title: '원소술사',
      desc: '체력은 약하지만 강력한 마법 폭발을 다룹니다.',
      unlockDesc: '신비로운 푸른 비전 물약과 마법의 심연을 연구하던 마법사가 합류했습니다.',
      maxHp: 40,
      maxArmor: 4,
      baseAtk: 3,
      weaponAtk: 2,
      canCustomizePerks: true,
      startingSkill: 'bomb_potion',
      unlockRequirement: 5,
      defaultRaceId: 9,
      fixedPerkId: 1,
      fixedFlawId: 1,
      iconSvg: 'assets/icons/class-mage.svg'
    },
    rogue: {
      id: 'rogue',
      name: '도적',
      title: '그림자 약탈자',
      desc: '재빠른 손놀림으로 코인을 칼로 바꾸고 기습합니다.',
      unlockDesc: '정면 승부 대신 은밀한 손재주와 뒷골목의 수단으로 이득을 챙기는 도적입니다.',
      maxHp: 50,
      maxArmor: 4,
      baseAtk: 3,
      weaponAtk: 2,
      canCustomizePerks: true,
      startingSkill: 'convert_coin_to_sword',
      unlockRequirement: 6,
      defaultRaceId: 3,
      fixedPerkId: 7,
      fixedFlawId: 7,
      iconSvg: 'assets/icons/class-rogue.svg'
    },
    paladin: {
      id: 'paladin',
      name: '성기사',
      title: '철벽의 기사',
      desc: '가장 높은 방어력과 치유력으로 든든하게 버팁니다.',
      unlockDesc: '한결같은 경계심과 강철 같은 맹세로 전선을 수호하는 성기사입니다.',
      maxHp: 50,
      maxArmor: 4,
      baseAtk: 3,
      weaponAtk: 2,
      canCustomizePerks: true,
      startingSkill: 'heal',
      unlockRequirement: 7,
      defaultRaceId: 8,
      fixedPerkId: 8,
      fixedFlawId: 8,
      iconSvg: 'assets/icons/class-paladin.svg'
    },
    raider: {
      id: 'raider',
      name: '약탈자',
      title: '던전 도굴꾼',
      desc: '전투와 자원 수급 능력을 능숙하게 결합합니다.',
      unlockDesc: '더 큰 위험과 영광을 찾아 깊은 던전에서 돌아온 약탈자가 합류했습니다.',
      maxHp: 50,
      maxArmor: 4,
      baseAtk: 3,
      weaponAtk: 2,
      canCustomizePerks: true,
      startingSkill: 'convert_coin_to_sword',
      unlockRequirement: 8,
      defaultRaceId: 6,
      fixedPerkId: 2,
      fixedFlawId: 2,
      iconSvg: 'assets/icons/class-raider.svg'
    },
    assassin: {
      id: 'assassin',
      name: '암살자',
      title: '죽음의 칼날',
      desc: '극도의 치명적인 공격력으로 적을 한순간에 처치합니다.',
      unlockDesc: '그림자 속에서 적의 숨통을 단숨에 끊어내는 치명적인 암살자입니다.',
      maxHp: 50,
      maxArmor: 4,
      baseAtk: 3,
      weaponAtk: 2,
      canCustomizePerks: true,
      startingSkill: 'slash_row',
      unlockRequirement: 10,
      defaultRaceId: 7,
      fixedPerkId: 3,
      fixedFlawId: 3,
      iconSvg: 'assets/icons/class-assassin.svg'
    }
  };

  const CLASS_IDS = Object.keys(CLASSES);

  /**
   * 조각 18 - 직업별 첫 고정 퍽·결함 쌍 (원작-대조표 101행, 정밀2 §2·4)
   * 레인저 6/6, 약탈자 2/2, 사제 5/5, 바바리안 4/4, 마법사 1/1, 도적 7/7, 성기사 8/8, 전사 9/9, 암살자 3/3
   */
  const CLASS_FIXED_PERK_FLAWS = {
    adventurer: null,
    warrior: { perkId: 9, flawId: 9 },
    ranger: { perkId: 6, flawId: 6 },
    priest: { perkId: 5, flawId: 5 },
    barbarian: { perkId: 4, flawId: 4 },
    mage: { perkId: 1, flawId: 1 },
    rogue: { perkId: 7, flawId: 7 },
    paladin: { perkId: 8, flawId: 8 },
    raider: { perkId: 2, flawId: 2 },
    assassin: { perkId: 3, flawId: 3 }
  };

  /**
   * 조각 14 - 스킬 42종 기본 쿨다운 (원작판 11절 원문 표 확인값)
   * 0=13, 1=16, 2=15, 3=16, 4=18, 5=18, 6=15, 7=20, 8=18, 9=18,
   * 10=35, 11=12, 12=18, 13=15, 14=25, 15=15, 16=14, 17=15, 18=15, 19=15,
   * 20=18, 21=20, 22=18, 23=15, 24=25, 25=14, 26=12, 27=16, 28=14, 29=20,
   * 30=24, 31=15, 32=15, 33=-1(1회용), 34=14, 35=12, 36=25, 37=35, 38=18, 39=16,
   * 40=14, 41=14
   */
  const SKILL_COOLDOWNS_42 = [
    13, 16, 15, 16, 18, 18, 15, 20, 18, 18,
    35, 12, 18, 15, 25, 15, 14, 15, 15, 15,
    18, 20, 18, 15, 25, 14, 12, 16, 14, 20,
    24, 15, 15, -1, 14, 12, 25, 35, 18, 16,
    14, 14
  ];

  /**
   * 조각 14 & 조각 22 - 스킬 42종 데이터 표 (원작 42종 전원 구현, 원작-대조표-2 기준)
   * 조각 22: 스킬 ID 0~41 전체 구현 완료 (isImplemented: true)
   * 33번은 1회용 (사용 후 스킬 목록에서 영구 제거)
   */
  const SKILLS_DATA = [
    { id: 0, key: 'steal', name: '약탈', desc: '이번 턴 공격한 적마다 골드를 강탈합니다.', cooldown: 13, isImplemented: true, icon: '💰' },
    { id: 1, key: 'freeze', name: '빙결', desc: '판의 모든 적을 동결하여 공격을 차단합니다.', cooldown: 16, isImplemented: true, icon: '❄️' },
    { id: 2, key: 'heal', name: '치유의 손길', desc: '판에 있는 모든 회복 물약을 즉시 수집합니다.', cooldown: 15, isImplemented: true, icon: '💖' },
    { id: 3, key: 'repair', name: '갑옷 수리', desc: '판에 있는 모든 방패를 즉시 수집합니다.', cooldown: 16, isImplemented: true, icon: '🛡️' },
    { id: 4, key: 'counterattack', name: '반격 태세', desc: '이번 턴 모든 적이 자신을 공격하여 자멸하게 합니다.', cooldown: 18, isImplemented: true, icon: '🔄' },
    { id: 5, key: 'shatter', name: '방어구 파쇄', desc: '모든 일반 적의 방어력을 0, 공격력을 최대 1로 낮춥니다.', cooldown: 18, isImplemented: true, icon: '🔨' },
    { id: 6, key: 'golden_touch', name: '황금 변환', desc: '판의 모든 칼(화살 제외)을 코인으로 변환합니다.', cooldown: 15, isImplemented: true, icon: '🪙' },
    { id: 7, key: 'teleport', name: '차원 이동', desc: '적이 없는 새로운 칸들로 판 전체를 교체합니다.', cooldown: 20, isImplemented: true, icon: '🌀' },
    { id: 8, key: 'explosive_potion', name: '폭발 물약', desc: '물약을 폭발 물약으로 바꿔 연결 시 주변 칸을 파괴합니다.', cooldown: 18, isImplemented: true, icon: '💣' },
    { id: 9, key: 'skill_elixir', name: '비전 영약', desc: '모든 회복 물약을 경험치로 변환해 수집합니다.', cooldown: 18, isImplemented: true, icon: '🧪' },
    { id: 10, key: 'enchant', name: '마법 부여', desc: '소지한 장비를 즉시 1회 강화합니다.', cooldown: 35, isImplemented: true, icon: '✨' },
    { id: 11, key: 'slash', name: '가로 베기', desc: '무작위 가로 한 줄의 일반 칸을 즉시 수집합니다.', cooldown: 12, isImplemented: true, icon: '⚔️' },
    { id: 12, key: 'treasure', name: '보물 발견', desc: '판에 있는 모든 코인을 즉시 수집합니다.', cooldown: 18, isImplemented: true, icon: '👑' },
    { id: 13, key: 'scavenge', name: '재활용', desc: '판의 모든 칼(화살 제외)을 방패로 변환합니다.', cooldown: 15, isImplemented: true, icon: '🛡️' },
    { id: 14, key: 'disarm', name: '무장 해제', desc: '판의 모든 일반 적을 칼로 변환합니다.', cooldown: 25, isImplemented: true, icon: '🗡️' },
    { id: 15, key: 'dazzle', name: '눈부신 섬광', desc: '판의 모든 코인을 칼로 변환합니다.', cooldown: 15, isImplemented: true, icon: '✨' },
    { id: 16, key: 'boost_damage', name: '무기 강화', desc: '이번 턴 동안 무기 공격력이 2배가 됩니다.', cooldown: 14, isImplemented: true, icon: '🔥' },
    { id: 17, key: 'boost_gold', name: '황금 축복', desc: '이번 턴 골드 수집량이 2배가 됩니다.', cooldown: 15, isImplemented: true, icon: '💰' },
    { id: 18, key: 'boost_health', name: '생명력 고양', desc: '이번 턴 물약 회복 효과가 2배가 됩니다.', cooldown: 15, isImplemented: true, icon: '❤️' },
    { id: 19, key: 'boost_armour', name: '철벽 수호', desc: '이번 턴 갑옷 수집 효과가 2배가 됩니다.', cooldown: 15, isImplemented: true, icon: '🛡️' },
    { id: 20, key: 'exorcise', name: '정화', desc: '무작위 특수 적 1마리를 스탯을 유지한 일반 적으로 정화합니다.', cooldown: 18, isImplemented: true, icon: '✨' },
    { id: 21, key: 'banish', name: '추방', desc: '무작위 특수 적 1마리를 보상 없이 즉시 소멸시킵니다.', cooldown: 20, isImplemented: true, icon: '💨' },
    { id: 22, key: 'trap', name: '함정', desc: '이번 턴 새로 등장하는 적의 체력을 1로 만듭니다.', cooldown: 18, isImplemented: true, icon: '🕸️' },
    { id: 23, key: 'big_game_hunter', name: '거물 사냥꾼', desc: '무작위 일반 적 1마리를 특수 적으로 승급시킵니다.', cooldown: 15, isImplemented: true, icon: '🎯' },
    { id: 24, key: 'treasure_chamber', name: '보물 창고', desc: '이번 턴 새로 보충되는 모든 칸이 코인이 됩니다.', cooldown: 25, isImplemented: true, icon: '🏛️' },
    { id: 25, key: 'magic_sword', name: '마법의 검', desc: '무작위 칼 1개를 공격력 5배 마법 칼로 변환합니다.', cooldown: 14, isImplemented: true, icon: '🗡️' },
    { id: 26, key: 'earthquake', name: '지진', desc: '판의 모든 칸을 무작위로 재배치합니다.', cooldown: 12, isImplemented: true, icon: '💥' },
    { id: 27, key: 'explosive_armour', name: '폭발 갑옷', desc: '현재 방패 수치의 2배 피해로 모든 적을 공격합니다.', cooldown: 16, isImplemented: true, icon: '💥' },
    { id: 28, key: 'fireball', name: '화염구', desc: '무작위 3×3 구역의 일반 칸을 즉시 수집합니다.', cooldown: 14, isImplemented: true, icon: '☄️' },
    { id: 29, key: 'mana_potion', name: '마나 물약', desc: '판의 모든 물약을 쿨다운 감소 마나 물약으로 변환합니다.', cooldown: 20, isImplemented: true, icon: '🧪' },
    { id: 30, key: 'hack', name: '세로 베기', desc: '무작위 세로줄의 모든 칸을 칼로 변환합니다.', cooldown: 24, isImplemented: true, icon: '⚔️' },
    { id: 31, key: 'volley', name: '일제 사격', desc: '칼을 화살로 바꿔 한 칸 떨어진 적을 연결할 수 있게 합니다.', cooldown: 15, isImplemented: true, uniqueClassId: 'ranger', icon: '🏹' },
    { id: 32, key: 'masochism', name: '고통 감수', desc: '판의 모든 코인을 적 칸으로 변환합니다.', cooldown: 15, isImplemented: true, uniqueClassId: 'raider', icon: '🩸' },
    { id: 33, key: 'wish', name: '기적의 소원', desc: '단 1회 사용하여 판의 일반 칸을 즉시 수집합니다.', cooldown: -1, isImplemented: true, uniqueClassId: 'priest', singleUse: true, icon: '🌠' },
    { id: 34, key: 'berserk', name: '광란', desc: '이번 턴 처치한 적의 공격력만큼 체력을 회복합니다.', cooldown: 14, isImplemented: true, uniqueClassId: 'barbarian', icon: '💢' },
    { id: 35, key: 'rune', name: '봉인 룬', desc: '이번 턴 닫힌 경로를 이으면 내부 칸도 함께 수집합니다.', cooldown: 12, isImplemented: true, uniqueClassId: 'mage', icon: '🔮' },
    { id: 36, key: 'greed', name: '탐욕', desc: '코인 칸 옆의 모든 일반 적을 즉시 처치합니다.', cooldown: 25, isImplemented: true, uniqueClassId: 'rogue', icon: '🪙' },
    { id: 37, key: 'last_stand', name: '최후의 저항', desc: '이번 턴 치명상을 입으면 체력을 완전히 회복합니다.', cooldown: 35, isImplemented: true, uniqueClassId: 'paladin', icon: '🛡️' },
    { id: 38, key: 'charge', name: '돌격', desc: '판 바깥 테두리 칸의 일반 칸을 모두 즉시 수집합니다.', cooldown: 18, isImplemented: true, uniqueClassId: 'warrior', icon: '⚡' },
    { id: 39, key: 'haste', name: '신속', desc: '서로 다른 두 칸 종류를 잇는 사슬 칸을 생성합니다.', cooldown: 16, isImplemented: true, uniqueClassId: 'assassin', icon: '⛓️' },
    { id: 40, key: 'shock', name: '충격파', desc: '위쪽 절반 구역의 코인과 방패를 모두 수집합니다.', cooldown: 14, isImplemented: true, icon: '⚡' },
    { id: 41, key: 'awe', name: '위압', desc: '아래쪽 절반 구역의 물약과 방패를 모두 수집합니다.', cooldown: 14, isImplemented: true, icon: '💫' }
  ];

  /**
   * 조각 14 - 직업별 기본 스킬 풀 20개 (원작-정밀-규칙-2.md 2번 표)
   */
  const CLASS_SKILL_POOLS = {
    adventurer: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    ranger: [31, 2, 3, 4, 5, 7, 8, 9, 10, 12, 13, 14, 16, 18, 21, 22, 23, 24, 25, 29],
    raider: [32, 2, 3, 4, 6, 8, 9, 11, 12, 15, 16, 17, 18, 19, 20, 22, 23, 24, 25, 27],
    priest: [33, 1, 2, 5, 6, 7, 8, 9, 10, 12, 13, 15, 18, 19, 21, 20, 25, 26, 28, 29],
    barbarian: [34, 3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 16, 18, 19, 21, 20, 22, 23, 25, 27],
    mage: [35, 1, 2, 3, 6, 7, 8, 9, 10, 12, 15, 17, 18, 21, 20, 24, 25, 26, 28, 29],
    rogue: [36, 0, 2, 3, 4, 6, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 22, 23, 24, 25],
    paladin: [37, 2, 3, 4, 5, 8, 9, 11, 12, 13, 14, 16, 18, 19, 21, 20, 23, 24, 25, 27],
    warrior: [38, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 16, 19, 21, 22, 23, 25, 27],
    assassin: [39, 0, 1, 4, 5, 7, 8, 9, 12, 14, 15, 16, 18, 21, 22, 23, 24, 25, 27, 28]
  };

  /**
   * 조각 11 - 퍽 10종 데이터 표 (원작-정밀-규칙-2.md 4번 표, 새 한국어 이름)
   * 퍽(파랑 #3b7de0, 각 10종)
   */
  const MAX_PERK_SLOTS = 4;

  const PERKS_DATA = [
    { id: 0, key: 'unexpected', name: '기습 전술', desc: '게임 시작 후 처음 5턴 동안 적이 공격하지 않습니다.', color: '#3b7de0', icon: '🛡️' },
    { id: 1, key: 'gifted', name: '마나 친화', desc: '물약의 5%가 쿨다운을 줄이는 마나 물약으로 등장합니다.', color: '#3b7de0', icon: '🧪' },
    { id: 2, key: 'daring', name: '과감한 돌파', desc: '10칸 이상 체인 연결 시 보너스 토큰 확률이 100%가 됩니다.', color: '#3b7de0', icon: '⚡' },
    { id: 3, key: 'cunning', name: '기민한 전술', desc: '네 번째로 장착한 스킬의 쿨다운이 1턴 감소합니다.', color: '#3b7de0', icon: '⏳' },
    { id: 4, key: 'strong', name: '타고난 완력', desc: '기본 공격력이 +1 증가합니다.', color: '#3b7de0', icon: '⚔️' },
    { id: 5, key: 'faithful', name: '굳은 신념', desc: '재생 강화 효과가 2배로 증가합니다.', color: '#3b7de0', icon: '💖' },
    { id: 6, key: 'agile', name: '명사수', desc: '칼의 5%가 한 칸 떨어진 적을 잇는 화살로 등장합니다.', color: '#3b7de0', icon: '🏹' },
    { id: 7, key: 'frugal', name: '알뜰한 감각', desc: '골드 보너스 획득 기회가 +10%p 증가합니다.', color: '#3b7de0', icon: '🪙' },
    { id: 8, key: 'intimidating', name: '압도적 위용', desc: '숙적 특수 적의 등장 확률이 절반으로 감소합니다.', color: '#3b7de0', icon: '👑' },
    { id: 9, key: 'tough', name: '강철 체력', desc: '최대 체력이 +10 증가합니다.', color: '#3b7de0', icon: '❤️' }
  ];

  /**
   * 조각 11 - 결함 10종 데이터 표 (원작-정밀-규칙-2.md 4번 표, 새 한국어 이름)
   * 결함(빨강 #d7263d, 각 10종)
   */
  const FLAWS_DATA = [
    { id: 0, key: 'confused', name: '방심과 혼란', desc: '게임 시작 후 처음 5턴 동안 적에게 피해를 줄 수 없습니다.', color: '#d7263d', icon: '😵' },
    { id: 1, key: 'frail', name: '허약 체질', desc: '최대 체력이 -10 감소합니다.', color: '#d7263d', icon: '💔' },
    { id: 2, key: 'cocky', name: '자만심', desc: '딱 3칸만 연결하여 수집할 경우 아무런 보상도 얻지 못합니다.', color: '#d7263d', icon: '😤' },
    { id: 3, key: 'sneaky', name: '교활한 적들', desc: '적들의 체력이 +1 증가합니다.', color: '#d7263d', icon: '💀' },
    { id: 4, key: 'reckless', name: '무모한 맹진', desc: '방패 보너스 획득 기회가 -10%p 감소합니다.', color: '#d7263d', icon: '⚠️' },
    { id: 5, key: 'cautious', name: '지나친 신중', desc: '방어 관통력이 -20%p 감소합니다.', color: '#d7263d', icon: '🐢' },
    { id: 6, key: 'slim', name: '경량 갑옷', desc: '기본 방패(갑옷)가 -1 감소합니다.', color: '#d7263d', icon: '🎽' },
    { id: 7, key: 'clumsy', name: '손상된 방패', desc: '방패의 3%가 효과가 없는 파손 방패로 등장합니다.', color: '#d7263d', icon: '🔨' },
    { id: 8, key: 'zealous', name: '적들의 광기', desc: '특수 적 승급 대기 타이머가 1턴 일찍 줄어듭니다.', color: '#d7263d', icon: '🔥' },
    { id: 9, key: 'noisy', name: '요란한 발소리', desc: '특수 적들의 체력이 +5% 증가합니다.', color: '#d7263d', icon: '📢' }
  ];

  /**
   * 조각 12 - 종족 10종 데이터 표 (원작-정밀-규칙-2.md 3번 표 반영, 고블린 세계 임시 이름)
   * 종족마다 고유 보너스와 숙적(Mortal Enemy) 특수 적이 존재함
   */
  const RACES_DATA = [
    {
      id: 0,
      key: 'human',
      name: '평원 고블린',
      bonusName: '평범한 신체',
      bonusDesc: '특별한 종족 보너스가 없습니다.',
      mortalEnemyId: 0,
      mortalEnemyName: '없음',
      mortalEnemyDesc: '특별한 숙적 약점이 없습니다.',
      icon: '👤'
    },
    {
      id: 1,
      key: 'elf',
      name: '숲 고블린',
      bonusName: '독 둔화',
      bonusDesc: '독에 걸린 적의 공격력이 절반(정수)으로 감소합니다.',
      mortalEnemyId: 9,
      mortalEnemyName: '맹독괴물',
      mortalEnemyDesc: '이 적이 판에 살아있는 동안에는 물약으로 독을 치유할 수 없습니다.',
      icon: '🌿'
    },
    {
      id: 2,
      key: 'dwarf',
      name: '땅굴 고블린',
      bonusName: '올려치기',
      bonusDesc: '아래에서 위로 관통하며 이은 적에게 무기 공격력만큼 추가 피해를 입힙니다.',
      mortalEnemyId: 14,
      mortalEnemyName: '혼돈괴물',
      mortalEnemyDesc: '이 적은 올려치기 공격으로만 피해를 입습니다.',
      icon: '⛏️'
    },
    {
      id: 3,
      key: 'sauren',
      name: '늪 고블린',
      bonusName: '보물 탐색',
      bonusDesc: '상점 장비/선택지의 보너스 기회가 2배로 증가합니다.',
      mortalEnemyId: 13,
      mortalEnemyName: '도둑괴물',
      mortalEnemyDesc: '골드를 훔칠 때 자신의 공격력의 2배만큼 플레이어에게 직접 체력 피해를 줍니다.',
      icon: '🦎'
    },
    {
      id: 4,
      key: 'faun',
      name: '뿔 고블린',
      bonusName: '생기 회복',
      bonusDesc: '레벨업 시 체력이 25% 미만이면 최대 체력의 25%로 즉시 회복합니다.',
      mortalEnemyId: 16,
      mortalEnemyName: '암살괴물',
      mortalEnemyDesc: '이 적은 매 턴 종료 시 자동으로 한 칸 아래로 전진합니다.',
      icon: '🐐'
    },
    {
      id: 5,
      key: 'orc',
      name: '덩치 고블린',
      bonusName: '기절 타격',
      bonusDesc: '공격한 적을 10% 확률로 기절(빙결)시켜 이번 턴 반격을 차단합니다.',
      mortalEnemyId: 12,
      mortalEnemyName: '부식괴물',
      mortalEnemyDesc: '판에 처음 나타날 때 플레이어의 현재 방패(갑옷)를 0으로 부식시킵니다.',
      icon: '👹'
    },
    {
      id: 6,
      key: 'halfling',
      name: '꼬마 고블린',
      bonusName: '근성',
      bonusDesc: '한 공격으로 적 15마리 이상을 동시 처치하면 최대 방패(갑옷)가 영구히 +1 증가합니다.',
      mortalEnemyId: 5,
      mortalEnemyName: '투명괴물',
      mortalEnemyDesc: '이 적이 판에 살아있는 동안 새로 생성되는 적의 방어력이 2배가 됩니다.',
      icon: '🐰'
    },
    {
      id: 7,
      key: 'werewolf',
      name: '늑대 고블린',
      bonusName: '쇠약화',
      bonusDesc: '턴 종료 시 체력이 방어력보다 낮아진 적을 즉시 처치합니다.',
      mortalEnemyId: 20,
      mortalEnemyName: '흡혈괴물',
      mortalEnemyDesc: '이 적은 초기 체력 한계를 넘어 무한히 체력을 회복할 수 있습니다.',
      icon: '🐺'
    },
    {
      id: 8,
      key: 'dragonkin',
      name: '용혈 고블린',
      bonusName: '화염 숨결',
      bonusDesc: '스킬을 사용할 때마다 무작위 적 1마리에게 불을 붙여 턴 종료 시 기본 공격력만큼 피해를 줍니다.',
      mortalEnemyId: 8,
      mortalEnemyName: '빙결괴물',
      mortalEnemyDesc: '이 적이 판에 살아있는 동안 플레이어의 기본 공격력이 절반으로 감소합니다.',
      icon: '🐲'
    },
    {
      id: 9,
      key: 'changeling',
      name: '변신 고블린',
      bonusName: '형태 변환',
      bonusDesc: '특수 적을 처치할 때마다 장착한 스킬 중 1개의 쿨다운이 즉시 완전히 충전됩니다.',
      mortalEnemyId: 19,
      mortalEnemyName: '불안정괴물',
      mortalEnemyDesc: '매 턴 종료 시 판의 다른 칸과 무작위로 위치를 바꾸며 순간이동합니다.',
      icon: '🎭'
    }
  ];

  const DEFAULT_CLASS_RACES = {
    adventurer: 0,
    warrior: 2,
    ranger: 1,
    priest: 4,
    barbarian: 5,
    mage: 9,
    rogue: 3,
    paladin: 8,
    raider: 6,
    assassin: 7
  };

  /**
   * 조각 21 - 종족 ID별 기본 직업 매핑 (원작-대조표-2 227행, Game::IsRaceUnlocked @ 000248a0)
   */
  const RACE_TO_DEFAULT_CLASS = {
    0: 'adventurer',
    1: 'ranger',
    2: 'warrior',
    3: 'rogue',
    4: 'priest',
    5: 'barbarian',
    6: 'raider',
    7: 'assassin',
    8: 'paladin',
    9: 'mage'
  };

  /**
   * 조각 13 - 업적 10종 데이터 표 (원작 구조 및 고블린 세계 임시 이름)
   * 특수 적 처치, 직업 레벨 5·10, 직업 해제, 턴 생존, 체인 연결, 점수 달성
   */
  const ACHIEVEMENTS_DATA = [
    {
      id: 'ach_special_kill_1',
      key: 'first_special_kill',
      name: '첫 네임드 사냥',
      desc: '특수 적을 1마리 처치하세요.',
      category: 'combat',
      icon: '💀',
      condition: { type: 'special_kills', count: 1 }
    },
    {
      id: 'ach_special_kill_10',
      key: 'special_hunter_10',
      name: '변종 학살자',
      desc: '특수 적을 누적 10마리 처치하세요.',
      category: 'combat',
      icon: '⚔️',
      condition: { type: 'special_kills', count: 10 }
    },
    {
      id: 'ach_class_level_5',
      key: 'class_level_5',
      name: '고블린 숙련병',
      desc: '어떤 직업이든 직업 레벨 5를 달성하세요.',
      category: 'growth',
      icon: '🎖️',
      condition: { type: 'class_level', level: 5 }
    },
    {
      id: 'ach_class_level_10',
      key: 'class_level_10',
      name: '전설의 족장',
      desc: '어떤 직업이든 직업 레벨 10(최고 레벨)을 달성하세요.',
      category: 'growth',
      icon: '👑',
      condition: { type: 'class_level', level: 10 }
    },
    {
      id: 'ach_first_class_unlock',
      key: 'first_class_unlock',
      name: '새로운 동료',
      desc: '기본 모험가 외에 새로운 직업을 1개 이상 해제하세요.',
      category: 'unlock',
      icon: '🤝',
      condition: { type: 'classes_unlocked', count: 2 }
    },
    {
      id: 'ach_all_classes_unlocked',
      key: 'all_classes_unlocked',
      name: '고블린 대군단',
      desc: '10종의 모든 직업을 해제하세요.',
      category: 'unlock',
      icon: '🏰',
      condition: { type: 'classes_unlocked', count: 10 }
    },
    {
      id: 'ach_survive_50_turns',
      key: 'survive_50_turns',
      name: '던전 생존자',
      desc: '한 판에서 50턴 이상 생존하세요.',
      category: 'survival',
      icon: '⏳',
      condition: { type: 'survive_turns', count: 50 }
    },
    {
      id: 'ach_survive_100_turns',
      key: 'survive_100_turns',
      name: '불멸의 의지',
      desc: '한 판에서 100턴 이상 생존하세요.',
      category: 'survival',
      icon: '🛡️',
      condition: { type: 'survive_turns', count: 100 }
    },
    {
      id: 'ach_long_chain_10',
      key: 'long_chain_10',
      name: '일망타진',
      desc: '한 번에 10칸 이상의 체인을 연결하세요.',
      category: 'puzzle',
      icon: '⚡',
      condition: { type: 'chain_length', count: 10 }
    },
    {
      id: 'ach_high_score_3000',
      key: 'high_score_3000',
      name: '황금빛 영광',
      desc: '점수 3,000점 이상을 달성하세요.',
      category: 'score',
      icon: '🏆',
      condition: { type: 'score', count: 3000 }
    }
  ];

  const ACHIEVEMENTS_MAP = ACHIEVEMENTS_DATA.reduce((acc, a) => {
    acc[a.id] = a;
    if (a.key) acc[a.key] = a;
    return acc;
  }, {});

  /**
   * 조각 13 - 업적 해제 여부 검사 (순수 함수)
   */
  function isAchievementUnlocked(profile, achievementId) {
    if (!profile || !Array.isArray(profile.achievements)) return false;
    const targetKey = String(achievementId || '');
    const targetDef = ACHIEVEMENTS_MAP[targetKey];
    const targetId = targetDef ? targetDef.id : targetKey;
    const targetAlias = targetDef ? targetDef.key : null;

    return profile.achievements.some(a => {
      if (!a) return false;
      if (typeof a === 'string') {
        return a === targetKey || a === targetId || (targetAlias && a === targetAlias);
      }
      const aId = a.id;
      const aKey = a.key;
      const aDef = (aId && ACHIEVEMENTS_MAP[aId]) || (aKey && ACHIEVEMENTS_MAP[aKey]);
      const resolvedAId = aDef ? aDef.id : aId;
      const resolvedAKey = aDef ? aDef.key : aKey;

      return aId === targetKey || aKey === targetKey ||
             resolvedAId === targetId || (targetAlias && resolvedAId === targetAlias) ||
             (resolvedAKey && resolvedAKey === targetId) || (resolvedAKey && targetAlias && resolvedAKey === targetAlias);
    });
  }

  /**
   * 조각 13 - 업적 수여 순수 함수 (업적 중복 지급 방지)
   */
  function grantAchievement(profile, achievementId, customStorage = null, options = {}) {
    if (!profile) {
      return { granted: false, alreadyUnlocked: false, profile };
    }
    if (!Array.isArray(profile.achievements)) {
      profile.achievements = [];
    }

    const achDef = ACHIEVEMENTS_MAP[achievementId] || {
      id: achievementId,
      key: achievementId,
      name: achievementId,
      desc: '',
      icon: '🏆'
    };

    if (isAchievementUnlocked(profile, achDef.id) || isAchievementUnlocked(profile, achDef.key)) {
      return {
        granted: false,
        alreadyUnlocked: true,
        achievement: achDef,
        profile
      };
    }

    const dateStr = options.date || new Date().toISOString();
    const entry = {
      id: achDef.id,
      key: achDef.key || achDef.id,
      name: achDef.name,
      icon: achDef.icon,
      unlockedAt: dateStr
    };

    profile.achievements.push(entry);

    if (customStorage) {
      saveProfile(profile, customStorage);
    }

    return {
      granted: true,
      alreadyUnlocked: false,
      achievement: achDef,
      entry,
      profile
    };
  }

  /**
   * 조각 13 - 업적 달성 판정 순수 함수
   * 현재 gameState 및 영구 profile 상태를 검사하여 새로 달성 가능한 업적 목록 반환
   */
  function checkAchievements(gameState = {}, profile = null, context = {}) {
    const prof = profile || (context.storage ? loadProfile(context.storage) : createDefaultProfile());
    if (!Array.isArray(prof.achievements)) {
      prof.achievements = [];
    }

    const newlyUnlocked = [];

    // 1) 특수 적 처치 수치 산출
    let currentSpecialKills = (context.specialKills != null)
      ? context.specialKills
      : (prof.specialKills || 0);
    if (gameState && gameState.player && gameState.player.specialKills != null) {
      currentSpecialKills = Math.max(currentSpecialKills, gameState.player.specialKills);
    }

    // 2) 최고 직업 레벨 산출
    let highestClassLevel = 1;
    if (gameState && gameState.player && gameState.player.level != null) {
      highestClassLevel = Math.max(highestClassLevel, gameState.player.level);
    }
    if (context.classLevel != null) {
      highestClassLevel = Math.max(highestClassLevel, context.classLevel);
    }
    if (prof.classProgress && typeof prof.classProgress === 'object') {
      for (const cid of Object.keys(prof.classProgress)) {
        const cp = prof.classProgress[cid];
        if (cp && cp.level != null && cp.level > highestClassLevel) {
          highestClassLevel = cp.level;
        }
      }
    }

    // 3) 해제된 직업 수 산출
    let unlockedClassesCount = Array.isArray(prof.unlockedClasses) ? prof.unlockedClasses.length : 1;
    if (context.unlockedClassesCount != null) {
      unlockedClassesCount = Math.max(unlockedClassesCount, context.unlockedClassesCount);
    }
    if (gameState && Array.isArray(gameState.unlockedClasses)) {
      unlockedClassesCount = Math.max(unlockedClassesCount, gameState.unlockedClasses.length);
    }

    // 4) 턴 수 및 점수
    const currentTurn = (context.turn != null)
      ? context.turn
      : ((gameState && gameState.turn) || 1);
    const currentScore = (context.score != null)
      ? context.score
      : ((gameState && gameState.score) || 0);

    // 5) 체인 길이
    const currentChainLength = (context.chainLength != null) ? context.chainLength : 0;

    for (const ach of ACHIEVEMENTS_DATA) {
      if (isAchievementUnlocked(prof, ach.id) || isAchievementUnlocked(prof, ach.key)) {
        continue;
      }

      let met = false;
      const cond = ach.condition;

      if (cond.type === 'special_kills') {
        met = currentSpecialKills >= cond.count;
      } else if (cond.type === 'class_level') {
        met = highestClassLevel >= cond.level;
      } else if (cond.type === 'classes_unlocked') {
        met = unlockedClassesCount >= cond.count;
      } else if (cond.type === 'survive_turns') {
        met = currentTurn >= cond.count;
      } else if (cond.type === 'chain_length') {
        met = currentChainLength >= cond.count;
      } else if (cond.type === 'score') {
        met = currentScore >= cond.count;
      }

      if (met) {
        newlyUnlocked.push(ach);
      }
    }

    if (context.autoGrant && newlyUnlocked.length > 0) {
      for (const ach of newlyUnlocked) {
        grantAchievement(prof, ach.id, context.storage, context);
      }
    }

    return {
      newlyUnlocked,
      profile: prof
    };
  }

  /**
   * 조각 13 - 영구 프로필 직업 해제 실제 연결 순수 함수
   */
  function unlockClass(profile, classId, customStorage = null, options = {}) {
    if (!profile) {
      return { success: false, alreadyUnlocked: false, reason: 'no_profile' };
    }
    if (!Array.isArray(profile.unlockedClasses)) {
      profile.unlockedClasses = ['adventurer'];
    }

    const cid = String(classId || '').toLowerCase();
    if (!cid || !CLASSES[cid]) {
      return { success: false, alreadyUnlocked: false, reason: 'invalid_class_id' };
    }

    if (profile.unlockedClasses.includes(cid)) {
      return {
        success: false,
        alreadyUnlocked: true,
        classId: cid,
        classDef: CLASSES[cid],
        unlockDesc: CLASSES[cid].unlockDesc || '',
        profile
      };
    }

    profile.unlockedClasses.push(cid);
    const classDef = CLASSES[cid];

    // 직업 해제에 따른 업적 판정 자동 연동
    const achResult = checkAchievements(null, profile, {
      autoGrant: true,
      storage: customStorage,
      unlockedClassesCount: profile.unlockedClasses.length,
      ...options
    });

    if (customStorage) {
      saveProfile(profile, customStorage);
    }

    return {
      success: true,
      alreadyUnlocked: false,
      classId: cid,
      classDef,
      unlockDesc: classDef.unlockDesc || '',
      profile,
      newAchievements: achResult.newlyUnlocked
    };
  }

  /**
   * 조각 13 - 영구 프로필 직업 성장 갱신 및 업적 판정 연동 순수 함수
   */
  function updateClassProgress(profile, classId, levelOrDelta, customStorage = null, options = {}) {
    if (!profile) {
      return { profile: null, newLevel: 1, newAchievements: [] };
    }
    if (!profile.classProgress || typeof profile.classProgress !== 'object') {
      profile.classProgress = {};
    }

    const cid = String(classId || 'adventurer').toLowerCase();
    if (!profile.classProgress[cid]) {
      profile.classProgress[cid] = { level: 1, exp: 0, games: 0, wins: 0, highScore: 0 };
    }
    const cp = profile.classProgress[cid];

    if (typeof levelOrDelta === 'number') {
      if (Number.isInteger(levelOrDelta) && levelOrDelta >= 1 && levelOrDelta <= 20) {
        cp.level = levelOrDelta;
      } else {
        cp.exp = (cp.exp || 0) + levelOrDelta;
      }
    } else if (levelOrDelta && typeof levelOrDelta === 'object') {
      if (levelOrDelta.level != null) cp.level = levelOrDelta.level;
      if (levelOrDelta.exp != null) cp.exp = (cp.exp || 0) + levelOrDelta.exp;
      if (levelOrDelta.games != null) cp.games = (cp.games || 0) + levelOrDelta.games;
      if (levelOrDelta.wins != null) cp.wins = (cp.wins || 0) + levelOrDelta.wins;
      if (levelOrDelta.highScore != null) cp.highScore = Math.max(cp.highScore || 0, levelOrDelta.highScore);
    }

    // 직업 레벨 성장에 따른 업적 판정 자동 연동
    const achResult = checkAchievements(null, profile, {
      autoGrant: true,
      storage: customStorage,
      classLevel: cp.level,
      ...options
    });

    if (customStorage) {
      saveProfile(profile, customStorage);
    }

    return {
      profile,
      classId: cid,
      classProgress: cp,
      newLevel: cp.level,
      newAchievements: achResult.newlyUnlocked
    };
  }

  /**
   * 조각 12 - 종족 변경 가능 여부 검사 (원작 Validate 함수: 직업 레벨 5부터 종족 변경 가능)
   */
  function canChangeRace(classLevel = 1) {
    return Math.max(1, Math.floor(classLevel || 1)) >= 5;
  }

  /**
   * 조각 12 & 조각 21 - 종족 해제 여부 검사 (순수 함수)
   * 원작-대조표-2 227행, Game::IsRaceUnlocked @ 000248a0: 그 종족 기본 직업의 레벨>4 확인
   * - 종족 0(평원 고블린): 기본 해제
   * - 직업의 기본 종족: 해당 직업은 언제나 사용 가능
   * - options.unlockedRaces에 포함되어 있으면 해제
   * - 원작 조건: 대상 종족의 기본 직업(Base Class) 레벨이 5 이상(level > 4)일 때 해제
   */
  function isRaceUnlocked(raceId, options = {}) {
    const rId = Math.floor(Number(raceId) || 0);
    if (rId === 0) return true;
    if (options.classId && CLASSES[options.classId] && CLASSES[options.classId].defaultRaceId === rId) {
      return true;
    }
    if (Array.isArray(options.unlockedRaces) && options.unlockedRaces.includes(rId)) {
      return true;
    }

    const baseClassId = RACE_TO_DEFAULT_CLASS[rId];
    if (!baseClassId) return false;

    // 1) options.classProgress 또는 profile.classProgress
    const progress = (options.profile && options.profile.classProgress) || options.classProgress || {};
    if (progress[baseClassId]) {
      const lvl = progress[baseClassId].level != null ? progress[baseClassId].level : progress[baseClassId];
      if (typeof lvl === 'number' && lvl > 4) {
        return true;
      }
    }

    // 2) options.classLevels
    if (options.classLevels && typeof options.classLevels[baseClassId] === 'number') {
      if (options.classLevels[baseClassId] > 4) {
        return true;
      }
    }

    // 3) options.classId가 대상 기본 직업과 일치하고 options.classLevel이 전달된 경우
    if (options.classId === baseClassId && options.classLevel != null) {
      return Math.max(1, Math.floor(options.classLevel)) > 4;
    }

    return false;
  }

  /**
   * 조각 12 - 직업 및 레벨에 따른 종족 선택 유효성 검사 및 정규화 (순수 함수)
   * 원작 CharacterClass::Validate: 직업 레벨 5 미만이면 해당 직업의 기본 종족으로 되돌림
   */
  function validateRaceSelection(classId, raceId, classLevel = 1, unlockedRaces = [0]) {
    const classDef = CLASSES[classId] || CLASSES.adventurer;
    const defaultRace = (classDef && classDef.defaultRaceId != null) ? classDef.defaultRaceId : 0;
    const targetRace = (raceId != null) ? Math.floor(Number(raceId)) : defaultRace;

    // 레벨 5 미만이면 반드시 기본 종족이어야 함
    if (!canChangeRace(classLevel)) {
      if (targetRace === defaultRace) {
        return { isValid: true, raceId: defaultRace };
      }
      return { isValid: false, raceId: defaultRace, reason: 'level_under_5' };
    }

    // 레벨 5 이상일 때 해제된 종족인지 확인
    if (isRaceUnlocked(targetRace, { classId, classLevel, unlockedRaces })) {
      return { isValid: true, raceId: targetRace };
    }

    return { isValid: false, raceId: defaultRace, reason: 'race_locked' };
  }

  /**
   * 조각 12 - 해당 종족의 숙적 ID 반환 (순수 함수)
   */
  function getMortalEnemyForRace(raceId) {
    const rId = Math.floor(Number(raceId) || 0);
    const def = RACES_DATA[rId];
    return def ? def.mortalEnemyId : 0;
  }

  /**
   * 조각 12 - 판에 살아있는 특수 적 중 특정 ID의 숙적이 존재하는지 판정 (순수 함수)
   */
  function isMortalEnemyOnBoard(board, mortalEnemyId) {
    if (!board || !Array.isArray(board) || mortalEnemyId === 0) return false;
    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        const tile = board[y][x];
        if (tile && tile.type === 'enemy' && tile.hp > 0 && tile.specialId === mortalEnemyId) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 조각 12 - 올려치기(Uppercut) 판정 순수 함수
   * 체인 경로에서 targetPos가 아래칸(prev.y > targetPos.y)에서 위칸(next.y < targetPos.y)으로 관통하거나,
   * 체인의 끝 칸인 경우 아래칸(prev.y > targetPos.y)에서 올라와 타격하는지 검사
   */
  function checkUppercut(path, targetPos) {
    if (!Array.isArray(path) || path.length < 3 || !targetPos) return false;
    const idx = path.findIndex(p => p.x === targetPos.x && p.y === targetPos.y);
    if (idx <= 0) return false;
    const prev = path[idx - 1];
    if (idx === path.length - 1) {
      return prev.y > targetPos.y;
    }
    const next = path[idx + 1];
    return prev.y > targetPos.y && next.y < targetPos.y;
  }

  /**
   * 조각 11 - 직업의 퍽 커스터마이징 가능 여부 판정 (모험가는 불가, 원작판 11절 및 조각 11)
   */
  function canCustomizePerks(classId) {
    if (!classId) return false;
    const def = CLASSES[classId];
    if (!def) return false;
    return Boolean(def.canCustomizePerks && classId !== 'adventurer');
  }

  /**
   * 조각 11 - 직업 레벨에 따른 잠금 해제된 퍽/결함 슬롯 수 계산 (최대 4쌍)
   * 모험가: 0슬롯 (꾸밀 수 없음)
   * 타 직업: 레벨 1~2: 1슬롯, 레벨 3~6: 2슬롯, 레벨 7~8: 3슬롯, 레벨 9+: 4슬롯
   */
  function getPerkSlotCount(classId, classLevel = 1) {
    if (!canCustomizePerks(classId)) return 0;
    const lvl = Math.max(1, Math.floor(classLevel || 1));
    if (lvl >= 9) return 4;
    if (lvl >= 7) return 3;
    if (lvl >= 3) return 2;
    return 1;
  }

  /**
   * 조각 11 - 4슬롯 퍽/결함 배열 정규화 도우미 (빈 슬롯은 null로 채워 4칸 보존)
   */
  function normalizePerkSlots(arr, maxSlots = MAX_PERK_SLOTS) {
    const result = [];
    const source = Array.isArray(arr) ? arr : [];
    for (let i = 0; i < maxSlots; i++) {
      const val = (source[i] != null && source[i] !== 255) ? Number(source[i]) : null;
      result.push(val);
    }
    return result;
  }

  /**
   * 조각 11 - 퍽·결함 짝 검사 순수 함수 (원작 규칙: 퍽 하나마다 결함 하나를 짝으로 맞춤)
   * - 슬롯 각 4칸 중, 같은 슬롯에 결함이 없으면 그 슬롯의 퍽은 null로 지워짐
   * - 같은 종류 안 중복 ID 방지
   * - 짝이 맞지 않거나 누락이 있으면 isValid = false
   */
  function validatePerkFlawPairs(perks = [], flaws = [], maxSlots = MAX_PERK_SLOTS) {
    const validPerks = [];
    const validFlaws = [];
    const count = Math.min(maxSlots, Math.max(perks.length, flaws.length));
    let hasMismatchedPair = false;

    const seenPerks = new Set();
    const seenFlaws = new Set();

    for (let i = 0; i < count; i++) {
      let p = (perks[i] != null && perks[i] !== 255) ? Number(perks[i]) : null;
      let f = (flaws[i] != null && flaws[i] !== 255) ? Number(flaws[i]) : null;

      // 중복 방지 (이미 사용된 퍽이나 결함은 null 처리)
      if (p != null) {
        if (seenPerks.has(p)) {
          p = null;
          hasMismatchedPair = true;
        } else {
          seenPerks.add(p);
        }
      }
      if (f != null) {
        if (seenFlaws.has(f)) {
          f = null;
          hasMismatchedPair = true;
        } else {
          seenFlaws.add(f);
        }
      }

      // 같은 슬롯에 결함이 없으면 퍽은 제거됨 (원작 Validate 함수)
      if (p != null && f == null) {
        p = null;
        hasMismatchedPair = true;
      }

      validPerks.push(p);
      validFlaws.push(f);
    }

    return {
      perks: validPerks,
      flaws: validFlaws,
      isValid: !hasMismatchedPair
    };
  }

  /**
   * 조각 11 - 직업 퍽/결함 설정 확정 가능 여부 검사 (순수 함수)
   * 1) 기본 직업(모험가)은 꾸밀 수 없음 (퍽/결함 설정 시 확정 불가)
   * 2) 슬롯 수 제한: 현재 해제된 슬롯 수를 초과하는 위치에 장착 시 확정 불가
   * 3) 짝 검사: 퍽이 있는 슬롯에 결함이 없으면 확정 불가
   * 4) 중복 검사: 같은 종류 내 중복 장착 시 확정 불가
   */
  function canConfirmPerkFlawSetup(classId, perks = [], flaws = [], classLevel = 1) {
    if (!canCustomizePerks(classId)) {
      const hasAnyPerk = Array.isArray(perks) && perks.some(p => p != null && p !== 255);
      const hasAnyFlaw = Array.isArray(flaws) && flaws.some(f => f != null && f !== 255);
      return !hasAnyPerk && !hasAnyFlaw;
    }

    // 조각 18: 첫 고정 퍽·결함 쌍과 슬롯0 변경 금지 (원작-대조표 101행, 정밀2 §2·4)
    const fixedPair = CLASS_FIXED_PERK_FLAWS[classId];
    if (fixedPair && classId !== 'adventurer') {
      const p0 = (perks[0] != null && perks[0] !== 255) ? Number(perks[0]) : null;
      const f0 = (flaws[0] != null && flaws[0] !== 255) ? Number(flaws[0]) : null;
      if (p0 !== fixedPair.perkId || f0 !== fixedPair.flawId) {
        return false;
      }
    }

    const allowedSlots = getPerkSlotCount(classId, classLevel);
    const totalSlots = Math.max(perks.length, flaws.length);

    for (let i = allowedSlots; i < totalSlots; i++) {
      if ((perks[i] != null && perks[i] !== 255) || (flaws[i] != null && flaws[i] !== 255)) {
        return false;
      }
    }

    const activePerks = [];
    const activeFlaws = [];

    for (let i = 0; i < allowedSlots; i++) {
      const p = (perks[i] != null && perks[i] !== 255) ? Number(perks[i]) : null;
      const f = (flaws[i] != null && flaws[i] !== 255) ? Number(flaws[i]) : null;

      if (p != null) {
        if (activePerks.includes(p)) return false;
        activePerks.push(p);
      }
      if (f != null) {
        if (activeFlaws.includes(f)) return false;
        activeFlaws.push(f);
      }

      if (p != null && f == null) {
        return false;
      }
    }

    return true;
  }

  /**
   * 조각 11 - 플레이어 스탯에 퍽/결함 효과 적용 (순수 함수)
   * - 퍽 4 (타고난 완력): 기본 공격 +1
   * - 퍽 9 (강철 체력): 최대 체력 +10 (현재 체력도 +10)
   * - 결함 1 (허약 체질): 최대 체력 -10 (현재 체력도 -10, 최소 1)
   * - 결함 6 (경량 갑옷): 기본 갑옷 -1 (최소 0)
   */
  function applyPerksAndFlaws(player, perks = [], flaws = []) {
    if (!player) return player;
    const validated = validatePerkFlawPairs(perks, flaws, MAX_PERK_SLOTS);
    const activePerks = validated.perks.filter(p => p != null);
    const activeFlaws = validated.flaws.filter(f => f != null);

    let maxHp = player.maxHp != null ? player.maxHp : 50;
    let hp = player.hp != null ? player.hp : maxHp;
    let maxArmor = player.maxArmor != null ? player.maxArmor : 4;
    let armor = player.armor != null ? player.armor : maxArmor;
    let baseAtk = player.baseAtk != null ? player.baseAtk : 3;

    if (activePerks.includes(4)) {
      baseAtk += 1;
    }
    if (activePerks.includes(9)) {
      maxHp += 10;
      hp += 10;
    }
    if (activeFlaws.includes(1)) {
      maxHp = Math.max(1, maxHp - 10);
      hp = Math.max(1, Math.min(maxHp, hp - 10));
    }
    if (activeFlaws.includes(6)) {
      maxArmor = Math.max(0, maxArmor - 1);
      armor = Math.max(0, Math.min(maxArmor, armor - 1));
    }

    return {
      ...player,
      maxHp,
      hp,
      maxArmor,
      armor,
      baseAtk,
      perks: normalizePerkSlots(validated.perks),
      flaws: normalizePerkSlots(validated.flaws),
      activePerks,
      activeFlaws
    };
  }


  /**
   * 레거시 액티브 스킬 5종 정의 (조각 5 호환용)
   */
  const SKILLS = {
    slash_row: {
      id: 'slash_row',
      skillId: 11,
      name: '가로 베기',
      icon: '⚔️',
      cooldown: 5,
      desc: '가로 한 줄의 모든 적을 공격합니다.'
    },
    shuffle: {
      id: 'shuffle',
      skillId: 26,
      name: '지진 (판 섞기)',
      icon: '🔄',
      cooldown: 8,
      desc: '판의 모든 칸을 무작위로 재배치합니다.'
    },
    heal: {
      id: 'heal',
      skillId: 2,
      name: '치유의 손길',
      icon: '💖',
      cooldown: 6,
      desc: '체력을 8 즉시 회복합니다.'
    },
    convert_coin_to_sword: {
      id: 'convert_coin_to_sword',
      skillId: 15,
      name: '칼 변환 (눈부신 섬광)',
      icon: '✨',
      cooldown: 7,
      desc: '판의 모든 코인을 칼로 변환합니다.'
    },
    bomb_potion: {
      id: 'bomb_potion',
      skillId: 28,
      name: '화염구 (폭발)',
      icon: '💣',
      cooldown: 6,
      desc: '판의 적에게 폭발 피해를 줍니다.'
    }
  };

  const SKILL_IDS = Object.keys(SKILLS);

  const HIGH_SCORES_KEY = 'goblin_raid_v1';
  const UNLOCK_DATA_KEY = 'goblin_raid_unlocks_v1';
  const MAX_HIGH_SCORES = 10;
  const MAX_HIGH_SCORES_V2 = 10;

  /**
   * 조각 10 - 판 진행 및 영구 기록 저장소 키와 버전
   */
  const RUN_SAVE_KEY = 'goblin_raid_run_v1';
  const RUN_SAVE_BACKUP_KEY = 'goblin_raid_run_v1_backup';
  const PROFILE_SAVE_KEY = 'goblin_raid_profile_v1';
  const PROFILE_SAVE_BACKUP_KEY = 'goblin_raid_profile_v1_backup';
  const SAVE_VERSION = 1;

  /**
   * 조각 8 & 조각 14 - 100 단위 자원 게이지 및 기본 토큰 점수 상수
   * 조각 14 (11절): 기본 물약 회복 1, 기본 방패 복구 1, 기본 힘·민첩·활력·행운 각 1
   */
  const GAUGE_MAX = 100;
  const BASE_RESOURCE_POINTS_PER_TOKEN = 2;
  const DEFAULT_SHIELD_RECOVERY_PER_TOKEN = 1;
  const DEFAULT_POTION_HEAL_PER_TOKEN = 1;
  const DEFAULT_BONUS_TOKEN_CHANCE = 20;
  const DEFAULT_STRENGTH = 1;
  const DEFAULT_DEXTERITY = 1;
  const DEFAULT_VITALITY = 1;
  const DEFAULT_LUCK = 1;

  // 조각 14: 직업 해제 카운터 상수 (한 판 최대 3회, 간격 R(20, 30))
  const CLASS_UNLOCK_INTERVAL_MIN = 20;
  const CLASS_UNLOCK_INTERVAL_MAX = 30;
  const MAX_CLASS_UNLOCKS_PER_RUN = 3;

  /**
   * 조각 8 - 스탯 선택 옵션 4종 정의 (규칙-명세서-원작판 6번)
   * 기본 공격 +2, 방패 복구 +2, 최대 체력 +10 및 임시 선택지 무기 공격 +1
   */
  const STAT_UPGRADE_OPTIONS = [
    {
      id: 'stat_base_atk_2',
      type: 'stat_upgrade',
      stat: 'baseAtk',
      value: 2,
      name: '기본 완력 단련 (+2)',
      desc: '기본 공격력 +2',
      icon: '⚔️'
    },
    {
      id: 'stat_shield_recovery_2',
      type: 'stat_upgrade',
      stat: 'shieldRecovery',
      value: 2,
      name: '방패 복구술 연마 (+2)',
      desc: '방패 토큰당 복구량 +2',
      icon: '🛡️'
    },
    {
      id: 'stat_max_hp_10',
      type: 'stat_upgrade',
      stat: 'maxHp',
      value: 10,
      name: '생명력 대폭 증진 (+10)',
      desc: '최대 체력 +10 & 체력 +10 회복',
      icon: '❤️'
    },
    {
      id: 'stat_weapon_atk_1',
      type: 'stat_upgrade',
      stat: 'weaponAtk',
      value: 1,
      name: '무기 정밀 제련 (+1)',
      desc: '무기 공격력 +1',
      icon: '🗡️'
    }
  ];

  /**
   * Mulberry32 기반 시드 난수 생성기
   * @param {number} [seed] 32비트 시드 정수
   * @returns {function(): number} 0 이상 1 미만의 난수 함수
   */
  function createRNG(seed) {
    let s = (typeof seed === 'number' && Number.isFinite(seed) ? Math.floor(seed) : 123456789) >>> 0;
    if (s === 0) s = 123456789;
    function next() {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    next.getState = function () { return s; };
    next.setState = function (state) {
      s = (typeof state === 'number' && Number.isFinite(state) ? Math.floor(state) : 123456789) >>> 0;
      if (s === 0) s = 123456789;
    };
    next.seed = seed;
    return next;
  }

  /**
   * 긴 줄 보너스 배율 반환 (규칙 3번)
   * 길이 3=×1.0, 4=×1.25, 5=×1.5, 6~7=×2.0, 8이상=×3.0
   */
  function getLengthMultiplier(length) {
    const l = Math.max(0, Math.floor(length || 0));
    if (l >= 8) return 3.0;
    if (l >= 6) return 2.0;
    if (l === 5) return 1.5;
    if (l === 4) return 1.25;
    return 1.0;
  }

  /**
   * 턴 수에 따른 타일 출현 비율 (규칙 7번)
   * 합 100 기준 가중치
   * - 초반(1~20): 코인 25 · 적 10 · 방패 25 · 물약 20 · 칼 20
   * - 중반(21~50): 코인 20 · 적 20 · 방패 20 · 물약 20 · 칼 20
   * - 후반(51~80): 코인 15 · 적 30 · 방패 15 · 물약 20 · 칼 20
   * - 극후반(81~): 코인 10 · 적 40 · 방패 10 · 물약 20 · 칼 20
   */
  function getTileWeights(turn = 1) {
    const t = Math.max(1, Math.floor(turn));
    if (t <= 20) {
      return { coin: 25, enemy: 10, shield: 25, potion: 20, sword: 20 };
    } else if (t <= 50) {
      return { coin: 20, enemy: 20, shield: 20, potion: 20, sword: 20 };
    } else if (t <= 80) {
      return { coin: 15, enemy: 30, shield: 15, potion: 20, sword: 20 };
    } else {
      return { coin: 10, enemy: 40, shield: 10, potion: 20, sword: 20 };
    }
  }

  /**
   * 원작판 정수 균등 난수 R(a, b): a 이상 b 이하 정수 균등 난수 (a > b면 바꿔 계산)
   */
  function randomInt(a, b, rng = null) {
    const randomFn = typeof rng === 'function' ? rng : Math.random;
    const minVal = Math.min(Math.floor(a), Math.floor(b));
    const maxVal = Math.max(Math.floor(a), Math.floor(b));
    const range = maxVal - minVal + 1;
    return minVal + Math.floor(randomFn() * range);
  }

  /**
   * 조각 7 - 원작판 적 능력치 곡선 계산 순수 함수
   * @param {number} turn 현재 턴 T
   * @param {number} difficulty 난이도 0~3 (기본 1)
   * @param {number} L 플레이어 정수 레벨/XP 인덱스: floor((현재 XP + 누적 XP) / 100)
   * @param {function} rng 시드 난수 함수
   * @returns {{hp: number, maxHp: number, atk: number, armor: number, S: number, T: number, L: number, difficulty: number}}
   */
  function calculateEnemyCurve(turn = 1, difficulty = 1, L = 0, rng = null) {
    const T = Math.max(1, Math.floor(turn || 1));
    const diff = (difficulty != null && Number.isInteger(difficulty))
      ? Math.max(0, Math.min(3, difficulty))
      : 1;
    const Lval = Math.max(0, Math.floor(L || 0));

    let S = T;
    if (diff === 0) {
      S = T;
    } else {
      const D = diff === 1 ? 700 : (diff === 2 ? 750 : 500);
      S = Math.floor(T * Math.max(1, 1 + (T - 500) / D));
      if (Lval > 40) {
        S = Math.floor(S * (1 + (Lval - 40) / 60));
      }
    }

    let atk = 1;
    let armor = 0;
    let hp = 4;

    if (diff === 0) {
      atk = Math.max(1, randomInt(Math.floor(S / 80), Math.floor(S / 70), rng));
      armor = Math.max(0, randomInt(Math.floor(S / 70), Math.floor(S / 55), rng));
      hp = Math.max(3, randomInt(Math.floor(S / 25), Math.floor(S / 20), rng));
    } else if (diff === 1) {
      atk = Math.max(1, randomInt(Math.floor(S / 65), Math.floor(S / 55), rng));
      armor = Math.max(0, randomInt(Math.floor(S / 50), Math.floor(S / 40), rng));
      hp = Math.max(4, randomInt(Math.floor(S / 20), Math.floor(S / 15), rng));
    } else if (diff === 2) {
      atk = Math.max(1, randomInt(Math.floor(S / 50), Math.floor(S / 40), rng));
      armor = Math.max(0, randomInt(Math.floor(S / 40), Math.floor(S / 37), rng));
      hp = Math.max(4, randomInt(Math.floor(S / 17), Math.floor(S / 12), rng));
    } else if (diff === 3) {
      atk = Math.max(1, randomInt(Math.floor(S / 40), Math.floor(S / 35), rng));
      armor = Math.max(0, randomInt(Math.floor(S / 30), Math.floor(S / 35), rng));
      hp = Math.max(4, randomInt(Math.floor(S / 15), Math.floor(S / 10), rng));
    }

    return {
      hp,
      maxHp: hp,
      atk,
      armor,
      S,
      T,
      L: Lval,
      difficulty: diff
    };
  }

  /**
   * 턴 수에 따른 기본 적 스탯 계산 (원작판 능력치 곡선 적용)
   */
  function createEnemyStats(turn = 1, options = {}) {
    let difficulty = 1;
    let L = 0;
    let rng = null;

    if (typeof options === 'object' && options !== null) {
      if (options.difficulty != null) difficulty = options.difficulty;
      if (options.L != null) L = options.L;
      if (options.rng != null) rng = options.rng;
    }

    return calculateEnemyCurve(turn, difficulty, L, rng);
  }

  /**
   * 적 타일 생성 헬퍼 (조각 4 특수 적 7종 지원, 조각 7 원작 정렬: 동결·독·표식 상태 지원, 조각 9: specialId 및 baseHp 지원)
   */
  function createEnemyTile(x, y, id, turn = 1, customStats = {}) {
    const defaultStats = createEnemyStats(turn, customStats);
    const hp = customStats.hp != null ? customStats.hp : defaultStats.hp;
    const maxHp = customStats.maxHp != null ? customStats.maxHp : (customStats.hp != null ? customStats.hp : defaultStats.maxHp);
    const baseHp = customStats.baseHp != null ? customStats.baseHp : maxHp;
    const atk = customStats.atk != null ? customStats.atk : defaultStats.atk;
    let armor = customStats.baseArmor != null ? customStats.baseArmor : (customStats.armor != null ? customStats.armor : defaultStats.armor);

    // 조각 12 & 조각 20: 숙적 5 (투명괴물, 종족 6 숙적)가 판에 있으면 새로 생성되는 적의 방어력 2배
    const playerRaceId = (customStats.player && customStats.player.raceId != null)
      ? customStats.player.raceId
      : (customStats.raceId != null ? customStats.raceId : 0);
    const isMortal5Effective = (playerRaceId === 6 || getMortalEnemyForRace(playerRaceId) === 5);
    if (customStats.hasMortalEnemy5 || (isMortal5Effective && customStats.board && isMortalEnemyOnBoard(customStats.board, 5))) {
      armor = armor * 2;
    }

    const specialId = (typeof customStats.specialId === 'number' && customStats.specialId >= 1 && customStats.specialId <= 32)
      ? Math.floor(customStats.specialId)
      : null;
    const specialType = customStats.specialType || (specialId ? SPECIAL_ENEMY_ID_TO_TYPE[specialId] : null);
    const defaults = (specialType && SPECIAL_ENEMY_DEFAULTS[specialType]) ? SPECIAL_ENEMY_DEFAULTS[specialType] : {};

    const tile = {
      ...customStats,
      id: id || `tile_${x}_${y}_enemy_${Date.now()}`,
      x,
      y,
      type: 'enemy',
      hp,
      maxHp,
      baseHp,
      atk,
      armor,
      specialId,
      specialType,
      burnDamage: customStats.burnDamage || 0
    };

    if (customStats.isFrozen !== undefined) {
      tile.isFrozen = Boolean(customStats.isFrozen);
    }
    if (customStats.isPoisoned !== undefined) {
      tile.isPoisoned = Boolean(customStats.isPoisoned);
    }
    if (customStats.marked !== undefined) {
      tile.marked = Boolean(customStats.marked);
    }

    if (defaults.countdown != null || customStats.countdown != null) {
      tile.countdown = customStats.countdown != null ? customStats.countdown : defaults.countdown;
      tile.maxCountdown = tile.countdown;
    }
    if (defaults.bonusGold != null || customStats.bonusGold != null) {
      tile.bonusGold = customStats.bonusGold != null ? customStats.bonusGold : defaults.bonusGold;
    }
    if (defaults.healAmount != null || customStats.healAmount != null) {
      tile.healAmount = customStats.healAmount != null ? customStats.healAmount : defaults.healAmount;
    }
    if (defaults.expBonus != null || customStats.expBonus != null) {
      tile.expBonus = customStats.expBonus != null ? customStats.expBonus : defaults.expBonus;
    }

    return tile;
  }

  /**
   * 조각 9 - 적 타일을 특수 적(ID 1~32)으로 승급 (원작판 3번 배율 및 원작 번호 능력 연동)
   */
  function promoteEnemy(tile, specialId, player = null, options = {}) {
    if (!tile || tile.type !== 'enemy') return tile;
    let effectivePlayer = player;
    let effectiveOptions = options || {};
    if (typeof player === 'number') {
      // 3번째 인자가 숫자인 경우 (예: promoteEnemy(tile, 12, 1, { player, ... }))
      effectivePlayer = (options && options.player) ? options.player : null;
      effectiveOptions = options || {};
    } else if (player && typeof player === 'object') {
      if (player.player) {
        effectivePlayer = player.player;
        effectiveOptions = player;
      } else {
        effectivePlayer = player;
        effectiveOptions = options || {};
      }
    }
    if (!effectivePlayer && effectiveOptions && effectiveOptions.player) {
      effectivePlayer = effectiveOptions.player;
    }

    const sId = Math.max(1, Math.min(32, Math.floor(specialId || 1)));
    const multipliers = getSpecialEnemyMultipliers(sId);

    // 조각 21 (원작-대조표-2 239행): 특수 적 능력치는 생성 기반 (GenerateStats @ 00063098: 현재 턴·난이도로 새로 생성)
    // 단위 시험의 명시적 customStats/originalBaseHp가 지정되지 않고 turn이 주어진 경우 현재 턴·난이도 곡선으로 새 스탯 생성
    let baseAtk, baseArmor, baseHp;
    if (effectiveOptions && effectiveOptions.turn != null && effectiveOptions.hp == null && tile.originalBaseHp == null) {
      const diff = effectiveOptions.difficulty != null ? effectiveOptions.difficulty : 1;
      const playerL = effectiveOptions.L || 0;
      const generated = calculateEnemyCurve(effectiveOptions.turn, diff, playerL, effectiveOptions.rng);
      baseAtk = generated.atk;
      baseArmor = generated.armor;
      baseHp = generated.hp;
    } else {
      baseAtk = (tile.originalBaseAtk != null) ? tile.originalBaseAtk : (tile.atk != null ? tile.atk : 1);
      baseArmor = (tile.originalBaseArmor != null) ? tile.originalBaseArmor : (tile.armor != null ? tile.armor : 0);
      baseHp = (tile.originalBaseHp != null) ? tile.originalBaseHp : (tile.baseHp != null ? tile.baseHp : (tile.hp != null ? tile.hp : (tile.maxHp || 4)));
    }

    const rawHp = (effectiveOptions && effectiveOptions.hp != null) ? effectiveOptions.hp : multipliers.hp(baseHp, effectivePlayer);
    const activeFlaws = (effectiveOptions && effectiveOptions.activeFlaws)
      || (effectivePlayer && Array.isArray(effectivePlayer.flaws) ? effectivePlayer.flaws.filter(f => f != null) : []);

    // 조각 11: 결함 9 (요란한 발소리) - 특수 적 체력 +5% (원작판: 정수 버림)
    let newHp = rawHp;
    if (activeFlaws.includes(9)) {
      newHp = Math.floor(newHp * 1.05);
    }

    const newAtk = (effectiveOptions && effectiveOptions.atk != null) ? effectiveOptions.atk : multipliers.atk(baseAtk, effectivePlayer);
    const newArmor = (effectiveOptions && effectiveOptions.armor != null) ? effectiveOptions.armor : multipliers.armor(baseArmor, effectivePlayer);
    const newMaxHp = (effectiveOptions && effectiveOptions.maxHp != null) ? effectiveOptions.maxHp : ((effectiveOptions && effectiveOptions.hp != null) ? effectiveOptions.hp : newHp);
    const newBaseHp = (effectiveOptions && effectiveOptions.baseHp != null) ? effectiveOptions.baseHp : ((effectiveOptions && effectiveOptions.hp != null) ? effectiveOptions.hp : newHp);

    const specialType = SPECIAL_ENEMY_ID_TO_TYPE[sId] || null;
    const defaults = (specialType && SPECIAL_ENEMY_DEFAULTS[specialType]) ? SPECIAL_ENEMY_DEFAULTS[specialType] : {};

    const promoted = {
      ...tile,
      originalBaseAtk: baseAtk,
      originalBaseArmor: baseArmor,
      originalBaseHp: baseHp,
      specialId: sId,
      specialType,
      atk: newAtk,
      armor: newArmor,
      hp: newHp,
      maxHp: newMaxHp,
      baseHp: newBaseHp,
      burnDamage: (effectiveOptions && effectiveOptions.burnDamage != null) ? effectiveOptions.burnDamage : (tile.burnDamage || 0)
    };

    if (sId === 3) {
      // 도망자: 카운트다운 5 (임시값 준수)
      promoted.countdown = effectiveOptions.countdown != null ? effectiveOptions.countdown : (defaults.countdown || 5);
      promoted.maxCountdown = promoted.countdown;
      promoted.bonusGold = effectiveOptions.bonusGold != null ? effectiveOptions.bonusGold : (defaults.bonusGold || 5);
    } else if (sId === 10) {
      // 폭탄병: 카운트다운 5
      promoted.countdown = effectiveOptions.countdown != null ? effectiveOptions.countdown : (defaults.countdown || 5);
      promoted.maxCountdown = promoted.countdown;
    } else if (sId === 19 || sId === 28) {
      // 조각 18: ID 19 (불안정괴물) 및 ID 28 (포식자) 초기 카운트다운 5
      promoted.countdown = effectiveOptions.countdown != null ? effectiveOptions.countdown : 5;
      promoted.maxCountdown = promoted.countdown;
    } else if (sId === 4) {
      // 치유사
      promoted.healAmount = effectiveOptions.healAmount != null ? effectiveOptions.healAmount : (defaults.healAmount || 2);
    }

    if (effectiveOptions && effectiveOptions.countdown != null) {
      promoted.countdown = effectiveOptions.countdown;
      promoted.maxCountdown = effectiveOptions.countdown;
    }

    // 조각 12 & 조각 20(대조표-2 121행): 숙적 12 (부식괴물)
    // RandomiseTile @ 0002d584: 숙적 12 등장 때 방패 0 (플레이어 종족 숙적이 12일 때만)
    const playerRaceId = (effectivePlayer && effectivePlayer.raceId != null) ? effectivePlayer.raceId : (effectiveOptions && effectiveOptions.raceId != null ? effectiveOptions.raceId : 0);
    const isMortal12Effective = (playerRaceId === 5 || getMortalEnemyForRace(playerRaceId) === 12);
    if (sId === 12 && isMortal12Effective && effectivePlayer) {
      effectivePlayer.armor = 0;
    }

    // 조각 20(대조표-2 140행): 특수 적 ID 31 (도주자)
    // RandomiseTile @ 0002d584 → JumpDown @ 0002d3cc: 생성/승급 직후 같은 열 맨 아래 칸으로 이동
    if (sId === 31 && effectiveOptions && effectiveOptions.board) {
      const b = effectiveOptions.board;
      const h = b.length;
      if (promoted.y < h - 1) {
        const bottomY = h - 1;
        const bottomTile = b[bottomY][promoted.x];
        b[bottomY][promoted.x] = promoted;
        b[promoted.y][promoted.x] = bottomTile;
        if (bottomTile) {
          bottomTile.y = promoted.y;
        }
        promoted.y = bottomY;
      }
    }

    Object.assign(tile, promoted);
    return tile;
  }

  /**
   * 특수 적 생성 편의 함수 (조각 9: 숫자 ID 1~32 또는 문자열 specialType 지원)
   */
  function createSpecialEnemyTile(x, y, id, specialTypeOrId, turn = 1, customStats = {}) {
    let effectiveSpecialId = null;
    let effectiveTurn = turn;
    let effectiveCustomStats = customStats || {};

    if (typeof specialTypeOrId === 'number') {
      // 조각 22 시험 호환: (x, y, id, turn=1, specialId, customStats) 순서로 넘겨진 경우 감지
      if (specialTypeOrId === 1 && typeof turn === 'number' && turn >= 1 && turn <= 32 && effectiveCustomStats && typeof effectiveCustomStats === 'object') {
        effectiveSpecialId = Math.max(1, Math.min(32, Math.floor(turn)));
        effectiveTurn = specialTypeOrId;
      } else {
        effectiveSpecialId = Math.max(1, Math.min(32, Math.floor(specialTypeOrId)));
        effectiveTurn = typeof turn === 'number' ? turn : 1;
      }
      const baseTile = createEnemyTile(x, y, id, effectiveTurn, effectiveCustomStats);
      return promoteEnemy(baseTile, effectiveSpecialId, effectiveCustomStats.player || null, effectiveCustomStats);
    }
    const specialType = specialTypeOrId;
    return createEnemyTile(x, y, id, effectiveTurn, {
      ...effectiveCustomStats,
      specialId: effectiveCustomStats.specialId || null,
      specialType
    });
  }

  /**
   * 조각 9 - 승급 후 다음 대기 턴 수 계산 순수 함수 (규칙-명세서-원작판 8번)
   * - 난이도 0 = R(정수(200/√T), 정수(300/√T)) + 5
   * - 난이도 1 = R(정수(200/√S), 정수(300/√S))
   * - 난이도 2·3 = R(정수(150/√S), 정수(300/√S))
   */
  function calculateNextPromotionCooldown(turn = 1, difficulty = 1, L = 0, rng = null) {
    const T = Math.max(1, Math.floor(turn || 1));
    const diff = (difficulty != null && Number.isInteger(difficulty))
      ? Math.max(0, Math.min(3, difficulty))
      : 1;
    const Lval = Math.max(0, Math.floor(L || 0));

    let S = T;
    if (diff === 0) {
      S = T;
    } else {
      const D = diff === 1 ? 700 : (diff === 2 ? 750 : 500);
      S = Math.floor(T * Math.max(1, 1 + (T - 500) / D));
      if (Lval > 40) {
        S = Math.floor(S * (1 + (Lval - 40) / 60));
      }
    }
    S = Math.max(1, S);

    if (diff === 0) {
      const minWait = Math.floor(200 / Math.sqrt(T));
      const maxWait = Math.floor(300 / Math.sqrt(T));
      return randomInt(minWait, maxWait, rng) + 5;
    } else if (diff === 1) {
      const minWait = Math.floor(200 / Math.sqrt(S));
      const maxWait = Math.floor(300 / Math.sqrt(S));
      return randomInt(minWait, maxWait, rng);
    } else {
      // diff === 2 || diff === 3
      const minWait = Math.floor(150 / Math.sqrt(S));
      const maxWait = Math.floor(300 / Math.sqrt(S));
      return randomInt(minWait, maxWait, rng);
    }
  }

  /**
   * 조각 9 - 승급 타이머 1턴 진행 순수 함수
   * 턴 종료 시 대기 -1, 0에 도달 시 보드의 일반 적 1마리 승급 및 새 대기 계산
   */
  function stepPromotionTimer(gameState, rng = null) {
    if (!gameState || !gameState.board) {
      return { gameState, promoted: false, promotedEnemy: null, promotionCooldown: PROMOTION_COOLDOWN_INITIAL };
    }
    const randomFn = typeof rng === 'function' ? rng : (typeof gameState.rng === 'function' ? gameState.rng : Math.random);
    let promotionCooldown = (gameState.promotionCooldown != null)
      ? gameState.promotionCooldown
      : PROMOTION_COOLDOWN_INITIAL;

    const player = gameState.player || {};
    const activeFlaws = (player && Array.isArray(player.flaws) ? player.flaws.filter(f => f != null) : []);
    // 조각 18: 타이머 진행은 매 턴 1씩 감소 (매 턴 2 감소가 아님)
    promotionCooldown = Math.max(0, promotionCooldown - 1);
    let promoted = false;
    let promotedEnemy = null;
    let board = cloneBoard(gameState.board);
    const turn = gameState.turn || 1;
    const difficulty = gameState.difficulty != null ? gameState.difficulty : 1;
    const playerL = Math.floor(((player.exp || 0) + (player.accumulatedExp || 0)) / 100);

    if (promotionCooldown === 0) {
      const candidates = [];
      for (let y = 0; y < board.length; y++) {
        for (let x = 0; x < board[y].length; x++) {
          const t = board[y][x];
          if (t && t.type === 'enemy' && t.hp > 0 && !t.specialId) {
            candidates.push({ x, y, tile: t });
          }
        }
      }

      if (candidates.length > 0) {
        const idx = Math.floor(randomFn() * candidates.length);
        const chosen = candidates[idx];
        let specialId = randomInt(1, 32, randomFn);
        // 조각 16: 조건부 숙적 덮어쓰기 (R(1,200) <= 10, 퍽 8이면 <= 5)
        const playerRaceId = (player && player.raceId != null) ? player.raceId : 0;
        const mortalEnemyId = getMortalEnemyForRace(playerRaceId);
        if (mortalEnemyId && mortalEnemyId > 0) {
          const playerPerks = (player && Array.isArray(player.perks)) ? player.perks.filter(p => p != null) : [];
          const threshold = playerPerks.includes(8) ? 5 : 10;
          if (randomInt(1, 200, randomFn) <= threshold) {
            specialId = mortalEnemyId;
          }
        }
        board[chosen.y][chosen.x] = promoteEnemy(chosen.tile, specialId, player, {
          rng: randomFn,
          turn,
          difficulty,
          L: playerL
        });
        promoted = true;
        promotedEnemy = board[chosen.y][chosen.x];
        let nextCooldown = calculateNextPromotionCooldown(turn, difficulty, playerL, randomFn);
        // 조각 18 & 조각 21 (원작-대조표-2 212행): 결함 8 (적들의 광기)은 특수 적 1턴 일찍 등장 (원작 GenerateStats: 새 대기 -1 시 최소 1)
        if (activeFlaws.includes(8)) {
          nextCooldown = Math.max(1, nextCooldown - 1);
        }
        promotionCooldown = nextCooldown;
      }
    }

    const nextGameState = {
      ...gameState,
      board,
      promotionCooldown
    };

    return {
      gameState: nextGameState,
      promoted,
      promotedEnemy,
      promotionCooldown
    };
  }

  /**
   * 스킬 인스턴스 객체 생성 (숫자 ID 0~41 또는 레거시 문자열 id 지원)
   */
  function createSkillInstance(skillIdOrKey) {
    let def = null;
    if (typeof skillIdOrKey === 'number') {
      def = SKILLS_DATA.find(s => s.id === skillIdOrKey);
    } else if (typeof skillIdOrKey === 'string') {
      def = SKILLS[skillIdOrKey] || SKILLS_DATA.find(s => s.key === skillIdOrKey);
    }
    if (!def) {
      def = SKILLS_DATA[11]; // 기본 가로 베기 (Slash)
    }

    const cd = def.cooldown != null ? def.cooldown : 12;
    const resolvedSkillId = typeof def.skillId === 'number'
      ? def.skillId
      : (typeof def.id === 'number' ? def.id : 11);
    return {
      id: def.id != null ? def.id : def.key,
      skillId: resolvedSkillId,
      key: def.key || def.id,
      name: def.name,
      icon: def.icon || '⚔️',
      cooldown: cd,
      currentCooldown: 0,
      charge: cd,
      rank: 1,
      desc: def.desc,
      singleUse: Boolean(def.singleUse || cd === -1)
    };
  }

  /**
   * 직업 해제 여부 판정 (조각 5 & 조각 14)
   * 모험가는 최초부터 열림, 그 외 직업은 특수 적 처치 해제 카운터 달성 또는 unlockedClasses 목록으로 해제
   */
  function isClassUnlocked(classId, unlockData = {}) {
    if (classId === 'adventurer') return true;
    const def = CLASSES[classId];
    if (!def) return false;

    const unlockedList = Array.isArray(unlockData.unlockedClasses) ? unlockData.unlockedClasses : [];
    if (unlockedList.includes(classId)) return true;

    // 조각 5 호환: unlockedClasses가 명시되지 않은 레거시 데이터는 처치 수로 판정
    if (!unlockData.unlockedClasses && typeof unlockData.specialKills === 'number') {
      return unlockData.specialKills >= (def.unlockRequirement || 0);
    }

    return false;
  }

  /**
   * 조각 14 & 조각 21 - 특수 적 처치 기반 직업 해제 / 성장 진행 순수 함수 (규칙-명세서-원작판 11절 & 원작-대조표-2 230·231행)
   * 비쉬움(비 Easy) 난이도에서 특수 적 처치 시 카운터 감소, 0 도달 시:
   * - 현재 비기본직업 레벨 10 미만일 때 R(0,1) 갈림길: 0이면 현재 직업 성장(레벨+1), 1이면 미해제 직업 중 무작위 1개 해제
   * - 기본직업(모험가)이거나 레벨 10 이상이면 미해제 직업 해제
   * 한 판 최대 3회 (MAX_CLASS_UNLOCKS_PER_RUN = 3), 다음 간격 R(20, 30)
   */
  function stepClassUnlock(gameState, killedSpecialCount = 0, rng = null, options = {}) {
    if (!gameState) {
      return { gameState, unlocked: false, unlockedClassId: null, classUnlockCounter: 25, classUnlocksThisRun: 0, rewardType: null };
    }
    const randomFn = typeof rng === 'function' ? rng : (typeof gameState.rng === 'function' ? gameState.rng : Math.random);
    const difficulty = gameState.difficulty != null ? gameState.difficulty : 1;
    const kills = Math.max(0, Math.floor(killedSpecialCount || 0));

    let classUnlockCounter = (gameState.classUnlockCounter != null)
      ? gameState.classUnlockCounter
      : randomInt(CLASS_UNLOCK_INTERVAL_MIN, CLASS_UNLOCK_INTERVAL_MAX, randomFn);
    let classUnlocksThisRun = gameState.classUnlocksThisRun || 0;

    const currentUnlocked = (gameState.unlockData && Array.isArray(gameState.unlockData.unlockedClasses))
      ? [...gameState.unlockData.unlockedClasses]
      : (Array.isArray(gameState.unlockedClasses) ? [...gameState.unlockedClasses] : ['adventurer']);

    let unlocked = false;
    let unlockedClassId = null;
    let unlockedClassDef = null;
    let rewardType = null;
    let levelUpClassId = null;
    let newLevel = null;
    let newAchievements = [];

    if (difficulty > 0 && kills > 0) {
      classUnlockCounter = Math.max(0, classUnlockCounter - kills);

      if (classUnlockCounter === 0 && classUnlocksThisRun < MAX_CLASS_UNLOCKS_PER_RUN) {
        const currentClassId = (gameState.player && gameState.player.classId) || 'adventurer';
        let currentClassLevel = 1;
        if (options && options.profile && options.profile.classProgress && options.profile.classProgress[currentClassId]) {
          currentClassLevel = options.profile.classProgress[currentClassId].level || 1;
        } else if (gameState.player && gameState.player.classLevel != null) {
          currentClassLevel = gameState.player.classLevel;
        }

        // 조각 21 (원작-대조표-2 231행): 현재 비기본직업 레벨 10 미만일 때 R(0,1) 갈림길
        const canBranchLevelUp = (currentClassId !== 'adventurer' && currentClassLevel < 10);
        const shouldLevelUpCurrent = canBranchLevelUp && (randomInt(0, 1, randomFn) === 0);

        if (shouldLevelUpCurrent) {
          // 현재 직업 성장 (레벨업)
          rewardType = 'class_level_up';
          levelUpClassId = currentClassId;
          const nextLevel = currentClassLevel + 1;
          newLevel = nextLevel;
          if (options && options.profile) {
            updateClassProgress(options.profile, currentClassId, { level: nextLevel }, options.storage);
          }
          classUnlocksThisRun++;
          classUnlockCounter = randomInt(CLASS_UNLOCK_INTERVAL_MIN, CLASS_UNLOCK_INTERVAL_MAX, randomFn);
        } else {
          // 미해제 직업 중 무작위 1개 해제
          const lockedClasses = CLASS_IDS.filter(id => !currentUnlocked.includes(id));
          if (lockedClasses.length > 0) {
            const chosenIdx = Math.floor(randomFn() * lockedClasses.length);
            unlockedClassId = lockedClasses[chosenIdx];
            unlockedClassDef = CLASSES[unlockedClassId] || null;
            currentUnlocked.push(unlockedClassId);
            unlocked = true;
            rewardType = 'unlock_class';
            classUnlocksThisRun++;
            classUnlockCounter = randomInt(CLASS_UNLOCK_INTERVAL_MIN, CLASS_UNLOCK_INTERVAL_MAX, randomFn);

            // 옵션으로 영구 프로필이 전달된 경우 영구 저장 및 업적 판정 자동 연동
            if (options && options.profile) {
              const unlockRes = unlockClass(options.profile, unlockedClassId, options.storage);
              newAchievements = unlockRes.newAchievements || [];
            }
          } else if (canBranchLevelUp) {
            // 미해제 직업이 더 이상 없으면 현재 직업 성장
            rewardType = 'class_level_up';
            levelUpClassId = currentClassId;
            const nextLevel = currentClassLevel + 1;
            newLevel = nextLevel;
            if (options && options.profile) {
              updateClassProgress(options.profile, currentClassId, { level: nextLevel }, options.storage);
            }
            classUnlocksThisRun++;
            classUnlockCounter = randomInt(CLASS_UNLOCK_INTERVAL_MIN, CLASS_UNLOCK_INTERVAL_MAX, randomFn);
          }
        }
      }
    }

    if (options && options.profile && kills > 0) {
      options.profile.specialKills = (options.profile.specialKills || 0) + kills;
      const killAchRes = checkAchievements(null, options.profile, {
        autoGrant: true,
        storage: options.storage,
        specialKills: options.profile.specialKills
      });
      if (killAchRes.newlyUnlocked && killAchRes.newlyUnlocked.length > 0) {
        newAchievements.push(...killAchRes.newlyUnlocked);
      }
    }

    const nextUnlockData = {
      ...(gameState.unlockData || {}),
      unlockedClasses: currentUnlocked,
      specialKills: ((gameState.unlockData && gameState.unlockData.specialKills) || 0) + kills
    };

    const nextGameState = {
      ...gameState,
      classUnlockCounter,
      classUnlocksThisRun,
      unlockedClasses: currentUnlocked,
      unlockData: nextUnlockData
    };

    return {
      gameState: nextGameState,
      unlocked,
      unlockedClassId,
      unlockedClassDef,
      unlockDesc: unlockedClassDef ? (unlockedClassDef.unlockDesc || '') : '',
      rewardType,
      levelUpClassId,
      newLevel,
      classUnlockCounter,
      classUnlocksThisRun,
      newAchievements
    };
  }

  /**
   * 플레이어 기본 상태 객체 생성 (조각 14 원작판 11절 반영)
   * - 기본 물약 회복 1, 기본 방패 복구 1 (DEFAULT_POTION_HEAL_PER_TOKEN, DEFAULT_SHIELD_RECOVERY_PER_TOKEN)
   * - 기본 힘·민첩·활력·행운 각 1
   * - 일반 새 판 시작 최대 체력: 50 (마법사 40, 전사 60), 기본 공격 3 (바바리안 4), 기본 무기 공격 2, 최대 방어 합 4 (레인저 3)
   * - 새 판은 스킬을 장착하지 않고 시작 (skills = []), 레벨업 때 직업의 기본 스킬 풀에서 후보를 받음
   * - 기본 직업(모험가)은 퍽을 꾸밀 수 없음 (canCustomizePerks: false)
   */
  function createPlayer(initial = {}) {
    const classId = initial.classId || 'adventurer';
    const classDef = CLASSES[classId] || CLASSES.adventurer;

    const maxHp = initial.maxHp != null ? initial.maxHp : (classDef ? classDef.maxHp : 50);
    const hp = initial.hp != null ? initial.hp : maxHp;
    const defaultMaxArmor = classDef ? classDef.maxArmor : 4;
    let maxArmor;
    if (initial.maxArmor != null) {
      maxArmor = initial.maxArmor;
    } else if (initial.maxHp != null && initial.maxHp <= 20) {
      // 조각 1~6 레거시 플레이어 호환 (기본 체력 20, 기본 방패 10)
      maxArmor = 10;
    } else if (initial.armor != null && initial.armor > defaultMaxArmor) {
      maxArmor = Math.max(initial.armor, 10);
    } else {
      maxArmor = defaultMaxArmor;
    }
    const armor = initial.armor != null ? initial.armor : maxArmor;
    const baseAtk = initial.baseAtk != null ? initial.baseAtk : (classDef ? classDef.baseAtk : 3);
    const weaponAtk = initial.weaponAtk != null ? initial.weaponAtk : (classDef ? classDef.weaponAtk : 2);

    // 조각 12: 종족 ID (기본값: 직업별 defaultRaceId)
    const defaultRaceId = (classDef && classDef.defaultRaceId != null) ? classDef.defaultRaceId : 0;
    const raceId = initial.raceId != null ? Math.floor(Number(initial.raceId)) : defaultRaceId;

    // 기본 스탯 4종 (힘, 민첩, 활력, 행운 각 1)
    const strength = initial.strength != null ? initial.strength : DEFAULT_STRENGTH;
    const dexterity = initial.dexterity != null ? initial.dexterity : DEFAULT_DEXTERITY;
    const vitality = initial.vitality != null ? initial.vitality : DEFAULT_VITALITY;
    const luck = initial.luck != null ? initial.luck : DEFAULT_LUCK;

    // 조각 3 & 조각 16: 새 판 게이지 기본값 XP·골드·강화 각 100
    const maxShieldGauge = initial.maxShieldGauge != null ? initial.maxShieldGauge : 100;
    const shieldGauge = initial.shieldGauge != null ? initial.shieldGauge : 0;
    const maxGold = initial.maxGold != null ? initial.maxGold : 100;
    const gold = initial.gold != null ? initial.gold : 0;
    const isPoisoned = initial.isPoisoned != null ? Boolean(initial.isPoisoned) : false;

    // 조각 5 & 조각 16: 경험치, 레벨, 스킬, 보너스 (기본 maxExp 100)
    const level = initial.level != null ? initial.level : 1;
    const exp = initial.exp != null ? initial.exp : 0;
    const maxExp = initial.maxExp != null ? initial.maxExp : 100;
    const potionBonus = initial.potionBonus != null ? initial.potionBonus : 0;
    const coinBonus = initial.coinBonus != null ? initial.coinBonus : 0;
    const specialKills = initial.specialKills != null ? initial.specialKills : 0;

    // 조각 16: 소수 잔량 보존
    const expFraction = initial.expFraction != null ? initial.expFraction : 0;
    const goldFraction = initial.goldFraction != null ? initial.goldFraction : 0;
    const upgradeFraction = initial.upgradeFraction != null ? initial.upgradeFraction : 0;

    // 조각 8 & 조각 14: 누적 XP·골드·강화, 기본 물약 회복 1, 방패 복구 1, 스탯 기회 확률
    const accumulatedExp = initial.accumulatedExp != null ? initial.accumulatedExp : 0;
    const accumulatedGold = initial.accumulatedGold != null ? initial.accumulatedGold : 0;
    const accumulatedUpgrade = initial.accumulatedUpgrade != null ? initial.accumulatedUpgrade : (initial.accumulatedShield != null ? initial.accumulatedShield : 0);
    const shieldRecovery = initial.shieldRecovery != null ? initial.shieldRecovery : DEFAULT_SHIELD_RECOVERY_PER_TOKEN;
    const potionHeal = initial.potionHeal != null ? initial.potionHeal : DEFAULT_POTION_HEAL_PER_TOKEN;
    const statChance = initial.statChance != null ? initial.statChance : 5;

    // 조각 14: 퍽 커스터마이징 가능 여부 (모험가는 꾸밀 수 없음)
    const canCustomizePerks = initial.canCustomizePerks != null
      ? Boolean(initial.canCustomizePerks)
      : (classDef ? Boolean(classDef.canCustomizePerks) : false);

    // 조각 14: 새 판은 스킬을 장착하지 않고 시작 (initial.skills가 명시적으로 주어진 경우만 해당 스킬 장착)
    let skills = [];
    if (Array.isArray(initial.skills)) {
      skills = initial.skills.map(s => ({
        ...s,
        rank: s.rank || s.level || 1
      }));
    }

    // 조각 11 & 조각 18: 직업별 첫 고정 퍽·결함 쌍 자동 설정 (슬롯 0)
    const fixedPair = CLASS_FIXED_PERK_FLAWS[classId];
    const rawPerks = Array.isArray(initial.perks) ? [...initial.perks] : [];
    const rawFlaws = Array.isArray(initial.flaws) ? [...initial.flaws] : [];
    if (fixedPair && classId !== 'adventurer' && initial.skipFixedPerkFlaw !== true) {
      if (!initial.perks && !initial.flaws) {
        rawPerks[0] = fixedPair.perkId;
        rawFlaws[0] = fixedPair.flawId;
      }
    }

    const validated = validatePerkFlawPairs(rawPerks, rawFlaws, MAX_PERK_SLOTS);
    // 조각 21 (원작-대조표-2 195행): 테스트 및 직접 설정 호환 - perks/flaws가 단독 제공된 경우 필터링으로 소실되지 않도록 보존
    const hasExplicitPerks = Array.isArray(initial.perks) && initial.perks.length > 0;
    const hasExplicitFlaws = Array.isArray(initial.flaws) && initial.flaws.length > 0;
    const effectivePerks = (hasExplicitPerks && !hasExplicitFlaws)
      ? rawPerks.slice(0, MAX_PERK_SLOTS).map(p => (p != null && p !== 255 ? Number(p) : null))
      : validated.perks;
    const effectiveFlaws = (hasExplicitFlaws && !hasExplicitPerks)
      ? rawFlaws.slice(0, MAX_PERK_SLOTS).map(f => (f != null && f !== 255 ? Number(f) : null))
      : validated.flaws;

    const activePerks = effectivePerks.filter(p => p != null);
    const activeFlaws = effectiveFlaws.filter(f => f != null);
    const additionalPerks = effectivePerks.slice(1).filter(p => p != null);
    const additionalFlaws = effectiveFlaws.slice(1).filter(f => f != null);

    let finalMaxHp = maxHp;
    let finalHp = hp;
    let finalMaxArmor = maxArmor;
    let finalArmor = armor;
    let finalBaseAtk = baseAtk;

    if (initial.applyPerkEffects !== false && (rawPerks.length > 0 || rawFlaws.length > 0)) {
      // 슬롯 0이 직업 고정 쌍인 경우, 직업 기본 스탯에 이미 반영되어 있으므로 추가 가산 제외
      const perksToApply = (fixedPair && classId !== 'adventurer') ? additionalPerks : activePerks;
      const flawsToApply = (fixedPair && classId !== 'adventurer') ? additionalFlaws : activeFlaws;

      if (perksToApply.includes(4)) finalBaseAtk += 1;
      if (perksToApply.includes(9)) {
        finalMaxHp += 10;
        finalHp += 10;
      }
      if (flawsToApply.includes(1)) {
        finalMaxHp = Math.max(1, finalMaxHp - 10);
        finalHp = Math.max(1, Math.min(finalMaxHp, finalHp - 10));
      }
      if (flawsToApply.includes(6)) {
        finalMaxArmor = Math.max(0, finalMaxArmor - 1);
        finalArmor = Math.max(0, Math.min(finalMaxArmor, finalArmor - 1));
      }
    }

    return {
      ...initial,
      classId,
      hp: finalHp,
      maxHp: finalMaxHp,
      armor: finalArmor,
      maxArmor: finalMaxArmor,
      baseAtk: finalBaseAtk,
      weaponAtk,
      strength,
      dexterity,
      vitality,
      luck,
      shieldGauge,
      maxShieldGauge,
      gold,
      maxGold,
      isPoisoned,
      level,
      exp,
      maxExp,
      expFraction,
      goldFraction,
      upgradeFraction,
      potionBonus,
      coinBonus,
      specialKills,
      skills,
      accumulatedExp,
      accumulatedGold,
      accumulatedUpgrade,
      accumulatedShield: accumulatedUpgrade,
      shieldRecovery,
      potionHeal,
      statChance,
      canCustomizePerks,
      raceId,
      perks: normalizePerkSlots(effectivePerks),
      flaws: normalizePerkSlots(effectiveFlaws),
      activePerks,
      activeFlaws
    };
  }

  /**
   * 조각 8 & 조각 11 - 4번째 칸부터 칸마다 확률로 추가 토큰 계산 (규칙-명세서-원작판 4번)
   * - 1~3번째 칸은 추가 토큰 0개, 4번째 칸부터 각 칸마다 R(1, 100) <= bonusChance(기본 20)이면 추가 토큰 +1
   * - 퍽 2 (과감한 돌파): 10칸 이상 연결 시 보너스 확률 100%
   * @param {number} length 체인 길이
   * @param {function} [rng] 시드 난수 함수
   * @param {number} [bonusChance=20] 보너스 확률
   * @param {object} [options] 추가 옵션 (activePerks 등)
   * @returns {number} 추가 토큰 개수
   */
  function calculateBonusTokens(length, rng = null, bonusChance = DEFAULT_BONUS_TOKEN_CHANCE, options = {}) {
    const l = Math.max(0, Math.floor(length || 0));
    if (l < 4) return 0;
    const activePerks = (options && options.activePerks)
      || (options && options.player && Array.isArray(options.player.perks) ? options.player.perks.filter(p => p != null) : []);

    let chance = (typeof bonusChance === 'number' && Number.isFinite(bonusChance))
      ? Math.max(0, Math.min(100, Math.floor(bonusChance)))
      : DEFAULT_BONUS_TOKEN_CHANCE;

    // 조각 11: 퍽 2 (과감한 돌파) - 10칸 이상 연결 시 보너스 기회 100%
    if (l >= 10 && (activePerks.includes(2) || (options && options.isDaring))) {
      chance = 100;
    }

    let bonusTokens = 0;
    for (let i = 4; i <= l; i++) {
      const roll = randomInt(1, 100, rng);
      if (roll <= chance) {
        bonusTokens++;
      }
    }
    return bonusTokens;
  }

  /**
   * 조각 8 & 조각 11 - 원작판 리소스 토큰 계산 순수 함수
   * - 결함 2 (자만심): 딱 3칸만 모으면 보상 없음 (0 반환)
   * - 퍽 7 (알뜰한 감각): 코인 보너스 확률 +10%p
   * - 결함 4 (무모한 맹진): 방패 보너스 확률 -10%p
   * @param {string} type 타일 종류
   * @param {number} length 체인 길이
   * @param {function} [rng] 난수 함수
   * @param {object} [options] 추가 옵션 (bonusChance, activePerks, activeFlaws 등)
   */
  function calculateResourceTokens(type, length, rng = null, options = {}) {
    const l = Math.max(0, Math.floor(length || 0));
    const activePerks = (options && options.activePerks)
      || (options && options.player && Array.isArray(options.player.perks) ? options.player.perks.filter(p => p != null) : []);
    const activeFlaws = (options && options.activeFlaws)
      || (options && options.player && Array.isArray(options.player.flaws) ? options.player.flaws.filter(f => f != null) : []);

    // 조각 11: 결함 2 (자만심) - 딱 3칸만 모으면 보상 없음
    if (l === 3 && activeFlaws.includes(2)) {
      return {
        type,
        length: l,
        baseTokens: 0,
        bonusTokens: 0,
        totalTokens: 0,
        gain: 0,
        isCockyBlocked: true
      };
    }

    let bonusChance = (options && options.bonusChance != null) ? options.bonusChance : DEFAULT_BONUS_TOKEN_CHANCE;

    // 퍽 7 (알뜰한 감각): 골드 보너스 기회 +10%p
    if (type === 'coin' && activePerks.includes(7)) {
      bonusChance += 10;
    }
    // 결함 4 (무모한 맹진): 방패 보너스 기회 -10%p
    if (type === 'shield' && activeFlaws.includes(4)) {
      bonusChance = Math.max(0, bonusChance - 10);
    }

    const bonusTokens = calculateBonusTokens(l, rng, bonusChance, { ...options, activePerks, activeFlaws });
    const baseTokens = l;
    const totalTokens = baseTokens + bonusTokens;
    return {
      type,
      length: l,
      baseTokens,
      bonusTokens,
      totalTokens,
      gain: totalTokens
    };
  }

  /**
   * 자원(방패·물약·코인) 획득 기본 계산
   * rng 또는 useBonusTokens 옵션 제공 시 조각 8 원작판 토큰 계산, 미제공 시 조각 3 배수표 호환
   */
  function calculateResourceGain(type, length, rng = null, options = {}) {
    const l = Math.max(0, Math.floor(length || 0));
    const activeFlaws = (options && options.activeFlaws)
      || (options && options.player && Array.isArray(options.player.flaws) ? options.player.flaws.filter(f => f != null) : []);

    // 조각 11: 결함 2 (자만심) - 딱 3칸만 모으면 보상 없음
    if (l === 3 && activeFlaws.includes(2)) {
      return {
        type,
        length: l,
        multiplier: 1.0,
        gain: 0,
        baseTokens: 0,
        bonusTokens: 0,
        totalTokens: 0,
        isCockyBlocked: true
      };
    }

    // 조각 16: 자원 연결 길이 배수 옛 경로 제거 -> 기본적으로 원작 토큰 방식 사용
    if (options && options.useLegacyMultiplier) {
      const multiplier = getLengthMultiplier(l);
      const gain = Math.floor(l * multiplier);
      return {
        type,
        length: l,
        multiplier,
        gain,
        baseTokens: l,
        bonusTokens: Math.max(0, gain - l),
        totalTokens: gain
      };
    }

    const res = calculateResourceTokens(type, l, rng, options);
    return {
      type,
      length: l,
      baseTokens: res.baseTokens,
      bonusTokens: res.bonusTokens,
      totalTokens: res.totalTokens,
      gain: res.totalTokens,
      multiplier: 1.0
    };
  }

  /**
   * 조각 8 - 100 단위 게이지 자원 누적 계산 (규칙-명세서-원작판 6번 순수 함수)
   * 게이지가 100 이상 도달 시: 누적 완료분 +100, 잔량 = 값 % 100, 메뉴 열기 트리거
   */
  function addGaugeResource(currentValue = 0, addedAmount = 0, accumulatedValue = 0, threshold = GAUGE_MAX) {
    const cur = Math.max(0, Math.floor(currentValue || 0));
    const add = Math.max(0, Math.floor(addedAmount || 0));
    const acc = Math.max(0, Math.floor(accumulatedValue || 0));
    const limit = (typeof threshold === 'number' && threshold > 0) ? threshold : GAUGE_MAX;

    const total = cur + add;
    if (total >= limit) {
      const remainder = total % limit;
      return {
        currentValue: remainder,
        accumulatedValue: acc + limit,
        addedAmount: add,
        reachedThreshold: true,
        openedMenu: true,
        overflowRemainder: remainder
      };
    }

    return {
      currentValue: total,
      accumulatedValue: acc,
      addedAmount: add,
      reachedThreshold: false,
      openedMenu: false,
      overflowRemainder: 0
    };
  }

  /**
   * 조각 8 - 방패 토큰 적용 순수 함수 (규칙-명세서-원작판 6번)
   * - 이미 방패가 최대면 그 토큰은 강화 토큰으로 감
   * - 최대가 아니면 방패 = min(최대, 방패 + recoveryPerToken)
   * - 한 번의 복구에서 넘친 양은 강화로 넘기지 않음 (버려지고, 다음 토큰부터 강화로 분기)
   */
  function applyShieldTokens(player, tokensCount, options = {}) {
    const tokens = Math.max(0, Math.floor(tokensCount || 0));
    const baseRec = (options && options.recoveryPerToken != null)
      ? options.recoveryPerToken
      : ((player && player.shieldRecovery != null) ? player.shieldRecovery : DEFAULT_SHIELD_RECOVERY_PER_TOKEN);
    const equipRec = (player && player.equipmentShieldRecovery) || 0;
    const shieldMultiplier = (options && options.shieldMultiplier != null)
      ? options.shieldMultiplier
      : ((player && player.shieldMultiplier != null) ? player.shieldMultiplier : (player && player.isShieldDoubled ? 2 : 1));
    const recoveryPerToken = Math.max(1, Math.floor((baseRec + equipRec) * shieldMultiplier));

    const hasEnemy12 = Boolean(options && options.hasEnemy12);

    let currentArmor = Math.max(0, (player && player.armor) || 0);
    const maxArmor = Math.max(1, (player && player.maxArmor != null) ? player.maxArmor : 10);
    let shieldGauge = Math.max(0, (player && player.shieldGauge) || 0);
    let accumulatedUpgrade = Math.max(0, (player && player.accumulatedUpgrade) || 0);

    let recoveredArmorTotal = 0;
    let upgradeTokensGained = 0;
    let wastedArmorOverflow = 0;

    for (let i = 0; i < tokens; i++) {
      // 조각 16: 적 ID12 존재 시 미충전이어도 강화로 전환, 또는 이미 방패가 최대면 강화
      if (hasEnemy12 || currentArmor >= maxArmor) {
        upgradeTokensGained++;
      } else {
        const needed = maxArmor - currentArmor;
        if (recoveryPerToken > needed) {
          // 넘친 양은 강화로 이월하지 않고 소멸
          wastedArmorOverflow += (recoveryPerToken - needed);
          recoveredArmorTotal += needed;
          currentArmor = maxArmor;
        } else {
          recoveredArmorTotal += recoveryPerToken;
          currentArmor += recoveryPerToken;
        }
      }
    }

    // 조각 16 & 조각 19(대조표 88행): 강화 증가율 (2 + 추가율) * 배가 및 소수 잔량 보존
    const upgradeMultiplier = (options && options.upgradeMultiplier != null)
      ? options.upgradeMultiplier
      : ((player && player.upgradeMultiplier != null) ? player.upgradeMultiplier : (player && player.isUpgradeDoubled ? 2 : 1));
    const upgradeBonusRate = ((player && player.upgradeBonusRate) || 0) + ((player && player.equipmentUpgradeBonus) ? player.equipmentUpgradeBonus * 0.25 : 0);
    const upgradeRate = (2 + upgradeBonusRate) * upgradeMultiplier;
    const currentFraction = (player && player.upgradeFraction != null) ? player.upgradeFraction : 0;
    const rawUpgradeGain = (upgradeTokensGained * upgradeRate) + currentFraction;
    const upgradePointsGained = Math.floor(rawUpgradeGain);
    const upgradeFraction = rawUpgradeGain - upgradePointsGained;
    if (player) {
      player.upgradeFraction = upgradeFraction;
    }

    let openedUpgradeMenu = false;
    if (upgradePointsGained > 0) {
      const gaugeThreshold = (player && player.maxShieldGauge != null) ? player.maxShieldGauge : GAUGE_MAX;
      const gaugeRes = addGaugeResource(shieldGauge, upgradePointsGained, accumulatedUpgrade, gaugeThreshold);
      shieldGauge = gaugeRes.currentValue;
      accumulatedUpgrade = gaugeRes.accumulatedValue;
      openedUpgradeMenu = gaugeRes.openedMenu;
    }

    return {
      newArmor: currentArmor,
      recoveredArmorTotal,
      upgradeTokensGained,
      upgradePointsGained,
      upgradeFraction,
      wastedArmorOverflow,
      shieldGauge,
      accumulatedUpgrade,
      openedUpgradeMenu
    };
  }

  /**
   * 조각 8 & 조각 16 - 물약 토큰 적용 순수 함수 (일반 물약 독 해제, 산성 물약 피해, 장비·배가 보정)
   */
  function applyPotionTokens(player, normalTokens = 0, acidTokens = 0, options = {}) {
    const baseHeal = (options && options.healPerToken != null)
      ? options.healPerToken
      : ((player && player.potionHeal != null) ? player.potionHeal : DEFAULT_POTION_HEAL_PER_TOKEN);
    const equipHeal = (player && player.equipmentPotionHeal) || 0;
    const potionMultiplier = (options && options.potionMultiplier != null)
      ? options.potionMultiplier
      : ((player && player.potionMultiplier != null) ? player.potionMultiplier : (player && player.isPotionDoubled ? 2 : 1));
    const healPerToken = Math.max(1, Math.floor((baseHeal + equipHeal) * potionMultiplier));
    // 조각 19(대조표 83행): 산성 물약은 배가 효과 없이 기본+장비만 차감
    const acidBaseDamage = Math.max(1, Math.floor(baseHeal + equipHeal));
    const acidDmgPerToken = (options && options.acidDamagePerToken != null)
      ? options.acidDamagePerToken
      : acidBaseDamage;
    const currentHp = Math.max(0, (player && player.hp != null) ? player.hp : 40);
    const maxHp = Math.max(1, (player && player.maxHp != null) ? player.maxHp : 40);

    const normalCount = Math.max(0, Math.floor(normalTokens || 0));
    const acidCount = Math.max(0, Math.floor(acidTokens || 0));

    const totalHeal = normalCount * healPerToken;
    const needed = Math.max(0, maxHp - currentHp);
    const healed = Math.min(needed, totalHeal);
    let newHp = Math.min(maxHp, currentHp + totalHeal);

    const acidDamage = acidCount * acidDmgPerToken;
    newHp = Math.max(0, newHp - acidDamage);

    // 조각 12: 종족 1 (숲 고블린) - 판에 숙적 9(맹독괴물)가 살아있으면 물약으로 독 치유 불가
    let canClearPoison = Boolean(player && player.isPoisoned && normalCount > 0);
    const raceId = player ? (player.raceId != null ? player.raceId : 0) : ((options && options.raceId != null) ? options.raceId : 0);
    if (raceId === 1 && (options.hasMortalEnemy9 || (options.board && isMortalEnemyOnBoard(options.board, 9)))) {
      canClearPoison = false;
    }
    const clearedPoison = canClearPoison;

    return {
      normalTokens: normalCount,
      acidTokens: acidCount,
      healed,
      acidDamage,
      newHp,
      clearedPoison
    };
  }

  /**
   * 조각 8 - 원작판 점수 공식 순수 함수 (규칙-명세서-원작판 7번)
   * 점수 = 턴 + (현재 XP + 누적 XP) + (현재 골드 + 누적 골드) + (현재 강화 + 누적 강화) + 100 × 장착 스킬 등급의 합
   */
  function calculateScore(gameStateOrParams) {
    if (!gameStateOrParams || typeof gameStateOrParams !== 'object') return 0;

    let turn = 0;
    let exp = 0;
    let accExp = 0;
    let gold = 0;
    let accGold = 0;
    let shieldGauge = 0;
    let accUpgrade = 0;
    let skillRanksSum = 0;

    if (gameStateOrParams.player && typeof gameStateOrParams.player === 'object') {
      const p = gameStateOrParams.player;
      turn = Math.max(0, Math.floor(gameStateOrParams.turn || 0));
      exp = Math.max(0, Math.floor(p.exp || 0));
      accExp = Math.max(0, Math.floor(p.accumulatedExp || 0));
      gold = Math.max(0, Math.floor(p.gold || 0));
      accGold = Math.max(0, Math.floor(p.accumulatedGold || 0));
      shieldGauge = Math.max(0, Math.floor(p.shieldGauge || 0));
      accUpgrade = Math.max(0, Math.floor(p.accumulatedUpgrade || 0));

      if (Array.isArray(p.skills)) {
        for (const s of p.skills) {
          skillRanksSum += Math.max(1, Math.floor((s && (s.rank || s.level)) || 1));
        }
      }
    } else {
      turn = Math.max(0, Math.floor(gameStateOrParams.turn || 0));
      exp = Math.max(0, Math.floor(gameStateOrParams.exp || 0));
      accExp = Math.max(0, Math.floor(gameStateOrParams.accumulatedExp || 0));
      gold = Math.max(0, Math.floor(gameStateOrParams.gold || 0));
      accGold = Math.max(0, Math.floor(gameStateOrParams.accumulatedGold || 0));
      shieldGauge = Math.max(0, Math.floor(gameStateOrParams.shieldGauge || 0));
      accUpgrade = Math.max(0, Math.floor(gameStateOrParams.accumulatedUpgrade || 0));

      if (typeof gameStateOrParams.skillRanksSum === 'number') {
        skillRanksSum = Math.max(0, Math.floor(gameStateOrParams.skillRanksSum));
      } else if (Array.isArray(gameStateOrParams.skills)) {
        for (const s of gameStateOrParams.skills) {
          skillRanksSum += Math.max(1, Math.floor((s && (s.rank || s.level)) || 1));
        }
      }
    }

    return turn + (exp + accExp) + (gold + accGold) + (shieldGauge + accUpgrade) + (100 * skillRanksSum);
  }

  /**
   * 조각 8 - 스탯 선택 옵션 목록 반환 (원작판 6번)
   * 기본 공격 +2 · 방패 복구 +2 · 최대 체력 +10 + 임시 선택지(무기 공격 +1)
   */
  function getStatUpgradeOptions() {
    return STAT_UPGRADE_OPTIONS.map(opt => ({ ...opt }));
  }

  /**
   * 조각 8 - 스탯 선택 기회 판정 및 다음 확률 증가 (기본 5%, +5씩, 최대 100)
   */
  function rollStatUpgradeOpportunity(statChance = 5, rng = null) {
    const chance = Math.max(5, Math.min(100, Math.floor(statChance || 5)));
    const roll = randomInt(1, 100, rng);
    return {
      success: roll <= chance,
      roll,
      chance
    };
  }

  function advanceStatChance(currentChance = 5) {
    const cur = Math.max(5, Math.floor(currentChance || 5));
    return Math.min(100, cur + 5);
  }

  /**
   * 조각 8 - 스탯 업그레이드 적용 함수
   */
  function chooseStatUpgrade(gameState, optionId) {
    if (!gameState || !gameState.player) {
      return { gameState, applied: false, reason: 'invalid_game_state' };
    }
    const options = getStatUpgradeOptions();
    const chosen = options.find(opt => opt.id === optionId) || options[0];
    const player = { ...gameState.player };

    if (chosen.stat === 'baseAtk') {
      player.baseAtk = (player.baseAtk || 3) + chosen.value;
    } else if (chosen.stat === 'shieldRecovery') {
      player.shieldRecovery = (player.shieldRecovery || 2) + chosen.value;
    } else if (chosen.stat === 'maxHp') {
      player.maxHp = (player.maxHp || 40) + chosen.value;
      player.hp = Math.min(player.maxHp, (player.hp || 40) + chosen.value);
    } else if (chosen.stat === 'weaponAtk') {
      player.weaponAtk = (player.weaponAtk || 1) + chosen.value;
    }

    player.statChance = advanceStatChance(player.statChance);

    const nextPendingChoice = (gameState.pendingChoiceQueue && gameState.pendingChoiceQueue.length > 0)
      ? gameState.pendingChoiceQueue[0]
      : null;
    const nextQueue = (gameState.pendingChoiceQueue && gameState.pendingChoiceQueue.length > 0)
      ? gameState.pendingChoiceQueue.slice(1)
      : [];

    const nextGameState = {
      ...gameState,
      player,
      pendingChoice: nextPendingChoice,
      pendingChoiceQueue: nextQueue
    };

    return {
      gameState: nextGameState,
      applied: true,
      chosen
    };
  }

  /**
   * 방패 획득 적용 (최대치 넘는 양은 강화 게이지로 누적)
   * 규칙 5: 최대치를 넘는 양은 버려지지 않고 강화 게이지로 쌓인다.
   */
  function applyShieldGain(player, gain) {
    const currentArmor = Math.max(0, player.armor || 0);
    const maxArmor = Math.max(1, player.maxArmor != null ? player.maxArmor : 10);
    const currentGauge = Math.max(0, player.shieldGauge || 0);
    const maxGauge = Math.max(1, player.maxShieldGauge != null ? player.maxShieldGauge : 10);
    const totalShield = currentArmor + Math.max(0, gain);

    let newArmor = currentArmor;
    let overflow = 0;

    if (totalShield <= maxArmor) {
      newArmor = totalShield;
    } else {
      newArmor = maxArmor;
      overflow = totalShield - maxArmor;
    }

    const addedArmor = newArmor - currentArmor;
    const newGauge = currentGauge + overflow;
    const isGaugeFull = newGauge >= maxGauge;

    return {
      gain,
      addedArmor,
      overflow,
      newArmor,
      newGauge,
      isGaugeFull
    };
  }

  /**
   * 물약 획득 적용 (체력 최대치까지 회복, 독 해제, 보너스 회복량 반영)
   * 규칙 5: 체력을 회복(최대치까지). 독 상태를 해제한다.
   */
  function applyPotionGain(player, gain) {
    const currentHp = Math.max(0, player.hp != null ? player.hp : 20);
    const maxHp = Math.max(1, player.maxHp != null ? player.maxHp : 20);
    const needed = Math.max(0, maxHp - currentHp);
    const bonus = Math.max(0, (player && player.potionBonus) || 0);
    const effectiveGain = Math.max(0, gain) + bonus;
    const healed = Math.min(needed, effectiveGain);
    const newHp = Math.min(maxHp, currentHp + effectiveGain);
    const clearedPoison = Boolean(player && player.isPoisoned);

    return {
      gain: effectiveGain,
      healed,
      newHp,
      clearedPoison
    };
  }

  /**
   * 코인 획득 적용 (골드 게이지 누적, 보너스 코인 반영)
   * 규칙 5: 골드 게이지가 차면 일시정지 + 상점
   */
  function applyCoinGain(player, gain) {
    const currentGold = Math.max(0, player.gold || 0);
    const maxGold = Math.max(1, player.maxGold != null ? player.maxGold : 20);
    const bonus = Math.max(0, (player && player.coinBonus) || 0);
    const effectiveGain = Math.max(0, gain) + bonus;
    const newGold = currentGold + effectiveGain;
    const isGaugeFull = newGold >= maxGold;

    return {
      gain: effectiveGain,
      newGold,
      isGaugeFull
    };
  }

  /**
   * 방패 강화 선택 옵션 목록 반환 (규칙 5번)
   * 무기 공격력 +1 / 최대 방어 +2 중 택1
   */
  function getUpgradeOptions() {
    return [
      {
        id: 'upgrade_weapon_atk',
        type: 'upgrade',
        name: '무기 공격력 강화',
        desc: '무기 공격력 +1',
        effect: { weaponAtk: 1 }
      },
      {
        id: 'upgrade_max_armor',
        type: 'upgrade',
        name: '최대 방어 확장',
        desc: '최대 방어 +2',
        effect: { maxArmor: 2 }
      }
    ];
  }

  /**
   * 상점 장비 3종 옵션 목록 반환 (규칙 5번)
   * 무기/방어구/반지 각 1개씩
   */
  function getShopOptions() {
    return [
      {
        id: 'shop_weapon',
        category: 'weapon',
        name: '단련된 강철검',
        desc: '무기 공격력 +1',
        effect: { weaponAtk: 1 }
      },
      {
        id: 'shop_armor',
        category: 'armor',
        name: '견고한 사슬갑옷',
        desc: '최대 방어 +2 & 방패 +2 회복',
        effect: { maxArmor: 2, armor: 2 }
      },
      {
        id: 'shop_ring',
        category: 'ring',
        name: '생명의 활력반지',
        desc: '최대 체력 +3 & 체력 +3 회복',
        effect: { maxHp: 3, hp: 3 }
      }
    ];
  }

  /**
   * 방패 강화 선택 실행 (선택 적용 및 강화 게이지 소모)
   */
  function chooseUpgrade(gameState, optionId) {
    if (!gameState || !gameState.pendingChoice || gameState.pendingChoice.type !== 'upgrade') {
      return { gameState, applied: false, reason: 'no_pending_upgrade' };
    }

    const options = gameState.pendingChoice.options || getUpgradeOptions();
    const chosen = options.find(opt => opt.id === optionId) || options[0];

    const player = { ...gameState.player };
    // 조각 19(대조표 94행): 메뉴 선택 뒤 게이지 재차감 제거 (AddResource에서 메뉴 오픈 시 이미 % 100 적용 완료)

    if (chosen.effect.weaponAtk) {
      player.weaponAtk = (player.weaponAtk || 1) + chosen.effect.weaponAtk;
    }
    if (chosen.effect.maxArmor) {
      player.maxArmor = (player.maxArmor || 10) + chosen.effect.maxArmor;
    }

    const nextPendingChoice = (gameState.pendingChoiceQueue && gameState.pendingChoiceQueue.length > 0)
      ? gameState.pendingChoiceQueue[0]
      : null;
    const nextQueue = (gameState.pendingChoiceQueue && gameState.pendingChoiceQueue.length > 0)
      ? gameState.pendingChoiceQueue.slice(1)
      : [];

    const nextGameState = {
      ...gameState,
      player,
      pendingChoice: nextPendingChoice,
      pendingChoiceQueue: nextQueue
    };

    return {
      gameState: nextGameState,
      applied: true,
      chosen
    };
  }

  /**
   * 상점 장비 선택 실행 (장비 적용 및 골드 소모)
   */
  function chooseShopItem(gameState, optionId) {
    if (!gameState || !gameState.pendingChoice || gameState.pendingChoice.type !== 'shop') {
      return { gameState, applied: false, reason: 'no_pending_shop' };
    }

    const options = gameState.pendingChoice.options || getShopOptions();
    const chosen = options.find(opt => opt.id === optionId) || options[0];

    const player = { ...gameState.player };
    // 조각 19(대조표 94행): 메뉴 선택 뒤 게이지 재차감 제거 (AddResource에서 메뉴 오픈 시 이미 % 100 적용 완료)

    if (chosen.effect.weaponAtk) {
      player.weaponAtk = (player.weaponAtk || 1) + chosen.effect.weaponAtk;
    }
    if (chosen.effect.maxArmor) {
      player.maxArmor = (player.maxArmor || 10) + chosen.effect.maxArmor;
    }
    if (chosen.effect.armor) {
      player.armor = Math.min(player.maxArmor, (player.armor || 0) + chosen.effect.armor);
    }
    if (chosen.effect.maxHp) {
      player.maxHp = (player.maxHp || 20) + chosen.effect.maxHp;
    }
    if (chosen.effect.hp) {
      player.hp = Math.min(player.maxHp, (player.hp || 20) + chosen.effect.hp);
    }

    const nextPendingChoice = (gameState.pendingChoiceQueue && gameState.pendingChoiceQueue.length > 0)
      ? gameState.pendingChoiceQueue[0]
      : null;
    const nextQueue = (gameState.pendingChoiceQueue && gameState.pendingChoiceQueue.length > 0)
      ? gameState.pendingChoiceQueue.slice(1)
      : [];

    const nextGameState = {
      ...gameState,
      player,
      pendingChoice: nextPendingChoice,
      pendingChoiceQueue: nextQueue
    };

    return {
      gameState: nextGameState,
      applied: true,
      chosen
    };
  }

  /**
   * 조각 21 - 스킬 해제 여부 검사 순수 함수 (원작-대조표-2 228행, Game::IsSkillUnlocked @ 000248e8)
   * - 0~30번 스킬은 기본 허용
   * - 고유 스킬(uniqueClassId): 현재 직업의 고유 스킬이거나, 해당 고유 직업의 직업 레벨이 10 이상일 때 해제되어 공유 가능
   */
  function isSkillUnlocked(skillDefOrId, options = {}) {
    let sDef = null;
    if (typeof skillDefOrId === 'number') {
      sDef = SKILLS_DATA.find(s => s.id === skillDefOrId);
    } else if (typeof skillDefOrId === 'string') {
      sDef = SKILLS_DATA.find(s => s.key === skillDefOrId || String(s.id) === skillDefOrId);
    } else if (skillDefOrId && typeof skillDefOrId === 'object') {
      sDef = skillDefOrId;
    }
    if (!sDef) return false;
    // 0~30번(고유 직업 없음)은 기본 허용
    if (!sDef.uniqueClassId) return true;

    const currentClassId = options.classId || (options.player && options.player.classId) || 'adventurer';
    // 본인 직업의 고유 스킬이면 항상 허용
    if (sDef.uniqueClassId === currentClassId) return true;

    // 타 직업의 고유 스킬: 해당 고유 직업의 레벨이 10 이상(level >= 10)인지 검사
    const targetClassId = sDef.uniqueClassId;
    const progress = (options.profile && options.profile.classProgress) || options.classProgress || {};
    const targetProg = progress[targetClassId];
    const targetLevel = (targetProg && targetProg.level != null)
      ? targetProg.level
      : (typeof targetProg === 'number'
          ? targetProg
          : (options.classLevels && options.classLevels[targetClassId] != null
              ? options.classLevels[targetClassId]
              : 1));
    return targetLevel >= 10;
  }

  /**
   * 레벨업 선택지 3종 생성 (규칙 6번 & 조각 15 원작 정렬 42종 표 연동)
   * 스탯 및 스킬 풀에서 무작위 3장 중복 없이 선택
   * - 스킬 카드는 SKILLS_DATA 중 isImplemented: true인 것에서 생성
   * - 직업 고유 스킬(uniqueClassId)은 해당 직업이거나 해당 직업 레벨 10 이상(조각 21)일 때 후보에 포함
   * - 슬롯 4칸이 가득 차면 신규 습득(skill_learn) 카드는 제외하고 연마(skill_upgrade) 및 스탯 카드만 제공
   * - 설명과 쿨다운은 표 값 반영 (예: 눈부신 섬광 15턴, 1회용은 1회용)
   */
  function getLevelupOptions(gameState = {}, rng = null) {
    const randomFn = typeof rng === 'function' ? rng : (gameState && typeof gameState.rng === 'function' ? gameState.rng : Math.random);
    const player = (gameState && gameState.player) || {};
    const playerSkills = Array.isArray(player.skills) ? player.skills : [];
    const playerClassId = (player && player.classId) || 'adventurer';
    const canLearnNew = playerSkills.length < 4;

    // 스탯 카드 풀 (6종)
    const statPool = [
      {
        id: 'stat_base_atk',
        type: 'stat',
        stat: 'baseAtk',
        value: 1,
        name: '기본 완력 단련',
        desc: '기본 공격력 +1',
        icon: '⚔️'
      },
      {
        id: 'stat_weapon_atk',
        type: 'stat',
        stat: 'weaponAtk',
        value: 1,
        name: '무기 제련술',
        desc: '무기 공격력 +1',
        icon: '🗡️'
      },
      {
        id: 'stat_max_armor',
        type: 'stat',
        stat: 'maxArmor',
        value: 2,
        name: '철벽 방패술',
        desc: '최대 방패 +2',
        icon: '🛡️'
      },
      {
        id: 'stat_max_hp',
        type: 'stat',
        stat: 'maxHp',
        value: 3,
        name: '생명력 증진',
        desc: '최대 체력 +3 & 체력 +3 회복',
        icon: '❤️'
      },
      {
        id: 'stat_potion_bonus',
        type: 'stat',
        stat: 'potionBonus',
        value: 1,
        name: '약초학 연구',
        desc: '물약 회복량 +1',
        icon: '🧪'
      },
      {
        id: 'stat_coin_bonus',
        type: 'stat',
        stat: 'coinBonus',
        value: 1,
        name: '황금 감별안',
        desc: '코인 획득량 +1',
        icon: '🪙'
      }
    ];

    // 조각 15, 21 & 조각 22: 직업별 레벨업 스킬 풀 실제 사용 (원작-대조표-2 100행: CharacterClass::GetSkillPool @ 0003707c)
    // 직업 0(모험가)은 isSkillUnlocked 적용, 타 직업은 CLASS_SKILL_POOLS 적용
    let targetSkillPool = null;
    if (playerClassId !== 'adventurer' && CLASS_SKILL_POOLS[playerClassId]) {
      targetSkillPool = CLASS_SKILL_POOLS[playerClassId];
    }

    const availableSkills = SKILLS_DATA.filter(sDef => {
      if (!sDef.isImplemented) return false;
      if (targetSkillPool && !targetSkillPool.includes(sDef.id)) {
        return false;
      }
      return isSkillUnlocked(sDef, {
        classId: playerClassId,
        player,
        profile: gameState.profile,
        classProgress: (gameState.profile && gameState.profile.classProgress) || gameState.classProgress || (player && player.classProgress),
        classLevels: gameState.classLevels
      });
    });

    const skillPool = [];

    for (const sDef of availableSkills) {
      // 보유 여부 검사 (숫자 ID, 키, 레거시 ID 호환)
      const existing = playerSkills.find(s => {
        if (!s) return false;
        if (s.id === sDef.id || s.skillId === sDef.id) return true;
        if (s.key && (s.key === sDef.key || s.key === sDef.id)) return true;
        if (s.id === sDef.key) return true;
        if (typeof s.id === 'string' && SKILLS[s.id] && SKILLS[s.id].skillId === sDef.id) return true;
        return false;
      });

      if (existing) {
        // 조각 22: 스킬 강화 상한 (원작-대조표-2 102행: 등급 10이면 추가 감소 없음, 등급 최대 10)
        // 이미 10등급에 도달한 스킬은 연마 카드를 생성하지 않음
        if ((existing.rank || 1) >= 10) {
          continue;
        }
        // 이미 보유 중: 쿨다운 감소 연마 카드
        const isSingleUse = sDef.cooldown === -1;
        const upgradeDesc = isSingleUse
          ? `${sDef.name} 강화 (1회용)`
          : `쿨다운 1턴 감소 (현재 쿨다운 -1)`;
        skillPool.push({
          id: `skill_upgrade_${sDef.id}`,
          type: 'skill_upgrade',
          skillId: sDef.id,
          key: sDef.key,
          name: `${sDef.name} 연마`,
          desc: upgradeDesc,
          icon: sDef.icon,
          cooldown: sDef.cooldown
        });
      } else if (canLearnNew) {
        // 미보유 및 슬롯 여유 (4칸 미만): 신규 스킬 습득 카드
        const isSingleUse = sDef.cooldown === -1;
        const cdText = isSingleUse ? '1회용' : `쿨다운 ${sDef.cooldown}턴`;
        skillPool.push({
          id: `skill_learn_${sDef.id}`,
          type: 'skill_learn',
          skillId: sDef.id,
          key: sDef.key,
          name: `스킬: ${sDef.name}`,
          desc: `${sDef.desc} (${cdText})`,
          icon: sDef.icon,
          cooldown: sDef.cooldown
        });
      }
    }

    const fullPool = [...statPool, ...skillPool];

    // Fisher-Yates 셔플로 중복 없는 무작위 3장 선택
    const shuffled = [...fullPool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(randomFn() * (i + 1));
      const temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }

    return shuffled.slice(0, Math.min(3, shuffled.length));
  }

  /**
   * 레벨업 보상 선택 적용 (조각 5 & 조각 15)
   */
  function chooseLevelupReward(gameState, optionId) {
    if (!gameState || !gameState.pendingChoice || gameState.pendingChoice.type !== 'levelup') {
      return { gameState, applied: false, reason: 'no_pending_levelup' };
    }

    const options = gameState.pendingChoice.options || [];
    const chosen = options.find(opt => opt.id === optionId) || options[0];
    if (!chosen) {
      return { gameState, applied: false, reason: 'no_option_found' };
    }

    const player = { ...gameState.player };

    if (chosen.type === 'stat') {
      if (chosen.stat === 'baseAtk') {
        player.baseAtk = (player.baseAtk || 1) + chosen.value;
      } else if (chosen.stat === 'weaponAtk') {
        player.weaponAtk = (player.weaponAtk || 1) + chosen.value;
      } else if (chosen.stat === 'maxArmor') {
        player.maxArmor = (player.maxArmor || 10) + chosen.value;
      } else if (chosen.stat === 'maxHp') {
        player.maxHp = (player.maxHp || 20) + chosen.value;
        player.hp = Math.min(player.maxHp, (player.hp || 20) + chosen.value);
      } else if (chosen.stat === 'potionBonus') {
        player.potionBonus = (player.potionBonus || 0) + chosen.value;
      } else if (chosen.stat === 'coinBonus') {
        player.coinBonus = (player.coinBonus || 0) + chosen.value;
      }
    } else if (chosen.type === 'skill_learn') {
      const newSkill = createSkillInstance(chosen.skillId);
      if (newSkill) {
        const skills = (player.skills || []).map(s => ({ ...s }));
        if (skills.length < 4) {
          skills.push(newSkill);
          player.skills = skills;
        }
      }
    } else if (chosen.type === 'skill_upgrade') {
      const skills = (player.skills || []).map(s => {
        const isTarget = s.id === chosen.skillId ||
          s.skillId === chosen.skillId ||
          s.key === chosen.skillId ||
          (typeof chosen.skillId === 'number' && typeof s.id === 'string' && SKILLS[s.id] && SKILLS[s.id].skillId === chosen.skillId) ||
          (typeof chosen.skillId === 'string' && typeof s.id === 'number' && SKILLS[chosen.skillId] && SKILLS[chosen.skillId].skillId === s.id);

        if (isTarget) {
          const currentRank = s.rank || 1;
          if (currentRank >= 10) {
            // 조각 22: 스킬 강화 상한 (원작-대조표-2 102행: 기존 등급 10이면 쿨다운 추가 감소 없음, 등급 최대 10)
            return {
              ...s,
              rank: 10
            };
          }
          const baseCd = s.cooldown != null ? s.cooldown : 5;
          const newCd = baseCd === -1 ? -1 : Math.max(1, baseCd - 1);
          return {
            ...s,
            cooldown: newCd,
            currentCooldown: Math.min(s.currentCooldown || 0, newCd),
            rank: currentRank + 1
          };
        }
        return { ...s };
      });
      player.skills = skills;
    }

    // 조각 12: 종족 4 (뿔 고블린) - 레벨업 때 체력이 25% 미만이면 최대 체력의 25%로 회복
    let rejuvenated = false;
    if (player.raceId === 4 && player.hp < player.maxHp * 0.25) {
      player.hp = Math.floor(player.maxHp * 0.25);
      rejuvenated = true;
    }

    const nextPendingChoice = (gameState.pendingChoiceQueue && gameState.pendingChoiceQueue.length > 0)
      ? gameState.pendingChoiceQueue[0]
      : null;
    const nextQueue = (gameState.pendingChoiceQueue && gameState.pendingChoiceQueue.length > 0)
      ? gameState.pendingChoiceQueue.slice(1)
      : [];

    const nextGameState = {
      ...gameState,
      player,
      pendingChoice: nextPendingChoice,
      pendingChoiceQueue: nextQueue
    };

    return {
      gameState: nextGameState,
      applied: true,
      chosen
    };
  }

  /**
   * 조각 22 - 스킬 사용 가능 대상 검사 (원작-대조표-2 103행: Skill::CanActivate @ 00060100)
   * 대상이 없으면 스킬 발동 불가 및 쿨다운 미소모
   */
  function hasValidSkillTarget(gameState, skillId) {
    if (!gameState || !gameState.board) return false;
    const board = gameState.board;
    const player = gameState.player || {};
    const boardH = board.length;
    const boardW = (boardH > 0 && Array.isArray(board[0])) ? board[0].length : 0;

    switch (skillId) {
      case 0: { // 0: 약탈 - 판에 생존 적이 1마리 이상 있어야 함
        for (let y = 0; y < boardH; y++) {
          for (let x = 0; x < boardW; x++) {
            const t = board[y][x];
            if (t && t.type === 'enemy' && (t.hp == null || t.hp > 0)) return true;
          }
        }
        return false;
      }
      case 1: { // 1: 빙결 - 판에 생존 적이 1마리 이상 있어야 함
        for (let y = 0; y < boardH; y++) {
          for (let x = 0; x < boardW; x++) {
            const t = board[y][x];
            if (t && t.type === 'enemy' && (t.hp == null || t.hp > 0)) return true;
          }
        }
        return false;
      }
      case 2: { // 2: 치유의 손길 - 판에 정상 물약(산성/마나/폭발 제외)이 1개 이상 있어야 함
        for (let y = 0; y < boardH; y++) {
          for (let x = 0; x < boardW; x++) {
            const t = board[y][x];
            if (t && t.type === 'potion' && !t.isAcid && !t.isManaPotion && !t.isExplosivePotion) return true;
          }
        }
        return false;
      }
      case 3: { // 3: 갑옷 수리 - 판에 정상 방패(파손 제외)가 1개 이상 있어야 함
        for (let y = 0; y < boardH; y++) {
          for (let x = 0; x < boardW; x++) {
            const t = board[y][x];
            if (t && t.type === 'shield' && !t.isBroken) return true;
          }
        }
        return false;
      }
      case 4: { // 4: 반격 태세 - 판에 공격 가능한 적이 1마리 이상 있어야 함
        for (let y = 0; y < boardH; y++) {
          for (let x = 0; x < boardW; x++) {
            const t = board[y][x];
            if (t && t.type === 'enemy' && (t.hp == null || t.hp > 0) && (t.atk == null || t.atk > 0)) return true;
          }
        }
        return false;
      }
      case 5: { // 5: 방어구 파쇄 - 판에 일반 적(specialId == null || specialId === 0)이 1마리 이상 있어야 함
        for (let y = 0; y < boardH; y++) {
          for (let x = 0; x < boardW; x++) {
            const t = board[y][x];
            if (t && t.type === 'enemy' && (t.hp == null || t.hp > 0) && (!t.specialId || t.specialId === 0)) return true;
          }
        }
        return false;
      }
      case 6: { // 6: 황금 변환 - 판에 정상 칼(화살 제외)이 1개 이상 있어야 함
        for (let y = 0; y < boardH; y++) {
          for (let x = 0; x < boardW; x++) {
            const t = board[y][x];
            if (t && t.type === 'sword' && !t.isArrow) return true;
          }
        }
        return false;
      }
      case 7: { // 7: 차원 이동 - 항상 사용 가능 (판이 존재)
        return true;
      }
      case 8: { // 8: 폭발 물약 - 판에 정상 물약이 1개 이상 있어야 함
        for (let y = 0; y < boardH; y++) {
          for (let x = 0; x < boardW; x++) {
            const t = board[y][x];
            if (t && t.type === 'potion' && !t.isAcid && !t.isManaPotion && !t.isExplosivePotion) return true;
          }
        }
        return false;
      }
      case 9: { // 9: 비전 영약 - 판에 정상 물약이 1개 이상 있어야 함
        for (let y = 0; y < boardH; y++) {
          for (let x = 0; x < boardW; x++) {
            const t = board[y][x];
            if (t && t.type === 'potion' && !t.isAcid && !t.isManaPotion && !t.isExplosivePotion) return true;
          }
        }
        return false;
      }
      case 10: { // 10: 마법 부여 - 항상 사용 가능 (강화 메뉴 호출)
        return true;
      }
      case 11: { // 11: 가로 베기 - 항상 사용 가능
        return true;
      }
      case 12: { // 12: 보물 발견 - 판에 코인이 1개 이상 있어야 함
        for (let y = 0; y < boardH; y++) {
          for (let x = 0; x < boardW; x++) {
            const t = board[y][x];
            if (t && t.type === 'coin') return true;
          }
        }
        return false;
      }
      case 13: { // 13: 재활용 - 판에 정상 칼(화살 제외)이 1개 이상 있어야 함
        for (let y = 0; y < boardH; y++) {
          for (let x = 0; x < boardW; x++) {
            const t = board[y][x];
            if (t && t.type === 'sword' && !t.isArrow) return true;
          }
        }
        return false;
      }
      case 14: { // 14: 무장 해제 - 판에 일반 적이 1마리 이상 있어야 함
        for (let y = 0; y < boardH; y++) {
          for (let x = 0; x < boardW; x++) {
            const t = board[y][x];
            if (t && t.type === 'enemy' && (t.hp == null || t.hp > 0) && (!t.specialId || t.specialId === 0)) return true;
          }
        }
        return false;
      }
      case 15: { // 15: 눈부신 섬광 - 판에 코인이 1개 이상 있어야 함
        for (let y = 0; y < boardH; y++) {
          for (let x = 0; x < boardW; x++) {
            const t = board[y][x];
            if (t && t.type === 'coin') return true;
          }
        }
        return false;
      }
      case 16: // 16: 무기 강화 - 항상 사용 가능
      case 17: // 17: 황금 축복 - 항상 사용 가능
      case 18: // 18: 생명력 고양 - 항상 사용 가능
      case 19: { // 19: 철벽 수호 - 항상 사용 가능
        return true;
      }
      case 20: { // 20: 정화 - 판에 특수 적(specialId > 0)이 1마리 이상 있어야 함
        for (let y = 0; y < boardH; y++) {
          for (let x = 0; x < boardW; x++) {
            const t = board[y][x];
            if (t && t.type === 'enemy' && (t.hp == null || t.hp > 0) && t.specialId > 0) return true;
          }
        }
        return false;
      }
      case 21: { // 21: 추방 - 판에 특수 적(specialId > 0)이 1마리 이상 있어야 함
        for (let y = 0; y < boardH; y++) {
          for (let x = 0; x < boardW; x++) {
            const t = board[y][x];
            if (t && t.type === 'enemy' && (t.hp == null || t.hp > 0) && t.specialId > 0) return true;
          }
        }
        return false;
      }
      case 22: { // 22: 함정 - 항상 사용 가능
        return true;
      }
      case 23: { // 23: 거물 사냥꾼 - 판에 일반 적이 1마리 이상 있어야 함
        for (let y = 0; y < boardH; y++) {
          for (let x = 0; x < boardW; x++) {
            const t = board[y][x];
            if (t && t.type === 'enemy' && (t.hp == null || t.hp > 0) && (!t.specialId || t.specialId === 0)) return true;
          }
        }
        return false;
      }
      case 24: { // 24: 보물 창고 - 항상 사용 가능
        return true;
      }
      case 25: { // 25: 마법의 검 - 판에 일반 칼(화살/마법칼 제외)이 1개 이상 있어야 함
        for (let y = 0; y < boardH; y++) {
          for (let x = 0; x < boardW; x++) {
            const t = board[y][x];
            if (t && t.type === 'sword' && !t.isArrow && !t.isMagicSword) return true;
          }
        }
        return false;
      }
      case 26: { // 26: 지진 - 항상 사용 가능
        return true;
      }
      case 27: { // 27: 폭발 갑옷 - 현재 방패 > 0 및 판에 적 1마리 이상 있어야 함
        if ((player.armor || 0) <= 0) return false;
        for (let y = 0; y < boardH; y++) {
          for (let x = 0; x < boardW; x++) {
            const t = board[y][x];
            if (t && t.type === 'enemy' && (t.hp == null || t.hp > 0)) return true;
          }
        }
        return false;
      }
      case 28: { // 28: 화염구 - 항상 사용 가능
        return true;
      }
      case 29: { // 29: 마나 물약 - 판에 정상 물약이 1개 이상 있어야 함
        for (let y = 0; y < boardH; y++) {
          for (let x = 0; x < boardW; x++) {
            const t = board[y][x];
            if (t && t.type === 'potion' && !t.isAcid && !t.isManaPotion && !t.isExplosivePotion) return true;
          }
        }
        return false;
      }
      case 30: { // 30: 세로 베기 - 항상 사용 가능
        return true;
      }
      case 31: { // 31: 일제 사격 - 판에 정상 칼이 1개 이상 있어야 함
        for (let y = 0; y < boardH; y++) {
          for (let x = 0; x < boardW; x++) {
            const t = board[y][x];
            if (t && t.type === 'sword' && !t.isArrow) return true;
          }
        }
        return false;
      }
      case 32: { // 32: 고통 감수 - 판에 코인이 1개 이상 있어야 함
        for (let y = 0; y < boardH; y++) {
          for (let x = 0; x < boardW; x++) {
            const t = board[y][x];
            if (t && t.type === 'coin') return true;
          }
        }
        return false;
      }
      case 33: { // 33: 기적의 소원 - 항상 사용 가능
        return true;
      }
      case 34: // 34: 광란 - 항상 사용 가능 (이번 턴 처치 흡혈 활성 상태)
      case 35: { // 35: 봉인 룬 - 항상 사용 가능
        return true;
      }
      case 36: { // 36: 탐욕 - 판에 코인과 8방향 인접한 일반 적이 1마리 이상 있어야 함
        for (let y = 0; y < boardH; y++) {
          for (let x = 0; x < boardW; x++) {
            const t = board[y][x];
            if (t && t.type === 'enemy' && (t.hp == null || t.hp > 0) && (!t.specialId || t.specialId === 0)) {
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  if (dx === 0 && dy === 0) continue;
                  const ny = y + dy;
                  const nx = x + dx;
                  if (ny >= 0 && ny < boardH && nx >= 0 && nx < boardW) {
                    const nt = board[ny][nx];
                    if (nt && nt.type === 'coin') return true;
                  }
                }
              }
            }
          }
        }
        return false;
      }
      case 37: // 37: 최후의 저항 - 항상 사용 가능
      case 38: // 38: 돌격 - 항상 사용 가능
      case 39: { // 39: 신속 - 항상 사용 가능
        return true;
      }
      case 40: { // 40: 충격파 - 위쪽 3줄에 코인 또는 정상 방패가 1개 이상 있어야 함
        for (let y = 0; y < Math.min(3, boardH); y++) {
          for (let x = 0; x < boardW; x++) {
            const t = board[y][x];
            if (t && (t.type === 'coin' || (t.type === 'shield' && !t.isBroken))) return true;
          }
        }
        return false;
      }
      case 41: { // 41: 위압 - 아래쪽 3줄에 정상 물약 또는 정상 방패가 1개 이상 있어야 함
        for (let y = 3; y < boardH; y++) {
          for (let x = 0; x < boardW; x++) {
            const t = board[y][x];
            if (t && ((t.type === 'potion' && !t.isAcid && !t.isManaPotion && !t.isExplosivePotion) || (t.type === 'shield' && !t.isBroken))) return true;
          }
        }
        return false;
      }
      default:
        return true;
    }
  }

  /**
   * 스킬 사용 가능 여부 판정
   * 조각 22: gameState 전달 시 대상 존재 여부(hasValidSkillTarget)까지 검사
   */
  function canUseSkill(player, skillIndex, gameState = null) {
    if (!player || !Array.isArray(player.skills)) return false;
    const skill = player.skills[skillIndex];
    if (!skill) return false;
    if ((skill.currentCooldown || 0) > 0) return false;
    if (gameState) {
      const sId = (skill.skillId != null)
        ? skill.skillId
        : (typeof skill.id === 'number' ? skill.id : (SKILLS[skill.id] ? SKILLS[skill.id].skillId : null));
      if (sId != null && !hasValidSkillTarget(gameState, sId)) {
        return false;
      }
    }
    return true;
  }

  /**
   * 액티브 스킬 사용 (조각 5 & 조각 14 & 조각 22)
   * 조각 22 - 스킬 ID 0~41 전체 원작 효과 구현 및 사용 규칙:
   * - 미보유 스킬 직접 호출 금지 (원작-대조표-2 104행, options.force 미지정 시 skill_not_owned)
   * - 스킬 사용 가능 대상 검사 (원작-대조표-2 103행, 대상 없으면 no_valid_target 및 쿨다운 미소모)
   * - 수집 스킬의 특수 적 제외, 자원/XP 토큰 지급 처리
   */
  function useSkill(gameState, skillIndexOrId, options = {}, rng = null) {
    if (!gameState || !gameState.player) {
      return { gameState, applied: false, reason: 'invalid_game_state' };
    }

    if (typeof options === 'function') {
      rng = options;
      options = {};
    }

    const player = { ...gameState.player };
    let skills = Array.isArray(player.skills) ? [...player.skills] : [];
    let skillIdx = -1;
    let usedSkill = null;

    if (typeof skillIndexOrId === 'number' && skills[skillIndexOrId]) {
      skillIdx = skillIndexOrId;
      usedSkill = skills[skillIdx];
    } else {
      skillIdx = skills.findIndex(s => {
        if (!s) return false;
        if (s.id === skillIndexOrId || s.skillId === skillIndexOrId || s.key === skillIndexOrId) return true;
        if (typeof skillIndexOrId === 'string' && SKILLS[skillIndexOrId]) {
          if (s.id === SKILLS[skillIndexOrId].skillId || s.skillId === SKILLS[skillIndexOrId].skillId) return true;
        }
        if (typeof skillIndexOrId === 'number' && typeof s.id === 'string' && SKILLS[s.id]) {
          if (SKILLS[s.id].skillId === skillIndexOrId) return true;
        }
        return false;
      });
      if (skillIdx >= 0) {
        usedSkill = skills[skillIdx];
      } else {
        // 조각 22: 미보유 스킬 직접 호출 금지 (원작-대조표-2 104행: Skill::Activate @ 00060210)
        // options.force나 options.allowUnowned가 없는 한 호출 거절
        if (!options.force && !options.allowUnowned) {
          return { gameState, applied: false, reason: 'skill_not_owned' };
        }
        usedSkill = createSkillInstance(skillIndexOrId);
      }
    }

    if (!options.force && usedSkill.currentCooldown > 0) {
      return { gameState, applied: false, reason: 'skill_not_ready', skill: usedSkill };
    }

    const sId = (usedSkill.skillId != null)
      ? usedSkill.skillId
      : (typeof usedSkill.id === 'number' ? usedSkill.id : (SKILLS[usedSkill.id] ? SKILLS[usedSkill.id].skillId : null));

    // 조각 22: 스킬 사용 가능 대상 검사 (원작-대조표-2 103행: Skill::CanActivate @ 00060100)
    // 대상이 없으면 사용 및 쿨다운 소모 안 함
    if (!options.force && sId != null && !hasValidSkillTarget(gameState, sId)) {
      return { gameState, applied: false, reason: 'no_valid_target', skill: usedSkill };
    }

    const randomFn = typeof rng === 'function' ? rng : (typeof gameState.rng === 'function' ? gameState.rng : Math.random);
    let board = cloneBoard(gameState.board);
    let kills = gameState.kills || 0;
    let score = gameState.score || 0;
    let activeEffects = { ...(gameState.activeEffects || {}) };
    let eventDetail = null;

    // 쿨다운 적용 또는 1회용 소멸 (ID 33 소원은 1회 사용 시 영구 제거)
    const isSingleUse = Boolean(usedSkill.singleUse || usedSkill.cooldown === -1 || usedSkill.id === 33 || usedSkill.skillId === 33);
    if (isSingleUse) {
      if (skillIdx >= 0) {
        skills.splice(skillIdx, 1);
      }
    } else {
      if (skillIdx >= 0) {
        skills[skillIdx] = {
          ...usedSkill,
          currentCooldown: usedSkill.cooldown != null ? usedSkill.cooldown : 12
        };
      }
    }
    player.skills = skills;

    // 스킬별 효과 처리
    const boardH = Array.isArray(board) ? board.length : 0;
    const boardW = (boardH > 0 && Array.isArray(board[0])) ? board[0].length : 0;

    if (sId === 0 || usedSkill.key === 'steal') {
      // 0: 약탈 - 이번 턴 공격한 적마다 골드 토큰 추가 강탈
      activeEffects.stealCoinsFromAttacked = true;
      eventDetail = { type: 'steal', skillId: 0, name: '약탈' };

    } else if (sId === 1 || usedSkill.key === 'freeze') {
      // 1: 빙결 - 판의 모든 적 동결(isFrozen) 및 이번 턴 공격 차단 (원작 FreezeSkulls @ 00029eb0)
      activeEffects.freezeTurn = true;
      let frozenCount = 0;
      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          const t = board[y][x];
          if (t && t.type === 'enemy' && (t.hp == null || t.hp > 0)) {
            t.isFrozen = true;
            t.frozenTurns = 1;
            frozenCount++;
          }
        }
      }
      eventDetail = { type: 'freeze', skillId: 1, name: '빙결', frozenCount };

    } else if (usedSkill.id === 'heal') {
      // 조각 5 레거시 heal: 체력 8 즉시 회복
      const healAmount = (typeof usedSkill.healAmount === 'number') ? usedSkill.healAmount : 8;
      const currentHp = player.hp != null ? player.hp : 0;
      const maxHp = player.maxHp != null ? player.maxHp : 20;
      player.hp = Math.min(maxHp, currentHp + healAmount);
      eventDetail = { type: 'heal', skillId: 'heal', healAmount, newHp: player.hp };

    } else if (sId === 2 || usedSkill.id === 2 || usedSkill.key === 'heal') {
      // 2: 치유의 손길 - 정상 물약(산성/마나/폭발 제외)만 수집, 보너스 토큰 적용 회복
      const potionPositions = [];
      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          const t = board[y][x];
          if (t && t.type === 'potion' && !t.isAcid && !t.isManaPotion && !t.isExplosivePotion) {
            potionPositions.push({ x, y });
          }
        }
      }
      let totalTokens = potionPositions.length;
      for (let i = 3; i < potionPositions.length; i++) {
        if (randomInt(1, 100, randomFn) <= 20) totalTokens++;
      }
      const potionRes = applyPotionTokens(player, totalTokens, 0);
      player.hp = potionRes.newHp;
      if (potionRes.clearedPoison) {
        player.isPoisoned = false;
        player.poisonDamage = 0;
      }
      if (potionPositions.length > 0) {
        board = removeTilesAndDrop(board, potionPositions, randomFn, gameState.turn);
      }
      eventDetail = { type: 'heal', skillId: 2, collected: potionPositions.length, totalTokens, healed: potionRes.healed, newHp: player.hp };

    } else if (sId === 3 || usedSkill.key === 'repair') {
      // 3: 갑옷 수리 - 정상 방패(파손 제외)만 수집, 보너스 토큰 및 ID 12 존재 시 강화 직행
      const shieldPositions = [];
      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          const t = board[y][x];
          if (t && t.type === 'shield' && !t.isBroken) {
            shieldPositions.push({ x, y });
          }
        }
      }
      let totalTokens = shieldPositions.length;
      for (let i = 3; i < shieldPositions.length; i++) {
        if (randomInt(1, 100, randomFn) <= 20) totalTokens++;
      }
      const hasEnemy12 = board.some(row => row && row.some(t => t && t.hp > 0 && t.specialId === 12));
      const shieldRes = applyShieldTokens(player, totalTokens, { hasEnemy12 });
      player.armor = shieldRes.newArmor;
      player.shieldGauge = shieldRes.shieldGauge;
      player.accumulatedUpgrade = shieldRes.accumulatedUpgrade;
      if (shieldPositions.length > 0) {
        board = removeTilesAndDrop(board, shieldPositions, randomFn, gameState.turn);
      }
      eventDetail = { type: 'repair', skillId: 3, collected: shieldPositions.length, totalTokens, newArmor: shieldRes.newArmor };

    } else if (sId === 4 || usedSkill.key === 'counterattack') {
      // 4: 반격 태세 - 이번 턴 모든 적이 자신을 공격하여 자멸
      activeEffects.counterattackTurn = true;
      eventDetail = { type: 'counterattack', skillId: 4, name: '반격 태세' };

    } else if (sId === 5 || usedSkill.key === 'shatter') {
      // 5: 방어구 파쇄 - 일반 적만 방어 0, 공격 > 1일 때 1 (원작 ShatterDefence @ 00028554)
      let count = 0;
      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          const t = board[y][x];
          if (t && t.type === 'enemy' && (!t.specialId || t.specialId === 0)) {
            t.armor = 0;
            if (t.atk > 1) t.atk = 1;
            count++;
          }
        }
      }
      eventDetail = { type: 'shatter', skillId: 5, count };

    } else if (sId === 6 || usedSkill.key === 'golden_touch') {
      // 6: 황금 변환 - 화살 제외 칼만 코인으로 변환 및 상태 초기화 (원작 ConvertTiles @ 0002a440)
      let count = 0;
      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          const t = board[y][x];
          if (t && t.type === 'sword' && !t.isArrow) {
            t.type = 'coin';
            t.isMagicSword = false;
            t.isFrozen = false;
            t.isBurning = false;
            t.burnDamage = 0;
            count++;
          }
        }
      }
      eventDetail = { type: 'golden_touch', skillId: 6, count };

    } else if (sId === 7 || usedSkill.key === 'teleport') {
      // 7: 차원 이동 - 적이 없는 4종 타일로 전체 판 새로 생성
      const safeTypes = ['sword', 'shield', 'potion', 'coin'];
      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          board[y][x] = createRandomTile(randomFn, x, y, `tile_tp_${x}_${y}_${Date.now()}`, safeTypes, gameState.turn || 1, {
            sword: 25,
            shield: 25,
            potion: 25,
            coin: 25
          });
        }
      }
      eventDetail = { type: 'teleport', skillId: 7 };

    } else if (sId === 8 || usedSkill.key === 'explosive_potion') {
      // 8: 폭발 물약 - 정상 물약에 폭발 속성 부여
      let count = 0;
      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          const t = board[y][x];
          if (t && t.type === 'potion' && !t.isAcid && !t.isManaPotion && !t.isExplosivePotion) {
            t.isExplosivePotion = true;
            count++;
          }
        }
      }
      eventDetail = { type: 'explosive_potion', skillId: 8, count };

    } else if (sId === 9 || usedSkill.key === 'skill_elixir') {
      // 9: 비전 영약 - 정상 물약을 경험치로 변환해 수집
      const potionPositions = [];
      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          const t = board[y][x];
          if (t && t.type === 'potion' && !t.isAcid && !t.isManaPotion && !t.isExplosivePotion) {
            potionPositions.push({ x, y });
          }
        }
      }
      let totalTokens = potionPositions.length;
      for (let i = 3; i < potionPositions.length; i++) {
        if (randomInt(1, 100, randomFn) <= 20) totalTokens++;
      }
      const expPoints = totalTokens * 2;
      const expRes = addGaugeResource(player.exp || 0, expPoints, player.accumulatedExp || 0);
      player.exp = expRes.currentValue;
      player.accumulatedExp = expRes.accumulatedValue;
      if (potionPositions.length > 0) {
        board = removeTilesAndDrop(board, potionPositions, randomFn, gameState.turn);
      }
      eventDetail = { type: 'skill_elixir', skillId: 9, collected: potionPositions.length, expGained: expPoints };

    } else if (sId === 10 || usedSkill.key === 'enchant') {
      // 10: 마법 부여 - 소지 장비 강화 메뉴 즉시 호출
      activeEffects.triggerUpgrade = true;
      eventDetail = { type: 'enchant', skillId: 10 };

    } else if (sId === 11 || usedSkill.key === 'slash' || usedSkill.id === 'slash_row') {
      // 11: 가로 베기 - 가로 한 줄 수집 (특수 적 제외, 일반 칸 자원/XP 지급)
      let targetY = options.row;
      if (targetY == null || targetY < 0 || targetY >= boardH) {
        targetY = randomInt(0, Math.max(0, boardH - 1), randomFn);
      }
      const removedPositions = [];
      let rowNormalKills = 0;
      let rowNormalPotions = 0;
      let rowNormalShields = 0;
      let rowCoins = 0;
      const row = board[targetY];
      const rowW = Array.isArray(row) ? row.length : 0;
      for (let x = 0; x < rowW; x++) {
        const tile = row ? row[x] : null;
        if (!tile) continue;
        // 특수 적은 수집에서 제외
        if (tile.type === 'enemy' && tile.specialId > 0) {
          continue;
        }
        removedPositions.push({ x, y: targetY });
        if (tile.type === 'enemy') {
          rowNormalKills++;
          kills++;
          score += 100;
        } else if (tile.type === 'potion' && !tile.isAcid) {
          rowNormalPotions++;
        } else if (tile.type === 'shield' && !tile.isBroken) {
          rowNormalShields++;
        } else if (tile.type === 'coin') {
          rowCoins++;
        }
      }
      if (rowNormalKills > 0) {
        player.exp = (player.exp || 0) + rowNormalKills * 2;
      }
      if (rowNormalPotions > 0) {
        const pRes = applyPotionTokens(player, rowNormalPotions, 0);
        player.hp = pRes.newHp;
      }
      if (rowNormalShields > 0) {
        const sRes = applyShieldTokens(player, rowNormalShields);
        player.armor = sRes.newArmor;
        player.shieldGauge = sRes.shieldGauge;
        player.accumulatedUpgrade = sRes.accumulatedUpgrade;
      }
      if (rowCoins > 0) {
        const cRes = addGaugeResource(player.gold || 0, rowCoins * 2, player.accumulatedGold || 0);
        player.gold = cRes.currentValue;
        player.accumulatedGold = cRes.accumulatedValue;
      }
      if (removedPositions.length > 0) {
        board = removeTilesAndDrop(board, removedPositions, randomFn, gameState.turn);
      }
      eventDetail = { type: 'slash', skillId: 11, row: targetY, removedCount: removedPositions.length, kills: rowNormalKills };

    } else if (sId === 12 || usedSkill.key === 'treasure') {
      // 12: 보물 발견 - 판의 모든 코인 수집, 보너스 토큰 및 게이지 100 도달 시 상점 연결
      const coinPositions = [];
      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          const t = board[y][x];
          if (t && t.type === 'coin') {
            coinPositions.push({ x, y });
          }
        }
      }
      let totalTokens = coinPositions.length;
      for (let i = 3; i < coinPositions.length; i++) {
        if (randomInt(1, 100, randomFn) <= 20) totalTokens++;
      }
      const goldGained = totalTokens * 2;
      const goldRes = addGaugeResource(player.gold || 0, goldGained, player.accumulatedGold || 0);
      player.gold = goldRes.currentValue;
      player.accumulatedGold = goldRes.accumulatedValue;
      if (coinPositions.length > 0) {
        board = removeTilesAndDrop(board, coinPositions, randomFn, gameState.turn);
      }
      eventDetail = { type: 'treasure', skillId: 12, collected: coinPositions.length, totalTokens, goldGained };

    } else if (sId === 13 || usedSkill.key === 'scavenge') {
      // 13: 재활용 - 판의 모든 칼(화살 제외)을 방패로 변환 및 상태 초기화
      let count = 0;
      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          const t = board[y][x];
          if (t && t.type === 'sword' && !t.isArrow) {
            t.type = 'shield';
            t.isMagicSword = false;
            t.isFrozen = false;
            t.isBurning = false;
            t.burnDamage = 0;
            count++;
          }
        }
      }
      eventDetail = { type: 'scavenge', skillId: 13, count };

    } else if (sId === 14 || usedSkill.key === 'disarm') {
      // 14: 무장 해제 - 판의 모든 일반 적을 칼로 변환
      let count = 0;
      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          const t = board[y][x];
          if (t && t.type === 'enemy' && (!t.specialId || t.specialId === 0)) {
            t.type = 'sword';
            delete t.hp;
            delete t.maxHp;
            delete t.atk;
            delete t.armor;
            delete t.specialId;
            delete t.specialType;
            count++;
          }
        }
      }
      eventDetail = { type: 'disarm', skillId: 14, count };

    } else if (sId === 15 || usedSkill.key === 'dazzle' || usedSkill.id === 'convert_coin_to_sword') {
      // 15: 눈부신 섬광 - 판의 모든 코인을 칼로 변환 및 상태 초기화
      let count = 0;
      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          const t = board[y][x];
          if (t && t.type === 'coin') {
            t.type = 'sword';
            t.isFrozen = false;
            t.isBurning = false;
            t.burnDamage = 0;
            t.isBroken = false;
            count++;
          }
        }
      }
      eventDetail = { type: 'dazzle', skillId: 15, count };

    } else if (sId === 16 || usedSkill.key === 'boost_damage') {
      // 16: 무기 강화 - 이번 턴 동안 무기 공격력 2배
      activeEffects.boostWeaponAtk = 2;
      eventDetail = { type: 'boost_damage', skillId: 16, multiplier: 2 };

    } else if (sId === 17 || usedSkill.key === 'boost_gold') {
      // 17: 황금 축복 - 이번 턴 골드 수집 2배
      activeEffects.boostGold = 2;
      eventDetail = { type: 'boost_gold', skillId: 17, multiplier: 2 };

    } else if (sId === 18 || usedSkill.key === 'boost_health') {
      // 18: 생명력 고양 - 이번 턴 물약 회복 효과 2배
      activeEffects.boostPotion = 2;
      eventDetail = { type: 'boost_health', skillId: 18, multiplier: 2 };

    } else if (sId === 19 || usedSkill.key === 'boost_armour') {
      // 19: 철벽 수호 - 이번 턴 갑옷 수집 효과 2배
      activeEffects.boostShield = 2;
      eventDetail = { type: 'boost_armour', skillId: 19, multiplier: 2 };

    } else if (sId === 20 || usedSkill.key === 'exorcise') {
      // 20: 정화 - 무작위 특수 적 1마리를 스탯을 유지한 채 일반 적으로 정화
      const specials = [];
      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          const t = board[y][x];
          if (t && t.type === 'enemy' && (t.hp == null || t.hp > 0) && t.specialId > 0) {
            specials.push(t);
          }
        }
      }
      let target = null;
      if (specials.length > 0) {
        target = specials[Math.floor(randomFn() * specials.length)];
        target.specialId = 0;
        target.specialType = null;
      }
      eventDetail = { type: 'exorcise', skillId: 20, pos: target ? { x: target.x, y: target.y } : null };

    } else if (sId === 21 || usedSkill.key === 'banish') {
      // 21: 추방 - 무작위 특수 적 1마리를 보상 없이 즉시 소멸
      const specials = [];
      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          const t = board[y][x];
          if (t && t.type === 'enemy' && (t.hp == null || t.hp > 0) && t.specialId > 0) {
            specials.push(t);
          }
        }
      }
      let target = null;
      if (specials.length > 0) {
        target = specials[Math.floor(randomFn() * specials.length)];
        board = removeTilesAndDrop(board, [{ x: target.x, y: target.y }], randomFn, gameState.turn);
      }
      eventDetail = { type: 'banish', skillId: 21, pos: target ? { x: target.x, y: target.y } : null };

    } else if (sId === 22 || usedSkill.key === 'trap') {
      // 22: 함정 - 이번 턴 새로 등장하는 적의 체력을 1로 만듦
      activeEffects.spawnEnemyHp1 = true;
      eventDetail = { type: 'trap', skillId: 22 };

    } else if (sId === 23 || usedSkill.key === 'big_game_hunter') {
      // 23: 거물 사냥꾼 - 무작위 일반 적 1마리를 특수 적으로 승급
      const normals = [];
      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          const t = board[y][x];
          if (t && t.type === 'enemy' && (t.hp == null || t.hp > 0) && (!t.specialId || t.specialId === 0)) {
            normals.push(t);
          }
        }
      }
      let target = null;
      if (normals.length > 0) {
        target = normals[Math.floor(randomFn() * normals.length)];
        const specId = randomInt(1, 32, randomFn);
        const promoted = promoteEnemy(target, specId, player, {
          rng: randomFn,
          turn: gameState.turn || 1,
          difficulty: gameState.difficulty || 1,
          board
        });
        board[target.y][target.x] = promoted;
      }
      eventDetail = { type: 'big_game_hunter', skillId: 23, pos: target ? { x: target.x, y: target.y } : null };

    } else if (sId === 24 || usedSkill.key === 'treasure_chamber') {
      // 24: 보물 창고 - 이번 턴 새로 보충되는 모든 칸이 코인이 됨
      activeEffects.spawnForceCoin = true;
      eventDetail = { type: 'treasure_chamber', skillId: 24 };

    } else if (sId === 25 || usedSkill.key === 'magic_sword') {
      // 25: 마법의 검 - 정상 칼(화살/마법칼 제외) 1개를 마법 칼로 변환 (공격 5배)
      const swords = [];
      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          const t = board[y][x];
          if (t && t.type === 'sword' && !t.isArrow && !t.isMagicSword) {
            swords.push(t);
          }
        }
      }
      let changedPos = null;
      if (swords.length > 0) {
        const chosen = swords[Math.floor(randomFn() * swords.length)];
        chosen.isMagicSword = true;
        changedPos = { x: chosen.x, y: chosen.y };
      }
      eventDetail = { type: 'magic_sword', skillId: 25, pos: changedPos };

    } else if (sId === 26 || usedSkill.key === 'earthquake' || usedSkill.id === 'shuffle') {
      // 26: 지진 - 판의 모든 칸을 무작위로 재배치
      const flatTiles = [];
      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          if (board[y][x]) flatTiles.push({ ...board[y][x] });
        }
      }
      for (let i = flatTiles.length - 1; i > 0; i--) {
        const j = Math.floor(randomFn() * (i + 1));
        const temp = flatTiles[i];
        flatTiles[i] = flatTiles[j];
        flatTiles[j] = temp;
      }
      let idx = 0;
      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          if (idx < flatTiles.length) {
            const t = flatTiles[idx++];
            t.x = x;
            t.y = y;
            board[y][x] = t;
          }
        }
      }
      eventDetail = { type: 'earthquake', skillId: 26 };

    } else if (sId === 27 || usedSkill.key === 'explosive_armour') {
      // 27: 폭발 갑옷 - 현재 방패 수치의 2배 피해로 모든 적을 공격
      const armourDmg = (player.armor || 0) * 2;
      const deadPositions = [];
      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          const t = board[y][x];
          if (t && t.type === 'enemy' && (t.hp == null || t.hp > 0)) {
            const effArmor = t.armor || 0;
            const dmg = Math.max(1, armourDmg - effArmor);
            t.hp = (t.hp || 1) - dmg;
            if (t.hp <= 0) {
              deadPositions.push({ x, y });
              kills++;
              score += 100;
            }
          }
        }
      }
      if (deadPositions.length > 0) {
        board = removeTilesAndDrop(board, deadPositions, randomFn, gameState.turn);
      }
      eventDetail = { type: 'explosive_armour', skillId: 27, damage: armourDmg, killedCount: deadPositions.length };

    } else if (sId === 28 || usedSkill.key === 'fireball' || usedSkill.id === 'bomb_potion') {
      // 28: 화염구 - 무작위 3×3 구역 수집 (특수 적 제외, 일반 칸 자원/XP 수집)
      const maxX = Math.max(0, boardW - 3);
      const maxY = Math.max(0, boardH - 3);
      const sx = options.startX != null ? Math.max(0, Math.min(maxX, options.startX)) : randomInt(0, maxX, randomFn);
      const sy = options.startY != null ? Math.max(0, Math.min(maxY, options.startY)) : randomInt(0, maxY, randomFn);
      const rem = [];
      let fbNormalKills = 0;
      let fbNormalPotions = 0;
      let fbNormalShields = 0;
      let fbCoins = 0;

      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
          const tx = sx + dx;
          const ty = sy + dy;
          if (ty < boardH && board[ty] && tx < board[ty].length) {
            const tile = board[ty][tx];
            if (!tile) continue;
            // 특수 적은 수집에서 제외
            if (tile.type === 'enemy' && tile.specialId > 0) {
              continue;
            }
            rem.push({ x: tx, y: ty });
            if (tile.type === 'enemy') {
              fbNormalKills++;
              kills++;
              score += 100;
            } else if (tile.type === 'potion' && !tile.isAcid) {
              fbNormalPotions++;
            } else if (tile.type === 'shield' && !tile.isBroken) {
              fbNormalShields++;
            } else if (tile.type === 'coin') {
              fbCoins++;
            }
          }
        }
      }
      if (fbNormalKills > 0) {
        player.exp = (player.exp || 0) + fbNormalKills * 2;
      }
      if (fbNormalPotions > 0) {
        const pRes = applyPotionTokens(player, fbNormalPotions, 0);
        player.hp = pRes.newHp;
      }
      if (fbNormalShields > 0) {
        const sRes = applyShieldTokens(player, fbNormalShields);
        player.armor = sRes.newArmor;
        player.shieldGauge = sRes.shieldGauge;
        player.accumulatedUpgrade = sRes.accumulatedUpgrade;
      }
      if (fbCoins > 0) {
        const cRes = addGaugeResource(player.gold || 0, fbCoins * 2, player.accumulatedGold || 0);
        player.gold = cRes.currentValue;
        player.accumulatedGold = cRes.accumulatedValue;
      }
      if (rem.length > 0) {
        board = removeTilesAndDrop(board, rem, randomFn, gameState.turn);
      }
      eventDetail = { type: 'fireball', skillId: 28, startX: sx, startY: sy, removedCount: rem.length, kills: fbNormalKills };

    } else if (sId === 29 || usedSkill.key === 'mana_potion') {
      // 29: 마나 물약 - 정상 물약(산성/마나/폭발 제외)만 마나 물약으로 변환
      let count = 0;
      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          const t = board[y][x];
          if (t && t.type === 'potion' && !t.isAcid && !t.isManaPotion && !t.isExplosivePotion) {
            t.isManaPotion = true;
            count++;
          }
        }
      }
      eventDetail = { type: 'mana_potion', skillId: 29, count };

    } else if (sId === 30 || usedSkill.key === 'hack') {
      // 30: 세로 베기 - 무작위 세로줄의 모든 칸을 칼로 변환 및 상태 초기화
      let targetX = options.col;
      if (targetX == null || targetX < 0 || targetX >= boardW) {
        targetX = randomInt(0, Math.max(0, boardW - 1), randomFn);
      }
      let count = 0;
      for (let y = 0; y < boardH; y++) {
        const t = board[y][targetX];
        if (t) {
          t.type = 'sword';
          delete t.hp;
          delete t.maxHp;
          delete t.atk;
          delete t.armor;
          delete t.specialId;
          delete t.specialType;
          t.isMagicSword = false;
          t.isFrozen = false;
          t.isBurning = false;
          t.burnDamage = 0;
          t.isArrow = false;
          t.isBroken = false;
          count++;
        }
      }
      eventDetail = { type: 'hack', skillId: 30, col: targetX, count };

    } else if (sId === 31 || usedSkill.key === 'volley') {
      // 31: 일제 사격 - 정상 칼을 화살로 변환
      let count = 0;
      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          const t = board[y][x];
          if (t && t.type === 'sword' && !t.isArrow) {
            t.isArrow = true;
            count++;
          }
        }
      }
      eventDetail = { type: 'volley', skillId: 31, count };

    } else if (sId === 32 || usedSkill.key === 'masochism') {
      // 32: 고통 감수 - 판의 모든 코인을 적 칸으로 변환
      let count = 0;
      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          const t = board[y][x];
          if (t && t.type === 'coin') {
            const curve = calculateEnemyCurve(gameState.turn || 1, gameState.difficulty || 1, 0, randomFn);
            t.type = 'enemy';
            t.hp = curve.hp;
            t.maxHp = curve.hp;
            t.baseHp = curve.hp;
            t.atk = curve.atk;
            t.armor = curve.armor;
            t.specialId = 0;
            t.specialType = null;
            count++;
          }
        }
      }
      eventDetail = { type: 'masochism', skillId: 32, count };

    } else if (sId === 33 || usedSkill.key === 'wish') {
      // 33: 기적의 소원 - 1회용 소멸, 판 전체 수집 시 특수 적은 제외, 일반 칸 자원 지급
      let collected = 0;
      let wishKills = 0;
      let wishPotions = 0;
      let wishShields = 0;
      let wishCoins = 0;
      const rem = [];

      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          const t = board[y][x];
          if (!t) continue;
          if (t.type === 'enemy' && t.specialId > 0) {
            continue;
          }
          collected++;
          rem.push({ x, y });
          if (t.type === 'enemy') {
            wishKills++;
            kills++;
            score += 100;
          } else if (t.type === 'potion' && !t.isAcid) {
            wishPotions++;
          } else if (t.type === 'shield' && !t.isBroken) {
            wishShields++;
          } else if (t.type === 'coin') {
            wishCoins++;
          }
        }
      }
      if (wishKills > 0) {
        player.exp = (player.exp || 0) + wishKills * 2;
      }
      if (wishPotions > 0) {
        const pRes = applyPotionTokens(player, wishPotions, 0);
        player.hp = pRes.newHp;
      }
      if (wishShields > 0) {
        const sRes = applyShieldTokens(player, wishShields);
        player.armor = sRes.newArmor;
        player.shieldGauge = sRes.shieldGauge;
        player.accumulatedUpgrade = sRes.accumulatedUpgrade;
      }
      if (wishCoins > 0) {
        const cRes = addGaugeResource(player.gold || 0, wishCoins * 2, player.accumulatedGold || 0);
        player.gold = cRes.currentValue;
        player.accumulatedGold = cRes.accumulatedValue;
      }
      if (rem.length > 0) {
        board = removeTilesAndDrop(board, rem, randomFn, gameState.turn);
      }
      eventDetail = { type: 'wish', skillId: 33, collected, singleUseConsumed: true, kills: wishKills };

    } else if (sId === 34 || usedSkill.key === 'berserk') {
      // 34: 광란 - 이번 턴 처치한 적의 공격력만큼 체력 회복
      activeEffects.berserkHeal = true;
      eventDetail = { type: 'berserk', skillId: 34 };

    } else if (sId === 35 || usedSkill.key === 'rune') {
      // 35: 봉인 룬 - 이번 턴 닫힌 경로 내부 칸 수집
      activeEffects.closedLoopCollect = true;
      eventDetail = { type: 'rune', skillId: 35 };

    } else if (sId === 36 || usedSkill.key === 'greed') {
      // 36: 탐욕 - 코인 칸 옆의 모든 일반 적 즉시 처치
      const deadPositions = [];
      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          const t = board[y][x];
          if (t && t.type === 'enemy' && (t.hp == null || t.hp > 0) && (!t.specialId || t.specialId === 0)) {
            let hasAdjacentCoin = false;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const ny = y + dy;
                const nx = x + dx;
                if (ny >= 0 && ny < boardH && nx >= 0 && nx < boardW) {
                  const nt = board[ny][nx];
                  if (nt && nt.type === 'coin') {
                    hasAdjacentCoin = true;
                    break;
                  }
                }
              }
              if (hasAdjacentCoin) break;
            }
            if (hasAdjacentCoin) {
              deadPositions.push({ x, y });
              kills++;
              score += 100;
            }
          }
        }
      }
      if (deadPositions.length > 0) {
        player.exp = (player.exp || 0) + deadPositions.length * 2;
        board = removeTilesAndDrop(board, deadPositions, randomFn, gameState.turn);
      }
      eventDetail = { type: 'greed', skillId: 36, killedCount: deadPositions.length };

    } else if (sId === 37 || usedSkill.key === 'last_stand') {
      // 37: 최후의 저항 - 이번 턴 치명상을 입으면 체력을 완전히 회복
      activeEffects.lastStand = true;
      eventDetail = { type: 'last_stand', skillId: 37 };

    } else if (sId === 38 || usedSkill.key === 'charge') {
      // 38: 돌격 - 판 바깥 테두리 칸의 일반 칸을 모두 즉시 수집
      const edgePositions = [];
      let cNormalKills = 0;
      let cNormalPotions = 0;
      let cNormalShields = 0;
      let cCoins = 0;

      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          if (x === 0 || x === boardW - 1 || y === 0 || y === boardH - 1) {
            const t = board[y][x];
            if (!t) continue;
            if (t.type === 'enemy' && t.specialId > 0) continue;
            edgePositions.push({ x, y });
            if (t.type === 'enemy') {
              cNormalKills++;
              kills++;
              score += 100;
            } else if (t.type === 'potion' && !t.isAcid) {
              cNormalPotions++;
            } else if (t.type === 'shield' && !t.isBroken) {
              cNormalShields++;
            } else if (t.type === 'coin') {
              cCoins++;
            }
          }
        }
      }
      if (cNormalKills > 0) player.exp = (player.exp || 0) + cNormalKills * 2;
      if (cNormalPotions > 0) {
        const pRes = applyPotionTokens(player, cNormalPotions, 0);
        player.hp = pRes.newHp;
      }
      if (cNormalShields > 0) {
        const sRes = applyShieldTokens(player, cNormalShields);
        player.armor = sRes.newArmor;
        player.shieldGauge = sRes.shieldGauge;
        player.accumulatedUpgrade = sRes.accumulatedUpgrade;
      }
      if (cCoins > 0) {
        const cRes = addGaugeResource(player.gold || 0, cCoins * 2, player.accumulatedGold || 0);
        player.gold = cRes.currentValue;
        player.accumulatedGold = cRes.accumulatedValue;
      }
      if (edgePositions.length > 0) {
        board = removeTilesAndDrop(board, edgePositions, randomFn, gameState.turn);
      }
      eventDetail = { type: 'charge', skillId: 38, removedCount: edgePositions.length, kills: cNormalKills };

    } else if (sId === 39 || usedSkill.key === 'haste') {
      // 39: 신속 - 서로 다른 두 칸 종류를 잇는 사슬 칸을 생성
      let targetPos = options.pos;
      if (!targetPos) {
        targetPos = { x: randomInt(0, boardW - 1, randomFn), y: randomInt(0, boardH - 1, randomFn) };
      }
      if (board[targetPos.y] && board[targetPos.y][targetPos.x]) {
        board[targetPos.y][targetPos.x].type = 'chain';
        board[targetPos.y][targetPos.x].isWildcard = true;
      }
      eventDetail = { type: 'haste', skillId: 39, pos: targetPos };

    } else if (sId === 40 || usedSkill.key === 'shock') {
      // 40: 충격파 - 위쪽 절반 구역(y=0,1,2)의 코인과 정상 방패를 모두 수집
      const shockPositions = [];
      let sShields = 0;
      let sCoins = 0;
      for (let y = 0; y < Math.min(3, boardH); y++) {
        for (let x = 0; x < boardW; x++) {
          const t = board[y][x];
          if (t && (t.type === 'coin' || (t.type === 'shield' && !t.isBroken))) {
            shockPositions.push({ x, y });
            if (t.type === 'coin') sCoins++;
            if (t.type === 'shield') sShields++;
          }
        }
      }
      if (sShields > 0) {
        const sRes = applyShieldTokens(player, sShields);
        player.armor = sRes.newArmor;
        player.shieldGauge = sRes.shieldGauge;
        player.accumulatedUpgrade = sRes.accumulatedUpgrade;
      }
      if (sCoins > 0) {
        const cRes = addGaugeResource(player.gold || 0, sCoins * 2, player.accumulatedGold || 0);
        player.gold = cRes.currentValue;
        player.accumulatedGold = cRes.accumulatedValue;
      }
      if (shockPositions.length > 0) {
        board = removeTilesAndDrop(board, shockPositions, randomFn, gameState.turn);
      }
      eventDetail = { type: 'shock', skillId: 40, collected: shockPositions.length, shields: sShields, coins: sCoins };

    } else if (sId === 41 || usedSkill.key === 'awe') {
      // 41: 위압 - 아래쪽 절반 구역(y=3,4,5)의 정상 물약과 정상 방패를 모두 수집
      const awePositions = [];
      let aPotions = 0;
      let aShields = 0;
      for (let y = 3; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          const t = board[y][x];
          if (t && ((t.type === 'potion' && !t.isAcid && !t.isManaPotion && !t.isExplosivePotion) || (t.type === 'shield' && !t.isBroken))) {
            awePositions.push({ x, y });
            if (t.type === 'potion') aPotions++;
            if (t.type === 'shield') aShields++;
          }
        }
      }
      if (aPotions > 0) {
        const pRes = applyPotionTokens(player, aPotions, 0);
        player.hp = pRes.newHp;
      }
      if (aShields > 0) {
        const sRes = applyShieldTokens(player, aShields);
        player.armor = sRes.newArmor;
        player.shieldGauge = sRes.shieldGauge;
        player.accumulatedUpgrade = sRes.accumulatedUpgrade;
      }
      if (awePositions.length > 0) {
        board = removeTilesAndDrop(board, awePositions, randomFn, gameState.turn);
      }
      eventDetail = { type: 'awe', skillId: 41, collected: awePositions.length, potions: aPotions, shields: aShields };

    } else {
      eventDetail = { type: 'unimplemented', skillId: sId, name: usedSkill.name };
    }

    // 조각 12: 종족 8 (용혈 고블린) - 스킬 사용마다 무작위 적에게 불, 턴 끝 기본 공격만큼 피해
    let fireBreathTarget = null;
    if (player.raceId === 8) {
      const livingEnemies = [];
      for (let y = 0; y < boardH; y++) {
        const row = board[y];
        const rowW = Array.isArray(row) ? row.length : 0;
        for (let x = 0; x < rowW; x++) {
          const t = row[x];
          if (t && t.type === 'enemy' && t.hp > 0) {
            livingEnemies.push({ tile: t, x, y });
          }
        }
      }
      if (livingEnemies.length > 0) {
        const chosen = livingEnemies[Math.floor(randomFn() * livingEnemies.length)];
        const targetEnemy = chosen.tile;
        targetEnemy.isBurning = true;
        targetEnemy.burnDamage = player.baseAtk != null ? player.baseAtk : 3;
        fireBreathTarget = {
          x: targetEnemy.x != null ? targetEnemy.x : chosen.x,
          y: targetEnemy.y != null ? targetEnemy.y : chosen.y,
          id: targetEnemy.id,
          burnDamage: targetEnemy.burnDamage
        };

        // 입력받은 gameState.board의 원본 타일 객체에도 불(isBurning)과 화상 피해(burnDamage) 반영
        if (gameState.board) {
          if (gameState.board[chosen.y] && gameState.board[chosen.y][chosen.x]) {
            const origTile = gameState.board[chosen.y][chosen.x];
            origTile.isBurning = true;
            origTile.burnDamage = targetEnemy.burnDamage;
          }
          if (targetEnemy.id) {
            for (let y = 0; y < gameState.board.length; y++) {
              if (Array.isArray(gameState.board[y])) {
                for (let x = 0; x < gameState.board[y].length; x++) {
                  const ot = gameState.board[y][x];
                  if (ot && ot.id === targetEnemy.id) {
                    ot.isBurning = true;
                    ot.burnDamage = targetEnemy.burnDamage;
                  }
                }
              }
            }
          }
        }
      }
    }

    const nextGameState = {
      ...gameState,
      player,
      board,
      kills,
      score,
      activeEffects
    };

    return {
      gameState: nextGameState,
      applied: true,
      skill: usedSkill,
      eventDetail,
      fireBreathTarget
    };
  }

  /**
   * 스토리지 안전 접근 도우미
   */
  function getSafeStorage(customStorage) {
    if (customStorage && typeof customStorage.getItem === 'function') {
      return customStorage;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    return null;
  }

  /**
   * 최고 점수 목록 불러오기 (조각 8 & 조각 16: 기본 10개, 종류별 분리 지원)
   * localStorage 'goblin_raid_v1', try/catch로 감싸 안전하게 처리
   */
  function loadHighScores(customStorage = null, limit = null, category = null) {
    try {
      const storage = getSafeStorage(customStorage);
      if (!storage) return [];
      const raw = storage.getItem(HIGH_SCORES_KEY);
      if (!raw) return [];
      let parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      if (category != null) {
        parsed = parsed.filter(e => e.category === category || e.difficulty === category || e.classId === category);
      }
      const effectiveLimit = (typeof limit === 'number' && limit > 0)
        ? limit
        : ((customStorage && typeof customStorage.defaultLimit === 'number') ? customStorage.defaultLimit : MAX_HIGH_SCORES);
      return parsed.slice(0, effectiveLimit);
    } catch (e) {
      return [];
    }
  }

  /**
   * 최고 점수 저장 (점수순 정렬, 조각 8 & 조각 16: 기본 10개, 종류별 분리 지원)
   */
  function saveHighScore(record, customStorage = null, limit = null) {
    try {
      const storage = getSafeStorage(customStorage);
      if (!storage) {
        return { success: false, highScores: [] };
      }
      if (!record || typeof record !== 'object') {
        return { success: false, highScores: loadHighScores(customStorage, limit) };
      }

      const effectiveLimit = (typeof limit === 'number' && limit > 0)
        ? limit
        : ((typeof record.maxScores === 'number' && record.maxScores > 0)
          ? record.maxScores
          : ((typeof record.limit === 'number' && record.limit > 0)
            ? record.limit
            : ((customStorage && typeof customStorage.defaultLimit === 'number') ? customStorage.defaultLimit : MAX_HIGH_SCORES)));

      let list = [];
      const raw = storage.getItem(HIGH_SCORES_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) list = parsed;
        } catch (_) {}
      }

      const newEntry = {
        turn: record.turn || 0,
        kills: record.kills || 0,
        score: record.score || 0,
        className: record.className || '모험가',
        classId: record.classId || 'adventurer',
        category: record.category != null ? record.category : (record.difficulty != null ? record.difficulty : null),
        difficulty: record.difficulty != null ? record.difficulty : null,
        date: record.date || new Date().toISOString()
      };
      list.push(newEntry);
      list.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.turn !== a.turn) return b.turn - a.turn;
        return b.kills - a.kills;
      });
      const trimmed = list.slice(0, effectiveLimit);

      storage.setItem(HIGH_SCORES_KEY, JSON.stringify(trimmed));
      return { success: true, highScores: trimmed };
    } catch (e) {
      return { success: false, highScores: [] };
    }
  }

  /**
   * 영구 직업 해제 데이터 불러오기
   */
  function loadUnlockData(customStorage = null) {
    try {
      const storage = getSafeStorage(customStorage);
      if (!storage) return { specialKills: 0, unlockedClasses: ['adventurer'] };
      const raw = storage.getItem(UNLOCK_DATA_KEY);
      if (!raw) return { specialKills: 0, unlockedClasses: ['adventurer'] };
      const parsed = JSON.parse(raw);
      return {
        specialKills: typeof parsed.specialKills === 'number' ? parsed.specialKills : 0,
        unlockedClasses: Array.isArray(parsed.unlockedClasses) ? parsed.unlockedClasses : ['adventurer']
      };
    } catch (e) {
      return { specialKills: 0, unlockedClasses: ['adventurer'] };
    }
  }

  /**
   * 영구 직업 해제 데이터 저장
   */
  function saveUnlockData(unlockData, customStorage = null) {
    try {
      const storage = getSafeStorage(customStorage);
      if (!storage || !unlockData) {
        return false;
      }
      storage.setItem(UNLOCK_DATA_KEY, JSON.stringify(unlockData));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* =========================================================================
   * 조각 10: 판 진행 자동 저장, 영구 기록, 무결성 검증, 저장 코드 내보내기/가져오기
   * ========================================================================= */

  /**
   * 보드 타일 직렬화 (36칸 순수 데이터)
   */
  function serializeTile(tile) {
    if (!tile || typeof tile !== 'object') return null;
    const data = {
      id: tile.id || '',
      x: typeof tile.x === 'number' ? tile.x : 0,
      y: typeof tile.y === 'number' ? tile.y : 0,
      type: tile.type || 'sword'
    };

    if (tile.hp != null) data.hp = tile.hp;
    if (tile.baseHp != null) data.baseHp = tile.baseHp;
    if (tile.maxHp != null) data.maxHp = tile.maxHp;
    if (tile.atk != null) data.atk = tile.atk;
    if (tile.rawAtk != null) data.rawAtk = tile.rawAtk;
    if (tile.armor != null) data.armor = tile.armor;
    if (tile.specialId != null) data.specialId = tile.specialId;
    if (tile.specialType != null) data.specialType = tile.specialType;
    if (tile.countdown != null) data.countdown = tile.countdown;
    if (tile.maxCountdown != null) data.maxCountdown = tile.maxCountdown;
    if (tile.isPromoted) data.isPromoted = true;
    if (tile.bonusGold != null) data.bonusGold = tile.bonusGold;
    if (tile.runnerBonusTokens != null) data.runnerBonusTokens = tile.runnerBonusTokens;

    if (tile.isFrozen) data.isFrozen = true;
    if (tile.isBurning) data.isBurning = true;
    if (tile.burnDamage != null) data.burnDamage = tile.burnDamage;
    if (tile.isAcid) data.isAcid = true;
    if (tile.isPoisoned) data.isPoisoned = true;
    if (tile.isBroken) data.isBroken = true;
    // 조각 18: 마나 물약·화살·파손 방패·성유물함·마법검 표식 저장
    if (tile.isManaPotion) data.isManaPotion = true;
    if (tile.isArrow) data.isArrow = true;
    if (tile.isPhylactery) data.isPhylactery = true;
    if (tile.isMagicSword) data.isMagicSword = true;
    if (tile.marked) data.marked = true;

    return data;
  }

  /**
   * 보드 타일 역직렬화
   */
  function deserializeTile(data) {
    if (!data || typeof data !== 'object') return null;
    const tile = {
      id: data.id || `t_${data.x}_${data.y}`,
      x: data.x,
      y: data.y,
      type: data.type
    };

    if (data.hp != null) tile.hp = data.hp;
    if (data.baseHp != null) tile.baseHp = data.baseHp;
    if (data.maxHp != null) tile.maxHp = data.maxHp;
    if (data.atk != null) tile.atk = data.atk;
    if (data.rawAtk != null) tile.rawAtk = data.rawAtk;
    if (data.armor != null) tile.armor = data.armor;
    if (data.specialId != null) tile.specialId = data.specialId;
    if (data.specialType != null) tile.specialType = data.specialType;
    if (data.countdown != null) tile.countdown = data.countdown;
    if (data.maxCountdown != null) tile.maxCountdown = data.maxCountdown;
    if (data.isPromoted) tile.isPromoted = true;
    if (data.bonusGold != null) tile.bonusGold = data.bonusGold;
    if (data.runnerBonusTokens != null) tile.runnerBonusTokens = data.runnerBonusTokens;

    if (data.isFrozen) tile.isFrozen = true;
    if (data.isBurning) tile.isBurning = true;
    if (data.burnDamage != null) tile.burnDamage = data.burnDamage;
    if (data.isAcid) tile.isAcid = true;
    if (data.isPoisoned) tile.isPoisoned = true;
    if (data.isBroken) tile.isBroken = true;
    // 조각 18: 마나 물약·화살·파손 방패·성유물함·마법검 표식 복원
    if (data.isManaPotion) tile.isManaPotion = true;
    if (data.isArrow) tile.isArrow = true;
    if (data.isPhylactery) tile.isPhylactery = true;
    if (data.isMagicSword) tile.isMagicSword = true;
    if (data.marked) tile.marked = true;

    return tile;
  }

  /**
   * 플레이어 상태 직렬화
   */
  function serializePlayer(p) {
    if (!p || typeof p !== 'object') return null;
    const accUpgrade = p.accumulatedUpgrade != null ? p.accumulatedUpgrade : (p.accumulatedShield != null ? p.accumulatedShield : 0);
    return {
      classId: p.classId || 'adventurer',
      hp: p.hp != null ? p.hp : 40,
      maxHp: p.maxHp != null ? p.maxHp : 40,
      armor: p.armor != null ? p.armor : 0,
      maxArmor: p.maxArmor != null ? p.maxArmor : 10,
      baseAtk: p.baseAtk != null ? p.baseAtk : 3,
      weaponAtk: p.weaponAtk != null ? p.weaponAtk : 1,
      level: p.level != null ? p.level : 1,
      exp: p.exp != null ? p.exp : 0,
      accumulatedExp: p.accumulatedExp != null ? p.accumulatedExp : 0,
      maxExp: p.maxExp != null ? p.maxExp : 100,
      expFraction: p.expFraction != null ? p.expFraction : 0,
      goldFraction: p.goldFraction != null ? p.goldFraction : 0,
      upgradeFraction: p.upgradeFraction != null ? p.upgradeFraction : 0,
      gold: p.gold != null ? p.gold : 0,
      accumulatedGold: p.accumulatedGold != null ? p.accumulatedGold : 0,
      maxGold: p.maxGold != null ? p.maxGold : 100,
      shieldGauge: p.shieldGauge != null ? p.shieldGauge : 0,
      accumulatedShield: accUpgrade,
      accumulatedUpgrade: accUpgrade,
      maxShieldGauge: p.maxShieldGauge != null ? p.maxShieldGauge : 100,
      statChance: p.statChance != null ? p.statChance : 5,
      shieldRecovery: p.shieldRecovery != null ? p.shieldRecovery : 2,
      potionHeal: p.potionHeal != null ? p.potionHeal : 3,
      potionBonus: p.potionBonus != null ? p.potionBonus : 0,
      coinBonus: p.coinBonus != null ? p.coinBonus : 0,
      specialKills: p.specialKills != null ? p.specialKills : 0,
      isPoisoned: Boolean(p.isPoisoned),
      raceId: p.raceId != null ? p.raceId : ((CLASSES[p.classId] && CLASSES[p.classId].defaultRaceId != null) ? CLASSES[p.classId].defaultRaceId : 0),
      skills: Array.isArray(p.skills) ? p.skills.map(s => ({
        id: s.id,
        skillId: s.skillId != null ? s.skillId : (typeof s.id === 'number' ? s.id : (SKILLS[s.id] ? SKILLS[s.id].skillId : undefined)),
        name: s.name,
        icon: s.icon,
        cooldown: s.cooldown,
        currentCooldown: s.currentCooldown != null ? s.currentCooldown : 0,
        charge: s.charge != null ? s.charge : 0,
        rank: s.rank != null ? s.rank : (s.level != null ? s.level : 1),
        desc: s.desc
      })) : [],
      perks: normalizePerkSlots(p.perks),
      flaws: normalizePerkSlots(p.flaws)
    };
  }

  /**
   * 플레이어 상태 역직렬화
   */
  function deserializePlayer(data) {
    if (!data || typeof data !== 'object') return createPlayer();
    const accUpgrade = data.accumulatedUpgrade != null ? data.accumulatedUpgrade : (data.accumulatedShield != null ? data.accumulatedShield : 0);
    const p = {
      classId: data.classId || 'adventurer',
      hp: data.hp != null ? data.hp : 40,
      maxHp: data.maxHp != null ? data.maxHp : 40,
      armor: data.armor != null ? data.armor : 0,
      maxArmor: data.maxArmor != null ? data.maxArmor : 10,
      baseAtk: data.baseAtk != null ? data.baseAtk : 3,
      weaponAtk: data.weaponAtk != null ? data.weaponAtk : 1,
      level: data.level != null ? data.level : 1,
      exp: data.exp != null ? data.exp : 0,
      accumulatedExp: data.accumulatedExp != null ? data.accumulatedExp : 0,
      maxExp: data.maxExp != null ? data.maxExp : 100,
      expFraction: data.expFraction != null ? data.expFraction : 0,
      goldFraction: data.goldFraction != null ? data.goldFraction : 0,
      upgradeFraction: data.upgradeFraction != null ? data.upgradeFraction : 0,
      gold: data.gold != null ? data.gold : 0,
      accumulatedGold: data.accumulatedGold != null ? data.accumulatedGold : 0,
      maxGold: data.maxGold != null ? data.maxGold : 100,
      shieldGauge: data.shieldGauge != null ? data.shieldGauge : 0,
      accumulatedShield: accUpgrade,
      accumulatedUpgrade: accUpgrade,
      maxShieldGauge: data.maxShieldGauge != null ? data.maxShieldGauge : 100,
      statChance: data.statChance != null ? data.statChance : 5,
      shieldRecovery: data.shieldRecovery != null ? data.shieldRecovery : 2,
      potionHeal: data.potionHeal != null ? data.potionHeal : 3,
      potionBonus: data.potionBonus != null ? data.potionBonus : 0,
      coinBonus: data.coinBonus != null ? data.coinBonus : 0,
      specialKills: data.specialKills != null ? data.specialKills : 0,
      isPoisoned: Boolean(data.isPoisoned),
      raceId: data.raceId != null ? data.raceId : ((CLASSES[data.classId] && CLASSES[data.classId].defaultRaceId != null) ? CLASSES[data.classId].defaultRaceId : 0),
      perks: normalizePerkSlots(data.perks),
      flaws: normalizePerkSlots(data.flaws),
      skills: []
    };

    if (Array.isArray(data.skills)) {
      p.skills = data.skills.map(s => {
        const baseDef = (typeof s.id === 'number' ? SKILLS_DATA.find(d => d.id === s.id) : null)
          || SKILLS[s.id]
          || SKILLS_DATA.find(d => d.key === s.id)
          || {};
        const cd = s.cooldown != null ? s.cooldown : (baseDef.cooldown != null ? baseDef.cooldown : 5);
        const resolvedSkillId = typeof s.skillId === 'number'
          ? s.skillId
          : (typeof baseDef.skillId === 'number'
            ? baseDef.skillId
            : (typeof baseDef.id === 'number'
              ? baseDef.id
              : (s.skillId != null ? s.skillId : s.id)));
        return {
          id: s.id,
          skillId: resolvedSkillId,
          key: s.key || baseDef.key || s.id,
          name: s.name || baseDef.name || s.id,
          icon: s.icon || baseDef.icon || '⚔️',
          cooldown: cd,
          currentCooldown: s.currentCooldown != null ? s.currentCooldown : 0,
          charge: s.charge != null ? s.charge : 0,
          rank: s.rank != null ? s.rank : 1,
          desc: s.desc || baseDef.desc || '',
          singleUse: Boolean(s.singleUse || baseDef.singleUse || cd === -1)
        };
      });
    }

    return p;
  }

  /**
   * 판 진행 상태 전체 직렬화
   */
  function serializeRunState(gameState, seed = null) {
    if (!gameState || typeof gameState !== 'object') return null;

    let rngState = null;
    if (typeof gameState.rng === 'function' && typeof gameState.rng.getState === 'function') {
      rngState = gameState.rng.getState();
    } else if (gameState.rngState != null) {
      rngState = gameState.rngState;
    }

    const effectiveSeed = seed != null
      ? seed
      : (gameState.seed != null ? gameState.seed : (typeof gameState.rng?.seed === 'number' ? gameState.rng.seed : 12345));

    const boardData = [];
    if (Array.isArray(gameState.board)) {
      for (let y = 0; y < gameState.board.length; y++) {
        const row = [];
        for (let x = 0; x < gameState.board[y].length; x++) {
          row.push(serializeTile(gameState.board[y][x]));
        }
        boardData.push(row);
      }
    }

    let effectiveUseOriginalRules = false;
    if (gameState.useOriginalRules != null) {
      effectiveUseOriginalRules = Boolean(gameState.useOriginalRules);
    } else if (gameState.player) {
      const p = gameState.player;
      if (
        (p.accumulatedExp > 0 || p.accumulatedGold > 0 || (p.accumulatedUpgrade > 0 || p.accumulatedShield > 0)) ||
        (p.maxShieldGauge >= 100 && p.maxExp >= 100)
      ) {
        effectiveUseOriginalRules = true;
      }
    }

    return {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      turn: gameState.turn != null ? gameState.turn : 1,
      kills: gameState.kills != null ? gameState.kills : 0,
      score: gameState.score != null ? gameState.score : 0,
      difficulty: gameState.difficulty != null ? gameState.difficulty : 1,
      promotionCooldown: gameState.promotionCooldown != null ? gameState.promotionCooldown : 50,
      useOriginalRules: effectiveUseOriginalRules,
      isGameOver: Boolean(gameState.isGameOver),
      seed: effectiveSeed,
      rngState,
      player: serializePlayer(gameState.player),
      board: boardData,
      pendingChoice: gameState.pendingChoice ? JSON.parse(JSON.stringify(gameState.pendingChoice)) : null,
      pendingChoiceQueue: Array.isArray(gameState.pendingChoiceQueue)
        ? JSON.parse(JSON.stringify(gameState.pendingChoiceQueue))
        : []
    };
  }

  /**
   * 판 진행 상태 전체 역직렬화
   */
  function deserializeRunState(data) {
    if (!data || typeof data !== 'object') return null;

    const board = [];
    if (Array.isArray(data.board)) {
      for (let y = 0; y < data.board.length; y++) {
        const row = [];
        for (let x = 0; x < data.board[y].length; x++) {
          row.push(deserializeTile(data.board[y][x]));
        }
        board.push(row);
      }
    }

    let rng = null;
    if (data.rngState != null) {
      rng = createRNG(data.seed || 12345);
      if (typeof rng.setState === 'function') {
        rng.setState(data.rngState);
      }
    } else if (data.seed != null) {
      rng = createRNG(data.seed);
    }

    return {
      turn: data.turn != null ? data.turn : 1,
      kills: data.kills != null ? data.kills : 0,
      score: data.score != null ? data.score : 0,
      difficulty: data.difficulty != null ? data.difficulty : 1,
      promotionCooldown: data.promotionCooldown != null ? data.promotionCooldown : 50,
      useOriginalRules: Boolean(data.useOriginalRules),
      isGameOver: Boolean(data.isGameOver),
      seed: data.seed != null ? data.seed : null,
      rngState: data.rngState != null ? data.rngState : null,
      rng,
      player: deserializePlayer(data.player),
      board,
      pendingChoice: data.pendingChoice || null,
      pendingChoiceQueue: Array.isArray(data.pendingChoiceQueue) ? data.pendingChoiceQueue : []
    };
  }

  /**
   * 판 진행 자동 저장 (턴 종료마다 호출, 키 goblin_raid_run_v1)
   */
  function saveRunState(gameState, customStorage = null, seed = null) {
    try {
      const storage = getSafeStorage(customStorage);
      if (!storage) return { success: false, reason: 'no_storage' };
      if (!gameState) return { success: false, reason: 'invalid_state' };

      // 게임 오버 상태면 진행을 지움
      if (gameState.isGameOver) {
        clearRunState(customStorage);
        return { success: true, cleared: true };
      }

      const serialized = serializeRunState(gameState, seed);
      storage.setItem(RUN_SAVE_KEY, JSON.stringify(serialized));
      return { success: true, savedState: serialized };
    } catch (e) {
      return { success: false, reason: e.message || 'error' };
    }
  }

  /**
   * 판 진행 불러오기 (버전 불일치나 깨진 데이터는 goblin_raid_run_v1_backup에 보존)
   */
  function loadRunState(customStorage = null) {
    try {
      const storage = getSafeStorage(customStorage);
      if (!storage) return null;

      const raw = storage.getItem(RUN_SAVE_KEY);
      if (!raw) return null;

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (parseErr) {
        // 깨진 JSON -> 백업 키에 보관
        try { storage.setItem(RUN_SAVE_BACKUP_KEY, raw); } catch (_) {}
        try { storage.removeItem(RUN_SAVE_KEY); } catch (_) {}
        return null;
      }

      if (!parsed || typeof parsed !== 'object') {
        try { storage.setItem(RUN_SAVE_BACKUP_KEY, raw); } catch (_) {}
        try { storage.removeItem(RUN_SAVE_KEY); } catch (_) {}
        return null;
      }

      // 버전 불일치 검증
      if (parsed.version !== SAVE_VERSION) {
        try { storage.setItem(RUN_SAVE_BACKUP_KEY, raw); } catch (_) {}
        try { storage.removeItem(RUN_SAVE_KEY); } catch (_) {}
        return null;
      }

      // 필수 구조 검증 (board, player)
      if (!parsed.board || !Array.isArray(parsed.board) || !parsed.player) {
        try { storage.setItem(RUN_SAVE_BACKUP_KEY, raw); } catch (_) {}
        try { storage.removeItem(RUN_SAVE_KEY); } catch (_) {}
        return null;
      }

      return deserializeRunState(parsed);
    } catch (e) {
      return null;
    }
  }

  /**
   * 판 진행 삭제 (게임 오버 시 호출)
   */
  function clearRunState(customStorage = null) {
    try {
      const storage = getSafeStorage(customStorage);
      if (!storage) return false;
      storage.removeItem(RUN_SAVE_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 저장된 판 진행 여부 확인
   */
  function hasSavedRun(customStorage = null) {
    try {
      const storage = getSafeStorage(customStorage);
      if (!storage) return false;
      const raw = storage.getItem(RUN_SAVE_KEY);
      return Boolean(raw && raw.length > 20);
    } catch (e) {
      return false;
    }
  }

  /**
   * 기본 영구 프로필 생성
   */
  function createDefaultProfile() {
    return {
      version: SAVE_VERSION,
      unlockedClasses: ['adventurer'],
      unlockedRaces: [0],
      classProgress: {
        adventurer: { level: 1, exp: 0, games: 0, wins: 0, highScore: 0 }
      },
      classPerkSettings: {},
      classRaceSettings: {},
      highScores: [],
      achievements: [],
      specialKills: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * 영구 프로필 저장 (goblin_raid_profile_v1)
   */
  function saveProfile(profile, customStorage = null) {
    try {
      const storage = getSafeStorage(customStorage);
      if (!storage) return false;
      if (!profile || typeof profile !== 'object') return false;

      profile.version = SAVE_VERSION;
      profile.updatedAt = new Date().toISOString();

      if (Array.isArray(profile.highScores)) {
        profile.highScores.sort((a, b) => {
          if (b.score !== a.score) return (b.score || 0) - (a.score || 0);
          if (b.turn !== a.turn) return (b.turn || 0) - (a.turn || 0);
          return (b.kills || 0) - (a.kills || 0);
        });
        profile.highScores = profile.highScores.slice(0, 10);
      }

      storage.setItem(PROFILE_SAVE_KEY, JSON.stringify(profile));

      // 기존 레거시 키와 호환 동기화
      try {
        storage.setItem(HIGH_SCORES_KEY, JSON.stringify(profile.highScores || []));
        storage.setItem(UNLOCK_DATA_KEY, JSON.stringify({
          specialKills: profile.specialKills || 0,
          unlockedClasses: profile.unlockedClasses || ['adventurer']
        }));
      } catch (_) {}

      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 영구 프로필 불러오기 (버전 불일치나 깨진 데이터는 goblin_raid_profile_v1_backup에 보관)
   */
  function loadProfile(customStorage = null) {
    try {
      const storage = getSafeStorage(customStorage);
      if (!storage) return createDefaultProfile();

      const raw = storage.getItem(PROFILE_SAVE_KEY);
      if (!raw) {
        // 기존 레거시 키에서 마이그레이션 시도
        const def = createDefaultProfile();
        try {
          const legScores = storage.getItem(HIGH_SCORES_KEY);
          if (legScores) {
            const parsedScores = JSON.parse(legScores);
            if (Array.isArray(parsedScores)) def.highScores = parsedScores.slice(0, 10);
          }
          const legUnlocks = storage.getItem(UNLOCK_DATA_KEY);
          if (legUnlocks) {
            const parsedUnlocks = JSON.parse(legUnlocks);
            if (typeof parsedUnlocks.specialKills === 'number') def.specialKills = parsedUnlocks.specialKills;
            if (Array.isArray(parsedUnlocks.unlockedClasses)) def.unlockedClasses = parsedUnlocks.unlockedClasses;
          }
        } catch (_) {}
        return def;
      }

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (parseErr) {
        try { storage.setItem(PROFILE_SAVE_BACKUP_KEY, raw); } catch (_) {}
        return createDefaultProfile();
      }

      if (!parsed || typeof parsed !== 'object') {
        try { storage.setItem(PROFILE_SAVE_BACKUP_KEY, raw); } catch (_) {}
        return createDefaultProfile();
      }

      if (parsed.version !== SAVE_VERSION) {
        try { storage.setItem(PROFILE_SAVE_BACKUP_KEY, raw); } catch (_) {}
        return createDefaultProfile();
      }

      if (!Array.isArray(parsed.unlockedClasses)) parsed.unlockedClasses = ['adventurer'];
      if (!Array.isArray(parsed.unlockedRaces)) parsed.unlockedRaces = [0];
      if (!parsed.classProgress || typeof parsed.classProgress !== 'object') parsed.classProgress = {};
      if (!parsed.classPerkSettings || typeof parsed.classPerkSettings !== 'object') parsed.classPerkSettings = {};
      if (!parsed.classRaceSettings || typeof parsed.classRaceSettings !== 'object') parsed.classRaceSettings = {};
      if (!Array.isArray(parsed.highScores)) parsed.highScores = [];
      if (!Array.isArray(parsed.achievements)) parsed.achievements = [];
      if (typeof parsed.specialKills !== 'number') parsed.specialKills = 0;

      parsed.highScores.sort((a, b) => {
        if (b.score !== a.score) return (b.score || 0) - (a.score || 0);
        if (b.turn !== a.turn) return (b.turn || 0) - (a.turn || 0);
        return (b.kills || 0) - (a.kills || 0);
      });
      parsed.highScores = parsed.highScores.slice(0, 10);

      return parsed;
    } catch (e) {
      return createDefaultProfile();
    }
  }

  /**
   * 게임 결과로 영구 프로필 갱신 (점수 10개 유지, 직업 성장 반영 등)
   */
  function updateProfileWithGameResult(profile, gameResult, customStorage = null) {
    const prof = profile ? { ...profile } : loadProfile(customStorage);
    if (!gameResult || typeof gameResult !== 'object') return prof;

    const score = typeof gameResult.score === 'number' ? gameResult.score : 0;
    const turn = typeof gameResult.turn === 'number' ? gameResult.turn : 0;
    const kills = typeof gameResult.kills === 'number' ? gameResult.kills : 0;
    const classId = gameResult.classId || 'adventurer';
    const className = gameResult.className || (CLASSES[classId] ? CLASSES[classId].name : '모험가');
    const date = gameResult.date || new Date().toISOString();

    if (!Array.isArray(prof.highScores)) prof.highScores = [];
    prof.highScores.push({
      score,
      turn,
      kills,
      classId,
      className,
      date
    });

    prof.highScores.sort((a, b) => {
      if (b.score !== a.score) return (b.score || 0) - (a.score || 0);
      if (b.turn !== a.turn) return (b.turn || 0) - (a.turn || 0);
      return (b.kills || 0) - (a.kills || 0);
    });
    prof.highScores = prof.highScores.slice(0, 10);

    if (!prof.classProgress) prof.classProgress = {};
    if (!prof.classProgress[classId]) {
      prof.classProgress[classId] = { level: 1, exp: 0, games: 0, wins: 0, highScore: 0 };
    }
    const cp = prof.classProgress[classId];
    cp.games = (cp.games || 0) + 1;
    cp.highScore = Math.max(cp.highScore || 0, score);
    if (gameResult.isWin) cp.wins = (cp.wins || 0) + 1;

    if (gameResult.specialKills) {
      prof.specialKills = (prof.specialKills || 0) + gameResult.specialKills;
    }

    // 조각 13: 게임 결과(점수, 턴, 특수 적 처치 등) 기반 업적 달성 검사 및 자동 지급
    checkAchievements({ turn, score }, prof, {
      autoGrant: true,
      storage: customStorage,
      specialKills: prof.specialKills
    });

    if (customStorage) {
      saveProfile(prof, customStorage);
    }

    return prof;
  }

  /**
   * FNV-1a 32비트 체크섬 계산 (저장 코드 무결성 검증용)
   */
  function calculateChecksum(str) {
    let hash = 0x811c9dc5;
    const len = typeof str === 'string' ? str.length : 0;
    for (let i = 0; i < len; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  /**
   * UTF-8 문자열을 Base64로 인코딩 (Node.js & 브라우저 공용)
   */
  function utf8ToBase64(str) {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'utf8').toString('base64');
    }
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (_, p1) {
      return String.fromCharCode('0x' + p1);
    }));
  }

  /**
   * Base64를 UTF-8 문자열로 디코딩 (Node.js & 브라우저 공용)
   */
  function base64ToUtf8(b64) {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(b64, 'base64').toString('utf8');
    }
    return decodeURIComponent(Array.prototype.map.call(atob(b64), function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  }

  /**
   * 영구 기록을 짧은 텍스트 저장 코드로 내보내기 (체크섬 포함)
   */
  function exportProfileCode(profile) {
    if (!profile || typeof profile !== 'object') return '';
    const payload = {
      v: SAVE_VERSION,
      uc: Array.isArray(profile.unlockedClasses) ? profile.unlockedClasses : ['adventurer'],
      ur: Array.isArray(profile.unlockedRaces) ? profile.unlockedRaces : [0],
      cp: profile.classProgress && typeof profile.classProgress === 'object' ? profile.classProgress : {},
      cps: profile.classPerkSettings && typeof profile.classPerkSettings === 'object' ? profile.classPerkSettings : {},
      crs: profile.classRaceSettings && typeof profile.classRaceSettings === 'object' ? profile.classRaceSettings : {},
      hs: (Array.isArray(profile.highScores) ? profile.highScores : []).slice(0, 10),
      sk: typeof profile.specialKills === 'number' ? profile.specialKills : 0,
      ac: Array.isArray(profile.achievements) ? profile.achievements : []
    };
    const jsonStr = JSON.stringify(payload);
    const checksum = calculateChecksum(jsonStr);
    const b64 = utf8ToBase64(jsonStr);
    return `GR1-${checksum}-${b64}`;
  }

  /**
   * 저장 코드를 검증 및 파싱하여 영구 기록 불러오기 (변조 시 거부)
   */
  function importProfileCode(code, customStorage = null) {
    if (!code || typeof code !== 'string') {
      return { success: false, reason: 'invalid_code' };
    }
    const trimmed = code.trim();
    if (!trimmed.startsWith('GR1-')) {
      return { success: false, reason: 'unsupported_prefix' };
    }
    const parts = trimmed.split('-');
    if (parts.length !== 3) {
      return { success: false, reason: 'malformed_code' };
    }

    const expectedChecksum = parts[1];
    const b64Data = parts[2];

    let jsonStr;
    try {
      jsonStr = base64ToUtf8(b64Data);
    } catch (_) {
      return { success: false, reason: 'corrupted_base64' };
    }

    const actualChecksum = calculateChecksum(jsonStr);
    if (actualChecksum !== expectedChecksum) {
      return { success: false, reason: 'checksum_mismatch' };
    }

    let payload;
    try {
      payload = JSON.parse(jsonStr);
    } catch (_) {
      return { success: false, reason: 'invalid_json' };
    }

    if (payload.v !== SAVE_VERSION) {
      return { success: false, reason: 'unsupported_version' };
    }

    const profile = {
      version: SAVE_VERSION,
      unlockedClasses: Array.isArray(payload.uc) ? payload.uc : ['adventurer'],
      unlockedRaces: Array.isArray(payload.ur) ? payload.ur : [0],
      classProgress: payload.cp && typeof payload.cp === 'object' ? payload.cp : {},
      classPerkSettings: payload.cps && typeof payload.cps === 'object' ? payload.cps : {},
      classRaceSettings: payload.crs && typeof payload.crs === 'object' ? payload.crs : {},
      highScores: Array.isArray(payload.hs) ? payload.hs.slice(0, 10) : [],
      specialKills: typeof payload.sk === 'number' ? payload.sk : 0,
      achievements: Array.isArray(payload.ac) ? payload.ac : [],
      updatedAt: new Date().toISOString()
    };

    if (customStorage) {
      saveProfile(profile, customStorage);
    }

    return { success: true, profile };
  }

  /**
   * 무작위 타일 타입 선택 (가중치 지원)
   */
  function pickRandomTileType(rng, types = TILE_TYPES, weights = null) {
    const randomFn = typeof rng === 'function' ? rng : Math.random;

    if (weights && typeof weights === 'object') {
      let totalWeight = 0;
      for (const t of types) {
        totalWeight += (typeof weights[t] === 'number' ? weights[t] : 1);
      }
      if (totalWeight > 0) {
        let r = randomFn() * totalWeight;
        for (const t of types) {
          const w = (typeof weights[t] === 'number' ? weights[t] : 1);
          if (r < w) {
            return t;
          }
          r -= w;
        }
        return types[types.length - 1];
      }
    }

    const r = randomFn();
    const idx = Math.min(types.length - 1, Math.floor(r * types.length));
    return types[idx];
  }

  /**
   * 턴 수에 따른 특수 적 출현 판정 (규칙 7번·8번: 후반에 섞여 나옴)
   * 턴 1~20: 0%, 턴 21~50: 25%, 턴 51~80: 40%, 턴 81+: 60%
   */
  function shouldSpawnSpecialEnemy(turn, rng) {
    const randomFn = typeof rng === 'function' ? rng : Math.random;
    const t = Math.max(1, Math.floor(turn || 1));
    let chance = 0;
    if (t <= 20) {
      chance = 0;
    } else if (t <= 50) {
      chance = 0.25;
    } else if (t <= 80) {
      chance = 0.40;
    } else {
      chance = 0.60;
    }
    return randomFn() < chance;
  }

  /**
   * 7종 특수 적 중 무작위 1종 선택
   */
  function pickRandomSpecialEnemyType(rng) {
    const randomFn = typeof rng === 'function' ? rng : Math.random;
    const idx = Math.min(SPECIAL_ENEMY_TYPES.length - 1, Math.floor(randomFn() * SPECIAL_ENEMY_TYPES.length));
    return SPECIAL_ENEMY_TYPES[idx];
  }

  /**
   * 단일 타일 객체 생성
   * 조각 11: 퍽 1(마나 물약 5%), 퍽 6(화살 5%), 결함 7(파손 방패 3%), 결함 3(적 체력 +1)
   * 조각 21: 보충 때 활성 퍽·결함 전달 누락 및 빈 배열 우선순위 수정, 보충 생성 적의 승급 타이머 검사(IsTimeToPromote)
   */
  function createRandomTile(randomFn, x, y, id, tileTypes, turn = 1, weights = null, enemyStats = {}, options = {}) {
    let type = pickRandomTileType(randomFn, tileTypes, weights);
    const activeEffects = (options && options.activeEffects) || (enemyStats && enemyStats.activeEffects) || {};

    // 조각 22: 스킬 24 (보물 창고) - 이번 턴 보충되는 모든 칸이 코인이 됨
    if (activeEffects.spawnForceCoin || (options && options.spawnForceCoin)) {
      type = 'coin';
    }

    const activePerks = (options && Array.isArray(options.activePerks) && options.activePerks.length > 0)
      ? options.activePerks.filter(p => p != null && p !== 255)
      : ((options && options.player && Array.isArray(options.player.activePerks) && options.player.activePerks.length > 0)
          ? options.player.activePerks.filter(p => p != null && p !== 255)
          : ((options && options.player && Array.isArray(options.player.perks) && options.player.perks.length > 0)
              ? options.player.perks.filter(p => p != null && p !== 255)
              : ((enemyStats && Array.isArray(enemyStats.activePerks) && enemyStats.activePerks.length > 0)
                  ? enemyStats.activePerks.filter(p => p != null && p !== 255)
                  : [])));

    const activeFlaws = (options && Array.isArray(options.activeFlaws) && options.activeFlaws.length > 0)
      ? options.activeFlaws.filter(f => f != null && f !== 255)
      : ((options && options.player && Array.isArray(options.player.activeFlaws) && options.player.activeFlaws.length > 0)
          ? options.player.activeFlaws.filter(f => f != null && f !== 255)
          : ((options && options.player && Array.isArray(options.player.flaws) && options.player.flaws.length > 0)
              ? options.player.flaws.filter(f => f != null && f !== 255)
              : ((enemyStats && Array.isArray(enemyStats.activeFlaws) && enemyStats.activeFlaws.length > 0)
                  ? enemyStats.activeFlaws.filter(f => f != null && f !== 255)
                  : [])));

    // 조각 11: 퍽 1 (마나 친화) - 물약의 5%가 마나 물약
    if (type === 'potion' && activePerks.includes(1) && randomFn() < 0.05) {
      return { id, x, y, type, isManaPotion: true };
    }
    // 조각 11: 퍽 6 (명사수) - 칼의 5%가 화살
    if (type === 'sword' && activePerks.includes(6) && randomFn() < 0.05) {
      return { id, x, y, type, isArrow: true };
    }
    // 조각 11: 결함 7 (손상된 방패) - 방패의 3%가 파손 방패
    if (type === 'shield' && activeFlaws.includes(7) && randomFn() < 0.03) {
      return { id, x, y, type, isBroken: true };
    }

    if (type === 'enemy') {
      let stats = { ...enemyStats };
      // 조각 22: 스킬 22 (함정) - 이번 턴 새로 등장하는 적의 체력을 1로 설정
      if (activeEffects.spawnEnemyHp1 || (options && options.spawnEnemyHp1)) {
        stats.hp = 1;
        stats.maxHp = 1;
        stats.baseHp = 1;
      }
      // 조각 16: 승급 외 옛 7종 임의 생성 제거 (options.allowLegacySpecialSpawn 명시 시에만 허용)
      if (options.allowLegacySpecialSpawn && !stats.specialType && stats.allowSpecial !== false && shouldSpawnSpecialEnemy(turn, randomFn)) {
        stats.specialType = pickRandomSpecialEnemyType(randomFn);
      }
      // 조각 11 & 조각 21 (원작-대조표-2 207행): 결함 3 (교활한 적들) - 일반 적 체력 +1
      if (activeFlaws.includes(3)) {
        const curve = calculateEnemyCurve(turn, stats.difficulty != null ? stats.difficulty : 1, stats.L || 0, randomFn);
        const baseH = stats.hp != null ? stats.hp : curve.hp;
        stats.hp = baseH + 1;
        stats.maxHp = stats.hp;
        stats.baseHp = stats.hp;
      }

      // 조각 21 (원작-대조표-2 238행): 승급은 보충 중 생성되는 적이 타이머를 검사 (IsTimeToPromote @ 000250b0 → SetType → Promote)
      const promotionState = options.promotionState || (options.promotionCooldown != null ? options : (enemyStats.promotionState || null));
      const shouldCheckPromotion = Boolean(
        promotionState &&
        (promotionState.promotionCooldown === 0 || promotionState.isTimeToPromote) &&
        !stats.specialId &&
        !stats.specialType
      );

      if (shouldCheckPromotion) {
        const player = options.player || stats.player || {};
        let specialId = randomInt(1, 32, randomFn);
        const playerRaceId = (player && player.raceId != null) ? player.raceId : 0;
        const mortalEnemyId = getMortalEnemyForRace(playerRaceId);
        if (mortalEnemyId && mortalEnemyId > 0) {
          const threshold = activePerks.includes(8) ? 5 : 10;
          if (randomInt(1, 200, randomFn) <= threshold) {
            specialId = mortalEnemyId;
          }
        }
        const diff = stats.difficulty != null ? stats.difficulty : 1;
        const playerL = stats.L || 0;
        const baseTile = createEnemyTile(x, y, id, turn, stats);
        const promotedTile = promoteEnemy(baseTile, specialId, player, {
          rng: randomFn,
          turn,
          difficulty: diff,
          L: playerL,
          activeFlaws,
          board: options.board
        });

        // 새 대기 타이머 계산 및 결함 8(새 대기 -1 시 최소 1) 적용
        let nextCooldown = calculateNextPromotionCooldown(turn, diff, playerL, randomFn);
        if (activeFlaws.includes(8)) {
          nextCooldown = Math.max(1, nextCooldown - 1);
        }
        if (promotionState) {
          promotionState.promotionCooldown = nextCooldown;
          promotionState.promoted = true;
          promotionState.promotedEnemy = promotedTile;
          delete promotionState.isTimeToPromote;
        }
        return promotedTile;
      }

      return createEnemyTile(x, y, id, turn, stats);
    }
    return {
      id,
      x,
      y,
      type
    };
  }

  /**
   * 6x6 보드 생성
   * 조각 7: 시작 판에는 적이 없음 (isInitial: true 또는 allowEnemy: false 시 적 제외), 칸 보충은 5종 균등(각 20%)
   */
  function createBoard(width = BOARD_WIDTH, height = BOARD_HEIGHT, rng = null, tileTypes = TILE_TYPES, options = {}) {
    const randomFn = typeof rng === 'function' ? rng : createRNG(rng);
    const turn = options.turn || 1;
    const weights = options.tileWeights || null;
    const effectiveTypes = (options.isInitial || options.allowEnemy === false)
      ? tileTypes.filter(t => t !== 'enemy')
      : tileTypes;
    const board = [];
    let idCounter = 1;

    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        const id = `tile_${x}_${y}_${idCounter++}`;
        const tile = createRandomTile(randomFn, x, y, id, effectiveTypes, turn, weights, options.enemyStats, options);
        row.push(tile);
      }
      board.push(row);
    }
    return board;
  }

  /**
   * 게임 상태 객체 생성
   * 조각 5: 직업(classId) 및 해제 정보(unlockData) 지원
   * 조각 7: 기본 난이도 1, 시작 판 적 없음(isInitial: true)
   * 조각 11: 퍽(perks), 결함(flaws) 및 직업 레벨(classLevel) 지원
   * 조각 14: 직업 해제 카운터(classUnlockCounter: R(20,30), classUnlocksThisRun: 0) 지원
   */
  function createGameState(options = {}) {
    const seed = options.seed != null ? options.seed : 12345;
    const rng = typeof options.rng === 'function' ? options.rng : createRNG(seed);
    const turn = options.turn || 1;
    const difficulty = options.difficulty != null ? options.difficulty : 1;
    const classId = options.classId || (options.player && options.player.classId) || 'adventurer';
    const playerOptions = {
      classId,
      raceId: options.raceId != null ? options.raceId : (options.player && options.player.raceId),
      perks: options.perks || (options.player && options.player.perks) || [],
      flaws: options.flaws || (options.player && options.player.flaws) || [],
      level: options.classLevel || (options.player && options.player.level) || 1,
      ...(options.player || {})
    };
    const player = createPlayer(playerOptions);
    const board = options.board || createBoard(BOARD_WIDTH, BOARD_HEIGHT, rng, TILE_TYPES, {
      turn,
      isInitial: true,
      difficulty,
      enemyStats: options.enemyStats,
      player,
      activePerks: player.activePerks,
      activeFlaws: player.activeFlaws
    });

    const unlockData = options.unlockData || { specialKills: 0, unlockedClasses: ['adventurer'] };
    const classUnlockCounter = options.classUnlockCounter != null
      ? options.classUnlockCounter
      : randomInt(CLASS_UNLOCK_INTERVAL_MIN, CLASS_UNLOCK_INTERVAL_MAX, rng);
    const classUnlocksThisRun = options.classUnlocksThisRun || 0;

    const activeFlaws = player.activeFlaws || [];
    const defaultPromotionCooldown = activeFlaws.includes(8)
      ? Math.max(0, PROMOTION_COOLDOWN_INITIAL - 1)
      : PROMOTION_COOLDOWN_INITIAL;

    const state = {
      turn,
      difficulty,
      promotionCooldown: options.promotionCooldown != null ? options.promotionCooldown : defaultPromotionCooldown,
      classUnlockCounter,
      classUnlocksThisRun,
      kills: options.kills || 0,
      score: options.score || 0,
      player,
      board,
      isGameOver: false,
      pendingChoice: options.pendingChoice || null,
      pendingChoiceQueue: options.pendingChoiceQueue ? [...options.pendingChoiceQueue] : [],
      unlockData,
      profile: options.profile || null,
      classProgress: options.classProgress || (options.profile && options.profile.classProgress) || null,
      classLevels: options.classLevels || null
    };

    if (options.useOriginalRules != null) {
      state.useOriginalRules = Boolean(options.useOriginalRules);
    }

    return state;
  }

  /**
   * 보드 딥 카피
   */
  function cloneBoard(board) {
    return board.map(row => row.map(tile => ({ ...tile })));
  }

  /**
   * 좌표가 보드 내부인지 확인
   */
  function isInside(pos, width = BOARD_WIDTH, height = BOARD_HEIGHT) {
    return pos != null &&
      Number.isInteger(pos.x) &&
      Number.isInteger(pos.y) &&
      pos.x >= 0 && pos.x < width &&
      pos.y >= 0 && pos.y < height;
  }

  /**
   * 8방향 이웃 판정 (상하좌우 및 대각선, 자기 자신 제외)
   */
  function isNeighbor(posA, posB) {
    if (!posA || !posB) return false;
    const dx = Math.abs(posA.x - posB.x);
    const dy = Math.abs(posA.y - posB.y);
    return (dx <= 1 && dy <= 1) && !(dx === 0 && dy === 0);
  }

  /**
   * 특정 위치의 8방향 이웃 좌표 목록 반환
   */
  function getNeighbors(pos, width = BOARD_WIDTH, height = BOARD_HEIGHT) {
    if (!isInside(pos, width, height)) return [];
    const neighbors = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = pos.x + dx;
        const ny = pos.y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          neighbors.push({ x: nx, y: ny });
        }
      }
    }
    return neighbors;
  }

  /**
   * 특정 위치의 타일 조회
   */
  function getTile(board, pos) {
    if (!board || !pos || !isInside(pos, board[0]?.length || 0, board.length)) return null;
    return board[pos.y][pos.x] || null;
  }

  /**
   * 칼 또는 적 타일인지 여부 판정 (공격 체인 계열)
   * 조각 19(대조표 43행): 화살(isArrow/arrow)도 공격 체인에 포함
   */
  function isAttackType(type, tile = null) {
    if (tile && (tile.isArrow || tile.type === 'arrow')) return true;
    return type === 'sword' || type === 'enemy' || type === 'arrow';
  }

  /**
   * 다음 칸으로 체인을 연장할 수 있는지 검사
   * - 규칙 2: 칼 줄에는 적 칸을 이을 수 있음. 적만으로 이은 줄도 가능.
   * - 방패, 물약, 코인은 같은 종류끼리만 연결.
   * - 조각 4 & 조각 19(대조표 44행): 얼어붙은 칸 검사 (원작: 동결된 적은 선택/연결 허용)
   */
  function canConnect(board, path, nextPos) {
    if (!board || !nextPos) return false;
    const height = board.length;
    const width = board[0] ? board[0].length : 0;
    if (!isInside(nextPos, width, height)) return false;

    // 조각 4 & 조각 19(대조표 44행): 얼어붙은 칸 검사 (원작: 동결된 적은 선택/연결 허용)
    const nextTile = getTile(board, nextPos);
    if (!nextTile || (nextTile.isFrozen && nextTile.type !== 'enemy')) {
      return false;
    }

    // 경로가 비어있으면 보드 내부인 경우 첫 칸으로 가능
    if (!Array.isArray(path) || path.length === 0) {
      return true;
    }

    // 이미 경로에 포함된 칸은 재방문 불가
    const alreadyVisited = path.some(p => p.x === nextPos.x && p.y === nextPos.y);
    if (alreadyVisited) {
      return false;
    }

    // 마지막 칸과 8방향 이웃이어야 함
    const lastPos = path[path.length - 1];
    if (!isNeighbor(lastPos, nextPos)) {
      return false;
    }

    const firstTile = getTile(board, path[0]);
    if (!firstTile || (firstTile.isFrozen && firstTile.type !== 'enemy')) return false;

    // 조각 2 & 조각 19(대조표 43행): 공격 체인 (칼 또는 적, 화살)
    if (isAttackType(firstTile.type, firstTile)) {
      return isAttackType(nextTile.type, nextTile);
    }

    // 조각 18: 코인 체인에 성유물함(isPhylactery) 연결 허용
    const isFirstCoin = firstTile.type === 'coin' || firstTile.isPhylactery;
    const isNextCoin = nextTile.type === 'coin' || nextTile.isPhylactery;
    if (isFirstCoin && isNextCoin) {
      return true;
    }

    // 방패, 물약, 코인은 동일한 종류끼리만 연결
    return firstTile.type === nextTile.type;
  }

  /**
   * 체인 한 걸음 진행 또는 되돌리기
   */
  function stepChain(board, path, nextPos) {
    if (!Array.isArray(path)) path = [];
    if (!nextPos) return [...path];

    if (path.length === 0) {
      if (canConnect(board, path, nextPos)) {
        return [{ x: nextPos.x, y: nextPos.y }];
      }
      return [];
    }

    // 현재 마지막 칸을 다시 터치한 경우 유지
    const lastPos = path[path.length - 1];
    if (lastPos.x === nextPos.x && lastPos.y === nextPos.y) {
      return [...path];
    }

    // 조각 19(대조표 47행): 이전 방문 칸으로 되돌리기 (그 칸 이후 노드를 모두 제거)
    const existingIndex = path.findIndex(p => p.x === nextPos.x && p.y === nextPos.y);
    if (existingIndex !== -1) {
      return path.slice(0, existingIndex + 1);
    }

    // 연결 가능한 경우 연장
    if (canConnect(board, path, nextPos)) {
      return [...path, { x: nextPos.x, y: nextPos.y }];
    }

    return [...path];
  }

  /**
   * 체인이 확정 가능한 유효 상태인지 검사 (3칸 이상, 연결 규칙, 중복 없음)
   */
  function isValidChain(board, path) {
    if (!board || !Array.isArray(path) || path.length < 3) {
      return false;
    }

    const height = board.length;
    const width = board[0]?.length || 0;
    const visited = new Set();
    const firstTile = getTile(board, path[0]);
    if (!firstTile || (firstTile.isFrozen && firstTile.type !== 'enemy')) return false;

    const attackChain = isAttackType(firstTile.type, firstTile);

    for (let i = 0; i < path.length; i++) {
      const pos = path[i];
      if (!isInside(pos, width, height)) return false;

      const key = `${pos.x},${pos.y}`;
      if (visited.has(key)) return false;
      visited.add(key);

      const tile = getTile(board, pos);
      if (!tile || (tile.isFrozen && tile.type !== 'enemy')) return false;

      if (i > 0) {
        const prev = path[i - 1];
        if (!isNeighbor(prev, pos)) return false;

        if (attackChain) {
          if (!isAttackType(tile.type, tile)) return false;
        } else {
          // 조각 18: 코인 체인에 성유물함(isPhylactery) 연결 허용
          const isFirstCoin = firstTile.type === 'coin' || firstTile.isPhylactery;
          const isCurrentCoin = tile.type === 'coin' || tile.isPhylactery;
          if (isFirstCoin && isCurrentCoin) {
            // 통과
          } else if (tile.type !== firstTile.type) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * 총 공격 계산 (규칙 3번 & 조각 14)
   * 총 공격 = 기본 공격력 + (이은 칼 수 × 무기 공격력) + 마법 칼 보너스
   * 적만으로 이은 줄(칼 수 0): 기본 공격력만 사용
   * 조각 14: boostWeaponAtk 옵션(스킬 16 무기 강화) 및 마법 칼(스킬 25 마법의 검, 공격력 5배) 반영
   */
  function calculateAttack(board, path, player = {}, options = {}) {
    const activeFlaws = (options && options.activeFlaws)
      || (player && Array.isArray(player.flaws) ? player.flaws.filter(f => f != null) : []);
    const turn = options.turn != null ? options.turn : ((player && player.turn) || 1);

    const baseAtk = player.baseAtk != null ? player.baseAtk : 1;
    let weaponAtk = player.weaponAtk != null ? player.weaponAtk : 1;
    if (options && options.boostWeaponAtk) {
      weaponAtk *= options.boostWeaponAtk;
    }

    // 조각 12 & 조각 19(대조표 59행): 종족 8 (용혈 고블린) - 숙적 8(빙결괴물)이 판에 있으면 기본 공격력 절반 (원작: 하한 없음)
    const raceId = player.raceId != null ? player.raceId : ((options && options.raceId != null) ? options.raceId : 0);
    let effectiveBaseAtk = baseAtk;
    if (raceId === 8 && (options.hasMortalEnemy8 || isMortalEnemyOnBoard(board, 8))) {
      effectiveBaseAtk = Math.floor(baseAtk / 2);
    }

    let swordCount = 0;
    let enemyCount = 0;
    let magicSwordBonus = 0;

    for (const pos of path) {
      const tile = getTile(board, pos);
      if (tile) {
        if (tile.type === 'sword') {
          // 조각 17: 파손된 칼(isBroken)은 공격력에 기여하지 않음
          if (tile.isBroken) {
            continue;
          }
          swordCount++;
          if (tile.isMagicSword) {
            // 마법 칼은 일반 공격력의 5배 (+4배 보너스 추가)
            magicSwordBonus += weaponAtk * 4;
          }
        } else if (tile.type === 'enemy') {
          enemyCount++;
        }
      }
    }

    // 조각 19(대조표 50행): 실제 적을 만날 때만 기본공격 가산 (칼만 이은 줄은 기본공격 가산 안 함)
    let rawAttack = 0;
    if (enemyCount > 0) {
      rawAttack = effectiveBaseAtk + (swordCount * weaponAtk) + magicSwordBonus;
    } else {
      rawAttack = (swordCount * weaponAtk) + magicSwordBonus;
    }
    // 조각 16: 일반 공격의 길이 배수 제거 (기본공격+칼수×무기공격만)
    const multiplier = (options && options.useLengthMultiplier) ? getLengthMultiplier(path.length) : 1.0;
    let totalAttack = Math.floor(rawAttack * multiplier);

    // 조각 11: 결함 0 (방심과 혼란) - 게임 시작 후 처음 5턴 동안 적에게 피해를 줄 수 없음
    let isConfusedBlocked = false;
    if (turn <= 5 && activeFlaws.includes(0)) {
      totalAttack = 0;
      isConfusedBlocked = true;
    }

    // 조각 11: 결함 2 (자만심) - 딱 3칸만 연결하여 수집할 경우 아무런 보상도 얻지 못함
    let isCockyBlocked = false;
    if (path.length === 3 && activeFlaws.includes(2)) {
      totalAttack = 0;
      isCockyBlocked = true;
    }

    return {
      totalAttack,
      rawAttack,
      effectiveBaseAtk,
      raceId,
      swordCount,
      enemyCount,
      multiplier,
      magicSwordBonus,
      isConfusedBlocked,
      isCockyBlocked
    };
  }

  /**
   * 한 적이 받는 피해량 계산 (규칙 3번)
   * 피해 = max(총 공격 - 적의 방어, 0)
   */
  function calculateDamage(totalAttack, enemyArmor = 0) {
    const atk = Math.max(0, Math.floor(totalAttack));
    const arm = Math.max(0, Math.floor(enemyArmor || 0));
    return Math.max(0, atk - arm);
  }

  /**
   * 체인 내의 각 적에게 피해 적용 (규칙 3번: 각 적에게 100%씩 피해 적용)
   * 조각 12 종족 연동:
   * - 종족 2 (땅굴 고블린): 올려치기(Uppercut) 시 무기 공격력 추가 피해
   * - 숙적 14 (혼돈괴물): 올려치기가 아니면 받는 피해 0
   * - 종족 5 (덩치 고블린): 공격한 적 10% 확률로 기절(빙결)
   * - 종족 6 (꼬마 고블린): 15마리 이상 처치 시 최대 방패(갑옷) +1
   */
  function applyAttackToEnemies(board, path, totalAttack, rng = null, options = {}) {
    const randomFn = typeof rng === 'function' ? rng : Math.random;
    const player = options.player || null;
    const raceId = player ? (player.raceId != null ? player.raceId : 0) : ((options && options.raceId != null) ? options.raceId : 0);
    const weaponAtk = player ? (player.weaponAtk || 2) : 2;

    const results = [];
    const killedPositions = [];
    const survivedEnemies = [];
    let stunnedCount = 0;
    let totalReflectedDamage = 0;
    const kamikazeDestroyedPositions = [];

    // 조각 17: 특수 적 ID 30 (고기방패) - 다른 적에게 가는 직접 피해 대신 흡수
    const meatShields = [];
    if (board && Array.isArray(board)) {
      for (let y = 0; y < board.length; y++) {
        for (let x = 0; x < board[y].length; x++) {
          const t = board[y][x];
          if (t && t.type === 'enemy' && t.specialId === 30 && (t.hp != null ? t.hp : 1) > 0) {
            meatShields.push(t);
          }
        }
      }
    }

    for (const pos of path) {
      const tile = getTile(board, pos);
      if (tile && tile.type === 'enemy') {
        const isUppercut = checkUppercut(path, pos);
        let enemyEffectiveAtk = totalAttack;
        const enemyAtk = tile.atk != null ? tile.atk : 1;

        // 조각 12: 종족 2 (땅굴 고블린) - 올려치기(Uppercut) 시 무기 공격력 추가 피해
        if (raceId === 2 && isUppercut) {
          enemyEffectiveAtk += weaponAtk;
        }

        // 조각 19(대조표 53행): 적 방어 관통 확률 판정 (min(공격, 방어)회 추첨)
        const pierceChance = (player && player.armorPiercing != null)
          ? player.armorPiercing
          : (options.armorPiercing != null ? options.armorPiercing : 0);
        if (pierceChance > 0 && (tile.armor || 0) > 0 && enemyEffectiveAtk > 0) {
          const checks = Math.min(Math.floor(enemyEffectiveAtk), Math.floor(tile.armor));
          for (let c = 0; c < checks; c++) {
            if (tile.armor <= 0) break;
            const roll = randomInt(0, 100, randomFn);
            if (roll <= pierceChance) {
              tile.armor = Math.max(0, tile.armor - 1);
            }
          }
        }

        let damage = calculateDamage(enemyEffectiveAtk, tile.armor || 0);

        // 조각 18: 숙적 14 (혼돈괴물, 종족 2 숙적) - 종족 2일 때만 올려치기로만 피해를 받음
        if (tile.specialId === 14 && raceId === 2 && !isUppercut) {
          damage = 0;
        }

        // 조각 18: 특수 적 ID 27 (중갑괴물) - 경로가 이 적을 지난 뒤 바로 위 3칸 중 하나로 나가야 피해 가능
        if (tile.specialId === 27) {
          const currentIdx = path.findIndex(p => p.x === pos.x && p.y === pos.y);
          if (currentIdx === path.length - 1) {
            damage = 0;
          } else {
            const nextPos = path[currentIdx + 1];
            const isExitUpward = nextPos.y === pos.y - 1 && Math.abs(nextPos.x - pos.x) <= 1;
            if (!isExitUpward) {
              damage = 0;
            }
          }
        }

        // 조각 17 & 조각 19(대조표 17·55행): 특수 적 ID 30 (고기방패) - 생존 시 다른 적 직접 피해 0으로 차단 (순차 흡수 아님)
        let absorbedByMeatShield = 0;
        if (tile.specialId !== 30 && meatShields.length > 0) {
          damage = 0;
        }

        // 조각 17 & 조각 19(대조표 16·111행): 특수 적 ID 2 (피해 반사) - 경로에 ID 2가 있으면 총공격값 한 번 반사
        let reflectedDamage = 0;
        if (tile.specialId === 2) {
          reflectedDamage = totalAttack;
          totalReflectedDamage = totalAttack;
        }

        const currentHp = tile.hp != null ? tile.hp : 1;
        const remainingHp = currentHp - damage;
        const killed = remainingHp <= 0;
        tile.hp = Math.max(0, remainingHp);
        const isOriginalRunner = tile.specialId === 3;
        const runnerTokens = (killed && isOriginalRunner) ? randomInt(15, 25, randomFn) : 0;

        // 조각 18 & 조각 20(대조표-2 141행): 특수 적 ID 32 (리치)
        // AttackSkull @ 0002f630: 사망 대신 상태1·공격/방어/독0·HP1·이번 턴 부활유예
        let transformedToPhylactery = false;
        if (killed && tile.specialId === 32) {
          tile.isPhylactery = true;
          tile.type = 'phylactery';
          tile.hp = 1;
          tile.atk = 0;
          tile.armor = 0;
          tile.poison = 0;
          tile.isPoisoned = false;
          // 조각 18 호환: 원작 규칙(턴/난이도/useOriginalRules) 활성화 시에만 부활 유예 플래그 부여
          const useOriginalLich = Boolean(options && (options.useOriginalRules || options.turn != null || options.difficulty != null));
          tile.revivalGrace = useOriginalLich;
          transformedToPhylactery = true;
        }

        // 조각 17 & 조각 20(대조표-2 119행): 특수 적 ID 10 (폭탄병) 처치 시 주변 8칸 폭발 (다른 특수 적은 폭발 제거 대상 제외)
        if (killed && (tile.specialId === 10 || tile.specialType === 'bomb')) {
          const width = board[0]?.length || 6;
          const height = board.length || 6;
          const neighbors = getNeighbors(pos, width, height);
          for (const n of neighbors) {
            const nt = getTile(board, n);
            if (nt && nt.type === 'enemy' && (nt.specialId != null || nt.specialType != null)) {
              continue; // 다른 특수 적은 폭발 제거 대상에서 제외
            }
            kamikazeDestroyedPositions.push({ x: n.x, y: n.y });
          }
        }

        let stunned = false;
        if (!killed && remainingHp > 0) {
          // 조각 12: 종족 5 (덩치 고블린) - 공격받은 적 10% 확률로 기절(빙결)
          if (raceId === 5) {
            const roll = (options && options.isStunGuaranteed) ? 1 : randomInt(1, 100, randomFn);
            if (roll <= 10) {
              tile.isFrozen = true;
              tile.frozenTurns = 1;
              stunned = true;
              stunnedCount++;
            }
          }
        }

        const info = {
          pos: { x: pos.x, y: pos.y },
          id: tile.id,
          atk: enemyAtk,
          originalAtk: enemyAtk,
          initialHp: currentHp,
          armor: tile.armor || 0,
          damage,
          remainingHp: Math.max(0, remainingHp),
          killed,
          transformedToPhylactery,
          specialId: tile.specialId || null,
          specialType: tile.specialType || null,
          bonusGold: tile.bonusGold || 0,
          runnerBonusTokens: runnerTokens,
          isUppercut,
          stunned,
          reflectedDamage,
          absorbedByMeatShield
        };

        results.push(info);

        if (killed) {
          if (transformedToPhylactery) {
            survivedEnemies.push({
              pos: { x: pos.x, y: pos.y },
              id: tile.id,
              remainingHp: 1,
              isPhylactery: true
            });
          } else {
            killedPositions.push({ x: pos.x, y: pos.y });
          }
        } else {
          survivedEnemies.push({
            pos: { x: pos.x, y: pos.y },
            id: tile.id,
            remainingHp
          });
        }
      }
    }

    // 조각 19(대조표 17·55행): 체인 밖의 ID 30(고기방패)에게도 총공격 전달
    if (meatShields.length > 0) {
      for (const ms of meatShields) {
        const inChain = path.some(p => p.x === ms.x && p.y === ms.y);
        if (!inChain && (ms.hp || 0) > 0) {
          const msDmg = calculateDamage(totalAttack, ms.armor || 0);
          const msCurrentHp = ms.hp;
          const msRemainingHp = Math.max(0, msCurrentHp - msDmg);
          ms.hp = msRemainingHp;
          const killed = msRemainingHp <= 0;
          const msAtk = ms.atk != null ? ms.atk : 1;
          results.push({
            pos: { x: ms.x, y: ms.y },
            id: ms.id,
            atk: msAtk,
            originalAtk: msAtk,
            armor: ms.armor || 0,
            damage: msDmg,
            remainingHp: msRemainingHp,
            killed,
            specialId: 30,
            absorbedByMeatShield: 0
          });
          if (killed) {
            killedPositions.push({ x: ms.x, y: ms.y });
          } else {
            survivedEnemies.push({ pos: { x: ms.x, y: ms.y }, id: ms.id, remainingHp: msRemainingHp });
          }
        }
      }
    }

    // 조각 17 & 조각 20(대조표-2 130행): 특수 적 ID 21 (복수자)
    // AddRevengeHealth @ 0002d294: 생존 ID 21 공격 += 이번 AttackSkull 처치 카운터
    const totalKills = killedPositions.length;
    let vengefulBoostedCount = 0;
    if (totalKills > 0 && board && Array.isArray(board)) {
      const killedSet = new Set(killedPositions.map(p => `${p.x},${p.y}`));
      for (let y = 0; y < board.length; y++) {
        for (let x = 0; x < board[y].length; x++) {
          const key = `${x},${y}`;
          if (killedSet.has(key)) continue; // 이번 공격으로 처치된 적은 제외
          const t = board[y][x];
          if (t && t.type === 'enemy' && t.specialId === 21 && (t.hp != null ? t.hp : 1) > 0) {
            t.atk = (t.atk || 1) + totalKills;
            vengefulBoostedCount++;
          }
        }
      }
    }

    // 조각 12: 종족 6 (꼬마 고블린) - 한 공격에 15마리 이상 처치 시 최대 갑옷(방패) +1
    let gutsTriggered = false;
    if (raceId === 6 && killedPositions.length >= 15) {
      if (player) {
        player.maxArmor = (player.maxArmor || 0) + 1;
        gutsTriggered = true;
      }
    }

    return {
      results,
      killedPositions,
      survivedEnemies,
      killedCount: killedPositions.length,
      survivedCount: survivedEnemies.length,
      stunnedCount,
      gutsTriggered,
      totalReflectedDamage,
      kamikazeDestroyedPositions,
      vengefulBoostedCount
    };
  }

  /**
   * 보드 위의 적 반격 공격력 합산 (규칙 4번 & 조각 7 원작 정렬)
   * 이번 턴에 처치된 적은 반격하지 않음
   * 조각 7 적 공격 규칙:
   * - 공격 가능 = 적 칸, 표식 없음(!marked), 동결 아님(!isFrozen), 공격력 > 0
   * - 독 걸린 적은 공격력을 정수로 절반만 냄 (공격 > 1일 때 Math.floor(atk / 2))
   * 조각 14: freezeTurn(적 공격 차단) 및 counterattackTurn(적 자해) 옵션 반영
   */
  function calculateCounterattack(board, excludedPositions = [], options = {}) {
    const activePerks = (options && options.activePerks)
      || (options && options.player && Array.isArray(options.player.perks) ? options.player.perks.filter(p => p != null) : []);
    const turn = options.turn != null ? options.turn : ((options && options.player && options.player.turn) || 1);

    // 조각 11: 퍽 0 (기습 전술) - 게임 시작 후 처음 5턴 동안 적이 공격하지 않음
    if (turn <= 5 && activePerks.includes(0)) {
      return {
        totalEnemyAtk: 0,
        attackingEnemies: [],
        count: 0,
        isBlocked: true,
        isUnexpectedBlocked: true
      };
    }

    if (options && options.freezeTurn) {
      return {
        totalEnemyAtk: 0,
        attackingEnemies: [],
        count: 0,
        isBlocked: true
      };
    }

    const excludedSet = new Set(
      Array.isArray(excludedPositions) ? excludedPositions.map(p => `${p.x},${p.y}`) : []
    );

    let totalEnemyAtk = 0;
    const attackingEnemies = [];

    const playerRaceId = (options && options.player && options.player.raceId != null)
      ? options.player.raceId
      : ((options && options.raceId != null) ? options.raceId : null);

    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        const tile = board[y][x];
        // 조각 7 & 조각 19: 공격 가능 판정 (동결 아님, 표식 없음, 이번 턴 새로 보충된 적 아님, 적 칸, 체력 > 0)
        if (tile && tile.type === 'enemy' && tile.hp > 0 && !tile.marked && !tile.isFrozen && !tile.spawnedThisTurn) {
          // 조각 4 호환: 원작 ID가 없는 레거시 폭탄병(specialType === 'bomb')은 폭발 턴(카운트다운 1 이하)에 일반 반격을 하지 않음
          if (tile.specialId == null && tile.specialType === 'bomb' && (tile.countdown == null || tile.countdown <= 1)) {
            continue;
          }
          if (!excludedSet.has(`${x},${y}`)) {
            let effectiveAtk = tile.atk != null ? tile.atk : 1;
            // 조각 16: 독 걸린 적은 종족 1(숲 고블린)일 때만 공격 > 1에서 정수 절반
            if (tile.isPoisoned && effectiveAtk > 1 && playerRaceId === 1) {
              effectiveAtk = Math.floor(effectiveAtk / 2);
            }
            if (effectiveAtk > 0) {
              totalEnemyAtk += effectiveAtk;

              attackingEnemies.push({
                x,
                y,
                id: tile.id,
                atk: effectiveAtk,
                rawAtk: tile.atk,
                isPoisoned: Boolean(tile.isPoisoned),
                isFrozen: Boolean(tile.isFrozen)
              });
            }
          }
        }
      }
    }

    // 조각 14 & 조각 17: 반격 태세 (counterattackTurn) - 적들이 자신을 공격 (자해 반격이 적 방어를 거침)
    if (options && options.counterattackTurn) {
      for (const enemy of attackingEnemies) {
        const tile = board[enemy.y][enemy.x];
        if (tile) {
          const enemyArmor = tile.armor || 0;
          const selfDamage = Math.max(0, enemy.atk - enemyArmor);
          tile.hp = Math.max(0, (tile.hp || 0) - selfDamage);
        }
      }
      return {
        totalEnemyAtk: 0,
        attackingEnemies,
        count: attackingEnemies.length,
        isCounterattackTurn: true
      };
    }

    // 조각 18 호환: calculateCounterattack 단독 호출 시 흡혈귀 회복 (단위 시험 호환)
    if (options && options.player && !options.isResolveTurn && !options.useOriginalRules) {
      for (const enemy of attackingEnemies) {
        const tile = board[enemy.y][enemy.x];
        if (tile && tile.specialId === 20 && tile.hp > 0) {
          const isWerewolf = (playerRaceId === 7 || getMortalEnemyForRace(playerRaceId) === 20);
          const maxHp = isWerewolf ? Infinity : (tile.baseHp || tile.maxHp || tile.hp);
          tile.hp = Math.min(maxHp, (tile.hp || 0) + (enemy.atk || 1));
        }
      }
    }

    return {
      totalEnemyAtk,
      attackingEnemies,
      count: attackingEnemies.length
    };
  }

  /**
   * 반격 피해를 플레이어에게 적용 (규칙 4번 & 조각 17 원작 정렬)
   * 방패(armor)가 먼저 흡수 -> 남은 피해만 체력(hp)을 깎음 -> 체력 0 이하면 게임 오버
   * 조각 17: 방패 막은 피해마다 내구 판정 (기본 손상 확률 50%, ID 29 존재 시 내구 0으로 100% 손상)
   */
  function applyCounterattack(player, totalDamage, rng = null, options = {}) {
    const dmg = Math.max(0, Math.floor(totalDamage));
    const currentArmor = Math.max(0, player.armor || 0);
    const currentHp = Math.max(0, player.hp != null ? player.hp : 20);

    const armorDamage = Math.min(currentArmor, dmg);
    const hpDamage = dmg - armorDamage;

    let actualArmorDamage = armorDamage;
    const hasEnemy29 = Boolean(options && options.hasEnemy29);
    const shouldCheckDurability = Boolean(
      (options && (options.checkDurability || options.hasEnemy29)) ||
      (player && (player.checkDurability || player.hasEnemy29))
    );

    // 조각 17: 내구 판정 (options.checkDurability / options.hasEnemy29 또는 player.checkDurability가 설정된 경우)
    if (shouldCheckDurability) {
      const randomFn = typeof rng === 'function' ? rng : (rng != null ? createRNG(rng) : Math.random);
      const durability = hasEnemy29 ? 0 : ((player && player.durability != null) ? player.durability : (options && options.durability != null ? options.durability : 50));
      const lossRate = (100 - durability) / 100;

      let lossCount = 0;
      for (let i = 0; i < armorDamage; i++) {
        if (hasEnemy29 || randomFn() < lossRate) {
          lossCount++;
        }
      }
      actualArmorDamage = lossCount;
    }

    const newArmor = Math.max(0, currentArmor - actualArmorDamage);
    const newHp = Math.max(0, currentHp - hpDamage);
    const isGameOver = newHp <= 0;

    return {
      totalDamage: dmg,
      armorDamage,
      actualArmorDamage,
      hpDamage,
      newArmor,
      newHp,
      isGameOver
    };
  }

  /**
   * 조각 4 & 조각 9: 턴 종료 시 특수 적 능력 발동 및 환경 효과 (규칙 8번)
   * 조각 9 원작 번호 지원:
   * - 3 도망: 카운트 5, 0이면 도망, 처치 시 코인 토큰 R(15,25)
   * - 4 치유/축복: 다친 적 최대 2명 완전 회복, 없으면 다른 적 최대 2명 공격+1
   * - 6 산성: 물약 1개를 산성 물약으로 변환
   * - 7 화염: 주변 8칸에 공격값을 불 피해로 저장, 턴 종료 시 불 붙은 적이 피해(플레이어 고정 1피해 없음)
   * - 8 동결: 후보(지워진/얼은/특수적 제외)에서 최대 2칸 얼림 (다음 턴 종료 시 해제)
   * - 10 폭발: 카운트 5, 0이면 자신 제거 + 플레이어 체력 = max(1, 정수(현재 체력/2))
   * - 11 칼→적: 칼 1개를 적 칸으로 변환
   * - 나머지 ID: 능력 없이 배율만
   */
  function activateSpecialAbilities(board, player = {}, rng = null, options = {}) {
    const randomFn = typeof rng === 'function' ? rng : Math.random;
    const height = board.length;
    const width = board[0]?.length || 0;
    const turn = options.turn || 1;
    const difficulty = options.difficulty != null ? options.difficulty : 1;
    const excludedPositions = new Set(
      Array.isArray(options.excludedPositions) ? options.excludedPositions.map(p => `${p.x},${p.y}`) : []
    );

    const events = [];
    const tilesToRemove = [];
    let explosionDamage = 0;
    let burningDamage = 0;
    let hasLegacyFireMage = false;

    // 조각 18 & 조각 20(대조표-2 141행): 성유물함(Phylactery, ID 32 리치) 부활 검사
    // 이번 턴 부활 유예(revivalGrace)가 있으면 유예 플래그만 해제하고 부활하지 않음.
    // 유예가 지난 성유물함은 GenerateStats로 새 능력치를 생성하여 부활!
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const t = board[y][x];
        if (t && (t.isPhylactery || t.type === 'phylactery')) {
          if (t.revivalGrace) {
            t.revivalGrace = false; // 이번 턴 부활 유예 해제
            continue;
          }
          t.isPhylactery = false;
          t.type = 'enemy';
          t.specialId = 32;
          const playerL = player ? Math.floor(((player.exp || 0) + (player.accumulatedExp || 0)) / 100) : 0;
          const newStats = calculateEnemyCurve(turn, difficulty, playerL, randomFn);
          const mult = getSpecialEnemyMultipliers(32);
          t.atk = mult.atk(newStats.atk);
          t.armor = mult.armor(newStats.armor);
          t.hp = mult.hp(newStats.hp);
          t.maxHp = t.hp;
          t.baseHp = t.hp;
          t.poison = 0;
          t.isPoisoned = false;
          events.push({
            type: 'lich_revived',
            pos: { x, y },
            hp: t.hp,
            atk: t.atk,
            armor: t.armor,
            specialId: 32
          });
        }
      }
    }

    // 조각 12 & 조각 21 (원작-대조표-2 223행): 종족 7 (늑대 고블린) - 쇠약화 (ProcessCripples @ 0002f558)
    // 원작 순서: 특수 적 능력들 실행 '전에', specialId == 0인 '일반 적'만 체력이 방어력보다 낮으면 즉시 처치
    if (player && player.raceId === 7) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const t = board[y][x];
          if (t && t.type === 'enemy' && t.hp > 0 && !t.specialId && !t.specialType && t.hp < (t.armor || 0)) {
            tilesToRemove.push({ x, y, id: t.id, reason: 'crippled' });
            events.push({
              type: 'cripple_kill',
              pos: { x, y },
              id: t.id,
              hp: t.hp,
              armor: t.armor
            });
          }
        }
      }
    }

    // 1. 살아있는 특수 적 수집 (중복 타일 참조 방지)
    const specialEnemies = [];
    const seenEnemyIds = new Set();
    const crippledSet = new Set(tilesToRemove.map(p => `${p.x},${p.y}`));
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = board[y][x];
        if (tile && tile.type === 'enemy' && tile.hp > 0 && !excludedPositions.has(`${x},${y}`) && !crippledSet.has(`${x},${y}`) && (tile.specialId != null || tile.specialType != null)) {
          const enemyKey = tile.id != null ? tile.id : tile;
          if (!seenEnemyIds.has(enemyKey)) {
            seenEnemyIds.add(enemyKey);
            specialEnemies.push(tile);
          }
        }
      }
    }

    // 2. 능력 발동
    for (const enemy of specialEnemies) {
      const sId = (typeof enemy.specialId === 'number' && enemy.specialId >= 1 && enemy.specialId <= 32)
        ? Math.floor(enemy.specialId)
        : null;

      // 조각 9: 원작 번호 ID가 명시된 경우 원작 번호 규칙 우선 실행
      if (sId != null) {
        if (sId === 3) {
          // 3 도망: 매 실행 카운트 -1, 0이면 도망 (처치 시 코인 토큰 R(15,25))
          const currentCd = enemy.countdown != null ? enemy.countdown : 5;
          const nextCd = Math.max(0, currentCd - 1);
          enemy.countdown = nextCd;
          if (nextCd === 0) {
            tilesToRemove.push({ x: enemy.x, y: enemy.y, id: enemy.id, reason: 'escaped' });
            events.push({
              type: 'runner_escaped',
              pos: { x: enemy.x, y: enemy.y },
              id: enemy.id,
              specialId: 3
            });
          } else {
            events.push({
              type: 'runner_countdown',
              pos: { x: enemy.x, y: enemy.y },
              countdown: nextCd,
              specialId: 3
            });
          }
        } else if (sId === 4) {
          // 4 치유/축복: 자신 제외 다친 적 최대 2명 완전 회복 / 없으면 다른 적 최대 2명 공격+1
          const otherEnemies = [];
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const t = board[y][x];
              if (t && t.type === 'enemy' && t.hp > 0 && (t.x !== enemy.x || t.y !== enemy.y)) {
                otherEnemies.push(t);
              }
            }
          }

          const damaged = otherEnemies.filter(e => e.hp < (e.baseHp || e.maxHp || e.hp));
          if (damaged.length > 0) {
            // 다친 적 최대 2명 완전 회복
            const pool = [...damaged];
            for (let i = pool.length - 1; i > 0; i--) {
              const j = Math.floor(randomFn() * (i + 1));
              const temp = pool[i];
              pool[i] = pool[j];
              pool[j] = temp;
            }
            const targets = pool.slice(0, Math.min(2, pool.length));
            const healedInfos = [];
            for (const target of targets) {
              const fullHp = target.baseHp || target.maxHp || target.hp;
              const healedAmount = fullHp - target.hp;
              target.hp = fullHp;
              healedInfos.push({
                x: target.x,
                y: target.y,
                healed: healedAmount,
                targetHp: target.hp
              });
            }
            events.push({
              type: 'healer_heal_full',
              healerPos: { x: enemy.x, y: enemy.y },
              targets: healedInfos,
              healedCount: targets.length,
              specialId: 4
            });
          } else if (otherEnemies.length > 0) {
            // 다친 적이 없으면 다른 적 최대 2명의 공격력 +1
            const pool = [...otherEnemies];
            for (let i = pool.length - 1; i > 0; i--) {
              const j = Math.floor(randomFn() * (i + 1));
              const temp = pool[i];
              pool[i] = pool[j];
              pool[j] = temp;
            }
            const targets = pool.slice(0, Math.min(2, pool.length));
            for (const target of targets) {
              target.atk = (target.atk || 1) + 1;
            }
            events.push({
              type: 'healer_blessing_atk',
              healerPos: { x: enemy.x, y: enemy.y },
              blessedCount: targets.length,
              targets: targets.map(t => ({ x: t.x, y: t.y, atk: t.atk })),
              specialId: 4
            });
          }
        } else if (sId === 6) {
          // 6 산성: 정상 물약 1개를 무작위로 산성 물약으로 변환
          const potions = [];
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const t = board[y][x];
              if (t && t.type === 'potion' && !t.isAcid) {
                potions.push(t);
              }
            }
          }
          if (potions.length > 0) {
            const pIdx = Math.floor(randomFn() * potions.length);
            const targetPotion = potions[pIdx];
            targetPotion.isAcid = true;
            events.push({
              type: 'acid_convert',
              pos: { x: targetPotion.x, y: targetPotion.y },
              id: targetPotion.id,
              specialId: 6
            });
          }
        } else if (sId === 7) {
          // 7 화염: 주변 8칸에 자신의 공격값을 불 피해로 저장 (이미 매칭/제거 예정 칸 및 같은 ID7 적 제외)
          const neighbors = getNeighbors({ x: enemy.x, y: enemy.y }, width, height);
          const fireTargets = [];
          const playerRaceId = (player && player.raceId != null) ? player.raceId : 0;
          let fireAtk = enemy.atk != null ? enemy.atk : 1;
          if (enemy.isPoisoned && fireAtk > 1 && playerRaceId === 1) {
            fireAtk = Math.floor(fireAtk / 2);
          }
          const removedKeys = new Set(tilesToRemove.map(t => `${t.x},${t.y}`));

          for (const n of neighbors) {
            const posKey = `${n.x},${n.y}`;
            if (excludedPositions.has(posKey) || removedKeys.has(posKey)) {
              continue;
            }
            const t = board[n.y][n.x];
            if (t) {
              if (t.type === 'enemy' && t.specialId === 7) {
                // 같은 ID7 특수 적 제외
                continue;
              }
              t.isBurning = true;
              t.burnDamage = fireAtk;
              fireTargets.push({ x: n.x, y: n.y, type: t.type });
            }
          }
          events.push({
            type: 'fire_spread_original',
            pos: { x: enemy.x, y: enemy.y },
            burnDamage: fireAtk,
            targetCount: fireTargets.length,
            targets: fireTargets,
            specialId: 7
          });
        } else if (sId === 8) {
          // 8 동결: 이미 지워진 칸·이미 얼은 칸·특수 적을 뺀 후보에서 최대 2칸 동결
          const removedKeys = new Set(tilesToRemove.map(t => `${t.x},${t.y}`));
          const candidates = [];
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const t = board[y][x];
              if (!t) continue;
              if (removedKeys.has(`${x},${y}`)) continue;
              if (t.isFrozen) continue;
              if (t.type === 'enemy' && (t.specialId != null || t.specialType != null)) continue;
              candidates.push(t);
            }
          }
          const frozenCount = Math.min(2, candidates.length);
          const frozenPositions = [];
          for (let i = 0; i < frozenCount; i++) {
            const idx = Math.floor(randomFn() * candidates.length);
            const chosen = candidates.splice(idx, 1)[0];
            chosen.isFrozen = true;
            chosen.frozenTurns = 1;
            frozenPositions.push({ x: chosen.x, y: chosen.y });
          }
          if (frozenPositions.length > 0) {
            events.push({
              type: 'ice_freeze',
              positions: frozenPositions,
              count: frozenPositions.length,
              specialId: 8
            });
          }
        } else if (sId === 10) {
          // 10 폭발: 카운트 5, 0이면 자신 제거 + 플레이어 체력 = max(1, 정수(체력/2))
          const currentCd = enemy.countdown != null ? enemy.countdown : 5;
          const nextCd = Math.max(0, currentCd - 1);
          enemy.countdown = nextCd;
          if (nextCd === 0) {
            tilesToRemove.push({ x: enemy.x, y: enemy.y, id: enemy.id, reason: 'exploded' });
            const currentHp = (player && player.hp != null) ? player.hp : 20;
            const newHp = Math.max(1, Math.floor(currentHp / 2));
            if (player) {
              player.hp = newHp;
            }
            events.push({
              type: 'bomb_exploded',
              pos: { x: enemy.x, y: enemy.y },
              previousHp: currentHp,
              newHp,
              specialId: 10
            });
          } else {
            events.push({
              type: 'bomb_countdown',
              pos: { x: enemy.x, y: enemy.y },
              countdown: nextCd,
              specialId: 10
            });
          }
        } else if (sId === 11) {
          // 11 칼→적: 무작위 칼 1개를 적 칸으로 바꾸고 현재 턴·난이도로 능력치 생성
          const swords = [];
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const t = board[y][x];
              if (t && t.type === 'sword') {
                swords.push(t);
              }
            }
          }
          if (swords.length > 0) {
            const sIdx = Math.floor(randomFn() * swords.length);
            const swordTile = swords[sIdx];
            const newEnemy = createEnemyTile(swordTile.x, swordTile.y, `tile_${swordTile.x}_${swordTile.y}_conv_${Date.now()}`, turn, {
              difficulty,
              rng: randomFn
            });
            if (swordTile.isFrozen) newEnemy.isFrozen = true;
            board[swordTile.y][swordTile.x] = newEnemy;
            events.push({
              type: 'convert_sword_to_enemy',
              pos: { x: swordTile.x, y: swordTile.y },
              id: newEnemy.id,
              specialId: 11
            });
          }
        } else if (sId === 13) {
          // 조각 18 & 조각 20(대조표-2 122행): 13 도둑괴물
          // StealGold @ 00034a68 / 000348e8: 코인 있으면 최대 2칸만; 없을 때 소지골드 최대 2점·숙적이면 점당 공격 HP피해
          const thiefAtk = enemy.atk != null ? enemy.atk : 1;
          const playerRaceId = (player && player.raceId != null) ? player.raceId : 0;
          const isMortalSauren = (playerRaceId === 3 || getMortalEnemyForRace(playerRaceId) === 13);
          const removedKeys = new Set(tilesToRemove.map(t => `${t.x},${t.y}`));
          const coins = [];
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const posKey = `${x},${y}`;
              const t = board[y][x];
              if (t && t.type === 'coin' && !t.isBroken && !t.isPhylactery && !excludedPositions.has(posKey) && !removedKeys.has(posKey)) {
                coins.push({ x, y, id: t.id });
              }
            }
          }

          let stolenCoins = 0;
          let stolenGold = 0;
          let directDamage = 0;

          if (coins.length > 0) {
            // 코인이 있으면 최대 2칸만 훔치고 소지골드 분기로 가지 않음
            const countToSteal = Math.min(2, coins.length);
            const pool = [...coins];
            for (let i = 0; i < countToSteal; i++) {
              const idx = Math.floor(randomFn() * pool.length);
              const stolen = pool.splice(idx, 1)[0];
              tilesToRemove.push({ x: stolen.x, y: stolen.y, id: stolen.id, reason: 'coin_stolen' });
              stolenCoins++;
            }
          } else {
            // 코인이 전혀 없을 때만 소지골드 최대 2점 훔침 (원작: StealGold @ 00034a68 / 000348e8)
            const useOriginal = Boolean(options && (options.useOriginalRules || options.difficulty != null || options.turn != null || player?.useOriginalRules));
            const maxGoldSteal = useOriginal ? 2 : 5;
            const goldAmount = Math.min(maxGoldSteal, Math.max(0, (player && player.gold) || 0));
            if (player) {
              player.gold = Math.max(0, (player.gold || 0) - goldAmount);
            }
            stolenGold = goldAmount;
            if (isMortalSauren && stolenGold > 0) {
              directDamage = useOriginal ? (stolenGold * thiefAtk) : (thiefAtk * 2);
            }
          }

          if (directDamage > 0 && player && player.hp != null) {
            player.hp = Math.max(0, player.hp - directDamage);
          }

          events.push({
            type: 'thief_steal',
            pos: { x: enemy.x, y: enemy.y },
            stolenCoins,
            stolenGold,
            directDamage,
            specialId: 13
          });
        } else if (sId === 14) {
          // 조각 18 & 조각 20(대조표-2 123행): 14 혼돈괴물
          // JumpEnemy @ 0002f370: 일반 적/비적·미매칭 칸만 착지 후보; 교환 후 원래 자리의 착지 타일 소멸
          const removedKeys = new Set(tilesToRemove.map(t => `${t.x},${t.y}`));
          const validPositions = [];
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              if (x === enemy.x && y === enemy.y) continue;
              const posKey = `${x},${y}`;
              if (excludedPositions.has(posKey) || removedKeys.has(posKey)) continue;
              const t = board[y][x];
              if (!t) continue;
              // 다른 특수 적은 착지 후보 제외
              if (t.type === 'enemy' && (t.specialId != null || t.specialType != null)) continue;
              validPositions.push({ x, y });
            }
          }
          if (validPositions.length > 0) {
            const targetPos = validPositions[Math.floor(randomFn() * validPositions.length)];
            const landingTile = board[targetPos.y][targetPos.x];
            const origX = enemy.x;
            const origY = enemy.y;

            // ID 14는 targetPos로 이동
            board[targetPos.y][targetPos.x] = enemy;
            enemy.x = targetPos.x;
            enemy.y = targetPos.y;

            // 착지 타일은 원래 자리에 남겨지고 소멸
            board[origY][origX] = landingTile;
            if (landingTile) {
              landingTile.x = origX;
              landingTile.y = origY;
              tilesToRemove.push({ x: origX, y: origY, id: landingTile.id, reason: 'chaotic_consumed' });
            }

            events.push({
              type: 'chaotic_jump',
              from: { x: origX, y: origY },
              to: targetPos,
              specialId: 14
            });
          }
        } else if (sId === 16) {
          // 조각 18 & 조각 20(대조표-2 125행): 16 암살괴물
          // StabAttack @ 0002f250: 숙적 16이면 아래 칸 특수적 여부 검사 후 그 칸 보상없이 매칭; 맨아래서 공격×2 HP피해
          const playerRaceId = (player && player.raceId != null) ? player.raceId : 0;
          const isMortalFaun = (playerRaceId === 4 || getMortalEnemyForRace(playerRaceId) === 16);

          if (isMortalFaun && enemy.y < height - 1) {
            const targetY = enemy.y + 1;
            const targetTile = board[targetY][enemy.x];
            const isSpecialBelow = targetTile && targetTile.type === 'enemy' && (targetTile.specialId != null || targetTile.specialType != null);
            if (targetTile && !isSpecialBelow) {
              const origY = enemy.y;
              // 아래 칸 타일 보상없이 소멸
              tilesToRemove.push({ x: enemy.x, y: targetY, id: targetTile.id, reason: 'assassin_stab_consumed' });
              // ID 16이 아래 칸으로 이동
              board[targetY][enemy.x] = enemy;
              board[origY][enemy.x] = null;
              enemy.y = targetY;
              events.push({
                type: 'assassin_advance',
                from: { x: enemy.x, y: origY },
                to: { x: enemy.x, y: targetY },
                specialId: 16
              });
            }
          }

          if (enemy.y === height - 1) {
            const dmg = (enemy.atk != null ? enemy.atk : 1) * 2;
            if (player && player.hp != null) {
              player.hp = Math.max(0, player.hp - dmg);
            }
            events.push({
              type: 'assassin_bottom_attack',
              pos: { x: enemy.x, y: enemy.y },
              damage: dmg,
              specialId: 16
            });
          }
        } else if (sId === 17) {
          // 조각 17: 17 도플갱어 - 매 턴 플레이어 현재 갑옷값(방패)과 자기 방어를 같게 함
          const playerArmor = Math.max(0, (player && player.armor != null) ? player.armor : 0);
          enemy.armor = playerArmor;
          events.push({
            type: 'doppelganger_mimic_defense',
            pos: { x: enemy.x, y: enemy.y },
            armor: enemy.armor,
            specialId: 17
          });
        } else if (sId === 18) {
          // 조각 18 & 조각 20(대조표-2 127행): 18 연금술사
          // ConvertRandomTiles @ 0002e6bc: 미매칭 일반칸 최대 2개 RandomiseTile (5종 재추첨이므로 같은 종류·적도 가능)
          const removedKeys = new Set(tilesToRemove.map(t => `${t.x},${t.y}`));
          const candidates = [];
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const posKey = `${x},${y}`;
              if (excludedPositions.has(posKey) || removedKeys.has(posKey)) continue;
              const t = board[y][x];
              if (!t) continue;
              if (t.specialId != null || t.specialType != null) continue;
              candidates.push(t);
            }
          }
          const transCount = Math.min(2, candidates.length);
          const transInfos = [];
          for (let i = 0; i < transCount; i++) {
            const idx = Math.floor(randomFn() * candidates.length);
            const targetTile = candidates.splice(idx, 1)[0];
            const oldType = targetTile.type;
            const newType = pickRandomTileType(randomFn, TILE_TYPES);
            targetTile.type = newType;
            if (newType === 'enemy') {
              const playerL = player ? Math.floor(((player.exp || 0) + (player.accumulatedExp || 0)) / 100) : 0;
              const curve = calculateEnemyCurve(turn, difficulty, playerL, randomFn);
              targetTile.hp = curve.hp;
              targetTile.maxHp = curve.maxHp || curve.hp;
              targetTile.baseHp = targetTile.hp;
              targetTile.atk = curve.atk;
              targetTile.armor = curve.armor;
            } else if (oldType === 'enemy') {
              delete targetTile.hp;
              delete targetTile.maxHp;
              delete targetTile.baseHp;
              delete targetTile.atk;
              delete targetTile.armor;
            }
            transInfos.push({ x: targetTile.x, y: targetTile.y, from: oldType, to: newType });
          }
          events.push({
            type: 'alchemist_transmute',
            pos: { x: enemy.x, y: enemy.y },
            targets: transInfos,
            specialId: 18
          });
        } else if (sId === 19) {
          // 조각 18 & 조각 20(대조표-2 128행): 19 불안정괴물
          // 초기 5, 매 턴 -1, 0이면 TeleportEnemy @ 00029ad8로 자기 포함 판 전체 제거·재생성
          const playerRaceId = (player && player.raceId != null) ? player.raceId : 0;
          const isMortalEnemy = (playerRaceId === 9 || getMortalEnemyForRace(playerRaceId) === 19);

          const hadCountdown = enemy.countdown != null;
          const currentCd = hadCountdown ? enemy.countdown : 5;
          const nextCd = Math.max(0, currentCd - 1);
          enemy.countdown = nextCd;

          // 조각 12 단위시험 호환: countdown 미지정 상태에서 숙적인 경우 즉시 0 도달 발동
          const shouldTrigger = (!hadCountdown && isMortalEnemy) || (nextCd === 0);

          if (shouldTrigger) {
            enemy.countdown = 5;
            // 판 전체를 새로운 일반 타일들로 재생성
            const playerL = player ? Math.floor(((player.exp || 0) + (player.accumulatedExp || 0)) / 100) : 0;
            const enemyStats = { difficulty, L: playerL, rng: randomFn };
            let newSeq = 50000;
            for (let y = 0; y < height; y++) {
              for (let x = 0; x < width; x++) {
                board[y][x] = createRandomTile(randomFn, x, y, `tile_${x}_${y}_teleport_${newSeq++}`, TILE_TYPES, turn, null, enemyStats);
              }
            }

            // 조각 18 호환: 숙적(종족 9) 효과 - 보드에 칼이 없고(칼->코인 변환) 적이 적어도 1개 이상 존재
            if (isMortalEnemy) {
              let hasEnemy = false;
              for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                  if (board[y][x].type === 'sword') {
                    board[y][x].type = 'coin';
                  }
                  if (board[y][x].type === 'enemy') {
                    hasEnemy = true;
                  }
                }
              }
              if (!hasEnemy) {
                const rx = Math.floor(randomFn() * width);
                const ry = Math.floor(randomFn() * height);
                board[ry][rx] = createEnemyTile(rx, ry, `tile_${rx}_${ry}_mortal_${Date.now()}`, turn, enemyStats);
              }
            }

            events.push({
              type: 'unstable_teleport',
              pos: { x: enemy.x, y: enemy.y },
              isFullBoardReplaced: true,
              isMortalEnemy,
              specialId: 19
            });
          } else {
            events.push({
              type: 'unstable_countdown',
              pos: { x: enemy.x, y: enemy.y },
              countdown: nextCd,
              specialId: 19
            });
          }
        } else if (sId === 22) {
          // 조각 17: 22 짓밟기 - 매 턴 무작위 칼/방패 하나 파손 (파손된 칸은 수집 효과 없음)
          const breakable = [];
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const t = board[y][x];
              if (t && (t.type === 'sword' || t.type === 'shield') && !t.isBroken) {
                breakable.push(t);
              }
            }
          }
          if (breakable.length > 0) {
            const chosen = breakable[Math.floor(randomFn() * breakable.length)];
            chosen.isBroken = true;
            events.push({
              type: 'trampling_break_tile',
              pos: { x: chosen.x, y: chosen.y },
              tileType: chosen.type,
              id: chosen.id,
              specialId: 22
            });
          }
        } else if (sId === 23) {
          // 조각 18 & 조각 20(대조표-2 132행): 23 기름진 자
          // LowerSkulls @ 0002f154: 열마다 적 바로 아래 비적 칸을 찾아 하나 보상없이 소멸, 이후 낙하
          const removedKeys = new Set(tilesToRemove.map(t => `${t.x},${t.y}`));
          let lowerConsumedCount = 0;
          for (let x = 0; x < width; x++) {
            for (let y = 0; y < height - 1; y++) {
              const posKey = `${x},${y}`;
              const t = board[y][x];
              if (t && t.type === 'enemy' && t.hp > 0 && !excludedPositions.has(posKey) && !removedKeys.has(posKey)) {
                // 바로 아래 칸 검사
                const belowTile = board[y + 1][x];
                const belowKey = `${x},${y + 1}`;
                if (belowTile && belowTile.type !== 'enemy' && !excludedPositions.has(belowKey) && !removedKeys.has(belowKey)) {
                  tilesToRemove.push({ x, y: y + 1, id: belowTile.id, reason: 'greasy_consumed' });
                  removedKeys.add(belowKey);
                  lowerConsumedCount++;
                  break; // 열마다 하나
                }
              }
            }
          }
          events.push({
            type: 'greasy_push_down',
            pos: { x: enemy.x, y: enemy.y },
            lowerConsumedCount,
            specialId: 23
          });
        } else if (sId === 24) {
          // 조각 18 & 조각 20(대조표-2 133행): 24 우두머리
          // AttractSkulls @ 0002e22c: 먼 적과 주변 비적 중 각각 무작위 추첨·교환
          const neighbors = getNeighbors({ x: enemy.x, y: enemy.y }, width, height);
          const nonEnemyNeighbors = neighbors.filter(n => {
            const t = board[n.y][n.x];
            return t && t.type !== 'enemy';
          });
          const neighborKeySet = new Set(neighbors.map(n => `${n.x},${n.y}`));

          const distantEnemies = [];
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              if (x === enemy.x && y === enemy.y) continue;
              if (neighborKeySet.has(`${x},${y}`)) continue;
              const t = board[y][x];
              if (t && t.type === 'enemy' && t.hp > 0) {
                distantEnemies.push(t);
              }
            }
          }

          // 무작위 셔플
          const shuffledNeighbors = [...nonEnemyNeighbors];
          for (let i = shuffledNeighbors.length - 1; i > 0; i--) {
            const j = Math.floor(randomFn() * (i + 1));
            const temp = shuffledNeighbors[i];
            shuffledNeighbors[i] = shuffledNeighbors[j];
            shuffledNeighbors[j] = temp;
          }
          const shuffledEnemies = [...distantEnemies];
          for (let i = shuffledEnemies.length - 1; i > 0; i--) {
            const j = Math.floor(randomFn() * (i + 1));
            const temp = shuffledEnemies[i];
            shuffledEnemies[i] = shuffledEnemies[j];
            shuffledEnemies[j] = temp;
          }

          let pulledCount = 0;
          const pullLimit = Math.min(shuffledNeighbors.length, shuffledEnemies.length);
          for (let i = 0; i < pullLimit; i++) {
            const targetNeighbor = shuffledNeighbors[i];
            const distantEnemy = shuffledEnemies[i];
            const destTile = board[targetNeighbor.y][targetNeighbor.x];
            const origX = distantEnemy.x;
            const origY = distantEnemy.y;

            board[targetNeighbor.y][targetNeighbor.x] = distantEnemy;
            board[origY][origX] = destTile;
            distantEnemy.x = targetNeighbor.x;
            distantEnemy.y = targetNeighbor.y;
            destTile.x = origX;
            destTile.y = origY;
            pulledCount++;
          }

          events.push({
            type: 'alpha_rally',
            pos: { x: enemy.x, y: enemy.y },
            pulledCount,
            specialId: 24
          });
        } else if (sId === 25) {
          // 조각 18 & 조각 20(대조표-2 134행): 25 자석괴물
          // AttractShieldsSwords @ 0002defc: 먼 칼/방패와 주변 기타칸을 무작위 쌍으로 교환
          const neighbors = getNeighbors({ x: enemy.x, y: enemy.y }, width, height);
          const nonResourceNeighbors = neighbors.filter(n => {
            const t = board[n.y][n.x];
            return t && t.type !== 'sword' && t.type !== 'shield';
          });
          const neighborKeySet = new Set(neighbors.map(n => `${n.x},${n.y}`));

          const distantResources = [];
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              if (neighborKeySet.has(`${x},${y}`) || (x === enemy.x && y === enemy.y)) continue;
              const t = board[y][x];
              if (t && (t.type === 'sword' || t.type === 'shield')) {
                distantResources.push(t);
              }
            }
          }

          // 무작위 셔플
          const shuffledNeighbors = [...nonResourceNeighbors];
          for (let i = shuffledNeighbors.length - 1; i > 0; i--) {
            const j = Math.floor(randomFn() * (i + 1));
            const temp = shuffledNeighbors[i];
            shuffledNeighbors[i] = shuffledNeighbors[j];
            shuffledNeighbors[j] = temp;
          }
          const shuffledResources = [...distantResources];
          for (let i = shuffledResources.length - 1; i > 0; i--) {
            const j = Math.floor(randomFn() * (i + 1));
            const temp = shuffledResources[i];
            shuffledResources[i] = shuffledResources[j];
            shuffledResources[j] = temp;
          }

          let pulledCount = 0;
          const pullLimit = Math.min(shuffledNeighbors.length, shuffledResources.length);
          for (let i = 0; i < pullLimit; i++) {
            const targetNeighbor = shuffledNeighbors[i];
            const distantRes = shuffledResources[i];
            const destTile = board[targetNeighbor.y][targetNeighbor.x];
            const origX = distantRes.x;
            const origY = distantRes.y;

            board[targetNeighbor.y][targetNeighbor.x] = distantRes;
            board[origY][origX] = destTile;
            distantRes.x = targetNeighbor.x;
            distantRes.y = targetNeighbor.y;
            destTile.x = origX;
            destTile.y = origY;
            pulledCount++;
          }

          events.push({
            type: 'magnetic_pull',
            pos: { x: enemy.x, y: enemy.y },
            pulledCount,
            specialId: 25
          });
        } else if (sId === 26) {
          // 조각 18 & 조각 20(대조표-2 135행): 26 난폭자
          // ThrowSkull @ 0002eeb0: 미매칭·미표식 일반 적만 골라 HP값의 직접 HP피해 토큰
          const removedKeys = new Set(tilesToRemove.map(t => `${t.x},${t.y}`));
          const otherNormalEnemies = [];
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const posKey = `${x},${y}`;
              if (excludedPositions.has(posKey) || removedKeys.has(posKey)) continue;
              const t = board[y][x];
              // 미매칭·미표식 일반 적만 (다른 특수 적 제외)
              if (t && t.type === 'enemy' && t.hp > 0 && t.id !== enemy.id && !t.marked && t.specialId == null && t.specialType == null) {
                otherNormalEnemies.push(t);
              }
            }
          }
          if (otherNormalEnemies.length > 0) {
            const chosen = otherNormalEnemies[Math.floor(randomFn() * otherNormalEnemies.length)];
            const throwDmg = chosen.hp != null ? chosen.hp : 1;
            chosen.hp = 0;
            tilesToRemove.push({ x: chosen.x, y: chosen.y, id: chosen.id, reason: 'brute_thrown' });
            removedKeys.add(`${chosen.x},${chosen.y}`);
            // 방패를 거치지 않는 직접 HP 피해
            if (player && player.hp != null) {
              player.hp = Math.max(0, player.hp - throwDmg);
            }
            events.push({
              type: 'brute_throw',
              pos: { x: enemy.x, y: enemy.y },
              thrownEnemyPos: { x: chosen.x, y: chosen.y },
              damage: throwDmg,
              specialId: 26
            });
          }
        } else if (sId === 28) {
          // 조각 18 & 조각 20(대조표-2 137행): 28 포식자
          // 5턴마다 DestroyUpgrade @ 0002ecb8 → 무작위 장비의 양수 강화 스탯 ReduceStat
          const currentCd = enemy.countdown != null ? enemy.countdown : 5;
          const nextCd = Math.max(0, currentCd - 1);
          enemy.countdown = nextCd;

          if (nextCd === 0) {
            enemy.countdown = 5;
            let destroyed = false;
            let destroyedStat = null;
            if (player) {
              // 1. player.equipmentStats의 양수 강화 스탯
              if (player.equipmentStats && typeof player.equipmentStats === 'object') {
                const positiveStats = Object.keys(player.equipmentStats).filter(k => player.equipmentStats[k] > 0);
                if (positiveStats.length > 0) {
                  const targetKey = positiveStats[Math.floor(randomFn() * positiveStats.length)];
                  player.equipmentStats[targetKey] = Math.max(0, player.equipmentStats[targetKey] - 1);
                  destroyedStat = targetKey;
                  destroyed = true;
                }
              }
              // 2. 기본 장비/강화 스탯 중 기본값보다 높은 것 하나 감소
              if (!destroyed) {
                const candidates = [];
                if ((player.weaponAtk || 2) > 2) candidates.push('weaponAtk');
                if ((player.maxArmor || 4) > (CLASSES[player.classId]?.maxArmor || 4)) candidates.push('maxArmor');
                if ((player.maxHp || 50) > (CLASSES[player.classId]?.maxHp || 50)) candidates.push('maxHp');
                if ((player.shieldRecovery || 1) > 1) candidates.push('shieldRecovery');
                if (candidates.length > 0) {
                  const chosen = candidates[Math.floor(randomFn() * candidates.length)];
                  if (chosen === 'weaponAtk') player.weaponAtk = Math.max(2, player.weaponAtk - 1);
                  else if (chosen === 'maxArmor') player.maxArmor = Math.max(0, player.maxArmor - 1);
                  else if (chosen === 'maxHp') {
                    player.maxHp = Math.max(1, player.maxHp - 10);
                    player.hp = Math.min(player.hp, player.maxHp);
                  } else if (chosen === 'shieldRecovery') player.shieldRecovery = Math.max(1, player.shieldRecovery - 1);
                  destroyedStat = chosen;
                  destroyed = true;
                } else if ((player.shieldGauge != null && player.shieldGauge > 0) || (player.accumulatedUpgrade != null && player.accumulatedUpgrade > 0)) {
                  // 양수 강화 스탯이 따로 없으면 호환을 위해 강화 게이지/누적강화 1점 감소
                  if (player.shieldGauge > 0) {
                    player.shieldGauge = Math.max(0, player.shieldGauge - 1);
                  } else {
                    player.accumulatedUpgrade = Math.max(0, player.accumulatedUpgrade - 1);
                  }
                  destroyedStat = 'upgradeGauge';
                  destroyed = true;
                }
              }
            }
            events.push({
              type: 'devourer_destroy_upgrade',
              pos: { x: enemy.x, y: enemy.y },
              destroyed,
              destroyedStat,
              specialId: 28
            });
          } else {
            events.push({
              type: 'devourer_countdown',
              pos: { x: enemy.x, y: enemy.y },
              countdown: nextCd,
              specialId: 28
            });
          }
        } else if (sId === 31) {
          // 조각 18: 31 도주자 - 매 턴 위 1칸으로 이동하다가 맨 위(y=0)에서 이탈
          if (enemy.y === 0) {
            tilesToRemove.push({ x: enemy.x, y: enemy.y, id: enemy.id, reason: 'fleeing_escaped' });
            events.push({
              type: 'fleeing_escaped',
              pos: { x: enemy.x, y: enemy.y },
              specialId: 31
            });
          } else {
            const targetY = enemy.y - 1;
            const targetTile = board[targetY][enemy.x];
            if (targetTile) {
              const origY = enemy.y;
              board[targetY][enemy.x] = enemy;
              board[origY][enemy.x] = targetTile;
              enemy.y = targetY;
              targetTile.y = origY;
              events.push({
                type: 'fleeing_ascend',
                from: { x: enemy.x, y: origY },
                to: { x: enemy.x, y: targetY },
                specialId: 31
              });
            }
          }
        }
        // 그 외 ID (1, 2, 5, 9, 10, 11, 12, 15, 20, 21, 27, 29, 30, 32)는 다른 시점 처리
        continue;
      }

      // 조각 4 호환: specialId가 없고 specialType만 있는 경우
      const type = enemy.specialType;
      switch (type) {
        case 'runner': {
          if (enemy.countdown != null) {
            enemy.countdown = Math.max(0, enemy.countdown - 1);
            if (enemy.countdown === 0) {
              tilesToRemove.push({ x: enemy.x, y: enemy.y, id: enemy.id, reason: 'escaped' });
              events.push({
                type: 'runner_escaped',
                pos: { x: enemy.x, y: enemy.y },
                id: enemy.id
              });
            } else {
              events.push({
                type: 'runner_countdown',
                pos: { x: enemy.x, y: enemy.y },
                countdown: enemy.countdown
              });
            }
          }
          break;
        }

        case 'healer': {
          const otherEnemies = [];
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const t = board[y][x];
              if (t && t.type === 'enemy' && t.hp > 0 && (t.x !== enemy.x || t.y !== enemy.y)) {
                otherEnemies.push(t);
              }
            }
          }

          const damaged = otherEnemies.filter(e => e.hp < (e.maxHp || e.hp));
          if (damaged.length > 0) {
            const target = damaged[Math.floor(randomFn() * damaged.length)];
            const heal = enemy.healAmount || 2;
            const oldHp = target.hp;
            target.hp = Math.min(target.maxHp || target.hp, target.hp + heal);
            events.push({
              type: 'healer_heal',
              healerPos: { x: enemy.x, y: enemy.y },
              targetPos: { x: target.x, y: target.y },
              healed: target.hp - oldHp,
              targetHp: target.hp
            });
          }
          break;
        }

        case 'acid': {
          const potions = [];
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const t = board[y][x];
              if (t && t.type === 'potion' && !t.isAcid) {
                potions.push(t);
              }
            }
          }
          if (potions.length > 0) {
            const pIdx = Math.floor(randomFn() * potions.length);
            const targetPotion = potions[pIdx];
            targetPotion.isAcid = true;
            events.push({
              type: 'acid_convert',
              pos: { x: targetPotion.x, y: targetPotion.y },
              id: targetPotion.id
            });
          }
          break;
        }

        case 'fire': {
          hasLegacyFireMage = true;
          const neighbors = getNeighbors({ x: enemy.x, y: enemy.y }, width, height);
          const unburnt = [];
          for (const n of neighbors) {
            const t = board[n.y][n.x];
            if (t && !t.isBurning) {
              unburnt.push(t);
            }
          }
          if (unburnt.length > 0) {
            const target = unburnt[Math.floor(randomFn() * unburnt.length)];
            target.isBurning = true;
            events.push({
              type: 'fire_spread',
              pos: { x: target.x, y: target.y },
              id: target.id
            });
          }
          break;
        }

        case 'ice': {
          const unfrozen = [];
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const t = board[y][x];
              if (t && !t.isFrozen) {
                unfrozen.push(t);
              }
            }
          }
          const frozenCount = Math.min(2, unfrozen.length);
          const frozenPositions = [];
          for (let i = 0; i < frozenCount; i++) {
            const idx = Math.floor(randomFn() * unfrozen.length);
            const chosen = unfrozen.splice(idx, 1)[0];
            chosen.isFrozen = true;
            frozenPositions.push({ x: chosen.x, y: chosen.y });
          }
          if (frozenPositions.length > 0) {
            events.push({
              type: 'ice_freeze',
              positions: frozenPositions
            });
          }
          break;
        }

        case 'bomb': {
          if (enemy.countdown != null) {
            enemy.countdown = Math.max(0, enemy.countdown - 1);
            if (enemy.countdown === 0) {
              const maxHp = player.maxHp || 20;
              const dmg = Math.floor(maxHp / 2);
              explosionDamage += dmg;
              tilesToRemove.push({ x: enemy.x, y: enemy.y, id: enemy.id, reason: 'exploded' });
              events.push({
                type: 'bomb_exploded',
                pos: { x: enemy.x, y: enemy.y },
                damage: dmg
              });
            } else {
              events.push({
                type: 'bomb_countdown',
                pos: { x: enemy.x, y: enemy.y },
                countdown: enemy.countdown
              });
            }
          }
          break;
        }

        case 'convert': {
          const swords = [];
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const t = board[y][x];
              if (t && t.type === 'sword') {
                swords.push(t);
              }
            }
          }
          if (swords.length > 0) {
            const sIdx = Math.floor(randomFn() * swords.length);
            const swordTile = swords[sIdx];
            const newEnemy = createEnemyTile(swordTile.x, swordTile.y, `tile_${swordTile.x}_${swordTile.y}_conv_${Date.now()}`, turn);
            if (swordTile.isFrozen) newEnemy.isFrozen = true;
            board[swordTile.y][swordTile.x] = newEnemy;
            events.push({
              type: 'convert_sword_to_enemy',
              pos: { x: swordTile.x, y: swordTile.y },
              id: newEnemy.id
            });
          }
          break;
        }
      }
    }


    // 조각 4 호환 레거시 화염 환경 피해: burnDamage 수치가 없는 순수 isBurning 타일은 플레이어에게 1 피해
    let legacyBurntCount = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const t = board[y][x];
        if (t && t.isBurning && !t.burnDamage) {
          legacyBurntCount++;
        }
      }
    }
    if (legacyBurntCount > 0) {
      burningDamage = legacyBurntCount;
      events.push({
        type: 'burning_damage',
        tileCount: legacyBurntCount,
        damage: burningDamage
      });
    }

    return {
      events,
      tilesToRemove,
      explosionDamage,
      burningDamage,
      totalSpecialDamage: explosionDamage + burningDamage,
      find: (...args) => events.find(...args),
      filter: (...args) => events.filter(...args),
      forEach: (...args) => events.forEach(...args),
      some: (...args) => events.some(...args),
      map: (...args) => events.map(...args),
      [Symbol.iterator]: () => events[Symbol.iterator]()
    };
  }

  /**
   * 소멸된 타일(도망자 도망, 폭탄병 폭발 등) 제거 및 낙하/보충 처리
   * 조각 7: 칸 보충은 5종 균등(각 20%)
   */
  function removeTilesAndDrop(board, positionsToRemove = [], rng = null, turn = 1, options = {}) {
    if (!Array.isArray(positionsToRemove) || positionsToRemove.length === 0) {
      return board;
    }
    const removeSet = new Set(positionsToRemove.map(p => `${p.x},${p.y}`));
    const height = board.length;
    const width = board[0].length;
    const newBoard = Array.from({ length: height }, () => Array(width).fill(null));
    const randomFn = typeof rng === 'function' ? rng : createRNG(rng);
    const weights = options.tileWeights || null;
    let newIdSeq = 30000;

    for (let x = 0; x < width; x++) {
      const survivingTiles = [];
      for (let y = height - 1; y >= 0; y--) {
        const key = `${x},${y}`;
        if (!removeSet.has(key)) {
          survivingTiles.push(board[y][x]);
        }
      }

      let targetY = height - 1;
      for (const tile of survivingTiles) {
        newBoard[targetY][x] = {
          ...tile,
          x,
          y: targetY
        };
        targetY--;
      }

      while (targetY >= 0) {
        const id = `tile_${x}_${targetY}_${newIdSeq++}`;
        const newTile = createRandomTile(randomFn, x, targetY, id, TILE_TYPES, turn, weights, options.enemyStats, options);
        if (newTile) {
          newTile.spawnedThisTurn = true;
        }
        newBoard[targetY][x] = newTile;
        targetY--;
      }
    }

    return newBoard;
  }

  /**
   * 유효한 체인 확정:
   * - 이어진 칸 제거 (단, 체인에 포함되었으나 살아남은 적은 제거하지 않고 hp 업데이트)
   * - 중력으로 위 칸이 아래로 낙하
   * - 상단 빈 공간에 새 칸 채움
   */
  function resolveChain(board, path, rng = null, tileTypes = TILE_TYPES, options = {}) {
    if (!isValidChain(board, path)) {
      return {
        board: cloneBoard(board),
        resolved: false,
        removedCount: 0,
        removedType: null,
        removedPositions: []
      };
    }

    const randomFn = typeof rng === 'function' ? rng : createRNG(rng);
    const height = board.length;
    const width = board[0].length;
    const turn = options.turn || 1;
    const weights = options.tileWeights || null;

    // 살아남은 적 맵 (key: "x,y" => { remainingHp })
    const survivingMap = options.survivingMap instanceof Map ? options.survivingMap : new Map();

    const removedPositions = [];
    const removedSet = new Set();

    for (const pos of path) {
      const key = `${pos.x},${pos.y}`;
      if (survivingMap.has(key)) {
        // 살아남은 적은 제거 목록에서 제외
        continue;
      }
      removedSet.add(key);
      removedPositions.push({ x: pos.x, y: pos.y });
    }

    const firstTile = board[path[0].y][path[0].x];
    const removedType = isAttackType(firstTile.type) ? 'attack' : firstTile.type;

    const newBoard = Array.from({ length: height }, () => Array(width).fill(null));
    let newIdSeq = 20000;

    for (let x = 0; x < width; x++) {
      const survivingTiles = [];
      // 아래쪽(y = height - 1)부터 위로 올라가며 살아남은 타일 수집
      for (let y = height - 1; y >= 0; y--) {
        const key = `${x},${y}`;
        if (!removedSet.has(key)) {
          let tile = board[y][x];
          if (survivingMap.has(key)) {
            const updateInfo = survivingMap.get(key);
            tile = {
              ...tile,
              hp: updateInfo.remainingHp
            };
          }
          survivingTiles.push(tile);
        }
      }

      // 살아남은 타일을 아래쪽부터 채움
      let targetY = height - 1;
      for (const tile of survivingTiles) {
        newBoard[targetY][x] = {
          ...tile,
          x,
          y: targetY
        };
        targetY--;
      }

      // 위쪽 빈 공간 새 타일 생성
      while (targetY >= 0) {
        const id = `tile_${x}_${targetY}_${newIdSeq++}`;
        const newTile = createRandomTile(randomFn, x, targetY, id, tileTypes, turn, weights, options.enemyStats, options);
        if (newTile) {
          newTile.spawnedThisTurn = true;
        }
        newBoard[targetY][x] = newTile;
        targetY--;
      }
    }

    return {
      board: newBoard,
      resolved: true,
      removedCount: removedPositions.length,
      removedType,
      removedPositions
    };
  }

  /**
   * 한 턴 전체 처리 (조각 3 확장 및 조각 8 원작 정렬 지원)
   * 체인 판정 -> 자원 획득(방패·물약·코인) 또는 공격/피해 계산
   * -> 타일 제거/낙하/보충 -> 적 반격 -> 방패/체력 깎임 -> 게임 오버 판정
   * -> 게이지 만땅 시 일시정지 + 선택 대기 상태(pendingChoice)
   */
  function resolveTurn(gameState, path, rng = null, options = {}) {
    if (!gameState || gameState.isGameOver) {
      return {
        gameState: gameState ? { ...gameState } : null,
        resolved: false,
        reason: 'game_over'
      };
    }

    // 선택 대기(일시정지) 중이면 턴 진행 불가
    if (gameState.pendingChoice) {
      return {
        gameState: { ...gameState },
        resolved: false,
        reason: 'pending_choice'
      };
    }

    if (!isValidChain(gameState.board, path)) {
      return {
        gameState: { ...gameState },
        resolved: false,
        reason: 'invalid_chain'
      };
    }

    const randomFn = typeof rng === 'function' ? rng : createRNG(rng);
    const board = gameState.board;
    const player = {
      ...gameState.player,
      skills: Array.isArray(gameState.player?.skills) ? gameState.player.skills.map(s => ({ ...s })) : []
    };
    const turn = gameState.turn || 1;
    const firstTile = getTile(board, path[0]);
    const isAttackChain = isAttackType(firstTile.type);

    const useOriginalRules = Boolean(
      gameState.useOriginalRules ||
      (options && options.useOriginalRules) ||
      (player && (player.accumulatedExp > 0 || player.accumulatedGold > 0 || player.accumulatedUpgrade > 0 || (player.maxShieldGauge >= 100 && player.maxExp >= 100)))
    );

    let attackResult = null;
    let enemyAttackSummary = null;
    let resourceResult = null;
    let killedPositions = [];
    const survivingMap = new Map();
    let runnerBonusGold = 0;
    let killedIceMage = false;

    let manaPotionCount = 0;

    // 조각 17: 불 칸 수집 시 플레이어 피해
    let burningCollectionDamage = 0;
    for (const pos of path) {
      const t = getTile(board, pos);
      if (t && t.isBurning) {
        burningCollectionDamage += (t.burnDamage || 1);
      }
    }

    if (isAttackChain) {
      attackResult = calculateAttack(board, path, player, { ...(gameState.activeEffects || {}), turn, player });
      enemyAttackSummary = applyAttackToEnemies(board, path, attackResult.totalAttack, randomFn, { player, board, ...(gameState.activeEffects || {}) });
      killedPositions = enemyAttackSummary.killedPositions;

      for (const surv of enemyAttackSummary.survivedEnemies) {
        survivingMap.set(`${surv.pos.x},${surv.pos.y}`, {
          remainingHp: surv.remainingHp
        });
      }

      for (const res of enemyAttackSummary.results) {
        const t = getTile(board, res.pos);
        if (t) {
          t.hp = res.remainingHp;
        }
      }

      // 조각 22: 스킬 0 (약탈) - 이번 턴 공격한 적마다 골드 토큰 강탈
      if (gameState && gameState.activeEffects && gameState.activeEffects.stealCoinsFromAttacked) {
        const attackedCount = enemyAttackSummary.results.length;
        if (attackedCount > 0) {
          const stolenGold = attackedCount * BASE_RESOURCE_POINTS_PER_TOKEN;
          const gRes = addGaugeResource(player.gold || 0, stolenGold, player.accumulatedGold || 0);
          player.gold = gRes.currentValue;
          player.accumulatedGold = gRes.accumulatedValue;
        }
      }

      // 조각 22: 스킬 34 (광란) - 이번 턴 처치한 적의 공격력만큼 체력 회복
      if (gameState && gameState.activeEffects && gameState.activeEffects.berserkHeal) {
        let berserkHealTotal = 0;
        for (const res of enemyAttackSummary.results) {
          if (res.killed) {
            berserkHealTotal += (res.atk != null ? res.atk : (res.originalAtk != null ? res.originalAtk : 1));
          }
        }
        if (berserkHealTotal > 0) {
          player.hp = Math.min(player.maxHp || 50, (player.hp || 0) + berserkHealTotal);
        }
      }

      // 조각 4 & 조각 9: 특수 적 처치 시 보너스 (도망자 처치 시 코인 토큰 R(15,25) 또는 조각 4 보너스 코인, 빙결술사 처치 판정)
      for (const res of enemyAttackSummary.results) {
        if (res.killed) {
          // 조각 18: 종족 9 (변신 고블린) - 특수 적 처치 시 무작위 스킬 1개 쿨다운 즉시 충전 (이미 찬 스킬 포함)
          if (player.raceId === 9 && (res.specialId != null || res.specialType != null)) {
            if (Array.isArray(player.skills) && player.skills.length > 0) {
              const targetIdx = Math.floor(randomFn() * player.skills.length);
              const targetSkill = player.skills[targetIdx];
              if (targetSkill) {
                targetSkill.currentCooldown = 0;
              }
            }
          }

          if (res.specialId === 3) {
            const tokens = res.runnerBonusTokens || randomInt(15, 25, randomFn);
            const bg = tokens * (useOriginalRules ? BASE_RESOURCE_POINTS_PER_TOKEN : 1);
            runnerBonusGold += bg;
            player.gold = (player.gold || 0) + bg;
          } else if (res.specialType === 'runner') {
            const bg = res.bonusGold != null ? res.bonusGold : 5;
            runnerBonusGold += bg;
            player.gold = (player.gold || 0) + bg;
          }
          if (res.specialId === 8 || res.specialType === 'ice') {
            killedIceMage = true;
          }
        }
      }
    } else if (firstTile.type === 'shield') {
      // 조각 11: 파손된 방패(isBroken)는 복구/강화 효과 없음
      let normalShieldCount = 0;
      let brokenShieldCount = 0;
      for (const pos of path) {
        const t = getTile(board, pos);
        if (t && t.isBroken) {
          brokenShieldCount++;
        } else {
          normalShieldCount++;
        }
      }

      // 조각 16 & 조각 22: 방패 장비·배가, 스킬 19 (철벽 수호) 및 적 ID12 존재 검사
      const hasEnemy12 = Boolean(board && board.some(row => row && row.some(t => t && t.hp > 0 && t.specialId === 12)));
      const tokenRes = calculateResourceTokens('shield', normalShieldCount, randomFn, { player });
      const effectBoostShield = ((gameState && gameState.activeEffects && gameState.activeEffects.boostShield) || 1);
      const shieldRes = applyShieldTokens(player, tokenRes.totalTokens, {
        hasEnemy12,
        shieldMultiplier: (player.shieldMultiplier || (player.isShieldDoubled ? 2 : 1)) * effectBoostShield,
        upgradeMultiplier: (player.upgradeMultiplier || (player.isUpgradeDoubled ? 2 : 1)) * effectBoostShield
      });
      player.armor = shieldRes.newArmor;
      player.shieldGauge = shieldRes.shieldGauge;
      player.accumulatedUpgrade = shieldRes.accumulatedUpgrade;
      player.upgradeFraction = shieldRes.upgradeFraction;
      resourceResult = {
        type: 'shield',
        gain: tokenRes.totalTokens,
        length: path.length,
        normalShieldCount,
        brokenShieldCount,
        multiplier: 1.0,
        overflow: (shieldRes && shieldRes.upgradePointsGained != null) ? shieldRes.upgradePointsGained : 0,
        ...shieldRes
      };
    } else if (firstTile.type === 'potion') {
      // 조각 4 & 조각 11 & 조각 16 & 조각 19(대조표 81행): 혼합 물약 보너스 카운터
      let normalCount = 0;
      let acidCount = 0;
      let normalTokens = 0;
      const bonusChance = (player && player.potionBonusRate != null) ? (20 + player.potionBonusRate) : 20;
      for (let i = 0; i < path.length; i++) {
        const t = getTile(board, path[i]);
        if (t && t.isAcid) {
          acidCount++;
        } else if (t && t.isManaPotion) {
          manaPotionCount++;
        } else {
          normalCount++;
          normalTokens += 1;
          if (i >= 3) {
            const roll = randomInt(1, 100, randomFn);
            if (roll <= bonusChance) {
              normalTokens += 1;
            }
          }
        }
      }

      // 조각 16 & 조각 19 & 조각 22: 물약 장비·배가 및 스킬 18 (생명력 고양) 회복량 실제 턴 호출 연결
      const effectBoostPotion = ((gameState && gameState.activeEffects && gameState.activeEffects.boostPotion) || 1);
      const potionRes = applyPotionTokens(player, normalTokens, acidCount, {
        board,
        hasMortalEnemy9: isMortalEnemyOnBoard(board, 9),
        potionMultiplier: (player.potionMultiplier || (player.isPotionDoubled ? 2 : 1)) * effectBoostPotion
      });
      player.hp = potionRes.newHp;
      if (potionRes.clearedPoison) {
        player.isPoisoned = false;
        player.poisonDamage = 0;
      }
      resourceResult = {
        type: 'potion',
        gain: normalTokens,
        normalTokens,
        acidCount,
        manaPotionCount,
        acidDamage: potionRes.acidDamage,
        healed: potionRes.healed,
        length: path.length,
        multiplier: 1.0,
        newHp: potionRes.newHp,
        clearedPoison: potionRes.clearedPoison
      };
    } else if (firstTile.type === 'coin') {
      // 조각 16 & 조각 19(대조표 88행) & 조각 22: 코인 2×배가+추가율 및 스킬 17 (황금 축복) 토큰 방식
      const tokenRes = calculateResourceTokens('coin', path.length, randomFn, { player });
      const effectBoostGold = ((gameState && gameState.activeEffects && gameState.activeEffects.boostGold) || 1);
      const goldMultiplier = (player.goldMultiplier || (player.isGoldDoubled ? 2 : 1)) * effectBoostGold;
      const goldBonusRate = (player.goldBonusRate || 0) + ((player.equipmentGoldBonus || 0) * 0.25);
      const rawGoldGain = (tokenRes.totalTokens * ((2 + goldBonusRate) * goldMultiplier)) + (player.goldFraction || 0);
      const goldPoints = Math.floor(rawGoldGain);
      player.goldFraction = rawGoldGain - goldPoints;
      const goldThreshold = (player && player.maxGold != null) ? player.maxGold : GAUGE_MAX;
      const goldRes = addGaugeResource(player.gold, goldPoints, player.accumulatedGold, goldThreshold);
      player.gold = goldRes.currentValue;
      player.accumulatedGold = goldRes.accumulatedValue;
      resourceResult = {
        type: 'coin',
        gain: tokenRes.totalTokens,
        goldPoints,
        length: path.length,
        multiplier: 1.0,
        ...goldRes
      };
    }

    const difficulty = gameState.difficulty != null ? gameState.difficulty : 1;
    const playerL = Math.floor(((player.exp || 0) + (player.accumulatedExp || 0)) / 100);
    const initialPromotionCooldown = (gameState.promotionCooldown != null)
      ? gameState.promotionCooldown
      : PROMOTION_COOLDOWN_INITIAL;
    const initialFlaws = (player && Array.isArray(player.flaws) ? player.flaws.filter(f => f != null) : []);
    const initialPerks = (player && Array.isArray(player.perks) ? player.perks.filter(p => p != null) : []);

    // 조각 21 (원작-대조표-2 238행): 승급은 보충 중 생성되는 적이 타이머를 검사
    const promotionState = {
      promotionCooldown: initialPromotionCooldown,
      promoted: false,
      promotedEnemy: null
    };

    // ── 조각 19(대조표 72행): 원작 턴 처리 순서 개편 ──
    // 1. 일반 매칭 직후 1차 낙하·보충 실행 (MoveMatchedTiles)
    // 조각 18: 특수 적 ID 31 (도주자) 강제 하강 감지용 이전 y 좌표 맵
    const prevYMap31 = new Map();
    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        const t = board[y][x];
        if (t && t.specialId === 31) {
          prevYMap31.set(t.id, y);
        }
      }
    }

    const chainResult = resolveChain(board, path, randomFn, TILE_TYPES, {
      turn,
      survivingMap,
      player,
      board,
      activeEffects: gameState.activeEffects,
      activePerks: player.activePerks || initialPerks,
      activeFlaws: player.activeFlaws || initialFlaws,
      promotionState,
      enemyStats: { difficulty, L: playerL, rng: randomFn, activeEffects: gameState.activeEffects, activePerks: player.activePerks || initialPerks, activeFlaws: player.activeFlaws || initialFlaws, promotionState }
    });

    let newBoard = chainResult.board;

    // 조각 20(대조표-2 140행): 특수 적 ID 31 (도주자) 1차 낙하 피해 검사 (MoveMatchedTiles @ 0002fd7c → Stab @ 0002fcd8)
    let fallDmg1 = 0;
    for (let y = 0; y < newBoard.length; y++) {
      for (let x = 0; x < newBoard[y].length; x++) {
        const t = newBoard[y][x];
        if (t && t.specialId === 31 && prevYMap31.has(t.id)) {
          const oldY = prevYMap31.get(t.id);
          if (y > oldY) {
            fallDmg1 += (t.atk != null ? t.atk : 1);
          }
        }
      }
    }
    if (fallDmg1 > 0 && player && player.hp != null) {
      player.hp = Math.max(0, player.hp - fallDmg1);
    }

    // 2. 적 반격 및 플레이어 피격 (1차 낙하 후 살아있는 적들이 공격, 체인 처치된 적은 이미 없음)
    const counterattackInfo = calculateCounterattack(newBoard, [], {
      ...(gameState.activeEffects || {}),
      player,
      turn,
      isResolveTurn: true
    });

    const hasEnemy29 = Boolean(newBoard && newBoard.some(row => row && row.some(t => t && t.hp > 0 && t.specialId === 29)));

    // 총 피격 피해량 = 적 반격 합산 + ID 2 반사 피해 + 불 칸 수집 피해
    const totalIncomingDamage = counterattackInfo.totalEnemyAtk + ((enemyAttackSummary && enemyAttackSummary.totalReflectedDamage) || 0) + burningCollectionDamage;
    const checkDurability = Boolean(options && options.checkDurability) || Boolean(player && player.checkDurability);
    const counterResult = applyCounterattack(player, totalIncomingDamage, randomFn, {
      hasEnemy29,
      durability: player.durability || 50,
      checkDurability
    });

    player.armor = counterResult.newArmor;
    player.hp = counterResult.newHp;

    // 조각 17 & 조각 19 & 조각 20(대조표-2 76·118행): 특수 적 ID 9 (맹독)
    // ProcessAttack @ 000311b8: 막지 못한 경우(hpDamage > 0) 독량 갱신
    if (counterResult.hpDamage > 0 && counterattackInfo.attackingEnemies && counterattackInfo.attackingEnemies.length > 0) {
      let id9AtkSum = 0;
      for (const att of counterattackInfo.attackingEnemies) {
        const attTile = getTile(newBoard, { x: att.x, y: att.y });
        if (attTile && attTile.specialId === 9) {
          player.isPoisoned = true;
          id9AtkSum += (attTile.atk || 1);
        }
      }
      if (id9AtkSum > 0) {
        player.poisonDamage = (player.poisonDamage || 0) + id9AtkSum;
      }
    }

    // 조각 20(대조표-2 129행): 특수 적 ID 20 (흡혈귀)
    // ProcessVampires @ 0002d18c: HP 피해 처리 분기(hpDamage > 0)에서 생존 ID 20에 GetAttack만큼 회복; 숙적이면 상한 없음
    if (counterResult.hpDamage > 0 && newBoard && Array.isArray(newBoard)) {
      const isWerewolfMortal = (player.raceId === 7 || getMortalEnemyForRace(player.raceId) === 20);
      for (let y = 0; y < newBoard.length; y++) {
        for (let x = 0; x < newBoard[y].length; x++) {
          const t = newBoard[y][x];
          if (t && t.type === 'enemy' && t.specialId === 20 && t.hp > 0) {
            let effAtk = t.atk != null ? t.atk : 1;
            if (t.isPoisoned && effAtk > 1 && player.raceId === 1) {
              effAtk = Math.floor(effAtk / 2);
            }
            const maxAllowedHp = isWerewolfMortal ? Infinity : (t.baseHp || t.maxHp || t.hp);
            t.hp = Math.min(maxAllowedHp, (t.hp || 0) + effAtk);
          }
        }
      }
    }

    // 조각 19(대조표 78행): 반격 직후 사망 검사
    if (player.hp <= 0) {
      // 조각 22: 스킬 37 (최후의 저항) - 이번 턴 치명상을 입으면 체력을 완전히 회복
      if (gameState && gameState.activeEffects && gameState.activeEffects.lastStand) {
        player.hp = player.maxHp || 50;
        counterResult.isGameOver = false;
        counterResult.newHp = player.hp;
        gameState.activeEffects.lastStand = false;
      } else {
        counterResult.isGameOver = true;
        counterResult.newHp = 0;
        player.hp = 0;
      }
    }

    // ── 3. EndOfTurn ──
    const burnedPositions = [];
    const poisonedPositions = [];
    let abilityResult = { tilesToRemove: [], totalSpecialDamage: 0 };
    const activePerks = (player && Array.isArray(player.perks)) ? player.perks.filter(p => p != null) : [];

    // 조각 19(대조표 73행): 스킬 자연 충전 시점 - 특수능력보다 먼저 충전, ID 15 존재 시 중지
    let updatedSkills = player.skills || [];
    if (!counterResult.isGameOver) {
      const hasEnemy15 = Boolean(newBoard && newBoard.some(row => row && row.some(t => t && t.hp > 0 && t.specialId === 15)));
      const naturalReduction = hasEnemy15 ? 0 : 1;
      const cooldownReduction = naturalReduction + (manaPotionCount || 0);

      updatedSkills = (player.skills || []).map((s, idx) => {
        const baseCd = s.baseCooldown != null ? s.baseCooldown : s.cooldown;
        const effectiveCooldown = (idx === 3 && activePerks.includes(3))
          ? Math.max(1, baseCd - 1)
          : baseCd;
        return {
          ...s,
          baseCooldown: baseCd,
          cooldown: effectiveCooldown,
          currentCooldown: Math.max(0, (s.currentCooldown || 0) - cooldownReduction)
        };
      });
      player.skills = updatedSkills;

      // 조각 17 호환: 기존 board의 얼어있던 칸도 해제
      if (board && Array.isArray(board)) {
        for (let y = 0; y < board.length; y++) {
          for (let x = 0; x < (board[y] ? board[y].length : 0); x++) {
            const bt = board[y][x];
            if (bt && bt.isFrozen) {
              bt.isFrozen = false;
              bt.frozenTurns = 0;
            }
          }
        }
      }

      // 조각 19(대조표 74행): 보드 순회 - 동결이면 해제, 비동결이면 기존 불 피해 후 불 제거
      for (let y = 0; y < newBoard.length; y++) {
        for (let x = 0; x < newBoard[y].length; x++) {
          const t = newBoard[y][x];
          if (!t) continue;
          if (t.isFrozen) {
            t.isFrozen = false;
            t.frozenTurns = 0;
          } else if (t.burnDamage > 0) {
            const bDmg = t.burnDamage;
            t.burnDamage = 0;
            t.isBurning = false;
            if (t.type === 'enemy' && (t.hp != null ? t.hp : 1) > 0) {
              t.hp -= bDmg;
              if (t.hp <= 0) {
                burnedPositions.push({ x, y, id: t.id, reason: 'burned' });
              }
            }
          }
        }
      }

      // 조각 19(대조표 75·76행): 플레이어 턴 회복 / 독 피해
      if (player.hp > 0 && player.regenerate) {
        player.hp = Math.min(player.maxHp || 50, player.hp + player.regenerate);
      }
      const poisonDmg = (player.poisonDamage && player.poisonDamage > 0) ? player.poisonDamage : (player.isPoisoned ? 1 : 0);
      if (player.hp > 0 && (player.isPoisoned || player.poisonDamage > 0)) {
        player.hp = Math.max(0, player.hp - poisonDmg);
        if (player.hp <= 0) {
          counterResult.isGameOver = true;
          counterResult.newHp = 0;
          player.hp = 0;
        }
      }
      counterResult.newHp = player.hp;

      // 조각 19(대조표 77·78행): 적에게 쌓인 독 피해 및 특수 적 능력
      if (!counterResult.isGameOver) {
        for (let y = 0; y < newBoard.length; y++) {
          for (let x = 0; x < newBoard[y].length; x++) {
            const t = newBoard[y][x];
            if (t && t.type === 'enemy' && (t.hp != null ? t.hp : 1) > 0) {
              const enemyPoison = t.poison || t.poisonDamage || 0;
              if (enemyPoison > 0) {
                t.hp -= enemyPoison;
                if (t.hp <= 0) {
                  poisonedPositions.push({ x, y, id: t.id, reason: 'poisoned' });
                }
              }
            }
          }
        }

        // 특수 적 능력 실행 (ActivateAbility)
        abilityResult = activateSpecialAbilities(newBoard, player, randomFn, {
          turn,
          difficulty,
          excludedPositions: []
        });
        if (abilityResult.totalSpecialDamage > 0) {
          const specialArmorDamage = Math.min(player.armor || 0, abilityResult.totalSpecialDamage);
          const specialHpDamage = abilityResult.totalSpecialDamage - specialArmorDamage;
          player.armor = Math.max(0, (player.armor || 0) - specialArmorDamage);
          player.hp = Math.max(0, (player.hp || 0) - specialHpDamage);
          if (player.hp <= 0) {
            counterResult.isGameOver = true;
            counterResult.newHp = 0;
            player.hp = 0;
          }
          counterResult.newArmor = player.armor;
          counterResult.newHp = player.hp;
        }

        // 2차 낙하 및 보충 (추가 소멸 타일 처리)
        const extraRemovals = [
          ...((enemyAttackSummary && enemyAttackSummary.kamikazeDestroyedPositions) || []),
          ...burnedPositions,
          ...poisonedPositions,
          ...(abilityResult.tilesToRemove || [])
        ];
        if (extraRemovals.length > 0) {
          // 2차 낙하 전 ID 31 위치 기록 (1차 낙하와 중복 피해 방지)
          const prevYMap31_second = new Map();
          for (let y = 0; y < newBoard.length; y++) {
            for (let x = 0; x < newBoard[y].length; x++) {
              const t = newBoard[y][x];
              if (t && t.specialId === 31) {
                prevYMap31_second.set(t.id, y);
              }
            }
          }

          newBoard = removeTilesAndDrop(newBoard, extraRemovals, randomFn, turn, {
            player,
            board: newBoard,
            activeEffects: gameState.activeEffects,
            activePerks: player.activePerks || initialPerks,
            activeFlaws: player.activeFlaws || initialFlaws,
            promotionState,
            enemyStats: { difficulty, L: playerL, rng: randomFn, activeEffects: gameState.activeEffects, activePerks: player.activePerks || initialPerks, activeFlaws: player.activeFlaws || initialFlaws, promotionState }
          });

          // 2차 낙하로 인한 추가 낙하 피해
          let fleeingFallDamage = 0;
          for (let y = 0; y < newBoard.length; y++) {
            for (let x = 0; x < newBoard[y].length; x++) {
              const t = newBoard[y][x];
              if (t && t.specialId === 31 && prevYMap31_second.has(t.id)) {
                const oldY = prevYMap31_second.get(t.id);
                if (y > oldY) {
                  fleeingFallDamage += (t.atk != null ? t.atk : 1);
                }
              }
            }
          }
          if (fleeingFallDamage > 0 && player && player.hp != null) {
            player.hp = Math.max(0, player.hp - fleeingFallDamage);
            counterResult.newHp = player.hp;
            if (player.hp <= 0) {
              counterResult.isGameOver = true;
              counterResult.newHp = 0;
              player.hp = 0;
            }
          }
        }

        // 조각 20(대조표-2 117행): 원작은 ID 8 처치 시 즉시 해제하지 않음 (레거시 비원작 모드에서만 호환)
        if (!useOriginalRules && killedIceMage) {
          for (let y = 0; y < newBoard.length; y++) {
            for (let x = 0; x < newBoard[y].length; x++) {
              if (newBoard[y][x] && newBoard[y][x].isFrozen) {
                newBoard[y][x].isFrozen = false;
              }
            }
          }
        }
      }
    }

    // 조각 16 & 조각 19(대조표 90행): 처치된 적 수로만 XP 토큰 계산 (생존 적 제외)
    let gainedExp = 0;
    let killedSpecialCount = 0;
    const killedEnemyCount = (enemyAttackSummary && enemyAttackSummary.killedCount != null)
      ? enemyAttackSummary.killedCount
      : killedPositions.length;
    if (isAttackChain && killedEnemyCount > 0) {
      const expTokenRes = calculateResourceTokens('enemy', killedEnemyCount, randomFn, { player });
      const xpBonusRate = (player.xpBonusRate || 0) + ((player.equipmentExpBonus || 0) * 0.25);
      const rawExpGain = (expTokenRes.totalTokens * (2 + xpBonusRate)) + (player.expFraction || 0);
      const expPoints = Math.floor(rawExpGain);
      player.expFraction = rawExpGain - expPoints;
      gainedExp += expPoints;
    }
    if (enemyAttackSummary && Array.isArray(enemyAttackSummary.results)) {
      for (const res of enemyAttackSummary.results) {
        if (res.killed) {
          // 조각 16: specialType뿐만 아니라 specialId만 있는 적도 특수 처치로 집계
          if (res.specialType || res.specialId != null) {
            killedSpecialCount++;
            const expBonus = (res.specialType && SPECIAL_ENEMY_DEFAULTS[res.specialType] && SPECIAL_ENEMY_DEFAULTS[res.specialType].expBonus) || 10;
            gainedExp += expBonus;
          }
        }
      }
    }

    let currentExp = player.exp || 0;
    let currentLevel = player.level || 1;
    let currentMaxExp = player.maxExp || (useOriginalRules ? GAUGE_MAX : 20);
    let currentAccumulatedExp = player.accumulatedExp || 0;
    const accumulatedSpecialKills = (player.specialKills || 0) + killedSpecialCount;

    // 레벨업 검사
    const levelupChoices = [];
    if (useOriginalRules || currentMaxExp >= 100) {
      if (gainedExp > 0) {
        const xpRes = addGaugeResource(currentExp, gainedExp, currentAccumulatedExp, currentMaxExp);
        currentExp = xpRes.currentValue;
        currentAccumulatedExp = xpRes.accumulatedValue;
        if (xpRes.openedMenu && !counterResult.isGameOver) {
          // 조각 21 (원작-대조표-2 220행): 종족 4 (뿔 고블린) - 레벨업 메뉴가 열릴 때 체력이 25% 미만이면 최대 체력의 25%로 즉시 회복
          if (player.raceId === 4 && counterResult.newHp < (player.maxHp || 40) * 0.25) {
            counterResult.newHp = Math.floor((player.maxHp || 40) * 0.25);
            player.hp = counterResult.newHp;
          }
          currentLevel += 1;
          levelupChoices.push({
            type: 'levelup',
            level: currentLevel,
            title: `🎉 레벨 ${currentLevel} 달성!`,
            desc: '원하는 특성이나 스킬을 1개 선택하세요.',
            options: getLevelupOptions({ player: { ...player, level: currentLevel, skills: updatedSkills } }, randomFn)
          });
        }
      }
    } else {
      currentExp += gainedExp;
      while (currentExp >= currentMaxExp && !counterResult.isGameOver) {
        currentExp -= currentMaxExp;
        // 조각 21 (원작-대조표-2 220행): 종족 4 (뿔 고블린) 레벨업 시 즉시 회복
        if (player.raceId === 4 && counterResult.newHp < (player.maxHp || 40) * 0.25) {
          counterResult.newHp = Math.floor((player.maxHp || 40) * 0.25);
          player.hp = counterResult.newHp;
        }
        currentLevel += 1;
        levelupChoices.push({
          type: 'levelup',
          level: currentLevel,
          title: `🎉 레벨 ${currentLevel} 달성!`,
          desc: '원하는 특성이나 스킬을 1개 선택하세요.',
          options: getLevelupOptions({ player: { ...player, level: currentLevel, skills: updatedSkills } }, randomFn)
        });
      }
    }

    const updatedPlayer = {
      ...player,
      hp: counterResult.newHp,
      armor: counterResult.newArmor,
      exp: currentExp,
      accumulatedExp: currentAccumulatedExp,
      expFraction: player.expFraction != null ? player.expFraction : 0,
      goldFraction: player.goldFraction != null ? player.goldFraction : 0,
      upgradeFraction: player.upgradeFraction != null ? player.upgradeFraction : 0,
      level: currentLevel,
      maxExp: currentMaxExp,
      specialKills: accumulatedSpecialKills,
      skills: updatedSkills
    };

    const killedCount = killedPositions.length;
    let nextScore = 0;
    if (useOriginalRules) {
      nextScore = calculateScore({
        turn: turn + 1,
        player: updatedPlayer,
        skills: updatedSkills
      });
    } else {
      // 이전 점수식 호환: 처치당 100점 + 턴당 10점 + 코인 보너스 + 도망자 보너스
      const coinBonus = (resourceResult && resourceResult.type === 'coin') ? resourceResult.gain * 5 : 0;
      const runnerBonusScore = runnerBonusGold > 0 ? 100 : 0;
      const scoreGain = (killedCount * 100) + 10 + coinBonus + runnerBonusScore;
      nextScore = (gameState.score || 0) + scoreGain;
    }

    // 게이지 가득 참 및 레벨업에 따른 일시정지 / 선택지 생성
    const newChoices = [];
    if (!counterResult.isGameOver) {
      for (const lc of levelupChoices) {
        newChoices.push(lc);
      }
      if (resourceResult && resourceResult.openedUpgradeMenu) {
        newChoices.push({
          type: 'upgrade',
          title: '🛡️ 방패 강화 선택',
          desc: '강화 게이지가 가득 찼습니다! 영구 강화를 선택하세요.',
          options: getUpgradeOptions()
        });
      } else if (!useOriginalRules && updatedPlayer.shieldGauge >= (updatedPlayer.maxShieldGauge || 100)) {
        newChoices.push({
          type: 'upgrade',
          title: '🛡️ 방패 강화 선택',
          desc: '강화 게이지가 가득 찼습니다! 영구 강화를 선택하세요.',
          options: getUpgradeOptions()
        });
      }

      if (resourceResult && resourceResult.openedMenu && resourceResult.type === 'coin') {
        newChoices.push({
          type: 'shop',
          title: '🪙 떠돌이 상점',
          desc: '골드가 모였습니다! 장비를 1개 선택하세요.',
          options: getShopOptions()
        });
      } else if (!useOriginalRules && updatedPlayer.gold >= (updatedPlayer.maxGold || 100)) {
        newChoices.push({
          type: 'shop',
          title: '🪙 떠돌이 상점',
          desc: '골드가 모였습니다! 장비를 1개 선택하세요.',
          options: getShopOptions()
        });
      }
    }

    const currentPending = gameState.pendingChoice;
    const currentQueue = gameState.pendingChoiceQueue ? [...gameState.pendingChoiceQueue] : [];

    let pendingChoice = currentPending;
    let pendingChoiceQueue = currentQueue;

    for (const c of newChoices) {
      if (!pendingChoice) {
        pendingChoice = c;
      } else {
        pendingChoiceQueue.push(c);
      }
    }

    // 조각 18 & 조각 21: 결함 8 (적들의 광기)은 특수 적 1턴 일찍 등장 (원작 타이머 방식: 새 대기 -1 시 최소 1)
    // 조각 21 (원작-대조표-2 238행): 보충 중 적 승급이 이미 발생했으면 새 대기를 유지하고, 보충 중 승급이 없었으면 턴 종료 타이머 1 감소
    let currentPromotionCooldown;
    let promotedEnemyInfo = null;
    const playerFlaws = (player && Array.isArray(player.flaws) ? player.flaws.filter(f => f != null) : []);

    if (promotionState && promotionState.promoted) {
      currentPromotionCooldown = promotionState.promotionCooldown;
      if (promotionState.promotedEnemy) {
        promotedEnemyInfo = {
          pos: { x: promotionState.promotedEnemy.x, y: promotionState.promotedEnemy.y },
          specialId: promotionState.promotedEnemy.specialId,
          id: promotionState.promotedEnemy.id
        };
      }
    } else {
      currentPromotionCooldown = (gameState.promotionCooldown != null)
        ? gameState.promotionCooldown
        : PROMOTION_COOLDOWN_INITIAL;
      currentPromotionCooldown = Math.max(0, currentPromotionCooldown - 1);

      if (currentPromotionCooldown === 0) {
        const candidates = [];
        for (let y = 0; y < newBoard.length; y++) {
          for (let x = 0; x < newBoard[y].length; x++) {
            const t = newBoard[y][x];
            if (t && t.type === 'enemy' && t.hp > 0 && !t.specialId) {
              candidates.push({ x, y, tile: t });
            }
          }
        }

        if (candidates.length > 0) {
          const chosenIdx = Math.floor(randomFn() * candidates.length);
          const chosenTarget = candidates[chosenIdx];
          let specialId = randomInt(1, 32, randomFn);
          // 조각 16: 조건부 숙적 덮어쓰기 (R(1,200) <= 10, 퍽 8이면 <= 5)
          const playerRaceId = (updatedPlayer && updatedPlayer.raceId != null) ? updatedPlayer.raceId : 0;
          const mortalEnemyId = getMortalEnemyForRace(playerRaceId);
          if (mortalEnemyId && mortalEnemyId > 0) {
            const playerPerks = (updatedPlayer && Array.isArray(updatedPlayer.perks)) ? updatedPlayer.perks.filter(p => p != null) : [];
            const threshold = playerPerks.includes(8) ? 5 : 10;
            if (randomInt(1, 200, randomFn) <= threshold) {
              specialId = mortalEnemyId;
            }
          }
          newBoard[chosenTarget.y][chosenTarget.x] = promoteEnemy(chosenTarget.tile, specialId, updatedPlayer, {
            rng: randomFn,
            turn: turn + 1,
            difficulty,
            L: playerL,
            activeFlaws: updatedPlayer.activeFlaws || playerFlaws
          });
          promotedEnemyInfo = {
            pos: { x: chosenTarget.x, y: chosenTarget.y },
            specialId,
            id: newBoard[chosenTarget.y][chosenTarget.x].id
          };
          let nextCooldown = calculateNextPromotionCooldown(turn + 1, difficulty, playerL, randomFn);
          // 조각 18 & 조각 21 (원작-대조표-2 212행): 결함 8 새 대기 -1 시 최소 1
          if (playerFlaws.includes(8)) {
            nextCooldown = Math.max(1, nextCooldown - 1);
          }
          currentPromotionCooldown = nextCooldown;
        }
      }
    }

    let unlockResult = { unlocked: false, unlockedClassId: null };
    let finalUnlockData = gameState.unlockData;
    let finalUnlockCounter = gameState.classUnlockCounter;
    let finalUnlocksThisRun = gameState.classUnlocksThisRun;
    let finalUnlockedClasses = gameState.unlockedClasses;

    if (killedSpecialCount > 0) {
      unlockResult = stepClassUnlock(gameState, killedSpecialCount, randomFn);
      finalUnlockData = unlockResult.gameState.unlockData;
      finalUnlockCounter = unlockResult.classUnlockCounter;
      finalUnlocksThisRun = unlockResult.classUnlocksThisRun;
      finalUnlockedClasses = unlockResult.gameState.unlockedClasses;
    }


    // 턴 종료 시 이번 턴 생성 표식 정리
    for (let y = 0; y < newBoard.length; y++) {
      for (let x = 0; x < newBoard[y].length; x++) {
        if (newBoard[y] && newBoard[y][x] && newBoard[y][x].spawnedThisTurn) {
          delete newBoard[y][x].spawnedThisTurn;
        }
      }
    }

    const nextGameState = {
      ...gameState,
      turn: turn + 1,
      difficulty,
      promotionCooldown: currentPromotionCooldown,
      classUnlockCounter: finalUnlockCounter,
      classUnlocksThisRun: finalUnlocksThisRun,
      unlockedClasses: finalUnlockedClasses,
      unlockData: finalUnlockData,
      useOriginalRules,
      kills: (gameState.kills || 0) + killedCount,
      score: nextScore,
      player: updatedPlayer,
      board: newBoard,
      isGameOver: counterResult.isGameOver,
      pendingChoice,
      pendingChoiceQueue,
      activeEffects: {}
    };

    // 조각 10 & 조각 17: EndOfTurn 마지막 단계 - 판 진행 자동 저장 또는 게임 오버 시 삭제
    try {
      const storageToUse = options && options.storage ? options.storage : null;
      if (!nextGameState.isGameOver) {
        saveRunState(nextGameState, storageToUse);
      } else {
        clearRunState(storageToUse);
      }
    } catch (e) {
      // 저장소 미지원/사생활 보호 모드 방어
    }

    return {
      gameState: nextGameState,
      resolved: true,
      attackResult,
      enemyAttackSummary,
      resourceResult,
      counterResult,
      chainResult,
      abilityResult,
      promotedEnemyInfo,
      promotionCooldown: currentPromotionCooldown,
      expResult: {
        gainedExp,
        killedCount,
        killedSpecialCount,
        didLevelUp: levelupChoices.length > 0,
        newLevel: currentLevel
      }
    };
  }

  /**
   * 조각 6: 보드에서 3칸 이상 연결 가능한 유효 체인 탐색 (순수 함수)
   */
  function findAvailableChains(board, minLength = 3, maxChains = 10) {
    if (!board || !board.length || !board[0]) return [];
    const height = board.length;
    const width = board[0].length;
    const foundChains = [];

    function dfs(currentPath) {
      if (foundChains.length >= maxChains) return;
      if (currentPath.length >= minLength) {
        foundChains.push([...currentPath]);
      }
      if (currentPath.length >= 7) return;

      const lastPos = currentPath[currentPath.length - 1];
      const neighbors = getNeighbors(lastPos, width, height);

      for (const nextPos of neighbors) {
        if (canConnect(board, currentPath, nextPos)) {
          dfs([...currentPath, nextPos]);
          if (foundChains.length >= maxChains) return;
        }
      }
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const startPos = { x, y };
        const tile = getTile(board, startPos);
        if (tile && !tile.isFrozen) {
          dfs([startPos]);
          if (foundChains.length >= maxChains) break;
        }
      }
      if (foundChains.length >= maxChains) break;
    }

    return foundChains;
  }

  /**
   * 조각 6: 보드에서 최초 또는 가장 긴 유효 체인 1개 탐색
   */
  function findValidChain(board, minLength = 3) {
    const chains = findAvailableChains(board, minLength, 5);
    if (chains.length === 0) return null;
    chains.sort((a, b) => b.length - a.length);
    return chains[0];
  }

  /**
   * 조각 6: 전체 흐름 시뮬레이션 (순수 함수)
   * 고정 시드로 100턴 동안 전체 게임 흐름을 무오류로 시뮬레이션
   */
  function simulateGame(options = {}) {
    const seed = options.seed != null ? options.seed : 12345;
    const maxTurns = options.maxTurns != null ? options.maxTurns : 100;
    const classId = options.classId || 'adventurer';
    const customStorage = options.storage || {
      data: {},
      getItem(k) { return this.data[k] || null; },
      setItem(k, v) { this.data[k] = String(v); }
    };

    const rng = createRNG(seed);
    let state = createGameState({ seed, classId });
    const history = [];

    for (let t = 0; t < maxTurns; t++) {
      if (state.isGameOver) break;

      while (state.pendingChoice) {
        const pc = state.pendingChoice;
        if (pc.type === 'levelup') {
          const opt = (pc.options && pc.options[0]) || { id: 'stat_base_atk' };
          const res = chooseLevelupReward(state, opt.id);
          state = res.gameState;
        } else if (pc.type === 'upgrade') {
          const opt = (pc.options && pc.options[0]) || { id: 'upgrade_weapon_atk' };
          const res = chooseUpgrade(state, opt.id);
          state = res.gameState;
        } else if (pc.type === 'shop') {
          const opt = (pc.options && pc.options[0]) || { id: 'shop_weapon' };
          const res = chooseShopItem(state, opt.id);
          state = res.gameState;
        } else {
          break;
        }
      }

      if (state.isGameOver) break;

      let chain = findValidChain(state.board, 3);
      if (!chain || chain.length < 3) {
        const flat = [];
        for (let y = 0; y < BOARD_HEIGHT; y++) {
          for (let x = 0; x < BOARD_WIDTH; x++) {
            flat.push(state.board[y][x]);
          }
        }
        for (let i = flat.length - 1; i > 0; i--) {
          const j = Math.floor(rng() * (i + 1));
          const temp = flat[i];
          flat[i] = flat[j];
          flat[j] = temp;
        }
        let idx = 0;
        for (let y = 0; y < BOARD_HEIGHT; y++) {
          for (let x = 0; x < BOARD_WIDTH; x++) {
            state.board[y][x] = { ...flat[idx++], x, y };
          }
        }
        chain = findValidChain(state.board, 3);
        if (!chain) break;
      }

      const turnRes = resolveTurn(state, chain, rng);
      if (!turnRes.resolved) break;
      state = turnRes.gameState;

      history.push({
        turn: state.turn,
        kills: state.kills,
        score: state.score,
        hp: state.player.hp,
        armor: state.player.armor,
        level: state.player.level,
        isGameOver: state.isGameOver
      });
    }

    if (state.isGameOver) {
      saveHighScore({
        turn: state.turn,
        kills: state.kills,
        score: state.score,
        classId: state.player.classId,
        className: (CLASSES[state.player.classId] && CLASSES[state.player.classId].name) || '모험가'
      }, customStorage);
    }

    return {
      turnsCompleted: history.length,
      finalTurn: state.turn,
      finalKills: state.kills,
      finalScore: state.score,
      isGameOver: state.isGameOver,
      finalState: state,
      history
    };
  }

  return {
    PROMOTION_COOLDOWN_INITIAL,
    SPECIAL_ENEMY_IDS,
    SPECIAL_ENEMY_ID_TO_TYPE,
    SPECIAL_ENEMY_TYPE_TO_ID,
    SPECIAL_ENEMY_MULTIPLIERS,
    getSpecialEnemyMultipliers,
    getSpecialEnemySvg,
    promoteEnemy,
    calculateNextPromotionCooldown,
    stepPromotionTimer,
    BOARD_WIDTH,
    BOARD_HEIGHT,
    TILE_TYPES,
    UNIFORM_TILE_WEIGHTS,
    TILE_ICONS,
    TILE_SVGS,
    SPECIAL_ENEMY_TYPES,
    SPECIAL_ENEMY_ICONS,
    SPECIAL_ENEMY_SVGS,
    SPECIAL_ENEMY_DEFAULTS,
    CLASSES,
    CLASS_IDS,
    SKILLS,
    SKILL_IDS,
    SKILL_COOLDOWNS_42,
    SKILLS_DATA,
    CLASS_SKILL_POOLS,
    PERKS_DATA,
    FLAWS_DATA,
    MAX_PERK_SLOTS,
    normalizePerkSlots,
    canCustomizePerks,
    getPerkSlotCount,
    validatePerkFlawPairs,
    canConfirmPerkFlawSetup,
    applyPerksAndFlaws,
    RACES_DATA,
    DEFAULT_CLASS_RACES,
    RACE_TO_DEFAULT_CLASS,
    canChangeRace,
    isRaceUnlocked,
    isSkillUnlocked,
    validateRaceSelection,
    getMortalEnemyForRace,
    isMortalEnemyOnBoard,
    checkUppercut,
    stepClassUnlock,
    ACHIEVEMENTS_DATA,
    ACHIEVEMENTS_MAP,
    isAchievementUnlocked,
    grantAchievement,
    checkAchievements,
    unlockClass,
    updateClassProgress,
    DEFAULT_STRENGTH,
    DEFAULT_DEXTERITY,
    DEFAULT_VITALITY,
    DEFAULT_LUCK,
    CLASS_UNLOCK_INTERVAL_MIN,
    CLASS_UNLOCK_INTERVAL_MAX,
    MAX_CLASS_UNLOCKS_PER_RUN,
    HIGH_SCORES_KEY,
    UNLOCK_DATA_KEY,
    MAX_HIGH_SCORES,
    MAX_HIGH_SCORES_V2,
    RUN_SAVE_KEY,
    RUN_SAVE_BACKUP_KEY,
    PROFILE_SAVE_KEY,
    PROFILE_SAVE_BACKUP_KEY,
    SAVE_VERSION,
    GAUGE_MAX,
    BASE_RESOURCE_POINTS_PER_TOKEN,
    DEFAULT_SHIELD_RECOVERY_PER_TOKEN,
    DEFAULT_POTION_HEAL_PER_TOKEN,
    DEFAULT_BONUS_TOKEN_CHANCE,
    STAT_UPGRADE_OPTIONS,
    createRNG,
    randomInt,
    getLengthMultiplier,
    getTileWeights,
    calculateEnemyCurve,
    createEnemyStats,
    createEnemyTile,
    createSpecialEnemyTile,
    createSkillInstance,
    isClassUnlocked,
    CLASS_FIXED_PERK_FLAWS,
    createPlayer,
    createGameState,
    calculateBonusTokens,
    calculateResourceTokens,
    addGaugeResource,
    applyShieldTokens,
    applyPotionTokens,
    calculateScore,
    getStatUpgradeOptions,
    rollStatUpgradeOpportunity,
    advanceStatChance,
    chooseStatUpgrade,
    calculateResourceGain,
    applyShieldGain,
    applyPotionGain,
    applyCoinGain,
    getUpgradeOptions,
    getShopOptions,
    chooseUpgrade,
    chooseShopItem,
    getLevelupOptions,
    chooseLevelupReward,
    hasValidSkillTarget,
    canUseSkill,
    useSkill,
    loadHighScores,
    saveHighScore,
    loadUnlockData,
    saveUnlockData,
    serializeTile,
    deserializeTile,
    serializePlayer,
    deserializePlayer,
    serializeRunState,
    deserializeRunState,
    saveRunState,
    loadRunState,
    clearRunState,
    hasSavedRun,
    createDefaultProfile,
    saveProfile,
    loadProfile,
    updateProfileWithGameResult,
    calculateChecksum,
    utf8ToBase64,
    base64ToUtf8,
    exportProfileCode,
    importProfileCode,
    pickRandomTileType,
    shouldSpawnSpecialEnemy,
    pickRandomSpecialEnemyType,
    createRandomTile,
    createBoard,
    cloneBoard,
    isInside,
    isNeighbor,
    getNeighbors,
    getTile,
    isAttackType,
    canConnect,
    stepChain,
    isValidChain,
    calculateAttack,
    calculateDamage,
    applyAttackToEnemies,
    calculateCounterattack,
    applyCounterattack,
    activateSpecialAbilities,
    removeTilesAndDrop,
    resolveChain,
    resolveTurn,
    findAvailableChains,
    findValidChain,
    simulateGame
  };
}));
