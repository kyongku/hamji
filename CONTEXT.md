# 함지고 (Hammunity) — 프로젝트 컨텍스트

이 문서는 Claude가 직접 관리합니다. 코드 수정 시마다 Claude가 해당 내용을 반영합니다.

---

## 1. 프로젝트 개요

함지고는 고등학생을 위한 올인원 커뮤니티 및 학습 관리 플랫폼입니다.
익명 게시판, AI 진로 상담, 수행평가 관리, 시간표, 공부 인증 등 학교 생활 전반의 기능을 제공합니다.

---

## 2. 기술 스택 (package.json 기준)

| 항목 | 버전 |
|------|------|
| Next.js (App Router) | 14.2.21 |
| TypeScript | 5.7.3 |
| @tanstack/react-query | 5.94.4 |
| @supabase/supabase-js | 2.47.12 |
| @supabase/ssr | 0.5.2 |
| Zustand | 5.0.2 |
| Tailwind CSS | 3.4.17 |
| date-fns | 4.1.0 |
| date-fns-tz | 3.2.0 |
| @anthropic-ai/sdk | 0.78.0 |

---

## 3. 디렉토리 구조

```
hamjigo/
├── app/
│   ├── api/                    # API Route (ai-chat, auth/callback)
│   ├── assessment/             # 수행평가 공유 게시판
│   ├── board/                  # 익명 게시판
│   │   ├── [id]/page.tsx       # 게시글 상세 (댓글, 좋아요, 신고 모달, 캘린더 추가)
│   │   ├── write/              # 게시글 작성/수정
│   │   └── page.tsx            # 게시글 목록 (useInfiniteQuery 무한 스크롤)
│   ├── bucket/                 # 버킷리스트
│   ├── career/                 # 진로 적성 테스트 및 AI 추천
│   ├── challenge/              # 공부 인증 챌린지
│   ├── info/                   # 급식 및 학사일정 (NEIS 연동)
│   ├── login/                  # 로그인 (Google OAuth)
│   ├── profile/                # 마이페이지 및 온보딩
│   ├── schedule/               # 시간표 및 캘린더
│   ├── providers.tsx           # QueryClientProvider (staleTime: 60000) — "use client"
│   ├── layout.tsx              # RootLayout: Providers > AuthProvider > Header/main/BottomNav
│   └── page.tsx                # 홈 대시보드
├── components/
│   ├── AuthProvider.tsx        # 세션 초기화, store 주입, setAuthReady() 호출
│   ├── BottomNav.tsx
│   ├── Header.tsx
│   └── PostCard.tsx
├── lib/
│   ├── api/
│   │   ├── posts.ts            # fetchPostsPage (pageParam 기반, createClient 사용)
│   │   └── queryKeys.ts        # queryKeys.posts.list({ schoolId, category, sort, search })
│   ├── store.ts                # Zustand: user, school, isAuthReady, setAuthReady
│   ├── supabase-browser.ts     # 클라이언트용 Supabase (@supabase/ssr)
│   ├── supabase-server.ts      # 서버용 Supabase (Cookie 기반)
│   ├── utils.ts                # timeAgo, categoryColor, formatCount 등
│   ├── compressImage.ts        # 이미지 압축 유틸 (uploadPostImages에 미연동)
│   └── uploadPostImages.ts     # Supabase Storage 이미지 업로드
├── sql/                        # DB 마이그레이션 스크립트
├── types/index.ts              # 공통 타입 정의
└── middleware.ts               # 보호 경로 인증 체크 및 리다이렉트
```

---

## 4. 핵심 아키텍처

### 인증 흐름

```
페이지 로드
  → AuthProvider.loadSession() 실행
    → 로그인 O: setUser(profile) + setSchool() + setAuthReady()
    → 로그인 X: reset() + setAuthReady()

컴포넌트에서:
  isAuthReady === false  →  로딩 스켈레톤
  isAuthReady && !user   →  로그인 유도 UI
  isAuthReady && user    →  정상 렌더링
```

- `middleware.ts` 보호 경로: `/board/write`, `/schedule`, `/career/test`, `/challenge`, `/bucket`, `/profile`
- `/board` 목록·상세는 미들웨어 보호 없음 → `isAuthReady` 기반으로 클라이언트에서 처리

