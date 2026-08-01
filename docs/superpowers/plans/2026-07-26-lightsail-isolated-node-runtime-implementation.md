# Lightsail Isolated Node Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install and run GIWA with a checksum-bound Node `22.16.0` runtime that does not modify or restart unrelated services on the shared Lightsail host.

**Architecture:** A versioned Bash installer publishes the official Node Linux x64 archive beneath `/opt/giwa/runtime` only after manifest, SHA-256 and extracted-version checks. GIWA systemd units use that absolute binary path, while local build commands prepend the isolated `bin` directory without changing `/usr/bin/node`.

**Tech Stack:** Bash, systemd, Node.js `22.16.0`, pnpm `10.32.1`, Vitest, PowerShell, SSH, Git, SHA-256, local-advisory provenance.

## Global Constraints

- Use the approved design in `docs/superpowers/specs/2026-07-26-lightsail-isolated-node-runtime-design.md`.
- Keep shared `/usr/bin/node` at the host-owned version; do not downgrade, hold or replace it.
- Do not restart Coinary, NewJS, Vibee, Nginx, MariaDB, Redis or other unrelated services.
- The isolated runtime path is exactly `/opt/giwa/runtime/node-v22.16.0`.
- The only accepted archive is `node-v22.16.0-linux-x64.tar.xz`.
- The source-controlled SHA-256 is `f4cb75bb036f0d0eddf6b79d9596df1aaab9ddccd6a20bf489be5abe9467e84e`.
- The only accepted upstream origin is `https://nodejs.org/dist/v22.16.0`.
- Keep pnpm at exactly `10.32.1`.
- Runtime values, SSH values, credentials, PEM contents and local operator-note contents stay outside tracked files and captured output.
- Work on the current checkout because the user explicitly selected the current folder and CODEX-only execution.
- Push only to `origin/codex/gasok-staging-deploy`; do not merge, rebase, force-push or replace `origin/main`.
- Stop before live runtime, Nginx, DNS or HTTPS until a public hostname and named release/rollback owners are recorded.

---

## File Map

| Path | Responsibility |
| --- | --- |
| `ops/lightsail/scripts/install-isolated-node.sh` | Fail-closed official archive download, verification and no-replace runtime publication |
| `ops/lightsail/systemd/giwa-static.service` | Static service execution through isolated Node |
| `ops/lightsail/systemd/giwa-live.service` | Live service execution through isolated Node while preserving reserved environment keys |
| `apps/web/src/lib/live/lightsailOpsAssets.test.ts` | Installer safety and systemd runtime-path contract tests |
| `docs/implementation/giwa-gasok-staging-runbook.md` | Current shared-host runtime, build, rollout and rollback authority |
| `docs/implementation/giwa-lightsail-staging-deploy-execution-plan.md` | Historical plan correction where `/usr/bin/node` conflicts with current shared-host policy |
| `docs/evidence/local-*` | Regenerated local-advisory manifest, command and provenance projections |
| `docs/evidence/local/lightsail-access-operator-note.md` | Ignored operator-only host result; never staged |

---

### Task 1: Add The Checksum-Bound Isolated Node Installer

**Files:**
- Create: `ops/lightsail/scripts/install-isolated-node.sh`
- Modify: `apps/web/src/lib/live/lightsailOpsAssets.test.ts`

**Interfaces:**
- Consumes: root-owned existing directory `/opt/giwa/runtime`
- Produces: idempotent executable `/opt/giwa/runtime/node-v22.16.0/bin/node`
- Output contract: `isolated-node v22.16.0 ready`

- [ ] **Step 1: Add the failing installer contract test**

Add this test inside `describe("Lightsail host scripts", ...)` before the
backup test:

