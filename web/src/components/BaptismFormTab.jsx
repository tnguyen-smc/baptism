import React, { useEffect, useState } from "react";
import { FileText, Save, CalendarCheck, X } from "lucide-react";
import { api } from "../api.js";
import { fmtDate, fmtDateTime, nextWeekday10 } from "../helpers.js";
import { toast } from "../toast.js";
import { AsyncButton, Field } from "./Shared.jsx";

// Laid out in the same order as the paper parish Baptism Form.
// [key, label, type, options, wide]
const SECTIONS = [
  ["Child", [["childFirst", "First name"], ["childMiddle", "Middle name"], ["childLast", "Surname(s)"],
    ["childSex", "Sex", "select", ["", "M", "F"]], ["childDob", "Date of birth", "date"],
    ["birthCity", "Place of birth — city"], ["birthState", "Place of birth — state"]]],
  ["Home & contact", [["address", "Home address", "text", null, true], ["city", "City"], ["state", "State"], ["zip", "ZIP"],
    ["contactName", "Contact name"], ["contactPhone", "Phone"], ["contactEmail", "Email"], ["language", "Language", "select", ["English", "Español"]]]],
  ["Father", [["fatherName", "Name of father", "text", null, true], ["fatherReligion", "Religion", "select", ["", "Catholic", "Other"]],
    ["fatherPracticing", "Practicing", "select", ["", "Yes", "No"]], ["fatherPrepDate", "Baptism prep — date", "date"], ["fatherPrepPlace", "Baptism prep — parish"]]],
  ["Mother", [["motherName", "Name of mother (maiden name)", "text", null, true], ["motherReligion", "Religion", "select", ["", "Catholic", "Other"]],
    ["motherPracticing", "Practicing", "select", ["", "Yes", "No"]], ["motherPrepDate", "Baptism prep — date", "date"], ["motherPrepPlace", "Baptism prep — parish"]]],
  ["Parents", [["parentsMarriage", "Married by the Catholic Church?", "select", ["", "Yes", "No", "Civil"]]]],
  ["God-father (sponsor 1)", [["gp1Name", "Name of god-father", "text", null, true], ["gp1Role", "Role", "select", ["", "Godparent", "Christian witness"]],
    ["gp1Parish", "Parish"], ["gp1Marital", "Married by the Catholic Church?", "select", ["", "Yes", "No", "Single"]],
    ["gp1PrepDate", "Baptism prep — date", "date"], ["gp1PrepPlace", "Baptism prep — parish"]]],
  ["God-mother (sponsor 2)", [["gp2Name", "Name of god-mother", "text", null, true], ["gp2Role", "Role", "select", ["", "Godparent", "Christian witness"]],
    ["gp2Parish", "Parish"], ["gp2Marital", "Married by the Catholic Church?", "select", ["", "Yes", "No", "Single"]],
    ["gp2PrepDate", "Baptism prep — date", "date"], ["gp2PrepPlace", "Baptism prep — parish"]]],
  ["Dates & notes", [["proposedDate", "Proposed date of baptism", "date"], ["homeBaptized", "Already baptized at home?", "select", ["", "Yes", "No"]],
    ["adopted", "Adopted?", "select", ["", "Yes", "No"]],
    ["formNotes1", "Notes — line 1 (prints on form)", "text", null, true], ["formNotes2", "Notes — line 2 (prints on form)", "text", null, true],
    ["privateNotes", "Pastor’s private interview notes (never printed)", "area", null, true],
    ["intakeComments", "Comments from the family’s intake form", "area", null, true]]],
];
const KEYS = SECTIONS.flatMap(([, fs]) => fs.map((f) => f[0]));

