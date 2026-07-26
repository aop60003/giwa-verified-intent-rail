# GIWA Verified Intent Rail GASOK Staging Runbook

## 문서 권한과 현재 상태

이 문서는 GASOK 선발용 `GIWA Verified Intent Rail` 스테이징의 현재 운영 기준이다. 대상은 GIWA Sepolia 테스트넷 한 개 인스턴스뿐이다. 아직 공개 배포, DNS, 인증서, 공개 지갑 실행은 완료되지 않았으며 외부에서 작동한다고 주장하지 않는다. Sprint 51~53 문서는 당시 계획을 보존한 역사 자료이고, 충돌할 경우 이 문서와 `ops/lightsail`의 버전 관리 자산을 따른다.

제품 경계는 다음과 같다.

- 한 문장 약속: 평가자가 서명 전에 고정된 Manifest를 검토하고, 자신의 지갑으로 GIWA Sepolia mock vault 동작을 실행한 뒤, Standard RPC 확인 증거가 Manifest와 일치할 때만 공개 Receipt를 받는다.
- No real funds; no RWA issuance or yield; no production asset issuance, payment, settlement, KYC service, phishing prevention, or security guarantee.
- 이 앱의 mock token과 mock vault는 테스트넷 데모 자산이다.
- Standard RPC confirmation evidence is not finality or settlement.
- SQLite와 메모리 기반 rate limit은 단일 Lightsail 인스턴스를 위한 스테이징 선택이다. 수평 확장이나 프로덕션 내구성을 주장하지 않는다.

## 사람 승인 게이트

Codex가 준비와 검증을 수행해도 다음 단계는 해당 권한을 가진 사람이 명시적으로 승인해야 한다.

| 게이트 | 실행 전 필요한 기록 |
| --- | --- |
| Git push | 정확한 source commit, 대상 remote/branch, 승인자 |
| 호스트 패키지 설치 | CI-compatible Node `22.16.0`, pnpm `10.32.1`, Nginx, `sqlite3`, certbot 또는 선택한 인증서 도구, 설치 승인자 |
| Lightsail 변경 | 인스턴스/리전/플랜, 비용 책임자, release owner, rollback owner |
| DNS | 호스트명, static IP, DNS owner |
| HTTPS/certificate | 인증서 방식, 갱신 책임자, 승인자 |
| 런타임 값 배치 | 승인된 비공개 전달 채널과 배치 담당자; values excluded from repository and evidence |
| 지갑 동작 | 연결, 네트워크 전환, mint/approve/deposit 각각의 사용자 확인 |
| DB restore 또는 파괴적 변경 | write 중지 증거, 호환성 평가, restore owner의 별도 승인 |

승인이 없으면 해당 단계에서 멈춘다. 이 문서는 push, 패키지 설치, DNS, 인증서 발급, 지갑 서명 또는 DB restore 권한을 부여하지 않는다.

## Windows PowerShell SSH 접속 인계

2026-07-26 기준으로 사용자는 기존 Ubuntu Lightsail 호스트에 Windows
PowerShell과 Lightsail PEM 키로 접근할 수 있다고 제공했다. 이는 접속
수단이 있다는 확인일 뿐이며, Codex의 SSH 접속, 호스트 변경, 패키지 설치,
파일 전송 또는 배포 승인이 아니다.

정확한 IP와 로컬 키 경로는 공개 저장소에 기록하지 않는다. 운영자별 실제
값은 gitignore된 `docs/evidence/local/lightsail-access-operator-note.md`에만
보관하고, 추적되는 문서에서는 다음 형태를 사용한다.

```powershell
$keyPath = "<absolute-path-to-lightsail-pem>"
$sshTarget = "ubuntu@<lightsail-static-ip>"

if (-not (Test-Path -LiteralPath $keyPath -PathType Leaf)) {
  throw "Lightsail PEM key not found."
}

ssh -i "$keyPath" -o IdentitiesOnly=yes $sshTarget
```

- PEM 파일의 내용은 읽거나 출력하거나 저장소에 복사하지 않는다.
- 첫 접속 또는 host key 변경 시 Lightsail 콘솔 등 별도 신뢰 채널에서
  fingerprint를 확인한다.
- `StrictHostKeyChecking=no`를 사용하거나 host key 불일치를 자동으로
  삭제·수락하지 않는다.
