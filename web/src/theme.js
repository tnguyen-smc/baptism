export const ink = "#2B3A42";
export const parchment = "#FAF7F0";
export const line = "#E4DDD0";
export const muted = "#8A8378";
export const sage = "#6B7F73";
export const bronze = "#A8763E";
export const brick = "#8B3A3A";

/** Status → pill colour. Statuses are computed by the backend (Code.gs → evaluate_). */
export const STATUS_COLORS = {
  "New Inquiry": bronze,
  "Verifying Documents": bronze,
  "Awaiting Pastor Approval": brick,
  "Approved — Schedule Baptism": brick,
  "Baptism Scheduled": sage,
  "Sent to Registrar": sage,
  "Recorded in Register": muted,
  Archived: muted,
};

export const STEPS = [
  ["New Inquiry", "Intake"],
  ["Verifying Documents", "Interview & verification"],
  ["Awaiting Pastor Approval", "Pastor approval"],
  ["Approved — Schedule Baptism", "Approved"],
  ["Baptism Scheduled", "Baptism scheduled"],
  ["Sent to Registrar", "Registrar"],
  ["Recorded in Register", "Recorded"],
];
