function calcTrip(days, items) {
  if (typeof days !== 'number' || isNaN(days) || !Number.isInteger(days) || days < 1) {
    return { ok: false };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false };
  }

  var rows = [];
  var total = 0;

  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (!it || typeof it !== 'object') {
      return { ok: false };
    }
    if (typeof it.amount !== 'number' || isNaN(it.amount) || it.amount < 0) {
      return { ok: false };
    }

    var isPerDay = !!it.perDay;
    var subtotal = isPerDay ? it.amount * days : it.amount;
    total += subtotal;

    rows.push({
      name: typeof it.name === 'string' ? it.name : '',
      amount: it.amount,
      perDay: isPerDay,
      subtotal: subtotal
    });
  }

  var avgPerDay = Math.round(total / days);

  return {
    ok: true,
    rows: rows,
    total: total,
    avgPerDay: avgPerDay
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcTrip: calcTrip
  };
}
