function calcBMI(heightCm, weightKg) {
  heightCm = Number(heightCm);
  weightKg = Number(weightKg);

  if (isNaN(heightCm) || isNaN(weightKg)) {
    return { ok: false };
  }

  if (heightCm < 50 || heightCm > 250 || weightKg < 10 || weightKg > 400) {
    return { ok: false };
  }

  var h = heightCm / 100;
  var rawBmi = weightKg / (h * h);
  var bmi = Math.round(rawBmi * 100) / 100;

  var category;
  if (rawBmi < 18.5) {
    category = '저체중';
  } else if (rawBmi < 23) {
    category = '정상';
  } else if (rawBmi < 25) {
    category = '과체중(비만 전 단계)';
  } else if (rawBmi < 30) {
    category = '1단계 비만';
  } else if (rawBmi < 35) {
    category = '2단계 비만';
  } else {
    category = '3단계 비만';
  }

  var minKg = Math.round(18.5 * h * h * 10) / 10;
  var maxKg = Math.round(22.9 * h * h * 10) / 10;

  return {
    ok: true,
    bmi: bmi,
    category: category,
    minKg: minKg,
    maxKg: maxKg
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    calcBMI: calcBMI
  };
}
