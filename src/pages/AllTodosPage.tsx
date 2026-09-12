import { useState, useRef } from 'react';
import { Plus, Send, CalendarCheck, CalendarDays, ListTodo, Package, Copy } from 'lucide-react';
import { format } from 'date-fns';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, useDroppable,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useApp } from '../context/AppContext';
import TodoList from '../components/TodoList';
import SortableTodoItem from '../components/SortableTodoItem';
import TodoModal from '../components/TodoModal';
import CategoryFilter from '../components/CategoryFilter';
import SubtaskMoveModal from '../components/SubtaskMoveModal';
import type { Todo, Category } from '../types';

const NO_CATEGORY_GROUP_ID = '__none__';

// 카테고리 그룹 하나를 드롭 대상 영역으로 만듦.
// (항목이 하나도 없는 빈 카테고리에도 다른 카테고리의 할 일을 끌어다 놓을 수 있어야 하므로 필요)
function DroppableCategoryGroup({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`rounded-2xl transition-colors ${isOver ? 'bg-leaf-50/60 dark:bg-leaf-900/10 ring-2 ring-leaf-300 dark:ring-leaf-700' : ''}`}>
      {children}
    </div>
  );
}

// 지난 날짜를 포함해 원하는 날짜로 바로 보낼 수 있는 버튼.
// ("오늘로"는 오늘 날짜 전용이라 지나간 날짜에 등록하려면 상세 편집을 열어야 했음)
function SendToDateButton({ todo }: { todo: Todo }) {
  const { updateTodo, moveSubtasksToDate } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 px-2 py-1 rounded-lg transition-all whitespace-nowrap"
        title="날짜 지정해서 보내기 (지난 날짜도 가능)"
      >
        <CalendarDays size={11} />
        날짜
      </button>
      {open && (
        <input
          type="date"
          autoFocus
          defaultValue={todo.date ?? ''}
          className="absolute right-0 top-full mt-1 z-20 text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-lg focus:outline-none focus:ring-2 focus:ring-leaf-400"
          onChange={e => {
            const value = e.target.value;
            if (value) {
              // 하위 항목이 있으면 큰 제목(카테고리)은 저장소에 남기고 하위 항목만 그 날짜로 보냄
              if (todo.subtasks.length > 0) moveSubtasksToDate(todo.id, todo.subtasks.map(s => s.id), value);
              else updateTodo(todo.id, { date: value });
            }
            setOpen(false);
          }}
          onBlur={() => setOpen(false)}
        />
      )}
    </div>
  );
}

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
  const { todos: allTodos, categories, addTodo, updateTodo, deleteTodo, reorderTodos, moveSubtasksToDate } = useApp();
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

  // 이 아래 조건부 return(단일 카테고리 보기) 때문에 훅은 항상 그 이전, 최상단에서 호출돼야 함
  const groupSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

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
    // 하위 항목이 있는 큰 제목은 그 자체가 할 일이 아니라 카테고리 같은 컨테이너라서
    // 통째로 옮기지 않고, 하위 항목들만 오늘로 보냄(저장소엔 큰 제목 그대로 남음).
    // 하위 항목이 없는(그 자체가 그냥 할 일인) 경우에만 항목 자체를 오늘로 옮김.
    if (todo.subtasks.length > 0) {
      await moveSubtasksToDate(todo.id, todo.subtasks.map(s => s.id), todayStr);
    } else {
      await updateTodo(todo.id, { date: todayStr });
    }
  }

  // 비슷한 할 일을 매번 새로 입력하지 않도록, 기존 할 일(제목+카테고리+하위 항목)을
  // 그대로 복제해서 저장소에 새 항목으로 추가 (완료 여부/날짜는 새로 시작)
  async function duplicateTodo(todo: Todo) {
    await addTodo({
      title: todo.title,
      completed: false,
      categoryId: todo.categoryId,
      date: null,
      startTime: todo.startTime ?? null,
      subtasks: todo.subtasks.map((s, i) => ({ id: `dup-${Date.now()}-${i}`, title: s.title, completed: false })),
      notes: todo.notes ?? '',
    });
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
        <SendToDateButton todo={todo} />
        <button
          onClick={e => { e.stopPropagation(); duplicateTodo(todo); }}
          className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 px-2 py-1 rounded-lg transition-all whitespace-nowrap"
          title="이 할 일(하위 항목 포함)을 복사해서 새로 추가"
        >
          <Copy size={11} />
          복사
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
        <div className="mb-2">
          <CategoryFilter activeCatId={activeCatId} onChange={setActiveCatId} />
        </div>
        <p className="text-[11px] text-gray-400 dark:text-gray-600 mb-3">
          💡 할 일을 다른 할 일 가운데로 끌어다 놓으면 하위 항목으로 합쳐져요
        </p>
        {cat && (
          <div className="mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{cat.name}</span>
              <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">{filtered.length}</span>
            </div>
            {/* 카테고리 설명은 저장소 화면에서만 노출 */}
            {cat.description && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{cat.description}</p>
            )}
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
          <TodoList todos={filtered} onEdit={openEdit} getActions={getTodoActions} allowSendSubtaskToToday enableMergeToSubtask />
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

  // 카테고리 그룹 사이를 넘나드는 드래그앤드롭 처리.
  // (예전엔 카테고리 그룹마다 TodoList가 각자의 DndContext를 따로 갖고 있어서
  //  같은 그룹 안에서 순서만 바꿀 수 있었고, 다른 카테고리로 끌어다 놓는 건 아예 불가능했음)
  function handleGroupDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeTodo = todos.find(t => t.id === active.id);
    if (!activeTodo) return;

    // 다른 할 일의 "가운데"(위/아래 가장자리가 아닌 부분)에 놓으면 순서 변경이 아니라
    // 그 할 일의 하위 항목으로 합쳐짐 (끌어서 하위 항목 추가)
    if (over.id !== active.id) {
      const targetTodo = todos.find(t => t.id === over.id);
      const activeRect = active.rect.current.translated;
      if (targetTodo && activeRect && over.rect.height > 0) {
        const relativeCenter = (activeRect.top + activeRect.height / 2 - over.rect.top) / over.rect.height;
        const droppedOnMiddle = relativeCenter > 0.25 && relativeCenter < 0.75;
        if (droppedOnMiddle) {
          const mergedSubtasks = [
            ...targetTodo.subtasks,
            { id: `merge-${Date.now()}-title`, title: activeTodo.title, completed: activeTodo.completed },
            ...activeTodo.subtasks.map((s, i) => ({ id: `merge-${Date.now()}-${i}`, title: s.title, completed: s.completed })),
          ];
          updateTodo(targetTodo.id, { subtasks: mergedSubtasks });
          deleteTodo(activeTodo.id);
          return;
        }
      }
    }

    type SortableData = { sortable?: { containerId: string } };
    const activeContainerId =
      (active.data.current as SortableData | undefined)?.sortable?.containerId
      ?? (activeTodo.categoryId ?? NO_CATEGORY_GROUP_ID);
    const overContainerId =
      (over.data.current as SortableData | undefined)?.sortable?.containerId
      ?? (over.id as string);

    if (activeContainerId !== overContainerId) {
      // 다른 카테고리 그룹 위에 놓음 → 카테고리 변경
      const targetCatId = overContainerId === NO_CATEGORY_GROUP_ID ? null : overContainerId;
      updateTodo(activeTodo.id, { categoryId: targetCatId });
      return;
    }

    // 같은 그룹 안에서는 순서만 변경
    if (active.id === over.id) return;
    const group = catGroups.find(g => (g.cat?.id ?? NO_CATEGORY_GROUP_ID) === activeContainerId);
    if (!group) return;
    const ids = group.catTodos.map(t => t.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    reorderTodos(arrayMove(ids, oldIndex, newIndex));
  }

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 pt-10 pb-36">
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

      <div className="mb-2">
        <CategoryFilter activeCatId={activeCatId} onChange={setActiveCatId} />
      </div>
      <p className="text-[11px] text-gray-400 dark:text-gray-600 mb-3">
        💡 할 일을 다른 할 일 가운데로 끌어다 놓으면 하위 항목으로 합쳐져요
      </p>

      {catGroups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Package size={28} className="text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-semibold">저장소가 비어 있어요</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">날짜 없이 할 일을 보관하는 공간이에요</p>
        </div>
      )}

      <DndContext
        sensors={groupSensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleGroupDragEnd}
      >
        {/* 요청에 따라 2단 그리드를 없애고 1단으로 통일 (넓은 화면에서도 카테고리 그룹을 위아래로만 쌓음) */}
        <div>
          {catGroups.map(({ cat, catTodos }) => {
            const groupId = cat?.id ?? NO_CATEGORY_GROUP_ID;
            return (
              <div key={groupId} className="mb-6">
                <div className="mb-2.5 px-1">
                  <div className="flex items-center gap-2">
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
                  {/* 카테고리 설명은 저장소 화면에서만 노출 */}
                  {cat?.description && (
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{cat.description}</p>
                  )}
                </div>

                <DroppableCategoryGroup id={groupId}>
                  <SortableContext id={groupId} items={catTodos.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {catTodos.length > 0 ? (
                      catTodos.map(todo => (
                        <SortableTodoItem key={todo.id} todo={todo} onEdit={openEdit} actions={getTodoActions(todo)} allowSendSubtaskToToday />
                      ))
                    ) : (
                      <div className="h-3" />
                    )}
                  </SortableContext>
                </DroppableCategoryGroup>
                <CategoryQuickAdd categoryId={cat?.id ?? null} onAdd={addToCategoryGroup} />
              </div>
            );
          })}
        </div>
      </DndContext>

      {catGroups.length === 0 && (
        <CategoryQuickAdd categoryId={null} onAdd={addToCategoryGroup} />
      )}

      <div className="fixed bottom-[62px] left-0 right-0 z-40 px-4 lg:px-8 pb-3 max-w-3xl mx-auto">
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
