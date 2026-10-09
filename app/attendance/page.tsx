"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveActiveSchoolContext } from "@/lib/school-context";
import { getTodayPKDate, formatPKWhatsAppPhone } from "@/lib/date-utils";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  AlertCircle,
  UserCheck,
  UserX,
  Clock,
  Save,
  Users,
  Search,
  CheckSquare,
  BarChart3,
  RefreshCw,
  Sparkles,
  ChevronRight,
  User,
  Menu,
  X,
  MessageCircle,
} from "lucide-react";

interface Student {
  id: number | string;
  name: string;
  class: string;
  father_name?: string | null;
  phone?: string | null;
  school_id?: number | string;
  avatar_url?: string;
}

type AttendanceStatus = "Present" | "Absent" | "Leave";

export default function AttendancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schoolContext, setSchoolContext] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);

  // Attendance Controls
  const [attendanceDate, setAttendanceDate] = useState<string>(getTodayPKDate());
  const [selectedClass, setSelectedClass] = useState<string>("Play");
  const [selectedSection, setSelectedSection] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Attendance Map: studentId -> Status
  const [attendanceMap, setAttendanceMap] = useState<{ [studentId: string]: AttendanceStatus }>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadStudentsAndAttendance = async () => {
    try {
      setLoading(true);
      const ctx = await resolveActiveSchoolContext();
      setSchoolContext(ctx);

      let query = supabase.from("students").select("*").order("name", { ascending: true });
      if (ctx.schoolId && ctx.schoolId !== "all") {
        query = query.eq("school_id", ctx.schoolId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const studentList: Student[] = data || [];
      setStudents(studentList);

      if (studentList.length > 0) {
        const classes = Array.from(new Set(studentList.map((s) => s.class)));
        if (!classes.includes(selectedClass) && classes.length > 0) {
          setSelectedClass(classes[0]);
        }
      }

      // Load existing attendance for today
      loadDateAttendance(attendanceDate, ctx.schoolId, studentList);
    } catch (err: any) {
      console.error(err);
      showToast("error", err.message || "Failed to load students.");
    } finally {
      setLoading(false);
    }
  };

  const loadDateAttendance = async (dateStr: string, schoolId: any, currentStudents: Student[]) => {
    try {
      // 1. Try Supabase
      const { data: dbRecords, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("date", dateStr);

      const map: { [id: string]: AttendanceStatus } = {};

      if (!error && dbRecords && dbRecords.length > 0) {
        dbRecords.forEach((r: any) => {
          map[String(r.student_id)] = r.status as AttendanceStatus;
        });
      } else {
        // Fallback to localStorage
        const storeKey = `oa_attendance_${schoolId || "all"}_date_${dateStr}`;
        const localData = typeof window !== "undefined" ? localStorage.getItem(storeKey) : null;
        if (localData) {
          Object.assign(map, JSON.parse(localData));
        } else {
          // Default to Present for all
          currentStudents.forEach((s) => {
            map[String(s.id)] = "Present";
          });
        }
      }

      setAttendanceMap(map);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadStudentsAndAttendance();
  }, []);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesClass = s.class.toLowerCase().trim() === selectedClass.toLowerCase().trim();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.father_name && s.father_name.toLowerCase().includes(q)) ||
        String(s.id).includes(q);

      return matchesClass && matchesSearch;
    });
  }, [students, selectedClass, searchQuery]);

  const classOptions = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.class) set.add(s.class);
    });
    return Array.from(set).sort();
  }, [students]);

  // Set Single Student Status
  const handleSetStatus = (studentId: string | number, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [String(studentId)]: status,
    }));
  };

  // Bulk Actions
  const handleMarkAll = (status: AttendanceStatus) => {
    const nextMap = { ...attendanceMap };
    filteredStudents.forEach((s) => {
      nextMap[String(s.id)] = status;
    });
    setAttendanceMap(nextMap);
    showToast("success", `Marked all ${filteredStudents.length} students as ${status}!`);
  };

  // Summary Metrics
  const summary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;

    filteredStudents.forEach((s) => {
      const status = attendanceMap[String(s.id)] || "Present";
      if (status === "Present") present++;
      else if (status === "Absent") absent++;
      else if (status === "Leave") leave++;
    });

    const total = filteredStudents.length;
    const rate = total > 0 ? ((present / total) * 100).toFixed(1) : "0.0";

    return { total, present, absent, leave, rate };
  }, [filteredStudents, attendanceMap]);

  const [isAbsentWhatsAppModalOpen, setIsAbsentWhatsAppModalOpen] = useState(false);

  const absentStudents = useMemo(() => {
    return filteredStudents.filter(
      (s) => (attendanceMap[String(s.id)] || "Present") === "Absent"
    );
  }, [filteredStudents, attendanceMap]);

  // Save Attendance Handler
  const handleSaveAttendance = async () => {
    try {
      setSaving(true);
      const storeKey = `oa_attendance_${schoolContext?.schoolId || "all"}_date_${attendanceDate}`;
      if (typeof window !== "undefined") {
        localStorage.setItem(storeKey, JSON.stringify(attendanceMap));
      }

      // Try Supabase upsert
      try {
        const rows = filteredStudents.map((s) => ({
          school_id: schoolContext?.schoolId === "all" ? 1 : schoolContext?.schoolId,
          student_id: s.id,
          date: attendanceDate,
          status: attendanceMap[String(s.id)] || "Present",
          marked_by: schoolContext?.currentUserEmail || "Admin",
        }));
        await supabase.from("attendance").upsert(rows, { onConflict: "school_id,student_id,date" });
      } catch (err) {}

      showToast(
        "success",
        `Attendance saved for ${filteredStudents.length} students on ${attendanceDate}!`
      );
    } catch (err: any) {
      showToast("error", "Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-36 sm:pb-24">
      {/* 100% RESPONSIVE TOP HEADER */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 sm:py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Left branding & title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xs sm:text-base font-bold text-slate-900 tracking-tight truncate">
                  Daily Attendance
                </h1>
                <p className="text-[10px] text-slate-400 hidden md:block truncate">
                  {schoolContext?.schoolName} • Asia/Karachi
                </p>
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link
              href="/attendance-report"
              className="inline-flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 shadow-2xs transition cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Report</span>
            </Link>

            <button
              onClick={handleSaveAttendance}
              disabled={saving || filteredStudents.length === 0}
              className="inline-flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
            >
              <Save className={`w-3.5 h-3.5 shrink-0 ${saving ? "animate-spin" : ""}`} />
              <span>{saving ? "Saving" : "Save"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Toast Alert */}
        {toast && (
          <div
            className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold animate-in fade-in ${
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
            <span className="truncate">{toast.text}</span>
          </div>
        )}

        {/* 100% RESPONSIVE FILTER & TOP BAR */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs space-y-3">
          {/* Stack vertically on mobile, horizontal on PC */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Filter Inputs Grid (Full width on mobile) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full lg:w-auto">
              {/* Date Input */}
              <div className="col-span-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Date</label>
                <input
                  type="text"
                  value={attendanceDate}
                  onChange={(e) => {
                    setAttendanceDate(e.target.value);
                    loadDateAttendance(e.target.value, schoolContext?.schoolId, students);
                  }}
                  placeholder="DD-MM-YYYY"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Class Dropdown */}
              <div className="col-span-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  {classOptions.map((c) => (
                    <option key={c} value={c}>
                      Class {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Dropdown */}
              <div className="col-span-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Section</label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Sections</option>
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                </select>
              </div>

              {/* Search input */}
              <div className="col-span-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Name/ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Quick Batch Marking Buttons (Wrap on mobile) */}
            <div className="flex items-center gap-1.5 w-full lg:w-auto justify-between lg:justify-end pt-1 lg:pt-0 border-t lg:border-t-0 border-slate-100">
              <button
                onClick={() => handleMarkAll("Present")}
                className="flex-1 lg:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition cursor-pointer text-center"
              >
                All Present
              </button>

              <button
                onClick={() => handleMarkAll("Absent")}
                className="flex-1 lg:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer text-center"
              >
                All Absent
              </button>

              <button
                onClick={() => handleMarkAll("Leave")}
                className="flex-1 lg:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition cursor-pointer text-center"
              >
                All Leave
              </button>

              {absentStudents.length > 0 && (
                <button
                  onClick={() => setIsAbsentWhatsAppModalOpen(true)}
                  className="flex-1 lg:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  title="غیر حاضر طلباء کے والدین کو واٹس ایپ الرٹ بھیجیں"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp Absent ({absentStudents.length})</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 100% RESPONSIVE STUDENT ATTENDANCE CARDS */}
        {/* On mobile: 1 card per row full width. P/A/L buttons large touch friendly 44px min height/width */}
        <div className="space-y-2.5">
          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
              <p className="font-semibold text-xs">Loading class students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
              <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-sm">No students found in Class {selectedClass}.</p>
              <p className="text-xs mt-1">Select another class or register new students.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredStudents.map((st) => {
                const status = attendanceMap[String(st.id)] || "Present";

                return (
                  <div
                    key={st.id}
                    className={`bg-white rounded-2xl p-3 sm:p-4 border transition-all duration-150 shadow-2xs hover:shadow-xs flex items-center justify-between gap-3 w-full ${
                      status === "Present"
                        ? "border-emerald-200 bg-emerald-50/15"
                        : status === "Absent"
                        ? "border-rose-200 bg-rose-50/15"
                        : "border-amber-200 bg-amber-50/15"
                    }`}
                  >
                    {/* Student Info */}
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                          status === "Present"
                            ? "bg-emerald-100 text-emerald-800"
                            : status === "Absent"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {st.avatar_url ? (
                          <img src={st.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          st.name.slice(0, 2).toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {st.name}
                          </h4>
                          <span className="font-mono text-[9px] text-slate-400 font-semibold shrink-0">
                            #{st.id}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          S/O {st.father_name || "N/A"} • Class {st.class}
                        </p>
                      </div>
                    </div>

                    {/* 3 Large Touch-Friendly Buttons: P / A / L + WhatsApp Alert */}
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                      {status === "Absent" && st.phone && (
                        <a
                          href={`https://wa.me/${formatPKWhatsAppPhone(st.phone)}?text=${encodeURIComponent(
                            `محترم والدین، آپ کا بچہ/بچی ${st.name} (کلاس ${st.class}) آج بتاریخ ${attendanceDate} سکول سے غیر حاضر ہے۔ برائے مہربانی سکول کو مطلع فرمائیں۔ شکریہ - ${schoolContext?.schoolName || "OA Smart School"}`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl font-bold text-xs flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs transition"
                          title="والدین کو واٹس ایپ الرٹ بھیجیں"
                        >
                          <MessageCircle className="w-5 h-5" />
                        </a>
                      )}

                      {/* P - Present */}
                      <button
                        onClick={() => handleSetStatus(st.id, "Present")}
                        className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl font-black text-sm flex items-center justify-center transition-all cursor-pointer shadow-2xs touch-manipulation ${
                          status === "Present"
                            ? "bg-emerald-600 text-white shadow-emerald-500/30 scale-105"
                            : "bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700"
                        }`}
                        title="Mark Present"
                      >
                        P
                      </button>

                      {/* A - Absent */}
                      <button
                        onClick={() => handleSetStatus(st.id, "Absent")}
                        className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl font-black text-sm flex items-center justify-center transition-all cursor-pointer shadow-2xs touch-manipulation ${
                          status === "Absent"
                            ? "bg-rose-600 text-white shadow-rose-500/30 scale-105"
                            : "bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                        }`}
                        title="Mark Absent"
                      >
                        A
                      </button>

                      {/* L - Leave */}
                      <button
                        onClick={() => handleSetStatus(st.id, "Leave")}
                        className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl font-black text-sm flex items-center justify-center transition-all cursor-pointer shadow-2xs touch-manipulation ${
                          status === "Leave"
                            ? "bg-amber-500 text-white shadow-amber-500/30 scale-105"
                            : "bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-700"
                        }`}
                        title="Mark Leave"
                      >
                        L
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* 100% RESPONSIVE STICKY BOTTOM SUMMARY BAR */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 sm:px-8 py-2.5 sm:py-3 shadow-[0_-4px_20px_rgb(0,0,0,0.06)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
          {/* Summary Counters (Wrapped & clean on small screens) */}
          <div className="flex items-center justify-around w-full sm:w-auto gap-3 sm:gap-6 text-center sm:text-left">
            <div>
              <span className="text-[9px] font-bold uppercase text-slate-400 block">Total</span>
              <span className="text-sm sm:text-base font-black text-slate-900">{summary.total}</span>
            </div>

            <div className="h-5 w-px bg-slate-200" />

            <div>
              <span className="text-[9px] font-bold uppercase text-emerald-600 block">Present</span>
              <span className="text-sm sm:text-base font-black text-emerald-600">{summary.present}</span>
            </div>

            <div className="h-5 w-px bg-slate-200" />

            <div>
              <span className="text-[9px] font-bold uppercase text-rose-600 block">Absent</span>
              <span className="text-sm sm:text-base font-black text-rose-600">{summary.absent}</span>
            </div>

            <div className="h-5 w-px bg-slate-200" />

            <div>
              <span className="text-[9px] font-bold uppercase text-amber-600 block">Leave</span>
              <span className="text-sm sm:text-base font-black text-amber-600">{summary.leave}</span>
            </div>

            <div className="h-5 w-px bg-slate-200" />

            <div>
              <span className="text-[9px] font-bold uppercase text-indigo-600 block">Rate</span>
              <span className="text-sm sm:text-base font-black text-indigo-700">{summary.rate}%</span>
            </div>
          </div>

          {/* Full-width save button on mobile */}
          <button
            onClick={handleSaveAttendance}
            disabled={saving || filteredStudents.length === 0}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Save className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
            <span>Save Attendance ({attendanceDate})</span>
          </button>
        </div>
      </footer>

      {/* WHATSAPP ABSENT ALERT MODAL */}
      {isAbsentWhatsAppModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in" dir="rtl">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-200" />
                <div>
                  <h3 className="text-sm font-black font-urdu">
                    غیر حاضر طلباء کے والدین کو واٹس ایپ الرٹ
                  </h3>
                  <p className="text-[10px] text-emerald-100">
                    تاریخ: {attendanceDate} • کل {absentStudents.length} طلباء غیر حاضر ہیں
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAbsentWhatsAppModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <p className="text-slate-600 font-medium">
                ہر طالب علم کے والدین کو سنگل کلک پر خودکار پیغام ارسال کریں:
              </p>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {absentStudents.map((st) => {
                  const phone = formatPKWhatsAppPhone(st.phone);
                  const msg = `محترم والدین، آپ کا بچہ/بچی ${st.name} (کلاس ${st.class}) آج بتاریخ ${attendanceDate} سکول سے غیر حاضر ہے۔ برائے مہربانی سکول کو غیر حاضری کی وجہ سے مطلع فرمائیں۔ شکریہ - ${schoolContext?.schoolName || "OA Smart School"}`;

                  return (
                    <div
                      key={st.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <h4 className="font-bold text-slate-900">{st.name}</h4>
                        <p className="text-[10px] text-slate-500 font-mono">
                          والد: {st.father_name || "N/A"} • فون: {st.phone || "کوئی فون درج نہیں"}
                        </p>
                      </div>

                      {phone ? (
                        <a
                          href={`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-xs transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>بھیجیں</span>
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400">فون نہیں ہے</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setIsAbsentWhatsAppModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold cursor-pointer"
                >
                  بند کریں
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
