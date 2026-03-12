import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") ?? "/";

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // users 테이블에 프로필이 없으면 생성
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("id", data.user.id)
        .single();

      if (!existing) {
        await supabase.from("users").insert({
          id: data.user.id,
          email: data.user.email ?? "",
          nickname: null, // 온보딩에서 설정
          school_id: null,
          grade: null,
        });
        // 온보딩 필요 → /onboarding으로 리디렉트
        return NextResponse.redirect(`${origin}/profile?onboarding=true`);
      }

      // 온보딩 완료 여부 체크
      const { data: profile } = await supabase
        .from("users")
        .select("nickname, school_id")
        .eq("id", data.user.id)
        .single();

      if (profile && (!profile.nickname || !profile.school_id)) {
        return NextResponse.redirect(`${origin}/profile?onboarding=true`);
      }

      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  // 에러 시 로그인 페이지로
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
