// 좌표나라 부동산 계산기 앱(설치형 웹앱)의 오프라인 도우미.
// 인터넷이 되면 늘 새 파일을 받고(새로 올린 고침이 바로 보이게), 안 되면 저장해 둔 파일로 연다.
// 설치될 때 common.js의 TOOLS에서 '부동산' 도구를 읽어 그 쪽들을 미리 저장한다(도구를 더해도 이 파일은 안 고쳐도 된다).
var CACHE = 'zw-re-v1';
var BASE = ['./', './index.html', './_common/common.css', './_common/common.js', './_common/re-calc.js', './_common/icon-192.png', './_common/icon-512.png', './manifest.json'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(BASE).then(function () { return fetch('./_common/common.js'); }).then(function (r) { return r.text(); }).then(function (js) {
      var re = /\['([a-z0-9-]+)',[^\]]*?'부동산', true/g, m, urls = [];
      while ((m = re.exec(js))) urls.push('./' + m[1] + '/', './' + m[1] + '/index.html', './' + m[1] + '/calc.js');
      return Promise.all(urls.map(function (u) { return c.add(u).catch(function () {}); }));   // calc.js가 없는 쪽은 그냥 넘어간다
    });
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // 방문 통계 같은 바깥 요청은 건드리지 않는다
  e.respondWith(fetch(e.request).then(function (r) {
    if (r.ok) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
    return r;
  }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); }));
});
