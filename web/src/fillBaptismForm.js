import { PDFDocument, PDFArray, PDFName, StandardFonts } from "pdf-lib";
import { mdY } from "./helpers.js";

// "Actual date of baptism" is ONE field drawn in three places, so month/day/year are printed
// straight onto the page at these spots (PDF points, from the parish form's widget rectangles).
const ACTUAL_DATE_BOXES = [{ x: 175.2, y: 114.4 }, { x: 246.0, y: 114.4 }, { x: 310.6, y: 114.1 }];

// The blank (repaired) parish form ships with the site: web/public/Baptism_Form_Template.pdf.
// To update the form, replace that file and push. Only the BLANK form is public; filled copies go to Drive.
const TEMPLATE_URL = `${import.meta.env.BASE_URL}Baptism_Form_Template.pdf`;
let templateCache = null;

/** Warm up: download the blank form in the background as soon as a record opens. */
export async function preloadTemplate() {
  if (templateCache) return;
  const res = await fetch(TEMPLATE_URL);
  if (res.ok) templateCache = await res.arrayBuffer();
}

/** Turns the base64 PDF into a browser link the user can open instantly. */
export function pdfBlobUrl(b64) {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
}

/** The original parish PDF lists orphaned copies of its fields; rebuild the list from page 1's widgets. */
function repairFields(doc) {
  const annots = doc.getPage(0).node.Annots();
  if (!annots) return;
  const arr = PDFArray.withContext(doc.context);
  for (let i = 0; i < annots.size(); i++) {
    const ref = annots.get(i);
    const d = doc.context.lookup(ref);
    if (d?.get?.(PDFName.of("T"))) arr.push(ref);
  }
  if (arr.size()) doc.catalog.getOrCreateAcroForm().dict.set(PDFName.of("Fields"), arr);
}

/** Fills the parish Baptism Form from a record. Returns base64 for the API. */
export async function buildBaptismPdf(r) {
  if (!templateCache) {
    const res = await fetch(TEMPLATE_URL);
    if (!res.ok) throw new Error("Could not load the blank Baptism Form (web/public/Baptism_Form_Template.pdf).");
    templateCache = await res.arrayBuffer();
  }
  const doc = await PDFDocument.load(templateCache);
  repairFields(doc);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const form = doc.getForm();
  const cl = r.checklist || {};
  const keys = r.progress?.keys || [];

  const T = (name, val, size = 10) => {
    try {
      const f = form.getTextField(name);
      try { f.setFontSize(size); } catch { /* field without a default appearance */ }
      f.setText(String(val || ""));
    } catch (e) { console.warn("PDF field", name, e); }
  };
  const X = (name, on) => {
    try { const c = form.getCheckBox(name); on ? c.check() : c.uncheck(); } catch (e) { console.warn("PDF box", name, e); }
  };
  const ok = (k) => !!cl[k]?.state;
  const prep = (date, place) => { const m = mdY(date); return [m[0] ? `${m[0]}/${m[2]}` : date, place].filter(Boolean).join(", "); };
  const today = new Date();
  const dob = mdY(r.childDob);
  const pro = mdY(r.proposedDate);
  const witness = (role) => (role === "Christian witness" ? " (Christian witness)" : "");

  T("Date", `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`);
  T("Name of child", `${[r.childFirst, r.childMiddle].filter(Boolean).join(" ")}   ${r.childLast || ""}`);
  T("Home Address", [r.address, r.city, r.state].filter(Boolean).join(", ") + (r.zip ? ` ${r.zip}` : ""));
  T("Phone", r.contactPhone);
  T("Date of Birth", dob[0]); T("undefined", dob[1]); T("undefined_2", dob[2]);
  X("Check Box2", r.childSex === "M"); X("Check Box3", r.childSex === "F");
  T("Place of Birth", [r.birthCity, r.birthState].filter(Boolean).join(", "));
  T("Proposed date of baptism", pro[0]); T("undefined_3", pro[1]); T("undefined_4", pro[2]);

  T("Name of Father", r.fatherName);
  T("Baptism Prep", prep(r.fatherPrepDate, r.fatherPrepPlace), 7);
  T("Other D Practicing", r.fatherPracticing);
  X("Check Box4", r.fatherReligion === "Catholic"); X("Check Box5", r.fatherReligion === "Other");

  T("Name of Mother", r.motherName);
  T("Baptism Prep_2", prep(r.motherPrepDate, ""), 7); T("undefined_6", r.motherPrepPlace, 7);
  T("Practicing", r.motherPracticing);
  X("Check Box6", r.motherReligion === "Catholic"); X("Check Box7", r.motherReligion === "Other");

  X("Check Box8", r.parentsMarriage === "Yes"); X("Check Box9", r.parentsMarriage === "No"); X("Check Box10", r.parentsMarriage === "Civil");

  T("Name of godfather", (r.gp1Name || "") + witness(r.gp1Role));
  T("Baptism Prep_3", prep(r.gp1PrepDate, r.gp1PrepPlace), 7);
  X("Check Box11", r.gp1Marital === "Yes"); X("Check Box12", r.gp1Marital === "No"); X("Check Box13", r.gp1Marital === "Single");
  T("Name of godmother", (r.gp2Name || "") + witness(r.gp2Role));
  T("Baptism Prep_4", prep(r.gp2PrepDate, r.gp2PrepPlace), 7);
  X("Check Box14", r.gp2Marital === "Yes"); X("Check Box15", r.gp2Marital === "No"); X("Check Box16", r.gp2Marital === "Single");

  X("Check Box17", r.homeBaptized === "Yes"); X("Check Box18", r.homeBaptized === "No");
  X("Check Box19", r.adopted === "Yes"); X("Check Box20", r.adopted === "No");
  T("Notes 1", r.formNotes1); T("Notes 2", r.formNotes2);
  T("Name of Minister", r.minister);

  const gpKeys = keys.filter((k) => /^gp|class_godparents/.test(k));
  X("Check Box21", ok("birthCert"));
  X("Check Box22", ok("parentsMarriage") && ok("class_parents"));
  X("Check Box23", gpKeys.length > 1 && gpKeys.every(ok));

  form.updateFieldAppearances(font);
  if (r.actualDate) {
    const a = mdY(r.actualDate);
    const page = doc.getPage(0);
    ACTUAL_DATE_BOXES.forEach((b, i) => page.drawText(a[i], { x: b.x + 4, y: b.y + 5, size: 10, font }));
  }
  const out = await doc.save();
  let s = "";
  for (let i = 0; i < out.length; i += 0x8000) s += String.fromCharCode.apply(null, out.subarray(i, i + 0x8000));
  return btoa(s);
}
