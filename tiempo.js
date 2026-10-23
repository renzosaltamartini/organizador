/* Utilidades de zona horaria (sin dependencias).
   La agenda guarda fecha "YYYY-MM-DD" y hora "HH:MM" en HORA LOCAL del usuario;
   el servidor corre en UTC, así que hay que convertir con la zona horaria del usuario. */
const pad = n => String(n).padStart(2, '0');

function partes(ms, tz) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const o = {};
  for (const p of f.formatToParts(new Date(ms))) o[p.type] = p.value;
  return { y: +o.year, m: +o.month, d: +o.day, H: +o.hour, M: +o.minute, S: +o.second };
}

function fechaLocal(ms, tz) {
  const p = partes(ms, tz);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

function offsetMs(ms, tz) {
  const p = partes(ms, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.H, p.M, p.S) - Math.floor(ms / 1000) * 1000;
}

/* "2026-10-24" + "14:30" en la zona tz  ->  milisegundos UTC reales */
function zonedToUtcMs(fecha, hhmm, tz) {
  const [y, m, d] = fecha.split('-').map(Number);
  const [H, M] = String(hhmm || '0:0').split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, H || 0, M || 0);
  let t = guess - offsetMs(guess, tz);
  t = guess - offsetMs(t, tz);   // segunda pasada por cambios de horario (DST)
  return t;
}

module.exports = { partes, fechaLocal, zonedToUtcMs };
