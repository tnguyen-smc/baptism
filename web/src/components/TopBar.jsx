import React from "react";
import { LogOut, Link2, Settings } from "lucide-react";
import logo from "../assets/St_Mary_Black.png";
import { toast } from "../toast.js";

export default function TopBar({ parish, me, formUrl, onHome, onSettings, onSignOut }) {
  const copyForm = () => {
    if (!formUrl) return toast("No parent form yet — run setup() in Apps Script.", true);
    navigator.clipboard.writeText(formUrl).then(() => toast("Parent form link copied"), () => window.prompt("Copy this link:", formUrl));
  };
  return (
    <div className="flex items-center justify-between px-5 sm:px-8 py-4 border-b" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <button onClick={onHome} className="flex items-center gap-3 text-left">
        <img src={logo} alt="" className="w-9 h-9 object-contain" />
        <div>
          <div className="serif text-[15px] leading-tight">{parish || "St. Mary Catholic Church"}</div>
          <div className="text-[11px] tracking-wide muted">Baptism Preparation</div>
        </div>
      </button>
      <div className="flex items-center gap-1">
        <span className="hidden md:inline text-[13px] muted mr-2">{me?.name} · {me?.role}</span>
        <button className="btn-link" onClick={copyForm}><Link2 size={16} /><span className="hidden sm:inline">Parent form link</span></button>
        <button className="btn-link" onClick={onSettings}><Settings size={16} /><span className="hidden sm:inline">Settings</span></button>
        <button className="btn-link" onClick={onSignOut}><LogOut size={16} /><span>Log Out</span></button>
      </div>
    </div>
  );
}