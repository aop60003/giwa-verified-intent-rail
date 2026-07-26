# Lightsail Isolated Node Runtime Design

**Date:** 2026-07-26
**Status:** Approved for implementation

## Problem

The GASOK staging assets pin Node `22.16.0`, and both GIWA systemd units
currently execute `/usr/bin/node`. The selected Lightsail host is shared with
active Coinary, NewJS, Vibee and other services that also depend on the system
runtime. Changing `/usr/bin/node` to satisfy GIWA can therefore change unrelated
applications when they restart.

The host must keep its existing system Node version while GIWA uses the exact
runtime version already verified by local checks and CI.

## Goals

- Run GIWA static and live services with Node `22.16.0` without modifying the
  shared `/usr/bin/node`.
- Bind the runtime to an official Node Linux x64 archive and a source-controlled
  SHA-256 value.
- Fail closed on architecture, checksum, extraction, version or destination
  mismatch.
- Keep runtime installation idempotent and prevent silent replacement of an
  existing runtime directory.
- Preserve the current localhost-only service, runtime-value and rollback
  boundaries.

## Non-goals

- Containerizing GIWA or installing Docker.
- Changing the Node version used by unrelated Lightsail services.
- Changing the CI Node or pnpm versions.
- Adding a general-purpose runtime manager.
- Automating DNS, HTTPS, wallet actions or public deployment approval.
- Deleting isolated runtime versions automatically.

## Approaches Considered

1. **Official Node archive under `/opt/giwa/runtime` — selected.** This provides
   a GIWA-only runtime without changing shared packages or introducing a
   container platform.
2. **Docker container.** This has a stronger process boundary but adds an image
   build, daemon, storage and operational model that the one-instance GASOK
   staging design does not otherwise need.
3. **Use system Node `22.22.0` and change the repository policy.** This avoids a
   new runtime directory but breaks exact CI equivalence and keeps GIWA coupled
   to future shared-host package upgrades.

## Artifact Binding

The selected upstream artifact is the official Node `v22.16.0` Linux x64 xz
archive:

```text
https://nodejs.org/dist/v22.16.0/node-v22.16.0-linux-x64.tar.xz
```

The versioned installer binds the archive to this SHA-256 value published by
the official Node release:

```text
f4cb75bb036f0d0eddf6b79d9596df1aaab9ddccd6a20bf489be5abe9467e84e
```

It also downloads the release `SHASUMS256.txt` and requires its exact archive
line to match the source-controlled filename and checksum before checking the
downloaded archive itself. The script does not use `curl | sh`, package-manager
downgrades or an unversioned `latest` URL.

## Runtime Layout

```text
/opt/giwa/runtime/
└── node-v22.16.0/
    ├── bin/node
    ├── bin/npm
    └── ...
```

- `/opt/giwa/runtime` and the installed version are root-owned.
- Group and other users may read and execute but may not write.
- The final directory is treated as immutable after publication.
- `/usr/bin/node` remains owned by the host package manager and outside GIWA
  deployment scope.

## Installer Contract

Create a versioned Bash script at:

```text
ops/lightsail/scripts/install-isolated-node.sh
```

The script:

1. requires Linux `x86_64`;
2. requires `curl`, `tar`, `sha256sum`, `mktemp` and `xz`;
3. uses fixed version, archive, origin, checksum and destination constants;
4. creates a private temporary directory and always removes only that resolved
   temporary directory on exit;
5. downloads the archive and `SHASUMS256.txt` with HTTPS failure and redirect
   handling;
6. requires exactly one matching checksum-manifest line;
7. verifies the downloaded archive with `sha256sum`;
8. extracts into the temporary directory and verifies `bin/node --version`;
9. publishes with a no-replace move into `/opt/giwa/runtime`;
10. removes write permission for group and other users;
11. prints only a bounded success label and the installed Node version.

If the final directory already exists, the script succeeds only when it is a
real directory, is not a symbolic link and its `bin/node` reports exactly
`v22.16.0`. Otherwise it exits without replacing or deleting the path.

## Service And Build Contract

The static unit executes:

```text
/opt/giwa/runtime/node-v22.16.0/bin/node
```

The live unit retains its reserved-key wrapper but ends with the same isolated
Node path. Neither unit refers to `/usr/bin/node`, `/usr/bin/env node` or an
operator home directory.

Host install and build commands prepend only the isolated Node `bin` directory
to `PATH`, then verify:

```bash
test "$(/opt/giwa/runtime/node-v22.16.0/bin/node --version)" = "v22.16.0"
test "$(PATH="/opt/giwa/runtime/node-v22.16.0/bin:$PATH" pnpm --version)" = "10.32.1"
```

`pnpm install --frozen-lockfile` and `pnpm build` run as the non-root `giwa`
service account with that bounded `PATH`. The system Node version is recorded
only as shared-host context and is not changed or used by GIWA services.

## Failure Handling And Rollback

- Any upstream, checksum, extraction, version or destination mismatch stops
  before systemd installation or release activation.
- A temporary download or extraction failure cleans only the private temporary
  directory.
- The installer never removes or overwrites an existing final runtime.
- GIWA rollback stops only GIWA services and restores the prior GIWA release and
  unit candidates when they exist.
- The isolated runtime remains installed during ordinary release rollback. Its
  removal is a separate destructive action requiring an exact target and
  explicit approval.
- No existing shared-host service is restarted as part of GIWA runtime install.

## Repository Changes

- Create `ops/lightsail/scripts/install-isolated-node.sh`.
- Modify `ops/lightsail/systemd/giwa-static.service`.
- Modify `ops/lightsail/systemd/giwa-live.service`.
- Extend `apps/web/src/lib/live/lightsailOpsAssets.test.ts`.
- Modify the current GASOK staging runbook.
- Modify the historical deploy execution plan only where its `/usr/bin/node`
  requirement would otherwise contradict the current runbook.
- Refresh local-advisory provenance after all tracked changes.

## Tests

Focused tests prove:

- both GIWA units use the exact isolated Node path;
- neither unit uses `/usr/bin/node`;
- the installer pins the official filename, URL origin and SHA-256;
- the installer checks Linux x64, prerequisites, manifest binding, archive hash,
  extracted version and no-replace destination behavior;
- cleanup is bounded to a private temporary directory;
- shell syntax passes `bash -n`.

Verification then runs:

```text
pnpm --filter @giwa/web test
pnpm typecheck
pnpm test
pnpm build
scripts/ci/check-safe-scans.ps1
artifact:local
artifact:provenance:verify
verify-provenance-report.mjs --check
```

## Deployment Checkpoints

1. Commit and push the isolated-runtime implementation as a new exact commit.
2. Fetch that exact commit into a non-active release directory.
3. Execute the versioned installer with approved root authority.
4. Verify isolated Node and pnpm before dependency installation.
5. Build as `giwa`; do not change `/opt/giwa/current` until build succeeds.
6. Install and validate GIWA units without restarting unrelated services.
7. Continue live runtime, Nginx, DNS and HTTPS only after the remaining public
   hostname and owner checkpoints are recorded.

## Success Criteria

- `/usr/bin/node` remains at the host-owned version.
- Existing shared-host services remain active and are not restarted by GIWA
  deployment.
- GIWA static and live MainPIDs execute Node `22.16.0` from
  `/opt/giwa/runtime/node-v22.16.0`.
- All repository and host-local smoke gates pass.
- The resulting evidence states that the isolated runtime is a staging
  compatibility boundary, not a production or security guarantee.
