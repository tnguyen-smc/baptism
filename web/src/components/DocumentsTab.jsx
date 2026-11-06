import React from "react";
import { FileText, FolderOpen, Upload } from "lucide-react";
import { api } from "../api.js";
import { fileToBase64, fmtDate, fmtDateTime } from "../helpers.js";
import { toast } from "../toast.js";

export function DocumentsTab({ rec, docs, setRec, onUploaded }) {
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
        setRec(await api.uploadDocument(rec.id, f.name, f.type || "application/octet-stream", await fileToBase64(f), ""));
        onUploaded?.();
        toast("Uploaded");
      } catch (e) { toast(e, true); }
    };
    inp.click();
  };
  return (
    <div className="panel">
      {docs === null && <div className="muted">Loading files from Drive…</div>}
      {docs?.length === 0 && <div className="muted">No documents yet.</div>}
      {(docs || []).map((d) => (
        <a key={d.id} href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-3 border-t first:border-t-0" style={{ borderColor: "var(--line)" }}>
          <FileText size={18} style={{ color: "var(--accent)" }} />
          <span className="flex-1">{d.name}</span>
          <span className="text-[13px] muted">{fmtDate(d.updated)}</span>
        </a>
      ))}
      <div className="flex gap-3 mt-5 flex-wrap">
        <button className="btn" onClick={upload}><Upload size={16} /> Upload document</button>
        {rec.folderUrl && <a className="btn" href={rec.folderUrl} target="_blank" rel="noreferrer"><FolderOpen size={16} /> Open Drive folder</a>}
      </div>
    </div>
  );
}

export function ActivityTab({ rec }) {
  return (
    <div className="panel !p-0 overflow-x-auto">
      <table className="w-full text-[14px]">
        <tbody>
          {rec.log.map((l, i) => (
            <tr key={i} className="border-t first:border-t-0" style={{ borderColor: "var(--line)" }}>
              <td className="px-4 py-2.5 whitespace-nowrap muted">{fmtDateTime(l.at)}</td>
              <td className="px-4 py-2.5">{l.what}</td>
              <td className="px-4 py-2.5 muted">{l.by}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
