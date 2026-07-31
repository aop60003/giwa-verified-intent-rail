# Frontend Audit Capture - 2026-07-05

## Scope

- Workspace: `/Users/jeongminseong/Desktop/giwa-verified-intent-rail`
- Surface: `@giwa/web`
- Capture server: `node --experimental-strip-types apps/web/scripts/serve-static.mjs`
- Capture URL: `http://127.0.0.1:4176`
- Mode captured: static fallback, testnet-only recorded public artifacts

## Frontend Location

- `apps/web/public/index.html` loads `apps/web/public/flow.js`.
  - Handles `/`, `/partner`, and `/receipt/<hash>` through pathname branching.
  - Reads `apps/web/public/flow-data.json`.
- `apps/web/public/user.html` loads `apps/web/public/user-flow.js`.
  - Handles `/user`, `/user/receipts`, `/user/help`, and `/user/receipt/<hash>`.
  - Checks `/readyz` to decide whether wallet actions can use the live API.
- `apps/web/public/live.html` loads `apps/web/public/live-flow.js`.
  - Handles the local live wallet rehearsal surface.
- `apps/web/public/demo.html` loads `apps/web/public/demo-control-room.js`.
  - Reads `/healthz`, `/readyz`, `/api/demo/status`, and `/live-demo-snapshot.json`.
- `apps/web/public/styles.css` is the shared visual system for all public screens.

## Runtime Shape

- This is not a React/Vite SPA. It is a dependency-light static frontend: HTML entry files plus DOM-building JavaScript.
- `apps/web/scripts/serve-static.mjs` maps:
  - `/demo` -> `demo.html`
  - `/user`, `/user/receipts`, `/user/help`, `/user/receipt/*` -> `user.html`
  - `/`, `/partner`, `/receipt/*` -> `index.html`
- `apps/web/scripts/serve-live.mjs` adds `/live -> live.html` and routes `/api/*` to `apps/web/src/lib/live/liveApi.ts`.
- `apps/web/scripts/export-flow-data.mjs` generates `flow-data.json` and `partner-snapshot.json` from checked-in evidence and deployment metadata.

## Captured Steps

1. `/` root guided action: healthy first screen. Clear title, receipt status card, and links to decision/deposit/partner surfaces.
   - Screenshot: `01b-root-guided-action-viewport.png`
2. `/user` user action: visually polished and responsive, but static/local reviewer copy appears in the user-facing route.
   - Screenshot: `02b-user-action-viewport.png`
3. `/user/receipts` receipt list: functional empty state with recorded receipt fallback, but desktop layout uses a narrow left column with large unused right-side whitespace.
   - Screenshot: `03-user-receipts-static.png`
4. `/demo` demo control room: appropriate operator/reviewer surface. Runtime state is understandable and clearly static fallback.
   - Screenshot: `04b-demo-control-room-viewport.png`
5. `/partner` partner console: strong evidence/KPI hierarchy for a reviewer or partner audience.
   - Screenshot: `05b-partner-console-viewport.png`
6. `/user` mobile viewport: responsive stacking works and text does not visibly overlap, but the first screen is CTA-heavy and repeats static/local fallback wording.
   - Screenshot: `06b-mobile-user-action-viewport.png`
7. `/user/receipt/<recorded-hash>` recorded receipt route: renders cleanly, but the copy explicitly says reviewer route, partner packet, static preview, and local review.
   - Screenshot: `07-user-recorded-receipt-viewport.png`

## Design Assessment

### Strengths

- The UI is focused on one flagship GIWA Sepolia mock testnet action, matching the MVP direction.
- Shared styling is consistent: strong typography, restrained neutral palette, 8px cards/buttons, clear status pills, and dense evidence panels.
- Long hashes and technical values use wrapping and monospace styles, reducing overflow risk.
- Responsive CSS has explicit breakpoints at 980px, 620px, and 430px.
- Focus-visible styling exists for buttons, links, and summary controls.
- Testnet-only and non-finality boundaries are generally visible in the captured public/reviewer surfaces.

### UX Risks

- The `/user` route exposes implementation/reviewer language: `local live API`, `static preview`, `partner packet`, `reviewer route`, and `local review`.
- The user action first screen shows several disabled or secondary actions at once. The primary next step is less focused than it could be.
- `/user/receipts` looks under-composed on desktop because the content stays in a narrow column while the rest of the viewport is empty.
- `/user/receipt/<hash>` is not yet a self-contained public receipt page. It redirects user understanding toward recorded/reviewer/partner surfaces instead of presenting safe receipt fields directly.
- Some full-page screenshots produced unusually tall captures with excess whitespace. Viewport captures were used as the accepted design evidence for first-screen assessment.

### Accessibility Risks

- The user progress rail uses symbolic text such as `>`, `-`, and status cards. It should expose clearer programmatic status labels and `aria-current="step"` for the active step.
- The entire main region uses `aria-live` on some entry files. A narrower live region around changing notice/status text would reduce noisy announcements.
- Disabled action buttons explain the state visually, but the disabled reason is not clearly tied with `aria-describedby`.
- Screenshot review cannot prove keyboard order, screen reader output, or color contrast ratios; those need interactive/accessibility tooling.

## Recommendations

1. Replace user-facing local/reviewer copy on `/user` and `/user/receipt/*` with product-facing state copy.
2. Make `/user/receipt/<hash>` self-contained: receipt hash, network, action, tx hash, block evidence, and safe testnet notice should be primary; reviewer/partner links should not be the core route explanation.
3. Use a single dominant CTA in `/user`, then reveal or visually promote approval, deposit, and verification actions as each gate becomes available.
4. Add regression checks that public user route copy does not include `local API`, `static preview`, `partner packet`, `reviewer route`, or `local review`.
5. Add `aria-current` and explicit screen-reader labels to the user progress rail, and connect disabled button reasons through accessible descriptions.
6. Rework `/user/receipts` desktop layout to use a wider content band or two-column receipt/history layout.

## Evidence Limits

- Screenshots were captured from the static fallback server only.
- Live wallet behavior, API-backed receipt unlock, standard RPC verification, keyboard navigation, and screen reader behavior were not fully exercised in this audit.
- Dependency-based tests were not run because `node_modules` is absent and dependency installation requires approval under the repository instructions.
