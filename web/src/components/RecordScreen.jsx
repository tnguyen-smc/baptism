import React, { useEffect, useState } from "react";
import { ChevronLeft, FolderOpen, Archive } from "lucide-react";
import { api } from "../api.js";
import { STEPS } from "../theme.js";
import { fmtDate, fmtDateTime } from "../helpers.js";
import { AsyncButton, Spinner, StatusPill } from "./Shared.jsx";
import BaptismFormTab from "./BaptismFormTab.jsx";
import ChecklistTab from "./ChecklistTab.jsx";
import { ApprovalBaptismTab, RegistrarTab } from "./WorkflowTabs.jsx";
import { DocumentsTab, ActivityTab } from "./DocumentsTab.jsx";
import { ArchiveModal } from "./Modals.jsx";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// Every tab is open to every staff member at every stage, so anyone can look ahead or fix something.
// Which step the record is "on" is shown by the progress strip and the blue banner, not by locks.
const TABS = [
  ["form", "Baptism Form"],
  ["check", "Checklist"],
  ["approval", "Approval & Baptism"],
  ["registrar", "Registrar"],
  ["docs", "Documents"],
  ["log", "Activity"],
];
// Clicking a step in the strip jumps to the tab where that step is done.
const STEP_TAB = ["form", "check", "approval", "approval", "approval", "registrar", "registrar"];

