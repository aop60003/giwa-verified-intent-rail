# Frontend Redesign Capture - 2026-07-05

## Scope

- Surface: commercial user-facing `/user` routes and partner-facing `/partner` console.
- Direction: Institutional Receipt Checkout for `/user`; Protocol Evidence Console for `/partner`; `/demo` remains structurally separate.
- Capture URL: `http://127.0.0.1:4176`
- Capture mode: static fallback with recorded testnet receipt.

## Implemented Changes

- Reduced `/user` first screen to one dominant primary action plus help/history links.
- Moved approve, deposit, and verify actions into a conditional wallet action row that appears after a manifest or run state exists.
- Replaced local/reviewer/operator copy in `/user`, `/user/receipts`, `/user/receipt/*`, and `/user/help` with product-facing receipt/action copy.
- Converted the user progress rail from dense repeated cards to a compact checkout timeline with numeric steps, state labels, and `aria-current`.
- Made `/user/receipt/<recorded-hash>` a self-contained testnet receipt surface rather than a redirect explanation.
- Expanded `/user/receipts` into a desktop history layout with a filter sidebar and wider receipt content.
- Rebuilt `/partner` first screen as a protocol receipt console with a clear evidence headline, receipt terminal, export actions, and KPI strip.
- Reorganized partner receipt, confirmation, signer, decoded log, and source fields into ledger-style panels for scanning.
- Compactly displays long mock testnet amount base units in the partner KPI strip while preserving raw evidence in JSON/source fields.
- Added shared CSS tokens, user-scoped checkout styles, and partner-scoped evidence console styles while leaving `/demo` density intact.

## Captures

- `01-user-checkout-desktop.png`
- `02-user-receipts-desktop.png`
- `03-user-recorded-receipt-desktop.png`
- `04-user-checkout-mobile.png`
- `05-partner-console-desktop.png`
- `06-partner-console-mobile.png`

## Verification

- `node --check` passed for `user-flow.js`, `flow.js`, `live-flow.js`, and `demo-control-room.js`.
- `node --experimental-strip-types --check` passed for `userPublicBoundary.test.ts` and `userVisualPolish.test.ts`.
- Public user asset scan found no `local API`, `static preview`, `partner packet`, `reviewer route`, `local review`, protected CI, blocker, production asset/yield, safety guarantee, or fast-finality wording.
- Risk phrase scan over public assets found no matches for the configured forbidden claim patterns.
- Playwright capture with local system Chrome passed for `/partner` at 1280x720 and 390x844 with no horizontal overflow; partner KPI values render as `1`, `1`, `1`, `1`, `100%`, and `1.00e18`.
- `pnpm --filter @giwa/web --fail-if-no-match test -- userPublicBoundary` and `pnpm --filter @giwa/web --fail-if-no-match typecheck` could not run because `node_modules` is absent and `vitest`/`tsc` are not installed.
