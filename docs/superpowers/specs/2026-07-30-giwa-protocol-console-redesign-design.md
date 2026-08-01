# GIWA Protocol Console Redesign

## Status

Drafted for user review on 2026-07-30 after the user selected direction A,
`GIWA Protocol Console`.

This document defines the visual and interaction target for the next design
pass. It does not authorize implementation, Git publication, or deployment.

## Decision

Keep the restraint and editorial confidence of the current landing page, but
make the participant journey feel like a live product rather than a sequence
of explanatory sections.

The visual system combines three ideas:

1. `GIWA Protocol Console` is the shared product shell.
2. `Interlocking Rail` explains how the signed conditions and wallet execution
   converge.
3. `Receipt Artifact` turns the Matched Receipt and seal into the participant's
   clear acquisition moment.

The first Figma deliverable contains three connected product states:

```text
Mission Cockpit
-> Live Execution Rail
-> Receipt Artifact
```

Each state is designed at `1440 x 1024` and `390 x 844`.

## Design Goal

Within the first viewport, a participant or GASOK reviewer must understand:

1. what action can be performed;
2. that it uses GIWA Sepolia and mock assets;
3. what conditions are fixed before execution;
4. what the wallet will be asked to do; and
5. that a Matched Receipt is issued only after the execution matches.

The experience must feel like an operational testnet product, not a pitch deck,
generic quest board, DEX clone, or developer console.

## Non-Goals

- Changing wallet, API, verifier, Receipt, or contract behavior.
- Adding real assets, rewards, points, NFT ownership, yield, TVL, settlement,
  identity, KYC, or security guarantees.
- Designing a generic mission marketplace.
- Adding a dark terminal theme.
- Turning the Receipt into a legal certificate or GIWA Dojang attestation.
- Designing the full authenticated P1 partner application.

## Experience Model

### Public journey

Use one three-part story on all participant-facing surfaces:

```text
1. 조건 확인
2. 지갑 실행
3. 결과 공개
```

This is the only numbered journey exposed to a first-time participant or
reviewer.

### Live execution states

The existing detailed workflow remains the source of truth but appears as
status inside the current public step:

```text
준비
-> 지갑 요청
-> 트랜잭션 제출
-> 조건 대조
-> Receipt 발급
```

The interface must not present the three-part journey and the detailed states
as two competing progress systems.

## Visual System

### Product shell

- Sticky product bar: `60px`.
- Content width: `1200px` maximum.
- Desktop gutter: `48px`.
- Tablet gutter: `24px`.
- Mobile gutter: `16px`.
- Product bar contents:
  - `GIWA Verified Intent Rail`;
  - `GIWA Sepolia · Testnet`;
  - current view;
  - shortened wallet or `지갑 연결`;
  - `내 Receipt`.

Landing, demo, participant, Receipt, Campaign Studio, and Proof Ledger use the
same shell and background system.

### Color

- Paper: `#F7F6F1`
- Surface: `#FFFEFA`
- Ink: `#171916`
- Muted text: `#5F665F`
- Rule: `#D8D8D0`
- Verified: `#0B5F43`
- Verified soft: `#E8F2ED`
- Pending: `#8A6400`
- Pending soft: `#FFF4D6`
- Blocked: `#A3442F`
- Blocked soft: `#FCEBE7`

Color communicates state. It is not used as decorative gradient or ambient
glow.

### Typography

Pretendard Variable remains the interface typeface.

- Landing display: at most `72/74px`.
- Product display: `64/66px`.
- Section heading: `36/40px`.
- Component heading: `24/30px`.
- Body: `16/26px`.
- Metadata: at least `13/18px`.
- Monospace value: `13/20px`.

Large Korean headings use weight `650` and `-0.04em` tracking. Monospace is
reserved for hashes, block values, chain IDs, and compact evidence labels.

### Shape and depth

- Primary action surface: `20px` radius.
- Grouped data surface: `12px` radius.
- Controls: `10px` radius.
- Pills are limited to status and network labels.
- Ordinary sections are separated with spacing, not repeated boxes.
- A subtle ambient shadow is allowed only on the active Mission Cockpit and the
  Receipt Artifact.
- At most two full-width rules appear in any `200px` vertical region.

### Icons and assets

- Use official GIWA brand assets when available.
- Wallet, network, search, copy, external-link, and disclosure actions use one
  consistent `16px` line-icon family.
- The existing raster Matched seal remains the ceremonial success asset.
- Do not approximate icons or brand art with text symbols, handcrafted SVG, or
  CSS drawings.

## Screen 1: Mission Cockpit

### Purpose

Let the participant understand the mission and begin without scrolling.

### Desktop layout

Use an asymmetric `7 / 5` grid.

Left:

- campaign label;
- concise outcome headline;
- one-sentence explanation;
- three-part journey;
- `GIWA Sepolia · Testnet` and mock-asset boundary.

Right:

- one elevated Mission Cockpit surface;
- action: `Mock Vault에 1 Mock USDC 예치`;
- network;
- target;
- amount;
- maximum approval;
- expected time;
- small Receipt preview;
- one primary CTA.

The primary CTA must appear above `y = 720px` at `1440 x 1024`.

### Mobile layout

Show, in order:

1. compact product bar;
2. short headline;
3. testnet boundary;
4. Mission Cockpit;
5. full-width primary CTA;
6. collapsed journey summary.

There is no horizontal progress rail.

### Copy

Headline:

> 약속한 조건을 확인하고, 내 지갑으로 실행합니다.

Description:

> 캠페인이 고정한 대상·동작·수량을 먼저 확인하세요. 실제 GIWA Sepolia
> 실행이 모두 같아야 Receipt가 발급됩니다.

Primary action sequence:

