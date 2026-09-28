import { useState } from 'react';
import { format } from 'date-fns';
import {
  ChevronRight, ChevronLeft, LogOut, Moon, Sun, Monitor, Bell, Tag, Info, FileDown, KeyRound, FileText, ShieldCheck, UserX,
  Download, CheckCircle2, BarChart3, Milestone, BookOpen, MessageSquareHeart, Inbox, SlidersHorizontal, ListTodo,
  UserRound, LifeBuoy, Smartphone, Wrench, Palette, House, ListFilter, CalendarDays,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { usePwaInstall } from '../hooks/usePwaInstall';
import ChangePasswordModal from '../components/ChangePasswordModal';
import DeleteAccountModal from '../components/DeleteAccountModal';
import InstallInstructionsModal from '../components/InstallInstructionsModal';
import ChangelogModal from '../components/ChangelogModal';
import AdminStatsModal from '../components/AdminStatsModal';
import OnboardingModal from '../components/OnboardingModal';
import FeedbackModal from '../components/FeedbackModal';
import FeedbackListModal from '../components/FeedbackListModal';
import { APP_VERSION } from '../data/changelog';
import type { Settings } from '../types';

// ── 설정 화면 구성 ─────────────────────────────────────────
// 휴대폰: 분류별로 묶인 한 줄 목록 (아이폰 설정처럼). "일반"은 현재 값만 보여주고 누르면 상세 화면으로
// 태블릿·PC: 왼쪽 분류 메뉴 + 오른쪽에 고른 분류의 설정만 넓게 (Notion/Slack 설정처럼)
type SectionId = 'general' | 'organize' | 'account' | 'help' | 'about' | 'admin';

const SECTIONS: { id: SectionId; label: string; Icon: typeof Info; adminOnly?: boolean }[] = [
  { id: 'general', label: '일반', Icon: SlidersHorizontal },
  { id: 'organize', label: '할 일 정리', Icon: ListTodo },
  { id: 'account', label: '계정 · 데이터', Icon: UserRound },
  { id: 'help', label: '도움 · 의견', Icon: LifeBuoy },
  { id: 'about', label: '앱 정보', Icon: Smartphone },
  { id: 'admin', label: '관리자', Icon: Wrench, adminOnly: true },
];

const THEME_OPTS: { value: Settings['theme']; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: '라이트', Icon: Sun },
  { value: 'dark', label: '다크', Icon: Moon },
  { value: 'system', label: '시스템', Icon: Monitor },
];
const SCREEN_OPTS: { value: Settings['defaultScreen']; label: string }[] = [
  { value: 'today', label: '홈' },
  { value: 'all', label: '저장소' },
  { value: 'notes', label: '메모' },
];
const SORT_OPTS: { value: Settings['listSortBy']; label: string }[] = [
  { value: 'manual', label: '직접 순서' },
  { value: 'date', label: '등록순' },
  { value: 'name', label: '이름순' },
];
const CAL_SIZE_OPTS: { value: Settings['calendarTextSize']; label: string }[] = [
  { value: 'small', label: '작게' },
  { value: 'medium', label: '보통' },
  { value: 'large', label: '크게' },
];
const labelOf = <T,>(opts: { value: T; label: string }[], v: T) => opts.find(o => o.value === v)?.label ?? '';

