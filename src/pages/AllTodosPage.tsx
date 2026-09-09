import { useState, useRef } from 'react';
import { Plus, Send, CalendarCheck, ListTodo, Package } from 'lucide-react';
import { format } from 'date-fns';
import { useApp } from '../context/AppContext';
import TodoList from '../components/TodoList';
import TodoModal from '../components/TodoModal';
import CategoryFilter from '../components/CategoryFilter';
import SubtaskMoveModal from '../components/SubtaskMoveModal';
import type { Todo, Category } from '../types';

function CategoryQuickAdd({ categoryId, onAdd }: { categoryId: string | null; onAdd: (title: string, catId: string | null) => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  async function submit() {
    const t = title.trim();
    if (!t || loading) return;
    setLoading(true);
    try { await onAdd(t, categoryId); setTitle(''); ref.current?.focus(); }
    finally { setLoading(false); }
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl mt-1 bg-gray-50/50 dark:bg-gray-900/30 hover:border-leaf-300 dark:hover:border-leaf-700 transition-colors group">
      <input
        ref={ref}
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="+ 할 일 추가..."
        className="flex-1 text-[13px] bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none"
        onKeyDown={e => { if (e.key === 'Enter') submit(); }}
      />
      {title.trim() && (
        <button onClick={submit} disabled={loading} aria-label="추가"
          className="w-6 h-6 rounded-lg bg-leaf-300 flex items-center justify-center text-leaf-800 flex-shrink-0 shadow-sm">
          <Send size={10} />
        </button>
      )}
    </div>
  );
}

export default function AllTodosPage() {
  const { todos: allTodos, categories, addTodo, updateTodo } = useApp();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // 저장소 = 날짜 없이 보관 중인 할 일만 (날짜가 정해지면 저장소에서는 사라져야 함)
  const todos = allTodos.filter(t => !t.date);

  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editTodo, setEditTodo] = useState<Todo | undefined>();
  const [subtaskMoveTodo, setSubtaskMoveTodo] = useState<Todo | undefined>();
  const [quickTitle, setQuickTitle] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);
  const quickInputRef = useRef<HTMLInputElement>(null);

  function openEdit(todo: Todo) { setEditTodo(todo); setShowModal(true); }
  function closeModal() { setShowModal(false); setEditTodo(undefined); }

  async function handleQuickAdd() {
    const title = quickTitle.trim();
    if (!title || quickLoading) return;
    setQuickLoading(true);
    try {
      await addTodo({ title, completed: false, categoryId: activeCatId, date: null, startTime: null, subtasks: [], notes: '' });
      setQuickTitle('');
      quickInputRef.current?.focus();
    } finally { setQuickLoading(false); }
  }

  async function addToCategoryGroup(title: string, catId: string | null) {
    await addTodo({ title, completed: false, categoryId: catId, date: null, startTime: null, subtasks: [], notes: '' });
  }

  async function sendToToday(todo: Todo) {
    await updateTodo(todo.id, { date: todayStr });
  }

  function getTodoActions(todo: Todo) {
    return (
      <>
        <button
          onClick={e => { e.stopPropagation(); sendToToday(todo); }}
          className="flex items-center gap-1 text-[10px] font-semibold text-leaf-600 hover:text-leaf-800 dark:text-leaf-400 dark:hover:text-leaf-200 bg-leaf-50 hover:bg-leaf-300 dark:bg-leaf-900/30 dark:hover:bg-leaf-700 px-2 py-1 rounded-lg transition-all whitespace-nowrap"
          title="이 할 일(하위 항목 포함) 전체를 오늘 날짜로 이동"
        >
          <CalendarCheck size={11} />
          오늘로
        </button>
        {todo.subtasks.length > 0 && (
          <button
            onClick={e => { e.stopPropagation(); setSubtaskMoveTodo(todo); }}
            className="flex items-center gap-1 text-[10px] font-semibold text-violet-600 hover:text-white bg-violet-50 hover:bg-violet-500 dark:bg-violet-900/30 dark:hover:bg-violet-500 px-2 py-1 rounded-lg transition-all whitespace-nowrap"
            title="하위 항목 중 원하는 것만 골라서 오늘로 이동"
          >
            <ListTodo size={11} />
            하위 선택
          </button>
        )}
      </>
    );
  }

  const repoTodoCount = todos.length;
  const completedCount = todos.filter(t => t.completed).length;

  if (activeCatId !== null) {
    const filtered = todos.filter(t => t.categoryId === activeCatId);
    const cat = categories.find(c => c.id === activeCatId);

    return (
      <div className="max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 lg:px-8 pt-10 pb-36">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">저장소</h1>
          <p className="text-sm text-gray-400 mt-0.5">{repoTodoCount}개 · 완료 {completedCount}개</p>
        </div>
        <div className="mb-4">
          <CategoryFilter activeCatId={activeCatId} onChange={setActiveCatId} />
        </div>
        {cat && (
          <div className="flex items-center gap-2 mb-3 px-1">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{cat.name}</span>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">{filtered.length}</span>
          </div>
        )}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
              <Package size={24} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">이 카테고리에 할 일이 없어요</p>
          </div>
        ) : (
          <TodoList todos={filtered} onEdit={openEdit} getActions={getTodoActions} />
        )}

        <div className="fixed bottom-[62px] left-0 right-0 z-40 px-4 lg:px-8 pb-3 max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-black/30 flex items-center gap-2 px-4 py-3">
            <input ref={quickInputRef} type="text" value={quickTitle}
              onChange={e => setQuickTitle(e.target.value)}
              placeholder={`${cat?.name ?? ''} 할 일 추가...`}
              className="flex-1 text-sm bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
              onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd(); }} />
            <button onClick={handleQuickAdd} disabled={!quickTitle.trim() || quickLoading} aria-label="추가"
              className="flex-shrink-0 w-8 h-8 rounded-xl bg-leaf-300 hover:bg-leaf-400 disabled:opacity-40 text-leaf-800 flex items-center justify-center shadow-sm">
              <Send size={14} />
            </button>
            <button onClick={() => { setEditTodo(undefined); setShowModal(true); }} aria-label="상세 옵션으로 추가"
              className="flex-shrink-0 w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center">
              <Plus size={16} />
            </button>
          </div>
        </div>
        {showModal && <TodoModal todo={editTodo} onClose={closeModal} />}
        {subtaskMoveTodo && <SubtaskMoveModal todo={subtaskMoveTodo} onClose={() => setSubtaskMoveTodo(undefined)} />}
      </div>
    );
  }

  const catGroups: { cat: Category | null; catTodos: Todo[] }[] = [
    ...categories.map(cat => ({
      cat,
      catTodos: todos.filter(t => t.categoryId === cat.id),
    })),
    {
      cat: null,
      catTodos: todos.filter(t => !t.categoryId),
    },
  ].filter(g => g.catTodos.length > 0 || g.cat !== null);

  return (
    <div className="max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 lg:px-8 pt-10 pb-36">
      {/* Header */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">저장소</h1>
          <p className="text-sm text-gray-400 mt-0.5">{repoTodoCount}개 · 완료 {completedCount}개</p>
        </div>
        {repoTodoCount > 0 && (
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-leaf-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.round((completedCount / repoTodoCount) * 100)}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-leaf-500">
              {Math.round((completedCount / repoTodoCount) * 100)}%
            </span>
          </div>
        )}
      </div>

      <div className="mb-5">
        <CategoryFilter activeCatId={activeCatId} onChange={setActiveCatId} />
      </div>

      {catGroups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Package size={28} className="text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-semibold">저장소가 비어 있어요</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">날짜 없이 할 일을 보관하는 공간이에요</p>
        </div>
      )}

      <div className="xl:grid xl:grid-cols-2 xl:gap-x-8">
        {catGroups.map(({ cat, catTodos }) => (
          <div key={cat?.id ?? '__none__'} className="mb-6">
            <div className="flex items-center gap-2 mb-2.5 px-1">
              {cat ? (
                <>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300 tracking-wide">{cat.name}</span>
                </>
              ) : (
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-wide">분류 없음</span>
              )}
              <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">{catTodos.length}</span>
            </div>

            {catTodos.length > 0 && (
              <TodoList todos={catTodos} onEdit={openEdit} getActions={getTodoActions} />
            )}
            <CategoryQuickAdd categoryId={cat?.id ?? null} onAdd={addToCategoryGroup} />
          </div>
        ))}
      </div>

      {catGroups.length === 0 && (
        <CategoryQuickAdd categoryId={null} onAdd={addToCategoryGroup} />
      )}

      <div className="fixed bottom-[62px] left-0 right-0 z-40 px-4 lg:px-8 pb-3 max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-black/30 flex items-center gap-2 px-4 py-3">
          <input ref={quickInputRef} type="text" value={quickTitle}
            onChange={e => setQuickTitle(e.target.value)}
            placeholder="할 일 빠르게 추가 (날짜 없이 보관)"
            className="flex-1 text-sm bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
            onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd(); }} />
          <button onClick={handleQuickAdd} disabled={!quickTitle.trim() || quickLoading} aria-label="추가"
            className="flex-shrink-0 w-8 h-8 rounded-xl bg-leaf-300 hover:bg-leaf-400 disabled:opacity-40 text-leaf-800 flex items-center justify-center shadow-sm">
            <Send size={14} />
          </button>
          <button onClick={() => { setEditTodo(undefined); setShowModal(true); }} aria-label="상세 옵션으로 추가"
            className="flex-shrink-0 w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {showModal && <TodoModal todo={editTodo} onClose={closeModal} />}
      {subtaskMoveTodo && <SubtaskMoveModal todo={subtaskMoveTodo} onClose={() => setSubtaskMoveTodo(undefined)} />}
    </div>
  );
}
