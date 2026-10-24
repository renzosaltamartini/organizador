/* Lógica de avisos: recorre los usuarios y manda push
   - de la AGENDA: 10 minutos antes y cuando empieza cada actividad
   - de las ALERTAS: a la hora exacta (una sola vez o todas las semanas)
   Se ejecuta una vez por minuto. */
const { partes, fechaLocal, zonedToUtcMs } = require('./tiempo');

const TZ_DEFAULT = 'America/Argentina/Buenos_Aires';
const ANTES_DEFAULT = 10;   // minutos de aviso previo (se puede cambiar en users/<uid>/pushSettings/antes; 0 = sin aviso previo)
const GRACIA_MIN = 5;       // si el cron se atrasa, el aviso de "empieza ahora" todavía sale hasta 5 min después
const MIN = 60000;

const tzValida = tz => { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return tz; } catch (_) { return TZ_DEFAULT; } };
const soloDigitos = s => String(s || '').replace(/[^0-9]/g, '');
const diaSemana = fecha => { const [y, m, d] = fecha.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };   // 0 = domingo

/* Marca "ya avisé" de forma atómica: solo UNA ejecución puede reclamar cada aviso (evita duplicados). */
async function reclamar(db, path) {
  const r = await db.ref(path).transaction(cur => (cur ? undefined : Date.now()));
  return !!r.committed;
}

async function enviar({ admin, db, base, tokens, data, res }) {
  const r = await admin.messaging().sendEachForMulticast({
    tokens: tokens.map(t => t.token),
    data,   // SOLO datos (sin "notification"): el Service Worker arma la notificación
    webpush: { headers: { Urgency: 'high', TTL: '600' } }
  });
  r.responses.forEach((x, i) => {
    if (x.success) { res.enviados++; return; }
    const code = (x.error && x.error.code) || 'error';
    res.errores.push(code);
    if (/registration-token-not-registered|invalid-registration-token/.test(code)) {
      db.ref(`${base}/pushTokens/${tokens[i].key}`).remove().catch(() => {});   // token muerto: se limpia
    }
  });
  return r.successCount;
}

async function procesarUsuario({ admin, db, uid, now, res }) {
  const base = `users/${uid}`;
  const [tokSnap, cfgSnap, alSnap] = await Promise.all([db.ref(`${base}/pushTokens`).get(), db.ref(`${base}/pushSettings`).get(), db.ref(`${base}/alertas`).get()]);
  if (!tokSnap.exists()) return;
  const tokens = Object.entries(tokSnap.val() || {}).filter(([, v]) => v && v.token).map(([key, v]) => ({ key, token: v.token }));
  if (!tokens.length) return;
  res.usuarios++;

  const cfg = cfgSnap.val() || {};
  const tz = tzValida(cfg.tz || TZ_DEFAULT);
  const antes = cfg.antes == null || !Number.isFinite(+cfg.antes) ? ANTES_DEFAULT : Math.min(Math.max(+cfg.antes, 0), 180);

  /* limpieza diaria (~3 AM locales) de registros viejos de "ya avisé" */
  const pl = partes(now, tz);
  if (pl.H === 3 && pl.M < 5) {
    const s = await db.ref(`${base}/pushSent`).get();
    const limite = fechaLocal(now - 2 * 24 * 60 * MIN, tz);
    if (s.exists()) for (const f of Object.keys(s.val())) if (f < limite) db.ref(`${base}/pushSent/${f}`).remove().catch(() => {});
  }

  const alertas = alSnap.exists() ? Object.entries(alSnap.val() || {}) : [];

  /* ayer / hoy / mañana: "ayer" cubre avisos que cruzan la medianoche, "mañana" los de 00:05 */
  for (const fecha of [fechaLocal(now - 24 * 60 * MIN, tz), fechaLocal(now, tz), fechaLocal(now + 24 * 60 * MIN, tz)]) {
    const snap = await db.ref(`${base}/agenda/${fecha}`).get();
    const enviarIntentos = async intentos => {
      for (const it of intentos) {
        const path = `${base}/pushSent/${fecha}/${it.clave}`;
        if (!(await reclamar(db, path))) continue;
        const ok = await enviar({ admin, db, base, tokens, data: it.data, res });
        if (!ok) await db.ref(path).remove().catch(() => {});   // no llegó a ningún dispositivo: se reintenta el próximo minuto
      }
    };

    /* ---- alertas a hora exacta ---- */
    const intentosAl = [];
    for (const [id, a] of alertas) {
      if (!a || a.activa === false || !/^\d{1,2}:\d{2}$/.test(String(a.hora || ''))) continue;
      const toca = a.tipo === 'semanal'
        ? Object.values(a.dias || {}).map(Number).includes(diaSemana(fecha))
        : a.fecha === fecha;
      if (!toca) continue;
      const ini = zonedToUtcMs(fecha, a.hora, tz);
      if (now >= ini && now < ini + GRACIA_MIN * MIN) {
        intentosAl.push({ clave: `al_${id}_${soloDigitos(a.hora)}`, data: { title: `🔔 ${a.titulo || 'Alerta'}`, body: a.nota || `Alerta de las ${a.hora}`, tag: `al_${id}_${fecha}`, url: '/#/panel/alertas' } });
      }
    }
    await enviarIntentos(intentosAl);

    /* ---- agenda ---- */
    if (!snap.exists()) continue;
    for (const [id, a] of Object.entries(snap.val() || {})) {
      if (!a || !a.horaInicio) continue;
      const ini = zonedToUtcMs(fecha, a.horaInicio, tz);
      const k = `${id}_${soloDigitos(a.horaInicio)}`;   // incluye la hora: si movés la actividad, se vuelve a armar el aviso
      const rango = a.horaFin ? `${a.horaInicio} – ${a.horaFin}` : a.horaInicio;
      const nota = a.notas ? ` · ${a.notas}` : '';
      const titulo = a.titulo || 'Actividad';

      const intentos = [];
      if (antes > 0 && now >= ini - antes * MIN && now < ini) {
        const faltan = Math.max(1, Math.round((ini - now) / MIN));
        intentos.push({ clave: `${k}_pre`, data: { title: `⏰ ${titulo}`, body: `Empieza en ${faltan} ${faltan === 1 ? 'minuto' : 'minutos'} · ${rango}${nota}`, tag: `${k}_pre`, url: '/#/panel/agenda' } });
      }
      if (now >= ini && now < ini + GRACIA_MIN * MIN) {
        intentos.push({ clave: `${k}_ini`, data: { title: `🔔 ${titulo}`, body: `Empieza ahora · ${rango}${nota}`, tag: `${k}_ini`, url: '/#/panel/agenda' } });
      }
      await enviarIntentos(intentos);
    }
  }
}

async function correr({ admin, now = Date.now() }) {
  const db = admin.database();
  const res = { usuarios: 0, enviados: 0, errores: [] };
  const uids = [];
  let page;
  do {
    const r = await admin.auth().listUsers(1000, page);
    r.users.forEach(u => uids.push(u.uid));
    page = r.pageToken;
  } while (page);
  await Promise.all(uids.map(uid =>
    procesarUsuario({ admin, db, uid, now, res }).catch(e => res.errores.push(`${uid.slice(0, 6)}: ${e.message}`))
  ));
  return res;
}

module.exports = { correr };
