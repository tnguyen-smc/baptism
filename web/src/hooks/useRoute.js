import { useState, useEffect, useCallback } from "react";

// Two routes, no router dependency (same approach as Marriage Prep):
//   /                 → directory
//   /records/<id>     → one child's record
//   /settings         → parish settings (baptism times)
// GitHub Pages serves 404.html (a copy of index.html) for deep links, so refresh works.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function currentPath() {
  const p = window.location.pathname;
  return (BASE && p.startsWith(BASE) ? p.slice(BASE.length) : p) || "/";
}

export function navigate(path) {
  window.history.pushState({}, "", `${BASE}${path}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function useRoute() {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const onPop = () => setPath(currentPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const go = useCallback((to) => navigate(to), []);
  const m = path.match(/^\/records\/([^/]+)\/?$/);
  if (m) return { route: { name: "record", id: decodeURIComponent(m[1]) }, go };
  if (/^\/settings\/?$/.test(path)) return { route: { name: "settings" }, go };
  return { route: { name: "directory" }, go };
}