### 데이터 페칭 (React Query)

- `app/providers.tsx`: 앱 전체 `QueryClientProvider` 제공
- `lib/api/posts.ts`: `fetchPostsPage({ pageParam, schoolId, category, sort, search })`
  - `pageParam`은 페이지 번호 (0부터 시작)
  - offset = `pageParam * PAGE_SIZE` (PAGE_SIZE = 20)
  - 반환: `{ posts: Post[], nextCursor: number | null }`
- `lib/api/queryKeys.ts`: `queryKeys.posts.list()` — queryKey 중앙 관리
- `board/page.tsx`: `useInfiniteQuery` + Intersection Observer로 무한 스크롤 구현

### RLS / 멀티테넌시

- 모든 테이블에 RLS 적용
- `school_id` 기준 데이터 격리 — 본인 학교 데이터만 접근 가능

---

## 5. 구현 완료 기능

### 게시판
- [x] 카테고리 필터 (전체/자유/질문/수행평가/고민상담)
- [x] 정렬 (최신순/인기순/댓글 많은 순)
- [x] 검색 (Enter 트리거, searchQuery 분리)
- [x] 무한 스크롤 페이지네이션 (useInfiniteQuery)
- [x] 비로그인 접근 시 로그인 유도 UI (isAuthReady 기반)
- [x] 게시글 좋아요 토글
- [x] 댓글/대댓글 작성 및 삭제
- [x] 댓글 좋아요 토글 (한 번의 쿼리로 전체 liked ID 로드)
- [x] 신고 바텀시트 모달 (ReportReason: profanity/spam/inappropriate/other 매핑)
- [x] 캘린더 일정 추가 중복 방지 (user_id + title + start_date 조합 체크)
- [x] 이미지 첨부 (순서 정렬 포함)
- [x] 이미지 lightbox (탭 시 확대, 배경 탭으로 닫기)
- [x] 게시글 공유 (navigator.share / 미지원 시 클립보드 복사 폴백)

### 관리자
- [x] 관리자 전용 페이지 (`app/admin/`) — role: "admin"만 접근
- [x] 신고 관리 (`app/admin/reports/`) — 숨김 처리/해제, 신고자 경고, 신고 삭제
- [x] 사용자 관리 (`app/admin/users/`) — 경고 부여, 밴 처리/해제, 경고 초기화
- [x] 경고 3회 → 자동 밴 (30일)
- [x] 밴 만료 시 자동 해제 (middleware)
- [x] 신고 3회 → 자동 숨김 (Supabase DB 트리거)
- [x] 허위 신고 경고 문구 (신고 모달)
- [x] 밴 사용자 접근 차단 (middleware)

### 기타
- [x] AI 진로 상담 (RIASEC → Gemini Flash 2.0 추천)
- [x] NEIS 급식·학사일정 연동
- [x] 수행평가 D-Day 계산
- [x] 공부 인증 챌린지 및 스트릭
- [x] 개인 시간표 + 반복 일정

---

## 6. TODO

### 게시판
- [ ] 댓글 React Query 도입 (`[id]/page.tsx` 현재 useEffect 방식)
- [ ] Supabase Realtime 댓글 (실시간 반영)
- [ ] 뒤로가기 스크롤 위치 복원

### 시스템
- [ ] `compressImage.ts` → `uploadPostImages.ts` 연동
- [ ] 알림 시스템 (Header 알림 아이콘 활성화, DB 트리거 연동)
- [ ] AI 욕설 필터링 (게시글/댓글 작성 시)
- [ ] AI 채팅 영속성 (`ai_chat_history` 테이블 연동)
- [ ] PWA 설정

---

## 7. 개발 가이드라인

- **모바일 퍼스트**: 최대 너비 `max-w-lg` (512px) 기준
- **인증 확인**: `isAuthReady` 확인 후 `user` 접근
- **데이터 페칭**: 서버 데이터는 `lib/api/`에 함수 분리, queryKey는 `queryKeys.ts` 사용
- **타입**: DB 테이블 변경 시 `types/index.ts` 즉시 동기화
- **상태 관리**: 페이지 간 공유 필요한 user/school 외에는 로컬 state 권장
