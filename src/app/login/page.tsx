'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วนค่ะ!');
      return;
    }

    if (isRegister) {
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(username.trim())) {
        setError('ชื่อผู้ใช้งานต้องเป็นอักษรภาษาอังกฤษ ตัวเลข หรือขีดล่าง และมีความยาว 3-30 ตัวอักษรค่ะ');
        return;
      }
      if (password.length < 6) {
        setError('รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษรค่ะ!');
        return;
      }
      if (password !== confirmPassword) {
        setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกันค่ะ!');
        return;
      }
    }

    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isRegister ? 'register' : 'login',
          username: username.trim(),
          password
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (isRegister) {
          setSuccessMsg('สมัครสมาชิกสำเร็จแล้วค่ะ! กำลังพาท่านไปหน้าหลัก...');
        } else {
          setSuccessMsg('เข้าสู่ระบบสำเร็จแล้วค่ะ!');
        }
        
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 1000);
      } else {
        setError(data.error || 'เกิดข้อผิดพลาดในการดำเนินการ!');
      }
    } catch (err) {
      console.error(err);
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อระบบ!');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError('');
    setSuccessMsg('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center w-full md:max-w-3xl mx-auto bg-slate-900 shadow-2xl relative overflow-hidden px-6">
      {/* Background decorations */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950"></div>
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/15 blur-[90px]"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-sky-600/15 blur-[90px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto shadow-lg shadow-sky-500/20 mb-3">
            <i className={`fa-solid ${isRegister ? 'fa-user-plus' : 'fa-lock'} transition-all duration-300`}></i>
          </div>
          <h1 className="text-2xl font-extrabold text-sky-400 tracking-wide drop-shadow-md">Leed Hub</h1>
          <p className="text-xs text-slate-500 mt-1">
            {isRegister ? 'สร้างบัญชีของตัวท่านเองเพื่อเริ่มต้นใช้งาน' : 'คลังบันทึกข้อมูลส่วนตัวของพี่ลีดและเพื่อนๆ'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-2xl transition-all duration-300">
          {/* Tab Switcher */}
          <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-700/40 mb-5">
            <button
              onClick={() => isRegister && toggleMode()}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                !isRegister ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              เข้าสู่ระบบ
            </button>
            <button
              onClick={() => !isRegister && toggleMode()}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                isRegister ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              สมัครสมาชิก
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="กรอกชื่อผู้ใช้ภาษาอังกฤษ..."
                  required
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
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-colors"
                  placeholder="กรอกรหัสผ่าน..."
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                </button>
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">ยืนยันรหัสผ่าน (Confirm Password)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                    <i className="fa-solid fa-circle-check text-xs"></i>
                  </span>
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-colors"
                    placeholder="กรอกรหัสผ่านอีกครั้ง..."
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                    title={showConfirmPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  >
                    <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation shrink-0"></i>
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl flex items-center gap-2">
                <i className="fa-solid fa-circle-check shrink-0"></i>
                <span>{successMsg}</span>
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
                  <span>กำลังดำเนินการ...</span>
                </>
              ) : isRegister ? (
                <>
                  <i className="fa-solid fa-user-plus"></i>
                  <span>สมัครสมาชิก</span>
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

        {/* Toggle Mode Link */}
        <p className="text-xs text-center text-slate-500 mt-5">
          {isRegister ? 'มีบัญชีอยู่แล้ว?' : 'ยังไม่มีบัญชีสำหรับคนอื่น?'}{' '}
          <button onClick={toggleMode} className="text-sky-400 hover:underline font-semibold focus:outline-none">
            {isRegister ? 'เข้าสู่ระบบที่นี่' : 'คลิกเพื่อสมัครสมาชิกใหม่'}
          </button>
        </p>

        {/* Footer info */}
        <p className="text-[10px] text-center text-slate-600 mt-6">
          &copy; {new Date().getFullYear()} Leed Hub. Database-Synced Authentication.
        </p>
      </div>
    </div>
  );
}
