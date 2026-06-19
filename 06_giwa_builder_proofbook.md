# GIWA Builder Proofbook

> Alternative GASOK idea candidate. This is separate from `GIWA Verified Intent Rail`.

## One-Line Definition

```text
GIWA Builder Proofbook turns GIWA Sepolia deployments, contract calls, demo milestones, and signed project notes into a public builder evidence profile.
```

Korean:

```text
GIWA Sepolia의 배포, 컨트랙트 호출, 데모 마일스톤, 서명된 프로젝트 노트를 공개 빌더 증거 프로필로 모으는 도구입니다.
```

## Why It Scored High

| Judge Lens | Reason |
|---|---|
| Marketability | GASOK teams need proof of build progress beyond pitch claims. |
| Phase 3/4 Fit | Profiles can show deployments, interactions, demos, and user testing evidence. |
| MVP Feasibility | A registry, indexer, and public profile page can be built with clear testnet artifacts. |
| Risk Safety | Evidence-only positioning avoids certification and security claims. |
| Ecosystem Value | GIWA can discover active builders and projects from public build records. |

## MVP Flow

1. Builder connects a wallet on GIWA Sepolia.
2. Builder creates a public profile.
3. Builder signs a build manifest for a project milestone.
4. Builder registers a deployment txHash or deploys a sample contract.
5. Builder registers one meaningful interaction txHash.
6. Builder attaches repo, demo, or docs URL.
7. Public page shows timeline, contract address, txHash, explorer links, and milestone status.

## Guardrails

Do not pitch this as:

- official certification
- developer score
- hiring credential
- KYC identity
- security verification

Use `builder evidence profile`, `GIWA Sepolia activity`, and `public build timeline`.