```ts
it("installs one checksum-bound isolated Node runtime without replacing shared Node", () => {
  const installer = readOps("scripts/install-isolated-node.sh");

  expect(installer).toContain("#!/usr/bin/env bash");
  expect(installer).toContain("set -euo pipefail");
  expect(installer).toContain('node_version="v22.16.0"');
  expect(installer).toContain('archive_name="node-v22.16.0-linux-x64.tar.xz"');
  expect(installer).toContain(
    'expected_sha256="f4cb75bb036f0d0eddf6b79d9596df1aaab9ddccd6a20bf489be5abe9467e84e"'
  );
  expect(installer).toContain('origin="https://nodejs.org/dist/v22.16.0"');
  expect(installer).toContain('runtime_parent="/opt/giwa/runtime"');
  expect(installer).toContain(
    'final_path="/opt/giwa/runtime/node-v22.16.0"'
  );
  expect(installer).toContain('[ "$(id -u)" -eq 0 ]');
  expect(installer).toContain('[ "$(uname -s)" = "Linux" ]');
  expect(installer).toContain('[ "$(uname -m)" = "x86_64" ]');
  expect(installer).toMatch(
    /for command_name in curl tar sha256sum mktemp xz/u
  );
  expect(installer).toContain('curl --fail --silent --show-error --location');
  expect(installer).toContain('SHASUMS256.txt');
  expect(installer).toContain('grep -Fxc "$expected_manifest_line"');
  expect(installer).toContain("sha256sum --check --status");
  expect(installer).toContain('tar -xJf "$archive_path"');
  expect(installer).toContain(
    '[ "$("$candidate_path/bin/node" --version)" = "$node_version" ]'
  );
  expect(installer).toContain('mv -T --no-clobber "$candidate_path" "$final_path"');
  expect(installer).toContain('[ ! -e "$candidate_path" ]');
  expect(installer).toContain('chown -R root:root "$candidate_path"');
  expect(installer).toContain('chmod -R go-w "$candidate_path"');
  expect(installer).toContain("isolated-node %s ready");
  expect(installer).not.toContain("/usr/bin/node");
  expect(installer).not.toMatch(/curl[^\n]*\|\s*(?:ba)?sh/u);
  expect(installer).not.toMatch(/rm\s+-rf\s+["']?\/opt\/giwa\/runtime/u);
});
```

Add `"scripts/install-isolated-node.sh"` to the `paths` array in the existing
credential/provider/host/database scan test.

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/lightsailOpsAssets.test.ts
```

Expected: FAIL because `ops/lightsail/scripts/install-isolated-node.sh` does not
exist.

- [ ] **Step 3: Create the minimal safe installer**

Create `ops/lightsail/scripts/install-isolated-node.sh` with:

```bash
#!/usr/bin/env bash
set -euo pipefail

umask 022

node_version="v22.16.0"
archive_name="node-v22.16.0-linux-x64.tar.xz"
expected_sha256="f4cb75bb036f0d0eddf6b79d9596df1aaab9ddccd6a20bf489be5abe9467e84e"
origin="https://nodejs.org/dist/v22.16.0"
runtime_parent="/opt/giwa/runtime"
final_path="/opt/giwa/runtime/node-v22.16.0"
temp_dir=""

cleanup() {
  status=$?
  trap - EXIT
  if [ -n "$temp_dir" ]; then
    case "$temp_dir" in
      "$runtime_parent"/.node-"$node_version"-????????)
        rm -rf -- "$temp_dir"
        ;;
      *)
        printf '%s\n' "isolated node cleanup refused" >&2
        status=1
        ;;
    esac
  fi
  exit "$status"
}
trap cleanup EXIT

[ "$(id -u)" -eq 0 ]
[ "$(uname -s)" = "Linux" ]
[ "$(uname -m)" = "x86_64" ]

for command_name in curl tar sha256sum mktemp xz; do
  command -v "$command_name" >/dev/null 2>&1
done

[ -d "$runtime_parent" ]
[ ! -L "$runtime_parent" ]

if [ -e "$final_path" ] || [ -L "$final_path" ]; then
  [ -d "$final_path" ]
  [ ! -L "$final_path" ]
  [ "$("$final_path/bin/node" --version)" = "$node_version" ]
  printf 'isolated-node %s ready\n' "$node_version"
  exit 0
fi

temp_dir="$(mktemp -d "$runtime_parent/.node-$node_version-XXXXXXXX")"
case "$temp_dir" in
  "$runtime_parent"/.node-"$node_version"-????????) ;;
  *) exit 1 ;;
esac

archive_path="$temp_dir/$archive_name"
manifest_path="$temp_dir/SHASUMS256.txt"
expected_manifest_line="$expected_sha256  $archive_name"

