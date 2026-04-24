# Cotion V2 개편 설계서

> 작성일: 2026-04-24 | 상태: 설계 검토 중

## 1. 개요

코션을 커피 무역/로스터리 업무 관리 플랫폼으로 개편합니다.
사용자 3명이 공유하며, 5개 핵심 기능을 추가합니다.

## 2. 신규 DB 스키마

### 2-1. clients (거래처 DB)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| name | varchar(200) | 로스터리 이름 |
| contact_person | varchar(100) | 담당자 |
| phone | varchar(50) | 연락처 |
| email | varchar(200) | 이메일 |
| address | text | 주소 |
| visited | boolean | 방문 여부 |
| cupping_done | boolean | 커핑 진행 여부 |
| purchased | boolean | 구매 여부 |
| assigned_to | uuid FK→users | 담당자 슬롯 |
| notes | text | 메모 |
| workspace | varchar(100) | 워크스페이스 |
| created_by | uuid FK→users | |
| created_at | timestamp | |
| updated_at | timestamp | |

### 2-2. inventory (재고 DB)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| name | varchar(200) | 품종명 |
| type | varchar(20) | 'green' (생두) / 'roasted' (원두) |
| origin | varchar(100) | 원산지 |
| variety | varchar(100) | 품종 |
| process | varchar(100) | 가공방식 |
| total_in | decimal(10,2) | 총 입고량 (kg) |
| current_stock | decimal(10,2) | 현재 재고 (kg) |
| storage_location | varchar(200) | 보관 위치 |
| workspace | varchar(100) | |
| created_by | uuid FK→users | |
| created_at | timestamp | |
| updated_at | timestamp | |

### 2-3. inventory_transactions (입출고 내역)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| inventory_id | uuid FK→inventory | |
| type | varchar(10) | 'in' (입고) / 'out' (출고) |
| quantity | decimal(10,2) | 수량 (kg) |
| note | text | 비고 |
| created_by | uuid FK→users | |
| created_at | timestamp | |

### 2-4. projects (프로젝트)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| title | varchar(200) | 프로젝트명 |
| description | text | 설명 |
| status | varchar(20) | 'active' / 'archived' |
| workspace | varchar(100) | |
| created_by | uuid FK→users | |
| created_at | timestamp | |
| updated_at | timestamp | |

### 2-5. tasks (칸반 태스크)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| project_id | uuid FK→projects | |
| title | varchar(300) | 태스크명 |
| description | text | 설명 |
| status | varchar(20) | 'todo' / 'in_progress' / 'done' |
| priority | varchar(10) | 'low' / 'medium' / 'high' |
| position | integer | 정렬 순서 |
| due_date | timestamp | 마감일 |
| assignees | uuid[] | 복수 담당자 (배열) |
| created_by | uuid FK→users | |
| created_at | timestamp | |
| updated_at | timestamp | |

### 2-6. cupping_logs (커핑 로그)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| visit_date | date | 방문일 |
| client_id | uuid FK→clients | 로스터리 (거래처 연결) |
| roastery_name | varchar(200) | 로스터리명 (직접 입력 가능) |
| contact_person | varchar(100) | 담당자 |
| offered_beans | text | 제시 생두 종류 |
| reaction | text | 반응 |
| purchase_intent | varchar(20) | 'high' / 'medium' / 'low' / 'none' |
| followup_date | date | 팔로업 날짜 |
| followup_notified | boolean | 팔로업 알림 발송 여부 |
| notes | text | 추가 메모 |
| workspace | varchar(100) | |
| created_by | uuid FK→users | |
| created_at | timestamp | |
| updated_at | timestamp | |

### 2-7. documents (공유 문서 라이브러리)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| title | varchar(300) | 문서 제목 |
| category | varchar(50) | '기획안' / '가격표' / '양식' / '백서' / '기타' |
| file_id | uuid FK→files | 첨부 파일 |
| page_id | uuid FK→pages | 연결된 페이지 (코션 문서) |
| description | text | 설명 |
| workspace | varchar(100) | |
| created_by | uuid FK→users | |
| created_at | timestamp | |
| updated_at | timestamp | |

## 3. 기존 테이블 확장

### pages 테이블

| 추가 컬럼 | 타입 | 설명 |
|-----------|------|------|
| template_type | varchar(30) | null / 'meeting_wed' / 'meeting_sun' |
| auto_generated | boolean | 자동 생성 여부 |

### notifications 테이블

| 추가 컬럼 | 타입 | 설명 |
|-----------|------|------|
| channel | varchar(20) | 'internal' / 'slack' / 'kakao' |
| external_sent | boolean | 외부 알림 발송 완료 |
| scheduled_at | timestamp | 예약 알림 시간 |

## 4. 신규 API 엔드포인트

### 거래처 API
- GET /api/clients — 목록 (필터: visited, cupping_done, purchased, assigned_to)
- POST /api/clients — 생성
- PUT /api/clients/:id — 수정
- DELETE /api/clients/:id — 삭제

