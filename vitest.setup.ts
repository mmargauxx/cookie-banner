// Guarantee a working `localStorage` regardless of the jsdom / Node combo.
//
// Under some jsdom + Node versions the Storage object isn't attached to the
// jsdom window (it needs a non-opaque origin), which left `localStorage`
// undefined and crashed every test in `beforeEach`. This in-memory shim is
// enough for the banner's get/set/remove/clear usage.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  const shim: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(String(key), String(value));
    },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: shim, configurable: true });
}
