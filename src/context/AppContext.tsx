import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, ADMIN_USER_ID } from '../lib/supabase';
import type { DbTodo, DbCategory, DbNote, DbSettings, DbSubtask, DbMonthlyGoal, DbDDay, DbNotice } from '../lib/supabase';
import * as db from '../lib/db';
import { useAuth } from './AuthContext';
import { format } from 'date-fns';
import type { Todo, Category, Note, Settings, SubTask, Screen, MonthlyGoal, DDay, Notice } from '../types';

// ── DB 행 → 앱 타입 변환 ──────────────────────────────────
function toSubTask(s: DbSubtask): SubTask {
  return { id: s.id, title: s.title, completed: s.completed };
}

function toTodo(t: DbTodo): Todo {
  return {
    id: t.id,
    title: t.title,
    completed: t.completed,
    categoryId: t.category_id,
    date: t.date,
    startTime: t.start_time,
    notes: t.notes ?? '',
    subtasks: (t.subtasks ?? []).map(toSubTask),
    createdAt: t.created_at,
  };
}

function toCategory(c: DbCategory): Category {
  return { id: c.id, name: c.name, color: c.color, isDefault: c.is_default };
}

function toNote(n: DbNote): Note {
  return { id: n.id, title: n.title, content: n.content, createdAt: n.created_at, updatedAt: n.updated_at };
}

function toMonthlyGoal(g: DbMonthlyGoal): MonthlyGoal {
  return { id: g.id, month: g.month, title: g.title, completed: g.completed };
}

function toDDay(d: DbDDay): DDay {
  return { id: d.id, title: d.title, targetDate: d.target_date };
}

function toNotice(n: DbNotice): Notice {
  return { id: n.id, title: n.title, content: n.content, createdAt: n.created_at, updatedAt: n.updated_at };
}

function toSettings(s: DbSettings): Settings {
  return { theme: s.theme, defaultScreen: s.default_screen, notifications: s.notifications };
}