curl --fail --silent --show-error --location \
  --proto '=https' --tlsv1.2 \
  "$origin/SHASUMS256.txt" \
  --output "$manifest_path"
curl --fail --silent --show-error --location \
  --proto '=https' --tlsv1.2 \
  "$origin/$archive_name" \
  --output "$archive_path"

[ "$(grep -Fxc "$expected_manifest_line" "$manifest_path")" -eq 1 ]
(
  cd "$temp_dir"
  printf '%s  %s\n' "$expected_sha256" "$archive_name" |
    sha256sum --check --status
)

tar -xJf "$archive_path" -C "$temp_dir"
candidate_path="$temp_dir/node-$node_version-linux-x64"
[ -d "$candidate_path" ]
[ ! -L "$candidate_path" ]
[ "$("$candidate_path/bin/node" --version)" = "$node_version" ]

chown -R root:root "$candidate_path"
chmod -R go-w "$candidate_path"
mv -T --no-clobber "$candidate_path" "$final_path"
[ ! -e "$candidate_path" ]
[ -d "$final_path" ]
[ ! -L "$final_path" ]
[ "$("$final_path/bin/node" --version)" = "$node_version" ]

printf 'isolated-node %s ready\n' "$node_version"
```

- [ ] **Step 4: Run syntax and focused tests**

Run:

```powershell
bash -n ops/lightsail/scripts/install-isolated-node.sh
pnpm --filter @giwa/web exec vitest run src/lib/live/lightsailOpsAssets.test.ts
```

Expected: shell syntax exits `0`; focused Vitest file passes.

- [ ] **Step 5: Commit the installer**

```powershell
git add ops/lightsail/scripts/install-isolated-node.sh apps/web/src/lib/live/lightsailOpsAssets.test.ts
git commit -m "feat(ops): add isolated Node installer"
```

---

### Task 2: Bind GIWA Services To The Isolated Runtime

**Files:**
- Modify: `ops/lightsail/systemd/giwa-static.service`
- Modify: `ops/lightsail/systemd/giwa-live.service`
- Modify: `apps/web/src/lib/live/lightsailOpsAssets.test.ts`

**Interfaces:**
- Consumes: `/opt/giwa/runtime/node-v22.16.0/bin/node` from Task 1
- Produces: two GIWA units with no dependency on shared `/usr/bin/node`

- [ ] **Step 1: Change the unit assertions first**

At the top of the systemd test, add:

```ts
const isolatedNode = "/opt/giwa/runtime/node-v22.16.0/bin/node";
```

Inside the common unit loop add:

```ts
expect(unit).toContain(isolatedNode);
expect(unit).not.toContain("/usr/bin/node");
```

Add the exact static assertion:

```ts
expect(staticUnit).toContain(
  `ExecStart=${isolatedNode} --experimental-strip-types apps/web/scripts/serve-static.mjs`
);
```

Replace the existing live `ExecStart` expectation with:

```ts
expect(liveUnit).toContain(
  `ExecStart=/usr/bin/env -- HOST=127.0.0.1 PORT=4177 GIWA_LIVE_MODE=staging-testnet GIWA_SKIP_PUBLIC_EXPORT=1 ${isolatedNode} --experimental-strip-types apps/web/scripts/serve-live.mjs`
);
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/lightsailOpsAssets.test.ts
```

Expected: FAIL because both units still contain `/usr/bin/node`.

- [ ] **Step 3: Update only the two ExecStart lines**

In `ops/lightsail/systemd/giwa-static.service` use:

```ini
ExecStart=/opt/giwa/runtime/node-v22.16.0/bin/node --experimental-strip-types apps/web/scripts/serve-static.mjs
```

In `ops/lightsail/systemd/giwa-live.service` use:

```ini
ExecStart=/usr/bin/env -- HOST=127.0.0.1 PORT=4177 GIWA_LIVE_MODE=staging-testnet GIWA_SKIP_PUBLIC_EXPORT=1 /opt/giwa/runtime/node-v22.16.0/bin/node --experimental-strip-types apps/web/scripts/serve-live.mjs
```

Do not change any environment, sandboxing, working-directory or write-path
line.

- [ ] **Step 4: Run focused tests**

Run:

```powershell
pnpm --filter @giwa/web exec vitest run src/lib/live/lightsailOpsAssets.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the unit binding**

