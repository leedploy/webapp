'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Note {
  id: number;
  title: string;
  content: string;
  is_favorite: boolean;
  score: number;
  deleted_at?: string | null;
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

  // States for Trash Bin
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [trashedNotes, setTrashedNotes] = useState<Note[]>([]);
  const [confirmPasswordNote, setConfirmPasswordNote] = useState<Note | null>(null);
  const [isEmptyAllConfirmOpen, setIsEmptyAllConfirmOpen] = useState(false);
  const [verifyPasswordInput, setVerifyPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isProcessingTrash, setIsProcessingTrash] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const loadedNoteIdRef = useRef<number | null>(null);

  // Synchronize contentEditable content when active note changes
  useEffect(() => {
    if (activeNoteId !== null && editorRef.current) {
      if (loadedNoteIdRef.current !== activeNoteId) {
        const activeNote = notes.find(n => n.id === activeNoteId);
        if (activeNote) {
          editorRef.current.innerHTML = activeNote.content;
          loadedNoteIdRef.current = activeNoteId;
        }
      }
    } else if (activeNoteId === null) {
      loadedNoteIdRef.current = null;
    }
  }, [activeNoteId, notes]);

  // Handle note selection
  const handleSelectNote = (note: Note) => {
    setActiveNoteId(note.id);
    setEditorTitle(note.title);
    setEditorContent(note.content);
    setSaveStatus('idle');
  };

  // Fetch trashed notes
  const fetchTrashedNotes = async () => {
    try {
      const res = await fetch('/api/notes?trash=true');
      if (res.ok) {
        const data = await res.json();
        setTrashedNotes(data);
      }
    } catch (e) {
      console.error('Failed to fetch trashed notes', e);
    }
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
      fetchTrashedNotes();
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

  // Update heart score (priority)
  const handleUpdateScore = async (noteId: number, nextScore: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    if (nextScore < 0) return;

    // Optimistically update UI
    setNotes(prev =>
      prev.map(note =>
        note.id === noteId ? { ...note, score: nextScore } : note
      ).sort((a, b) => {
        const scoreA = a.score || 0;
        const scoreB = b.score || 0;
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      })
    );

    try {
      const res = await fetch('/api/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: noteId,
          score: nextScore,
        }),
      });

      if (!res.ok) {
        // Rollback state if failed
        const response = await fetch('/api/notes');
        if (response.ok) {
          const data = await response.json();
          setNotes(data);
        }
        alert('เกิดข้อผิดพลาดในการตั้งค่าคะแนนหัวใจ');
      }
    } catch (err) {
      console.error('Failed to update score:', err);
      // Rollback
      const response = await fetch('/api/notes');
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      }
    }
  };

  // Helper to extract clean plain text from HTML
  const getPlainText = (html: string) => {
    if (typeof window === 'undefined') return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.innerText || tempDiv.textContent || '';
  };

  // Restore note from trash
  const handleRestoreNote = async (noteId: number) => {
    try {
      const res = await fetch('/api/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: noteId,
          restore: true,
        }),
      });

      if (res.ok) {
        fetchNotes();
      } else {
        alert('เกิดข้อผิดพลาดในการกู้คืนเอกสาร');
      }
    } catch (e) {
      console.error('Failed to restore note', e);
    }
  };

  // Permanently delete a note (Requires password verification)
  const handlePermanentDeleteNote = async (noteId: number) => {
    if (!verifyPasswordInput) {
      setPasswordError('กรุณากรอกรหัสผ่าน');
      return;
    }

    setIsProcessingTrash(true);
    setPasswordError('');

    try {
      const res = await fetch('/api/notes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: noteId,
          password: verifyPasswordInput,
          permanent: true,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setVerifyPasswordInput('');
        setConfirmPasswordNote(null);
        fetchNotes();
      } else {
        setPasswordError(data.error || 'เกิดข้อผิดพลาดในการลบเอกสาร');
      }
    } catch (e) {
      console.error('Failed to permanently delete note', e);
      setPasswordError('เกิดข้อผิดพลาดในการสื่อสารกับเซิร์ฟเวอร์');
    } finally {
      setIsProcessingTrash(false);
    }
  };

  // Permanently delete all trashed notes (Requires password verification)
  const handleEmptyTrash = async () => {
    if (!verifyPasswordInput) {
      setPasswordError('กรุณากรอกรหัสผ่าน');
      return;
    }

    setIsProcessingTrash(true);
    setPasswordError('');

    try {
      const res = await fetch('/api/notes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: verifyPasswordInput,
          emptyAll: true,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setVerifyPasswordInput('');
        setIsEmptyAllConfirmOpen(false);
        fetchNotes();
      } else {
        setPasswordError(data.error || 'เกิดข้อผิดพลาดในการล้างถังขยะ');
      }
    } catch (e) {
      console.error('Failed to empty trash', e);
      setPasswordError('เกิดข้อผิดพลาดในการสื่อสารกับเซิร์ฟเวอร์');
    } finally {
      setIsProcessingTrash(false);
    }
  };

  // Handle text input inside contentEditable
  const handleInput = () => {
    if (editorRef.current) {
      setEditorContent(editorRef.current.innerHTML);
    }
  };

  // Helper to show upload status/error
  const showUploadError = (placeholderId: string) => {
    const placeholderEl = document.getElementById(placeholderId);
    if (placeholderEl) {
      placeholderEl.className = 'text-rose-400 text-xs italic flex items-center gap-1.5 my-2 pl-6';
      placeholderEl.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> อัปโหลดรูปภาพล้มเหลว`;
      setTimeout(() => {
        placeholderEl.remove();
        if (editorRef.current) {
          setEditorContent(editorRef.current.innerHTML);
        }
      }, 3000);
    }
  };

  // Handle clipboard paste of image files, YouTube embeds, and links
  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData?.getData('text/plain');
    
    if (text) {
      const trimmedText = text.trim();
      
      // 1. Check if the pasted content is a YouTube link
      const ytRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/i;
      const ytMatch = trimmedText.match(ytRegex);

      if (ytMatch) {
        e.preventDefault();
        const videoId = ytMatch[1];

        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        const range = selection.getRangeAt(0);

        // Create container for iframe
        const container = document.createElement('div');
        container.setAttribute('contenteditable', 'false');
        container.className = 'my-4 max-w-md md:max-w-lg mx-auto aspect-video rounded-xl overflow-hidden border border-slate-700/60 shadow-lg select-all block';
        
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${videoId}`;
        iframe.className = 'w-full h-full';
        iframe.frameBorder = '0';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;

        container.appendChild(iframe);
        range.insertNode(container);

        // Add a line break after the video container to allow clean typing below it
        const br = document.createElement('br');
        range.collapse(false);
        range.insertNode(br);
        range.collapse(false);

        selection.removeAllRanges();
        selection.addRange(range);

        if (editorRef.current) {
          setEditorContent(editorRef.current.innerHTML);
        }
        return;
      }

      // 2. Check if the pasted content is a generic URL link
      if (/^https?:\/\/[^\s]+$/i.test(trimmedText)) {
        e.preventDefault();
        const url = trimmedText;
        
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        const range = selection.getRangeAt(0);

        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.className = 'text-indigo-400 underline hover:text-indigo-300 cursor-pointer';
        anchor.innerText = url;

        range.insertNode(anchor);
        
        // Add a space after the link to make it easy to continue typing
        const space = document.createTextNode('\u00A0');
        range.collapse(false);
        range.insertNode(space);
        range.collapse(false);

        selection.removeAllRanges();
        selection.addRange(range);

        if (editorRef.current) {
          setEditorContent(editorRef.current.innerHTML);
        }
        return;
      }
    }

    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault(); // Prevent direct binary pasting

        const file = item.getAsFile();
        if (!file) continue;

        // Insert placeholder at cursor location
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) continue;
        const range = selection.getRangeAt(0);

        const placeholderId = `upload-${Date.now()}`;
        const placeholder = document.createElement('span');
        placeholder.id = placeholderId;
        placeholder.className = 'text-indigo-400 text-xs italic animate-pulse flex items-center gap-1.5 my-2 pl-6 block';
        placeholder.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> กำลังอัปโหลดรูปภาพ...`;
        
        range.insertNode(placeholder);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);

        // Update state with placeholder
        if (editorRef.current) {
          setEditorContent(editorRef.current.innerHTML);
        }

        try {
          const formData = new FormData();
          formData.append('file', file);

          const res = await fetch('/api/notes/upload', {
            method: 'POST',
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.url) {
              // Create img tag
              const img = document.createElement('img');
              img.src = data.url;
              img.alt = 'Uploaded Image';
              img.className = 'max-w-full h-auto rounded-xl my-4 border border-slate-700/60 shadow-lg block pl-6 select-all transition-all';
              
              // Replace placeholder with image
              const placeholderEl = document.getElementById(placeholderId);
              if (placeholderEl) {
                placeholderEl.parentNode?.replaceChild(img, placeholderEl);
              } else {
                editorRef.current?.appendChild(img);
              }
            } else {
              showUploadError(placeholderId);
            }
          } else {
            showUploadError(placeholderId);
          }
        } catch (err) {
          console.error('Image paste upload failed:', err);
          showUploadError(placeholderId);
        } finally {
          // Sync final HTML state
          if (editorRef.current) {
            setEditorContent(editorRef.current.innerHTML);
          }
        }
      }
    }
  };

  // Handle click on editor (e.g. to open links in a new tab)
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (anchor) {
      e.preventDefault();
      // Direct click opens link in new tab
      window.open(anchor.href, '_blank', 'noopener,noreferrer');
    }
  };

  // Copy all text of current note
  const handleCopyAll = () => {
    const plainText = getPlainText(editorContent);
    if (!plainText) return;
    navigator.clipboard.writeText(plainText);
    alert('คัดลอกเนื้อหาทั้งหมดลงคลิปบอร์ดแล้วค่ะ!');
  };

  // Filter notes by search query
  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistics calculation
  const plainText = getPlainText(editorContent);
  const charCount = plainText.length;
  const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;

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
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Score (Heart Priority) Control */}
                    <div className="flex flex-col items-center select-none">
                      <button
                        onClick={(e) => handleUpdateScore(note.id, (note.score || 0) + 1, e)}
                        className="text-slate-500 hover:text-pink-400 active:scale-75 transition-all p-0.5 cursor-pointer"
                        title="เพิ่มแต้มหัวใจ (+1)"
                      >
                        <i className="fa-solid fa-chevron-up text-[10px]"></i>
                      </button>
                      
                      <div className="flex items-center gap-0.5 my-0.5">
                        <i className={`fa-solid fa-heart text-[10px] ${(note.score || 0) > 0 ? 'text-pink-500' : 'text-slate-600'}`}></i>
                        <span className={`text-[10px] font-extrabold ${(note.score || 0) > 0 ? 'text-pink-500' : 'text-slate-650'}`}>
                          {note.score || 0}
                        </span>
                      </div>

                      <button
                        onClick={(e) => handleUpdateScore(note.id, (note.score || 0) - 1, e)}
                        disabled={(note.score || 0) <= 0}
                        className="text-slate-500 hover:text-slate-400 disabled:opacity-20 disabled:hover:text-slate-500 active:scale-75 transition-all p-0.5 cursor-pointer"
                        title="ลดแต้มหัวใจ (-1)"
                      >
                        <i className="fa-solid fa-chevron-down text-[10px]"></i>
                      </button>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingNote(note);
                      }}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-2 text-slate-500 hover:text-rose-450 hover:bg-slate-950/40 rounded-lg active:scale-90 transition-all"
                      title="ลบบันทึกนี้"
                    >
                      <i className="fa-regular fa-trash-can text-xs"></i>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sidebar Footer: Trash Bin Button */}
          <div className="p-3 border-t border-slate-700/40 bg-slate-950/40 flex items-center justify-between shrink-0">
            <button
              onClick={() => {
                setIsTrashOpen(true);
                fetchTrashedNotes();
              }}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-slate-900 rounded-lg cursor-pointer"
            >
              <i className="fa-regular fa-trash-can"></i>
              <span>ถังขยะ</span>
            </button>
            {trashedNotes.length > 0 && (
              <span className="text-[10px] bg-slate-850 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                {trashedNotes.length}
              </span>
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
                  {activeNoteId !== null && (() => {
                    const activeNote = notes.find(n => n.id === activeNoteId);
                    const currentScore = activeNote ? (activeNote.score || 0) : 0;
                    return (
                      <div className="flex items-center bg-slate-900/80 border border-slate-700/50 rounded-lg overflow-hidden h-[30px]">
                        <button
                          onClick={(e) => activeNote && handleUpdateScore(activeNote.id, currentScore - 1, e)}
                          disabled={!activeNote || currentScore <= 0}
                          className="px-2.5 h-full flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                          title="ลดแต้มหัวใจ (-1)"
                        >
                          <i className="fa-solid fa-minus text-[10px]"></i>
                        </button>
                        <span className="px-3 h-full flex items-center gap-1 text-xs font-bold text-pink-500 bg-slate-950/40 border-x border-slate-700/30 select-none">
                          <i className={`fa-solid fa-heart ${currentScore > 0 ? 'animate-pulse' : 'text-slate-650'}`}></i>
                          <span>{currentScore}</span>
                        </span>
                        <button
                          onClick={(e) => activeNote && handleUpdateScore(activeNote.id, currentScore + 1, e)}
                          className="px-2.5 h-full flex items-center justify-center text-slate-400 hover:text-pink-400 hover:bg-slate-800 transition-colors cursor-pointer"
                          title="เพิ่มแต้มหัวใจ (+1)"
                        >
                          <i className="fa-solid fa-plus text-[10px]"></i>
                        </button>
                      </div>
                    );
                  })()}

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

                {/* Content Input (contentEditable with lined paper style) */}
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={handleInput}
                  onPaste={handlePaste}
                  onClick={handleEditorClick}
                  className="flex-1 w-full bg-transparent text-slate-200 text-sm focus:outline-none pt-4 pb-2 z-10 pl-6 pr-2 overflow-y-auto no-scrollbar leading-[1.8rem] contenteditable-placeholder min-h-[200px]"
                  style={{ outline: 'none' }}
                  data-placeholder="เริ่มพิมพ์บันทึกของคุณพี่ลีดตรงนี้ได้เลยค่ะ..."
                  suppressContentEditableWarning
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
                เอกสารนี้จะถูกย้ายไปที่ถังขยะและสามารถกู้คืนกลับมาได้ในภายหลังค่ะ
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
                    <span>กำลังย้าย...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-trash-can"></i>
                    <span>ย้ายไปถังขยะ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ถังขยะเอกสาร */}
      {isTrashOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm transition-all duration-300">
          <div className="bg-slate-800 border border-slate-700/60 rounded-2.5xl p-6 w-full max-w-lg shadow-2xl scale-100 transform transition-all duration-300 flex flex-col max-h-[85vh]">
            
            <div className="flex justify-between items-center pb-3 border-b border-slate-700/50 shrink-0">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <i className="fa-regular fa-trash-can text-pink-500"></i>
                <span>ถังขยะเอกสาร</span>
              </h3>
              <button
                onClick={() => setIsTrashOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* List of Trashed Notes */}
            <div className="flex-1 overflow-y-auto my-4 space-y-2 pr-1 no-scrollbar min-h-[150px]">
              {trashedNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-center">
                  <div className="w-12 h-12 bg-slate-700/20 rounded-full flex items-center justify-center text-slate-650 text-xl mb-3 border border-slate-750">
                    <i className="fa-regular fa-folder-open"></i>
                  </div>
                  <p className="text-xs">ไม่มีเอกสารในถังขยะ</p>
                </div>
              ) : (
                trashedNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 bg-slate-900/60 border border-slate-700/30 rounded-xl flex justify-between items-center hover:bg-slate-900/80 transition-colors"
                  >
                    <div className="min-w-0 flex-1 pr-4">
                      <h4 className="font-bold text-xs text-slate-200 truncate">{note.title || 'บันทึกไม่มีชื่อ'}</h4>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {note.content ? getPlainText(note.content).slice(0, 50) : 'ว่างเปล่า'}
                      </p>
                      <span className="text-[9px] text-slate-600 block mt-1">
                        ลบเมื่อ: {note.deleted_at ? new Date(note.deleted_at).toLocaleString('th-TH', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : '-'}
                      </span>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleRestoreNote(note.id)}
                        className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-all active:scale-90 cursor-pointer"
                        title="กู้คืนเอกสาร"
                      >
                        <i className="fa-solid fa-arrow-rotate-left text-xs"></i>
                      </button>
                      <button
                        onClick={() => {
                          setConfirmPasswordNote(note);
                          setPasswordError('');
                          setVerifyPasswordInput('');
                          setShowPassword(false);
                        }}
                        className="p-2 text-rose-450 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all active:scale-90 cursor-pointer"
                        title="ลบถาวร"
                      >
                        <i className="fa-regular fa-trash-can text-xs"></i>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-700/50 shrink-0 gap-3">
              <button
                onClick={() => {
                  if (trashedNotes.length > 0) {
                    setIsEmptyAllConfirmOpen(true);
                    setPasswordError('');
                    setVerifyPasswordInput('');
                    setShowPassword(false);
                  }
                }}
                disabled={trashedNotes.length === 0}
                className="py-2 px-4 rounded-xl text-xs font-semibold text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              >
                ล้างถังขยะทั้งหมด
              </button>
              <button
                onClick={() => setIsTrashOpen(false)}
                className="py-2 px-4 rounded-xl text-xs font-semibold bg-slate-700 hover:bg-slate-650 text-slate-300 transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ยืนยันรหัสผ่านเพื่อลบถาวร */}
      {(confirmPasswordNote || isEmptyAllConfirmOpen) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md transition-all duration-300">
          <div className="bg-slate-800 border border-rose-500/40 rounded-2.5xl p-6 w-full max-w-sm shadow-2xl scale-100 transform transition-all duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-rose-500/10 rounded-full flex items-center justify-center mb-4 text-rose-500 text-2xl border border-rose-500/20 animate-bounce">
                <i className="fa-solid fa-lock"></i>
              </div>
              <h3 className="text-base font-bold text-slate-100">ยืนยันรหัสผ่านเพื่อลบถาวร</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                {isEmptyAllConfirmOpen ? (
                  <span>คุณพี่ลีดต้องการล้างถังขยะและ <strong className="text-rose-400">ลบไฟล์ทั้งหมดถาวร</strong> ใช่ไหมคะ?</span>
                ) : (
                  <span>คุณพี่ลีดต้องการ <strong className="text-rose-400">ลบเอกสาร &ldquo;{confirmPasswordNote?.title}&rdquo; ถาวร</strong> ใช่ไหมคะ?</span>
                )}
                <br />
                เพื่อความปลอดภัยสูงสุด กรุณากรอกรหัสผ่านบัญชีของคุณค่ะ
              </p>
            </div>

            <div className="relative mt-4">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="รหัสผ่านบัญชีของคุณ"
                value={verifyPasswordInput}
                onChange={(e) => setVerifyPasswordInput(e.target.value)}
                autoComplete="new-password"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (isEmptyAllConfirmOpen) {
                      handleEmptyTrash();
                    } else if (confirmPasswordNote) {
                      handlePermanentDeleteNote(confirmPasswordNote.id);
                    }
                  }
                }}
                className="w-full bg-slate-900/90 border border-slate-700/60 rounded-xl pl-4 pr-10 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-rose-500/50 transition-colors"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer flex items-center justify-center"
                title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
              </button>
            </div>
            {passwordError && (
              <p className="text-rose-400 text-[10px] mt-1.5 flex items-center gap-1">
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>{passwordError}</span>
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setConfirmPasswordNote(null);
                  setIsEmptyAllConfirmOpen(false);
                  setVerifyPasswordInput('');
                  setPasswordError('');
                }}
                disabled={isProcessingTrash}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-700 hover:bg-slate-650 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  if (isEmptyAllConfirmOpen) {
                    handleEmptyTrash();
                  } else if (confirmPasswordNote) {
                    handlePermanentDeleteNote(confirmPasswordNote.id);
                  }
                }}
                disabled={isProcessingTrash}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-slate-100 transition-colors disabled:opacity-50 flex justify-center items-center gap-1.5"
              >
                {isProcessingTrash ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>กำลังประมวลผล...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-trash-can"></i>
                    <span>ยืนยันลบถาวร</span>
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
