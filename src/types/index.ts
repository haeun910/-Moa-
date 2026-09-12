export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  categoryId: string | null;
  subcategoryId: string | null; // 카테고리 하위의 그룹 (예: "프로젝트" 안의 "재가센터 관리앱")
  date: string | null; // ISO date string YYYY-MM-DD or null
  dueDate?: string | null; // 마감일(작업할 날짜 date와는 별개) YYYY-MM-DD or null
  isDday?: boolean; // 체크하면 홈 화면 D-Day 목록에도 자동으로 나타남 (dueDate 또는 date를 기준일로 사용)
  startTime?: string | null; // HH:MM
  createdAt: string;
  notes?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  description?: string | null; // 저장소 화면에서만 노출되는 설명
  isDefault?: boolean;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  defaultScreen: 'today' | 'calendar' | 'all' | 'notes';
  notifications: boolean;
  listSortBy: 'manual' | 'date' | 'name'; // 목록 정렬 기준
  hideCompleted: boolean; // 완료된 항목 목록에서 숨기기
  hiddenCategoryIds: string[]; // 목록에서 숨길 카테고리
}

export type Screen = 'today' | 'calendar' | 'all' | 'notes' | 'settings' | 'categories' | 'terms' | 'privacy' | 'project';

export interface MonthlyGoal {
  id: string;
  month: string; // YYYY-MM
  title: string;
  completed: boolean;
}

export interface DDay {
  id: string;
  title: string;
  targetDate: string; // YYYY-MM-DD
  fromTodoId?: string; // 이 값이 있으면 할 일에서 자동으로 연동된 가상 D-Day (직접 수정/삭제 불가, 할 일 쪽에서 관리)
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}
