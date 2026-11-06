const CACHE_NAME = '2048-reimagined-v4';
const PRECACHE_ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'icons/icon.svg',
  'icons/maskable.svg',
  'css/base/variables.css',
  'css/base/layout.css',
  'css/base/landscape.css',
  'css/components/nav.css',
  'css/components/board.css',
  'css/components/music.css',
  'css/modals/modal-base.css',
  'css/modals/modal-settings.css',
  'css/modals/modal-leaderboard.css',
  'css/modals/modal-music.css',
  'css/modals/modal-info.css',
  'css/themes/themes.css',
  'js/core/storage.js',
  'js/core/prng.js',
  'js/core/tile.js',
  'js/core/grid.js',
  'js/core/game.js',
  'js/core/input.js',
  'js/audio/sfx.js',
  'js/audio/music-data.js',
  'js/audio/visualizerdata.js',
  'js/audio/visualizer.js',
  'js/audio/music.js',
  'js/features/particles.js',
  'js/features/timer.js',
  'js/features/leaderboard.js',
  'js/features/info-data.js',
  'js/ui/infoui.js',
  'js/ui/theme-ui.js',
  'js/ui/settings-ui.js',
  'js/ui/leaderboard-ui.js',
  'js/ui/music-ui.js',
  'js/ui/ui.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_VERSION' && event.ports && event.ports[0]) {
    event.ports[0].postMessage({ version: CACHE_NAME });
  } else if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Network-First strategy: Ensures GitHub Pages delivers latest code immediately, falling back to cache when offline
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  // Bypass service worker cache for audio range requests to maintain native streaming
  if (requestUrl.pathname.includes('/music/') || event.request.headers.has('range')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('index.html');
          }
        });
      })
  );
});