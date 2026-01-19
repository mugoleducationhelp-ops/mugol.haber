const CACHE_NAME = 'mugol-haber-v1';
const urlsToCache = [
  '/',
  '/manifest.json'
];

// Install event - cache dosyalarını kaydet
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache açıldı');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event - eski cache'leri temizle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eski cache siliniyor:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network First stratejisi (haberler için)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Başarılı response'u cache'le
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network başarısız olursa cache'den getir
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Cache'de de yoksa placeholder göster
          return new Response('Çevrimdışısınız. Lütfen internet bağlantınızı kontrol edin.', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        });
      })
  );
});

// Push notification desteği
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Yeni haber var!',
    icon: 'https://via.placeholder.com/192x192?text=M',
    badge: 'https://via.placeholder.com/96x96?text=M',
    vibrate: [200, 100, 200],
    tag: 'news-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Haberi Aç'
      },
      {
        action: 'close',
        title: 'Kapat'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('MuGöl Haber', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