export default function RecordScreen({ id, boot, onBack, onChange }) {
  // Use the directory's copy only if it is a full record (older servers sent summaries only).
  const cached = boot.records.find((r) => r.progress && (r.id.toLowerCase() === id.toLowerCase() ||
    String(r.previousIds || "").toLowerCase().split(",").includes(id.toLowerCase())));
  const [rec, setRecState] = useState(cached || null);
  const [docs, setDocs] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("form");
  const [archiving, setArchiving] = useState(false);
  const me = boot.me;

  const setRec = (r) => {
    setRecState((prev) => ({ ...r, log: r.log?.length ? r.log : prev?.log || [] }));
    onChange(r);
    if (r.id !== id) window.history.replaceState({}, "", `${BASE}/records/${encodeURIComponent(r.id)}`);
  };
  const refreshDocs = (rid = rec?.id || id) => api.listDocuments(rid).then(setDocs).catch(() => setDocs([]));

  useEffect(() => {
    api.getRecord(id).then(setRec).catch((e) => { if (!cached) setError(e.message); });
    refreshDocs(id);
    const t = setTimeout(() => import("../fillBaptismForm.js").then((m) => m.preloadTemplate()).catch(() => {}), 800);
    return () => clearTimeout(t);
  }, [id]);

  if (error) return <div className="panel" style={{ color: "var(--warn)" }}>{error} <button className="btn ml-3" onClick={onBack}>Back</button></div>;
  if (!rec) return <Spinner label="Opening record…" />;

  const st = rec.status;
  const stepIdx = STEPS.findIndex(([s]) => s === st);
  const archived = rec.archived === "TRUE";
  const banner = nextStep(rec);
  const label = (k, t) => k === "check" ? `${t} ${rec.progress.done}/${rec.progress.total}` : k === "docs" && docs ? `${t} (${docs.length})` : t;

  return (
    <>
      <div className="flex items-start gap-3 flex-wrap">
        <button className="btn-link mt-1" onClick={onBack} aria-label="Back"><ChevronLeft size={22} /></button>
        <div className="flex-1 min-w-[240px]">
          <h1 className="serif text-[28px] sm:text-[32px] leading-tight">{rec.childName}</h1>
          <div className="flex items-center gap-3 mt-1 text-[14px] flex-wrap">
            <StatusPill status={st} />
            <span className="muted font-mono text-[13px]">{rec.id}</span>
            {rec.folderUrl && <a href={rec.folderUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 accent"><FolderOpen size={14} /> Drive folder</a>}
          </div>
        </div>
        {archived && <AsyncButton onClick={async () => setRec(await api.unarchive(rec.id))}>Restore from archive</AsyncButton>}
      </div>

      <div className="grid grid-cols-7 gap-1 mt-6">
        {STEPS.map(([s, stepLabel], i) => (
          <button key={s} onClick={() => setTab(STEP_TAB[i])} className="pt-2 text-left text-[11px] sm:text-[12px] border-t-[3px] hover:opacity-80"
            style={{ borderColor: i < stepIdx ? "var(--done)" : i === stepIdx ? "var(--accent)" : "var(--line)",
                     color: i === stepIdx ? "var(--accent)" : i < stepIdx ? "var(--ink)" : "var(--muted)", fontWeight: i === stepIdx ? 600 : 400 }}>
            {stepLabel}
          </button>
        ))}
      </div>

      {banner && (
        <div className="rounded-xl px-4 py-3 mt-4 text-[14px]" style={{ background: banner.tone === "ok" ? "var(--done-soft)" : banner.tone === "warn" ? "var(--warn-soft)" : "var(--accent-soft)", color: banner.tone === "warn" ? "var(--warn)" : "var(--ink)" }}>
          {banner.text}
          {banner.tab && <button className="ml-2 underline accent" onClick={() => setTab(banner.tab)}>Go there</button>}
        </div>
      )}

      <div className="flex gap-6 border-b mt-6 mb-6 overflow-x-auto" style={{ borderColor: "var(--line)" }}>
        {TABS.map(([k, t]) => (
          <button key={k} onClick={() => setTab(k)} className="pb-3 text-[15px] whitespace-nowrap border-b-2"
            style={{ borderColor: tab === k ? "var(--accent)" : "transparent", color: tab === k ? "var(--ink)" : "var(--muted)" }}>{label(k, t)}</button>
        ))}
      </div>

      {rec.recordedAt && tab !== "registrar" && tab !== "log" && (
        <div className="rounded-xl px-4 py-3 mb-4 text-[13px]" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
          Already entered in the register (Book {rec.regBook}, Page {rec.regPage}, No. {rec.regNumber}). Changes here don't update the physical book.
        </div>
      )}

      {tab === "form" && <BaptismFormTab rec={rec} me={me} setRec={setRec} onPdfSaved={() => refreshDocs()} />}
      {tab === "check" && <ChecklistTab rec={rec} boot={boot} setRec={setRec} onUploaded={() => refreshDocs()} />}
      {tab === "approval" && <ApprovalBaptismTab rec={rec} me={me} boot={boot} setRec={setRec} onCompleted={(r) => refreshDocs(r.id)} />}
      {tab === "registrar" && <RegistrarTab rec={rec} setRec={setRec} />}
      {tab === "docs" && <DocumentsTab rec={rec} docs={docs} setRec={setRec} onUploaded={() => refreshDocs()} />}
      {tab === "log" && <ActivityTab rec={rec} />}

      {!archived && (
        <div className="mt-12"><button className="btn-link" onClick={() => setArchiving(true)}><Archive size={14} /> Archive this record…</button></div>
      )}
      {archiving && <ArchiveModal rec={rec} onDone={setRec} onClose={() => setArchiving(false)} />}
    </>
  );
}

function nextStep(r) {
  const p = r.progress;
  if (r.archived === "TRUE") return { tone: "warn", text: `Archived: ${r.archivedReason}` };
  if (r.recordedAt) return { tone: "ok", text: `Entered in the register — Book ${r.regBook}, Page ${r.regPage}, No. ${r.regNumber}.` };
  if (r.completedAt) return { text: `Baptized ${fmtDate(r.actualDate)} by ${r.minister}. Waiting for the Registrar to record it.`, tab: "registrar" };
  if (r.baptismAt) return { tone: "ok", text: `Baptism on ${fmtDateTime(r.baptismAt)}${r.baptismLocation ? ` at ${r.baptismLocation}` : ""}. Afterwards, mark it completed.`, tab: "approval" };
  if (r.approvedAt) return { text: `Approved by ${r.approvedBy}. Next: confirm the date with the family and schedule the baptism.`, tab: "approval" };
  if (p.total && p.done === p.total) return { text: `All ${p.total} items verified. Next: Pastor reviews and approves.`, tab: "approval" };
  if (!r.interviewAt) return { text: "Next: book the interview with the Pastor, then note it at the bottom of the Baptism Form.", tab: "form" };
  return { text: `Interview ${fmtDateTime(r.interviewAt)}. Next: ${p.total - p.done} checklist item(s) left to verify.`, tab: "check" };
}