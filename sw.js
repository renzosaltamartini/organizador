// sw.js - Service Worker para notificaciones push en PWA (iOS y Android)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  
  const title = data.title || 'Peristente';
  
  const options = {
    body: data.body || 'Tienes una nueva alerta en tu panel.',
    icon: data.icon || 'https://lh3.googleusercontent.com/a/ACg8ocLYSjY5aO_gPGWIOhpKUVtSWB0PoQD1M5ix3HmoGjbXozB2Ob0=s288-c-no',
    badge: 'https://lh3.googleusercontent.com/a/ACg8ocLYSjY5aO_gPGWIOhpKUVtSWB0PoQD1M5ix3HmoGjbXozB2Ob0=s288-c-no',
    vibrate: [200, 100, 200],
    tag: 'organizador-alerta',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});
