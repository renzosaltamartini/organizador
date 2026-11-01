import { setupNotifications } from "./features/notifications.js";
import { generarPDF } from "./features/pdf.js";
import { DIA_C, DIA_P, hhmm, alDias, alFecha, alProx, alRel, alCuando, alEstado } from "./features/alerts.js";
import { $, esc, MESES, HEX, colDe, COL, iso, hm, money, fechaTexto, dias, cuando, editBtn, detLines, detHtml } from "./utils/format.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, set, get, update, onValue, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, signInWithPopup, signInWithRedirect, reauthenticateWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { firebaseConfig } from "./config/firebase.js";
import { setupDrive } from "../../lib/drive.js";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app), db = getDatabase(app), provider = new GoogleAuthProvider();
setupDrive({ auth, GoogleAuthProvider, reauthenticateWithPopup, onAuthStateChanged });
let base = '', uName = '';
const R = p => ref(db, base + p);

function setCustom(hex) { const r = $('cat-custom'), cu = r.parentNode; r.value = hex; $('cat-color').value = hex; cu.style.setProperty('--c', hex); cu.classList.add('set'); }
$('cat-color').addEventListener('input', e => { setCustom(e.target.value); $('cat-custom').checked = true; });
function setCat(v) {
  const f = $('form-schedule-item'); v = String(v || 'indigo').toLowerCase();
  const r = [...f.querySelectorAll('input[name="cat"]')].find(x => x.id !== 'cat-custom' && x.value.toLowerCase() === v);
  if (r) { r.checked = true; return; }
  if (HEX.test(v)) { setCustom(v); $('cat-custom').checked = true; } else f.querySelector('input[name="cat"][value="indigo"]').checked = true;
}
/* Ajusta el tamaño de la fuente para que montos muy altos nunca se salgan de su caja */
function fit(el, max = 18, min = 10) {
  if (!el.offsetParent) return;
  el.style.whiteSpace = 'nowrap'; let sz = max; el.style.fontSize = sz + 'px';
  while (el.scrollWidth > el.clientWidth && sz > min) { sz--; el.style.fontSize = sz + 'px'; }
  el.style.whiteSpace = 'nowrap';   // si aun así no entra, queda en una línea y se desliza
}
function setStat(id, txt) {
  const el = $(id);
  if (el.textContent !== txt) { el.textContent = txt; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  fit(el);
}
function renderGas() {
  const r = ingreso - gasT;
  setStat('g-ing', money(ingreso));
  setStat('section-total-gastos', money(gasT));
  setStat('g-resta', (r < 0 ? '-' : '') + money(Math.abs(r)));
  $('g-resta').style.color = r < 0 ? 'var(--bad)' : 'var(--ok)';
}
window.addEventListener('resize', () => { if (!$('v-gas').hidden) renderGas(); });
const delBtn = path => `<button class="x" data-del="${esc(path)}" aria-label="Eliminar"><svg class="ic"><use href="#i-trash"/></svg></button>`;

let sel = iso(), selEv = null, agenda = {}, parciales = [], recN = 0, gasT = 0, notas = [], curId = null, dirty = false, tmr = null, rng = null, needScroll = true, lastRender = 0, calDate = new Date(), ingreso = 0, editP = null, editR = null, editG = null, lastDet = null, started = false;
let drag = null, editA = null, suppressClick = false, alData = {}, editAl = null;
function resetG() {
  editG = null;
  const form = $('form-gasto'); if (!form) return;
  form.reset();
  $('gasto-submit').querySelector('span').textContent = 'Agregar';
  $('gasto-cancel').hidden = true;
  $('gasto-submit').disabled = false;
}

/* ---------- Rutas por Hash (evita errores 404 al recargar) ---------- */
const VIEWS = ['home', 'dia', 'cal', 'rec', 'ale', 'gas', 'not', 'piz'];
const NOMBRES = { dia: 'Tu día', cal: 'Calendario', rec: 'Recordatorios', ale: 'Alertas', gas: 'Gastos', not: 'Notas', piz: 'Mis pizarras' };
let curUser = null;

function getHashView() {
  const h = location.hash.replace('#/', '').replace('#', '');
  if (!h || h === 'panel') return 'home';
  if (h === 'panel/agenda') return 'dia';
  if (h === 'panel/calendario') return 'cal';
  if (h === 'panel/recordatorios') return 'rec';
  if (h === 'panel/alertas') return 'ale';
  if (h === 'panel/gastos') return 'gas';
  if (h === 'panel/pizarras') return 'piz';
  if (h === 'panel/notas') return 'not';
  return VIEWS.includes(h) ? h : 'home';
}

function go(view) {
  const RUTA = { dia: 'agenda', cal: 'calendario', rec: 'recordatorios', ale: 'alertas', gas: 'gastos', not: 'notas', piz: 'pizarras' };
  const target = view === 'home' ? '#/panel' : `#/panel/${RUTA[view] || 'notas'}`;
  if (location.hash !== target) location.hash = target;
  else onRoute();
}

function onRoute() {
  if (!curUser) return;
  const v = getHashView();
  showView(v);
}

function showView(v) {
  if (!VIEWS.includes(v)) v = 'home';
  if (v !== 'not') flush();
  VIEWS.forEach(x => { $('v-' + x).hidden = x !== v; });
  document.querySelectorAll('.nv').forEach(b => { b.classList.toggle('on', b.dataset.go === v); if(b.dataset.go === v) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); });
  document.title = (NOMBRES[v] ? NOMBRES[v] + ' · ' : '') + 'Organizador Personal';
  if (v === 'dia') { needScroll = true; render(); }
  if (v === 'gas') renderGas();
  if (v === 'ale') renderAlertas();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g) go(g.dataset.go);
});
window.addEventListener('hashchange', onRoute);

/* ---------- Reloj ---------- */
function tick() {
  const n = new Date(), h = n.getHours();
  $('live-date').textContent = n.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  $('greet').textContent = `${h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'}${uName ? ', ' + uName : ''}`;
  if (Date.now() - lastRender > 30000 && !$('app-content').hidden) { render(); renderHome(); if (!$('v-ale').hidden) renderAlertas(); }
}
setInterval(tick, 1000); tick();
// Paint only the clock digits each frame; other home updates keep their own cadence.
function paintClock() {
  const now = new Date();
  $('clock-time').textContent = now.toTimeString().slice(0, 8);
  $('clock-ms').textContent = '.' + String(now.getMilliseconds()).padStart(3, '0');
  requestAnimationFrame(paintClock);
}
requestAnimationFrame(paintClock);

