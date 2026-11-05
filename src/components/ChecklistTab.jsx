import React, { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { api } from "../api.js";
import { can, fileToBase64, fmtDate } from "../helpers.js";
import { toast } from "../toast.js";
import { ProgressBar } from "./Shared.jsx";

const STATES = [["verified", "Verified", "#6B7F73"], ["waived", "Waived", "#A8763E"], ["", "Missing", "#2B3A42"]];

export default function ChecklistTab({ rec, me, boot, setRec }) {
  const readOnly = !!rec.recordedAt || !can(me, ["Secretary", "Pastor"]);
  const items = boot.checklist.filter((c) => rec.progress.keys.includes(c.key));
  const groups = [...new Set(items.map((c) => c.group))];
  const gpLabel = (n) => {
    const name = rec[`gp${n}Name`];
    return name ? `${name}${rec[`gp${n}Role`] === "Christian witness" ? " — Christian witness" : ""}` : "";
  };
  const sub = { "Godparent 1": gpLabel(1), "Godparent 2": gpLabel(2) };

  return (
    <>
      <div className="mb-5"><ProgressBar done={rec.progress.done} total={rec.progress.total} height={8} /></div>
      {!rec.gp1Name && !rec.gp2Name && (
        <div className="rounded-xl px-4 py-3 mb-5 text-[14px]" style={{ background: "#F5E3E3", color: "#8B3A3A" }}>
          No godparent recorded yet. Add at least one on the Baptism Form tab.
        </div>
      )}
      {groups.map((g) => (
        <div key={g} className="mb-6">
          <div className="eyebrow">{g}{sub[g] && <span className="normal-case tracking-normal"> · {sub[g]}</span>}</div>
          <div className="panel !p-0 divide-y" style={{ borderColor: "#E4DDD0" }}>
            {items.filter((c) => c.group === g).map((c) => (
              <ChecklistRow key={c.key} item={c} value={rec.checklist[c.key]} readOnly={readOnly} recId={rec.id} progress={rec.progress} setRec={setRec} />
            ))}
          </div>
        </div>
      ))}
      <p className="text-[13px] muted">When every item is Verified or Waived, the Pastor is emailed automatically.</p>
    </>
  );
}

function ChecklistRow({ item, value, readOnly, recId, progress, setRec }) {
  const v = value || {};
  const [note, setNote] = useState(v.note || "");
  const [busy, setBusy] = useState(false);
  useEffect(() => setNote(v.note || ""), [v.note]);

  const setState = async (state) => {
    setBusy(true);
    try {
      const r = await api.setChecklist(recId, item.key, state, note);
      const wasIncomplete = progress.done < progress.total;
      setRec(r);
      if (wasIncomplete && r.progress.done === r.progress.total) toast("Checklist complete — Pastor notified");
    } catch (e) { toast(e, true); } finally { setBusy(false); }
  };

  const upload = () => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "image/*,application/pdf";
    inp.onchange = async () => {
      const f = inp.files[0];
      if (!f) return;
      if (f.size > 20 * 1024 * 1024) return toast("Please keep files under 20 MB.", true);
      try {
        toast(`Uploading ${f.name}…`);
        setRec(await api.uploadDocument(recId, f.name, f.type || "application/octet-stream", await fileToBase64(f), item.key));
        toast("Uploaded");
      } catch (e) { toast(e, true); }
    };
    inp.click();
  };

  return (
    <div className="grid gap-3 items-center px-4 py-3 md:grid-cols-[1.4fr_auto_1.2fr_auto]">
      <div>
        <div className="text-[15px]">{item.label}</div>
        {v.state && <div className="text-[12px] muted">{v.state === "waived" ? "Waived" : "Verified"} by {v.by} · {fmtDate(v.date)}</div>}
      </div>
      <div className="inline-flex rounded-lg border overflow-hidden w-fit" style={{ borderColor: "#E4DDD0" }}>
        {STATES.map(([s, label, color], i) => {
          const on = (v.state || "") === s;
          return (
            <button key={label} disabled={readOnly || busy} onClick={() => !on && setState(s)}
              className="px-3 py-1.5 text-[13px] disabled:cursor-not-allowed"
              style={{ background: on ? color : "#fff", color: on ? "#fff" : "#2B3A42", borderLeft: i ? "1px solid #E4DDD0" : "none" }}>
              {label}
            </button>
          );
        })}
      </div>
      <input className="input !py-1.5 text-[14px]" placeholder="Note (required to waive)" value={note} disabled={readOnly} onChange={(e) => setNote(e.target.value)} />
      {readOnly ? <span /> : <button className="btn-link" onClick={upload} title="Upload a scan for this item"><Upload size={15} /> Upload</button>}
    </div>
  );
}
