import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 세션 갱신 (중요: getUser를 호출해야 쿠키가 리프레시됨)
  const { data: { user } } = await supabase.auth.getUser();

  // 밴 사용자 차단 (/login, /admin 제외 모든 경로)
  if (user && !request.nextUrl.pathname.startsWith("/login") && !request.nextUrl.pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("users")
      .select("is_suspended, suspended_until, role")
      .eq("id", user.id)
      .single();

    if (profile?.is_suspended) {
      const suspendedUntil = profile.suspended_until ? new Date(profile.suspended_until) : null;
      const isBanExpired = suspendedUntil && suspendedUntil < new Date();

      if (isBanExpired) {
        // 밴 기간 만료 → 자동 해제
        await supabase
          .from("users")
          .update({ is_suspended: false, suspended_until: null })
          .eq("id", user.id);
      } else {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("banned", "true");
        if (suspendedUntil) url.searchParams.set("until", suspendedUntil.toISOString());
        return NextResponse.redirect(url);
      }
    }

    // 관리자 페이지 접근 제한
    if (request.nextUrl.pathname.startsWith("/admin") && profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // 로그인 안 된 상태에서 보호 페이지 접근 시 → 로그인 페이지로 리디렉트
  const protectedPaths = ["/board/write", "/schedule", "/career/test", "/challenge", "/bucket", "/profile", "/admin"];
  const isProtected = protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
