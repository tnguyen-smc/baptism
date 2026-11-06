// Remembers the last directory load in this browser so the app opens instantly, then refreshes quietly.
// Stored per signed-in email, removed on Log Out, ignored after MAX_AGE_DAYS.
// Set ENABLED = false to turn this off (e.g. on a shared kiosk computer).
const ENABLED = true;
const MAX_AGE_DAYS = 7;
// Bump VERSION whenever the shape of the saved data changes; older copies are then ignored.
const VERSION = 2;
const KEY = (email) => `baptismPrep.boot.v${VERSION}.${email}`;

export function loadBoot(email) {
  if (!ENABLED || !email) return null;
  try {
    const raw = localStorage.getItem(KEY(email));
    if (!raw) return null;
    const { at, boot } = JSON.parse(raw);
    if (!boot?.records?.every((r) => r.progress)) return null; // not the current format
    if (Date.now() - at > MAX_AGE_DAYS * 864e5) { localStorage.removeItem(KEY(email)); return null; }
    return boot;
  } catch { return null; }
}

export function saveBoot(email, boot) {
  if (!ENABLED || !email || !boot) return;
  try { localStorage.setItem(KEY(email), JSON.stringify({ at: Date.now(), boot })); } catch { /* storage full: skip */ }
}

export function clearBoot() {
  try { Object.keys(localStorage).filter((k) => k.startsWith("baptismPrep.boot.")).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
}