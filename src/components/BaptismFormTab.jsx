import React, { useEffect, useState } from "react";
import { FileText, Save } from "lucide-react";
import { api } from "../api.js";
import { can, fmtDate } from "../helpers.js";
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

export default function BaptismFormTab({ rec, me, setRec }) {
  const pick = (r) => Object.fromEntries(KEYS.map((k) => [k, r[k] || ""]));
  const [form, setForm] = useState(() => pick(rec));
  useEffect(() => setForm(pick(rec)), [rec.updatedAt]);
  const readOnly = !!rec.recordedAt || !can(me, ["Secretary", "Pastor"]);
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
    <div className="panel">
      {SECTIONS.map(([title, fields], i) => (
        <div key={title} className={i ? "mt-7" : ""}>
          <div className="eyebrow">{title}</div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{fields.map(input)}</div>
        </div>
      ))}
      <div className="flex items-center gap-3 flex-wrap mt-8 pt-5 border-t" style={{ borderColor: "#E4DDD0" }}>
        {!readOnly && (
          <AsyncButton className="btn btn-primary" disabled={!dirty} onClick={async () => { await save(); toast("Saved"); }}>
            <Save size={16} /> {me.role === "Pastor" ? "Save interview" : "Save"}
          </AsyncButton>
        )}
        <AsyncButton className="btn" onClick={async () => {
          if (readOnly && rec.formPdfUrl) return window.open(rec.formPdfUrl, "_blank");
          const tab = window.open("", "_blank");            // open now so pop-up blockers allow it
          const r = readOnly ? rec : await save();
          const url = await api.saveFormPdf(r.id, await (await import("../fillBaptismForm.js")).buildBaptismPdf(r));
          setRec(await api.getRecord(r.id));
          if (tab) tab.location = url; else window.open(url, "_blank");
        }}>
          <FileText size={16} /> {readOnly ? "Open Baptism Form PDF" : "Save & generate Baptism Form PDF"}
        </AsyncButton>
        {rec.formPdfUrl && <a href={rec.formPdfUrl} target="_blank" rel="noreferrer" className="text-[13px]" style={{ color: "#A8763E" }}>Last saved PDF</a>}
        <span className="flex-1" />
        {rec.interviewSavedAt && <span className="text-[13px] muted">Interview saved {fmtDate(rec.interviewSavedAt)} by {rec.interviewSavedBy}</span>}
      </div>
    </div>
  );
}
