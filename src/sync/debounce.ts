// Generic per-key debouncer used to collapse rapid repeated triggers (e.g.
// several progress writes in quick succession) into a single call, keyed so
// unrelated keys (different profile ids) never block each other.

export interface KeyedDebouncer {
  schedule(key: string, run: () => void): void;
  cancel(key: string): void;
  pending(key: string): boolean;
}

export function createKeyedDebouncer(delayMs: number): KeyedDebouncer {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  return {
    schedule(key, run) {
      const existing = timers.get(key);
      if (existing) clearTimeout(existing);
      const handle = setTimeout(() => {
        timers.delete(key);
        run();
      }, delayMs);
      timers.set(key, handle);
    },
    cancel(key) {
      const existing = timers.get(key);
      if (existing) {
        clearTimeout(existing);
        timers.delete(key);
      }
    },
    pending(key) {
      return timers.has(key);
    },
  };
}
