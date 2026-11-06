const CACHE_NAME = '2048-reimagined-v6';
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
  'css/themes/cyber/blueprintdark.css',
  'css/themes/cyber/blueprintlight.css',
  'css/themes/cyber/cyberpunkdark.css',
  'css/themes/cyber/cyberpunklight.css',
  'css/themes/cyber/frutigerdark.css',
  'css/themes/cyber/frutigerlight.css',
  'css/themes/cyber/neondark.css',
  'css/themes/cyber/neonlight.css',
  'css/themes/cyber/vectorheartdark.css',
  'css/themes/cyber/vectorheartlight.css',
  'css/themes/minimal/classicdark.css',
  'css/themes/minimal/classiclight.css',
  'css/themes/minimal/nordicdark.css',
  'css/themes/minimal/nordiclight.css',
  'css/themes/minimal/pasteldark.css',
  'css/themes/minimal/pastellight.css',
  'css/themes/minimal/pastelpinkdark.css',
  'css/themes/minimal/pastelpinklight.css',
  'css/themes/minimal/void.css',
  'css/themes/nature/autumndark.css',
  'css/themes/nature/autumnlight.css',
  'css/themes/nature/forestdark.css',
  'css/themes/nature/forestlight.css',
  'css/themes/nature/oceandark.css',
  'css/themes/nature/oceanlight.css',
  'css/themes/nature/sakuradark.css',
  'css/themes/nature/sakuralight.css',
  'css/themes/nature/ukiyoe.css',
  'css/themes/retro/dmgdark.css',
  'css/themes/retro/dmglight.css',
  'css/themes/retro/retrodark.css',
  'css/themes/retro/retrolight.css',
  'css/themes/retro/synthwavedark.css',
  'css/themes/retro/synthwavelight.css',
  'css/themes/retro/terminaldark.css',
  'css/themes/retro/terminallight.css',
  'css/themes/space/nebuladark.css',
  'css/themes/space/nebulalight.css',
  'css/themes/space/supernovadark.css',
  'css/themes/space/supernovalight.css',
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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

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