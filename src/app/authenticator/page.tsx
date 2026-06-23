'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import * as OTPAuth from 'otpauth';

interface TwoFAAccount {
  id: number;
  issuer: string;
  account_name: string;
  secret_key: string;
  created_at?: string;
}

// แบรนด์ยอดนิยมสำหรับแสดงไอคอนและสีสัน
const popularBrands: Record<string, { icon: string; bg: string; text: string }> = {
  google: { icon: 'fa-brands fa-google text-red-500', bg: 'from-red-500/20 to-amber-500/20 border-red-500/30', text: 'text-red-400' },
  github: { icon: 'fa-brands fa-github text-slate-100', bg: 'from-slate-700/30 to-slate-900/30 border-slate-700/50', text: 'text-slate-300' },
  facebook: { icon: 'fa-brands fa-facebook text-blue-500', bg: 'from-blue-600/20 to-blue-800/20 border-blue-600/30', text: 'text-blue-400' },
  discord: { icon: 'fa-brands fa-discord text-indigo-400', bg: 'from-indigo-500/20 to-indigo-700/20 border-indigo-500/30', text: 'text-indigo-400' },
  microsoft: { icon: 'fa-brands fa-microsoft text-sky-500', bg: 'from-sky-500/20 to-blue-600/20 border-sky-500/30', text: 'text-sky-400' },
  aws: { icon: 'fa-brands fa-aws text-orange-400', bg: 'from-orange-400/20 to-amber-600/20 border-orange-500/30', text: 'text-orange-400' },
  steam: { icon: 'fa-brands fa-steam text-sky-400', bg: 'from-blue-800/20 to-slate-900/20 border-sky-800/30', text: 'text-sky-400' },
};

