# GIWA FlashTrace Replay Studio

> Alternative GASOK idea candidate. This is separate from `GIWA Verified Intent Rail`.

## One-Line Definition

```text
GIWA FlashTrace Replay Studio records and replays a GIWA Sepolia transaction from wallet submission to Flashblocks preconfirmation to final block confirmation.
```

Korean:

```text
GIWA Sepolia 트랜잭션을 지갑 제출, Flashblocks 빠른 관측, 최종 블록 확인까지 시간순으로 기록하고 재생하는 개발자 도구입니다.
```

## Why It Scored High

| Judge Lens | Reason |
|---|---|
| GIWA Fit | It directly depends on Flashblocks and GIWA Sepolia transaction lifecycle behavior. |
| Technical Maturity | It can show txHash, explorer link, logs, timestamps, mismatch states, and replay traces. |
| Risk Safety | It reinforces that preconfirmation is not final confirmation. |
| Ecosystem Value | Every GIWA dApp needs correct transaction state handling. |
| Differentiation | It is more GIWA-specific than generic quest, social, template, or checkout ideas. |

## MVP Flow

1. Builder connects a sample dApp to GIWA Sepolia.
2. User sends one testnet transaction.
3. Studio records wallet request, txHash, preconfirmation, block confirmation, logs, and app state transitions.
4. Timeline shows `submitted -> preconfirmed -> confirmed`.
5. Replay highlights whether the app marked success too early.
6. Builder exports a debug link or JSON trace.

## Guardrails

Do not use:

- instant-settlement wording
- sub-second final confirmation wording
- `preconfirmed success`
- `payment settled`
- `guaranteed execution`

This is a debugging and lifecycle replay tool, not a settlement or security product.
