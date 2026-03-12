// ============================================================
// 함지고 — 타입 정의
// ============================================================

export type PostCategory = "free" | "question" | "assessment" | "counseling";
export type ReportReason = "profanity" | "spam" | "inappropriate" | "other";
export type UserRole = "user" | "moderator" | "admin";
export type ScheduleCategory = "class" | "academy" | "study" | "etc";

export interface School {
  id: string;
  name: string;
  region: string;
  email_domain: string | null;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  nickname: string | null;
  school_id: string | null;
  grade: number | null;
  class_number: number | null;
  role: UserRole;
  is_suspended: boolean;
  suspended_until: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  school_id: string;
  category: PostCategory;
  title: string;
  content: string;
  is_anonymous: boolean;
  like_count: number;
  comment_count: number;
  report_count: number;
  is_hidden: boolean;
  deleted_at: string | null;
  created_at: string;
  // joined
  user?: Pick<User, "nickname">;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  is_anonymous: boolean;
  like_count: number;
  report_count: number;
  is_hidden: boolean;
  deleted_at: string | null;
  created_at: string;
  user?: Pick<User, "nickname">;
  replies?: Comment[];
}

export interface Challenge {
  id: string;
  user_id: string;
  school_id: string;
  content: string;
  date: string;
  created_at: string;
  user?: Pick<User, "nickname">;
}

export interface UserStreak {
  user_id: string;
  current_streak: number;
  max_streak: number;
  last_challenge_date: string | null;
}

export interface BucketItem {
  id: string;
  user_id: string;
  school_id: string;
  content: string;
  is_public: boolean;
  is_done: boolean;
  done_at: string | null;
  me_too_count: number;
  created_at: string;
  user?: Pick<User, "nickname">;
}

export interface Schedule {
  id: string;
  user_id: string;
  title: string;
  category: ScheduleCategory;
  start_time: string; // HH:mm:ss
  end_time: string;
  start_date: string;
  end_date: string | null;
  recurrence: { days: number[] } | null; // 0=일, 1=월, ..., 6=토
  memo: string | null;
  is_public: boolean;
  is_dday: boolean;
  created_at: string;
}

export interface Assessment {
  id: string;
  user_id: string;
  school_id: string;
  subject: string;
  content: string;
  due_date: string;
  grade: number | null;
  created_at: string;
  user?: Pick<User, "nickname">;
}

export interface CareerResult {
  id: string;
  user_id: string;
  test_result: {
    scores: Record<string, number>; // R, I, A, S, E, C
    top_types: string[];
  };
  ai_recommendation: {
    departments: { name: string; description: string; universities: string[] }[];
    interview_questions?: string[];
    activities?: string[];
  } | null;
  created_at: string;
}

// 카테고리 라벨
export const CATEGORY_LABELS: Record<PostCategory, string> = {
  free: "자유",
  question: "질문",
  assessment: "수행평가",
  counseling: "고민상담",
};

export const SCHEDULE_CATEGORY_LABELS: Record<ScheduleCategory, string> = {
  class: "수업",
  academy: "학원",
  study: "자습",
  etc: "기타",
};

export const SCHEDULE_CATEGORY_COLORS: Record<ScheduleCategory, string> = {
  class: "#2E75B6",
  academy: "#E65100",
  study: "#4CAF50",
  etc: "#9E9E9E",
};
