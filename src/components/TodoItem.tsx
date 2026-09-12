import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, ChevronUp, Trash2, Plus, Clock, CalendarCheck, Flag } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Todo, SubTask } from '../types';
import { useApp } from '../context/AppContext';

interface Props {
  todo: Todo;
  onEdit: (todo: Todo) => void;
  actions?: React.ReactNode;
  // 하위 항목이 모두 완료되면 이 할 일도 자동으로 완료 처리(반대로 새 하위 항목이 생기면 완료 해제).
  // 홈 화면에서만 켜서 쓰고, 저장소에서는 기존처럼 서로 영향 없게 둠.
  autoCompleteSubtasks?: boolean;
  // 저장소에서만: 세부 할일 하나만 콕 집어 오늘로 보낼 수 있는 버튼을 보여줌
  // (여러 개를 골라 옮기는 "하위 선택" 일괄 이동 기능은 그대로 유지됨)
  allowSendSubtaskToToday?: boolean;
  // 저장소에서만: 체크박스를 눌러 완료 처리하면 자동으로 오늘 날짜로 이동시킴
  completeMovesToToday?: boolean;
}

export default function TodoItem({ todo, onEdit, actions, autoCompleteSubtasks, allowSendSubtaskToToday, completeMovesToToday }: Props) {
  const { toggleTodo, toggleSubTask, deleteTodo, updateTodo, moveSubtasksToDate, addSubtaskInline, updateSubtaskInline, deleteSubtaskInline, categories } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  const subtaskInputRef = useRef<HTMLInputElement>(null);
  // 한 번 누르면 상세 편집 모달, 두 번 누르면(더블클릭) 목록에서 바로 이름만 빠르게 수정.
  // 두 클릭을 구분하기 위해 첫 클릭을 잠깐 미뤄뒀다가, 그 사이 두 번째 클릭이 오면 취소함.
  const titleClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (titleClickTimer.current) clearTimeout(titleClickTimer.current); }, []);

  const category = categories.find(c => c.id === todo.categoryId);
  const subtaskDone = todo.subtasks.filter(s => s.completed).length;
  const subtaskTotal = todo.subtasks.length;
  const autoOpts = { autoCompleteParent: autoCompleteSubtasks };
  const isOverdue = Boolean(todo.dueDate) && !todo.completed && todo.dueDate! < format(new Date(), 'yyyy-MM-dd');

  async function handleAddSubtask() {
    const title = newSubtask.trim();
    if (!title) { setAddingSubtask(false); return; }
    await addSubtaskInline(todo.id, title, autoOpts);
    setNewSubtask('');
    subtaskInputRef.current?.focus();
  }

  function openSubtaskAdd() {
    setExpanded(true);
    setAddingSubtask(true);
    setTimeout(() => subtaskInputRef.current?.focus(), 50);
  }

  function startEditSubtask(subId: string, title: string) {
    setEditingSubtaskId(subId);
    setEditingSubtaskTitle(title);
  }

  async function saveEditSubtask() {
    if (!editingSubtaskId) return;
    const title = editingSubtaskTitle.trim();
    if (title) await updateSubtaskInline(todo.id, editingSubtaskId, title);
    setEditingSubtaskId(null);
  }

  function handleTitleClick() {
    if (titleClickTimer.current) return; // 더블클릭의 두 번째 클릭이면 무시(아래 handleTitleDoubleClick이 처리)
    titleClickTimer.current = setTimeout(() => {
      titleClickTimer.current = null;
      onEdit(todo);
    }, 220);
  }

  function handleTitleDoubleClick() {
    if (titleClickTimer.current) { clearTimeout(titleClickTimer.current); titleClickTimer.current = null; }
    setEditTitleValue(todo.title);
    setEditingTitle(true);
  }

  async function saveTitleEdit() {
    const trimmed = editTitleValue.trim();
    if (trimmed && trimmed !== todo.title) await updateTodo(todo.id, { title: trimmed });
    setEditingTitle(false);
  }

  // 세부 할일 하나만 오늘로 보냄. 큰 제목은 할 일이 아니라 세부 할일을 묶는 카테고리라서,
  // moveSubtasksToDate가 오늘 날짜에 이미 있는 같은 이름 컨테이너로 합쳐주거나 새로 만들어줌
  // (그래서 여러 개를 하나씩 나눠 보내도 오늘 화면에서 한 군데로 모임)
  async function sendSubtaskToToday(sub: SubTask) {
    await moveSubtasksToDate(todo.id, [sub.id], format(new Date(), 'yyyy-MM-dd'));
  }

  // 체크박스 클릭 처리: 저장소에서는 완료 체크 시 자동으로 오늘 날짜로 이동(completeMovesToToday),
  // 홈 화면에서는 큰 제목을 완료 체크하면 세부 할일도 한꺼번에 완료 처리(autoCompleteSubtasks)
  async function handleCheckboxClick() {
    if (completeMovesToToday && !todo.completed) {
      await updateTodo(todo.id, { completed: true, date: format(new Date(), 'yyyy-MM-dd') });
      return;
    }
    if (autoCompleteSubtasks && !todo.completed && todo.subtasks.length > 0) {
      await updateTodo(todo.id, { completed: true, subtasks: todo.subtasks.map(s => ({ ...s, completed: true })) });
      return;
    }
    await toggleTodo(todo.id);
  }

  return (
    <div
      className={`relative bg-white dark:bg-gray-900 rounded-2xl border mb-2 overflow-hidden transition-all duration-200 ${
        showDelete
          ? 'border-gray-300 dark:border-gray-700 shadow-md'
          : 'border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700'
      }`}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => { setShowDelete(false); setConfirmDelete(false); }}
    >
      {/* Category color strip */}
      {category && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ backgroundColor: category.color }}
        />
      )}

      <div className={`flex items-start gap-3 px-4 py-3.5 ${category ? 'pl-[18px]' : ''}`}>
        {/* Checkbox */}
        <button
          onClick={handleCheckboxClick}
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
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              autoFocus
              type="text"
              value={editTitleValue}
              onChange={e => setEditTitleValue(e.target.value)}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => {
                if (e.key === 'Enter') saveTitleEdit();
                if (e.key === 'Escape') setEditingTitle(false);
              }}
              onBlur={saveTitleEdit}
              className="block w-full text-[14px] leading-snug bg-transparent border-b border-leaf-400 text-gray-800 dark:text-gray-100 focus:outline-none"
            />
          ) : (
            <span
              onClick={handleTitleClick}
              onDoubleClick={handleTitleDoubleClick}
              title="한 번: 자세히 편집 · 두 번: 이름만 바로 수정"
              className={`block text-[14px] font-normal leading-snug transition-colors cursor-pointer ${
                todo.completed
                  ? 'line-through text-gray-300 dark:text-gray-600'
                  : 'text-gray-800 dark:text-gray-100'
              }`}
            >
              {todo.title}
            </span>
          )}
          {(todo.startTime || todo.dueDate || subtaskTotal > 0) && (
            <div className="flex items-center gap-2 mt-0.5 cursor-pointer" onClick={handleTitleClick}>
              {todo.startTime && (
                <span className="flex items-center gap-0.5 text-[11px] text-leaf-500 dark:text-leaf-400 font-medium">
                  <Clock size={10} />
                  {todo.startTime}
                </span>
              )}
              {todo.dueDate && (
                <span className={`flex items-center gap-0.5 text-[11px] font-medium ${
                  isOverdue ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'
                }`}>
                  <Flag size={10} />
                  {format(parseISO(todo.dueDate), 'M/d')} 마감
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

        {/* Add subtask */}
        <button
          onClick={openSubtaskAdd}
          aria-label="세부 할일 추가"
          className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-leaf-500 hover:bg-leaf-50 dark:hover:bg-leaf-900/20 transition-all duration-200 ${
            showDelete ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          title="세부 할일 추가"
        >
          <Plus size={14} />
        </button>

        {/* Expand */}
        {(subtaskTotal > 0 || addingSubtask) && (
          <button
            onClick={() => setExpanded(v => !v)}
            aria-label={expanded ? '세부 할일 접기' : '세부 할일 펼치기'}
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        )}

        {/* Delete (실수로 지우지 않도록 한 번 더 확인) */}
        {confirmDelete ? (
          <div className={`flex items-center gap-1 flex-shrink-0 transition-opacity duration-200 ${showDelete ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <button onClick={() => setConfirmDelete(false)}
              className="text-[11px] px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 whitespace-nowrap">취소</button>
            <button onClick={() => deleteTodo(todo.id)} aria-label="삭제 확정"
              className="text-[11px] px-2 py-1 rounded-lg bg-red-500 text-white font-medium whitespace-nowrap">삭제</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            aria-label="삭제"
            className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 ${
              showDelete ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 pointer-events-none'
            }`}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Actions row: "오늘로"/"날짜"/"복사"/"하위 선택" 등 - 제목 줄에 끼워 넣으면 아이콘들과
          비좁게 겹쳐서 위치가 애매했던 문제라, 아이콘 줄과 분리된 자기 줄로 내려서 배치함 */}
      {actions && (
        <div className={`flex flex-wrap items-center gap-1.5 px-4 pb-3 -mt-1 ${category ? 'pl-[18px]' : ''}`}>
          {actions}
        </div>
      )}

      {/* Subtasks */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/40">
          {todo.subtasks.map(sub => (
            <div key={sub.id} className={`flex items-center gap-3 px-4 py-2 group/sub ${category ? 'pl-[18px]' : ''}`}>
              <button
                onClick={() => toggleSubTask(todo.id, sub.id, autoOpts)}
                aria-label={sub.completed ? '완료 취소' : '완료 처리'}
                className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                  sub.completed
                    ? 'bg-leaf-300 border-leaf-300'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {sub.completed && <Check size={8} className="text-leaf-800 stroke-[3px]" />}
              </button>
              {editingSubtaskId === sub.id ? (
                <input
                  autoFocus
                  type="text"
                  value={editingSubtaskTitle}
                  onChange={e => setEditingSubtaskTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveEditSubtask();
                    if (e.key === 'Escape') setEditingSubtaskId(null);
                  }}
                  onBlur={saveEditSubtask}
                  className="flex-1 text-sm bg-transparent border-b border-leaf-400 text-gray-800 dark:text-gray-200 focus:outline-none"
                />
              ) : (
                <span
                  onClick={() => startEditSubtask(sub.id, sub.title)}
                  title="눌러서 수정"
                  className={`text-sm flex-1 transition-colors cursor-text ${
                    sub.completed ? 'line-through text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {sub.title}
                </span>
              )}
              {allowSendSubtaskToToday && (
                <button
                  onClick={() => sendSubtaskToToday(sub)}
                  aria-label="이 세부 할일만 오늘로 보내기"
                  title="이 세부 할일만 오늘로 보내기"
                  className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-gray-300 hover:text-leaf-600 hover:bg-leaf-50 dark:hover:bg-leaf-900/20 opacity-0 group-hover/sub:opacity-100 transition-all"
                >
                  <CalendarCheck size={12} />
                </button>
              )}
              <button
                onClick={() => deleteSubtaskInline(todo.id, sub.id, autoOpts)}
                aria-label="세부 할일 삭제"
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
                placeholder="세부 할일 입력..."
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
              세부 할일 추가
            </button>
          )}
        </div>
      )}
    </div>
  );
}
