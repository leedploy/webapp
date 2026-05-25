'use client';

import { useState, useEffect } from 'react';
import { ReactSortable } from 'react-sortablejs';

type TextItem = {
  id: number;
  content: string;
  created_at: string;
  sort_order: number;
  score?: number;
};

export default function Home() {
  const [currentTab, setCurrentTab] = useState<'general' | 'account'>('general');
  const [sortMode, setSortMode] = useState<'manual' | 'score'>('manual');
  const [currentProfile, setCurrentProfile] = useState<string>('Grok imagine');
  const [profilesList, setProfilesList] = useState<string[]>(['Grok imagine']);
  const [dataStore, setDataStore] = useState<Record<string, { general: TextItem[]; account: TextItem[] }>>({ 'Grok imagine': { general: [], account: [] } });
  const [profileSettings, setProfileSettings] = useState<Record<string, { hasAccount: boolean }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  
  // State สำหรับ Modal แก้ไขข้อความ
  const [editingItem, setEditingItem] = useState<TextItem | null>(null);
  const [editText, setEditText] = useState('');
  const [editScore, setEditScore] = useState(0);
  const [isEditingSaving, setIsEditingSaving] = useState(false);

  // State สำหรับ Modal ลบข้อความ
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State สำหรับ Modal สร้างโปรไฟล์
  const [showNewProfileModal, setShowNewProfileModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileHasAccount, setNewProfileHasAccount] = useState(true);

  // State สำหรับจัดการโปรไฟล์ (Manage Profiles)
  const [showManageProfilesModal, setShowManageProfilesModal] = useState(false);
  
  // State สำหรับเปลี่ยนชื่อโปรไฟล์
  const [showRenameProfileModal, setShowRenameProfileModal] = useState(false);
  const [renamingProfile, setRenamingProfile] = useState('');
  const [newProfileNameRename, setNewProfileNameRename] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // State สำหรับลบโปรไฟล์
  const [showDeleteProfileModal, setShowDeleteProfileModal] = useState(false);
  const [deletingProfileName, setDeletingProfileName] = useState('');
  const [deleteProfilePassword, setDeleteProfilePassword] = useState('');
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);

  // State สำหรับ Modal เลือกโปรไฟล์
  const [showProfileSelectorModal, setShowProfileSelectorModal] = useState(false);

  // State สำหรับ Modal เพิ่มบันทึกใหม่
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem('profileSettings');
    if (savedSettings) {
      try {
        setProfileSettings(JSON.parse(savedSettings));
      } catch (e) {}
    }
    fetchTexts();
  }, []);

  const fetchTexts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/store');
      const data = await res.json();
      if (!data.error) {
        if (!data['Grok imagine']) {
          data['Grok imagine'] = { general: [], account: [] };
        }
        setDataStore(data);
        setProfilesList(Object.keys(data));
      }
    } catch (err) {
      console.error("Failed to fetch texts", err);
    }
    setIsLoading(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);
    });
  };

  const handleDelete = (id: number) => {
    setDeletingItemId(id);
  };

  const confirmDelete = async () => {
    if (deletingItemId === null) return;
    
    setIsDeleting(true);
    
    // Optimistic UI update
    setDataStore(prev => ({
      ...prev,
      [currentProfile]: {
        ...prev[currentProfile],
        [currentTab]: prev[currentProfile][currentTab].filter(item => item.id !== deletingItemId)
      }
    }));
    
    try {
      await fetch(`/api/store?id=${deletingItemId}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Delete failed', e);
      fetchTexts(); // คืนค่าถ้าลบไม่สำเร็จ
    }
    
    setIsDeleting(false);
    setDeletingItemId(null);
  };

  const handleCreateProfile = () => {
    const name = newProfileName.trim();
    if (!name) return;
    
    const newSettings = { ...profileSettings, [name]: { hasAccount: newProfileHasAccount } };
    setProfileSettings(newSettings);
    localStorage.setItem('profileSettings', JSON.stringify(newSettings));
    
    if (!profilesList.includes(name)) {
      setProfilesList(prev => [...prev, name]);
      setDataStore(prev => ({ ...prev, [name]: { general: [], account: [] } }));
    }
    setCurrentProfile(name);
    if (!newProfileHasAccount && currentTab === 'account') {
      setCurrentTab('general');
    }
    setShowNewProfileModal(false);
  };

  const handleRenameProfile = async () => {
    const newName = newProfileNameRename.trim();
    if (!newName || newName === renamingProfile || profilesList.includes(newName)) return;
    
    setIsRenaming(true);
    try {
      await fetch('/api/store', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename_profile', oldName: renamingProfile, newName })
      });
      
      setProfilesList(prev => prev.map(p => p === renamingProfile ? newName : p));
      if (currentProfile === renamingProfile) {
        setCurrentProfile(newName);
      }
      setDataStore(prev => {
        const newData = { ...prev };
        newData[newName] = newData[renamingProfile] || { general: [], account: [] };
        delete newData[renamingProfile];
        return newData;
      });
      
      const newSettings = { ...profileSettings };
      if (newSettings[renamingProfile]) {
        newSettings[newName] = newSettings[renamingProfile];
        delete newSettings[renamingProfile];
        setProfileSettings(newSettings);
        localStorage.setItem('profileSettings', JSON.stringify(newSettings));
      }
      
      setShowRenameProfileModal(false);
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการเปลี่ยนชื่อ');
    }
    setIsRenaming(false);
  };

  const handleDeleteProfile = async () => {
    if (deleteProfilePassword !== '018664499') {
      alert('รหัสผ่านไม่ถูกต้องค่ะ!');
      return;
    }
    setIsDeletingProfile(true);
    try {
      await fetch(`/api/store?profile=${encodeURIComponent(deletingProfileName)}`, { method: 'DELETE' });
      
      const remaining = profilesList.filter(p => p !== deletingProfileName);
      setProfilesList(remaining);
      
      if (currentProfile === deletingProfileName) {
        setCurrentProfile(remaining.length > 0 ? remaining[0] : '');
        setCurrentTab('general'); // Reset tab just in case
      }
      
      setDataStore(prev => {
        const newData = { ...prev };
        delete newData[deletingProfileName];
        return newData;
      });
      
      const newSettings = { ...profileSettings };
      delete newSettings[deletingProfileName];
      setProfileSettings(newSettings);
      localStorage.setItem('profileSettings', JSON.stringify(newSettings));
      
      setShowDeleteProfileModal(false);
      setDeleteProfilePassword('');
      if (remaining.length === 0) setShowManageProfilesModal(false);
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการลบโปรไฟล์');
    }
    setIsDeletingProfile(false);
  };

  const handleEdit = (item: TextItem) => {
    setEditingItem(item);
    setEditText(item.content);
    setEditScore(item.score || 0);
  };

  const confirmEdit = async () => {
    if (!editingItem) return;
    const trimmedText = editText.trim();
    
    if (trimmedText === '' && trimmedText !== editingItem.content) {
      // If it's empty but original wasn't, wait it shouldn't allow empty. But if they just changed score, we should save.
      // Wait, original check was `trimmedText === '' || trimmedText === editingItem.content`.
      // I'll update it to check both text and score.
    }
    
    if (trimmedText === '' || (trimmedText === editingItem.content && editScore === (editingItem.score || 0))) {
      setEditingItem(null);
      return;
    }

    setIsEditingSaving(true);
    
    // Optimistic UI update
    setDataStore(prev => ({
      ...prev,
      [currentProfile]: {
        ...prev[currentProfile],
        [currentTab]: prev[currentProfile][currentTab].map(x => x.id === editingItem.id ? { ...x, content: trimmedText, score: editScore } : x)
      }
    }));

    try {
      const res = await fetch('/api/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingItem.id, content: trimmedText, score: editScore })
      });
      const data = await res.json();
      if (!data.success) throw new Error('Update failed');
    } catch (e) {
      console.error('Edit failed', e);
      alert("เกิดข้อผิดพลาดในการแก้ไขข้อมูล");
      fetchTexts(); // คืนค่าเดิมถ้าล้มเหลว
    }
    
    setIsEditingSaving(false);
    setEditingItem(null);
  };

  const saveText = async () => {
    const val = inputText.trim();
    if (!val) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: currentTab, content: val, profile: currentProfile })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setDataStore(prev => {
          const profData = prev[currentProfile] || { general: [], account: [] };
          return {
            ...prev,
            [currentProfile]: {
              ...profData,
              [currentTab]: [data.data, ...(profData[currentTab] || [])]
            }
          };
        });
        setInputText('');
        setShowAddNoteModal(false);
      }
    } catch (err) {
      console.error("Save failed", err);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่");
    }
    setIsSaving(false);
  };

  const handleSort = async (newState: TextItem[]) => {
    // อัปเดต State ให้ UI ขยับตาม
    setDataStore(prev => ({ 
      ...prev, 
      [currentProfile]: {
        ...prev[currentProfile],
        [currentTab]: newState
      }
    }));
    
    // สร้าง Array ของลำดับใหม่
    const updates = newState.map((item, index) => ({
      id: item.id,
      sort_order: index
    }));

    try {
      await fetch('/api/store', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (e) {
      console.error('Save order failed', e);
      alert("อัปเดตลำดับลงฐานข้อมูลล้มเหลว กรุณาลองใหม่");
      fetchTexts();
    }
  };

  const currentList = dataStore[currentProfile]?.[currentTab] || [];
  
  const displayList = [...currentList].sort((a, b) => {
    if (sortMode === 'score') {
      return (b.score || 0) - (a.score || 0);
    }
    return 0; // manual order is preserved
  });

  return (
    <div className="text-slate-200 min-h-screen flex flex-col justify-between w-full md:max-w-3xl mx-auto bg-slate-900 shadow-2xl relative">
      <div className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700 sticky top-0 z-30">
        <div className="bg-slate-900 px-4 py-2 flex items-center justify-between border-b border-slate-700/50">
          <button 
            onClick={() => setShowManageProfilesModal(true)}
            className="flex items-center text-sm text-sky-400 font-bold hover:text-sky-300 transition-colors active:scale-95 bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-700/50"
            title="จัดการโปรไฟล์"
          >
            <i className="fa-solid fa-user-circle mr-2"></i> โปรไฟล์ <i className="fa-solid fa-gear ml-1.5 text-[10px] opacity-70"></i>
          </button>
          <button 
            onClick={() => setShowProfileSelectorModal(true)}
            className="bg-slate-800 text-sky-400 text-sm font-bold border border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:border-sky-500 cursor-pointer flex items-center gap-2 hover:bg-slate-700 transition-colors active:scale-95"
          >
            <span className="truncate max-w-[120px]">{currentProfile}</span>
            <i className="fa-solid fa-chevron-down text-[10px]"></i>
          </button>
        </div>
        <header className="p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-sky-400">
            <i className="fa-solid fa-box-archive mr-2"></i>คลังบันทึกข้อความ
          </h1>
          <div className="flex items-center gap-2">
            <select 
              value={sortMode} 
              onChange={(e) => setSortMode(e.target.value as 'manual' | 'score')}
              className="bg-slate-900 text-xs text-slate-300 border border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="manual">เรียงตามลากวาง</option>
              <option value="score">เรียงตามคะแนน</option>
            </select>
            <span className="text-xs bg-slate-700 px-2.5 py-1.5 rounded-lg text-slate-300 font-medium whitespace-nowrap">
              {currentList.length} รายการ
            </span>
          </div>
        </header>

        <div className="flex border-t border-slate-700/60 text-center font-medium text-sm">
          <button 
            onClick={() => setCurrentTab('general')} 
            className={`flex-1 py-3 border-b-2 transition-all ${currentTab === 'general' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <i className="fa-regular fa-file-lines mr-1.5"></i>บันทึกทั่วไป
          </button>
          {profileSettings[currentProfile]?.hasAccount !== false && (
            <button 
              onClick={() => setCurrentTab('account')} 
              className={`flex-1 py-3 border-b-2 transition-all ${currentTab === 'account' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              <i className="fa-solid fa-wallet mr-1.5"></i>บัญชี
            </button>
          )}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar pb-32">
        {isLoading ? (
          <div className="text-center py-12 text-slate-500">
            <i className="fa-solid fa-circle-notch fa-spin text-4xl mb-3 block text-sky-500"></i>
            <p className="text-sm">กำลังเชื่อมต่อฐานข้อมูล...</p>
          </div>
        ) : currentList.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <i className="fa-regular fa-clipboard text-4xl mb-3 block"></i>
            <p className="text-sm">ไม่มีข้อมูลในแท็บนี้ค่ะ</p>
          </div>
        ) : (
          <ReactSortable 
            list={displayList} 
            setList={sortMode === 'manual' ? handleSort : () => {}} // ป้องกันการเซฟตำแหน่งถ้าไม่ได้อยู่โหมด manual
            disabled={sortMode === 'score'}
            handle=".drag-handle"
            animation={150}
            delay={200}
            delayOnTouchOnly={true}
            className="space-y-3"
          >
            {displayList.map(item => (
              <div key={item.id} className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 flex justify-between items-start gap-4 shadow-md relative">
                <div className="flex items-start flex-1 min-w-0">
                  {sortMode === 'manual' && (
                    <div className="drag-handle p-1 mr-2 mt-0.5 text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing" title="กดค้างเพื่อลากจัดเรียง">
                      <i className="fa-solid fa-grip-vertical"></i>
                    </div>
                  )}
                  <div className={`flex-1 break-words pr-2 text-base text-slate-100 select-text relative ${sortMode !== 'manual' ? 'pl-2' : ''}`}>
                    {item.content}
                    {(item.score !== undefined && item.score !== 0) && (
                      <div className="inline-flex items-center ml-2 text-xs font-medium bg-slate-900/80 px-2 py-0.5 rounded-full text-rose-400 border border-slate-700">
                        <i className="fa-solid fa-heart mr-1 text-[10px]"></i>
                        {item.score}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 items-center shrink-0 z-10 relative">
                  <button onClick={() => handleCopy(item.content)} className="p-2.5 text-sky-400 hover:text-sky-300 active:scale-90 transition-all bg-slate-900 rounded-lg" title="คัดลอก">
                    <i className="fa-regular fa-copy text-lg"></i>
                  </button>
                  <button onClick={() => handleEdit(item)} className="p-2.5 text-amber-400 hover:text-amber-300 active:scale-90 transition-all bg-slate-900 rounded-lg" title="แก้ไข">
                    <i className="fa-regular fa-pen-to-square text-sm"></i>
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2.5 text-slate-500 hover:text-rose-400 active:scale-90 transition-all" title="ลบ">
                    <i className="fa-regular fa-trash-can text-sm"></i>
                  </button>
                </div>
              </div>
            ))}
          </ReactSortable>
        )}
      </main>

      <div className="fixed bottom-6 left-0 right-0 w-full md:max-w-3xl mx-auto px-4 z-20 flex justify-center pointer-events-none">
        <button 
          onClick={() => setShowAddNoteModal(true)}
          className="pointer-events-auto bg-sky-500 hover:bg-sky-600 active:scale-95 transition-all text-slate-950 font-bold px-6 py-4 rounded-full shadow-xl shadow-sky-500/20 flex items-center justify-center gap-3 w-full max-w-[250px]"
        >
          <i className="fa-solid fa-pen-nib text-xl"></i>
          <span className="text-lg">เพิ่มข้อความใหม่</span>
        </button>
      </div>

      <div className={`fixed top-28 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-full shadow-lg text-sm pointer-events-none transition-opacity duration-300 z-50 ${showToast ? 'opacity-100' : 'opacity-0'}`}>
        <i className="fa-solid fa-circle-check mr-1"></i> คัดลอกแล้ว!
      </div>

      {/* Modal แก้ไขข้อความ */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 w-full max-w-sm shadow-2xl scale-100 transform transition-all duration-300">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-sky-400 flex items-center">
                <i className="fa-regular fa-pen-to-square mr-2"></i>แก้ไขข้อความ
              </h3>
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
                <button 
                  onClick={() => setEditScore(s => s - 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-800 text-slate-400 hover:text-rose-400 active:scale-90 transition-all"
                  title="ลดคะแนน"
                >
                  <i className="fa-solid fa-heart-crack text-sm"></i>
                </button>
                <span className="w-6 text-center text-sm font-bold text-slate-300">{editScore}</span>
                <button 
                  onClick={() => setEditScore(s => s + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-800 text-slate-400 hover:text-rose-500 active:scale-90 transition-all"
                  title="เพิ่มคะแนน"
                >
                  <i className="fa-solid fa-heart text-sm"></i>
                </button>
              </div>
            </div>
            <textarea 
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              disabled={isEditingSaving}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 min-h-[120px] resize-y text-base"
              placeholder="พิมพ์ข้อความที่ต้องการแก้ไข..."
            />
            <div className="flex gap-3 mt-4">
              <button 
                onClick={() => setEditingItem(null)}
                disabled={isEditingSaving}
                className="flex-1 py-3 rounded-xl font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmEdit}
                disabled={isEditingSaving || !editText.trim()}
                className="flex-1 py-3 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isEditingSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ยืนยันการลบ */}
      {deletingItemId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300">
          <div className="bg-slate-800 border border-rose-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl scale-100 transform transition-all duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-4 text-rose-500 text-3xl">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-2">ลบข้อความนี้?</h3>
              <p className="text-slate-400 text-sm mb-6">คุณพี่ลีดแน่ใจนะคะที่จะลบข้อความนี้?<br/>ลบแล้วกู้คืนไม่ได้น้าา</p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setDeletingItemId(null)}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-slate-100 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isDeleting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-trash-can"></i>}
                ลบเลย
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal เพิ่มโปรไฟล์ใหม่ */}
      {showNewProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl scale-100 transform transition-all duration-300">
            <h3 className="text-xl font-bold text-sky-400 mb-4 flex items-center">
              <i className="fa-solid fa-user-plus mr-2"></i>สร้างโปรไฟล์ใหม่
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-slate-400 mb-1">ชื่อโปรไฟล์</label>
                <input 
                  type="text" 
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  autoFocus
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-sky-500 text-base"
                  placeholder="เช่น สายงาน, ไอเดียแต่งนิยาย..."
                />
              </div>
              
              <label className="flex items-center gap-3 p-3 border border-slate-700 rounded-xl bg-slate-900/50 cursor-pointer hover:bg-slate-900 transition-colors">
                <div className="relative flex items-center">
                  <input 
                    type="checkbox" 
                    checked={newProfileHasAccount}
                    onChange={(e) => setNewProfileHasAccount(e.target.checked)}
                    className="peer w-5 h-5 appearance-none rounded border border-slate-600 checked:bg-sky-500 checked:border-sky-500 transition-all"
                  />
                  <i className="fa-solid fa-check absolute inset-0 text-slate-900 text-xs flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></i>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-200">เปิดใช้งานแท็บ "บัญชี"</span>
                  <span className="text-xs text-slate-500">สำหรับบันทึกเลขบัญชีหรือข้อมูลสำคัญ</span>
                </div>
              </label>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowNewProfileModal(false)}
                className="flex-1 py-3 rounded-xl font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleCreateProfile}
                disabled={!newProfileName.trim()}
                className="flex-1 py-3 rounded-xl font-bold bg-sky-500 hover:bg-sky-600 text-slate-950 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                <i className="fa-solid fa-plus"></i> สร้างเลย
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal จัดการโปรไฟล์ (Manage Profiles) */}
      {showManageProfilesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl scale-100 transform transition-all duration-300 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-sky-400 flex items-center">
                <i className="fa-solid fa-users-gear mr-2"></i>จัดการโปรไฟล์
              </h3>
              <button onClick={() => setShowManageProfilesModal(false)} className="text-slate-400 hover:text-slate-200 p-2">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
              {profilesList.map(p => (
                <div key={p} className="flex justify-between items-center bg-slate-900 border border-slate-700/50 rounded-xl p-3">
                  <span className="text-slate-200 font-medium truncate flex-1 pr-2">{p}</span>
                  <div className="flex gap-1 shrink-0">
                    <button 
                      onClick={() => {
                        setRenamingProfile(p);
                        setNewProfileNameRename(p);
                        setShowRenameProfileModal(true);
                      }}
                      className="p-2 text-amber-400 hover:text-amber-300 bg-slate-800 rounded-lg active:scale-95 transition-all"
                      title="เปลี่ยนชื่อ"
                    >
                      <i className="fa-regular fa-pen-to-square text-sm"></i>
                    </button>
                    <button 
                      onClick={() => {
                        setDeletingProfileName(p);
                        setDeleteProfilePassword('');
                        setShowDeleteProfileModal(true);
                      }}
                      className="p-2 text-slate-500 hover:text-rose-400 bg-slate-800 rounded-lg active:scale-95 transition-all"
                      title="ลบโปรไฟล์"
                    >
                      <i className="fa-regular fa-trash-can text-sm"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal เปลี่ยนชื่อโปรไฟล์ */}
      {showRenameProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl scale-100 transform transition-all duration-300">
            <h3 className="text-xl font-bold text-amber-400 mb-4 flex items-center">
              <i className="fa-solid fa-pen-nib mr-2"></i>เปลี่ยนชื่อโปรไฟล์
            </h3>
            
            <div className="mb-6">
              <input 
                type="text" 
                value={newProfileNameRename}
                onChange={(e) => setNewProfileNameRename(e.target.value)}
                autoFocus
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-amber-500 text-base"
                placeholder="ชื่อใหม่..."
              />
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowRenameProfileModal(false)}
                disabled={isRenaming}
                className="flex-1 py-3 rounded-xl font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleRenameProfile}
                disabled={isRenaming || !newProfileNameRename.trim() || newProfileNameRename === renamingProfile}
                className="flex-1 py-3 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isRenaming ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>} บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ลบโปรไฟล์ */}
      {showDeleteProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300">
          <div className="bg-slate-800 border border-rose-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl scale-100 transform transition-all duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-4 text-rose-500 text-3xl">
                <i className="fa-solid fa-skull-crossbones"></i>
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-2">ลบโปรไฟล์ {deletingProfileName}?</h3>
              <p className="text-slate-400 text-sm mb-4">ข้อมูลทั้งหมดในโปรไฟล์นี้จะหายไปตลอดกาล<br/>กรุณาใส่รหัสผ่านเพื่อยืนยัน</p>
            </div>
            
            <div className="mb-6">
              <input 
                type="password" 
                value={deleteProfilePassword}
                onChange={(e) => setDeleteProfilePassword(e.target.value)}
                autoFocus
                className="w-full bg-slate-900 border border-rose-500/50 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-rose-500 text-base text-center tracking-widest"
                placeholder="รหัสผ่านยืนยัน"
              />
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteProfileModal(false)}
                disabled={isDeletingProfile}
                className="flex-1 py-3 rounded-xl font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleDeleteProfile}
                disabled={isDeletingProfile || !deleteProfilePassword}
                className="flex-1 py-3 rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-slate-100 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isDeletingProfile ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-trash-can"></i>} ลบถาวร
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal เลือกโปรไฟล์ (แทน Select แบบเดิม) */}
      {showProfileSelectorModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300">
          <div className="bg-slate-800 border-t md:border border-slate-700 rounded-t-3xl md:rounded-2xl p-6 w-full max-w-sm shadow-2xl transform transition-all duration-300 max-h-[80vh] flex flex-col">
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 md:hidden"></div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-sky-400 flex items-center">
                <i className="fa-solid fa-user-circle mr-2"></i>เลือกโปรไฟล์
              </h3>
              <button onClick={() => setShowProfileSelectorModal(false)} className="text-slate-400 hover:text-slate-200 w-8 h-8 flex items-center justify-center bg-slate-900 rounded-full">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar py-2">
              {profilesList.map(p => (
                <button 
                  key={p} 
                  onClick={() => {
                    setCurrentProfile(p);
                    const hasAccount = profileSettings[p]?.hasAccount !== false;
                    if (!hasAccount && currentTab === 'account') {
                      setCurrentTab('general');
                    }
                    setShowProfileSelectorModal(false);
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all active:scale-95 ${currentProfile === p ? 'bg-sky-500/10 border-sky-500/50 text-sky-400' : 'bg-slate-900 border-slate-700/50 text-slate-200 hover:bg-slate-800'}`}
                >
                  <span className="font-bold truncate">{p}</span>
                  {currentProfile === p && <i className="fa-solid fa-circle-check text-lg"></i>}
                </button>
              ))}
              
              <button 
                onClick={() => {
                  setShowProfileSelectorModal(false);
                  setShowNewProfileModal(true);
                  setNewProfileName('');
                  setNewProfileHasAccount(true);
                }}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-amber-500/50 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10 transition-all active:scale-95 font-bold mt-4"
              >
                <i className="fa-solid fa-plus"></i> เพิ่มโปรไฟล์ใหม่...
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal เพิ่มบันทึกใหม่ */}
      {showAddNoteModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300">
          <div className="bg-slate-800 border-t md:border border-slate-700 rounded-t-3xl md:rounded-2xl p-6 w-full max-w-sm shadow-2xl transform transition-all duration-300 max-h-[90vh] flex flex-col">
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 md:hidden"></div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-sky-400 flex items-center">
                <i className="fa-solid fa-pen-nib mr-2"></i>เพิ่มข้อความใหม่
              </h3>
              <button onClick={() => setShowAddNoteModal(false)} className="text-slate-400 hover:text-slate-200 w-8 h-8 flex items-center justify-center bg-slate-900 rounded-full">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar py-2">
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                autoFocus
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 text-slate-100 focus:outline-none focus:border-sky-500 text-base min-h-[150px] resize-none"
                placeholder="พิมพ์หรือวางข้อความของคุณที่นี่..."
              />
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-700">
              <button 
                onClick={saveText}
                disabled={isSaving || !inputText.trim()}
                className="w-full py-4 rounded-xl font-bold bg-sky-500 hover:bg-sky-600 text-slate-950 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 text-lg"
              >
                {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
                บันทึกข้อความ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
