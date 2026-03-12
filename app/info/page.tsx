"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

type SchoolEvent = {
  id: string;
  title: string;
  event_date: string;
  target_grade: string;
  category: string;
};

const INFO_SECTIONS = [
  { title: "야간자율학습", icon: "🌙", desc: "야자 시간 및 규칙 안내", content: "학교별 야간자율학습 시간과 규정을 확인하세요." },
  { title: "장학금 정보", icon: "💰", desc: "교내/교외 장학금 안내", content: "교내 장학금 및 외부 장학재단 정보를 확인하세요." },
  { title: "학교 공지", icon: "📢", desc: "주요 공지사항 정리", content: "학교의 주요 공지사항을 한눈에 확인하세요." },
  { title: "입시 일정", icon: "📅", desc: "수능, 수시/정시 일정", content: "주요 입시 일정을 확인하세요." },
];

const GRADE_FILTERS = ["전체", "1·2학년", "3학년", "전학년"];

export default function InfoPage() {
  const school = useAppStore((s) => s.school);
  const user = useAppStore((s) => s.user);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [gradeFilter, setGradeFilter] = useState<string>("전체");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("school_events")
      .select("*")
      .gte("event_date", new Date().toISOString().split("T")[0])
      .order("event_date", { ascending: true })
      .then(({ data }) => {
        if (data) setEvents(data);
        setLoading(false);
      });
  }, []);

  const filteredEvents = gradeFilter === "전체"
    ? events
    : events.filter((e) => e.target_grade === gradeFilter || e.target_grade === "전학년");

  function getDday(dateStr: string) {
    return Math.ceil((new Date(dateStr).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="pb-24 space-y-6">
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

      {/* 학년 필터 */}
      <section>
        <h2 className="text-sm font-bold text-gray-700 mb-3">2026년 주요 일정</h2>
        <div className="flex gap-2 mb-3 flex-wrap">
          {GRADE_FILTERS.map((g) => (
            <button
              key={g}
              onClick={() => setGradeFilter(g)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                gradeFilter === g
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-500 border-gray-200"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 text-center py-4">로딩 중...</p>
        ) : filteredEvents.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">일정이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {filteredEvents.map((item) => {
              const diff = getDday(item.event_date);
              return (
                <div key={item.id} className="card px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-700">{item.title}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                        {item.target_grade}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{item.event_date}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    diff <= 7 ? "bg-red-100 text-red-600"
                    : diff <= 30 ? "bg-orange-100 text-orange-600"
                    : "bg-blue-50 text-blue-600"
                  }`}>
                    D-{diff}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 바로가기 */}
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
