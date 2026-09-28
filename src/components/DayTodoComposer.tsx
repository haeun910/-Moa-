import { useState, useRef } from 'react';
import { Send, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useApp } from '../context/AppContext';

const LAST_CATEGORY_KEY = 'day-composer-last-category';

function readLastCategory(): string | null {
  try { return localStorage.getItem(LAST_CATEGORY_KEY); } catch { return null; }
}
function writeLastCategory(id: string) {
  try { localStorage.setItem(LAST_CATEGORY_KEY, id); } catch { /* 저장 못 해도 동작에는 지장 없음 */ }
}

interface Props {
  date: string; // YYYY-MM-DD, 홈에서 선택한 날짜
  // 상세 옵션(시간/마감일/반복 등)으로 추가: 지금 고른 카테고리/하위카테고리를 그대로 넘김
  onOpenDetail: (categoryId: string | null, subcategoryId: string | null) => void;
}

// 홈 화면에서 날짜를 고른 뒤 할 일을 추가하는 입력창.
// 카테고리를 먼저 고르고, 하위카테고리는 고르거나 "미정"으로 둔 채 제목을 쓰는 순서.
// 연달아 여러 개를 추가하기 쉽도록 추가 후에도 고른 카테고리/하위카테고리는 유지함.
export default function DayTodoComposer({ date, onOpenDetail }: Props) {
  const { categories, subcategories, addTodo } = useApp();
  const [categoryId, setCategoryId] = useState<string | null>(() => readLastCategory());
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 저장해둔 카테고리가 삭제됐으면 선택 안 된 상태로 취급
  const selectedCategory = categories.find(c => c.id === categoryId) ?? null;
  const categorySubcats = selectedCategory ? subcategories.filter(s => s.categoryId === selectedCategory.id) : [];
  const selectedSubcatId = categorySubcats.some(s => s.id === subcategoryId) ? subcategoryId : null;
  // 카테고리가 하나도 없는 사용자는 카테고리 없이도 추가할 수 있게 함
  const needsCategory = categories.length > 0 && !selectedCategory;
  const canSave = !!title.trim() && !needsCategory && !saving;

  function selectCategory(id: string) {
    setCategoryId(id);
    setSubcategoryId(null);
    writeLastCategory(id);
    inputRef.current?.focus();
  }

  async function handleAdd() {
    const t = title.trim();
    if (!t || needsCategory || saving) return;
    setSaving(true);
    try {
      await addTodo({
        title: t, completed: false,
        categoryId: selectedCategory?.id ?? null,
        subcategoryId: selectedSubcatId,
        date, startTime: null, notes: '',
      });
      setTitle('');
      inputRef.current?.focus();
    } finally { setSaving(false); }
  }

  const chipBase = 'flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all whitespace-nowrap';
  const chipOff = 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400';
  const chipOn = 'bg-leaf-300 border-leaf-300 text-leaf-800';

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-black/30 px-3 py-2.5 space-y-2">
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-0.5 -mx-0.5 px-0.5">
          <span className="flex-shrink-0 text-[10px] font-bold text-gray-400 w-12">카테고리</span>
          {categories.map(cat => {
            const on = selectedCategory?.id === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => selectCategory(cat.id)}
                className={`${chipBase} ${on ? 'border-transparent text-gray-800' : chipOff}`}
                style={on ? { backgroundColor: cat.color } : {}}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: on ? 'rgba(0,0,0,0.35)' : cat.color }} />
                {cat.name}
              </button>
            );
          })}
        </div>
      )}

      {selectedCategory && (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-0.5 -mx-0.5 px-0.5">
          <span className="flex-shrink-0 text-[10px] font-bold text-gray-400 w-12">하위</span>
          <button onClick={() => { setSubcategoryId(null); inputRef.current?.focus(); }}
            className={`${chipBase} ${selectedSubcatId === null ? chipOn : chipOff}`}>
            미정
          </button>
          {categorySubcats.map(sc => (
            <button key={sc.id} onClick={() => { setSubcategoryId(sc.id); inputRef.current?.focus(); }}
              className={`${chipBase} ${selectedSubcatId === sc.id ? chipOn : chipOff}`}>
              {sc.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          disabled={needsCategory}
          placeholder={needsCategory ? '먼저 카테고리를 선택하세요' : `${format(parseISO(date), 'M/d')}에 할 일 추가...`}
          className="flex-1 min-w-0 text-sm bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none disabled:cursor-not-allowed px-1"
          onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleAdd(); }}
        />
        <button onClick={handleAdd} disabled={!canSave} aria-label="추가"
          className="flex-shrink-0 w-8 h-8 rounded-xl bg-leaf-300 hover:bg-leaf-400 disabled:opacity-40 text-leaf-800 flex items-center justify-center">
          <Send size={14} />
        </button>
        <button onClick={() => onOpenDetail(selectedCategory?.id ?? null, selectedSubcatId)} aria-label="상세 옵션으로 추가" title="시간·마감일·반복 등 상세 옵션으로 추가"
          className="flex-shrink-0 w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center">
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
