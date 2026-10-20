self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  
  const title = data.title || 'Organizador Personal 🚀';
  
  const options = {
    body: data.body || 'Tienes novedades en tu panel.',
    // Puedes cambiar el icono por el que prefieras o la foto de perfil
    icon: data.icon || 'https://lh3.googleusercontent.com/a/ACg8ocLYSjY5aO_gPGWIOhpKUVtSWB0PoQD1M5ix3HmoGjbXozB2Ob0=s288-c-no',
    badge: 'https://lh3.googleusercontent.com/a/ACg8ocLYSjY5aO_gPGWIOhpKUVtSWB0PoQD1M5ix3HmoGjbXozB2Ob0=s288-c-no',
    // Patrón de vibración personalizado para el celu (si el sistema lo soporta)
    vibrate: [200, 100, 200],
    // Tag para que las notificaciones se reemplacen entre sí y no saturen la pantalla
    tag: 'organizador-alerta',
    renotify: true,
    // Datos internos por si quieres que al tocar la notificación abra una sección específica
    data: { url: data.url || '/' },
    // Botones de acción interactivos dentro de la notificación
    actions: [
      { action: 'abrir', title: '📂 Abrir Panel' },
      { action: 'cerrar', title: '✖️ Ignorar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Evento para cuando el usuario toca los botones de la notificación
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'abrir' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
