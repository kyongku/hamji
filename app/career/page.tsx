"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useAppStore } from "@/lib/store";
import type { CareerResult } from "@/types";
import { formatDateFull } from "@/lib/utils";

export default function CareerPage() {
  const user = useAppStore((s) => s.user);
  const [results, setResults] = useState<CareerResult[]>([]);
  const [aiUsage, setAiUsage] = useState(0);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    supabase
      .from("career_results")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data) setResults(data); });

    supabase
      .from("ai_usage")
      .select("count")
      .eq("user_id", user.id)
      .eq("date", new Date().toISOString().split("T")[0])
      .single()
      .then(({ data }) => { if (data) setAiUsage(data.count); });
  }, [user]);

  const RIASEC_LABELS: Record<string, string> = {
    R: "현실형", I: "탐구형", A: "예술형",
    S: "사회형", E: "기업형", C: "관습형",
  };

  return (
    <div className="space-y-6">
      {/* 3단계 플로우 카드 */}
      <section className="space-y-3">
        <Link href="/career/test" className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl shrink-0">
            📋
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">STEP 1</span>
              <h3 className="text-sm font-bold text-gray-800">적성 테스트</h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">RIASEC 기반 15문항 · AI 불필요</p>
          </div>
          <span className="text-gray-300">→</span>
        </Link>

        <Link href="/career/result" className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-2xl shrink-0">
            🎓
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-accent-green bg-green-50 px-1.5 py-0.5 rounded">STEP 2</span>
              <h3 className="text-sm font-bold text-gray-800">AI 학과 추천</h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">적성 기반 학과 + 입결 참고 정보</p>
          </div>
          <span className="text-gray-300">→</span>
        </Link>

        <Link href="/career/result" className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-2xl shrink-0">
            🎤
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">STEP 3</span>
              <h3 className="text-sm font-bold text-gray-800">면접 질문 + 생기부 추천</h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">AI가 예상 질문과 활동을 추천</p>
          </div>
          <span className="text-gray-300">→</span>
        </Link>
      </section>

      {/* AI 사용량 */}
      <div className="card p-3 bg-blue-50/50 flex items-center justify-between">
        <span className="text-xs text-gray-600">오늘 AI 사용</span>
        <span className="text-sm font-bold text-primary">{aiUsage} / 2회</span>
      </div>

      {/* 이전 결과 */}
      {results.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-2">이전 결과</h2>
          <div className="space-y-2">
            {results.map((r) => (
              <div key={r.id} className="card px-4 py-3">
                <p className="text-xs text-gray-400 mb-1">{formatDateFull(r.created_at)}</p>
                <div className="flex gap-2">
                  {r.test_result.top_types?.map((type) => (
                    <span key={type} className="badge bg-primary/10 text-primary">
                      {RIASEC_LABELS[type] ?? type}
                    </span>
                  ))}
                </div>
                {r.ai_recommendation && (
                  <p className="text-xs text-gray-500 mt-1.5 line-clamp-1">
                    추천 학과: {r.ai_recommendation.departments?.map((d) => d.name).join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 면책 문구 */}
      <p className="text-[11px] text-gray-400 text-center leading-relaxed">
        본 정보는 AI가 제공하는 참고용 데이터이며, 실제 입시 결과와 다를 수 있습니다.
        정확한 정보는 각 대학 입학처를 확인하세요.
      </p>
    </div>
  );
}
