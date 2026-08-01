# GIWA Release 3 Local Completion Freeze

Date: 2026-08-01

## Completion boundary

Release 3 is locally complete for presentation and responsive accessibility only.
No Git integration, deployment, DNS/HTTPS change, wallet transaction, chain transaction, mainnet integration, or production claim is implied.
Release 1 and Release 2 trust, privacy, replay, and evidence-integrity boundaries remain authoritative.

The public product name remains `GIWA Verified Intent Rail`. The verified experience remains limited to GIWA Sepolia testnet evidence and mock assets; it does not claim real funds, yield, RWA issuance, settlement, KYC, security, or finality.

## Locally completed surface

- One shared `GIWA Protocol Dossier` header now joins the participant, Receipt, Campaign Studio, and Proof Ledger surfaces.
- The header preserves the three-step `조건 확인 → 지갑 실행 → 결과 공개` journey and exposes Campaign and Proof destinations.
- Pretendard regular, semibold, and bold subsets are served locally with `font-display: swap`; public HTML no longer requests the remote font stylesheet.
- Status and disclosure controls use a licensed Lucide-derived line-icon subset while retaining visible text labels.
- Long technical values use accessible disclosure controls on the new Receipt and Proof projections.
- Interactive controls use a 44px minimum target, visible keyboard focus, one-column 360px layouts, and an explicit reduced-motion terminal state.

## Verification evidence

Commands were run from the repository root after the final implementation changes:

| Check | Result |
| --- | --- |
| `pnpm --filter @giwa/web test -- protocolDossierPresentation userVisualPolish userProtocolConsolePresentation livePublicReceiptRoute publicCampaignStudioPresentation publicEvidencePresentation` | PASS — 6 files, 70 tests |
| `pnpm --filter @giwa/web test` | PASS — 95 files, 722 tests |
| `pnpm typecheck` | PASS — web, protocol, and contracts |
| `pnpm test` | PASS — web 722, protocol 29, contracts 21 tests |
| `pnpm build` | PASS — web export/typecheck, protocol typecheck, contracts build/typecheck |

The local static server was started only for browser QA and stopped afterward. No wallet or chain action was performed.

### Browser matrix

The following local surfaces were inspected at `320×720`, `390×844`, `1366×768`, and `1440×1024`:

- `/user`
- recorded public Matched Receipt `/receipt/0x710ca481e739ccb6e3b872031dc9125d259cd0879e63edecbe17ea3f7b5c1503`
- `/partner`
- `/evidence`

All 16 route/viewport combinations reported `scrollWidth <= clientWidth`. No visible link, button, input, or summary in the tested interaction set was below 44px after the Receipt evidence-summary correction. At `1366×768`, the participant primary action and GIWA Sepolia/mock-asset limitation were both inside the initial viewport.

The static server intentionally does not expose the live participant Receipt API. The `/user/receipt/:hash` unavailable fallback was inspected, while the recorded public `/receipt/:hash` route was used for the complete Matched Receipt visual QA. This preserves the existing public/private authority boundary instead of adding a static private API shortcut.

Additional observations:

- The Proof tab order begins with the product brand, then Campaign, Proof, the exact-hash input, and the search action.
- Links, input, button, and summary controls showed the configured 3px visible focus ring.
- The locally hosted Pretendard face reported ready in the browser.
- A `683×384` layout viewport, equivalent to the CSS-pixel reflow pressure of `1366×768` at 200% zoom, remained overflow-free on all four surfaces; the 320px matrix is the stricter narrow-width check.
- The browser loaded the `prefers-reduced-motion: reduce` rule that removes Receipt/icon animation and transitions. The QA host itself did not have reduced motion enabled, so this was verified through the loaded CSSOM and source-contract test rather than an operating-system preference change.
- No browser console warning or error was reported during the final local route inspection.

## Remaining gates

- The work remains an unstaged, uncommitted local change set.
- Protected CI has not evaluated this exact source state.
- No public deployment, staging migration, DNS/HTTPS work, video capture, submission freeze, wallet action, or chain action has been performed.
- Any later product expansion requires a separately reviewed Release 4 design and implementation plan.
- Any public GASOK rollout remains governed by `docs/implementation/giwa-gasok-staging-runbook.md` and its explicit approval gates.
