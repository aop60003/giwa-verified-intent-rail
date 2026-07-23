---
name: sprint
description: 대규모 기능을 체계적으로 구현할 때 사용. 브레인스토밍 → 계획 → 실행 → 리뷰 → 완료의 전체 개발 사이클을 관리한다.
---

# Sprint — 대규모 기능 구현 사이클

## 개요

단일 기능을 브레인스토밍부터 완료까지 전체 사이클로 관리한다.
각 단계에서 해당 전문 스킬을 호출하여 품질을 보장한다.

## 스프린트 흐름

```
1. 브레인스토밍  → brainstorming 스킬
2. 계획 작성    → writing-plans 스킬
3. 환경 준비    → using-git-worktrees 스킬
4. 계획 실행    → executing-plans 또는 subagent-driven-development 스킬
5. 코드 리뷰    → requesting-code-review 스킬
6. 브랜치 완료  → finishing-a-development-branch 스킬
```

## 시작 방법

```
/sprint <기능 설명>
```

### Phase 1: 브레인스토밍
- 사용자 의도와 요구사항 탐색
- 2-3가지 접근법 제안
- 설계 승인 후 설계 문서 저장

### Phase 2: 계획 작성
- 설계를 2-5분 단위 태스크로 분해
- 파일 경로, 코드, 테스트, 명령어 포함
- 계획 문서 저장

### Phase 3: 환경 준비
- Git worktree로 격리 환경 생성
- 의존성 설치
- 베이스라인 테스트 통과 확인

### Phase 4: 계획 실행
- 태스크별 TDD 사이클 (Red-Green-Refactor)
- 각 태스크 후 검증
- 블로커 발생 시 중단 후 논의

### Phase 5: 코드 리뷰
- 전체 변경사항 리뷰
- Critical/Important 이슈 수정
- 전체 테스트 스위트 통과 확인

### Phase 6: 브랜치 완료
- 4가지 옵션 (머지/PR/유지/폐기) 제시
- 선택 실행 및 정리

## 체크포인트

각 Phase 완료 시:
- 진행 상태 저장 (`docs/plans/` 내)
- 컨텍스트가 70% 이상이면 상태 저장 후 세션 정리 권장

## 규칙

- Phase 순서를 건너뛰지 않는다
- 각 Phase에서 해당 전문 스킬을 반드시 따른다
- 사용자 승인 없이 다음 Phase로 넘어가지 않는다
