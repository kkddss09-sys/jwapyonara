// 좌표 탐험대 바로가기(설치형 웹앱)용 아주 단순한 도우미 (2026-11-17).
// 인터넷이 되면 늘 새 파일을 받아서(새로 올린 고침이 바로 보이게) 쓰고, 안 될 때만 저장해 둔 파일로 연다.
// 범위는 /goblin-raid/ 안으로만 한정되고, 구글 로그인·서버 저장·순위 같은 바깥 요청은 건드리지 않는다.
var CACHE = 'zw-game-v1';
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE && /^zw-game-/.test(k); }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(function (r) {
    if (r && r.ok) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
    return r;
  }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); }));
});
