"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { useAppStore } from "@/lib/store";
import PostCard from "@/components/PostCard";
import type { Post, PostCategory } from "@/types";
import { CATEGORY_LABELS } from "@/types";

const CATEGORIES: (PostCategory | "all")[] = ["all", "free", "question", "assessment", "counseling"];
const SORT_OPTIONS = [
  { value: "latest", label: "최신순" },
  { value: "popular", label: "인기순" },
  { value: "comments", label: "댓글 많은 순" },
];

export default function BoardPage() {
  const user = useAppStore((s) => s.user);
  const [posts, setPosts] = useState<Post[]>([]);
  const [category, setCategory] = useState<PostCategory | "all">("all");
  const [sort, setSort] = useState("latest");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadPosts = useCallback(async () => {
    if (!user?.school_id) return;
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("posts")
      .select("*, user:users(nickname)")
      .eq("school_id", user.school_id)
      .is("deleted_at", null)
      .eq("is_hidden", false);

    if (category !== "all") {
      query = query.eq("category", category);
    }

    if (search.trim()) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    switch (sort) {
      case "popular":
        query = query.order("like_count", { ascending: false });
        break;
      case "comments":
        query = query.order("comment_count", { ascending: false });
        break;
      default:
        query = query.order("created_at", { ascending: false });
    }

    const { data } = await query.limit(20);
    if (data) setPosts(data);
    setLoading(false);
  }, [user, category, sort, search]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  return (
    <div className="space-y-4">
      {/* 검색 */}
      <div className="relative">
        <input
          type="text"
          placeholder="제목, 내용으로 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadPosts()}
          className="input pl-9"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`tab flex-shrink-0 ${category === cat ? "tab-active" : ""}`}
          >
            {cat === "all" ? "전체" : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* 정렬 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={`text-xs px-2 py-1 rounded-full transition-colors ${
                sort === opt.value
                  ? "bg-primary text-white"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <Link href="/board/write" className="btn-primary text-xs py-1.5">
          + 글쓰기
        </Link>
      </div>

      {/* 게시글 목록 */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm">게시글이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
