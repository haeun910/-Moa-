import { useState } from 'react';
import { X, Plus, Trash2, Check, Clock } from 'lucide-react';
import type { Todo, SubTask } from '../types';
import { useApp } from '../context/AppContext';

interface Props {
  todo?: Todo;
  defaultDate?: string;
  defaultTime?: string;
  onClose: () => void;
}

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function TodoModal({ todo, defaultDate, defaultTime, onClose }: Props) {
  const { addTodo, updateTodo, deleteTodo, categories } = useApp();

  const [title, setTitle] = useState(todo?.title ?? '');
  const [date, setDate] = useState(todo?.date ?? defaultDate ?? '');
  const [startTime, setStartTime] = useState(todo?.startTime ?? defaultTime ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(todo?.categoryId ?? null);
  const [notes, setNotes] = useState(todo?.notes ?? '');
  const [subtasks, setSubtasks] = useState<SubTask[]>(todo?.subtasks ?? []);
  const [newSubtask, setNewSubtask] = useState('');

  const isEdit = !!todo;

  function handleSave() {
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      completed: todo?.completed ?? false,
      categoryId,
      date: date || null,
      startTime: startTime || null,
      subtasks,
      notes,
    };
    if (isEdit) {
      updateTodo(todo.id, payload);
    } else {
      addTodo(payload);
    }
    onClose();
  }

  function handleDelete() {
    if (todo) { deleteTodo(todo.id); onClose(); }
  }

  function addSubtask() {
    if (!newSubtask.trim()) return;
    setSubtasks(prev => [...prev, { id: genId(), title: newSubtask.trim(), completed: false }]);
    setNewSubtask('');
  }

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up motion-reduce:animate-none">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {isEdit ? '할 일 편집' : '새 할 일'}
          </h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">제목</label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="할 일을 입력하세요"
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-leaf-400 transition text-sm"
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
            />
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">날짜</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-leaf-400 transition text-sm"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                <Clock size={11} />
                시간
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-leaf-400 transition text-sm"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">카테고리</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategoryId(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  categoryId === null
                    ? 'bg-leaf-300 border-leaf-300 text-leaf-800'
                    : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400'
                }`}
              >
                없음
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    categoryId === cat.id
                      ? 'border-transparent text-gray-800'
                      : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                  }`}
                  style={categoryId === cat.id ? { backgroundColor: cat.color } : {}}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: categoryId === cat.id ? 'rgba(0,0,0,0.35)' : cat.color }}
                  />
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">메모</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="메모를 입력하세요 (선택)"
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-leaf-400 transition text-sm resize-none"
            />
          </div>

          {/* Subtasks */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">하위 항목</label>
            <div className="space-y-2 mb-2">
              {subtasks.map(sub => (
                <div key={sub.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <Check size={13} className="text-gray-400 flex-shrink-0" />
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{sub.title}</span>
                  <button onClick={() => setSubtasks(p => p.filter(s => s.id !== sub.id))} className="text-gray-400 hover:text-red-500 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                placeholder="하위 항목 추가"
                className="flex-1 px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-leaf-400 transition text-sm"
                onKeyDown={e => { if (e.key === 'Enter') addSubtask(); }}
              />
              <button
                onClick={addSubtask}
                className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
          {isEdit && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-red-500 border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
            >
              <Trash2 size={15} />
              삭제
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="flex-1 py-2.5 rounded-xl bg-leaf-300 hover:bg-leaf-400 disabled:opacity-40 text-leaf-800 transition-colors text-sm font-semibold"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
