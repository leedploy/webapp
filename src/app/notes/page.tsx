'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // States for the current editing note values
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Modal for deleting note
  const [deletingNote, setDeletingNote] = useState<Note | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle note selection
  const handleSelectNote = (note: Note) => {
    setActiveNoteId(note.id);
    setEditorTitle(note.title);
    setEditorContent(note.content);
    setSaveStatus('idle');
  };

  // Fetch all notes
  const fetchNotes = async (selectFirst = false) => {
    try {
      const res = await fetch('/api/notes');
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
        if (selectFirst && data.length > 0 && activeNoteId === null) {
          handleSelectNote(data[0]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch notes', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Clock update on Status Bar
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
    const interval = setInterval(updateTime, 1000);
    setTimeout(() => {
      fetchNotes();
    }, 0);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced auto-save effect
  useEffect(() => {
    if (activeNoteId === null) return;

    const activeNote = notes.find(n => n.id === activeNoteId);
    // If the values in the editor match what is already stored in the state, do not trigger a save
    if (!activeNote || (activeNote.title === editorTitle && activeNote.content === editorContent)) {
      return;
    }

    setTimeout(() => setSaveStatus('saving'), 0);

    const saveTimeout = setTimeout(async () => {
      try {
        const res = await fetch('/api/notes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: activeNoteId,
            title: editorTitle.trim() || 'บันทึกไม่มีชื่อ',
            content: editorContent,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            // Update the note inside local list
            setNotes(prev =>
              prev.map(n => (n.id === activeNoteId ? data.data : n))
            );
            setSaveStatus('saved');
            // Reset to idle after a brief moment
            setTimeout(() => setSaveStatus('idle'), 1500);
          } else {
            setSaveStatus('error');
          }
        } else {
          setSaveStatus('error');
        }
      } catch (err) {
        console.error('Auto-save failed', err);
        setSaveStatus('error');
      }
    }, 1200); // 1.2s debounce

    return () => clearTimeout(saveTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorTitle, editorContent, activeNoteId]);

  // Create a new blank note
  const handleCreateNote = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setNotes(prev => [data.data, ...prev]);
          handleSelectNote(data.data);
        }
      }
    } catch (e) {
      console.error('Failed to create note', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a note
  const handleDeleteNote = async () => {
    if (!deletingNote) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/notes?id=${deletingNote.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setNotes(prev => prev.filter(n => n.id !== deletingNote.id));
        if (activeNoteId === deletingNote.id) {
          setActiveNoteId(null);
          setEditorTitle('');
          setEditorContent('');
        }
        setDeletingNote(null);
      } else {
        alert('เกิดข้อผิดพลาดในการลบโน้ต');
      }
    } catch (e) {
      console.error('Failed to delete note', e);
    } finally {
      setIsDeleting(false);
    }
  };

  // Copy all text of current note
  const handleCopyAll = () => {
    if (!editorContent) return;
    navigator.clipboard.writeText(editorContent);
    alert('คัดลอกเนื้อหาทั้งหมดลงคลิปบอร์ดแล้วค่ะ!');
  };

  // Filter notes by search query
  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistics calculation
  const charCount = editorContent.length;
  const wordCount = editorContent.trim() ? editorContent.trim().split(/\s+/).length : 0;

  return (
    <div className="text-slate-200 min-h-screen flex flex-col justify-between w-full md:max-w-5xl lg:max-w-6xl mx-auto bg-slate-900 shadow-2xl relative transition-all duration-300 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950"></div>
        <div className="absolute -top-[30%] -right-[20%] w-[70%] h-[70%] rounded-full bg-indigo-600/10 blur-[120px]"></div>
        <div className="absolute -bottom-[20%] -left-[20%] w-[60%] h-[60%] rounded-full bg-cyan-600/10 blur-[120px]"></div>
      </div>

      {/* Top Header Status Bar */}
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
            <Link
              href="/"
              className="w-8.5 h-8.5 flex items-center justify-center bg-slate-900/60 hover:bg-slate-800 rounded-full text-slate-300 border border-slate-700/60 transition-colors active:scale-95 animate-fade-in"
              title="กลับหน้าโฮม"
            >
              <i className="fa-solid fa-arrow-left"></i>
            </Link>
            <h1 className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-500 flex items-center gap-2">
              <i className="fa-solid fa-file-signature text-indigo-400"></i>
              <span>Leed Note</span>
            </h1>
          </div>

          {activeNoteId !== null && (
            <div className="flex items-center gap-2">
              {/* Auto-save Status Indicator */}
              <span className="text-xs text-slate-400 flex items-center gap-1.5 px-3 py-1 bg-slate-900/50 border border-slate-700/40 rounded-lg">
                {saveStatus === 'saving' && (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-indigo-400 text-[10px]"></i>
                    <span className="text-[10px] text-indigo-400">กำลังบันทึก...</span>
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <i className="fa-solid fa-circle-check text-emerald-400 text-[10px]"></i>
                    <span className="text-[10px] text-emerald-400">บันทึกเรียบร้อย</span>
                  </>
                )}
                {saveStatus === 'error' && (
                  <>
                    <i className="fa-solid fa-circle-exclamation text-rose-500 text-[10px]"></i>
                    <span className="text-[10px] text-rose-400">เกิดข้อผิดพลาดในการเซฟ</span>
                  </>
                )}
                {saveStatus === 'idle' && (
                  <>
                    <i className="fa-solid fa-cloud-arrow-up text-slate-500 text-[10px]"></i>
                    <span className="text-[10px] text-slate-500">เซฟบนคลาวด์แล้ว</span>
                  </>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Layout Area */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
        {/* SIDEBAR: Notes List */}
        <aside
          className={`w-full md:w-80 shrink-0 border-r border-slate-700/50 flex flex-col bg-slate-950/20 backdrop-blur-sm transition-all duration-300 ${
            activeNoteId !== null ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Action Header & Search */}
          <div className="p-4 border-b border-slate-700/40 space-y-3">
            <button
              onClick={handleCreateNote}
              className="w-full bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 active:scale-98 transition-all text-slate-950 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-indigo-500/10 cursor-pointer"
            >
              <i className="fa-solid fa-plus text-sm"></i>
              <span>สร้างบันทึกใหม่</span>
            </button>

            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                <i className="fa-solid fa-magnifying-glass text-xs"></i>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/60 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="ค้นหาเอกสาร..."
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-350"
                >
                  <i className="fa-solid fa-circle-xmark text-sm"></i>
                </button>
              )}
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 no-scrollbar">
            {isLoading ? (
              <div className="text-center py-10 text-slate-500">
                <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-indigo-400 block"></i>
                <span className="text-xs">กำลังโหลดเอกสาร...</span>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <i className="fa-regular fa-folder-open text-3xl mb-2 block"></i>
                <span className="text-xs">{searchQuery ? 'ไม่พบเอกสารที่ค้นหา' : 'ยังไม่มีบันทึกเลยค่ะ'}</span>
              </div>
            ) : (
              filteredNotes.map(note => (
                <div
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  className={`group p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                    activeNoteId === note.id
                      ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400 shadow-sm shadow-indigo-500/5'
                      : 'bg-slate-900/40 border-slate-700/40 text-slate-300 hover:bg-slate-800/40 hover:border-slate-650'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <h3 className="font-bold text-xs truncate">{note.title || 'บันทึกไม่มีชื่อ'}</h3>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      {note.content ? note.content.slice(0, 45) : 'ว่างเปล่า'}
                    </p>
                    <span className="text-[8px] text-slate-600 block mt-1">
                      {new Date(note.updated_at).toLocaleDateString('th-TH', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingNote(note);
                    }}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-2 text-slate-500 hover:text-rose-450 hover:bg-slate-950/40 rounded-lg active:scale-90 transition-all shrink-0"
                    title="ลบบันทึกนี้"
                  >
                    <i className="fa-regular fa-trash-can text-xs"></i>
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* WORKSPACE: Page Editor */}
        <main
          className={`flex-1 flex flex-col overflow-hidden transition-all ${
            activeNoteId === null ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeNoteId === null ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center bg-slate-900/10">
              <div className="w-16 h-16 bg-slate-800/30 rounded-2xl flex items-center justify-center text-slate-600 text-3xl mb-4 border border-slate-700/20">
                <i className="fa-solid fa-file-pen"></i>
              </div>
              <h3 className="font-bold text-slate-300">ยินดีต้อนรับสู่ Leed Note</h3>
              <p className="text-xs text-slate-500 mt-1.5 max-w-xs leading-relaxed">
                กรุณาเลือกบันทึกจากแถบด้านซ้าย หรือคลิกปุ่มสร้างบันทึกใหม่เพื่อเปิดหน้ากระดาษจดบันทึกของท่านค่ะ
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/10 p-4">
              {/* Editor controls bar */}
              <div className="flex justify-between items-center mb-3 shrink-0">
                <button
                  onClick={() => setActiveNoteId(null)}
                  className="md:hidden flex items-center gap-1 text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700/60 active:scale-95"
                >
                  <i className="fa-solid fa-chevron-left"></i>
                  <span>กลับไปรายการ</span>
                </button>

                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={handleCopyAll}
                    disabled={!editorContent}
                    className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 bg-slate-900/80 hover:bg-slate-800 disabled:opacity-40 border border-slate-700/50 rounded-lg px-3 py-1.5 active:scale-95 transition-all"
                    title="คัดลอกบทความทั้งหมด"
                  >
                    <i className="fa-regular fa-copy"></i>
                    <span>คัดลอกทั้งหมด</span>
                  </button>
                </div>
              </div>

              {/* Lined writing paper canvas */}
              <div className="flex-1 bg-slate-900 border border-slate-700/60 rounded-2xl shadow-xl flex flex-col p-6 overflow-hidden relative group/paper">
                {/* Decorative margin line (paper style) */}
                <div className="absolute top-0 bottom-0 left-12 w-[1px] bg-indigo-500/10 pointer-events-none"></div>

                {/* Title Input */}
                <input
                  type="text"
                  value={editorTitle}
                  onChange={(e) => setEditorTitle(e.target.value)}
                  className="w-full bg-transparent border-b border-slate-800 focus:border-indigo-500/50 text-slate-100 font-extrabold text-base md:text-lg pb-2.5 focus:outline-none placeholder-slate-600 transition-colors z-10 pl-6 shrink-0"
                  placeholder="ชื่อเอกสาร..."
                />

                {/* Content Input (Textarea with lined paper style) */}
                <textarea
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  className="flex-1 w-full bg-transparent text-slate-200 text-sm focus:outline-none resize-none pt-4 pb-2 z-10 pl-6 pr-2 no-scrollbar leading-[1.8rem] placeholder-slate-600"
                  placeholder="เริ่มพิมพ์บันทึกของคุณพี่ลีดตรงนี้ได้เลยค่ะ..."
                />

                {/* Paper footer/Statistics bar */}
                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 border-t border-slate-800/80 pt-2 shrink-0 z-10">
                  <span>
                    คำ: <strong>{wordCount}</strong> | อักษร: <strong>{charCount}</strong>
                  </span>
                  <span className="italic text-slate-600 select-none">
                    Leed Note System &bull; Autosaved
                  </span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal ยืนยันการลบโน้ต */}
      {deletingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300">
          <div className="bg-slate-800 border border-rose-500/30 rounded-2.5xl p-6 w-full max-w-sm shadow-2xl scale-100 transform transition-all duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-4 text-rose-500 text-3xl border border-rose-500/20">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <h3 className="text-lg font-bold text-slate-100">ลบเอกสารนี้?</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                คุณพี่ลีดต้องการลบเอกสาร <br />
                <strong className="text-slate-200">&ldquo;{deletingNote.title || 'บันทึกไม่มีชื่อ'}&rdquo;</strong> ใช่ไหมคะ?<br />
                ลบแล้วข้อมูลนี้จะกู้คืนไม่ได้แล้วนะคะ
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeletingNote(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl font-semibold text-slate-300 bg-slate-700 hover:bg-slate-650 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteNote}
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
                    <span>ลบเอกสาร</span>
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
