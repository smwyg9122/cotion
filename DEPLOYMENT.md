# Cotion 배포 가이드 🚀

Ayuta 전용 협업 문서 관리 시스템을 Railway에 배포하는 가이드입니다.

## 준비사항

1. [Railway](https://railway.app) 계정 생성
2. GitHub 계정
3. Git 설치

## 1단계: GitHub에 코드 푸시

```bash
cd /Users/maesterong/cotion

# Git 초기화
git init
git add .
git commit -m "Initial commit for Cotion deployment"

# GitHub 저장소 생성 후
git remote add origin https://github.com/YOUR_USERNAME/cotion.git
git branch -M main
git push -u origin main
```

## 2단계: Railway 배포

### 백엔드 + 데이터베이스 배포

1. [Railway Dashboard](https://railway.app/dashboard) 접속
2. "New Project" → "Deploy from GitHub repo" 선택
3. `cotion` 저장소 선택
4. "Add PostgreSQL" 클릭
5. 백엔드 서비스 설정:

**환경 변수 (Variables 탭):**
```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_ACCESS_SECRET=your-super-secret-key-32-chars-min
JWT_REFRESH_SECRET=your-another-secret-key-32-chars
PORT=3000
NODE_ENV=production
CORS_ORIGIN=*
```

**Settings:**
- Root Directory: `/`
- Dockerfile Path: `Dockerfile.backend`

6. 배포 후 도메인 생성: Settings → Generate Domain
7. 백엔드 URL 복사: `https://your-backend.railway.app`

### 데이터베이스 마이그레이션

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인 및 연결
railway login
railway link

# 마이그레이션
railway run npm run migrate:latest --filter=@cotion/backend
```

### 프론트엔드 배포

1. "New Service" → GitHub Repo (같은 저장소)
2. 환경 변수:
```env
VITE_API_URL=https://your-backend.railway.app/api
VITE_WS_URL=wss://your-backend.railway.app/collaboration
```

3. Settings:
- Dockerfile Path: `Dockerfile.frontend`

4. 배포 후 도메인 생성
5. 프론트엔드 URL 복사: `https://your-frontend.railway.app`

### CORS 업데이트

백엔드 환경 변수:
```env
CORS_ORIGIN=https://your-frontend.railway.app
```

## 3단계: 팀원에게 공유

**접속 URL:**
```
https://your-frontend.railway.app
```

**기본 계정:**
- ayuta1 / password
- ayuta2 / password  
- ayuta3 / password

## 비용

- Railway 무료: $5 credit/월
- 소규모 팀에 충분

## 문제 해결

**DB 연결 실패:** DATABASE_URL 확인  
**CORS 오류:** CORS_ORIGIN 설정 확인  
**WS 연결 실패:** wss:// 프로토콜 사용 확인
