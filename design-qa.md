# GIWA Protocol Console Design QA

## Source and implementation

- Figma file: `J4qLZY6lbrSnvj4lQttbga`
- Approved desktop nodes:
  - Mission `29:2`
  - Execution `35:2`
  - Receipt `38:60`
- Approved mobile nodes:
  - Mission `32:2`
  - Execution `37:74`
  - Receipt `39:2`
- Handoff map: `41:43`
- Local routes:
  - Mission: `http://127.0.0.1:4177/user`
  - Receipt: `http://127.0.0.1:4177/user/receipt/0x6d5f8f6fea095170e095233193c8d6b470317e7760fd94c6f56441310a2981be`
- Combined visual evidence:
  - Mission mobile: `C:/Users/qwaqw/AppData/Local/Temp/giwa-mission-mobile-comparison-final.png`
  - Execution desktop: `C:/Users/qwaqw/AppData/Local/Temp/giwa-execution-comparison-fresh.png`
  - Receipt desktop: `C:/Users/qwaqw/AppData/Local/Temp/giwa-receipt-comparison-1440.png`

## Normalization

- Mission mobile source: `390 × 844`; browser capture: `375 × 844` from a
  `390 × 844` CSS viewport after browser chrome normalization.
- Execution source: `1440 × 1024`; implementation inspected at `1280 × 720`.
- Receipt source: `1440 × 1024`; implementation inspected at desktop and
  `390 × 844` mobile viewports.
- Pretendard Variable is loaded and used for Korean display and body text.
- The approved warm paper, near-black ink, GIWA green, thin rule, and restrained
  surface tokens are used without gradients or decorative illustration.

## Findings

- No actionable P0, P1, or P2 mismatch remains.
- Mission preserves the approved two-column desktop cockpit and compact mobile
  sequence. At mobile width the title, condition card, and primary action remain
  visible in the first viewport without horizontal overflow.
- Execution exposes all five internal states: preparation, wallet approval,
  transaction submission, condition matching, and Receipt issuance. The live
  evidence panel and Receipt gate use recorded local testnet fixture data rather
  than invented production claims.
- Receipt preserves the approved public artifact hierarchy: matched headline,
  4/4 summary, seal, block evidence, copy/explorer utilities, and the two
  follow-on participation routes.
- Campaign Studio and Proof Ledger are derived from the same public Receipt hash,
  making the next participation step understandable without implying real funds,
  yield, settlement, KYC, or a security guarantee.
- Responsive layouts contain all content with no horizontal overflow at the
  inspected desktop and mobile widths. Primary controls meet the intended
  44–48 px target size, semantic headings and status regions remain available,
  and reduced-motion behavior is retained.

## Functionality checked

- Mission primary action advances from condition review to wallet connection.
- The non-demo route projects the current local run into Mission and Execution
  presentation states without changing the legacy `/giwa-demo` path.
- The Receipt route renders a matched public artifact from the existing local
  API payload.
- Receipt links preserve the exact Receipt hash for Explorer, Campaign Studio,
  and Proof Ledger navigation.
- Browser DOM inspection confirmed the public journey labels, five execution
  stages, 4/4 Receipt result, and next-participation routes.

## Residual P3 notes

- At a shorter `1280 × 720` viewport, the Execution workspace continues below
  the fold because it includes real retry/action and evidence content. Its
  hierarchy matches the `1440 × 1024` source and remains usable by scrolling.
- Browser chrome reports a 375 px capture surface for the requested 390 px mobile
  viewport. The implementation was checked against both the CSS viewport metrics
  and the captured pixels.

## Verification checklist

- [x] Mission, Execution, and Receipt visual hierarchy compared with approved Figma nodes.
- [x] Desktop and mobile overflow inspected.
- [x] Core Mission interaction exercised in the in-app browser.
- [x] Receipt data and follow-on links inspected from a matched local fixture.
- [x] Testnet-only and mock-asset boundaries retained in public copy.
- [x] Temporary QA route removed from the public application.

final result: passed
