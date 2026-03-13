"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useAppStore } from "@/lib/store";
import type { CareerResult } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  R: "현실형", I: "탐구형", A: "예술형", S: "사회형", E: "기업형", C: "관습형",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function CareerResultPage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const [latestResult, setLatestResult] = useState<CareerResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  // 채팅
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [remainingCount, setRemainingCount] = useState<number | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

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

    // 오늘 남은 횟수 조회
    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("ai_usage")
      .select("count")
      .eq("user_id", user.id)
      .eq("date", today)
      .single()
      .then(({ data }) => {
        setRemainingCount(2 - (data?.count ?? 0));
      });
  }, [user]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function requestAiRecommendation() {
    if (!user || !latestResult) return;
    setAiLoading(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          careerResult: latestResult,
          messages: [
            {
              role: "user",
              content: `내 적성 유형(${latestResult.test_result.top_types?.map((t) => TYPE_LABELS[t] ?? t).join(", ")})에 맞는 추천 학과 3개와 각 학과 설명, 추천 대학, 예상 면접 질문 5개, 생기부 활동 추천 4개를 알려줘. JSON 형식으로 답변해줘: {"departments":[{"name":"","description":"","universities":[]}],"interview_questions":[],"activities":[]}`,
            },
          ],
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error);
        setAiLoading(false);
        return;
      }

      setRemainingCount(json.remainingCount);

      // JSON 파싱 시도
      let recommendation;
      try {
        const cleaned = json.message.replace(/```json|```/g, "").trim();
        recommendation = JSON.parse(cleaned);
      } catch {
        // 파싱 실패 시 기본 구조
        recommendation = {
          departments: [{ name: "파싱 오류", description: json.message, universities: [] }],
          interview_questions: [],
          activities: [],
        };
      }

      const supabase = createClient();
      await supabase
        .from("career_results")
        .update({ ai_recommendation: recommendation })
        .eq("id", latestResult.id);

      setLatestResult({ ...latestResult, ai_recommendation: recommendation });
    } catch {
      alert("AI 추천 요청 중 오류가 발생했습니다");
    }

    setAiLoading(false);
  }

  async function sendChat() {
    if (!chatInput.trim() || chatLoading || !latestResult) return;
    if (remainingCount !== null && remainingCount <= 0) {
      alert("오늘 AI 사용 횟수를 모두 소진했습니다. 내일 다시 이용해 주세요.");
      return;
    }

    const userMsg: ChatMessage = { role: "user", content: chatInput.trim() };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          careerResult: latestResult,
          messages: newMessages,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setChatMessages([...newMessages, { role: "assistant", content: json.error }]);
        setChatLoading(false);
        return;
      }

      setRemainingCount(json.remainingCount);
      setChatMessages([...newMessages, { role: "assistant", content: json.message }]);
    } catch {
      setChatMessages([...newMessages, { role: "assistant", content: "오류가 발생했습니다. 다시 시도해 주세요." }]);
    }

    setChatLoading(false);
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

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      {/* 내 유형 */}
      <div className="card p-4 bg-gradient-to-r from-primary to-primary-light text-white">
        <p className="text-xs opacity-80 mb-1">내 적성 유형</p>
        <div className="flex gap-2">
          {latestResult.test_result.top_types?.map((t) => (
            <span key={t} className="text-lg font-bold">{TYPE_LABELS[t] ?? t}</span>
          ))}
        </div>
      </div>

      {/* AI 추천 요청 */}
      {!rec && (
        <div className="space-y-2">
          {remainingCount !== null && (
            <p className="text-xs text-center text-gray-400">오늘 남은 AI 사용 횟수: {remainingCount}회</p>
          )}
          <button
            onClick={requestAiRecommendation}
            disabled={aiLoading || remainingCount === 0}
            className="btn-primary w-full py-3 text-base disabled:opacity-50"
          >
            {aiLoading ? "AI 분석 중..." : "AI 학과 추천 받기 (1회 소모)"}
          </button>
        </div>
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

      {/* AI 채팅 */}
      {rec && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-700">AI에게 더 물어보기</h2>
            {remainingCount !== null && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${remainingCount > 0 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-400"}`}>
                오늘 {remainingCount}회 남음
              </span>
            )}
          </div>

          {/* 채팅 메시지 */}
          <div className="card p-3 space-y-3 max-h-[300px] overflow-y-auto mb-3">
            {chatMessages.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                결과에 대해 궁금한 점을 물어보세요
              </p>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-700 rounded-bl-sm"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-3 py-2 rounded-2xl rounded-bl-sm">
                  <span className="text-xs text-gray-400">답변 생성 중...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* 채팅 입력 */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={remainingCount === 0 ? "오늘 사용 횟수를 모두 소진했습니다" : "질문을 입력하세요"}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()}
              disabled={remainingCount === 0 || chatLoading}
              className="input flex-1 disabled:opacity-50"
            />
            <button
              onClick={sendChat}
              disabled={!chatInput.trim() || chatLoading || remainingCount === 0}
              className="btn-primary px-4 disabled:opacity-50"
            >
              전송
            </button>
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
