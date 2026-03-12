"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useAppStore } from "@/lib/store";
import type { School, UserStreak } from "@/types";
import Link from "next/link";

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get("onboarding") === "true";

  const user = useAppStore((s) => s.user);
  const school = useAppStore((s) => s.school);
  const setUser = useAppStore((s) => s.setUser);
  const setSchool = useAppStore((s) => s.setSchool);
  const reset = useAppStore((s) => s.reset);

  const [schools, setSchools] = useState<School[]>([]);
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [realName, setRealName] = useState((user as any)?.real_name ?? "");
  const [phone, setPhone] = useState((user as any)?.phone ?? "");
  const [nicknameError, setNicknameError] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState(user?.school_id ?? "");
  const [grade, setGrade] = useState<number>(user?.grade ?? 1);
  const [classNumber, setClassNumber] = useState<number | "">(user?.class_number ?? "");
  const [saving, setSaving] = useState(false);
  const [showSchoolRequest, setShowSchoolRequest] = useState(false);
  const [requestSchoolName, setRequestSchoolName] = useState("");
  const [requestRegion, setRequestRegion] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.from("schools").select("*").order("name").then(({ data }) => { if (data) setSchools(data); });
    if (user) {
      supabase.from("user_streaks").select("*").eq("user_id", user.id).single().then(({ data }) => { if (data) setStreak(data); });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setNickname(user.nickname ?? "");
      setRealName((user as any).real_name ?? "");
      setPhone((user as any).phone ?? "");
      setSelectedSchoolId(user.school_id ?? "");
      setGrade(user.grade ?? 1);
      setClassNumber(user.class_number ?? "");
    }
  }, [user]);

  // 닉네임 중복 실시간 체크
  async function checkNickname(value: string) {
    setNickname(value);
    if (value.trim().length < 2) { setNicknameError(""); return; }
    if (value.trim() === user?.nickname) { setNicknameError(""); return; }
    const supabase = createClient();
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("nickname", value.trim())
      .single();
    setNicknameError(data ? "이미 사용 중인 닉네임입니다" : "");
  }

  async function handleSave() {
    if (!user || !nickname.trim() || !selectedSchoolId) return;
    if (!realName.trim()) { alert("이름을 입력해 주세요"); return; }
    if (!phone.trim()) { alert("전화번호를 입력해 주세요"); return; }
    if (nicknameError) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("users")
      .update({
        nickname: nickname.trim(),
        real_name: realName.trim(),
        phone: phone.trim(),
        school_id: selectedSchoolId,
        grade,
        class_number: classNumber || null,
      })
      .eq("id", user.id)
      .select()
      .single();
    if (error?.code === "23505") {
      setNicknameError("이미 사용 중인 닉네임입니다");
      setSaving(false);
      return;
    }
    if (data) {
      setUser(data);
      const { data: schoolData } = await supabase.from("schools").select("*").eq("id", selectedSchoolId).single();
      if (schoolData) setSchool(schoolData);
    }
    setSaving(false);
    if (isOnboarding) router.push("/");
  }

  async function handleSchoolRequest() {
    if (!requestSchoolName.trim()) return;
    const supabase = createClient();
    await supabase.from("school_requests").insert({
      requester_id: user?.id ?? null,
      school_name: requestSchoolName.trim(),
      region: requestRegion.trim(),
    });
    alert("학교 개설 요청이 접수되었습니다!");
    setShowSchoolRequest(false);
    setRequestSchoolName("");
    setRequestRegion("");
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    reset();
    router.push("/login");
  }

  if (isOnboarding || !user?.nickname || !user?.school_id) {
    return (
      <div className="pb-24 space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-3">👋</div>
          <h2 className="text-xl font-bold text-gray-800">환영합니다!</h2>
          <p className="text-sm text-gray-500 mt-1">프로필을 설정해 주세요</p>
        </div>
        <div className="card p-5 space-y-4">
          {/* 닉네임 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">닉네임</label>
            <input
              type="text"
              placeholder="닉네임 (2~20자)"
              value={nickname}
              onChange={(e) => checkNickname(e.target.value)}
              maxLength={20}
              className="input"
            />
            {nicknameError && <p className="text-xs text-red-500 mt-1">{nicknameError}</p>}
          </div>
          {/* 이름 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">이름 (실명)</label>
            <input
              type="text"
              placeholder="홍길동"
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
              maxLength={20}
              className="input"
            />
          </div>
          {/* 전화번호 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">전화번호</label>
            <input
              type="tel"
              placeholder="010-0000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={13}
              className="input"
            />
            <p className="text-[11px] text-gray-400 mt-1">익명 게시물 관리 목적으로만 사용되며 외부에 공개되지 않습니다</p>
          </div>
          {/* 학교 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">학교</label>
            <select value={selectedSchoolId} onChange={(e) => setSelectedSchoolId(e.target.value)} className="input">
              <option value="">학교를 선택하세요</option>
              {schools.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
            <button onClick={() => setShowSchoolRequest(true)} className="text-xs text-primary-light mt-1 underline">우리 학교가 없어요</button>
          </div>
          {/* 학년/반 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">학년</label>
              <select value={grade} onChange={(e) => setGrade(Number(e.target.value))} className="input">
                <option value={1}>1학년</option>
                <option value={2}>2학년</option>
                <option value={3}>3학년</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">반 (선택)</label>
              <input type="number" placeholder="반" value={classNumber} onChange={(e) => setClassNumber(e.target.value ? Number(e.target.value) : "")} min={1} max={20} className="input" />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !nickname.trim() || !!nicknameError || !realName.trim() || !phone.trim() || !selectedSchoolId}
            className="btn-primary w-full py-3 text-base disabled:opacity-50"
          >
            {saving ? "저장 중..." : "시작하기"}
          </button>
        </div>

        {showSchoolRequest && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3">
              <h3 className="text-base font-bold text-gray-800">학교 개설 요청</h3>
              <input type="text" placeholder="학교 이름" value={requestSchoolName} onChange={(e) => setRequestSchoolName(e.target.value)} className="input" />
              <input type="text" placeholder="지역 (예: 서울, 경기)" value={requestRegion} onChange={(e) => setRequestRegion(e.target.value)} className="input" />
              <div className="flex gap-2">
                <button onClick={() => setShowSchoolRequest(false)} className="btn-secondary flex-1">취소</button>
                <button onClick={handleSchoolRequest} disabled={!requestSchoolName.trim()} className="btn-primary flex-1 disabled:opacity-50">요청</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pb-24 space-y-6">
      <div className="card p-5 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl font-bold text-primary">{user.nickname?.charAt(0) ?? "?"}</span>
        </div>
        <h2 className="text-lg font-bold text-gray-800">{user.nickname}</h2>
        <p className="text-sm text-gray-500">{school?.name} · {user.grade}학년{user.class_number ? ` ${user.class_number}반` : ""}</p>
        {streak && streak.current_streak > 0 && (
          <div className="mt-3 inline-flex items-center gap-1 badge bg-orange-50 text-orange-600">🔥 {streak.current_streak}일 연속 공부 인증</div>
        )}
      </div>

      <div className="space-y-2">
        <Link href="/challenge" className="card px-4 py-3.5 flex items-center justify-between"><div className="flex items-center gap-3"><span className="text-lg">🔥</span><span className="text-sm font-medium text-gray-700">공부 인증 챌린지</span></div><span className="text-gray-300">→</span></Link>
        <Link href="/bucket" className="card px-4 py-3.5 flex items-center justify-between"><div className="flex items-center gap-3"><span className="text-lg">🎯</span><span className="text-sm font-medium text-gray-700">버킷리스트</span></div><span className="text-gray-300">→</span></Link>
        <Link href="/career" className="card px-4 py-3.5 flex items-center justify-between"><div className="flex items-center gap-3"><span className="text-lg">🧭</span><span className="text-sm font-medium text-gray-700">진로 결과 히스토리</span></div><span className="text-gray-300">→</span></Link>
        <Link href="/assessment" className="card px-4 py-3.5 flex items-center justify-between"><div className="flex items-center gap-3"><span className="text-lg">📝</span><span className="text-sm font-medium text-gray-700">수행평가</span></div><span className="text-gray-300">→</span></Link>
      </div>

      <details className="card overflow-hidden">
        <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-600 hover:bg-gray-50">프로필 수정</summary>
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">닉네임</label>
            <input type="text" value={nickname} onChange={(e) => checkNickname(e.target.value)} maxLength={20} className="input" />
            {nicknameError && <p className="text-xs text-red-500 mt-1">{nicknameError}</p>}
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">이름 (실명)</label>
            <input type="text" value={realName} onChange={(e) => setRealName(e.target.value)} maxLength={20} className="input" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">전화번호</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={13} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">학년</label>
              <select value={grade} onChange={(e) => setGrade(Number(e.target.value))} className="input">
                <option value={1}>1학년</option>
                <option value={2}>2학년</option>
                <option value={3}>3학년</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">반</label>
              <input type="number" value={classNumber} onChange={(e) => setClassNumber(e.target.value ? Number(e.target.value) : "")} className="input" />
            </div>
          </div>
          <button onClick={handleSave} disabled={saving || !nickname.trim() || !!nicknameError} className="btn-primary w-full disabled:opacity-50">{saving ? "저장 중..." : "저장"}</button>
        </div>
      </details>

      <button onClick={handleLogout} className="w-full text-center text-sm text-gray-400 py-3 hover:text-red-400 transition-colors">로그아웃</button>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[80vh]">로딩 중...</div>}>
      <ProfileContent />
    </Suspense>
  );
}          <p className="text-sm text-gray-500 mt-1">프로필을 설정해 주세요</p>
        </div>
        <div className="card p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">닉네임</label>
            <input type="text" placeholder="닉네임 (2~20자)" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} className="input" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">학교</label>
            <select value={selectedSchoolId} onChange={(e) => setSelectedSchoolId(e.target.value)} className="input">
              <option value="">학교를 선택하세요</option>
              {schools.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
            <button onClick={() => setShowSchoolRequest(true)} className="text-xs text-primary-light mt-1 underline">우리 학교가 없어요</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">학년</label>
              <select value={grade} onChange={(e) => setGrade(Number(e.target.value))} className="input">
                <option value={1}>1학년</option>
                <option value={2}>2학년</option>
                <option value={3}>3학년</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">반 (선택)</label>
              <input type="number" placeholder="반" value={classNumber} onChange={(e) => setClassNumber(e.target.value ? Number(e.target.value) : "")} min={1} max={20} className="input" />
            </div>
          </div>
          <button onClick={handleSave} disabled={saving || !nickname.trim() || !selectedSchoolId} className="btn-primary w-full py-3 text-base disabled:opacity-50">
            {saving ? "저장 중..." : "시작하기"}
          </button>
        </div>
        {showSchoolRequest && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3">
              <h3 className="text-base font-bold text-gray-800">학교 개설 요청</h3>
              <input type="text" placeholder="학교 이름" value={requestSchoolName} onChange={(e) => setRequestSchoolName(e.target.value)} className="input" />
              <input type="text" placeholder="지역 (예: 서울, 경기)" value={requestRegion} onChange={(e) => setRequestRegion(e.target.value)} className="input" />
              <div className="flex gap-2">
                <button onClick={() => setShowSchoolRequest(false)} className="btn-secondary flex-1">취소</button>
                <button onClick={handleSchoolRequest} disabled={!requestSchoolName.trim()} className="btn-primary flex-1 disabled:opacity-50">요청</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card p-5 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl font-bold text-primary">{user.nickname?.charAt(0) ?? "?"}</span>
        </div>
        <h2 className="text-lg font-bold text-gray-800">{user.nickname}</h2>
        <p className="text-sm text-gray-500">{school?.name} · {user.grade}학년{user.class_number ? ` ${user.class_number}반` : ""}</p>
        {streak && streak.current_streak > 0 && (
          <div className="mt-3 inline-flex items-center gap-1 badge bg-orange-50 text-orange-600">🔥 {streak.current_streak}일 연속 공부 인증</div>
        )}
      </div>
      <div className="space-y-2">
        <Link href="/challenge" className="card px-4 py-3.5 flex items-center justify-between"><div className="flex items-center gap-3"><span className="text-lg">🔥</span><span className="text-sm font-medium text-gray-700">공부 인증 챌린지</span></div><span className="text-gray-300">→</span></Link>
        <Link href="/bucket" className="card px-4 py-3.5 flex items-center justify-between"><div className="flex items-center gap-3"><span className="text-lg">🎯</span><span className="text-sm font-medium text-gray-700">버킷리스트</span></div><span className="text-gray-300">→</span></Link>
        <Link href="/career" className="card px-4 py-3.5 flex items-center justify-between"><div className="flex items-center gap-3"><span className="text-lg">🧭</span><span className="text-sm font-medium text-gray-700">진로 결과 히스토리</span></div><span className="text-gray-300">→</span></Link>
        <Link href="/assessment" className="card px-4 py-3.5 flex items-center justify-between"><div className="flex items-center gap-3"><span className="text-lg">📝</span><span className="text-sm font-medium text-gray-700">수행평가</span></div><span className="text-gray-300">→</span></Link>
      </div>
      <details className="card overflow-hidden">
        <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-600 hover:bg-gray-50">프로필 수정</summary>
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">닉네임</label>
            <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">학년</label>
              <select value={grade} onChange={(e) => setGrade(Number(e.target.value))} className="input">
                <option value={1}>1학년</option>
                <option value={2}>2학년</option>
                <option value={3}>3학년</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">반</label>
              <input type="number" value={classNumber} onChange={(e) => setClassNumber(e.target.value ? Number(e.target.value) : "")} className="input" />
            </div>
          </div>
          <button onClick={handleSave} disabled={saving || !nickname.trim()} className="btn-primary w-full disabled:opacity-50">{saving ? "저장 중..." : "저장"}</button>
        </div>
      </details>
      <button onClick={handleLogout} className="w-full text-center text-sm text-gray-400 py-3 hover:text-red-400 transition-colors">로그아웃</button>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[80vh]">로딩 중...</div>}>
      <ProfileContent />
    </Suspense>
  );
}
