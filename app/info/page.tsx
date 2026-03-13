"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";
import { format, startOfMonth, endOfMonth, addDays, addMonths, isSameDay, getDay } from "date-fns";
import { ko } from "date-fns/locale";

type MealItem = { name: string; allergens: string };
type NeisSchedule = { date: string; name: string; grade: string };

const NEIS_KEY = "93659960d8d74136b6d1c85b9026eaa8";
const ATPT_CODE = "D10";
const SCHUL_CODE = "7240273";
const CAL_HEADER = ["일", "월", "화", "수", "목", "금", "토"];

// NEIS 일정명에서 학년 추출
function parseGrade(name: string): string {
  if (name.includes("3학년") || name.includes("3년")) return "3학년";
  if (name.includes("1학년") || name.includes("1년")) return "1학년";
  if (name.includes("2학년") || name.includes("2년")) return "2학년";
  if (name.includes("전학년") || name.includes("전 학년")) return "전학년";
  return "전학년";
}

function gradeColor(grade: string): string {
  if (grade === "3학년") return "bg-red-400";
  if (grade === "1학년") return "bg-blue-400";
  if (grade === "2학년") return "bg-green-400";
  return "bg-gray-400";
}

function parseMeal(ddishNm: string): MealItem[] {
  return ddishNm
    .split("<br/>")
    .map((item) => {
      const match = item.match(/^(.+?)\s*(\([\d.]+\))?$/);
      return { name: match?.[1]?.trim() ?? item.trim(), allergens: match?.[2] ?? "" };
    })
    .filter((item) => item.name);
}

