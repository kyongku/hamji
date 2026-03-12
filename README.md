# 함지고 — 고등학생 올인원 커뮤니티 플랫폼

## 기술 스택
- **프론트엔드**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **백엔드/DB**: Supabase (PostgreSQL + Auth + Realtime)
- **상태 관리**: Zustand
- **배포**: Vercel

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. Supabase 프로젝트 생성
1. [supabase.com](https://supabase.com)에서 무료 프로젝트 생성
2. 프로젝트 URL과 anon key 복사

### 3. 환경 변수 설정
```bash
cp .env.example .env.local
```
`.env.local` 파일을 열어 Supabase URL과 키를 입력:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

### 4. DB 마이그레이션
Supabase 대시보드 → SQL Editor에서 `sql/migration.sql` 파일 내용을 실행

### 5. Google OAuth 설정
1. Supabase 대시보드 → Authentication → Providers → Google 활성화
2. Google Cloud Console에서 OAuth 2.0 클라이언트 ID 생성
3. Supabase에 Client ID/Secret 입력
4. Authorized redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`

### 6. 개발 서버 실행
```bash
npm run dev
```
http://localhost:3000 에서 확인

## Vercel 배포
1. GitHub에 push
2. [vercel.com](https://vercel.com)에서 Import
3. 환경 변수 설정 (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
4. Deploy

## 프로젝트 구조
```
hamjigo/
├── app/                    # Next.js App Router 페이지
│   ├── layout.tsx          # 루트 레이아웃 (네비게이션, 헤더)
│   ├── page.tsx            # 홈
│   ├── login/              # 로그인 (Google OAuth)
│   ├── board/              # 게시판 (목록, 글쓰기, 상세)
│   ├── schedule/           # 개인 시간표/캘린더
│   ├── career/             # 진로 (적성 테스트, AI 추천)
│   ├── challenge/          # 공부 인증 챌린지
│   ├── bucket/             # 버킷리스트
│   ├── assessment/         # 수행평가
│   ├── info/               # 정보 (정적 페이지)
│   ├── profile/            # 프로필 + 온보딩
│   └── api/auth/callback/  # OAuth 콜백 핸들러
├── components/             # 공용 컴포넌트
├── lib/                    # Supabase 클라이언트, Zustand 스토어, 유틸
├── types/                  # TypeScript 타입 정의
├── sql/                    # DB 마이그레이션 SQL
└── public/                 # 정적 파일
```

## 기능 목록
- [x] Google 소셜 로그인
- [x] 학교/학년 온보딩
- [x] 커뮤니티 게시판 (CRUD + 익명 + 카테고리 + 좋아요 + 신고)
- [x] 댓글 (1단계 대댓글)
- [x] 개인 시간표/캘린더 (주간 뷰 + 반복 일정 + 카테고리 색상)
- [x] 진로 올인원 (적성 테스트 + AI 학과 추천 + 면접 질문)
- [x] 공부 인증 챌린지 (스트릭 + 배지 + 피드)
- [x] 버킷리스트 (공개/비공개 + 나도! 반응)
- [x] 수행평가 게시판 (마감일 D-day)
- [x] 정보 페이지 (시험 일정 등)
- [ ] AI 욕설 필터 (Gemini Flash 연동 — TODO)
- [ ] 실제 Gemini API 연동 (현재 mock 데이터)
- [ ] PWA 설정
- [ ] AdSense 삽입
