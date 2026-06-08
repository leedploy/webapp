'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Bookmark = {
  id: number;
  title: string;
  url: string;
  category: string;
  created_at: string;
};

type Category = {
  id: string;
  label: string;
  icon: string;
  color: string;
};

const COLOR_PRESETS = [
  { id: 'emerald', name: 'เขียว', value: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5', bgCircle: 'bg-emerald-500' },
  { id: 'sky', name: 'ฟ้า', value: 'text-sky-400 border-sky-500/30 bg-sky-500/5', bgCircle: 'bg-sky-500' },
  { id: 'rose', name: 'ชมพู', value: 'text-rose-400 border-rose-500/30 bg-rose-500/5', bgCircle: 'bg-rose-500' },
  { id: 'indigo', name: 'ม่วง', value: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/5', bgCircle: 'bg-indigo-500' },
  { id: 'amber', name: 'เหลือง', value: 'text-amber-400 border-amber-500/30 bg-amber-500/5', bgCircle: 'bg-amber-500' },
  { id: 'orange', name: 'ส้ม', value: 'text-orange-400 border-orange-500/30 bg-orange-500/5', bgCircle: 'bg-orange-500' },
  { id: 'cyan', name: 'น้ำเงิน', value: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5', bgCircle: 'bg-cyan-500' },
];

const ICON_PRESETS = [
  'fa-book-open',
  'fa-briefcase',
  'fa-gamepad',
  'fa-star',
  'fa-code',
  'fa-video',
  'fa-globe',
  'fa-ellipsis-h',
  'fa-heart',
  'fa-graduation-cap'
];

export default function LeedLink() {
  const [links, setLinks] = useState<Bookmark[]>([]);
  const [categories, setCategories] = useState<Category[]>([
    { id: 'education', label: 'ความรู้/ศึกษา', icon: 'fa-book-open', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' },
    { id: 'work', label: 'งาน', icon: 'fa-briefcase', color: 'text-sky-400 border-sky-500/30 bg-sky-500/5' },
    { id: 'entertainment', label: 'บันเทิง', icon: 'fa-gamepad', color: 'text-rose-400 border-rose-500/30 bg-rose-500/5' },
    { id: 'other', label: 'อื่นๆ', icon: 'fa-ellipsis-h', color: 'text-amber-400 border-amber-500/30 bg-amber-500/5' }
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState('education');
  const [isSaving, setIsSaving] = useState(false);

  const [editingItem, setEditingItem] = useState<Bookmark | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [isEditingSaving, setIsEditingSaving] = useState(false);

  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Category Manager Modal state
  const [showCatModal, setShowCatModal] = useState(false);
  const [catEditingId, setCatEditingId] = useState<string | null>(null);
  const [catLabel, setCatLabel] = useState('');
  const [catIcon, setCatIcon] = useState('fa-book-open');
  const [catColor, setCatColor] = useState('text-emerald-400 border-emerald-500/30 bg-emerald-500/5');
  const [isCatSaving, setIsCatSaving] = useState(false);
  const [isCatDeleting, setIsCatDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchLinks();
    fetchCategories();
  }, []);

  const fetchLinks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/links');
      const data = await res.json();
      if (!data.error) {
        setLinks(data);
      }
    } catch (err) {
      console.error("Failed to fetch links", err);
    }
    setIsLoading(false);
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (!data.error) {
        setCategories(data);
      }
    } catch (err) {
      console.error("Failed to fetch categories", err);
    }
  };

  const saveCategory = async () => {
    const label = catLabel.trim();
    if (!label) {
      alert("กรุณากรอกชื่อหมวดหมู่ด้วยนะคะ!");
      return;
    }
    setIsCatSaving(true);
    try {
      const url = '/api/categories';
      const method = catEditingId ? 'PUT' : 'POST';
      const body = catEditingId 
        ? { id: catEditingId, label, icon: catIcon, color: catColor }
        : { label, icon: catIcon, color: catColor };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        fetchCategories();
        fetchLinks();
        setCatLabel('');
        setCatEditingId(null);
        showNotification(catEditingId ? 'แก้ไขหมวดหมู่เรียบร้อยค่ะ!' : 'เพิ่มหมวดหมู่ใหม่เรียบร้อยค่ะ!');
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (err) {
      console.error("Save category failed", err);
    } finally {
      setIsCatSaving(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (id === 'other') return;
    if (!confirm('คุณพี่ลีดแน่ใจนะคะที่จะลบหมวดหมู่นี้?\nลิงก์ทั้งหมดในหมวดหมู่นี้จะถูกย้ายไปที่หมวดหมู่ "อื่นๆ" ค่ะ')) {
      return;
    }
    setIsCatDeleting(id);
    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchCategories();
        fetchLinks();
        showNotification('ลบหมวดหมู่เรียบร้อยแล้วค่ะ');
      }
    } catch (err) {
      console.error("Delete category failed", err);
    } finally {
      setIsCatDeleting(null);
    }
  };

  const startEditCategory = (cat: Category) => {
    setCatEditingId(cat.id);
    setCatLabel(cat.label);
    setCatIcon(cat.icon);
    setCatColor(cat.color);
  };

  const cancelEditCategory = () => {
    setCatEditingId(null);
    setCatLabel('');
    setCatIcon('fa-book-open');
    setCatColor('text-emerald-400 border-emerald-500/30 bg-emerald-500/5');
  };

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1500);
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      showNotification('คัดลอกลิงก์สำเร็จแล้ว!');
    });
  };

  const validateUrl = (urlStr: string) => {
    let formatted = urlStr.trim();
    if (!formatted) return '';
    if (!/^https?:\/\//i.test(formatted)) {
      formatted = 'https://' + formatted;
    }
    return formatted;
  };

  const saveLink = async () => {
    const title = newTitle.trim();
    const url = validateUrl(newUrl);
    
    if (!title || !url) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วนนะคะ!");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, url, category: newCategory })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setLinks(prev => [data.data, ...prev]);
        setNewTitle('');
        setNewUrl('');
        setNewCategory('education');
        setShowAddModal(false);
        showNotification('บันทึกลิงก์ใหม่เรียบร้อยค่ะ!');
      }
    } catch (err) {
      console.error("Save failed", err);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
    setIsSaving(false);
  };

  const startEdit = (item: Bookmark) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditUrl(item.url);
    setEditCategory(item.category);
  };

  const confirmEdit = async () => {
    if (!editingItem) return;
    const title = editTitle.trim();
    const url = validateUrl(editUrl);

    if (!title || !url) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วนนะคะ!");
      return;
    }

    setIsEditingSaving(true);
    try {
      const res = await fetch('/api/links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingItem.id, title, url, category: editCategory })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setLinks(prev => prev.map(x => x.id === editingItem.id ? data.data : x));
        setEditingItem(null);
        showNotification('แก้ไขข้อมูลเรียบร้อยค่ะ!');
      }
    } catch (err) {
      console.error("Edit failed", err);
      alert("เกิดข้อผิดพลาดในการแก้ไขข้อมูล");
    }
    setIsEditingSaving(false);
  };

  const confirmDelete = async () => {
    if (deletingItemId === null) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/links?id=${deletingItemId}`, { method: 'DELETE' });
      setLinks(prev => prev.filter(item => item.id !== deletingItemId));
      showNotification('ลบลิงก์เรียบร้อยแล้วค่ะ');
    } catch (err) {
      console.error('Delete failed', err);
      alert('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
    setIsDeleting(false);
    setDeletingItemId(null);
  };

  // Filter and Search logic
  const filteredLinks = links.filter(link => {
    const matchesCategory = selectedCategory === 'all' || link.category === selectedCategory;
    const matchesSearch = link.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          link.url.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryDetails = (catId: string) => {
    return categories.find(c => c.id === catId) || { id: 'other', label: 'อื่นๆ', icon: 'fa-ellipsis-h', color: 'text-amber-400 border-amber-500/30 bg-amber-500/5' };
  };

  const openAddModal = () => {
    setNewCategory(categories[0]?.id || 'other');
    setNewTitle('');
    setNewUrl('');
    setShowAddModal(true);
  };

  return (
    <div className="text-slate-200 min-h-screen flex flex-col justify-between w-full md:max-w-5xl lg:max-w-6xl mx-auto bg-slate-900 shadow-2xl relative transition-all duration-300">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-950/20 via-transparent to-transparent pointer-events-none"></div>

      <div className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700 sticky top-0 z-30">
        {/* Sub Header */}
        <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <Link href="/" className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 transition-colors active:scale-95 border border-slate-700" title="กลับหน้าโฮม">
              <i className="fa-solid fa-arrow-left"></i>
            </Link>
            <span className="text-sm text-indigo-400 font-bold bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              <i className="fa-solid fa-graduation-cap mr-1"></i> Library
            </span>
          </div>
          <span className="text-xs bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-slate-300 font-medium">
            ทั้งหมด {links.length} ลิงก์
          </span>
        </div>

        {/* Brand Header */}
        <header className="p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-extrabold text-indigo-400 flex items-center gap-2 drop-shadow-md">
              <i className="fa-solid fa-book-open"></i> Leed Link
            </h1>
            <span className="text-[10px] text-slate-500 font-medium tracking-wide">แหล่งรวบรวมลิงก์ความรู้</span>
          </div>

          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <i className="fa-solid fa-magnifying-glass text-xs"></i>
            </span>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="ค้นหาชื่อ หรือที่อยู่ลิงก์..."
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
              >
                <i className="fa-solid fa-circle-xmark text-xs"></i>
              </button>
            )}
          </div>
        </header>

        {/* Categories Tab slider */}
        <div className="flex items-center gap-2 px-4 pb-3">
          <div className="flex-1 flex overflow-x-auto gap-2 no-scrollbar">
            {[{ id: 'all', label: 'ทั้งหมด', icon: 'fa-layer-group', color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/5' }, ...categories].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                  selectedCategory === cat.id 
                    ? 'bg-indigo-500 text-white border-indigo-400 shadow-md shadow-indigo-500/20' 
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <i className={`fa-solid ${cat.icon}`}></i>
                {cat.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              cancelEditCategory();
              setShowCatModal(true);
            }}
            className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700/60 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50 flex items-center justify-center shrink-0 active:scale-90 transition-all cursor-pointer"
            title="จัดการหมวดหมู่"
          >
            <i className="fa-solid fa-tags text-xs"></i>
          </button>
        </div>
      </div>

      {/* Main List */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar pb-32">
        {isLoading ? (
          <div className="text-center py-16 text-slate-500">
            <i className="fa-solid fa-circle-notch fa-spin text-4xl mb-3 block text-indigo-500"></i>
            <p className="text-sm">กำลังเปิดคลังลิงก์ความรู้...</p>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="text-center py-16 text-slate-500 bg-slate-800/20 border border-slate-800/80 rounded-2xl p-6">
            <i className="fa-solid fa-book-bookmark text-4xl mb-3 block text-indigo-500/40"></i>
            <p className="text-sm font-semibold text-slate-400">ไม่พบคลิปลิงก์ในหมวดหมู่นี้</p>
            <p className="text-xs text-slate-600 mt-1">กดปุ่มสีม่วงด้านล่างเพื่อเริ่มสะสมลิงก์ความรู้ของคุณพี่ลีดได้เลยค่ะ</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLinks.map(item => {
              const catDetails = getCategoryDetails(item.category);
              return (
                <div key={item.id} className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/40 hover:border-indigo-500/30 rounded-xl p-3.5 flex flex-col gap-2.5 transition-all shadow-md group relative overflow-hidden">
                  {/* Subtle background glow on card hover */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex justify-between items-start gap-3 relative z-10">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {/* Left icon badge */}
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${catDetails.color}`}>
                        <i className={`fa-solid ${catDetails.icon} text-sm`}></i>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-100 truncate group-hover:text-indigo-400 transition-colors pr-2" title={item.title}>
                          {item.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5" title={item.url}>
                          {item.url}
                        </p>
                      </div>
                    </div>
                    {/* Badge Category */}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold tracking-wide shrink-0 ${catDetails.color}`}>
                      {catDetails.label}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-700/30 relative z-10">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleCopy(item.url)}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-all flex items-center justify-center active:scale-90"
                        title="คัดลอกลิงก์"
                      >
                        <i className="fa-regular fa-copy text-sm"></i>
                      </button>
                      <button 
                        onClick={() => startEdit(item)}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-all flex items-center justify-center active:scale-90"
                        title="แก้ไข"
                      >
                        <i className="fa-regular fa-pen-to-square text-sm"></i>
                      </button>
                      <button 
                        onClick={() => setDeletingItemId(item.id)}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all flex items-center justify-center active:scale-90"
                        title="ลบ"
                      >
                        <i className="fa-regular fa-trash-can text-sm"></i>
                      </button>
                    </div>

                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-950 bg-indigo-400 hover:bg-indigo-300 px-3.5 py-1.5 rounded-lg active:scale-95 transition-all shadow-md shadow-indigo-500/10"
                    >
                      เปิดลิงก์ <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 left-0 right-0 w-full md:max-w-5xl lg:max-w-6xl mx-auto px-4 z-20 flex justify-center pointer-events-none transition-all duration-300">
        <button 
          onClick={openAddModal}
          className="pointer-events-auto bg-indigo-500 hover:bg-indigo-600 active:scale-95 transition-all text-white font-bold px-6 py-3.5 rounded-full shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-2.5 w-full max-w-[240px]"
        >
          <i className="fa-solid fa-plus text-base"></i>
          <span className="text-base">เพิ่มลิงก์ความรู้</span>
        </button>
      </div>

      {/* Toast Notification */}
      <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-full shadow-lg text-sm pointer-events-none transition-opacity duration-300 z-50 ${showToast ? 'opacity-100' : 'opacity-0'}`}>
        <i className="fa-solid fa-circle-check mr-1.5"></i> {toastMessage}
      </div>

      {/* Modal เพิ่มลิงก์ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300">
          <div className="bg-slate-800 border-t md:border border-slate-700 rounded-t-3xl md:rounded-2xl p-6 w-full max-w-sm shadow-2xl transform transition-all duration-300 max-h-[85vh] flex flex-col">
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 md:hidden"></div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-indigo-400 flex items-center gap-2">
                <i className="fa-solid fa-plus-circle"></i>เพิ่มลิงก์ใหม่
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200 w-8 h-8 flex items-center justify-center bg-slate-900 rounded-full">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 no-scrollbar">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">ชื่อลิงก์ / หัวข้อ</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="เช่น ดิจิทัลมาร์เก็ตติ้งเบื้องต้น"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">ที่อยู่ลิงก์ (URL)</label>
                <input 
                  type="text" 
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="เช่น youtube.com/... หรือ https://..."
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-semibold">หมวดหมู่</label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNewCategory(cat.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        newCategory === cat.id 
                          ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' 
                          : 'bg-slate-900/50 border-slate-700/50 text-slate-400 hover:bg-slate-900'
                      }`}
                    >
                      <i className={`fa-solid ${cat.icon}`}></i>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700">
              <button 
                onClick={saveLink}
                disabled={isSaving || !newTitle.trim() || !newUrl.trim()}
                className="w-full py-3.5 rounded-xl font-bold bg-indigo-500 hover:bg-indigo-600 text-white transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-bookmark"></i>}
                บันทึกเข้าคลัง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal แก้ไขลิงก์ */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300">
          <div className="bg-slate-800 border-t md:border border-slate-700 rounded-t-3xl md:rounded-2xl p-6 w-full max-w-sm shadow-2xl transform transition-all duration-300 max-h-[85vh] flex flex-col">
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 md:hidden"></div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                <i className="fa-regular fa-edit"></i>แก้ไขรายละเอียดลิงก์
              </h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-200 w-8 h-8 flex items-center justify-center bg-slate-900 rounded-full">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 no-scrollbar">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">ชื่อลิงก์ / หัวข้อ</label>
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="เช่น ดิจิทัลมาร์เก็ตติ้งเบื้องต้น"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">ที่อยู่ลิงก์ (URL)</label>
                <input 
                  type="text" 
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="เช่น youtube.com/... หรือ https://..."
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-semibold">หมวดหมู่</label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setEditCategory(cat.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        editCategory === cat.id 
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400' 
                          : 'bg-slate-900/50 border-slate-700/50 text-slate-400 hover:bg-slate-900'
                      }`}
                    >
                      <i className={`fa-solid ${cat.icon}`}></i>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700">
              <button 
                onClick={confirmEdit}
                disabled={isEditingSaving || !editTitle.trim() || !editUrl.trim()}
                className="w-full py-3.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isEditingSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                บันทึกการเปลี่ยนแปลง
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
              <h3 className="text-xl font-bold text-slate-100 mb-2">ลบลิงก์นี้?</h3>
              <p className="text-slate-400 text-sm mb-6">คุณพี่ลีดแน่ใจนะคะที่จะลบลิงก์ความรู้นี้?<br/>ลบแล้วกู้คืนไม่ได้น้าา</p>
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

      {/* Modal จัดการหมวดหมู่ */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300">
          <div className="bg-slate-800 border-t md:border border-slate-700 rounded-t-3xl md:rounded-2xl p-6 w-full max-w-md shadow-2xl transform transition-all duration-300 max-h-[85vh] flex flex-col">
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4 md:hidden"></div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-indigo-400 flex items-center gap-2">
                <i className="fa-solid fa-tags"></i>จัดการหมวดหมู่
              </h3>
              <button 
                onClick={() => setShowCatModal(false)} 
                className="text-slate-400 hover:text-slate-200 w-8 h-8 flex items-center justify-center bg-slate-900 rounded-full"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 pr-1 no-scrollbar">
              {/* Form Add/Edit Category */}
              <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-4 space-y-4">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  {catEditingId ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}
                </h4>
                
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-semibold">ชื่อหมวดหมู่</label>
                  <input 
                    type="text" 
                    value={catLabel}
                    onChange={(e) => setCatLabel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="เช่น การลงทุน, สุขภาพ"
                  />
                </div>

                {/* Color Preset Picker */}
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1.5 font-semibold">สีของหมวดหมู่</label>
                  <div className="flex flex-wrap gap-2.5">
                    {COLOR_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setCatColor(preset.value)}
                        className={`w-7 h-7 rounded-full ${preset.bgCircle} flex items-center justify-center border-2 transition-all active:scale-90 ${
                          catColor === preset.value ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                        title={preset.name}
                      >
                        {catColor === preset.value && <i className="fa-solid fa-check text-[10px] text-slate-950"></i>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icon Preset Picker */}
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1.5 font-semibold">ไอคอน</label>
                  <div className="grid grid-cols-5 gap-2">
                    {ICON_PRESETS.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setCatIcon(icon)}
                        className={`py-2 rounded-lg border text-sm flex items-center justify-center transition-all active:scale-90 ${
                          catIcon === icon 
                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400 font-bold' 
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <i className={`fa-solid ${icon}`}></i>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons for Form */}
                <div className="flex gap-2 pt-2">
                  {catEditingId && (
                    <button
                      type="button"
                      onClick={cancelEditCategory}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-all active:scale-95"
                    >
                      ยกเลิก
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={saveCategory}
                    disabled={isCatSaving || !catLabel.trim()}
                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50 transition-all flex justify-center items-center gap-1.5 active:scale-95"
                  >
                    {isCatSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                    {catEditingId ? 'บันทึกการแก้ไข' : 'บันทึกหมวดหมู่'}
                  </button>
                </div>
              </div>

              {/* Categories List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">หมวดหมู่ทั้งหมด</h4>
                <div className="space-y-1.5 max-h-[25vh] overflow-y-auto pr-1 no-scrollbar">
                  {categories.map(cat => (
                    <div 
                      key={cat.id} 
                      className="flex justify-between items-center bg-slate-900/40 border border-slate-700/30 rounded-xl px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs ${cat.color}`}>
                          <i className={`fa-solid ${cat.icon}`}></i>
                        </span>
                        <span className="text-xs text-slate-200 font-bold">{cat.label}</span>
                      </div>
                      
                      {/* Hide edit/delete actions for 'other' fallback */}
                      {cat.id !== 'other' ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditCategory(cat)}
                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-all flex items-center justify-center active:scale-90"
                            title="แก้ไขหมวดหมู่"
                          >
                            <i className="fa-regular fa-edit text-xs"></i>
                          </button>
                          <button
                            onClick={() => deleteCategory(cat.id)}
                            disabled={isCatDeleting === cat.id}
                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all flex items-center justify-center active:scale-90"
                            title="ลบหมวดหมู่"
                          >
                            {isCatDeleting === cat.id ? <i className="fa-solid fa-spinner fa-spin text-xs"></i> : <i className="fa-regular fa-trash-can text-xs"></i>}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-medium italic px-2">ระบบ</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
