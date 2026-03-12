"use client";

import Link from "next/link";
import type { Post } from "@/types";
import { CATEGORY_LABELS } from "@/types";
import { timeAgo, categoryColor } from "@/lib/utils";

interface Props {
  post: Post;
}

export default function PostCard({ post }: Props) {
  const displayName = post.is_anonymous
    ? "익명"
    : post.user?.nickname ?? "알 수 없음";

  return (
    <Link href={`/board/${post.id}`} className="block">
      <article className="card px-4 py-3 animate-fade-in">
        {/* 상단: 카테고리 + 시간 */}
        <div className="flex items-center justify-between mb-1.5">
          <span className={`badge ${categoryColor(post.category)}`}>
            {CATEGORY_LABELS[post.category]}
          </span>
          <span className="text-xs text-gray-400">{timeAgo(post.created_at)}</span>
        </div>

        {/* 제목 */}
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 mb-1">
          {post.title}
        </h3>

        {/* 본문 미리보기 */}
        <p className="text-xs text-gray-500 line-clamp-2 mb-2 leading-relaxed">
          {post.content}
        </p>

        {/* 하단: 작성자 + 좋아요/댓글 카운트 */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{displayName}</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <HeartIcon /> {post.like_count}
            </span>
            <span className="flex items-center gap-1">
              <ChatIcon /> {post.comment_count}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function HeartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
