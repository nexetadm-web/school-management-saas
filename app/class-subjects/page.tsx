"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveActiveSchoolContext } from "@/lib/school-context";
import { getTodayPKDate } from "@/lib/date-utils";
import {
  PAKISTAN_BOARD_SUBJECTS,
  STANDARD_SCHOOL_CLASSES,
  DEFAULT_CLASS_SUBJECT_MAP,
  getDefaultAssignedSubjectNames,
  normalizeClassName,
  SubjectItem,
} from "@/lib/subjects-data";
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Search,
  CheckSquare,
  Square,
  GraduationCap,
  BookOpen,
  Sparkles,
  Save,
  RotateCcw,
  RefreshCw,
  Layers,
  Award,
  ChevronRight,
  Filter,
} from "lucide-react";

export default function ClassWiseSubjectsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schoolContext, setSchoolContext] = useState<any>(null);

  // All available subjects
  const [allSubjects, setAllSubjects] = useState<SubjectItem[]>(PAKISTAN_BOARD_SUBJECTS);

  // Class Selection
  const [selectedClass, setSelectedClass] = useState<string>("Class 10");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // Map of ClassName -> Set of assigned Subject Names
  const [classAssignments, setClassAssignments] = useState<{ [className: string]: Set<string> }>({});

  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const todayPK = getTodayPKDate();

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const getStorageKey = (schoolId?: string | number | null) => {
    return `oa_class_subjects_${schoolId || "all"}`;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const ctx = await resolveActiveSchoolContext();
      setSchoolContext(ctx);

      // 1. Load custom subjects if any
      let subjectsList: SubjectItem[] = PAKISTAN_BOARD_SUBJECTS;
      try {
        const { data: dbSubs } = await supabase.from("subjects").select("*");
        if (dbSubs && dbSubs.length > 0) {
          subjectsList = dbSubs.map((s: any) => ({
            id: s.id,
            name: s.name,
            code: s.code || `${s.name.slice(0, 3).toUpperCase()}-101`,
            category: s.category || "Compulsory",
            total_marks: Number(s.total_marks || 100),
            passing_marks: Number(s.passing_marks || 33),
            classes: s.class ? s.class.split(",").map((c: string) => c.trim()) : [],
            description: s.description || "",
            school_id: s.school_id,
          }));
        }
      } catch (e) {}
      setAllSubjects(subjectsList);

      // 2. Load Class-wise assignments
      const initialMap: { [className: string]: Set<string> } = {};

      // Seed default assignments
      STANDARD_SCHOOL_CLASSES.forEach((cls) => {
        const defaults = getDefaultAssignedSubjectNames(cls);
        initialMap[cls] = new Set(defaults);
      });

      // Try Supabase class_subjects
      try {
        let query = supabase.from("class_subjects").select("*, subjects(name)");
        if (ctx.schoolId && ctx.schoolId !== "all") {
          query = query.eq("school_id", ctx.schoolId);
        }
        const { data: dbAssignments, error } = await query;
        if (!error && dbAssignments && dbAssignments.length > 0) {
          // Reset before applying DB mappings
          STANDARD_SCHOOL_CLASSES.forEach((cls) => {
            initialMap[cls] = new Set();
          });
          dbAssignments.forEach((item: any) => {
            const cls = item.class_name;
            const subName = item.subjects?.name || item.subject_name;
            if (cls && subName) {
              if (!initialMap[cls]) initialMap[cls] = new Set();
              initialMap[cls].add(subName);
            }
          });
        }
      } catch (dbErr) {
        // Fallback to localStorage
        const stored = typeof window !== "undefined" ? localStorage.getItem(getStorageKey(ctx.schoolId)) : null;
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            Object.keys(parsed).forEach((cls) => {
              initialMap[cls] = new Set(parsed[cls]);
            });
          } catch (e) {}
        }
      }

      setClassAssignments(initialMap);
    } catch (err: any) {
      console.error(err);
      showToast("error", err.message || "Failed to load subjects assignment.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Currently assigned subjects for the selected class
  const currentAssignedSet = useMemo(() => {
    return classAssignments[selectedClass] || new Set<string>();
  }, [classAssignments, selectedClass]);

  // Toggle single subject assignment
  const toggleSubject = (subjectName: string) => {
    const updatedMap = { ...classAssignments };
    const currentSet = new Set(updatedMap[selectedClass] || []);

    if (currentSet.has(subjectName)) {
      currentSet.delete(subjectName);
    } else {
      currentSet.add(subjectName);
    }

    updatedMap[selectedClass] = currentSet;
    setClassAssignments(updatedMap);
  };

  // Select all filtered subjects
  const selectAllFiltered = () => {
    const updatedMap = { ...classAssignments };
    const currentSet = new Set(updatedMap[selectedClass] || []);
    filteredSubjects.forEach((sub) => {
      currentSet.add(sub.name);
    });
    updatedMap[selectedClass] = currentSet;
    setClassAssignments(updatedMap);
  };

  // Deselect all filtered subjects
  const deselectAllFiltered = () => {
    const updatedMap = { ...classAssignments };
    const currentSet = new Set(updatedMap[selectedClass] || []);
    filteredSubjects.forEach((sub) => {
      currentSet.delete(sub.name);
    });
    updatedMap[selectedClass] = currentSet;
    setClassAssignments(updatedMap);
  };

  // Reset current class to Pakistan Board Standard
  const resetCurrentClass = () => {
    const defaults = getDefaultAssignedSubjectNames(selectedClass);
    const updatedMap = { ...classAssignments };
    updatedMap[selectedClass] = new Set(defaults);
    setClassAssignments(updatedMap);
    showToast("success", `Reset ${selectedClass} to standard Punjab/Federal board subjects.`);
  };

  // Save changes to DB and LocalStorage
  const handleSave = async () => {
    setSaving(true);
    const schoolId = schoolContext?.schoolId || 1;

    try {
      // 1. Save to LocalStorage
      const serializedMap: { [key: string]: string[] } = {};
      Object.keys(classAssignments).forEach((cls) => {
        serializedMap[cls] = Array.from(classAssignments[cls]);
      });

      if (typeof window !== "undefined") {
        localStorage.setItem(getStorageKey(schoolId), JSON.stringify(serializedMap));
      }

      // 2. Save to Supabase class_subjects
      try {
        // Delete current class mappings
        await supabase
          .from("class_subjects")
          .delete()
          .eq("school_id", schoolId)
          .eq("class_name", selectedClass);

        // Map subject names to IDs
        const nameToIdMap = new Map(allSubjects.map((s) => [s.name, s.id]));
        const batchToInsert: any[] = [];

        currentAssignedSet.forEach((subName) => {
          const subId = nameToIdMap.get(subName);
          if (subId) {
            batchToInsert.push({
              school_id: schoolId,
              class_name: selectedClass,
              subject_id: subId,
            });
          }
        });

        if (batchToInsert.length > 0) {
          await supabase.from("class_subjects").insert(batchToInsert);
        }
      } catch (dbErr) {
        // Safe to continue if schema table is pending
      }

      showToast("success", `Successfully saved ${currentAssignedSet.size} subjects for ${selectedClass}!`);
    } catch (err: any) {
      console.error(err);
      showToast("error", err.message || "Failed to save class subjects.");
    } finally {
      setSaving(false);
    }
  };

  // Filtered Subjects
  const filteredSubjects = useMemo(() => {
    return allSubjects.filter((sub) => {
      const matchesCategory =
        categoryFilter === "All" || sub.category.toLowerCase() === categoryFilter.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        sub.name.toLowerCase().includes(q) ||
        (sub.code && sub.code.toLowerCase().includes(q)) ||
        (sub.description && sub.description.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [allSubjects, categoryFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-24">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 sm:py-3.5 shadow-xs no-print overflow-visible">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4 overflow-visible">
          {/* Left Title & Breadcrumbs */}
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
                <span>Dashboard</span>
              </Link>
              <div className="h-4 w-px bg-slate-200" />
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Pakistan Board Curriculum
              </span>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 tracking-tight leading-tight">
                    کلاس کے مضامین سیٹ کریں
                  </h1>
                  <span className="text-xs text-slate-400 font-medium hidden sm:inline">•</span>
                  <span className="text-xs font-bold text-slate-600 hidden sm:inline">
                    Class-Wise Subjects Assignment
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden md:block">
                  Assign relevant courses per class so PG doesn't show 25 subjects and Class 10 has exact matric syllabus
                </p>
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 md:pb-0 scrollbar-none w-full md:w-auto shrink-0 justify-end">
            <button
              onClick={resetCurrentClass}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer"
              title="Reset this class to standard Pakistan Board syllabus"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
              <span>Reset to Board Standard</span>
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20 transition cursor-pointer"
            >
              <Save className={`w-3.5 h-3.5 ${saving ? "animate-spin" : ""}`} />
              <span>{saving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
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

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Vertical Class Cards List (4 Cols on LG) */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-emerald-600" />
                  Select Class
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {STANDARD_SCHOOL_CLASSES.length} Classes
                </span>
              </div>

              {/* Class List */}
              <div className="space-y-1.5 mt-3 max-h-[60vh] lg:max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin">
                {STANDARD_SCHOOL_CLASSES.map((cls) => {
                  const isSelected = selectedClass === cls;
                  const assignedCount = (classAssignments[cls] || new Set()).size;

                  return (
                    <button
                      key={cls}
                      onClick={() => setSelectedClass(cls)}
                      className={`w-full p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer text-left ${
                        isSelected
                          ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-400 text-emerald-950 font-bold shadow-xs"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isSelected
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {cls.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-tight">{cls}</p>
                          <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                            {cls.startsWith("Class") ? "Standard Grade" : "Pre-Primary"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            assignedCount > 0
                              ? isSelected
                                ? "bg-emerald-200/70 text-emerald-900"
                                : "bg-slate-100 text-slate-700"
                              : "bg-rose-50 text-rose-600"
                          }`}
                        >
                          {assignedCount} {assignedCount === 1 ? "Subject" : "Subjects"}
                        </span>
                        <ChevronRight
                          className={`w-3.5 h-3.5 ${
                            isSelected ? "text-emerald-600" : "text-slate-300"
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Subjects Checkboxes Matrix (8 Cols on LG) */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            {/* Header / Filter Card for Selected Class */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Class Select Dropdown */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-700 shrink-0">Class:</label>
                      <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                      >
                        {STANDARD_SCHOOL_CLASSES.map((c) => (
                          <option key={c} value={c} className="bg-white text-slate-800">
                            {c} ({(classAssignments[c] || new Set()).size} Subjects)
                          </option>
                        ))}
                      </select>
                    </div>

                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                      مضامین منتخب کریں ({currentAssignedSet.size} Selected)
                    </h2>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Select courses taught to students of {selectedClass}. Only ticked subjects will show in Marks Entry & Report Cards.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={selectAllFiltered}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Select All</span>
                  </button>
                  <button
                    onClick={deselectAllFiltered}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1"
                  >
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {/* Search & Category Pills */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search subject by name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {["All", "Compulsory", "Science", "Arts / Humanities", "Commerce", "Languages"].map(
                    (cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                          categoryFilter === cat
                            ? "bg-slate-900 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* SUBJECTS CHECKBOX GRID: grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 */}
            {filteredSubjects.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
                <BookOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-xs">No subjects match the search filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredSubjects.map((sub) => {
                  const isChecked = currentAssignedSet.has(sub.name);

                  const categoryColor =
                    sub.category === "Compulsory"
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                      : sub.category === "Science"
                      ? "text-sky-700 bg-sky-50 border-sky-200"
                      : sub.category === "Commerce"
                      ? "text-amber-700 bg-amber-50 border-amber-200"
                      : sub.category === "Languages"
                      ? "text-purple-700 bg-purple-50 border-purple-200"
                      : "text-indigo-700 bg-indigo-50 border-indigo-200";

                  return (
                    <div
                      key={sub.id}
                      onClick={() => toggleSubject(sub.name)}
                      className={`relative rounded-2xl p-3.5 border-2 transition-all cursor-pointer flex flex-col justify-between shadow-2xs select-none ${
                        isChecked
                          ? "bg-gradient-to-br from-emerald-50/70 to-white border-emerald-500 shadow-sm shadow-emerald-500/10"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <div>
                        {/* Top Row: Checkbox Icon + Category Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                              isChecked
                                ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                                : "bg-white border-slate-300 text-transparent"
                            }`}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </div>

                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border truncate max-w-[130px] ${categoryColor}`}
                          >
                            {sub.category}
                          </span>
                        </div>

                        {/* Subject Title & Code */}
                        <div className="mt-2.5">
                          <h3
                            className={`text-xs font-bold leading-tight ${
                              isChecked ? "text-emerald-950 font-black" : "text-slate-900"
                            }`}
                          >
                            {sub.name}
                          </h3>
                          <p className="text-[10px] font-mono font-medium text-slate-400 mt-0.5">
                            Code: {sub.code}
                          </p>
                        </div>
                      </div>

                      {/* Bottom Info: Marks Breakdown */}
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span className="font-bold text-slate-700">
                          Total: <strong className="text-slate-900">{sub.total_marks}</strong>
                        </span>
                        <span className="font-semibold text-emerald-600">
                          Pass: {sub.passing_marks}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating Bottom Save Bar on Mobile / Desktop */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-lg z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-800">
              {selectedClass}: <strong className="text-emerald-600">{currentAssignedSet.size}</strong> Subjects Assigned
            </span>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-500/25 transition cursor-pointer flex items-center gap-1.5"
          >
            <Save className={`w-3.5 h-3.5 ${saving ? "animate-spin" : ""}`} />
            <span>{saving ? "Saving Changes..." : "Save Class Subjects"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
