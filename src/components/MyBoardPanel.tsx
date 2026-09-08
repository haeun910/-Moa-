import { useState } from 'react';
import { X, Check, Plus, GripVertical } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { useApp } from '../context/AppContext';
import type { Todo } from '../types';

function BoardTodo({ todo, onToggle }: { todo: Todo; onToggle: () => void }) {
  const { categories } = useApp();
  const cat = categories.find(c => c.id === todo.categoryId);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow group/board"
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="순서 변경"
        className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none text-gray-300 dark:text-gray-600 opacity-0 group-hover/board:opacity-100 transition-opacity"
      >
        <GripVertical size={13} />
      </button>
      <div className="flex-1 min-w-0 flex items-center gap-2.5 cursor-pointer" onClick={onToggle}>
        <div className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
          todo.completed ? 'bg-leaf-300 border-leaf-300' : 'border-gray-300 dark:border-gray-500'
        }`}>
          {todo.completed && <Check size={9} className="text-leaf-800" strokeWidth={3} />}
        </div>
        <div className="flex-1 min-w-0">
          {cat && <div className="w-full h-0.5 rounded-full mb-1" style={{ backgroundColor: cat.color }} />}
          <span className={`text-xs font-medium leading-tight truncate block ${
            todo.completed ? 'line-through text-gray-300 dark:text-gray-600' : 'text-gray-800 dark:text-gray-200'
          }`}>{todo.title}</span>
        </div>
      </div>
    </div>
  );
}

function BoardSection({
  title, subtitle, accentColor, todos, onToggle, onAdd, onReorder,
}: {
  title: string;
  subtitle: string;
  accentColor: string;
  todos: Todo[];
  onToggle: (id: string) => void;
  onAdd: (title: string) => void;
  onReorder: (orderedIds: string[]) => void;
}) {
  const [input, setInput] = useState('');
  const done = todos.filter(t => t.completed).length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = todos.map(t => t.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    onReorder(arrayMove(ids, oldIndex, newIndex));
  }

  function submit() {
    if (!input.trim()) return;
    onAdd(input.trim());
    setInput('');
  }

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: accentColor }} />
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{title}</p>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 ml-3">{subtitle}</p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: accentColor }}>
          {done}/{todos.length}
        </span>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
        <SortableContext items={todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 mb-2">
            {todos.map(todo => (
              <BoardTodo key={todo.id} todo={todo} onToggle={() => onToggle(todo.id)} />
            ))}
            {todos.length === 0 && (
              <p className="text-[11px] text-gray-300 dark:text-gray-600 text-center py-3">할 일이 없어요</p>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="+ 할 일 추가"
          className="flex-1 text-xs bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none"
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
        />
        {input.trim() && (
          <button onClick={submit} aria-label="추가"
            className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-white"
            style={{ backgroundColor: accentColor }}>
            <Plus size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function MyBoardPanel({ onClose }: { onClose: () => void }) {
  const { todos, toggleTodo, addTodo, reorderTodos } = useApp();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const todayTodos = todos.filter(t => t.date === todayStr);
  const tomorrowTodos = todos.filter(t => t.date === tomorrowStr);

  async function add(title: string, date: string) {
    await addTodo({ title, completed: false, categoryId: null, date, startTime: null, subtasks: [], notes: '' });
  }

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
        className="absolute right-0 top-0 bottom-0 w-96 bg-gray-50 dark:bg-gray-900 shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">My Board</h2>
          </div>
          <button onClick={onClose} aria-label="닫기"
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={16} />
          </button>
        </div>

        {/* Board columns */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          <BoardSection
            title="오늘 할 일"
            subtitle={format(new Date(), 'M월 d일 EEEE', { locale: ko })}
            accentColor="#687D2F"
            todos={todayTodos}
            onToggle={id => toggleTodo(id)}
            onAdd={title => add(title, todayStr)}
            onReorder={reorderTodos}
          />
          <div className="border-t border-gray-200 dark:border-gray-800" />
          <BoardSection
            title="내일 할 일"
            subtitle={format(addDays(new Date(), 1), 'M월 d일 EEEE', { locale: ko })}
            accentColor="#8b5cf6"
            todos={tomorrowTodos}
            onToggle={id => toggleTodo(id)}
            onAdd={title => add(title, tomorrowStr)}
            onReorder={reorderTodos}
          />
        </div>
      </div>
    </div>
  );
}