- SSH 명령을 문서화했다는 사실을 접속 또는 변경 승인으로 해석하지 않는다.

## Lightsail 다음 단계

### 0. 로컬 source 상태 고정

문서 변경을 포함한 최종 작업이 끝난 뒤 clean worktree에서 배포할 exact
40-character commit을 새로 선택한다.

```powershell
git status --short
git rev-parse HEAD
git rev-list --left-right --count "origin/main...HEAD"
```

선택한 commit이 remote에 없으면 전송 방식도 별도로 승인한다.

1. exact commit을 승인된 remote/branch로 push
2. exact commit에서 immutable artifact를 만들고 승인된 SSH/SCP 채널로 전송

두 방식 모두 외부 변경이며 자동 승인되지 않는다. dirty worktree, 불명확한
commit, 또는 host에서 검증할 수 없는 artifact면 중지한다.

### 1. 읽기 전용 SSH preflight

사용자가 읽기 전용 점검을 명시적으로 지시한 뒤에만 SSH로 접속한다. 첫
세션에서는 설치, 삭제, 업그레이드, 서비스 재시작, 파일 생성 또는 설정
변경을 하지 않고 다음 상태만 확인한다.

```bash
whoami
hostname
df -h /
df -i /
sudo du -xhd1 /opt /var /home 2>/dev/null | sort -h
readlink -f /opt/giwa/current 2>/dev/null || true
systemctl is-active giwa-static.service 2>/dev/null || true
systemctl is-active giwa-live.service 2>/dev/null || true
node --version 2>/dev/null || true
/usr/bin/node --version 2>/dev/null || true
pnpm --version 2>/dev/null || true
nginx -v 2>&1 || true
sqlite3 --version 2>/dev/null || true
```

`env`, `printenv`, runtime file 출력, process environment 조회, PEM 출력은
금지한다. 결과에는 host명, 용량 범주, 버전, 서비스 상태만 남기고 runtime
값이나 인증 정보를 포함하지 않는다.

### 2. 디스크와 rollback 여유 판정

새 immutable release, 의존성·build 중 peak, SQLite backup 한 개, 기존
rollback release를 동시에 보존할 수 있는지 계산한다. 고정 임계치를
추측하지 말고 실제 artifact 크기와 host 결과로 필요한 용량을 기록한다.

- 여유가 충분하면 source 전송 승인 단계로 이동한다.
- 부족하면 배포를 시작하지 않는다.
- 기존 release나 backup을 임의로 삭제하지 않는다.
- 공간 확장·플랜 변경은 비용 승인 뒤에만 수행한다.
- 정리로 해결하려면 삭제 대상의 절대 경로, 현재 symlink/서비스 참조 여부,
  rollback 보존 여부를 먼저 확인하고 별도 파괴적 작업 승인을 받는다.

### 3. 변경 승인 묶음 확정

실행 전에 다음 항목을 각각 실제 값과 책임자로 채운다.

1. exact source commit과 source 전송 방식
2. protected CI evidence 또는 기간이 정해진 GASOK-only local-advisory 예외
3. host package 설치·버전 변경 승인
4. release owner와 rollback owner
5. server-only runtime 값 전달·배치 담당자
6. Nginx 변경, DNS, HTTPS/certificate 승인과 책임자
7. 공개 smoke 뒤 fresh testnet wallet transaction 승인

하나라도 비어 있으면 해당 변경 전에서 멈춘다. 모두 갖춰진 뒤에만 아래의
순서가 고정된 rollout을 실행한다.

## 릴리스와 상태 레이아웃

```text
/opt/giwa/releases/<40-character-source-commit>/  immutable release
/opt/giwa/current                                active release symlink
/opt/giwa/runtime/node-v22.16.0/                 root-owned isolated Node runtime
/etc/giwa/giwa-live.runtime                      server-only runtime file
/var/lib/giwa/giwa-live.sqlite                   active SQLite database
/var/lib/giwa/backups/                           SQLite backup files
/etc/systemd/system/giwa-static.service
/etc/systemd/system/giwa-live.service
/etc/systemd/system/giwa-backup.service
/etc/systemd/system/giwa-backup.timer
/etc/nginx/sites-available/giwa-staging*.conf     rendered candidate/current config
/etc/nginx/sites-enabled/giwa-staging.conf        active Nginx link
```

