function calcFuel(distanceKm, kmPerLiter, pricePerLiter, roundTrip, tripsPerMonth) {
  if (typeof distanceKm !== 'number' || isNaN(distanceKm) ||
      typeof kmPerLiter !== 'number' || isNaN(kmPerLiter) ||
      typeof pricePerLiter !== 'number' || isNaN(pricePerLiter) ||
      typeof tripsPerMonth !== 'number' || isNaN(tripsPerMonth)) {
    return { ok: false };
  }

  if (distanceKm <= 0 || kmPerLiter <= 0 || pricePerLiter < 0 || tripsPerMonth < 0) {
    return { ok: false };
  }

  var km = roundTrip ? distanceKm * 2 : distanceKm;
  var liters = km / kmPerLiter;
  var cost = Math.round(liters * pricePerLiter);
  var monthCost = Math.round(liters * pricePerLiter * tripsPerMonth);

  return {
    ok: true,
    liters: liters,
    cost: cost,
    monthCost: monthCost
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcFuel: calcFuel
  };
}
