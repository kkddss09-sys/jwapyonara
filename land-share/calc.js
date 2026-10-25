function calcLandShare(totalLandM2, totalExclusiveM2, myExclusiveM2) {
  if (typeof totalLandM2 !== 'number' || typeof totalExclusiveM2 !== 'number' || typeof myExclusiveM2 !== 'number') {
    return { ok: false };
  }
  if (isNaN(totalLandM2) || isNaN(totalExclusiveM2) || isNaN(myExclusiveM2)) {
    return { ok: false };
  }
  if (totalLandM2 <= 0 || totalExclusiveM2 <= 0 || myExclusiveM2 <= 0) {
    return { ok: false };
  }

  var landM2 = (totalLandM2 * myExclusiveM2) / totalExclusiveM2;
  var pyeong = landM2 / 3.305785;
  var ratioPct = (myExclusiveM2 / totalExclusiveM2) * 100;

  return {
    ok: true,
    landM2: landM2,
    pyeong: pyeong,
    ratioPct: ratioPct
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcLandShare: calcLandShare
  };
}
