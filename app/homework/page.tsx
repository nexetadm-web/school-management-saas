"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveActiveSchoolContext } from "@/lib/school-context";
import { getTodayPKDate } from "@/lib/date-utils";
import {
  ArrowLeft,
  BookOpen,
  Plus,
  Calendar,
  MessageCircle,
  Share2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  Clock,
  GraduationCap,
} from "lucide-react";

interface HomeworkItem {
  id: string | number;
  school_id: string | number;
  class: string;
  subject: string;
  date: string; // DD-MM-YYYY
  due_date: string;
  title: string;
  description: string;
  created_at?: string;
}

import { PAKISTAN_BOARD_SUBJECTS } from "@/lib/subjects-data";

const DEFAULT_SUBJECTS = PAKISTAN_BOARD_SUBJECTS.map((s) => s.name);

export default function HomeworkPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schoolContext, setSchoolContext] = useState<any>(null);
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);

  // Filter states
  const [selectedClass, setSelectedClass] = useState<string>("Play");
  const [selectedDate, setSelectedDate] = useState<string>(getTodayPKDate());
  const [searchQuery, setSearchQuery] = useState("");

  // Create Homework Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formClass, setFormClass] = useState<string>("Play");
  const [formSubject, setFormSubject] = useState<string>("English");
  const [formDate, setFormDate] = useState<string>(getTodayPKDate());
  const [formDueDate, setFormDueDate] = useState<string>(getTodayPKDate());
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadHomework = async () => {
    try {
      setLoading(true);
      const ctx = await resolveActiveSchoolContext();
      setSchoolContext(ctx);

      let items: HomeworkItem[] = [];

      // 1. Try Supabase
      try {
        let query = supabase.from("homework").select("*").order("id", { ascending: false });
        if (ctx.schoolId && ctx.schoolId !== "all") {
          query = query.eq("school_id", ctx.schoolId);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          items = data;
        }
      } catch (e) {}

      // 2. Fallback to localStorage
      if (items.length === 0) {
        const storeKey = `oa_school_homework_${ctx.schoolId || "all"}`;
        const stored = typeof window !== "undefined" ? localStorage.getItem(storeKey) : null;
        if (stored) {
          items = JSON.parse(stored);
        } else {
          // Initial sample homework
          items = [
            {
              id: "HW-101",
              school_id: ctx.schoolId || 1,
              class: "Play",
              subject: "English",
              date: getTodayPKDate(),
              due_date: getTodayPKDate(),
              title: "Alphabet Tracing A to E",
              description: "Complete book pages 14 and 15. Trace uppercase and lowercase letters carefully with color pencil.",
            },
            {
              id: "HW-102",
              school_id: ctx.schoolId || 1,
              class: "Play",
              subject: "Mathematics",
              date: getTodayPKDate(),
              due_date: getTodayPKDate(),
              title: "Number Counting 1 to 10",
              description: "Practice counting objects and color 5 apples on notebook page 22.",
            },
          ];
        }
      }

      setHomeworkList(items);
    } catch (err: any) {
      console.error(err);
      showToast("error", err.message || "Failed to load homework records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomework();
  }, []);

  // Filtered Homework
  const filteredHomework = useMemo(() => {
    return homeworkList.filter((item) => {
      const matchesClass = selectedClass === "all" || item.class.toLowerCase().trim() === selectedClass.toLowerCase().trim();
      const matchesDate = !selectedDate || item.date === selectedDate;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q);

      return matchesClass && matchesDate && matchesSearch;
    });
  }, [homeworkList, selectedClass, selectedDate, searchQuery]);

  // Save Homework Handler
  const handleSaveHomework = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim() || !formDescription.trim()) {
      showToast("error", "Please enter a topic and homework description.");
      return;
    }

    try {
      setSaving(true);
      const newEntry: HomeworkItem = {
        id: `HW-${Date.now().toString().slice(-5)}`,
        school_id: schoolContext?.schoolId || 1,
        class: formClass,
        subject: formSubject,
        date: formDate,
        due_date: formDueDate,
        title: formTitle.trim(),
        description: formDescription.trim(),
        created_at: new Date().toISOString(),
      };

      // 1. Try Supabase
      try {
        await supabase.from("homework").insert([newEntry]);
      } catch (e) {}

      // 2. LocalStorage fallback
      const updated = [newEntry, ...homeworkList];
      setHomeworkList(updated);

      const storeKey = `oa_school_homework_${schoolContext?.schoolId || "all"}`;
      if (typeof window !== "undefined") {
        localStorage.setItem(storeKey, JSON.stringify(updated));
      }

      showToast("success", `Homework added for Class ${formClass} (${formSubject})!`);
      setShowAddModal(false);
      setFormTitle("");
      setFormDescription("");
    } catch (err: any) {
      showToast("error", "Failed to save homework.");
    } finally {
      setSaving(false);
    }
  };

  // WhatsApp Share Handler
  const handleShareWhatsApp = (item: HomeworkItem) => {
    const schoolTitle = schoolContext?.schoolName || "OA Smart School System";
    const msg = `*📚 HOMEWORK DIARY - ${schoolTitle}*\n📅 Date: ${item.date} | Due: ${item.due_date}\n🎓 Class: ${item.class} | Subject: ${item.subject}\n📝 Topic: ${item.title}\n📌 Task: ${item.description}\n\n- Principal / Class Teacher, ${schoolTitle}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Delete Homework Handler
  const handleDeleteHomework = async (id: string | number) => {
    if (!confirm("Are you sure you want to delete this homework entry?")) return;

    try {
      try {
        await supabase.from("homework").delete().eq("id", id);
      } catch (e) {}

      const updated = homeworkList.filter((item) => item.id !== id);
      setHomeworkList(updated);

      const storeKey = `oa_school_homework_${schoolContext?.schoolId || "all"}`;
      if (typeof window !== "undefined") {
        localStorage.setItem(storeKey, JSON.stringify(updated));
      }

      showToast("success", "Homework entry deleted.");
    } catch (err: any) {
      showToast("error", "Failed to delete.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3 sm:px-6 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>Dashboard</span>
            </Link>
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Daily Homework Diary
                </h1>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Assign tasks class-wise and broadcast directly to parents via WhatsApp
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Assign New Homework</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
        {/* Toast Alert */}
        {toast && (
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold animate-in fade-in ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
        )}

        {/* Filter and Selection Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
              {/* Class Filter */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <span className="text-xs text-slate-400 font-bold uppercase">Class:</span>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer flex-1 sm:flex-initial"
                >
                  <option value="all">All Classes</option>
                  {["Play", "Nursery", "Prep", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"].map((c) => (
                    <option key={c} value={c}>
                      Class {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <span className="text-xs text-slate-400 font-bold uppercase">Date:</span>
                <input
                  type="text"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  placeholder="DD-MM-YYYY"
                  className="w-32 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 font-mono focus:outline-none"
                />
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search topic or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            <span className="text-xs text-slate-500 font-medium self-end md:self-center">
              {filteredHomework.length} homework assigned
            </span>
          </div>
        </div>

        {/* Homework Feed Cards */}
        <div className="space-y-3.5">
          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
              <p className="font-semibold text-xs">Loading homework entries...</p>
            </div>
          ) : filteredHomework.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
              <BookOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold">No homework entries for this date.</p>
              <p className="text-xs mt-1">Click "+ Assign New Homework" above to post tasks.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredHomework.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    {/* Header Tags */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Class {item.class}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {item.subject}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-400">
                        Assigned: {item.date}
                      </span>
                    </div>

                    {/* Topic & Description */}
                    <div>
                      <h3 className="text-sm font-black text-slate-900 leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-line">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Footer & Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Due Date: {item.due_date}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleShareWhatsApp(item)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition flex items-center gap-1.5 cursor-pointer"
                        title="Broadcast via WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        onClick={() => handleDeleteHomework(item.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Delete Homework"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ADD HOMEWORK MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Assign New Homework</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveHomework} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Class</label>
                  <select
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    {["Play", "Nursery", "Prep", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"].map((c) => (
                      <option key={c} value={c}>
                        Class {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Subject</label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    {DEFAULT_SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Date</label>
                  <input
                    type="text"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Due Date</label>
                  <input
                    type="text"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Topic / Lesson Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 4: Fractions Exercise 4.2"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Detailed Homework Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain instructions, questions to solve, or book page numbers..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{saving ? "Posting..." : "Post Homework"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
