"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useAppStore } from "@/lib/store";
import type { Challenge, UserStreak } from "@/types";
import { timeAgo } from "@/lib/utils";
import { format, isToday } from "date-fns";

export default function ChallengePage() {
  const user = useAppStore((s) => s.user);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [todayDone, setTodayDone] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    if (!user?.school_id) return;
    const supabase = createClient();

    // 피드 로드
    const { data: feeds } = await supabase
      .from("challenges")
      .select("*, user:users(nickname)")
      .eq("school_id", user.school_id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (feeds) setChallenges(feeds);

    // 내 스트릭
    const { data: s } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (s) setStreak(s);

    // 오늘 인증 여부
    const { data: today } = await supabase
      .from("challenges")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", format(new Date(), "yyyy-MM-dd"))
      .single();
    setTodayDone(!!today);
  }

  async function handleSubmit() {
    if (!user?.school_id || !content.trim()) return;
    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.from("challenges").insert({
      user_id: user.id,
      school_id: user.school_id,
      content: content.trim(),
      date: format(new Date(), "yyyy-MM-dd"),
    });

    if (error) {
      if (error.code === "23505") {
        alert("오늘은 이미 인증했습니다!");
      } else {
        alert("인증 실패: " + error.message);
      }
      setSubmitting(false);
      return;
    }

    setContent("");
    setSubmitting(false);
    loadData();
  }

  return (
    <div className="space-y-6">
      {/* 스트릭 카드 */}
      <div className="card p-5 text-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-5xl mb-2 animate-flame">🔥</div>
        <p className="text-3xl font-bold text-gray-800">
          {streak?.current_streak ?? 0}일
        </p>
        <p className="text-xs text-gray-500 mt-1">연속 공부 인증</p>
        {streak && streak.max_streak > 0 && (
          <p className="text-[11px] text-gray-400 mt-1">
            최대 스트릭: {streak.max_streak}일
          </p>
        )}

        {/* 배지 */}
        {streak && streak.current_streak >= 7 && (
          <div className="flex justify-center gap-2 mt-3">
            {streak.current_streak >= 7 && <span className="badge bg-yellow-100 text-yellow-700">7일 연속</span>}
            {streak.current_streak >= 30 && <span className="badge bg-orange-100 text-orange-700">30일 연속</span>}
            {streak.current_streak >= 100 && <span className="badge bg-red-100 text-red-700">100일 연속</span>}
          </div>
        )}
      </div>

      {/* 오늘 인증 */}
      {todayDone ? (
        <div className="card p-4 text-center bg-green-50 border-green-200">
          <p className="text-sm font-medium text-green-700">오늘 공부 인증 완료!</p>
        </div>
      ) : (
        <div className="card p-4 space-y-3">
          <h3 className="text-sm font-bold text-gray-700">오늘 공부 인증하기</h3>
          <textarea
            placeholder="오늘 공부한 내용을 작성해 주세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="input resize-none"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
            className="btn-primary w-full py-2.5 disabled:opacity-50"
          >
            {submitting ? "인증 중..." : "인증하기"}
          </button>
        </div>
      )}

      {/* 피드 */}
      <section>
        <h2 className="text-sm font-bold text-gray-700 mb-3">학교 공부 인증 피드</h2>
        <div className="space-y-2">
          {challenges.map((c) => (
            <div key={c.id} className="card px-4 py-3 animate-fade-in">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600">
                  {c.user?.nickname ?? "익명"}
                </span>
                <span className="text-[11px] text-gray-400">{timeAgo(c.created_at)}</span>
              </div>
              <p className="text-sm text-gray-700">{c.content}</p>
            </div>
          ))}
          {challenges.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">
              아직 인증이 없어요. 첫 번째로 인증해 보세요!
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
