export function fmtDate(s) {
  if (!s) return "";
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
export function fmtDateTime(s) {
  if (!s) return "";
  const d = new Date(String(s).slice(0, 16));
  return isNaN(d) ? s : d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}
/** "2026-03-15" → ["03", "15", "2026"] */
export function mdY(s) {
  const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? [m[2], m[3], m[1]] : ["", "", ""];
}
export function localInput(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export function nextWeekday10() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return localInput(d);
}
/** Admin can do everything; otherwise the role must be listed. */
export function can(me, roles) {
  return me?.role === "Admin" || roles.includes(me?.role);
}
const DONE = ["Sent to Registrar", "Recorded in Register"];
export const isDone = (r) => DONE.includes(r.status);

/** Cards that belong in "Needs my action" for the signed-in role. */
export function needsMe(r, me) {
  if (r.archived) return false;
  if (me.role === "Pastor") return r.status === "Awaiting Pastor Approval";
  if (me.role === "Registrar") return r.status === "Sent to Registrar";
  return ["New Inquiry", "Verifying Documents", "Approved — Schedule Baptism"].includes(r.status) ||
    (r.status === "Baptism Scheduled" && r.baptismAt && new Date(r.baptismAt) < new Date());
}
export function fileToBase64(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(",")[1]);
    fr.onerror = () => rej(new Error("Could not read the file."));
    fr.readAsDataURL(file);
  });
}

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "17:30" → "5:30 PM" */
export function fmtTime(hhmm) {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  if (isNaN(h)) return "";
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** Times every 15 minutes between two hours, for <select> lists. */
export function timeOptions(fromHour = 6, toHour = 21) {
  const out = [];
  for (let h = fromHour; h <= toHour; h++) {
    for (const m of [0, 15, 30, 45]) {
      const v = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      out.push({ value: v, label: fmtTime(v) });
    }
  }
  return out;
}

/**
 * Turns the weekly baptism times from Settings into real upcoming dates.
 * times: [{day: 0-6, time: "HH:MM", label}] → [{value: "2026-12-05T10:00", label: "Sat, Dec 5, 2026 · 10:00 AM — …"}]
 */
export function upcomingSlots(times, weeks = 16) {
  if (!times?.length) return [];
  const out = [];
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = 0; i < weeks * 7; i++, d.setDate(d.getDate() + 1)) {
    for (const t of times.filter((x) => Number(x.day) === d.getDay())) {
      const value = `${localInput(d).slice(0, 10)}T${t.time}`;
      if (new Date(value) <= now) continue;
      const day = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
      out.push({ value, label: `${day} · ${fmtTime(t.time)}${t.label ? ` — ${t.label}` : ""}` });
    }
  }
  return out.sort((a, b) => (a.value < b.value ? -1 : 1));
}