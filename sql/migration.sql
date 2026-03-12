-- ============================================================
-- 함지고 DB 마이그레이션
-- Supabase SQL Editor에서 실행
-- ============================================================

-- 0. ENUM 타입
CREATE TYPE post_category AS ENUM ('free', 'question', 'assessment', 'counseling');
CREATE TYPE report_reason AS ENUM ('profanity', 'spam', 'inappropriate', 'other');
CREATE TYPE report_status AS ENUM ('pending', 'resolved', 'dismissed');
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
CREATE TYPE target_type AS ENUM ('post', 'comment', 'user');
CREATE TYPE schedule_category AS ENUM ('class', 'academy', 'study', 'etc');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');

-- 1. schools
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  region VARCHAR(50) NOT NULL DEFAULT '',
  email_domain VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. users (id = Supabase Auth uid)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nickname VARCHAR(20),
  school_id UUID REFERENCES schools(id),
  grade SMALLINT CHECK (grade BETWEEN 1 AND 3),
  class_number SMALLINT,
  role user_role NOT NULL DEFAULT 'user',
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  suspended_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. posts
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id),
  category post_category NOT NULL DEFAULT 'free',
  title VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  like_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  report_count INT NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_school_created ON posts (school_id, created_at DESC);
CREATE INDEX idx_posts_school_category ON posts (school_id, category, created_at DESC);

-- 4. comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  like_count INT NOT NULL DEFAULT 0,
  report_count INT NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_post ON comments (post_id, created_at);

-- 5. likes
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type target_type NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);

-- 6. reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type target_type NOT NULL,
  target_id UUID NOT NULL,
  reason report_reason NOT NULL,
  detail TEXT,
  status report_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, target_type, target_id)
);

-- 7. challenges (공부 인증)
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id),
  content TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE INDEX idx_challenges_user_date ON challenges (user_id, date DESC);

-- 8. user_streaks (스트릭 캐시)
CREATE TABLE user_streaks (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak INT NOT NULL DEFAULT 0,
  max_streak INT NOT NULL DEFAULT 0,
  last_challenge_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 스트릭 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_streak()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_streaks (user_id, current_streak, max_streak, last_challenge_date)
  VALUES (NEW.user_id, 1, 1, NEW.date)
  ON CONFLICT (user_id) DO UPDATE SET
    current_streak = CASE
      WHEN user_streaks.last_challenge_date = NEW.date - 1
        THEN user_streaks.current_streak + 1
      WHEN user_streaks.last_challenge_date = NEW.date
        THEN user_streaks.current_streak
      ELSE 1
    END,
    max_streak = GREATEST(
      user_streaks.max_streak,
      CASE
        WHEN user_streaks.last_challenge_date = NEW.date - 1
          THEN user_streaks.current_streak + 1
        ELSE 1
      END
    ),
    last_challenge_date = NEW.date,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_streak
AFTER INSERT ON challenges
FOR EACH ROW EXECUTE FUNCTION update_streak();

-- 9. bucketlist
CREATE TABLE bucketlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id),
  content VARCHAR(200) NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_done BOOLEAN NOT NULL DEFAULT false,
  done_at TIMESTAMPTZ,
  me_too_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. bucket_reactions
CREATE TABLE bucket_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id UUID NOT NULL REFERENCES bucketlist(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bucket_id, user_id)
);

-- 11. career_results
CREATE TABLE career_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_result JSONB NOT NULL,
  ai_recommendation JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. schedules (개인 시간표)
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  category schedule_category NOT NULL DEFAULT 'etc',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  recurrence JSONB, -- {"days": [1,2,3,4,5]} = 월~금
  memo VARCHAR(500),
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_dday BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_schedules_user ON schedules (user_id, start_date);

-- 13. assessments (수행평가)
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id),
  subject VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  due_date DATE NOT NULL,
  grade SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assessments_school_due ON assessments (school_id, due_date);

-- 14. ai_usage
CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (user_id, date)
);

CREATE INDEX idx_ai_usage_user_date ON ai_usage (user_id, date);

-- AI 사용량 체크 함수
CREATE OR REPLACE FUNCTION check_ai_usage(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  usage_count INT;
BEGIN
  SELECT count INTO usage_count
  FROM ai_usage
  WHERE user_id = p_user_id AND date = CURRENT_DATE;

  IF usage_count IS NULL OR usage_count < 2 THEN
    INSERT INTO ai_usage (user_id, date, count)
    VALUES (p_user_id, CURRENT_DATE, 1)
    ON CONFLICT (user_id, date)
    DO UPDATE SET count = ai_usage.count + 1;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 15. school_requests
CREATE TABLE school_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES users(id),
  school_name VARCHAR(100) NOT NULL,
  region VARCHAR(50) NOT NULL DEFAULT '',
  status request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS 정책
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE bucketlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- users: 본인 정보 조회/수정, 같은 학교 유저 닉네임 조회
CREATE POLICY "users_select_own" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (id = auth.uid());

-- posts: 같은 학교 조회, 본인 삭제
CREATE POLICY "posts_select_school" ON posts FOR SELECT
  USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid()) AND deleted_at IS NULL AND is_hidden = false);
CREATE POLICY "posts_insert" ON posts FOR INSERT
  WITH CHECK (user_id = auth.uid() AND school_id = (SELECT school_id FROM users WHERE id = auth.uid()));
CREATE POLICY "posts_delete_own" ON posts FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "posts_update_own" ON posts FOR UPDATE USING (user_id = auth.uid());

-- comments: 같은 학교 게시글의 댓글만
CREATE POLICY "comments_select" ON comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON comments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "comments_delete_own" ON comments FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "comments_update_own" ON comments FOR UPDATE USING (user_id = auth.uid());

-- likes
CREATE POLICY "likes_select" ON likes FOR SELECT USING (true);
CREATE POLICY "likes_insert" ON likes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "likes_delete_own" ON likes FOR DELETE USING (user_id = auth.uid());

-- reports
CREATE POLICY "reports_insert" ON reports FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- challenges: 같은 학교 조회
CREATE POLICY "challenges_select_school" ON challenges FOR SELECT
  USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid()));
CREATE POLICY "challenges_insert" ON challenges FOR INSERT WITH CHECK (user_id = auth.uid());

-- bucketlist: 공개 또는 본인
CREATE POLICY "bucketlist_select" ON bucketlist FOR SELECT
  USING (is_public = true OR user_id = auth.uid());
CREATE POLICY "bucketlist_insert" ON bucketlist FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "bucketlist_update_own" ON bucketlist FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "bucketlist_delete_own" ON bucketlist FOR DELETE USING (user_id = auth.uid());

-- schedules: 공개 또는 본인
CREATE POLICY "schedules_select" ON schedules FOR SELECT
  USING (is_public = true OR user_id = auth.uid());
CREATE POLICY "schedules_insert" ON schedules FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "schedules_update_own" ON schedules FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "schedules_delete_own" ON schedules FOR DELETE USING (user_id = auth.uid());

-- assessments: 같은 학교 조회
CREATE POLICY "assessments_select_school" ON assessments FOR SELECT
  USING (school_id = (SELECT school_id FROM users WHERE id = auth.uid()));
CREATE POLICY "assessments_insert" ON assessments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "assessments_update_own" ON assessments FOR UPDATE USING (user_id = auth.uid());

-- ai_usage: 본인만
CREATE POLICY "ai_usage_select_own" ON ai_usage FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ai_usage_insert_own" ON ai_usage FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 초기 데이터: 테스트용 학교
-- ============================================================
INSERT INTO schools (name, region) VALUES ('함지고등학교', '서울');
