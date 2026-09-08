export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  categoryId: string | null;
  date: string | null; // ISO date string YYYY-MM-DD or null
  startTime?: string | null; // HH:MM
  subtasks: SubTask[];
  createdAt: string;
  notes?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  isDefault?: boolean;
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
}

export type Screen = 'today' | 'calendar' | 'all' | 'notes' | 'settings' | 'categories' | 'terms' | 'privacy';

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
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}
