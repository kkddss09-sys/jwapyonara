function calcRemodel(buyPrice, buyCost, remodelCost, otherCost, salePrice, sellCost, months) {
  if (
    typeof buyPrice !== 'number' || isNaN(buyPrice) || buyPrice < 0 ||
    typeof buyCost !== 'number' || isNaN(buyCost) || buyCost < 0 ||
    typeof remodelCost !== 'number' || isNaN(remodelCost) || remodelCost < 0 ||
    typeof otherCost !== 'number' || isNaN(otherCost) || otherCost < 0 ||
    typeof salePrice !== 'number' || isNaN(salePrice) || salePrice < 0 ||
    typeof sellCost !== 'number' || isNaN(sellCost) || sellCost < 0 ||
    typeof months !== 'number' || isNaN(months) || months < 0
  ) {
    return { ok: false };
  }

  var invest = buyPrice + buyCost + remodelCost + otherCost;
  if (invest <= 0) {
    return { ok: false };
  }

  var profit = salePrice - sellCost - invest;
  var roiPct = (profit / invest) * 100;
  var annualRoiPct = months > 0 ? (roiPct * 12) / months : null;

  return {
    ok: true,
    invest: invest,
    profit: profit,
    roiPct: roiPct,
    annualRoiPct: annualRoiPct
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcRemodel: calcRemodel
  };
}
