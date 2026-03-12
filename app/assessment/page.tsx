"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useAppStore } from "@/lib/store";
import type { Assessment } from "@/types";
import { dDay, formatDateFull } from "@/lib/utils";

export default function AssessmentPage() {
  const user = useAppStore((s) => s.user);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [grade, setGrade] = useState<number | "">(user?.grade ?? "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.school_id) return;
    loadData();
  }, [user]);

  async function loadData() {
    if (!user?.school_id) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("assessments")
      .select("*, user:users(nickname)")
      .eq("school_id", user.school_id)
      .order("due_date", { ascending: true });
    if (data) setAssessments(data);
  }

  async function handleSubmit() {
    if (!user?.school_id || !subject.trim() || !content.trim() || !dueDate) return;
    setSubmitting(true);
    const supabase = createClient();
    await supabase.from("assessments").insert({
      user_id: user.id,
      school_id: user.school_id,
      subject: subject.trim(),
      content: content.trim(),
      due_date: dueDate,
      grade: grade || null,
    });
    setSubject("");
    setContent("");
    setDueDate("");
    setShowForm(false);
    setSubmitting(false);
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    const supabase = createClient();
    await supabase.from("assessments").delete().eq("id", id);
    loadData();
  }

  const upcoming = assessments.filter((a) => new Date(a.due_date) >= new Date());
  const past = assessments.filter((a) => new Date(a.due_date) < new Date());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-700">수행평가 일정</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-xs">
          + 추가
        </button>
      </div>

      {/* 추가 폼 */}
      {showForm && (
        <div className="card p-4 space-y-3 animate-fade-in">
          <input
            type="text"
            placeholder="과목명"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="input"
          />
          <textarea
            placeholder="수행평가 내용 (예: 영어 에세이 제출)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            className="input resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">마감일</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">대상 학년</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value ? Number(e.target.value) : "")}
                className="input"
              >
                <option value="">전체</option>
                <option value="1">1학년</option>
                <option value="2">2학년</option>
                <option value="3">3학년</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || !subject.trim() || !content.trim() || !dueDate}
            className="btn-primary w-full py-2.5 disabled:opacity-50"
          >
            {submitting ? "등록 중..." : "등록"}
          </button>
        </div>
      )}

      {/* 마감 임박 */}
      {upcoming.length > 0 && (
        <section>
          <h3 className="text-xs font-medium text-gray-500 mb-2">예정</h3>
          <div className="space-y-2">
            {upcoming.map((a) => {
              const dd = dDay(a.due_date);
              const isUrgent = dd === "D-Day" || dd === "D-1" || dd === "D-2";
              return (
                <div key={a.id} className={`card px-4 py-3 ${isUrgent ? "border-l-4 border-red-400" : ""}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="badge bg-blue-100 text-blue-700 text-[11px]">{a.subject}</span>
                      {a.grade && <span className="text-[10px] text-gray-400">{a.grade}학년</span>}
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      isUrgent ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"
                    }`}>
                      {dd}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{a.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-gray-400">{formatDateFull(a.due_date)}</span>
                    {user?.id === a.user_id && (
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="text-[11px] text-gray-400 hover:text-red-400"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 지난 항목 */}
      {past.length > 0 && (
        <section>
          <h3 className="text-xs font-medium text-gray-400 mb-2">지난 수행평가</h3>
          <div className="space-y-2 opacity-60">
            {past.slice(0, 5).map((a) => (
              <div key={a.id} className="card px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{a.subject}</span>
                  <span className="text-xs text-gray-400 line-through">{a.content}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {assessments.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">📝</p>
          <p className="text-sm">등록된 수행평가가 없습니다</p>
        </div>
      )}
    </div>
  );
}
