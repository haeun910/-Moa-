import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, TrendingUp, Target, CheckCircle2 } from 'lucide-react';
import { format, addMonths, subMonths, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useApp } from '../context/AppContext';

export default function AchievementModal({ onClose }: { onClose: () => void }) {
  const { todos, categories, monthlyGoals } = useApp();
  const [viewMonth, setViewMonth] = useState(new Date());

  const monthStr = format(viewMonth, 'yyyy-MM');
  const monthTodos = todos.filter(t => t.date?.startsWith(monthStr));
  const completedTodos = monthTodos.filter(t => t.completed);
  const total = monthTodos.length;
  const completed = completedTodos.length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Monthly goals
  const goals = monthlyGoals.filter(g => g.month === monthStr);
  const completedGoals = goals.filter(g => g.completed).length;
  const goalRate = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0;

  // Category breakdown
  const catStats = categories
    .map(cat => {
      const ct = monthTodos.filter(t => t.categoryId === cat.id);
      return { cat, total: ct.length, completed: ct.filter(t => t.completed).length };
    })
    .filter(s => s.total > 0)
    .sort((a, b) => b.total - a.total);

  // Last 14 days daily completion
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(new Date(), -(13 - i));
    const s = format(d, 'yyyy-MM-dd');
    const dt = todos.filter(t => t.date === s);
    return {
      label: format(d, 'M/d'),
      shortLabel: format(d, 'd'),
      total: dt.length,
      done: dt.filter(t => t.completed).length,
    };
  });
  const maxBar = Math.max(...last14.map(d => d.total), 1);

  // Streak: consecutive days with at least 1 completed todo
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const d = format(addDays(new Date(), -i), 'yyyy-MM-dd');
    const done = todos.filter(t => t.date === d && t.completed).length;
    if (done === 0) break;
    streak++;
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-7 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white" style={{ fontStyle: 'italic' }}>Achievement Report</h2>
            <button onClick={onClose} aria-label="닫기"
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              <X size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setViewMonth(m => subMonths(m, 1))} aria-label="이전 달"
              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700">
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {format(viewMonth, 'yyyy년 M월', { locale: ko })}
            </span>
            <button onClick={() => setViewMonth(m => addMonths(m, 1))} aria-label="다음 달"
              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-leaf-50 dark:bg-leaf-900/20 rounded-2xl p-4 text-center">
              <p className="text-3xl font-bold text-leaf-600">{total}</p>
              <p className="text-xs text-gray-500 mt-1 font-medium">총 할일</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 text-center">
              <p className="text-3xl font-bold text-emerald-600">{completed}</p>
              <p className="text-xs text-gray-500 mt-1 font-medium">완료</p>
            </div>
            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-2xl p-4 text-center">
              <p className="text-3xl font-bold text-violet-600">{rate}%</p>
              <p className="text-xs text-gray-500 mt-1 font-medium">달성률</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-4 text-center">
              <p className="text-3xl font-bold text-orange-500">{streak}</p>
              <p className="text-xs text-gray-500 mt-1 font-medium">연속일 🔥</p>
            </div>
          </div>

          {/* Overall progress bar */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-leaf-500" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">할일 달성률</span>
              </div>
              <span className="text-sm font-bold text-leaf-600">{rate}%</span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-leaf-500 rounded-full transition-all duration-500" style={{ width: `${rate}%` }} />
            </div>

            {goals.length > 0 && (
              <>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <Target size={15} className="text-violet-500" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {format(viewMonth, 'M월')} 목표 달성률
                    </span>
                  </div>
                  <span className="text-sm font-bold text-violet-600">{goalRate}%</span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${goalRate}%` }} />
                </div>
              </>
            )}
          </div>

          {/* 14-day chart */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={15} className="text-leaf-500" />
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">최근 14일 현황</p>
            </div>
            <div className="flex items-end gap-1 h-28">
              {last14.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col justify-end rounded-t-sm overflow-hidden" style={{ height: '80px' }}>
                    <div className="w-full bg-leaf-100 dark:bg-leaf-900/30 rounded-t-sm"
                      style={{ height: `${(d.total / maxBar) * 80}px`, minHeight: d.total ? '3px' : '0' }} />
                    {d.done > 0 && (
                      <div className="w-full bg-leaf-500 -mt-[2px]"
                        style={{ height: `${(d.done / maxBar) * 80}px`, minHeight: '3px' }} />
                    )}
                  </div>
                  <span className="text-[9px] text-gray-400">{d.shortLabel}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded-sm bg-leaf-100 dark:bg-leaf-900/30 block" />
                <span className="text-[10px] text-gray-400">전체</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded-sm bg-leaf-500 block" />
                <span className="text-[10px] text-gray-400">완료</span>
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          {catStats.length > 0 && (
            <div>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">카테고리별 현황</p>
              <div className="space-y-3">
                {catStats.map(({ cat, total: ct, completed: cc }) => {
                  const pct = ct > 0 ? Math.round((cc / ct) * 100) : 0;
                  return (
                    <div key={cat.id}>
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="font-semibold text-gray-700 dark:text-gray-300">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">{cc}/{ct}</span>
                          <span className="font-bold" style={{ color: cat.color }}>{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
