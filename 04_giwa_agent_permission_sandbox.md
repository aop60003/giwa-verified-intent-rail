# GIWA Agent Permission Sandbox

> Alternative GASOK idea candidate. This is separate from `GIWA Verified Intent Rail`.

## One-Line Definition

```text
GIWA Agent Permission Sandbox lets users grant an AI agent narrow, expiring, testnet-only permissions for GIWA Sepolia actions, with clear wallet review before execution.
```

Korean:

```text
사용자가 AI 에이전트에게 GIWA Sepolia 테스트넷 액션에 대한 좁고 만료 가능한 권한을 부여하고, 실행 전 지갑에서 그 범위를 확인하게 하는 권한 샌드박스입니다.
```

## Why It Scored High

| Judge Lens | Reason |
|---|---|
| GIWA Fit | GIWA Wallet can become the place where bounded agent permissions are reviewed and revoked. |
| Originality | It targets AI agent wallet permissions, not another quest, vault, or checkout flow. |
| MVP Feasibility | One policy schema plus one mock agent action can be demonstrated on GIWA Sepolia. |
| Wallet UX | The wallet is central: review scope, sign permission, track execution, revoke. |
| Long-Term Potential | Agent-driven execution is likely to grow, and GIWA can show a permission-first UX early. |

## MVP Flow

1. User connects a wallet on GIWA Sepolia.
2. App shows an AI agent action request.
3. User reviews target, selector, asset, max amount, max calls, and expiry.
4. User signs or records the permission policy.
5. Agent attempts one allowed testnet action.
6. UI shows `submitted -> preconfirmed -> confirmed`.
7. User sees remaining scope and can revoke or let the permission expire.

## Guardrails

Do not pitch this as:

- autonomous custody
- phishing prevention
- guaranteed safe agent execution
- wallet security guarantee
- real funds automation

Use `testnet-only`, `permission boundary`, and `rehearsal` language.
