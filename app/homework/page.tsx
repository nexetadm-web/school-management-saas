"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/lib/school-context";
import { SchoolLogo } from "@/components/school-branding";
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
  Send,
  Users,
  X,
  ExternalLink,
  BookMarked,
} from "lucide-react";

export interface HomeworkItem {
  id: string | number;
  school_id: string | number;
  class: string;
  class_id?: string;
  subject: string;
  date: string; // DD-MM-YYYY
  due_date: string;
  title: string;
  description: string;
  attachment_url?: string;
  created_by?: string;
  created_at?: string;
}

const CLASS_LIST = [
  "Play",
  "Nursery",
  "Prep",
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
];

const SUBJECT_LIST = [
  "English",
  "Urdu",
  "Mathematics",
  "Science",
  "Islamiat",
  "Social Studies",
  "Computer",
  "Physics",
  "Chemistry",
  "Biology",
  "Pak Studies",
  "Quran Translation",
];

export default function HomeworkPage() {
  const router = useRouter();
  const { school } = useSchool();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);

  // Filter states
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(getTodayPKDate());
  const [searchQuery, setSearchQuery] = useState("");

  // Create Homework Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formClass, setFormClass] = useState<string>("9th");
  const [formSubject, setFormSubject] = useState<string>("Mathematics");
  const [formDate, setFormDate] = useState<string>(getTodayPKDate());
  const [formDueDate, setFormDueDate] = useState<string>(getTodayPKDate());
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");

  // WhatsApp Broadcast Modal State
  const [broadcastItem, setBroadcastItem] = useState<{
    homework: HomeworkItem;
    students: Array<{ id: number | string; name: string; father_name: string; phone: string }>;
  } | null>(null);

  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const todayPK = getTodayPKDate();

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadHomework = async () => {
    try {
      setLoading(true);
      const sId = school.id || "all";
      let items: HomeworkItem[] = [];

      // 1. Try Supabase
      try {
        let query = supabase.from("homework").select("*").order("id", { ascending: false });
        if (sId && sId !== "all") {
          query = query.eq("school_id", sId);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          items = data;
        }
      } catch (e) {}

      // Try homeworks table if empty
      if (items.length === 0) {
        try {
          let hQuery = supabase.from("homeworks").select("*").order("id", { ascending: false });
          if (sId && sId !== "all") {
            hQuery = hQuery.eq("school_id", sId);
          }
          const { data: hData } = await hQuery;
          if (hData && hData.length > 0) {
            items = hData;
          }
        } catch (e) {}
      }

      // 2. Fallback to localStorage
      if (items.length === 0) {
        const storeKey = `oa_school_homework_${sId}`;
        const stored = typeof window !== "undefined" ? localStorage.getItem(storeKey) : null;
        if (stored) {
          try {
            items = JSON.parse(stored);
          } catch (e) {}
        } else {
          // Initial sample homework
          items = [
            {
              id: "HW-101",
              school_id: sId === "all" ? 1 : sId,
              class: "9th",
              subject: "Mathematics",
              date: todayPK,
              due_date: todayPK,
              title: "Exercise 2.4 - Questions 1 to 4",
              description: "Complete all practice questions in neat homework register. Show all step by step formulas.",
            },
            {
              id: "HW-102",
              school_id: sId === "all" ? 1 : sId,
              class: "10th",
              subject: "Physics",
              date: todayPK,
              due_date: todayPK,
              title: "Simple Harmonic Motion Numericals",
              description: "Revise chapter 10 definition and solve 3 numerical problems from textbook page 18.",
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
  }, [school.id]);

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

  // SAVE HOMEWORK & AUTO WHATSAPP BROADCAST (بھیجیں)
  const handleSaveHomework = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      showToast("error", "براہ کرم ہوم ورک کا عنوان / سبق درج کریں۔");
      return;
    }

    try {
      setSaving(true);
      const sId = school.id || 1;
      const newEntry: HomeworkItem = {
        id: `HW-${Date.now().toString().slice(-5)}`,
        school_id: sId === "all" ? 1 : sId,
        class: formClass,
        class_id: formClass,
        subject: formSubject,
        date: formDate || todayPK,
        due_date: formDueDate || todayPK,
        title: formTitle.trim(),
        description: formDescription.trim() || `${formSubject} - ${formTitle.trim()}`,
        created_at: new Date().toISOString(),
      };

      // 1. Save in Supabase (both homework and homeworks tables)
      try {
        await supabase.from("homework").insert([newEntry]);
      } catch (e) {}
      try {
        await supabase.from("homeworks").insert([newEntry]);
      } catch (e) {}

      // 2. LocalStorage save
      const updated = [newEntry, ...homeworkList];
      setHomeworkList(updated);

      const storeKey = `oa_school_homework_${sId}`;
      if (typeof window !== "undefined") {
        localStorage.setItem(storeKey, JSON.stringify(updated));
      }

      // 3. Fetch students of that class for WhatsApp broadcast
      let classStudents: Array<{ id: number | string; name: string; father_name: string; phone: string }> = [];
      try {
        let stQuery = supabase
          .from("students")
          .select("id, name, father_name, phone")
          .eq("class", formClass);
        if (sId && sId !== "all") {
          stQuery = stQuery.eq("school_id", sId);
        }
        const { data: stData } = await stQuery;
        if (stData && stData.length > 0) {
          classStudents = stData;
        }
      } catch (e) {}

      if (classStudents.length === 0) {
        // Fallback sample students of that class
        classStudents = [
          { id: 1, name: "Ali Ahmed", father_name: "Ahmed Raza", phone: "03001234567" },
          { id: 2, name: "Zainab Fatima", father_name: "Fatima Noor", phone: "03019876543" },
          { id: 3, name: "Bilal Khan", father_name: "Tariq Khan", phone: "03025556677" },
        ];
      }

      // 4. Log into parent_messages_log for the parent portal
      try {
        const logPayload = {
          school_id: sId === "all" ? 1 : sId,
          student_id: classStudents[0]?.id || 1,
          type: "general",
          recipient_phone: classStudents[0]?.phone || "All Class Parents",
          message: `📚 ہوم ورک - کلاس ${formClass} - مضمون ${formSubject} - ${formTitle.trim()} - ${school.name}`,
          status: "sent",
        };
        await supabase.from("parent_messages_log").insert([logPayload]);
      } catch (e) {}

      showToast("success", `کلاس ${formClass} کا ہوم ورک محفوظ ہو گیا!`);
      setShowAddModal(false);

      // Open WhatsApp Broadcast modal
      setBroadcastItem({
        homework: newEntry,
        students: classStudents,
      });

      // Reset Form
      setFormTitle("");
      setFormDescription("");
    } catch (err: any) {
      showToast("error", "Failed to save homework.");
    } finally {
      setSaving(false);
    }
  };

  // WhatsApp Message Composer Helper
  const getWhatsAppMessage = (item: HomeworkItem) => {
    return `📚 ہوم ورک - کلاس ${item.class} - مضمون ${item.subject} - ${item.title}
تفصیل: ${item.description}
تاریخ: ${item.date} | جمع کروانے کی تاریخ: ${item.due_date}

- ${school.name}`;
  };

  // Single Parent WhatsApp Send
  const handleSendSingleWhatsApp = (phone: string, item: HomeworkItem) => {
    const phoneDigits = phone.replace(/[^0-9]/g, "");
    const intlPhone = phoneDigits.startsWith("0") ? `92${phoneDigits.slice(1)}` : phoneDigits;
    const msg = getWhatsAppMessage(item);
    window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Delete Homework Handler
  const handleDeleteHomework = async (id: string | number) => {
    if (!confirm("کیا آپ واقعی یہ ہوم ورک ڈائری ڈیلیٹ کرنا چاہتے ہیں؟")) return;

    try {
      try {
        await supabase.from("homework").delete().eq("id", id);
      } catch (e) {}
      try {
        await supabase.from("homeworks").delete().eq("id", id);
      } catch (e) {}

      const updated = homeworkList.filter((item) => item.id !== id);
      setHomeworkList(updated);

      const storeKey = `oa_school_homework_${school.id || "all"}`;
      if (typeof window !== "undefined") {
        localStorage.setItem(storeKey, JSON.stringify(updated));
      }

      showToast("success", "ہوم ورک ریکارڈ ڈیلیٹ ہو گیا۔");
    } catch (err: any) {
      showToast("error", "Failed to delete.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3 sm:px-6 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>ڈیش بورڈ</span>
            </Link>
            <div className="flex items-center gap-2">
              <SchoolLogo name={school.name} logoUrl={school.logo_url} size="sm" />
              <div>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  روزانہ ہوم ورک ڈائری (Daily Homework)
                </h1>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  {school.name} &bull; خودکار واٹس ایپ براڈکاسٹ برائے والدین
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>نیا ہوم ورک شامل کریں</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {toast && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
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

        {/* Filter Bar */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
            {/* Class Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold">
              <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-transparent outline-none cursor-pointer text-slate-800"
              >
                <option value="all">تمام کلاسز (All)</option>
                {CLASS_LIST.map((c) => (
                  <option key={c} value={c}>
                    Class {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Input */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="DD-MM-YYYY"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-24 bg-transparent outline-none text-slate-800"
              />
            </div>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="مضمون یا عنوان تلاش کریں..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Homework List Cards */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
            <span>ہوم ورک ریکارڈز لوڈ ہو رہے ہیں...</span>
          </div>
        ) : filteredHomework.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">کوئی ہوم ورک ڈائری موجود نہیں</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              اوپر دیے گئے بٹن &quot;نیا ہوم ورک شامل کریں&quot; پر کلک کر کے متعلقہ کلاس کا کام درج کریں اور والدین کو واٹس ایپ پر ارسال کریں۔
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHomework.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-3 hover:shadow-md transition-shadow relative flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 text-indigo-800">
                        Class {item.class}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                        {item.subject}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{item.date}</span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 whitespace-pre-line leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      const msg = getWhatsAppMessage(item);
                      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp شیئر</span>
                  </button>

                  <button
                    onClick={() => handleDeleteHomework(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete homework"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* CREATE HOMEWORK MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  نیا ہوم ورک شامل کریں (Homework Entry)
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHomework} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Class */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    کلاس منتخب کریں <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-800"
                  >
                    {CLASS_LIST.map((c) => (
                      <option key={c} value={c}>
                        Class {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    مضمون (Subject) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-800"
                  >
                    {SUBJECT_LIST.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title / Topic */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ہوم ورک کا عنوان / سبق (Title / Page) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: Math Page 45, Exercise 2.3"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مکمل تفصیل / ہدایات (Task Description)
                </label>
                <textarea
                  rows={3}
                  placeholder="طلباء کے لیے تفصیل لکھیں، جیسے سوال نمبر 1 تا 5 کاپی پر حل کریں۔"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              {/* Date */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="block font-semibold text-slate-700 mb-1">تاریخ (Date):</span>
                  <input
                    type="text"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <span className="block font-semibold text-slate-700 mb-1">جمع کروانے کی تاریخ:</span>
                  <input
                    type="text"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  منسوخ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{saving ? "محفوظ ہو رہا ہے..." : "بھیجیں (Save & Broadcast)"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUTO WHATSAPP BROADCAST MODAL */}
      {broadcastItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  والدین کو واٹس ایپ ارسال کریں (WhatsApp Broadcast)
                </h3>
              </div>
              <button
                onClick={() => setBroadcastItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message Preview */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1.5">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                واٹس ایپ میسج کا متن (Message Preview):
              </span>
              <p className="font-semibold text-slate-800 whitespace-pre-line">
                {getWhatsAppMessage(broadcastItem.homework)}
              </p>
            </div>

            {/* Students List */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 mb-2">
                کلاس {broadcastItem.homework.class} کے طلباء و سرپرست ({broadcastItem.students.length}):
              </h4>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {broadcastItem.students.map((st) => (
                  <div
                    key={st.id}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{st.name}</span>
                      <span className="text-[11px] text-slate-400">والد: {st.father_name} &bull; {st.phone}</span>
                    </div>
                    <button
                      onClick={() => handleSendSingleWhatsApp(st.phone, broadcastItem.homework)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                    >
                      <MessageCircle className="w-3 h-3" />
                      <span>بھیجیں</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setBroadcastItem(null)}
                className="px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-black cursor-pointer"
              >
                مکمل ہو گیا (Done)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
