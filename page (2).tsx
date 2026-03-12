"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/store";

const INFO_SECTIONS = [
  {
    title: "야간자율학습",
    icon: "🌙",
    desc: "야자 시간 및 규칙 안내",
    content: "학교별 야간자율학습 시간과 규정을 확인하세요. (관리자가 학교별 정보를 등록하면 표시됩니다)",
  },
  {
    title: "장학금 정보",
    icon: "💰",
    desc: "교내/교외 장학금 안내",
    content: "교내 장학금 및 외부 장학재단 정보를 확인하세요. 신청 기한과 자격 요건을 놓치지 마세요.",
  },
  {
    title: "학교 공지",
    icon: "📢",
    desc: "주요 공지사항 정리",
    content: "학교의 주요 공지사항을 한눈에 확인하세요.",
  },
  {
    title: "입시 일정",
    icon: "📅",
    desc: "수능, 수시/정시 일정",
    content: "주요 입시 일정을 확인하세요.",
  },
];

const EXAM_SCHEDULE = [
  { date: "2026-06-03", event: "1학기 중간고사" },
  { date: "2026-07-15", event: "1학기 기말고사" },
  { date: "2026-09-02", event: "모의고사 (9월)" },
  { date: "2026-10-13", event: "2학기 중간고사" },
  { date: "2026-11-19", event: "수능" },
  { date: "2026-12-01", event: "2학기 기말고사" },
];

export default function InfoPage() {
  const school = useAppStore((s) => s.school);

  return (
    <div className="space-y-6">
      {/* 학교 정보 */}
      {school && (
        <div className="card p-4 bg-primary/5">
          <p className="text-xs text-gray-500">현재 학교</p>
          <p className="text-base font-bold text-primary">{school.name}</p>
        </div>
      )}

      {/* 정보 섹션 */}
      <div className="space-y-3">
        {INFO_SECTIONS.map((section) => (
          <details key={section.title} className="card overflow-hidden group">
            <summary className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors">
              <span className="text-xl">{section.icon}</span>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-800">{section.title}</h3>
                <p className="text-xs text-gray-500">{section.desc}</p>
              </div>
              <span className="text-gray-300 group-open:rotate-90 transition-transform">→</span>
            </summary>
            <div className="px-4 pb-3 pt-1 border-t border-gray-100">
              <p className="text-sm text-gray-600 leading-relaxed">{section.content}</p>
            </div>
          </details>
        ))}
      </div>

      {/* 시험 일정 */}
      <section>
        <h2 className="text-sm font-bold text-gray-700 mb-3">2026년 주요 일정</h2>
        <div className="space-y-2">
          {EXAM_SCHEDULE.map((item) => {
            const diff = Math.ceil(
              (new Date(item.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );
            const isPast = diff < 0;
            return (
              <div
                key={item.event}
                className={`card px-4 py-2.5 flex items-center justify-between ${
                  isPast ? "opacity-50" : ""
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-gray-700">{item.event}</p>
                  <p className="text-xs text-gray-400">{item.date}</p>
                </div>
                {!isPast && (
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    diff <= 7
                      ? "bg-red-100 text-red-600"
                      : diff <= 30
                      ? "bg-orange-100 text-orange-600"
                      : "bg-blue-50 text-blue-600"
                  }`}>
                    D-{diff}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 빠른 링크 */}
      <section>
        <h2 className="text-sm font-bold text-gray-700 mb-3">바로가기</h2>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/assessment" className="card p-3 text-center hover:shadow-md transition-shadow">
            <span className="text-xl">📝</span>
            <p className="text-xs text-gray-600 mt-1">수행평가</p>
          </Link>
          <Link href="/schedule" className="card p-3 text-center hover:shadow-md transition-shadow">
            <span className="text-xl">📅</span>
            <p className="text-xs text-gray-600 mt-1">시간표</p>
          </Link>
          <Link href="/career" className="card p-3 text-center hover:shadow-md transition-shadow">
            <span className="text-xl">🧭</span>
            <p className="text-xs text-gray-600 mt-1">진로 탐색</p>
          </Link>
          <Link href="/challenge" className="card p-3 text-center hover:shadow-md transition-shadow">
            <span className="text-xl">🔥</span>
            <p className="text-xs text-gray-600 mt-1">공부 인증</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
