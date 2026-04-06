# 하네스 규칙 (Cotion 프로젝트)

> 이 규칙들은 실패 로그에서 자동 추출되었으며, 모든 에이전트가 작업 전 반드시 확인해야 한다.

---

## [R001] Zod 스키마 동기화 필수
- **출처:** failure-log #1 (dd5e947)
- **규칙:** DB 컬럼 추가 시 반드시 `packages/shared/src/validators/`의 **create + update 스키마 모두** 업데이트할 것. Zod의 `.parse()`는 스키마에 없는 필드를 자동 strip하므로, 누락하면 해당 필드가 항상 null로 저장됨.
- **적용 범위:** 모든 DB 스키마 변경 작업
- **체크리스트:**
  - [ ] DB 마이그레이션에 컬럼 추가
  - [ ] shared/types에 타입 추가
  - [ ] shared/validators에 Zod 스키마 추가 (create + update)
  - [ ] shared/index.ts에서 export 확인

## [R002] API 인스턴스 사용 강제
- **출처:** failure-log #5 (7629fc7)
- **규칙:** 프론트엔드에서 API 호출 시 **반드시** `services/api.ts`의 `api` 인스턴스를 사용할 것. `import axios from 'axios'` 직접 사용 **금지**. `api` 인스턴스는 인터셉터로 Bearer 토큰을 자동 첨부하고, 401 에러 시 자동 로그아웃을 처리함.
- **적용 범위:** 프론트엔드 모든 HTTP 요청

## [R003] camelCase ↔ snake_case 명시적 매핑
- **출처:** failure-log #6 (94beee3)
- **규칙:** 서비스에서 DB 쿼리 작성 시 TypeScript 인터페이스(camelCase)와 DB 컬럼(snake_case) 간 매핑을 **명시적으로** 수행할 것. `...input` spread 금지. 각 필드를 `start_date: input.startDate` 형태로 개별 매핑.
- **적용 범위:** 백엔드 모든 서비스의 DB insert/update 쿼리

## [R004] API 경로 대조 검증
- **출처:** failure-log #7 (94beee3)
- **규칙:** 프론트엔드 API 호출 시 경로를 반드시 백엔드 `routes/*.routes.ts` 파일과 대조 확인할 것. 또한 응답 형식은 `{ success: boolean, data: T }` 래퍼 구조이므로, 데이터 접근 시 `response.data.data`로 접근해야 함.
- **적용 범위:** 프론트엔드 모든 API 호출

## [R005] 워크스페이스 ≠ 카테고리
- **출처:** failure-log #3 (2fcf6bb)
- **규칙:** 워크스페이스와 카테고리는 **별개 개념**으로 취급할 것. 새로운 분류 체계가 필요하면 기존 필드를 재활용하지 말고 전용 컬럼/필드를 생성할 것.
- **적용 범위:** 데이터 모델 설계

## [R006] 마이그레이션 사전 설계
- **출처:** failure-log #4 (20260314 시리즈)
- **규칙:** 마이그레이션 작성 전 전체 스키마 변경 계획을 먼저 수립할 것. 관련 변경은 한 번의 마이그레이션에 모두 포함. 점진적 시행착오로 여러 마이그레이션을 만들지 않을 것.
- **적용 범위:** DB 마이그레이션 작업

## [R007] Railway 배포 체크리스트
- **출처:** failure-log #8 (ac9beb7)
- **규칙:** Railway 배포 시 반드시 확인:
  1. PostgreSQL SSL 설정 (`rejectUnauthorized: false`)
  2. `/health` 엔드포인트 정상 응답
  3. 마이그레이션 실패가 서버 시작을 막지 않도록 `try-catch` 처리
  4. `Dockerfile.backend`의 빌드 결과 확인
- **적용 범위:** 배포 관련 작업

## [R008] 프로덕션 DB 작업 전 백업 필수
- **출처:** 사용자 지시 (standing instruction)
- **규칙:** 프로덕션 DB에 직접 SQL을 실행하기 전 **반드시** `pg_dump`로 백업할 것. 백업 없이 DELETE, ALTER, DROP 등 파괴적 쿼리 실행 금지.
- **적용 범위:** 프로덕션 DB 모든 작업

## [R009] 함수 인자 순서 확인
- **출처:** failure-log #2 (dd5e947)
- **규칙:** 함수 호출 시 인자 순서와 의미를 반드시 확인할 것. optional 파라미터가 2개 이상인 함수는 명명된 객체 패턴 `{ parentId, category }` 사용을 권장.
- **적용 범위:** 프론트엔드/백엔드 공통

## [R010] Git 커밋 메시지 한 줄 명령
- **출처:** 사용자 지시
- **규칙:** 커밋과 푸시는 항상 한 줄 명령어로 제공할 것: `git add -A && git commit -m "메시지" && git push`
- **적용 범위:** 모든 Git 작업
