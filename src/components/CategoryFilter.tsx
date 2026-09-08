import { useApp } from '../context/AppContext';

interface Props {
  activeCatId: string | null;
  onChange: (id: string | null) => void;
}

export default function CategoryFilter({ activeCatId, onChange }: Props) {
  const { categories } = useApp();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
      <button
        onClick={() => onChange(null)}
        className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
          activeCatId === null
            ? 'bg-leaf-300 text-leaf-800 shadow-sm'
            : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
        }`}
      >
        전체
      </button>
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => onChange(activeCatId === cat.id ? null : cat.id)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            activeCatId === cat.id
              ? 'text-gray-800 border-transparent shadow-sm'
              : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
          }`}
          style={activeCatId === cat.id ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: activeCatId === cat.id ? 'rgba(0,0,0,0.35)' : cat.color }}
          />
          {cat.name}
        </button>
      ))}
    </div>
  );
}