- 릴리스 디렉터리는 build가 끝난 뒤 변경하지 않는다.
- `/opt/giwa/current`만 검증된 릴리스 사이에서 원자적으로 전환한다.
- DB와 backup은 릴리스 밖에 둔다. 릴리스 rollback이 DB rollback을 자동으로 뜻하지 않는다.
- 서비스 계정은 non-root `giwa`이며 Node 서비스는 loopback에만 bind한다.

## 버전 관리 운영 자산

| 자산 | 릴리스 내 경로 | 설치/실행 위치 |
| --- | --- | --- |
| static unit | `ops/lightsail/systemd/giwa-static.service` | `/etc/systemd/system/giwa-static.service` |
| live unit | `ops/lightsail/systemd/giwa-live.service` | `/etc/systemd/system/giwa-live.service` |
| backup unit | `ops/lightsail/systemd/giwa-backup.service` | `/etc/systemd/system/giwa-backup.service` |
| backup timer | `ops/lightsail/systemd/giwa-backup.timer` | `/etc/systemd/system/giwa-backup.timer` |
| Nginx template | `ops/lightsail/nginx/giwa-staging.conf.template` | renderer input; 직접 설치하지 않음 |
| Nginx renderer | `ops/lightsail/render-nginx-config.mjs` | `/opt/giwa/current` 아래에서 실행 |
| isolated Node installer | `ops/lightsail/scripts/install-isolated-node.sh` | exact release에서 root로 실행 |
| backup script | `ops/lightsail/scripts/backup-live-db.sh` | backup unit이 versioned path로 실행 |
| local smoke | `ops/lightsail/scripts/smoke-local.sh` | host에서 release asset을 실행 |

서비스 계약:

| 서비스 | bind | 쓰기 범위 | 비고 |
| --- | --- | --- | --- |
| `giwa-static.service` | `127.0.0.1:4176` | application write 없음 | `/`, `/demo`, `/partner` 및 live 장애 시 `/user*` fallback |
| `giwa-live.service` | `127.0.0.1:4177` | `/var/lib/giwa` | `/user*`, `/api/*`, `/healthz`, `/readyz` |
| `giwa-backup.service` | network bind 없음 | `/var/lib/giwa/backups` | `backup-live-db.sh`만 실행 |
| `giwa-backup.timer` | 해당 없음 | 해당 없음 | daily, persistent, 최대 30분 randomized delay |

두 Node 서비스 모두 unit이 `GIWA_SKIP_PUBLIC_EXPORT=1`을 강제하고 `/opt/giwa/runtime/node-v22.16.0/bin/node`를 직접 실행한다. live service는 이 격리 바이너리로 `--experimental-strip-types apps/web/scripts/serve-live.mjs`를 실행한다.

## 런타임 파일 계약

`/etc/giwa/giwa-live.runtime`에는 이름과 실제 값만 호스트에서 배치한다. 이 문서, Git, 로그, smoke 출력, 제출 증거에는 값을 기록하지 않는다. `requireLiveServerEnv`와 `.env.example`에 따른 스테이징 runtime file의 정확한 필수 이름은 다음과 같다.

| 이름 | 경계 |
| --- | --- |
| `GIWA_SEPOLIA_RPC_URL` | server-only value; values excluded from docs and evidence |
| `GIWA_EXPLORER_TX_URL_TEMPLATE` | transaction explorer URL template |
| `GIWA_EXPLORER_ADDRESS_URL_TEMPLATE` | address explorer URL template |
| `CAMPAIGN_SIGNER_PRIVATE_KEY` | server-only signing value; values never logged or committed |
| `GIWA_LIVE_ALLOWED_ORIGINS` | 승인된 HTTPS origin의 정확한 목록; public origin이 정확히 한 번 포함됨 |
| `GIWA_LIVE_PARTNER_CREDENTIAL_HASHES` | protected partner credential hash 목록; raw credential values excluded |
| `GIWA_LIVE_PUBLIC_ORIGIN` | 공개 HTTPS origin 하나 |
| `GIWA_LIVE_MIN_GAS_WEI` | nonnegative decimal |
| `GIWA_LIVE_FAUCET_HELP_URL` | HTTPS recovery URL |
| `GIWA_LIVE_INCOMPLETE_RUN_RETENTION_HOURS` | positive integer hours |
| `GIWA_LIVE_DB_PATH` | `/var/lib/giwa` 아래 absolute path |

