"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { timeAgo } from "@/lib/utils";

const REASON_LABELS: Record<string, string> = {
  profanity: "욕설/비방",
  spam: "도배",
  inappropriate: "부적절",
  other: "기타",
};

interface ReportItem {
  id: string;
  target_type: "post" | "comment";
  target_id: string;
  reason: string;
  created_at: string;
  reporter: { nickname: string | null; email: string } | null;
  content?: string;
  is_hidden?: boolean;
  reporter_id: string;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("reports")
      .select("*, reporter:users!reporter_id(nickname, email)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!data) { setLoading(false); return; }

    // 신고된 글/댓글 내용 병합
    const postIds = data.filter((r) => r.target_type === "post").map((r) => r.target_id);
    const commentIds = data.filter((r) => r.target_type === "comment").map((r) => r.target_id);

    const [posts, comments] = await Promise.all([
      postIds.length > 0
        ? supabase.from("posts").select("id, title, is_hidden").in("id", postIds)
        : { data: [] },
      commentIds.length > 0
        ? supabase.from("comments").select("id, content, is_hidden").in("id", commentIds)
        : { data: [] },
    ]);

    const postMap = new Map((posts.data ?? []).map((p: any) => [p.id, p]));
    const commentMap = new Map((comments.data ?? []).map((c: any) => [c.id, c]));

    setReports(
      data.map((r) => {
        const target = r.target_type === "post" ? postMap.get(r.target_id) : commentMap.get(r.target_id);
        return {
          ...r,
          content: r.target_type === "post" ? target?.title : target?.content,
          is_hidden: target?.is_hidden,
        };
      })
    );
    setLoading(false);
  }

  async function toggleHide(targetType: "post" | "comment", targetId: string, currentHidden: boolean) {
    const supabase = createClient();
    const table = targetType === "post" ? "posts" : "comments";
    await supabase.from(table).update({ is_hidden: !currentHidden }).eq("id", targetId);
    setReports((prev) =>
      prev.map((r) =>
        r.target_id === targetId ? { ...r, is_hidden: !currentHidden } : r
      )
    );
  }

  async function warnReporter(reporterId: string, reportId: string) {
    if (!confirm("이 신고자에게 경고를 부여하시겠습니까?")) return;
    const supabase = createClient();

    const { data: user } = await supabase
      .from("users")
      .select("warning_count")
      .eq("id", reporterId)
      .single();

    if (!user) return;
    const newCount = (user.warning_count ?? 0) + 1;
    const isBanned = newCount >= 3;

    await supabase.from("users").update({
      warning_count: newCount,
      ...(isBanned && {
        is_suspended: true,
        suspended_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    }).eq("id", reporterId);

    alert(isBanned ? `경고 ${newCount}회 — 자동 밴 처리되었습니다.` : `경고 ${newCount}회 부여되었습니다.`);
  }

  async function deleteReport(reportId: string) {
    const supabase = createClient();
    await supabase.from("reports").delete().eq("id", reportId);
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  }

  if (loading) return <div className="text-center py-12 text-gray-400 text-sm">로딩 중...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-gray-400 text-sm">← 대시보드</Link>
        <h1 className="text-lg font-bold text-gray-900">신고 관리</h1>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">신고 내역이 없습니다</div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    report.target_type === "post"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-green-100 text-green-600"
                  }`}>
                    {report.target_type === "post" ? "게시글" : "댓글"}
                  </span>
                  <span className="text-xs text-red-500 font-medium">
                    {REASON_LABELS[report.reason] ?? report.reason}
                  </span>
                  {report.is_hidden && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">숨김</span>
                  )}
                </div>
                <span className="text-[11px] text-gray-400">{timeAgo(report.created_at)}</span>
              </div>

              <p className="text-sm text-gray-700 line-clamp-2 bg-gray-50 rounded-lg px-3 py-2">
                {report.content ?? "(내용 없음)"}
              </p>

              <div className="text-[11px] text-gray-400">
                신고자: {report.reporter?.nickname ?? "알 수 없음"} ({report.reporter?.email})
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => toggleHide(report.target_type, report.target_id, report.is_hidden ?? false)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    report.is_hidden
                      ? "bg-green-100 text-green-600 hover:bg-green-200"
                      : "bg-orange-100 text-orange-600 hover:bg-orange-200"
                  }`}
                >
                  {report.is_hidden ? "숨김 해제" : "숨김 처리"}
                </button>
                <button
                  onClick={() => warnReporter(report.reporter_id, report.id)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors"
                >
                  신고자 경고
                </button>
                <button
                  onClick={() => deleteReport(report.id)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  신고 삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
