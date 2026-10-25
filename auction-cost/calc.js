function calcAuctionCost(bid, buyCostPct, legalFee, evictionCost, repair, unpaidDues, movingCost) {
  bid = Number(bid);
  buyCostPct = Number(buyCostPct);
  legalFee = Number(legalFee);
  evictionCost = Number(evictionCost);
  repair = Number(repair);
  unpaidDues = Number(unpaidDues);
  movingCost = Number(movingCost);

  if (
    isNaN(bid) ||
    isNaN(buyCostPct) ||
    isNaN(legalFee) ||
    isNaN(evictionCost) ||
    isNaN(repair) ||
    isNaN(unpaidDues) ||
    isNaN(movingCost)
  ) {
    return { ok: false };
  }

  if (
    bid <= 0 ||
    buyCostPct < 0 ||
    legalFee < 0 ||
    evictionCost < 0 ||
    repair < 0 ||
    unpaidDues < 0 ||
    movingCost < 0
  ) {
    return { ok: false };
  }

  var buyCost = Math.round((bid * buyCostPct) / 100);
  var extras = legalFee + evictionCost + repair + unpaidDues + movingCost;
  var total = buyCost + extras;
  var totalWithBid = bid + total;
  var pctOfBid = Math.round((total / bid) * 10000) / 100;

  return {
    ok: true,
    buyCost: buyCost,
    extras: extras,
    total: total,
    totalWithBid: totalWithBid,
    pctOfBid: pctOfBid
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcAuctionCost: calcAuctionCost
  };
}
