/* Endpoint que dispara el envío de avisos. Un servicio externo (cron-job.org) lo llama cada minuto.
   Protegido con CRON_SECRET para que nadie más pueda dispararlo. */
const crypto = require('crypto');
const admin = require('firebase-admin');
const { correr } = require('../lib/logica');

/* OPCIONAL: si no podés crear CRON_SECRET en Vercel, pegá acá una clave NUEVA entre las comillas.
   Usalo SOLO si tu repositorio es privado. Nunca pongas acá el .json de Firebase. */
const SECRETO_LOCAL = 'JJDF58501022DDDASOPEN62515FSNIDPASD';

function iniciar() {
  if (admin.apps.length) return;
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://laranchada-6abd3-default-rtdb.firebaseio.com'
  });
}

function igual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

module.exports = async (req, res) => {
  const secreto = process.env.CRON_SECRET || SECRETO_LOCAL;
  const recibido = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '') || (req.query && req.query.key) || '';
  if (!secreto) return res.status(401).json({ ok: false, motivo: 'No hay clave configurada: falta CRON_SECRET en Vercel (o hacer Redeploy), o SECRETO_LOCAL en el código' });
  if (!igual(recibido, secreto)) return res.status(401).json({ ok: false, motivo: 'La clave enviada no coincide con CRON_SECRET' });
  try {
    iniciar();
    const r = await correr({ admin });
    res.status(200).json({ ok: true, ...r });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
};