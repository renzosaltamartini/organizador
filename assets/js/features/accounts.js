import { esc } from '../utils/format.js';

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const initials = name => name.split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase();
const validLogo = value => typeof value === 'string' && /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value) && value.length < 150000;

export function setupAccounts({ $, R, onValue, set }) {
  let catalog = [], catalogPromise, selected = new Set(), custom = [], saved = null;
  let ready = false, subscribed = false, pendingOpen = false, saving = false, lastFocus;
  const modal = $('accounts-modal');
  const status = text => { $('accounts-status').textContent = text; };

  function loadCatalog() {
    if (!catalogPromise) catalogPromise = fetch('/assets/js/config/institutions.json')
      .then(response => { if (!response.ok) throw new Error('catalog'); return response.json(); })
      .then(data => { catalog = data.institutions; })
      .catch(error => { catalogPromise = null; throw error; });
    return catalogPromise;
  }
  const readCustom = () => Array.isArray(saved?.custom) ? saved.custom.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string').map(item => ({ ...item, kind: item.kind || 'wallet' })) : [];
  const all = () => [...new Map([...catalog, ...custom].map(item => [item.id, item])).values()];
  function logo(item) {
    const src = (typeof item.logo === 'string' && item.logo.startsWith('/assets/institutions/')) || validLogo(item.logo) ? item.logo : '';
    return `<span class="institution-logo">${src ? `<img src="${esc(src)}" alt="" loading="lazy">` : `<span aria-hidden="true">${esc(initials(item.name))}</span>`}</span>`;
  }
  function bindLogoFallback(container) {
    container.querySelectorAll('.institution-logo img').forEach(img => {
      img.addEventListener('error', () => {
        img.hidden = true;
        const span = document.createElement('span');
        span.textContent = initials(img.closest('[data-institution-name]').dataset.institutionName);
        img.parentElement.append(span);
      }, { once: true });
    });
  }
  function renderChosen() {
    const chosen = new Set(Array.isArray(saved?.selected) ? saved.selected : []);
    const items = all().filter(item => chosen.has(item.id));
    $('money-institutions').innerHTML = items.length ? items.map(item =>
      `<span class="institution-pill" data-institution-name="${esc(item.name)}">${logo(item)}<span>${esc(item.name)}</span></span>`
    ).join('') : '<p class="accounts-empty">¿Qué bancos y billeteras usás? Elegilos para personalizar tu espacio.</p>';
    $('accounts-edit').textContent = items.length ? 'Editar mis cuentas' : 'Elegir bancos y billeteras';
    bindLogoFallback($('money-institutions'));
    document.querySelectorAll('[data-selected-institutions]').forEach(container => {
      container.innerHTML = items.length ? items.slice(0, 4).map(item =>
        `<span data-institution-name="${esc(item.name)}" title="${esc(item.name)}" aria-label="${esc(item.name)}">${logo(item)}</span>`
      ).join('') + (items.length > 4 ? `<span class="institution-more">+${items.length - 4}</span>` : '') : '<button type="button" class="summary-choose" data-go="gas">Elegir mis cuentas ↗</button>';
      bindLogoFallback(container);
    });
  }
  function renderOptions() {
    const term = normalize($('accounts-search').value);
    const category = $('accounts-category').value;
    const matches = all().filter(item => (category === 'all' || (category === 'selected' ? selected.has(item.id) : item.kind === category)) &&
      normalize(`${item.name} ${item.legal || ''} ${item.aliases || ''}`).includes(term));
    matches.sort((a, b) => Number(selected.has(b.id)) - Number(selected.has(a.id)) || a.name.localeCompare(b.name, 'es'));
    const list = $('accounts-options');
    list.innerHTML = matches.length ? matches.map(item =>
      `<label class="institution-option" data-institution-name="${esc(item.name)}"><input type="checkbox" value="${esc(item.id)}" ${selected.has(item.id) ? 'checked' : ''}>${logo(item)}<span><strong>${esc(item.name)}</strong><small>${item.kind === 'bank' ? 'Banco' : item.kind === 'finance' ? 'Entidad financiera' : 'Billetera / proveedor de pago'}</small></span><svg class="ic institution-check"><use href="#i-check"/></svg></label>`
    ).join('') : '<p class="empty">No encontramos esa entidad. Podés agregarla abajo.</p>';
    $('accounts-count').textContent = `${selected.size} seleccionadas · ${matches.length} resultados`;
    bindLogoFallback(list);
  }
  async function open() {
    if (!ready) { pendingOpen = true; return; }
    lastFocus = document.activeElement;
    selected = new Set(Array.isArray(saved?.selected) ? saved.selected : []);
    custom = readCustom();
    $('accounts-search').value = '';
    $('accounts-category').value = 'all';
    modal.hidden = false;
    status('Cargando bancos y billeteras…');
    $('accounts-save').disabled = true;
    try {
      await loadCatalog();
      renderOptions(); status(''); $('accounts-save').disabled = false;
    } catch { status('No pudimos cargar el catálogo. Cerrá y volvé a abrir para intentar de nuevo.'); }
    $('accounts-search').focus();
  }
  function close() {
    if (saving) return;
    modal.hidden = true; pendingOpen = false;
    custom = readCustom();
    lastFocus?.focus();
  }
  $('accounts-edit').onclick = open;
  $('accounts-close').onclick = close;
  $('accounts-cancel').onclick = close;
  modal.addEventListener('click', event => { if (event.target === modal) close(); });
  modal.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key !== 'Tab') return;
    const controls = [...modal.querySelectorAll('button,input,select,summary,a[href]')].filter(el => !el.disabled && el.getClientRects().length);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  $('accounts-search').oninput = renderOptions;
  $('accounts-category').onchange = renderOptions;
  $('accounts-options').onchange = event => {
    const checkbox = event.target.closest('input[type="checkbox"]');
    if (!checkbox) return;
    checkbox.checked ? selected.add(checkbox.value) : selected.delete(checkbox.value);
    $('accounts-count').textContent = `${selected.size} seleccionadas`;
  };
  $('accounts-add').onclick = async () => {
    const name = $('accounts-custom-name').value.trim();
    if (!name) { status('Escribí el nombre de la entidad.'); $('accounts-custom-name').focus(); return; }
    const duplicate = all().find(item => normalize(item.name) === normalize(name));
    const file = $('accounts-custom-logo').files[0];
    let image = '';
    if (file) {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 100000) { status('Elegí un logo PNG, JPG o WebP de hasta 100 KB.'); return; }
      image = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file);
      }).catch(() => '');
      if (!validLogo(image)) { status('No se pudo leer el logo. Probá con otra imagen.'); return; }
    }
    const item = duplicate || { id: 'custom-' + crypto.randomUUID(), name: name.slice(0, 80), kind: 'wallet', logo: image };
    if (!duplicate || image) {
      custom = custom.filter(entry => entry.id !== item.id);
      custom.push({ ...item, logo: image || item.logo || '' });
    }
    selected.add(item.id);
    $('accounts-custom-name').value = ''; $('accounts-custom-logo').value = '';
    $('accounts-search').value = ''; $('accounts-category').value = 'selected'; renderOptions(); status('Entidad agregada. Guardá tu selección para conservarla.');
  };
  $('accounts-form').onsubmit = async event => {
    event.preventDefault();
    if (saving) return;
    saving = true; $('accounts-save').disabled = true; $('accounts-cancel').disabled = true;
    const payload = { configured: true, selected: [...selected], custom: custom.filter(item => selected.has(item.id)).map(({ id, name, kind, logo }) => ({ id, name, kind, logo: logo || '' })) };
    status('Guardando tu selección…');
    try {
      await set(R('moneyPreferences'), payload);
      saved = payload; renderChosen(); saving = false; close();
    } catch { status('No se pudo guardar. Tu selección sigue acá; volvé a intentar.'); }
    finally { saving = false; $('accounts-save').disabled = false; $('accounts-cancel').disabled = false; }
  };
  return {
    connect() {
      if (subscribed) return;
      subscribed = true;
      onValue(R('moneyPreferences'), snapshot => {
        saved = snapshot.val(); ready = true;
        if (modal.hidden) custom = readCustom();
        loadCatalog().then(renderChosen).catch(() => { $('money-institutions').textContent = 'Abrí la selección para cargar tus entidades.'; });
        if (pendingOpen || (!saved?.configured && !$('v-gas').hidden)) { pendingOpen = false; open(); }
      }, () => { ready = false; $('money-institutions').textContent = 'No se pudieron cargar tus cuentas. Revisá tu conexión.'; });
    },
    onOpen() { if (ready && !saved?.configured) open(); }
  };
}