```powershell
git add ops/lightsail/systemd/giwa-static.service ops/lightsail/systemd/giwa-live.service apps/web/src/lib/live/lightsailOpsAssets.test.ts
git commit -m "fix(ops): isolate GIWA Node runtime"
```

---

### Task 3: Reconcile The Current Runbook And Historical Execution Plan

**Files:**
- Modify: `docs/implementation/giwa-gasok-staging-runbook.md`
- Modify: `docs/implementation/giwa-lightsail-staging-deploy-execution-plan.md`

**Interfaces:**
- Consumes: installer path and unit contract from Tasks 1–2
- Produces: one current source of truth that never requires shared Node mutation

- [ ] **Step 1: Update the current runbook asset and preflight tables**

Add this versioned asset row:

```markdown
| isolated Node installer | `ops/lightsail/scripts/install-isolated-node.sh` | exact release에서 root로 실행 |
```

Replace `/usr/bin/node` as a GIWA readiness criterion with:

```bash
isolated_node="/opt/giwa/runtime/node-v22.16.0/bin/node"
test "$("$isolated_node" --version)" = "v22.16.0"
test "$(PATH="$(dirname "$isolated_node"):$PATH" pnpm --version)" = "10.32.1"
```

State explicitly:

- system Node is shared-host context only;
- its version is recorded but not changed by GIWA deployment;
- the isolated installer must pass before dependency installation;
- existing non-GIWA services are checked before and after GIWA service
  activation and are never restarted by the GIWA rollout.

- [ ] **Step 2: Update build and rollback commands**

Use this build environment:

```bash
isolated_bin="/opt/giwa/runtime/node-v22.16.0/bin"
sudo -u giwa -H env \
  PATH="$isolated_bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
  bash -c 'cd "$1" && test "$(node --version)" = "v22.16.0" && test "$(pnpm --version)" = "10.32.1" && pnpm install --frozen-lockfile && pnpm build' \
  _ "/opt/giwa/releases/$GIWA_STAGE_COMMIT"
```

Add these rollback boundaries:

- ordinary release rollback retains the isolated runtime;
- isolated runtime deletion requires a separate exact-path destructive approval;
- shared system Node and unrelated service state are not rollback targets.

- [ ] **Step 3: Reconcile the historical execution plan**

In `docs/implementation/giwa-lightsail-staging-deploy-execution-plan.md`,
replace the requirement that `node` and `/usr/bin/node` both equal `v22.16.0`
with:

```text
/opt/giwa/runtime/node-v22.16.0/bin/node --version = v22.16.0
PATH-prefixed pnpm --version = 10.32.1
shared /usr/bin/node recorded but not changed or used by GIWA
```

Keep the document labeled historical and point current decisions to the GASOK
runbook.

- [ ] **Step 4: Verify documentation format and scans**

Run:

```powershell
git diff --check
& .\scripts\ci\check-safe-scans.ps1
```

Expected: no diff-format errors and `safe_scans=pass`.

- [ ] **Step 5: Commit the documentation**

```powershell
git add docs/implementation/giwa-gasok-staging-runbook.md docs/implementation/giwa-lightsail-staging-deploy-execution-plan.md
git commit -m "docs: isolate Lightsail Node runtime"
```

---

### Task 4: Run Full Verification And Refresh Provenance

**Files:**
- Modify: `docs/evidence/local-artifact-manifest.json`
- Modify: `docs/evidence/local-command-evidence-report.json`
- Modify: `docs/evidence/local-provenance-report.json`
- Modify: `docs/evidence/local-provenance-report.json.sha256`
- Modify: `docs/evidence/local-provenance-verification.json`

**Interfaces:**
- Consumes: all tracked implementation and documentation changes
- Produces: a green local-advisory source/provenance checkpoint

- [ ] **Step 1: Run focused and aggregate code gates**

