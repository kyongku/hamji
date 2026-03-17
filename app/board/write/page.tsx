"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useAppStore } from "@/lib/store";
import { uploadPostImages } from "@/lib/uploadPostImages";
import type { PostCategory } from "@/types";
import { CATEGORY_LABELS } from "@/types";

function WriteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit"); // 수정 모드 여부
  const user = useAppStore((s) => s.user);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<PostCategory>("free");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(!!editId);

  // 캘린더 첨부
  const [attachEvent, setAttachEvent] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [eventTitle, setEventTitle] = useState("");

  // 이미지 첨부
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<{ id?: string; url: string; order_index: number }[]>([]);

  // 수정 모드: 기존 데이터 로드
  useEffect(() => {
    if (!editId) return;
    const supabase = createClient();
    supabase
      .from("posts")
      .select("*, post_images(id, url, order_index)")
      .eq("id", editId)
      .single()
      .then(({ data }) => {
        if (!data) { router.push("/board"); return; }
        if (data.user_id !== user?.id) { router.push("/board"); return; }
        setTitle(data.title);
        setContent(data.content);
        setCategory(data.category);
        setIsAnonymous(data.is_anonymous);
        if (data.event_date && data.event_title) {
          setAttachEvent(true);
          setEventDate(data.event_date);
          setEventTitle(data.event_title);
        }
        if (data.post_images?.length > 0) {
          const sorted = [...data.post_images].sort((a: any, b: any) => a.order_index - b.order_index);
          setExistingImages(sorted);
        }
        setLoadingEdit(false);
      });
  }, [editId, user]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const totalExisting = existingImages.length + imageFiles.length;
    const remaining = 4 - totalExisting;
    if (remaining <= 0) return;
    const merged = [...imageFiles, ...files].slice(0, remaining);
    setImageFiles(merged);
    const newPreviews = files.slice(0, remaining).map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...newPreviews].slice(0, remaining));
    e.target.value = "";
  }

  function handleImageRemove(index: number) {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  }

  function handleExistingImageRemove(index: number) {
    setExistingImages(existingImages.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!user?.school_id) return;
    if (!title.trim()) return setError("제목을 입력해 주세요.");
    if (!content.trim()) return setError("내용을 입력해 주세요.");
    if (title.length > 100) return setError("제목은 100자 이내로 입력해 주세요.");
    if (attachEvent && (!eventDate || !eventTitle.trim()))
      return setError("일정 날짜와 제목을 입력해 주세요.");

    setSubmitting(true);
    setError("");
    const supabase = createClient();

    if (editId) {
      // 수정 모드
      const { error: updateError } = await supabase
        .from("posts")
        .update({
          category,
          title: title.trim(),
          content: content.trim(),
          is_anonymous: isAnonymous,
          event_date: attachEvent ? eventDate : null,
          event_title: attachEvent ? eventTitle.trim() : null,
        })
        .eq("id", editId)
        .eq("user_id", user.id);

      if (updateError) {
        setError("수정에 실패했습니다: " + updateError.message);
        setSubmitting(false);
        return;
      }

      // 기존 이미지 중 삭제된 것 제거
      const { data: originalImages } = await supabase
        .from("post_images")
        .select("id, url")
        .eq("post_id", editId);

      const remainingIds = existingImages.map((img) => img.url);
      const toDelete = (originalImages ?? []).filter((img: any) => !remainingIds.includes(img.url));

      if (toDelete.length > 0) {
        await supabase.from("post_images").delete().in("id", toDelete.map((img: any) => img.id));
      }

      // 새 이미지 업로드
      if (imageFiles.length > 0) {
        const imageData = await uploadPostImages(editId, imageFiles);
        if (imageData.length > 0) {
          await supabase.from("post_images").insert(
            imageData.map(({ url, order_index }) => ({
              post_id: editId,
              url,
              order_index: existingImages.length + order_index,
            }))
          );
        }
      }

      router.push(`/board/${editId}`);
      router.refresh();
    } else {
      // 신규 작성
      const { data: post, error: insertError } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          school_id: user.school_id,
          category,
          title: title.trim(),
          content: content.trim(),
          is_anonymous: isAnonymous,
          event_date: attachEvent ? eventDate : null,
          event_title: attachEvent ? eventTitle.trim() : null,
        })
        .select("id")
        .single();

      if (insertError || !post) {
        setError("게시글 등록에 실패했습니다: " + insertError?.message);
        setSubmitting(false);
        return;
      }

      if (imageFiles.length > 0) {
        const imageData = await uploadPostImages(post.id, imageFiles);
        if (imageData.length > 0) {
          await supabase.from("post_images").insert(
            imageData.map(({ url, order_index }) => ({
              post_id: post.id,
              url,
              order_index,
            }))
          );
        }
      }

      router.push("/board");
      router.refresh();
    }
  }

  if (loadingEdit) {
    return <div className="text-center py-12 text-gray-400">불러오는 중...</div>;
  }

  const totalImages = existingImages.length + imageFiles.length;

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

      {/* 카테고리 */}
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

      {/* 이미지 첨부 */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-500 block">
          사진 첨부 ({totalImages}/4)
        </label>
        <div className="flex gap-2 flex-wrap">
          {/* 기존 이미지 */}
          {existingImages.map((img, i) => (
            <div key={`existing-${i}`} className="relative w-20 h-20">
              <img
                src={img.url}
                alt={`기존 이미지 ${i + 1}`}
                className="w-20 h-20 object-cover rounded-lg border border-gray-200"
              />
              <button
                onClick={() => handleExistingImageRemove(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 text-white rounded-full text-xs flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
          {/* 새 이미지 미리보기 */}
          {imagePreviews.map((src, i) => (
            <div key={`new-${i}`} className="relative w-20 h-20">
              <img
                src={src}
                alt={`새 이미지 ${i + 1}`}
                className="w-20 h-20 object-cover rounded-lg border border-blue-200"
              />
              <button
                onClick={() => handleImageRemove(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 text-white rounded-full text-xs flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {totalImages < 4 && (
          <label className="flex items-center gap-2 w-fit cursor-pointer text-xs text-gray-500 border border-dashed border-gray-300 rounded-lg px-3 py-2 hover:border-gray-400 transition-colors">
            <span>+ 사진 추가</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageChange}
            />
          </label>
        )}
      </div>

      {/* 캘린더 일정 첨부 */}
      <div className="card p-3 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            className={`relative w-10 h-6 rounded-full transition-colors ${attachEvent ? "bg-primary" : "bg-gray-200"}`}
            onClick={() => setAttachEvent(!attachEvent)}
          >
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${attachEvent ? "translate-x-4" : ""}`} />
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
              <input type="text" placeholder="예: 중간고사, 현장학습" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} maxLength={50} className="input" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">날짜</label>
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="input" />
            </div>
          </div>
        )}
      </div>

      {/* 익명 토글 */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          className={`relative w-10 h-6 rounded-full transition-colors ${isAnonymous ? "bg-primary" : "bg-gray-200"}`}
          onClick={() => setIsAnonymous(!isAnonymous)}
        >
          <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isAnonymous ? "translate-x-4" : ""}`} />
        </div>
        <span className="text-sm text-gray-700">익명으로 작성</span>
      </label>

      {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting || !title.trim() || !content.trim()}
        className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "처리 중..." : editId ? "수정하기" : "등록하기"}
      </button>
    </div>
  );
}

export default function WritePage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-400">로딩 중...</div>}>
      <WriteContent />
    </Suspense>
  );
}
