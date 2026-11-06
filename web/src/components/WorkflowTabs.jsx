import React, { useEffect, useState } from "react";
import { CalendarPlus, CheckCircle2, Send, BookOpen, Undo2 } from "lucide-react";
import { api } from "../api.js";
import { fmtDate, fmtDateTime } from "../helpers.js";
import { toast } from "../toast.js";
import { AsyncButton } from "./Shared.jsx";
import { ApproveModal, BaptismModal } from "./Modals.jsx";

function Step({ n, title, done, children }) {
  return (
    <div className="panel mb-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-semibold"
          style={{ background: done ? "var(--done)" : "var(--accent-soft)", color: done ? "#fff" : "var(--accent)" }}>{done ? "✓" : n}</span>
        <h3 className="text-[17px] font-semibold flex-1">{title}</h3>
      </div>
      {children}
    </div>
  );
}

/** Steps 4–5: approval, baptism date, completion. Always visible and editable. */
export function ApprovalBaptismTab({ rec, me, boot, setRec, onCompleted }) {
  const [modal, setModal] = useState(null);
  const [date, setDate] = useState((rec.actualDate || rec.baptismAt || "").slice(0, 10));
  const [minister, setMinister] = useState(rec.minister || rec.celebrant || "");
  useEffect(() => {
    setDate((rec.actualDate || rec.baptismAt || "").slice(0, 10));
    setMinister(rec.minister || rec.celebrant || "");
  }, [rec.updatedAt]);
  const p = rec.progress;

  return (
    <>
      <Step n="1" title="Pastor approval" done={!!rec.approvedAt}>
        {rec.approvedAt ? (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[15px]">Approved by <b>{rec.approvedBy}</b> on {fmtDate(rec.approvedAt)}.</span>
            <span className="flex-1" />
            <AsyncButton className="btn-link" onClick={async () => {
              if (!window.confirm("Withdraw this approval?")) return;
              setRec(await api.revokeApproval(rec.id, "Withdrawn from the app"));
            }}><Undo2 size={15} /> Withdraw approval</AsyncButton>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[15px] flex-1">
              Checklist {p.done}/{p.total}{p.done < p.total ? " — some items are still open." : " — complete."} Approving emails the Secretary to schedule the baptism.
            </span>
            <button className="btn btn-primary" onClick={() => setModal("approve")}><CheckCircle2 size={16} /> Approve for Baptism</button>
          </div>
        )}
      </Step>

      <Step n="2" title="Baptism date" done={!!rec.baptismAt}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[15px] flex-1">
            {rec.baptismAt
              ? <>Scheduled for <b>{fmtDateTime(rec.baptismAt)}</b>{rec.baptismLocation ? ` at ${rec.baptismLocation}` : ""}{rec.celebrant ? ` · ${rec.celebrant}` : ""}.</>
              : <>Not scheduled yet.{rec.proposedDate ? ` Family's preferred date: ${fmtDate(rec.proposedDate)}.` : ""}</>}
          </span>
          <button className="btn btn-dark" onClick={() => setModal("baptism")}><CalendarPlus size={16} /> {rec.baptismAt ? "Reschedule" : "Schedule baptism"}</button>
        </div>
        <p className="text-[13px] muted mt-2">Creates or moves the Google Calendar event.</p>
      </Step>

      <Step n="3" title="Baptism celebrated" done={!!rec.completedAt}>
        <div className="grid sm:grid-cols-[1fr_1.4fr_auto] gap-4 items-end">
          <label><span className="label">Actual date of baptism</span><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label><span className="label">Name of minister</span>
            <input className="input" list="minister-list" value={minister} onChange={(e) => setMinister(e.target.value)} />
            <datalist id="minister-list">{boot.pastors.map((n) => <option key={n} value={n} />)}</datalist>
          </label>
          <AsyncButton className="btn btn-primary" onClick={async () => {
            if (!date || !minister) throw new Error("Date and minister are required.");
            const { buildBaptismPdf } = await import("../fillBaptismForm.js");
            const pdf = await buildBaptismPdf({ ...rec, actualDate: date, minister });
            const r = await api.completeBaptism(rec.id, date, minister, pdf);
            setRec(r); onCompleted?.(r);
            toast("Sent to the Registrar");
          }}><Send size={16} /> {rec.completedAt ? "Update & re-send" : "Complete & send to Registrar"}</AsyncButton>
        </div>
        <p className="text-[13px] muted mt-3">
          {rec.completedAt
            ? `Sent to the Registrar on ${fmtDate(rec.registrarSentAt || rec.completedAt)} with the filled Baptism Form attached.`
            : "Fills in the Baptism Form PDF and emails it, with a register summary, to the Sacrament Registrar."}
        </p>
      </Step>

      {modal === "approve" && <ApproveModal rec={rec} me={me} onDone={setRec} onClose={() => setModal(null)} />}
      {modal === "baptism" && <BaptismModal rec={rec} boot={boot} onDone={setRec} onClose={() => setModal(null)} />}
    </>
  );
}

/** Step 6: the Registrar's entry in the physical register. Always visible and editable. */
export function RegistrarTab({ rec, setRec }) {
  const [b, setB] = useState(rec.regBook);
  const [pg, setPg] = useState(rec.regPage);
  const [n, setN] = useState(rec.regNumber);
  useEffect(() => { setB(rec.regBook); setPg(rec.regPage); setN(rec.regNumber); }, [rec.updatedAt]);
  return (
    <>
      <Step n="1" title="Packet to the Registrar" done={!!rec.registrarSentAt}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[15px] flex-1">
            {rec.registrarSentAt ? `Emailed on ${fmtDate(rec.registrarSentAt)}.` : "Not sent yet — it goes automatically when the baptism is marked celebrated."}
          </span>
          <AsyncButton className="btn" onClick={async () => { setRec(await api.resendRegistrar(rec.id)); toast("Sent to the Registrar"); }}>
            <Send size={16} /> {rec.registrarSentAt ? "Resend" : "Send now"}
          </AsyncButton>
        </div>
      </Step>
      <Step n="2" title="Entered in the Baptismal Register" done={!!rec.recordedAt}>
        <div className="grid grid-cols-3 sm:grid-cols-[1fr_1fr_1fr_auto] gap-4 items-end">
          <label><span className="label">Book</span><input className="input" value={b} onChange={(e) => setB(e.target.value)} /></label>
          <label><span className="label">Page</span><input className="input" value={pg} onChange={(e) => setPg(e.target.value)} /></label>
          <label><span className="label">Entry no.</span><input className="input" value={n} onChange={(e) => setN(e.target.value)} /></label>
          <AsyncButton className="btn btn-primary col-span-3 sm:col-span-1" onClick={async () => {
            if (!b || !pg || !n) throw new Error("Book, page and entry number are all required.");
            setRec(await api.recordInRegister(rec.id, b, pg, n)); toast("Saved");
          }}><BookOpen size={16} /> {rec.recordedAt ? "Update" : "Mark recorded"}</AsyncButton>
        </div>
        {rec.recordedAt && <p className="text-[13px] muted mt-3">Recorded by {rec.recordedBy} on {fmtDate(rec.recordedAt)}.</p>}
      </Step>
    </>
  );
}