```powershell
bash -n ops/lightsail/scripts/install-isolated-node.sh
bash -n ops/lightsail/scripts/backup-live-db.sh
bash -n ops/lightsail/scripts/smoke-local.sh
pnpm --filter @giwa/web exec vitest run src/lib/live/lightsailOpsAssets.test.ts
pnpm typecheck
pnpm test
pnpm build
```

Expected: all shell checks exit `0`; focused test passes; aggregate test count
has zero failures; typecheck and build exit `0`.

- [ ] **Step 2: Run scans and regenerate provenance**

```powershell
& .\scripts\ci\check-safe-scans.ps1
pnpm --filter @giwa/web artifact:local
pnpm --filter @giwa/web artifact:provenance:verify
pnpm --filter @giwa/web exec node --experimental-strip-types scripts/verify-provenance-report.mjs --check
```

Expected: scan, manifest binding, verification and drift decisions are `pass`;
authority remains `local-advisory`, `releaseGrade: false`,
`canUnblockStaging: false`.

- [ ] **Step 3: Inspect the exact final diff**

```powershell
git status --short
git diff --check
git diff --stat
git diff -- docs/evidence/local-artifact-manifest.json docs/evidence/local-command-evidence-report.json docs/evidence/local-provenance-report.json docs/evidence/local-provenance-verification.json
```

Expected: only the five generated provenance files are uncommitted at this
checkpoint.

- [ ] **Step 4: Commit the refreshed provenance**

```powershell
git add docs/evidence/local-artifact-manifest.json docs/evidence/local-command-evidence-report.json docs/evidence/local-provenance-report.json docs/evidence/local-provenance-report.json.sha256 docs/evidence/local-provenance-verification.json
git commit -m "chore: refresh isolated runtime provenance"
```

- [ ] **Step 5: Verify the committed checkpoint**

```powershell
git status --short
git log -1 --format='%H %s'
pnpm --filter @giwa/web exec node --experimental-strip-types scripts/verify-provenance-report.mjs --check
```

Expected: clean tracked worktree and provenance check `pass`.

---

### Task 5: Publish The New Exact Deployment Commit

**Files:**
- Remote branch only: `origin/codex/gasok-staging-deploy`

**Interfaces:**
- Consumes: clean verified local `HEAD`
- Produces: remotely fetchable exact commit without changing `origin/main`

- [ ] **Step 1: Bind and validate the exact commit**

```powershell
$env:GIWA_STAGE_COMMIT = git rev-parse HEAD
if ($env:GIWA_STAGE_COMMIT -notmatch '^[a-f0-9]{40}$') {
  throw "invalid exact commit"
}
if (git status --short) {
  throw "worktree must be clean"
}
git log -1 --format='%H %s'
```

- [ ] **Step 2: Push only the approved deployment branch**

```powershell
git push origin HEAD:refs/heads/codex/gasok-staging-deploy
```

Expected: fast-forward update. Stop on non-fast-forward; do not force.

- [ ] **Step 3: Verify remote binding**

```powershell
$remote = (
  git ls-remote --heads origin refs/heads/codex/gasok-staging-deploy
).Split()[0]
if ($remote -ne $env:GIWA_STAGE_COMMIT) {
  throw "remote deployment branch mismatch"
}
```

Expected: remote hash exactly equals local exact commit.

---

### Task 6: Install The Isolated Runtime And Static Release On The Shared Host

**Files:**
- Host: `/opt/giwa/runtime/node-v22.16.0`
- Host: `/opt/giwa/releases/$GIWA_STAGE_COMMIT`
- Host: `/opt/giwa/current`
- Host: `/etc/systemd/system/giwa-static.service`
- Host: `/etc/systemd/system/giwa-live.service`
- Modify local-only: `docs/evidence/local/lightsail-access-operator-note.md`

**Interfaces:**
- Consumes: private `GIWA_STAGE_SSH`, `GIWA_STAGE_KEY`,
  `GIWA_STAGE_COMMIT`; public remote deployment branch
- Produces: active loopback-only static service running isolated Node
- Does not produce: live service, Nginx route, DNS, HTTPS or public traffic

- [ ] **Step 1: Validate private operator inputs without printing values**

