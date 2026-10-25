function calcSaving(kind, mode, amount, annualRatePct, months, taxPct) {
  if (kind !== 'deposit' && kind !== 'installment') {
    return { ok: false };
  }
  if (mode !== 'simple' && mode !== 'compound') {
    return { ok: false };
  }
  if (
    typeof amount !== 'number' || isNaN(amount) || amount <= 0 ||
    typeof annualRatePct !== 'number' || isNaN(annualRatePct) || annualRatePct < 0 ||
    typeof months !== 'number' || isNaN(months) || months <= 0 ||
    typeof taxPct !== 'number' || isNaN(taxPct) || taxPct < 0 || taxPct > 100
  ) {
    return { ok: false };
  }

  var i = (annualRatePct / 100) / 12;
  var interest = 0;
  var principalTotal = 0;

  if (kind === 'deposit') {
    principalTotal = amount;
    if (mode === 'simple') {
      interest = amount * (annualRatePct / 100) * (months / 12);
    } else {
      interest = amount * (Math.pow(1 + i, months) - 1);
    }
  } else {
    // installment
    principalTotal = amount * months;
    if (mode === 'simple') {
      interest = amount * i * (months * (months + 1) / 2);
    } else {
      if (i === 0) {
        interest = 0;
      } else {
        interest = amount * ((Math.pow(1 + i, months + 1) - (1 + i)) / i) - (amount * months);
      }
    }
  }

  var interestBefore = Math.round(interest);
  var tax = Math.round((interestBefore * taxPct) / 100);
  var interestAfter = interestBefore - tax;
  var total = principalTotal + interestAfter;

  return {
    ok: true,
    principalTotal: principalTotal,
    interestBefore: interestBefore,
    tax: tax,
    interestAfter: interestAfter,
    total: total
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcSaving: calcSaving
  };
}