export default function BaptismFormTab({ rec, me, setRec, onPdfSaved }) {
  const pick = (r) => Object.fromEntries(KEYS.map((k) => [k, r[k] || ""]));
  const [form, setForm] = useState(() => pick(rec));
  useEffect(() => setForm(pick(rec)), [rec.updatedAt]);
  const readOnly = false; // every staff member may edit every section
  const dirty = KEYS.some((k) => (form[k] || "") !== (rec[k] || ""));

  const save = async () => { const r = await api.saveForm(rec.id, form); setRec(r); return r; };

  const input = ([k, label, type = "text", opts, wide]) => {
    const common = { className: "input", value: type === "date" ? String(form[k]).slice(0, 10) : form[k], disabled: readOnly,
      onChange: (e) => setForm({ ...form, [k]: e.target.value }) };
    return (
      <Field key={k} label={label} wide={wide}>
        {type === "select" ? <select {...common}>{opts.map((o) => <option key={o} value={o}>{o || "—"}</option>)}</select>
          : type === "area" ? <textarea rows={3} {...common} />
          : <input type={type} {...common} />}
      </Field>
    );
  };

  return (
    <>
    <div className="panel">
      {SECTIONS.map(([title, fields], i) => (
        <div key={title} className={i ? "mt-7" : ""}>
          <div className="eyebrow">{title}</div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{fields.map(input)}</div>
        </div>
      ))}
      <div className="flex items-center gap-3 flex-wrap mt-8 pt-5 border-t" style={{ borderColor: "var(--line)" }}>
        {!readOnly && (
          <AsyncButton className="btn btn-primary" disabled={!dirty} onClick={async () => { await save(); toast("Saved"); }}>
            <Save size={16} /> {me.role === "Pastor" ? "Save interview" : "Save"}
          </AsyncButton>
        )}
        <AsyncButton className="btn" onClick={async () => {
          if (readOnly && rec.formPdfUrl) return window.open(rec.formPdfUrl, "_blank");
          const tab = window.open("", "_blank");            // open now so pop-up blockers allow it
          // Fill the PDF in the browser from what is on screen and show it right away…
          const { buildBaptismPdf, pdfBlobUrl } = await import("../fillBaptismForm.js");
          const b64 = await buildBaptismPdf({ ...rec, ...form });
          const url = pdfBlobUrl(b64);
          if (tab) tab.location = url; else window.open(url, "_blank");
          if (readOnly) return;
          // …then save the fields and the PDF to Drive in ONE request.
          setRec(await api.saveFormWithPdf(rec.id, form, b64));
          onPdfSaved?.();
          toast("Form and PDF saved to Drive");
        }}>
          <FileText size={16} /> {readOnly ? "Open Baptism Form PDF" : "Save & generate Baptism Form PDF"}
        </AsyncButton>
        {rec.formPdfUrl && <a href={rec.formPdfUrl} target="_blank" rel="noreferrer" className="text-[13px]" style={{ color: "var(--accent)" }}>Last saved PDF</a>}
        <span className="flex-1" />
        {rec.interviewSavedAt && <span className="text-[13px] muted">Form saved {fmtDate(rec.interviewSavedAt)} by {rec.interviewSavedBy}</span>}
      </div>
    </div>
    <InterviewNote rec={rec} setRec={setRec} />
    </>
  );
}

/**
 * The Secretary books the interview herself (phone, her own calendar) and records it here.
 * No calendar event is created by the app.
 */
function InterviewNote({ rec, setRec }) {
  const [when, setWhen] = useState(rec.interviewAt ? rec.interviewAt.slice(0, 16) : "");
  const [editing, setEditing] = useState(!rec.interviewAt);
  useEffect(() => { setWhen(rec.interviewAt ? rec.interviewAt.slice(0, 16) : ""); setEditing(!rec.interviewAt); }, [rec.interviewAt]);

  return (
    <div className="panel mt-5">
      <div className="flex items-center gap-3 flex-wrap">
        <CalendarCheck size={20} className="accent" />
        <div className="flex-1 min-w-[200px]">
          <div className="text-[15px] font-semibold">Interview with the Pastor</div>
          <div className="text-[13px] muted">
            {rec.interviewAt && !editing ? <>Scheduled for <b style={{ color: "var(--ink)" }}>{fmtDateTime(rec.interviewAt)}</b></> : "Book it as usual, then note the date and time here."}
          </div>
        </div>
        {rec.interviewAt && !editing ? (
          <>
            <button className="btn" onClick={() => setEditing(true)}>Change</button>
            <AsyncButton className="btn-link" onClick={async () => { setRec(await api.setInterview(rec.id, "")); toast("Interview note cleared"); }}><X size={15} /> Clear</AsyncButton>
          </>
        ) : (
          <>
            <input className="input !w-auto" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} onFocus={() => !when && setWhen(nextWeekday10())} />
            <AsyncButton className="btn btn-primary" onClick={async () => {
              if (!when) throw new Error("Pick the interview date and time.");
              setRec(await api.setInterview(rec.id, when)); toast("Interview marked as scheduled");
            }}><CalendarCheck size={16} /> Mark interview scheduled</AsyncButton>
            {rec.interviewAt && <button className="btn-link" onClick={() => setEditing(false)}>Cancel</button>}
          </>
        )}
      </div>
    </div>
  );
}
