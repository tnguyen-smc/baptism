// "Sign in with Google" via Google Identity Services — no backend login route, no client secret.
// The browser receives a short-lived ID token (about 1 hour) and sends it with every API call;
// Code.gs verifies it with Google and checks the email against the Staff tab.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const KEY = "baptismPrep.idToken";
const listeners = new Set();
let initialized = false;
let waiting = [];

function decode(token) {
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function storedToken() {
  try {
    const t = localStorage.getItem(KEY);
    const p = t && decode(t);
    return p && p.exp * 1000 > Date.now() + 60_000 ? t : null;
  } catch {
    return null;
  }
}

export function currentUser() {
  const t = storedToken();
  const p = t && decode(t);
  return p ? { email: p.email, name: p.name, picture: p.picture } : null;
}

function notify() {
  const u = currentUser();
  listeners.forEach((fn) => fn(u));
}

export function onAuthChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function waitForGis() {
  return new Promise((resolve, reject) => {
    let n = 0;
    const tick = () => {
      if (window.google?.accounts?.id) return resolve();
      if (++n > 100) return reject(new Error("Google sign-in could not load. Check your connection or ad blocker."));
      setTimeout(tick, 100);
    };
    tick();
  });
}

export async function initAuth() {
  if (!CLIENT_ID) throw new Error("VITE_GOOGLE_CLIENT_ID is not set for this build.");
  await waitForGis();
  if (initialized) return;
  window.google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: (resp) => {
      localStorage.setItem(KEY, resp.credential);
      waiting.forEach((resolve) => resolve(resp.credential));
      waiting = [];
      notify();
    },
    auto_select: true,           // returning staff are signed back in silently
    use_fedcm_for_prompt: true,
    cancel_on_tap_outside: false,
  });
  initialized = true;
}

export function renderSignInButton(el, { autoPrompt = true } = {}) {
  window.google.accounts.id.renderButton(el, { theme: "outline", size: "large", width: 300, text: "signin_with" });
  if (autoPrompt) window.google.accounts.id.prompt();
}

/** A valid token, refreshing silently when the old one is near expiry. */
export async function getToken() {
  const t = storedToken();
  if (t) return t;
  await initAuth();
  return new Promise((resolve, reject) => {
    const done = (tok) => { clearTimeout(timer); resolve(tok); };
    const timer = setTimeout(() => {
      waiting = waiting.filter((w) => w !== done);
      expireSession();
      const e = new Error("Please sign in again.");
      e.code = "auth";
      reject(e);
    }, 8000);
    waiting.push(done);
    window.google.accounts.id.prompt();
  });
}

export function expireSession() {
  localStorage.removeItem(KEY);
  notify();
}

export function signOut() {
  localStorage.removeItem(KEY);
  try { window.google.accounts.id.disableAutoSelect(); } catch { /* not loaded */ }
  notify();
}
