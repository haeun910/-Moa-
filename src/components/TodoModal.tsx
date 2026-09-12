import { useState } from 'react';
import { X, Plus, Trash2, Check, Clock, Flag, Repeat } from 'lucide-react';
import { addDays, addWeeks, addMonths, parseISO, format, isAfter } from 'date-fns';
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

type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly';
const REPEAT_MAX_OCCURRENCES = 60; // 종료일을 너무 멀리 잡아도 한 번에 너무 많이 만들어지지 않도록 안전장치

// 반복 시작일부터 종료일까지의 날짜 목록을 미리 계산 (반복 "규칙"이 아니라 각 회차를 실제 할 일로 만드는 방식)
function buildRecurringDates(startDate: string, untilDate: string, type: RepeatType): string[] {
  const until = parseISO(untilDate);
  const dates: string[] = [];
  let cur = parseISO(startDate);
  while (!isAfter(cur, until) && dates.length < REPEAT_MAX_OCCURRENCES) {
    dates.push(format(cur, 'yyyy-MM-dd'));
    cur = type === 'daily' ? addDays(cur, 1) : type === 'weekly' ? addWeeks(cur, 1) : addMonths(cur, 1);
  }
  return dates;
}

export default function TodoModal({ todo, defaultDate, defaultTime, onClose }: Props) {
  const { addTodo, updateTodo, deleteTodo, categories } = useApp();

  const [title, setTitle] = useState(todo?.title ?? '');
  const [date, setDate] = useState(todo?.date ?? defaultDate ?? '');
  const [dueDate, setDueDate] = useState(todo?.dueDate ?? '');
  const [isDday, setIsDday] = useState(todo?.isDday ?? false);
  const [startTime, setStartTime] = useState(todo?.startTime ?? defaultTime ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(todo?.categoryId ?? null);
  const [notes, setNotes] = useState(todo?.notes ?? '');
  const [subtasks, setSubtasks] = useState<SubTask[]>(todo?.subtasks ?? []);
  const [newSubtask, setNewSubtask] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // 반복은 새로 만드는 할 일에만 적용(이미 만든 할 일을 나중에 "반복"으로 바꾸는 건 지원 안 함).
  // 각 회차는 독립된 할 일로 각각 생성되고, 이후 수정/삭제도 그 회차만 개별적으로 이뤄짐.
  const [repeatType, setRepeatType] = useState<RepeatType>('none');
  const [repeatUntil, setRepeatUntil] = useState('');
  const [saving, setSaving] = useState(false);

  const isEdit = !!todo;
  const repeatDates = !isEdit && repeatType !== 'none' && date && repeatUntil
    ? buildRecurringDates(date, repeatUntil, repeatType)
    : [];

  async function handleSave() {
    if (!title.trim() || saving) return;
    const payload = {
      title: title.trim(),
      completed: todo?.completed ?? false,
      categoryId,
      date: date || null,
      dueDate: dueDate || null,
      isDday: Boolean((date || dueDate) && isDday),
      startTime: startTime || null,
      subtasks,
      notes,
    };
    if (isEdit) {
      await updateTodo(todo.id, payload);
      onClose();
      return;
    }
    if (repeatDates.length > 0) {
      setSaving(true);
      try {
        for (const d of repeatDates) {
          await addTodo({ ...payload, date: d });
        }
      } finally {
        setSaving(false);
      }
    } else {
      await addTodo(payload);
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

  function editSubtaskTitle(id: string, title: string) {
    setSubtasks(prev => prev.map(s => s.id === id ? { ...s, title } : s));
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

          {/* Due date (작업할 날짜와는 별개인 마감일) */}
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              <Flag size={11} />
              마감일
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-leaf-400 transition text-sm"
            />
            <label className={`flex items-center gap-2 mt-2 text-xs ${(date || dueDate) ? 'text-gray-500 dark:text-gray-400 cursor-pointer' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}>
              <input
                type="checkbox"
                checked={isDday}
                disabled={!date && !dueDate}
                onChange={e => setIsDday(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-leaf-500"
              />
              홈 화면 D-Day 목록에도 표시 (마감일이 있으면 마감일, 없으면 날짜 기준)
            </label>
          </div>

          {/* Repeat (새 할 일에만 적용) */}
          {!isEdit && (
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                <Repeat size={11} />
                반복
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {([
                  ['none', '반복 안 함'],
                  ['daily', '매일'],
                  ['weekly', '매주'],
                  ['monthly', '매월'],
                ] as [RepeatType, string][]).map(([type, label]) => (
                  <button
                    key={type}
                    onClick={() => setRepeatType(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      repeatType === type
                        ? 'bg-leaf-300 border-leaf-300 text-leaf-800'
                        : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {repeatType !== 'none' && (
                <>
                  {!date ? (
                    <p className="text-xs text-amber-500">먼저 위에서 날짜를 선택해주세요.</p>
                  ) : (
                    <>
                      <input
                        type="date"
                        value={repeatUntil}
                        min={date}
                        onChange={e => setRepeatUntil(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-leaf-400 transition text-sm"
                      />
                      <p className="text-[11px] text-gray-400 mt-1.5">
                        {repeatUntil
                          ? `이 날짜까지 총 ${repeatDates.length}개의 할 일이 각각 만들어져요${repeatDates.length >= REPEAT_MAX_OCCURRENCES ? ` (최대 ${REPEAT_MAX_OCCURRENCES}개)` : ''}.`
                          : '반복을 끝낼 날짜를 선택해주세요.'}
                        {' '}이후 각 항목은 서로 독립적이라 개별적으로 수정·삭제할 수 있어요.
                      </p>
                    </>
                  )}
                </>
              )}
            </div>
          )}

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
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">세부 할일</label>
            <div className="space-y-2 mb-2">
              {subtasks.map(sub => (
                <div key={sub.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <Check size={13} className="text-gray-400 flex-shrink-0" />
                  {editingSubtaskId === sub.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={sub.title}
                      onChange={e => editSubtaskTitle(sub.id, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingSubtaskId(null); }}
                      onBlur={() => setEditingSubtaskId(null)}
                      className="flex-1 text-sm bg-transparent border-b border-leaf-400 text-gray-900 dark:text-white focus:outline-none"
                    />
                  ) : (
                    <span
                      onClick={() => setEditingSubtaskId(sub.id)}
                      title="눌러서 수정"
                      className="flex-1 text-sm text-gray-700 dark:text-gray-300 cursor-text"
                    >
                      {sub.title}
                    </span>
                  )}
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
                placeholder="세부 할일 추가"
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
            confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <button onClick={() => setConfirmDelete(false)}
                  className="px-3 py-2.5 rounded-xl text-gray-500 bg-gray-100 dark:bg-gray-800 text-sm font-medium">취소</button>
                <button onClick={handleDelete}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold">
                  <Trash2 size={15} />
                  정말 삭제
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-red-500 border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
              >
                <Trash2 size={15} />
                삭제
              </button>
            )
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="flex-1 py-2.5 rounded-xl bg-leaf-300 hover:bg-leaf-400 disabled:opacity-40 text-leaf-800 transition-colors text-sm font-semibold"
          >
            {saving ? `저장 중... (${repeatDates.length}개)` : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
