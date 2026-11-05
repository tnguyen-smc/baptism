# Baptism Preparation — St. Mary Catholic Church

React app on **GitHub Pages** + **Google Apps Script** backend over a Google Sheet.
Same look and repo layout as Marriage Prep, but with no Render server, no client secret, and nothing that sleeps.

```
GitHub Pages (React, web/)  ──POST {action, args, idToken}──▶  Apps Script /exec (apps-script/Code.gs)
        │  Sign in with Google (ID token, no secret)                 │ verifies token + Staff tab
        └────────────────────────────────────────────────────────────┤ Sheet · Drive · Calendar · Gmail
                                         Parents ── Google Form ─────┘ (form-submit trigger → E1)
```

| Folder | What | Deploys to |
|---|---|---|
| `web/` | React 18 + Vite + Tailwind, pdf-lib; the blank parish form at `web/public/Baptism_Form_Template.pdf` | GitHub Pages via `.github/workflows/deploy-pages.yml` on every push to `main` |
| `apps-script/` | `Code.gs`, `appsscript.json` | Apps Script project bound to the "Baptism Prep" Sheet |

## 1. Backend (Apps Script), once

1. In the parish Shared Drive, create a Google Sheet **Baptism Prep** → Extensions → Apps Script.
2. Paste `apps-script/Code.gs`. Project Settings → show `appsscript.json` → paste ours.
3. Run **`setup`** once and approve permissions. It creates the `Baptisms`, `Staff`, `Config` tabs, the **Baptism Records** Drive folder, the bilingual parent Google Form, and its trigger.
4. Staff tab: one row per person — `email | name | role | notify`. Roles: `Secretary`, `Pastor`, `Registrar`, `Admin`.
5. Config → `GOOGLE_CLIENT_ID`: the OAuth **Web** client id (the Marriage Prep one works — Cloud Console → Credentials). Add `http://localhost:5173` to its Authorized JavaScript origins for local dev; `https://tnguyen-smc.github.io` is already there.
6. Config → `APP_URL`: `https://tnguyen-smc.github.io/baptism` (email buttons link here).
7. Optional: Config → `ALLOWED_DOMAIN` (e.g. `stmarygc.org`) so only parish Google accounts can sign in.
8. **Deploy → New deployment → Web app** · Execute as **Me** · Who has access **Anyone**. Copy the URL ending in `/exec`. Opening it in a browser should show `{"ok":true,...}`.

> "Anyone" is required so GitHub Pages can reach it. It is still locked down: each request must carry a Google sign-in token issued for *your* client id, for an email on the Staff tab. Deploy from a shared office account, not a person's login.

## 2. Frontend (GitHub Pages), once

1. Create repo **`baptism`** under `tnguyen-smc` and push this folder.
2. Settings → Pages → Source: **GitHub Actions**.
3. Settings → Secrets and variables → Actions → **Variables** tab:
   - `VITE_API_URL` = the `/exec` URL
   - `VITE_GOOGLE_CLIENT_ID` = the client id
   Both are public by design; there are no secrets in this repo.
4. Actions → re-run the deploy. Site: `https://tnguyen-smc.github.io/baptism/`

Repo renamed? Change `REPO_NAME` in `web/vite.config.js`.

## Local development

```bash
cd web
cp .env.example .env.local   # fill in both values
npm install
npm run dev                  # http://localhost:5173/baptism/
```

The local app talks to the real Apps Script backend. Use a test Sheet + separate deployment if you want to experiment safely.

## Updating the backend

Edit `apps-script/Code.gs` in the repo, paste it into the Apps Script editor, then **Deploy → Manage deployments → ✏️ → Version: New version**. Editing the existing deployment keeps the same `/exec` URL, so nothing in GitHub changes.

Optional, for a more "git push" workflow: install [clasp](https://github.com/google/clasp), copy `apps-script/.clasp.json.example` to `.clasp.json` with your script id, then `npx @google/clasp push` from `apps-script/`.

## Where to change things

| I want to… | Edit |
|---|---|
| Change the verification checklist | `CHECKLIST` near the top of `apps-script/Code.gs` |
| Change form fields on the Pastor's Baptism Form tab | `SECTIONS` in `web/src/components/BaptismFormTab.jsx` (+ `HEADER` in Code.gs for new columns) |
| Change which PDF box gets what | `web/src/fillBaptismForm.js` |
| Parish revises the paper form | Replace `web/public/Baptism_Form_Template.pdf` and push; update field names in `fillBaptismForm.js` only if they changed |
| Change email wording | `send*_` functions in Code.gs |
| Colours / fonts | `web/src/theme.js`, `web/src/index.css` |
| Defaults (durations, locations) | Config tab in the Sheet — no redeploy |

## Troubleshooting

| Symptom | Fix |
|---|---|
| "The server sent a web page instead of data" | Deployment access isn't **Anyone**, or your Workspace admin blocks public web apps (Admin console → Apps Script settings) |
| "This sign-in was issued for a different app" | `GOOGLE_CLIENT_ID` in Config ≠ `VITE_GOOGLE_CLIENT_ID` in GitHub |
| "…is not on the Staff list" | Add that exact email to the Staff tab |
| Sign-in button missing | Authorized JavaScript origins in Cloud Console must include the site's origin |
| Config edit not taking effect | Values are cached up to 5 minutes |
| "Please sign in with your @… account" | `ALLOWED_DOMAIN` is set; use a parish account or clear it |
