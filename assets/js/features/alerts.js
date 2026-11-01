const DIA_C = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIA_P = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
const hhmm = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const alDias = a => [...new Set(Object.values(a.dias || {}).map(Number))].filter(n => n >= 0 && n <= 6).sort((x, y) => ((x + 6) % 7) - ((y + 6) % 7));
const alFecha = (f, h) => new Date(`${f}T${h}:00`);
function alProx(a, desde = new Date()) {   // próxima vez que va a sonar (null = ya pasó)
  if (!a || !a.hora) return null;
  if (a.tipo !== 'semanal') { if (!a.fecha) return null; const d = alFecha(a.fecha, a.hora); return d > desde ? d : null; }
  const ds = alDias(a); if (!ds.length) return null;
  const [H, M] = a.hora.split(':').map(Number);
  for (let i = 0; i < 8; i++) {
    const d = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate() + i, H, M, 0, 0);
    if (ds.includes(d.getDay()) && d > desde) return d;
  }
  return null;
}
function alRel(d) {
  const now = new Date(), min = Math.round((d - now) / 60000), h = hhmm(d);
  if (min < 1) return 'ahora';
  if (min < 60) return `en ${min} min`;
  const dia = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dd = Math.round((dia(d) - dia(now)) / 864e5);
  if (dd === 0) return `hoy ${h}`;
  if (dd === 1) return `mañana ${h}`;
  if (dd < 7) return `${DIA_C[d.getDay()].toLowerCase()} ${h}`;
  return `${d.getDate()}/${d.getMonth() + 1} ${h}`;
}
function alCuando(a) {
  if (a.tipo !== 'semanal') {
    const d = alFecha(a.fecha, a.hora);
    return `${d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '')} · ${a.hora}`;
  }
  const ds = alDias(a); let t;
  if (ds.length === 7) t = 'Todos los días';
  else if (ds.join() === '1,2,3,4,5') t = 'Lunes a viernes';
  else if (ds.join() === '6,0') t = 'Fines de semana';
  else if (ds.length === 1) t = `Todos los ${DIA_P[ds[0]]}`;
  else t = ds.map(n => DIA_C[n]).join(', ').replace(/, ([^,]*)$/, ' y $1');
  return `${t} · ${a.hora}`;
}
function alEstado(a) {
  if (a.activa === false) return { t: 'Pausada', c: 'off', r: 8e15 };
  const p = alProx(a);
  return p ? { t: 'Próxima: ' + alRel(p), c: '', r: p.getTime(), p } : { t: 'Ya sonó', c: 'past', r: 9e15 };
}

export { DIA_C, DIA_P, hhmm, alDias, alFecha, alProx, alRel, alCuando, alEstado };
