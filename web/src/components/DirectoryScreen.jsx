import React, { useMemo, useState } from "react";
import { Plus, Search, RefreshCw, Calendar } from "lucide-react";
import { api } from "../api.js";
import { can, fmtDate, fmtDateTime, isDone, needsMe } from "../helpers.js";
import { Modal, ProgressBar, StatusPill } from "./Shared.jsx";

const TABS = [
  ["active", "In Progress"],
  ["mine", "Needs my action"],
  ["done", "Completed"],
  ["archived", "Archived"],
  ["all", "All"],
];

export default function DirectoryScreen({ boot, go, onRefresh }) {
  const [tab, setTab] = useState("active");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const me = boot.me;

  const mineCount = boot.records.filter((r) => needsMe(r, me)).length;
  const records = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return boot.records
      .filter((r) => !needle || `${r.child} ${r.parents} ${r.id}`.toLowerCase().includes(needle))
      .filter((r) => ({
        active: !r.archived && !isDone(r),
        mine: needsMe(r, me),
        done: !r.archived && isDone(r),
        archived: r.archived,
        all: true,
      })[tab])
      .sort((a, b) => {
        const ka = a.baptismAt || a.proposedDate || "9999";
        const kb = b.baptismAt || b.proposedDate || "9999";
        return ka < kb ? -1 : ka > kb ? 1 : a.createdAt < b.createdAt ? 1 : -1;
      });
  }, [boot.records, q, tab, me]);

  return (
    <>
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="serif text-[30px] sm:text-[36px] flex-1">Baptism Preparation</h1>
        {can(me, ["Secretary", "Pastor"]) && (
          <button className="btn btn-primary text-[15px] px-5 py-3" onClick={() => setCreating(true)}><Plus size={18} /> New record</button>
        )}
      </div>

      <div className="flex items-end gap-4 flex-wrap border-b mt-6 mb-6" style={{ borderColor: "#E4DDD0" }}>
        <div className="flex gap-6 flex-1 overflow-x-auto">
          {TABS.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className="pb-3 text-[15px] whitespace-nowrap border-b-2"
              style={{ borderColor: tab === k ? "#A8763E" : "transparent", color: tab === k ? "#2B3A42" : "#8A8378" }}>
              {label}{k === "mine" && mineCount ? ` (${mineCount})` : ""}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pb-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 muted" />
            <input className="input pl-9" placeholder="Search child, parents, ID" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn-link" title="Refresh" onClick={onRefresh}><RefreshCw size={16} /></button>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="panel muted text-center py-12">Nothing here.</div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {records.map((r) => <RecordCard key={r.id} r={r} onOpen={() => go(`/records/${encodeURIComponent(r.id)}`)} />)}
        </div>
      )}

      {creating && <NewRecordModal onClose={() => setCreating(false)} onCreated={(id) => { onRefresh(); go(`/records/${encodeURIComponent(id)}`); }} />}
    </>
  );
}

function RecordCard({ r, onOpen }) {
  const when = r.actualDate ? `Baptized ${fmtDate(r.actualDate)}`
    : r.baptismAt ? fmtDateTime(r.baptismAt)
    : r.proposedDate ? `Preferred ${fmtDate(r.proposedDate)}` : "—";
  return (
    <button onClick={onOpen} className="panel text-left hover:border-[#A8763E] transition-colors !p-5 flex flex-col">
      <StatusPill status={r.status} />
      <div className="serif text-[21px] leading-snug mt-2">{r.child}</div>
      <div className="flex items-center gap-2 mt-3 text-[15px]"><Calendar size={16} style={{ color: "#A8763E" }} />{when}</div>
      <div className="text-[13px] muted mt-3 leading-relaxed flex-1">
        {r.parents && <div><b className="font-medium" style={{ color: "#6E675C" }}>Parents:</b> {r.parents}</div>}
        {r.interviewAt && !r.baptismAt && <div>Interview: {fmtDateTime(r.interviewAt)}</div>}
        <div>Checklist {r.done} / {r.total}</div>
      </div>
      <div className="mt-3"><ProgressBar done={r.done} total={r.total} /></div>
    </button>
  );
}

function NewRecordModal({ onClose, onCreated }) {
  const [f, setF] = useState({ childFirst: "", childLast: "", contactName: "", contactPhone: "", contactEmail: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title="New baptism record" okText="Create" onClose={onClose} onOk={async () => {
      if (!f.childFirst || !f.childLast) throw new Error("Child's first name and surname are required.");
      onCreated(await api.createRecord(f));
    }}>
      <div className="grid sm:grid-cols-2 gap-4">
        <label><span className="label">Child first name</span><input className="input" value={f.childFirst} onChange={set("childFirst")} /></label>
        <label><span className="label">Child surname(s)</span><input className="input" value={f.childLast} onChange={set("childLast")} /></label>
        <label><span className="label">Contact name</span><input className="input" value={f.contactName} onChange={set("contactName")} /></label>
        <label><span className="label">Contact phone</span><input className="input" value={f.contactPhone} onChange={set("contactPhone")} /></label>
        <label className="sm:col-span-2"><span className="label">Contact email</span><input className="input" type="email" value={f.contactEmail} onChange={set("contactEmail")} /></label>
      </div>
      <p className="text-[13px] muted mt-4">For phone or walk-in inquiries. Online requests arrive on their own from the parent form.</p>
    </Modal>
  );
}
