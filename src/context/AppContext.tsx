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
    dueDate: t.due_date,
    startTime: t.start_time,
    notes: t.notes ?? '',
    subtasks: (t.subtasks ?? []).map(toSubTask),
    createdAt: t.created_at,
  };
}

function toCategory(c: DbCategory): Category {
  return { id: c.id, name: c.name, color: c.color, description: c.description, isDefault: c.is_default };
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
  toggleSubTask: (todoId: string, subTaskId: string, opts?: { autoCompleteParent?: boolean }) => Promise<void>;
  updateSubtaskInline: (todoId: string, subTaskId: string, title: string) => Promise<void>;
  addSubtaskInline: (todoId: string, title: string, opts?: { autoCompleteParent?: boolean }) => Promise<void>;
  deleteSubtaskInline: (todoId: string, subTaskId: string, opts?: { autoCompleteParent?: boolean }) => Promise<void>;
  reorderTodos: (orderedIds: string[]) => Promise<void>;
  moveSubtasksToDate: (todoId: string, subtaskIds: string[], targetDate: string) => Promise<void>;
  addCategory: (name: string, color: string, description?: string) => Promise<void>;
  updateCategory: (id: string, updates: { name?: string; color?: string; description?: string | null }) => Promise<void>;
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
  // 앱 진입 시 defaultScreen으로 딱 한 번만 이동하기 위한 플래그.
  // (예전엔 user 객체 참조가 바뀔 때마다(토큰 자동 갱신 등) 이 효과가 다시 돌면서
  //  사용자가 어느 화면에 있든 자꾸 홈 화면으로 튕기는 버그가 있었음)
  const didSetInitialScreenRef = useRef(false);

  // ── 초기 데이터 로드 ────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setTodos([]); setCategories([]); setNotes([]);
      setSettings(DEFAULT_SETTINGS); setMonthlyGoals([]); setDDays([]); setNotices([]);
      setDataLoading(false);
      didSetInitialScreenRef.current = false;
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
        if (!didSetInitialScreenRef.current) {
          setCurrentScreen(s.defaultScreen as Screen);
          didSetInitialScreenRef.current = true;
        }
      }
    }).finally(() => setDataLoading(false));
    // user.id만 의존성으로 둬서, 토큰 자동 갱신처럼 user "객체"만 새로 생성되고
    // 실제 로그인 계정은 그대로인 경우에는 이 무거운 재조회 + 화면 이동이 일어나지 않게 함
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Todos ────────────────────────────────────────────────
  const addTodo = useCallback(async (fields: Omit<Todo, 'id' | 'createdAt'>) => {
    if (!user) return;
    const subtasksList = fields.subtasks ?? [];
    const row = await db.createTodo(user.id, {
      title: fields.title,
      completed: fields.completed,
      category_id: fields.categoryId,
      date: fields.date,
      due_date: fields.dueDate ?? null,
      start_time: fields.startTime ?? null,
      notes: fields.notes,
      // 새 항목은 항상 맨 끝에 오도록 sort_order를 명시적으로 지정.
      // (지정하지 않으면 DB 기본값 0이 겹쳐서 "입력 순서가 제멋대로" 보이는 문제가 있었음)
      sort_order: todos.length,
    });
    if (subtasksList.length > 0) {
      await db.replaceSubtasks(row.id, subtasksList);
    }
    const updated = await db.fetchTodos(user.id);
    setTodos(updated.map(toTodo));
  }, [user, todos.length]);

  const updateTodo = useCallback(async (id: string, updates: Partial<Omit<Todo, 'id' | 'createdAt'>>) => {
    if (!user) return;
    const dbUpdates: Parameters<typeof db.updateTodo>[1] = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
    if ('categoryId' in updates) dbUpdates.category_id = updates.categoryId ?? null;
    if ('date' in updates) dbUpdates.date = updates.date ?? null;
    if ('dueDate' in updates) dbUpdates.due_date = updates.dueDate ?? null;
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

  // opts.autoCompleteParent: 하위 항목을 전부 완료하면 큰 제목(할 일)도 자동으로 완료 처리.
  // 홈 화면에서만 이 동작을 켜고(TodoItem에 prop으로 전달), 저장소에서는 기존처럼 하위 항목과
  // 큰 제목의 완료 여부가 서로 영향을 주지 않도록 opts 없이 호출함.
  const toggleSubTask = useCallback(async (todoId: string, subTaskId: string, opts?: { autoCompleteParent?: boolean }) => {
    const todo = todos.find(t => t.id === todoId);
    const sub = todo?.subtasks.find(s => s.id === subTaskId);
    if (!todo || !sub) return;

    const updatedSubtasks = todo.subtasks.map(s => s.id === subTaskId ? { ...s, completed: !s.completed } : s);
    const shouldAutoComplete = Boolean(opts?.autoCompleteParent) && updatedSubtasks.length > 0;
    const newCompleted = shouldAutoComplete ? updatedSubtasks.every(s => s.completed) : todo.completed;

    setTodos(prev => prev.map(t => t.id === todoId ? { ...t, subtasks: updatedSubtasks, completed: newCompleted } : t));
    await db.updateSubtask(subTaskId, { completed: !sub.completed });
    if (shouldAutoComplete && newCompleted !== todo.completed) {
      await db.updateTodo(todoId, { completed: newCompleted });
    }
  }, [todos]);

  const updateSubtaskInline = useCallback(async (todoId: string, subTaskId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setTodos(prev => prev.map(t => {
      if (t.id !== todoId) return t;
      return { ...t, subtasks: t.subtasks.map(s => s.id === subTaskId ? { ...s, title: trimmed } : s) };
    }));
    await db.updateSubtask(subTaskId, { title: trimmed });
  }, []);

  const addSubtaskInline = useCallback(async (todoId: string, title: string, opts?: { autoCompleteParent?: boolean }) => {
    // 완료 처리돼 있던 큰 제목에 하위 항목이 새로 추가되면(=아직 안 끝난 일이 생긴 것) 완료 표시를 다시 해제
    const wasCompleted = todos.find(t => t.id === todoId)?.completed ?? false;
    const newSub = await db.createSubtask(todoId, title);
    setTodos(prev => prev.map(t =>
      t.id === todoId
        ? {
            ...t,
            subtasks: [...t.subtasks, { id: newSub.id, title: newSub.title, completed: false }],
            completed: opts?.autoCompleteParent ? false : t.completed,
          }
        : t
    ));
    if (opts?.autoCompleteParent && wasCompleted) {
      await db.updateTodo(todoId, { completed: false });
    }
  }, [todos]);

  const deleteSubtaskInline = useCallback(async (todoId: string, subTaskId: string, opts?: { autoCompleteParent?: boolean }) => {
    let autoCompleted: boolean | undefined;
    setTodos(prev => prev.map(t => {
      if (t.id !== todoId) return t;
      const subtasks = t.subtasks.filter(s => s.id !== subTaskId);
      const shouldAutoComplete = Boolean(opts?.autoCompleteParent) && subtasks.length > 0;
      const completed = shouldAutoComplete ? subtasks.every(s => s.completed) : t.completed;
      if (shouldAutoComplete) autoCompleted = completed;
      return { ...t, subtasks, completed };
    }));
    await db.deleteSubtask(subTaskId);
    if (autoCompleted !== undefined) await db.updateTodo(todoId, { completed: autoCompleted });
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

  // 저장소의 "큰 제목"은 진짜 할 일이 아니라 하위 항목들을 묶는 카테고리 같은 존재라서,
  // 하위 항목을 오늘(또는 특정 날짜)로 보낼 때 큰 제목 자체를 옮기면 안 되고, 그 날짜에
  // 이름이 같은 컨테이너가 이미 있으면 거기로 합치고 없으면 새로 만들어야 함.
  // (예전엔 보낼 때마다 매번 새 할 일을 만들어서, 여러 번 나눠 보내면 같은 이름의
  //  할 일이 오늘 화면에 여러 개로 흩어지는 문제가 있었음)
  const moveSubtasksToDate = useCallback(async (todoId: string, subtaskIds: string[], targetDate: string) => {
    const original = todos.find(t => t.id === todoId);
    if (!original || subtaskIds.length === 0) return;
    const idSet = new Set(subtaskIds);
    const moving = original.subtasks.filter(s => idSet.has(s.id));
    const remaining = original.subtasks.filter(s => !idSet.has(s.id));
    if (moving.length === 0) return;

    const existingTarget = todos.find(t =>
      t.id !== todoId && t.date === targetDate && t.title === original.title && t.categoryId === original.categoryId
    );

    if (existingTarget) {
      const existingIds = new Set(existingTarget.subtasks.map(s => s.id));
      const toAppend = moving.filter(s => !existingIds.has(s.id));
      if (toAppend.length > 0) {
        await updateTodo(existingTarget.id, { subtasks: [...existingTarget.subtasks, ...toAppend] });
      }
    } else {
      await addTodo({
        title: original.title,
        completed: false,
        categoryId: original.categoryId,
        date: targetDate,
        startTime: null,
        subtasks: moving,
        notes: '',
      });
    }

    // 큰 제목(컨테이너)은 저장소에 그대로 남기고, 옮긴 하위 항목만 뺌 (0개가 남아도 삭제하지 않음)
    await updateTodo(todoId, { subtasks: remaining });
  }, [todos, addTodo, updateTodo]);

  // ── Categories ───────────────────────────────────────────
  const addCategory = useCallback(async (name: string, color: string, description?: string) => {
    if (!user) return;
    const row = await db.createCategory(user.id, name, color, categories.length, description ?? null);
    setCategories(prev => [...prev, toCategory(row)]);
  }, [user, categories.length]);

  const updateCategory = useCallback(async (id: string, updates: { name?: string; color?: string; description?: string | null }) => {
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
      addTodo, updateTodo, deleteTodo, toggleTodo, toggleSubTask, updateSubtaskInline, addSubtaskInline, deleteSubtaskInline, reorderTodos, moveSubtasksToDate,
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
