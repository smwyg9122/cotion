# Cotion — Security & Architecture Notes

이 문서는 이번 시즌(2026-05) 대규모 보안 강화 + Ayuta CRM 추가 작업의
설계 의도, 의도적으로 deferred한 항목, 그리고 향후 개선 후보를 정리합니다.
새 기능을 추가하거나 보안 패치를 적용하기 전에 이 문서를 먼저 읽으세요.

---

## 1. 보안 모델 (현재 상태)

### 1.1 인증 (Authentication)

| Layer | 메커니즘 |
|---|---|
| Access token | JWT, **1시간** 만료, `jti` 포함 (재발급 시 충돌 방지) |
| Refresh token | JWT 7일, DB `sessions` 테이블에 저장, **rotation + reuse-detection** |
| Refresh cookie | `HttpOnly` + `SameSite=Lax` + `Secure`(프로덕션) |
| CSRF | `/auth/refresh`, `/auth/logout`에 Origin/Referer allowlist 미들웨어 |

**Refresh rotation 동작**:
1. 로그인 시 access + refresh 토큰 발급, refresh는 cookie + DB sessions에 저장
2. `/refresh` 호출 시 → 이전 토큰 DB에서 삭제 + 새 토큰 쌍 발급 + 새 cookie 설정
3. 누군가 옛 refresh token을 재사용 시도 → 해당 user의 모든 sessions 즉시 wipe (탈취 대응)

### 1.2 인가 (Authorization)

3단계 방어:

```
Request ──[ authMiddleware ]──[ assertWorkspaceAccess ]──[ Service WHERE workspace=X ]──> DB
            JWT 검증              user.allowed_workspaces  row.workspace 일치 확인
            + is_active           포함 확인 (캐시 60s)
```

각 layer가 **독립적으로** 거부 가능. 한 layer를 우회해도 다음 layer가 잡음.

### 1.3 워크스페이스 ACL 캐시

- 위치: `packages/backend/src/services/workspace-cache.ts`
- 백엔드: 인터페이스 (`WorkspaceCacheBackend`) + 기본 `InMemoryBackend`
- TTL: 60초
- 무효화 시점: `admin.updateUserWorkspaces` / `addWorkspaceMember` / `removeWorkspaceMember` 호출 직후
- **다중 인스턴스 배포 시 변경 필요** (자세한 내용은 §3.1)

### 1.4 WebSocket 인가 (Yjs 협업)

- 브라우저는 WS upgrade에 custom header 못 보냄 → JWT를 `?token=` 쿼리로 전달
- Upgrade 시 검증:
  1. JWT signature + expiry
  2. `?userId=` 가 JWT 페이로드 userId와 일치 (presence spoofing 방지)
  3. `?doc=page-<uuid>` → `pages` 테이블 조회 → `assertWorkspaceAccess`로 워크스페이스 권한 검증
- 모든 단계 실패는 audit log에 기록

### 1.5 감사 로그

`activity_logs` 테이블에 다음 보안 이벤트 자동 기록:
- `security:acl_deny` — assertWorkspaceAccess 거부
- `security:csrf_block` — CSRF 미들웨어 거부
- `security:deactivated_user_attempt` — 비활성 계정 로그인 시도
- `security:ws_unauthorized` — WebSocket reject (사유 포함)
- `security:workspace_member_added/removed` — 권한 변경

조회: `SELECT * FROM activity_logs WHERE action LIKE 'security:%' ORDER BY created_at DESC`

### 1.6 Rate Limiting

| 엔드포인트 | 한도 |
|---|---|
| `/auth/login` | 10/min/IP |
| `/auth/signup` | 5/hour/IP |
| `/auth/refresh` | 60/min/IP |
| `/auth/change-password` | 10/15min/IP |
| `/files/:id` (download) | 200/min/IP (UUID enumeration 방어) |

---

## 2. 워크스페이스 격리 (Tenant Isolation) 적용 범위

✅ 적용 완료된 서비스:
- clients · inventory · cupping · calendar · documents · projects · ayuta-buyers
- pages (allowed_workspaces 기반 자동 필터)
- comments (parent page workspace로 derive)
- notifications.createMention (parent page workspace로 derive)

🟡 부분 적용:
- files: download endpoint는 의도적 public (브라우저 `<img src>` 한계).
  UUIDv4 122 bits + rate limit으로 enumeration 방어.

⛔ 미적용 (의도적 deferral):
- admin: superadmin 전용이라 워크스페이스 무관
- kakao: OAuth 흐름, 외부 콜백 처리

---

## 3. 의도적으로 Deferred한 항목

각 항목은 "왜 지금 안 했는가" + "언제/어떻게 해야 하는가"를 명시.

### 3.1 분산 ACL 캐시 (Redis)

