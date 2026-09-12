-- 설정 화면의 목록 표시 옵션(정렬 기준 / 완료 항목 숨기기 / 카테고리별 표시 여부)
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS list_sort_by TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS hide_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS hidden_category_ids UUID[] NOT NULL DEFAULT '{}';