export default function InfoPage() {
  const school = useAppStore((s) => s.school);

  // 급식
  const [meal, setMeal] = useState<MealItem[] | null>(null);
  const [mealCalorie, setMealCalorie] = useState("");
  const [mealLoading, setMealLoading] = useState(true);
  const [mealDate, setMealDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // 학사일정 달력
  const [neisSchedules, setNeisSchedules] = useState<NeisSchedule[]>([]);
  const [monthDate, setMonthDate] = useState(new Date());
  const [neisLoading, setNeisLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  useEffect(() => { fetchMeal(mealDate); }, [mealDate]);
  useEffect(() => { fetchNeisSchedule(monthDate); }, [monthDate]);

  async function fetchMeal(dateStr: string) {
    setMealLoading(true);
    const ymd = dateStr.replace(/-/g, "");
    try {
      const res = await fetch(
        `https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${NEIS_KEY}&Type=json&ATPT_OFCDC_SC_CODE=${ATPT_CODE}&SD_SCHUL_CODE=${SCHUL_CODE}&MLSV_YMD=${ymd}`
      );
      const json = await res.json();
      const row = json?.mealServiceDietInfo?.[1]?.row?.[0];
      if (row) { setMeal(parseMeal(row.DDISH_NM)); setMealCalorie(row.CAL_INFO); }
      else { setMeal(null); setMealCalorie(""); }
    } catch { setMeal(null); }
    setMealLoading(false);
  }

  async function fetchNeisSchedule(date: Date) {
    setNeisLoading(true);
    const ym = format(date, "yyyyMM");
    try {
      const res = await fetch(
        `https://open.neis.go.kr/hub/SchoolSchedule?KEY=${NEIS_KEY}&Type=json&ATPT_OFCDC_SC_CODE=${ATPT_CODE}&SD_SCHUL_CODE=${SCHUL_CODE}&AA_YMD=${ym}`
      );
      const json = await res.json();
      const rows = json?.SchoolSchedule?.[1]?.row;
      if (rows) {
        const parsed: NeisSchedule[] = rows.map((r: Record<string, string>) => ({
          date: `${r.AA_YMD.slice(0, 4)}-${r.AA_YMD.slice(4, 6)}-${r.AA_YMD.slice(6, 8)}`,
          name: r.EVENT_NM,
          grade: parseGrade(r.EVENT_CNTNT ?? r.EVENT_NM),
        }));
        setNeisSchedules(parsed);
      } else {
        setNeisSchedules([]);
      }
    } catch { setNeisSchedules([]); }
    setNeisLoading(false);
  }

  function prevDay() {
    const d = new Date(mealDate); d.setDate(d.getDate() - 1);
    setMealDate(format(d, "yyyy-MM-dd"));
  }
  function nextDay() {
    const d = new Date(mealDate); d.setDate(d.getDate() + 1);
    setMealDate(format(d, "yyyy-MM-dd"));
  }

  // 월간 달력 날짜 배열
  const monthDates = useMemo(() => {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const startPad = getDay(start);
    const dates: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) dates.push(null);
    let cur = start;
    while (cur <= end) { dates.push(new Date(cur)); cur = addDays(cur, 1); }
    while (dates.length % 7 !== 0) dates.push(null);
    return dates;
  }, [monthDate]);

  function getSchedulesForDate(date: Date): NeisSchedule[] {
    return neisSchedules.filter((s) => s.date === format(date, "yyyy-MM-dd"));
  }

  const selectedDaySchedules = useMemo(() => {
    if (!selectedDay) return [];
    return getSchedulesForDate(selectedDay);
  }, [selectedDay, neisSchedules]);

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

      {/* 학사일정 달력 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-700">📅 학사일정</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setMonthDate(addMonths(monthDate, -1))} className="text-gray-400 text-sm px-1">{"<"}</button>
            <span className="text-xs text-gray-500">{format(monthDate, "yyyy년 M월", { locale: ko })}</span>
            <button onClick={() => setMonthDate(addMonths(monthDate, 1))} className="text-gray-400 text-sm px-1">{">"}</button>
          </div>
        </div>

        {/* 범례 */}
        <div className="flex gap-3 mb-2 flex-wrap">
          {[["3학년", "bg-red-400"], ["1학년", "bg-blue-400"], ["2학년", "bg-green-400"], ["전학년", "bg-gray-400"]].map(([label, color]) => (
            <div key={label} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${color}`} />
              <span className="text-[10px] text-gray-500">{label}</span>
            </div>
          ))}
        </div>

        {neisLoading ? (
          <p className="text-sm text-gray-400 text-center py-4">로딩 중...</p>
        ) : (
          <div className="rounded-xl overflow-hidden border border-gray-100">
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 bg-gray-50">
              {CAL_HEADER.map((d, i) => (
                <div key={d} className={`py-2 text-center text-xs font-medium ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-500"}`}>
                  {d}
                </div>
              ))}
            </div>
            {/* 날짜 셀 */}
            <div className="grid grid-cols-7 gap-px bg-gray-100">
              {monthDates.map((date, idx) => {
                if (!date) return <div key={`e-${idx}`} className="bg-white min-h-[60px]" />;
                const isToday = isSameDay(date, new Date());
                const isSelected = selectedDay ? isSameDay(date, selectedDay) : false;
                const daySchedules = getSchedulesForDate(date);
                const dow = date.getDay();
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDay(isSelected ? null : date)}
                    className={`bg-white min-h-[60px] p-1 text-left transition-colors hover:bg-gray-50 ${isSelected ? "ring-2 ring-inset ring-primary" : ""}`}
                  >
                    <span className={`text-xs font-medium inline-flex items-center justify-center w-5 h-5 rounded-full ${
                      isToday ? "bg-primary text-white" : dow === 0 ? "text-red-400" : dow === 6 ? "text-blue-400" : "text-gray-700"
                    }`}>
                      {format(date, "d")}
                    </span>
                    <div className="mt-0.5 space-y-0.5">
                      {daySchedules.slice(0, 2).map((s, i) => (
                        <div key={i} className={`text-[9px] leading-tight px-0.5 rounded truncate text-white ${gradeColor(s.grade)}`}>
                          {s.name}
                        </div>
                      ))}
                      {daySchedules.length > 2 && (
                        <div className="text-[9px] text-gray-400">+{daySchedules.length - 2}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 선택된 날 상세 */}
        {selectedDay && (
          <div className="mt-3">
            <p className="text-xs font-bold text-gray-600 mb-2">
              {format(selectedDay, "M월 d일 (EEE)", { locale: ko })}
            </p>
            {selectedDaySchedules.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">일정 없음</p>
            ) : (
              <div className="space-y-1.5">
                {selectedDaySchedules.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 card px-3 py-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${gradeColor(s.grade)}`} />
                    <span className="text-sm text-gray-700">{s.name}</span>
                    <span className="ml-auto text-[10px] text-gray-400">{s.grade}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 학교 공지 */}
      <div>
        <a
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
