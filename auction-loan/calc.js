function calcAuctionLoan(bidPrice, ltvPct, extraCosts) {
  if (extraCosts === undefined || extraCosts === null) {
    extraCosts = 0;
  }
  bidPrice = Number(bidPrice);
  ltvPct = Number(ltvPct);
  extraCosts = Number(extraCosts);

  if (isNaN(bidPrice) || isNaN(ltvPct) || isNaN(extraCosts)) {
    return { ok: false };
  }
  if (bidPrice <= 0 || ltvPct < 0 || ltvPct > 100 || extraCosts < 0) {
    return { ok: false };
  }

  var loanLimit = Math.round((bidPrice * ltvPct) / 100);
  var equity = bidPrice - loanLimit + extraCosts;

  return {
    ok: true,
    loanLimit: loanLimit,
    equity: equity
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcAuctionLoan: calcAuctionLoan
  };
}
