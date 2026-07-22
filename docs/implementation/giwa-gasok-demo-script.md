# GIWA Verified Intent Rail GASOK 90초 데모 스크립트

## 사용 조건

이 스크립트는 실제 공개 스테이징과 fresh evaluator run이 준비된 뒤 녹화한다. 현재 공개 배포와 제출 영상은 만들어지지 않았다. 화면 대기 시간을 편집할 수 있지만 transaction 속도, confirmation depth, Receipt 또는 링크를 합성하지 않는다.

데모의 한 문장 약속:

> 평가자가 서명 전에 고정된 Manifest를 검토하고, 자신의 지갑으로 GIWA Sepolia mock vault 동작을 실행한 뒤, Standard RPC confirmation evidence가 Manifest와 일치할 때만 공개 Receipt를 받습니다.

## 사전 화면 준비

- `/user`를 첫 화면으로 열고 `/user/receipt/<matched-receipt-hash>`와 explorer transaction을 fresh-run 탭으로, `/partner`와 `/demo`를 checked-in recorded fallback 탭으로 별도 준비한다.
- 연결에 사용할 evaluator wallet과 GIWA Sepolia network만 확인한다. wallet signing은 발표자가 직접 승인한다.
- gas/token이 이미 충분한 녹화와 permissionless mock-token mint가 필요한 녹화 중 하나를 실제 상태에 맞게 선택한다.
- live dependency가 지연되면 사용할 기록된 static example을 준비하되 `recorded fallback`이라고 말한다.

## 0–10초: 문제와 약속

- **발화:** "캠페인 클릭은 실제 GIWA 동작의 증거가 아닙니다. GIWA Verified Intent Rail은 서명 전 조건과 확인된 테스트넷 transaction을 연결해, 일치할 때만 Receipt를 만듭니다."
- **화면 동작:** 공개 `/user` 첫 화면과 `Review -> Execute -> Receipt` 진행선을 보여준다.
- **증거 큐:** 제품명, `GIWA Sepolia`, `testnet-only`, 한 개 mock vault action이 한 화면에 보여야 한다.
- **fallback 큐:** live 첫 화면이 열리지 않으면 `/demo`의 recorded example 링크를 열고 live 장애임을 한 문장으로 알린다.

## 10–22초: evaluator wallet과 GIWA Sepolia

- **발화:** "이제 평가자 지갑을 연결하고 chain ID 91342, GIWA Sepolia인지 앱이 직접 확인합니다."
- **화면 동작:** `Connect wallet`을 누르고 계정 연결을 승인한다. 잘못된 network면 switch/add 요청을 보여주고 GIWA Sepolia로 전환한다.
- **증거 큐:** 연결 주소의 축약 표시, chain ID `91342`, network-ready 상태를 보여준다.
- **fallback 큐:** wallet 요청이 거절되면 재전송하지 말고 recovery copy와 recorded example을 보여준다.

## 22–35초: gas/token readiness와 permissionless mock token

- **발화:** "앱은 gas와 mock-token balance를 읽습니다. token이 부족하면 서버가 대신 보내지 않고, 이 테스트 token의 permissionless mint를 제 지갑이 직접 실행합니다."
- **화면 동작:** gas, mock-token balance, allowance readiness를 차례로 가리킨다. 부족한 경우 고정 demo amount의 mint 요청을 지갑에서 승인하고 balance를 다시 읽는다.
- **증거 큐:** gas ready, mock token ready, allowance 상태와 explorer transaction 링크를 실제 결과에 맞게 보여준다.
- **fallback 큐:** gas가 부족하면 공식 faucet help를 열고 live run을 멈춘다. mint가 pending이면 기다리거나 recorded example로 전환하며 성공을 미리 말하지 않는다.

## 35–48초: 고정 Manifest와 exact bound