// ── Context 타입 ──────────────────────────────────────────
interface AppContextType {
  todos: Todo[];
  categories: Category[];
  notes: Note[];
  settings: Settings;
  monthlyGoals: MonthlyGoal[];
  ddays: DDay[];
  notices: Notice[];
  isAdmin: boolean;
  currentScreen: Screen;
  selectedDate: string;
  dataLoading: boolean;
  addTodo: (fields: Omit<Todo, 'id' | 'createdAt'>) => Promise<void>;
  updateTodo: (id: string, updates: Partial<Omit<Todo, 'id' | 'createdAt'>>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  toggleSubTask: (todoId: string, subTaskId: string) => Promise<void>;
  addSubtaskInline: (todoId: string, title: string) => Promise<void>;
  deleteSubtaskInline: (todoId: string, subTaskId: string) => Promise<void>;
  reorderTodos: (orderedIds: string[]) => Promise<void>;
  addCategory: (name: string, color: string) => Promise<void>;
  updateCategory: (id: string, updates: { name?: string; color?: string }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  reorderCategories: (orderedIds: string[]) => Promise<void>;
  addNote: (title: string, content: string) => Promise<void>;
  updateNote: (id: string, updates: { title?: string; content?: string }) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  addMonthlyGoal: (month: string, title: string) => Promise<void>;
  toggleMonthlyGoal: (id: string) => Promise<void>;
  deleteMonthlyGoal: (id: string) => Promise<void>;
  addDDay: (title: string, targetDate: string) => Promise<void>;
  deleteDDay: (id: string) => Promise<void>;
  addNotice: (title: string, content: string) => Promise<void>;
  updateNotice: (id: string, updates: { title?: string; content?: string }) => Promise<void>;
  deleteNotice: (id: string) => Promise<void>;
  setCurrentScreen: (screen: Screen) => void;
  setSelectedDate: (date: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  defaultScreen: 'today',
  notifications: false,
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [monthlyGoals, setMonthlyGoals] = useState<MonthlyGoal[]>([]);
  const [ddays, setDDays] = useState<DDay[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const isAdmin = user?.id === ADMIN_USER_ID;
  const [currentScreen, setCurrentScreen] = useState<Screen>('today');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dataLoading, setDataLoading] = useState(true);

  const channelRef = useRef<RealtimeChannel | null>(null);

  // ── 초기 데이터 로드 ────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setTodos([]); setCategories([]); setNotes([]);
      setSettings(DEFAULT_SETTINGS); setMonthlyGoals([]); setDDays([]); setNotices([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    Promise.all([
      db.fetchTodos(user.id),
      db.fetchCategories(user.id),
      db.fetchNotes(user.id),
      db.fetchSettings(user.id),
      db.fetchMonthlyGoals(user.id),
      db.fetchDDays(user.id),
      db.fetchNotices().catch(() => []), // notices 테이블이 아직 없어도(마이그레이션 전) 나머지는 정상 로드되도록
    ]).then(([rawTodos, rawCats, rawNotes, rawSettings, rawGoals, rawDDays, rawNotices]) => {
      setTodos(rawTodos.map(toTodo));
      setCategories(rawCats.map(toCategory));
      setNotes(rawNotes.map(toNote));
      setMonthlyGoals(rawGoals.map(toMonthlyGoal));
      setDDays(rawDDays.map(toDDay));
      setNotices(rawNotices.map(toNotice));
      if (rawSettings) {
        const s = toSettings(rawSettings);
        setSettings(s);
        setCurrentScreen(s.defaultScreen as Screen);
      }
    }).finally(() => setDataLoading(false));
  }, [user]);

  // ── 테마 적용 ───────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') root.classList.add('dark');
    else if (settings.theme === 'light') root.classList.remove('dark');
    else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) root.classList.add('dark');
      else root.classList.remove('dark');
    }
  }, [settings.theme]);

  // ── Realtime 구독 ────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      channelRef.current?.unsubscribe();
      return;
    }

    const channel = supabase
      .channel(`user-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos', filter: `user_id=eq.${user.id}` },
        async () => {
          const rows = await db.fetchTodos(user.id);
          setTodos(rows.map(toTodo));
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' },
        async () => {
          const rows = await db.fetchTodos(user.id);
          setTodos(rows.map(toTodo));
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${user.id}` },
        async () => {
          const rows = await db.fetchCategories(user.id);
          setCategories(rows.map(toCategory));
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${user.id}` },
        async () => {
          const rows = await db.fetchNotes(user.id);
          setNotes(rows.map(toNote));
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' },
        async () => {
          const rows = await db.fetchNotices().catch(() => []);
          setNotices(rows.map(toNotice));
        })
      .subscribe();

    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [user]);

  // ── Todos ────────────────────────────────────────────────
  const addTodo = useCallback(async (fields: Omit<Todo, 'id' | 'createdAt'>) => {
    if (!user) return;
    const subtasksList = fields.subtasks ?? [];
    const row = await db.createTodo(user.id, {
      title: fields.title,
      completed: fields.completed,
      category_id: fields.categoryId,
      date: fields.date,
      start_time: fields.startTime ?? null,
      notes: fields.notes,
    });
    if (subtasksList.length > 0) {
      await db.replaceSubtasks(row.id, subtasksList);
    }
    const updated = await db.fetchTodos(user.id);
    setTodos(updated.map(toTodo));
  }, [user]);

  const updateTodo = useCallback(async (id: string, updates: Partial<Omit<Todo, 'id' | 'createdAt'>>) => {
    if (!user) return;
    const dbUpdates: Parameters<typeof db.updateTodo>[1] = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
    if ('categoryId' in updates) dbUpdates.category_id = updates.categoryId ?? null;
    if ('date' in updates) dbUpdates.date = updates.date ?? null;
    if ('startTime' in updates) dbUpdates.start_time = updates.startTime ?? null;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    await db.updateTodo(id, dbUpdates);

    if (updates.subtasks !== undefined) {
      await db.replaceSubtasks(id, updates.subtasks);
    }
    const refreshed = await db.fetchTodos(user.id);
    setTodos(refreshed.map(toTodo));
  }, [user]);

  const deleteTodo = useCallback(async (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
    await db.deleteTodo(id);
  }, []);

  const toggleTodo = useCallback(async (id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    const todo = todos.find(t => t.id === id);
    if (todo) await db.updateTodo(id, { completed: !todo.completed });
  }, [todos]);

  const toggleSubTask = useCallback(async (todoId: string, subTaskId: string) => {
    setTodos(prev => prev.map(t => {
      if (t.id !== todoId) return t;
      return { ...t, subtasks: t.subtasks.map(s => s.id === subTaskId ? { ...s, completed: !s.completed } : s) };
    }));
    const sub = todos.find(t => t.id === todoId)?.subtasks.find(s => s.id === subTaskId);
    if (sub) await db.updateSubtask(subTaskId, { completed: !sub.completed });
  }, [todos]);

  const addSubtaskInline = useCallback(async (todoId: string, title: string) => {
    const newSub = await db.createSubtask(todoId, title);
    setTodos(prev => prev.map(t =>
      t.id === todoId
        ? { ...t, subtasks: [...t.subtasks, { id: newSub.id, title: newSub.title, completed: false }] }
        : t
    ));
  }, []);

  const deleteSubtaskInline = useCallback(async (todoId: string, subTaskId: string) => {
    setTodos(prev => prev.map(t =>
      t.id === todoId ? { ...t, subtasks: t.subtasks.filter(s => s.id !== subTaskId) } : t
    ));
    await db.deleteSubtask(subTaskId);
  }, []);

  const reorderTodos = useCallback(async (orderedIds: string[]) => {
    setTodos(prev => {
      const map = new Map(prev.map(t => [t.id, t]));
      const reordered = orderedIds.map(id => map.get(id)!).filter(Boolean);
      const rest = prev.filter(t => !orderedIds.includes(t.id));
      return [...reordered, ...rest];
    });
    await Promise.all(orderedIds.map((id, i) => db.updateTodo(id, { sort_order: i })));
  }, []);

  // ── Categories ───────────────────────────────────────────
  const addCategory = useCallback(async (name: string, color: string) => {
    if (!user) return;
    const row = await db.createCategory(user.id, name, color, categories.length);
    setCategories(prev => [...prev, toCategory(row)]);
  }, [user, categories.length]);

  const updateCategory = useCallback(async (id: string, updates: { name?: string; color?: string }) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    await db.updateCategory(id, updates);
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    setTodos(prev => prev.map(t => t.categoryId === id ? { ...t, categoryId: null } : t));
    await db.deleteCategory(id);
  }, []);

  const reorderCategories = useCallback(async (orderedIds: string[]) => {
    setCategories(prev => {
      const map = new Map(prev.map(c => [c.id, c]));
      return orderedIds.map(id => map.get(id)!).filter(Boolean);
    });
    await Promise.all(orderedIds.map((id, i) => db.updateCategory(id, { sort_order: i })));
  }, []);

  // ── Notes ────────────────────────────────────────────────
  const addNote = useCallback(async (title: string, content: string) => {
    if (!user) return;
    const row = await db.createNote(user.id, title, content);
    setNotes(prev => [toNote(row), ...prev]);
  }, [user]);

  const updateNote = useCallback(async (id: string, updates: { title?: string; content?: string }) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n));
    await db.updateNote(id, updates);
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    await db.deleteNote(id);
  }, []);

  // ── Monthly Goals ────────────────────────────────
  const addMonthlyGoal = useCallback(async (month: string, title: string) => {
    if (!user) return;
    const row = await db.createMonthlyGoal(user.id, month, title);
    setMonthlyGoals(prev => [...prev, toMonthlyGoal(row)]);
  }, [user]);

  const toggleMonthlyGoal = useCallback(async (id: string) => {
    setMonthlyGoals(prev => prev.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
    const goal = monthlyGoals.find(g => g.id === id);
    if (goal) await db.updateMonthlyGoal(id, { completed: !goal.completed });
  }, [monthlyGoals]);

  const deleteMonthlyGoal = useCallback(async (id: string) => {
    setMonthlyGoals(prev => prev.filter(g => g.id !== id));
    await db.deleteMonthlyGoal(id);
  }, []);

  // ── D-Days ───────────────────────────────────────
  const addDDay = useCallback(async (title: string, targetDate: string) => {
    if (!user) return;
    const row = await db.createDDay(user.id, title, targetDate);
    setDDays(prev => [...prev, toDDay(row)].sort((a, b) => a.targetDate.localeCompare(b.targetDate)));
  }, [user]);

  const deleteDDay = useCallback(async (id: string) => {
    setDDays(prev => prev.filter(d => d.id !== id));
    await db.deleteDDay(id);
  }, []);

  // ── 공지사항 ───────────────────────────────────────
  const addNotice = useCallback(async (title: string, content: string) => {
    const row = await db.createNotice(title, content);
    setNotices(prev => [toNotice(row), ...prev]);
  }, []);

  const updateNotice = useCallback(async (id: string, updates: { title?: string; content?: string }) => {
    setNotices(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n));
    await db.updateNotice(id, updates);
  }, []);

  const deleteNotice = useCallback(async (id: string) => {
    setNotices(prev => prev.filter(n => n.id !== id));
    await db.deleteNotice(id);
  }, []);

  // ── Settings ─────────────────────────────────────────────
  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    if (!user) return;
    setSettings(prev => ({ ...prev, ...updates }));
    const dbUpdates: Parameters<typeof db.upsertSettings>[1] = {};
    if (updates.theme) dbUpdates.theme = updates.theme;
    if (updates.defaultScreen) dbUpdates.default_screen = updates.defaultScreen;
    if (updates.notifications !== undefined) dbUpdates.notifications = updates.notifications;
    await db.upsertSettings(user.id, dbUpdates);
  }, [user]);

  return (
    <AppContext.Provider value={{
      todos, categories, notes, settings, monthlyGoals, ddays, notices, isAdmin, currentScreen, selectedDate, dataLoading,
      addTodo, updateTodo, deleteTodo, toggleTodo, toggleSubTask, addSubtaskInline, deleteSubtaskInline, reorderTodos,
      addCategory, updateCategory, deleteCategory, reorderCategories,
      addNote, updateNote, deleteNote,
      updateSettings,
      addMonthlyGoal, toggleMonthlyGoal, deleteMonthlyGoal,
      addDDay, deleteDDay,
      addNotice, updateNotice, deleteNotice,
      setCurrentScreen, setSelectedDate,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
