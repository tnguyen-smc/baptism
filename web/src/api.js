import { getToken, expireSession } from "./auth.js";

// The Apps Script web app's /exec URL. Every call is one POST: {action, args, token}.
// Content-Type text/plain avoids a CORS preflight, which Apps Script cannot answer.
export const API_URL = import.meta.env.VITE_API_URL;

async function call(action, ...args) {
  if (!API_URL) throw new Error("VITE_API_URL is not set for this build.");
  const token = await getToken();
  let res;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, args, token }),
    });
  } catch {
    throw new Error("Could not reach the parish server. Check your internet connection.");
  }
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("The server sent a web page instead of data. In Apps Script, check the deployment's access is set to “Anyone”.");
  }
  if (!json.ok) {
    const e = new Error(json.error || "Something went wrong.");
    e.code = json.code;
    if (json.code === "auth") expireSession();
    throw e;
  }
  return json.data;
}

export const api = {
  bootstrap: () => call("bootstrap"),
  getRecord: (id) => call("getRecord", id),
  createRecord: (fields) => call("createRecord", fields),
  saveForm: (id, fields) => call("saveForm", id, fields),
  setChecklist: (id, key, state, note) => call("setChecklist", id, key, state, note),
  setInterview: (id, start) => call("setInterview", id, start || ""),
  approve: (id) => call("approve", id),
  revokeApproval: (id, reason) => call("revokeApproval", id, reason),
  scheduleBaptism: (id, start, minutes, location, celebrant, invite) => call("scheduleBaptism", id, start, minutes, location, celebrant, invite),
  uploadDocument: (id, name, mime, b64, checklistKey) => call("uploadDocument", id, name, mime, b64, checklistKey || ""),
  listDocuments: (id) => call("listDocuments", id),
  saveFormWithPdf: (id, fields, b64) => call("saveFormWithPdf", id, fields, b64),
  saveFormPdf: (id, b64) => call("saveFormPdf", id, b64),
  completeBaptism: (id, date, minister, b64) => call("completeBaptism", id, date, minister, b64),
  resendRegistrar: (id) => call("resendRegistrar", id),
  recordInRegister: (id, book, page, number) => call("recordInRegister", id, book, page, number),
  archive: (id, reason) => call("archive", id, reason),
  unarchive: (id) => call("unarchive", id),
};
