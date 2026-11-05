import React, { useState } from "react";
import { api } from "../api.js";
import { nextWeekday10 } from "../helpers.js";
import { toast } from "../toast.js";
import { Modal } from "./Shared.jsx";

const L = ({ label, children, wide }) => (
  <label className={wide ? "sm:col-span-2" : ""}><span className="label">{label}</span>{children}</label>
);
const Invite = ({ email, checked, onChange, text }) => (
  <label className="sm:col-span-2 flex items-center gap-2 text-[14px]">
    <input type="checkbox" checked={checked} disabled={!email} onChange={(e) => onChange(e.target.checked)} />
    {text} ({email || "no email on file"})
  </label>
);

export function InterviewModal({ rec, boot, onDone, onClose }) {
  const d = boot.defaults;
  const [start, setStart] = useState(rec.interviewAt ? rec.interviewAt.slice(0, 16) : nextWeekday10());
  const [minutes, setMinutes] = useState(d.interviewMinutes);
  const [loc, setLoc] = useState(d.interviewLocation);
  const [invite, setInvite] = useState(!!rec.contactEmail);
  return (
    <Modal title={rec.interviewAt ? "Reschedule interview" : "Schedule interview with the Pastor"} okText="Save to Google Calendar" onClose={onClose}
      onOk={async () => { onDone(await api.scheduleInterview(rec.id, start, minutes, loc, invite)); toast("Interview on the calendar"); }}>
      <div className="grid sm:grid-cols-2 gap-4">
        <L label="Date & time" wide><input className="input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></L>
        <L label="Minutes"><input className="input" type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></L>
        <L label="Location"><input className="input" value={loc} onChange={(e) => setLoc(e.target.value)} /></L>
        <Invite email={rec.contactEmail} checked={invite} onChange={setInvite} text="Send a calendar invitation to the family" />
      </div>
      <p className="text-[13px] muted mt-3">The Pastor is invited automatically.</p>
    </Modal>
  );
}

export function ApproveModal({ rec, onDone, onClose }) {
  return (
    <Modal title="Approve for Baptism" okText="Approve" onClose={onClose} onOk={async () => { onDone(await api.approve(rec.id)); toast("Approved — Secretary notified"); }}>
      <p className="text-[15px]">Approve <b>{rec.childName}</b> for baptism? The Secretary will be emailed to schedule the date.</p>
      <p className="text-[13px] muted mt-3">Checklist {rec.progress.done}/{rec.progress.total} · Parents married in Church: {rec.parentsMarriage || "—"}</p>
    </Modal>
  );
}

export function BaptismModal({ rec, boot, onDone, onClose }) {
  const d = boot.defaults;
  const [start, setStart] = useState((rec.baptismAt || (rec.proposedDate ? `${rec.proposedDate.slice(0, 10)}T11:00` : nextWeekday10())).slice(0, 16));
  const [minutes, setMinutes] = useState(d.baptismMinutes);
  const [loc, setLoc] = useState(rec.baptismLocation || d.baptismLocation);
  const [celebrant, setCelebrant] = useState(rec.celebrant || boot.pastors[0] || "");
  const [invite, setInvite] = useState(!!rec.contactEmail);
  return (
    <Modal title="Schedule the baptism" okText="Save to Google Calendar" okClass="btn btn-dark" onClose={onClose}
      onOk={async () => { onDone(await api.scheduleBaptism(rec.id, start, minutes, loc, celebrant, invite)); toast("Baptism on the calendar"); }}>
      <div className="grid sm:grid-cols-2 gap-4">
        <L label="Date & time" wide><input className="input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></L>
        <L label="Minutes"><input className="input" type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></L>
        <L label="Location"><input className="input" value={loc} onChange={(e) => setLoc(e.target.value)} /></L>
        <L label="Celebrant" wide>
          <input className="input" list="pastor-list" value={celebrant} onChange={(e) => setCelebrant(e.target.value)} />
          <datalist id="pastor-list">{boot.pastors.map((p) => <option key={p} value={p} />)}</datalist>
        </L>
        <Invite email={rec.contactEmail} checked={invite} onChange={setInvite} text="Invite the family" />
      </div>
    </Modal>
  );
}

export function CompleteModal({ rec, onDone, onClose }) {
  const [date, setDate] = useState((rec.baptismAt || "").slice(0, 10));
  const [minister, setMinister] = useState(rec.celebrant || "");
  return (
    <Modal title="Mark baptism completed" okText="Complete & send to Registrar" onClose={onClose} onOk={async () => {
      if (!date || !minister) throw new Error("Date and minister are required.");
      const pdf = await (await import("../fillBaptismForm.js")).buildBaptismPdf({ ...rec, actualDate: date, minister });
      onDone(await api.completeBaptism(rec.id, date, minister, pdf));
      toast("Sent to the Registrar");
    }}>
      <div className="grid sm:grid-cols-2 gap-4">
        <L label="Actual date of baptism"><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></L>
        <L label="Name of minister"><input className="input" value={minister} onChange={(e) => setMinister(e.target.value)} /></L>
      </div>
      <p className="text-[13px] muted mt-3">This fills in the Baptism Form PDF and emails it, with a register summary, to the Sacrament Registrar.</p>
    </Modal>
  );
}

export function RegisterModal({ rec, onDone, onClose }) {
  const [b, setB] = useState(rec.regBook);
  const [p, setP] = useState(rec.regPage);
  const [n, setN] = useState(rec.regNumber);
  return (
    <Modal title="Recorded in the Baptismal Register" onClose={onClose} onOk={async () => {
      if (!b || !p || !n) throw new Error("Book, page and entry number are all required.");
      onDone(await api.recordInRegister(rec.id, b, p, n));
    }}>
      <div className="grid grid-cols-3 gap-4">
        <L label="Book"><input className="input" value={b} onChange={(e) => setB(e.target.value)} /></L>
        <L label="Page"><input className="input" value={p} onChange={(e) => setP(e.target.value)} /></L>
        <L label="Entry no."><input className="input" value={n} onChange={(e) => setN(e.target.value)} /></L>
      </div>
    </Modal>
  );
}

export function ArchiveModal({ rec, onDone, onClose }) {
  const [why, setWhy] = useState("");
  return (
    <Modal title="Archive record" okText="Archive" okClass="btn btn-dark" onClose={onClose} onOk={async () => onDone(await api.archive(rec.id, why))}>
      <L label="Reason (required)"><input className="input" value={why} placeholder="e.g. Family moved to another parish" onChange={(e) => setWhy(e.target.value)} /></L>
    </Modal>
  );
}
