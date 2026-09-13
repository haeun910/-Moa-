import type React from 'react';
import { Home, List, FileText, Settings } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Screen } from '../types';

const NAV_ITEMS: { screen: Screen; label: string; Icon: React.FC<{ size?: number; strokeWidth?: number; className?: string }> }[] = [
  { screen: 'today', label: '홈', Icon: Home },
  { screen: 'all', label: '저장소', Icon: List },
  { screen: 'notes', label: '메모', Icon: FileText },
  { screen: 'settings', label: '설정', Icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { currentScreen, setCurrentScreen } = useApp();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
          <div className="flex items-stretch justify-around h-[62px] max-w-lg mx-auto px-2">
            {NAV_ITEMS.map(({ screen, label, Icon }) => {
              const active = currentScreen === screen;
              return (
                <button
                  key={screen}
                  onClick={() => setCurrentScreen(screen)}
                  className={`relative flex flex-col items-center justify-center gap-[3px] flex-1 transition-all duration-200 ${
                    active
                      ? 'text-leaf-500'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
                  }`}
                >
                  {active && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2.5px] bg-leaf-500 rounded-full" />
                  )}
                  <span className={`transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
                    <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                  </span>
                  <span className={`text-[10px] leading-none ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
