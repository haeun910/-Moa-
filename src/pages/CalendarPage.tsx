import { useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useApp } from '../context/AppContext';
import TodoModal from '../components/TodoModal';
import CategoryFilter from '../components/CategoryFilter';
import type { Todo } from '../types';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number) {
  return `${String(h).padStart(2, '0')}:00`;
}

export default function CalendarPage() {
  const { todos, selectedDate, setSelectedDate, setCurrentScreen } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editTodo, setEditTodo] = useState<Todo | undefined>();
  const [defaultTime, setDefaultTime] = useState<string | undefined>();
  const [activeCatId, setActiveCatId] = useState<string | null>(null);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const dayTodos = todos.filter(t => t.date === selectedDate);
  const filtered = activeCatId ? dayTodos.filter(t => t.categoryId === activeCatId) : dayTodos;

  const allDayTodos = filtered.filter(t => !t.startTime);
  const timedTodos = filtered.filter(t => t.startTime);

  // Group timed todos by hour
  const todosByHour: Record<number, Todo[]> = {};
  for (const t of timedTodos) {
    if (!t.startTime) continue;
    const h = parseInt(t.startTime.split(':')[0], 10);
    if (!todosByHour[h]) todosByHour[h] = [];
    todosByHour[h].push(t);
  }

  function openEdit(todo: Todo) { setEditTodo(todo); setShowModal(true); }
  function closeModal() { setShowModal(false); setEditTodo(undefined); setDefaultTime(undefined); }

  function openNewAtTime(hour: number) {
    setEditTodo(undefined);
    setDefaultTime(formatHour(hour));
    setShowModal(true);
  }

  const dateObj = parseISO(selectedDate);

  return (
    <div className="flex flex-col h-screen pb-16">
      {/* Date nav */}
      <div className="flex-shrink-0 px-4 pt-10 pb-3 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1 mb-1 -ml-1.5">
          <button onClick={() => setCurrentScreen('today')} aria-label="홈으로 돌아가기"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft size={17} />
          </button>
          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-wide">시간표</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setSelectedDate(format(subDays(dateObj, 1), 'yyyy-MM-dd'))} aria-label="전날"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ChevronLeft size={18} />
          </button>

          <div className="text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {format(dateObj, 'M월 d일', { locale: ko })}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {format(dateObj, 'EEEE', { locale: ko })}
              {selectedDate === todayStr && <span className="ml-1.5 text-leaf-500 font-semibold">오늘</span>}
            </p>
          </div>

          <button onClick={() => setSelectedDate(format(addDays(dateObj, 1), 'yyyy-MM-dd'))} aria-label="다음날"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        {selectedDate !== todayStr && (
          <div className="flex justify-center">
            <button
              onClick={() => setSelectedDate(todayStr)}
              className="text-xs text-leaf-500 hover:text-leaf-700 font-medium px-3 py-1 rounded-lg hover:bg-leaf-50 dark:hover:bg-leaf-900/20 transition-colors"
            >
              오늘로 이동
            </button>
          </div>
        )}

        {/* Category filter */}
        <div className="mt-2">
          <CategoryFilter activeCatId={activeCatId} onChange={setActiveCatId} />
        </div>
      </div>

      {/* Schedule body */}
      <div className="flex-1 overflow-y-auto">
        {/* All-day section */}
        {allDayTodos.length > 0 && (
          <div className="border-b border-gray-100 dark:border-gray-800 px-4 py-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">하루 종일</p>
            <div className="space-y-1.5">
              {allDayTodos.map(todo => (
                <AllDayTodoChip key={todo.id} todo={todo} onEdit={openEdit} />
              ))}
            </div>
          </div>
        )}

        {/* Hourly rows */}
        <div className="relative">
          {HOURS.map(h => (
            <div key={h} className="flex border-b border-gray-100 dark:border-gray-800 min-h-[56px] group">
              {/* Time label */}
              <div className="w-14 flex-shrink-0 pt-1 pr-2 text-right">
                <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">
                  {formatHour(h)}
                </span>
              </div>

              {/* Slot */}
              <div
                className="flex-1 pl-2 pt-1 pb-1 relative cursor-pointer hover:bg-leaf-50/50 dark:hover:bg-leaf-900/10 transition-colors"
                onClick={() => openNewAtTime(h)}
              >
                {(todosByHour[h] ?? []).map(todo => (
                  <TimeSlotTodo key={todo.id} todo={todo} onEdit={e => { e.stopPropagation(); openEdit(todo); }} />
                ))}
                {/* Add hint */}
                {!(todosByHour[h]?.length) && (
                  <span className="absolute inset-0 flex items-center pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus size={12} className="text-leaf-400 mr-1" />
                    <span className="text-[11px] text-leaf-400">추가</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => { setEditTodo(undefined); setDefaultTime(undefined); setShowModal(true); }}
        aria-label="할 일 추가"
        className="fixed bottom-20 right-6 w-14 h-14 rounded-full bg-leaf-300 hover:bg-leaf-400 text-leaf-800 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
      >
        <Plus size={24} />
      </button>

      {showModal && (
        <TodoModal
          todo={editTodo}
          defaultDate={selectedDate}
          defaultTime={defaultTime}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function AllDayTodoChip({ todo, onEdit }: { todo: Todo; onEdit: (t: Todo) => void }) {
  const { toggleTodo, categories } = useApp();
  const cat = categories.find(c => c.id === todo.categoryId);
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
        todo.completed
          ? 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800'
          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-leaf-300 dark:hover:border-leaf-700'
      }`}
      onClick={() => onEdit(todo)}
    >
      <button
        onClick={e => { e.stopPropagation(); toggleTodo(todo.id); }}
        className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
          todo.completed ? 'bg-leaf-300 border-leaf-300' : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        {todo.completed && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1 4l2 2 4-4" stroke="#4A5D1E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      {cat && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />}
      <span className={`text-sm flex-1 ${todo.completed ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
        {todo.title}
      </span>
    </div>
  );
}

function TimeSlotTodo({ todo, onEdit }: { todo: Todo; onEdit: (e: React.MouseEvent) => void }) {
  const { toggleTodo, categories } = useApp();
  const cat = categories.find(c => c.id === todo.categoryId);
  const color = cat?.color ?? '#86A03F';
  return (
    <div
      className="flex items-center gap-2 mb-1 px-2 py-1.5 rounded-lg cursor-pointer transition-all hover:opacity-80"
      style={{ backgroundColor: color + '18', borderLeft: `3px solid ${color}` }}
      onClick={onEdit}
    >
      <button
        onClick={e => { e.stopPropagation(); toggleTodo(todo.id); }}
        className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
          todo.completed ? 'bg-leaf-300 border-leaf-300' : 'border-gray-400'
        }`}
        style={!todo.completed ? { borderColor: color } : {}}
      >
        {todo.completed && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1 4l2 2 4-4" stroke="#4A5D1E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${todo.completed ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
          {todo.title}
        </p>
        {todo.startTime && (
          <p className="flex items-center gap-0.5 text-[10px] text-gray-500 dark:text-gray-400">
            <Clock size={9} />
            {todo.startTime}
          </p>
        )}
      </div>
    </div>
  );
}
