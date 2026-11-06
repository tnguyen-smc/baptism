import React, { useEffect, useRef, useState } from "react";
import logo from "../assets/St_Mary_Black.png";
import { initAuth, renderSignInButton } from "../auth.js";

export default function LoginScreen({ message }) {
  const btn = useRef(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    initAuth().then(() => renderSignInButton(btn.current, { autoPrompt: !message })).catch((e) => setErr(e.message));
  }, [message]);
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--surface)" }}>
      <div className="text-center w-full max-w-sm">
        <img src={logo} alt="St. Mary Catholic Church" className="w-16 h-16 mx-auto mb-6 object-contain" />
        <h1 className="serif text-[28px] mb-2">Baptism Preparation</h1>
        <p className="text-[14px] mb-8 muted">Sign in with your parish Google account.</p>
        {(message || err) && (
          <div className="text-[14px] mb-5 rounded-lg px-4 py-3 text-left" style={{ color: "var(--warn)", background: "var(--warn-soft)" }}>
            <b>Sign-in was refused:</b> {err || message}
          </div>
        )}
        <div ref={btn} className="flex justify-center min-h-[44px]" />
        <p className="text-[12px] mt-6" style={{ color: "var(--faint)" }}>Only staff listed by the parish office can open records.</p>
      </div>
    </div>
  );
}
