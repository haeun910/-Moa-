-- ============================================================
-- 관리자 통계 - 개인정보(이메일, 할 일 내용 등)는 절대 노출하지 않고
-- 집계된 숫자만 반환. 관리자 계정만 호출 가능하도록 함수 안에서
-- 강제합니다 (RLS 우회용 SECURITY DEFINER이므로 이 체크가 유일한 방어선).
--
-- 아래 UUID는 003_notices.sql에서 쓴 것과 같은, 본인 계정의
-- auth.users.id 여야 합니다. src/lib/supabase.ts의 ADMIN_USER_ID와도
-- 반드시 같아야 합니다.
-- ============================================================
create or replace function public.get_admin_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if auth.uid() is null or auth.uid() <> '17478ff6-7e7a-419e-ba64-7bb9db8bbcea' then
    raise exception 'not authorized';
  end if;

  select json_build_object(
    'totalUsers',       (select count(*) from auth.users),
    'newUsersToday',    (select count(*) from auth.users where created_at >= date_trunc('day', now())),
    'newUsersThisWeek', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    'activeUsers7d',    (
      select count(distinct user_id) from (
        select user_id, updated_at as ts from public.todos
        union all
        select user_id, updated_at as ts from public.notes
      ) a where a.ts >= now() - interval '7 days'
    ),
    'activeUsers30d',   (
      select count(distinct user_id) from (
        select user_id, updated_at as ts from public.todos
        union all
        select user_id, updated_at as ts from public.notes
      ) a where a.ts >= now() - interval '30 days'
    ),
    'totalTodos',       (select count(*) from public.todos),
    'completedTodos',   (select count(*) from public.todos where completed),
    'totalNotes',       (select count(*) from public.notes),
    'totalCategories',  (select count(*) from public.categories)
  ) into result;

  return result;
end;
$$;

-- 로그인한 사용자는 누구나 "호출"은 할 수 있지만, 함수 안의 관리자 체크를
-- 통과하지 못하면 예외가 발생해 아무 데이터도 못 봅니다.
grant execute on function public.get_admin_stats() to authenticated;
