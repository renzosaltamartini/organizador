self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : { title: 'Organizador Personal', body: '¡Es hora de revisar tus pendientes!' };

  const options = {
    body: data.body,
    icon: 'https://lh3.googleusercontent.com/a/ACg8ocLYSjY5aO_gPGWIOhpKUVtSWB0PoQD1M5ix3HmoGjbXozB2Ob0=s288-c-no'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
