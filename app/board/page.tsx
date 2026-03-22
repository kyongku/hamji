"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import PostCard from "@/components/PostCard";
import type { PostCategory } from "@/types";
import { CATEGORY_LABELS } from "@/types";
import { fetchPostsPage } from "@/lib/api/posts";
import { queryKeys } from "@/lib/api/queryKeys";

const CATEGORIES: (PostCategory | "all")[] = ["all", "free", "question", "assessment", "counseling"];
const SORT_OPTIONS = [
  { value: "latest", label: "최신순" },
  { value: "popular", label: "인기순" },
  { value: "comments", label: "댓글 많은 순" },
];

export default function BoardPage() {
  const user = useAppStore((s) => s.user);
  const isAuthReady = useAppStore((s) => s.isAuthReady);
  const [category, setCategory] = useState<PostCategory | "all">("all");
  const [sort, setSort] = useState("latest");
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasNextPageRef = useRef(false);
  const isFetchingNextPageRef = useRef(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.posts.list({
      schoolId: user?.school_id ?? "",
      category,
      sort: sort as "latest" | "popular" | "comments",
      search: searchQuery,
    }),
    queryFn: ({ pageParam }) =>
      fetchPostsPage({
        pageParam: pageParam as number,
        schoolId: user!.school_id,
        category,
        sort: sort as "latest" | "popular" | "comments",
        search: searchQuery,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!user?.school_id,
  });

  const posts = data?.pages.flatMap((page) => page.posts) ?? [];
  const loading = !isAuthReady || (isFetching && !isFetchingNextPage);

  // ref를 항상 최신 값으로 동기화
  hasNextPageRef.current = hasNextPage;
  isFetchingNextPageRef.current = isFetchingNextPage;

  // Intersection Observer: sentinel이 보이면 다음 페이지 로드 (마운트 시 1회만 등록)
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPageRef.current && !isFetchingNextPageRef.current) {
          fetchNextPage();
        }
      },
      { rootMargin: "120px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage]);

  return (
    <div className="space-y-4">
      {/* 검색 */}
      <div className="relative">
        <input
          type="text"
          placeholder="제목, 내용으로 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setSearchQuery(search);
          }}
          className="input pl-9"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
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

      {/* 비로그인 유도 */}
      {isAuthReady && !user && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">🔒</p>
          <p className="text-sm mb-4">게시판을 보려면 로그인이 필요해요</p>
          <Link href="/login" className="btn-primary text-sm px-6 py-2">
            로그인하기
          </Link>
        </div>
      )}

      {/* 게시글 목록 */}
      {(!isAuthReady || (isAuthReady && user)) && loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : isAuthReady && user && posts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm">게시글이 없습니다</p>
        </div>
      ) : isAuthReady && user ? (
        <div className="space-y-2">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : null}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />

      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!hasNextPage && posts.length > 0 && !loading && (
        <p className="text-center text-xs text-gray-400 py-4">모든 게시글을 불러왔습니다</p>
      )}
    </div>
  );
}
