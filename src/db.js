
const DB_NAME = 'zdaraci_rspr_mvp';
const DB_VERSION = 2;            
const STORE = 'articles';

let _db;

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
      } else {
        const store = req.transaction.objectStore(STORE);
        if (!store.indexNames.contains('by_status')) store.createIndex('by_status', 'status');
        if (!store.indexNames.contains('by_checksum')) store.createIndex('by_checksum', 'checksum', { unique: false });
      }
    };

    req.onsuccess = () => { _db = req.result; resolve(); };
    req.onerror = () => reject(req.error);
  });
}

export function addArticle(record) {
  return new Promise((resolve, reject) => {
    const tx = _db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.add(record);

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function getAllArticles() {
  return new Promise((resolve, reject) => {
    const tx = _db.transaction(STORE, 'readonly');
    const idx = tx.objectStore(STORE).index('by_date');
    const out = [];
    const curReq = idx.openCursor(null, 'prev');

    curReq.onsuccess = (e) => {
      const cur = e.target.result;
      if (cur) { out.push(cur.value); cur.continue(); } else resolve(out);
    };
    curReq.onerror = () => reject(curReq.error);
  });
}

export function deleteArticle(id) {
  return new Promise((resolve, reject) => {
    const tx = _db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
