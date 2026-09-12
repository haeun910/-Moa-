import { useState } from 'react';
import { Plus, Trash2, Edit2, X, ChevronLeft, Check, GripVertical } from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DragEndEvent } from '@dnd-kit/core';
import { useApp } from '../context/AppContext';
import type { Category } from '../types';

// 색상 종류를 10개 → 20개로 확장 (요청: "카테고리 색상 더 다양하게, 총 20가지 정도")
const PRESET_COLORS = [
  '#7B7FE0', '#9B7FDB', '#DB7FAE', '#DE7373', '#E0985A',
  '#C99A3A', '#5FB98A', '#5FB4C2', '#6B98E0', '#8891A0',
  '#D65D5D', '#D6C247', '#8FBF4D', '#4FAE6C', '#4FB8D6',
  '#5C6BC0', '#A0729B', '#C766A8', '#B5793D', '#7D8F4F',
];

interface ItemProps {
  cat: Category;
  editingId: string | null;
  editName: string;
  editColor: string;
  editDescription: string;
  confirmDeleteId: string | null;
  onStartEdit: (id: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditName: (v: string) => void;
  onEditColor: (v: string) => void;
  onEditDescription: (v: string) => void;
  onDelete: (id: string) => void;
  onCancelDelete: () => void;
}

function SortableCategoryItem({
  cat, editingId, editName, editColor, editDescription, confirmDeleteId,
  onStartEdit, onSaveEdit, onCancelEdit, onEditName, onEditColor, onEditDescription, onDelete, onCancelDelete,
}: ItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0 bg-white dark:bg-gray-900 ${isDragging ? 'opacity-50 shadow-lg z-50' : ''}`}
    >
      {editingId === cat.id ? (
        <div className="space-y-3">
          <input value={editName} onChange={e => onEditName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500"
            onKeyDown={e => { if (e.key === 'Enter') onSaveEdit(); }}
          />
          <textarea value={editDescription} onChange={e => onEditDescription(e.target.value)}
            placeholder="설명 (저장소 화면에서만 보여요, 선택)"
            rows={2}
            className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-leaf-500 placeholder-gray-400"
          />
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map(color => (
              <button key={color} onClick={() => onEditColor(color)} aria-label={`색상 ${color}`}
                className="w-7 h-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                style={{ backgroundColor: color }}>
                {editColor === color && <Check size={12} className="text-gray-800" strokeWidth={3} />}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={onCancelEdit}
              className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400">취소</button>
            <button onClick={onSaveEdit}
              className="flex-1 py-2 rounded-xl bg-leaf-300 hover:bg-leaf-400 text-leaf-800 text-sm font-semibold">저장</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {/* 드래그 핸들 */}
          <span
            {...listeners} {...attributes}
            className="text-gray-300 dark:text-gray-600 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
          >
            <GripVertical size={15} />
          </span>
          <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{cat.name}</span>
            {cat.description && (
              <span className="block text-[11px] text-gray-400 dark:text-gray-500 truncate">{cat.description}</span>
            )}
          </span>
          {cat.isDefault && (
            <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md">기본</span>
          )}
          <button onClick={() => { onStartEdit(cat.id); onCancelDelete(); }} aria-label={`${cat.name} 편집`}
            className="text-gray-400 hover:text-leaf-500 transition-colors p-1">
            <Edit2 size={14} />
          </button>
          {confirmDeleteId === cat.id ? (
            <div className="flex items-center gap-1">
              <button onClick={onCancelDelete}
                className="text-[11px] px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500">취소</button>
              <button onClick={() => onDelete(cat.id)}
                className="text-[11px] px-2 py-1 rounded-lg bg-red-500 text-white font-medium">삭제</button>
            </div>
          ) : (
            <button onClick={() => onDelete(cat.id)} aria-label={`${cat.name} 삭제`}
              className="text-gray-400 hover:text-red-500 transition-colors p-1">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function CategoryPage() {
  const { categories, addCategory, updateCategory, deleteCategory, reorderCategories, setCurrentScreen } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(PRESET_COLORS[0]);
  const [editDescription, setEditDescription] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [newDescription, setNewDescription] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  function startEdit(id: string) {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;
    setEditingId(id); setEditName(cat.name); setEditColor(cat.color); setEditDescription(cat.description ?? '');
    setShowAdd(false);
  }

  function saveEdit() {
    if (editingId && editName.trim()) {
      updateCategory(editingId, { name: editName.trim(), color: editColor, description: editDescription.trim() || null });
    }
    setEditingId(null);
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    await addCategory(newName.trim(), newColor, newDescription.trim() || undefined);
    setNewName(''); setNewColor(PRESET_COLORS[0]); setNewDescription(''); setShowAdd(false);
  }

  async function handleDelete(id: string) {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    await deleteCategory(id);
    setConfirmDeleteId(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex(c => c.id === active.id);
    const newIndex = categories.findIndex(c => c.id === over.id);
    const reordered = arrayMove(categories, oldIndex, newIndex);
    reorderCategories(reordered.map(c => c.id));
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-gray-100 dark:border-gray-800">
        <button onClick={() => setCurrentScreen('settings')} aria-label="설정으로 돌아가기"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white flex-1">카테고리 관리</h1>
        <button onClick={() => { setShowAdd(v => !v); setEditingId(null); }} aria-label={showAdd ? '취소' : '카테고리 추가'}
          className="w-9 h-9 rounded-xl bg-leaf-300 flex items-center justify-center text-leaf-800 hover:bg-leaf-400 transition-colors">
          {showAdd ? <X size={16} /> : <Plus size={16} />}
        </button>
      </div>

      <div className="px-4 pt-4 space-y-2">
        {showAdd && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 space-y-3 mb-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">새 카테고리</p>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="카테고리 이름"
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500 placeholder-gray-400"
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            />
            <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)}
              placeholder="설명 (저장소 화면에서만 보여요, 선택)"
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-leaf-500 placeholder-gray-400"
            />
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(color => (
                <button key={color} onClick={() => setNewColor(color)} aria-label={`색상 ${color}`}
                  className="w-8 h-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                  style={{ backgroundColor: color }}>
                  {newColor === color && <Check size={14} className="text-gray-800" strokeWidth={3} />}
                </button>
              ))}
            </div>
            <button onClick={handleAdd} disabled={!newName.trim()}
              className="w-full py-2.5 rounded-xl bg-leaf-300 hover:bg-leaf-400 text-leaf-800 text-sm font-semibold disabled:opacity-40 transition-opacity">
              추가
            </button>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              {categories.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">카테고리가 없어요</div>
              )}
              {categories.map(cat => (
                <SortableCategoryItem
                  key={cat.id}
                  cat={cat}
                  editingId={editingId}
                  editName={editName}
                  editColor={editColor}
                  editDescription={editDescription}
                  confirmDeleteId={confirmDeleteId}
                  onStartEdit={startEdit}
                  onSaveEdit={saveEdit}
                  onCancelEdit={() => setEditingId(null)}
                  onEditName={setEditName}
                  onEditColor={setEditColor}
                  onEditDescription={setEditDescription}
                  onDelete={handleDelete}
                  onCancelDelete={() => setConfirmDeleteId(null)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <p className="text-xs text-gray-400 dark:text-gray-600 text-center pt-2">
          순서를 바꾸려면 핸들을 드래그하세요
        </p>
      </div>
    </div>
  );
}
