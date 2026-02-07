# Cotion

> 노션 스타일 실시간 협업 문서 관리 시스템

Cotion은 팀 내부용으로 제작된 가볍지만 강력한 협업 도구입니다. 실시간 다중 사용자 편집, 계층적 페이지 구조, 리치 텍스트 에디터를 제공합니다.

![Status](https://img.shields.io/badge/status-production%20ready-green)
![Version](https://img.shields.io/badge/version-1.0.0-blue)

## ✨ 주요 기능

- 📝 **리치 텍스트 편집**: TipTap 기반 마크다운 에디터
- 🌳 **계층 구조**: 무한 중첩 가능한 페이지 트리
- 🤝 **실시간 협업**: Yjs CRDT로 충돌 없는 동시 편집
- 👥 **협업 커서**: 다른 사용자의 커서 및 활동 실시간 표시
- 🔐 **안전한 인증**: JWT 기반 인증 시스템
- 💾 **자동 저장**: 변경사항 즉시 저장
- 🎨 **직관적 UI**: 노션과 유사한 사용자 경험
- 😀 **이모지 아이콘**: 페이지마다 이모지 아이콘 설정
- 🔔 **실시간 알림**: Toast 알림으로 모든 액션 피드백
- 🎯 **공통 컴포넌트**: 일관된 디자인 시스템

## 🚀 빠른 시작

### 사전 요구사항

- Node.js 18+
- PostgreSQL 15+
- npm 9+

### 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env

# 3. PostgreSQL 데이터베이스 생성
createdb cotion_dev

# 4. 데이터베이스 마이그레이션
cd packages/backend && npm run migrate:latest && cd ../..

# 5. 개발 서버 실행
npm run dev
```

서버가 시작되면:
- 🌐 Frontend: http://localhost:5173
- 🔌 Backend API: http://localhost:3000
- 🔄 WebSocket: ws://localhost:3000/collaboration

## 🧪 실시간 협업 테스트

1. 브라우저에서 http://localhost:5173 열기
2. 회원가입 후 페이지 생성
3. 시크릿 모드로 다른 계정 로그인
4. 같은 페이지에서 동시에 편집!

**결과**: 타이핑이 즉시 동기화되고, 다른 사용자의 커서가 색상과 함께 표시됩니다.

## 🏗️ 기술 스택

### Frontend
- React 18 + TypeScript
- TipTap (ProseMirror)
- Yjs + y-websocket
- Tailwind CSS + Typography
- Vite

### Backend
- Node.js + Express
- PostgreSQL + LTREE
- JWT Authentication
- WebSocket (ws)
- Knex (migrations)

### Collaboration
- **Yjs**: CRDT 기반 실시간 동기화
- **y-websocket**: WebSocket 프로토콜
- **CollaborationCursor**: 사용자 커서 추적

## 📂 프로젝트 구조

```
cotion/
├── packages/
│   ├── shared/          # 공유 타입 및 검증
│   │   ├── types/       # TypeScript 타입
│   │   └── validators/  # Zod 스키마
│   ├── backend/         # Express API 서버
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   ├── database/
│   │   │   └── websocket/  # Yjs 서버
│   │   └── knexfile.ts
│   └── frontend/        # React 앱
│       ├── src/
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── contexts/
│       │   └── services/
│       └── vite.config.ts
└── PROJECT_SUMMARY.md   # 상세 문서
```

## 📖 주요 명령어

```bash
# 개발
npm run dev          # 모든 패키지 개발 모드로 실행
npm run build        # 모든 패키지 빌드

# 데이터베이스
cd packages/backend
npm run migrate:latest    # 마이그레이션 실행
npm run migrate:rollback  # 롤백
npm run migrate:make name # 새 마이그레이션 생성

# 테스트
npm run test         # 테스트 실행
```

## 🔒 보안

- HTTP-only 쿠키 (XSS 방지)
- Bcrypt 비밀번호 해싱
- JWT 자동 갱신
- Zod 입력 검증
- Helmet.js 보안 헤더
- CORS 설정

## 📊 데이터베이스

### 주요 테이블
- **users**: 사용자 정보 및 인증
- **sessions**: Refresh 토큰 관리
- **pages**: 문서 및 계층 구조 (LTREE)

### 특징
- LTREE 확장으로 효율적인 계층 쿼리
- 자동 updated_at 트리거
- 소프트 삭제 지원

## 🎯 로드맵

### 완료 ✅
- 사용자 인증 및 세션 관리
- 페이지 CRUD 및 계층 구조
- TipTap 리치 텍스트 에디터
- Yjs 실시간 협업
- Collaborative Cursor
- 공통 UI 컴포넌트 라이브러리
- Toast 알림 시스템
- 이모지 페이지 아이콘
- 향상된 UX (로딩 상태, 에러 처리)

### 향후 계획
- [ ] 전체 텍스트 검색
- [ ] 파일 업로드 (이미지)
- [ ] 페이지 권한 관리
- [ ] 버전 히스토리
- [ ] 댓글 시스템
- [ ] 다크 모드
- [ ] 모바일 반응형
- [ ] Docker 배포

## 📝 문서

- 📖 [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - 상세 기술 문서 및 아키텍처
- 🚀 [DEPLOYMENT.md](./DEPLOYMENT.md) - 프로덕션 배포 가이드
- ✅ [TESTING.md](./TESTING.md) - 기능 테스트 가이드
- 📋 [CHANGELOG.md](./CHANGELOG.md) - 버전 변경 이력
- 🎉 [COMPLETION_SUMMARY.md](./COMPLETION_SUMMARY.md) - 프로젝트 완료 요약

## 🤝 기여

이 프로젝트는 팀 내부용으로 제작되었습니다. 새로운 기능 추가나 버그 수정은 팀 채널을 통해 논의해주세요.

## 📄 라이선스

MIT License

---

**만든 날짜**: 2026-02-07
**버전**: 1.1.0
**상태**: ✅ Production Ready

💡 **Tip**: 여러 브라우저 탭을 열어서 실시간 협업을 체험해보세요!
