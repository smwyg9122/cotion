# AGENTS.md — Cotion 하네스 규칙

> 이 문서는 하네스 엔진이 자동 생성하며, 모든 AI 에이전트가 작업 전 반드시 읽어야 합니다.
> 마지막 업데이트: 2026-04-06

---

## 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트 | Cotion — 실시간 협업 문서 관리 시스템 |
| 구조 | Turbo 모노레포 (frontend / backend / shared) |
| 프론트엔드 | React 18 + TypeScript + Vite + TailwindCSS |
| 백엔드 | Express 4 + TypeScript + Knex.js |
| 데이터베이스 | PostgreSQL 15 (LTREE 확장) |
| 실시간 동기화 | Yjs + y-websocket (CRDT) |
| 에디터 | TipTap (ProseMirror 기반) |
| 인증 | JWT (Access 15분 + Refresh 7일) + bcrypt |
| 배포 | Vercel (프론트) + Railway (백엔드 + DB) |

## 빌드 & 실행 명령

```bash
# 개발 서버
turbo run dev

# 빌드
turbo run build

# 커밋 & 푸시 (항상 한 줄로)
git add -A && git commit -m "메시지" && git push

# DB 마이그레이션 (로컬)
cd packages/backend && npx knex migrate:latest
cd packages/backend && npx knex migrate:rollback
```

## 코딩 규칙

### 파일 구조 패턴

새 기능 추가 시 아래 파일들을 **모두** 생성/수정해야 한다:

```
packages/shared/src/types/{feature}.types.ts      ← 타입 정의
packages/shared/src/validators/{feature}.validator.ts ← Zod 스키마
packages/shared/src/index.ts                       ← export 추가
packages/backend/src/database/migrations/          ← DB 마이그레이션
packages/backend/src/services/{feature}.service.ts ← 비즈니스 로직
packages/backend/src/controllers/{feature}.controller.ts ← 컨트롤러
packages/backend/src/routes/{feature}.routes.ts    ← 라우트
packages/backend/src/server.ts                     ← 라우트 등록
packages/frontend/src/hooks/use{Feature}.ts        ← API 훅
packages/frontend/src/components/{feature}/        ← UI 컴포넌트
```

### 필수 준수 사항

1. **API 호출**: 프론트엔드에서 HTTP 요청 시 반드시 `services/api.ts`의 `api` 인스턴스 사용. `import axios from 'axios'` 직접 사용 금지
2. **Zod 스키마**: DB 컬럼 추가 시 `create` + `update` 스키마 **모두** 업데이트
3. **camelCase ↔ snake_case**: 서비스에서 DB 쿼리 시 명시적 필드 매핑. spread 금지
4. **API 응답 형식**: 모든 API 응답은 `{ success: boolean, data: T }` 형태. 프론트에서 `response.data.data`로 접근
5. **커밋 메시지**: `git add -A && git commit -m "type: 설명" && git push` 한 줄 명령

---

## 금지 사항 (실패 로그에서 학습)

> ⛔ 아래 항목은 과거 실패에서 도출된 규칙으로, 절대 반복하지 말 것

### [R001] Zod 스키마 누락 금지
DB에 필드를 추가했으면 반드시 Zod 스키마에도 추가. 안 하면 `.parse()`가 해당 필드를 **삭제**해서 항상 null로 저장됨.

### [R002] raw axios 사용 금지
`import axios from 'axios'`로 직접 호출하면 인증 토큰이 안 붙음. 반드시 `api` 인스턴스 사용.

### [R003] spread로 DB insert 금지
`await db('table').insert({ ...input })` 금지. TypeScript는 camelCase, DB는 snake_case이므로 `start_date: input.startDate` 형태로 명시적 매핑.

### [R004] API 경로 대조 없이 호출 금지
프론트엔드에서 API 경로를 추측하지 말 것. 반드시 `routes/*.routes.ts` 파일을 확인.

### [R005] 워크스페이스를 카테고리로 구현 금지
워크스페이스와 카테고리는 별개. 새 분류 필요 시 전용 컬럼을 만들 것.

### [R006] 프로덕션 DB에 백업 없이 쿼리 금지
`DELETE`, `ALTER`, `DROP` 등 파괴적 쿼리 전 반드시 `pg_dump`로 백업.

### [R007] FormData 전송 시 Content-Type 금지
`api.post(url, formData)` 시 Content-Type 헤더를 수동으로 설정하지 말 것. axios가 `multipart/form-data; boundary=...`를 자동 설정함. 수동 설정하면 multer가 파싱 불가.

### [R008] PostgreSQL timestamp 컬럼에 date-only 문자열 금지
timestamp/timestamptz 컬럼에 `'2026-04-24'` 같은 날짜만 보내면 안됨. 반드시 `'2026-04-24T00:00:00'` 형태로 시간까지 포함.

### [R009] 마이그레이션 idempotent 필수
`createTable` 전 `hasTable` 확인, `addColumn` 전 `hasColumn` 확인. 중복 실행 시 에러 방지.

### [R010] knexfile production extension 동적 설정
프로덕션에서 마이그레이션 extension은 `'js'` (TypeScript 컴파일 결과). `extension: isProduction ? 'js' : 'ts'` 패턴 사용.

### [R011] knex loadExtensions 필수 설정
`tsconfig.json`에 `"declaration": true`가 있으면 `.d.ts` 파일이 마이그레이션 폴더에 생성됨. Knex가 `.d.ts`를 `.ts`로 인식해 로드 시도 → `Unexpected token 'export'` 에러. 반드시 `loadExtensions: isProduction ? ['.js'] : ['.ts']` 설정.

---

## 작업 전 체크리스트

- [ ] 관련 코드 구조를 먼저 파악 (파일 읽기)
- [ ] 변경 범위를 명확히 정의
- [ ] 영향받는 파일 목록 확인 (shared, backend, frontend)
- [ ] DB 변경이 있으면 마이그레이션 사전 설계
- [ ] 프로덕션 DB 작업이면 백업 수행

## 작업 후 체크리스트

- [ ] Zod 스키마가 DB 컬럼과 동기화되어 있는지 확인
- [ ] 프론트엔드 API 경로가 백엔드 라우트와 일치하는지 확인
- [ ] API 응답 접근이 `.data.data` 패턴인지 확인
- [ ] camelCase ↔ snake_case 매핑이 명시적인지 확인
- [ ] `api` 인스턴스 사용 여부 확인 (raw axios 금지)
- [ ] 한 줄 커밋 명령어 제공

---

## 하네스 상태

| 항목 | 값 |
|------|-----|
| 규칙 수 | 15 |
| 실패 로그 | 13건 |
| 최근 평가 | 5.0/5.0 (V2 개편 완료) |
| 마지막 업데이트 | 2026-04-24 |
