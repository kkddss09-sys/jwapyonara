/**
 * 고블린 레이드 (Goblin Raid) - game.js
 * 기존 화면용 window.GoblinRaid를 유지하는 얇은 연결층 (조각 14)
 * 브라우저 및 Node.js 공용 (UMD)
 * 규칙은 RuleCore(engine.js)에 전적으로 위임하며, 상태 변환과 저장소 연결만을 담당한다.
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./engine.js'], factory);
  } else if (typeof module === 'object' && module.exports) {
    let ruleCore = null;
    try {
      ruleCore = require('./engine.js');
    } catch (_) {}
    module.exports = factory(ruleCore);
  } else {
    // 브라우저: HTML을 바꾸지 않는 조건에서 game.js는 HTML 파싱 중 실행되는 현재의 일반 스크립트 조건에서
    // engine.js를 다음 인라인 스크립트보다 먼저 읽도록 파서 삽입을 요청한다 [A, 13줄, O5].
    if (typeof document !== 'undefined' && !root.RuleCore && document.readyState === 'loading') {
      document.write('<script src="engine.js"><\/script>');
    }
    root.GoblinRaid = factory(root.RuleCore);
  }
}(typeof self !== 'undefined' ? self : this, function (injectedRuleCore) {
  'use strict';

  /**
   * RuleCore 엔진 인스턴스 획득 (지연 바인딩 지원)
   */
  function getRC() {
    if (injectedRuleCore) return injectedRuleCore;
    if (typeof window !== 'undefined' && window.RuleCore) return window.RuleCore;
    if (typeof self !== 'undefined' && self.RuleCore) return self.RuleCore;
    if (typeof global !== 'undefined' && global.RuleCore) return global.RuleCore;
    if (typeof require === 'function') {
      try {
        return require('./engine.js');
      } catch (_) {}
    }
    return null;
  }

  // ==========================================
  // [O1] 화면용 상수 및 메타데이터 정의
  // ==========================================
  const BOARD_WIDTH = 6;
  const BOARD_HEIGHT = 6;
  const MAX_PERK_SLOTS = 4;
  let lastActiveGameState = null;

  // 조각 29: 난이도 4단계 이름 목록 및 변환 헬퍼 [추가 29.1, 29.2]
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

  const TILE_ICONS = {
    sword: '⚔️',
    shield: '🛡️',
    potion: '🧪',
    coin: '🪙',
    enemy: '💀',
    phylactery: '🏺'
  };

  const TILE_SVGS = {
    sword: 'assets/icons/tile-sword.svg',
    shield: 'assets/icons/tile-shield.svg',
    potion: 'assets/icons/tile-potion.svg',
    coin: 'assets/icons/tile-coin.svg',
    enemy: 'assets/icons/tile-enemy.svg',
    phylactery: 'assets/icons/enemy-boss.svg'
  };

  const SPECIAL_ENEMY_ICONS = {
    runner: '🏃',
    healer: '🌿',
    acid: '☣️',
    fire: '🔥',
    ice: '❄️',
    bomb: '💣',
    convert: '🧙',
    1: '💀', 2: '되비침', 3: '🏃', 4: '🌿', 5: '두꺼운막',
    6: '☣️', 7: '🔥', 8: '❄️', 9: '독침', 10: '💣',
    11: '🧙', 12: '수리막기', 13: '훔침', 14: '뛰기', 15: '충전막기',
    16: '아래찌르기', 17: '따라막기', 18: '둘바꾸기', 19: '방바꾸기', 20: '되찾기',
    21: '격해짐', 22: '금내기', 23: '아래밀기', 24: '적끌기', 25: '장비끌기',
    26: '던지기', 27: '위로만', 28: '깎기', 29: '마모', 30: '받아내기',
    31: '위로탈출', 32: '다시섬'
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
    normal: 'assets/icons/tile-enemy.svg'
  };
  for (let i = 1; i <= 32; i++) {
    SPECIAL_ENEMY_SVGS[i] = 'assets/icons/enemy-boss.svg';
  }
  SPECIAL_ENEMY_SVGS[3] = 'assets/icons/enemy-runner.svg';
  SPECIAL_ENEMY_SVGS[4] = 'assets/icons/enemy-healer.svg';
  SPECIAL_ENEMY_SVGS[6] = 'assets/icons/enemy-acid.svg';
  SPECIAL_ENEMY_SVGS[7] = 'assets/icons/enemy-fire.svg';
  SPECIAL_ENEMY_SVGS[8] = 'assets/icons/enemy-ice.svg';
  SPECIAL_ENEMY_SVGS[10] = 'assets/icons/enemy-bomb.svg';
  SPECIAL_ENEMY_SVGS[11] = 'assets/icons/enemy-convert.svg';

  function getSpecialEnemySvg(specialIdOrType) {
    if (typeof specialIdOrType === 'number') {
      const sId = Math.floor(specialIdOrType);
      return SPECIAL_ENEMY_SVGS[sId] || 'assets/icons/enemy-boss.svg';
    }
    if (typeof specialIdOrType === 'string') {
      if (SPECIAL_ENEMY_SVGS[specialIdOrType]) {
        return SPECIAL_ENEMY_SVGS[specialIdOrType];
      }
    }
    return 'assets/icons/tile-enemy.svg';
  }

  // 직업 10종 정의 [M1]
  const CLASSES = {
    adventurer: {
      id: 'adventurer',
      key: 'adventurer',
      classKey: 0,
      name: '길잡이',
      title: '균형 잡힌 방랑자',
      desc: '모든 능력치가 균형 잡힌 다재다능한 길잡이입니다.',
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
    ranger: {
      id: 'ranger',
      key: 'ranger',
      classKey: 1,
      name: '정찰병',
      title: '숲의 궁수',
      desc: '무기 공격력이 뛰어나 원거리에서 적을 꿰뚫습니다.',
      unlockDesc: '적과 거리를 두고 활과 칼을 능숙하게 다루는 방랑 사냥꾼이 무리에 합류했습니다.',
      maxHp: 50,
      maxArmor: 3,
      baseAtk: 3,
      weaponAtk: 2,
      canCustomizePerks: true,
      startingSkill: 'slash_row',
      unlockRequirement: 1,
      defaultRaceId: 1,
      fixedPerkId: 6,
      fixedFlawId: 6,
      iconSvg: 'assets/icons/class-ranger.svg'
    },
    raider: {
      id: 'raider',
      key: 'raider',
      classKey: 2,
      name: '도굴꾼',
      title: '던전 도굴꾼',
      desc: '전투와 자원 수급 능력을 능숙하게 결합합니다.',
      unlockDesc: '더 큰 위험과 영광을 찾아 깊은 던전에서 돌아온 도굴꾼이 합류했습니다.',
      maxHp: 50,
      maxArmor: 4,
      baseAtk: 3,
      weaponAtk: 2,
      canCustomizePerks: true,
      startingSkill: 'convert_coin_to_sword',
      unlockRequirement: 2,
      defaultRaceId: 6,
      fixedPerkId: 2,
      fixedFlawId: 2,
      iconSvg: 'assets/icons/class-raider.svg'
    },
    priest: {
      id: 'priest',
      key: 'priest',
      classKey: 3,
      name: '치유사',
      title: '신성한 수호자',
      desc: '풍부한 체력과 치유력으로 끈질기게 생존합니다.',
      unlockDesc: '간절한 기도와 치유의 기적이 응답받아 전장의 치유사가 모습을 드러냈습니다.',
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
      key: 'barbarian',
      classKey: 4,
      name: '돌격대',
      title: '광전사',
      desc: '압도적인 기본 완력으로 적을 분쇄합니다.',
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
      key: 'mage',
      classKey: 5,
      name: '해독가',
      title: '원소술사',
      desc: '체력은 약하지만 강력한 마법 폭발을 다룹니다.',
      unlockDesc: '신비로운 비전 물약과 마법의 심연을 연구하던 해독가가 합류했습니다.',
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
      key: 'rogue',
      classKey: 6,
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
      key: 'paladin',
      classKey: 7,
      name: '호위병',
      title: '철벽의 기사',
      desc: '가장 높은 방어력과 치유력으로 든든하게 버팁니다.',
      unlockDesc: '한결같은 경계심과 강철 같은 맹세로 전선을 수호하는 호위병입니다.',
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
    warrior: {
      id: 'warrior',
      key: 'warrior',
      classKey: 8,
      name: '칼잡이',
      title: '강철의 검사',
      desc: '높은 체력과 강력한 공격력으로 전장을 제압합니다.',
      unlockDesc: '부족과 동료를 위한 끝없는 헌신으로 방패를 든 강철의 칼잡이입니다.',
      maxHp: 60,
      maxArmor: 4,
      baseAtk: 3,
      weaponAtk: 2,
      canCustomizePerks: true,
      startingSkill: 'slash_row',
      unlockRequirement: 8,
      defaultRaceId: 2,
      fixedPerkId: 9,
      fixedFlawId: 9,
      iconSvg: 'assets/icons/class-warrior.svg'
    },
    assassin: {
      id: 'assassin',
      key: 'assassin',
      classKey: 9,
      name: '암행병',
      title: '죽음의 칼날',
      desc: '극도의 치명적인 공격력으로 적을 한순간에 처치합니다.',
      unlockDesc: '그림자 속에서 적의 숨통을 단숨에 끊어내는 치명적인 암행병입니다.',
      maxHp: 50,
      maxArmor: 4,
      baseAtk: 3,
      weaponAtk: 2,
      canCustomizePerks: true,
      startingSkill: 'slash_row',
      unlockRequirement: 9,
      defaultRaceId: 7,
      fixedPerkId: 3,
      fixedFlawId: 3,
      iconSvg: 'assets/icons/class-assassin.svg'
    }
  };

  const CLASS_IDS = Object.keys(CLASSES);

  const CLASS_KEY_TO_ID = {
    0: 'adventurer',
    1: 'ranger',
    2: 'raider',
    3: 'priest',
    4: 'barbarian',
    5: 'mage',
    6: 'rogue',
    7: 'paladin',
    8: 'warrior',
    9: 'assassin'
  };

  const CLASS_ID_TO_KEY = {
    adventurer: 0,
    ranger: 1,
    raider: 2,
    priest: 3,
    barbarian: 4,
    mage: 5,
    rogue: 6,
    paladin: 7,
    warrior: 8,
    assassin: 9
  };

  // 퍽 10종 정의 [M3]
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

  // 결함 10종 정의 [M3]
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

  // 종족 10종 정의 [M4]
  const RACES_DATA = [
    {
      id: 0,
      key: 'human',
      name: '평원 탐험단',
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
      name: '숲 탐험단',
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
      name: '땅굴 탐험단',
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
      name: '늪 탐험단',
      bonusName: '보물 탐색',
      bonusDesc: '상점에서 장비 대신 스킬이 보일 확률이 2배가 됩니다.',
      mortalEnemyId: 13,
      mortalEnemyName: '도둑괴물',
      mortalEnemyDesc: '골드를 훔칠 때 자신의 공격력의 2배만큼 플레이어에게 직접 체력 피해를 줍니다.',
      icon: '🦎'
    },
    {
      id: 4,
      key: 'faun',
      name: '뿔 탐험단',
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
      name: '덩치 탐험단',
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
      name: '꼬마 탐험단',
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
      name: '늑대 탐험단',
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
      name: '용혈 탐험단',
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
      name: '변신 탐험단',
      bonusName: '형태 변환',
      bonusDesc: '특수 적을 처치할 때마다 장착한 스킬 중 1개의 쿨다운이 즉시 완전히 충전됩니다.',
      mortalEnemyId: 19,
      mortalEnemyName: '불안정괴물',
      mortalEnemyDesc: '카운트가 끝나면 적이 있고 칼이 없는 새 방으로 판이 통째로 바뀝니다.',
      icon: '🎭'
    }
  ];

  // 업적 78종 메타데이터 [N1]
  const ACHIEVEMENTS_DATA = [
    { id: 'ach_special_kill_1', key: 'first_special_kill', index: 46, name: '첫 가짜 좌표 지도 얻음', desc: '특수 적을 1마리 처치하세요.', icon: '💀' },
    { id: 'ach_special_kill_10', key: 'special_hunter_10', index: 46, name: '변종 학살자', desc: '특수 적을 누적 10마리 처치하세요.', icon: '⚔️' },
    { id: 'ach_class_level_5', key: 'class_level_5', index: 29, name: '고블린 숙련병', desc: '어떤 직업이든 직업 레벨 5를 달성하세요.', icon: '🎖️' },
    { id: 'ach_class_level_10', key: 'class_level_10', index: 30, name: '베테랑 탐험대장', desc: '어떤 직업이든 직업 레벨 10을 달성하세요.', icon: '👑' },
    { id: 'ach_unlock_all_classes', key: 'unlock_all_classes', index: 28, name: '부족의 지도자', desc: '모든 직업을 해제하세요.', icon: '🏆' },
    { id: 'ach_survive_50_turns', key: 'survive_50_turns', index: 32, name: '끈질긴 생명력', desc: '한 판에서 50턴 이상 생존하세요.', icon: '⏳' },
    { id: 'ach_chain_12_tiles', key: 'chain_12_tiles', index: 52, name: '전설의 일격', desc: '한 번에 12칸 이상의 체인을 연결하세요.', icon: '⚡' },
    { id: 'ach_reach_10000_score', key: 'reach_10000_score', index: 33, name: '만점 고블린', desc: '점수 10,000점 이상을 달성하세요.', icon: '🌟' },
    { id: 'ach_reach_50000_score', key: 'reach_50000_score', index: 33, name: '던전의 지배자', desc: '점수 50,000점 이상을 달성하세요.', icon: '💎' },
    { id: 'ach_secret_nemesis', key: 'secret_nemesis', index: 40, name: '가짜 좌표 대장과의 결전', desc: '자신의 숙적 몬스터를 조우하여 처치하세요.', icon: '🔥' }
  ];

  // 스킬 데이터 메타
  const SKILLS_DATA = [
    { id: 0, key: 'steal', name: '공격하면 코인 얻기', desc: '이번 턴 공격한 적마다 골드를 강탈합니다.', cooldown: 13, icon: '💰' },
    { id: 1, key: 'freeze', name: '적 전부 얼리기', desc: '판의 모든 적을 동결하여 공격을 차단합니다.', cooldown: 16, icon: '❄️' },
    { id: 2, key: 'heal', name: '물약 전부 먹기', desc: '판에 있는 모든 회복 물약을 즉시 수집합니다.', cooldown: 15, icon: '💖' },
    { id: 3, key: 'repair', name: '방패 전부 줍기', desc: '판에 있는 모든 방패를 즉시 수집합니다.', cooldown: 16, icon: '🛡️' },
    { id: 4, key: 'counterattack', name: '적이 자기를 때리게 하기', desc: '이번 턴 모든 적이 자신을 공격하여 자멸하게 합니다.', cooldown: 18, icon: '🔄' },
    { id: 5, key: 'shatter', name: '일반 적 약하게 만들기', desc: '모든 일반 적의 방어력을 0, 공격력을 최대 1로 낮춥니다.', cooldown: 18, icon: '🔨' },
    { id: 6, key: 'golden_touch', name: '칼을 전부 코인으로', desc: '판의 모든 칼(화살 제외)을 코인으로 변환합니다.', cooldown: 15, icon: '🪙' },
    { id: 7, key: 'teleport', name: '적 없는 새 판으로', desc: '적이 없는 새로운 칸들로 판 전체를 교체합니다.', cooldown: 20, icon: '🌀' },
    { id: 8, key: 'explosive_potion', name: '물약을 폭탄으로', desc: '물약을 폭발 물약으로 바꿔 연결 시 주변 칸을 파괴합니다.', cooldown: 18, icon: '💣' },
    { id: 9, key: 'skill_elixir', name: '물약을 경험치로', desc: '모든 회복 물약을 경험치로 변환해 수집합니다.', cooldown: 18, icon: '🧪' },
    { id: 10, key: 'enchant', name: '장비 강화 바로 열기', desc: '소지한 장비를 즉시 1회 강화합니다.', cooldown: 35, icon: '✨' },
    { id: 11, key: 'slash', name: '가로 한 줄 쓸기', desc: '무작위 가로 한 줄의 일반 칸을 즉시 수집합니다.', cooldown: 12, icon: '⚔️' },
    { id: 12, key: 'treasure', name: '코인 전부 줍기', desc: '판에 있는 모든 코인을 즉시 수집합니다.', cooldown: 18, icon: '👑' },
    { id: 13, key: 'scavenge', name: '칼을 전부 방패로', desc: '판의 모든 칼(화살 제외)을 방패로 변환합니다.', cooldown: 15, icon: '🛡️' },
    { id: 14, key: 'disarm', name: '일반 적을 칼로 바꾸기', desc: '판의 모든 일반 적을 칼로 변환합니다.', cooldown: 25, icon: '🗡️' },
    { id: 15, key: 'dazzle', name: '코인을 전부 칼로', desc: '판의 모든 코인을 칼로 변환합니다.', cooldown: 15, icon: '✨' },
    { id: 16, key: 'boost_damage', name: '이번 턴 칼 공격 2배', desc: '이번 턴 동안 무기 공격력이 2배가 됩니다.', cooldown: 14, icon: '🔥' },
    { id: 17, key: 'boost_gold', name: '이번 턴 코인 2배', desc: '이번 턴 골드 수집량이 2배가 됩니다.', cooldown: 15, icon: '💰' },
    { id: 18, key: 'boost_health', name: '이번 턴 회복 2배', desc: '이번 턴 물약 회복 효과가 2배가 됩니다.', cooldown: 15, icon: '❤️' },
    { id: 19, key: 'boost_armour', name: '이번 턴 방패 수리·강화 2배', desc: '이번 턴 갑옷 수집 효과가 2배가 됩니다.', cooldown: 15, icon: '🛡️' },
    { id: 20, key: 'exorcise', name: '특수 적 하나를 일반으로', desc: '무작위 특수 적 1마리를 스탯을 유지한 일반 적으로 정화합니다.', cooldown: 18, icon: '✨' },
    { id: 21, key: 'banish', name: '특수 적 하나 지우기', desc: '무작위 특수 적 1마리를 보상 없이 즉시 소멸시킵니다.', cooldown: 20, icon: '💨' },
    { id: 22, key: 'trap', name: '새로 나오는 적 체력 1', desc: '이번 턴 새로 등장하는 적의 체력을 1로 만듭니다.', cooldown: 18, icon: '🕸️' },
    { id: 23, key: 'big_game_hunter', name: '적 하나 강하게 키우기', desc: '무작위 일반 적 1마리를 특수 적으로 승급시킵니다.', cooldown: 15, icon: '🎯' },
    { id: 24, key: 'treasure_chamber', name: '새 칸을 전부 코인으로', desc: '이번 턴 새로 보충되는 모든 칸이 코인이 됩니다.', cooldown: 25, icon: '🏛️' },
    { id: 25, key: 'magic_sword', name: '칼 하나 5배 마법칼', desc: '무작위 칼 1개를 공격력 5배 마법 칼로 변환합니다.', cooldown: 14, icon: '🗡️' },
    { id: 26, key: 'earthquake', name: '판 전체 섞기', desc: '판의 모든 칸을 무작위로 재배치합니다.', cooldown: 12, icon: '💥' },
    { id: 27, key: 'explosive_armour', name: '방패로 적 전체 공격', desc: '현재 방패 수치의 2배 피해로 모든 적을 공격합니다.', cooldown: 16, icon: '💥' },
    { id: 28, key: 'fireball', name: '3×3 구역 쓸기', desc: '무작위 3×3 구역의 일반 칸을 즉시 수집합니다.', cooldown: 14, icon: '☄️' },
    { id: 29, key: 'mana_potion', name: '물약을 충전형으로', desc: '판의 모든 물약을 쿨다운 감소 마나 물약으로 변환합니다.', cooldown: 20, icon: '🧪' },
    { id: 30, key: 'hack', name: '세로 한 줄 칼로 바꾸기', desc: '무작위 세로줄의 모든 칸을 칼로 변환합니다.', cooldown: 24, icon: '⚔️' },
    { id: 31, key: 'volley', name: '칼을 전부 화살로', desc: '칼을 화살로 바꿔 한 칸 떨어진 적을 연결할 수 있게 합니다.', cooldown: 15, icon: '🏹' },
    { id: 32, key: 'masochism', name: '코인을 적으로 바꾸기', desc: '판의 모든 코인을 적 칸으로 변환합니다.', cooldown: 15, icon: '🩸' },
    { id: 33, key: 'sweep_once', name: '판 전체 한 번에 쓸기(1회용)', desc: '', cooldown: -1, icon: '🌪️' },
    { id: 33, key: 'wish', name: '판 전체 한 번에 쓸기(1회용)', desc: '단 1회 사용하여 판의 일반 칸을 즉시 수집합니다.', cooldown: -1, singleUse: true, icon: '🌠' },
    { id: 34, key: 'berserk', name: '처치한 적만큼 회복', desc: '이번 턴 처치한 적의 공격력만큼 체력을 회복합니다.', cooldown: 14, icon: '💢' },
    { id: 35, key: 'rune', name: '고리 모양으로 안쪽 수집', desc: '이번 턴 닫힌 경로를 이으면 내부 칸도 함께 수집합니다.', cooldown: 12, icon: '🔮' },
    { id: 36, key: 'greed', name: '코인 옆 적 전부 처치', desc: '코인 칸 옆의 모든 일반 적을 즉시 처치합니다.', cooldown: 25, icon: '🪙' },
    { id: 37, key: 'last_stand', name: '죽을 때 한 번 부활', desc: '이번 턴 치명상을 입으면 체력을 완전히 회복합니다.', cooldown: 35, icon: '🛡️' },
    { id: 38, key: 'charge', name: '판 가장자리 쓸기', desc: '판 바깥 테두리 칸의 일반 칸을 모두 즉시 수집합니다.', cooldown: 18, icon: '⚡' },
    { id: 39, key: 'haste', name: '연결 칸 만들기', desc: '서로 다른 두 칸 종류를 잇는 사슬 칸을 생성합니다.', cooldown: 16, icon: '⛓️' },
    { id: 40, key: 'shock', name: '윗부분 코인·방패 쓸기', desc: '위쪽 절반 구역의 코인과 방패를 모두 수집합니다.', cooldown: 14, icon: '⚡' },
    { id: 41, key: 'awe', name: '아랫부분 물약·방패 쓸기', desc: '아래쪽 절반 구역의 물약과 방패를 모두 수집합니다.', cooldown: 14, icon: '💫' }
  ];

  // ── 초보자용 설명 (스킬·보스). 화면의 카드와 설명 창이 이 글을 그대로 보여 준다 ──
  // 강화 메뉴 카드 = 장비에 붙은 능력 20가지 중 하나를 올리는 것. 번호마다 실제로 무엇이 오르는지 쉬운 말로 적는다.
  const BOOST_HELP = {
    0: ['무기 공격력', '칼로 공격할 때 피해가 늘어요.'],
    1: ['기본 공격력', '장비 없이도 들어가는 기본 공격이 세져요.'],
    2: ['흡혈', '공격으로 준 피해의 일부만큼 내 체력이 회복돼요.'],
    3: ['독 공격', '공격한 적에게 독이 걸려 체력이 더 깎여요.'],
    4: ['관통', '적의 방어를 일부 무시하고 피해를 줘요.'],
    5: ['스킬 대기 단축', '내 모든 스킬의 대기 시간이 1턴 줄어요.'],
    6: ['경험치 추가', '경험치를 얻는 양이 늘어요.'],
    7: ['코인 추가', '코인을 얻는 양이 늘어요.'],
    8: ['공격 + 경험치 보너스', '기본 공격이 올라가고, 경험치 보너스가 터질 확률이 5%p 늘어요.'],
    9: ['회복 + 코인 보너스', '물약 회복량이 올라가고, 코인 보너스가 터질 확률이 5%p 늘어요.'],
    10: ['최대 체력', '최대 체력이 10 늘어나고, 지금 체력도 10 회복돼요.'],
    11: ['최대 방패', '최대 방패가 1 늘어나고, 방패도 1 채워져요.'],
    12: ['가시', '적이 나를 공격하면 그 적도 피해를 입어요.'],
    13: ['강화 게이지 추가', '방패로 강화 게이지가 차는 양이 늘어요.'],
    14: ['방패 손상 감소', '적의 반격에 방패가 깨질 확률이 줄어요.'],
    15: ['반격 약화', '적이 반격한 뒤 그 적의 공격력이 깎여요.'],
    16: ['방패 복구', '방패를 모을 때 복구되는 양이 늘어요.'],
    17: ['턴 회복', '매 턴 체력이 조금씩 자동으로 회복돼요.'],
    18: ['복구 + 방패 보너스', '방패 복구량이 올라가고, 방패 보너스가 터질 확률이 5%p 늘어요.'],
    19: ['체력 성장 + 물약 보너스', '체력 성장이 올라가고, 물약 보너스가 터질 확률이 5%p 늘어요.']
  };
  function boostTitle(boostId, amount) {
    const b = BOOST_HELP[boostId];
    if (!b) return `${slotNameKo(0)} 강화`;
    const unitless = [5, 8, 9, 18, 19];
    if (unitless.includes(boostId) || !amount) return b[0];
    if (boostId === 2 || boostId === 4) return `${b[0]} +${amount}%`;
    if (boostId === 6 || boostId === 7 || boostId === 13) return `${b[0]} +${amount * 25}%`;
    if (boostId === 14) return `${b[0]} ${amount}%p`;
    return `${b[0]} +${amount}`;
  }

  // 상점 장비 카드 = 지금 끼고 있는 그 칸 장비의 강화판 (새 장비로 갈아끼우는 것이 아님)
  const GEAR_UPGRADE_HELP = [
    '무기를 강화해요. 무기 공격력이 +1 올라요. 붙어 있는 다른 능력이 가끔 줄고, 그만큼 공격력이 더 올라요.',
    '머리 장비를 강화해요. 최대 방패가 +1 올라요. 붙어 있는 다른 능력이 가끔 바뀌어요.',
    '방패를 강화해요. 최대 방패가 +1 올라요. 20% 확률로 +2가 돼요.',
    '몸통 장비를 강화해요. 최대 방패가 +1 올라요. 대신 무기 공격력이 줄 수 있어요.',
    '장신구를 강화해요. 최대 체력이 늘어나요. 가끔 새 능력이 하나 붙어요.'
  ];

  const SKILL_HELP = {
    0: '이번 턴 줄로 공격한 적마다 코인을 1개씩 얻어요.',
    1: '판의 모든 적을 얼려요. 얼린 적은 반격하지 못해요.',
    2: '판에 있는 물약을 한꺼번에 모아서 체력을 회복해요.',
    3: '판에 있는 방패를 한꺼번에 모아서 방패를 채워요.',
    4: '이번 적의 반격 때 적들이 자기 공격력으로 스스로를 때려요. 나는 반격을 받지 않아요.',
    5: '일반 적의 방어를 0으로, 공격력은 최대 1로 낮춰요. 특수 적(보스)은 그대로예요.',
    6: '판의 칼을 모두 코인으로 바꿔요. 화살 칼은 그대로예요.',
    7: '판 전체를 적이 없는 새 칸들로 바꿔요. 위기 탈출용이에요.',
    8: '판의 물약을 폭발 물약으로 바꿔요. 모으면 주변 칸까지 함께 터져요.',
    9: '판의 물약을 모두 모아 경험치로 바꿔요. 레벨업이 빨라져요.',
    10: '장비 강화 메뉴를 바로 열어 장비를 하나 강화해요.',
    11: '무작위 가로줄 한 줄을 통째로 모아요. 특수 적은 빼고 모아요.',
    12: '판의 코인을 전부 모아요.',
    13: '판의 칼을 모두 방패로 바꿔요. 화살 칼은 그대로예요.',
    14: '일반 적을 칼로 바꿔 버려요. 특수 적은 그대로예요.',
    15: '판의 코인을 모두 칼로 바꿔요.',
    16: '이번 턴만 칼의 공격력이 2배가 돼요.',
    17: '이번 턴만 코인을 얻는 양이 2배가 돼요.',
    18: '이번 턴만 물약 회복량이 2배가 돼요. 산성 물약의 피해는 그대로예요.',
    19: '이번 턴만 방패 수리와 강화 게이지 충전이 2배가 돼요.',
    20: '특수 적(보스) 한 마리를 일반 적으로 되돌려요. 체력 같은 능력치는 그대로예요.',
    21: '특수 적(보스) 한 마리를 보상 없이 지워요.',
    22: '이번 턴에 새로 나오는 적의 체력이 1이 돼요.',
    23: '일반 적 한 마리를 특수 적으로 키워요. 더 강해지니 조심하세요.',
    24: '이번 턴에 새로 채워지는 칸이 전부 코인이 돼요.',
    25: '칼 하나를 마법 칼로 만들어요. 이번 턴 그 칼의 공격력이 5배예요.',
    26: '판의 칸들을 무작위로 뒤섞어요.',
    27: '지금 방패의 2배만큼 모든 적에게 피해를 줘요. 방패는 줄지 않아요.',
    28: '무작위 3×3 구역(9칸)을 한 번에 모아요. 특수 적은 빼고 모아요.',
    29: "판의 물약을 '충전 물약'으로 바꿔요. 모으면 스킬 대기 시간이 1턴 줄어요.",
    30: '무작위 세로줄 한 줄의 칸을 모두 칼로 바꿔요. 특수 적은 그대로예요.',
    31: '칼을 화살로 바꿔요. 화살 칼은 한 칸 떨어진 적도 이을 수 있어요.',
    32: '판의 코인을 전부 적으로 바꿔요. 위험하지만 칼로 잡을 수 있어요.',
    33: '특수 적(보스)을 뺀 판의 모든 칸을 한 번에 모아요. 한 번 쓰면 사라지는 스킬이에요.',
    34: '이번 턴에 처치한 적들의 공격력을 모두 더한 만큼 체력을 회복해요.',
    35: '4칸 이상으로 이은 줄의 처음과 끝이 맞닿아 고리가 되면, 안쪽 칸도 함께 모아요.',
    36: '코인 옆에 붙은 일반 적을 한꺼번에 모아서 처치해요.',
    37: '이번 턴에 치명상을 입어도 체력이 가득 차며 한 번 살아나요.',
    38: '판 가장자리 20칸을 모두 모아요. 특수 적은 빼고 모아요.',
    39: "'연결 칸'을 하나 만들어요. 연결 칸은 서로 다른 종류의 칸도 이어 줘요.",
    40: '판 위쪽 3줄의 코인과 방패를 모두 모아요. 아랫부분 스킬과 같은 턴에 쓰면 연결 칸도 생겨요.',
    41: '판 아래쪽 3줄의 물약과 방패를 모두 모아요. 윗부분 스킬과 같은 턴에 쓰면 연결 칸도 생겨요.'
  };
  SKILLS_DATA.forEach(sk => { if (SKILL_HELP[sk.id]) sk.desc = SKILL_HELP[sk.id]; });

  function getSkillInfo(actionKey, owned) {
    const sk = SKILLS_DATA.find(x => x && x.id === actionKey);
    if (!sk) return null;
    const wait = sk.cooldown < 0 ? '한 번만 쓸 수 있어요' : `다시 쓰려면 ${sk.cooldown}턴이 걸려요`;
    return {
      id: sk.id, name: sk.name, icon: sk.icon, text: sk.desc, wait,
      full: `${sk.desc} (${wait}${owned && sk.cooldown >= 0 ? ' · 이미 가진 스킬이라 고르면 1턴 줄어요' : ''})`
    };
  }

  const BOSS_HELP = {
    1: ['큰몸', '공격·방어·체력이 모두 높은 튼튼한 적이에요. 특별한 능력은 없어요.'],
    2: ['되비침', '줄로 이 적을 공격하면, 내가 준 공격 피해가 내 체력에도 한 번 되돌아와요.'],
    3: ['달아남', '머리 위 숫자(카운트)가 0이 되면 보상 없이 도망가요. 그 전에 잡으면 코인을 15~25개 줘요.'],
    4: ['돕기', '매 턴 다친 다른 적을 최대 2마리 치료해요. 다친 적이 없으면 다른 적 2마리의 공격력을 1 올려요.'],
    5: ['두꺼운막', '방어가 아주 높아요. 칼을 많이 모아 한 번에 크게 때려야 해요.'],
    6: ['시큼바꾸기', '매 턴 판의 정상 물약 하나를 산성 물약으로 바꿔요. 산성 물약을 모으면 체력이 깎여요.'],
    7: ['불씨', '매 턴 주변 8칸에 불을 붙여요. 불붙은 칸을 줄에 넣으면 내가 불 피해를 입어요.'],
    8: ['서리', '매 턴 주변 칸을 최대 2칸 얼려요. 얼어붙은 칸은 줄로 이을 수 없어요.'],
    9: ['독침', '반격이 내 체력에 닿으면 독이 걸려요. 정상 물약을 모으면 독이 풀려요.'],
    10: ['터짐', '머리 위 카운트가 0이 되면 터져서 내 체력이 절반이 돼요. 그 전에 잡으면 주변 8칸이 함께 모아져요.'],
    11: ['칼바꾸기', '매 턴 칼 하나를 적으로 바꿔요. 내 칼이 줄어드니 빨리 잡는 게 좋아요.'],
    12: ['수리막기', '이 적이 있는 동안에는 방패를 모아도 수리가 안 되고 강화 게이지로만 들어가요.'],
    13: ['훔침', '매 턴 판의 코인을 최대 2개 지워 버려요. 판에 코인이 없으면 내 골드를 최대 2점 훔쳐요.'],
    14: ['뛰기', '매 턴 다른 칸으로 뛰어올라 그 칸과 자리를 바꿔요. 위치가 계속 바뀌어요.'],
    15: ['충전막기', '이 적이 있는 동안 스킬 대기 시간이 저절로 줄지 않아요. 충전 물약은 그대로 효과가 있어요.'],
    16: ['아래찌르기', '판 맨 아래에 있으면 매 턴 자기 공격력의 2배로 내 체력을 직접 때려요.'],
    17: ['따라막기', '방어력이 항상 내 현재 방패 수치와 같아져요. 내 방패가 높을수록 더 단단해요.'],
    18: ['둘바꾸기', '매 턴 일반 칸 2개를 무작위로 다른 종류로 바꿔요.'],
    19: ['방바꾸기', '머리 위 카운트가 0이 되면 판 전체가 새 판으로 바뀌어요.'],
    20: ['되찾기', '반격이 내 체력에 닿으면, 그 공격력만큼 이 적의 체력이 회복돼요.'],
    21: ['격해짐', '다른 적이 공격으로 처치될수록 이 적의 공격력이 올라가요.'],
    22: ['금내기', '매 턴 칼이나 방패 하나를 깨뜨려 못 쓰게 만들어요.'],
    23: ['아래밀기', '각 줄에서 자기 바로 아래 칸을 보상 없이 지워 버려요.'],
    24: ['적끌기', '멀리 있는 적을 자기 곁으로 끌어와 주변 칸과 자리를 바꿔요.'],
    25: ['장비끌기', '멀리 있는 칼이나 방패를 자기 곁으로 끌어와 주변 칸과 자리를 바꿔요.'],
    26: ['던지기', '다른 일반 적 한 마리를 던져요. 던져진 적의 체력만큼 내 체력이 깎여요.'],
    27: ['위로만', '줄에서 이 적 다음 칸이 위쪽일 때만 피해가 들어가요. 옆이나 아래에서 이으면 막혀요.'],
    28: ['깎기', '머리 위 카운트가 0이 되면 내 장비 하나의 능력치를 깎아요.'],
    29: ['마모', '이 적이 있는 동안 적의 반격에 방패가 반드시 손상돼요.'],
    30: ['받아내기', '다른 적에게 가는 일반 공격을 대신 받아요. 이 적부터 처치하세요.'],
    31: ['위로탈출', '나타나자마자 맨 아래로 내려갔다가 매 턴 한 칸씩 위로 올라가 도망가요. 낙하하면서 닿으면 내 체력을 깎아요.'],
    32: ['다시섬', '처음 죽을 때 사라지지 않고 체력 1의 약한 상태로 버티다가, 다음 턴에 다시 강해져 돌아와요.']
  };
  function getEnemyInfo(kind) {
    const b = BOSS_HELP[kind];
    return b ? { id: kind, name: b[0], text: b[1] } : null;
  }


  // ==========================================
  // 저장소(Storage) 대역 (브라우저 localStorage 및 메모리 대역)
  // ==========================================
  const memoryStorage = {};
  const storage = {
    getItem(key) {
      try {
        if (typeof localStorage !== 'undefined' && localStorage) {
          return localStorage.getItem(key);
        }
      } catch (_) {}
      return memoryStorage[key] != null ? memoryStorage[key] : null;
    },
    setItem(key, value) {
      try {
        if (typeof localStorage !== 'undefined' && localStorage) {
          localStorage.setItem(key, value);
          return;
        }
      } catch (_) {}
      memoryStorage[key] = String(value);
    },
    removeItem(key) {
      try {
        if (typeof localStorage !== 'undefined' && localStorage) {
          localStorage.removeItem(key);
          return;
        }
      } catch (_) {}
      delete memoryStorage[key];
    }
  };

  // ==========================================
  // [O3, O4] 상태 변환층 (RuleCore session <-> 화면 GameState)
  // ==========================================

  /**
   * 새 엔진 session을 화면이 읽는 GameState 모양으로 변환
   */
  function sessionToGameState(session) {
    if (!session) return null;
    const RC = getRC();
    const BOARD_W = (RC && RC.BOARD_WIDTH) || BOARD_WIDTH || 6;
    const BOARD_H = (RC && RC.BOARD_HEIGHT) || BOARD_HEIGHT || 6;

    // 6x6 2차원 board 배열 생성
    const board = [];
    for (let y = 0; y < BOARD_H; y++) {
      const row = [];
      for (let x = 0; x < BOARD_W; x++) {
        const c = session.cells ? session.cells.find(cell => cell.x === x && cell.y === y) : null;
        if (!c) {
          row.push({ x, y, type: 'potion', hp: 0, armor: 0, atk: 0, id: `c_${x}_${y}` });
        } else {
          const isEnemy = (c.kind === 'enemy' || c.kindCode === 1);
          const enemy = c.enemy;
          const specialId = (enemy && enemy.enemyKind > 0) ? enemy.enemyKind : null;

          // [O4] 화면용 적 isPoisoned는 종족 1일 때만 true로 변환 (기존 화면 공격력 반감 표시와 연동).
          // 적 공격 숫자(atk)에는 원래 strike를 주어 화면과 엔진에서 두 번 반감되지 않게 한다.
          const isRace1 = session.hero && session.hero.raceKey === 1;
          const enemyHasPoison = enemy && Array.isArray(enemy.poisonSteps) && enemy.poisonSteps.some(s => s > 0);

          let tileType = c.kind;
          if (c.bridgeForm === 'reward') {
            tileType = 'phylactery';
          }

          row.push({
            x: c.x,
            y: c.y,
            id: c.cellKey || `c_${c.x}_${c.y}`,
            type: tileType,
            kind: c.kind,
            hp: isEnemy && enemy ? enemy.hitPoints : 0,
            maxHp: isEnemy && enemy ? enemy.recoveryLimit : 0,
            armor: isEnemy && enemy ? (enemy.guard || 0) : 0,
            atk: isEnemy && enemy ? (enemy.strike != null ? enemy.strike : 1) : 0,
            specialId: specialId,
            countdown: isEnemy && enemy ? (enemy.countLeft || 0) : 0,
            isFrozen: Boolean(c.frozen),
            isBurning: Boolean(c.firePower > 0),
            isAcid: c.potionForm === 'acid',
            isManaPotion: c.potionForm === 'charge',
            isBomb: c.potionForm === 'bomb',
            isBroken: Boolean(c.broken),
            isArrow: Boolean(c.arrow),
            isMagicBlade: Boolean(c.magicBlade),
            isPoisoned: Boolean(isEnemy && isRace1 && enemyHasPoison),
            isPhylactery: c.bridgeForm === 'reward',
            _cell: c
          });
        }
      }
      board.push(row);
    }

    // player 필드 변환 [O3, O4]
    const hero = session.hero || {};
    const classIdNum = hero.classKey != null ? hero.classKey : 0;
    const classIdStr = CLASS_KEY_TO_ID[classIdNum] || 'adventurer';

    const playerSkills = [];
    if (Array.isArray(session.actions)) {
      for (let i = 0; i < 4; i++) {
        const action = session.actions[i];
        if (action) {
          const aKey = action.actionKey;
          const defSkill = SKILLS_DATA.find(x => x && x.id === aKey) || { name: `스킬 ${aKey}`, desc: '', icon: '⚔️' };   // 번호로 찾는다(배열 순서로 찾으면 33번이 두 줄이라 34번 이후가 한 칸씩 밀렸다, 2026-11-17)
          const curCooldown = Math.max(0, (action.effectiveWait != null ? action.effectiveWait : 10) - (action.charge || 0));
          playerSkills.push({
            id: aKey,
            key: defSkill.key || `skill_${aKey}`,
            name: defSkill.name || `스킬 ${aKey}`,
            desc: defSkill.desc || '',
            icon: defSkill.icon || '⚔️',
            cooldown: action.effectiveWait != null ? action.effectiveWait : 10,
            currentCooldown: curCooldown,
            isImplemented: true,
            grade: action.grade || 1,
            oneUse: Boolean(action.oneUse),
            actionKey: aKey
          });
        } else {
          playerSkills.push(null);
        }
      }
    }

    const player = {
      hp: hero.life != null ? hero.life : 50,
      maxHp: hero.lifeCap != null ? hero.lifeCap : 50,
      baseAtk: hero.baseStrike != null ? hero.baseStrike : 3,
      weaponAtk: hero.bladeStrike != null ? hero.bladeStrike : 2,
      armor: hero.shield != null ? hero.shield : 4,
      maxArmor: hero.shieldCap != null ? hero.shieldCap : 4,
      exp: hero.xp || 0,
      gold: hero.coins || 0,
      shieldGauge: hero.upgrade || 0,
      maxExp: 100,
      maxGold: 100,
      maxShieldGauge: 100,
      isPoisoned: Boolean((hero.poison || 0) > 0), // 화면용 player.isPoisoned는 플레이어 독 유무 [O4]
      level: hero.rank || 1,
      classId: classIdStr,
      classKey: classIdNum,
      raceId: hero.raceKey || 0,
      skills: playerSkills,
      perks: hero.perks || [],
      flaws: hero.flaws || []
    };

    const currentScore = RC && typeof RC.calculateScore === 'function'
      ? RC.calculateScore(session)
      : (session.tick || 0) + (hero.xp || 0) + (hero.coins || 0) + (hero.upgrade || 0);

    const pendingChoice = (session.waitingChoices && session.waitingChoices.length > 0)
      ? session.waitingChoices[0]
      : null;

    const difficulty = (session && typeof session.difficulty === 'number' && Number.isInteger(session.difficulty) && session.difficulty >= 0 && session.difficulty <= 3)
      ? session.difficulty
      : 1;

    const state = {
      board,
      player,
      hero,
      turn: session.tick || 0,
      kills: session.killTotal || 0,   // 지금까지 처치한 적 전체 수(2026-11-17: 예전에는 턴마다 비워지는 임시 장부 killLedger를 보여 줘서 거의 0이었다)
      score: currentScore,
      difficulty,
      difficultyName: getDifficultyName(difficulty),
      isGameOver: session.phase === 'end' || (hero.life != null && hero.life <= 0),
      phase: session.phase || 'input',
      pendingChoice,
      _session: session
    };
    lastActiveGameState = state;
    return state;
  }

  // ==========================================
  // [O1, O2] 공개 API 구현
  // ==========================================

  function createRNG(seed = Date.now()) {
    const RC = getRC();
    if (RC && typeof RC.createRNG === 'function') {
      return RC.createRNG(seed);
    }
    let s = Math.floor(Number(seed) || Date.now());
    return function (tag, min, max) {
      s = (s * 9301 + 49297) % 233280;
      const rnd = s / 233280;
      if (min != null && max != null) {
        return min + Math.floor(rnd * (max - min + 1));
      }
      return rnd;
    };
  }

  /**
   * createGameState [O2]
   * seed, classId, unlockData, 직업설정을 받아 세션을 돌려준다.
   */
  function createGameState(options = {}) {
    const RC = getRC();
    if (!RC) throw new Error('RuleCore 엔진을 찾을 수 없습니다.');

    let classKey = 0;
    if (typeof options.classId === 'number') {
      classKey = options.classId;
    } else if (typeof options.classId === 'string') {
      const resolvedCls = resolveClassKeyId(options.classId);
      classKey = resolvedCls ? resolvedCls.id : (CLASS_ID_TO_KEY[options.classId] != null ? CLASS_ID_TO_KEY[options.classId] : 0);
    }
    const classIdStr = CLASS_KEY_TO_ID[classKey] || 'adventurer';

    const rng = options.rng || (options.seed != null ? createRNG(options.seed) : createRNG());

    // [교정 25.1] 저장 프로필(또는 전달된 프로필)을 같은 객체로 세션에 연결한다.
    const profile = (options.profile && typeof options.profile === 'object')
      ? normalizeProfileInPlace(options.profile)
      : loadProfile();

    if (options.unlockData && typeof options.unlockData === 'object' && !options.profile) {
      mergeUnlockDataIntoProfile(profile, options.unlockData);
    }

    const cEntry = Array.isArray(profile.classes)
      ? profile.classes.find(c => c && (c.id === classKey || c.key === classIdStr))
      : null;

    let perks = options.perks;
    let flaws = options.flaws;
    if (perks == null && cEntry && Array.isArray(cEntry.perks)) {
      perks = [...cEntry.perks];
    }
    if (flaws == null && cEntry && Array.isArray(cEntry.flaws)) {
      flaws = [...cEntry.flaws];
    }

    // [교정 C.2] 게임 시작 경로에서 직업이 모험가(0)이면 입력된 퍽·결함을 모두 무시
    if (classKey === 0) {
      perks = [null, null, null, null];
      flaws = [null, null, null, null];
    } else if (RC && typeof RC.validatePerkFlawSetup === 'function') {
      // 비기본 직업은 퍽·결함 정리를 반드시 적용하고 그 결과를 씀 [교정 C.1, C.2]
      const cleanGrowth = options.growth != null ? options.growth : (cEntry && cEntry.growth != null ? cEntry.growth : 10);
      let pArr = Array.isArray(perks) ? [...perks] : [null, null, null, null];
      let fArr = Array.isArray(flaws) ? [...flaws] : [null, null, null, null];
      while (pArr.length < 4) pArr.push(null);
      while (fArr.length < 4) fArr.push(null);
      const cDef = (RC.CLASS_DEFINITIONS && RC.CLASS_DEFINITIONS[classKey]) || null;
      if (cDef) {
        pArr[0] = cDef.fixedPerk;
        fArr[0] = cDef.fixedFlaw;
      }
      const cleaned = RC.validatePerkFlawSetup(classKey, cleanGrowth, pArr, fArr);
      perks = cleaned.perks;
      flaws = cleaned.flaws;
    }

    let raceKey = options.raceId != null
      ? options.raceId
      : (options.raceKey != null ? options.raceKey : (cEntry && cEntry.race != null ? cEntry.race : undefined));

    let growth = options.growth;
    if (growth == null && cEntry && cEntry.growth != null && (options.profile || cEntry.unlocked || classKey === 0)) {
      growth = cEntry.growth;
    }

    const skillSwaps = Array.isArray(options.skillSwaps)
      ? [...options.skillSwaps]
      : (cEntry && Array.isArray(cEntry.skillSwaps) ? [...cEntry.skillSwaps] : undefined);

    const skillPool = Array.isArray(options.skillPool) ? [...options.skillPool] : undefined;

    let difficulty = 1;
    if (typeof options.difficulty === 'number' && Number.isInteger(options.difficulty) && options.difficulty >= 0 && options.difficulty <= 3) {
      difficulty = options.difficulty;
    } else {
      difficulty = 1;
    }

    const session = RC.makeSession({
      classKey,
      raceKey,
      growth,
      perks,
      flaws,
      skillSwaps,
      skillPool,
      profile,
      difficulty,
      mode: options.mode || 'normal',
      rng
    });

    return sessionToGameState(session);
  }

  function isAttackType(type) {
    return type === 'sword' || type === 'enemy' || type === 4 || type === 1;
  }

  /**
   * stepChain [O2]
   * 판·경로·다음좌표를 받아 경로배열을 돌려준다.
   */
  function stepChain(boardOrSession, currentPath = [], nextCoord) {
    const RC = getRC();
    if (!RC) return [...currentPath];

    let session = null;
    if (boardOrSession && boardOrSession._session) {
      session = boardOrSession._session;
    } else if (boardOrSession && Array.isArray(boardOrSession.cells)) {
      session = boardOrSession;
    } else if (boardOrSession && Array.isArray(boardOrSession)) {
      // 2차원 board 배열인 경우 임시 세션
      const cells = [];
      for (let y = 0; y < boardOrSession.length; y++) {
        for (let x = 0; x < boardOrSession[y].length; x++) {
          const t = boardOrSession[y][x];
          cells.push(t._cell || RC.createCell(x, y, t.type || t.kind));
        }
      }
      session = { cells, hero: { perks: [], flaws: [] } };
    }

    if (!session) return [...currentPath];
    return RC.stepChain(session, currentPath, nextCoord);
  }

  /**
   * isValidChain [O1]
   */
  function isValidChain(chain, boardOrSession) {
    const RC = getRC();
    if (!RC) return Array.isArray(chain) && chain.length >= 3;

    let session = null;
    if (boardOrSession && boardOrSession._session) {
      session = boardOrSession._session;
    } else if (boardOrSession && Array.isArray(boardOrSession.cells)) {
      session = boardOrSession;
    }

    if (!session) {
      return Array.isArray(chain) && chain.length >= 3;
    }
    return RC.isValidChain(session, chain);
  }

  /**
   * cancelChain [O4]
   * 연결층 취소 명령: 턴 미소비(tick 변화 없음, 난수 미소비) 및 상태 유지 보장
   */
  function cancelChain(boardOrGameState, currentPath = []) {
    let session = null;
    if (boardOrGameState && boardOrGameState._session) {
      session = boardOrGameState._session;
    } else if (boardOrGameState && Array.isArray(boardOrGameState.cells)) {
      session = boardOrGameState;
    }
    if (session && Array.isArray(session.cells)) {
      for (const cell of session.cells) {
        cell.selected = false;
      }
    }
    const newGameState = session ? sessionToGameState(session) : boardOrGameState;
    return {
      canceled: true,
      path: [],
      tick: session ? session.tick : 0,
      gameState: newGameState
    };
  }

  /**
   * calculateAttack [O2]
   * 판·경로·플레이어를 받아 totalAttack 등 미리보기 정보를 돌려준다.
   */
  function calculateAttack(boardOrSession, path = [], player = {}) {
    const RC = getRC();
    if (!RC) return { totalAttack: 0, swordCount: 0, enemyCount: 0 };

    let session = null;
    if (boardOrSession && boardOrSession._session) {
      session = boardOrSession._session;
    }

    let swordCount = 0;
    let enemyCount = 0;
    if (Array.isArray(path)) {
      for (const p of path) {
        if (session) {
          const c = RC.getCell(session, p.x, p.y);
          if (c) {
            if (c.kind === 'sword' || c.kindCode === 4) swordCount++;
            else if (c.kind === 'enemy' || c.kindCode === 1) enemyCount++;
          }
        } else if (Array.isArray(boardOrSession) && boardOrSession[p.y] && boardOrSession[p.y][p.x]) {
          const t = boardOrSession[p.y][p.x];
          if (t.type === 'sword') swordCount++;
          else if (t.type === 'enemy') enemyCount++;
        }
      }
    }

    let totalAttack = 0;
    if (session) {
      totalAttack = RC.calculateTotalAttack(session, path);
    } else {
      const baseAtk = player.baseAtk != null ? player.baseAtk : 3;
      const weaponAtk = player.weaponAtk != null ? player.weaponAtk : 2;
      totalAttack = (enemyCount > 0 ? baseAtk : 0) + (swordCount * weaponAtk);
    }

    return {
      totalAttack,
      swordCount,
      enemyCount
    };
  }

  /**
   * calculateResourceGain [O1]
   */
  function calculateResourceGain(type, count) {
    if (!count || count < 3) return { gain: 0, multiplier: 1 };
    return {
      gain: count,
      multiplier: 1
    };
  }

  /**
   * resolveTurn [O2, O3]
   * 세션·경로·난수를 받는다.
   * gameState·attackResult·enemyAttackSummary·counterResult·expResult·resourceResult를 반환한다.
   * resolved는 유효처리 수락 여부.
   * overflow는 실제 강화토큰 증가분만 표시하고 수리초과량을 강화로 옮기지 않는다.
   */
  function resolveTurn(gameStateOrSession, path = [], rng = null) {
    const session = gameStateOrSession && gameStateOrSession._session ? gameStateOrSession._session : gameStateOrSession;
    if (!session) {
      return {
        resolved: false,
        gameState: null,
        attackResult: { totalAttack: 0 },
        enemyAttackSummary: { killedPositions: [], results: [], killedCount: 0 },
        counterResult: { totalDamage: 0, armorDamage: 0, hpDamage: 0 },
        expResult: { killedSpecialCount: 0, didLevelUp: false, gainedExp: 0 },
        resourceResult: null
      };
    }

    const RC = getRC();
    if (!RC || typeof RC.settlePath !== 'function') {
      return { resolved: false, gameState: gameStateOrSession };
    }

    // 직업보상 칸(1칸)인지 확인 [교정 21.4, 교정 21.5]
    let isRewardCell = false;
    if (Array.isArray(path) && path.length === 1) {
      const c = RC.getCell(session, path[0].x, path[0].y);
      if (c && (typeof RC.isRewardCell === 'function' ? RC.isRewardCell(c) : (c.bridgeForm === 'reward' || c.bridgeForm === 'class_reward'))) {
        isRewardCell = true;
      }
    }

    if (!Array.isArray(path) || (path.length < 3 && !isRewardCell)) {
      return {
        resolved: false,
        gameState: sessionToGameState(session),
        attackResult: { totalAttack: 0 },
        enemyAttackSummary: { killedPositions: [], results: [], killedCount: 0 },
        counterResult: { totalDamage: 0, armorDamage: 0, hpDamage: 0 },
        expResult: { killedSpecialCount: 0, didLevelUp: false, gainedExp: 0 },
        resourceResult: null
      };
    }

    const prevXp = (session.hero && session.hero.xp) || 0;
    const prevCompletedXp = (session.hero && session.hero.completedXp) || 0;
    const prevRank = (session.hero && session.hero.rank) || 1;
    const prevShield = (session.hero && session.hero.shield) || 0;
    const prevLife = (session.hero && session.hero.life) || 0;
    const prevUpgrade = (session.hero && session.hero.upgrade) || 0;

    if (!session.profile && gameStateOrSession && gameStateOrSession._session) {
      session.profile = loadProfile();
    }

    const prevEventLen = Array.isArray(session.events) ? session.events.length : 0;
    const res = RC.settlePath(session, path, { rng });
    if (!res || !res.success) {
      return {
        resolved: false,
        gameState: sessionToGameState(session),
        attackResult: { totalAttack: 0 },
        enemyAttackSummary: { killedPositions: [], results: [], killedCount: 0 },
        counterResult: { totalDamage: 0, armorDamage: 0, hpDamage: 0 },
        expResult: { killedSpecialCount: 0, didLevelUp: false, gainedExp: 0 },
        resourceResult: null
      };
    }

    // [교정 25.1, 25.2] 직업 보상 수집 또는 업적 진행 시 연결된 프로필/해금 정보 동기화 저장
    const newEvents = Array.isArray(session.events) ? session.events.slice(prevEventLen) : [];
    const shouldSaveProf = Boolean(
      session.profile && (
        (res.rewardResult && res.rewardResult.type !== 'none') ||
        newEvents.some(e => e && (e.type === 'save_profile' || e.type === 'achievement_progress'))
      )
    );
    if (shouldSaveProf) {
      saveProfile(session.profile);
      saveUnlockData(buildUnlockDataFromProfile(session.profile));
    }

    const newGameState = sessionToGameState(session);

    // attackResult
    const totalAttack = res.totalAttack || (res.combat ? res.combat.totalAttack : 0);
    const attackResult = {
      totalAttack
    };

    // enemyAttackSummary
    const combat = res.combat;
    const killedPositions = [];
    const results = [];
    let killedSpecialCount = 0;

    if (combat && Array.isArray(combat.combatResults)) {
      for (const cr of combat.combatResults) {
        results.push(cr);
        if (cr.killed) {
          killedPositions.push(cr.coord);
          if (cr.cell && cr.cell.enemy && cr.cell.enemy.enemyKind > 0) {
            killedSpecialCount++;
          }
        }
      }
    }

    const enemyAttackSummary = {
      killedPositions,
      results,
      killedCount: killedPositions.length
    };

    // counterResult [O3]
    const ret = res.retaliation;
    const totalDamage = ret ? (ret.totalEnemyAttack || 0) : 0;
    const armorDamage = ret ? (ret.shieldLoss != null ? ret.shieldLoss : (ret.absorbed || 0)) : 0;
    const hpDamage = ret ? (ret.unabsorbed || 0) : 0;
    const counterResult = {
      totalDamage,
      armorDamage,
      hpDamage
    };

    // expResult [O3]
    const curRank = (session.hero && session.hero.rank) || 1;
    const didLevelUp = curRank > prevRank;
    const gainedExp = ((session.hero && session.hero.xp) || 0) + ((session.hero && session.hero.completedXp) || 0) - (prevXp + prevCompletedXp);
    const expResult = {
      killedSpecialCount,
      didLevelUp,
      gainedExp: Math.max(0, gainedExp)
    };

    // resourceResult [O3]
    // overflow는 실제 강화토큰 증가분만 표시하고 수리초과량을 강화로 옮기지 않는다
    const chainKind = res.chainKind || 'none';
    let addedArmor = 0;
    let overflow = 0;
    let healed = 0;
    let gain = 0;

    if (chainKind === 'shield') {
      addedArmor = Math.max(0, ((session.hero && session.hero.shield) || 0) - prevShield);
      overflow = Math.max(0, ((session.hero && session.hero.upgrade) || 0) - prevUpgrade);
      gain = addedArmor + overflow;
    } else if (chainKind === 'potion') {
      healed = Math.max(0, ((session.hero && session.hero.life) || 0) - prevLife);
      gain = healed;
    } else if (chainKind === 'coin') {
      gain = res.length || 0;
    }

    const resourceResult = (chainKind === 'shield' || chainKind === 'potion' || chainKind === 'coin') ? {
      type: chainKind,
      addedArmor,
      overflow,
      healed,
      gain
    } : null;

    return {
      resolved: true,
      gameState: newGameState,
      attackResult,
      enemyAttackSummary,
      counterResult,
      expResult,
      resourceResult,
      rewardResult: res.rewardResult || null
    };
  }

  /**
   * canUseSkill [O1]
   */
  function canUseSkill(playerOrGameState, slotIndex, optionalGameState = null) {
    const gameState = optionalGameState || (playerOrGameState && playerOrGameState.player ? playerOrGameState : null);
    const session = gameState && gameState._session;
    if (!session) return false;
    const RC = getRC();
    if (!RC || typeof RC.canTriggerAction !== 'function') return false;
    const res = RC.canTriggerAction(session, slotIndex);
    return Boolean(res && res.canUse);
  }

  /**
   * useSkill [O2, O3]
   * 세션·장착슬롯인덱스·옵션·난수를 받는다.
   * 스킬 반환 applied/success 호환.
   */
  function useSkill(gameState, slotIndex, options = {}, rng = null) {
    const session = gameState && gameState._session;
    if (!session) {
      return { applied: false, success: false, reason: 'no_session', gameState };
    }
    const RC = getRC();
    if (!RC || typeof RC.triggerAction !== 'function') {
      return { applied: false, success: false, reason: 'no_rule_core', gameState };
    }

    const prevEventLen = Array.isArray(session.events) ? session.events.length : 0;
    const res = RC.triggerAction(session, slotIndex, options);
    const newEvents = Array.isArray(session.events) ? session.events.slice(prevEventLen) : [];
    if (res && res.success && session.profile && newEvents.some(e => e && (e.type === 'achievement_progress' || e.type === 'save_profile'))) {
      saveProfile(session.profile);
    }
    const newGameState = sessionToGameState(session);

    return {
      applied: Boolean(res && res.success),
      success: Boolean(res && res.success),
      reason: res ? res.reason : null,
      gameState: newGameState,
      effectResult: res ? res.effectResult : null
    };
  }

  /**
   * [교정 33.1] 내부 헬퍼: gameState 또는 fallback에서 세션을 얻고 비정상 대기 메뉴를 청소
   */
  function resolveSessionForChoice(gameState) {
    let session = gameState && gameState._session ? gameState._session : gameState;
    if (!session && lastActiveGameState) {
      session = lastActiveGameState._session || lastActiveGameState;
    }
    if (!session || !Array.isArray(session.waitingChoices)) return null;
    const RC = getRC();
    if (RC && typeof RC.cleanWaitingChoices === 'function') {
      RC.cleanWaitingChoices(session);
    } else {
      session.waitingChoices = session.waitingChoices.filter(c => c && Array.isArray(c.cards) && c.cards.length > 0);
      if (session.waitingChoices.length === 0 && session.phase === 'choice') {
        session.phase = 'input';
      }
    }
    if (session.waitingChoices.length === 0 && session.phase === 'choice') {
      session.phase = 'input';
    }
    return session;
  }

  /**
   * getLevelupOptions [O2, 교정 33.1]
   * 이미 생성된 대기 메뉴 후보를 반환하며 그릴 때마다 다시 추첨하지 않는다.
   */
  // 레벨업 카드 중 '새 스킬'을 지금 더 고를 수 있는지: 빈 칸 수 - 이미 고른 새 스킬 수 가 1 이상이어야 한다.
  function levelupSlotsBlocked(session, choice, cardIdx) {
    try {
      const card = choice.cards && choice.cards[cardIdx];
      if (!card || card.type !== 'skill' || card.actionKey == null) return false;
      const actions = Array.isArray(session.actions) ? session.actions : [];
      if (actions.some(a => a && a.actionKey === card.actionKey)) return false;   // 이미 가진 스킬 강화는 칸이 필요 없다
      const picks = Array.isArray(choice.picks) ? choice.picks : [];
      if (picks.includes(cardIdx)) return false;
      let pickedNew = 0;
      picks.forEach(i => {
        const c = choice.cards[i];
        if (c && c.type === 'skill' && c.actionKey != null && !actions.some(a => a && a.actionKey === c.actionKey)) pickedNew++;
      });
      return (4 - actions.length) - pickedNew <= 0;
    } catch (_) { return false; }
  }

  function getLevelupOptions(gameState) {
    const session = resolveSessionForChoice(gameState);
    if (!session || !Array.isArray(session.waitingChoices)) return [];
    const choice = session.waitingChoices.find(c => c && c.type === 'levelup');
    if (!choice || !Array.isArray(choice.cards)) return [];
    return choice.cards.map((c, idx) => ({
      id: idx,
      type: c.type,
      name: (c.actionKey != null && getSkillInfo(c.actionKey)) ? getSkillInfo(c.actionKey).name : (c.name || (c.type === 'stat' ? `스탯 ${c.statId}` : `스킬 ${c.actionKey}`)),
      icon: (c.actionKey != null && getSkillInfo(c.actionKey)) ? getSkillInfo(c.actionKey).icon : undefined,
      actionKey: c.actionKey,
      statId: c.statId,
      blocked: levelupSlotsBlocked(session, choice, idx),
      desc: levelupSlotsBlocked(session, choice, idx) ? '스킬 칸 4개가 이미 가득 차서 이 스킬은 고를 수 없어요. 다른 카드를 골라 주세요.' : (c.actionKey != null && getSkillInfo(c.actionKey))
        ? ((owned) => {
            const inf = getSkillInfo(c.actionKey, !!owned);
            if (owned && inf && owned.effectiveWait != null && owned.effectiveWait > 0) {
              return `${inf.text} (이미 가진 스킬이에요. 고르면 다시 쓰는 시간이 ${owned.effectiveWait}턴에서 ${owned.effectiveWait - 1}턴으로 줄어요)`;
            }
            return inf.full;
          })(Array.isArray(session.actions) ? session.actions.find(a => a && a.actionKey === c.actionKey) : null)
        : (c.desc || (c.type === 'stat' ? '고르면 능력치가 올라요. 게임이 끝날 때까지 유지돼요.' : '스킬 습득/강화'))
    }));
  }

  /**
   * chooseLevelupReward [O2, O4, 교정 33.1]
   * HTML의 한 번 선택 레벨업은 G6의 두 선택을 연결층에서 차례로 저장한다.
   * 각 선택 후 남은 후보와 pendingChoice를 반환하고 두 번째에만 메뉴를 닫는다.
   * 메뉴 큐가 남으면 즉시 다음 메뉴를 표시한다.
   * 턴 처리가 아직 남았으면 선택 뒤 그 위치부터 계속하고 반격·보상을 중복 실행하지 않는다.
   */
  function chooseLevelupReward(gameState, optionId) {
    let session = gameState && gameState._session ? gameState._session : gameState;
    if (!session && lastActiveGameState) {
      session = lastActiveGameState._session || lastActiveGameState;
    }
    if (!session || !Array.isArray(session.waitingChoices)) {
      return { applied: false, gameState };
    }

    const choiceIdx = session.waitingChoices.findIndex(c => c && c.type === 'levelup');
    if (choiceIdx === -1) {
      return { applied: false, gameState };
    }
    const choice = session.waitingChoices[choiceIdx];
    if (!Array.isArray(choice.picks)) choice.picks = [];

    const optIndex = (typeof optionId === 'number') ? optionId : 0;
    if (levelupSlotsBlocked(session, choice, optIndex)) {
      return { applied: false, success: false, reason: 'slots_full', gameState };
    }
    if (!choice.picks.includes(optIndex)) {
      choice.picks.push(optIndex);
    }

    const RC = getRC();
    const needed = choice.picksNeeded || 2;

    if (choice.picks.length >= needed) {
      // 2개 선택 완료 -> 메뉴 닫고 보상 적용 및 턴 재개
      if (RC && typeof RC.answerChoice === 'function') {
        RC.answerChoice(session, choice.id, { picks: choice.picks, resumeTurn: true });
      } else {
        session.waitingChoices.splice(choiceIdx, 1);
        if (session.waitingChoices.length === 0) {
          session.phase = 'input';
        }
      }
    }

    if (session.waitingChoices.length === 0) {
      session.phase = 'input';
    }

    const newGameState = sessionToGameState(session);
    return {
      applied: true,
      success: true,
      gameState: newGameState
    };
  }

  /**
   * getShopOptions [O2, 교정 33.1]
   */
  function getShopOptions(gameState) {
    const session = resolveSessionForChoice(gameState);
    if (!session || !Array.isArray(session.waitingChoices)) return [];
    const choice = session.waitingChoices.find(c => c && c.type === 'shop');
    if (!choice || !Array.isArray(choice.cards)) return [];
    return choice.cards.map((c, idx) => ({
      id: idx,
      type: c.type,
      name: c.type === 'skill' ? ((getSkillInfo(c.actionKey) && getSkillInfo(c.actionKey).name) || c.name) : `${slotNameKo(c.slot)} 강화`,
      icon: c.type === 'skill' && getSkillInfo(c.actionKey) ? getSkillInfo(c.actionKey).icon : undefined,
      slot: c.slot,
      gear: c.gear,
      actionKey: c.actionKey,
      desc: c.desc || (c.type === 'skill' ? (getSkillInfo(c.actionKey) ? getSkillInfo(c.actionKey).text + ' (상점 두루마리는 한 번만 쓰고 사라져요)' : '한 번 쓰는 스킬 효과(두루마리)') : (GEAR_UPGRADE_HELP[c.slot] || '지금 끼고 있는 장비를 강화해요.'))
    }));
  }

  /**
   * chooseShopItem [O2, 교정 33.2]
   */
  function chooseShopItem(gameState, optionId) {
    let session = gameState && gameState._session ? gameState._session : gameState;
    if (!session && lastActiveGameState) {
      session = lastActiveGameState._session || lastActiveGameState;
    }
    if (!session || !Array.isArray(session.waitingChoices)) {
      return { applied: false, gameState };
    }

    const choiceIdx = session.waitingChoices.findIndex(c => c && c.type === 'shop');
    if (choiceIdx === -1) {
      return { applied: false, gameState };
    }
    const choice = session.waitingChoices[choiceIdx];
    const optIndex = (typeof optionId === 'number') ? optionId : 0;

    const RC = getRC();
    if (RC && typeof RC.answerChoice === 'function') {
      RC.answerChoice(session, choice.id, { choiceIndex: optIndex, resumeTurn: true });
    } else {
      session.waitingChoices.splice(choiceIdx, 1);
      if (session.waitingChoices.length === 0) {
        session.phase = 'input';
      }
    }

    if (session.waitingChoices.length === 0) {
      session.phase = 'input';
    }

    const newGameState = sessionToGameState(session);
    return {
      applied: true,
      success: true,
      gameState: newGameState
    };
  }

  const SLOT_NAME_KO = ['무기', '머리', '방패', '몸통', '장신구'];
  function slotNameKo(slot) {
    return SLOT_NAME_KO[slot] || '장비';
  }

  /**
   * getUpgradeOptions [O2, 교정 33.1]
   */
  function getUpgradeOptions(gameState) {
    const session = resolveSessionForChoice(gameState);
    if (!session || !Array.isArray(session.waitingChoices)) return [];
    const choice = session.waitingChoices.find(c => c && c.type === 'upgrade');
    if (!choice || !Array.isArray(choice.cards)) return [];
    return choice.cards.map((c, idx) => ({
      id: idx,
      type: c.type,
      name: boostTitle(c.boostId, c.increaseAmount),
      slot: c.slot,
      boostId: c.boostId,
      increaseAmount: c.increaseAmount,
      desc: c.desc || (BOOST_HELP[c.boostId] ? `${slotNameKo(c.slot)}에 붙은 능력을 올려요. ${BOOST_HELP[c.boostId][1]}` : `능력치 +${c.increaseAmount || 1}`)
    }));
  }

  /**
   * chooseUpgrade [O2, 교정 33.2]
   */
  function chooseUpgrade(gameState, optionId) {
    let session = gameState && gameState._session ? gameState._session : gameState;
    if (!session && lastActiveGameState) {
      session = lastActiveGameState._session || lastActiveGameState;
    }
    if (!session || !Array.isArray(session.waitingChoices)) {
      return { applied: false, gameState };
    }

    const choiceIdx = session.waitingChoices.findIndex(c => c && c.type === 'upgrade');
    if (choiceIdx === -1) {
      return { applied: false, gameState };
    }
    const choice = session.waitingChoices[choiceIdx];
    const optIndex = (typeof optionId === 'number') ? optionId : 0;

    const RC = getRC();
    if (RC && typeof RC.answerChoice === 'function') {
      RC.answerChoice(session, choice.id, { choiceIndex: optIndex, resumeTurn: true });
    } else {
      session.waitingChoices.splice(choiceIdx, 1);
      if (session.waitingChoices.length === 0) {
        session.phase = 'input';
      }
    }

    if (session.waitingChoices.length === 0) {
      session.phase = 'input';
    }

    const newGameState = sessionToGameState(session);
    return {
      applied: true,
      success: true,
      gameState: newGameState
    };
  }

  // ==========================================
  // [N3, O5] 저장 / 프로필 / 기록 관리 API
  // ==========================================

  const STORAGE_KEY_RUN = 'goblin_raid_v1_run';
  const STORAGE_KEY_PROFILE = 'goblin_raid_v1_profile';
  const STORAGE_KEY_UNLOCKS = 'goblin_raid_v1_unlocks';
  const STORAGE_KEY_SCORES = 'goblin_raid_v1_scores';
  const STORAGE_KEY_DIFFICULTY = 'goblin_raid_v1_difficulty'; // 조각 29: 난이도 선택값 저장 키 [추가 29.4]

  function saveSelectedDifficulty(difficulty) {
    try {
      let d = 1;
      if (typeof difficulty === 'number' && Number.isInteger(difficulty) && difficulty >= 0 && difficulty <= 3) {
        d = difficulty;
      }
      storage.setItem(STORAGE_KEY_DIFFICULTY, String(d));
      return true;
    } catch (_) {
      return false;
    }
  }

  function loadSelectedDifficulty() {
    try {
      const raw = storage.getItem(STORAGE_KEY_DIFFICULTY);
      if (raw != null) {
        const val = parseInt(raw, 10);
        if (Number.isInteger(val) && val >= 0 && val <= 3) {
          return val;
        }
      }
    } catch (_) {}
    return 1; // 기본값 보통 [추가 29.1, 29.4]
  }

  // 옛 사이트 저장 이름 (최고 기록·이어하기·프로필·해금) [교정 25.4]
  const LEGACY_STORAGE_KEY_SCORES = 'goblin_raid_v1';
  const LEGACY_STORAGE_KEY_RUN = 'goblin_raid_run_v1';
  const LEGACY_STORAGE_KEY_PROFILE = 'goblin_raid_profile_v1';
  const LEGACY_STORAGE_KEY_UNLOCKS = 'goblin_raid_unlocks_v1';

  let isMigratingLegacy = false;

  function safeGetStorageItem(key) {
    try {
      return storage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function safeSetStorageItem(key, value) {
    try {
      storage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function safeParseJson(raw) {
    if (!raw || typeof raw !== 'string') return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  const LEGACY_CLASS_ALIASES = {
    wizard: 5,
    sorcerer: 5,
    cleric: 3,
    thief: 6,
    knight: 7,
    fighter: 8,
    archer: 1,
    berserker: 4,
    looter: 2,
    ninja: 9
  };

  function resolveClassKeyId(idOrKey) {
    if (typeof idOrKey === 'number' && idOrKey >= 0 && idOrKey < CLASS_IDS.length) {
      return { id: idOrKey, key: CLASS_IDS[idOrKey] };
    }
    if (typeof idOrKey === 'string') {
      if (CLASS_ID_TO_KEY[idOrKey] != null) {
        return { id: CLASS_ID_TO_KEY[idOrKey], key: idOrKey };
      }
      if (LEGACY_CLASS_ALIASES[idOrKey] != null) {
        const aliasId = LEGACY_CLASS_ALIASES[idOrKey];
        return { id: aliasId, key: CLASS_IDS[aliasId], alias: idOrKey };
      }
      const num = Number(idOrKey);
      if (Number.isInteger(num) && num >= 0 && num < CLASS_IDS.length) {
        return { id: num, key: CLASS_IDS[num] };
      }
    }
    return null;
  }

  function emptyHighScoreBuckets() {
    return {
      normal_0: [],
      normal_1: [],
      normal_2: [],
      normal_3: [],
      '100turns': [],
      separate_score: []
    };
  }

  function resolveScoreBucketKey(entryOrCategory) {
    if (entryOrCategory && typeof entryOrCategory === 'object') {
      const cat = entryOrCategory.category;
      const diff = entryOrCategory.difficulty;
      const mode = entryOrCategory.mode;
      if (mode === 'turn100' || cat === '100turns' || cat === 'turn100') return '100turns';
      if (mode === 'score' || cat === 'separate_score' || cat === 'score') return 'separate_score';
      if (typeof cat === 'string' && (cat.startsWith('normal_') || cat === '100turns' || cat === 'separate_score')) return cat;
      if (cat != null && !Number.isNaN(Number(cat))) {
        return `normal_${Math.max(0, Math.min(3, Math.floor(Number(cat))))}`;
      }
      if (diff != null && !Number.isNaN(Number(diff))) {
        return `normal_${Math.max(0, Math.min(3, Math.floor(Number(diff))))}`;
      }
      return 'normal_1';
    }
    if (entryOrCategory == null) return 'normal_1';
    if (typeof entryOrCategory === 'number') {
      return `normal_${Math.max(0, Math.min(3, Math.floor(entryOrCategory)))}`;
    }
    const str = String(entryOrCategory);
    if (str === 'turn100' || str === '100turns') return '100turns';
    if (str === 'score' || str === 'separate_score') return 'separate_score';
    if (str.startsWith('normal_')) return str;
    return 'normal_1';
  }

  // [교정 30.5] 10개 초과 시 순위 안에 들 때만 마지막 자리를 새 기록으로 교체해 정렬 유지
  function insertHighScoreRecordLimited(list, record) {
    if (!Array.isArray(list) || !record || typeof record !== 'object') return list;
    const newScore = record.score != null ? record.score : 0;
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
    const insertIdx = list.findIndex(r => (r && r.score != null ? r.score : 0) < newScore);
    if (insertIdx === -1) {
      list.push(record);
    } else {
      list.splice(insertIdx, 0, record);
    }
    return list;
  }

  function mergeScoresIntoBuckets(buckets, source, fallbackCat = null) {
    if (!buckets || !source) return;
    if (Array.isArray(source)) {
      for (const item of source) {
        if (!item || typeof item !== 'object') continue;
        const cat = fallbackCat || resolveScoreBucketKey(item);
        const list = Array.isArray(buckets[cat]) ? buckets[cat] : (buckets[cat] = []);
        const score = typeof item.score === 'number' ? item.score : 0;
        const turn = typeof item.turn === 'number' ? item.turn : 0;
        const kills = typeof item.kills === 'number' ? item.kills : 0;
        const classId = item.classId != null ? item.classId : 'adventurer';
        const className = item.className || (CLASSES[classId] ? CLASSES[classId].name : '길잡이');
        const date = item.date || '';
        const dup = list.some(e =>
          e &&
          (e.score || 0) === score &&
          (e.turn || 0) === turn &&
          (e.kills || 0) === kills &&
          String(e.classId || '') === String(classId) &&
          String(e.date || '') === String(date)
        );
        if (!dup) {
          insertHighScoreRecordLimited(list, {
            score,
            turn,
            kills,
            classId,
            className,
            ...(date ? { date } : {}),
            ...(item.category != null ? { category: item.category } : {}),
            ...(item.difficulty != null ? { difficulty: item.difficulty } : {}),
            ...(item.mode != null ? { mode: item.mode } : {})
          });
        }
      }
    } else if (typeof source === 'object') {
      for (const k of Object.keys(source)) {
        if (Array.isArray(source[k])) {
          mergeScoresIntoBuckets(buckets, source[k], resolveScoreBucketKey(k));
        }
      }
    }
    for (const key of Object.keys(buckets)) {
      if (Array.isArray(buckets[key])) {
        buckets[key].sort((a, b) => (b.score || 0) - (a.score || 0));
        if (buckets[key].length > 10) buckets[key].length = 10;
      }
    }
  }

  function applyLegacyFieldsToProfile(target, source) {
    if (!target || !source || typeof source !== 'object') return;
    if (typeof source.specialKills === 'number') {
      target.specialKillsTotal = Math.max(target.specialKillsTotal || 0, source.specialKills);
    }
    if (typeof source.specialKillsTotal === 'number') {
      target.specialKillsTotal = Math.max(target.specialKillsTotal || 0, source.specialKillsTotal);
    }
    if (Array.isArray(source.classes)) {
      for (const srcCls of source.classes) {
        if (!srcCls || typeof srcCls !== 'object') continue;
        const resolved = resolveClassKeyId(srcCls.id != null ? srcCls.id : srcCls.key);
        if (!resolved) continue;
        const dst = target.classes[resolved.id];
        if (!dst) continue;
        if (srcCls.unlocked) dst.unlocked = true;
        if (typeof srcCls.growth === 'number') dst.growth = Math.max(dst.growth || 0, Math.min(10, srcCls.growth));
        if (typeof srcCls.race === 'number') dst.race = srcCls.race;
        if (Array.isArray(srcCls.perks)) dst.perks = srcCls.perks.slice(0, 4);
        if (Array.isArray(srcCls.flaws)) dst.flaws = srcCls.flaws.slice(0, 4);
        if (Array.isArray(srcCls.skillPool) && srcCls.skillPool.length > 0) dst.skillPool = [...srcCls.skillPool];
        if (Array.isArray(srcCls.skillSwaps)) dst.skillSwaps = [...srcCls.skillSwaps];
      }
    }
    if (Array.isArray(source.unlockedClasses)) {
      for (const item of source.unlockedClasses) {
        if (typeof item === 'string' && item) {
          target.legacyUnlockedClassKeys = target.legacyUnlockedClassKeys || [];
          if (!target.legacyUnlockedClassKeys.includes(item)) {
            target.legacyUnlockedClassKeys.push(item);
          }
        }
        const resolved = resolveClassKeyId(item);
        if (!resolved) continue;
        const dst = target.classes[resolved.id];
        if (dst) {
          dst.unlocked = true;
          dst.growth = Math.max(1, dst.growth || 0);
        }
      }
    }
    if (source.classGrowths && typeof source.classGrowths === 'object') {
      for (const k of Object.keys(source.classGrowths)) {
        const resolved = resolveClassKeyId(k);
        const g = source.classGrowths[k];
        if (!resolved || typeof g !== 'number') continue;
        const dst = target.classes[resolved.id];
        if (dst && g > 0) {
          dst.unlocked = true;
          dst.growth = Math.max(dst.growth || 0, Math.min(10, g));
        }
      }
    }
    if (source.classProgress && typeof source.classProgress === 'object') {
      for (const k of Object.keys(source.classProgress)) {
        const resolved = resolveClassKeyId(k);
        const prog = source.classProgress[k];
        if (!resolved || !prog || typeof prog !== 'object') continue;
        const dst = target.classes[resolved.id];
        const lvl = prog.growth != null ? prog.growth : prog.level;
        if (dst && typeof lvl === 'number' && lvl > 0) {
          dst.unlocked = true;
          dst.growth = Math.max(dst.growth || 0, Math.min(10, lvl));
        }
      }
    }
    if (source.classPerkSettings && typeof source.classPerkSettings === 'object') {
      for (const k of Object.keys(source.classPerkSettings)) {
        const resolved = resolveClassKeyId(k);
        const setting = source.classPerkSettings[k];
        if (!resolved || resolved.id === 0 || !setting || typeof setting !== 'object') continue;
        const dst = target.classes[resolved.id];
        if (dst) {
          if (Array.isArray(setting.perks)) {
            const pArr = [null, null, null, null];
            for (let i = 0; i < Math.min(4, setting.perks.length); i++) pArr[i] = setting.perks[i] != null ? setting.perks[i] : null;
            if (pArr[0] == null && dst.perks && dst.perks[0] != null) pArr[0] = dst.perks[0];
            dst.perks = pArr;
          }
          if (Array.isArray(setting.flaws)) {
            const fArr = [null, null, null, null];
            for (let i = 0; i < Math.min(4, setting.flaws.length); i++) fArr[i] = setting.flaws[i] != null ? setting.flaws[i] : null;
            if (fArr[0] == null && dst.flaws && dst.flaws[0] != null) fArr[0] = dst.flaws[0];
            dst.flaws = fArr;
          }
        }
      }
    }
    if (source.classRaceSettings && typeof source.classRaceSettings === 'object') {
      for (const k of Object.keys(source.classRaceSettings)) {
        const resolved = resolveClassKeyId(k);
        const rId = source.classRaceSettings[k];
        if (!resolved || typeof rId !== 'number') continue;
        const dst = target.classes[resolved.id];
        if (dst) dst.race = rId;
      }
    }
    if (Array.isArray(source.achievements)) {
      for (const item of source.achievements) {
        if (item && typeof item === 'object' && typeof item.id === 'number') {
          const dstAch = target.achievements.find(a => a && a.id === item.id);
          if (dstAch) {
            if (typeof item.progress === 'number') dstAch.progress = Math.max(dstAch.progress || 0, item.progress);
            if (item.unlocked && !dstAch.unverified) dstAch.unlocked = true;
          }
        } else if (typeof item === 'string') {
          target.legacyAchievements = target.legacyAchievements || [];
          if (!target.legacyAchievements.includes(item)) target.legacyAchievements.push(item);
        }
      }
    }
    if (source.highScores) {
      mergeScoresIntoBuckets(target.highScores, source.highScores);
    }
  }

  function normalizeProfileInPlace(prof) {
    if (!prof || typeof prof !== 'object') return createDefaultProfile();
    const def = createDefaultProfile();
    if (prof.version == null) prof.version = 1;

    const hadClasses = Array.isArray(prof.classes) && prof.classes.length >= 10;
    if (!Array.isArray(prof.classes)) {
      prof.classes = def.classes.map(c => ({ ...c, perks: [...c.perks], flaws: [...c.flaws], skillPool: [...c.skillPool] }));
    } else {
      const normalizedClasses = [];
      for (let i = 0; i < def.classes.length; i++) {
        const d = def.classes[i];
        const existing = prof.classes.find(c => c && (c.id === i || c.key === d.key));
        if (existing && typeof existing === 'object') {
          existing.id = i;
          if (!existing.key) existing.key = d.key;
          if (!existing.name) existing.name = d.name;
          if (existing.unlocked == null) existing.unlocked = d.unlocked;
          if (existing.growth == null) existing.growth = d.growth;
          if (existing.race == null) existing.race = d.race;
          if (!Array.isArray(existing.perks)) existing.perks = [...d.perks];
          if (!Array.isArray(existing.flaws)) existing.flaws = [...d.flaws];
          if (!Array.isArray(existing.skillPool) || existing.skillPool.length === 0) existing.skillPool = [...d.skillPool];
          const RC = getRC();
          if (RC && typeof RC.validatePerkFlawSetup === 'function') {
            const vRes = RC.validatePerkFlawSetup(i, existing.growth != null ? existing.growth : 1, existing.perks, existing.flaws);
            existing.perks = [...vRes.perks];
            existing.flaws = [...vRes.flaws];
          }
          normalizedClasses.push(existing);
        } else {
          const newEntry = { ...d, perks: [...d.perks], flaws: [...d.flaws], skillPool: [...d.skillPool] };
          const RC = getRC();
          if (RC && typeof RC.validatePerkFlawSetup === 'function') {
            const vRes = RC.validatePerkFlawSetup(i, newEntry.growth != null ? newEntry.growth : 1, newEntry.perks, newEntry.flaws);
            newEntry.perks = [...vRes.perks];
            newEntry.flaws = [...vRes.flaws];
          }
          normalizedClasses.push(newEntry);
        }
      }
      prof.classes = normalizedClasses;
    }

    if (!Array.isArray(prof.achievements) || prof.achievements.length < def.achievements.length) {
      const existingAchs = Array.isArray(prof.achievements) ? prof.achievements : [];
      const mergedAchs = def.achievements.map(da => {
        const found = existingAchs.find(a => a && typeof a === 'object' && a.id === da.id);
        return found ? found : { ...da };
      });
      prof.achievements = mergedAchs;
    }

    const baseBuckets = emptyHighScoreBuckets();
    if (prof.highScores) {
      mergeScoresIntoBuckets(baseBuckets, prof.highScores);
    }
    prof.highScores = baseBuckets;

    if (typeof prof.specialKillsTotal !== 'number') {
      prof.specialKillsTotal = typeof prof.specialKills === 'number' ? prof.specialKills : 0;
    }

    if (!hadClasses) {
      applyLegacyFieldsToProfile(prof, prof);
    }
    return prof;
  }

  function buildUnlockDataFromProfile(prof) {
    const unlockedClasses = [];
    const classGrowths = {};
    if (prof && Array.isArray(prof.classes)) {
      for (const c of prof.classes) {
        if (!c || !c.key) continue;
        if (c.unlocked || c.id === 0) {
          if (!unlockedClasses.includes(c.key)) unlockedClasses.push(c.key);
        }
        if ((c.growth || 0) > 0 || c.id === 0) {
          classGrowths[c.key] = c.growth != null ? c.growth : (c.id === 0 ? 1 : 0);
        }
      }
    }
    if (prof && Array.isArray(prof.legacyUnlockedClassKeys)) {
      for (const rawKey of prof.legacyUnlockedClassKeys) {
        if (typeof rawKey === 'string' && rawKey && !unlockedClasses.includes(rawKey)) {
          unlockedClasses.push(rawKey);
        }
      }
    }
    if (!unlockedClasses.includes('adventurer')) unlockedClasses.unshift('adventurer');
    if (classGrowths.adventurer == null) classGrowths.adventurer = 1;
    return {
      unlockedClasses,
      classGrowths,
      specialKills: (prof && typeof prof.specialKillsTotal === 'number') ? prof.specialKillsTotal : 0
    };
  }

  /**
   * [교정 25.4] 옛 사이트 저장 기록(goblin_raid_v1 / goblin_raid_profile_v1 / goblin_raid_unlocks_v1)을
   * 새 JSON 저장 이름(goblin_raid_v1_scores / goblin_raid_v1_profile / goblin_raid_v1_unlocks)으로 옮겨 쓰고
   * 옛 값은 지우지 않는다. 옛 이어하기(goblin_raid_run_v1)는 형식이 달라 버린다.
   */
  function migrateLegacyStorageIfNeeded() {
    if (isMigratingLegacy) return;
    isMigratingLegacy = true;
    try {
      const hasNewProfile = Boolean(safeGetStorageItem(STORAGE_KEY_PROFILE));
      const hasNewUnlocks = Boolean(safeGetStorageItem(STORAGE_KEY_UNLOCKS));
      const hasNewScores = Boolean(safeGetStorageItem(STORAGE_KEY_SCORES));

      const rawLegScores = safeGetStorageItem(LEGACY_STORAGE_KEY_SCORES);
      const rawLegProfile = safeGetStorageItem(LEGACY_STORAGE_KEY_PROFILE);
      const rawLegUnlocks = safeGetStorageItem(LEGACY_STORAGE_KEY_UNLOCKS);

      const legScoresParsed = safeParseJson(rawLegScores);
      const legProfileParsed = safeParseJson(rawLegProfile);
      const legUnlocksParsed = safeParseJson(rawLegUnlocks);

      const hasValidLegScores = Array.isArray(legScoresParsed) && legScoresParsed.length > 0;
      const hasValidLegProfile = Boolean(legProfileParsed && typeof legProfileParsed === 'object' && !Array.isArray(legProfileParsed));
      const hasValidLegUnlocks = Boolean(legUnlocksParsed && typeof legUnlocksParsed === 'object' && !Array.isArray(legUnlocksParsed));

      if (!hasNewProfile && (hasValidLegProfile || hasValidLegUnlocks || hasValidLegScores)) {
        const prof = createDefaultProfile();
        if (hasValidLegProfile) applyLegacyFieldsToProfile(prof, legProfileParsed);
        if (hasValidLegUnlocks) applyLegacyFieldsToProfile(prof, legUnlocksParsed);
        if (hasValidLegScores) mergeScoresIntoBuckets(prof.highScores, legScoresParsed);
        normalizeProfileInPlace(prof);
        safeSetStorageItem(STORAGE_KEY_PROFILE, prof);
      }

      if (!hasNewScores && (hasValidLegScores || (hasValidLegProfile && legProfileParsed.highScores))) {
        const scoreBuckets = emptyHighScoreBuckets();
        if (hasValidLegScores) mergeScoresIntoBuckets(scoreBuckets, legScoresParsed);
        if (hasValidLegProfile && legProfileParsed.highScores) {
          mergeScoresIntoBuckets(scoreBuckets, legProfileParsed.highScores);
        }
        safeSetStorageItem(STORAGE_KEY_SCORES, scoreBuckets);

        if (hasNewProfile && hasValidLegScores) {
          const curProf = safeParseJson(safeGetStorageItem(STORAGE_KEY_PROFILE));
          if (curProf && typeof curProf === 'object' && !Array.isArray(curProf)) {
            normalizeProfileInPlace(curProf);
            mergeScoresIntoBuckets(curProf.highScores, legScoresParsed);
            safeSetStorageItem(STORAGE_KEY_PROFILE, curProf);
          }
        }
      }

      if (!hasNewUnlocks && (hasValidLegUnlocks || hasValidLegProfile)) {
        const tempProf = createDefaultProfile();
        if (hasValidLegProfile) applyLegacyFieldsToProfile(tempProf, legProfileParsed);
        if (hasValidLegUnlocks) applyLegacyFieldsToProfile(tempProf, legUnlocksParsed);
        const migratedUnlocks = buildUnlockDataFromProfile(tempProf);
        if (hasValidLegUnlocks && typeof legUnlocksParsed.specialKills === 'number') {
          migratedUnlocks.specialKills = Math.max(migratedUnlocks.specialKills || 0, legUnlocksParsed.specialKills);
        }
        safeSetStorageItem(STORAGE_KEY_UNLOCKS, migratedUnlocks);
      }
    } catch (_) {
      // 마이그레이션 실패 시 새 게임 진행을 막지 않음
    } finally {
      isMigratingLegacy = false;
    }
  }

  function isValidPackedRunPayload(raw) {
    const parsed = safeParseJson(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
    if (!Array.isArray(parsed.cells) || !parsed.hero || typeof parsed.hero !== 'object' || Array.isArray(parsed.hero)) {
      return false;
    }
    return true;
  }

  function saveRunState(gameState) {
    const session = gameState && gameState._session;
    if (!session) return false;
    const RC = getRC();
    if (!RC || typeof RC.packSession !== 'function') return false;

    try {
      const packed = RC.packSession(session);
      storage.setItem(STORAGE_KEY_RUN, packed);
      return true;
    } catch (_) {
      return false;
    }
  }

  function loadRunState() {
    try {
      const raw = storage.getItem(STORAGE_KEY_RUN);
      if (!raw || !isValidPackedRunPayload(raw)) return null;
      const RC = getRC();
      if (!RC || typeof RC.unpackSession !== 'function') return null;

      const session = RC.unpackSession(raw, { profile: loadProfile() });
      if (!session) return null;
      return sessionToGameState(session);
    } catch (_) {
      return null;
    }
  }

  function clearRunState() {
    try {
      storage.removeItem(STORAGE_KEY_RUN);
      return true;
    } catch (_) {
      return false;
    }
  }

  function hasSavedRun() {
    try {
      const raw = storage.getItem(STORAGE_KEY_RUN);
      if (!raw) return false;
      return isValidPackedRunPayload(raw);
    } catch (_) {
      return false;
    }
  }

  function createDefaultProfile() {
    const RC = getRC();
    if (RC && typeof RC.createDefaultProfile === 'function') {
      return RC.createDefaultProfile();
    }
    return {
      version: 1,
      classes: CLASS_IDS.map((k, i) => ({ id: i, key: k, unlocked: i === 0, growth: i === 0 ? 1 : 0 })),
      achievements: [],
      highScores: emptyHighScoreBuckets()
    };
  }

  function saveProfile(profile) {
    try {
      if (!profile || typeof profile !== 'object') return false;
      normalizeProfileInPlace(profile);
      storage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
      if (profile.highScores && typeof profile.highScores === 'object') {
        safeSetStorageItem(STORAGE_KEY_SCORES, profile.highScores);
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  function loadProfile() {
    try {
      migrateLegacyStorageIfNeeded();
      const raw = storage.getItem(STORAGE_KEY_PROFILE);
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          return normalizeProfileInPlace(obj);
        }
      }
    } catch (_) {}
    return createDefaultProfile();
  }

  function mergeUnlockDataIntoProfile(profile, unlockData) {
    if (!profile || !unlockData || typeof unlockData !== 'object') return;
    normalizeProfileInPlace(profile);
    applyLegacyFieldsToProfile(profile, unlockData);
  }

  function saveUnlockData(unlockData) {
    try {
      if (!unlockData || typeof unlockData !== 'object') return false;
      storage.setItem(STORAGE_KEY_UNLOCKS, JSON.stringify(unlockData));
      return true;
    } catch (_) {
      return false;
    }
  }

  function loadUnlockData() {
    try {
      migrateLegacyStorageIfNeeded();
      const raw = storage.getItem(STORAGE_KEY_UNLOCKS);
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          const unlockedClasses = Array.isArray(obj.unlockedClasses) ? [...obj.unlockedClasses] : ['adventurer'];
          if (!unlockedClasses.includes('adventurer')) unlockedClasses.unshift('adventurer');
          const classGrowths = (obj.classGrowths && typeof obj.classGrowths === 'object') ? { ...obj.classGrowths } : { adventurer: 1 };
          for (const key of unlockedClasses) {
            const resolved = resolveClassKeyId(key);
            if (resolved && !classGrowths[resolved.key]) classGrowths[resolved.key] = 1;
          }
          return {
            unlockedClasses,
            classGrowths,
            ...(typeof obj.specialKills === 'number' ? { specialKills: obj.specialKills } : {})
          };
        }
      }
    } catch (_) {}
    return {
      unlockedClasses: ['adventurer'],
      classGrowths: { adventurer: 1 }
    };
  }

  function saveHighScore(categoryOrDiff, scoreRecord) {
    try {
      migrateLegacyStorageIfNeeded();
      let actualCat = categoryOrDiff;
      let actualRec = scoreRecord;
      if (categoryOrDiff && typeof categoryOrDiff === 'object' && (scoreRecord == null || typeof scoreRecord !== 'object')) {
        actualRec = categoryOrDiff;
        actualCat = actualRec.category != null ? actualRec.category : (actualRec.difficulty != null ? actualRec.difficulty : 1);
      }
      if (!actualRec || typeof actualRec !== 'object') return false;

      const profile = loadProfile();
      const RC = getRC();
      if (RC && typeof RC.addHighScore === 'function') {
        RC.addHighScore(profile, actualCat, actualRec);
      } else {
        if (!profile.highScores) profile.highScores = emptyHighScoreBuckets();
        const cat = resolveScoreBucketKey(actualCat);
        const list = profile.highScores[cat] || (profile.highScores[cat] = []);
        insertHighScoreRecordLimited(list, actualRec);
      }
      saveProfile(profile);
      return true;
    } catch (_) {
      return false;
    }
  }

  function loadHighScores(categoryOrDiff = 1, limit = null) {
    try {
      migrateLegacyStorageIfNeeded();
      const cat = resolveScoreBucketKey(categoryOrDiff);
      let list = null;
      const rawScores = safeGetStorageItem(STORAGE_KEY_SCORES);
      const parsedScores = safeParseJson(rawScores);
      if (parsedScores && typeof parsedScores === 'object' && !Array.isArray(parsedScores) && Array.isArray(parsedScores[cat])) {
        list = parsedScores[cat];
      } else {
        const profile = loadProfile();
        if (profile && profile.highScores && Array.isArray(profile.highScores[cat])) {
          list = profile.highScores[cat];
        }
      }
      if (!Array.isArray(list)) return [];
      if (typeof limit === 'number' && limit > 0) {
        return list.slice(0, limit);
      }
      return list;
    } catch (_) {
      return [];
    }
  }

  function updateProfileWithGameResult(profile, result = {}) {
    try {
      const prof = profile ? normalizeProfileInPlace(profile) : loadProfile();
      if (result && result.score != null) {
        const cat = result.category != null ? result.category : (result.difficulty != null ? result.difficulty : 1);
        const RC = getRC();
        if (RC && typeof RC.addHighScore === 'function') {
          RC.addHighScore(prof, cat, result);
        } else {
          mergeScoresIntoBuckets(prof.highScores, [result], resolveScoreBucketKey(cat));
        }
      }
      const RC = getRC();
      if (RC && typeof RC.checkAchievements === 'function') {
        RC.checkAchievements(null, prof, result);
      }
      saveProfile(prof);
      return prof;
    } catch (_) {
      return profile || createDefaultProfile();
    }
  }

  // 체크섬 및 프로필 내보내기/가져오기 [O1]
  function calculateChecksum(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  function exportProfileCode(profile = null) {
    const prof = profile || loadProfile();
    try {
      const jsonStr = JSON.stringify(prof);
      const b64 = (typeof Buffer !== 'undefined')
        ? Buffer.from(jsonStr, 'utf8').toString('base64')
        : btoa(unescape(encodeURIComponent(jsonStr)));
      const chk = calculateChecksum(b64);
      return `GR1-${b64}-${chk}`;
    } catch (_) {
      return '';
    }
  }

  function importProfileCode(code, existingProfile = null) {
    if (!code || typeof code !== 'string') {
      return { success: false, reason: 'invalid_code' };
    }
    const parts = code.trim().split('-');
    if (parts.length !== 3 || parts[0] !== 'GR1') {
      return { success: false, reason: 'format_error' };
    }
    const b64 = parts[1];
    const chk = parts[2];
    if (calculateChecksum(b64) !== chk) {
      return { success: false, reason: 'checksum_mismatch' };
    }
    try {
      const jsonStr = (typeof Buffer !== 'undefined')
        ? Buffer.from(b64, 'base64').toString('utf8')
        : decodeURIComponent(escape(atob(b64)));
      const parsed = JSON.parse(jsonStr);
      if (parsed && typeof parsed === 'object') {
        saveProfile(parsed);
        return { success: true, profile: parsed };
      }
    } catch (_) {}
    return { success: false, reason: 'parse_error' };
  }

  // ==========================================
  // [M, N] 직업·종족·퍽·업적 관련 검증 API [O1]
  // ==========================================

  function getPerkSlotCount(growth) {
    const RC = getRC();
    if (RC && typeof RC.getPerkSlotCount === 'function') {
      return RC.getPerkSlotCount(growth);
    }
    const g = Math.max(0, Math.floor(growth || 0));
    if (g >= 9) return 4;
    if (g >= 7) return 3;
    if (g >= 3) return 2;
    return 1;
  }

  function canCustomizePerks(classId, unlockData = null) {
    const cKey = typeof classId === 'string' ? (CLASS_ID_TO_KEY[classId] != null ? CLASS_ID_TO_KEY[classId] : 0) : classId;
    return cKey !== 0; // 모험가(0)는 꾸미기 불가 [M2]
  }

  function canConfirmPerkFlawSetup(classId, perks, flaws, growth = 10) {
    const RC = getRC();
    const cKey = typeof classId === 'string' ? (CLASS_ID_TO_KEY[classId] != null ? CLASS_ID_TO_KEY[classId] : 0) : classId;
    if (RC && typeof RC.validatePerkFlawSetup === 'function') {
      const g = (growth != null && typeof growth === 'number') ? growth : 10;
      const res = RC.validatePerkFlawSetup(cKey, g, perks, flaws);
      return Boolean(res && res.valid);
    }
    return true;
  }

  function isPerkChoiceDisabled(classId, slotIndex, perkId, currentPerks) {
    const RC = getRC();
    const cKey = typeof classId === 'string' ? (CLASS_ID_TO_KEY[classId] != null ? CLASS_ID_TO_KEY[classId] : 0) : classId;
    if (RC && typeof RC.isPerkChoiceDisabled === 'function') {
      return RC.isPerkChoiceDisabled(cKey, slotIndex, perkId, currentPerks);
    }
    return false;
  }

  function isFlawChoiceDisabled(classId, slotIndex, flawId, currentFlaws) {
    const RC = getRC();
    const cKey = typeof classId === 'string' ? (CLASS_ID_TO_KEY[classId] != null ? CLASS_ID_TO_KEY[classId] : 0) : classId;
    if (RC && typeof RC.isFlawChoiceDisabled === 'function') {
      return RC.isFlawChoiceDisabled(cKey, slotIndex, flawId, currentFlaws);
    }
    return false;
  }

  function canChangeRace(classId, unlockData = null) {
    if (typeof unlockData === 'number') {
      const cKey = typeof classId === 'string' ? (CLASS_ID_TO_KEY[classId] != null ? CLASS_ID_TO_KEY[classId] : 0) : classId;
      if (cKey === 0) return false;
      return unlockData >= 5;
    }
    const cKey = typeof classId === 'string' ? (CLASS_ID_TO_KEY[classId] != null ? CLASS_ID_TO_KEY[classId] : 0) : classId;
    if (cKey === 0) return false;
    let growth = 1;
    if (unlockData && unlockData.classGrowths) {
      const strKey = typeof classId === 'number' ? CLASS_KEY_TO_ID[classId] : classId;
      growth = unlockData.classGrowths[classId] || unlockData.classGrowths[cKey] || (strKey ? unlockData.classGrowths[strKey] : 1) || 1;
    }
    return growth >= 5;
  }

  function validateRaceSelection(classId, raceId, unlockData = null) {
    return isRaceUnlocked(raceId, unlockData) && canChangeRace(classId, unlockData);
  }

  function isClassUnlocked(classId, unlockData = null) {
    const resolved = resolveClassKeyId(classId);
    const cKey = resolved ? resolved.id : (typeof classId === 'number' ? classId : 0);
    if (cKey === 0) return true;
    if (unlockData && Array.isArray(unlockData.unlockedClasses)) {
      if (unlockData.unlockedClasses.includes(classId) || unlockData.unlockedClasses.includes(cKey)) return true;
      if (resolved && unlockData.unlockedClasses.includes(resolved.key)) return true;
      return unlockData.unlockedClasses.some(item => {
        const r = resolveClassKeyId(item);
        return Boolean(r && r.id === cKey);
      });
    }
    return false;
  }

  function isRaceUnlocked(raceId, unlockData = null) {
    const rId = Math.floor(raceId || 0);
    if (rId === 0) return true;
    const RC = getRC();
    if (RC && typeof RC.isRaceUnlocked === 'function') {
      const unlockParam = (unlockData && unlockData.classes)
        ? unlockData
        : (unlockData && unlockData.classGrowths ? unlockData.classGrowths : unlockData);
      return RC.isRaceUnlocked(rId, unlockParam);
    }
    return false;
  }

  function checkAchievements(gameState, profile = null) {
    const RC = getRC();
    const session = gameState && gameState._session ? gameState._session : gameState;
    const prof = profile || loadProfile();
    if (RC && typeof RC.checkAchievements === 'function') {
      return RC.checkAchievements(session, prof);
    }
    return prof;
  }

  function isAchievementUnlocked(profile, achId) {
    const prof = profile || loadProfile();
    if (!prof || !Array.isArray(prof.achievements)) return false;
    const found = prof.achievements.find(a => (typeof a === 'string' ? (a === achId) : a && (a.id === achId || a.key === achId)));
    return Boolean(found && (found.unlocked || found.progress >= 100));
  }

  // ==========================================
  // [O1] 기존 GoblinRaid 공개 인터페이스 전체 반환
  // ==========================================
  return {
    ACHIEVEMENTS_DATA,
    BOARD_HEIGHT,
    BOARD_WIDTH,
    CLASSES,
    CLASS_IDS,
    FLAWS_DATA,
    MAX_PERK_SLOTS,
    PERKS_DATA,
    RACES_DATA,
    SPECIAL_ENEMY_ICONS,
    SPECIAL_ENEMY_SVGS,
    TILE_ICONS,
    TILE_SVGS,
    calculateAttack,
    calculateResourceGain,
    canChangeRace,
    canConfirmPerkFlawSetup,
    canCustomizePerks,
    canUseSkill,
    checkAchievements,
    chooseLevelupReward,
    chooseShopItem,
    chooseUpgrade,
    clearRunState,
    createGameState,
    createDefaultProfile,
    createRNG,
    createSeededRng: createRNG,
    exportProfileCode,
    getLevelupOptions,
    getPerkSlotCount,
    canCustomizePerks,
    canConfirmPerkFlawSetup,
    isPerkChoiceDisabled,
    isFlawChoiceDisabled,
    getShopOptions,
    getEnemyInfo,
    getSkillInfo,
    boostTitle,
    slotNameKo,
    getSpecialEnemySvg,
    getUpgradeOptions,
    hasSavedRun,
    importProfileCode,
    isAchievementUnlocked,
    isAttackType,
    isClassUnlocked,
    isRaceUnlocked,
    isValidChain,
    loadHighScores,
    loadProfile,
    loadRunState,
    loadUnlockData,
    resolveTurn,
    saveHighScore,
    saveProfile,
    saveRunState,
    saveUnlockData,
    stepChain,
    updateProfileWithGameResult,
    useSkill,
    validateRaceSelection,
    buildUnlockDataFromProfile,
    cancelChain,
    // 조각 29 난이도 4단계 선택 관련 노출 [추가 29.1, 29.2, 29.4]
    DIFFICULTY_NAMES,
    getDifficultyName,
    saveSelectedDifficulty,
    loadSelectedDifficulty,
    STORAGE_KEY_DIFFICULTY,
    // 보조 함수 및 연결층 헬퍼
    sessionToGameState,
    getRuleCore: getRC,
    storage
  };
}));
