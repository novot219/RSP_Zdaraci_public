import { initDB, addArticle, getAllArticles, deleteArticle, findArticleByEmailAndFilename } from './db.js';

const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_EXT = ['pdf', 'docx'];
const TITLE_MIN = 3, TITLE_MAX = 120;
const AUTHOR_MIN = 3, AUTHOR_MAX = 60;

init();

async function init() {
  await initDB();
  bindUploadUI();
  bindStatusUI();
  await refreshTable();
}



function bindUploadUI() {
  const form = byId('uploadForm');
  if (form) form.addEventListener('submit', onSubmitUpload);

  byId('title')?.addEventListener('input', validateTitle);
  byId('author')?.addEventListener('input', validateAuthor);
  byId('email')?.addEventListener('input', validateEmail);
  byId('file')?.addEventListener('change', validateFile);
}

async function onSubmitUpload(e) {
  e.preventDefault();
  clearMsg();

  const ok = validateTitle() & validateAuthor() & validateEmail() & validateFile();
  if (!ok) { showMsg('Zkontrolujte prosím chyby ve formuláři.', true); return; }

  const title  = byId('title').value.trim();
  const author = byId('author').value.trim();
  const email  = byId('email').value.trim();
  const fileEl = byId('file');
  const file   = fileEl.files[0];
  const ext    = getExt(file.name);

  const metaBase = {
    title,
    author,
    email,
    filename: file.name,
    size: file.size,
    type: file.type || mimeFromExt(ext),
    status: 'Podáno',
    statusHistory: [{ status: 'Podáno', at: Date.now() }],
    addedAt: Date.now()
  };

  try {
    const checksum = await sha256Hex(file);
    const record = { ...metaBase, checksum, blob: file };

    const id = await addArticle(record);
    showMsg('Článek byl uložen (ID: ' + id + ').', false);

    e.target.reset();
    await refreshTable();
  } catch (err) {
    showMsg('Uložení selhalo: ' + (err?.message || String(err)), true);
  }
}



function bindStatusUI() {
  const form = byId('statusForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = byId('statusEmail').value.trim();
    const filename = byId('statusFilename').value.trim();


    setError('status-email', email ? '' : 'E-mail je povinný.');
    setError('status-filename', filename ? '' : 'Název souboru je povinný.');
    if (!email || !filename) return;

    const rec = await findArticleByEmailAndFilename(email, filename);
    renderStatusResult(rec, { email, filename });
  });
}

function renderStatusResult(record, query) {
  const out = byId('statusResult');
  const hist = byId('statusHistory');
  out.innerHTML = '';
  hist.innerHTML = '';

  if (!record) {
    out.innerHTML = `
      <p><strong>Výsledek:</strong> Nenalezen žádný článek pro <code>${escapeHtml(query.email)}</code> se souborem <code>${escapeHtml(query.filename)}</code>.</p>
    `;
    return;
  }

  out.innerHTML = `
    <p><strong>Název:</strong> ${escapeHtml(record.title)}</p>
    <p><strong>Soubor:</strong> ${escapeHtml(record.filename)} (${humanSize(record.size)})</p>
    <p><strong>Aktuální stav:</strong> <span class="badge ok">${record.status}</span></p>
    <p><strong>Přidáno:</strong> ${new Date(record.addedAt).toLocaleString('cs-CZ')}</p>
  `;


  const timeline = document.createElement('div');
  timeline.className = 'timeline';
  const list = (record.statusHistory || []).slice().sort((a,b) => b.at - a.at);
  timeline.innerHTML = list.map(item => `
    <div class="item">
      <div><strong>${escapeHtml(item.status)}</strong></div>
      <div class="date">${new Date(item.at).toLocaleString('cs-CZ')}</div>
    </div>
  `).join('');
  hist.appendChild(timeline);
}



async function refreshTable() {
  const body = byId('articlesBody');
  const empty = byId('emptyState');
  if (!body) return;

  body.innerHTML = '';
  const rows = await getAllArticles();
  if (!rows.length) { if (empty) empty.style.display = 'block'; return; }
  if (empty) empty.style.display = 'none';

  for (const it of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(it.title)}</td>
      <td>${escapeHtml(it.author)}</td>
      <td>${escapeHtml(it.filename)}</td>
      <td>${humanSize(it.size)}</td>
      <td><span class="badge ok">${it.status}</span></td>
      <td>${new Date(it.addedAt).toLocaleString('cs-CZ')}</td>
      <td class="actions-cell"></td>
    `;
    const actions = tr.querySelector('.actions-cell');

    const dl = document.createElement('button');
    dl.textContent = 'Stáhnout';
    dl.addEventListener('click', () => downloadBlob(it.blob, it.filename));
    actions.appendChild(dl);

    const del = document.createElement('button');
    del.textContent = 'Smazat';
    del.className = 'danger';
    del.addEventListener('click', async () => {
      await deleteArticle(it.id);
      await refreshTable();
    });
    actions.appendChild(del);

    body.appendChild(tr);
  }
}



function byId(id) { return document.getElementById(id); }
function setError(suffix, msg) {
  const el = byId(`err-${suffix}`);
  if (el) el.textContent = msg || '';
}
function getExt(name) { const p = name.split('.'); return p.length > 1 ? p.pop().toLowerCase() : ''; }
function mimeFromExt(ext) {
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/octet-stream';
}
function humanSize(bytes) {
  const u = ['B','KB','MB','GB']; let i = 0, n = bytes;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${u[i]}`;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename || 'soubor';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
function showMsg(text, isErr) {
  const el = byId('msg');
  if (!el) return;
  el.textContent = text;
  el.style.color = isErr ? '#ef4444' : '#a7f3d0';
}
function clearMsg() { showMsg('', false); }


async function sha256Hex(file) {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  const view = new Uint8Array(hash);
  return [...view].map(b => b.toString(16).padStart(2, '0')).join('');
}

function validateTitle() {
  const el = byId('title'); if (!el) return true;
  const v = (el.value || '').trim();
  return setInputValidity(el,
    !v ? 'Název je povinný.' :
    v.length < 3 ? 'Minimálně 3 znaky.' :
    v.length > 120 ? 'Maximálně 120 znaků.' : ''
  );
}
function validateAuthor() {
  const el = byId('author'); if (!el) return true;
  const v = (el.value || '').trim();
  return setInputValidity(el,
    !v ? 'Autor je povinný.' :
    v.length < 3 ? 'Minimálně 3 znaky.' :
    v.length > 60 ? 'Maximálně 60 znaků.' : ''
  );
}
function validateEmail() {
  const el = byId('email'); if (!el) return true;
  const v = (el.value || '').trim();
  return setInputValidity(el,
    !v ? 'E-mail je povinný.' :
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? 'Zadejte platný e-mail.' : ''
  );
}
function validateFile() {
  const el = byId('file'); if (!el) return true;
  const f = el.files && el.files[0];
  const ext = f ? getExt(f.name) : '';
  return setInputValidity(el,
    !f ? 'Vyberte soubor.' :
    !['pdf','docx'].includes(ext) ? 'Povoleny jsou pouze PDF nebo DOCX.' :
    f.size > (15 * 1024 * 1024) ? 'Soubor je příliš velký (limit 15 MB).' : ''
  );
}
function setInputValidity(input, msg) {
  const map = { title:'err-title', author:'err-author', email:'err-email', file:'err-file' };
  const errId = map[input.id];
  if (msg) {
    input.classList.add('is-invalid');
    byId(errId)?.innerText = msg;
    return false;
  } else {
    input.classList.remove('is-invalid');
    byId(errId)?.innerText = '';
    return true;
  }
}
