// 저장 공간 계산기 (사진·영상·앱 용량 합산)
function calcStorage(photos, photoMB, minutes, videoMB, appsGB) {
  var pCount = Math.max(0, Number(photos) || 0);
  var pMB = Math.max(0, Number(photoMB) || 0);
  var mCount = Math.max(0, Number(minutes) || 0);
  var vMB = Math.max(0, Number(videoMB) || 0);
  var aGB = Math.max(0, Number(appsGB) || 0);

  var rawPhotoGB = (pCount * pMB) / 1024;
  var rawVideoGB = (mCount * vMB) / 1024;
  var rawAppsGB = aGB;
  var rawTotalGB = rawPhotoGB + rawVideoGB + rawAppsGB;

  function round1(val) {
    return Math.round(val * 10) / 10;
  }

  return {
    photoGB: round1(rawPhotoGB),
    videoGB: round1(rawVideoGB),
    appsGB: round1(rawAppsGB),
    totalGB: round1(rawTotalGB)
  };
}

if (typeof module !== 'undefined') {
  module.exports = { calcStorage: calcStorage };
}