위 표의 11개가 `requireLiveServerEnv`가 스테이징에서 요구하는 정확한 필수 집합이다. `GIWA_LIVE_PARTNER_TENANT_ID`는 선택 항목이며 코드 기본값은 `tenant_default`다. GASOK 배포 정책은 final freeze 전에 이 선택 항목을 명시적으로 설정하고, 실제 값 대신 `explicitly-set` 결정만 evidence에 기록하는 것이다. 누락되어 기본값에 의존하면 runtime은 시작할 수 있어도 submission freeze는 no-go다.

`GIWA_LIVE_MOCK_MODE`는 필수나 선택 항목이 아니다. 스테이징에서는 `GIWA_LIVE_MOCK_MODE=1`을 금지하고 runtime file에 이름 자체를 넣지 않는다. mock mode는 local API contract rehearsal에만 사용한다.

다음 reserved keys는 runtime file에 넣지 않는다. `giwa-live.service`의 `ExecStart`가 이를 강제하여 runtime file override를 막는다.

| 제외 이름 | 강제 값 |
| --- | --- |
| `HOST` | `127.0.0.1` |
| `PORT` | `4177` |
| `GIWA_LIVE_MODE` | `staging-testnet` |
| `GIWA_SKIP_PUBLIC_EXPORT` | `1` |

`.env.example`의 다른 역할 키, Flashblocks endpoint, demo wallet, public build 변수를 이 runtime file의 스테이징 필수 집합으로 확대하지 않는다. Flashblocks는 최종 확인 계산에 사용하지 않는다.

## 배포 의사결정 게이트

기본값은 **선택한 정확한 source commit에 대한 current protected CI evidence**다. 현재 이 문서에는 GASOK 예외 승인이 기록되어 있지 않다.

외부 계정 상태 때문에 protected CI가 사용할 수 없을 때만 사용자가 GASOK 선발 스테이징에 한정된 local-advisory 예외를 별도로 승인할 수 있다. 기록은 네 필드를 모두 가져야 한다.

```text
sourceCommit=<exact 40-character commit>
scope=GASOK selection staging only
approver=<named human approver>
expiresOn=<YYYY-MM-DD>
```

이 예외는 protected CI가 아니며 release-grade provenance로 표현하지 않는다. 기록된 scope 밖이나 expiry 이후에는 재사용할 수 없다.

## 순서가 고정된 rollout

### 1. 전제조건과 source commit 고정

1. release owner와 rollback owner를 기록한다.
2. push, host packages, runtime placement, DNS, HTTPS 승인 상태를 확인한다.
3. protected CI evidence 또는 승인된 GASOK-only 예외를 확인한다.
4. local worktree가 clean인지 확인하고 exact 40-character source commit을 기록한다.
5. rollback 대상의 이전 `/opt/giwa/current` symlink와 이전 unit/Nginx candidate를 기록한다.

하나라도 없으면 host mutation을 시작하지 않는다.

### 2. immutable artifact 생성

승인된 push와 host package 설치가 완료된 뒤에만 다음 순서를 사용한다.

공유 `/usr/bin/node`는 shared-host context일 뿐이다. 버전은 변경 전후에
기록하지만 GIWA 배포가 바꾸거나 실행 경로로 사용하지 않는다. exact release의
`ops/lightsail/scripts/install-isolated-node.sh`가 성공한 뒤에만 dependency
설치를 시작한다.

```bash
sudo bash "/opt/giwa/releases/$GIWA_STAGE_COMMIT/ops/lightsail/scripts/install-isolated-node.sh"

isolated_node="/opt/giwa/runtime/node-v22.16.0/bin/node"
test "$("$isolated_node" --version)" = "v22.16.0"
test "$(PATH="$(dirname "$isolated_node"):$PATH" pnpm --version)" = "10.32.1"
/usr/bin/node --version
```

corepack을 사용하는 경우 그 버전을 release evidence에 기록하고, 격리 Node가
PATH 앞에 놓인 상태의 pnpm이 `10.32.1`인지 다시 확인한다. package install,
corepack activation 또는 version 변경은 별도 host approval 뒤에만 수행한다.

