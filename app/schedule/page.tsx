"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useAppStore } from "@/lib/store";
import type { Schedule, ScheduleCategory } from "@/types";
import { SCHEDULE_CATEGORY_LABELS, SCHEDULE_CATEGORY_COLORS } from "@/types";
import {
  format,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addMonths,
  isSameDay,
  getDay,
} from "date-fns";
import { ko } from "date-fns/locale";

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);
const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const WEEK_DAYS = ["월", "화", "수", "목", "금"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];
const CAL_HEADER = ["일", "월", "화", "수", "목", "금", "토"];

interface ClassCell {
  day: number;
  period: number;
  subject: string;
}

export default function SchedulePage() {
  const user = useAppStore((s) => s.user);
  const [tab, setTab] = useState<"timetable" | "week" | "month">("timetable");

  // 수업 시간표
  const [cells, setCells] = useState<ClassCell[]>([]);
  const [editingCell, setEditingCell] = useState<{ day: number; period: number } | null>(null);
  const [editValue, setEditValue] = useState("");

  // 주간/월간 캘린더
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthDate, setMonthDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<ScheduleCategory>("class");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [formStartDate, setFormStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formRecurrence, setFormRecurrence] = useState<number[]>([]);
  const [formMemo, setFormMemo] = useState("");
  const [formIsDday, setFormIsDday] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadCells();
    loadSchedules();
  }, [user]);

  async function loadCells() {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("class_schedules")
      .select("day, period, subject")
      .eq("user_id", user.id);
    if (data) setCells(data);
  }

  function getCell(day: number, period: number): string {
    return cells.find((c) => c.day === day && c.period === period)?.subject ?? "";
  }

  function openEdit(day: number, period: number) {
    setEditingCell({ day, period });
    setEditValue(getCell(day, period));
  }

  async function saveCell() {
    if (!user || !editingCell) return;
    const supabase = createClient();
    const { day, period } = editingCell;
    const subject = editValue.trim();
    if (subject === "") {
      await supabase.from("class_schedules")
        .delete()
        .eq("user_id", user.id)
        .eq("day", day)
        .eq("period", period);
    } else {
      await supabase.from("class_schedules").upsert(
        { user_id: user.id, day, period, subject },
        { onConflict: "user_id,day,period" }
      );
    }
    setEditingCell(null);
    setEditValue("");
    loadCells();
  }

  async function loadSchedules() {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("schedules")
      .select("*")
      .eq("user_id", user.id)
      .order("start_time", { ascending: true });
    if (data) setSchedules(data);
  }

  function resetForm() {
    setFormTitle("");
    setFormCategory("class");
    setFormStartTime("09:00");
    setFormEndTime("10:00");
    setFormStartDate(format(new Date(), "yyyy-MM-dd"));
    setFormRecurrence([]);
    setFormMemo("");
    setFormIsDday(false);
    setEditingId(null);
  }

  async function handleSubmit() {
    if (!user || !formTitle.trim()) return;
    const supabase = createClient();
    const payload = {
      user_id: user.id,
      title: formTitle.trim(),
      category: formCategory,
      start_time: formStartTime + ":00",
      end_time: formEndTime + ":00",
      start_date: formStartDate,
      end_date: formRecurrence.length > 0 ? null : formStartDate,
      recurrence: formRecurrence.length > 0 ? { days: formRecurrence } : null,
      memo: formMemo.trim() || null,
      is_dday: formIsDday,
    };
    if (editingId) {
      await supabase.from("schedules").update(payload).eq("id", editingId);
    } else {
      await supabase.from("schedules").insert(payload);
    }
    resetForm();
    setShowForm(false);
    loadSchedules();
  }

  async function handleDelete(id: string) {
    if (!confirm("일정을 삭제하시겠습니까?")) return;
    const supabase = createClient();
    await supabase.from("schedules").delete().eq("id", id);
    loadSchedules();
  }

  function openEditSchedule(schedule: Schedule) {
    setFormTitle(schedule.title);
    setFormCategory(schedule.category);
    setFormStartTime(schedule.start_time.slice(0, 5));
    setFormEndTime(schedule.end_time.slice(0, 5));
    setFormStartDate(schedule.start_date);
    setFormRecurrence(schedule.recurrence?.days ?? []);
    setFormMemo(schedule.memo ?? "");
    setFormIsDday(schedule.is_dday);
    setEditingId(schedule.id);
    setShowForm(true);
  }

  const weekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate]
  );
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  function getSchedulesForSlot(dayOfWeek: number, hour: number): Schedule[] {
    return schedules.filter((s) => {
      const sHour = parseInt(s.start_time.split(":")[0]);
      const eHour = parseInt(s.end_time.split(":")[0]);
      const matchesTime = sHour <= hour && eHour > hour;
      if (s.recurrence?.days) return s.recurrence.days.includes(dayOfWeek) && matchesTime;
      const date = weekDates[dayOfWeek === 0 ? 6 : dayOfWeek - 1];
      return isSameDay(new Date(s.start_date), date) && matchesTime;
    });
  }

  function getScheduleDuration(s: Schedule): number {
    return parseInt(s.end_time.split(":")[0]) - parseInt(s.start_time.split(":")[0]);
  }

  // 월간 날짜 배열
  const monthDates = useMemo(() => {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const startPad = getDay(start); // 0=일
    const dates: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) dates.push(null);
    let cur = start;
    while (cur <= end) {
      dates.push(new Date(cur));
      cur = addDays(cur, 1);
    }
    while (dates.length % 7 !== 0) dates.push(null);
    return dates;
  }, [monthDate]);

  function getSchedulesForDate(date: Date): Schedule[] {
    const dayOfWeek = date.getDay();
    return schedules.filter((s) => {
      if (s.recurrence?.days) return s.recurrence.days.includes(dayOfWeek);
      return isSameDay(new Date(s.start_date), date);
    });
  }

  const selectedDaySchedules = useMemo(() => {
    if (!selectedDay) return [];
    return getSchedulesForDate(selectedDay).sort((a, b) =>
      a.start_time.localeCompare(b.start_time)
    );
  }, [selectedDay, schedules]);

  return (
    <div className="pb-24 space-y-4">
      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {[
          { key: "timetable", label: "수업 시간표" },
          { key: "week", label: "주간" },
          { key: "month", label: "월간" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`flex-1 text-sm py-2 rounded-lg font-medium transition-colors ${
              tab === t.key ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 수업 시간표 ── */}
      {tab === "timetable" && (
        <div>
          <p className="text-xs text-gray-400 mb-3">칸을 탭하면 과목명을 입력할 수 있어요</p>
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="min-w-[320px]">
              <div className="grid grid-cols-6 gap-px bg-gray-200 rounded-t-lg overflow-hidden">
                <div className="bg-gray-50 p-2 text-center text-xs text-gray-400">교시</div>
                {WEEK_DAYS.map((d) => (
                  <div key={d} className="bg-gray-50 p-2 text-center text-xs font-medium text-gray-600">{d}</div>
                ))}
              </div>
              {PERIODS.map((period) => (
                <div key={period} className="grid grid-cols-6 gap-px bg-gray-100">
                  <div className="bg-gray-50 flex items-center justify-center text-xs text-gray-400 min-h-[52px]">
                    {period}교시
                  </div>
                  {[1, 2, 3, 4, 5].map((day) => {
                    const subject = getCell(day, period);
                    return (
                      <button
                        key={day}
                        onClick={() => openEdit(day, period)}
                        className={`bg-white min-h-[52px] text-xs font-medium text-center px-1 transition-colors hover:bg-primary/5 ${
                          subject ? "text-primary" : "text-gray-200"
                        }`}
                      >
                        {subject || "+"}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 주간 캘린더 ── */}
      {tab === "week" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentDate(addDays(currentDate, -7))} className="btn-ghost">←</button>
              <span className="text-sm font-medium text-gray-700">
                {format(weekStart, "M월 d일", { locale: ko })} ~ {format(addDays(weekStart, 6), "M월 d일", { locale: ko })}
              </span>
              <button onClick={() => setCurrentDate(addDays(currentDate, 7))} className="btn-ghost">→</button>
            </div>
            <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary text-xs">
              + 일정 추가
            </button>
          </div>
          <button onClick={() => setCurrentDate(new Date())} className="text-xs text-primary-light underline">
            오늘로 이동
          </button>
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-8 gap-px bg-gray-200 rounded-t-lg overflow-hidden">
                <div className="bg-gray-50 p-2 text-center text-xs text-gray-400">시간</div>
                {weekDates.map((date, i) => {
                  const isToday = isSameDay(date, new Date());
                  return (
                    <div key={i} className={`p-2 text-center ${isToday ? "bg-primary/5" : "bg-gray-50"}`}>
                      <div className={`text-xs font-medium ${isToday ? "text-primary" : "text-gray-600"}`}>{DAYS[i]}</div>
                      <div className={`text-[11px] ${isToday ? "text-primary font-bold" : "text-gray-400"}`}>{format(date, "d")}</div>
                    </div>
                  );
                })}
              </div>
              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-8 gap-px bg-gray-100">
                  <div className="bg-white p-1 text-center text-[11px] text-gray-400 min-h-[40px] flex items-center justify-center">
                    {hour}:00
                  </div>
                  {[1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => {
                    const slotSchedules = getSchedulesForSlot(dayOfWeek, hour);
                    const isToday = isSameDay(weekDates[dayOfWeek === 0 ? 6 : dayOfWeek - 1], new Date());
                    return (
                      <div key={dayOfWeek} className={`bg-white min-h-[40px] relative ${isToday ? "bg-primary/[0.02]" : ""}`}>
                        {slotSchedules.map((s) => {
                          const sHour = parseInt(s.start_time.split(":")[0]);
                          if (sHour !== hour) return null;
                          const duration = getScheduleDuration(s);
                          return (
                            <button
                              key={s.id}
                              onClick={() => openEditSchedule(s)}
                              className="absolute inset-x-0.5 rounded text-[10px] px-1 py-0.5 text-white font-medium leading-tight overflow-hidden text-left z-10"
                              style={{
                                backgroundColor: SCHEDULE_CATEGORY_COLORS[s.category],
                                height: `${duration * 40 - 2}px`,
                                top: 0,
                              }}
                            >
                              {s.title}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <section>
            <h3 className="text-sm font-bold text-gray-700 mb-2">오늘의 일정</h3>
            {schedules
              .filter((s) => {
                const today = new Date();
                const dayOfWeek = today.getDay();
                if (s.recurrence?.days) return s.recurrence.days.includes(dayOfWeek);
                return isSameDay(new Date(s.start_date), today);
              })
              .sort((a, b) => a.start_time.localeCompare(b.start_time))
              .map((s) => (
                <div key={s.id} className="card px-3 py-2.5 flex items-center gap-3 mb-2">
                  <div className="w-1 h-8 rounded-full" style={{ backgroundColor: SCHEDULE_CATEGORY_COLORS[s.category] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.title}</p>
                    <p className="text-xs text-gray-400">{s.start_time.slice(0, 5)} ~ {s.end_time.slice(0, 5)}{s.memo && ` · ${s.memo}`}</p>
                  </div>
                  <span className="badge bg-gray-100 text-gray-500">{SCHEDULE_CATEGORY_LABELS[s.category]}</span>
                </div>
              ))}
            {schedules.filter((s) => {
              const today = new Date();
              const dayOfWeek = today.getDay();
              if (s.recurrence?.days) return s.recurrence.days.includes(dayOfWeek);
              return isSameDay(new Date(s.start_date), today);
            }).length === 0 && (
              <p className="text-center text-gray-400 text-sm py-4">오늘 일정이 없습니다</p>
            )}
          </section>
        </div>
      )}

      {/* ── 월간 캘린더 ── */}
      {tab === "month" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setMonthDate(addMonths(monthDate, -1))} className="btn-ghost">←</button>
              <span className="text-sm font-medium text-gray-700">
                {format(monthDate, "yyyy년 M월", { locale: ko })}
              </span>
              <button onClick={() => setMonthDate(addMonths(monthDate, 1))} className="btn-ghost">→</button>
            </div>
            <button
              onClick={() => {
                resetForm();
                if (selectedDay) setFormStartDate(format(selectedDay, "yyyy-MM-dd"));
                setShowForm(true);
              }}
              className="btn-primary text-xs"
            >
              + 일정 추가
            </button>
          </div>

          <div className="rounded-xl overflow-hidden border border-gray-100">
            <div className="grid grid-cols-7 bg-gray-50">
              {CAL_HEADER.map((d, i) => (
                <div
                  key={d}
                  className={`py-2 text-center text-xs font-medium ${
                    i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-500"
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-gray-100">
              {monthDates.map((date, idx) => {
                if (!date) return <div key={`e-${idx}`} className="bg-white min-h-[64px]" />;
                const isToday = isSameDay(date, new Date());
                const isSelected = selectedDay ? isSameDay(date, selectedDay) : false;
                const daySchedules = getSchedulesForDate(date);
                const dow = date.getDay();
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDay(isSelected ? null : date)}
                    className={`bg-white min-h-[64px] p-1 text-left transition-colors hover:bg-gray-50 ${
                      isSelected ? "ring-2 ring-inset ring-primary" : ""
                    }`}
                  >
                    <span
                      className={`text-xs font-medium inline-flex items-center justify-center w-5 h-5 rounded-full ${
                        isToday
                          ? "bg-primary text-white"
                          : dow === 0
                          ? "text-red-400"
                          : dow === 6
                          ? "text-blue-400"
                          : "text-gray-700"
                      }`}
                    >
                      {format(date, "d")}
                    </span>
                    <div className="mt-0.5 space-y-0.5">
                      {daySchedules.slice(0, 2).map((s) => (
                        <div
                          key={s.id}
                          className="text-[9px] leading-tight px-0.5 rounded truncate text-white"
                          style={{ backgroundColor: SCHEDULE_CATEGORY_COLORS[s.category] }}
                        >
                          {s.title}
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

          {selectedDay && (
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-2">
                {format(selectedDay, "M월 d일 (EEE)", { locale: ko })} 일정
              </h3>
              {selectedDaySchedules.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-3">일정이 없습니다</p>
              ) : (
                <div className="space-y-2">
                  {selectedDaySchedules.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => openEditSchedule(s)}
                      className="card px-3 py-2.5 flex items-center gap-3 w-full text-left"
                    >
                      <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: SCHEDULE_CATEGORY_COLORS[s.category] }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{s.title}</p>
                        <p className="text-xs text-gray-400">{s.start_time.slice(0, 5)} ~ {s.end_time.slice(0, 5)}</p>
                      </div>
                      <span className="badge bg-gray-100 text-gray-500 flex-shrink-0">{SCHEDULE_CATEGORY_LABELS[s.category]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 과목 입력 모달 */}
      {editingCell && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-xs space-y-4">
            <h3 className="text-base font-bold text-gray-800">
              {WEEK_DAYS[editingCell.day - 1]}요일 {editingCell.period}교시
            </h3>
            <input
              type="text"
              placeholder="과목명 (비우면 삭제)"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveCell()}
              className="input"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setEditingCell(null)} className="btn-ghost flex-1">취소</button>
              <button onClick={saveCell} className="btn-primary flex-1">저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 일정 추가/수정 모달 */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">{editingId ? "일정 수정" : "일정 추가"}</h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-gray-400 text-xl">✕</button>
            </div>
            <input type="text" placeholder="일정 제목" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="input" />
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(SCHEDULE_CATEGORY_LABELS) as ScheduleCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFormCategory(cat)}
                  className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                  style={{
                    backgroundColor: formCategory === cat ? SCHEDULE_CATEGORY_COLORS[cat] : "transparent",
                    color: formCategory === cat ? "white" : SCHEDULE_CATEGORY_COLORS[cat],
                    borderColor: SCHEDULE_CATEGORY_COLORS[cat],
                  }}
                >
                  {SCHEDULE_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">시작 시간</label>
                <input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} className="input" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">종료 시간</label>
                <input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} className="input" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">날짜</label>
              <input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">반복 요일 (선택)</label>
              <div className="flex gap-1">
                {DAYS.map((day, i) => {
                  const dayNum = i === 6 ? 0 : i + 1;
                  const isSelected = formRecurrence.includes(dayNum);
                  return (
                    <button
                      key={day}
                      onClick={() => setFormRecurrence(isSelected ? formRecurrence.filter((d) => d !== dayNum) : [...formRecurrence, dayNum])}
                      className={`w-9 h-9 rounded-full text-xs font-medium transition-colors ${isSelected ? "bg-primary text-white" : "bg-gray-100 text-gray-500"}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
            <input type="text" placeholder="메모 (선택)" value={formMemo} onChange={(e) => setFormMemo(e.target.value)} className="input" />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formIsDday} onChange={(e) => setFormIsDday(e.target.checked)} className="rounded border-gray-300" />
              <span className="text-sm text-gray-700">D-day로 표시</span>
            </label>
            <div className="flex gap-2">
              {editingId && (
                <button onClick={() => { handleDelete(editingId); setShowForm(false); resetForm(); }} className="btn-ghost text-red-400 flex-1">삭제</button>
              )}
              <button onClick={handleSubmit} disabled={!formTitle.trim()} className="btn-primary flex-1 py-3 disabled:opacity-50">
                {editingId ? "수정" : "추가"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
