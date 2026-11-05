import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { STATUS_COLORS, muted } from "../theme.js";
import { subscribeToasts, toast } from "../toast.js";

export function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || muted;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap" style={{ color: c }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
      {status}
    </span>
  );
}

export function Spinner({ label }) {
  return <div className="flex items-center justify-center py-20 text-[14px] muted">{label || "Loading…"}</div>;
}

export function ProgressBar({ done, total, height = 6 }) {
  const pct = total ? Math.round((100 * done) / total) : 0;
  return (
    <div className="rounded-full overflow-hidden" style={{ height, background: "#E4DDD0" }}>
      <div className="h-full transition-all" style={{ width: `${pct}%`, background: "#6B7F73" }} />
    </div>
  );
}

export function Field({ label, wide, children }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

/** Async button: shows "Working…" and disables itself while the promise runs; errors become toasts. */
export function AsyncButton({ onClick, className = "btn", children, disabled, ...rest }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      {...rest}
      className={className}
      disabled={disabled || busy}
      onClick={async (e) => {
        setBusy(true);
        try { await onClick(e); } catch (err) { toast(err, true); } finally { setBusy(false); }
      }}
    >
      {busy ? "Working…" : children}
    </button>
  );
}

export function Modal({ title, children, okText = "Save", okClass = "btn btn-primary", onOk, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4" style={{ background: "rgba(43,58,66,.35)" }} onMouseDown={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-auto rounded-2xl p-6" style={{ background: "#FAF7F0" }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start mb-4">
          <h3 className="serif text-[22px] flex-1">{title}</h3>
          <button className="btn-link" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {children}
        <div className="flex justify-end gap-2 mt-6">
          <button className="btn" onClick={onClose}>Cancel</button>
          <AsyncButton className={okClass} onClick={async () => { await onOk(); onClose(); }}>{okText}</AsyncButton>
        </div>
      </div>
    </div>
  );
}

export function Toasts() {
  const [items, setItems] = useState([]);
  useEffect(() => subscribeToasts((t) => {
    setItems((xs) => [...xs, t]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), t.isError ? 7000 : 3000);
  }), []);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-2 items-center">
      {items.map((t) => (
        <div key={t.id} className="px-4 py-2.5 rounded-lg text-[14px] text-white shadow-lg max-w-[90vw]" style={{ background: t.isError ? "#8B3A3A" : "#2B3A42" }}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
