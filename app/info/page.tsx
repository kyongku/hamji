"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { format } from "date-fns";

type SchoolEvent = {
  id: string;
  title: string;
  event_date: string;
  target_grade: string;
  category: string;
};

type MealItem = {
  name: string;
  allergens: string;
};

const GRADE_FILTERS = ["전체", "1·2학년", "3학년", "전학년"];
const NEIS_KEY = "93659960d8d74136b6d1c85b9026eaa8";
const ATPT_CODE = "D10";
const SCHUL_CODE = "7240273";

function parseMeal(ddishNm: string): MealItem[] {
  return ddishNm.split("<br/>").map((item) => {
    const match = item.match(/^(.+?)\s*(\([\d.]+\))?$/);
    return { name: match?.[1]?.trim() ?? item.trim(), allergens: match?.[2] ?? "" };
  }).filter((item) => item.name);
}

export default function InfoPage() {
  const school = useAppStore((s) => s.school);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [gradeFilter, setGradeFilter] = useState("전체");
  const [loading, setLoading] = useState(true);
  const [meal, setMeal] = useState<MealItem[] | null>(null);
  const [mealCalorie, setMealCalorie] = useState("");
  const [mealLoading, setMealLoading] = useState(true);
  const [mealDate, setMealDate] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    const supabase = createClient();
    supabase.from("school_events").select("*")
      .gte("event_date", new Date().toISOString().split("T")[0])
      .order("event_date", { ascending: true })
      .then(({ data }) => { if (data) setEvents(data); setLoading(false); });
  }, []);

  useEffect(() => { fetchMeal(mealDate); }, [mealDate]);

  async function fetchMeal(dateStr: string) {
    setMealLoading(true);
    const ymd = dateStr.replace(/-/g, "");
    try {
      const res = await fetch(`https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${NEIS_KEY}&Type=json&ATPT_OFCDC_SC_CODE=${ATPT_CODE}&SD_SCHUL_CODE=${SCHUL_CODE}&MLSV_YMD=${ymd}`);
      const json = await res.json();
      const row = json?.mealServiceDietInfo?.[1]?.row?.[0];
      if (row) { setMeal(parseMeal(row.DDISH_NM)); setMealCalorie(row.CAL_INFO); }
      else { setMeal(null); setMealCalorie(""); }
    } catch { setMeal(null); }
    setMealLoading(false);
  }

  function prevDay() { const d = new Date(mealDate); d.setDate(d.getDate() - 1); setMealDate(format(d, "yyyy-MM-dd")); }
  function nextDay() { const d = new Date(mealDate); d.setDate(d.getDate() + 1); setMealDate(format(d, "yyyy-MM-dd")); }

  const filteredEvents = gradeFilter === "전체"
    ? events
    : events.filter((e) => e.target_grade === gradeFilter || e.target_grade === "전학년");

  function getDday(dateStr: string) {
    return Math.ceil((new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="pb-24 space-y-6">
      {school && (
        <div className="card p-4 bg-primary/5">
          <p className="text-xs text-gray-500">현재 학교</p>
          <p className="text-base font-bold text-primary">{school.name}</p>
        </div>
      )}

      {/* 급식 */}
      <section className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-700">🍱 오늘 급식</h2>
          <div className="flex items-center gap-2">
            <button onClick={prevDay} className="text-gray-400 text-sm px-1">{"<"}</button>
            <span className="text-xs text-gray-500">{mealDate}</span>
            <button onClick={nextDay} className="text-gray-400 text-sm px-1">{">"}</button>
          </div>
        </div>
        {mealLoading ? (
          <p className="text-sm text-gray-400 text-center py-3">로딩 중...</p>
        ) : meal ? (
          <>
            <ul className="space-y-1">
              {meal.map((item, i) => (
                <li key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{item.name}</span>
                  {item.allergens && <span className="text-[10px] text-gray-400">{item.allergens}</span>}
                </li>
              ))}
            </ul>
            {mealCalorie && <p className="text-xs text-gray-400 mt-2 text-right">{mealCalorie}</p>}
          </>
        ) : (
          <p className="text-sm text-gray-400 text-center py-3">급식 정보가 없습니다</p>
        )}
      </section>

      {/* 학교 공지 */}
      <div>
        
          href="https://hamji.dge.hs.kr/hamjih/main.do"
          target="_blank"
          rel="noopener noreferrer"
          className="card px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
        >
          <span className="text-xl">📢</span>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-800">학교 공지</h3>
            <p className="text-xs text-gray-500">함지고등학교 홈페이지</p>
          </div>
          <span className="text-gray-300">{"→"}</span>
        </a>
      </div>

      {/* 학년 필터 + 일정 */}
      <section>
        <h2 className="text-sm font-bold text-gray-700 mb-3">2026년 주요 일정</h2>
        <div className="flex gap-2 mb-3 flex-wrap">
          {GRADE_FILTERS.map((g) => (
            <button key={g} onClick={() => setGradeFilter(g)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${gradeFilter === g ? "bg-primary text-white border-primary" : "bg-white text-gray-500 border-gray-200"}`}>
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
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{item.target_grade}</span>
                    </div>
                    <p className="text-xs text-gray-400">{item.event_date}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${diff <= 7 ? "bg-red-100 text-red-600" : diff <= 30 ? "bg-orange-100 text-orange-600" : "bg-blue-50 text-blue-600"}`}>
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