function renderHome() {
  const t = iso(), n = new Date(), nm = n.getHours() * 60 + n.getMinutes();
  const its = (agenda[t] || []).map(i => ({ ...i, s: hm(i.horaInicio), e: hm(i.horaFin) })).sort((a, b) => a.s - b.s);
  const live = its.find(i => i.s <= nm && i.e > nm), next = its.find(i => i.s > nm);
  $('t-dia').textContent = live ? `En curso: ${live.titulo}` : next ? `Próxima: ${next.titulo} · ${next.horaInicio}` : its.length ? 'Ya terminaste por hoy' : 'Sin actividades hoy';
  const p = parciales.find(x => x.fecha >= t);
  $('t-cal').textContent = p ? `${p.materia} · ${cuando(p.fecha).toLowerCase()}` : 'Sin fechas próximas';
  $('t-rec').textContent = `${recN} ${recN === 1 ? 'pendiente' : 'pendientes'}`;
  const pa = Object.values(alData).filter(a => a && a.activa !== false).map(a => ({ a, p: alProx(a) })).filter(x => x.p).sort((x, y) => x.p - y.p)[0];
  $('t-ale').textContent = pa ? `${pa.a.titulo} · ${alRel(pa.p)}` : 'Sin alertas activas';
  $('t-gas').textContent = ingreso ? `Te queda ${(ingreso - gasT < 0 ? '-' : '') + money(Math.abs(ingreso - gasT))}` : money(gasT);
  $('t-not').textContent = notas.length ? `${notas.length} ${notas.length === 1 ? 'nota' : 'notas'}` : 'Sin notas todavía';
}

/* ---------- Tu día ---------- */
function setDate(d) { sel = d; selEv = null; $('schedule-date-picker').value = d; needScroll = true; render(); renderCal(); }
$('schedule-date-picker').value = sel;
$('schedule-date-picker').addEventListener('change', e => e.target.value && setDate(e.target.value));
$('d-today').onclick = () => setDate(iso());
const shift = n => { const d = new Date(sel + 'T00:00'); d.setDate(d.getDate() + n); setDate(iso(d)); };
$('d-prev').onclick = () => shift(-1);
$('d-next').onclick = () => shift(1);
$('schedule-day-tabs').addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (b) setDate(b.dataset.d); });
const mh = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const HPX = 64, STEP = 5;
function resetA() {
  editA = null;
  const f = $('form-schedule-item');
  f.reset(); f.hidden = true;
  $('sch-save').textContent = 'Guardar'; $('sch-cancel').hidden = true;
}
$('btn-new').onclick = () => {
  const f = $('form-schedule-item');
  if (!f.hidden && !editA) { resetA(); return; }
  resetA();
  $('sch-fecha').value = sel;
  f.hidden = false; $('sch-titulo').focus();
};
$('sch-cancel').onclick = resetA;
function openEdit(it) {
  editA = { id: it.id, fecha: sel };
  const f = $('form-schedule-item');
  $('sch-titulo').value = it.titulo || '';
  $('sch-fecha').value = sel;
  $('sch-hora-inicio').value = it.horaInicio || '';
  $('sch-hora-fin').value = it.horaFin || '';
  $('sch-notas').value = it.notas || '';
  setCat(it.categoria);
  $('form-day').textContent = 'Editando actividad';
  $('sch-save').textContent = 'Guardar cambios'; $('sch-cancel').hidden = false;
  f.hidden = false;
  f.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  $('sch-titulo').focus();
}
function moveAct(id, newStart) {
  const it = (agenda[sel] || []).find(i => i.id === id); if (!it) return;
  const dur = Math.max(hm(it.horaFin) - hm(it.horaInicio), 0);
  const s = Math.min(Math.max(newStart, 0), 1439 - dur);
  update(R(`agenda/${sel}/${id}`), { horaInicio: mh(s), horaFin: mh(s + dur) });
}

/* ---- arrastrar para mover (mouse: directo · touch: mantener presionado) ---- */
function updateDrag() {
  const d = drag, tl = $('tl');
  const dmin = Math.round(((d.lastY - d.y0) + (tl.scrollTop - d.scr0)) * 60 / HPX / STEP) * STEP;
  d.cur = Math.min(Math.max(d.s0 + dmin, 0), 1439 - d.dur);
  d.el.style.top = (d.cur * HPX / 60 + 1) + 'px';
  d.badge.style.top = (d.cur * HPX / 60 + 1) + 'px';
  d.badge.textContent = mh(d.cur);
  const sm = d.el.querySelector('small'); if (sm) sm.textContent = `${mh(d.cur)} – ${mh(d.cur + d.dur)}`;
}
function startDrag(d) {
  d.active = true; selEv = d.id;
  d.el.classList.add('drag', 'pick');
  d.badge = document.createElement('div'); d.badge.className = 'dbadge';
  d.el.parentNode.appendChild(d.badge);
  try { d.el.setPointerCapture(d.pid); } catch (_) {}
  if (navigator.vibrate) navigator.vibrate(15);
  d.auto = setInterval(() => {
    const r = $('tl').getBoundingClientRect(), edge = 50;
    let v = 0;
    if (d.lastY < r.top + edge) v = -Math.ceil((r.top + edge - d.lastY) / 6);
    else if (d.lastY > r.bottom - edge) v = Math.ceil((d.lastY - (r.bottom - edge)) / 6);
    if (v) { $('tl').scrollTop += v; updateDrag(); }
  }, 16);
  updateDrag();
}
function endDrag(commit) {
  const d = drag; if (!d) return;
  clearTimeout(d.timer); clearInterval(d.auto); drag = null;
  if (d.active) {
    suppressClick = true; setTimeout(() => { suppressClick = false; }, 80);
    if (commit && d.cur !== d.s0) moveAct(d.id, d.cur);
  }
  render();
}
$('tl').addEventListener('pointerdown', e => {
  const el = e.target.closest('.ev'); if (!el || e.button > 0) return;
  const it = (agenda[sel] || []).find(i => i.id === el.dataset.ev); if (!it) return;
  const d = {
    id: it.id, el, pid: e.pointerId, x0: e.clientX, y0: e.clientY, lastY: e.clientY,
    s0: hm(it.horaInicio), dur: Math.max(hm(it.horaFin) - hm(it.horaInicio), 0), cur: hm(it.horaInicio),
    scr0: $('tl').scrollTop, touch: e.pointerType !== 'mouse', active: false, timer: null, auto: null, badge: null
  };
  drag = d;
  if (d.touch) d.timer = setTimeout(() => { if (drag === d) startDrag(d); }, 280);
});
document.addEventListener('pointermove', e => {
  const d = drag; if (!d || e.pointerId !== d.pid) return;
  d.lastY = e.clientY;
  if (!d.active) {
    const far = Math.abs(e.clientY - d.y0) > (d.touch ? 8 : 5) || (d.touch && Math.abs(e.clientX - d.x0) > 8);
    if (!far) return;
    if (d.touch) { clearTimeout(d.timer); drag = null; return; } // era scroll normal
    startDrag(d);
  }
  updateDrag();
});
document.addEventListener('pointerup', e => { if (drag && e.pointerId === drag.pid) endDrag(true); });
document.addEventListener('pointercancel', e => { if (drag && e.pointerId === drag.pid) endDrag(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && drag && drag.active) endDrag(false); });
document.addEventListener('touchmove', e => { if (drag && drag.active) e.preventDefault(); }, { passive: false });

