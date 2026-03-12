"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useAppStore } from "@/lib/store";
import type { Schedule, ScheduleCategory } from "@/types";
import { SCHEDULE_CATEGORY_LABELS, SCHEDULE_CATEGORY_COLORS } from "@/types";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { ko } from "date-fns/locale";

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00 ~ 21:00
const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

export default function SchedulePage() {
  const user = useAppStore((s) => s.user);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [view, setView] = useState<"week" | "month">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 폼 상태
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<ScheduleCategory>("class");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [formStartDate, setFormStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formRecurrence, setFormRecurrence] = useState<number[]>([]);
  const [formMemo, setFormMemo] = useState("");
  const [formIsDday, setFormIsDday] = useState(false);

  useEffect(() => {
    loadSchedules();
  }, [user]);

  async function loadSchedules() {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("schedules")
      .select("*")
      .eq("user_id", user.id)
      .order("start_time", { ascending: true });
    if (data) setSchedules(data);
    setLoading(false);
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

  function openEdit(schedule: Schedule) {
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

  // 주간 뷰 기준 날짜 (월요일 시작)
  const weekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate]
  );
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // 특정 요일 + 시간에 해당하는 일정 찾기
  function getSchedulesForSlot(dayOfWeek: number, hour: number): Schedule[] {
    return schedules.filter((s) => {
      const sHour = parseInt(s.start_time.split(":")[0]);
      const eHour = parseInt(s.end_time.split(":")[0]);
      const matchesTime = sHour <= hour && eHour > hour;

      // 반복 일정 체크 (0=일, 1=월, ..., 6=토)
      if (s.recurrence?.days) {
        return s.recurrence.days.includes(dayOfWeek) && matchesTime;
      }

      // 단일 일정: 날짜 매치 체크
      const date = weekDates[dayOfWeek === 0 ? 6 : dayOfWeek - 1];
      return isSameDay(new Date(s.start_date), date) && matchesTime;
    });
  }

  function getScheduleDuration(s: Schedule): number {
    const sHour = parseInt(s.start_time.split(":")[0]);
    const eHour = parseInt(s.end_time.split(":")[0]);
    return eHour - sHour;
  }

  return (
    <div className="space-y-4">
      {/* 상단 컨트롤 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(addDays(currentDate, -7))}
            className="btn-ghost"
          >
            ←
          </button>
          <span className="text-sm font-medium text-gray-700">
            {format(weekStart, "M월 d일", { locale: ko })} ~{" "}
            {format(addDays(weekStart, 6), "M월 d일", { locale: ko })}
          </span>
          <button
            onClick={() => setCurrentDate(addDays(currentDate, 7))}
            className="btn-ghost"
          >
            →
          </button>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="btn-primary text-xs"
        >
          + 일정 추가
        </button>
      </div>

      {/* 오늘 버튼 */}
      <button
        onClick={() => setCurrentDate(new Date())}
        className="text-xs text-primary-light underline"
      >
        오늘로 이동
      </button>

      {/* 주간 시간표 그리드 */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="min-w-[700px]">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-8 gap-px bg-gray-200 rounded-t-lg overflow-hidden">
            <div className="bg-gray-50 p-2 text-center text-xs text-gray-400">시간</div>
            {weekDates.map((date, i) => {
              const isToday = isSameDay(date, new Date());
              return (
                <div
                  key={i}
                  className={`p-2 text-center ${isToday ? "bg-primary/5" : "bg-gray-50"}`}
                >
                  <div className={`text-xs font-medium ${isToday ? "text-primary" : "text-gray-600"}`}>
                    {DAYS[i]}
                  </div>
                  <div className={`text-[11px] ${isToday ? "text-primary font-bold" : "text-gray-400"}`}>
                    {format(date, "d")}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 시간 슬롯 */}
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-8 gap-px bg-gray-100">
              <div className="bg-white p-1 text-center text-[11px] text-gray-400 min-h-[40px] flex items-center justify-center">
                {hour}:00
              </div>
              {[1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => {
                const slotSchedules = getSchedulesForSlot(dayOfWeek, hour);
                const isToday = isSameDay(
                  weekDates[dayOfWeek === 0 ? 6 : dayOfWeek - 1],
                  new Date()
                );
                return (
                  <div
                    key={dayOfWeek}
                    className={`bg-white min-h-[40px] relative ${isToday ? "bg-primary/[0.02]" : ""}`}
                  >
                    {slotSchedules.map((s) => {
                      const sHour = parseInt(s.start_time.split(":")[0]);
                      // 첫 시간 슬롯에서만 렌더링
                      if (sHour !== hour) return null;
                      const duration = getScheduleDuration(s);
                      return (
                        <button
                          key={s.id}
                          onClick={() => openEdit(s)}
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

      {/* 오늘의 일정 목록 */}
      <section>
        <h3 className="text-sm font-bold text-gray-700 mb-2">오늘의 일정</h3>
        {schedules
          .filter((s) => {
            const today = new Date();
            const dayOfWeek = today.getDay(); // 0=일, 1=월, ...
            if (s.recurrence?.days) return s.recurrence.days.includes(dayOfWeek);
            return isSameDay(new Date(s.start_date), today);
          })
          .sort((a, b) => a.start_time.localeCompare(b.start_time))
          .map((s) => (
            <div key={s.id} className="card px-3 py-2.5 flex items-center gap-3 mb-2">
              <div
                className="w-1 h-8 rounded-full"
                style={{ backgroundColor: SCHEDULE_CATEGORY_COLORS[s.category] }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{s.title}</p>
                <p className="text-xs text-gray-400">
                  {s.start_time.slice(0, 5)} ~ {s.end_time.slice(0, 5)}
                  {s.memo && ` · ${s.memo}`}
                </p>
              </div>
              <span className="badge bg-gray-100 text-gray-500">
                {SCHEDULE_CATEGORY_LABELS[s.category]}
              </span>
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

      {/* 일정 추가/수정 모달 */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">
                {editingId ? "일정 수정" : "일정 추가"}
              </h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-gray-400 text-xl">
                ✕
              </button>
            </div>

            {/* 제목 */}
            <input
              type="text"
              placeholder="일정 제목"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="input"
            />

            {/* 카테고리 */}
            <div className="flex gap-2">
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

            {/* 시간 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">시작 시간</label>
                <input
                  type="time"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">종료 시간</label>
                <input
                  type="time"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            {/* 날짜 */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">날짜</label>
              <input
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                className="input"
              />
            </div>

            {/* 반복 요일 */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">반복 요일 (선택)</label>
              <div className="flex gap-1">
                {DAYS.map((day, i) => {
                  const dayNum = i === 6 ? 0 : i + 1; // 월=1, ..., 토=6, 일=0
                  const isSelected = formRecurrence.includes(dayNum);
                  return (
                    <button
                      key={day}
                      onClick={() =>
                        setFormRecurrence(
                          isSelected
                            ? formRecurrence.filter((d) => d !== dayNum)
                            : [...formRecurrence, dayNum]
                        )
                      }
                      className={`w-9 h-9 rounded-full text-xs font-medium transition-colors ${
                        isSelected
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 메모 */}
            <input
              type="text"
              placeholder="메모 (선택)"
              value={formMemo}
              onChange={(e) => setFormMemo(e.target.value)}
              className="input"
            />

            {/* D-day */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsDday}
                onChange={(e) => setFormIsDday(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">D-day로 표시</span>
            </label>

            {/* 버튼 */}
            <div className="flex gap-2">
              {editingId && (
                <button
                  onClick={() => { handleDelete(editingId); setShowForm(false); resetForm(); }}
                  className="btn-ghost text-red-400 flex-1"
                >
                  삭제
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={!formTitle.trim()}
                className="btn-primary flex-1 py-3 disabled:opacity-50"
              >
                {editingId ? "수정" : "추가"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
