import { useState, useRef } from 'react';
import { Check, ChevronDown, ChevronUp, Trash2, Plus, Clock } from 'lucide-react';
import type { Todo } from '../types';
import { useApp } from '../context/AppContext';

interface Props {
  todo: Todo;
  onEdit: (todo: Todo) => void;
  actions?: React.ReactNode;
}

export default function TodoItem({ todo, onEdit, actions }: Props) {
  const { toggleTodo, toggleSubTask, deleteTodo, addSubtaskInline, deleteSubtaskInline, categories } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const subtaskInputRef = useRef<HTMLInputElement>(null);

  const category = categories.find(c => c.id === todo.categoryId);
  const subtaskDone = todo.subtasks.filter(s => s.completed).length;
  const subtaskTotal = todo.subtasks.length;

  async function handleAddSubtask() {
    const title = newSubtask.trim();
    if (!title) { setAddingSubtask(false); return; }
    await addSubtaskInline(todo.id, title);
    setNewSubtask('');
    subtaskInputRef.current?.focus();
  }

  function openSubtaskAdd() {
    setExpanded(true);
    setAddingSubtask(true);
    setTimeout(() => subtaskInputRef.current?.focus(), 50);
  }

  return (
    <div
      className={`relative bg-white dark:bg-gray-900 rounded-2xl border mb-2 overflow-hidden transition-all duration-200 ${
        showDelete
          ? 'border-gray-300 dark:border-gray-700 shadow-md'
          : 'border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700'
      }`}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      {/* Category color strip */}
      {category && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ backgroundColor: category.color }}
        />
      )}

      <div className={`flex items-center gap-3 px-4 py-3.5 ${category ? 'pl-[18px]' : ''}`}>
        {/* Checkbox */}
        <button
          onClick={() => toggleTodo(todo.id)}
          aria-label={todo.completed ? '완료 취소' : '완료 처리'}
          className={`flex-shrink-0 w-[18px] h-[18px] rounded-[5px] border-2 flex items-center justify-center transition-all duration-200 ${
            todo.completed
              ? 'bg-leaf-300 border-leaf-300 shadow-[0_0_0_3px_rgba(107,133,52,0.2)]'
              : 'border-gray-300 dark:border-gray-600 hover:border-leaf-400 dark:hover:border-leaf-500'
          }`}
        >
          {todo.completed && <Check size={10} className="text-leaf-800 stroke-[3.5px]" />}
        </button>

        {/* Title + meta */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(todo)}>
          <span className={`block text-[14px] font-medium leading-snug transition-colors ${
            todo.completed
              ? 'line-through text-gray-300 dark:text-gray-600'
              : 'text-gray-800 dark:text-gray-100'
          }`}>
            {todo.title}
          </span>
          {(todo.startTime || subtaskTotal > 0) && (
            <div className="flex items-center gap-2 mt-0.5">
              {todo.startTime && (
                <span className="flex items-center gap-0.5 text-[11px] text-leaf-500 dark:text-leaf-400 font-medium">
                  <Clock size={10} />
                  {todo.startTime}
                </span>
              )}
              {subtaskTotal > 0 && (
                <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
                  subtaskDone === subtaskTotal
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}>
                  {subtaskDone}/{subtaskTotal}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions (hover) */}
        {actions && (
          <div className={`flex items-center gap-1 flex-shrink-0 transition-opacity duration-200 ${showDelete ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {actions}
          </div>
        )}

        {/* Add subtask */}
        <button
          onClick={openSubtaskAdd}
          aria-label="하위 항목 추가"
          className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-leaf-500 hover:bg-leaf-50 dark:hover:bg-leaf-900/20 transition-all duration-200 ${
            showDelete ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          title="하위 항목 추가"
        >
          <Plus size={14} />
        </button>

        {/* Expand */}
        {(subtaskTotal > 0 || addingSubtask) && (
          <button
            onClick={() => setExpanded(v => !v)}
            aria-label={expanded ? '하위 항목 접기' : '하위 항목 펼치기'}
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        )}

        {/* Delete */}
        <button
          onClick={() => deleteTodo(todo.id)}
          aria-label="삭제"
          className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 ${
            showDelete ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 pointer-events-none'
          }`}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Subtasks */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/40">
          {todo.subtasks.map(sub => (
            <div key={sub.id} className={`flex items-center gap-3 px-4 py-2 group/sub ${category ? 'pl-[18px]' : ''}`}>
              <button
                onClick={() => toggleSubTask(todo.id, sub.id)}
                aria-label={sub.completed ? '완료 취소' : '완료 처리'}
                className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                  sub.completed
                    ? 'bg-leaf-300 border-leaf-300'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {sub.completed && <Check size={8} className="text-leaf-800 stroke-[3px]" />}
              </button>
              <span className={`text-sm flex-1 transition-colors ${
                sub.completed ? 'line-through text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'
              }`}>
                {sub.title}
              </span>
              <button
                onClick={() => deleteSubtaskInline(todo.id, sub.id)}
                aria-label="하위 항목 삭제"
                className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover/sub:opacity-100 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          {addingSubtask ? (
            <div className={`flex items-center gap-2 px-4 py-2 ${category ? 'pl-[18px]' : ''}`}>
              <div className="w-4 h-4 rounded border-2 border-gray-200 dark:border-gray-700 flex-shrink-0" />
              <input
                ref={subtaskInputRef}
                type="text"
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                placeholder="하위 항목 입력..."
                className="flex-1 text-sm bg-transparent text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddSubtask();
                  if (e.key === 'Escape') { setAddingSubtask(false); setNewSubtask(''); }
                }}
                onBlur={() => {
                  if (!newSubtask.trim()) setAddingSubtask(false);
                  else handleAddSubtask();
                }}
              />
            </div>
          ) : (
            <button
              onClick={openSubtaskAdd}
              className={`flex items-center gap-2 px-4 py-2 w-full text-left text-xs text-gray-400 dark:text-gray-500 hover:text-leaf-500 dark:hover:text-leaf-400 transition-colors ${category ? 'pl-[18px]' : ''}`}
            >
              <Plus size={13} />
              하위 항목 추가
            </button>
          )}
        </div>
      )}
    </div>
  );
}