$('tl').addEventListener('click', e => {
  if (suppressClick) return;
  const b = e.target.closest('[data-ev]');
  selEv = b && selEv !== b.dataset.ev ? b.dataset.ev : null;
  render();
});
$('ev-detail').addEventListener('click', e => {
  if (e.target.closest('[data-close]')) { selEv = null; render(); return; }
  const mv = e.target.closest('[data-mv]');
  if (mv && selEv) {
    const it = (agenda[sel] || []).find(i => i.id === selEv);
    if (it) moveAct(it.id, hm(it.horaInicio) + (+mv.dataset.mv));
    return;
  }
  if (e.target.closest('[data-edita]') && selEv) {
    const it = (agenda[sel] || []).find(i => i.id === selEv);
    if (it) openEdit(it);
  }
});

function render() {
  if (drag && drag.active) return;
  lastRender = Date.now();
  const today = iso(), isToday = sel === today, n = new Date(), nowM = n.getHours() * 60 + n.getMinutes();

  let tabs = '';
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const k = iso(d);
    tabs += `<button type="button" data-d="${k}" class="tab ${k === sel ? 'on' : ''} ${k === today ? 'today' : ''}"><span>${d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')}</span><b>${d.getDate()}</b></button>`;
  }
  $('schedule-day-tabs').innerHTML = tabs;

  const dl = new Date(sel + 'T00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const items = (agenda[sel] || []).map(i => {
    const s = hm(i.horaInicio);
    return { ...i, s, e: Math.max(hm(i.horaFin), s + 15) };
  }).sort((a, b) => a.s - b.s || b.e - a.e);
  $('day-label').textContent = (isToday ? 'Hoy · ' : '') + dl;
  if (!editA) $('form-day').textContent = 'Para: ' + dl;
  $('day-count').textContent = `${items.length} ${items.length === 1 ? 'actividad' : 'actividades'}`;

  let cluster = [], clusterEnd = 0;
  const flushCl = () => {
    const cols = [];
    cluster.forEach(it => {
      let c = cols.findIndex(end => end <= it.s);
      if (c < 0) { c = cols.length; cols.push(0); }
      cols[c] = it.e; it.c = c;
    });
    cluster.forEach(it => it.n = cols.length);
  };
  items.forEach(it => {
    if (cluster.length && it.s >= clusterEnd) { flushCl(); cluster = []; clusterEnd = 0; }
    cluster.push(it); clusterEnd = Math.max(clusterEnd, it.e);
  });
  if (cluster.length) flushCl();

  const s0 = 0, e0 = 24;
  const H = 64, px = m => (m - s0 * 60) * H / 60;
  let h = `<div class="tlin" style="height:${(e0 - s0) * H}px">`;
  for (let x = s0; x < e0; x++) h += `<div class="hr" style="top:${(x - s0) * H}px"><span>${String(x).padStart(2, '0')}:00</span></div>`;
  h += '<div class="evs">';
  items.forEach(i => {
    const st = isToday ? (i.e <= nowM ? 'done' : i.s <= nowM ? 'live' : '') : '';
    const ht = Math.max(px(i.e) - px(i.s) - 2, 28), w = 100 / i.n;
    h += `<div class="ev ${st} ${ht < 46 ? 'sm' : ''} ${selEv === i.id ? 'pick' : ''}" data-ev="${i.id}" style="--c:${colDe(i.categoria)};top:${px(i.s) + 1}px;height:${ht}px;left:calc(${i.c * w}% + 1px);width:calc(${w}% - 3px)">
      <b>${esc(i.titulo)}</b>${ht >= 46 ? `<small>${i.horaInicio} – ${i.horaFin}</small>` : ''}</div>`;
  });
  h += '</div>';
  if (isToday && nowM >= s0 * 60 && nowM <= e0 * 60) h += `<div class="nowline" style="top:${px(nowM)}px"><span>${n.toTimeString().slice(0, 5)}</span></div>`;

  const tl = $('tl'), keep = tl.scrollTop;
  tl.innerHTML = h + '</div>';
  tl.scrollTop = keep;
  if (needScroll && !$('v-dia').hidden) {
    needScroll = false;
    tl.scrollTop = Math.max(0, isToday ? px(nowM) - 140 : items.length ? px(items[0].s) - 20 : px(7 * 60));
  }

  const it = items.find(i => i.id === selEv), det = $('ev-detail');
  det.hidden = !it;
  if (it) det.innerHTML = `<div class="det${lastDet !== it.id ? ' enter' : ''}" style="--c:${colDe(it.categoria)}"><div><b>${esc(it.titulo)}</b><span class="sub">${it.horaInicio} – ${it.horaFin}${it.notas ? ' · ' + esc(it.notas) : ''}</span></div><button class="x mv" data-mv="-15" aria-label="Subir 15 minutos"><svg class="ic"><use href="#i-up"/></svg></button><button class="x mv" data-mv="15" aria-label="Bajar 15 minutos"><svg class="ic"><use href="#i-down"/></svg></button>${editBtn(it.id, 'edita')}${delBtn(`agenda/${sel}/${it.id}`)}<button class="x" data-close aria-label="Cerrar"><svg class="ic"><use href="#i-x"/></svg></button></div>`;
  lastDet = it ? it.id : null;
}

