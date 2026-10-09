"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveActiveSchoolContext } from "@/lib/school-context";
import { getTodayPKDate } from "@/lib/date-utils";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  ArrowLeft,
  FileText,
  Printer,
  Download,
  Plus,
  Save,
  CheckCircle,
  AlertCircle,
  Award,
  Trophy,
  GraduationCap,
  Sparkles,
  Search,
  Filter,
  Check,
  X,
  Eye,
  RefreshCw,
  LayoutGrid,
  CreditCard,
  ChevronRight,
  MoveHorizontal,
} from "lucide-react";

interface Student {
  id: number | string;
  name: string;
  class: string;
  father_name?: string | null;
  phone?: string | null;
  school_id?: number | string;
}

interface Exam {
  id: number | string;
  exam_name: string;
  term?: string;
  class?: string;
  date?: string;
  school_id?: number | string;
}

interface Subject {
  id: number | string;
  name: string;
  total_marks: number;
}

const DEFAULT_SUBJECTS: Subject[] = [
  { id: 1, name: "English", total_marks: 100 },
  { id: 2, name: "Urdu", total_marks: 100 },
  { id: 3, name: "Mathematics", total_marks: 100 },
  { id: 4, name: "General Science", total_marks: 100 },
  { id: 5, name: "Islamiyat", total_marks: 100 },
  { id: 6, name: "Social Studies", total_marks: 100 },
];

