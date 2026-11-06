import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import { currentUser, initAuth, onAuthChange, signOut } from "./auth.js";
import { useRoute } from "./hooks/useRoute.js";
import { clearBoot, loadBoot, saveBoot } from "./cache.js";
import LoginScreen from "./components/LoginScreen.jsx";
import TopBar from "./components/TopBar.jsx";
import DirectoryScreen from "./components/DirectoryScreen.jsx";
import RecordScreen from "./components/RecordScreen.jsx";
import SettingsScreen from "./components/SettingsScreen.jsx";
import { Spinner, Toasts } from "./components/Shared.jsx";

/**
 * The directory's view of a record. Accepts both the current full records and the older
 * summary format (from a not-yet-updated Apps Script deployment), so neither can crash the page.
 */
export function summarize(rec) {
  const p = rec.progress || { done: Number(rec.done) || 0, total: Number(rec.total) || 0 };
  return {
    id: rec.id, status: rec.status, child: rec.childName || rec.child || "(no name)",
    parents: rec.parents || [rec.fatherName, rec.motherName].filter(Boolean).join(" & "),
    proposedDate: rec.proposedDate, interviewAt: rec.interviewAt, baptismAt: rec.baptismAt,
    actualDate: rec.actualDate, createdAt: rec.createdAt, archived: rec.archived === true || rec.archived === "TRUE",
    done: p.done, total: p.total,
  };
}

export default function App() {
  const { route, go } = useRoute();
  const [user, setUser] = useState(currentUser);
  // Start from the copy saved in this browser (instant), then refresh from the server.
  const [boot, setBoot] = useState(() => loadBoot(currentUser()?.email));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    initAuth().catch((e) => setError(e.message));
    return onAuthChange(setUser);
  }, []);

  const load = useCallback(() => {
    setError(null);
    // Show the server's reason on the login screen (e.g. "not on the Staff list", "different app").
    setRefreshing(true);
    return api.bootstrap().then(setBoot).catch((e) => setError(e.message)).finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    if (user) { setBoot((b) => b || loadBoot(user.email)); load(); }
    else setBoot(null);
  }, [user?.email, load]);
  // Keep the saved copy current (including edits made in this session).
  useEffect(() => { if (boot && user) saveBoot(user.email, boot); }, [boot, user?.email]);
  const logOut = () => { clearBoot(); signOut(); };
  // A successful new sign-in clears the previous error.
  useEffect(() => onAuthChange((u) => { if (u) setError(null); }), []);

  // boot.records holds full records (minus the activity log), so opening one is instant.
  // A rename (new ID) replaces the entry stored under its previous ID.
  const upsertRecord = useCallback((rec) => {
    setBoot((b) => {
      if (!b) return b;
      const olds = String(rec.previousIds || "").toLowerCase().split(",");
      const rest = b.records.filter((r) => r.id !== rec.id && !olds.includes(r.id.toLowerCase()));
      return { ...b, records: [...rest, { ...rec, log: [] }] };
    });
  }, []);
  const summaries = useMemo(() => (boot ? boot.records.map(summarize) : []), [boot]);

  if (!user) return <><LoginScreen message={error} /><Toasts /></>;

  if (!boot) {
    return (
      <div className="min-h-screen" style={{ background: "var(--surface)" }}>
        {error ? (
          <div className="max-w-md mx-auto pt-24 text-center px-4">
            <p className="mb-6" style={{ color: "var(--warn)" }}>{error}</p>
            <div className="flex gap-2 justify-center">
              <button className="btn" onClick={load}>Try again</button>
              <button className="btn" onClick={logOut}>Use another account</button>
            </div>
          </div>
        ) : <Spinner label="Opening the parish records…" />}
        <Toasts />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {error && (
        <div className="text-[13px] text-center px-4 py-2" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
          Showing saved data — couldn’t refresh: {error} <button className="underline ml-1" onClick={load}>Try again</button>
        </div>
      )}
      <TopBar parish={boot.parish} me={boot.me} formUrl={boot.formUrl} onHome={() => go("/")} onSettings={() => go("/settings")} onSignOut={logOut} />
      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8 pb-24">
        {route.name === "record"
          ? <RecordScreen key={route.id} id={route.id} boot={boot} onBack={() => go("/")} onChange={upsertRecord} onOpenSettings={() => go("/settings")} />
          : route.name === "settings"
          ? <SettingsScreen boot={boot} onBack={() => go("/")} onSaved={(patch) => setBoot((b) => ({ ...b, ...patch }))} />
          : <DirectoryScreen boot={boot} summaries={summaries} go={go} onRefresh={load} refreshing={refreshing} />}
      </main>
      <Toasts />
    </div>
  );
}