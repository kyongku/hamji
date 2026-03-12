"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { useAppStore } from "@/lib/store";
import PostCard from "@/components/PostCard";
import type { Post, Assessment, Challenge, UserStreak } from "@/types";
import { dDay } from "@/lib/utils";

export default function HomePage() {
  const user = useAppStore((s) => s.user);
  const school = useAppStore((s) => s.school);
  const [hotPosts, setHotPosts] = useState<Post[]>([]);
  const [upcomingAssessments, setUpcomingAssessments] = useState<Assessment[]>([]);
  const [streak, setStreak] = useState<UserStreak | null>(null);

  useEffect(() => {
    if (!user?.school_id) return;
    const supabase = createClient();

    // 인기 게시글 (좋아요 순 3개)
    supabase
      .from("posts")
      .select("*, user:users(nickname)")
      .eq("school_id", user.school_id)
      .is("deleted_at", null)
      .eq("is_hidden", false)
      .order("like_count", { ascending: false })
      .limit(3)
      .then(({ data }) => { if (data) setHotPosts(data); });

    // 수행평가 마감 임박 (3개)
    supabase
      .from("assessments")
      .select("*")
      .eq("school_id", user.school_id)
      .gte("due_date", new Date().toISOString().split("T")[0])
      .order("due_date", { ascending: true })
      .limit(3)
      .then(({ data }) => { if (data) setUpcomingAssessments(data); });

    // 내 스트릭
    supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => { if (data) setStreak(data); });
  }, [user]);

  // 비로그인 또는 온보딩 미완료
  if (!user || !school) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-6xl mb-4">🎓</div>
        <h2 className="text-2xl font-bold text-primary mb-2">함지고</h2>
        <p className="text-gray-500 text-sm mb-6">
          고등학생을 위한 올인원 플랫폼
        </p>
        <Link href="/login" className="btn-primary text-base px-8 py-3">
          구글로 시작하기
        </Link>
        <div className="mt-8 grid grid-cols-2 gap-3 w-full max-w-xs">
          {[
            { icon: "💬", label: "익명 게시판" },
            { icon: "🧭", label: "진로 탐색" },
            { icon: "📅", label: "시간표 관리" },
            { icon: "🔥", label: "공부 인증" },
          ].map((f) => (
            <div key={f.label} className="card p-3 text-center">
              <div className="text-2xl mb-1">{f.icon}</div>
              <div className="text-xs text-gray-600">{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 space-y-6">
      {/* 인사 + 스트릭 */}
      <section className="card p-4 bg-gradient-to-r from-primary to-primary-light text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">안녕, {user.nickname}!</p>
            <p className="text-lg font-bold">{school.name}</p>
          </div>
          {streak && streak.current_streak > 0 && (
            <div className="text-center">
              <div className="text-3xl animate-flame">🔥</div>
              <p className="text-xs font-bold">{streak.current_streak}일 연속</p>
            </div>
          )}
        </div>
      </section>

      {/* 수행평가 D-day */}
      {upcomingAssessments.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-gray-800">수행평가 마감</h2>
            <Link href="/assessment" className="text-xs text-primary-light">전체 보기</Link>
          </div>
          <div className="space-y-2">
            {upcomingAssessments.map((a) => (
              <div key={a.id} className="card px-4 py-2.5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-primary-light">{a.subject}</span>
                  <p className="text-sm text-gray-700 line-clamp-1">{a.content}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  dDay(a.due_date).startsWith("D-Day") || dDay(a.due_date) === "D-1"
                    ? "bg-red-100 text-red-600"
                    : "bg-blue-50 text-blue-600"
                }`}>
                  {dDay(a.due_date)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 퀵 액션 */}
      <section className="grid grid-cols-4 gap-2">
        {[
          { href: "/challenge", icon: "🔥", label: "공부 인증" },
          { href: "/bucket", icon: "🎯", label: "버킷리스트" },
          { href: "/career/test", icon: "🧭", label: "적성 테스트" },
          { href: "/info", icon: "📌", label: "정보" },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="card p-3 text-center hover:shadow-md transition-shadow">
            <div className="text-xl mb-1">{item.icon}</div>
            <div className="text-[11px] text-gray-600 font-medium">{item.label}</div>
          </Link>
        ))}
      </section>

      {/* 인기 게시글 */}
      {hotPosts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-gray-800">인기 게시글</h2>
            <Link href="/board" className="text-xs text-primary-light">전체 보기</Link>
          </div>
          <div className="space-y-2">
            {hotPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}

      {/* 빈 상태 (데이터 없을 때) */}
      {hotPosts.length === 0 && upcomingAssessments.length === 0 && (
        <section className="text-center py-8 text-gray-400">
          <p className="text-4xl mb-3">📝</p>
          <p className="text-sm">아직 게시글이 없어요</p>
          <p className="text-xs mt-1">첫 번째 글을 작성해 보세요!</p>
          <Link href="/board/write" className="btn-primary mt-4 inline-block">
            글 작성하기
          </Link>
        </section>
      )}
    </div>
  );
}
