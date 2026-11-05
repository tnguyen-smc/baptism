import React, { useEffect, useState } from "react";
import { ChevronLeft, FolderOpen, CalendarPlus, CheckCircle2, BookOpen, Archive } from "lucide-react";
import { api } from "../api.js";
import { STEPS } from "../theme.js";
import { can, fmtDate, fmtDateTime } from "../helpers.js";
import { toast } from "../toast.js";
import { AsyncButton, Spinner, StatusPill } from "./Shared.jsx";
import BaptismFormTab from "./BaptismFormTab.jsx";
import ChecklistTab from "./ChecklistTab.jsx";
import { DocumentsTab, ActivityTab } from "./DocumentsTab.jsx";
import { InterviewModal, ApproveModal, BaptismModal, CompleteModal, RegisterModal, ArchiveModal } from "./Modals.jsx";

export default function RecordScreen({ id, boot, onBack, onChange }) {
  const [rec, setRecState] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("form");
  const [modal, setModal] = useState(null);
  const me = boot.me;

  const setRec = (r) => { setRecState(r); onChange(r); };
  useEffect(() => { api.getRecord(id).then(setRec).catch((e) => setError(e.message)); }, [id]);

  if (error) return <div className="panel" style={{ color: "#8B3A3A" }}>{error} <button className="btn ml-3" onClick={onBack}>Back</button></div>;
  if (!rec) return <Spinner label="Opening record…" />;

  const st = rec.status;
  const stepIdx = STEPS.findIndex(([s]) => s === st);
  const archived = rec.archived === "TRUE";
  const staff = can(me, ["Secretary", "Pastor"]);
  const banner = nextStep(rec, me);

  return (
    <>
      <div className="flex items-start gap-3 flex-wrap">
        <button className="btn-link mt-1" onClick={onBack} aria-label="Back"><ChevronLeft size={22} /></button>
        <div className="flex-1 min-w-[240px]">
          <h1 className="serif text-[28px] sm:text-[32px] leading-tight">{rec.childName}</h1>
          <div className="flex items-center gap-3 mt-1 text-[14px] flex-wrap">
            <StatusPill status={st} />
            <span className="muted">{rec.id}</span>
            {rec.folderUrl && <a href={rec.folderUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1" style={{ color: "#A8763E" }}><FolderOpen size={14} /> Drive folder</a>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {archived ? (
            staff && <AsyncButton onClick={async () => setRec(await api.unarchive(rec.id))}>Restore</AsyncButton>
          ) : (
            <>
              {!rec.approvedAt && staff && <button className="btn" onClick={() => setModal("interview")}><CalendarPlus size={16} />{rec.interviewAt ? "Reschedule interview" : "Schedule interview"}</button>}
              {st === "Awaiting Pastor Approval" && can(me, ["Pastor"]) && <button className="btn btn-primary" onClick={() => setModal("approve")}><CheckCircle2 size={16} /> Approve for Baptism</button>}
              {rec.approvedAt && !rec.completedAt && staff && <button className="btn btn-dark" onClick={() => setModal("baptism")}><CalendarPlus size={16} />{rec.baptismAt ? "Reschedule baptism" : "Schedule baptism"}</button>}
              {rec.approvedAt && !rec.completedAt && staff && <button className="btn btn-soft" onClick={() => setModal("complete")}>Mark baptism completed</button>}
              {rec.completedAt && !rec.recordedAt && can(me, ["Registrar", "Pastor"]) && <button className="btn btn-primary" onClick={() => setModal("register")}><BookOpen size={16} /> Recorded in register</button>}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mt-6">
        {STEPS.map(([s, label], i) => (
          <div key={s} className="pt-2 text-[11px] sm:text-[12px] border-t-[3px]"
            style={{ borderColor: i < stepIdx ? "#6B7F73" : i === stepIdx ? "#A8763E" : "#E4DDD0",
                     color: i === stepIdx ? "#A8763E" : i < stepIdx ? "#2B3A42" : "#8A8378", fontWeight: i === stepIdx ? 600 : 400 }}>
            {label}
          </div>
        ))}
      </div>

      {banner && (
        <div className="rounded-xl px-4 py-3 mt-4 text-[14px]" style={{ background: banner.tone === "ok" ? "#E6EDE8" : banner.tone === "warn" ? "#F5E3E3" : "#F3E7D6", color: banner.tone === "warn" ? "#8B3A3A" : "#2B3A42" }}>
          {banner.text}
          {rec.completedAt && !rec.recordedAt && (
            <AsyncButton className="btn-link ml-2 underline" onClick={async () => { setRec(await api.resendRegistrar(rec.id)); toast("Re-sent to the Registrar"); }}>Resend</AsyncButton>
          )}
        </div>
      )}

      <div className="flex gap-6 border-b mt-6 mb-6 overflow-x-auto" style={{ borderColor: "#E4DDD0" }}>
        {[["form", "Baptism Form"], ["check", `Checklist ${rec.progress.done}/${rec.progress.total}`], ["docs", `Documents (${rec.docs.length})`], ["log", "Activity"]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className="pb-3 text-[15px] whitespace-nowrap border-b-2"
            style={{ borderColor: tab === k ? "#A8763E" : "transparent", color: tab === k ? "#2B3A42" : "#8A8378" }}>{label}</button>
        ))}
      </div>

      {tab === "form" && <BaptismFormTab rec={rec} me={me} setRec={setRec} />}
      {tab === "check" && <ChecklistTab rec={rec} me={me} boot={boot} setRec={setRec} />}
      {tab === "docs" && <DocumentsTab rec={rec} me={me} setRec={setRec} />}
      {tab === "log" && <ActivityTab rec={rec} />}

      {!archived && staff && (
        <div className="mt-12"><button className="btn-link" onClick={() => setModal("archive")}><Archive size={14} /> Archive this record…</button></div>
      )}

      {modal === "interview" && <InterviewModal rec={rec} boot={boot} onDone={setRec} onClose={() => setModal(null)} />}
      {modal === "approve" && <ApproveModal rec={rec} onDone={setRec} onClose={() => setModal(null)} />}
      {modal === "baptism" && <BaptismModal rec={rec} boot={boot} onDone={setRec} onClose={() => setModal(null)} />}
      {modal === "complete" && <CompleteModal rec={rec} onDone={setRec} onClose={() => setModal(null)} />}
      {modal === "register" && <RegisterModal rec={rec} onDone={setRec} onClose={() => setModal(null)} />}
      {modal === "archive" && <ArchiveModal rec={rec} onDone={setRec} onClose={() => setModal(null)} />}
    </>
  );
}

function nextStep(r) {
  const p = r.progress;
  if (r.archived === "TRUE") return { tone: "warn", text: `Archived: ${r.archivedReason}` };
  if (r.recordedAt) return { tone: "ok", text: `Entered in the register — Book ${r.regBook}, Page ${r.regPage}, No. ${r.regNumber}.` };
  if (r.completedAt) return { text: `Baptized ${fmtDate(r.actualDate)} by ${r.minister}. Packet emailed to the Registrar${r.registrarSentAt ? ` on ${fmtDate(r.registrarSentAt)}` : ""}.` };
  if (r.baptismAt) return { tone: "ok", text: `Baptism on ${fmtDateTime(r.baptismAt)}${r.baptismLocation ? ` at ${r.baptismLocation}` : ""}. Afterwards, mark it completed.` };
  if (r.approvedAt) return { text: `Approved by ${r.approvedBy}. Secretary: confirm the date with the family and schedule the baptism.` };
  if (p.total && p.done === p.total) return { text: `All ${p.total} items verified. Pastor: review and approve.` };
  if (!r.interviewAt) return { text: "Next: schedule the interview with the Pastor." };
  return { text: `Interview ${fmtDateTime(r.interviewAt)}${r.interviewSavedAt ? ` (form saved by ${r.interviewSavedBy})` : ""}. Secretary: ${p.total - p.done} checklist item(s) left to verify.` };
}
