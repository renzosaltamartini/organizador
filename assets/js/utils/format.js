const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const HEX = /^#[0-9a-f]{6}$/i;
const colDe = c => COL[c] || (HEX.test(c || '') ? c : COL.indigo);
const COL = {indigo:'#d9622b',cyan:'#3f8fa6',emerald:'#8a9a3f',amber:'#e0a43a',rose:'#d0626f'};
const iso = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const hm = s => { const [h, m] = (s || '0:0').split(':'); return +h * 60 + +m; };
const money = n => '$' + Number(n || 0).toLocaleString();
const fechaTexto = f => { const p = (f || '').split('-'); return p.length === 3 ? `${+p[2]} de ${MESES[+p[1]-1]}` : f; };
const dias = f => Math.round((new Date(f + 'T00:00') - new Date(iso() + 'T00:00')) / 864e5);
const cuando = f => { const d = dias(f); return d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : d > 1 ? `En ${d} días` : 'Ya pasó'; };
const editBtn = (id, attr = 'editp') => `<button class="x eb" data-${attr}="${esc(id)}" aria-label="Editar"><svg class="ic"><use href="#i-edit"/></svg></button>`;
const detLines = t => String(t ?? '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
const detHtml = t => { const l = detLines(t); return l.length > 1 ? `<ul class="bl">${l.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : esc(l[0] || ''); };

export { $, esc, MESES, HEX, colDe, COL, iso, hm, money, fechaTexto, dias, cuando, editBtn, detLines, detHtml };