### 재고 API
- GET /api/inventory — 목록 (필터: type, origin)
- POST /api/inventory — 생성
- PUT /api/inventory/:id — 수정
- DELETE /api/inventory/:id — 삭제
- POST /api/inventory/:id/transactions — 입출고 기록
- GET /api/inventory/:id/transactions — 입출고 내역

### 프로젝트/칸반 API
- GET /api/projects — 프로젝트 목록
- POST /api/projects — 프로젝트 생성
- PUT /api/projects/:id — 프로젝트 수정
- DELETE /api/projects/:id — 프로젝트 삭제
- GET /api/projects/:id/tasks — 태스크 목록
- POST /api/projects/:id/tasks — 태스크 생성
- PUT /api/tasks/:id — 태스크 수정 (상태, 담당자, 순서 변경)
- PUT /api/tasks/:id/move — 드래그앤드롭 위치 이동
- DELETE /api/tasks/:id — 태스크 삭제

### 커핑 로그 API
- GET /api/cupping-logs — 목록 (필터: client_id, date range)
- POST /api/cupping-logs — 생성
- PUT /api/cupping-logs/:id — 수정
- DELETE /api/cupping-logs/:id — 삭제

### 문서 라이브러리 API
- GET /api/documents — 목록 (필터: category, 검색)
- POST /api/documents — 등록
- PUT /api/documents/:id — 수정
- DELETE /api/documents/:id — 삭제

### 회의 템플릿 API
- POST /api/meetings/generate — 수동 템플릿 생성
- GET /api/meetings/templates — 템플릿 목록

## 5. 프론트엔드 신규 컴포넌트

### 사이드바 메뉴 추가
```
📄 페이지 (기존)
📅 캘린더 (기존)
──────────────
🏢 거래처 DB (신규)
📦 재고 DB (신규)
📋 프로젝트 보드 (신규)
☕ 커핑 로그 (신규)
📁 문서 라이브러리 (신규)
```

### 각 기능별 컴포넌트
- ClientsPage — 테이블 뷰 + 필터 + 추가/수정 모달
- InventoryPage — 테이블 뷰 + 입출고 기록 + 재고 현황
- KanbanBoard — 드래그앤드롭 칸반 + 태스크 카드
- CuppingLogPage — 리스트/카드 뷰 + 팔로업 달력 연동
- DocumentLibrary — 카테고리별 그리드/리스트 뷰

## 6. 회의 템플릿 자동 생성

### 구현 방식
백엔드에 node-cron 스케줄러 추가:
- 매주 수요일 오전 8시: 중간점검 템플릿 자동 생성
- 매주 일요일 오전 8시: 전체회의 템플릿 자동 생성
- 생성된 문서는 pages 테이블에 template_type과 함께 저장

### 수요일 중간점검 템플릿
```markdown
# 📋 중간점검 (YYYY.MM.DD)

## 월~수 진행 현황
- **[이름1]**: 
- **[이름2]**: 
- **[이름3]**: 

## 목~일 남은 할 일
- [ ] (담당: @이름)
- [ ] (담당: @이름)

## 막히는 것 (일요일 회의 전 사전 공유)
- 
```

### 일요일 전체회의 템플릿
```markdown
# 📋 전체 회의 (YYYY.MM.DD)

## 이번주 완료/미완료
- [x] 완료 항목
- [ ] 미완료 항목

## 현 상황 점검
| 항목 | 수치 |
|------|------|
| 커핑 방문 횟수 | 건 |
| 발주 건수 | 건 |
| 재고 잔량 | kg |
| SNS 업로드 | 건 |

## 다음 주 목표
- **[이름1]**: 
- **[이름2]**: 
- **[이름3]**: 

## 논의 사항
1. 
```

## 7. 알림 시스템 (카카오톡/슬랙)

### 트리거
- 커핑 로그 팔로업 날짜 도래 (당일 오전 9시)
- 칸반 태스크 마감일 도래 (전일 오후 6시)
- 회의 템플릿 생성 시 (생성 직후)

### 구현
- Slack: Incoming Webhook URL 설정으로 채널에 메시지 전송
- 카카오톡: 카카오 알림톡 API 또는 카카오워크 웹훅

## 8. 구현 순서 (에이전트 배분)

이 프로젝트는 **3단계**로 나누어 구현합니다.

### Stage 1: 백엔드 기반 (마이그레이션 + API)
- Agent 1-3: 7개 마이그레이션 파일 생성 (병렬)
- Agent 4-8: shared 타입 + validator + service + controller + routes (5개 기능, 병렬)

### Stage 2: 프론트엔드 UI
- Agent 9-13: 5개 페이지 컴포넌트 (병렬)
- Agent 14: 사이드바 메뉴 확장
- Agent 15: React Router 라우트 추가

### Stage 3: 자동화 + 알림
- Agent 16: node-cron 스케줄러 (회의 템플릿)
- Agent 17: Slack/카카오 알림 서비스
- Agent 18: QA 검증

**예상 총 에이전트: 18명**
