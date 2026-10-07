"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { isSuperAdmin } from "@/lib/constants";
import {
  Shield,
  Building,
  Users,
  Activity,
  ArrowLeft,
  Search,
  RefreshCw,
  Trash2,
  Power,
  Eye,
  CheckCircle,
  AlertCircle,
  X,
  ExternalLink,
  School,
  Sparkles,
  Layers,
  ChevronRight,
} from "lucide-react";

interface SchoolRecord {
  id: string | number;
  name: string;
  city?: string | null;
  owner_email?: string | null;
  status?: string | null; // "active" | "disabled"
  created_at?: string | null;
  // Calculated stats
  totalStudents?: number;
  totalFeesCollected?: number;
  totalTeachers?: number;
  activeToday?: boolean;
}

export default function SuperAdminPage() {
  const router = useRouter();

  // Auth & Access Control
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Data States
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [feeRecords, setFeeRecords] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Selected School Detail View Modal
  const [selectedSchool, setSelectedSchool] = useState<SchoolRecord | null>(null);

  // School Switcher State for Impersonation
  const [activeSwitcherSchoolId, setActiveSwitcherSchoolId] = useState<string>("all");

  const showNotification = (type: "success" | "error", message: string) => {
    if (type === "success") {
      setSuccessMsg(message);
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(message);
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

  // 1. Verify Super Admin Access & Initialize
  useEffect(() => {
    const checkAccessAndInit = async () => {
      try {
        setCheckingAuth(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const isSuper = isSuperAdmin(user.email) || user.email === "mnuhbhatti333@gmail.com";
        if (!isSuper) {
          router.push("/?error=Unauthorized");
          return;
        }

        setCurrentUser(user);

        // Load stored impersonated school from localStorage
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("oa_superadmin_selected_school_id");
          if (stored) {
            setActiveSwitcherSchoolId(stored);
          }
        }

        await fetchAllSaaSData();
      } catch (err: any) {
        console.error("Auth check failed:", err);
        router.push("/?error=Unauthorized");
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAccessAndInit();
  }, [router]);

  // 2. Fetch ALL Data across all schools
  const fetchAllSaaSData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [schoolsRes, studentsRes, feeRes, teachersRes, expensesRes] = await Promise.all([
        supabase.from("schools").select("*").order("id", { ascending: true }),
        supabase.from("students").select("*"),
        supabase.from("fee_records").select("*"),
        supabase.from("teachers").select("*"),
        supabase.from("expenses").select("*"),
      ]);

      const schoolsData: SchoolRecord[] = schoolsRes.data || [];
      const studentsData = studentsRes.data || [];
      const feeData = feeRes.data || [];
      const teachersData = teachersRes.data || [];
      const expensesData = expensesRes.data || [];

      // If schools table has missing schools present in students, synthesize them
      const registeredSchoolIds = new Set(schoolsData.map((s) => String(s.id)));
      studentsData.forEach((st) => {
        if (st.school_id && !registeredSchoolIds.has(String(st.school_id))) {
          schoolsData.push({
            id: st.school_id,
            name: `School #${String(st.school_id).slice(0, 8)}`,
            owner_email: "Auto-detected",
            status: "active",
            created_at: st.created_at || new Date().toISOString(),
          });
          registeredSchoolIds.add(String(st.school_id));
        }
      });

      setSchools(schoolsData);
      setStudents(studentsData);
      setFeeRecords(feeData);
      setTeachers(teachersData);
      setExpenses(expensesData);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load SaaS system data.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Compute Per-School and SaaS Overview Stats
  const todayDateStr = new Date().toISOString().slice(0, 10);

  const enrichedSchools = useMemo(() => {
    return schools.map((sch) => {
      const schStudents = students.filter((s) => String(s.school_id) === String(sch.id));
      const schFees = feeRecords.filter((f) => String(f.school_id) === String(sch.id));
      const schTeachers = teachers.filter((t) => String(t.school_id) === String(sch.id));
      const schExpenses = expenses.filter((e) => String(e.school_id) === String(sch.id));

      const totalFeesCollected = schFees
        .filter((f) => f.status?.toLowerCase() === "paid")
        .reduce((sum, f) => sum + Number(f.amount || 0), 0);

      const hasRecentStudent = schStudents.some((s) => s.created_at?.slice(0, 10) === todayDateStr);
      const hasRecentFee = schFees.some((f) => (f.created_at || f.date)?.slice(0, 10) === todayDateStr);
      const hasRecentExpense = schExpenses.some((e) => (e.created_at || e.date)?.slice(0, 10) === todayDateStr);

      const activeToday = hasRecentStudent || hasRecentFee || hasRecentExpense;

      return {
        ...sch,
        status: sch.status || "active",
        totalStudents: schStudents.length,
        totalFeesCollected,
        totalTeachers: schTeachers.length,
        activeToday,
      };
    });
  }, [schools, students, feeRecords, teachers, expenses, todayDateStr]);

  const filteredSchools = useMemo(() => {
    if (!searchTerm.trim()) return enrichedSchools;
    const q = searchTerm.trim().toLowerCase();
    return enrichedSchools.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.id).toLowerCase().includes(q) ||
        (s.owner_email || "").toLowerCase().includes(q) ||
        (s.city || "").toLowerCase().includes(q)
    );
  }, [enrichedSchools, searchTerm]);

  // Overall Top Stats
  const totalSchoolsCount = enrichedSchools.length;
  const totalStudentsCount = students.length;
  const totalRevenueAmount = feeRecords
    .filter((f) => f.status?.toLowerCase() === "paid")
    .reduce((sum, f) => sum + Number(f.amount || 0), 0);
  const activeTodayCount = enrichedSchools.filter((s) => s.activeToday).length;

  // 4. Impersonation / School Switcher Handlers
  const handleSwitcherChange = (selectedId: string) => {
    setActiveSwitcherSchoolId(selectedId);
    if (typeof window !== "undefined") {
      localStorage.setItem("oa_superadmin_selected_school_id", selectedId);
      if (selectedId === "all") {
        localStorage.setItem("oa_superadmin_selected_school_name", "All Schools");
      } else {
        const found = schools.find((s) => String(s.id) === selectedId);
        if (found) {
          localStorage.setItem("oa_superadmin_selected_school_name", found.name);
        }
      }
    }
    showNotification(
      "success",
      selectedId === "all"
        ? "Context set to All Schools (Aggregated)."
        : `Context switched to ${schools.find((s) => String(s.id) === selectedId)?.name || "Selected School"}. Click 'Open Dashboard' to view.`
    );
  };

  const handleImpersonate = (sch: SchoolRecord) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("oa_superadmin_selected_school_id", String(sch.id));
      localStorage.setItem("oa_superadmin_selected_school_name", sch.name);
    }
    router.push("/");
  };

  // 5. Admin Actions: Toggle Active Status & Delete School
  const handleToggleStatus = async (school: SchoolRecord) => {
    const newStatus = school.status === "disabled" ? "active" : "disabled";
    try {
      setSchools((prev) =>
        prev.map((s) => (s.id === school.id ? { ...s, status: newStatus } : s))
      );

      const { error } = await supabase
        .from("schools")
        .update({ status: newStatus })
        .eq("id", school.id);

      if (error) throw error;
      showNotification("success", `${school.name} marked as ${newStatus}.`);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to update school status.");
      fetchAllSaaSData();
    }
  };

  const handleDeleteSchool = async (school: SchoolRecord) => {
    const confirmName = prompt(
      `CAUTION: This will permanently wipe all students, fees, teachers, and records for "${school.name}".\n\nType DELETE to confirm:`
    );
    if (confirmName !== "DELETE") return;

    try {
      setSchools((prev) => prev.filter((s) => s.id !== school.id));
      setStudents((prev) => prev.filter((s) => s.school_id !== school.id));
      setFeeRecords((prev) => prev.filter((f) => f.school_id !== school.id));
      setTeachers((prev) => prev.filter((t) => t.school_id !== school.id));
      setExpenses((prev) => prev.filter((e) => e.school_id !== school.id));
      if (selectedSchool?.id === school.id) setSelectedSchool(null);

      await Promise.all([
        supabase.from("students").delete().eq("school_id", school.id),
        supabase.from("fee_records").delete().eq("school_id", school.id),
        supabase.from("teachers").delete().eq("school_id", school.id),
        supabase.from("salary_records").delete().eq("school_id", school.id),
        supabase.from("expenses").delete().eq("school_id", school.id),
      ]);

      const { error } = await supabase.from("schools").delete().eq("id", school.id);
      if (error) throw error;

      showNotification("success", `School "${school.name}" permanently removed.`);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to delete school.");
      fetchAllSaaSData();
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 flex flex-col items-center justify-center p-6 text-slate-700">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg animate-bounce mb-4">
          <Shield className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Verifying Super Admin Credentials...
        </h2>
        <p className="text-xs text-slate-500 mt-1">Connecting to Multi-Tenant Control Engine</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 text-slate-900 font-sans relative selection:bg-purple-100 selection:text-purple-900">
      {/* Subtle Dot Pattern Texture (Stripe/Linear style) */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          {/* Left Title & Branding */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-purple-700 bg-slate-100/90 hover:bg-slate-200/80 rounded-xl transition-all shadow-2xs hover:shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to App</span>
            </Link>

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                  Super Admin
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 border border-purple-200/80">
                    SaaS Control Center
                  </span>
                </h1>
                <p className="text-[11px] text-slate-500 hidden md:block">
                  Universal multi-tenant control • Live impersonation engine
                </p>
              </div>
            </div>
          </div>

          {/* Right School Switcher & Actions */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-end w-full sm:w-auto">
            {/* SCHOOL SWITCHER DROPDOWN IN ADMIN HEADER */}
            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-indigo-200/80 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <Building className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-[11px] font-bold text-slate-500 hidden lg:inline">
                Active School:
              </span>
              <select
                value={activeSwitcherSchoolId}
                onChange={(e) => handleSwitcherChange(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[190px] sm:max-w-[210px] truncate"
                title="Super Admin School Selector"
              >
                <option value="all">All Schools (Aggregated - {totalSchoolsCount})</option>
                {schools.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => router.push("/")}
                className="px-2.5 py-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-2xs flex items-center gap-1 cursor-pointer shrink-0"
                title="Open School Dashboard"
              >
                <span>Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchAllSaaSData()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white/90 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer"
              title="Refresh All SaaS Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 relative z-10">
        {/* Toast Notifications */}
        {successMsg && (
          <div className="p-4 bg-emerald-50/90 backdrop-blur-sm border border-emerald-200/80 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-semibold animate-in fade-in shadow-sm">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-4 bg-rose-50/90 backdrop-blur-sm border border-rose-200/80 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-semibold animate-in fade-in shadow-sm">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TOP 4 STATS CARDS (Stripe / Linear Premium SaaS Style) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Registered Schools (Purple Gradient Box) */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-purple-100/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:scale-[1.02] transition-all flex items-center justify-between group">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Registered Schools
              </p>
              <h3 className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
                {totalSchoolsCount}
              </h3>
              <p className="text-[11px] text-purple-600 font-semibold mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Active tenant instances
              </p>
            </div>
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:scale-105 transition-transform">
              <Building className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Total Students (Blue Gradient Box) */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-blue-100/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:scale-[1.02] transition-all flex items-center justify-between group">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Students
              </p>
              <h3 className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
                {totalStudentsCount.toLocaleString()}
              </h3>
              <p className="text-[11px] text-blue-600 font-semibold mt-1">
                All schools combined
              </p>
            </div>
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Total Revenue (BIG Bold Green with Glow & Rs. currency) */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 border-2 border-emerald-300/80 shadow-[0_10px_35px_rgba(16,185,129,0.12)] hover:scale-[1.02] transition-all flex items-center justify-between relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Total Revenue
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1 tracking-tight drop-shadow-[0_2px_10px_rgba(16,185,129,0.3)]">
                Rs. {totalRevenueAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Live collected fee dues
              </p>
            </div>
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform shrink-0">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: Active Today (Orange with Pulsing Green Dot) */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-amber-100/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:scale-[1.02] transition-all flex items-center justify-between group">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Active Today
              </p>
              <h3 className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
                {activeTodayCount}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] text-emerald-600 font-bold">Live tenant activity</span>
              </div>
            </div>
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-transform">
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* ALL SCHOOLS DIRECTORY TABLE */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                All Schools Directory
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                  {filteredSchools.length} registered
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Manage registered client schools, impersonate any tenant with 1-click, and monitor fee collections.
              </p>
            </div>

            {/* Premium Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search school name, ID, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 w-full sm:w-80 transition-all shadow-2xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/80">
                  <th className="py-3 px-4">School Name</th>
                  <th className="py-3 px-4">School ID</th>
                  <th className="py-3 px-4">Owner Email</th>
                  <th className="py-3 px-4">Students</th>
                  <th className="py-3 px-4">Fees Collected</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredSchools.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No schools found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredSchools.map((sch) => {
                    const isDisabled = sch.status === "disabled";
                    const joinedFormatted = sch.created_at
                      ? new Date(sch.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "N/A";

                    return (
                      <tr
                        key={sch.id}
                        className="hover:bg-indigo-50/40 hover:shadow-2xs transition-all duration-150 rounded-xl"
                      >
                        {/* School Name with Gradient Avatar */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                              <Building className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 leading-snug">{sch.name}</p>
                              {sch.city && (
                                <p className="text-[11px] text-slate-400 font-medium">{sch.city}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* School ID */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 font-semibold truncate max-w-[120px]" title={String(sch.id)}>
                          #{String(sch.id).slice(0, 8)}...
                        </td>

                        {/* Owner Email */}
                        <td className="py-3.5 px-4 text-slate-600 text-xs truncate max-w-[170px]">
                          {sch.owner_email || "-"}
                        </td>

                        {/* Total Students */}
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {sch.totalStudents}
                        </td>

                        {/* Fees Collected (Rs. format) */}
                        <td className="py-3.5 px-4 font-bold text-emerald-700">
                          Rs. {sch.totalFeesCollected?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>

                        {/* Joined Date */}
                        <td className="py-3.5 px-4 text-xs text-slate-500">
                          {joinedFormatted}
                        </td>

                        {/* Status (Pulse badge) */}
                        <td className="py-3.5 px-4">
                          {isDisabled ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Disabled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              Active
                            </span>
                          )}
                        </td>

                        {/* Actions: View / Impersonate + Disable/Enable + Delete */}
                        <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {/* 1. View / Impersonate Action (Sets active school & navigates to Dashboard) */}
                          <button
                            onClick={() => handleImpersonate(sch)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-xl transition-all cursor-pointer shadow-2xs hover:shadow-xs hover:scale-[1.02]"
                            title="Impersonate School & Open Dashboard"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-600" />
                            <span>View</span>
                          </button>

                          {/* 2. Disable / Enable Action */}
                          <button
                            onClick={() => handleToggleStatus(sch)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
                              isDisabled
                                ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                                : "text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200"
                            }`}
                            title={isDisabled ? "Enable School" : "Disable School"}
                          >
                            <Power className="w-3.5 h-3.5" />
                            <span>{isDisabled ? "Enable" : "Disable"}</span>
                          </button>

                          {/* 3. Delete School Action */}
                          <button
                            onClick={() => handleDeleteSchool(sch)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Delete School Data"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* DETAIL MODAL (Optional preview if clicked) */}
      {selectedSchool && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                  <School className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    {selectedSchool.name}
                    <span className="font-mono text-xs text-slate-500 font-semibold">
                      (ID #{String(selectedSchool.id).slice(0, 8)})
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">Owner: {selectedSchool.owner_email || "N/A"}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSchool(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-3 gap-3 border-b border-slate-100 bg-slate-50/30">
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Total Students</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">{selectedSchool.totalStudents}</p>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Fees Collected</p>
                <p className="text-xl font-black text-emerald-700 mt-0.5">
                  Rs. {selectedSchool.totalFeesCollected?.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Teachers</p>
                <p className="text-xl font-black text-purple-700 mt-0.5">{selectedSchool.totalTeachers}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <button
                onClick={() => handleImpersonate(selectedSchool)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <span>Impersonate School</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSelectedSchool(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