/* ---------- Calendario & Modales Interactivos ---------- */
function renderCal() {
  const y = calDate.getFullYear(), m = calDate.getMonth();
  $('cal-mes-anio').textContent = `${MESES[m]} ${y}`;
  const first = (new Date(y, m, 1).getDay() + 6) % 7;
  const total = new Date(y, m + 1, 0).getDate(), prev = new Date(y, m, 0).getDate(), today = iso();
  let h = '';
  for (let i = first; i > 0; i--) h += `<div class="day out"><b>${prev - i + 1}</b></div>`;
  for (let d = 1; d <= total; d++) {
    const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const ps = parciales.filter(p => p.fecha === k).map(p => `<i class="pc" title="${esc(p.materia)}">${esc(p.materia)}</i>`).join('');
    h += `<button type="button" data-calday="${k}" class="day ${k === today ? 'today' : ''} ${k === sel ? 'sel' : ''} ${agenda[k] && agenda[k].length ? 'has' : ''}"><b>${d}</b>${ps}</button>`;
  }
  $('cal-grid').innerHTML = h;
}
function swapCal() { const g = $('cal-grid'); g.classList.remove('swap'); void g.offsetWidth; g.classList.add('swap'); }

$('cal-grid').addEventListener('click', e => {
  const b = e.target.closest('[data-calday]');
  if (!b) return;
  const k = b.dataset.calday;
  const dayAgenda = agenda[k] || [];
  const dayParciales = parciales.filter(p => p.fecha === k);
  
  const modal = $('calendar-modal');
  const title = $('cm-title');
  const content = $('cm-content');
  title.textContent = `Fecha: ${fechaTexto(k)}`;
  
  if (dayAgenda.length === 0 && dayParciales.length === 0) {
    content.innerHTML = `
      <p class="sub" style="font-size:14px;margin-bottom:12px">No tienes nada agendado, deseas agregar algo?</p>
      <div style="display:flex;gap:10px">
        <button id="cm-go-agenda" class="btn" style="flex:1">Ir a la agenda</button>
        <button id="cm-go-close" class="btn ghost">Cerrar</button>
      </div>
    `;
    $('cm-go-agenda').onclick = () => { setDate(k); modal.hidden = true; go('dia'); };
    $('cm-go-close').onclick = () => modal.hidden = true;
  } else {
    let html = '<div style="display:flex;flex-direction:column;gap:8px;max-height:60vh;overflow-y:auto">';
    if (dayParciales.length) {
      html += '<b>Eventos importantes:</b>';
      dayParciales.forEach(p => { html += `<div style="background:var(--soft);padding:8px 10px;border-radius:10px;font-size:13px;display:flex;justify-content:space-between;align-items:center;gap:8px"><div style="min-width:0;overflow-wrap:anywhere">• <b>${esc(p.materia)}</b>${p.descripcion ? `<span class="pdesc">${esc(p.descripcion)}</span>` : ''}</div>${editBtn(p.id)}</div>`; });
    }
    if (dayAgenda.length) {
      html += '<b style="margin-top:6px">Actividades del día:</b>';
      dayAgenda.forEach(a => { html += `<div style="background:var(--soft);padding:8px 10px;border-radius:10px;font-size:13px"><b>${esc(a.titulo)}</b> (${a.horaInicio} - ${a.horaFin})</div>`; });
    }
    html += '</div><button id="cm-go-day" class="btn" style="width:100%;margin-top:10px">Ver día completo</button>';
    content.innerHTML = html;
    $('cm-go-day').onclick = () => { setDate(k); modal.hidden = true; go('dia'); };
  }
  modal.hidden = false;
});

$('cm-close').onclick = () => { $('calendar-modal').hidden = true; };
$('calendar-modal').onclick = e => { if (e.target === $('calendar-modal')) $('calendar-modal').hidden = true; };

$('cal-prev').onclick = () => { calDate.setDate(1); calDate.setMonth(calDate.getMonth() - 1); renderCal(); swapCal(); };
$('cal-next').onclick = () => { calDate.setDate(1); calDate.setMonth(calDate.getMonth() + 1); renderCal(); swapCal(); };

function resetP() { editP = null; $('form-parcial').reset(); $('parcial-submit').querySelector('span').textContent = 'Agregar'; $('parcial-cancel').hidden = true; }
$('parcial-cancel').onclick = resetP;
document.addEventListener('click', e => {
  const b = e.target.closest('[data-editp]'); if (!b) return;
  const p = parciales.find(x => x.id === b.dataset.editp); if (!p) return;
  editP = p.id;
  $('parcial-materia').value = p.materia || ''; $('parcial-fecha').value = p.fecha || ''; $('parcial-desc').value = p.descripcion || '';
  $('parcial-submit').querySelector('span').textContent = 'Guardar cambios'; $('parcial-cancel').hidden = false;
  $('calendar-modal').hidden = true;
  go('cal');
  setTimeout(() => { $('form-parcial').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('parcial-materia').focus({ preventScroll: true }); }, 120);
});

/* ---------- Editar recordatorios ---------- */
function resetR() { editR = null; $('form-recordatorio').reset(); $('rec-submit').querySelector('span').textContent = 'Agregar'; $('rec-cancel').hidden = true; }
$('rec-cancel').onclick = resetR;
document.addEventListener('click', e => {
  const b = e.target.closest('[data-editr]'); if (!b) return;
  const it = (window._recData || {})[b.dataset.editr]; if (!it) return;
  editR = b.dataset.editr;
  $('rec-titulo').value = it.tituloOpcional || '';
  $('rec-detalle').value = it.detalle || it.titulo || '';
  $('rec-submit').querySelector('span').textContent = 'Guardar cambios'; $('rec-cancel').hidden = false;
  $('form-recordatorio').scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => $('rec-detalle').focus({ preventScroll: true }), 250);
});

