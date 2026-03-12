"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

function LoginContent() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";

  async function handleGoogleLogin() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    });
    if (error) {
      alert("로그인에 실패했습니다: " + error.message);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center -mt-14">
      <div className="mb-10">
        <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-white text-3xl font-bold">함</span>
        </div>
        <h1 className="text-3xl font-bold text-primary">함지고</h1>
        <p className="text-gray-500 text-sm mt-2">고등학생을 위한 올인원 플랫폼</p>
      </div>
      <div className="w-full max-w-xs space-y-3 mb-10">
        {[
          { icon: "💬", text: "익명 게시판으로 자유롭게 소통" },
          { icon: "🧭", text: "AI 기반 진로 탐색" },
          { icon: "📅", text: "개인 시간표와 수행평가 관리" },
          { icon: "🔥", text: "공부 인증 챌린지" },
        ].map((item) => (
          <div key={item.text} className="flex items-center gap-3 text-left">
            <span className="text-xl">{item.icon}</span>
            <span className="text-sm text-gray-600">{item.text}</span>
          </div>
        ))}
      </div>
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full max-w-xs flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-xl px-6 py-3.5 shadow-sm hover:shadow-md transition-all duration-150 disabled:opacity-50"
      >
        <GoogleIcon />
        <span className="text-sm font-medium text-gray-700">
          {loading ? "로그인 중..." : "Google 계정으로 시작하기"}
        </span>
      </button>
      <p className="text-[11px] text-gray-400 mt-6 max-w-xs leading-relaxed">
        로그인 시 서비스 이용약관 및 개인정보처리방침에 동의하는 것으로 간주됩니다.
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[80vh]">로딩 중...</div>}>
      <LoginContent />
    </Suspense>
  );
}
