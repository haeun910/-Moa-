import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

type Mode = 'login' | 'signup' | 'forgot';

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  function reset() { setError(''); setInfo(''); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setInfo('');
    setLoading(true);

    try {
      if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) setError(error);
        else setInfo('비밀번호 재설정 이메일을 보냈습니다.');
        return;
      }

      if (mode === 'signup') {
        if (password.length < 8) { setError('비밀번호는 8자 이상이어야 합니다.'); return; }
        const { error } = await signUp(email, password, displayName);
        if (error) setError(error);
        else setInfo('가입 확인 이메일을 보냈습니다. 메일함을 확인해 주세요.');
        return;
      }

      const { error } = await signIn(email, password);
      if (error) setError('이메일 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    reset();
    const { error } = await signInWithGoogle();
    if (error) setError(error);
  }

  const inputClass = "w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-leaf-500 focus:border-transparent text-sm transition-all";

  return (
    <div className="min-h-screen bg-leaf-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex rounded-3xl overflow-hidden mb-4 shadow-lg shadow-leaf-500/25">
            <Logo size={64} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">모아</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">할 일과 일정을 한 곳에서 관리해요</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl shadow-gray-200/60 dark:shadow-black/40 border border-gray-100 dark:border-gray-800 p-6">
          {mode !== 'forgot' && (
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 mb-6">
              {(['login', 'signup'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); reset(); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    mode === m
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {m === 'login' ? '로그인' : '회원가입'}
                </button>
              ))}
            </div>
          )}

          {mode === 'forgot' && (
            <div className="mb-5">
              <button onClick={() => { setMode('login'); reset(); }} className="text-sm text-leaf-600 dark:text-leaf-400 font-semibold">← 로그인으로 돌아가기</button>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-3 mb-1">비밀번호 재설정</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">가입한 이메일 주소를 입력하면 재설정 링크를 보내드려요.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 tracking-wide">이름</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                    placeholder="홍길동" className={inputClass} />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 tracking-wide">이메일</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="example@email.com" required className={inputClass} />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 tracking-wide">비밀번호</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? '8자 이상' : '비밀번호'} required
                    className={inputClass + ' pr-10'} />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="text-right">
                <button type="button" onClick={() => { setMode('forgot'); reset(); }}
                  className="text-xs text-leaf-600 dark:text-leaf-400 hover:underline font-medium">
                  비밀번호를 잊으셨나요?
                </button>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl px-3.5 py-2.5">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
              </div>
            )}
            {info && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-3.5 py-2.5">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">{info}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-leaf-300 hover:bg-leaf-400 text-leaf-800 font-bold text-sm transition-all duration-200 mt-1 disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? '처리 중...' : mode === 'login' ? '로그인' : mode === 'signup' ? '가입하기' : '재설정 이메일 보내기'}
            </button>
          </form>

          {mode !== 'forgot' && (
            <>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs text-gray-400 font-medium">또는</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>

              <button
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                Google로 계속하기
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-5">
          이용약관 및 개인정보처리방침에 동의하는 것으로 간주합니다.
        </p>
      </div>
    </div>
  );
}
