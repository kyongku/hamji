"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useAppStore } from "@/lib/store";
import type { Post, Comment } from "@/types";
import { CATEGORY_LABELS } from "@/types";
import { timeAgo, categoryColor } from "@/lib/utils";

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isAnonComment, setIsAnonComment] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPost();
    loadComments();
    checkLiked();
  }, [id]);

  async function loadPost() {
    const supabase = createClient();
    const { data } = await supabase
      .from("posts")
      .select("*, user:users(nickname)")
      .eq("id", id)
      .single();
    if (data) setPost(data);
  }

  async function loadComments() {
    const supabase = createClient();
    const { data } = await supabase
      .from("comments")
      .select("*, user:users(nickname)")
      .eq("post_id", id)
      .is("deleted_at", null)
      .eq("is_hidden", false)
      .order("created_at", { ascending: true });
    if (data) setComments(data);
  }

  async function checkLiked() {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("target_type", "post")
      .eq("target_id", id)
      .single();
    setLiked(!!data);
  }

  async function toggleLike() {
    if (!user || !post) return;
    const supabase = createClient();
    if (liked) {
      await supabase
        .from("likes")
        .delete()
        .eq("user_id", user.id)
        .eq("target_type", "post")
        .eq("target_id", id);
      setPost({ ...post, like_count: post.like_count - 1 });
    } else {
      await supabase.from("likes").insert({
        user_id: user.id,
        target_type: "post",
        target_id: id,
      });
      setPost({ ...post, like_count: post.like_count + 1 });
    }
    setLiked(!liked);
  }

  async function submitComment() {
    if (!user || !newComment.trim()) return;
    setSubmitting(true);
    const supabase = createClient();
    await supabase.from("comments").insert({
      post_id: id,
      user_id: user.id,
      parent_id: replyTo,
      content: newComment.trim(),
      is_anonymous: isAnonComment,
    });
    if (post) {
      await supabase
        .from("posts")
        .update({ comment_count: post.comment_count + 1 })
        .eq("id", id);
    }
    setNewComment("");
    setReplyTo(null);
    setSubmitting(false);
    loadComments();
    loadPost();
  }

  async function handleReport(targetType: "post" | "comment", targetId: string) {
    if (!user) return;
    const reason = prompt("신고 사유를 선택해 주세요 (욕설/도배/부적절/기타):");
    if (!reason) return;
    const supabase = createClient();
    await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason: "other",
      detail: reason,
    });
    alert("신고가 접수되었습니다.");
  }

  async function handleDelete() {
    if (!confirm("게시글을 삭제하시겠습니까?")) return;
    const supabase = createClient();
    await supabase
      .from("posts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    router.push("/board");
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    const supabase = createClient();
    await supabase
      .from("comments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", commentId);
    if (post) {
      await supabase
        .from("posts")
        .update({ comment_count: Math.max(0, post.comment_count - 1) })
        .eq("id", id);
    }
    loadComments();
    loadPost();
  }

  if (!post) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3" />
        <div className="h-8 bg-gray-200 rounded w-3/4" />
        <div className="h-32 bg-gray-100 rounded" />
      </div>
    );
  }

  const displayName = post.is_anonymous ? "익명" : post.user?.nickname ?? "알 수 없음";
  const isAuthor = user?.id === post.user_id;

  const topComments = comments.filter((c) => !c.parent_id);
  const repliesMap = new Map<string, Comment[]>();
  comments.filter((c) => c.parent_id).forEach((c) => {
    const arr = repliesMap.get(c.parent_id!) ?? [];
    arr.push(c);
    repliesMap.set(c.parent_id!, arr);
  });

  return (
    <div className="space-y-4 animate-fade-in pb-24">
      {/* 게시글 */}
      <article className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className={`badge ${categoryColor(post.category)}`}>
            {CATEGORY_LABELS[post.category]}
          </span>
          <span className="text-xs text-gray-400">{timeAgo(post.created_at)}</span>
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-2">{post.title}</h1>
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-4">
          {post.content}
        </p>
        {post.event_date && post.event_title && (
          <div className="mt-3 p-3 bg-blue-50 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">📅</span>
              <div>
                <p className="text-xs font-medium text-blue-700">{post.event_title}</p>
                <p className="text-[11px] text-blue-500">{post.event_date}</p>
              </div>
            </div>
            <button
              onClick={async () => {
                if (!user) return;
                const supabase = createClient();
                await supabase.from("schedules").insert({
                  user_id: user.id,
                  title: post.event_title,
                  category: "etc",
                  start_time: "00:00:00",
                  end_time: "00:00:00",
                  start_date: post.event_date,
                  end_date: post.event_date,
                  recurrence: null,
                  memo: null,
                  is_public: false,
                  is_dday: false,
                });
                alert("내 캘린더에 추가되었습니다");
              }}
              className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg"
            >
              + 내 캘린더에 추가
            </button>
          </div>
        )}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">{displayName}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLike}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors ${
                liked ? "bg-red-50 text-red-500" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {liked ? "❤️" : "🤍"} {post.like_count}
            </button>
            {isAuthor && (
              <button onClick={handleDelete} className="btn-ghost text-xs text-red-400">
                삭제
              </button>
            )}
            {!isAuthor && (
              <button
                onClick={() => handleReport("post", post.id)}
                className="btn-ghost text-xs text-gray-400"
              >
                신고
              </button>
            )}
          </div>
        </div>
      </article>

      {/* 댓글 */}
      <section>
        <h2 className="text-sm font-bold text-gray-700 mb-3">
          댓글 {post.comment_count}개
        </h2>
        <div className="space-y-2">
          {topComments.map((comment) => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                isPostAuthor={comment.user_id === post.user_id}
                onReply={() => setReplyTo(comment.id)}
                onReport={() => handleReport("comment", comment.id)}
                onDelete={() => handleDeleteComment(comment.id)}
                currentUserId={user?.id}
              />
              {repliesMap.get(comment.id)?.map((reply) => (
                <div key={reply.id} className="ml-8">
                  <CommentItem
                    comment={reply}
                    isPostAuthor={reply.user_id === post.user_id}
                    onReply={() => setReplyTo(comment.id)}
                    onReport={() => handleReport("comment", reply.id)}
                    onDelete={() => handleDeleteComment(reply.id)}
                    currentUserId={user?.id}
                    isReply
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* 댓글 입력 */}
        <div className="mt-4 card p-3">
          {replyTo && (
            <div className="flex items-center justify-between mb-2 px-2 py-1 bg-blue-50 rounded text-xs text-blue-600">
              <span>답글 작성 중...</span>
              <button onClick={() => setReplyTo(null)} className="text-blue-400">취소</button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="댓글을 입력해 주세요"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && submitComment()}
              className="input flex-1"
            />
            <button
              onClick={submitComment}
              disabled={submitting || !newComment.trim()}
              className="btn-primary px-4 disabled:opacity-50"
            >
              등록
            </button>
          </div>
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonComment}
              onChange={(e) => setIsAnonComment(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-xs text-gray-500">익명</span>
          </label>
        </div>
      </section>
    </div>
  );
}

function CommentItem({
  comment,
  isPostAuthor,
  onReply,
  onReport,
  onDelete,
  currentUserId,
  isReply = false,
}: {
  comment: Comment;
  isPostAuthor: boolean;
  onReply: () => void;
  onReport: () => void;
  onDelete: () => void;
  currentUserId?: string;
  isReply?: boolean;
}) {
  const name = comment.is_anonymous
    ? isPostAuthor
      ? "글쓴이"
      : "익명"
    : comment.user?.nickname ?? "알 수 없음";

  const isOwner = currentUserId === comment.user_id;

  return (
    <div className={`card px-3 py-2.5 ${isReply ? "border-l-2 border-primary-light/30" : ""}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-medium ${isPostAuthor ? "text-primary" : "text-gray-600"}`}>
          {name}
          {isPostAuthor && !comment.is_anonymous && (
            <span className="ml-1 text-[10px] text-primary-light">(글쓴이)</span>
          )}
        </span>
        <span className="text-[11px] text-gray-400">{timeAgo(comment.created_at)}</span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{comment.content}</p>
      <div className="flex items-center gap-3 mt-1.5">
        {!isReply && (
          <button onClick={onReply} className="text-[11px] text-gray-400 hover:text-gray-600">
            답글
          </button>
        )}
        {isOwner ? (
          <button onClick={onDelete} className="text-[11px] text-red-400 hover:text-red-600">
            삭제
          </button>
        ) : (
          <button onClick={onReport} className="text-[11px] text-gray-400 hover:text-red-400">
            신고
          </button>
        )}
      </div>
    </div>
  );
}
