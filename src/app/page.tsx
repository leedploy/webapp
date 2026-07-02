'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HomeHub() {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [username, setUsername] = useState<string>('ผู้ใช้งาน');
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth', { method: 'DELETE' });
      if (res.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  useEffect(() => {
    // โหลดข้อมูลผู้ใช้ที่ล็อกอินอยู่
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setUsername(data.user.username);
          }
        }
      } catch (e) {
        console.error('Failed to fetch user', e);
      }
    };

    fetchUser();

    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);

      // Format date in Thai style: Day, Month, and B.E. Year (e.g., 8 มิ.ย. 2569)
      const dateString = now.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      setCurrentDate(dateString);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col w-full md:max-w-5xl lg:max-w-6xl mx-auto bg-slate-900 shadow-2xl relative overflow-hidden transition-all duration-300">
      {/* Premium Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950"></div>
        <div className="absolute -top-[30%] -right-[20%] w-[70%] h-[70%] rounded-full bg-sky-600/20 blur-[100px]"></div>
        <div className="absolute -bottom-[20%] -left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-600/20 blur-[100px]"></div>
      </div>

      {/* Status Bar */}
      <div className="relative z-10 px-6 py-3 flex justify-between items-center text-slate-100 text-sm font-medium">
        <div className="w-1/3 text-left">{currentTime}</div>
        <div className="w-1/3 text-center text-xs md:text-sm text-slate-300 font-semibold drop-shadow-sm">{currentDate}</div>
        <div className="w-1/3 flex justify-end items-center gap-2">
          <i className="fa-solid fa-signal text-[10px]"></i>
          <i className="fa-solid fa-wifi text-[12px]"></i>
          <i className="fa-solid fa-battery-full text-[14px]"></i>
        </div>
      </div>

      {/* App Grid */}
      <main className="relative z-10 flex-1 p-6 flex flex-col gap-6">
        {/* Welcome Header & Logout */}
        <div className="flex justify-between items-center bg-slate-800/30 backdrop-blur-md border border-slate-700/30 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center text-white text-lg font-bold uppercase">
              {username.charAt(0)}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">สวัสดีค่ะ คุณ {username}</h2>
              <p className="text-[10px] text-slate-400">ยินดีต้อนรับสู่แดชบอร์ดส่วนตัว</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700/60 hover:bg-rose-500/10 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition-all flex items-center justify-center active:scale-95 cursor-pointer"
            title="ออกจากระบบ"
          >
            <i className="fa-solid fa-right-from-bracket text-sm"></i>
          </button>
        </div>

        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-6">
          
          {/* QuickMemo App */}
          <Link href="/quickmemo" className="flex flex-col items-center gap-2 group outline-none">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[1.5rem] bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-sky-500/30 flex items-center justify-center text-white text-3xl group-hover:scale-95 group-active:scale-90 transition-all">
              <i className="fa-solid fa-box-archive drop-shadow-md"></i>
            </div>
            <span className="text-slate-200 text-xs md:text-sm font-medium drop-shadow-md">QuickMemo</span>
          </Link>

          {/* Leed Link App */}
          <Link href="/leedlink" className="flex flex-col items-center gap-2 group outline-none">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[1.5rem] bg-gradient-to-br from-purple-500 to-indigo-700 shadow-lg shadow-indigo-500/30 flex items-center justify-center text-white text-3xl group-hover:scale-95 group-active:scale-90 transition-all">
              <i className="fa-solid fa-book-open drop-shadow-md"></i>
            </div>
            <span className="text-slate-200 text-xs md:text-sm font-medium drop-shadow-md">Leed Link</span>
          </Link>

          {/* Authenticator App */}
          <Link href="/authenticator" className="flex flex-col items-center gap-2 group outline-none">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[1.5rem] bg-gradient-to-br from-teal-400 to-emerald-600 shadow-lg shadow-emerald-500/30 flex items-center justify-center text-white text-3xl group-hover:scale-95 group-active:scale-90 transition-all">
              <i className="fa-solid fa-shield-halved drop-shadow-md"></i>
            </div>
            <span className="text-slate-200 text-xs md:text-sm font-medium drop-shadow-md">Auth 2FA</span>
          </Link>

          {/* Placeholder for future apps (optional visual effect) */}
          <div className="flex flex-col items-center gap-2 opacity-30">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[1.5rem] bg-slate-800/50 border border-slate-700 border-dashed flex items-center justify-center text-slate-500 text-2xl">
              <i className="fa-solid fa-plus"></i>
            </div>
            <span className="text-slate-500 text-xs md:text-sm font-medium">เพิ่มแอป</span>
          </div>

        </div>
      </main>

      {/* Bottom Dock (Optional for iOS style) */}
      <div className="relative z-10 p-4 pb-8 md:pb-6">
        <div className="w-full max-w-sm md:max-w-md mx-auto bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-4 flex justify-around items-center transition-all duration-300">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-xl opacity-50">
            <i className="fa-solid fa-phone"></i>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-400 to-red-600 flex items-center justify-center text-white text-xl opacity-50">
            <i className="fa-solid fa-envelope"></i>
          </div>
          <Link href="/leedlink" className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-700 flex items-center justify-center text-white text-xl shadow-lg shadow-indigo-500/20 active:scale-90 transition-all" title="Leed Link">
            <i className="fa-solid fa-book-open"></i>
          </Link>
          <Link href="/quickmemo" className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-xl shadow-lg shadow-sky-500/20 active:scale-90 transition-all" title="QuickMemo">
            <i className="fa-solid fa-box-archive"></i>
          </Link>
          <Link href="/authenticator" className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-white text-xl shadow-lg shadow-emerald-500/20 active:scale-90 transition-all" title="Authenticator">
            <i className="fa-solid fa-shield-halved"></i>
          </Link>
        </div>
      </div>
    </div>
  );
}
