import { useState, useRef } from 'react';
import { Plus, Send, CalendarCheck, CalendarDays, Package, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, useDroppable,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useApp } from '../context/AppContext';
import { applyListDisplaySettings } from '../lib/listDisplay';
import SortableTodoItem from '../components/SortableTodoItem';
import TodoModal from '../components/TodoModal';
import CategoryFilter from '../components/CategoryFilter';
import type { Todo, Category, Subcategory } from '../types';

const NO_CATEGORY_GROUP_ID = '__none__';

interface TodoGroup {
  id: string;
  categoryId: string | null;
  subcategoryId: string | null;
  todos: Todo[];
}

// 그룹 하나(카테고리 자체 / 하위카테고리)를 드롭 대상 영역으로 만듦.
// (항목이 하나도 없는 그룹에도 다른 곳의 할 일을 끌어다 놓을 수 있어야 하므로 필요)
function DroppableGroup({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`rounded-2xl transition-colors ${isOver ? 'bg-leaf-50/60 dark:bg-leaf-900/10 ring-2 ring-leaf-300 dark:ring-leaf-700' : ''}`}>
      {children}
    </div>
  );
}

function TodoGroupList({ group, onEdit, actions }: { group: TodoGroup; onEdit: (todo: Todo) => void; actions: (todo: Todo) => React.ReactNode }) {
  return (
    <DroppableGroup id={group.id}>
      <SortableContext id={group.id} items={group.todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
        {group.todos.length > 0 ? (
          group.todos.map(todo => (
            <SortableTodoItem key={todo.id} todo={todo} onEdit={onEdit} actions={actions(todo)} completeMovesToToday />
          ))
        ) : (
          <div className="h-3" />
        )}
      </SortableContext>
    </DroppableGroup>
  );
}

// 하위카테고리 하나: 접었다 펼 수 있고, 그 안에 바로 할 일을 입력할 수 있음
function SubcategorySection({
  subcat, group, onEdit, actions, onAdd,
}: {
  subcat: Subcategory;
  group: TodoGroup;
  onEdit: (todo: Todo) => void;
  actions: (todo: Todo) => React.ReactNode;
  onAdd: (title: string, catId: string | null, subcatId: string | null) => Promise<void>;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="mb-3 pl-3 border-l-2 border-gray-100 dark:border-gray-800">
      <button onClick={() => setCollapsed(v => !v)} className="flex items-center gap-1.5 mb-1.5 px-1 hover:opacity-70 transition-opacity">
        {collapsed ? <ChevronRight size={13} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={13} className="text-gray-400 flex-shrink-0" />}
        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{subcat.name}</span>
        <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">{group.todos.length}</span>
      </button>
      {!collapsed && (
        <>
          <TodoGroupList group={group} onEdit={onEdit} actions={actions} />
          <CategoryQuickAdd categoryId={group.categoryId} subcategoryId={group.subcategoryId} onAdd={onAdd} />
        </>
      )}
    </div>
  );
}

// 지난 날짜를 포함해 원하는 날짜로 바로 보낼 수 있는 버튼.
// ("오늘로"는 오늘 날짜 전용이라 지나간 날짜에 등록하려면 상세 편집을 열어야 했음)
function SendToDateButton({ todo }: { todo: Todo }) {
  const { updateTodo } = useApp();
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
            if (e.target.value) updateTodo(todo.id, { date: e.target.value });
            setOpen(false);
          }}
          onBlur={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function CategoryQuickAdd({ categoryId, subcategoryId, onAdd }: { categoryId: string | null; subcategoryId: string | null; onAdd: (title: string, catId: string | null, subcatId: string | null) => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  async function submit() {
    const t = title.trim();
    if (!t || loading) return;
    setLoading(true);
    try { await onAdd(t, categoryId, subcategoryId); setTitle(''); ref.current?.focus(); }
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

// 카테고리 하나에 하위카테고리를 빠르게 추가하는 인라인 컨트롤
// (본격적인 이름 변경/삭제/순서는 설정 > 카테고리 관리에서)
function AddSubcategoryInline({ categoryId }: { categoryId: string }) {
  const { addSubcategory } = useApp();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  async function submit() {
    const t = name.trim();
    if (!t) { setAdding(false); return; }
    await addSubcategory(categoryId, t);
    setName('');
    setAdding(false);
  }

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="mt-1 flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500 hover:text-leaf-500 dark:hover:text-leaf-400 transition-colors px-1"
      >
        <Plus size={11} />
        하위카테고리 추가
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 mt-1 px-1">
      <input
        autoFocus
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="하위카테고리 이름"
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setAdding(false); }}
        onBlur={() => { if (!name.trim()) setAdding(false); }}
        className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-leaf-400"
      />
      <button onClick={submit} className="w-6 h-6 rounded-md bg-leaf-300 text-leaf-800 flex items-center justify-center flex-shrink-0">
        <Check size={12} />
      </button>
    </div>
  );
}

export default function AllTodosPage() {
  const { todos: allTodos, categories, subcategories, settings, addTodo, updateTodo, reorderTodos } = useApp();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // 저장소 = 날짜 없이 보관 중인 할 일만 (날짜가 정해지면 저장소에서는 사라져야 함)
  // + 설정의 "목록 표시" 옵션(정렬/완료 숨기기/카테고리 표시 여부) 적용
  const todos = applyListDisplaySettings(allTodos.filter(t => !t.date), settings);

  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editTodo, setEditTodo] = useState<Todo | undefined>();
  const [quickTitle, setQuickTitle] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);
  const quickInputRef = useRef<HTMLInputElement>(null);

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
      await addTodo({ title, completed: false, categoryId: activeCatId, subcategoryId: null, date: null, startTime: null, notes: '' });
      setQuickTitle('');
      quickInputRef.current?.focus();
    } finally { setQuickLoading(false); }
  }

  async function addToCategoryGroup(title: string, catId: string | null, subcatId: string | null) {
    await addTodo({ title, completed: false, categoryId: catId, subcategoryId: subcatId, date: null, startTime: null, notes: '' });
  }

  async function sendToToday(todo: Todo) {
    await updateTodo(todo.id, { date: todayStr });
  }

  // 비슷한 할 일을 매번 새로 입력하지 않도록, 기존 할 일을 그대로 복제해서 저장소에 새 항목으로 추가
  async function duplicateTodo(todo: Todo) {
    await addTodo({
      title: todo.title,
      completed: false,
      categoryId: todo.categoryId,
      subcategoryId: todo.subcategoryId,
      date: null,
      startTime: todo.startTime ?? null,
      notes: todo.notes ?? '',
    });
  }

  function getTodoActions(todo: Todo) {
    return (
      <>
        <button
          onClick={e => { e.stopPropagation(); sendToToday(todo); }}
          className="flex items-center gap-1 text-[10px] font-semibold text-leaf-600 hover:text-leaf-800 dark:text-leaf-400 dark:hover:text-leaf-200 bg-leaf-50 hover:bg-leaf-300 dark:bg-leaf-900/30 dark:hover:bg-leaf-700 px-2 py-1 rounded-lg transition-all whitespace-nowrap"
          title="오늘 날짜로 이동"
        >
          <CalendarCheck size={11} />
          오늘로
        </button>
        <SendToDateButton todo={todo} />
        <button
          onClick={e => { e.stopPropagation(); duplicateTodo(todo); }}
          className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 px-2 py-1 rounded-lg transition-all whitespace-nowrap"
          title="복사해서 새로 추가"
        >
          <Copy size={11} />
          복사
        </button>
      </>
    );
  }

  const repoTodoCount = todos.length;
  const completedCount = todos.filter(t => t.completed).length;

  // ── 그룹 구성 헬퍼 ──────────────────────────────────────────
  function subcatGroupsOf(catId: string) {
    return subcategories
      .filter(sc => sc.categoryId === catId)
      .map(sc => ({
        subcat: sc,
        group: { id: `subcat-${sc.id}`, categoryId: catId, subcategoryId: sc.id, todos: todos.filter(t => t.subcategoryId === sc.id) } as TodoGroup,
      }));
  }
  function bareGroupOf(catId: string): TodoGroup {
    return { id: `cat-${catId}`, categoryId: catId, subcategoryId: null, todos: todos.filter(t => t.categoryId === catId && !t.subcategoryId) };
  }
  const noCategoryGroup: TodoGroup = { id: NO_CATEGORY_GROUP_ID, categoryId: null, subcategoryId: null, todos: todos.filter(t => !t.categoryId) };

  function findGroupById(id: string): TodoGroup | undefined {
    if (id === NO_CATEGORY_GROUP_ID) return noCategoryGroup;
    if (id.startsWith('subcat-')) {
      const sc = subcategories.find(s => s.id === id.slice('subcat-'.length));
      if (!sc) return undefined;
      return { id, categoryId: sc.categoryId, subcategoryId: sc.id, todos: todos.filter(t => t.subcategoryId === sc.id) };
    }
    if (id.startsWith('cat-')) {
      const catId = id.slice('cat-'.length);
      return { id, categoryId: catId, subcategoryId: null, todos: todos.filter(t => t.categoryId === catId && !t.subcategoryId) };
    }
    return undefined;
  }

  // 그룹(카테고리 자체 / 하위카테고리) 사이를 넘나드는 드래그앤드롭 처리.
  function handleGroupDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeTodo = todos.find(t => t.id === active.id);
    if (!activeTodo) return;

    type SortableData = { sortable?: { containerId: string } };
    const activeGroupId =
      (active.data.current as SortableData | undefined)?.sortable?.containerId
      ?? (activeTodo.subcategoryId ? `subcat-${activeTodo.subcategoryId}` : activeTodo.categoryId ? `cat-${activeTodo.categoryId}` : NO_CATEGORY_GROUP_ID);
    const overGroupId =
      (over.data.current as SortableData | undefined)?.sortable?.containerId
      ?? (over.id as string);

    if (activeGroupId !== overGroupId) {
      // 다른 그룹(카테고리/하위카테고리) 위에 놓음 → 소속 변경
      const targetGroup = findGroupById(overGroupId);
      if (!targetGroup) return;
      updateTodo(activeTodo.id, { categoryId: targetGroup.categoryId, subcategoryId: targetGroup.subcategoryId });
      return;
    }

    // 같은 그룹 안에서는 순서만 변경
    if (active.id === over.id) return;
    const group = findGroupById(activeGroupId);
    if (!group) return;
    const ids = group.todos.map(t => t.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    reorderTodos(arrayMove(ids, oldIndex, newIndex));
  }

  function renderCategoryBlock(cat: Category) {
    const subGroups = subcatGroupsOf(cat.id);
    const bare = bareGroupOf(cat.id);
    const totalCount = bare.todos.length + subGroups.reduce((n, { group }) => n + group.todos.length, 0);
    return (
      <div key={cat.id} className="mb-7">
        <div className="mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200 tracking-wide">{cat.name}</span>
            <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">{totalCount}</span>
          </div>
          {/* 카테고리 설명은 저장소 화면에서만 노출 */}
          {cat.description && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{cat.description}</p>
          )}
        </div>

        {subGroups.length === 0 ? (
          <TodoGroupList group={bare} onEdit={openEdit} actions={getTodoActions} />
        ) : (
          <>
            {bare.todos.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1.5 px-1">분류 없음</p>
                <TodoGroupList group={bare} onEdit={openEdit} actions={getTodoActions} />
              </div>
            )}
            {subGroups.map(({ subcat, group }) => (
              <SubcategorySection key={subcat.id} subcat={subcat} group={group} onEdit={openEdit} actions={getTodoActions} onAdd={addToCategoryGroup} />
            ))}
          </>
        )}

        <CategoryQuickAdd categoryId={cat.id} subcategoryId={null} onAdd={addToCategoryGroup} />
        <AddSubcategoryInline categoryId={cat.id} />
      </div>
    );
  }

  if (activeCatId !== null) {
    const cat = categories.find(c => c.id === activeCatId);
    const filteredCount = todos.filter(t => t.categoryId === activeCatId).length;

    return (
      <div className="max-w-3xl mx-auto px-4 lg:px-8 pt-10 pb-36">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">저장소</h1>
          <p className="text-sm text-gray-400 mt-0.5">{repoTodoCount}개 · 완료 {completedCount}개</p>
        </div>
        <div className="mb-4">
          <CategoryFilter activeCatId={activeCatId} onChange={setActiveCatId} />
        </div>

        {filteredCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
              <Package size={24} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">이 카테고리에 할 일이 없어요</p>
          </div>
        ) : (
          <DndContext sensors={groupSensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleGroupDragEnd}>
            {cat && renderCategoryBlock(cat)}
          </DndContext>
        )}

        <div className="fixed bottom-[62px] left-0 right-0 z-40 px-4 lg:px-8 pb-3 max-w-3xl mx-auto">
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
        {showModal && <TodoModal todo={editTodo} defaultCategoryId={activeCatId} onClose={closeModal} />}
      </div>
    );
  }

  const isEmpty = categories.length === 0 && noCategoryGroup.todos.length === 0;

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

      <div className="mb-5">
        <CategoryFilter activeCatId={activeCatId} onChange={setActiveCatId} />
      </div>

      {isEmpty && (
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
        <div>
          {categories.map(renderCategoryBlock)}
          {noCategoryGroup.todos.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 tracking-wide">분류 없음</span>
                <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">{noCategoryGroup.todos.length}</span>
              </div>
              <TodoGroupList group={noCategoryGroup} onEdit={openEdit} actions={getTodoActions} />
              <CategoryQuickAdd categoryId={null} subcategoryId={null} onAdd={addToCategoryGroup} />
            </div>
          )}
        </div>
      </DndContext>

      {categories.length === 0 && noCategoryGroup.todos.length === 0 && (
        <CategoryQuickAdd categoryId={null} subcategoryId={null} onAdd={addToCategoryGroup} />
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
    </div>
  );
}