```text
미션 조건 확인
-> 지갑 연결하고 계속
```

Safety line:

> GIWA Sepolia 테스트넷 · Mock 자산만 사용 · 실제 자금 및 수익 없음

## Screen 2: Live Execution Rail

### Purpose

Keep execution, waiting, comparison, and recovery in one stable workspace.

### Layout

The left side shows two aligned rails:

- `서명된 조건`;
- `실제 지갑 실행`.

The four primary fields are:

1. Network;
2. Target and action;
3. Asset and amount;
4. Approval boundary.

The right side is the live state panel:

- current wallet request;
- submitted transaction;
- GIWA Sepolia observation;
- field-match progress;
- next supported action.

Technical hashes and raw addresses remain inside a native disclosure.

### Interlocking Rail behavior

- Before execution, the two rails are neutral.
- After transaction submission, the execution rail gains observed values.
- Each confirmed match joins the two rails with a verified connector.
- A proven mismatch diverts the failed field into a blocked side state.
- Only four joined primary fields may unlock the Receipt transition.
- Low confirmation depth or RPC delay stays pending and never appears as
  mismatch or success.

### Status copy

```text
지갑에서 실행을 확인해 주세요.
트랜잭션이 GIWA Sepolia에 제출되었습니다.
Standard RPC에서 실행 증거를 확인하고 있습니다.
4개 조건을 실제 실행과 대조하고 있습니다.
모든 조건이 일치했습니다. Receipt를 발급합니다.
```

Flashblocks, when shown, is labeled as early progress feedback and never as
finality or settlement.

## Screen 3: Receipt Artifact

### Purpose

Create a memorable completion moment while keeping the evidence inspectable.

### Composition

The first viewport contains:

- `4개 조건 모두 일치 · Receipt 발급됨`;
- result headline;
- one-sentence explanation;
- Matched seal;
- Receipt serial and issued time;
- compact four-field summary;
- one primary and one secondary action.

Headline:

> 약속한 조건대로 실행됐습니다.

Supporting copy:

> 캠페인이 서명한 조건과 확인된 GIWA Sepolia 트랜잭션을 대조해 이
> Receipt를 발급했습니다.

Primary action:

> Campaign Studio에서 반영 확인

Secondary action:

> Proof Ledger에서 공개 검증

Explorer, copy link, technical details, and retry are tertiary utilities.

### Artifact details

Show:

- Receipt serial;
- Receipt hash, shortened on first read;
- issued time;
- policy or Manifest version;
- block number;
- observed confirmation count;
- `4 / 4` covered fields;
- `GIWA Sepolia · Testnet`.

Do not describe the seal as minted, transferable, stored on-chain, or issued by
GIWA Dojang.

## Supporting Surfaces

The Figma pass may include small reference modules for later implementation,
but the three primary frames remain the approval target.

### Campaign Studio

Replace three repetitive KPI values with:

```text
검증 요청 1
-> 대조 통과 1
-> Receipt 발급 1
```

Add `일치율 100%`, source label, denominator, and last synchronization time.
The same Receipt hash from the participant result is visibly highlighted.

### Proof Ledger

Represent one exact lookup as:

```text
Manifest
-> Wallet execution
-> GIWA transaction
-> Matched Receipt
```

Each node exposes a shortened hash, timestamp, source, and copy or explorer
action. Raw evidence remains available without dominating the first view.

## Interaction Hierarchy

- One filled primary action per screen.
- Primary button: `48px` height.
- Secondary button: at least `44px` height.
- Remaining actions use text or icon-button treatment.
- The primary action always states the next wallet request or result.
- Disabled controls explain the blocking condition.

## Motion

Motion communicates state:

- button and control response: `160ms`;
- public-step transition: `200-220ms`;
- match connectors: `60ms` stagger, within `360ms` total;
- Receipt seal reveal: `320-360ms`, opacity plus `scale(.96 -> 1)`.

Generic section fade-up sequences are removed from product screens.
`prefers-reduced-motion` renders the terminal state immediately.

## Accessibility

- Base body size is at least `16px`.
- Small text maintains at least `4.5:1` contrast.
- Status uses icon, label, and color.
- Keyboard focus is visible.
- Primary controls meet a `44px` minimum target.
- Long hashes wrap or truncate with an accessible full-value disclosure.
- Live state changes are announced without moving focus unnecessarily.
- Receipt navigation moves focus to the result heading.
- Mobile works from `320px` without horizontal page overflow.

## Figma Deliverable

Create one Figma design file containing:

1. design tokens and core components;
2. Mission Cockpit desktop and mobile;
3. Live Execution Rail desktop and mobile;
4. Receipt Artifact desktop and mobile;
5. a compact annotation showing how the same Receipt continues into Campaign
   Studio and Proof Ledger.

Frames use real current demo copy and testnet-safe sample values. They do not
invent production partners, real funds, yield, or unsupported verifier claims.

## Acceptance Criteria

The visual design is ready for implementation planning when:

1. the first action is visible without scrolling;
2. only one public three-part journey is presented;
3. the detailed live states do not compete with that journey;
4. landing and product screens feel like one product;
5. the user can see what will be executed and what will be received;
6. the Receipt is the clear acquisition moment;
7. the same Receipt identity visibly continues to Campaign Studio and Proof
   Ledger;
8. testnet and mock-asset limits are visible;
9. mobile does not rely on a horizontal progress rail;
10. the design does not imply mainnet funds, rewards, settlement, identity,
    security approval, or finality.

## Implementation Gate

Before production code changes:

1. the user reviews this specification;
2. requested changes are resolved;
3. the Figma frames are created and approved;
4. a separate implementation plan maps the approved visual components to
   existing HTML, CSS, JavaScript, and presentation tests; and
5. Git and deployment actions remain separately authorized.
