# The printed guides

Rebuilds both illustrated PDFs in `docs/` from the running app:

| File | For | Covers |
|---|---|---|
| `TimeGate-Guide.pdf` | the manager | the whole product, including corrections and the payroll export |
| `TimeGate-Staff-Guide.pdf` | everyone else | only what one person does: code, clock in, break, clock out, and what to do when something goes wrong |

The staff one deliberately says nothing about exports, corrections or hosting.
It is written for someone reading it once, in a hurry, possibly not in their
first language — short sentences, larger type, one idea per block. Anything
workplace-specific is a bracketed placeholder, because these files are committed
and the punch link and codes are not.

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
2. **Captures twelve screenshots** by driving the real UI — entering a code,
   clocking in, starting a break, mistyping a code, losing the connection,
   opening the correction dialog — in a private headless Chrome with no
   extensions, so nothing recolours the page or draws a cursor over it. Going
   offline is real network emulation, not a faked flag, so the service worker
   behaves exactly as it would at the door.
3. **Builds both documents** with the images and Inter embedded, then prints
   each to A4 through Chrome.

Everything temporary — the browser profile, the screenshots, the intermediate
HTML — is removed afterwards. Only the PDFs are kept.

## Files

| File | What it is |
|---|---|
| `generate.mjs` | The orchestrator. Start here. |
| `document.mjs` | The manager guide's wording and print styling. |
| `staff-document.mjs` | The staff guide's wording and print styling. |
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

**The manager guide's cover says "Prepared for review · September 2026"** and its
last section describes the hosting as a personal account. Both want revisiting
after go-live.

**Both guides are in English only.** If the workforce is not English-first, a
translated staff guide is worth more than anything else in this folder — that is
the one document people actually have to act on.

**A missing button fails the run.** That is deliberate: a silent miss once
produced a screenshot of the wrong screen that looked entirely plausible until
somebody read the finished PDF.
