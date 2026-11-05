// A tiny app-wide toast: toast("Saved") or toast(err, true) from anywhere.
const subs = new Set();
export function toast(msg, isError = false) {
  const text = msg?.message || String(msg);
  subs.forEach((fn) => fn({ id: Math.random(), text, isError }));
}
export function subscribeToasts(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
