import { useState, useRef } from 'react';
import { Plus, Send, ChevronLeft, ChevronRight, X, Check, Flag, Trash2, GripVertical, CalendarPlus, LayoutDashboard, BarChart3, Clock10, Megaphone, ListTodo } from 'lucide-react';
import MyBoardPanel from '../components/MyBoardPanel';
import AchievementModal from '../components/AchievementModal';
import NoticeModal from '../components/NoticeModal';
import GoalModal from '../components/GoalModal';
import DDayModal from '../components/DDayModal';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths, parseISO,
  differenceInCalendarDays, addWeeks, subWeeks, isToday as dateFnsIsToday,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useApp } from '../context/AppContext';
import TodoList from '../components/TodoList';
import TodoModal from '../components/TodoModal';
import CategoryFilter from '../components/CategoryFilter';
import type { Todo } from '../types';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// ── 드래그 가능한 저장소 아이템 (전체 영역 드래그) ──
function DraggableRepoItem({ todo }: { todo: Todo }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: todo.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 px-2 py-2 rounded-lg transition-all cursor-grab active:cursor-grabbing touch-none select-none text-left ${
        isDragging
          ? 'opacity-40 bg-leaf-50 dark:bg-leaf-900/20'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
    >
      <GripVertical size={13} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
      <span className="flex-1 text-sm text-left text-gray-700 dark:text-gray-300 truncate">{todo.title}</span>
      {todo.subtasks.length > 0 && (
        <span className="flex-shrink-0 flex items-center gap-0.5 text-[10px] font-semibold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md">
          <ListTodo size={9} />
          {todo.subtasks.filter(s => s.completed).length}/{todo.subtasks.length}
        </span>
      )}
    </div>
  );
}

