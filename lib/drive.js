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
  let token = '', path = [], busy = false, epoch = 0;
  const status = text => { el('status').textContent = text; };
  function buttons() {
    el('connect').disabled = busy;
    el('connect').textContent = token ? 'Renovar conexión' : 'Conectar Google Drive';
    el('refresh').hidden = !token;
    el('refresh').disabled = busy;
    el('back').hidden = !path.length;
    el('back').disabled = busy;
  }
  async function load() {
    if (!token || busy) return;
    const ticket = epoch;
    busy = true; buttons(); status('Cargando pizarras…');
    el('files').replaceChildren();
    const folder = path.at(-1);
    el('folder').textContent = folder?.name || 'Carpetas MiPizarra';
    try {
      const query = folder
        ? `'${folder.id.replace(/['\\]/g, '\\$&')}' in parents and trashed = false and (mimeType = '${FOLDER}' or mimeType = 'application/pdf')`
        : `name = 'MiPizarra' and mimeType = '${FOLDER}' and trashed = false`;
      const files = await listDriveFiles(token, query);
      if (ticket !== epoch) return;
      const visible = files.filter(f => !folder || f.mimeType !== FOLDER || !['_Datos editables', 'Papelera'].includes(f.name));
      for (const file of visible) {
        const row = document.createElement('div'); row.className = 'drive-file';
        const name = document.createElement('span'); name.textContent = file.name;
        const action = document.createElement(file.mimeType === FOLDER ? 'button' : 'a');
        action.className = 'btn';
        if (file.mimeType === FOLDER) {
          action.type = 'button'; action.textContent = 'Abrir carpeta';
          action.onclick = () => { if (!busy) { path.push(file); load(); } };
        } else {
          action.textContent = 'Ver PDF'; action.target = '_blank'; action.rel = 'noopener noreferrer';
          action.href = `https://drive.google.com/file/d/${encodeURIComponent(file.id)}/view`;
        }
        row.append(name, action); el('files').append(row);
      }
      status(visible.length ? `${visible.length} elementos. Para ver cambios nuevos, sincronizá en la app y tocá Actualizar.` :
        folder ? 'Esta carpeta todavía no tiene PDF. Sincronizá desde Mi Pizarra y luego actualizá.' :
        'No encontramos la carpeta MiPizarra. Sincronizá desde la app usando esta misma cuenta y luego actualizá.');
    } catch (error) {
      if (ticket !== epoch) return;
      if (error.status === 401) token = '';
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
  el('back').onclick = () => { if (!busy) { path.pop(); load(); } };
  let uid;
  onAuthStateChanged(auth, user => {
    if (uid === (user?.uid || null)) return;
    uid = user?.uid || null; epoch++; token = ''; path = []; busy = false;
    el('files').replaceChildren(); el('folder').textContent = '';
    status('Conectá Drive para ver tus pizarras.'); buttons();
  });
  buttons();
}
