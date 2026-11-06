import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import { currentUser, initAuth, onAuthChange, signOut } from "./auth.js";
import { useRoute } from "./hooks/useRoute.js";
import LoginScreen from "./components/LoginScreen.jsx";
import TopBar from "./components/TopBar.jsx";
import DirectoryScreen from "./components/DirectoryScreen.jsx";
import RecordScreen from "./components/RecordScreen.jsx";
import { Spinner, Toasts } from "./components/Shared.jsx";

/** The directory's lightweight view of a full record (mirrors summary_ in Code.gs). */
export function summarize(rec) {
  return {
    id: rec.id, status: rec.status, child: rec.childName,
    parents: [rec.fatherName, rec.motherName].filter(Boolean).join(" & "),
    proposedDate: rec.proposedDate, interviewAt: rec.interviewAt, baptismAt: rec.baptismAt,
    actualDate: rec.actualDate, createdAt: rec.createdAt, archived: rec.archived === "TRUE",
    done: rec.progress.done, total: rec.progress.total,
  };
}

export default function App() {
  const { route, go } = useRoute();
  const [user, setUser] = useState(currentUser);
  const [boot, setBoot] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    initAuth().catch((e) => setError(e.message));
    return onAuthChange(setUser);
  }, []);

  const load = useCallback(() => {
    setError(null);
    // Show the server's reason on the login screen (e.g. "not on the Staff list", "different app").
    return api.bootstrap().then(setBoot).catch((e) => setError(e.message));
  }, []);

  useEffect(() => { if (user) load(); else setBoot(null); }, [user?.email, load]);
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
              <button className="btn" onClick={signOut}>Use another account</button>
            </div>
          </div>
        ) : <Spinner label="Opening the parish records…" />}
        <Toasts />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar parish={boot.parish} me={boot.me} formUrl={boot.formUrl} onHome={() => go("/")} onSignOut={signOut} />
      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8 pb-24">
        {route.name === "record"
          ? <RecordScreen key={route.id} id={route.id} boot={boot} onBack={() => go("/")} onChange={upsertRecord} />
          : <DirectoryScreen boot={boot} summaries={summaries} go={go} onRefresh={load} />}
      </main>
      <Toasts />
    </div>
  );
}
