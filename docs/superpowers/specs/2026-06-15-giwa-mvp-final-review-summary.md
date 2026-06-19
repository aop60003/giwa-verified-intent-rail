# GIWA Verified Intent Rail MVP Final Review Summary

## 목적

이 문서는 `GIWA Verified Intent Rail` MVP 설계와 병렬 에이전트 리뷰 결과를 최종 실행 기준으로 정리한다.

핵심 결론:

```text
GIWA Sepolia 위에서 실제 mock vault 액션이 실행되고,
그 액션이 공식 manifest와 매칭되며,
검증 결과가 receipt와 partner summary로 이어져야 MVP다.
```

단순히 화면에서 지갑을 연결하거나 mock deposit 트랜잭션 하나를 만드는 것만으로는 부족하다. 이 제품은 `depositTxHash`가 아니라 `signed manifest -> GIWA Sepolia tx -> verifier decision -> receipt -> partner evidence`까지 이어지는 rail을 증명해야 한다.

## 최종 판정

현재 스프린트 전략 설계는 MVP 수준으로 적절하다.

다만 기존 전체 구현 플랜인 `docs/superpowers/plans/2026-06-15-giwa-verified-intent-rail-mvp.md`는 그대로 실행하면 안 된다. 그 문서는 큰 지도 역할만 하며, 실제 구현 전에는 Sprint 0부터 작은 실행 계획으로 다시 쪼개야 한다.

최종 판단:

| 항목 | 판정 |
|---|---|
| 제품 방향 | 적절함 |
| GIWA 체인 적합성 | 강함 |
| MVP 범위 | P0 컷 기준 적절함 |
| 기존 전체 구현 플랜 | 직접 실행 금지 |
| 다음 단계 | Sprint 0 실행 계획 작성 |

## P0 MVP 범위

P0는 기능 수가 아니라 증거 체인 기준으로 정의한다.

```text
one campaign
-> one mission
-> one mock token and one mock vault
-> one signed manifest bound to GIWA Sepolia
-> one IntentSubmitted event on GIWA Sepolia
-> one approve transaction if required
-> one mock vault deposit transaction on GIWA Sepolia
-> one verifier matched decision
-> one IntentMatched event on GIWA Sepolia
-> one receipt page
-> one thin partner summary
```

P0 완료 기준:

- `intentSubmittedTxHash`가 있다.
- `depositTxHash`가 있다.
- 표준 GIWA RPC 기준 confirmed `blockNumber`와 `blockHash`가 있다.
- verifier가 official manifest signer, calldata, logs, expiry, amount, spender, allowance bound를 확인한다.
- verifier 결과로 `decisionTxHash`가 생성된다.
- `receiptHash`가 생성된다.
- partner summary가 receipt와 tx evidence를 보여준다.
- `evidence.json`만 보고도 핵심 증거를 재계산하거나 검토할 수 있다.

## 스프린트 구조

권장 순서:

```text
Sprint 0: Scope and evidence contract
-> Sprint 1: Protocol kernel
-> Sprint 2: Local contract proof
-> Sprint 3: GIWA Sepolia chain anchor
-> Sprint 4: Verifier and receipt engine
-> Sprint 5: Thin guided user flow
-> Sprint 6: Partner ProofKPI summary
-> Sprint 7: Demo hardening and submission evidence
```

각 스프린트의 역할:

| Sprint | 목적 | 다음 단계로 넘어가는 기준 |
|---|---|---|
| 0 | 범위, evidence schema, 역할, dependency gate 고정 | 구현 전 승인 가능한 기준이 생김 |
| 1 | manifest, receipt, hash, signer 규칙 고정 | stable hash vector와 signer rule 통과 |
| 2 | local mock token/vault/rail 검증 | local deposit, logs, rail events 통과 |
| 3 | GIWA Sepolia chain anchor 검증 | deployment, IntentSubmitted, depositTxHash, block evidence 확보 |
| 4 | verifier와 receipt 엔진 검증 | matched일 때만 receipt와 decisionTxHash 생성 |
| 5 | 얇은 사용자 플로우 구현 | 사용자가 guided flow로 receipt page까지 도달 |
| 6 | 얇은 partner summary 구현 | campaign evidence가 한 페이지에 표시 |
| 7 | 제출/시연 안정화 | evidence.json과 90초 데모 반복 가능 |

## 핵심 설계 결정

### 1. UI보다 chain anchor가 먼저다

프론트 화면을 먼저 만들면 product가 빨리 보일 수는 있지만, GIWA 위에서 실제로 동작한다는 증거가 약해진다. 따라서 Sprint 3에서 먼저 GIWA Sepolia deployment와 deposit evidence를 만든다.

### 2. `decisionTxHash`는 Sprint 4 산출물이다

Sprint 3은 chain-shape proof다. 이 단계에서는 contract 배포, `IntentSubmitted`, approve/deposit, block confirmation만 증명한다.

`decisionTxHash`는 verifier가 완성된 Sprint 4 이후에만 최종 증거로 인정한다. 수동으로 `IntentMatched`를 emit한 tx는 최종 verifier evidence로 쓰면 안 된다.

### 3. manifest는 official signer와 chain domain에 묶는다

Verifier는 사용자가 보낸 `manifestSigner` 값을 그대로 믿으면 안 된다.

필수 조건:

- recovered signer가 configured campaign signer 또는 campaign registry signer와 일치해야 한다.
- preferred model은 EIP-712 typed data다.
- 빠른 prototype에서 plain message를 쓰더라도 domain prefix와 official signer enforcement가 있어야 한다.
- domain에는 `chainId: 91342`와 deployed `IntentRail` address가 포함되어야 한다.