/* ---------- Alertas (notificación a una hora exacta) ---------- */
function renderAlertas() {
  const items = Object.keys(alData).filter(k => alData[k]).map(k => ({ k, a: alData[k], e: alEstado(alData[k]) })).sort((x, y) => x.e.r - y.e.r);
  $('lista-alertas').innerHTML = items.length ? items.map(({ k, a, e }) =>
    `<li class="${e.c === 'past' ? 'past' : ''}${e.c === 'off' ? ' al-off' : ''}"><div><b>${esc(a.titulo)}</b><span class="sub" style="display:block">${esc(alCuando(a))}</span>${a.nota ? `<span class="pdesc">${esc(a.nota)}</span>` : ''}<span class="tag">${esc(e.t)}</span></div><div class="acts">${e.c === 'past' ? '' : `<button type="button" class="al-sw" role="switch" aria-checked="${a.activa !== false}" data-altg="${esc(k)}" aria-label="Activar o pausar"></button>`}${editBtn(k, 'editl')}${delBtn('alertas/' + k)}</div></li>`
  ).join('') : '<p class="empty">Todavía no tenés alertas</p>';
}
const alF = $('form-alerta');
const alTipo = () => alF.querySelector('input[name="al-tipo"]:checked').value;
function alVista() { const u = alTipo() === 'unica'; $('al-bloque-fecha').hidden = !u; $('al-bloque-dias').hidden = u; $('al-fecha').required = u; }
function resetAl() {
  editAl = null; alF.reset(); $('al-fecha').value = iso(); alVista();
  $('al-submit').querySelector('span').textContent = 'Agregar alerta'; $('al-cancel').hidden = true; $('al-err').hidden = true;
}
alF.addEventListener('change', e => { if (e.target.name === 'al-tipo') alVista(); });
$('al-cancel').onclick = resetAl;
$('al-activar').onclick = () => enablePush();
alF.addEventListener('click', e => {
  const q = e.target.closest('[data-aldias]'); if (!q) return;
  const set = q.dataset.aldias.split(',');
  alF.querySelectorAll('input[name="al-dia"]').forEach(i => { i.checked = set.includes(i.value); });
});
alF.addEventListener('submit', e => {
  e.preventDefault();
  const err = m => { $('al-err').textContent = m; $('al-err').hidden = false; };
  $('al-err').hidden = true;
  const tipo = alTipo(), hora = $('al-hora').value, titulo = $('al-titulo').value.trim();
  const dias = tipo === 'semanal' ? [...alF.querySelectorAll('input[name="al-dia"]:checked')].map(i => +i.value) : [];
  const fecha = tipo === 'unica' ? $('al-fecha').value : '';
  if (!titulo || !hora) return err('Completá el título y la hora.');
  if (tipo === 'semanal' && !dias.length) return err('Elegí al menos un día de la semana.');
  if (tipo === 'unica' && !(fecha && alFecha(fecha, hora) > new Date())) return err('Esa fecha y hora ya pasaron. Elegí un momento futuro.');
  const prev = editAl ? alData[editAl] : null;
  const dat = { titulo, nota: $('al-nota').value.trim(), tipo, hora, fecha, dias, activa: prev ? prev.activa !== false : true };
  const op = prev ? update(R('alertas/' + editAl), dat) : push(R('alertas'), { ...dat, creada: Date.now() });
  op.then(resetAl).catch(() => err('No se pudo guardar la alerta. Revisá tu conexión e intentá de nuevo.'));
});
document.addEventListener('click', e => {
  const t = e.target.closest('[data-altg]');
  if (t) { const a = alData[t.dataset.altg]; if (a) update(R('alertas/' + t.dataset.altg), { activa: a.activa === false }); return; }
  const b = e.target.closest('[data-editl]'); if (!b) return;
  const a = alData[b.dataset.editl]; if (!a) return;
  editAl = b.dataset.editl;
  $('al-titulo').value = a.titulo || ''; $('al-nota').value = a.nota || ''; $('al-hora').value = a.hora || '';
  alF.querySelector(`input[name="al-tipo"][value="${a.tipo === 'semanal' ? 'semanal' : 'unica'}"]`).checked = true;
  $('al-fecha').value = a.fecha || iso();
  const ds = alDias(a); alF.querySelectorAll('input[name="al-dia"]').forEach(i => { i.checked = ds.includes(+i.value); });
  alVista(); $('al-err').hidden = true;
  $('al-submit').querySelector('span').textContent = 'Guardar cambios'; $('al-cancel').hidden = false;
  alF.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => $('al-titulo').focus({ preventScroll: true }), 250);
});
resetAl();

/* ---------- Notas (editor tipo iCloud) ---------- */
const OK = { DIV:1, P:1, BR:1, B:1, STRONG:1, I:1, EM:1, U:1, H1:1, H2:1, H3:1, UL:1, OL:1, LI:1 };
function clean(html) {
  const t = document.createElement('template'); t.innerHTML = html || '';
  (function w(n) {
    [...n.childNodes].forEach(c => {
      if (c.nodeType === 3) return;
      if (c.nodeType !== 1 || /^(SCRIPT|STYLE)$/.test(c.tagName)) { c.remove(); return; }
      [...c.attributes].forEach(a => { if (a.name !== 'class') c.removeAttribute(a.name); });
      const k = [...c.classList].filter(x => x === 'ck' || x === 'done').join(' ');
      k ? c.className = k : c.removeAttribute('class');
      w(c);
      if (!OK[c.tagName]) c.replaceWith(...c.childNodes);
    });
  })(t.content);
  return t.innerHTML;
}
const lines = html => {
  const t = document.createElement('template');
  t.innerHTML = clean(html).replace(/<\/(div|p|h[1-3]|li)>|<br\s*\/?>/gi, '\n');
  return t.content.textContent.split('\n').map(x => x.trim()).filter(Boolean);
};
const noteHtml = n => n.html != null ? n.html
  : (n.titulo ? `<h1>${esc(n.titulo)}</h1>` : '') + String(n.texto || '').split('\n').map(l => `<div>${esc(l) || '<br>'}</div>`).join('');
