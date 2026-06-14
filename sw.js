/* ================================================================
 *  sw.js — Service Worker：离线缓存
 *  file:// 协议下自动跳过，HTTP 下自动激活
 * ================================================================ */

var CACHE_NAME = 'shot-task-manager-v1';

// ==================== 需要缓存的资源 ====================

var PRECACHE_URLS = [
  './',
  'index.html',
  'css/style.css',
  'js/utils.js',
  'js/store.js',
  'js/form.js',
  'js/tasks.js',
  'js/dashboard.js',
  'js/reminders.js',
  'js/export.js',
  'js/app.js',
  'manifest.json',

  // CDN 资源（离线时必须可用）
  'https://cdn.jsdelivr.net/npm/dayjs@1.11.13/dayjs.min.js',
  'https://cdn.jsdelivr.net/npm/dayjs@1.11.13/locale/zh-cn.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js'
];

// ==================== Install ====================

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] 预缓存资源中...');
      return cache.addAll(PRECACHE_URLS).catch(function(err) {
        console.warn('[SW] 部分资源预缓存失败（可能是CDN不可达）:', err);
      });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ==================== Activate ====================

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
          .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ==================== Fetch（缓存优先策略） ====================

self.addEventListener('fetch', function(event) {
  // 跳过非 GET 请求
  if (event.request.method !== 'GET') return;

  // 跳过 chrome-extension:// 等
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) {
        // 后台更新缓存
        fetch(event.request).then(function(response) {
          if (response.ok) {
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, response);
            });
          }
        }).catch(function() {});
        return cached;
      }

      // 网络请求
      return fetch(event.request).then(function(response) {
        if (response.ok) {
          var cloned = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, cloned);
          });
        }
        return response;
      }).catch(function() {
        // 离线且无缓存：返回空响应
        return new Response('离线状态，资源不可用', { status: 503 });
      });
    })
  );
});
