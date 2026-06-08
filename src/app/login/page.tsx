'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบค่ะ!');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Redirect to homepage
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง!');
      }
    } catch (err) {
      console.error(err);
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อระบบ!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center w-full md:max-w-3xl mx-auto bg-slate-900 shadow-2xl relative overflow-hidden px-6">
      {/* Background decorations */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950"></div>
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/15 blur-[90px]"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-sky-600/15 blur-[90px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto shadow-lg shadow-sky-500/20 mb-3 animate-pulse">
            <i className="fa-solid fa-lock"></i>
          </div>
          <h1 className="text-2xl font-extrabold text-sky-400 tracking-wide drop-shadow-md">Leed Hub</h1>
          <p className="text-xs text-slate-500 mt-1">คลังบันทึกข้อมูลส่วนตัวของพี่ลีด</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">ชื่อผู้ใช้ (Username)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                  <i className="fa-solid fa-user text-xs"></i>
                </span>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-colors"
                  placeholder="กรอกชื่อผู้ใช้..."
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">รหัสผ่าน (Password)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                  <i className="fa-solid fa-key text-xs"></i>
                </span>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-colors"
                  placeholder="กรอกรหัสผ่าน..."
                />
              </div>
            </div>

            {error && (
              <div className="text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation shrink-0"></i>
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3 rounded-xl font-bold bg-sky-500 hover:bg-sky-600 active:scale-98 text-slate-950 transition-all shadow-lg shadow-sky-500/20 flex justify-center items-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>กำลังเข้าสู่ระบบ...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-right-to-bracket"></i>
                  <span>เข้าสู่ระบบ</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-[10px] text-center text-slate-600 mt-6">
          &copy; {new Date().getFullYear()} Leed Hub. Secured with NextJS Middleware.
        </p>
      </div>
    </div>
  );
}
