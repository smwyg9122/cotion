# Changelog

## [1.1.0] - 2026-02-07

### Added - Phase 6: UI/UX 개선
- 공통 UI 컴포넌트 라이브러리 추가
  - Button: 다양한 variant (primary, secondary, danger, ghost)
  - Input: 라벨, 에러 메시지, helper text 지원
  - Modal: ESC 키 닫기, 백드롭 클릭 지원
  - Spinner & LoadingOverlay: 로딩 상태 표시
  - Alert: 4가지 타입 (success, error, warning, info)
  - EmojiPicker: 페이지 아이콘 선택 UI

- Toast 알림 시스템
  - 자동 사라짐 기능 (기본 3초)
  - 슬라이드 애니메이션
  - 4가지 타입 지원
  - 수동 닫기 버튼

- 사용자 경험 개선
  - 로그인/회원가입 폼 재디자인 (그라데이션 배경)
  - 모든 CRUD 액션에 Toast 피드백 추가
  - 로딩 상태 개선
  - 에러 처리 강화
  - 페이지 생성 시 이모지 선택 기능

### Improved
- NewPageModal을 공통 컴포넌트로 전환
- 일관된 디자인 시스템 적용
- 사용자 피드백 메시지 개선

## [1.0.0] - 2026-02-07

### Added - Initial Release
- Phase 1: 프로젝트 초기화
  - Turborepo 모노레포 구조
  - Frontend (React + Vite + TypeScript)
  - Backend (Express + TypeScript)
  - Shared 패키지 (타입 및 검증)

- Phase 2: 인증 시스템
  - JWT 기반 인증 (Access + Refresh 토큰)
  - HTTP-only 쿠키
  - Bcrypt 비밀번호 해싱
  - 사용자 회원가입/로그인

- Phase 3: 페이지 CRUD
  - PostgreSQL + LTREE 계층 구조
  - 페이지 생성/수정/삭제
  - 무한 중첩 가능한 페이지 트리
  - 재귀 트리 컴포넌트

- Phase 4: 마크다운 에디터
  - TipTap 리치 텍스트 에디터
  - 포맷팅 툴바
  - 마크다운 지원
  - 자동 저장 기능

- Phase 5: 실시간 협업
  - Yjs CRDT 기반 동기화
  - WebSocket 실시간 연결
  - Collaborative Cursor
  - 활성 사용자 표시
  - 연결 상태 표시
