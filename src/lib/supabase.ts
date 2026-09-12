import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// .env가 없거나 잘못돼도 앱 자체는 로드되어야 하므로(흰 화면 방지),
// 여기서 throw하지 않고 App.tsx가 이 플래그를 보고 안내 화면을 보여줍니다.
export const isSupabaseConfigured = Boolean(url && key);

// 공지사항을 작성/수정/삭제할 수 있는 관리자 계정.
// supabase/migrations/003_notices.sql의 RLS 정책과 반드시 같은 값이어야 합니다.
export const ADMIN_USER_ID = '17478ff6-7e7a-419e-ba64-7bb9db8bbcea';

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

// ────────────────────────────────────────────────
// DB 타입 (Supabase 반환 행 기준)
// ────────────────────────────────────────────────
export interface DbCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  description: string | null;
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface DbSubtask {
  id: string;
  todo_id: string;
  title: string;
  completed: boolean;
  sort_order: number;
  created_at: string;
}

export interface DbTodo {
  id: string;
  user_id: string;
  title: string;
  completed: boolean;
  category_id: string | null;
  date: string | null;
  due_date: string | null;
  start_time: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  subtasks?: DbSubtask[];
}

export interface DbNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DbMonthlyGoal {
  id: string;
  user_id: string;
  month: string;
  title: string;
  completed: boolean;
  sort_order: number;
  created_at: string;
}

export interface DbDDay {
  id: string;
  user_id: string;
  title: string;
  target_date: string;
  created_at: string;
}

export interface DbNotice {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DbSettings {
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  default_screen: 'today' | 'calendar' | 'all' | 'notes';
  notifications: boolean;
  updated_at: string;
}

// 관리자 통계 (get_admin_stats RPC 반환값) - 개인정보 없이 집계된 숫자만
export interface AdminStats {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  activeUsers7d: number;
  activeUsers30d: number;
  totalTodos: number;
  completedTodos: number;
  totalNotes: number;
  totalCategories: number;
}
