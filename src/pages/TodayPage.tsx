import { useState, useRef } from 'react';
import { Plus, Send, ChevronLeft, ChevronRight, X, Check, Flag, Trash2, LayoutDashboard, BarChart3, Clock10, Megaphone, Undo2, CalendarDays, Link2 } from 'lucide-react';
import MyBoardPanel from '../components/MyBoardPanel';
import AchievementModal from '../components/AchievementModal';
import NoticeModal from '../components/NoticeModal';
import GoalModal from '../components/GoalModal';
import DDayModal from '../components/DDayModal';
import DDayListModal from '../components/DDayListModal';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths, parseISO,
  differenceInCalendarDays, addWeeks, subWeeks, isToday as dateFnsIsToday,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { useApp } from '../context/AppContext';
import { applyListDisplaySettings } from '../lib/listDisplay';
import TodoList from '../components/TodoList';
import TodoModal from '../components/TodoModal';
import type { Todo, DDay } from '../types';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// 특정 날짜로 옮기는 작은 팝오버 버튼 (저장소로 보내기와 짝을 이루는, 홈 화면 전용 액션)
function MoveToDateButton({ todo, onMove }: { todo: Todo; onMove: (date: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 px-2 py-1 rounded-lg transition-all whitespace-nowrap"
        title="다른 날짜로 옮기기"
      >
        <CalendarDays size={11} />
        날짜 변경
      </button>
      {open && (
        <input
          type="date"
          autoFocus
          defaultValue={todo.date ?? ''}
          className="absolute right-0 top-full mt-1 z-20 text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-lg focus:outline-none focus:ring-2 focus:ring-leaf-400"
          onChange={e => { if (e.target.value) onMove(e.target.value); setOpen(false); }}
          onBlur={() => setOpen(false)}
        />
      )}
    </div>
  );
}

export default function TodayPage() {
  const {
    todos, categories, settings, addTodo, updateTodo, toggleTodo, selectedDate, setSelectedDate,
    monthlyGoals, toggleMonthlyGoal, deleteMonthlyGoal,
    ddays, deleteDDay, notices, setCurrentScreen,
  } = useApp();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [viewMonth, setViewMonth] = useState(new Date());

  // 달력 월 기준 목표
  const currentMonth = format(viewMonth, 'yyyy-MM');
  const monthGoals = monthlyGoals.filter(g => g.month === currentMonth);
  const completedGoals = monthGoals.filter(g => g.completed).length;

  const [showModal, setShowModal] = useState(false);
  const [editTodo, setEditTodo] = useState<Todo | undefined>();
  const [panelOpen, setPanelOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);
  const quickInputRef = useRef<HTMLInputElement>(null);

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showDdayModal, setShowDdayModal] = useState(false);
  const [showDdayListModal, setShowDdayListModal] = useState(false);
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

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth)),
    end: endOfWeek(endOfMonth(viewMonth)),
  });
  const weekCount = Math.ceil(days.length / 7);

  // 달력 칸/D-Day 계산은 전체 todos를 그대로 쓰고, 아래 목록(패널)에만 설정의
  // "목록 표시" 옵션(정렬/완료 숨기기/카테고리 표시 여부)을 적용
  const selectedTodos = applyListDisplaySettings(todos.filter(t => t.date === selectedDate), settings);

  // 선택한 날의 할 일을 카테고리별로 묶어서 목록 사이에 카테고리 이름이 끼어들도록 함
  const dayGroups = [
    ...categories.map(cat => ({ cat, groupTodos: selectedTodos.filter(t => t.categoryId === cat.id) })),
    { cat: null, groupTodos: selectedTodos.filter(t => !t.categoryId) },
  ].filter(g => g.groupTodos.length > 0);

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
      await addTodo({ title, completed: false, categoryId: null, date: selectedDate, startTime: null, subtasks: [], notes: '' });
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

  // 할 일에 "D-Day로 표시" 체크를 하면 여기서 가상 D-Day로 합쳐져서 항상 자동으로 동기화됨
  // (마감일이 있으면 마감일, 없으면 작업 날짜를 기준일로 사용)
  const todoDdays: DDay[] = todos
    .filter(t => t.isDday && (t.dueDate || t.date))
    .map(t => ({ id: `todo-${t.id}`, title: t.title, targetDate: (t.dueDate || t.date) as string, fromTodoId: t.id }));
  const allDdays = [...ddays, ...todoDdays].sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  // 위쪽 위젯에는 지나간 D-Day는 숨기고, "D-Day" 제목을 누르면 지나간 것까지 전체를 보여줌
  const upcomingDdays = allDdays.filter(d => differenceInCalendarDays(parseISO(d.targetDate), new Date()) >= 0);

  async function removeDday(d: DDay) {
    if (d.fromTodoId) await updateTodo(d.fromTodoId, { isDday: false });
    else await deleteDDay(d.id);
  }

  // 홈 화면에서: 저장소로 다시 보내거나 다른 날짜로 옮기기
  function getTodoActions(todo: Todo) {
    return (
      <>
        <button
          onClick={e => { e.stopPropagation(); updateTodo(todo.id, { date: null }); }}
          className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 px-2 py-1 rounded-lg transition-all whitespace-nowrap"
          title="저장소로 다시 보내기 (날짜 없이 보관)"
        >
          <Undo2 size={11} />
          저장소로
        </button>
        <MoveToDateButton todo={todo} onMove={date => updateTodo(todo.id, { date })} />
      </>
    );
  }

  // 선택한 날의 할 일을 카테고리별로 나눠서 보여줌 (카테고리 이름이 목록 사이에 끼워짐)
  function renderDayGroups() {
    if (selectedTodos.length === 0) {
      return (
        <div className="text-center pt-16">
          <p className="text-sm text-gray-400">이 날의 할 일이 없어요</p>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">아래에서 추가해보세요</p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {dayGroups.map(({ cat, groupTodos }) => (
          <div key={cat?.id ?? '__none__'}>
            <div className="flex items-center gap-2 mb-1.5 px-1">
              {cat ? (
                <>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300 tracking-wide">{cat.name}</span>
                </>
              ) : (
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-wide">분류 없음</span>
              )}
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">{groupTodos.length}</span>
            </div>
            <TodoList todos={groupTodos} onEdit={openEdit} autoCompleteSubtasks getActions={getTodoActions} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen h-auto overflow-y-auto md:h-screen md:overflow-hidden pb-[62px] flex flex-col lg:flex-row">

      {/* ── 달력 + 저장소 영역 (모바일은 화면에 억지로 끼워 맞추지 않고 자연스럽게 스크롤) ── */}
      {/* 노트북처럼 화면 세로 길이가 짧을 때 목표/D-Day 카드 + 달력의 최소 높이 합이 화면을 넘으면
          예전엔 md:overflow-hidden 때문에 달력 아래쪽이 그냥 잘려서 안 보였음.
          내용이 넘칠 때는 이 영역 자체가 스크롤되도록 해서 "잘려 보이는" 대신 스크롤로 다 볼 수 있게 함 */}
      <div className={`flex flex-col overflow-y-auto md:overflow-x-hidden transition-all duration-300 ease-in-out ${panelOpen ? 'md:h-1/2 lg:h-auto lg:flex-1' : 'flex-1'}`}>

        <div className="flex-1 flex flex-col px-4 sm:px-5 pt-4 pb-4 md:min-h-0">

          {/* ── 목표 + D-Day (모바일은 세로로 쌓아서 카드 하나당 폭을 넉넉하게) ── */}
          <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">

            {/* 이번달 목표 */}
            {/* min-h만 있으면 내용이 늘어날 때 카드 자체가 커져서 안의 overflow-y-auto가 무용지물이라
                calendars가 밀려 찌부러지는 원인이었음 → md 이상에서는 높이를 고정해 리스트만 스크롤되게 함 */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4 md:p-3.5 flex flex-col gap-2 min-h-[120px] md:h-[140px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Flag size={14} className="text-leaf-500 md:w-[13px] md:h-[13px]" />
                  <span className="text-sm md:text-xs font-bold text-gray-700 dark:text-gray-300">
                    {format(viewMonth, 'M월')} 목표
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs md:text-[10px] text-gray-400">{completedGoals}/{monthGoals.length}</span>
                  <button onClick={() => setShowGoalModal(true)} aria-label="목표 추가"
                    className="w-7 h-7 md:w-5 md:h-5 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                    <Plus size={14} className="md:hidden" />
                    <Plus size={11} className="hidden md:block" />
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-2 md:space-y-1.5 overflow-y-auto">
                {monthGoals.length === 0 && (
                  <p className="text-sm md:text-xs text-gray-300 dark:text-gray-600">목표를 추가해보세요</p>
                )}
                {monthGoals.map(g => (
                  <div key={g.id} className="flex items-center gap-2 group">
                    <button onClick={() => toggleMonthlyGoal(g.id)}
                      aria-label={g.completed ? '완료 취소' : '완료 처리'}
                      className={`flex-shrink-0 w-5 h-5 md:w-[18px] md:h-[18px] rounded border flex items-center justify-center transition-colors ${
                        g.completed ? 'bg-leaf-300 border-leaf-300' : 'border-gray-300 dark:border-gray-600'
                      }`}>
                      {g.completed && <Check size={11} className="text-leaf-800 md:hidden" strokeWidth={3} />}
                      {g.completed && <Check size={10} className="text-leaf-800 hidden md:block" strokeWidth={3} />}
                    </button>
                    <span className={`flex-1 text-sm md:text-xs leading-tight ${g.completed ? 'line-through text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}`}>
                      {g.title}
                    </span>
                    <button onClick={() => deleteMonthlyGoal(g.id)} aria-label="목표 삭제"
                      className="opacity-60 md:opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all">
                      <X size={14} className="md:hidden" />
                      <X size={12} className="hidden md:block" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* D-Day */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4 md:p-3.5 flex flex-col gap-2 min-h-[120px] md:h-[140px]">
              <div className="flex items-center justify-between">
                <button onClick={() => setShowDdayListModal(true)}
                  className="text-sm md:text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-leaf-600 dark:hover:text-leaf-400 transition-colors"
                  title="지난 D-Day까지 전체 보기">
                  D-Day
                </button>
                <button onClick={() => setShowDdayModal(true)} aria-label="D-Day 추가"
                  className="w-7 h-7 md:w-5 md:h-5 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                  <Plus size={14} className="md:hidden" />
                  <Plus size={11} className="hidden md:block" />
                </button>
              </div>

              <div className="flex-1 space-y-2 md:space-y-1.5 overflow-y-auto">
                {upcomingDdays.length === 0 && (
                  <p className="text-sm md:text-xs text-gray-300 dark:text-gray-600">디데이를 추가해보세요</p>
                )}
                {upcomingDdays.map(d => (
                  <div key={d.id} className="flex items-center gap-2 group">
                    <Flag size={11} className="flex-shrink-0 text-leaf-500 md:hidden" />
                    <Flag size={10} className="flex-shrink-0 text-leaf-500 hidden md:block" />
                    <span className="flex-shrink-0 text-xs md:text-[11px] font-bold px-1.5 py-0.5 rounded-md min-w-[48px] md:min-w-[44px] text-center bg-leaf-50 dark:bg-leaf-900/30 text-leaf-600 dark:text-leaf-400">
                      {ddayLabel(d.targetDate)}
                    </span>
                    <span className="flex-1 min-w-0 text-sm md:text-xs text-gray-700 dark:text-gray-300 truncate">{d.title}</span>
                    <span className="flex-shrink-0 text-[10px] text-gray-400 hidden sm:inline">{format(parseISO(d.targetDate), 'M/d')}</span>
                    {d.fromTodoId && (
                      <span title="할 일에서 연동됨" className="flex-shrink-0 text-gray-300 dark:text-gray-600">
                        <Link2 size={11} />
                      </span>
                    )}
                    <button onClick={() => removeDday(d)} aria-label="D-Day 삭제"
                      className="opacity-60 md:opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all">
                      <Trash2 size={14} className="md:hidden" />
                      <Trash2 size={12} className="hidden md:block" />
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
              panelOpen ? 'md:flex-1 md:h-auto md:min-h-[200px]' : 'flex-1 md:min-h-0'
            }`}>
              <div className="flex-shrink-0 grid grid-cols-7 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                {DAY_LABELS.map((d, i) => (
                  <div key={d} className={`py-1.5 text-center text-xs md:text-[11px] font-semibold ${
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
                  const dayDdays = allDdays.filter(d => d.targetDate === dateStr);
                  const dow = day.getDay();
                  return (
                    <button key={dateStr} onClick={() => handleDayClick(dateStr)}
                      className={`relative flex flex-col items-start min-h-[60px] md:min-h-0 p-2 md:p-1.5 border-r border-b border-gray-100 dark:border-gray-800 transition-colors text-left ${
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
                      <span className={`flex-shrink-0 w-6 h-6 md:w-5 md:h-5 flex items-center justify-center rounded-md text-xs md:text-[11px] font-bold mb-0.5 ${
                        isSelected ? 'bg-leaf-300 text-leaf-800'
                        : isToday ? 'bg-leaf-300 text-leaf-800'
                        : dow === 0 ? 'text-red-500 font-bold' : dow === 6 ? 'text-leaf-600 font-bold' : 'text-gray-800 dark:text-gray-100'
                      }`}>
                        {format(day, 'd')}
                      </span>
                      {/* 제목을 텍스트로 나열하면 칸 높이가 날마다 들쭉날쭉해지는 문제가 있어서,
                          칸 높이는 고정하고 그 날 있는 카테고리를 작은 색깔 점으로만 표시. 자세한
                          목록은 칸을 눌러 오른쪽(또는 아래) 패널에서 확인 */}
                      <div className="w-full flex flex-wrap gap-1 overflow-hidden">
                        {Array.from(new Set(dayTodos.map(t => t.categoryId))).slice(0, 8).map(catId => {
                          const cat = categories.find(c => c.id === catId);
                          return (
                            <span
                              key={catId ?? '__none__'}
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: cat?.color ?? '#9CA3AF' }}
                            />
                          );
                        })}
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
              panelOpen ? 'md:flex-1 md:h-auto md:min-h-[200px]' : 'flex-1 md:min-h-0'
            }`}>
              <div className="flex-1 overflow-auto p-2">
                <div className="grid grid-cols-7 gap-1.5 h-full" style={{ minHeight: '260px' }}>
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
            <div className="flex-1 overflow-y-auto px-5 pt-3 pb-28">
              {renderDayGroups()}
            </div>
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
        <div className="flex-1 overflow-y-auto px-4 pt-2 pb-20">
          {renderDayGroups()}
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

      {showModal && <TodoModal todo={editTodo} defaultDate={selectedDate} onClose={closeModal} />}
      {showBoard && <MyBoardPanel onClose={() => setShowBoard(false)} />}
      {showAchievement && <AchievementModal onClose={() => setShowAchievement(false)} />}
      {showNotice && <NoticeModal onClose={() => setShowNotice(false)} />}
      {showGoalModal && <GoalModal month={currentMonth} onClose={() => setShowGoalModal(false)} />}
      {showDdayModal && <DDayModal onClose={() => setShowDdayModal(false)} />}
      {showDdayListModal && (
        <DDayListModal ddays={allDdays} onDelete={removeDday} onClose={() => setShowDdayListModal(false)} />
      )}
    </div>
  );
}