```bash
isolated_bin="/opt/giwa/runtime/node-v22.16.0/bin"
sudo -u giwa -H env \
  PATH="$isolated_bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
  bash -c 'cd "$1" && test "$(node --version)" = "v22.16.0" && test "$(pnpm --version)" = "10.32.1" && pnpm install --frozen-lockfile && pnpm build' \
  _ "/opt/giwa/releases/$GIWA_STAGE_COMMIT"

sudo -u giwa -H env \
  PATH="$isolated_bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
  node --check "/opt/giwa/releases/$GIWA_STAGE_COMMIT/ops/lightsail/render-nginx-config.mjs"
bash -n "/opt/giwa/releases/$GIWA_STAGE_COMMIT/ops/lightsail/scripts/install-isolated-node.sh"
bash -n "/opt/giwa/releases/$GIWA_STAGE_COMMIT/ops/lightsail/scripts/backup-live-db.sh"
bash -n "/opt/giwa/releases/$GIWA_STAGE_COMMIT/ops/lightsail/scripts/smoke-local.sh"
```

build 성공 전에는 `/opt/giwa/current`를 바꾸지 않는다. artifact가 exact commit과 일치하는지 기록하고 릴리스 디렉터리를 immutable로 취급한다.

### 3. DB backup과 schema compatibility

기존 live DB가 있으면 write 전환 전에 exact backup command를 실행한다.

```bash
sudo systemctl start giwa-backup.service
sudo systemctl --no-pager --full status giwa-backup.service
```

unit은 `/opt/giwa/current/ops/lightsail/scripts/backup-live-db.sh`를 호출하고 SQLite `.backup` 뒤 `PRAGMA quick_check`가 `ok`인지 확인한다. 출력에는 backup filename만 남아야 한다. backup 실패, migration 누락, legacy incompatible schema 또는 `/readyz`의 schema category 실패는 no-go다.

SQLite WAL 상태에서도 파일 복사 대신 versioned script의 `sqlite3 .backup`을 사용한다. 복원 훈련은 active DB가 아닌 별도 경로에서 backup을 열어 `PRAGMA quick_check`와 새 릴리스의 schema compatibility를 확인한다. 실제 active DB 교체는 write를 멈추고 owner가 승인한 경우에만 수행한다.

`backup-live-db.sh`는 오래된 파일을 삭제하지 않는다. 운영자는 `/var/lib/giwa/backups` 용량 증가를 관찰하고 승인된 retention/storage 정책을 별도로 기록해야 한다. 디스크 임계치와 외부 보관 방식이 없으면 release owner가 no-go를 선택한다.

### 4. service candidate 설치와 localhost smoke

GIWA service activation 전후에 기존 non-GIWA service의 active 상태를 label로
기록하고 비교한다. GIWA rollout은 그 서비스를 restart하지 않으며 상태가
달라지면 즉시 중지한다.

1. 네 unit 파일을 exact release에서 `/etc/systemd/system`의 candidate로 복사하고 이전 파일을 보존한다.
2. `/etc/giwa/giwa-live.runtime`의 owner/mode와 변수 이름만 검토한다. 값은 출력하지 않는다.
3. `/opt/giwa/current`를 새 immutable release로 전환한다.
4. host service mutation 승인 아래 `systemctl daemon-reload`를 실행한다.
5. static을 먼저 `restart`하고 Active/MainPID/release cwd를 확인한다. 실패하면 기존 static fallback 복구로 전환한다.
6. static 검증 뒤에만 live를 `restart`하고 같은 검증을 수행한다. schema가 호환되지 않거나 `/readyz`가 green이 아니면 live를 즉시 중지하고 검증된 static은 유지한다.
7. 두 process가 정확한 새 release를 실행한다는 증거를 기록한 뒤에만 loopback smoke를 실행한다.

`systemctl start`는 이미 실행 중인 old process를 교체하지 않으므로 release 전환에 사용하지 않는다. 다음 명령은 approval-gated host checkpoint이며 `GIWA_STAGE_COMMIT`은 사전에 검증한 exact 40-character commit이다.

