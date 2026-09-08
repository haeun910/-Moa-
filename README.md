# 모아 (Moa)

할 일과 일정을 한 곳에 모아서 관리하는 개인용 플래너 웹앱(PWA)입니다.

## 주요 기능

- **할 일 관리** — 하위 항목, 카테고리, 날짜·시간 지정, 드래그로 순서/날짜 변경
- **캘린더** — 월간/주간 보기, 날짜별 시간표(시간대별 일정) 보기
- **저장소** — 날짜 없이 카테고리별로 보관하는 할 일 목록
- **메모**
- **이번 달 목표 & D-Day**
- **내 보드** — 오늘/내일 할 일을 한눈에
- **성취 리포트** — 월별 달성률, 최근 14일 추이, 카테고리별 통계
- **공지사항** — 운영자가 올리는 공지를 모든 사용자가 확인 (관리자만 작성 가능)
- **다크모드** (라이트/다크/시스템)
- **PWA 설치** — 홈 화면에 앱처럼 설치 가능 (설정 화면에서 원클릭 설치 또는 안내)
- **계정 관리** — 비밀번호 변경, 데이터 내보내기(JSON 백업), 계정 삭제
- 이메일/비밀번호 및 Google 로그인 지원

## 기술 스택

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vite.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) — 인증, 데이터베이스(Postgres + RLS), 실시간 동기화
- [dnd-kit](https://dndkit.com/) — 드래그 앤 드롭
- [date-fns](https://date-fns.org/)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) — PWA/오프라인 지원

## 시작하기

### 1. 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.example`을 참고해서 프로젝트 루트에 `.env` 파일을 만듭니다.

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

값은 [Supabase 대시보드](https://supabase.com/dashboard) → 프로젝트 → **Project Settings → API**에서 확인할 수 있습니다.

> `.env`가 없거나 값이 비어 있으면 앱이 흰 화면 대신 "환경설정이 필요해요" 안내 화면을 보여줍니다.

### 3. Supabase 데이터베이스 설정

Supabase 대시보드 → **SQL Editor**에서 아래 순서대로 실행합니다.

1. [`supabase/schema.sql`](supabase/schema.sql) — 전체 테이블, RLS 정책, 신규 가입자 기본 카테고리 설정
2. [`supabase/migrations/001_add_start_time.sql`](supabase/migrations/001_add_start_time.sql)
3. [`supabase/migrations/002_monthly_goals_ddays.sql`](supabase/migrations/002_monthly_goals_ddays.sql)
4. [`supabase/migrations/003_notices.sql`](supabase/migrations/003_notices.sql) — 공지사항 기능 (관리자 계정 UUID를 본인 것으로 바꿔서 실행)

Google 로그인을 쓰려면 Supabase 대시보드 → **Authentication → Providers**에서 Google을 활성화하고 OAuth 클라이언트를 등록해야 합니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

## 스크립트

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 타입 체크 후 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | oxlint 실행 |

## 폴더 구조

```
src/
  components/   재사용 컴포넌트 (모달, 로고, 알림 등)
  context/      전역 상태 (Auth, App 데이터)
  hooks/        커스텀 훅 (PWA 설치 등)
  lib/          Supabase 클라이언트 & DB 함수
  pages/        화면 단위 페이지
  types/        공용 타입 정의
supabase/
  schema.sql        기본 스키마
  migrations/       스키마 변경 이력 (번호 순으로 실행)
```

## 배포

Vite로 빌드되는 정적 SPA + PWA입니다. Vercel, Netlify 등 정적 호스팅 서비스에 연결해 `npm run build`(빌드 명령), `dist`(출력 폴더)로 배포할 수 있습니다. 배포 환경에도 `.env`와 동일한 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 환경변수를 설정해야 합니다.