// ── 공용 조각 ─────────────────────────────────────────────
// 섹션 제목 + 흰 카드 안에 줄 목록
function Group({ title, children, footer }: { title?: string; children: React.ReactNode; footer?: string }) {
  return (
    <div>
      {title && <p className="px-1 mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{title}</p>}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
        {children}
      </div>
      {footer && <p className="px-1 mt-1.5 text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">{footer}</p>}
    </div>
  );
}

interface RowProps {
  Icon: typeof Info;
  label: string;
  desc?: string;
  value?: string; // 오른쪽에 보여줄 현재 값 (예: 테마 · 시스템)
  onClick?: () => void;
  danger?: boolean;
  chevron?: boolean;
  right?: React.ReactNode; // 스위치 등
}

// 한 줄 항목: 아이콘 · 이름(설명) · 현재 값 · >
function Row({ Icon, label, desc, value, onClick, danger, chevron = !!onClick, right }: RowProps) {
  const content = (
    <>
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        danger ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 'bg-leaf-100 dark:bg-leaf-900/40 text-leaf-600 dark:text-leaf-400'
      }`}>
        <Icon size={15} />
      </span>
      <span className="flex-1 min-w-0 text-left">
        <span className={`block text-sm font-medium ${danger ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-100'}`}>{label}</span>
        {desc && <span className="block text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{desc}</span>}
      </span>
      {value && <span className="flex-shrink-0 text-sm text-gray-400 dark:text-gray-500">{value}</span>}
      {right}
      {chevron && <ChevronRight size={16} className="flex-shrink-0 text-gray-300 dark:text-gray-600" />}
    </>
  );
  const cls = 'w-full px-4 py-3 flex items-center gap-3 min-h-[56px]';
  return onClick
    ? <button onClick={onClick} className={`${cls} transition-colors ${danger ? 'hover:bg-red-50/60 dark:hover:bg-red-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>{content}</button>
    : <div className={cls}>{content}</div>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button onClick={onChange} role="switch" aria-checked={checked} aria-label={label}
      className={`relative w-11 h-6 rounded-full transition-colors duration-300 flex-shrink-0 ${checked ? 'bg-leaf-600' : 'bg-gray-300 dark:bg-gray-700'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

// 여러 개 중 하나 고르기 (테마, 정렬 등)
function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string; Icon?: typeof Sun }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="p-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(({ value: v, label, Icon }) => (
        <button key={v} onClick={() => onChange(v)}
          className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
            value === v
              ? 'border-leaf-500 bg-leaf-50 dark:bg-leaf-900/20 text-leaf-600 dark:text-leaf-400'
              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
          }`}>
          {Icon && <Icon size={17} strokeWidth={value === v ? 2.5 : 1.8} />}
          {label}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings, categories, subcategories, todos, notes, noteFolders, monthlyGoals, ddays, isAdmin, setCurrentScreen } = useApp();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showAdminStats, setShowAdminStats] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showFeedbackList, setShowFeedbackList] = useState(false);
  // 태블릿·PC에서 오른쪽에 보여줄 분류 / 휴대폰에서 "일반" 상세 화면을 열었는지
  const [activeSection, setActiveSection] = useState<SectionId>('general');
  const [mobileGeneralOpen, setMobileGeneralOpen] = useState(false);
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
      todos, categories, subcategories, notes, noteFolders, monthlyGoals, ddays,
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
  const visibleSections = SECTIONS.filter(s => !s.adminOnly || isAdmin);

  const avatar = (size: 'sm' | 'lg') => (
    <span className={`${size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-xs'} rounded-xl bg-leaf-300 text-leaf-800 font-bold flex items-center justify-center flex-shrink-0 overflow-hidden`}>
      {user?.user_metadata?.avatar_url
        ? <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" alt="" />
        : (initials || '?')}
    </span>
  );

  // ── 분류별 내용 (휴대폰 목록과 PC 오른쪽 화면에서 같이 씀) ──
  const generalPanel = (
    <div className="space-y-5">
      <Group title="테마">
        <Segmented options={THEME_OPTS} value={settings.theme} onChange={v => updateSettings({ theme: v })} />
      </Group>
      <Group title="시작 화면" footer="앱을 열었을 때 처음 보이는 화면이에요.">
        <Segmented options={SCREEN_OPTS} value={settings.defaultScreen} onChange={v => updateSettings({ defaultScreen: v })} />
      </Group>
      <Group title="목록 표시">
        <div>
          <p className="px-4 pt-3 text-xs text-gray-500 dark:text-gray-400">정렬 기준</p>
          <Segmented options={SORT_OPTS} value={settings.listSortBy} onChange={v => updateSettings({ listSortBy: v })} />
        </div>
        <Row Icon={CheckCircle2} label="완료된 항목 숨기기"
          right={<Toggle checked={settings.hideCompleted} onChange={() => updateSettings({ hideCompleted: !settings.hideCompleted })} label="완료된 항목 숨기기" />} />
        {categories.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">목록에 보여줄 카테고리</p>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => {
                const hidden = settings.hiddenCategoryIds.includes(cat.id);
                return (
                  <button key={cat.id}
                    onClick={() => updateSettings({
                      hiddenCategoryIds: hidden
                        ? settings.hiddenCategoryIds.filter(id => id !== cat.id)
                        : [...settings.hiddenCategoryIds, cat.id],
                    })}
                    aria-pressed={!hidden}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      hidden
                        ? 'border-dashed border-gray-300 dark:border-gray-700 text-gray-400 line-through'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'
                    }`}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color, opacity: hidden ? 0.4 : 1 }} />
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Group>
      <Group title="홈 달력 글자 크기" footer="홈 화면 월 달력 칸에 보이는 일정·D-Day 글자 크기예요.">
        <Segmented options={CAL_SIZE_OPTS} value={settings.calendarTextSize} onChange={v => updateSettings({ calendarTextSize: v })} />
      </Group>
    </div>
  );

  const organizeRows = (
    <>
      <Row Icon={Tag} label="카테고리 관리" value={`${categories.length}개`} onClick={() => setCurrentScreen('categories')} />
      <Row Icon={Milestone} label="프로젝트 로드맵" desc="카테고리 하나를 골라 타임라인으로 보기" onClick={() => setCurrentScreen('project')} />
      <Row Icon={Bell} label="알림" desc="할 일 알림 받기"
        right={<Toggle checked={settings.notifications} onChange={() => updateSettings({ notifications: !settings.notifications })} label="알림" />} />
    </>
  );

  const accountRows = (
    <>
      {hasEmailPassword && <Row Icon={KeyRound} label="비밀번호 변경" onClick={() => setShowPasswordModal(true)} />}
      <Row Icon={FileDown} label="데이터 내보내기" desc="할 일 · 메모 등을 JSON 파일로 백업" onClick={handleExport} chevron={false} />
      <Row Icon={LogOut} label={signingOut ? '로그아웃 중...' : '로그아웃'} onClick={handleSignOut} chevron={false} />
      <Row Icon={UserX} label="계정 삭제" onClick={() => setShowDeleteModal(true)} danger chevron={false} />
    </>
  );

  const helpRows = (
    <>
      <Row Icon={BookOpen} label="사용 가이드" desc="처음 안내를 다시 볼 수 있어요" onClick={() => setShowGuide(true)} />
      <Row Icon={MessageSquareHeart} label="의견 보내기" desc="불편한 점, 원하는 기능을 알려주세요" onClick={() => setShowFeedback(true)} />
    </>
  );

  const aboutRows = (
    <>
      <Row Icon={Info} label="업데이트 이력" value={`v${APP_VERSION}`} onClick={() => setShowChangelog(true)} />
      {isInstalled
        ? <Row Icon={CheckCircle2} label="앱이 설치되어 있어요" />
        : <Row Icon={Download} label="앱 다운로드" desc="홈 화면에 추가하면 더 편리해요" onClick={handleInstallClick} />}
      <Row Icon={FileText} label="이용약관" onClick={() => setCurrentScreen('terms')} />
      <Row Icon={ShieldCheck} label="개인정보처리방침" onClick={() => setCurrentScreen('privacy')} />
    </>
  );

  const adminRows = (
    <>
      <Row Icon={Inbox} label="받은 의견" desc="사용자들이 보낸 의견" onClick={() => setShowFeedbackList(true)} />
      <Row Icon={BarChart3} label="관리자 통계" desc="가입자 · 활성 사용자 등" onClick={() => setShowAdminStats(true)} />
    </>
  );

  // PC 오른쪽 화면에 보여줄 내용
  function renderPanel(id: SectionId) {
    switch (id) {
      case 'general': return generalPanel;
      case 'organize': return <Group>{organizeRows}</Group>;
      case 'account': return (
        <div className="space-y-5">
          <Group>
            <div className="px-4 py-4 flex items-center gap-3">
              {avatar('lg')}
              <div className="min-w-0">
                <p className="text-base font-bold text-gray-900 dark:text-white truncate">{displayName || '사용자'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
          </Group>
          <Group>{accountRows}</Group>
        </div>
      );
      case 'help': return <Group>{helpRows}</Group>;
      case 'about': return <Group>{aboutRows}</Group>;
      case 'admin': return <Group footer="관리자 계정에서만 보이는 메뉴예요.">{adminRows}</Group>;
    }
  }

  const activeMeta = visibleSections.find(s => s.id === activeSection) ?? visibleSections[0];

  return (
    <div className="pb-24">
      {/* ── 휴대폰: 한 줄 목록 ── */}
      <div className="md:hidden px-4 pt-6">
        {mobileGeneralOpen ? (
          <>
            <button onClick={() => setMobileGeneralOpen(false)}
              className="flex items-center gap-0.5 -ml-1 mb-3 text-sm font-medium text-leaf-600 dark:text-leaf-400">
              <ChevronLeft size={18} /> 설정
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-5">일반</h1>
            {generalPanel}
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-5">설정</h1>
            <div className="space-y-5">
              {/* 프로필 */}
              <Group>
                <div className="px-4 py-3.5 flex items-center gap-3">
                  {avatar('lg')}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-gray-900 dark:text-white truncate">{displayName || '사용자'}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                  </div>
                </div>
              </Group>

              {/* 일반: 현재 값만 보여주고 누르면 상세 화면 */}
              <Group title="일반">
                <Row Icon={Palette} label="테마" value={labelOf(THEME_OPTS, settings.theme)} onClick={() => setMobileGeneralOpen(true)} />
                <Row Icon={House} label="시작 화면" value={labelOf(SCREEN_OPTS, settings.defaultScreen)} onClick={() => setMobileGeneralOpen(true)} />
                <Row Icon={ListFilter} label="목록 표시" value={labelOf(SORT_OPTS, settings.listSortBy)} onClick={() => setMobileGeneralOpen(true)} />
                <Row Icon={CalendarDays} label="홈 달력 글자 크기" value={labelOf(CAL_SIZE_OPTS, settings.calendarTextSize)} onClick={() => setMobileGeneralOpen(true)} />
              </Group>
              <Group title="할 일 정리">{organizeRows}</Group>
              <Group title="계정 · 데이터">{accountRows}</Group>
              <Group title="도움 · 의견">{helpRows}</Group>
              <Group title="앱 정보">{aboutRows}</Group>
              {isAdmin && <Group title="관리자">{adminRows}</Group>}
            </div>
          </>
        )}
      </div>

      {/* ── 태블릿·PC: 왼쪽 분류 메뉴 + 오른쪽 내용 ── */}
      <div className="hidden md:flex max-w-5xl mx-auto px-6 lg:px-8 pt-10 gap-8 lg:gap-10 items-start">
        <nav className="w-56 flex-shrink-0 sticky top-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-5 px-2">설정</h1>
          <div className="flex items-center gap-2.5 px-2 mb-4">
            {avatar('sm')}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{displayName || '사용자'}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <ul className="space-y-0.5">
            {visibleSections.map(({ id, label, Icon }) => {
              const on = activeMeta.id === id;
              return (
                <li key={id}>
                  <button onClick={() => setActiveSection(id)} aria-current={on ? 'page' : undefined}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
                      on
                        ? 'bg-leaf-100 dark:bg-leaf-900/40 text-leaf-700 dark:text-leaf-300 font-semibold'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 font-medium'
                    }`}>
                    <Icon size={16} />
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section className="flex-1 min-w-0 max-w-2xl pt-[52px]" aria-label={activeMeta.label}>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">{activeMeta.label}</h2>
          {renderPanel(activeMeta.id)}
        </section>
      </div>

      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
      {showDeleteModal && <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />}
      {showInstallInstructions && <InstallInstructionsModal onClose={() => setShowInstallInstructions(false)} />}
      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
      {showAdminStats && <AdminStatsModal onClose={() => setShowAdminStats(false)} />}
      {showGuide && <OnboardingModal onClose={() => setShowGuide(false)} />}
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
      {showFeedbackList && <FeedbackListModal onClose={() => setShowFeedbackList(false)} />}
    </div>
  );
}
