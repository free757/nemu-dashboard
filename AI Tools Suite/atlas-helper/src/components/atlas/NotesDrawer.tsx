"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../../../../src/lib/supabase";
import {

  Notebook,
  X,
  Plus,
  Trash2,
  Save,
  RotateCw,
  AlertCircle,
  FileText
} from "lucide-react";

interface NoteItem {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

interface NotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotesDrawer: React.FC<NotesDrawerProps> = ({ isOpen, onClose }) => {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});

  const fetchNotes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("shared_notes")
        .select("*")
        .order("created_at", { ascending: false });

      if (err) throw err;
      setNotes(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load notes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotes();
    }
  }, [isOpen]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSaving(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("shared_notes")
        .insert([{ title: title.trim(), content: content.trim() }])
        .select();

      if (err) throw err;

      // Add to list and clear form
      if (data && data[0]) {
        setNotes((prev) => [data[0] as NoteItem, ...prev]);
      } else {
        await fetchNotes(); // fallback
      }
      setTitle("");
      setContent("");
    } catch (err: any) {
      setError(err.message || "Failed to save note.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الملاحظة؟")) return;

    setError(null);
    try {
      const { error: err } = await supabase
        .from("shared_notes")
        .delete()
        .eq("id", id);

      if (err) throw err;
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete note.");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[999] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] bg-slate-900 border-l border-slate-800 z-[1000] shadow-2xl flex flex-col transition-transform duration-300 animate-slide-in">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Notebook className="w-5 h-5 text-brand-500" />
            <h2 className="text-base font-bold text-white">Shared Notes / درج الملاحظات</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchNotes}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="تحديث الملاحظات"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? "animate-spin text-brand-400" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-200 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Add New Note Form */}
          <form onSubmit={handleAddNote} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة ملاحظة جديدة</span>
            </h3>

            <div className="space-y-1">
              <label className="block text-[10px] text-slate-400 font-medium">عنوان الملاحظة</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: كود الخياطة الجديد..."
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] text-slate-400 font-medium">الملاحظة التفصيلية</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="اكتب هنا الملاحظات أو الأكواد المرجعية للتسهيل على الجميع..."
                rows={3}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-y"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
            >
              {isSaving ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>حفظ الملاحظة للجميع</span>
            </button>
          </form>

          {/* Notes List */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-brand-500" />
              <span>الملاحظات المسجلة ({notes.length})</span>
            </h3>

            {isLoading && notes.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">جاري تحميل الملاحظات...</div>
            ) : notes.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                لا توجد ملاحظات مسجلة بعد. كن أول من يضيف ملاحظة!
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-slate-950/60 border border-slate-800/80 hover:border-slate-800 rounded-xl p-4 space-y-2 relative group transition-all"
                  >
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="absolute top-3 right-3 p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded-md transition-all opacity-0 group-hover:opacity-100"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <h4 className="text-xs font-bold text-brand-300 pr-8 flex items-center gap-1">
                      <span>📌</span>
                      <span>{note.title}</span>
                    </h4>

                    {(() => {
                      const isLong = note.content.length > 120 || note.content.split("\n").length > 3;
                      const isExpanded = !!expandedNotes[note.id];
                      
                      // Safely truncate by characters or lines
                      let displayedContent = note.content;
                      if (isLong && !isExpanded) {
                        const lines = note.content.split("\n");
                        if (lines.length > 3) {
                          displayedContent = lines.slice(0, 3).join("\n");
                        }
                        if (displayedContent.length > 120) {
                          displayedContent = displayedContent.slice(0, 120) + "...";
                        } else if (lines.length > 3) {
                          displayedContent += "...";
                        }
                      }

                      return (
                        <div className="space-y-1">
                          <div 
                            className={`text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans scrollbar-thin ${
                              isExpanded ? "max-h-48 overflow-y-auto pr-1.5 scrollbar-thumb-slate-850 scrollbar-track-transparent" : ""
                            }`}
                          >
                            {displayedContent}
                          </div>
                          {isLong && (
                            <button
                              onClick={() => setExpandedNotes(prev => ({ ...prev, [note.id]: !prev[note.id] }))}
                              className="text-[10px] text-brand-400 hover:text-brand-300 font-bold focus:outline-none mt-1 select-none"
                            >
                              {isExpanded ? "عرض أقل ▲" : "عرض المزيد ▼"}
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-900">
                      <span>بواسطة الأداة المشتركة</span>
                      <span>
                        {new Date(note.created_at).toLocaleDateString("ar-EG", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
