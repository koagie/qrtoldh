// 簡易サービスワーカー（仕様書 9：基本オフライン動作）。
// 記録データは localStorage に保存されるため、アプリシェルをキャッシュできれば
// オフラインでも起動・記録できる。
const CACHE = "ocl-shell-v1";
const SHELL = ["/", "/calendar", "/chart", "/hints", "/manifest.webmanifest", "/logo-mark.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // ページ遷移：ネットワーク優先、失敗時はキャッシュ→トップにフォールバック
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/")))
    );
    return;
  }

  // 静的アセット：キャッシュ優先、なければ取得して保存
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request)
          .then((res) => {
            if (res.ok && new URL(request.url).origin === self.location.origin) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(request, copy));
            }
            return res;
          })
          .catch(() => cached)
    )
  );
});
