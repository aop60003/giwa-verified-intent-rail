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
| 호스트 패키지 설치 | Node/pnpm, Nginx, `sqlite3`, certbot 또는 선택한 인증서 도구, 설치 승인자 |
| Lightsail 변경 | 인스턴스/리전/플랜, 비용 책임자, release owner, rollback owner |
| DNS | 호스트명, static IP, DNS owner |
| HTTPS/certificate | 인증서 방식, 갱신 책임자, 승인자 |
| 런타임 값 배치 | 승인된 비공개 전달 채널과 배치 담당자; values excluded from repository and evidence |
| 지갑 동작 | 연결, 네트워크 전환, mint/approve/deposit 각각의 사용자 확인 |
| DB restore 또는 파괴적 변경 | write 중지 증거, 호환성 평가, restore owner의 별도 승인 |

승인이 없으면 해당 단계에서 멈춘다. 이 문서는 push, 패키지 설치, DNS, 인증서 발급, 지갑 서명 또는 DB restore 권한을 부여하지 않는다.

## 릴리스와 상태 레이아웃

```text
/opt/giwa/releases/<40-character-source-commit>/  immutable release
/opt/giwa/current                                active release symlink
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
| backup script | `ops/lightsail/scripts/backup-live-db.sh` | backup unit이 versioned path로 실행 |
| local smoke | `ops/lightsail/scripts/smoke-local.sh` | host에서 release asset을 실행 |

서비스 계약:

| 서비스 | bind | 쓰기 범위 | 비고 |
| --- | --- | --- | --- |
| `giwa-static.service` | `127.0.0.1:4176` | application write 없음 | `/`, `/demo`, `/partner` 및 live 장애 시 `/user*` fallback |
| `giwa-live.service` | `127.0.0.1:4177` | `/var/lib/giwa` | `/user*`, `/api/*`, `/healthz`, `/readyz` |
| `giwa-backup.service` | network bind 없음 | `/var/lib/giwa/backups` | `backup-live-db.sh`만 실행 |
| `giwa-backup.timer` | 해당 없음 | 해당 없음 | daily, persistent, 최대 30분 randomized delay |

두 Node 서비스 모두 unit이 `GIWA_SKIP_PUBLIC_EXPORT=1`을 강제한다. live service는 `node --experimental-strip-types apps/web/scripts/serve-live.mjs`를 실행한다.

## 런타임 파일 계약

`/etc/giwa/giwa-live.runtime`에는 이름과 실제 값만 호스트에서 배치한다. 이 문서, Git, 로그, smoke 출력, 제출 증거에는 값을 기록하지 않는다. `requireLiveServerEnv`와 `.env.example`에 따라 스테이징 runtime file에 허용되는 이름은 다음과 같다.

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

```text
checkout exact source commit into /opt/giwa/releases/<source-commit>
pnpm install --frozen-lockfile
pnpm build
node --check ops/lightsail/render-nginx-config.mjs
bash -n ops/lightsail/scripts/backup-live-db.sh
bash -n ops/lightsail/scripts/smoke-local.sh
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

1. 네 unit 파일을 exact release에서 `/etc/systemd/system`의 candidate로 복사하고 이전 파일을 보존한다.
2. `/etc/giwa/giwa-live.runtime`의 owner/mode와 변수 이름만 검토한다. 값은 출력하지 않는다.
3. `/opt/giwa/current`를 새 immutable release로 전환한다.
4. `systemctl daemon-reload` 후 static을 먼저 시작한다.
5. live를 시작하고 `/readyz`가 green인지 확인한다. schema가 호환되지 않으면 즉시 live를 중지한다.
6. loopback smoke를 실행한다.

Exact local smoke command:

```bash
sudo -u giwa /opt/giwa/current/ops/lightsail/scripts/smoke-local.sh
```

필수 결과는 static, live, healthz, readyz, public-config 다섯 label의 `pass`다. `ss` 등 호스트 도구로 `4176`과 `4177`이 `127.0.0.1`에만 bind하는지도 확인한다.

### 5. Nginx candidate, syntax checkpoint, HTTP

renderer는 output을 `/etc/nginx/sites-available` 또는 `/etc/nginx/conf.d` 아래의 허용된 새 파일에만 생성하며 기존 파일을 덮어쓰지 않는다. lowercase short commit으로 아직 존재하지 않는 candidate 이름을 만든다.

```bash
sudo env GIWA_STAGE_HOST="$GIWA_STAGE_HOST" \
  node /opt/giwa/current/ops/lightsail/render-nginx-config.mjs \
  "/etc/nginx/sites-available/giwa-staging.candidate-${GIWA_STAGE_COMMIT:0:12}.conf"
```

candidate 내용을 값 노출 없이 검토한 다음, 현재 active link를 보존하고 candidate를 `sites-enabled/giwa-staging.conf`의 시험 대상으로 연결한다. 실행 중인 Nginx는 아직 reload하지 않는다. 그 상태에서 checkpoint를 통과해야 한다.

```bash
sudo nginx -t
```

실패하면 candidate link를 제거하고 이전 link를 복원한다. 성공한 경우에만 candidate를 현재 Nginx config로 설치한 뒤 reload하고 HTTP smoke를 실행한다. 순서는 항상 `render candidate -> nginx -t -> install/activate -> reload`다. renderer output 제한을 우회하려고 임의의 temp directory에 쓰지 않는다.

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
4. 이전 systemd unit candidate를 복원하고 `systemctl daemon-reload`를 실행한다.
5. 이전 Nginx candidate/link를 복원하고 `nginx -t` 성공 후에만 reload한다.
6. static/local/public smoke를 다시 실행한다. live schema compatibility가 확인된 경우에만 live를 시작한다.
7. DB restore는 자동으로 하지 않는다. active writes 중지, backup `quick_check`, 이전/현재 schema compatibility assessment, restore owner의 명시적 승인이 모두 있을 때만 별도 절차로 수행한다.
8. bounded 로그, source commit, failure category, smoke 결과와 owner 결정을 보존한다. runtime values와 run capability는 evidence에서 제외한다.

live가 내려간 동안 `/user*`는 기록된 static evidence로 fallback하고, `/api/*`, `/healthz`, `/readyz`는 bounded `503`만 반환한다. static fallback을 live success로 표현하지 않는다.

## release evidence와 종료 조건

go를 기록하려면 exact source commit, authority category, backup filename, schema gate, unit 상태, Nginx candidate와 `nginx -t`, DNS/HTTPS 결과, 일곱-route smoke, rollback rehearsal, public transaction/Receipt, release owner와 rollback owner가 모두 실제 값으로 있어야 한다.

현재 상태는 배포 전이며 외부 공개 URL이나 staging transaction을 생성했다고 주장하지 않는다. 제출 증거 freeze는 `giwa-gasok-submission-checklist.md`의 모든 항목이 실제 값으로 채워진 뒤에만 가능하다.