- **발화:** "서명 전에 target, asset, amount, spender, exact maximum allowance, expiry, wallet, intent hash를 고정합니다."
- **화면 동작:** `Intent Preview`를 펼쳐 network, target, asset, amount, spender, `maxAllowanceBaseUnits`, expiry, wallet, intent hash를 빠르게 순서대로 가리킨다.
- **증거 큐:** campaign/mission은 서버 정책으로 고정되고, connected wallet과 Manifest wallet이 같으며 allowance가 exact demo amount를 넘지 않는지 보여준다.
- **fallback 큐:** account 또는 chain이 바뀌면 기존 Manifest를 invalidate하고 새 Manifest가 필요하다는 recovery 상태를 보여준다.

## 48–65초: 필요 시 approval과 mock vault deposit

- **발화:** "현재 allowance가 부족할 때만 exact amount를 approve하고, 이어서 같은 지갑이 mock vault deposit을 보냅니다. unlimited approval은 사용하지 않습니다."
- **화면 동작:** allowance가 충분하면 skip 표시를 보여준다. 부족하면 approve를 지갑에서 승인하고 approve transaction receipt의 성공을 확인한 뒤 deposit을 승인한다.
- **증거 큐:** approve required/skip 결정, approve transaction이 있다면 그 hash, deposit transaction hash를 보여준다.
- **fallback 큐:** approve 또는 deposit이 거절되거나 실패하면 재전송하지 않는다. explorer와 새 action 안내를 보여주고 Receipt가 잠겨 있음을 확인한다.

## 65–80초: Standard RPC confirmation과 Manifest match

- **발화:** "deposit hash를 보존한 뒤 Standard RPC confirmation을 확인하고, calldata와 log를 서명된 Manifest와 비교합니다. confirmation evidence는 finality가 아닙니다."
- **화면 동작:** `submitted -> confirmation pending -> verifier checking -> matched` 진행을 보여준다. pending 동안 deposit을 다시 보내지 않는다.
- **증거 큐:** transaction status, block number/hash, confirmation depth, verifier input hash, terminal `Manifest matched` 상태를 보여준다.
- **fallback 큐:** RPC가 지연되면 pending 상태와 explorer를 보여준다. bounded verification retry만 사용하며, mismatch/failed면 Receipt가 열리지 않는 화면을 그대로 보여준다.

## 80–90초: fresh 공개 Receipt와 recorded partner/static fallback

- **발화:** "일치한 뒤에만 이 fresh 공개 Receipt가 열리고 explorer의 같은 deposit을 가리킵니다. `/partner`는 방금 실행한 DB가 아니라, source와 시점을 표시한 checked-in recorded evidence packet이며 static fallback으로 분리합니다."
- **화면 동작:** fresh 공개 Receipt의 receipt hash와 explorer 링크를 먼저 보여준다. 그 뒤 `/partner`의 `recorded/static` label, snapshot source file과 source timestamp를 짚고 `/demo` 또는 `/` fallback 탭으로 마친다.
- **증거 큐:** public Receipt URL/hash와 deposit explorer transaction은 같은 fresh run이어야 한다. partner surface는 별도 recorded packet으로서 snapshot source/freshness와 이를 제공한 deployed source commit이 제출 evidence에 기록되어야 하며 fresh run 일치를 암시하지 않는다.
- **fallback 큐:** Receipt URL이 다른 브라우저 context에서 열리지 않거나 링크가 서로 다르면 녹화를 중단하고 submission을 no-go로 둔다.

## 반드시 말하거나 화면에 남길 제한

- `GIWA Sepolia testnet-only mock asset`이며 production asset이 아니다.
- No real funds; no RWA issuance or yield; no production asset issuance, payment, settlement, KYC service, phishing prevention, or security guarantee.
- Standard RPC confirmation evidence는 이 데모의 검증 입력이며 finality가 아니다.
- 현재 제출은 GIWA Wallet 내부 배치나 in-wallet integration을 주장하지 않는다.
