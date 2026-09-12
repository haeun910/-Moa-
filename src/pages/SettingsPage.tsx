import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronRight, LogOut, Moon, Sun, Monitor, Bell, Tag, Info, FileDown, KeyRound, FileText, ShieldCheck, UserX, Download, CheckCircle2, BarChart3, ListFilter, EyeOff, Milestone } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { usePwaInstall } from '../hooks/usePwaInstall';
import ChangePasswordModal from '../components/ChangePasswordModal';
import DeleteAccountModal from '../components/DeleteAccountModal';
import InstallInstructionsModal from '../components/InstallInstructionsModal';
import ChangelogModal from '../components/ChangelogModal';
import AdminStatsModal from '../components/AdminStatsModal';
import { APP_VERSION } from '../data/changelog';
import type { Settings } from '../types';

const SCREEN_OPTIONS: { value: Settings['defaultScreen']; label: string }[] = [
  { value: 'today', label: '홈' },
  { value: 'all', label: '저장소' },
  { value: 'notes', label: '메모' },
];

export default function SettingsPage() {
  const { settings, updateSettings, categories, todos, notes, monthlyGoals, ddays, isAdmin, setCurrentScreen } = useApp();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showAdminStats, setShowAdminStats] = useState(false);
  const { canPromptDirectly, isInstalled, promptInstall } = usePwaInstall();

  async function handleSignOut() { setSigningOut(true); await signOut(); }

  async function handleInstallClick() {
    if (canPromptDirectly) await promptInstall();
    else setShowInstallInstructions(true);
  }

  const hasEmailPassword = user?.app_metadata?.providers?.includes('email') ?? false;

  function handleExport() {
    const payload = {
      exportedAt: new Date().toISOString(),
      todos, categories, notes, monthlyGoals, ddays,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moa-backup-${format(new Date(), 'yyyyMMdd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const displayName = user?.user_metadata?.display_name ?? user?.email?.split('@')[0] ?? '';
  const initials = displayName.slice(0, 2).toUpperCase();

  const THEME_OPTS = [
    { value: 'light' as const, label: '라이트', Icon: Sun },
    { value: 'dark' as const, label: '다크', Icon: Moon },
    { value: 'system' as const, label: '시스템', Icon: Monitor },
  ];

  return (
    <div className="px-4 pt-10 pb-24 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-6">설정</h1>

      {/* Profile card */}
      <div className="bg-leaf-300 rounded-3xl p-5 mb-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-leaf-800/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-leaf-800/15">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} className="w-14 h-14 rounded-2xl object-cover" alt="" />
            ) : (
              <span className="text-xl font-bold text-leaf-800">{initials || '?'}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-leaf-900 truncate">{displayName || '사용자'}</p>
            <p className="text-sm text-leaf-700 truncate mt-0.5">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-leaf-800/10 hover:bg-leaf-800/15 text-leaf-800 text-xs font-semibold transition-colors border border-leaf-800/15 disabled:opacity-50"
          >
            <LogOut size={13} />
            {signingOut ? '...' : '로그아웃'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Theme */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">테마</h2>
          </div>
          <div className="px-4 pb-4 grid grid-cols-3 gap-2">
            {THEME_OPTS.map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => updateSettings({ theme: value })}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all text-sm font-semibold ${
                  settings.theme === value
                    ? 'border-leaf-500 bg-leaf-50 dark:bg-leaf-900/20 text-leaf-600 dark:text-leaf-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Icon size={18} strokeWidth={settings.theme === value ? 2.5 : 1.8} />
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Default screen */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">시작 화면</h2>
          </div>
          <div className="px-4 pb-4">
            <select
              value={settings.defaultScreen}
              onChange={e => updateSettings({ defaultScreen: e.target.value as Settings['defaultScreen'] })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-leaf-500 text-sm font-medium cursor-pointer"
            >
              {SCREEN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </section>

        {/* 목록 표시 (정렬 / 완료 숨기기 / 카테고리별 표시) */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center gap-1.5">
            <ListFilter size={13} className="text-gray-400" />
            <h2 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">목록 표시</h2>
          </div>

          <div className="px-4 pb-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">정렬 기준</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['manual', '직접 순서'],
                ['date', '등록순'],
                ['name', '이름순'],
              ] as [Settings['listSortBy'], string][]).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => updateSettings({ listSortBy: value })}
                  className={`py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                    settings.listSortBy === value
                      ? 'border-leaf-500 bg-leaf-50 dark:bg-leaf-900/20 text-leaf-600 dark:text-leaf-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 pb-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3">
            <div className="flex items-center gap-2">
              <EyeOff size={14} className="text-gray-400" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">완료된 항목 숨기기</p>
            </div>
            <button
              onClick={() => updateSettings({ hideCompleted: !settings.hideCompleted })}
              role="switch"
              aria-checked={settings.hideCompleted}
              aria-label="완료된 항목 숨기기"
              className={`relative w-11 h-6 rounded-full transition-colors duration-300 flex-shrink-0 ${settings.hideCompleted ? 'bg-leaf-600' : 'bg-gray-300 dark:bg-gray-700'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${settings.hideCompleted ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {categories.length > 0 && (
            <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">카테고리별 표시</p>
              <div className="space-y-2">
                {categories.map(cat => {
                  const hidden = settings.hiddenCategoryIds.includes(cat.id);
                  return (
                    <label key={cat.id} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!hidden}
                        onChange={() => updateSettings({
                          hiddenCategoryIds: hidden
                            ? settings.hiddenCategoryIds.filter(id => id !== cat.id)
                            : [...settings.hiddenCategoryIds, cat.id],
                        })}
                        className="w-4 h-4 rounded accent-leaf-500 flex-shrink-0"
                      />
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className={`text-sm ${hidden ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>{cat.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Rows */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
          {/* Notifications */}
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${settings.notifications ? 'bg-leaf-100 dark:bg-leaf-900/40' : 'bg-gray-100 dark:bg-gray-800'}`}>
                <Bell size={15} className={settings.notifications ? 'text-leaf-500' : 'text-gray-400'} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">알림</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">할 일 알림 받기</p>
              </div>
            </div>
            <button
              onClick={() => updateSettings({ notifications: !settings.notifications })}
              role="switch"
              aria-checked={settings.notifications}
              aria-label="알림"
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${settings.notifications ? 'bg-leaf-600' : 'bg-gray-300 dark:bg-gray-700'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${settings.notifications ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Categories */}
          <button
            onClick={() => setCurrentScreen('categories')}
            className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-leaf-100 dark:bg-leaf-900/40 flex items-center justify-center">
                <Tag size={15} className="text-leaf-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800 dark:text-white">카테고리 관리</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{categories.length}개</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>

          {/* Project roadmap */}
          <button
            onClick={() => setCurrentScreen('project')}
            className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-leaf-100 dark:bg-leaf-900/40 flex items-center justify-center">
                <Milestone size={15} className="text-leaf-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800 dark:text-white">프로젝트 로드맵</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">카테고리 하나를 골라 타임라인으로 보기</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
        </section>

        {/* 계정 & 데이터 */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
          {hasEmailPassword && (
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-leaf-100 dark:bg-leaf-900/40 flex items-center justify-center">
                  <KeyRound size={15} className="text-leaf-600" />
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">비밀번호 변경</p>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          )}

          <button
            onClick={handleExport}
            className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-leaf-100 dark:bg-leaf-900/40 flex items-center justify-center">
                <FileDown size={15} className="text-leaf-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800 dark:text-white">데이터 내보내기</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">할 일 · 메모 등을 JSON 파일로 백업</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full px-4 py-4 flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <UserX size={15} className="text-red-500" />
              </div>
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">계정 삭제</p>
            </div>
          </button>
        </section>

        {/* 약관 */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
          <button
            onClick={() => setCurrentScreen('terms')}
            className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <FileText size={15} className="text-gray-500" />
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">이용약관</p>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
          <button
            onClick={() => setCurrentScreen('privacy')}
            className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <ShieldCheck size={15} className="text-gray-500" />
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">개인정보처리방침</p>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
        </section>

        {/* 관리자 전용 */}
        {isAdmin && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowAdminStats(true)}
              className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-leaf-100 dark:bg-leaf-900/40 flex items-center justify-center">
                  <BarChart3 size={15} className="text-leaf-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">관리자 통계</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">가입자 · 활성 사용자 등 (관리자만 보여요)</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          </section>
        )}

        {/* 앱 다운로드 */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          {isInstalled ? (
            <div className="px-4 py-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-leaf-100 dark:bg-leaf-900/40 flex items-center justify-center">
                <CheckCircle2 size={15} className="text-leaf-600" />
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">앱이 이미 설치되어 있어요</p>
            </div>
          ) : (
            <button
              onClick={handleInstallClick}
              className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-leaf-100 dark:bg-leaf-900/40 flex items-center justify-center">
                  <Download size={15} className="text-leaf-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">앱 다운로드</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">홈 화면에 추가하면 더 편리해요</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          )}
        </section>

        {/* App info */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowChangelog(true)}
            className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-leaf-300 flex items-center justify-center flex-shrink-0">
              <Info size={14} className="text-leaf-800" />
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex-1 text-left">모아(Moa)</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">v{APP_VERSION}</span>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
        </section>
      </div>

      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
      {showDeleteModal && <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />}
      {showInstallInstructions && <InstallInstructionsModal onClose={() => setShowInstallInstructions(false)} />}
      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
      {showAdminStats && <AdminStatsModal onClose={() => setShowAdminStats(false)} />}
    </div>
  );
}
