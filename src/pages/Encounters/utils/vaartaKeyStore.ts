// The Vaarta callback opens in a new tab, so the private key lives in IndexedDB, which every tab shares.
const DB_NAME = "vaarta";
const STORE = "keys";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  op: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = op(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).finally(() => db.close()) as Promise<T>;
}

export function putVaartaKey(kid: string, key: CryptoKey) {
  return run("readwrite", (store) => store.put(key, kid));
}

export function getVaartaKey(kid: string): Promise<CryptoKey | undefined> {
  return run("readonly", (store) => store.get(kid));
}

export function deleteVaartaKey(kid: string) {
  return run("readwrite", (store) => store.delete(kid));
}