const fmtN = ts => { const d = new Date(ts); return iso(d) === iso() ? d.toTimeString().slice(0, 5) : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }); };
const showPane = on => { $('n-pane').hidden = !on; $('n-empty').hidden = on; };
try { document.execCommand('defaultParagraphSeparator', false, 'div'); } catch (e) {}

function renderNotas() {
  const q = $('n-search').value.trim().toLowerCase();
  const rows = notas.map(n => ({ n, l: lines(noteHtml(n)) })).filter(r => !q || r.l.join(' ').toLowerCase().includes(q));
  $('n-list').innerHTML = rows.length ? rows.map(({ n, l }) =>
    `<button class="ni ${n.id === curId ? 'on' : ''}" data-nid="${n.id}"><b>${esc(l[0] || 'Nueva nota')}</b><span>${n.ts ? fmtN(n.ts) + ' · ' : ''}${esc(l[1] || 'Sin texto adicional')}</span></button>`
  ).join('') : `<p class="empty">${q ? 'Sin resultados' : 'Todavía no hay notas'}</p>`;
}
function markDirty() {
  dirty = true; $('n-state').textContent = 'Guardando…';
  clearTimeout(tmr); tmr = setTimeout(flush, 700);
}
function flush() {
  clearTimeout(tmr);
  if (!dirty) return;
  dirty = false;
  const html = clean($('n-ed').innerHTML);
  if (!curId) {
    if (!lines(html).length) return;
    curId = push(R('notas'), { html, ts: Date.now() }).key;
    $('n-del').dataset.del = 'notas/' + curId; $('n-del').hidden = false;
  } else set(R('notas/' + curId), { html, ts: Date.now() });
  $('n-state').textContent = 'Guardado ✓';
}
function openNote(id) {
  flush();
  const n = notas.find(x => x.id === id); if (!n) return;
  curId = id; $('n-ed').innerHTML = clean(noteHtml(n));
  $('n-del').dataset.del = 'notas/' + id; $('n-del').hidden = false; $('n-state').textContent = '';
  showPane(true); $('nbox').classList.add('open'); renderNotas();
}
function newNote() {
  flush(); curId = null;
  $('n-ed').innerHTML = '<h1><br></h1>';
  $('n-del').hidden = true; $('n-state').textContent = '';
  showPane(true); $('nbox').classList.add('open'); renderNotas(); $('n-ed').focus();
}
$('n-new').onclick = newNote;
$('n-search').oninput = renderNotas;
$('n-back').onclick = () => { flush(); $('nbox').classList.remove('open'); };
$('n-list').addEventListener('click', e => { const b = e.target.closest('[data-nid]'); if (b) openNote(b.dataset.nid); });

const ed = $('n-ed');
document.addEventListener('selectionchange', () => {
  const s = getSelection();
  if (s.rangeCount && ed.contains(s.anchorNode)) rng = s.getRangeAt(0).cloneRange();
});
const curEl = () => { const n = getSelection().anchorNode; return n && (n.nodeType === 1 ? n : n.parentElement); };
ed.addEventListener('input', e => {
  if (e.inputType === 'insertParagraph') { const li = curEl() && curEl().closest('li'); if (li) li.classList.remove('done'); }
  markDirty();
});
ed.addEventListener('blur', flush);
ed.addEventListener('paste', e => { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain')); });
ed.addEventListener('click', e => {
  const li = e.target;
  if (li.tagName === 'LI' && li.parentElement.classList.contains('ck') && e.offsetX < 32) { li.classList.toggle('done'); markDirty(); }
});
window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

$('n-tool').addEventListener('mousedown', e => { if (e.target.closest('.tb')) e.preventDefault(); });
$('n-tool').addEventListener('click', e => {
  const b = e.target.closest('[data-cmd]'); if (!b) return;
  ed.focus();
  if (rng) { const s = getSelection(); s.removeAllRanges(); s.addRange(rng); }
  const c = b.dataset.cmd, ex = (a, v) => document.execCommand(a, false, v);
  if (c === 'h1' || c === 'h2') ex('formatBlock', document.queryCommandValue('formatBlock').toLowerCase() === c ? 'div' : c);
  else if (c === 'p') ex('formatBlock', 'div');
  else if (c === 'b') ex('bold');
  else if (c === 'i') ex('italic');
  else if (c === 'ul') ex('insertUnorderedList');
  else if (c === 'ol') ex('insertOrderedList');
  else if (c === 'ck') {
    const ul = curEl() && curEl().closest('ul');
    if (ul && !ul.classList.contains('ck')) ul.classList.add('ck');
    else if (ul) ex('insertUnorderedList');
    else { ex('insertUnorderedList'); const u = curEl() && curEl().closest('ul'); if (u) u.classList.add('ck'); }
  }
  markDirty();
});

/* ---------- Eliminar ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-del]');
  if (b && confirm('¿Eliminar este elemento?')) {
    selEv = null;
    if (editR && b.dataset.del === 'recordatorios/' + editR) resetR();
    if (editAl && b.dataset.del === 'alertas/' + editAl) resetAl();
    if (editG && b.dataset.del === 'gastos/' + editG) resetG();
    const li = b.closest('li'); if (li) li.classList.add('leaving');
    setTimeout(() => remove(R(b.dataset.del)), li ? 200 : 0);
  }
});

/* ---------- Generación de PDF Profesional (jsPDF + autoTable) ---------- */
$('btn-share-pdf').onclick = () => generarPDF(ingreso);

/* ---------- Auth & Perfil Onboarding ---------- */
const errorLogin = $('error-login');
onAuthStateChanged(auth, user => {
  if (user) {
    checkUserOnboarding(user);
  } else {
    curUser = null;
    $('initial-loader').style.display = 'none';
    $('app-content').hidden = true;
    $('login-modal').hidden = false;
    $('onboard-modal').hidden = true;
  }
});

async function checkUserOnboarding(user) {
  curUser = user;
  const userRef = ref(db, `users/${user.uid}/profile`);
  const snap = await get(userRef);
  
  if (!snap.exists()) {
    $('initial-loader').style.display = 'none';
    $('login-modal').hidden = true;
    $('ob-nombre').value = user.displayName ? user.displayName.split(' ')[0] : '';
    $('ob-apellido').value = user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '';
    $('onboard-modal').hidden = false;
  } else {
    const data = snap.val();
    uName = data.nombre;
    const photo = data.foto || user.photoURL || '';
    desbloquear(user, uName, photo);
  }
}

$('form-onboard').addEventListener('submit', async e => {
  e.preventDefault();
  const nombre = $('ob-nombre').value.trim();
  const apellido = $('ob-apellido').value.trim();
  const edad = parseInt($('ob-edad').value, 10);
  
  if (edad < 18) {
    $('ob-error').textContent = 'Debes ser mayor de 18 años para registrarte.';
    $('ob-error').hidden = false;
    return;
  }
  
  // Foto elegida por el usuario; si no, la predeterminada de Google
  const f = $('ob-foto').files && $('ob-foto').files[0];
  const fotoUrl = f ? await processImage(f) : (curUser.photoURL || '');
  
  await set(ref(db, `users/${curUser.uid}/profile`), { nombre, apellido, edad, foto: fotoUrl });
  $('onboard-modal').hidden = true;
  desbloquear(curUser, nombre, fotoUrl);
});

/* Recorta al centro en cuadrado y redimensiona la foto de perfil */
function squareImg(src, size = 256, type = 'image/jpeg') {
  return new Promise(res => {
    if (/googleusercontent\.com/.test(src)) src = src.replace(/=s\d+-c/, '=s400-c');
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = c.height = size;
        const x = c.getContext('2d'); x.fillStyle = '#101a2c'; x.fillRect(0, 0, size, size);
        const m = Math.min(img.naturalWidth, img.naturalHeight);
        x.drawImage(img, (img.naturalWidth - m) / 2, (img.naturalHeight - m) / 2, m, m, 0, 0, size, size);
        res(c.toDataURL(type, .9));
      } catch (e) { res(null); }
    };
    img.onerror = () => res(null);
    img.src = src;
  });
}
async function processImage(file) { const raw = await fileToBase64(file); return (await squareImg(raw, 256, 'image/jpeg')) || raw; }
function initialAvatar(name) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#d9622b'; x.fillRect(0, 0, 256, 256);
  x.fillStyle = '#fff'; x.font = '700 130px Inter,system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText((name || '?').trim().charAt(0).toUpperCase(), 128, 138);
  return c.toDataURL('image/png');
}
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