export default function Authenticator() {
  const [accounts, setAccounts] = useState<TwoFAAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('คัดลอกรหัสแล้ว!');

  // สำหรับ Modal เพิ่ม/แก้ไขบัญชี
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TwoFAAccount | null>(null);
  const [issuer, setIssuer] = useState('');
  const [accountName, setAccountName] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [secretError, setSecretError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // สำหรับ Modal ลบบัญชี
  const [deletingAccount, setDeletingAccount] = useState<TwoFAAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ดึงข้อมูลวิถีและจัดการเวลานับถอยหลัง
  const getSecondsRemaining = () => {
    return 30 - (Math.floor(Date.now() / 1000) % 30);
  };

  useEffect(() => {
    // อัปเดตเวลาและวันที่บน Status Bar
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);

      const dateString = now.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      setCurrentDate(dateString);
    };

    updateTime();
    const clockInterval = setInterval(updateTime, 1000);

    // จัดการนับถอยหลัง 30 วินาทีสำหรับ OTP
    setSecondsRemaining(getSecondsRemaining());
    const otpInterval = setInterval(() => {
      setSecondsRemaining(getSecondsRemaining());
    }, 1000);

    // โหลดข้อมูลบัญชี 2FA
    fetchAccounts();

    return () => {
      clearInterval(clockInterval);
      clearInterval(otpInterval);
    };
  }, []);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/authenticator');
      const data = await res.json();
      if (data.success && data.data) {
        setAccounts(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch 2FA accounts', e);
    } finally {
      setIsLoading(false);
    }
  };

  // แยกคีย์จากรูปแบบที่มีท่อแบ่ง (เช่น username|secret_key)
  const extractSecretKey = (str: string): string => {
    let s = str.trim();
    if (s.includes('|')) {
      const parts = s.split('|');
      s = parts[parts.length - 1].trim();
    }
    return s;
  };

  // ตรวจสอบความถูกต้องของ Base32 Secret Key
  const isValidBase32 = (str: string) => {
    const extracted = extractSecretKey(str);
    const clean = extracted.replace(/[\s-]/g, '').toUpperCase();
    if (!clean) return false;
    return /^[A-Z2-7]+=*$/.test(clean);
  };

  const handleOpenAddModal = () => {
    setEditingAccount(null);
    setIssuer('');
    setAccountName('');
    setSecretKey('');
    setSecretError('');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (acc: TwoFAAccount) => {
    setEditingAccount(acc);
    setIssuer(acc.issuer);
    setAccountName(acc.account_name);
    setSecretKey(acc.secret_key);
    setSecretError('');
    setShowAddModal(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issuer.trim() || !accountName.trim() || !secretKey.trim()) {
      setSecretError('กรุณากรอกข้อมูลให้ครบถ้วนค่ะ');
      return;
    }

    if (!isValidBase32(secretKey)) {
      setSecretError('Secret Key ไม่ถูกต้องตามหลัก Base32 (ใช้ได้เฉพาะ A-Z และ 2-7 เท่านั้นค่ะ)');
      return;
    }

    setIsSubmitting(true);
    setSecretError('');

    const extracted = extractSecretKey(secretKey);
    const cleanSecret = extracted.replace(/[\s-]/g, '').toUpperCase();

    try {
      const isEdit = !!editingAccount;
      const url = '/api/authenticator';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = isEdit 
        ? { id: editingAccount.id, issuer, accountName, secretKey: cleanSecret }
        : { issuer, accountName, secretKey: cleanSecret };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToastMessage(isEdit ? 'แก้ไขข้อมูลเรียบร้อยแล้วค่ะ!' : 'เพิ่มบัญชีใหม่เรียบร้อยแล้วค่ะ!');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
        
        setShowAddModal(false);
        fetchAccounts();
      } else {
        setSecretError(data.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (err) {
      console.error(err);
      setSecretError('เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว กรุณาลองใหม่ค่ะ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletingAccount) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/authenticator?id=${deletingAccount.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToastMessage('ลบบัญชีเรียบร้อยแล้วค่ะ');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);

        setDeletingAccount(null);
        fetchAccounts();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการลบข้อมูล');
      }
    } catch (e) {
      console.error(e);
      alert('เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว กรุณาลองใหม่ค่ะ');
    } finally {
      setIsDeleting(false);
    }
  };

  // สร้างรหัส OTP สำหรับแต่ละบัญชี
  const generateOTP = (secret: string) => {
    try {
      const cleanSecret = secret.replace(/[\s-]/g, '').toUpperCase();
      const totp = new OTPAuth.TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(cleanSecret),
      });
      return totp.generate();
    } catch (e) {
      return '------';
    }
  };

  const handleCopyCode = (code: string) => {
    if (code === '------') return;
    navigator.clipboard.writeText(code).then(() => {
      setToastMessage('คัดลอกรหัสแล้ว!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);
    });
  };

  // ดึงดีไซน์ตามแบรนด์
  const getBrandStyle = (issuerName: string) => {
    const key = issuerName.toLowerCase().trim();
    if (popularBrands[key]) {
      return popularBrands[key];
    }
    // Fallback
    return {
      icon: 'fa-solid fa-key text-emerald-400',
      bg: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20',
      text: 'text-emerald-400',
    };
  };

  // การกรองข้อมูลค้นหา
  const filteredAccounts = accounts.filter(acc => 
    acc.issuer.toLowerCase().includes(searchQuery.toLowerCase()) || 
    acc.account_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // คำนวณความคืบหน้าของเวลานับถอยหลังวงกลม
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (secondsRemaining / 30) * circumference;

  return (
    <div className="text-slate-200 min-h-screen flex flex-col justify-between w-full md:max-w-5xl lg:max-w-6xl mx-auto bg-slate-900 shadow-2xl relative transition-all duration-300 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950"></div>
        <div className="absolute -top-[30%] -right-[20%] w-[70%] h-[70%] rounded-full bg-emerald-600/10 blur-[120px]"></div>
        <div className="absolute -bottom-[20%] -left-[20%] w-[60%] h-[60%] rounded-full bg-teal-600/10 blur-[120px]"></div>
      </div>

      {/* Top Header & Status Bar */}
      <div className="relative z-10 bg-slate-800/40 backdrop-blur-md border-b border-slate-700/50 sticky top-0">
        <div className="px-6 py-2 flex justify-between items-center text-slate-300 text-xs font-semibold border-b border-slate-700/30">
          <div>{currentTime}</div>
          <div className="text-slate-400 font-bold">{currentDate}</div>
          <div className="flex items-center gap-1.5">
            <i className="fa-solid fa-signal text-[9px]"></i>
            <i className="fa-solid fa-wifi text-[11px]"></i>
            <i className="fa-solid fa-battery-full text-[13px]"></i>
          </div>
        </div>

        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="w-8.5 h-8.5 flex items-center justify-center bg-slate-900/60 hover:bg-slate-800 rounded-full text-slate-300 border border-slate-700/60 transition-colors active:scale-95" title="กลับหน้าโฮม">
              <i className="fa-solid fa-arrow-left"></i>
            </Link>
            <h1 className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-500 flex items-center gap-2">
              <i className="fa-solid fa-shield-halved text-teal-400"></i>
              <span>Authenticator</span>
            </h1>
          </div>

          {/* วงล้อเวลานับถอยหลัง */}
          <div className="flex items-center gap-2 bg-slate-900/60 px-2.5 py-1 rounded-xl border border-slate-700/40">
            <svg className="w-9 h-9 transform -rotate-90">
              <circle
                cx="18"
                cy="18"
                r={radius}
                className="stroke-slate-800 fill-none"
                strokeWidth="2.5"
              />
              <circle
                cx="18"
                cy="18"
                r={radius}
                className={`fill-none transition-all duration-1000 ease-linear ${
                  secondsRemaining <= 5 ? 'stroke-rose-500 animate-pulse' : 'stroke-teal-400'
                }`}
                strokeWidth="2.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
              <text
                x="18"
                y="22.5"
                className={`text-[10px] font-extrabold text-center fill-current ${
                  secondsRemaining <= 5 ? 'text-rose-500 font-black' : 'text-teal-400'
                }`}
                textAnchor="middle"
              >
                {secondsRemaining}
              </text>
            </svg>
            <span className="text-[10px] uppercase font-bold text-slate-400 hidden sm:inline">Refresh</span>
          </div>
        </div>

        {/* ช่องค้นหาบัญชี */}
        <div className="px-4 pb-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
              <i className="fa-solid fa-magnifying-glass text-xs"></i>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/70 border border-slate-700/50 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
              placeholder="ค้นหาตามบริการ หรือ ชื่อผู้ใช้งาน..."
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
              >
                <i className="fa-solid fa-circle-xmark text-sm"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <main className="relative z-10 flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-32">
        {isLoading ? (
          <div className="text-center py-16 text-slate-500">
            <i className="fa-solid fa-circle-notch fa-spin text-4xl mb-4 block text-teal-400"></i>
            <p className="text-sm font-medium">กำลังโหลดบัญชีของคุณจากฐานข้อมูล...</p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/10 border border-dashed border-slate-800 rounded-3xl p-8 max-w-md mx-auto mt-10">
            <div className="w-16 h-16 bg-slate-800/40 rounded-full flex items-center justify-center text-slate-500 text-3xl mx-auto mb-4">
              <i className="fa-solid fa-key"></i>
            </div>
            <h3 className="text-base font-bold text-slate-300">ไม่มีข้อมูลบัญชี 2FA</h3>
            <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
              {searchQuery 
                ? 'ไม่พบข้อมูลที่ตรงกับคำค้นหาของคุณพี่ลีดเลยค่ะ ลองเปลี่ยนคำค้นดูนะคะ' 
                : 'เริ่มต้นง่ายๆ โดยการกดปุ่ม "เพิ่มบัญชีใหม่" ด้านล่างเพื่อเพิ่มรหัส TOTP บัญชีแรกของพี่ลีดค่ะ'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {filteredAccounts.map(acc => {
              const brandStyle = getBrandStyle(acc.issuer);
              const otpCode = generateOTP(acc.secret_key);
              const formattedOTP = otpCode !== '------' 
                ? `${otpCode.slice(0, 3)} ${otpCode.slice(3)}`
                : '------';

              return (
                <div 
                  key={acc.id}
                  className={`bg-slate-800/40 backdrop-blur-md border rounded-2xl p-4.5 flex flex-col justify-between shadow-md relative hover:bg-slate-800/60 transition-all group ${brandStyle.bg}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 bg-slate-900/60 rounded-xl flex items-center justify-center text-xl shrink-0 border border-slate-700/30">
                        <i className={brandStyle.icon}></i>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-200 truncate text-sm">{acc.issuer}</h3>
                        <p className="text-slate-400 text-xs truncate mt-0.5">{acc.account_name}</p>
                      </div>
                    </div>

                    <div className="flex gap-0.5">
                      <button
                        onClick={() => handleOpenEditModal(acc)}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-900/50 transition-all active:scale-90"
                        title="แก้ไขรายละเอียด"
                      >
                        <i className="fa-regular fa-pen-to-square text-sm"></i>
                      </button>
                      <button
                        onClick={() => setDeletingAccount(acc)}
                        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900/50 transition-all active:scale-90"
                        title="ลบบัญชี"
                      >
                        <i className="fa-regular fa-trash-can text-sm"></i>
                      </button>
                    </div>
                  </div>

                  {/* รหัส OTP (คลิกเพื่อคัดลอก) */}
                  <div 
                    onClick={() => handleCopyCode(otpCode)}
                    className="mt-5 bg-slate-950/40 hover:bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex justify-between items-center cursor-pointer active:scale-[0.98] transition-all group/code"
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 group-hover/code:text-teal-500 transition-colors">One-time password</span>
                      <span className={`text-2xl font-black tracking-widest ${brandStyle.text} font-mono mt-0.5`}>
                        {formattedOTP}
                      </span>
                    </div>
                    <div className="w-8.5 h-8.5 bg-slate-900/80 rounded-lg flex items-center justify-center text-slate-400 hover:text-teal-400 border border-slate-700/40 active:scale-90 transition-colors">
                      <i className="fa-regular fa-copy text-sm"></i>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Add Button */}
      <div className="fixed bottom-6 left-0 right-0 w-full max-w-sm mx-auto px-4 z-20 flex justify-center pointer-events-none">
        <button
          onClick={handleOpenAddModal}
          className="pointer-events-auto bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-500 hover:to-emerald-600 active:scale-95 transition-all text-slate-950 font-bold px-6 py-3.5 rounded-full shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2.5 w-full"
        >
          <i className="fa-solid fa-plus text-base"></i>
          <span>เพิ่มบัญชีใหม่</span>
        </button>
      </div>

      {/* Toast Notification */}
      <div className={`fixed top-30 left-1/2 transform -translate-x-1/2 bg-teal-500 text-slate-950 font-bold px-5 py-2.5 rounded-full shadow-xl text-sm pointer-events-none transition-opacity duration-300 z-50 flex items-center gap-2 ${showToast ? 'opacity-100' : 'opacity-0'}`}>
        <i className="fa-solid fa-circle-check text-base"></i>
        <span>{toastMessage}</span>
      </div>

      {/* Modal เพิ่ม/แก้ไขบัญชี */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300">
          <div className="bg-slate-800 border border-slate-700 rounded-2.5xl p-6 w-full max-w-md shadow-2xl scale-100 transform transition-all duration-300">
            <div className="flex justify-between items-center mb-5 border-b border-slate-700/40 pb-3">
              <h3 className="text-base font-extrabold text-teal-400 flex items-center gap-2">
                <i className={editingAccount ? 'fa-regular fa-pen-to-square' : 'fa-solid fa-plus-circle'}></i>
                {editingAccount ? 'แก้ไขรายละเอียดบัญชี 2FA' : 'เพิ่มบัญชี 2FA ใหม่'}
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 w-7 h-7 flex items-center justify-center bg-slate-900 rounded-full border border-slate-700/50"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">ชื่อบริการ / ผู้ออกรหัส (Issuer)</label>
                <input
                  type="text"
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                  placeholder="เช่น Google, Github, Facebook"
                  autoFocus
                  required
                />
                
                {/* บริการแนะนำ */}
                {!editingAccount && issuer.trim() === '' && (
                  <div className="mt-2.5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">แบรนด์แนะนำ:</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {Object.keys(popularBrands).map(brand => (
                        <button
                          key={brand}
                          type="button"
                          onClick={() => setIssuer(brand.charAt(0).toUpperCase() + brand.slice(1))}
                          className="text-[11px] bg-slate-900 border border-slate-700/50 px-2.5 py-1 rounded-lg text-slate-300 hover:border-teal-500 hover:text-teal-400 transition-colors"
                        >
                          {brand.charAt(0).toUpperCase() + brand.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">ชื่อบัญชี / อีเมล (Account Name)</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                  placeholder="เช่น username หรือ user@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">รหัสลับ (Secret Key)</label>
                <input
                  type="text"
                  value={secretKey}
                  onChange={(e) => {
                    const val = e.target.value;
                    // ตรวจจับรูปแบบมีท่อแบ่ง (Pipe format)
                    if (val.includes('|')) {
                      const parts = val.split('|');
                      const parsedSecret = parts[parts.length - 1].trim();
                      setSecretKey(parsedSecret);
                      if (!accountName.trim() && parts[0].trim()) {
                        setAccountName(parts[0].trim());
                      }
                    } else {
                      setSecretKey(val);
                    }
                    if (secretError) setSecretError('');
                  }}
                  className={`w-full bg-slate-900 border rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-200 focus:outline-none ${
                    secretError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-700 focus:border-teal-500'
                  }`}
                  placeholder="กรอกคีย์ Base32 (เช่น JBSWY3DPEHPK3PXP)"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  * จะเว้นวรรคหรือขีดกลางก็ได้ ระบบจะทำความสะอาดลบออกและแปลงเป็นตัวพิมพ์ใหญ่ให้อัตโนมัติค่ะ
                </p>
              </div>

              {secretError && (
                <div className="text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl flex items-center gap-2">
                  <i className="fa-solid fa-circle-exclamation shrink-0"></i>
                  <span>{secretError}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-slate-300 bg-slate-700 hover:bg-slate-650 transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl font-bold bg-teal-500 hover:bg-teal-600 text-slate-950 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check"></i>
                      <span>บันทึกบัญชี</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ยืนยันการลบ */}
      {deletingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300">
          <div className="bg-slate-800 border border-rose-500/30 rounded-2.5xl p-6 w-full max-w-sm shadow-2xl scale-100 transform transition-all duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-4 text-rose-500 text-3xl border border-rose-500/20">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <h3 className="text-lg font-bold text-slate-100">ลบบัญชี 2FA นี้?</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                คุณพี่ลีดแน่ใจนะคะที่จะลบข้อมูล 2FA ของ <br />
                <strong className="text-slate-200">"{deletingAccount.issuer} ({deletingAccount.account_name})"</strong>? <br />
                หากลบแล้วจะไม่สามารถกู้คืนรหัสลับนี้ได้อีกน้าา
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeletingAccount(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl font-semibold text-slate-300 bg-slate-700 hover:bg-slate-650 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-slate-100 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>กำลังลบ...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-trash-can"></i>
                    <span>ลบเลยค่ะ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
