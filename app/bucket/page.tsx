"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useAppStore } from "@/lib/store";
import type { BucketItem } from "@/types";
import { timeAgo } from "@/lib/utils";

export default function BucketPage() {
  const user = useAppStore((s) => s.user);
  const [myBuckets, setMyBuckets] = useState<BucketItem[]>([]);
  const [publicBuckets, setPublicBuckets] = useState<BucketItem[]>([]);
  const [tab, setTab] = useState<"mine" | "feed">("mine");
  const [newContent, setNewContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    if (!user?.school_id) return;
    const supabase = createClient();

    const { data: mine } = await supabase
      .from("bucketlist")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (mine) setMyBuckets(mine);

    const { data: pub } = await supabase
      .from("bucketlist")
      .select("*, user:users(nickname)")
      .eq("school_id", user.school_id)
      .eq("is_public", true)
      .order("me_too_count", { ascending: false })
      .limit(30);
    if (pub) setPublicBuckets(pub);
  }

  async function handleAdd() {
    if (!user?.school_id || !newContent.trim()) return;
    setSubmitting(true);
    const supabase = createClient();
    await supabase.from("bucketlist").insert({
      user_id: user.id,
      school_id: user.school_id,
      content: newContent.trim(),
      is_public: isPublic,
    });
    setNewContent("");
    setIsPublic(false);
    setSubmitting(false);
    loadData();
  }

  async function toggleDone(bucket: BucketItem) {
    const supabase = createClient();
    await supabase.from("bucketlist").update({
      is_done: !bucket.is_done,
      done_at: bucket.is_done ? null : new Date().toISOString(),
    }).eq("id", bucket.id);
    loadData();
  }

  async function handleMeToo(bucketId: string) {
    if (!user) return;
    const supabase = createClient();
    const { error } = await supabase.from("bucket_reactions").insert({
      bucket_id: bucketId,
      user_id: user.id,
    });
    if (!error) {
      await supabase.rpc("increment_me_too", { bucket_id: bucketId }).then(null, () => {
        // RPC 없으면 직접 업데이트
        supabase.from("bucketlist")
          .update({ me_too_count: publicBuckets.find(b => b.id === bucketId)!.me_too_count + 1 })
          .eq("id", bucketId);
      });
      loadData();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    const supabase = createClient();
    await supabase.from("bucketlist").delete().eq("id", id);
    loadData();
  }

  const doneCount = myBuckets.filter((b) => b.is_done).length;
  const totalCount = myBuckets.length;

  return (
    <div className="space-y-4">
      {/* 진행률 */}
      {totalCount > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">달성률</span>
            <span className="text-sm font-bold text-primary">
              {doneCount}/{totalCount} ({totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0}%)
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full bg-accent-green rounded-full transition-all duration-500"
              style={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* 탭 */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setTab("mine")}
          className={`tab flex-1 text-center ${tab === "mine" ? "tab-active" : ""}`}
        >
          내 버킷리스트
        </button>
        <button
          onClick={() => setTab("feed")}
          className={`tab flex-1 text-center ${tab === "feed" ? "tab-active" : ""}`}
        >
          학교 피드
        </button>
      </div>

      {tab === "mine" ? (
        <>
          {/* 추가 폼 */}
          <div className="card p-3 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="졸업 전에 하고 싶은 것"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                maxLength={200}
                className="input flex-1"
              />
              <button
                onClick={handleAdd}
                disabled={submitting || !newContent.trim()}
                className="btn-primary px-4 disabled:opacity-50"
              >
                추가
              </button>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-xs text-gray-500">학교 피드에 공개</span>
            </label>
          </div>

          {/* 내 목록 */}
          <div className="space-y-2">
            {myBuckets.map((b) => (
              <div key={b.id} className="card px-4 py-3 flex items-center gap-3">
                <button
                  onClick={() => toggleDone(b)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    b.is_done
                      ? "bg-accent-green border-accent-green text-white"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {b.is_done && "✓"}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${b.is_done ? "line-through text-gray-400" : "text-gray-700"}`}>
                    {b.content}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {b.is_public && <span className="text-[10px] text-blue-500">공개</span>}
                    {b.me_too_count > 0 && (
                      <span className="text-[10px] text-gray-400">나도! {b.me_too_count}</span>
                    )}
                  </div>
                </div>
                <button onClick={() => handleDelete(b.id)} className="text-gray-300 hover:text-red-400 text-xs">
                  삭제
                </button>
              </div>
            ))}
            {myBuckets.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">
                아직 버킷리스트가 없어요
              </p>
            )}
          </div>
        </>
      ) : (
        /* 공개 피드 */
        <div className="space-y-2">
          {publicBuckets.map((b) => (
            <div key={b.id} className="card px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">{b.user?.nickname ?? "익명"}</span>
                <span className="text-[11px] text-gray-400">{timeAgo(b.created_at)}</span>
              </div>
              <p className={`text-sm ${b.is_done ? "line-through text-gray-400" : "text-gray-700"}`}>
                {b.content}
              </p>
              <div className="flex items-center justify-between mt-2">
                {b.is_done && <span className="badge bg-green-100 text-green-600">달성!</span>}
                <button
                  onClick={() => handleMeToo(b.id)}
                  className="text-xs text-gray-400 hover:text-primary transition-colors"
                >
                  나도! ({b.me_too_count})
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