$('btn-google-login').onclick = () => {
  errorLogin.hidden = true;
  signInWithPopup(auth, provider).catch(err => {
    const c = err.code;
    if (c === 'auth/popup-blocked' || c === 'auth/operation-not-supported-in-this-environment') return signInWithRedirect(auth, provider);
    if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return;
    errorLogin.textContent = 'No se pudo iniciar sesión. Inténtalo de nuevo.';
    errorLogin.hidden = false;
  });
};

const { syncPush, clearDeviceToken } = setupNotifications({ app, R, $, set, update, remove });

$('btn-logout').onclick = async () => {
  await clearDeviceToken();   // este celular deja de recibir avisos de esta cuenta
  signOut(auth).then(() => { location.hash = ''; location.reload(); });
};

/* Modificar foto desde el avatar superior en cualquier momento */
const profileModal = $('profile-modal');
$('u-photo').onclick = () => {
  $('pm-preview').src = $('u-photo').src;
  profileModal.hidden = false;
};
$('pm-close').onclick = () => { profileModal.hidden = true; };
profileModal.onclick = e => { if (e.target === profileModal) profileModal.hidden = true; };

$('pm-file').onchange = async e => {
  if (e.target.files && e.target.files[0]) {
    $('pm-preview').src = await processImage(e.target.files[0]);
  }
};
$('pm-save').onclick = async () => {
  const newPhoto = $('pm-preview').src;
  await update(ref(db, `users/${curUser.uid}/profile`), { foto: newPhoto });
  $('u-photo').src = newPhoto; $('u-photo').hidden = false;
  profileModal.hidden = true;
};

const cargados = new Set();
function hideLoader() {
  const l = $('initial-loader');
  if (!l) return;
  l.classList.add('out'); setTimeout(() => l.remove(), 400);
}
function cargado(nombre) {
  cargados.add(nombre);
  if (cargados.size === 5) hideLoader();
}

function desbloquear(user, name, photoUrl) {
  curUser = user;
  base = `users/${user.uid}/`;
  uName = name;
  $('u-name').textContent = name;
  const ph = $('u-photo');
  const foto = photoUrl || initialAvatar(name);
  ph.src = foto; ph.hidden = false;
  const l = $('initial-loader'); if (l) { l.style.display = 'flex'; l.style.opacity = '1'; }
  $('login-modal').hidden = true;
  $('app-content').hidden = false;
  
  /* Siempre arranca en Inicio (en el celular el navegador guarda el último # y reabría en Notas) */
  if (!started) { started = true; history.replaceState(null, '', location.pathname + location.search + '#/panel'); }
  else if (!location.hash) location.hash = '#/panel';
  onRoute();
  iniciar();
  syncPush();
  setTimeout(hideLoader, 10000);
}

