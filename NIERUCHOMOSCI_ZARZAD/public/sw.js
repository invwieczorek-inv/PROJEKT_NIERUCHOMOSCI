// Self-destroying PWA Service Worker to bypass development cache conflicts
self.addEventListener('install', (e) => {
  console.log('[RentPortal] Service Worker updating to self-destroying state...');
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => {
        console.log('[RentPortal] Deleting Cache Storage:', key);
        return caches.delete(key);
      }));
    }).then(() => {
      console.log('[RentPortal] Claiming clients...');
      return self.clients.claim();
    }).then(() => {
      console.log('[RentPortal] Programmatic self-unregistration...');
      return self.registration.unregister();
    })
  );
});

self.addEventListener('fetch', (e) => {
  // Let browser fetch everything straight from network
  return;
});
