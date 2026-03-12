"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useAppStore } from "@/lib/store";
import type { UserStreak } from "@/types";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function ChallengePage() {
  const user = useAppStore((s) => s.user);
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [todayDone, setTodayDone] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [myRecords, setMyRecords] = useState<{ date: string; content: string | null }[]>([]);
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    if (!user?.school_id) return;
    const supabase = createClient();
    const today = format(new Date(), "yyyy-MM-dd");

    // 내 스트릭
    const { data: s } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (s) setStreak(s);

    // 오늘 출첵 여부
    const { data: todayRecord } = await supabase
      .from("challenges")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();
    setTodayDone(!!todayRecord);

    // 오늘 학교 전체 출첵 인원수
    const { count } = await supabase
      .from("challenges")
      .select("id", { count: "exact", head: true })
      .eq("school_id", user.school_id)
      .eq("date", today);
    setTodayCount(count ?? 0);

    // 내 출첵 기록 (최근 30개)
    const { data: records } = await supabase
      .from("challenges")
      .select("date, content")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(30);
    if (records) setMyRecords(records);
  }

  async function handleCheckIn() {
    if (!user?.school_id || submitting) return;
    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.from("challenges").insert({
      user_id: user.id,
      school_id: user.school_id,
      content: memo.trim() || null,
      is_anonymous: false,
      date: format(new Date(), "yyyy-MM-dd"),
    });

    if (error) {
      if (error.code === "23505") {
        alert("오늘은 이미 출첵했습니다!");
      } else {
        alert("출첵 실패: " + error.message);
      }
      setSubmitting(false);
      return;
    }

    setMemo("");
    setSubmitting(false);
    loadData();
  }

  async function handleShare() {
    const text = `🔥 ${streak?.current_streak ?? 1}일 연속 공부 출첵 중!\nHammunity에서 함께 공부해요 👉 https://hamjigo.kro.kr`;
    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  }

  return (
    <div className="pb-24 space-y-6">
      {/* 스트릭 카드 */}
      <div className="card p-5 text-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-5xl mb-2">🔥</div>
        <p className="text-3xl font-bold text-gray-800">{streak?.current_streak ?? 0}일</p>
        <p className="text-xs text-gray-500 mt-1">연속 공부 출첵</p>
        {streak && streak.max_streak > 0 && (
          <p className="text-[11px] text-gray-400 mt-1">최대 스트릭: {streak.max_streak}일</p>
        )}
        {streak && streak.current_streak >= 7 && (
          <div className="flex justify-center gap-2 mt-3">
            {streak.current_streak >= 7 && <span className="badge bg-yellow-100 text-yellow-700">7일 연속</span>}
            {streak.current_streak >= 30 && <span className="badge bg-orange-100 text-orange-700">30일 연속</span>}
            {streak.current_streak >= 100 && <span className="badge bg-red-100 text-red-700">100일 연속</span>}
          </div>
        )}
        {/* 공유 버튼 */}
        <button
          onClick={handleShare}
          className="mt-4 text-xs px-4 py-1.5 rounded-full bg-orange-100 text-orange-600 font-medium"
        >
          {shared ? "복사됨!" : "공유하기"}
        </button>
      </div>

      {/* 오늘 출첵 현황 */}
      <div className="card p-4 text-center">
        <p className="text-xs text-gray-500 mb-1">오늘 우리 학교 출첵</p>
        <p className="text-2xl font-bold text-primary">{todayCount}명</p>
      </div>

      {/* 출첵 버튼 */}
      {todayDone ? (
        <div className="card p-4 text-center bg-green-50 border-green-200">
          <p className="text-sm font-medium text-green-700">오늘 출첵 완료!</p>
        </div>
      ) : (
        <div className="card p-4 space-y-3">
          <h3 className="text-sm font-bold text-gray-700">오늘 공부 출첵</h3>
          <textarea
            placeholder="한마디 남기기 (선택, 나만 볼 수 있어요)"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={2}
            className="input resize-none text-sm"
          />
          <button
            onClick={handleCheckIn}
            disabled={submitting}
            className="btn-primary w-full py-3 text-base disabled:opacity-50"
          >
            {submitting ? "출첵 중..." : "출첵하기 ✅"}
          </button>
        </div>
      )}

      {/* 내 출첵 기록 */}
      <section>
        <h2 className="text-sm font-bold text-gray-700 mb-3">내 출첵 기록</h2>
        <div className="space-y-2">
          {myRecords.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-6">아직 출첵 기록이 없어요</p>
          )}
          {myRecords.map((r) => (
            <div key={r.date} className="card px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {format(new Date(r.date), "M월 d일 (EEE)", { locale: ko })}
                </span>
                <span className="text-green-500 text-sm">✅</span>
              </div>
              {r.content && (
                <p className="text-xs text-gray-500 mt-1">{r.content}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
