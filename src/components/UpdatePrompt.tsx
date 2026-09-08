import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 max-w-sm mx-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl shadow-2xl p-4 flex items-center gap-3 z-50 animate-slide-in-bottom motion-reduce:animate-none">
      <div className="w-10 h-10 bg-white/20 dark:bg-gray-900/10 rounded-xl flex items-center justify-center flex-shrink-0">
        <RefreshCw size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">새 버전이 있어요</p>
        <p className="text-xs text-leaf-200 dark:text-leaf-600 mt-0.5">새로고침하면 최신 버전으로 업데이트돼요</p>
      </div>
      <button onClick={() => updateServiceWorker(true)}
        className="bg-white dark:bg-leaf-300 text-leaf-600 dark:text-leaf-800 text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0">
        새로고침
      </button>
      <button onClick={() => setNeedRefresh(false)} aria-label="닫기"
        className="text-white/70 dark:text-gray-900/60 hover:text-white dark:hover:text-gray-900 flex-shrink-0">
        <X size={16} />
      </button>
    </div>
  );
}
