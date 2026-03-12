"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useAppStore } from "@/lib/store";

// RIASEC 질문 15개
const QUESTIONS = [
  { q: "기계나 도구를 직접 다루는 것이 좋다", type: "R" },
  { q: "실험이나 관찰을 통해 원리를 알아내는 것이 재미있다", type: "I" },
  { q: "그림, 음악, 글쓰기 등 창작 활동을 즐긴다", type: "A" },
  { q: "다른 사람을 돕거나 가르치는 일에 보람을 느낀다", type: "S" },
  { q: "리더십을 발휘하거나 프로젝트를 이끄는 것이 좋다", type: "E" },
  { q: "꼼꼼하게 정리하고 규칙적으로 일하는 것을 선호한다", type: "C" },
  { q: "야외 활동이나 체육 활동을 좋아한다", type: "R" },
  { q: "수학이나 과학 문제를 풀 때 집중이 잘 된다", type: "I" },
  { q: "독특하고 새로운 아이디어를 내는 것을 좋아한다", type: "A" },
  { q: "친구들의 고민을 잘 들어주는 편이다", type: "S" },
  { q: "토론이나 발표에서 자신감이 있다", type: "E" },
  { q: "계획표를 세우고 그대로 실행하는 것을 좋아한다", type: "C" },
  { q: "컴퓨터나 전자기기를 조작하는 것에 능숙하다", type: "R" },
  { q: "사회 현상이나 인간 심리에 관심이 많다", type: "I" },
  { q: "팀 프로젝트에서 조율하는 역할을 자주 맡는다", type: "S" },
];

const SCALE = [
  { value: 1, label: "전혀 아님" },
  { value: 2, label: "약간" },
  { value: 3, label: "보통" },
  { value: 4, label: "그런 편" },
  { value: 5, label: "매우 그럼" },
];

const TYPE_LABELS: Record<string, { name: string; emoji: string; desc: string }> = {
  R: { name: "현실형", emoji: "🔧", desc: "실용적이고 손으로 직접 하는 것을 좋아함" },
  I: { name: "탐구형", emoji: "🔬", desc: "분석적이고 지적 호기심이 강함" },
  A: { name: "예술형", emoji: "🎨", desc: "창의적이고 자기표현을 중시함" },
  S: { name: "사회형", emoji: "🤝", desc: "타인과의 관계를 중요시하고 도움을 좋아함" },
  E: { name: "기업형", emoji: "📊", desc: "리더십이 있고 목표 달성을 즐김" },
  C: { name: "관습형", emoji: "📋", desc: "체계적이고 정확한 일처리를 선호함" },
};

export default function CareerTestPage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(QUESTIONS.length).fill(0));
  const [showResult, setShowResult] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleAnswer(value: number) {
    const newAnswers = [...answers];
    newAnswers[currentQ] = value;
    setAnswers(newAnswers);

    if (currentQ < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ(currentQ + 1), 200);
    }
  }

  function calculateScores(): Record<string, number> {
    const scores: Record<string, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    QUESTIONS.forEach((q, i) => {
      scores[q.type] += answers[i];
    });
    return scores;
  }

  function getTopTypes(scores: Record<string, number>): string[] {
    return Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([type]) => type);
  }

  async function handleFinish() {
    const scores = calculateScores();
    const topTypes = getTopTypes(scores);
    setSaving(true);

    if (user) {
      const supabase = createClient();
      await supabase.from("career_results").insert({
        user_id: user.id,
        test_result: { scores, top_types: topTypes },
      });
    }

    setShowResult(true);
    setSaving(false);
  }

  const allAnswered = answers.every((a) => a > 0);
  const scores = calculateScores();
  const topTypes = getTopTypes(scores);
  const maxScore = Math.max(...Object.values(scores));

  if (showResult) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-1">적성 테스트 결과</h2>
          <p className="text-sm text-gray-500">당신의 RIASEC 유형</p>
        </div>

        {/* 상위 2개 유형 */}
        <div className="flex gap-3 justify-center">
          {topTypes.map((type) => (
            <div key={type} className="card p-4 text-center flex-1 max-w-[150px]">
              <div className="text-4xl mb-2">{TYPE_LABELS[type].emoji}</div>
              <h3 className="text-base font-bold text-primary">{TYPE_LABELS[type].name}</h3>
              <p className="text-[11px] text-gray-500 mt-1">{TYPE_LABELS[type].desc}</p>
            </div>
          ))}
        </div>

        {/* 전체 점수 차트 */}
        <div className="card p-4 space-y-3">
          <h3 className="text-sm font-bold text-gray-700">유형별 점수</h3>
          {Object.entries(scores)
            .sort((a, b) => b[1] - a[1])
            .map(([type, score]) => (
              <div key={type} className="flex items-center gap-3">
                <span className="text-sm w-16 shrink-0">
                  {TYPE_LABELS[type].emoji} {TYPE_LABELS[type].name}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${(score / maxScore) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-6 text-right">{score}</span>
              </div>
            ))}
        </div>

        {/* 다음 단계 */}
        <div className="flex gap-2">
          <button onClick={() => router.push("/career")} className="btn-secondary flex-1 py-3">
            돌아가기
          </button>
          <button onClick={() => router.push("/career/result")} className="btn-primary flex-1 py-3">
            AI 학과 추천 받기 →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 진행률 */}
      <div>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>질문 {currentQ + 1} / {QUESTIONS.length}</span>
          <span>{Math.round(((currentQ + 1) / QUESTIONS.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((currentQ + 1) / QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* 질문 */}
      <div className="card p-6 text-center animate-fade-in" key={currentQ}>
        <p className="text-base font-medium text-gray-800 leading-relaxed mb-6">
          {QUESTIONS[currentQ].q}
        </p>

        <div className="space-y-2">
          {SCALE.map((s) => (
            <button
              key={s.value}
              onClick={() => handleAnswer(s.value)}
              className={`w-full py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                answers[currentQ] === s.value
                  ? "bg-primary text-white shadow-md"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 이전/다음/완료 */}
      <div className="flex gap-2">
        <button
          onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
          disabled={currentQ === 0}
          className="btn-secondary flex-1 disabled:opacity-30"
        >
          이전
        </button>
        {currentQ < QUESTIONS.length - 1 ? (
          <button
            onClick={() => setCurrentQ(currentQ + 1)}
            disabled={answers[currentQ] === 0}
            className="btn-primary flex-1 disabled:opacity-30"
          >
            다음
          </button>
        ) : (
          <button
            onClick={handleFinish}
            disabled={!allAnswered || saving}
            className="btn-primary flex-1 disabled:opacity-30"
          >
            {saving ? "저장 중..." : "결과 보기"}
          </button>
        )}
      </div>

      {/* 질문 점 네비게이션 */}
      <div className="flex justify-center gap-1 flex-wrap">
        {QUESTIONS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentQ(i)}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i === currentQ
                ? "bg-primary"
                : answers[i] > 0
                ? "bg-primary/30"
                : "bg-gray-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
