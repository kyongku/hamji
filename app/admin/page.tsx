"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    pendingReports: 0,
    hiddenPosts: 0,
    hiddenComments: 0,
    suspendedUsers: 0,
  });

  useEffect(() => {
    async function loadStats() {
      const supabase = createClient();
      const [reports, hiddenPosts, hiddenComments, suspended] = await Promise.all([
        supabase.from("reports").select("id", { count: "exact", head: true }),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("is_hidden", true).is("deleted_at", null),
        supabase.from("comments").select("id", { count: "exact", head: true }).eq("is_hidden", true).is("deleted_at", null),
        supabase.from("users").select("id", { count: "exact", head: true }).eq("is_suspended", true),
      ]);
      setStats({
        pendingReports: reports.count ?? 0,
        hiddenPosts: hiddenPosts.count ?? 0,
        hiddenComments: hiddenComments.count ?? 0,
        suspendedUsers: suspended.count ?? 0,
      });
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">관리자 대시보드</h1>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "전체 신고", value: stats.pendingReports, color: "text-red-500" },
          { label: "숨김 게시글", value: stats.hiddenPosts, color: "text-orange-500" },
          { label: "숨김 댓글", value: stats.hiddenComments, color: "text-yellow-500" },
          { label: "정지된 사용자", value: stats.suspendedUsers, color: "text-purple-500" },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Link href="/admin/reports" className="block card p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-gray-800">신고 관리</p>
              <p className="text-xs text-gray-500 mt-0.5">신고된 글·댓글 검토 및 처리</p>
            </div>
            <span className="text-gray-400">›</span>
          </div>
        </Link>
        <Link href="/admin/users" className="block card p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-gray-800">사용자 관리</p>
              <p className="text-xs text-gray-500 mt-0.5">경고 부여, 밴 처리, 밴 해제</p>
            </div>
            <span className="text-gray-400">›</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