**현재**: `InMemoryBackend` (단일 Railway 인스턴스 기준)
**문제**: 수평 확장 시 인스턴스별 캐시 stale (최대 60초)
**언제 필요**: Railway에서 다중 replica 띄울 때 (현재는 1개)
**적용 방법**:
1. `redis` 패키지 추가
2. `RedisBackend implements WorkspaceCacheBackend` 구현 (GET / SETEX / DEL)
3. `getWorkspaceCacheBackend()`에서 `process.env.REDIS_URL` 체크
4. 모든 호출부 코드 변경 없음 (인터페이스 일치)

### 3.2 페이지 단위 권한 (Page-level ACL)

**현재**: 워크스페이스 단위 권한만 — 워크스페이스 멤버는 그 안의 모든 페이지 읽기/쓰기
**문제**: 한 워크스페이스 안에서 특정 페이지를 일부 멤버에게만 공개하고 싶을 때 불가
**필요 작업** (대형 기능):
1. 신규 테이블 `page_permissions(page_id, user_id, role)` (role: read/write/admin)
2. `PagesService` 모든 메서드에 페이지별 권한 체크 추가
3. UI: 페이지 우상단 "공유" 버튼 → 멤버 추가/제거 모달
4. 상속 정책 결정: 하위 페이지가 상위 권한 상속할지?
5. 캐시 전략 재설계 (page-level access는 워크스페이스보다 read 빈도 훨씬 높음)

**언제 필요**: 같은 워크스페이스 내 비밀 정보 (예: 인사평가, 임원 회의록) 분리 필요 시.
현재 사용자(아유타 + 제이로텍)는 워크스페이스 자체가 회사 구분이라 페이지 단위 권한 필요성 낮음.

### 3.3 RLS (Row-Level Security)

**현재**: 애플리케이션 레이어에서만 워크스페이스 격리
**아이디어**: PostgreSQL RLS로 DB 레벨에서 강제 — 애플리케이션 버그가 격리를 깨도 DB가 마지막 방어선
**Trade-off**: 모든 query에 PG session variable 세팅 필요, knex와 연결 풀 호환성 검토 필요
**언제 필요**: 보안 감사(SOC2 등)에서 요구할 때

### 3.4 Bundle 추가 최적화

**현재**: 6개 heavy view를 React.lazy로 분리, gzip 334KB → 초기 로드 작아짐
**가능한 추가 작업**:
- Tiptap editor와 그 extensions를 lazy load (페이지 편집 시점에만)
- 이미지/PDF 미리보기 라이브러리 dynamic import
- 차트 라이브러리 (있다면) lazy

**언제 필요**: Lighthouse 점수 떨어지거나 모바일 사용자 비율 증가 시.

### 3.5 통합 테스트 확장

**현재**: 41개 assertion, 백엔드 통합 위주
**부족한 부분**:
- 프론트엔드 unit 테스트 0개
- E2E 테스트 (Playwright/Cypress) 0개
- shared validator의 zod 스키마 unit 테스트 0개

**언제 필요**: 팀 규모 커지면서 회귀가 잦아질 때.

---

## 4. 개발 워크플로우 권장 사항

새 기능을 추가할 때:

1. **Migration이 필요하면** — 마이그레이션은 idempotent하게 (per-column `hasColumn` 체크, `CREATE INDEX IF NOT EXISTS`)
2. **워크스페이스 데이터를 다루면** — 서비스에 workspace 파라미터 + 컨트롤러에 `assertWorkspaceAccess` 두 곳 모두 필수
3. **새 폼 필드를 추가하면** — `optionalEmail` / `optionalUuid` / `emptyToUndefined` 헬퍼 사용 (빈 문자열 처리)
4. **새 에러 메시지를 표시하면** — `formatApiError(err, fallback)` 사용 (필드별 한국어 메시지)
5. **새 마이그레이션을 추가하면** — 로컬에서 `npx turbo run build --filter=@cotion/frontend...` 로 Vercel 빌드 시뮬레이션
6. **푸시 전 통합 테스트** — `test-runtime/run-tests.js` 통과 확인

---

## 5. 알려진 trade-off

| 항목 | 현재 동작 | Trade-off |
|---|---|---|
| 파일 다운로드 public | 인증 없음 + rate limit | `<img src>` 호환성 ↔ 권한 정밀도 |
| ACL 캐시 60s TTL | 권한 회수가 최대 60초 지연 | 성능 ↔ 실시간성 |
| JWT 1시간 만료 | 매시간 refresh | 보안 ↔ 사용자 경험 |
| workspace 자유 문자열 | CHECK 제약 (ayuta_buyers만) | 유연성 ↔ 무결성 |
| pages는 server filter | 워크스페이스 전환 시 refetch 없음 | 메모리 ↔ 네트워크 |

---

_마지막 업데이트: 2026-05-27, agent-council 3차 검토 + 모든 actionable findings 적용 후._
