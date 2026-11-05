import React, { useCallback, useEffect, useState } from "react";
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

  const upsertSummary = useCallback((rec) => {
    setBoot((b) => {
      if (!b) return b;
      const s = summarize(rec);
      const exists = b.records.some((r) => r.id === s.id);
      return { ...b, records: exists ? b.records.map((r) => (r.id === s.id ? s : r)) : [...b.records, s] };
    });
  }, []);

  if (!user) return <><LoginScreen message={error} /><Toasts /></>;

  if (!boot) {
    return (
      <div className="min-h-screen" style={{ background: "#FAF7F0" }}>
        {error ? (
          <div className="max-w-md mx-auto pt-24 text-center px-4">
            <p className="mb-6" style={{ color: "#8B3A3A" }}>{error}</p>
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
          ? <RecordScreen key={route.id} id={route.id} boot={boot} onBack={() => go("/")} onChange={upsertSummary} />
          : <DirectoryScreen boot={boot} go={go} onRefresh={load} />}
      </main>
      <Toasts />
    </div>
  );
}