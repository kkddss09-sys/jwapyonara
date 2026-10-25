function parseCreditors(text) {
  if (!text || typeof text !== 'string') return [];
  var lines = text.split('\n');
  var list = [];
  var lineIndex = 0;
  for (var i = 0; i < lines.length; i++) {
    var rawLine = lines[i];
    var line = rawLine.trim();
    if (!line) continue;
    lineIndex++;

    var parts = line.split(',');
    var name = (parts[0] || '').trim();
    var rawAmount = (parts[1] || '').trim().replace(/,/g, '');
    var amount = parseFloat(rawAmount);
    if (isNaN(amount) || amount <= 0) {
      continue;
    }

    var rank;
    if (parts.length >= 3 && parts[2].trim() !== '') {
      var parsedRank = parseInt(parts[2].trim(), 10);
      rank = isNaN(parsedRank) ? lineIndex : parsedRank;
    } else {
      rank = lineIndex;
    }

    list.push({
      name: name,
      amount: amount,
      rank: rank
    });
  }
  return list;
}

function calcDividend(fund, creditors) {
  if (typeof fund !== 'number' || isNaN(fund) || fund < 0 || !Array.isArray(creditors) || creditors.length === 0) {
    return { ok: false };
  }

  var items = [];
  for (var i = 0; i < creditors.length; i++) {
    var c = creditors[i];
    if (!c || typeof c.amount !== 'number' || isNaN(c.amount) || c.amount < 0) {
      return { ok: false };
    }
    items.push({
      name: c.name != null ? String(c.name) : '',
      amount: c.amount,
      rank: typeof c.rank === 'number' && !isNaN(c.rank) ? c.rank : (i + 1),
      paid: 0,
      short: 0
    });
  }

  var ranksMap = {};
  for (var i = 0; i < items.length; i++) {
    ranksMap[items[i].rank] = true;
  }
  var sortedRanks = Object.keys(ranksMap).map(Number).sort(function (a, b) { return a - b; });

  var remainingFund = fund;

  for (var rIdx = 0; rIdx < sortedRanks.length; rIdx++) {
    var currentRank = sortedRanks[rIdx];
    var rankGroup = [];
    var rankTotalAmount = 0;

    for (var j = 0; j < items.length; j++) {
      if (items[j].rank === currentRank) {
        rankGroup.push(items[j]);
        rankTotalAmount += items[j].amount;
      }
    }

    if (remainingFund <= 0 || rankTotalAmount <= 0) {
      for (var j = 0; j < rankGroup.length; j++) {
        rankGroup[j].paid = 0;
        rankGroup[j].short = rankGroup[j].amount;
      }
      continue;
    }

    if (remainingFund >= rankTotalAmount) {
      for (var j = 0; j < rankGroup.length; j++) {
        rankGroup[j].paid = rankGroup[j].amount;
        rankGroup[j].short = 0;
      }
      remainingFund -= rankTotalAmount;
    } else {
      var fundToDistribute = remainingFund;
      remainingFund = 0;

      for (var j = 0; j < rankGroup.length; j++) {
        var share = Math.round(fundToDistribute * (rankGroup[j].amount / rankTotalAmount));
        rankGroup[j].paid = share;
        rankGroup[j].short = rankGroup[j].amount - share;
      }
    }
  }

  var rows = [];
  for (var i = 0; i < items.length; i++) {
    rows.push({
      name: items[i].name,
      amount: items[i].amount,
      rank: items[i].rank,
      paid: items[i].paid,
      short: items[i].short
    });
  }

  return {
    ok: true,
    rows: rows,
    remaining: Math.max(0, remainingFund)
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    parseCreditors: parseCreditors,
    calcDividend: calcDividend
  };
}
