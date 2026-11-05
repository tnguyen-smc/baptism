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
