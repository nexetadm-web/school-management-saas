"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveActiveSchoolContext } from "@/lib/school-context";
import { getTodayPKDate } from "@/lib/date-utils";
import {
  PAKISTAN_BOARD_SUBJECTS,
  SUBJECT_CATEGORIES,
  SubjectItem,
} from "@/lib/subjects-data";
import {
  ArrowLeft,
  BookOpen,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  GraduationCap,
  Layers,
  Award,
  BookMarked,
  X,
  Save,
  RotateCcw,
} from "lucide-react";

export default function SubjectsManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schoolContext, setSchoolContext] = useState<any>(null);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formCategory, setFormCategory] = useState<SubjectItem["category"]>("Compulsory");
  const [formTotalMarks, setFormTotalMarks] = useState(100);
  const [formPassingMarks, setFormPassingMarks] = useState(33);
  const [formDescription, setFormDescription] = useState("");
  const [formClasses, setFormClasses] = useState<string>("9th, 10th");

  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const todayPK = getTodayPKDate();

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const getStorageKey = (schoolId?: string | number | null) => {
    return `oa_school_subjects_${schoolId || "all"}`;
  };

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const ctx = await resolveActiveSchoolContext();
      setSchoolContext(ctx);

      let loadedList: SubjectItem[] = [];

      // 1. Try Supabase
      try {
        let query = supabase.from("subjects").select("*").order("id", { ascending: true });
        if (ctx.schoolId && ctx.schoolId !== "all") {
          query = query.eq("school_id", ctx.schoolId);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          loadedList = data.map((d: any) => ({
            id: d.id,
            name: d.name,
            code: d.code || `${d.name.slice(0, 3).toUpperCase()}-101`,
            category: d.category || "Compulsory",
            total_marks: Number(d.total_marks || 100),
            passing_marks: Number(d.passing_marks || 33),
            classes: d.class ? d.class.split(",").map((c: string) => c.trim()) : ["All Classes"],
            description: d.description || "",
            school_id: d.school_id,
          }));
        }
      } catch (dbErr) {
        console.warn("Supabase fetch failed, falling back to local storage", dbErr);
      }

      // 2. Try localStorage if DB returned empty
      if (loadedList.length === 0) {
        const localKey = getStorageKey(ctx.schoolId);
        const stored = typeof window !== "undefined" ? localStorage.getItem(localKey) : null;
        if (stored) {
          try {
            loadedList = JSON.parse(stored);
          } catch (e) {}
        }
      }

      // 3. Fallback to default 21 Pakistan Board Subjects
      if (loadedList.length === 0) {
        loadedList = PAKISTAN_BOARD_SUBJECTS.map((s) => ({
          ...s,
          school_id: ctx.schoolId || 1,
        }));
        if (typeof window !== "undefined") {
          localStorage.setItem(getStorageKey(ctx.schoolId), JSON.stringify(loadedList));
        }
      }

      setSubjects(loadedList);
    } catch (err: any) {
      console.error(err);
      showToast("error", err.message || "Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const persistSubjects = async (newList: SubjectItem[]) => {
    setSubjects(newList);
    const schoolId = schoolContext?.schoolId || 1;
    // Local storage persistence
    if (typeof window !== "undefined") {
      localStorage.setItem(getStorageKey(schoolId), JSON.stringify(newList));
    }

    // Attempt Supabase sync
    try {
      const recordsToUpsert = newList.map((item) => ({
        school_id: schoolId,
        name: item.name,
        code: item.code,
        category: item.category,
        total_marks: item.total_marks,
        passing_marks: item.passing_marks,
        class: item.classes ? item.classes.join(", ") : "All Classes",
      }));
      await supabase.from("subjects").upsert(recordsToUpsert, { onConflict: "school_id,name" });
    } catch (e) {
      // Graceful fallback to localStorage
    }
  };

  const handleOpenAddModal = () => {
    setEditingSubject(null);
    setFormName("");
    setFormCode("");
    setFormCategory("Compulsory");
    setFormTotalMarks(100);
    setFormPassingMarks(33);
    setFormDescription("");
    setFormClasses("9th, 10th");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sub: SubjectItem) => {
    setEditingSubject(sub);
    setFormName(sub.name);
    setFormCode(sub.code || "");
    setFormCategory(sub.category || "Compulsory");
    setFormTotalMarks(sub.total_marks || 100);
    setFormPassingMarks(sub.passing_marks || 33);
    setFormDescription(sub.description || "");
    setFormClasses(sub.classes ? sub.classes.join(", ") : "9th, 10th");
    setIsModalOpen(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast("error", "Please provide a valid subject name.");
      return;
    }

    setSaving(true);
    try {
      const classArr = formClasses
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      if (editingSubject) {
        // Edit existing
        const updated = subjects.map((s) => {
          if (s.id === editingSubject.id) {
            return {
              ...s,
              name: formName.trim(),
              code: formCode.trim() || `${formName.trim().slice(0, 3).toUpperCase()}-101`,
              category: formCategory,
              total_marks: Number(formTotalMarks),
              passing_marks: Number(formPassingMarks),
              description: formDescription.trim(),
              classes: classArr.length > 0 ? classArr : ["All Classes"],
            };
          }
          return s;
        });
        await persistSubjects(updated);
        showToast("success", `Updated subject "${formName.trim()}" successfully!`);
      } else {
        // Create new
        const newSub: SubjectItem = {
          id: Date.now(),
          school_id: schoolContext?.schoolId || 1,
          name: formName.trim(),
          code: formCode.trim() || `${formName.trim().slice(0, 3).toUpperCase()}-101`,
          category: formCategory,
          total_marks: Number(formTotalMarks),
          passing_marks: Number(formPassingMarks),
          description: formDescription.trim(),
          classes: classArr.length > 0 ? classArr : ["All Classes"],
        };
        const updated = [...subjects, newSub];
        await persistSubjects(updated);
        showToast("success", `Created subject "${formName.trim()}" successfully!`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast("error", err.message || "Failed to save subject.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubject = async (id: number | string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      const updated = subjects.filter((s) => s.id !== id);
      await persistSubjects(updated);
      try {
        await supabase.from("subjects").delete().eq("id", id);
      } catch (e) {}
      showToast("success", `Deleted subject "${name}".`);
    } catch (err: any) {
      showToast("error", "Failed to delete subject.");
    }
  };

  const handleResetToPakistanBoard = async () => {
    if (
      !window.confirm(
        "Reset and re-seed all 21 Pakistan Punjab/Federal Board Matric subjects (Science, Arts, Commerce, Languages)?"
      )
    )
      return;

    try {
      const defaultList = PAKISTAN_BOARD_SUBJECTS.map((s) => ({
        ...s,
        school_id: schoolContext?.schoolId || 1,
      }));
      await persistSubjects(defaultList);
      showToast("success", "Successfully reloaded all 21 Punjab/Federal Board Matric subjects!");
    } catch (e: any) {
      showToast("error", "Failed to reset subjects.");
    }
  };

  // Filtered list
  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const matchesCategory =
        selectedCategory === "All" || s.category.toLowerCase() === selectedCategory.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.code && s.code.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [subjects, selectedCategory, searchQuery]);

  // Metric Computations
  const totalCount = subjects.length;
  const compulsoryCount = subjects.filter((s) => s.category === "Compulsory").length;
  const scienceCount = subjects.filter((s) => s.category === "Science").length;
  const othersCount = totalCount - (compulsoryCount + scienceCount);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-16">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 sm:py-3.5 shadow-xs no-print overflow-visible">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4 overflow-visible">
          {/* Left: Breadcrumbs & Title */}
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
                <span>Dashboard</span>
              </Link>
              <div className="h-4 w-px bg-slate-200" />
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                Pakistan Curriculum
              </span>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base md:text-xl font-bold text-slate-900 tracking-tight leading-tight truncate">
                    Board Subjects Management
                  </h1>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 hidden sm:inline-block">
                    Punjab & Federal Boards
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden md:block">
                  Compulsory, Science, Arts/Humanities, Commerce & Languages courses
                </p>
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-1.5 md:pb-0 scrollbar-none w-full md:w-auto shrink-0">
            <button
              onClick={handleResetToPakistanBoard}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer shrink-0"
              title="Reload standard 21 Punjab/Federal Board subjects"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
              <span>Reset to Board Syllabus</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Subject</span>
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

        {/* 4 Colorful Gradient Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-3.5 md:p-5 border border-slate-200 shadow-xs flex items-center justify-between min-w-0">
            <div className="min-w-0 pr-2">
              <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
                Total Board Subjects
              </p>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-0.5 truncate">
                {totalCount}
              </h3>
              <p className="text-[10px] md:text-xs text-indigo-600 font-semibold mt-0.5 truncate">
                Full Pakistan Matric Syllabus
              </p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 md:p-5 border border-slate-200 shadow-xs flex items-center justify-between min-w-0">
            <div className="min-w-0 pr-2">
              <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
                Compulsory Subjects
              </p>
              <h3 className="text-xl md:text-2xl font-black text-emerald-600 mt-0.5 truncate">
                {compulsoryCount}
              </h3>
              <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-0.5 truncate">
                English, Urdu, Math, Islamiat, Pak Studies, QT
              </p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold shrink-0">
              <Award className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 md:p-5 border border-slate-200 shadow-xs flex items-center justify-between min-w-0">
            <div className="min-w-0 pr-2">
              <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
                Science Group
              </p>
              <h3 className="text-xl md:text-2xl font-black text-sky-600 mt-0.5 truncate">
                {scienceCount}
              </h3>
              <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-0.5 truncate">
                Physics, Chem, Bio, Computer Science
              </p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center font-bold shrink-0">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 md:p-5 border border-slate-200 shadow-xs flex items-center justify-between min-w-0">
            <div className="min-w-0 pr-2">
              <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
                Arts, Commerce & Lang
              </p>
              <h3 className="text-xl md:text-2xl font-black text-amber-600 mt-0.5 truncate">
                {othersCount}
              </h3>
              <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-0.5 truncate">
                Education, Civics, Economics, Arabic etc.
              </p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-bold shrink-0">
              <BookMarked className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-2xl p-3.5 md:p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search subject by name, code or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {SUBJECT_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    selectedCategory === cat
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Subjects List Grid / Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs font-bold text-slate-700">
              Showing {filteredSubjects.length} of {subjects.length} Subjects
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Campus: {schoolContext?.schoolName || "OA Smart School"}
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
              <p className="text-xs font-semibold">Loading subjects catalog...</p>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <BookOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold">No subjects matched your criteria.</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
                className="mt-2 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider bg-slate-50/80">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Subject Name</th>
                    <th className="py-3 px-4">Subject Code</th>
                    <th className="py-3 px-4">Group / Category</th>
                    <th className="py-3 px-4 text-center">Total Marks</th>
                    <th className="py-3 px-4 text-center">Passing Marks</th>
                    <th className="py-3 px-4">Classes Applicable</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubjects.map((sub, idx) => {
                    const badgeColor =
                      sub.category === "Compulsory"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : sub.category === "Science"
                        ? "bg-sky-50 text-sky-800 border-sky-200"
                        : sub.category === "Commerce"
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : sub.category === "Languages"
                        ? "bg-purple-50 text-purple-800 border-purple-200"
                        : "bg-indigo-50 text-indigo-800 border-indigo-200";

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>{sub.name}</span>
                          </div>
                          {sub.description && (
                            <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                              {sub.description}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {sub.code}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                            {sub.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-900">
                          {sub.total_marks}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">
                          {sub.passing_marks}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {(sub.classes || ["All"]).slice(0, 4).map((c, cIdx) => (
                              <span
                                key={cIdx}
                                className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 text-slate-600 border border-slate-200"
                              >
                                {c}
                              </span>
                            ))}
                            {(sub.classes || []).length > 4 && (
                              <span className="text-[9px] text-slate-400 font-semibold self-center">
                                +{(sub.classes || []).length - 4} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(sub)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
                              title="Edit Subject"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSubject(sub.id, sub.name)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                              title="Delete Subject"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ADD / EDIT SUBJECT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingSubject ? `Edit Subject: ${editingSubject.name}` : "Add New Board Subject"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Subject Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Physics, Computer Science, Pakistan Studies"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Subject Code</label>
                  <input
                    type="text"
                    placeholder="e.g. PHY-201"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Group / Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:bg-white cursor-pointer"
                  >
                    <option value="Compulsory">Compulsory</option>
                    <option value="Science">Science</option>
                    <option value="Arts / Humanities">Arts / Humanities</option>
                    <option value="Commerce">Commerce</option>
                    <option value="Languages">Languages</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Total Marks</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={200}
                    value={formTotalMarks}
                    onChange={(e) => setFormTotalMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Passing Marks</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={formTotalMarks}
                    value={formPassingMarks}
                    onChange={(e) => setFormPassingMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Target Classes (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9th, 10th or 6th, 7th, 8th"
                  value={formClasses}
                  onChange={(e) => setFormClasses(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Description / Syllabus</label>
                <textarea
                  rows={2}
                  placeholder="Course outline or Board details..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving..." : "Save Subject"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