### 4. verifier는 calldata만 보면 안 된다

Verifier는 다음을 함께 검증해야 한다.

- transaction sender와 manifest wallet
- transaction target과 manifest target
- function selector
- deposit amount
- mock vault asset
- token `Approval` log
- token `Transfer` log
- mock vault `MockDeposit` event
- spender와 allowance bound
- expiry
- `IntentSubmitted` event 존재와 field match

### 5. receipt는 idempotent해야 한다

같은 `intentHash + depositTxHash`는 항상 같은 receipt를 반환해야 한다.

`issuedAt` 같은 실행 시점 값 때문에 `receiptHash`가 매번 바뀌면 안 된다. 이미 발급된 receipt가 있으면 기존 receipt를 반환한다.

### 6. block confirmation과 verifier match를 분리한다

`blockConfirmed`는 transaction이 block에 들어갔다는 뜻이다.

`verifierMatched`는 그 transaction이 manifest 조건과 맞았다는 뜻이다.

Receipt page는 `blockConfirmed`만으로 열면 안 된다. `verifierMatched` 이후에만 열린다.

### 7. Flashblocks는 fast feedback 전용이다

Flashblocks는 빠른 feedback에만 사용한다. Receipt의 `blockNumber`와 `blockHash`는 표준 GIWA RPC의 confirmed receipt에서 가져온다.

## Evidence JSON 기준

최종 제출물은 다음 파일을 가져야 한다.

```text
docs/evidence/giwa-sepolia-mvp-evidence.json
```

최소 포함 항목:

- network name
- `chainId: 91342`
- standard RPC
- Flashblocks RPC
- explorer tx URL template
- confirmation depth
- deployer address
- campaign signer address
- recovered signer address
- verifier operator address
- demo wallet address
- mock token address and deployment tx hash
- mock vault address and deployment tx hash
- intent rail address and deployment tx hash
- deployment receipt status
- `eth_getCode` check result
- canonical manifest payload
- manifest signature
- EIP-712 or domain-separated signing domain
- `intentHash`
- `intentSubmittedTxHash`
- `approveTxHash` if used
- `depositTxHash`
- `decisionTxHash`
- standard RPC receipt snapshot
- relevant log snapshot
- verifier version
- verifier status
- verifier input hash
- canonical receipt payload
- `receiptHash`
- partner summary values

이 파일은 단순 결과 기록이 아니라 재검증 가능한 evidence bundle이어야 한다.

## 병렬 에이전트 리뷰 결과

| 관점 | 판정 | 점수 | 핵심 지적 |
|---|---:|---:|---|
| MVP/GASOK 심사 | 승인 가능 | 8.4/10 | P0는 적절하며 partner summary는 P0에 포함하는 것이 맞음 |
| GIWA 체인 실행성 | 조건부 승인 | 8.2/10 | `decisionTxHash` 출처와 evidence 재현성 보강 필요 |
| 운영/스프린트 실행 | 조건부 통과 | 8/10 | `.git` 부재, dependency approval, faucet/key 준비가 선행되어야 함 |
| 프로토콜/verifier | 전략은 개선됨 | 7/10 | 기존 큰 구현 플랜의 코드 스니펫은 아직 signer/log/idempotency 반영 부족 |

리뷰 후 반영한 수정:

- `decisionTxHash`를 Sprint 4 verifier 산출물로 명확히 이동
- `Role and Gas Policy` 추가
- `Evidence JSON Schema` 추가
- official signer verification 명시
- EIP-712/domain separation 명시
- log-based verifier 요구사항 강화
- receipt idempotency 명시
- `IntentSubmitted` relayer 제출 정책 명시
- workspace gate와 dependency approval gate 명시

## 구현 전 차단 조건

아래가 해결되기 전에는 구현을 시작하지 않는다.

1. 현재 workspace를 `.git` repo로 만들지, non-git prototype mode로 갈지 결정한다.
2. 기존 큰 구현 플랜을 직접 실행하지 않도록 Sprint별 실행 계획으로 분리한다.
3. dependency approval checklist를 만든다.
4. `DEPLOYER_PRIVATE_KEY`, `CAMPAIGN_SIGNER_PRIVATE_KEY`, `VERIFIER_PRIVATE_KEY` 역할을 분리한다.
5. GIWA Sepolia faucet과 wallet funding 절차를 runbook에 고정한다.
6. `evidence.json` schema를 Sprint 0 산출물로 확정한다.
7. Sprint 1은 protocol tests부터 시작하고, UI는 Sprint 5 전까지 시작하지 않는다.

## 다음 액션

바로 구현하지 않는다.

다음 순서는:

```text
1. Sprint 0 실행 계획 작성
2. Workspace gate 결정
3. Dependency approval checklist 작성
4. Evidence JSON schema 확정
5. Sprint 1 protocol kernel plan 작성
```

이 순서로 가야 UI를 먼저 만들어 놓고 verifier를 나중에 끼워 맞추는 문제가 생기지 않는다.

## 최종 결론

수정된 설계는 MVP로 적절하다.

하지만 MVP의 정의는 “작은 UI”가 아니라 “작지만 재검증 가능한 GIWA Sepolia evidence rail”이다. 따라서 첫 구현 목표는 화면 완성이 아니라 다음 증거 체인을 만드는 것이다.

```text
official signed manifest
-> IntentSubmitted on GIWA Sepolia
-> approve/deposit on GIWA Sepolia
-> standard RPC block confirmation
-> verifier matched decision
-> IntentMatched on GIWA Sepolia
-> ProofKPI receipt
-> one-page partner summary
-> reproducible evidence.json
```
