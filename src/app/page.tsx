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
  const [dataStore, setDataStore] = useState<{ general: TextItem[]; account: TextItem[] }>({ general: [], account: [] });
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

  useEffect(() => {
    fetchTexts();
  }, []);

  const fetchTexts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/store');
      const data = await res.json();
      if (!data.error) {
        setDataStore({
          general: data.general || [],
          account: data.account || []
        });
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
      [currentTab]: prev[currentTab].filter(item => item.id !== deletingItemId)
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
      [currentTab]: prev[currentTab].map(x => x.id === editingItem.id ? { ...x, content: trimmedText, score: editScore } : x)
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
        body: JSON.stringify({ category: currentTab, content: val })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setDataStore(prev => ({
          ...prev,
          [currentTab]: [data.data, ...prev[currentTab]]
        }));
        setInputText('');
      }
    } catch (err) {
      console.error("Save failed", err);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่");
    }
    setIsSaving(false);
  };

  const handleSort = async (newState: TextItem[]) => {
    // อัปเดต State ให้ UI ขยับตาม
    setDataStore(prev => ({ ...prev, [currentTab]: newState }));
    
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

  const currentList = dataStore[currentTab] || [];

  return (
    <div className="text-slate-200 min-h-screen flex flex-col justify-between max-w-md mx-auto bg-slate-900 shadow-2xl relative">
      <div className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700 sticky top-0 z-10">
        <header className="p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-sky-400">
            <i className="fa-solid fa-box-archive mr-2"></i>คลังบันทึกข้อความ
          </h1>
          <span className="text-xs bg-slate-700 px-2.5 py-1 rounded-full text-slate-400">
            {currentList.length} รายการ
          </span>
        </header>

        <div className="flex border-t border-slate-700/60 text-center font-medium text-sm">
          <button 
            onClick={() => setCurrentTab('general')} 
            className={`flex-1 py-3 border-b-2 transition-all ${currentTab === 'general' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <i className="fa-regular fa-file-lines mr-1.5"></i>บันทึกทั่วไป
          </button>
          <button 
            onClick={() => setCurrentTab('account')} 
            className={`flex-1 py-3 border-b-2 transition-all ${currentTab === 'account' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <i className="fa-solid fa-wallet mr-1.5"></i>บัญชี
          </button>
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
            list={currentList} 
            setList={handleSort}
            handle=".drag-handle"
            animation={150}
            delay={200}
            delayOnTouchOnly={true}
            className="space-y-3"
          >
            {currentList.map(item => (
              <div key={item.id} className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 flex justify-between items-start gap-3 shadow-md">
                <div className="flex items-start flex-1 min-w-0">
                  <div className="drag-handle p-1 mr-2 mt-0.5 text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing" title="กดค้างเพื่อลากจัดเรียง">
                    <i className="fa-solid fa-grip-vertical"></i>
                  </div>
                  <div className="flex-1 break-words pr-2 text-base text-slate-100 select-all relative">
                    {item.content}
                    {(item.score !== undefined && item.score !== 0) && (
                      <div className="inline-flex items-center ml-2 text-xs font-medium bg-slate-900/80 px-2 py-0.5 rounded-full text-rose-400 border border-slate-700">
                        <i className="fa-solid fa-heart mr-1 text-[10px]"></i>
                        {item.score}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 items-center shrink-0">
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

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-800/95 backdrop-blur-md border-t border-slate-700 p-4 pb-6 z-20">
        <div className="flex gap-2">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveText()}
            disabled={isSaving}
            placeholder="พิมพ์หรือวางข้อความที่นี่..." 
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-base disabled:opacity-50"
          />
          <button 
            onClick={saveText} 
            disabled={isSaving || !inputText.trim()}
            className="bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all text-slate-950 font-bold px-5 rounded-xl flex items-center justify-center text-lg"
          >
            {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
          </button>
        </div>
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
    </div>
  );
}
