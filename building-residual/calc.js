function calcResidual(cost, salvagePct, usefulLife, elapsedYears) {
  if (typeof cost !== 'number' || typeof salvagePct !== 'number' || typeof usefulLife !== 'number' || typeof elapsedYears !== 'number') {
    return { ok: false };
  }
  if (isNaN(cost) || isNaN(salvagePct) || isNaN(usefulLife) || isNaN(elapsedYears)) {
    return { ok: false };
  }
  if (cost <= 0 || usefulLife <= 0 || salvagePct < 0 || salvagePct > 100 || elapsedYears < 0) {
    return { ok: false };
  }

  var salvage = (cost * salvagePct) / 100;
  var annualDep = (cost - salvage) / usefulLife;
  var accumulated = Math.min(annualDep * elapsedYears, cost - salvage);
  var currentValue = cost - accumulated;

  return {
    ok: true,
    annualDep: annualDep,
    accumulated: accumulated,
    currentValue: currentValue
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcResidual: calcResidual
  };
}
