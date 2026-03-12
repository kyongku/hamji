"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useAppStore } from "@/lib/store";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAppStore((s) => s.setUser);
  const setSchool = useAppStore((s) => s.setSchool);
  const reset = useAppStore((s) => s.reset);

  useEffect(() => {
    const supabase = createClient();

    // 초기 세션 로드
    async function loadSession() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        reset();
        return;
      }

      // users 테이블에서 프로필 가져오기
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (profile) {
        setUser(profile);

        // 학교 정보 로드
        if (profile.school_id) {
          const { data: school } = await supabase
            .from("schools")
            .select("*")
            .eq("id", profile.school_id)
            .single();
          if (school) setSchool(school);
        }
      }
    }

    loadSession();

    // 인증 상태 변화 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === "SIGNED_IN") {
          loadSession();
        } else if (event === "SIGNED_OUT") {
          reset();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser, setSchool, reset]);

  return <>{children}</>;
}
