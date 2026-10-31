/* Service Worker · Organizador Personal
   Recibe los push de Firebase Cloud Messaging y los muestra aunque la app esté cerrada o el celular bloqueado. */
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAXGKWZA8kWaN2NWCK2A9jTlGSq-B2bqWA",
  authDomain: "laranchada-6abd3.firebaseapp.com",
  databaseURL: "https://laranchada-6abd3-default-rtdb.firebaseio.com",
  projectId: "laranchada-6abd3",
  storageBucket: "laranchada-6abd3.firebasestorage.app",
  messagingSenderId: "326750839699",
  appId: "1:326750839699:web:3b122315eb61296d99fe66"
});
const messaging = firebase.messaging();

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

/* El servidor envía mensajes SOLO de datos: { title, body, url, tag }. Acá armamos la notificación.
   (iOS exige mostrar siempre una notificación visible por cada push.) */
messaging.onBackgroundMessage(payload => {
  const d = payload.data || {};
  return self.registration.showNotification(d.title || 'Organizador', {
    body: d.body || '',
    tag: d.tag || undefined,
    data: { url: d.url || '/#/panel/agenda' }
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/#/panel/agenda';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if ('focus' in c) {
        await c.focus();
        try { if ('navigate' in c) await c.navigate(url); } catch (_) {}
        return;
      }
    }
    return self.clients.openWindow(url);
  })());
});
