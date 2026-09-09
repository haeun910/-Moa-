import { useState } from 'react';
import { X, CalendarCheck, Check } from 'lucide-react';
import { format } from 'date-fns';
import { useApp } from '../context/AppContext';
import type { Todo } from '../types';

export default function SubtaskMoveModal({ todo, onClose }: { todo: Todo; onClose: () => void }) {
  const { addTodo, updateTodo } = useApp();
  const [checked, setChecked] = useState<Set<string>>(new Set(todo.subtasks.map(s => s.id)));
  const [saving, setSaving] = useState(false);

  const allChecked = checked.size === todo.subtasks.length;
  const noneChecked = checked.size === 0;

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setChecked(allChecked ? new Set() : new Set(todo.subtasks.map(s => s.id)));
  }

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  async function handleConfirm() {
    if (noneChecked || saving) return;
    setSaving(true);
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const selected = todo.subtasks.filter(s => checked.has(s.id));
      const remaining = todo.subtasks.filter(s => !checked.has(s.id));

      if (remaining.length === 0) {
        // 하위 항목을 전부 골랐으면 할 일 자체를 그대로 오늘로 이동 (같은 항목 유지)
        await updateTodo(todo.id, { date: todayStr });
      } else {
        // 일부만 골랐으면: 큰 할 일 + 고른 하위 항목만 오늘 날짜의 새 할 일로 옮기고,
        // 나머지 하위 항목은 원래 할 일(저장소)에 그대로 남긴다.
        await addTodo({
          title: todo.title,
          completed: false,
          categoryId: todo.categoryId,
          date: todayStr,
          startTime: null,
          subtasks: selected.map(s => ({ id: s.id, title: s.title, completed: s.completed })),
          notes: '',
        });
        await updateTodo(todo.id, { subtasks: remaining });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={handleBackdrop}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <CalendarCheck size={16} className="text-leaf-600 flex-shrink-0" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">오늘로 옮길 항목 선택</h2>
          </div>
          <button onClick={onClose} aria-label="닫기"
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0">
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 truncate">{todo.title}</p>

          <div className="flex items-center justify-between mb-2 px-0.5">
            <span className="text-xs text-gray-400 dark:text-gray-500">하위 항목 {checked.size}/{todo.subtasks.length}개 선택</span>
            <button onClick={toggleAll} className="text-xs font-semibold text-leaf-600 hover:text-leaf-700 dark:text-leaf-400">
              {allChecked ? '전체 해제' : '전체 선택'}
            </button>
          </div>

          <div className="space-y-1">
            {todo.subtasks.map(sub => {
              const isChecked = checked.has(sub.id);
              return (
                <button
                  key={sub.id}
                  onClick={() => toggle(sub.id)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors text-left"
                >
                  <span className={`flex-shrink-0 w-[18px] h-[18px] rounded-[5px] border-2 flex items-center justify-center transition-colors ${
                    isChecked ? 'bg-leaf-300 border-leaf-300' : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {isChecked && <Check size={11} className="text-leaf-800" strokeWidth={3} />}
                  </span>
                  <span className={`flex-1 text-sm truncate ${sub.completed ? 'line-through text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}`}>
                    {sub.title}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-3 leading-relaxed">
            {noneChecked
              ? '하위 항목을 하나 이상 선택해주세요.'
              : allChecked
                ? '전체를 선택했어요. 이 할 일 전체가 오늘로 이동해요.'
                : '선택한 항목만 오늘 할 일로 옮기고, 나머지는 저장소에 그대로 남아요.'}
          </p>
        </div>

        <div className="flex-shrink-0 flex gap-2 px-6 pb-5 pt-1">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium transition-colors">
            취소
          </button>
          <button onClick={handleConfirm} disabled={noneChecked || saving}
            className="flex-1 py-2.5 rounded-xl bg-leaf-300 hover:bg-leaf-400 disabled:opacity-40 text-leaf-800 text-sm font-semibold transition-colors">
            {saving ? '이동 중...' : `오늘로 이동 (${checked.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
