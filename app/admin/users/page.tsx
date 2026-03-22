"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@/types";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) setUsers(data);
    setLoading(false);
  }

  async function giveWarning(userId: string, currentCount: number) {
    if (!confirm("이 사용자에게 경고를 부여하시겠습니까?")) return;
    const supabase = createClient();
    const newCount = currentCount + 1;
    const isBanned = newCount >= 3;

    await supabase.from("users").update({
      warning_count: newCount,
      ...(isBanned && {
        is_suspended: true,
        suspended_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    }).eq("id", userId);

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, warning_count: newCount, is_suspended: isBanned || u.is_suspended }
          : u
      )
    );
    alert(isBanned ? `경고 ${newCount}회 — 자동 밴 처리되었습니다.` : `경고 ${newCount}회 부여되었습니다.`);
  }

  async function toggleBan(user: User) {
    const supabase = createClient();
    if (user.is_suspended) {
      if (!confirm("밴을 해제하시겠습니까?")) return;
      await supabase.from("users").update({
        is_suspended: false,
        suspended_until: null,
      }).eq("id", user.id);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_suspended: false, suspended_until: null } : u));
    } else {
      if (!confirm("이 사용자를 30일간 밴 처리하시겠습니까?")) return;
      const until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("users").update({
        is_suspended: true,
        suspended_until: until,
      }).eq("id", user.id);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_suspended: true, suspended_until: until } : u));
    }
  }

  async function resetWarnings(userId: string) {
    if (!confirm("경고를 초기화하시겠습니까?")) return;
    const supabase = createClient();
    await supabase.from("users").update({ warning_count: 0 }).eq("id", userId);
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, warning_count: 0 } : u));
  }

  const filtered = users.filter(
    (u) =>
      (u.nickname ?? "").includes(search) ||
      u.email.includes(search)
  );

  if (loading) return <div className="text-center py-12 text-gray-400 text-sm">로딩 중...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-gray-400 text-sm">← 대시보드</Link>
        <h1 className="text-lg font-bold text-gray-900">사용자 관리</h1>
      </div>

      <input
        type="text"
        placeholder="닉네임 또는 이메일 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input"
      />

      <div className="space-y-3">
        {filtered.map((user) => (
          <div key={user.id} className={`card p-4 space-y-2 ${user.is_suspended ? "border-red-200 bg-red-50" : ""}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {user.nickname ?? "닉네임 없음"}
                  {user.role === "admin" && (
                    <span className="ml-2 text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">관리자</span>
                  )}
                  {user.is_suspended && (
                    <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">밴</span>
                  )}
                </p>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">
                  경고{" "}
                  <span className={`font-bold ${(user.warning_count ?? 0) >= 2 ? "text-red-500" : "text-gray-700"}`}>
                    {user.warning_count ?? 0}
                  </span>
                  /3
                </p>
                {user.suspended_until && (
                  <p className="text-[10px] text-red-400">
                    {new Date(user.suspended_until).toLocaleDateString("ko-KR")}까지
                  </p>
                )}
              </div>
            </div>

            {user.role !== "admin" && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => giveWarning(user.id, user.warning_count ?? 0)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors"
                >
                  경고 부여
                </button>
                <button
                  onClick={() => toggleBan(user)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    user.is_suspended
                      ? "bg-green-100 text-green-600 hover:bg-green-200"
                      : "bg-red-100 text-red-600 hover:bg-red-200"
                  }`}
                >
                  {user.is_suspended ? "밴 해제" : "밴 처리"}
                </button>
                {(user.warning_count ?? 0) > 0 && (
                  <button
                    onClick={() => resetWarnings(user.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                  >
                    경고 초기화
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
