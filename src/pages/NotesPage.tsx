import { useState } from 'react';
import { Plus, FileText, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useApp } from '../context/AppContext';
import NoteModal from '../components/NoteModal';
import type { Note } from '../types';

const NOTE_COLORS = [
  'bg-amber-50 dark:bg-amber-900/20 border-amber-200/60 dark:border-amber-800/40',
  'bg-leaf-50 dark:bg-leaf-900/20 border-leaf-200/60 dark:border-leaf-800/40',
  'bg-violet-50 dark:bg-violet-900/20 border-violet-200/60 dark:border-violet-800/40',
  'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200/60 dark:border-emerald-800/40',
  'bg-rose-50 dark:bg-rose-900/20 border-rose-200/60 dark:border-rose-800/40',
  'bg-orange-50 dark:bg-orange-900/20 border-orange-200/60 dark:border-orange-800/40',
];

const NOTE_TITLE_COLORS = [
  'text-amber-700 dark:text-amber-300',
  'text-leaf-700 dark:text-leaf-300',
  'text-violet-700 dark:text-violet-300',
  'text-emerald-700 dark:text-emerald-300',
  'text-rose-700 dark:text-rose-300',
  'text-orange-700 dark:text-orange-300',
];

function noteColorIndex(id: string) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return Math.abs(hash) % NOTE_COLORS.length;
}

export default function NotesPage() {
  const { notes } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editNote, setEditNote] = useState<Note | undefined>();
  const [query, setQuery] = useState('');

  function openEdit(note: Note) { setEditNote(note); setShowModal(true); }
  function closeModal() { setShowModal(false); setEditNote(undefined); }

  const filtered = query.trim()
    ? notes.filter(n =>
        n.title.toLowerCase().includes(query.toLowerCase()) ||
        n.content.toLowerCase().includes(query.toLowerCase())
      )
    : notes;

  return (
    <div className="px-4 pt-10 pb-24 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">메모</h1>
          <p className="text-sm text-gray-400 mt-0.5">{notes.length}개의 메모</p>
        </div>
      </div>

      {/* Search */}
      {notes.length > 0 && (
        <div className="relative mb-5">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="메모 검색..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-leaf-400 focus:border-transparent shadow-sm transition-all"
          />
        </div>
      )}

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-4 border border-amber-200/50 dark:border-amber-800/30">
            <FileText size={28} className="text-amber-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 font-semibold">아직 메모가 없어요</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">아래 + 버튼으로 첫 메모를 작성해보세요</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-gray-500 dark:text-gray-400 font-medium">검색 결과가 없어요</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((note) => {
            const ci = noteColorIndex(note.id);
            return (
              <button
                key={note.id}
                onClick={() => openEdit(note)}
                className={`text-left rounded-2xl p-4 border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 ${NOTE_COLORS[ci]}`}
              >
                <h3 className={`font-bold text-sm truncate mb-1.5 ${NOTE_TITLE_COLORS[ci]}`}>
                  {note.title || '제목 없음'}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-4 leading-relaxed">
                  {note.content || '내용 없음'}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3 font-medium">
                  {format(new Date(note.updatedAt), 'M월 d일', { locale: ko })}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => { setEditNote(undefined); setShowModal(true); }}
        aria-label="새 메모"
        className="fixed bottom-[78px] right-5 w-14 h-14 rounded-2xl bg-leaf-300 hover:bg-leaf-400 text-leaf-800 shadow-lg shadow-leaf-500/30 hover:shadow-xl hover:shadow-leaf-500/40 transition-all duration-200 flex items-center justify-center hover:-translate-y-0.5"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {showModal && <NoteModal note={editNote} onClose={closeModal} />}
    </div>
  );
}
