function convertLength(value, unit) {
  value = Number(value);
  if (isNaN(value) || value < 0) {
    return { ok: false };
  }

  var m;
  if (unit === 'mm') {
    m = value * 0.001;
  } else if (unit === 'cm') {
    m = value * 0.01;
  } else if (unit === 'm') {
    m = value;
  } else if (unit === 'km') {
    m = value * 1000;
  } else if (unit === 'inch') {
    m = value * 0.0254;
  } else if (unit === 'ft') {
    m = value * 0.3048;
  } else if (unit === 'yd') {
    m = value * 0.9144;
  } else if (unit === 'mile') {
    m = value * 1609.344;
  } else if (unit === 'ja') {
    m = value * (10 / 33);
  } else {
    return { ok: false };
  }

  var mm = m / 0.001;
  var cm = m / 0.01;
  var km = m / 1000;
  var inch = m / 0.0254;
  var ft = m / 0.3048;
  var yd = m / 0.9144;
  var mile = m / 1609.344;
  var ja = m / (10 / 33);

  return {
    ok: true,
    mm: mm,
    cm: cm,
    m: m,
    km: km,
    inch: inch,
    ft: ft,
    yd: yd,
    mile: mile,
    ja: ja
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    convertLength: convertLength
  };
}
