export function readStorage(key: string, persistent = false): string | null { try { return (persistent ? localStorage : sessionStorage).getItem(key); } catch { return null; } }
export function writeStorage(key: string, value: string | null, persistent = false): void { try { const storage = persistent ? localStorage : sessionStorage; if (value === null) storage.removeItem(key); else storage.setItem(key, value); } catch { return; } }


