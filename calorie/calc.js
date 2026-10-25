function calcCalorie(sex, age, heightCm, weightKg, activity) {
  if (sex !== 'm' && sex !== 'f') {
    return { ok: false };
  }

  age = Number(age);
  heightCm = Number(heightCm);
  weightKg = Number(weightKg);
  activity = Number(activity);

  if (isNaN(age) || isNaN(heightCm) || isNaN(weightKg) || isNaN(activity)) {
    return { ok: false };
  }

  if (
    age < 10 || age > 100 ||
    heightCm < 100 || heightCm > 250 ||
    weightKg < 20 || weightKg > 300 ||
    activity < 1 || activity > 2.5
  ) {
    return { ok: false };
  }

  var rawBmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'm' ? 5 : -161);
  var bmr = Math.round(rawBmr);
  var tdee = Math.round(rawBmr * activity);
  var lose500 = tdee - 500;

  return {
    ok: true,
    bmr: bmr,
    tdee: tdee,
    lose500: lose500
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcCalorie: calcCalorie
  };
}
