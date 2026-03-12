"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useAppStore } from "@/lib/store";
import type { CareerResult } from "@/types";

export default function CareerResultPage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const [latestResult, setLatestResult] = useState<CareerResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("career_results")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        setLatestResult(data);
        setLoading(false);
      });
  }, [user]);

  async function requestAiRecommendation() {
    if (!user || !latestResult) return;
    setAiLoading(true);

    // TODO: Gemini Flash API 호출
    // 현재는 mock 데이터 사용
    const mockRecommendation = {
      departments: [
        { name: "컴퓨터공학과", description: "소프트웨어 개발, AI, 데이터 분석 등을 배움", universities: ["서울대", "KAIST", "성균관대"] },
        { name: "산업공학과", description: "시스템 최적화, 경영공학, 데이터 사이언스", universities: ["KAIST", "포항공대", "한양대"] },
        { name: "경영학과", description: "기업 경영, 마케팅, 재무, 조직 관리", universities: ["고려대", "연세대", "서강대"] },
      ],
      interview_questions: [
        "지원 학과를 선택한 계기와 해당 분야에 대한 관심을 보여주는 경험이 있나요?",
        "고등학교 생활 중 가장 도전적이었던 경험과 그것을 통해 배운 점은 무엇인가요?",
        "팀 프로젝트에서 갈등이 생겼을 때 어떻게 해결했나요?",
        "최근 읽은 책 중 전공과 관련된 책이 있다면 소개해 주세요.",
        "10년 후 자신의 모습을 그려본다면 어떤 모습인가요?",
      ],
      activities: [
        "교내 코딩 동아리 활동 및 프로젝트 개발",
        "사회 문제 해결을 위한 캠페인 기획 및 실행",
        "관련 분야 도서 독서 및 독서록 작성",
        "멘토링 봉사활동 (또래 학습 지도)",
      ],
    };

    const supabase = createClient();
    await supabase
      .from("career_results")
      .update({ ai_recommendation: mockRecommendation })
      .eq("id", latestResult.id);

    setLatestResult({ ...latestResult, ai_recommendation: mockRecommendation });
    setAiLoading(false);
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">로딩 중...</div>;
  }

  if (!latestResult) {
    return (
      <div className="text-center py-12">
        <p className="text-3xl mb-3">📋</p>
        <p className="text-sm text-gray-500 mb-4">먼저 적성 테스트를 완료해 주세요</p>
        <button onClick={() => router.push("/career/test")} className="btn-primary">
          적성 테스트 하러가기
        </button>
      </div>
    );
  }

  const rec = latestResult.ai_recommendation;
  const TYPE_LABELS: Record<string, string> = {
    R: "현실형", I: "탐구형", A: "예술형", S: "사회형", E: "기업형", C: "관습형",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 내 유형 */}
      <div className="card p-4 bg-gradient-to-r from-primary to-primary-light text-white">
        <p className="text-xs opacity-80 mb-1">내 적성 유형</p>
        <div className="flex gap-2">
          {latestResult.test_result.top_types?.map((t) => (
            <span key={t} className="text-lg font-bold">
              {TYPE_LABELS[t] ?? t}
            </span>
          ))}
        </div>
      </div>

      {/* AI 추천 요청 */}
      {!rec && (
        <button
          onClick={requestAiRecommendation}
          disabled={aiLoading}
          className="btn-primary w-full py-3 text-base"
        >
          {aiLoading ? "AI 분석 중..." : "AI 학과 추천 받기 (1회 소모)"}
        </button>
      )}

      {/* 추천 학과 */}
      {rec?.departments && (
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-3">추천 학과</h2>
          <div className="space-y-2">
            {rec.departments.map((dept, i) => (
              <div key={i} className="card p-4">
                <h3 className="text-sm font-bold text-primary mb-1">{dept.name}</h3>
                <p className="text-xs text-gray-600 mb-2">{dept.description}</p>
                <div className="flex gap-1 flex-wrap">
                  {dept.universities.map((uni) => (
                    <span key={uni} className="badge bg-gray-100 text-gray-600">{uni}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 면접 질문 */}
      {rec?.interview_questions && (
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-3">예상 면접 질문</h2>
          <div className="space-y-2">
            {rec.interview_questions.map((q, i) => (
              <div key={i} className="card px-4 py-3 flex gap-3">
                <span className="text-xs font-bold text-primary shrink-0">Q{i + 1}</span>
                <p className="text-sm text-gray-700">{q}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 생기부 활동 추천 */}
      {rec?.activities && (
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-3">추천 생기부 활동</h2>
          <div className="space-y-2">
            {rec.activities.map((a, i) => (
              <div key={i} className="card px-4 py-3 flex items-start gap-3">
                <span className="text-accent-green">✓</span>
                <p className="text-sm text-gray-700">{a}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 면책 문구 */}
      <p className="text-[11px] text-gray-400 text-center leading-relaxed bg-gray-50 p-3 rounded-lg">
        본 정보는 AI가 제공하는 참고용 데이터이며, 실제 입시 결과와 다를 수 있습니다.
        정확한 정보는 각 대학 입학처를 확인하세요.
      </p>
    </div>
  );
}
