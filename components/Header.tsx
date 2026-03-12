"use client";

import { useAppStore } from "@/lib/store";
import { usePathname } from "next/navigation";

const TITLES: Record<string, string> = {
  "/": "함지고",
  "/board": "게시판",
  "/board/write": "글쓰기",
  "/schedule": "시간표",
  "/career": "진로",
  "/career/test": "적성 테스트",
  "/challenge": "공부 인증",
  "/bucket": "버킷리스트",
  "/assessment": "수행평가",
  "/info": "정보",
  "/profile": "내 정보",
};

export default function Header() {
  const pathname = usePathname();
  const school = useAppStore((s) => s.school);

  if (pathname === "/login") return null;

  const title =
    TITLES[pathname] ??
    Object.entries(TITLES).find(([k]) => k !== "/" && pathname.startsWith(k))?.[1] ??
    "함지고";

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-lg mx-auto flex items-center justify-between h-14 px-4">
        <div>
          <h1 className="text-lg font-bold text-primary">{title}</h1>
          {pathname === "/" && school && (
            <p className="text-[11px] text-gray-400 -mt-0.5">{school.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 알림 아이콘 — 추후 구현 */}
        </div>
      </div>
    </header>
  );
}
