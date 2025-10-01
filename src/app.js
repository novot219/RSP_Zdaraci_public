// Konfigurace MVP
const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_EXT = ['pdf', 'docx'];
const DB_NAME = 'zdaraci_rspr_mvp';
const STORE = 'articles';

let db;

initDB().then(initUI).catch(err => showMsg(err.message || String(err), true));

// IndexedDB – inicializace
function initDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('by_date', 'addedAt');
      }
    };
    req.onsuccess = () => { db = req.result; resolve(); };
    req.onerror = () => reject(req.error);
  });
}

// UI – handlery a načtení tabulky
function initUI() {
  const form = document.getElementById('uploadForm');
  form.addEventListener('submit', onSubmit);
  refreshTable();
}

async function onSubmit(e) {
  e.preventDefault();
  clearMsg();

  const title = document.getElementById('title').value.trim();
  const author = document.getElementById('author').value.trim();
  const email = document.getElementById('email').value.trim();
  const fileInput = document.getElementById('file');
  const file = fileInput.files[0];

  // Validace polí
  if (!title || !author || !email || !file) {
    return showMsg('Vyplňte prosím všechna pole a vyberte soubor.', true);
  }
  const ext = getExt(file.name);
  if (!ALLOWED_EXT.includes(ext)) {
    return showMsg('Povoleny jsou pouze soubory PDF nebo DOCX.', true);
  }
  if (file.size > MAX_SIZE_BYTES) {
    return showMsg('Soubor je příliš velký. Limit je 15 MB.', true);
  }

  // Uložení do IndexedDB
  const article = {
    title,
    author,
    email,
    filename: file.name,
    size: file.size,
    type: file.type || mimeFromExt(ext),
    status: 'Podáno',
    addedAt: Date.now(),
    blob: file
  };

  try {
    await saveToIndexedDB(article);
    showMsg('Článek byl úspěšně podán.', false);
    e.target.reset();
    refreshTable();
  } catch (err) {
    showMsg('Uložení selhalo: ' + (err.message || String(err)), true);
  }
}

function saveToIndexedDB(record) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).add(record);
  });
}

function fetchAll() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).index('by_date').openCursor(null, 'prev');
    const out = [];
    req.onsuccess = (e) => {
      const cur = e.target.result;
      if (cur) { out.push(cur.value); cur.continue(); }
      else resolve(out);
    };
    req.onerror = () => reject(req.error);
  });
}

function removeById(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(id);
  });
}

async function refreshTable() {
  const body = document.getElementById('articlesBody');
  const empty = document.getElementById('emptyState');
  body.innerHTML = '';
  const items = await fetchAll();
  if (!items.length) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  for (const item of items) {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${escapeHtml(item.title)}</td>
      <td>${escapeHtml(item.author)}</td>
      <td>${escapeHtml(item.filename)}</td>
      <td>${humanSize(item.size)}</td>
      <td><span class="badge ok">${item.status}</span></td>
      <td>${new Date(item.addedAt).toLocaleString('cs-CZ')}</td>
      <td class="actions-cell"></td>
    `;

    const actionsTd = tr.querySelector('.actions-cell');

    const dlBtn = document.createElement('button');
    dlBtn.textContent = 'Stáhnout';
    dlBtn.addEventListener('click', () => downloadBlob(item.blob, item.filename));
    actionsTd.appendChild(dlBtn);

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Smazat';
    delBtn.className = 'danger';
    delBtn.addEventListener('click', async () => {
      await removeById(item.id);
      refreshTable();
    });
    actionsTd.appendChild(delBtn);

    body.appendChild(tr);
  }
}

// Pomocné funkce
function getExt(name) {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

function mimeFromExt(ext) {
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/octet-stream';
}

function humanSize(bytes) {
  const units = ['B','KB','MB','GB'];
  let i = 0, n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${units[i]}`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'soubor';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function showMsg(text, isErr) {
  const el = document.getElementById('msg');
  el.textContent = text;
  el.style.color = isErr ? '#ef4444' : '#a7f3d0';
}
function clearMsg() { showMsg('', false); }
