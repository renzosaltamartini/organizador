export function setupNotifications({ app, R, $, set, update, remove }) {
/* ---------- Notificaciones push (Firebase Cloud Messaging) ---------- */
/* Pegá acá la clave VAPID: Firebase > Configuración del proyecto > Cloud Messaging > Certificados push web > Generar par de claves */
const VAPID_KEY = 'BLiFktaH58Pp5nV2quu9g1xFYo2_rVXD424ookhN0Hsyln1S53KTH5Ep61V016kJ191WULUsRG5RDoZRBmqeQo0';
const MSG_URL = 'https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js';
const msgMod = import(MSG_URL).catch(() => null);   // se precarga; si falla, la app sigue funcionando igual
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
const noVapid = () => VAPID_KEY.startsWith('PEGA_');
let pushEnvV = null, pushKey = null, msgInst = null, msgListening = false;
const tokKey = t => t.replace(/[.$#\[\]\/]/g, '_');

async function pushEnv() {
  if (isIOS && !isStandalone()) return 'ios-install';
  if (!('serviceWorker' in navigator) || !('Notification' in window) || !('PushManager' in window)) return 'unsupported';
  const m = await msgMod; if (!m) return 'unsupported';
  try { return (await m.isSupported()) ? 'ok' : 'unsupported'; } catch (_) { return 'unsupported'; }
}
function updateBell() {
  const b = $('btn-notif'); if (!b) return;
  const on = !!pushKey && 'Notification' in window && Notification.permission === 'granted';
  b.classList.toggle('on', on);
  const av = $('al-aviso'); if (av) av.hidden = on;
  b.title = on ? 'Notificaciones activadas (tocá para desactivar)' : 'Activar notificaciones';
  b.setAttribute('aria-label', b.title);
}
pushEnv().then(v => { pushEnvV = v; updateBell(); });

async function setupPush() {
  const m = await msgMod; if (!m) throw new Error('Firebase Messaging no se pudo cargar');
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  msgInst = msgInst || m.getMessaging(app);
  const token = await m.getToken(msgInst, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
  if (!token) throw new Error('No se obtuvo el token del dispositivo');
  pushKey = tokKey(token);
  await set(R('pushTokens/' + pushKey), { token, plataforma: isIOS ? 'iOS' : 'otro', standalone: isStandalone(), ua: navigator.userAgent.slice(0, 140), visto: Date.now() });
  try { await update(R('pushSettings'), { tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Buenos_Aires' }); } catch (_) {}   // el servidor necesita tu zona horaria
  if (!msgListening) {   // app abierta: el push llega acá en vez de al Service Worker
    msgListening = true;
    m.onMessage(msgInst, p => {
      const d = p.data || {};
      reg.showNotification(d.title || 'Organizador', { body: d.body || '', tag: d.tag || undefined, data: { url: d.url || '/#/panel/agenda' } });
    });
  }
  updateBell();
  return reg;
}
async function enablePush() {
  /* OJO: requestPermission debe ser lo PRIMERO que se espera dentro del toque (regla de iOS) */
  const env = pushEnvV || (isIOS && !isStandalone() ? 'ios-install' : ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window ? 'ok' : 'unsupported'));
  if (env === 'ios-install') { alert('Para recibir notificaciones en iPhone:\n\n1) En Safari tocá Compartir > "Agregar a pantalla de inicio".\n2) Abrí la app desde ese ícono (no desde Safari).\n3) Tocá la campana de nuevo.'); return; }
  if (env === 'unsupported') { alert('Este navegador o dispositivo no soporta notificaciones push.'); return; }
  if (noVapid()) { alert('Falta configurar la clave VAPID en el código (constante VAPID_KEY).'); return; }
  if (Notification.permission === 'denied') { alert('Las notificaciones están bloqueadas. Activalas en Ajustes > Notificaciones > (esta app) y volvé a intentar.'); return; }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { updateBell(); return; }
  try {
    const reg = await setupPush();
    reg.showNotification('Notificaciones activadas ✅', { body: 'Te vamos a avisar aunque el celular esté bloqueado.', tag: 'bienvenida' });
  } catch (err) {
    console.error(err);
    alert('No se pudieron activar las notificaciones.\n' + (err && err.message ? err.message : ''));
  }
}
async function disablePush() {
  if (!confirm('¿Desactivar las notificaciones en este dispositivo?')) return;
  try { const m = await msgMod; if (m && msgInst) await m.deleteToken(msgInst); } catch (_) {}
  try { await remove(R('pushTokens/' + pushKey)); } catch (_) {}
  pushKey = null; updateBell();
}
async function syncPush() {   // al iniciar sesión: si ya diste permiso, renueva/guarda el token de este dispositivo
  try {
    pushEnvV = await pushEnv();
    if (pushEnvV === 'ok' && Notification.permission === 'granted' && !noVapid()) await setupPush();
  } catch (e) { console.warn('push:', e); }
  updateBell();
}
$('btn-notif').onclick = () => (pushKey ? disablePush() : enablePush());


async function clearDeviceToken() {
  if (pushKey) { try { await remove(R('pushTokens/' + pushKey)); } catch (_) {} }
}
return { syncPush, clearDeviceToken };
}
