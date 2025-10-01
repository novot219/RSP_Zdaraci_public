// db.js — jednoduchý wrapper nad IndexedDB pro články

const DB_NAME = 'zdaraci_rspr_mvp';
const DB_VERSION = 3;          
const STORE = 'articles';

let _db;

/** Inicializace DB, vrací Promise */
export function initDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('by_date', 'addedAt');
        store.createIndex('by_status', 'status');
        store.createIndex('by_checksum', 'checksum', { unique: false });
        store.createIndex('by_email', 'email', { unique: false });
        store.createIndex('by_filename', 'filename', { unique: false });
      } else {
        const store = req.transaction.objectStore(STORE);
        if (!store.indexNames.contains('by_status'))   store.createIndex('by_status', 'status');
        if (!store.indexNames.contains('by_checksum')) store.createIndex('by_checksum', 'checksum', { unique: false });
        if (!store.indexNames.contains('by_email'))    store.createIndex('by_email', 'email', { unique: false });
        if (!store.indexNames.contains('by_filename')) store.createIndex('by_filename', 'filename', { unique: false });
      }
    };

    req.onsuccess = () => { _db = req.result; resolve(); };
    req.onerror = () => reject(req.error);
  });
}

/** Pidani clanku do DB a vraceni ID  */
export function addArticle(record) {
  return new Promise((resolve, reject) => {
    const tx = _db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.add(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**nacteni vsech clanku*/
export function getAllArticles() {
  return new Promise((resolve, reject) => {
    const tx = _db.transaction(STORE, 'readonly');
    const idx = tx.objectStore(STORE).index('by_date');
    const out = [];
    const cur = idx.openCursor(null, 'prev');
    cur.onsuccess = (e) => {
      const c = e.target.result;
      if (c) { out.push(c.value); c.continue(); } else resolve(out);
    };
    cur.onerror = () => reject(cur.error);
  });
}

/** Hledani clanku podle mailu */
export function findArticleByEmailAndFilename(email, filename) {
  return new Promise((resolve, reject) => {
    const tx = _db.transaction(STORE, 'readonly');
    const idx = tx.objectStore(STORE).index('by_email');
    const req = idx.getAll(email);
    req.onsuccess = () => {
      const rows = (req.result || []).filter(r => (r.filename || '').toLowerCase() === (filename || '').toLowerCase());
      // pokud je vic , vrat nejnovejsi
      rows.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
      resolve(rows[0] || null);
    };
    req.onerror = () => reject(req.error);
  });
}

/** Smazani clanku podle ID */
export function deleteArticle(id) {
  return new Promise((resolve, reject) => {
    const tx = _db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}