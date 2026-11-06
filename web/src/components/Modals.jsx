import React, { useMemo, useState } from "react";
import { api } from "../api.js";
import { upcomingSlots } from "../helpers.js";
import { toast } from "../toast.js";
import { DateTime15, Modal } from "./Shared.jsx";

const L = ({ label, children, wide }) => (
  <label className={wide ? "sm:col-span-2" : "block"}><span className="label">{label}</span>{children}</label>
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

/**
 * Pick one of the parish's regular baptism times (Settings), or — rarely — any other date and time.
 */
export function BaptismModal({ rec, boot, onDone, onClose, onOpenSettings }) {
  const d = boot.defaults;
  const slots = useMemo(() => upcomingSlots(boot.baptismTimes || []), [boot.baptismTimes]);
  const current = (rec.baptismAt || "").slice(0, 16);
  const preferred = (rec.proposedDate || "").slice(0, 10);
  const firstOnPreferred = slots.find((s) => s.value.startsWith(preferred))?.value;

  const [mode, setMode] = useState(!slots.length || (current && !slots.some((s) => s.value === current)) ? "other" : "slot");
  const [slot, setSlot] = useState(slots.some((s) => s.value === current) ? current : firstOnPreferred || "");
  const [other, setOther] = useState(current);
  const [minutes, setMinutes] = useState(d.baptismMinutes);
  const [loc, setLoc] = useState(rec.baptismLocation || d.baptismLocation);
  const [celebrant, setCelebrant] = useState(rec.celebrant || boot.pastors[0] || "");
  const [invite, setInvite] = useState(!!rec.contactEmail);
  const start = mode === "slot" ? slot : other;

  return (
    <Modal title="Schedule the baptism" okText="Save to Google Calendar" okClass="btn btn-dark" onClose={onClose}
      onOk={async () => {
        if (!start) throw new Error(mode === "slot" ? "Choose a baptism time." : "Choose a date and time.");
        onDone(await api.scheduleBaptism(rec.id, start, minutes, loc, celebrant, invite)); toast("Baptism on the calendar");
      }}>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          {mode === "slot" ? (
            <>
              <span className="label">Baptism time</span>
              <select className="input" value={slot} onChange={(e) => setSlot(e.target.value)}>
                <option value="">Choose a date…</option>
                {slots.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}{preferred && s.value.startsWith(preferred) ? "  ★ preferred" : ""}</option>
                ))}
              </select>
              <button type="button" className="text-[13px] mt-2 underline accent" onClick={() => { setMode("other"); if (!other) setOther(slot); }}>
                Use a different date or time
              </button>
            </>
          ) : (
            <>
              <span className="label">Date &amp; time (outside the regular baptism times)</span>
              <DateTime15 value={other} onChange={setOther} />
              {slots.length > 0 ? (
                <button type="button" className="text-[13px] mt-2 underline accent" onClick={() => setMode("slot")}>Back to regular baptism times</button>
              ) : (
                <p className="text-[13px] muted mt-2">
                  No regular baptism times are set yet.{" "}
                  {onOpenSettings && <button type="button" className="underline accent" onClick={onOpenSettings}>Add them in Settings</button>}
                </p>
              )}
            </>
          )}
        </div>
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