```bash
set -euo pipefail
current_release="$(readlink -f /opt/giwa/current)"
expected_release="$(readlink -f "/opt/giwa/releases/$GIWA_STAGE_COMMIT")"
test "$current_release" = "$expected_release"

sudo systemctl daemon-reload
sudo systemctl restart giwa-static.service
test "$(sudo systemctl is-active giwa-static.service)" = "active"
static_pid="$(sudo systemctl show --property MainPID --value giwa-static.service)"
test "$static_pid" -gt 0
test "$(sudo readlink -f "/proc/$static_pid/cwd")" = "$current_release"

sudo systemctl restart giwa-live.service
test "$(sudo systemctl is-active giwa-live.service)" = "active"
live_pid="$(sudo systemctl show --property MainPID --value giwa-live.service)"
test "$live_pid" -gt 0
test "$(sudo readlink -f "/proc/$live_pid/cwd")" = "$current_release"
```

evidence에는 exact source commit, `current_release`, `expected_release`, `static_pid`, `live_pid`, 두 Active 상태와 두 `/proc/<MainPID>/cwd` 확인 결과를 기록한다. runtime values나 process environment는 기록하지 않는다. backup timer의 enable/start는 이 release process 검증과 분리한다.

Exact local smoke command:

```bash
sudo -u giwa /opt/giwa/current/ops/lightsail/scripts/smoke-local.sh
```

필수 결과는 static, live, healthz, readyz, public-config 다섯 label의 `pass`다. `ss` 등 호스트 도구로 `4176`과 `4177`이 `127.0.0.1`에만 bind하는지도 확인한다.

### 5. Nginx candidate, syntax checkpoint, HTTP

renderer는 output을 `/etc/nginx/sites-available` 또는 `/etc/nginx/conf.d` 아래의 허용된 새 파일에만 생성하며 기존 파일을 덮어쓰지 않는다. lowercase short commit으로 아직 존재하지 않는 candidate 이름을 만든다.

```bash
set -euo pipefail
candidate_id="${GIWA_STAGE_COMMIT:0:12}-$(date -u +%Y%m%d%H%M%S)"
candidate="/etc/nginx/sites-available/giwa-staging.candidate-${candidate_id}.conf"
enabled_link="/etc/nginx/sites-enabled/giwa-staging.conf"
temporary_link="/etc/nginx/sites-enabled/.giwa-staging-${candidate_id}.tmp"
restore_link="/etc/nginx/sites-enabled/.giwa-staging-restore-${candidate_id}.tmp"

test ! -e "$candidate"
test ! -e "$temporary_link" && test ! -L "$temporary_link"
test ! -e "$restore_link" && test ! -L "$restore_link"
if [ -e "$enabled_link" ] && [ ! -L "$enabled_link" ]; then exit 1; fi
previous_target="$(readlink "$enabled_link" 2>/dev/null || true)"

sudo env GIWA_STAGE_HOST="$GIWA_STAGE_HOST" \
  node /opt/giwa/current/ops/lightsail/render-nginx-config.mjs \
  "$candidate"

sudo ln -s "$candidate" "$temporary_link"
sudo mv -Tf "$temporary_link" "$enabled_link"
tested_target="$(readlink "$enabled_link")"
test "$tested_target" = "$candidate"

set +e
nginx_test_output="$(sudo nginx -t 2>&1)"
nginx_test_status=$?
set -e

if [ "$nginx_test_status" -ne 0 ]; then
  if [ -n "$previous_target" ]; then
    sudo ln -s "$previous_target" "$restore_link"
    sudo mv -Tf "$restore_link" "$enabled_link"
  else
    sudo rm -- "$enabled_link"
  fi
  sudo nginx -t
  printf '%s\n' "$nginx_test_output"
  exit "$nginx_test_status"
fi

printf '%s\n' "$nginx_test_output"
sudo systemctl reload nginx
```

candidate render, enabled link의 atomic replace, `nginx -t`, 실패 시 이전 link의 atomic restore와 재검증, 성공 시 reload까지가 하나의 approval-gated host change다. 성공한 `nginx -t` 뒤에는 config/link/file을 더 변경하지 않고 그 exact tested link state를 `systemctl reload nginx`로 읽힌다. candidate path, `previous_target`, `tested_target`, `nginx_test_status`, `nginx_test_output`을 evidence에 기록한다. renderer output 제한을 우회하려고 임의의 temp directory에 쓰지 않는다.

Nginx 소유권은 다음과 같다.

