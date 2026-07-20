// Tiny dependency-free toast store. Lives outside React so non-component code
// (e.g. the QueryClient's MutationCache) can trigger a toast, while <Toaster />
// subscribes to render them.
export type Toast = { id: number; message: string };

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
const listeners = new Set<Listener>();
let nextId = 1;

function emit() {
  for (const listener of listeners) listener(toasts);
}

export function showToast(message: string, ttl = 4000) {
  const id = nextId++;
  toasts = [...toasts, { id, message }];
  emit();
  setTimeout(() => dismissToast(id), ttl);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
}
