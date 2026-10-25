// 부동산 상담 종합 한 장 — 기존 상담지(consult) + 사이트의 부동산 계산기 전부를 묶음으로 켜서 한 번에(2026-10-25)
// 새로 계산하지 않는다. 각 모듈 함수를 그대로 부르고, 돌려준 객체를 가공하지 않고 담는다.
// 쓰는 함수: sangdam/calc.js(consult), dti(calcDTI), rti(calcRTI), auction-loan(calcAuctionLoan), auction-cost(calcAuctionCost),
//   bid-price(calcBidPrice, calcDeposit), rebuild-year(calcRebuild), land-share(calcLandShare), remodel-profit(calcRemodel),
//   building-residual(calcResidual), inherit-share(calcInherit), appraisal-income(calcDirectCap, calcDCF), appraisal-cost(calcCostMethod, calcRentCost),
//   appraisal-compare(calcComparable), _common/re-calc.js(compareRepay, prepay, refinance, grace, balanceAfter, rateChange, gap, toWolse, toJeonse,
//   rentYield, raise, jeonseVsWolse, housingCost, mgmtPer, perPyeong, exclusiveRatio, landRatio, installments, savingMonths)
// 브라우저에서는 index.html이 먼저 불러온 전역 함수를 그대로 쓰고, node 시험에서는 아래에서 require로 불러온다.
if (typeof module !== 'undefined') {
  var RC = require('../_common/re-calc.js'), SD = require('../sangdam/calc.js'), DTI = require('../dti/calc.js'), RTI = require('../rti/calc.js');
  var AL = require('../auction-loan/calc.js'), AC = require('../auction-cost/calc.js'), BP = require('../bid-price/calc.js');
  var RB = require('../rebuild-year/calc.js'), LS = require('../land-share/calc.js'), RM = require('../remodel-profit/calc.js');
  var BR = require('../building-residual/calc.js'), IH = require('../inherit-share/calc.js');
  var AI = require('../appraisal-income/calc.js'), ACo = require('../appraisal-cost/calc.js'), ACm = require('../appraisal-compare/calc.js');
  var consult = SD.consult, calcDTI = DTI.calcDTI, calcRTI = RTI.calcRTI;
  var calcAuctionLoan = AL.calcAuctionLoan, calcAuctionCost = AC.calcAuctionCost, calcBidPrice = BP.calcBidPrice, calcDeposit = BP.calcDeposit;
  var calcRebuild = RB.calcRebuild, calcLandShare = LS.calcLandShare, calcRemodel = RM.calcRemodel, calcResidual = BR.calcResidual, calcInherit = IH.calcInherit;
  var calcDirectCap = AI.calcDirectCap, calcDCF = AI.calcDCF, calcCostMethod = ACo.calcCostMethod, calcRentCost = ACo.calcRentCost, calcComparable = ACm.calcComparable;
  var compareRepay = RC.compareRepay, prepay = RC.prepay, refinance = RC.refinance, grace = RC.grace, balanceAfter = RC.balanceAfter, rateChange = RC.rateChange;
  var gap = RC.gap, toWolse = RC.toWolse, toJeonse = RC.toJeonse, rentYield = RC.rentYield, raise = RC.raise, jeonseVsWolse = RC.jeonseVsWolse;
  var housingCost = RC.housingCost, mgmtPer = RC.mgmtPer, perPyeong = RC.perPyeong, exclusiveRatio = RC.exclusiveRatio, landRatio = RC.landRatio;
  var installments = RC.installments, savingMonths = RC.savingMonths;
}

