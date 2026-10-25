function calcInherit(hasSpouse, children, parents, estate) {
  if (typeof estate !== 'number' || isNaN(estate) || estate <= 0) {
    return { ok: false };
  }
  if (typeof children !== 'number' || typeof parents !== 'number' || isNaN(children) || isNaN(parents)) {
    return { ok: false };
  }
  if (Math.floor(children) !== children || Math.floor(parents) !== parents) {
    return { ok: false };
  }
  if (children < 0 || parents < 0) {
    return { ok: false };
  }

  var spouseBool = !!hasSpouse;
  var rows = [];
  var totalWeight = 0;

  if (children > 0) {
    if (spouseBool) {
      totalWeight += 1.5;
    }
    totalWeight += children * 1;

    if (spouseBool) {
      var sEach = Math.round((estate * 1.5) / totalWeight);
      rows.push({
        who: '배우자',
        count: 1,
        weight: 1.5,
        amountEach: sEach,
        amountTotal: sEach
      });
    }
    var cEach = Math.round((estate * 1) / totalWeight);
    rows.push({
      who: '자녀',
      count: children,
      weight: 1,
      amountEach: cEach,
      amountTotal: cEach * children
    });
  } else if (parents > 0) {
    if (spouseBool) {
      totalWeight += 1.5;
    }
    totalWeight += parents * 1;

    if (spouseBool) {
      var sEach = Math.round((estate * 1.5) / totalWeight);
      rows.push({
        who: '배우자',
        count: 1,
        weight: 1.5,
        amountEach: sEach,
        amountTotal: sEach
      });
    }
    var pEach = Math.round((estate * 1) / totalWeight);
    rows.push({
      who: '부모',
      count: parents,
      weight: 1,
      amountEach: pEach,
      amountTotal: pEach * parents
    });
  } else if (spouseBool) {
    totalWeight = 1.5;
    var sEach = Math.round((estate * 1.5) / totalWeight);
    rows.push({
      who: '배우자',
      count: 1,
      weight: 1.5,
      amountEach: sEach,
      amountTotal: sEach
    });
  } else {
    return { ok: false };
  }

  return {
    ok: true,
    rows: rows,
    totalWeight: totalWeight
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcInherit: calcInherit
  };
}