| 공개 route | 정상 upstream | live upstream 장애 |
| --- | --- | --- |
| `/`, `/demo`, `/partner` | static `127.0.0.1:4176` | static 유지 |
| `/user`와 `/user/...` | live `127.0.0.1:4177` | static `/user*` fallback |
| `/api/*`, `/healthz`, `/readyz` | live `127.0.0.1:4177` | bounded HTTP `503` JSON `{"error":"service_unavailable"}` |

### 6. DNS와 certificate

HTTP가 hostname 또는 승인된 temporary host mapping으로 통과한 뒤 DNS owner가 record를 설정한다. DNS가 Lightsail static IP로 실제 resolve하는 것을 확인하기 전에는 certificate 명령을 실행하지 않는다.

DNS 확인 후 승인된 certificate 방식만 사용한다. certificate 적용 후 `sudo nginx -t`, reload, HTTPS smoke, renewal 설정 확인 순으로 진행한다. HTTPS smoke 성공 전에는 HTTP-to-HTTPS redirect를 강제하지 않는다.

### 7. 외부 smoke와 공개 증거

워크스페이스에서 exact staging smoke command를 실행한다.

```powershell
$env:GIWA_SMOKE_BASE_URL="https://$env:GIWA_STAGE_HOST"
pnpm --filter @giwa/web smoke:staging
```

`/`, `/user`, `/user/help`, `/partner`, `/healthz`, `/readyz`, `/api/public/config` 일곱 route가 모두 `pass`여야 한다. 이후 사용자가 승인한 fresh wallet flow에서만 mint/approve/deposit을 수행한다. Receipt는 `matched` 이후 별도 브라우저 context에서 capability 없이 공개되는지 확인한다.

## rollback

rollback은 testnet transaction을 되돌리지 못한다. 실패한 live run은 새 Manifest와 새 run으로 재시도한다.

1. `giwa-live.service`를 중지해 새 write와 verification을 막는다.
2. `giwa-static.service`는 건강하면 유지하여 `/`, `/demo`, `/partner`와 `/user*` fallback을 제공한다.
3. `/opt/giwa/current`를 보존해 둔 이전 immutable release로 되돌린다.
4. 이전 systemd unit candidate를 복원하고 `systemctl daemon-reload` 뒤 static을 먼저 `restart`한다. Active/MainPID와 이전 release cwd를 확인한 뒤에만 live를 `restart`한다.
5. 이전 Nginx target으로 temporary symlink를 만들고 enabled link를 원자적으로 교체한다. 그 exact link state에서 `nginx -t`가 성공한 경우에만 더 변경하지 않고 reload한다.
6. static/local/public smoke를 다시 실행한다. live schema compatibility와 exact process cwd가 확인된 경우에만 live를 유지한다.
7. DB restore는 자동으로 하지 않는다. active writes 중지, backup `quick_check`, 이전/현재 schema compatibility assessment, restore owner의 명시적 승인이 모두 있을 때만 별도 절차로 수행한다.
8. bounded 로그, source commit, failure category, smoke 결과와 owner 결정을 보존한다. runtime values와 run capability는 evidence에서 제외한다.

일반 release rollback은 `/opt/giwa/runtime/node-v22.16.0`을 유지한다. 격리
runtime 삭제는 정확한 절대 경로에 대한 별도 파괴적 승인 없이는 수행하지
않는다. 공유 system Node와 non-GIWA service 상태는 rollback 대상이 아니다.

live가 내려간 동안 `/user*`는 기록된 static evidence로 fallback하고, `/api/*`, `/healthz`, `/readyz`는 bounded `503`만 반환한다. static fallback을 live success로 표현하지 않는다.

## release evidence와 종료 조건

go를 기록하려면 exact source commit, resolved `/opt/giwa/current`, static/live MainPID와 exact release cwd, authority category, backup filename, schema gate, unit 상태, Nginx candidate/previous/tested target과 `nginx -t` 결과, DNS/HTTPS 결과, 일곱-route smoke, rollback rehearsal, public transaction/Receipt, release owner와 rollback owner가 모두 실제 값으로 있어야 한다.

현재 상태는 배포 전이며 외부 공개 URL이나 staging transaction을 생성했다고 주장하지 않는다. 제출 증거 freeze는 `giwa-gasok-submission-checklist.md`의 모든 항목이 실제 값으로 채워진 뒤에만 가능하다.
