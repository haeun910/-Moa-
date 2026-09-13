-- ============================================================
-- 하위카테고리에 메모(notes) 추가
-- ============================================================
alter table public.subcategories add column if not exists notes text;
