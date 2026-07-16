# Lumio Ref — Electrical Quick-Reference PWA

Fast day-to-day CEC/OESC 2024 lookups for Lumio Energy: power conversion, motor currents,
conductor sizing, voltage drop, fuse and disconnect selection, fuse selectivity, code tables,
and unit conversions (length, temperature).
One codebase, installs on iPhone and Windows desktop, works 100% offline.

> **Reference only.** All results are quick-reference estimates. Final design values must be
> verified against the current code by a licensed professional engineer. The bundled table data
> was transcribed and must be spot-checked against the printed CEC before field use — every data
> file carries a `_verification` note.

## Stack

Plain HTML/CSS/JavaScript (ES modules) — no framework, no build step, no backend.
All calculation logic is in pure functions under `js/calc/`; all code-table data is plain JSON
under `data/cec-2024/`. A service worker (`sw.js`) precaches the entire app for offline use.

```
index.html          app shell
manifest.json       PWA manifest
sw.js               service worker (bump VERSION when you ship changes)
css/app.css         mobile-first styles, light/dark themes
js/app.js           router, settings store, theme
js/data-loader.js   loads the active code dataset
js/calc/*.js        pure calculation functions (unit tested)
js/ui/*.js          one DOM controller per module
data/cec-2024/*.json  editable code tables
tests/*.test.js     unit tests (node --test)
icons/              PWA icons
```

## Run locally

Any static file server works (ES modules and `fetch` require HTTP, not `file://`):

```
cd lumio-ref
python -m http.server 8080      # or: npx http-server -p 8080
```

Open http://localhost:8080.

## Run the tests

Requires Node 18+ (no dependencies):

```
npm test        # = node --test "tests/*.test.js"
```

Tests load the same JSON files the app uses, so a data edit that breaks a schema fails the suite.

## Deploy to GitHub Pages

GitHub Pages provides the HTTPS origin required for PWA installation.

1. Create a repository and push (from the `lumio-ref` folder):
   ```
   git init            # already done if you received this repo initialized
   git add -A && git commit -m "Lumio Ref v1"
   gh repo create lumio-ref --public --source . --push
   # or create the repo on github.com and: git remote add origin <url> && git push -u origin main
   ```
2. On GitHub: **Settings → Pages → Source: Deploy from a branch → Branch: `main` / `/ (root)` → Save**.
3. The app appears at `https://<your-user>.github.io/lumio-ref/` after a minute or two.
   All paths in the app are relative, so the subpath just works.

**Shipping updates:** edit files, bump `VERSION` in `sw.js` (e.g. `lumioref-v2`), commit, push.
Installed apps pick up the new version on their next launch with connectivity (one launch behind,
by design of the cache-first worker).

## Install on iPhone

1. Open the GitHub Pages URL in **Safari**.
2. Tap the **Share** button → **Add to Home Screen** → **Add**.
3. Launch from the home-screen icon: full-screen, no browser chrome, works in airplane mode.

## Install on Windows desktop

1. Open the GitHub Pages URL in **Chrome** or **Edge**.
2. Click the **install icon** in the address bar (or menu → *Apps → Install Lumio Ref* /
   *Install this site as an app* in Edge).
3. It opens in its own window with a taskbar icon and works offline.

## Updating the data tables

Everything the calculators use lives in `data/cec-2024/*.json` — no code changes needed:

| File | Contents |
|---|---|
| `motor-flc.json` | CEC Table 44/45 motor full-load currents |
| `ampacity.json` | Tables 2/4 ampacities, insulation types, termination rules |
| `derating.json` | Table 5A ambient and 5C conductor-count factors |
| `impedance.json` | Table D3-style R/X values (Ω/km) |
| `fuse.json` | Standard ratings, fuse classes, 28-200 and 26-250/254 multipliers |
| `disconnect.json` | Switch frames and 28-604 rules |
| `selectivity.json` | Fuse amp-ratio selectivity table (edit to match your manufacturer's guide) |

Edit the JSON, run `npm test` (catches schema breakage), bump `VERSION` in `sw.js`, redeploy.

**Adding an NEC dataset later:** copy `data/cec-2024/` to `data/nec-20xx/`, replace the values
(same schemas), register the id in `js/data-loader.js` (`DATASETS`), and add the new files to the
precache list in `sw.js`. It then appears in Settings → Code dataset.

## Adding a module

Create `js/calc/foo.js` (pure functions + tests) and `js/ui/foo.js` exporting
`{ id, title, render(main, ctx) }`, then add it to the `MODULES` array in `js/app.js`
and the precache list in `sw.js`. `ctx` gives you `{ data, settings, saveSettings }`.
