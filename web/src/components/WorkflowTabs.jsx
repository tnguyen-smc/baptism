import React, { useEffect, useState } from "react";
import { CalendarPlus, CheckCircle2, Mail, Undo2 } from "lucide-react";
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

/**
 * Opens a new Gmail message (in the signed-in account) to the Registrar, cc the Pastor(s),
 * with links to the filled Baptism Form and the child's Drive folder. Gmail drafts cannot carry
 * attachments from a link, so the PDF is linked rather than attached.
 */
function gmailComposeUrl({ me, to, cc, rec, date, minister }) {
  const join = (...xs) => xs.filter(Boolean).join(" & ");
  const subject = `Completed Baptism Documents for ${rec.childName}`;
  const body = [
    "Dear Registrar,",
    "",
    `The baptism of ${rec.childName} was celebrated on ${fmtDate(date)} by ${minister}. Please enter it in the Baptismal Register.`,
    "",
    rec.formPdfUrl && `Baptism Form (PDF): ${rec.formPdfUrl}`,
    rec.folderUrl && `All documents: ${rec.folderUrl}`,
    "",
    `Child: ${rec.childName}`,
    `Date of birth: ${fmtDate(rec.childDob)}${rec.birthCity ? ` · ${[rec.birthCity, rec.birthState].filter(Boolean).join(", ")}` : ""}`,
    `Parents: ${join(rec.fatherName, rec.motherName) || "—"}`,
    `Godparents: ${join(rec.gp1Name, rec.gp2Name) || "—"}`,
    rec.homeBaptized === "Yes" && "Note: the child was already baptized at home (emergency).",
    rec.adopted === "Yes" && "Note: the child is adopted.",
    "",
    "Thank you,",
    me.name,
  ].filter((x) => x !== false && x !== undefined && x !== null).join("\n");
  const q = [
    ["view", "cm"], ["fs", "1"], ["to", to], ["cc", cc.filter((e) => e && e !== to).join(",")],
    ["su", subject], ["body", body], ["authuser", me.email],
  ].map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  return `https://mail.google.com/mail/?${q}`;
}

/** Steps 4–5: approval, baptism date, completion. Always visible and editable. */
export function ApprovalBaptismTab({ rec, me, boot, setRec, onCompleted, onOpenSettings }) {
  const [modal, setModal] = useState(null);
  const [date, setDate] = useState((rec.actualDate || rec.baptismAt || "").slice(0, 10));
  const [minister, setMinister] = useState(rec.minister || rec.celebrant || "");
  const [registrar, setRegistrar] = useState(boot.registrarEmail || "");
  useEffect(() => {
    setDate((rec.actualDate || rec.baptismAt || "").slice(0, 10));
    setMinister(rec.minister || rec.celebrant || "");
  }, [rec.updatedAt]);
  const p = rec.progress;
  const unchanged = rec.completedAt && date === (rec.actualDate || "").slice(0, 10) && minister === rec.minister;

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
        <p className="text-[13px] muted mt-2">Choose from the parish's regular baptism times (set in Settings), or another time if needed. Creates or moves the Google Calendar event.</p>
      </Step>

      <Step n="3" title="Baptism celebrated" done={!!rec.completedAt}>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block"><span className="label">Actual date of baptism</span><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="block"><span className="label">Name of minister</span>
            <input className="input" list="minister-list" value={minister} onChange={(e) => setMinister(e.target.value)} />
            <datalist id="minister-list">{boot.pastors.map((n) => <option key={n} value={n} />)}</datalist>
          </label>
          <label className="block sm:col-span-2"><span className="label">Registrar email</span>
            <input className="input" type="email" value={registrar} placeholder="registrar@…" onChange={(e) => setRegistrar(e.target.value)} />
          </label>
        </div>
        <div className="flex items-center gap-3 flex-wrap mt-4">
          <AsyncButton className="btn btn-primary" onClick={async () => {
            if (!date || !minister) throw new Error("Date and minister are required.");
            if (!/^\S+@\S+\.\S+$/.test(registrar)) throw new Error("Enter the Registrar's email address.");
            const tab = window.open("", "_blank");             // open now so the pop-up blocker allows it
            try {
              let r = rec;
              if (!unchanged) {
                const { buildBaptismPdf } = await import("../fillBaptismForm.js");
                const pdf = await buildBaptismPdf({ ...rec, actualDate: date, minister });
                r = await api.completeBaptism(rec.id, date, minister, pdf);   // saves date, minister and final PDF to Drive
                setRec(r); onCompleted?.(r);
              }
              const url = gmailComposeUrl({ me, to: registrar, cc: boot.pastorEmails || [], rec: r, date, minister });
              if (tab) tab.location = url; else window.open(url, "_blank");
              toast("Gmail opened — review and click Send");
            } catch (e) { tab?.close(); throw e; }
          }}><Mail size={16} /> {unchanged ? "Open Registrar email again" : "Complete & email Registrar"}</AsyncButton>
        </div>
        <p className="text-[13px] muted mt-3">
          Saves the final Baptism Form PDF to Drive, then opens a new Gmail message to the Registrar (cc the Pastor) with the subject
          “Completed Baptism Documents for {rec.childName}” and links to the form and all documents.
          {rec.completedAt && ` Completed ${fmtDate(rec.completedAt)}.`}
        </p>
      </Step>

      {modal === "approve" && <ApproveModal rec={rec} me={me} onDone={setRec} onClose={() => setModal(null)} />}
      {modal === "baptism" && <BaptismModal rec={rec} boot={boot} onDone={setRec} onClose={() => setModal(null)} onOpenSettings={onOpenSettings} />}
    </>
  );
}