// 지금 쓸 수 있는 함수 목록(스크립트가 안 불러져 없는 함수는 null). typeof는 선언되지 않은 이름에도 오류를 내지 않는다
function sp_funcs() {
  return {
    consult: typeof consult === 'function' ? consult : null,
    calcDTI: typeof calcDTI === 'function' ? calcDTI : null,
    calcRTI: typeof calcRTI === 'function' ? calcRTI : null,
    calcAuctionLoan: typeof calcAuctionLoan === 'function' ? calcAuctionLoan : null,
    calcAuctionCost: typeof calcAuctionCost === 'function' ? calcAuctionCost : null,
    calcBidPrice: typeof calcBidPrice === 'function' ? calcBidPrice : null,
    calcDeposit: typeof calcDeposit === 'function' ? calcDeposit : null,
    calcRebuild: typeof calcRebuild === 'function' ? calcRebuild : null,
    calcLandShare: typeof calcLandShare === 'function' ? calcLandShare : null,
    calcRemodel: typeof calcRemodel === 'function' ? calcRemodel : null,
    calcResidual: typeof calcResidual === 'function' ? calcResidual : null,
    calcInherit: typeof calcInherit === 'function' ? calcInherit : null,
    calcDirectCap: typeof calcDirectCap === 'function' ? calcDirectCap : null,
    calcCostMethod: typeof calcCostMethod === 'function' ? calcCostMethod : null,
    calcComparable: typeof calcComparable === 'function' ? calcComparable : null,
    compareRepay: typeof compareRepay === 'function' ? compareRepay : null,
    prepay: typeof prepay === 'function' ? prepay : null,
    refinance: typeof refinance === 'function' ? refinance : null,
    grace: typeof grace === 'function' ? grace : null,
    balanceAfter: typeof balanceAfter === 'function' ? balanceAfter : null,
    rateChange: typeof rateChange === 'function' ? rateChange : null,
    gap: typeof gap === 'function' ? gap : null,
    toWolse: typeof toWolse === 'function' ? toWolse : null,
    toJeonse: typeof toJeonse === 'function' ? toJeonse : null,
    rentYield: typeof rentYield === 'function' ? rentYield : null,
    raise: typeof raise === 'function' ? raise : null,
    jeonseVsWolse: typeof jeonseVsWolse === 'function' ? jeonseVsWolse : null,
    housingCost: typeof housingCost === 'function' ? housingCost : null,
    mgmtPer: typeof mgmtPer === 'function' ? mgmtPer : null,
    perPyeong: typeof perPyeong === 'function' ? perPyeong : null,
    exclusiveRatio: typeof exclusiveRatio === 'function' ? exclusiveRatio : null,
    landRatio: typeof landRatio === 'function' ? landRatio : null,
    installments: typeof installments === 'function' ? installments : null,
    savingMonths: typeof savingMonths === 'function' ? savingMonths : null
  };
}

// 숫자로(없으면 0)
function sp_n(x) { return Number(x) || 0; }

