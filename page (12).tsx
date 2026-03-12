@tailwind base;
@tailwind components;
@tailwind utilities;

/* Pretendard 웹폰트 */
@import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css");

:root {
  --color-primary: #1B3A5C;
  --color-primary-light: #2E75B6;
  --color-accent-green: #4CAF50;
  --color-accent-orange: #E65100;
}

html {
  font-family: "Pretendard Variable", Pretendard, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

body {
  @apply bg-gray-50 text-gray-900;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* 하단 네비게이션 공간 확보 */
main {
  padding-bottom: 5rem;
}

/* 스크롤바 최소화 */
::-webkit-scrollbar {
  width: 4px;
}
::-webkit-scrollbar-thumb {
  @apply bg-gray-300 rounded-full;
}

/* 카드 공통 스타일 */
.card {
  @apply bg-white rounded-xl border border-gray-100 shadow-sm;
}
.card:hover {
  @apply shadow-md;
  transition: box-shadow 0.15s ease;
}

/* 버튼 기본 */
.btn-primary {
  @apply bg-primary text-white px-4 py-2 rounded-lg font-medium text-sm
    hover:bg-primary-dark active:scale-[0.98] transition-all duration-150;
}
.btn-secondary {
  @apply bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm
    hover:bg-gray-200 active:scale-[0.98] transition-all duration-150;
}
.btn-ghost {
  @apply text-gray-500 px-3 py-1.5 rounded-lg text-sm
    hover:bg-gray-100 active:scale-[0.98] transition-all duration-150;
}

/* 입력 필드 */
.input {
  @apply w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm
    outline-none focus:border-primary-light focus:ring-1 focus:ring-primary-light/30
    placeholder:text-gray-400 transition-colors duration-150;
}

/* 탭 */
.tab {
  @apply px-3 py-2 text-sm font-medium text-gray-500 border-b-2 border-transparent
    hover:text-gray-700 transition-colors duration-150 cursor-pointer whitespace-nowrap;
}
.tab-active {
  @apply text-primary border-primary;
}

/* 배지 */
.badge {
  @apply inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium;
}

/* 페이드 인 애니메이션 */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.3s ease forwards;
}

/* 스트릭 불꽃 이펙트 */
@keyframes flame {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}
.animate-flame {
  animation: flame 1.5s ease-in-out infinite;
}
