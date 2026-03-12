"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useAppStore } from "@/lib/store";
import type { PostCategory } from "@/types";
import { CATEGORY_LABELS } from "@/types";

export default function WritePage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<PostCategory>("free");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!user?.school_id) return;
    if (!title.trim()) return setError("제목을 입력해 주세요.");
    if (!content.trim()) return setError("내용을 입력해 주세요.");
    if (title.length > 100) return setError("제목은 100자 이내로 입력해 주세요.");

    setSubmitting(true);
    setError("");

    const supabase = createClient();

    // TODO: AI 욕설 필터 (Gemini Flash 연동)
    // 현재는 바로 게시

    const { error: insertError } = await supabase.from("posts").insert({
      user_id: user.id,
      school_id: user.school_id,
      category,
      title: title.trim(),
      content: content.trim(),
      is_anonymous: isAnonymous,
    });

    if (insertError) {
      setError("게시글 등록에 실패했습니다: " + insertError.message);
      setSubmitting(false);
      return;
    }

    router.push("/board");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* 카테고리 선택 */}
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">카테고리</label>
        <div className="flex gap-2">
          {(Object.keys(CATEGORY_LABELS) as PostCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                category === cat
                  ? "bg-primary text-white border-primary"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* 제목 */}
      <div>
        <input
          type="text"
          placeholder="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          className="input text-base font-medium"
        />
        <p className="text-right text-[11px] text-gray-400 mt-1">{title.length}/100</p>
      </div>

      {/* 본문 */}
      <div>
        <textarea
          placeholder="내용을 작성해 주세요"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          className="input resize-none leading-relaxed"
        />
      </div>

      {/* 익명 토글 */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          className={`relative w-10 h-6 rounded-full transition-colors ${
            isAnonymous ? "bg-primary" : "bg-gray-200"
          }`}
          onClick={() => setIsAnonymous(!isAnonymous)}
        >
          <div
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              isAnonymous ? "translate-x-4" : ""
            }`}
          />
        </div>
        <span className="text-sm text-gray-700">익명으로 작성</span>
      </label>

      {/* 에러 */}
      {error && (
        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {/* 등록 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !title.trim() || !content.trim()}
        className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "등록 중..." : "등록하기"}
      </button>
    </div>
  );
}