function consultPlus(v) {
  v = v || {};
  var F = sp_funcs(), use = v.use || {}, r = {};
  // 함수를 그대로 부른다. 없으면 { ok:false, missing:'이름' }, 해당 없으면(when이 false) null
  var call = function (name, args, when) {
    if (when === false) return null;
    if (!F[name]) return { ok: false, missing: name };
    return F[name].apply(null, args);
  };
  var n = sp_n;

  // 기존 상담지 결과를 통째로
  r.base = call('consult', [v]);
  var loan = r.base && r.base.ok !== false ? n(r.base.loan) : 0;
  var baseMonthly = r.base && r.base.ok !== false ? n(r.base.monthly) : 0;

  // DTI(이번 대출만, 기존 대출 이자 0) — 항상
  r.dti = call('calcDTI', [v.income, loan, v.rate, v.years, 0]);

  // 대출 더 보기 — 대출액은 r.base.loan
  if (use.loanPlus) {
    var hasLoan = loan > 0;
    r.loanPlus = {
      compare: call('compareRepay', [loan, v.rate, v.years], hasLoan),
      prepay: call('prepay', [loan, v.rate, v.years, n(v.prepayAmount)], hasLoan && n(v.prepayAmount) > 0),
      refi: call('refinance', [loan, v.years, v.rate, n(v.newRate), n(v.refiFeePct), n(v.refiOtherCost)], hasLoan && n(v.newRate) > 0),
      grace: call('grace', [loan, v.rate, v.years, n(v.graceYears)], hasLoan && n(v.graceYears) > 0),
      balanceAfter: call('balanceAfter', [loan, v.rate, v.years, n(v.afterYears)], hasLoan && n(v.afterYears) > 0),
      rateUp1: call('rateChange', [loan, v.rate, v.years, 1], hasLoan)
    };
  } else r.loanPlus = null;

  // 전월세·투자 — v.deposit(전세 보증금 칸)을 이 집의 보증금으로 쓴다
  if (use.rent) {
    var dep = n(v.deposit), wol = n(v.wolse), conv = n(v.conv);
    r.rent = {
      gap: call('gap', [v.price, v.deposit], dep > 0),
      toWolse: call('toWolse', [dep, 0, conv], dep > 0 && conv > 0),            // 보증금 전부를 월세로(남기는 보증금 0)
      toJeonse: call('toJeonse', [dep, wol, conv], wol > 0 && conv > 0),        // 지금 보증금 + 월세를 전세로 치면
      yield: call('rentYield', [v.price, dep, wol, n(v.rentLoanAmt), n(v.rentLoanRate)], wol > 0),
      rti: call('calcRTI', [wol * 12, n(v.rentLoanAmt), n(v.rentLoanRate)], wol > 0 && n(v.rentLoanAmt) > 0 && n(v.rentLoanRate) > 0),
      raise: call('raise', [dep, wol, n(v.raisePct)], n(v.raisePct) > 0 && (dep > 0 || wol > 0)),
      jvw: call('jeonseVsWolse', [dep, n(v.mine), n(v.rentLoanRate), wol], dep > 0 && wol > 0),
      housing: call('housingCost', [baseMonthly, n(v.mgmtFee), 0, n(v.etcCost), Math.round(n(v.income) / 12)]),   // 직접 사서 살 때(월세 0), 소득은 연소득 ÷ 12
      mgmt: call('mgmtPer', [n(v.mgmtFee), v.m2], n(v.mgmtFee) > 0)
    };
  } else r.rent = null;

  // 경매
  if (use.auction) {
    var bid = n(v.bidPrice);
    var aCost = call('calcAuctionCost', [bid, n(v.buyCostPct), n(v.legalFee), n(v.evictionCost), n(v.repair), n(v.unpaidDues), n(v.movingCost)], bid > 0);
    r.auction = {
      loan: call('calcAuctionLoan', [bid, n(v.auctionLtv), aCost && aCost.ok ? aCost.total : 0], bid > 0),   // 더 드는 돈은 경매 총비용 결과(없으면 0)
      cost: aCost,
      bid: call('calcBidPrice', [n(v.salePrice), n(v.sellCost), n(v.repair), n(v.otherCost), n(v.targetProfit), n(v.buyCostPct)], n(v.salePrice) > 0),
      deposit: call('calcDeposit', [n(v.minPrice), n(v.depositPct)], n(v.minPrice) > 0)
    };
  } else r.auction = null;

  // 단지·재건축 — 내 전용면적은 기본 입력의 m2
  if (use.complex) {
    r.complex = {
      rebuild: call('calcRebuild', [n(v.builtYear), n(v.thisYear), n(v.requiredYears)], n(v.builtYear) > 0),
      land: call('calcLandShare', [n(v.totalLandM2), n(v.totalExclusiveM2), n(v.m2)], n(v.totalLandM2) > 0 && n(v.totalExclusiveM2) > 0),
      perPyeong: call('perPyeong', [v.price, v.m2]),
      exclusive: call('exclusiveRatio', [v.m2, n(v.supplyM2)], n(v.supplyM2) > 0),
      landRatio: call('landRatio', [n(v.landM2), n(v.buildingM2), n(v.totalFloorM2)], n(v.landM2) > 0)
    };
  } else r.complex = null;

  // 투자·상속·감정·분양
  if (use.extra) {
    var rm = v.remodel || {}, rs = v.residual || {}, ih = v.inherit || {}, ap = v.appraisal || {}, ins = v.installments || {}, sv = v.saving || {};
    r.extra = {
      remodel: call('calcRemodel', [n(rm.buyPrice), n(rm.buyCost), n(rm.remodelCost), n(rm.otherCost), n(rm.salePrice), n(rm.sellCost), n(rm.months)], n(rm.buyPrice) > 0 || n(rm.salePrice) > 0),
      residual: call('calcResidual', [n(rs.cost), n(rs.salvagePct), n(rs.usefulLife), n(rs.elapsedYears)], n(rs.cost) > 0),
      inherit: call('calcInherit', [!!ih.hasSpouse, n(ih.children), n(ih.parents), n(ih.estate)], n(ih.estate) > 0),
      appraisal: {
        direct: call('calcDirectCap', [n(ap.noiYear), n(ap.capRatePct)], n(ap.noiYear) > 0),
        dcf: null,    // 할인현금흐름(성장률·할인율·기간·되팔 값) 칸은 스펙에 없어 넣지 않음
        cost: call('calcCostMethod', [n(ap.replacementCost), n(ap.usefulLife), n(ap.elapsedYears), n(ap.salvagePct)], n(ap.replacementCost) > 0),
        rent: null,   // 적산 임대료(기초가액·기대이율·필요제경비) 칸은 스펙에 없어 넣지 않음
        comparable: call('calcComparable', [n(ap.casePricePerM2), n(ap.circumstance), n(ap.timeAdj), n(ap.regional), n(ap.individual), n(v.m2)], n(ap.casePricePerM2) > 0)
      },
      installments: call('installments', [v.price, n(ins.downPct), n(ins.midPct), n(ins.midCount)], n(v.price) > 0),
      saving: call('savingMonths', [n(sv.target), n(sv.have), n(sv.perMonth), n(sv.yearReturnPct)], n(sv.target) > 0)
    };
  } else r.extra = null;

  return r;
}

if (typeof module !== 'undefined') module.exports = { consultPlus: consultPlus };