```powershell
foreach ($name in "GIWA_STAGE_SSH", "GIWA_STAGE_KEY", "GIWA_STAGE_COMMIT") {
  if ([string]::IsNullOrWhiteSpace(
    [Environment]::GetEnvironmentVariable($name)
  )) {
    throw "$name is required"
  }
}
if ($env:GIWA_STAGE_COMMIT -notmatch '^[a-f0-9]{40}$') {
  throw "invalid exact commit"
}
if (-not (Test-Path -LiteralPath $env:GIWA_STAGE_KEY -PathType Leaf)) {
  throw "SSH key not found"
}
```

- [ ] **Step 2: Reconfirm shared-host safety baseline**

Through strict host-key SSH, record only labels and states for:

```bash
/usr/bin/node --version
pnpm --version
sqlite3 --version
ss -ltnH
systemctl is-active coinary-datafeed.service
systemctl is-active coinary-ws.service
systemctl is-active newjs-backend.service
systemctl is-active newjs-crawler.service
systemctl is-active vibee-api.service
systemctl is-active vibee-web.service
systemctl is-active nginx.service
systemctl is-active mariadb.service
systemctl is-active redis-server.service
```

Expected: system Node remains host-owned, ports `4176` and `4177` are free, and
the previously active unrelated services remain active.

- [ ] **Step 3: Create only the approved GIWA identity and directories**

Run on the host:

```bash
set -euo pipefail

if ! getent passwd giwa >/dev/null; then
  sudo useradd --system --user-group \
    --home-dir /var/lib/giwa \
    --shell /usr/sbin/nologin \
    giwa
fi

test "$(getent passwd giwa | cut -d: -f6)" = "/var/lib/giwa"
test "$(getent passwd giwa | cut -d: -f7)" = "/usr/sbin/nologin"

sudo install -d -o root -g root -m 0755 /opt/giwa
sudo install -d -o root -g root -m 0755 /opt/giwa/runtime
sudo install -d -o giwa -g giwa -m 0755 /opt/giwa/releases
sudo install -d -o giwa -g giwa -m 0700 /var/lib/giwa
sudo install -d -o giwa -g giwa -m 0700 /var/lib/giwa/backups
sudo install -d -o root -g giwa -m 0750 /etc/giwa
```

Do not create `/etc/giwa/giwa-live.runtime` yet.

- [ ] **Step 4: Fetch the exact release without activating it**

Run on the host with `GIWA_STAGE_COMMIT` supplied privately:

```bash
set -euo pipefail

release="/opt/giwa/releases/$GIWA_STAGE_COMMIT"
test ! -e "$release"

sudo -u giwa -H git clone \
  --branch codex/gasok-staging-deploy \
  --single-branch \
  --no-checkout \
  https://github.com/aop60003/giwa-verified-intent-rail.git \
  "$release"

sudo -u giwa -H git -C "$release" checkout --detach "$GIWA_STAGE_COMMIT"
test "$(sudo -u giwa -H git -C "$release" rev-parse HEAD)" = \
  "$GIWA_STAGE_COMMIT"
```

- [ ] **Step 5: Install and verify the isolated Node runtime**

```bash
set -euo pipefail

release="/opt/giwa/releases/$GIWA_STAGE_COMMIT"
sudo bash -n "$release/ops/lightsail/scripts/install-isolated-node.sh"
sudo "$release/ops/lightsail/scripts/install-isolated-node.sh"

isolated_node="/opt/giwa/runtime/node-v22.16.0/bin/node"
test "$("$isolated_node" --version)" = "v22.16.0"
test "$(/usr/bin/node --version)" = "v22.22.0"
```

Expected: bounded installer success label, isolated Node `v22.16.0`, shared
Node unchanged.

- [ ] **Step 6: Install dependencies and build as `giwa`**

```bash
set -euo pipefail

release="/opt/giwa/releases/$GIWA_STAGE_COMMIT"
isolated_bin="/opt/giwa/runtime/node-v22.16.0/bin"
bounded_path="$isolated_bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

sudo -u giwa -H env PATH="$bounded_path" \
  bash -c '
    set -euo pipefail
    cd "$1"
    test "$(node --version)" = "v22.16.0"
    test "$(pnpm --version)" = "10.32.1"
    pnpm install --frozen-lockfile
    pnpm build
    bash -n ops/lightsail/scripts/install-isolated-node.sh
    bash -n ops/lightsail/scripts/backup-live-db.sh
    bash -n ops/lightsail/scripts/smoke-local.sh
  ' _ "$release"
```

