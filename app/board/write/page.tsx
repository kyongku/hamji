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

  // 캘린더 첨부
  const [attachEvent, setAttachEvent] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [eventTitle, setEventTitle] = useState("");

  async function handleSubmit() {
    if (!user?.school_id) return;
    if (!title.trim()) return setError("제목을 입력해 주세요.");
    if (!content.trim()) return setError("내용을 입력해 주세요.");
    if (title.length > 100) return setError("제목은 100자 이내로 입력해 주세요.");
    if (attachEvent && (!eventDate || !eventTitle.trim())) return setError("일정 날짜와 제목을 입력해 주세요.");

    setSubmitting(true);
    setError("");

    const supabase = createClient();

    const { error: insertError } = await supabase.from("posts").insert({
      user_id: user.id,
      school_id: user.school_id,
      category,
      title: title.trim(),
      content: content.trim(),
      is_anonymous: isAnonymous,
      // 캘린더 첨부 데이터 - posts 테이블에 event_date, event_title 컬럼 필요
      event_date: attachEvent ? eventDate : null,
      event_title: attachEvent ? eventTitle.trim() : null,
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
    <div className="space-y-4 pb-24">
      {/* 커뮤니티 이용 안내 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1">
        <p className="text-xs font-medium text-amber-700">커뮤니티 이용 안내</p>
        <p className="text-[11px] text-amber-600 leading-relaxed">
          욕설·비방·허위사실 유포·개인정보 노출 시 제재될 수 있습니다.
          서로를 존중하는 글을 작성해 주세요.
          익명 게시물도 실명과 전화번호로 추적이 가능합니다.
        </p>
      </div>

      {/* 카테고리 선택 */}
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">카테고리</label>
        <div className="flex gap-2 flex-wrap">
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

      {/* 캘린더 일정 첨부 */}
      <div className="card p-3 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            className={`relative w-10 h-6 rounded-full transition-colors ${
              attachEvent ? "bg-primary" : "bg-gray-200"
            }`}
            onClick={() => setAttachEvent(!attachEvent)}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                attachEvent ? "translate-x-4" : ""
              }`}
            />
          </div>
          <div>
            <span className="text-sm text-gray-700 font-medium">📅 일정 첨부</span>
            <p className="text-[11px] text-gray-400">읽는 사람이 자신의 캘린더에 추가할 수 있어요</p>
          </div>
        </label>

        {attachEvent && (
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">일정 제목</label>
              <input
                type="text"
                placeholder="예: 중간고사, 현장학습"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                maxLength={50}
                className="input"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">날짜</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="input"
              />
            </div>
          </div>
        )}
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
