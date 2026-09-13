-- ============================================================
-- 공지사항(notices) - 관리자만 작성, 모든 로그인 사용자가 읽음
-- ============================================================
create table if not exists public.notices (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  content     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace trigger notices_updated_at
  before update on public.notices
  for each row execute function public.set_updated_at();

alter table public.notices enable row level security;

-- 로그인한 모든 사용자가 읽을 수 있음
create policy "notices: everyone can read" on public.notices
  for select using (auth.uid() is not null);

-- 관리자(앱 운영자)만 작성/수정/삭제 가능
-- 아래 UUID를 본인 Supabase 계정의 auth.users.id로 바꿔서 실행하세요.
create policy "notices: admin can write" on public.notices
  for insert with check (auth.uid() = '17478ff6-7e7a-419e-ba64-7bb9db8bbcea');

create policy "notices: admin can update" on public.notices
  for update using (auth.uid() = '17478ff6-7e7a-419e-ba64-7bb9db8bbcea');

create policy "notices: admin can delete" on public.notices
  for delete using (auth.uid() = '17478ff6-7e7a-419e-ba64-7bb9db8bbcea');

alter publication supabase_realtime add table public.notices;
