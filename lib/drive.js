const FOLDER = 'application/vnd.google-apps.folder';
const SCOPE = 'https://www.googleapis.com/auth/drive.metadata.readonly';

export async function listDriveFiles(token, query, fetcher = fetch) {
  const files = [];
  let pageToken = '';
  do {
    const params = new URLSearchParams({ q: query, pageSize: '100',
      fields: 'nextPageToken,files(id,name,mimeType)', orderBy: 'folder,name', pageToken });
    const response = await fetcher(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store'
    });
    if (!response.ok) {
      const error = new Error(response.status === 401 ? 'El permiso venció. Volvé a conectar Google Drive.' :
        response.status === 403 ? 'Google no permitió consultar Drive. Revisá el permiso y que Drive API esté habilitada.' :
        'No se pudo cargar Drive. Revisá tu conexión e intentá actualizar.');
      error.status = response.status;
      throw error;
    }
    const page = await response.json();
    files.push(...(page.files || []));
    pageToken = page.nextPageToken || '';
  } while (pageToken);
  return files;
}

export function setupDrive({ auth, GoogleAuthProvider, reauthenticateWithPopup, onAuthStateChanged }) {
  const el = id => document.getElementById(`drive-${id}`);
  let token = '', path = [], busy = false, epoch = 0, items = [];
  const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });
  const status = text => { el('status').textContent = text; };
  function buttons() {
    el('connect').disabled = busy;
    el('connect').textContent = token ? 'Renovar conexión' : 'Conectar Google Drive';
    el('refresh').hidden = !token;
    el('refresh').disabled = busy;
    el('back').hidden = !path.length;
    el('back').disabled = busy;
    el('search').disabled = busy || !token; el('sort').disabled = busy || !token;
    el('files').setAttribute('aria-busy', String(busy)); breadcrumbs();
  }
  function navigate(depth) {
    if (busy) return;
    path = path.slice(0, depth); el('search').value = ''; load();
  }
  function breadcrumbs() {
    const nav = el('breadcrumbs'); nav.replaceChildren();
    [{ name: 'Mis pizarras' }, ...path].forEach((folder, index, all) => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = folder.name;
      button.disabled = busy || index === all.length - 1;
      if (index === all.length - 1) button.setAttribute('aria-current', 'page');
      button.onclick = () => navigate(index); nav.append(button);
    });
  }
  function renderFiles() {
    const container = el('files'); container.replaceChildren();
    const term = el('search').value.trim().toLocaleLowerCase('es');
    const visible = items.filter(file => file.name.toLocaleLowerCase('es').includes(term));
    const folders = visible.filter(file => file.mimeType === FOLDER);
    const pdfs = visible.filter(file => file.mimeType !== FOLDER);
    el('count').textContent = `${folders.length} carpetas · ${pdfs.length} PDF${term ? ' encontrados' : ''}`;
    for (const [title, files, isFolder] of [['Carpetas', folders, true], ['Pizarras en PDF', pdfs, false]]) {
      if (!files.length) continue;
      files.sort((a, b) => collator.compare(a.name, b.name) * (el('sort').value === 'desc' ? -1 : 1));
      const section = document.createElement('section'); section.className = 'drive-group';
      const heading = document.createElement('h3'); heading.textContent = `${title} (${files.length})`;
      const grid = document.createElement('div'); grid.className = 'drive-grid';
      for (const file of files) {
        const action = document.createElement(isFolder ? 'button' : 'a');
        action.className = `drive-file ${isFolder ? 'drive-folder-card' : 'drive-pdf-card'}`;
        const icon = document.createElement('span'); icon.className = 'drive-file-icon'; icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = isFolder
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3Z"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 3h8l4 4v14H6Z M14 3v5h4 M9 12h6 M9 16h6"/></svg>';
        const copy = document.createElement('span'); copy.className = 'drive-file-copy';
        const name = document.createElement('strong'); name.textContent = file.name; name.title = file.name;
        const detail = document.createElement('span'); detail.textContent = isFolder ? 'Abrir carpeta' : 'PDF · Abrir en Drive ↗';
        copy.append(name, detail); action.append(icon, copy);
        if (isFolder) {
          action.type = 'button';
          action.onclick = () => { if (!busy) { path.push(file); el('search').value = ''; load(); } };
        } else {
          action.target = '_blank'; action.rel = 'noopener noreferrer';
          action.href = `https://drive.google.com/file/d/${encodeURIComponent(file.id)}/view`;
        }
        grid.append(action);
      }
      section.append(heading, grid); container.append(section);
    }
    if (!visible.length) {
      const empty = document.createElement('p'); empty.className = 'drive-empty';
      empty.textContent = term ? 'No hay coincidencias. Probá con otro nombre.' : 'Todavía no hay pizarras acá. Sincronizá desde Mi Pizarra y tocá Actualizar.';
      container.append(empty);
    }
  }
  el('search').oninput = renderFiles;
  el('sort').onchange = renderFiles;
  async function load() {
    if (!token || busy) return;
    const ticket = epoch;
    busy = true; buttons(); status('Cargando pizarras…');
    items = []; el('count').textContent = ''; el('files').replaceChildren();
    const folder = path.at(-1);
    el('folder').textContent = folder?.name || 'Carpetas MiPizarra';
    try {
      const query = folder
        ? `'${folder.id.replace(/['\\]/g, '\\$&')}' in parents and trashed = false and (mimeType = '${FOLDER}' or mimeType = 'application/pdf')`
        : `name = 'MiPizarra' and mimeType = '${FOLDER}' and trashed = false`;
      const files = await listDriveFiles(token, query);
      if (ticket !== epoch) return;
      const visible = files.filter(f => !folder || f.mimeType !== FOLDER || !['_Datos editables', 'Papelera'].includes(f.name));
      items = visible; renderFiles();
      status(visible.length ? `${visible.length} elementos. Para ver cambios nuevos, sincronizá en la app y tocá Actualizar.` :
        folder ? 'Esta carpeta todavía no tiene PDF. Sincronizá desde Mi Pizarra y luego actualizá.' :
        'No encontramos la carpeta MiPizarra. Sincronizá desde la app usando esta misma cuenta y luego actualizá.');
    } catch (error) {
      if (ticket !== epoch) return;
      if (error.status === 401) token = '';
      el('count').textContent = ''; el('files').replaceChildren();
      status(error.message);
    } finally {
      if (ticket === epoch) { busy = false; buttons(); }
    }
  }
  el('connect').onclick = async () => {
    if (busy || !auth.currentUser) return;
    const user = auth.currentUser, ticket = epoch;
    busy = true; buttons(); status('Autorizá la consulta de Drive con tu cuenta de Google.');
    try {
      const provider = new GoogleAuthProvider(); provider.addScope(SCOPE);
      provider.setCustomParameters({ login_hint: user.email || '' });
      const result = await reauthenticateWithPopup(user, provider);
      if (ticket !== epoch || auth.currentUser?.uid !== user.uid) return;
      token = GoogleAuthProvider.credentialFromResult(result)?.accessToken || '';
      if (!token) throw new Error('Google no entregó acceso a Drive. Volvé a conectar.');
      path = []; busy = false; await load();
    } catch (error) {
      if (ticket !== epoch) return;
      status(error.code === 'auth/user-mismatch' ? 'Elegí la misma cuenta con la que iniciaste sesión en Organizador.' :
        error.code === 'auth/popup-blocked' ? 'Permití las ventanas emergentes y volvé a conectar Drive.' :
        error.code === 'auth/popup-closed-by-user' ? 'Se canceló la conexión. Podés volver a intentarlo.' :
        'No se pudo conectar Drive. Revisá los permisos de Google y volvé a intentarlo.');
    } finally { if (ticket === epoch) { busy = false; buttons(); } }
  };
  el('refresh').onclick = load;
  el('back').onclick = () => { if (!busy) navigate(path.length - 1); };
  let uid;
  onAuthStateChanged(auth, user => {
    if (uid === (user?.uid || null)) return;
    uid = user?.uid || null; epoch++; token = ''; path = []; busy = false;
    items = []; el('search').value = ''; el('count').textContent = '';
    el('files').replaceChildren(); el('folder').textContent = '';
    status('Conectá Drive para ver tus pizarras.'); buttons();
  });
  buttons();
}

