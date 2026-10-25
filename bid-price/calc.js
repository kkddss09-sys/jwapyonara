function calcBidPrice(salePrice, sellCost, repair, otherCost, targetProfit, buyCostPct) {
  salePrice = Number(salePrice);
  sellCost = Number(sellCost);
  repair = Number(repair);
  otherCost = Number(otherCost);
  targetProfit = Number(targetProfit);
  buyCostPct = Number(buyCostPct);

  if (
    isNaN(salePrice) ||
    isNaN(sellCost) ||
    isNaN(repair) ||
    isNaN(otherCost) ||
    isNaN(targetProfit) ||
    isNaN(buyCostPct)
  ) {
    return { ok: false };
  }

  if (
    salePrice <= 0 ||
    sellCost < 0 ||
    repair < 0 ||
    otherCost < 0 ||
    targetProfit < 0 ||
    buyCostPct < 0
  ) {
    return { ok: false };
  }

  var netBeforeBuy = salePrice - sellCost - repair - otherCost - targetProfit;
  if (netBeforeBuy <= 0) {
    return { ok: false };
  }

  var maxBid = Math.round(netBeforeBuy / (1 + buyCostPct / 100));
  if (maxBid <= 0) {
    return { ok: false };
  }

  var buyCost = Math.round((maxBid * buyCostPct) / 100);

  return {
    ok: true,
    maxBid: maxBid,
    buyCost: buyCost
  };
}

function calcDeposit(minPrice, depositPct) {
  minPrice = Number(minPrice);
  depositPct = Number(depositPct);

  if (isNaN(minPrice) || isNaN(depositPct)) {
    return { ok: false };
  }

  if (minPrice <= 0 || depositPct < 0) {
    return { ok: false };
  }

  var deposit = Math.round((minPrice * depositPct) / 100);

  return {
    ok: true,
    deposit: deposit
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcBidPrice: calcBidPrice,
    calcDeposit: calcDeposit
  };
}
