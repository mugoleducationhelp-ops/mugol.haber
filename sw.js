const CACHE_NAME = 'mugol-haber-v2';
const urlsToCache = [
  './',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Open+Sans:wght@400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache dosyalarını kaydet
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// Activate event - eski cache'leri temizle
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[SW] Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - Network First stratejisi
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // API ve RSS isteklerini cache'leme
  if (url.hostname.includes('api.allorigins.win') || 
      url.hostname.includes('trthaber.com')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return new Response(
              JSON.stringify({ 
                error: 'Offline', 
                message: 'İnternet bağlantınızı kontrol edin' 
              }), 
              {
                headers: { 'Content-Type': 'application/json; charset=utf-8' }
              }
            );
          });
        })
    );
    return;
  }
  
  // Diğer istekler için Cache First stratejisi
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, response);
              });
            }
          }).catch(() => {});
          
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }
            
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
            
            return response;
          })
          .catch(() => {
            if (event.request.destination === 'image') {
              return new Response(
                '<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="300" fill="#1e40af"/><text x="50%" y="50%" text-anchor="middle" fill="white" font-size="20">Offline</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            }
            
            return new Response(
              'Çevrimdışısınız. Lütfen internet bağlantınızı kontrol edin.',
              { 
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
                status: 503,
                statusText: 'Service Unavailable'
              }
            );
          });
      })
  );
});

// Push notification desteği
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Yeni haber var!',
    icon: './icon-192.png',
    badge: './icon-192.png',
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
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

// Background sync desteği
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-news') {
    event.waitUntil(
      fetch('./').then(() => {
        console.log('[SW] News synced');
      })
    );
  }
});

// Mesaj dinleyici
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data.action === 'clearCache') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

console.log('[SW] Service Worker loaded');
