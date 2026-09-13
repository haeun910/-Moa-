-- D-Day 수정 지원(target_date는 기존 컬럼 그대로 update만 하면 됨, 별도 컬럼 불필요) +
-- 할 일을 D-Day로도 표시할 수 있는 플래그 추가
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS is_dday BOOLEAN NOT NULL DEFAULT false;