Expected: exact runtime and pnpm checks, frozen install, build and three shell
syntax checks all pass.

- [ ] **Step 7: Activate the first immutable release**

Because the preflight proved there is no previous GIWA release:

```bash
set -euo pipefail

release="/opt/giwa/releases/$GIWA_STAGE_COMMIT"
candidate="/opt/giwa/.current-$GIWA_STAGE_COMMIT"

test ! -e /opt/giwa/current
test ! -L /opt/giwa/current
test ! -e "$candidate"
test ! -L "$candidate"

sudo ln -s "$release" "$candidate"
sudo mv -T --no-clobber "$candidate" /opt/giwa/current
test ! -e "$candidate"
test "$(readlink -f /opt/giwa/current)" = "$release"
```

- [ ] **Step 8: Install units and start static only**

```bash
set -euo pipefail

sudo install -o root -g root -m 0644 \
  /opt/giwa/current/ops/lightsail/systemd/giwa-static.service \
  /etc/systemd/system/giwa-static.service
sudo install -o root -g root -m 0644 \
  /opt/giwa/current/ops/lightsail/systemd/giwa-live.service \
  /etc/systemd/system/giwa-live.service

sudo systemctl daemon-reload
sudo systemctl enable giwa-static.service
sudo systemctl restart giwa-static.service

test "$(sudo systemctl is-active giwa-static.service)" = "active"
test "$(sudo systemctl is-active giwa-live.service 2>/dev/null || true)" != \
  "active"
```

Do not create runtime values and do not start live.

- [ ] **Step 9: Verify isolated process, localhost bind and static page**

```bash
set -euo pipefail

static_pid="$(
  sudo systemctl show --property MainPID --value giwa-static.service
)"
test "$static_pid" -gt 0
test "$(sudo readlink -f "/proc/$static_pid/exe")" = \
  "/opt/giwa/runtime/node-v22.16.0/bin/node"
test "$(sudo readlink -f "/proc/$static_pid/cwd")" = \
  "/opt/giwa/releases/$GIWA_STAGE_COMMIT"

ss -ltnH | grep -F "127.0.0.1:4176"
if ss -ltnH | grep -F "127.0.0.1:4177"; then exit 1; fi

body="$(
  curl --fail --silent --show-error --max-time 8 \
    http://127.0.0.1:4176/
)"
case "$body" in
  *"GIWA Verified Intent Rail"*) ;;
  *) exit 1 ;;
esac
```

- [ ] **Step 10: Recheck unrelated services and record local-only evidence**

Re-run the Step 2 service-state labels and verify every previously active
service is still active. Confirm `/usr/bin/node --version` is unchanged.

Append only bounded outcomes to the ignored
`docs/evidence/local/lightsail-access-operator-note.md`:

```text
exactCommit=$GIWA_STAGE_COMMIT
isolatedNode=v22.16.0
systemNode=unchanged
staticService=active
staticBind=127.0.0.1:4176
liveService=inactive
unrelatedServices=unchanged
publicTraffic=not-enabled
```

Do not stage or commit the local operator note.

---

### Task 7: Rejoin The GASOK Staging Deployment Gate

**Files:**
- No tracked change until public values exist

**Interfaces:**
- Consumes: green isolated runtime and static localhost checkpoint
- Produces: explicit next authorization boundary for the existing Task 14 plan

- [ ] **Step 1: Stop before live and public mutation**

Require actual values for:

```text
publicHostname
releaseOwner
rollbackOwner
dnsOwner
httpsMethod
runtimePlacementOwner
```

Expected: no live runtime file, live service start, Nginx candidate, DNS,
certificate or wallet transaction occurs while any value is missing.

- [ ] **Step 2: Resume the existing Task 14 sequence after values exist**

Continue from Task 14 Step 6 live readiness, then Nginx HTTP, DNS, HTTPS,
seven-route public smoke, fresh evaluator wallet flow, rollback rehearsal and
public evidence. Use the current GASOK staging runbook as authority.
