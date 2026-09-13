-- 카테고리 설명(저장소 화면에서만 노출) + 할 일 마감일(작업할 날짜와는 별개) 추가
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS due_date DATE DEFAULT NULL;
