# GIWA Verified Intent Rail GASOK Submission Checklist

## 현재 판정

**NO-GO until Task 15 records and verifies every actual value below.**

이 파일은 제출 증거 자체가 아니라 최종 freeze gate/template이다. 현재 공개 배포, 영상 녹화, fresh staging run이 완료되지 않았으므로 링크, hash, contact 또는 시간을 만들어 넣지 않는다. Task 15에서는 각 `현재 기록`을 실제 값으로 교체하고 clean browser context에서 다시 확인해야 한다. `missing`, placeholder, 접근 불가, 다른 run을 가리키는 값, 예시 값 또는 임시 값이 하나라도 있으면 최종 판정은 `NO-GO`다.

## 필수 제출 값

| 필수 항목 | Task 15 합격 조건 | 현재 기록 |
| --- | --- | --- |
| Public user URL | 실제 HTTPS `/user` URL이 로그인 없이 clean browser에서 열림 | `NO-GO until Task 15 records an actual value` |
| 90초 demo video | 접근 가능한 최종 영상 URL, 승인된 demo script와 같은 run | `NO-GO until Task 15 records an actual value` |
| Matched Receipt URL | capability 없이 별도 browser context에서 열리는 실제 public Receipt | `NO-GO until Task 15 records an actual value` |
| Matched Receipt hash | Receipt URL payload와 재계산 결과가 같은 실제 hash | `NO-GO until Task 15 records an actual value` |
| Explorer transaction | 영상과 Receipt가 가리키는 실제 GIWA Sepolia deposit transaction URL/hash | `NO-GO until Task 15 records an actual value` |
| Partner surface | 같은 run의 redacted evidence를 보여주는 실제 public `/partner` URL | `NO-GO until Task 15 records an actual value` |
| Exact source commit | 배포한 exact 40-character commit과 provenance evidence가 일치 | `NO-GO until Task 15 records an actual value` |
| Architecture diagram | 공개 제출에서 열리는 한 장짜리 실제 diagram URL 또는 artifact path | `NO-GO until Task 15 records an actual value` |
| Verification output | final gate 명령, 결과, 실행 시각, source commit을 묶은 실제 evidence | `NO-GO until Task 15 records an actual value` |
| Limitation statement | 아래 필수 제한 문구가 제출 본문과 영상에 실제 포함됨 | `NO-GO until Task 15 records an actual value` |
| Contact | 실제 응답 가능한 제출 담당자 이름과 연락 채널 | `NO-GO until Task 15 records an actual value` |
| Final submission timestamp | 실제 제출 완료 시각과 timezone | `NO-GO until Task 15 records an actual value` |

최종 evidence JSON과 제출 화면에서는 위 표의 gate 문구를 실제 값 대신 사용할 수 없다. 모든 필드는 non-empty actual value여야 한다.

## 필수 limitation statement

최종 제출에는 다음 의미가 한 번에 읽히도록 포함되어야 한다.

> GIWA Verified Intent Rail은 GIWA Sepolia testnet-only mock action evidence demo입니다. No real funds; no RWA issuance or yield; no production asset issuance, payment, settlement, KYC service, phishing prevention, or security guarantee. Standard RPC confirmation evidence is not finality.

## 링크 일치성 검사

- Public user URL의 origin과 configured public origin이 정확히 같다.
- Video의 wallet, deposit transaction, Receipt hash가 제출 값과 같다.
- Receipt의 `depositTxHash`, block number/hash, confirmation depth, verifier input hash가 실제 public evidence와 같다.
- Explorer URL의 chain은 GIWA Sepolia `91342`이고 Receipt의 deposit transaction과 같다.
- Partner surface는 같은 run을 redacted 형태로 보여주며 run capability나 operator credential을 포함하지 않는다.
- Architecture diagram은 browser wallet -> Nginx -> loopback static/live -> SQLite/Standard RPC 경계를 실제 배포와 같게 표현한다.
- Exact source commit은 Lightsail release directory, deployment evidence, provenance report와 같다.
- 기록된 static fallback은 fresh live result와 명확히 구분된다.

## GIWA Wallet placement 경계

고정된 Manifest preview, 사용자가 승인하는 wallet action, matched-only public Receipt route는 향후 GIWA Wallet discovery entry의 구성 요소가 될 수 있다. 현재 제출은 GIWA Wallet 내부 배치, in-wallet integration, 공식 제휴 또는 작동 중인 wallet discovery entry를 주장하지 않는다.

## 최종 freeze 검사

Task 15 담당자는 아래를 모두 실제 증거로 확인한 뒤에만 `GO`를 기록한다.

- deployed source commit과 제출에 적힌 exact commit이 일치한다.
- public `/user`, matched Receipt, explorer transaction, `/partner`, video, architecture, verification evidence URL이 모두 clean browser에서 접근 가능하다.
- 모든 URL/hash가 한 실제 staging run을 가리킨다.
- desktop/mobile 캡처와 browser console/network 검사가 통과한다.
- No runtime values, signing material, credentials, local DB path, or server-only secret appears in public artifacts or submission evidence.
- `runCapability`는 URL, log, Receipt, partner projection, screenshot, video, evidence에 없다.
- wallet이 mint/approve/deposit을 직접 승인했고 server/script가 사용자 대신 transaction을 보내지 않았다.
- Receipt는 `matched` 뒤에만 공개되고 mismatch/failed/pending 상태에서는 잠겨 있다.
- Standard RPC confirmation evidence is not finality or settlement.
- limitation statement, contact, final submission timestamp가 실제 값으로 기록되었다.
- final verification 후 tracked implementation/public file이 바뀌지 않았다.
- final freeze commit과 제출 기록이 남아 있고, push에는 별도의 명시적 승인이 있다.

## GO 기록 규칙

`GO`는 Task 15가 다음을 모두 기록한 경우에만 가능하다: 실제 값 12개, link-access 결과, source/deployment/provenance commit 일치, final verification output, limitation 확인, 제출 timestamp. 그 전의 이 문서 판정은 계속 `NO-GO`다.