/* ---------- Sincronización de Datos ---------- */
let suscrita = false;
function iniciar() {
  render(); renderCal(); renderHome();
  if (suscrita) return; suscrita = true;

  onValue(R('agenda'), snap => {
    const data = snap.val() || {};
    agenda = {};
    Object.keys(data).forEach(f => { agenda[f] = Object.keys(data[f]).map(id => ({ id, ...data[f][id] })); });
    render(); renderCal(); renderHome(); cargado('agenda');
  });

  $('form-schedule-item').addEventListener('submit', e => {
    e.preventDefault();
    const horaInicio = $('sch-hora-inicio').value, horaFin = $('sch-hora-fin').value;
    if (hm(horaFin) <= hm(horaInicio)) { alert('La hora de fin debe ser posterior a la de inicio.'); return; }
    const fecha = $('sch-fecha').value || sel;
    const dat = {
      titulo: $('sch-titulo').value.trim(), horaInicio, horaFin,
      categoria: e.target.elements.cat.value, notas: $('sch-notas').value.trim()
    };
    if (editA) {
      const paths = { [`${fecha}/${editA.id}`]: dat };
      if (fecha !== editA.fecha) paths[`${editA.fecha}/${editA.id}`] = null;
      update(R('agenda'), paths);
      const id = editA.id, moved = fecha !== editA.fecha;
      resetA();
      if (moved) { setDate(fecha); selEv = id; render(); }
    } else {
      push(R(`agenda/${fecha}`), dat);
      resetA();
      if (fecha !== sel) setDate(fecha);
    }
  });

  onValue(R('parciales'), snap => {
    const data = snap.val() || {};
    parciales = Object.keys(data).map(id => ({ id, ...data[id] })).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    window._parcialesData = parciales;
    $('grid-parciales').innerHTML = parciales.length ? parciales.map(p =>
      `<li class="${dias(p.fecha) < 0 ? 'past' : ''}"><div><b>${esc(p.materia)}</b><br><span class="sub">${fechaTexto(p.fecha)}</span><br>${p.descripcion ? `<span class="pdesc">${esc(p.descripcion)}</span>` : ''}<span class="tag">${cuando(p.fecha)}</span></div><div class="acts">${editBtn(p.id)}${delBtn('parciales/' + p.id)}</div></li>`
    ).join('') : '<p class="empty">No hay fechas importantes</p>';
    renderCal(); renderHome(); cargado('parciales');
  });
  $('form-parcial').addEventListener('submit', e => {
    e.preventDefault();
    const dat = { materia: $('parcial-materia').value.trim(), fecha: $('parcial-fecha').value, descripcion: $('parcial-desc').value.trim() };
    if (editP) update(R('parciales/' + editP), dat); else push(R('parciales'), dat);
    resetP();
  });

  onValue(R('recordatorios'), snap => {
    const data = snap.val() || {}, keys = Object.keys(data);
    recN = keys.length;
    window._recData = data;
    $('lista-recordatorios').innerHTML = keys.length ? keys.map(k => {
      const it = data[k], t = it.tituloOpcional || '', d = it.detalle || it.titulo || '';
      return `<li><div>${t ? `<b style="color:var(--warn);display:block">${esc(t)}</b>` : ''}${detHtml(d)}</div><div class="acts">${editBtn(k, 'editr')}${delBtn('recordatorios/' + k)}</div></li>`;
    }).join('') : '<p class="empty">Sin recordatorios</p>';
    if (editR && !data[editR]) resetR();
    renderHome(); cargado('recordatorios');
  });
  $('form-recordatorio').addEventListener('submit', e => {
    e.preventDefault();
    const dat = { tituloOpcional: $('rec-titulo').value.trim(), detalle: $('rec-detalle').value.trim() };
    if (editR && (window._recData || {})[editR]) update(R('recordatorios/' + editR), dat); else push(R('recordatorios'), dat);
    resetR();
  });

  onValue(R('alertas'), snap => {   // no cuenta para el loader (cargado)
    alData = snap.val() || {};
    if (editAl && !alData[editAl]) resetAl();
    renderAlertas(); renderHome();
  });

  onValue(R('gastos'), snap => {
    const data = snap.val() || {}, keys = Object.keys(data).reverse();
    gasT = keys.reduce((s, k) => s + parseFloat(data[k].monto || 0), 0);
    window._gastosData = data;
    if (editG && !data[editG]) resetG();
    $('lista-gastos').innerHTML = keys.length ? keys.map(k =>
      `<li><div>${esc(data[k].concepto)}</div><div class="acts" style="flex:none;max-width:70%"><span class="amount">${money(data[k].monto)}</span>${editBtn(k, 'editg')}${delBtn('gastos/' + k)}</div></li>`
    ).join('') : '<p class="empty">Sin gastos registrados</p>';
    $('lista-gastos').querySelectorAll('.amount').forEach(el => fit(el, 14, 10));
    renderGas();
    renderHome(); cargado('gastos');
  });
  const formGasto = $('form-gasto');
  $('gasto-cancel').onclick = resetG;
  $('lista-gastos').addEventListener('click', e => {
    const b = e.target.closest('[data-editg]'); if (!b) return;
    const gasto = (window._gastosData || {})[b.dataset.editg]; if (!gasto) return;
    editG = b.dataset.editg;
    $('gasto-concepto').value = gasto.concepto || '';
    $('gasto-monto').value = gasto.monto ?? '';
    $('gasto-submit').querySelector('span').textContent = 'Guardar cambios';
    $('gasto-cancel').hidden = false;
    formGasto.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => $('gasto-concepto').focus({ preventScroll: true }), 120);
  });
  formGasto.addEventListener('submit', e => {
    e.preventDefault();
    const gasto = { concepto: $('gasto-concepto').value.trim(), monto: parseFloat($('gasto-monto').value) };
    const op = editG && (window._gastosData || {})[editG]
      ? update(R('gastos/' + editG), gasto)
      : push(R('gastos'), gasto);
    $('gasto-submit').disabled = true;
    Promise.resolve(op).then(resetG).catch(() => {
      $('gasto-submit').disabled = false;
      alert('No se pudo guardar el gasto. Revisá tu conexión e intentá de nuevo.');
    });
  });

  onValue(R('ingreso'), snap => {
    ingreso = parseFloat(snap.val()) || 0;
    const i = $('ingreso-monto'); if (document.activeElement !== i) i.value = ingreso || '';
    renderGas(); renderHome();
  });
  $('form-ingreso').addEventListener('submit', e => {
    e.preventDefault();
    set(R('ingreso'), parseFloat($('ingreso-monto').value) || 0);
  });

  onValue(R('notas'), snap => {
    const data = snap.val() || {};
    notas = Object.keys(data).map(id => ({ id, ...data[id] })).sort((a, b) => (b.ts || 0) - (a.ts || 0));
    if (curId && !notas.some(n => n.id === curId)) { curId = null; showPane(false); $('nbox').classList.remove('open'); }
    renderNotas(); renderHome(); cargado('notas');
  });
}
