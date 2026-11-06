// Hex values for places that need a literal colour (status dots). Keep in step with :root in index.css.
export const accent = "#2F6690";
export const ink = "#1F2D3A";
export const muted = "#6B7785";
export const done = "#3A7D7C";
export const warn = "#9B2C2C";
export const attention = "#B45309";

/** Status → pill colour. Statuses are computed by the backend (Code.gs → evaluate_). */
export const STATUS_COLORS = {
  "New Inquiry": accent,
  "Verifying Documents": accent,
  "Awaiting Pastor Approval": attention,
  "Approved — Schedule Baptism": attention,
  "Baptism Scheduled": done,
  "Sent to Registrar": done,
  "Recorded in Register": muted,
  Archived: muted,
};

export const STEPS = [
  ["New Inquiry", "Intake"],
  ["Verifying Documents", "Interview & verification"],
  ["Awaiting Pastor Approval", "Pastor approval"],
  ["Approved — Schedule Baptism", "Approved"],
  ["Baptism Scheduled", "Baptism scheduled"],
  ["Sent to Registrar", "Completed"],
];