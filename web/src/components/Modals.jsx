import React, { useState } from "react";
import { api } from "../api.js";
import { nextWeekday10 } from "../helpers.js";
import { toast } from "../toast.js";
import { Modal } from "./Shared.jsx";

const L = ({ label, children, wide }) => (
  <label className={wide ? "sm:col-span-2" : ""}><span className="label">{label}</span>{children}</label>
);

export function ApproveModal({ rec, me, onDone, onClose }) {
  const open = rec.progress.total - rec.progress.done;
  return (
    <Modal title="Approve for Baptism" okText="Approve" onClose={onClose} onOk={async () => { onDone(await api.approve(rec.id)); toast("Approved — Secretary notified"); }}>
      <p className="text-[15px]">Approve <b>{rec.childName}</b> for baptism? The Secretary will be emailed to schedule the date.</p>
      {open > 0 && (
        <p className="text-[14px] mt-3 rounded-lg px-3 py-2" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
          {open} checklist item{open > 1 ? "s are" : " is"} still open. You can approve anyway; this is noted in the activity log.
        </p>
      )}
      <p className="text-[13px] muted mt-3">Approving as {me.name} ({me.role}) · Parents married in Church: {rec.parentsMarriage || "—"}</p>
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
        <label className="sm:col-span-2 flex items-center gap-2 text-[14px]">
          <input type="checkbox" checked={invite} disabled={!rec.contactEmail} onChange={(e) => setInvite(e.target.checked)} />
          Invite the family ({rec.contactEmail || "no email on file"})
        </label>
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
