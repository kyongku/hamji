import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const DAILY_LIMIT = 2;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    // 현재 로그인 유저 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // 오늘 사용량 조회
    const { data: usage } = await supabase
      .from("ai_usage")
      .select("id, count")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();

    const currentCount = usage?.count ?? 0;

    if (currentCount >= DAILY_LIMIT) {
      return NextResponse.json(
        {
          error: `오늘 AI 사용 횟수(${DAILY_LIMIT}회)를 모두 소진했습니다. 내일 다시 이용해 주세요.`,
        },
        { status: 429 }
      );
    }

    const { messages, careerResult } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
    }

    // 시스템 프롬프트
    const systemPrompt = `너는 고등학생의 진로 상담을 도와주는 AI 어시스턴트야.
아래는 이 학생의 적성 검사 결과야:

적성 유형: ${careerResult?.test_result?.top_types?.join(", ") ?? "알 수 없음"}
추천 학과: ${
      careerResult?.ai_recommendation?.departments
        ?.map((d: { name: string }) => d.name)
        .join(", ") ?? "아직 없음"
    }

이 결과를 바탕으로 학생의 질문에 친절하고 구체적으로 답변해줘.
답변은 간결하게 3-5문장 이내로 해줘.
한국어로 답변해줘.`;

    // Gemini API 형식으로 메시지 변환
    // Gemini는 system turn을 별도로 지원하지 않으므로 첫 user 메시지 앞에 붙임
    const geminiContents = messages.map(
      (m: { role: string; content: string }, i: number) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [
          {
            text:
              i === 0 && m.role === "user"
                ? `${systemPrompt}\n\n${m.content}`
                : m.content,
          },
        ],
      })
    );

    // Gemini API 호출
    const geminiRes = await fetch(
      `${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiContents,
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", errText);
      return NextResponse.json(
        { error: "AI 응답 중 오류가 발생했습니다" },
        { status: 500 }
      );
    }

    const geminiData = await geminiRes.json();
    const assistantMessage =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // 사용량 업데이트
    if (usage) {
      await supabase
        .from("ai_usage")
        .update({ count: currentCount + 1 })
        .eq("id", usage.id);
    } else {
      await supabase
        .from("ai_usage")
        .insert({ user_id: user.id, date: today, count: 1 });
    }

    return NextResponse.json({
      message: assistantMessage,
      remainingCount: DAILY_LIMIT - (currentCount + 1),
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: "AI 응답 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
