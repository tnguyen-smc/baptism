import React, { useState } from "react";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { DAYS, fmtTime, timeOptions } from "../helpers.js";
import { toast } from "../toast.js";
import { AsyncButton } from "./Shared.jsx";

/** Parish settings. Today: the weekly times baptisms are normally celebrated (offered when scheduling). */
export default function SettingsScreen({ boot, onBack, onSaved }) {
  const [times, setTimes] = useState(() => (boot.baptismTimes || []).map((t) => ({ ...t })));
  const opts = timeOptions(6, 21);
  const update = (i, patch) => setTimes(times.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  return (
    <>
      <div className="flex items-center gap-3">
        <button className="btn-link" onClick={onBack} aria-label="Back"><ChevronLeft size={22} /></button>
        <h1 className="serif text-[30px] flex-1">Settings</h1>
      </div>

      <div className="panel mt-6">
        <h2 className="text-[17px] font-semibold">Baptism times</h2>
        <p className="text-[14px] muted mt-1 mb-5">
          The weekly times baptisms are normally celebrated, such as Saturday or Sunday Masses. When scheduling a baptism,
          staff pick from the upcoming dates for these times, and can still choose another date or time if needed.
        </p>

        {times.length === 0 && <div className="muted text-[14px] mb-4">No baptism times yet.</div>}
        <div className="space-y-3">
          {times.map((t, i) => (
            <div key={i} className="grid gap-3 items-center sm:grid-cols-[160px_150px_1fr_auto]">
              <select className="input" value={t.day} onChange={(e) => update(i, { day: Number(e.target.value) })}>
                {DAYS.map((d, n) => <option key={d} value={n}>{d}</option>)}
              </select>
              <select className="input" value={t.time} onChange={(e) => update(i, { time: e.target.value })}>
                {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input className="input" placeholder="Label (optional), e.g. Saturday Vigil Mass" value={t.label || ""} onChange={(e) => update(i, { label: e.target.value })} />
              <button className="btn-link" title="Remove" onClick={() => setTimes(times.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap mt-5">
          <button className="btn" onClick={() => setTimes([...times, { day: 6, time: "10:00", label: "" }])}><Plus size={16} /> Add a time</button>
          <span className="flex-1" />
          <AsyncButton className="btn btn-primary" onClick={async () => {
            const saved = await api.saveSettings({ baptismTimes: times });
            setTimes(saved.baptismTimes);
            onSaved(saved);
            toast("Settings saved");
          }}>Save settings</AsyncButton>
        </div>

        {times.length > 0 && (
          <p className="text-[13px] muted mt-4">
            Currently: {times.map((t) => `${DAYS[t.day]} ${fmtTime(t.time)}`).join(" · ")}
          </p>
        )}
      </div>
    </>
  );
}