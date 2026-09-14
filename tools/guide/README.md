# The manager's guide

Rebuilds `docs/TimeGate-Guide.pdf` — the illustrated PDF handed to whoever runs
TimeGate day to day.

```bash
npm run build                 # the tool reads the server's compiled code and the client's fonts
(cd server && npm start)      # the screenshots come from the real running app
npm run guide
```

Needs Node and Chrome, and nothing else. No image library, no headless-browser
package: screenshots are clipped to their content by Chrome itself, and the
browser is driven straight over the DevTools Protocol.

## What it does

1. **Seeds demo data** — invented people (Alice Reed, Ben Shaw, Cara Diaz, Dana
   Okoro) and a week whose arithmetic is easy to follow, including one forgotten
   clock-out so the review flow can be shown. It refuses to run against a
   production configuration, but it *will* overwrite those four names and a
   `manager@timegate.example` account in whatever database the server config
   points at. Run it against development.
2. **Captures eight screenshots** by driving the real UI — entering a code,
   clocking in, opening the correction dialog — in a private headless Chrome
   with no extensions, so nothing recolours the page or draws a cursor over it.
3. **Builds the document** with the images and Inter embedded, then prints it to
   A4 through Chrome.

Everything temporary — the browser profile, the screenshots, the intermediate
HTML — is removed afterwards. Only the PDF is kept.

## Files

| File | What it is |
|---|---|
| `generate.mjs` | The orchestrator. Start here. |
| `document.mjs` | The wording and the print styling. |
| `capture.mjs` | The screenshot sequence and the clipping. |
| `seed-demo.mjs` | The demo people and their week. |
| `chrome.mjs` | Launches and disposes of a private headless Chrome. |
| `cdp.mjs` | A very small DevTools Protocol client. |

## Worth knowing

**The wording is duplicated.** `document.mjs` repeats what is in `HANDOFF.md`.
They are two files on purpose — the markdown is the repository's record, the PDF
is what gets emailed — but a change to one needs the same change to the other.
If that drifts often enough to be a nuisance, generate the document from the
markdown instead of keeping a second copy.

**The cover says "Prepared for review · September 2026"** and the last section
describes the hosting as a personal account. Both want revisiting after go-live.

**A missing button fails the run.** That is deliberate: a silent miss once
produced a screenshot of the wrong screen that looked entirely plausible until
somebody read the finished PDF.