// ── 드롭 가능한 패널 영역 ──
function DroppableDatePanel({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'date-panel' });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 overflow-y-auto px-5 pt-3 pb-28 transition-colors rounded-xl ${
        isOver && isOpen ? 'bg-leaf-50 dark:bg-leaf-900/10' : ''
      }`}
    >
      {children}
    </div>
  );
}

export default function TodayPage() {
  const {
    todos, addTodo, updateTodo, toggleTodo, selectedDate, setSelectedDate,
    monthlyGoals, toggleMonthlyGoal, deleteMonthlyGoal,
    ddays, deleteDDay, notices, setCurrentScreen,
  } = useApp();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [viewMonth, setViewMonth] = useState(new Date());

  // 달력 월 기준 목표
  const currentMonth = format(viewMonth, 'yyyy-MM');
  const monthGoals = monthlyGoals.filter(g => g.month === currentMonth);
  const completedGoals = monthGoals.filter(g => g.completed).length;

  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editTodo, setEditTodo] = useState<Todo | undefined>();
  const [panelOpen, setPanelOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);
  const quickInputRef = useRef<HTMLInputElement>(null);

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showDdayModal, setShowDdayModal] = useState(false);
  const [ddayPopoverDate, setDdayPopoverDate] = useState<string | null>(null);
  const [calView, setCalView] = useState<'month' | 'week'>('month');
  const [weekRef, setWeekRef] = useState(new Date());
  const [weekAddDate, setWeekAddDate] = useState<string | null>(null);
  const [weekAddTitle, setWeekAddTitle] = useState('');
  const [showBoard, setShowBoard] = useState(false);
  const [showAchievement, setShowAchievement] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const [lastSeenNotice, setLastSeenNotice] = useState(() => localStorage.getItem('notice-last-seen') ?? '');
  const hasUnreadNotice = notices.length > 0 && notices[0].createdAt !== lastSeenNotice;

  function openNotice() {
    setShowNotice(true);
    if (notices[0]) {
      localStorage.setItem('notice-last-seen', notices[0].createdAt);
      setLastSeenNotice(notices[0].createdAt);
    }
  }

  // DnD
  const [draggingTodo, setDraggingTodo] = useState<Todo | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth)),
    end: endOfWeek(endOfMonth(viewMonth)),
  });
  const weekCount = Math.ceil(days.length / 7);

  const selectedTodos = todos.filter(t => t.date === selectedDate);
  const filtered = activeCatId ? selectedTodos.filter(t => t.categoryId === activeCatId) : selectedTodos;

  // 저장소 = 날짜 없는 할 일
  const repoTodos = todos.filter(t => !t.date);

  function handleDayClick(dateStr: string) {
    setDdayPopoverDate(null);
    if (selectedDate === dateStr && panelOpen) setPanelOpen(false);
    else { setSelectedDate(dateStr); setPanelOpen(true); }
  }

  function openEdit(todo: Todo) { setEditTodo(todo); setShowModal(true); }
  function closeModal() { setShowModal(false); setEditTodo(undefined); }

  async function handleQuickAdd() {
    const title = quickTitle.trim();
    if (!title || quickLoading) return;
    setQuickLoading(true);
    try {
      await addTodo({ title, completed: false, categoryId: activeCatId, date: selectedDate, startTime: null, subtasks: [], notes: '' });
      setQuickTitle('');
      quickInputRef.current?.focus();
    } finally { setQuickLoading(false); }
  }

  function ddayLabel(targetDate: string): string {
    const diff = differenceInCalendarDays(parseISO(targetDate), new Date());
    if (diff === 0) return 'D-Day';
    if (diff > 0) return `D-${diff}`;
    return `D+${Math.abs(diff)}`;
  }

  function handleDragStart(event: DragStartEvent) {
    const todo = todos.find(t => t.id === event.active.id);
    setDraggingTodo(todo ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setDraggingTodo(null);
    if (event.over?.id === 'date-panel' && event.active.id && panelOpen) {
      await updateTodo(event.active.id as string, { date: selectedDate });
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
    <div className="h-screen pb-[62px] overflow-hidden flex flex-col lg:flex-row">

      {/* ── 달력 + 저장소 영역 ── */}
      <div className={`flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${panelOpen ? 'h-1/2 lg:h-auto lg:flex-1' : 'flex-1'}`}>

        <div className="flex-1 flex flex-col px-5 pt-4 pb-4 min-h-0">

          {/* ── 목표 + D-Day ── */}
          <div className="flex-shrink-0 grid grid-cols-2 gap-3 mb-3">

            {/* 이번달 목표 */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-3.5 flex flex-col gap-2 min-h-[168px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Flag size={13} className="text-leaf-500" />
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {format(viewMonth, 'M월')} 목표
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-400">{completedGoals}/{monthGoals.length}</span>
                  <button onClick={() => setShowGoalModal(true)} aria-label="목표 추가"
                    className="w-5 h-5 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                    <Plus size={11} />
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-1.5 overflow-y-auto">
                {monthGoals.length === 0 && (
                  <p className="text-xs text-gray-300 dark:text-gray-600">목표를 추가해보세요</p>
                )}
                {monthGoals.map(g => (
                  <div key={g.id} className="flex items-center gap-2 group">
                    <button onClick={() => toggleMonthlyGoal(g.id)}
                      aria-label={g.completed ? '완료 취소' : '완료 처리'}
                      className={`flex-shrink-0 w-[18px] h-[18px] rounded border flex items-center justify-center transition-colors ${
                        g.completed ? 'bg-leaf-300 border-leaf-300' : 'border-gray-300 dark:border-gray-600'
                      }`}>
                      {g.completed && <Check size={10} className="text-leaf-800" strokeWidth={3} />}
                    </button>
                    <span className={`flex-1 text-xs leading-tight ${g.completed ? 'line-through text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}`}>
                      {g.title}
                    </span>
                    <button onClick={() => deleteMonthlyGoal(g.id)} aria-label="목표 삭제"
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* D-Day */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-3.5 flex flex-col gap-2 min-h-[168px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">D-Day</span>
                <button onClick={() => setShowDdayModal(true)} aria-label="D-Day 추가"
                  className="w-5 h-5 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                  <Plus size={11} />
                </button>
              </div>

              <div className="flex-1 space-y-1.5 overflow-y-auto">
                {ddays.length === 0 && (
                  <p className="text-xs text-gray-300 dark:text-gray-600">디데이를 추가해보세요</p>
                )}
                {ddays.map(d => (
                  <div key={d.id} className="flex items-center gap-2 group">
                    <Flag size={10} className="flex-shrink-0 text-leaf-500" />
                    <span className={`flex-shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded-md min-w-[44px] text-center ${
                      differenceInCalendarDays(parseISO(d.targetDate), new Date()) >= 0
                        ? 'bg-leaf-50 dark:bg-leaf-900/30 text-leaf-600 dark:text-leaf-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                    }`}>{ddayLabel(d.targetDate)}</span>
                    <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">{d.title}</span>
                    <button onClick={() => deleteDDay(d.id)} aria-label="D-Day 삭제"
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 뷰 탭 + 네비 ── */}
          <div className="flex-shrink-0 flex items-center justify-between mb-2">
            {/* 월/주 탭 + 네비 */}
            <div className="flex items-center gap-2">
              {/* 월/주 탭 */}
              <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-xs font-semibold">
                <button
                  onClick={() => setCalView('month')}
                  className={`px-3 py-1.5 transition-colors ${calView === 'month' ? 'bg-leaf-300 text-leaf-800' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >월</button>
                <button
                  onClick={() => setCalView('week')}
                  className={`px-3 py-1.5 transition-colors ${calView === 'week' ? 'bg-leaf-300 text-leaf-800' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >주</button>
              </div>
              {calView === 'month' ? (
                <>
                  <button onClick={() => setViewMonth(m => subMonths(m, 1))} aria-label="이전 달"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <ChevronLeft size={15} />
                  </button>
                  <h1 className="text-base font-bold text-gray-900 dark:text-white">
                    {format(viewMonth, 'yyyy년 M월', { locale: ko })}
                  </h1>
                  <button onClick={() => setViewMonth(m => addMonths(m, 1))} aria-label="다음 달"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <ChevronRight size={15} />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setWeekRef(w => subWeeks(w, 1))} aria-label="이전 주"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <ChevronLeft size={15} />
                  </button>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {format(startOfWeek(weekRef, { weekStartsOn: 0 }), 'M.d')} - {format(endOfWeek(weekRef, { weekStartsOn: 0 }), 'M.d')}
                  </span>
                  <button onClick={() => setWeekRef(w => addWeeks(w, 1))} aria-label="다음 주"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <ChevronRight size={15} />
                  </button>
                </>
              )}
              <button onClick={() => { setViewMonth(new Date()); setWeekRef(new Date()); setSelectedDate(todayStr); setPanelOpen(true); }}
                className="px-2 h-7 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                오늘
              </button>
            </div>
            {/* 공지사항 / 내보드 / 성취리포트 */}
            <div className="flex items-center gap-1">
              <button onClick={openNotice} aria-label="공지사항" title="공지사항"
                className="relative flex items-center justify-center w-7 h-7 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors">
                <Megaphone size={13} />
                {hasUnreadNotice && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white dark:border-gray-950" />
                )}
              </button>
              <button onClick={() => setShowBoard(true)}
                className="flex items-center gap-1 px-2.5 h-7 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors">
                <LayoutDashboard size={13} />
                내 보드
              </button>
              <button onClick={() => setShowAchievement(true)}
                className="flex items-center gap-1 px-2.5 h-7 rounded-lg text-xs font-semibold text-leaf-600 dark:text-leaf-400 hover:bg-leaf-50 dark:hover:bg-leaf-900/20 border border-leaf-200 dark:border-leaf-800 transition-colors">
                <BarChart3 size={13} />
                성취 리포트
              </button>
            </div>
          </div>

          {/* ── 달력 / 주간 카드 ── */}
          {calView === 'month' ? (
            <div className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden flex flex-col transition-all duration-300 ease-in-out ${
              panelOpen ? 'flex-shrink-0 h-[320px] md:flex-1 md:h-auto md:min-h-[260px]' : 'flex-1 min-h-0'
            }`}>
              <div className="flex-shrink-0 grid grid-cols-7 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                {DAY_LABELS.map((d, i) => (
                  <div key={d} className={`py-1.5 text-center text-[11px] font-semibold ${
                    i === 0 ? 'text-red-400' : i === 6 ? 'text-leaf-400' : 'text-gray-400'
                  }`}>{d}</div>
                ))}
              </div>
              <div className="flex-1 grid grid-cols-7" style={{ gridTemplateRows: `repeat(${weekCount}, 1fr)` }}>
                {days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate && panelOpen;
                  const inMonth = isSameMonth(day, viewMonth);
                  const dayTodos = todos.filter(t => t.date === dateStr);
                  const dayDdays = ddays.filter(d => d.targetDate === dateStr);
                  const dow = day.getDay();
                  return (
                    <button key={dateStr} onClick={() => handleDayClick(dateStr)}
                      className={`relative flex flex-col items-start p-1.5 border-r border-b border-gray-100 dark:border-gray-800 transition-colors text-left ${
                        inMonth ? '' : 'opacity-25'
                      } ${isSelected ? 'bg-leaf-50 dark:bg-leaf-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}
                    >
                      {dayDdays.length > 0 && (
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label="이 날의 디데이 보기"
                          onClick={e => { e.stopPropagation(); setDdayPopoverDate(v => v === dateStr ? null : dateStr); }}
                          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-leaf-300 text-leaf-800 flex items-center justify-center z-10 shadow-sm"
                        >
                          <Flag size={9} strokeWidth={2.5} />
                        </span>
                      )}
                      <span className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-md text-[11px] font-bold mb-0.5 ${
                        isSelected ? 'bg-leaf-300 text-leaf-800'
                        : isToday ? 'bg-leaf-300 text-leaf-800'
                        : dow === 0 ? 'text-red-500 font-bold' : dow === 6 ? 'text-leaf-600 font-bold' : 'text-gray-800 dark:text-gray-100'
                      }`}>
                        {format(day, 'd')}
                      </span>
                      <div className="w-full space-y-0.5 overflow-hidden">
                        {dayTodos.slice(0, 2).map(t => (
                          <div key={t.id} className={`w-full text-[9px] leading-tight px-1 py-0.5 rounded truncate ${
                            t.completed ? 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                            : 'bg-leaf-50 dark:bg-leaf-900/30 text-leaf-700 dark:text-leaf-300'
                          }`}>{t.title}</div>
                        ))}
                        {dayTodos.length > 2 && <div className="text-[9px] text-gray-400 pl-0.5">+{dayTodos.length - 2}</div>}
                      </div>
                      {ddayPopoverDate === dateStr && (
                        <div
                          role="presentation"
                          onClick={e => e.stopPropagation()}
                          className="absolute top-6 right-0 z-30 w-40 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-2 space-y-1"
                        >
                          {dayDdays.map(d => (
                            <div key={d.id} className="flex items-center gap-1.5">
                              <Flag size={10} className="flex-shrink-0 text-leaf-500" />
                              <span className="flex-1 text-[11px] font-semibold text-gray-700 dark:text-gray-200 truncate">{d.title}</span>
                              <span className="text-[10px] font-bold text-leaf-600 dark:text-leaf-400 flex-shrink-0">{ddayLabel(d.targetDate)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── 주간 뷰 (인라인) ── */
            <div className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden flex flex-col transition-all duration-300 ease-in-out ${
              panelOpen ? 'flex-shrink-0 h-[320px] md:flex-1 md:h-auto md:min-h-[260px]' : 'flex-1 min-h-0'
            }`}>
              <div className="flex-1 overflow-auto p-2">
                <div className="grid grid-cols-7 gap-1.5 h-full" style={{ minHeight: '220px' }}>
                  {eachDayOfInterval({
                    start: startOfWeek(weekRef, { weekStartsOn: 0 }),
                    end: endOfWeek(weekRef, { weekStartsOn: 0 }),
                  }).map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayTodos = todos.filter(t => t.date === dateStr);
                    const completedCount = dayTodos.filter(t => t.completed).length;
                    const dow = day.getDay();
                    const isToday = dateFnsIsToday(day);
                    return (
                      <div key={dateStr}
                        className={`flex flex-col rounded-xl p-2 ${
                          isToday
                            ? 'bg-leaf-50 dark:bg-leaf-900/20 ring-2 ring-leaf-400'
                            : 'bg-gray-50 dark:bg-gray-800/40'
                        }`}
                      >
                        <div className="text-center mb-1.5 flex-shrink-0">
                          <p className={`text-[9px] font-bold tracking-wide ${
                            dow === 0 ? 'text-red-500' : dow === 6 ? 'text-leaf-500' : 'text-gray-400'
                          }`}>{DAY_LABELS[dow]}</p>
                          <p className={`text-base font-bold leading-tight ${
                            isToday ? 'text-leaf-600'
                            : dow === 0 ? 'text-red-500'
                            : dow === 6 ? 'text-leaf-500'
                            : 'text-gray-800 dark:text-gray-100'
                          }`}>{format(day, 'd')}</p>
                          {dayTodos.length > 0 && (
                            <p className="text-[9px] text-gray-400">{completedCount}/{dayTodos.length}</p>
                          )}
                        </div>
                        <div className="flex-1 space-y-1 overflow-y-auto">
                          {dayTodos.map(todo => (
                            <div key={todo.id}
                              className="flex items-start gap-1 cursor-pointer group"
                              onClick={() => toggleTodo(todo.id)}
                            >
                              <div className={`flex-shrink-0 mt-0.5 w-3 h-3 rounded border-2 flex items-center justify-center transition-colors ${
                                todo.completed ? 'bg-leaf-300 border-leaf-300' : 'border-gray-300 dark:border-gray-600 group-hover:border-leaf-400'
                              }`}>
                                {todo.completed && <Check size={6} className="text-leaf-800" strokeWidth={3} />}
                              </div>
                              <span className={`text-[10px] leading-snug break-words ${
                                todo.completed ? 'line-through text-gray-300' : 'text-gray-700 dark:text-gray-300'
                              }`}>{todo.title}</span>
                            </div>
                          ))}
                        </div>
                        {weekAddDate === dateStr ? (
                          <div className="mt-1 flex items-center gap-1 flex-shrink-0">
                            <input
                              autoFocus
                              value={weekAddTitle}
                              onChange={e => setWeekAddTitle(e.target.value)}
                              placeholder="추가..."
                              className="flex-1 min-w-0 text-[10px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-leaf-400"
                              onKeyDown={async e => {
                                if (e.key === 'Enter') {
                                  const t = weekAddTitle.trim();
                                  if (t) await addTodo({ title: t, completed: false, categoryId: null, date: dateStr, startTime: null, subtasks: [], notes: '' });
                                  setWeekAddTitle(''); setWeekAddDate(null);
                                }
                                if (e.key === 'Escape') { setWeekAddDate(null); setWeekAddTitle(''); }
                              }}
                              onBlur={() => { if (!weekAddTitle.trim()) setWeekAddDate(null); }}
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => { setWeekAddDate(dateStr); setWeekAddTitle(''); }}
                            className="mt-1 w-full flex items-center justify-center text-[10px] text-gray-300 dark:text-gray-600 hover:text-leaf-500 transition-colors flex-shrink-0 py-0.5"
                          >
                            <Plus size={10} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── 저장소 (패널 열릴 때만 표시. 태블릿 이상에서는 달력이 먼저 공간을 채우고 남는 만큼만 사용) ── */}
          {panelOpen && (
            <div className="flex-1 min-h-0 md:flex-none md:max-h-[200px] mt-3 flex flex-col overflow-hidden">
              <div className="flex-shrink-0 flex items-center gap-2 mb-1 px-1">
                <CalendarPlus size={12} className="text-leaf-500" />
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">저장소</span>
                {repoTodos.length > 0 && (
                  <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">{repoTodos.length}</span>
                )}
                <span className="text-[10px] text-gray-300 dark:text-gray-600">드래그해서 날짜에 추가</span>
              </div>
              {repoTodos.length > 0 ? (
                <div className="flex-1 overflow-y-auto">
                  {repoTodos.map(todo => (
                    <DraggableRepoItem key={todo.id} todo={todo} />
                  ))}
                </div>
              ) : (
                <div className="flex items-center h-full text-xs text-gray-300 dark:text-gray-600 px-2">
                  저장소가 비어 있어요
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── 오른쪽 패널 (데스크톱) ── */}
      <div className={`hidden lg:flex flex-col border-l border-gray-100 dark:border-gray-800 overflow-hidden transition-all duration-300 ease-in-out relative ${
        panelOpen ? 'w-[520px] xl:w-[640px] opacity-100' : 'w-0 opacity-0'
      }`}>
        {panelOpen && (
          <>
            <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  {format(parseISO(selectedDate), 'M월 d일 EEEE', { locale: ko })}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">{selectedTodos.length}개의 할 일</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setCurrentScreen('calendar')} aria-label="시간표 보기" title="시간표 보기"
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <Clock10 size={14} />
                </button>
                <button onClick={() => setPanelOpen(false)} aria-label="닫기"
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <X size={15} />
                </button>
              </div>
            </div>
            <div className="flex-shrink-0 px-5 pt-3">
              <CategoryFilter activeCatId={activeCatId} onChange={setActiveCatId} />
            </div>
            <DroppableDatePanel isOpen={panelOpen}>
              {filtered.length === 0
                ? <div className="text-center pt-16">
                    <p className="text-sm text-gray-400">이 날의 할 일이 없어요</p>
                    <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">아래에서 추가하거나 저장소에서 드래그하세요</p>
                  </div>
                : <TodoList todos={filtered} onEdit={openEdit} />
              }
            </DroppableDatePanel>
            <div className="absolute bottom-16 left-0 right-0 px-5 pb-2">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-black/30 flex items-center gap-2 px-4 py-3">
                <input ref={quickInputRef} type="text" value={quickTitle}
                  onChange={e => setQuickTitle(e.target.value)} placeholder="할 일 빠르게 추가..."
                  className="flex-1 text-sm bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
                  onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd(); }} />
                <button onClick={handleQuickAdd} disabled={!quickTitle.trim() || quickLoading} aria-label="추가"
                  className="w-8 h-8 rounded-xl bg-leaf-300 hover:bg-leaf-400 disabled:opacity-40 text-leaf-800 flex items-center justify-center">
                  <Send size={14} />
                </button>
                <button onClick={() => { setEditTodo(undefined); setShowModal(true); }} aria-label="상세 옵션으로 추가"
                  className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center">
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── 모바일: 하단 패널 ── */}
      <div className={`lg:hidden flex-shrink-0 flex flex-col border-t border-gray-200 dark:border-gray-800 overflow-hidden transition-all duration-300 ease-in-out relative ${
        panelOpen ? 'h-[50%] opacity-100' : 'h-0 opacity-0'
      }`}>
        <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">
              {format(parseISO(selectedDate), 'M월 d일 EEEE', { locale: ko })}
            </h2>
            <p className="text-xs text-gray-400">{selectedTodos.length}개</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setCurrentScreen('calendar')} aria-label="시간표 보기" title="시간표 보기"
              className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
              <Clock10 size={13} />
            </button>
            <button onClick={() => setPanelOpen(false)} aria-label="닫기"
              className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
              <X size={13} />
            </button>
          </div>
        </div>
        <div className="px-4 flex-shrink-0">
          <CategoryFilter activeCatId={activeCatId} onChange={setActiveCatId} />
        </div>
        <div className="flex-1 overflow-y-auto px-4 pt-2 pb-20">
          {filtered.length === 0
            ? <p className="text-center text-sm text-gray-400 pt-8">이 날의 할 일이 없어요</p>
            : <TodoList todos={filtered} onEdit={openEdit} />
          }
        </div>
        <div className="absolute bottom-16 left-0 right-0 px-4 pb-2">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-black/30 flex items-center gap-2 px-4 py-3">
            <input ref={quickInputRef} type="text" value={quickTitle}
              onChange={e => setQuickTitle(e.target.value)} placeholder="할 일 빠르게 추가..."
              className="flex-1 text-sm bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
              onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd(); }} />
            <button onClick={handleQuickAdd} disabled={!quickTitle.trim() || quickLoading}
              className="w-8 h-8 rounded-xl bg-leaf-300 hover:bg-leaf-400 disabled:opacity-40 text-leaf-800 flex items-center justify-center">
              <Send size={14} />
            </button>
            <button onClick={() => { setEditTodo(undefined); setShowModal(true); }}
              className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center">
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* DragOverlay */}
      <DragOverlay>
        {draggingTodo && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-leaf-300 bg-white dark:bg-gray-900 shadow-xl opacity-90">
            <GripVertical size={14} className="text-leaf-400" />
            <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{draggingTodo.title}</span>
          </div>
        )}
      </DragOverlay>

      {showModal && <TodoModal todo={editTodo} defaultDate={selectedDate} onClose={closeModal} />}
      {showBoard && <MyBoardPanel onClose={() => setShowBoard(false)} />}
      {showAchievement && <AchievementModal onClose={() => setShowAchievement(false)} />}
      {showNotice && <NoticeModal onClose={() => setShowNotice(false)} />}
      {showGoalModal && <GoalModal month={currentMonth} onClose={() => setShowGoalModal(false)} />}
      {showDdayModal && <DDayModal onClose={() => setShowDdayModal(false)} />}
    </div>
    </DndContext>
  );
}
