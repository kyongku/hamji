"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useAppStore } from "@/lib/store";
import type { UserStreak } from "@/types";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { timeAgo } from "@/lib/utils";

interface FeedItem {
  id: string;
  user_id: string;
  content: string | null;
  is_anonymous: boolean;
  like_count: number;
  created_at: string;
  user?: { nickname: string };
  liked?: boolean;
}

export default function ChallengePage() {
  const user = useAppStore((s) => s.user);
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [todayDone, setTodayDone] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [checkedDates, setCheckedDates] = useState<Set<string>>(new Set());
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [memo, setMemo] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [shared, setShared] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const loadData = useCallback(async () => {
    if (!user?.school_id) return;
    const supabase = createClient();
    const today = format(new Date(), "yyyy-MM-dd");
    const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    // 스트릭
    const { data: s } = await supabase
      .from("user_streaks").select("*").eq("user_id", user.id).single();
    if (s) setStreak(s);

    // 오늘 출첵 여부
    const { data: todayRecord } = await supabase
      .from("challenges").select("id")
      .eq("user_id", user.id).eq("date", today).single();
    setTodayDone(!!todayRecord);

    // 오늘 학교 전체 출첵 인원
    const { count } = await supabase
      .from("challenges").select("id", { count: "exact", head: true })
      .eq("school_id", user.school_id).eq("date", today);
    setTodayCount(count ?? 0);

    // 이번달 내 출첵 날짜
    const { data: monthRecords } = await supabase
      .from("challenges").select("date")
      .eq("user_id", user.id)
      .gte("date", monthStart).lte("date", monthEnd);
    setCheckedDates(new Set(monthRecords?.map((r) => r.date) ?? []));

    // 공개 피드 (좋아요 여부 포함)
    const { data: feedData } = await supabase
      .from("challenges")
      .select("*, user:users(nickname)")
      .eq("school_id", user.school_id)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (feedData) {
      const { data: myLikes } = await supabase
        .from("challenge_likes")
        .select("challenge_id")
        .eq("user_id", user.id);
      const likedSet = new Set(myLikes?.map((l) => l.challenge_id) ?? []);
      setFeed(feedData.map((f) => ({ ...f, liked: likedSet.has(f.id) })));
    }
  }, [user, currentMonth]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, loadData]);

  async function handleCheckIn() {
    if (!user?.school_id || submitting) return;
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("challenges").insert({
      user_id: user.id,
      school_id: user.school_id,
      content: memo.trim() || null,
      is_public: isPublic,
      is_anonymous: isAnonymous,
      date: format(new Date(), "yyyy-MM-dd"),
    });
    if (error) {
      alert(error.code === "23505" ? "오늘은 이미 출첵했습니다!" : "출첵 실패: " + error.message);
      setSubmitting(false);
      return;
    }
    setMemo("");
    setSubmitting(false);
    loadData();
  }

  async function handleLike(item: FeedItem) {
    if (!user) return;
    const supabase = createClient();
    if (item.liked) {
      await supabase.from("challenge_likes")
        .delete().eq("challenge_id", item.id).eq("user_id", user.id);
      await supabase.from("challenges")
        .update({ like_count: item.like_count - 1 }).eq("id", item.id);
    } else {
      await supabase.from("challenge_likes")
        .insert({ challenge_id: item.id, user_id: user.id });
      await supabase.from("challenges")
        .update({ like_count: item.like_count + 1 }).eq("id", item.id);
    }
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("삭제할까요?")) return;
    const supabase = createClient();
    await supabase.from("challenges").delete().eq("id", id);
    loadData();
  }

  async function handleReport(id: string) {
    if (!user) return;
    const supabase = createClient();
    await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: "challenge",
      target_id: id,
      reason: "부적절한 내용",
    });
    alert("신고가 접수되었습니다.");
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

  // 달력 날짜 배열
  const calendarDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });
  const firstDayOfWeek = startOfMonth(currentMonth).getDay();

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
          <div className="flex justify-center gap-2 mt-3 flex-wrap">
            {streak.current_streak >= 7 && <span className="badge bg-yellow-100 text-yellow-700">7일 연속</span>}
            {streak.current_streak >= 30 && <span className="badge bg-orange-100 text-orange-700">30일 연속</span>}
            {streak.current_streak >= 100 && <span className="badge bg-red-100 text-red-700">100일 연속</span>}
          </div>
        )}
        <button onClick={handleShare} className="mt-4 text-xs px-4 py-1.5 rounded-full bg-orange-100 text-orange-600 font-medium">
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
            placeholder="한마디 남기기 (선택사항)"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={2}
            className="input resize-none text-sm"
          />
          {/* 공개/익명 토글 */}
          <div className="flex gap-4">
            <div className="flex items-center justify-between flex-1">
              <span className="text-xs text-gray-500">피드에 공개</span>
              <button
                onClick={() => setIsPublic(!isPublic)}
                className={`relative w-10 h-5 rounded-full transition-colors ${isPublic ? "bg-primary" : "bg-gray-200"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPublic ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            {isPublic && (
              <div className="flex items-center justify-between flex-1">
                <span className="text-xs text-gray-500">익명</span>
                <button
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${isAnonymous ? "bg-primary" : "bg-gray-200"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isAnonymous ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleCheckIn}
            disabled={submitting}
            className="btn-primary w-full py-3 text-base disabled:opacity-50"
          >
            {submitting ? "출첵 중..." : "출첵하기 ✅"}
          </button>
        </div>
      )}

      {/* 달력 */}
      <section className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="text-gray-400 px-2">{"<"}</button>
          <h2 className="text-sm font-bold text-gray-700">
            {format(currentMonth, "yyyy년 M월", { locale: ko })}
          </h2>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="text-gray-400 px-2">{">"}</button>
        </div>
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-1">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d} className="text-center text-[11px] text-gray-400 py-1">{d}</div>
          ))}
        </div>
        {/* 날짜 */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
          {calendarDays.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const isChecked = checkedDates.has(dateStr);
            const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
            const isPast = day < new Date() && !isToday;
            return (
              <div key={dateStr} className={`aspect-square flex items-center justify-center rounded-full text-xs font-medium
                ${isChecked ? "bg-green-400 text-white" : isPast ? "bg-red-100 text-red-400" : isToday ? "border-2 border-primary text-primary" : "text-gray-300"}
              `}>
                {format(day, "d")}
              </div>
            );
          })}
        </div>
      </section>

      {/* 공개 피드 */}
      <section>
        <h2 className="text-sm font-bold text-gray-700 mb-3">학교 출첵 피드</h2>
        <div className="space-y-2">
          {feed.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-6">공개된 출첵이 없어요</p>
          )}
          {feed.map((item) => (
            <div key={item.id} className="card px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600">
                  {item.is_anonymous ? "익명" : (item.user?.nickname ?? "익명")}
                </span>
                <span className="text-[11px] text-gray-400">{timeAgo(item.created_at)}</span>
              </div>
              {item.content && <p className="text-sm text-gray-700 mb-2">{item.content}</p>}
              <div className="flex items-center justify-between mt-1">
                {/* 좋아요 */}
                <button
                  onClick={() => handleLike(item)}
                  className={`flex items-center gap-1 text-xs ${item.liked ? "text-red-500" : "text-gray-400"}`}
                >
                  {item.liked ? "❤️" : "🤍"} {item.like_count}
                </button>
                <div className="flex gap-2">
                  {/* 본인 글 삭제 */}
                  {item.user_id === user?.id && (
                    <button onClick={() => handleDelete(item.id)} className="text-xs text-gray-300 hover:text-red-400">
                      삭제
                    </button>
                  )}
                  {/* 신고 */}
                  {item.user_id !== user?.id && (
                    <button onClick={() => handleReport(item.id)} className="text-xs text-gray-300 hover:text-orange-400">
                      신고
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
