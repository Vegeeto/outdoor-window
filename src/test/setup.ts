/**
 * Node 25+ ships its own global `localStorage` (Web Storage), which shadows jsdom's and is
 * unusable without `--localstorage-file`. Swap in an in-memory Storage when that happens,
 * so tests behave the same on every Node version.
 */
function isUsable(s: unknown): boolean {
  return typeof (s as Storage | undefined)?.clear === 'function';
}

if (!isUsable(globalThis.localStorage)) {
  const data = new Map<string, string>();
  const memory: Storage = {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
  Object.defineProperty(globalThis, 'localStorage', { value: memory, configurable: true });
}