export default function ExamsAndReportCardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schoolContext, setSchoolContext] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>(DEFAULT_SUBJECTS);
  const [marksMap, setMarksMap] = useState<{ [key: string]: number }>({});

  // Filters & State
  const [selectedClass, setSelectedClass] = useState<string>("Play");
  const [selectedExamId, setSelectedExamId] = useState<string | number>("1");
  const [activeTab, setActiveTab] = useState<"marks" | "reports">("marks");
  const [marksViewMode, setMarksViewMode] = useState<"table" | "cards">("table");
  const [singleStudentReport, setSingleStudentReport] = useState<Student | null>(null);
  const [searchStudent, setSearchStudent] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New Exam Modal
  const [showNewExamModal, setShowNewExamModal] = useState(false);
  const [newExamName, setNewExamName] = useState("");

  const reportCardPrintRef = useRef<HTMLDivElement>(null);
  const todayPK = getTodayPKDate();

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const ctx = await resolveActiveSchoolContext();
      setSchoolContext(ctx);

      // 1. Fetch Students
      let query = supabase.from("students").select("*").order("name", { ascending: true });
      if (ctx.schoolId && ctx.schoolId !== "all") {
        query = query.eq("school_id", ctx.schoolId);
      }
      const { data: studentsData } = await query;
      const studentList: Student[] = studentsData || [];
      setStudents(studentList);

      if (studentList.length > 0) {
        const availableClasses = Array.from(new Set(studentList.map((s) => s.class)));
        if (availableClasses.length > 0 && !availableClasses.includes(selectedClass)) {
          setSelectedClass(availableClasses[0]);
        }
      }

      // 2. Load Exams
      let loadedExams: Exam[] = [];
      try {
        const { data: dbExams, error: examErr } = await supabase.from("exams").select("*");
        if (!examErr && dbExams && dbExams.length > 0) {
          loadedExams = dbExams;
        }
      } catch (e) {}

      if (loadedExams.length === 0) {
        const localKey = `oa_school_exams_${ctx.schoolId || "default"}`;
        const stored = typeof window !== "undefined" ? localStorage.getItem(localKey) : null;
        if (stored) {
          loadedExams = JSON.parse(stored);
        } else {
          loadedExams = [
            { id: 1, exam_name: "Monthly Test - October 2026", date: todayPK },
            { id: 2, exam_name: "First Term Examination 2026", date: todayPK },
            { id: 3, exam_name: "Mid Term Assessment 2026", date: todayPK },
          ];
        }
      }
      setExams(loadedExams);
      if (loadedExams.length > 0) {
        setSelectedExamId(loadedExams[0].id);
      }

      loadSavedMarks(loadedExams[0]?.id || "1", ctx.schoolId);
    } catch (err: any) {
      console.error(err);
      showToast("error", err.message || "Failed to load examination data");
    } finally {
      setLoading(false);
    }
  };

  const loadSavedMarks = async (examId: string | number, schoolId: any) => {
    try {
      const markStoreKey = `oa_school_marks_${schoolId || "all"}_exam_${examId}`;
      const stored = typeof window !== "undefined" ? localStorage.getItem(markStoreKey) : null;
      if (stored) {
        setMarksMap(JSON.parse(stored));
      } else {
        const initialMarks: { [key: string]: number } = {};
        students.forEach((s) => {
          subjects.forEach((sub) => {
            const key = `${s.id}_${sub.id}`;
            const pseudoScore = 60 + ((Number(s.id) * 7 + Number(sub.id) * 11) % 35);
            initialMarks[key] = pseudoScore;
          });
        });
        setMarksMap(initialMarks);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const classStudents = useMemo(() => {
    return students.filter(
      (s) => s.class.toLowerCase().trim() === selectedClass.toLowerCase().trim()
    );
  }, [students, selectedClass]);

  const classOptions = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.class) set.add(s.class);
    });
    return Array.from(set).sort();
  }, [students]);

  const handleMarkChange = (studentId: string | number, subjectId: string | number, val: string) => {
    const num = Math.min(100, Math.max(0, parseFloat(val) || 0));
    setMarksMap((prev) => ({
      ...prev,
      [`${studentId}_${subjectId}`]: num,
    }));
  };

  const handleSaveMarks = async () => {
    try {
      setSaving(true);
      const markStoreKey = `oa_school_marks_${schoolContext?.schoolId || "all"}_exam_${selectedExamId}`;
      if (typeof window !== "undefined") {
        localStorage.setItem(markStoreKey, JSON.stringify(marksMap));
      }

      try {
        const rows: any[] = [];
        classStudents.forEach((st) => {
          subjects.forEach((sub) => {
            const obtained = marksMap[`${st.id}_${sub.id}`] ?? 0;
            rows.push({
              school_id: schoolContext?.schoolId === "all" ? 1 : schoolContext?.schoolId,
              student_id: st.id,
              exam_id: selectedExamId,
              subject_id: sub.id,
              total_marks: sub.total_marks,
              obtained_marks: obtained,
            });
          });
        });
        await supabase.from("marks").upsert(rows, { onConflict: "school_id,student_id,exam_id,subject_id" });
      } catch (err) {}

      showToast("success", "Examination marks saved successfully!");
    } catch (err: any) {
      showToast("error", "Failed to save marks.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewExam = () => {
    if (!newExamName.trim()) {
      showToast("error", "Please enter an exam title.");
      return;
    }
    const newId = Date.now();
    const newExamItem: Exam = {
      id: newId,
      exam_name: newExamName.trim(),
      date: todayPK,
    };
    const updated = [newExamItem, ...exams];
    setExams(updated);
    setSelectedExamId(newId);

    const localKey = `oa_school_exams_${schoolContext?.schoolId || "default"}`;
    if (typeof window !== "undefined") {
      localStorage.setItem(localKey, JSON.stringify(updated));
    }

    setNewExamName("");
    setShowNewExamModal(false);
    showToast("success", `Exam "${newExamItem.exam_name}" created!`);
  };

  const getStudentStats = (studentId: string | number) => {
    let obtainedTotal = 0;
    let maxTotal = 0;
    const subjectBreakdown: Array<{ name: string; total: number; obtained: number; grade: string }> = [];

    subjects.forEach((sub) => {
      const score = marksMap[`${studentId}_${sub.id}`] ?? 0;
      obtainedTotal += score;
      maxTotal += sub.total_marks;

      let subGrade = "F";
      const pct = (score / sub.total_marks) * 100;
      if (pct >= 85) subGrade = "A+";
      else if (pct >= 75) subGrade = "A";
      else if (pct >= 65) subGrade = "B";
      else if (pct >= 50) subGrade = "C";
      else if (pct >= 40) subGrade = "D";

      subjectBreakdown.push({
        name: sub.name,
        total: sub.total_marks,
        obtained: score,
        grade: subGrade,
      });
    });

    const percentage = maxTotal > 0 ? (obtainedTotal / maxTotal) * 100 : 0;
    let overallGrade = "F";
    if (percentage >= 85) overallGrade = "A+";
    else if (percentage >= 75) overallGrade = "A";
    else if (percentage >= 65) overallGrade = "B";
    else if (percentage >= 50) overallGrade = "C";
    else if (percentage >= 40) overallGrade = "D";

    return {
      obtainedTotal,
      maxTotal,
      percentage: Number(percentage.toFixed(1)),
      overallGrade,
      subjectBreakdown,
    };
  };

  const rankedStudents = useMemo(() => {
    const list = classStudents.map((s) => {
      const stats = getStudentStats(s.id);
      return {
        ...s,
        ...stats,
      };
    });

    list.sort((a, b) => b.obtainedTotal - a.obtainedTotal);

    return list.map((item, idx) => ({
      ...item,
      position: idx + 1,
    }));
  }, [classStudents, marksMap, subjects]);

  const currentExamObj = exams.find((e) => String(e.id) === String(selectedExamId));
  const schoolTitle = schoolContext?.schoolName || "OA SMART SCHOOL SYSTEM";
  const schoolAddress = schoolContext?.schoolAddress || "Main Campus, Education Hub";

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-16">
      {/* Print Styles for Official Report Card */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            color: black !important;
          }
          header,
          .no-print {
            display: none !important;
          }
          .report-card-container {
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 12mm 15mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: 2px solid #1e3a5f !important;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      {/* 100% RESPONSIVE TOP HEADER */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 sm:py-3.5 shadow-xs no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <Link
              href="/"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xs sm:text-base font-bold text-slate-900 tracking-tight truncate">
                  Exams & Report Cards
                </h1>
                <p className="text-[10px] text-slate-400 hidden md:block truncate">
                  {schoolTitle} • Academic Assessment
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                setActiveTab("reports");
                setTimeout(() => window.print(), 200);
              }}
              disabled={classStudents.length === 0}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>Print All Cards</span>
            </button>

            <button
              onClick={handleSaveMarks}
              disabled={saving || classStudents.length === 0}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition cursor-pointer"
            >
              <Save className={`w-3.5 h-3.5 shrink-0 ${saving ? "animate-spin" : ""}`} />
              <span>{saving ? "Saving" : "Save Marks"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Toast Alert */}
        {toast && (
          <div
            className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold animate-in fade-in no-print ${
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

        {/* Filter and Exam Selection Header Card (No-print) */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs space-y-3 no-print">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto">
              {/* Select Class */}
              <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Class:</span>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer w-full sm:w-auto"
                >
                  {classOptions.map((c) => (
                    <option key={c} value={c}>
                      Class {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Exam */}
              <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Exam:</span>
                <select
                  value={selectedExamId}
                  onChange={(e) => {
                    setSelectedExamId(e.target.value);
                    loadSavedMarks(e.target.value, schoolContext?.schoolId);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[200px] truncate"
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.exam_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Create New Exam Button */}
              <button
                onClick={() => setShowNewExamModal(true)}
                className="px-2.5 py-1.5 rounded-xl border border-dashed border-indigo-300 text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Exam</span>
              </button>
            </div>

            {/* Navigation Tabs: Enter Marks vs Report Cards */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full lg:w-auto">
              <button
                onClick={() => setActiveTab("marks")}
                className={`flex-1 lg:flex-initial px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                  activeTab === "marks"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                1. Marks Entry
              </button>
              <button
                onClick={() => setActiveTab("reports")}
                className={`flex-1 lg:flex-initial px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                  activeTab === "reports"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                2. Report Cards ({rankedStudents.length})
              </button>
            </div>
          </div>
        </div>

        {/* TAB 1: ENTER MARKS GRID & CARDS */}
        {activeTab === "marks" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden no-print space-y-0">
            {/* Table / Card Header Controls */}
            <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  Marks Entry — Class {selectedClass} ({classStudents.length} Students)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Exam: {currentExamObj?.exam_name} • Scores out of 100 per subject
                </p>
              </div>

              {/* View Switcher: Matrix Table vs Cards */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-200/60 p-0.5 rounded-lg text-xs font-bold">
                  <button
                    onClick={() => setMarksViewMode("table")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      marksViewMode === "table" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Table Grid
                  </button>
                  <button
                    onClick={() => setMarksViewMode("cards")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      marksViewMode === "cards" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Mobile Cards
                  </button>
                </div>

                <button
                  onClick={handleSaveMarks}
                  disabled={saving || classStudents.length === 0}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 cursor-pointer shadow-xs shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              </div>
            </div>

            {/* Horizontal Scroll Hint for Mobile Users on Table View */}
            {marksViewMode === "table" && (
              <div className="sm:hidden px-3 py-1.5 bg-amber-50 border-b border-amber-200/60 text-[11px] text-amber-800 font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <MoveHorizontal className="w-3.5 h-3.5 text-amber-600" />
                  Swipe table horizontally to enter subjects
                </span>
                <span className="text-[10px] text-amber-600 underline cursor-pointer" onClick={() => setMarksViewMode("cards")}>
                  Switch to Cards
                </span>
              </div>
            )}

            {/* 1. TABLE GRID VIEW WITH STICKY LEFT COLUMNS AND OVERFLOW-X-AUTO */}
            {marksViewMode === "table" && (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse text-xs min-w-[780px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider bg-slate-50/80">
                      <th className="py-2.5 px-3 w-12 text-center sticky left-0 bg-slate-50 z-10 shadow-r">
                        Roll
                      </th>
                      <th className="py-2.5 px-3 w-40 sticky left-12 bg-slate-50 z-10 shadow-r">
                        Student Name
                      </th>
                      {subjects.map((sub) => (
                        <th key={sub.id} className="py-2.5 px-2 text-center min-w-[85px]">
                          {sub.name}
                          <span className="block text-[9px] text-slate-400 font-normal">/100</span>
                        </th>
                      ))}
                      <th className="py-2.5 px-3 text-center font-black text-slate-700">Total</th>
                      <th className="py-2.5 px-3 text-center font-black text-slate-700">%</th>
                      <th className="py-2.5 px-3 text-center font-black text-slate-700">Grade</th>
                      <th className="py-2.5 px-3 text-center">Card</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classStudents.length === 0 ? (
                      <tr>
                        <td colSpan={subjects.length + 6} className="py-12 text-center text-slate-400">
                          No students enrolled in Class {selectedClass}.
                        </td>
                      </tr>
                    ) : (
                      classStudents.map((st) => {
                        const stats = getStudentStats(st.id);

                        return (
                          <tr key={st.id} className="hover:bg-indigo-50/20 transition-colors">
                            {/* Sticky Roll Number */}
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500 sticky left-0 bg-white z-10 border-r border-slate-100">
                              #{st.id}
                            </td>

                            {/* Sticky Student Name */}
                            <td className="py-2.5 px-3 font-bold text-slate-900 sticky left-12 bg-white z-10 border-r border-slate-100">
                              <p className="truncate max-w-[130px]">{st.name}</p>
                              <span className="text-[10px] text-slate-400 font-normal truncate block">
                                S/O {st.father_name || "N/A"}
                              </span>
                            </td>

                            {/* Subject Marks Input Cells */}
                            {subjects.map((sub) => {
                              const val = marksMap[`${st.id}_${sub.id}`] ?? "";

                              return (
                                <td key={sub.id} className="py-2 px-1.5 text-center">
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={val}
                                    onChange={(e) => handleMarkChange(st.id, sub.id, e.target.value)}
                                    className="w-16 px-1.5 py-1 text-center font-bold text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-500"
                                  />
                                </td>
                              );
                            })}

                            <td className="py-2.5 px-3 text-center font-black text-slate-900">
                              {stats.obtainedTotal}
                            </td>

                            <td className="py-2.5 px-3 text-center font-bold text-indigo-700">
                              {stats.percentage}%
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  stats.overallGrade === "A+" || stats.overallGrade === "A"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : stats.overallGrade === "B"
                                    ? "bg-blue-100 text-blue-800"
                                    : stats.overallGrade === "C"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {stats.overallGrade}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => {
                                  setSingleStudentReport(st);
                                  setActiveTab("reports");
                                }}
                                className="p-1 rounded-md text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                                title="View Report Card"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. MOBILE STUDENT CARDS VIEW (Effortless phone typing) */}
            {marksViewMode === "cards" && (
              <div className="p-3 sm:p-4 space-y-3">
                {classStudents.map((st) => {
                  const stats = getStudentStats(st.id);

                  return (
                    <div
                      key={st.id}
                      className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{st.name}</h4>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Roll #{st.id} • S/O {st.father_name || "N/A"}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-indigo-700">
                            {stats.percentage}% ({stats.overallGrade})
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Total: {stats.obtainedTotal}/{stats.maxTotal}
                          </span>
                        </div>
                      </div>

                      {/* Subject Inputs Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {subjects.map((sub) => {
                          const val = marksMap[`${st.id}_${sub.id}`] ?? "";

                          return (
                            <div key={sub.id} className="bg-white p-2 rounded-xl border border-slate-200">
                              <label className="text-[10px] font-bold text-slate-500 uppercase block truncate">
                                {sub.name}
                              </label>
                              <div className="flex items-center gap-1 mt-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={val}
                                  onChange={(e) => handleMarkChange(st.id, sub.id, e.target.value)}
                                  className="w-full px-2 py-1 text-center font-bold text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white"
                                />
                                <span className="text-[10px] text-slate-400">/100</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CLASS POSITIONS & REPORT CARDS */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            {/* Top 3 Positions Podium Cards (No-print) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 no-print">
              {rankedStudents.slice(0, 3).map((st, idx) => (
                <div
                  key={st.id}
                  className={`bg-white rounded-2xl p-4 sm:p-5 border shadow-xs relative overflow-hidden ${
                    idx === 0
                      ? "border-amber-300 bg-gradient-to-b from-amber-50/40 to-white"
                      : idx === 1
                      ? "border-slate-300 bg-gradient-to-b from-slate-50 to-white"
                      : "border-orange-300 bg-gradient-to-b from-orange-50/30 to-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Class {selectedClass} Position
                    </span>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                        idx === 0
                          ? "bg-amber-400 text-amber-950 shadow-xs"
                          : idx === 1
                          ? "bg-slate-300 text-slate-800"
                          : "bg-orange-300 text-orange-950"
                      }`}
                    >
                      #{st.position}
                    </div>
                  </div>

                  <h3 className="text-base font-black text-slate-900 mt-2 truncate">{st.name}</h3>
                  <p className="text-xs text-slate-500 truncate">Father: {st.father_name || "N/A"}</p>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Total Marks</span>
                      <strong className="text-slate-900 font-black">
                        {st.obtainedTotal} / {st.maxTotal}
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] block">Percentage</span>
                      <strong className="text-emerald-600 font-black text-sm">{st.percentage}%</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Individual Printable Report Cards */}
            <div ref={reportCardPrintRef} className="space-y-8">
              {(singleStudentReport ? [rankedStudents.find((s) => s.id === singleStudentReport.id) || rankedStudents[0]] : rankedStudents).map((student) => {
                if (!student) return null;

                return (
                  <div
                    key={student.id}
                    className="report-card-container bg-white mx-auto shadow-md border-2 border-slate-800 rounded-2xl p-5 sm:p-8 max-w-[210mm] relative space-y-5"
                    style={{ minHeight: "270mm", boxSizing: "border-box" }}
                  >
                    {/* Official Dynamic School Header */}
                    <div className="border-b-2 border-slate-800 pb-3 text-center relative">
                      <div className="flex items-center justify-center gap-3 mb-1.5">
                        <div className="w-11 h-11 rounded-full bg-[#f1c40f] text-[#1e3a5f] font-black text-lg flex items-center justify-center shadow-md">
                          OA
                        </div>
                        <div>
                          <h1 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-wide">
                            {schoolTitle}
                          </h1>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {schoolAddress}
                          </p>
                        </div>
                      </div>

                      <div className="inline-block px-4 py-0.5 bg-slate-900 text-white rounded-full text-[11px] font-bold uppercase tracking-wider">
                        {currentExamObj?.exam_name || "Annual Examination Progress Card"}
                      </div>
                    </div>

                    {/* Student Info Box */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px]">Student Name:</span>
                        <strong className="text-slate-900 text-xs sm:text-sm truncate block">{student.name}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px]">Father Name:</span>
                        <span className="text-slate-800 font-medium truncate block">{student.father_name || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px]">Class & Roll:</span>
                        <strong className="text-slate-800 font-bold">
                          Class {student.class} • #{student.id}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block text-[10px]">Issue Date:</span>
                        <strong className="text-slate-800 font-mono">{todayPK}</strong>
                      </div>
                    </div>

                    {/* Subject-Wise Marks Breakdown Table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                            <th className="py-2 px-3 sm:px-4">Subject</th>
                            <th className="py-2 px-2 text-center">Max Marks</th>
                            <th className="py-2 px-2 text-center">Pass</th>
                            <th className="py-2 px-2 text-center font-black">Obtained</th>
                            <th className="py-2 px-2 text-center">Grade</th>
                            <th className="py-2 px-3 text-right">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {student.subjectBreakdown.map((sub, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="py-2 px-3 sm:px-4 font-bold text-slate-900">{sub.name}</td>
                              <td className="py-2 px-2 text-center text-slate-600">{sub.total}</td>
                              <td className="py-2 px-2 text-center text-slate-500">40</td>
                              <td className="py-2 px-2 text-center font-black text-slate-900">
                                {sub.obtained}
                              </td>
                              <td className="py-2 px-2 text-center font-bold">
                                {sub.grade}
                              </td>
                              <td className="py-2 px-3 text-right text-slate-500 text-[11px]">
                                {sub.obtained >= 75 ? "Excellent" : sub.obtained >= 50 ? "Good" : "Needs Help"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Grand Summary Box */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-gradient-to-r from-indigo-50 via-slate-50 to-emerald-50 p-3.5 rounded-xl border border-indigo-200 text-center">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Marks</span>
                        <strong className="text-sm sm:text-base font-black text-slate-900">
                          {student.obtainedTotal} / {student.maxTotal}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">Percentage</span>
                        <strong className="text-sm sm:text-base font-black text-indigo-700">
                          {student.percentage}%
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">Grade</span>
                        <strong className="text-sm sm:text-base font-black text-emerald-700">
                          {student.overallGrade}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">Class Position</span>
                        <strong className="text-sm sm:text-base font-black text-amber-700">
                          {student.position === 1
                            ? "1st Position 🏆"
                            : student.position === 2
                            ? "2nd Position 🥈"
                            : student.position === 3
                            ? "3rd Position 🥉"
                            : `${student.position}th Position`}
                        </strong>
                      </div>
                    </div>

                    {/* Official Signatures Row */}
                    <div className="pt-8 flex items-center justify-between text-xs text-slate-600 border-t border-slate-200 mt-6">
                      <div className="text-center">
                        <div className="border-b border-slate-400 w-28 sm:w-36 mb-1" />
                        <span className="font-semibold text-[10px]">Class Teacher</span>
                      </div>
                      <div className="text-center">
                        <div className="border-b border-slate-400 w-28 sm:w-36 mb-1" />
                        <span className="font-semibold text-[10px]">Controller Exam</span>
                      </div>
                      <div className="text-center">
                        <div className="border-b border-slate-400 w-28 sm:w-36 mb-1" />
                        <span className="font-semibold text-[10px]">Principal Stamp</span>
                      </div>
                    </div>

                    {/* Single Print Bar (No-print) */}
                    <div className="no-print pt-2 flex items-center justify-between">
                      {singleStudentReport && (
                        <button
                          onClick={() => setSingleStudentReport(null)}
                          className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                        >
                          ← View All Class Cards
                        </button>
                      )}
                      <button
                        onClick={() => window.print()}
                        className="ml-auto px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-indigo-700 cursor-pointer flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Report Card</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* NEW EXAM CREATION MODAL */}
      {showNewExamModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Create New Examination</h3>
              <button
                onClick={() => setShowNewExamModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 block">Exam Title</label>
              <input
                type="text"
                placeholder="e.g. Monthly Test - November 2026"
                value={newExamName}
                onChange={(e) => setNewExamName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNewExamModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewExam}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer"
              >
                Create Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
