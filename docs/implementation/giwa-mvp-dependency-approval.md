# GIWA MVP Dependency Approval

## Gate

No packages were installed in Sprint 0. Dependency installation is blocked until this document is reviewed and each required group has approval status `approved`.

Metadata was checked on 2026-06-16 with `npm view <package> version license time.modified`. Version entries below are approval candidates, not installed dependencies.

## Approval Table

| Group | Package | Candidate version | Purpose | License check | Recent release or adoption check | Lighter alternative considered | Approval status | Approval date | Approver |
|---|---|---:|---|---|---|---|---|---|---|
| TypeScript toolchain | `typescript` | `6.0.3` | Shared strict TypeScript compiler for workspace packages. | Apache-2.0. | NPM modified `2026-04-16`; Microsoft-maintained compiler. | Plain JavaScript rejected because canonical hash and schema code needs static typing. | approved | 2026-06-16 | user |
| Next.js and React | `next` | `16.2.9` | App router web surface for the guided user flow, receipt page, and partner summary. | MIT. | NPM modified `2026-06-16`; widely adopted React framework. | Static HTML rejected because Sprint 5 requires wallet, API, and server-side manifest behavior. | approved | 2026-06-16 | user |
| Next.js and React | `react` | `19.2.7` | UI component runtime for the web app. | MIT. | NPM modified `2026-06-15`; core Next.js peer dependency. | Vanilla DOM rejected because wallet/status UI will grow enough to need component state. | approved | 2026-06-16 | user |
| Next.js and React | `react-dom` | `19.2.7` | React browser renderer required by Next.js. | MIT. | NPM modified `2026-06-15`; core React package. | No lighter compatible renderer for Next.js app router. | approved | 2026-06-16 | user |
| viem | `viem` | `2.52.2` | EVM clients, ABI calls, hashing helpers, and wallet interactions. | MIT. | NPM modified `2026-06-04`; actively maintained Ethereum TypeScript interface. | Raw JSON-RPC rejected because typed ABI calls and canonical hex utilities reduce verification risk. | approved | 2026-06-16 | user |
| Vitest | `vitest` | `4.1.9` | Unit tests for canonical payload, hash, verifier, and receipt logic. | MIT. | NPM modified `2026-06-15`; widely adopted Vite-native test runner. | `node:test` considered, but Vitest gives TypeScript and ESM ergonomics with fewer custom test harness decisions. | approved | 2026-06-16 | user |
| Hardhat and contract testing tools | `hardhat` | `3.9.0` | Solidity compile, test, and GIWA Sepolia deployment scripts. | MIT. | NPM modified `2026-06-08`; established Ethereum development environment. | Foundry considered, but the planned repo stack is TypeScript-centric. | approved | 2026-06-16 | user |
| Hardhat and contract testing tools | `@nomicfoundation/hardhat-toolbox` | `7.0.0` | Recommended Hardhat plugin bundle for tests and common contract tooling. | MIT. | NPM modified `2026-02-26`; official Nomic Foundation toolbox package. | Installing individual plugins considered; toolbox is acceptable only if the bundle remains smaller than managing equivalent plugins manually. | approved | 2026-06-16 | user |

## Approval Rule

When the user approves a group, update only that group from `pending` to `approved`, record the approval date, and record the approver. If package versions have changed by then, rerun metadata checks before installing.

## Sprint 1 Installation Boundary

Sprint 1 installs only `typescript@6.0.3`, `viem@2.52.2`, and `vitest@4.1.9`. Next.js, React, Hardhat, and contract testing packages are approved for later sprints but are not installed during Sprint 1.

## Sprint 2 Installation Boundary

Sprint 2 installs `hardhat@3.9.0` in `@giwa/contracts` and reuses the approved `typescript@6.0.3`, `viem@2.52.2`, and `vitest@4.1.9` versions for local contract tests.

`@nomicfoundation/hardhat-toolbox@7.0.0` remains approved but is not installed or imported in Sprint 2 because the published package is a Hardhat 3-incompatible shim. Sprint 2 uses Hardhat 3 core plus viem clients against the Hardhat EDR provider instead of adding an unapproved replacement plugin.

## Sprint 8 Runtime Boundary

Sprint 8 installs no new package for local SQLite.

The implementation uses Node `node:sqlite` behind a narrow storage adapter because the local runtime exposes the module. The module is experimental in the current local Node runtime, so the adapter boundary is required. A future hosted Live MVP may replace this adapter after dependency approval.

## Sprint 9 Wallet and Manifest Boundary

Sprint 9 installs no new package.

Wallet readiness uses EIP-1193 provider calls directly in the browser and reuses the approved `viem` package for address validation and server-side manifest signing.

## Sprint 12 Live Demo Boundary

Sprint 12 installs no new package.

Live demo readiness, snapshot export, and submission-pack refresh reuse the existing TypeScript, Vitest, viem, and Node runtime surface. The SQLite implementation remains behind the `liveStore` adapter and the snapshot exporter reads only public matched-run evidence from the selected local DB.
