// Service worker: deixa o app funcionar offline quando hospedado em um site (PWA).
// Dentro do APK (Capacitor) ele não é usado, pois os arquivos já ficam embutidos no aplicativo.
//
// Estratégia:
//  - index.html, manifest e navegação: "rede primeiro" (sempre pega a versão nova quando há internet;
//    se estiver offline, usa a cópia salva). Assim, atualizações chegam sem precisar trocar a versão do cache.
//  - ícones e demais arquivos: "cache primeiro" (rápido e não mudam com frequência).
// Se mudar os ícones, troque o número em CACHE (ex.: v3) para forçar a atualização deles.
const CACHE = 'lista-compras-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function saveCopy(request, response) {
  if (response && response.ok && response.type === 'basic') {
    const copy = response.clone();
    caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
  }
  return response;
}

function networkFirst(request) {
  return fetch(request)
    .then((res) => saveCopy(request, res))
    .catch(() => caches.match(request).then((hit) => hit || caches.match('./index.html')));
}

function cacheFirst(request) {
  return caches.match(request).then((hit) => {
    if (hit) return hit;
    return fetch(request).then((res) => saveCopy(request, res));
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isShell = req.mode === 'navigate' ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/manifest.json') ||
    url.pathname.endsWith('/');

  e.respondWith(isShell ? networkFirst(req) : cacheFirst(req));
});
