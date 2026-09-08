import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { isSupabaseConfigured } from './lib/supabase';
import Layout from './components/Layout';
import InstallPrompt from './components/InstallPrompt';
import UpdatePrompt from './components/UpdatePrompt';
import TodayPage from './pages/TodayPage';
import CalendarPage from './pages/CalendarPage';
import AllTodosPage from './pages/AllTodosPage';
import NotesPage from './pages/NotesPage';
import SettingsPage from './pages/SettingsPage';
import CategoryPage from './pages/CategoryPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import AuthPage from './pages/AuthPage';
import { useApp } from './context/AppContext';
import { CheckSquare, AlertTriangle } from 'lucide-react';

function SetupNeededScreen() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl p-6 text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40">
          <AlertTriangle size={26} className="text-amber-500" />
        </div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-2">환경설정이 필요해요</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md">.env</code> 파일에
          {' '}<code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md">VITE_SUPABASE_URL</code>과
          {' '}<code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md">VITE_SUPABASE_ANON_KEY</code>가
          설정되지 않았습니다. 프로젝트 루트의 <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md">.env.example</code> 파일을 참고해
          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md">.env</code> 파일을 만들어주세요.
        </p>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 bg-gray-900 dark:bg-white rounded-2xl flex items-center justify-center animate-pulse">
          <CheckSquare size={28} className="text-white" />
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500">불러오는 중...</p>
      </div>
    </div>
  );
}

function AppContent() {
  const { currentScreen } = useApp();
  return (
    <Layout>
      {currentScreen === 'today'    && <TodayPage />}
      {currentScreen === 'calendar' && <CalendarPage />}
      {currentScreen === 'all'      && <AllTodosPage />}
      {currentScreen === 'notes'    && <NotesPage />}
      {currentScreen === 'settings' && <SettingsPage />}
      {currentScreen === 'categories' && <CategoryPage />}
      {currentScreen === 'terms' && <TermsPage />}
      {currentScreen === 'privacy' && <PrivacyPage />}
      <InstallPrompt />
    </Layout>
  );
}

function Root() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <AuthPage />;

  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default function App() {
  if (!isSupabaseConfigured) return <SetupNeededScreen />;

  return (
    <AuthProvider>
      <Root />
      <UpdatePrompt />
    </AuthProvider>
  );
}
