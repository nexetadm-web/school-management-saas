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
  DollarSign,
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
  Calendar,
  ExternalLink,
  ChevronRight,
  School,
  LogOut,
} from "lucide-react";

interface SchoolRecord {
  id: number;
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

  // Data States (All data across all schools, no school_id filter)
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

  const showNotification = (type: "success" | "error", message: string) => {
    if (type === "success") {
      setSuccessMsg(message);
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(message);
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

  // 1. Verify Super Admin Access
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

        if (!isSuperAdmin(user.email)) {
          // Unauthorized: redirect to / dashboard
          router.push("/?error=Unauthorized");
          return;
        }

        setCurrentUser(user);
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

  // 2. Fetch ALL Data without school_id filter
  const fetchAllSaaSData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // Fetch schools, students, fees, teachers, expenses
      const [schoolsRes, studentsRes, feeRes, teachersRes, expensesRes] = await Promise.all([
        supabase.from("schools").select("*").order("id", { ascending: false }),
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
      const registeredSchoolIds = new Set(schoolsData.map((s) => s.id));
      studentsData.forEach((st) => {
        if (st.school_id && !registeredSchoolIds.has(st.school_id)) {
          schoolsData.push({
            id: st.school_id,
            name: `School #${st.school_id}`,
            owner_email: "Auto-detected",
            status: "active",
            created_at: st.created_at || new Date().toISOString(),
          });
          registeredSchoolIds.add(st.school_id);
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

  // Group data by school_id
  const enrichedSchools = useMemo(() => {
    return schools.map((sch) => {
      const schStudents = students.filter((s) => s.school_id === sch.id);
      const schFees = feeRecords.filter((f) => f.school_id === sch.id);
      const schTeachers = teachers.filter((t) => t.school_id === sch.id);
      const schExpenses = expenses.filter((e) => e.school_id === sch.id);

      const totalFeesCollected = schFees
        .filter((f) => f.status?.toLowerCase() === "paid")
        .reduce((sum, f) => sum + Number(f.amount || 0), 0);

      // Check if any activity occurred today
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

  // Filtered Schools for Table
  const filteredSchools = useMemo(() => {
    if (!searchTerm.trim()) return enrichedSchools;
    const q = searchTerm.trim().toLowerCase();
    return enrichedSchools.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.id.toString().includes(q) ||
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

  // 4. Admin Actions: Toggle Active Status & Delete School
  const handleToggleStatus = async (school: SchoolRecord) => {
    const newStatus = school.status === "disabled" ? "active" : "disabled";
    try {
      // Optimistic update
      setSchools((prev) =>
        prev.map((s) => (s.id === school.id ? { ...s, status: newStatus } : s))
      );

      const { error } = await supabase
        .from("schools")
        .update({ status: newStatus })
        .eq("id", school.id);

      if (error) throw error;
      showNotification("success", `School #${school.id} marked as ${newStatus}.`);
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
      // Optimistic UI delete
      setSchools((prev) => prev.filter((s) => s.id !== school.id));
      setStudents((prev) => prev.filter((s) => s.school_id !== school.id));
      setFeeRecords((prev) => prev.filter((f) => f.school_id !== school.id));
      setTeachers((prev) => prev.filter((t) => t.school_id !== school.id));
      setExpenses((prev) => prev.filter((e) => e.school_id !== school.id));
      if (selectedSchool?.id === school.id) setSelectedSchool(null);

      // Delete all child data then school row
      await Promise.all([
        supabase.from("students").delete().eq("school_id", school.id),
        supabase.from("fee_records").delete().eq("school_id", school.id),
        supabase.from("teachers").delete().eq("school_id", school.id),
        supabase.from("salary_records").delete().eq("school_id", school.id),
        supabase.from("expenses").delete().eq("school_id", school.id),
      ]);

      const { error } = await supabase.from("schools").delete().eq("id", school.id);
      if (error) throw error;

      showNotification("success", `School "${school.name}" and all associated data permanently deleted.`);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to delete school.");
      fetchAllSaaSData();
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-gray-700">
        <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md animate-bounce mb-4">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-gray-900">Verifying Super Admin Credentials...</h2>
        <p className="text-xs text-gray-500 mt-1">Checking system permissions</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-purple-100 selection:text-purple-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-6 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-purple-700 bg-gray-100 hover:bg-gray-200/80 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to App</span>
            </Link>
            <div className="h-5 w-px bg-gray-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center shadow-xs">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-extrabold text-gray-900 tracking-tight flex items-center gap-1.5">
                  Super Admin
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                    SaaS Control Center
                  </span>
                </h1>
                <p className="text-[11px] text-gray-500 hidden sm:block">
                  Universal multi-tenant control • Cross-school visibility
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAllSaaSData()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 shadow-2xs transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>
            <div className="px-3 py-1 bg-purple-50 border border-purple-200 rounded-lg text-xs font-medium text-purple-700 hidden md:block">
              {currentUser?.email}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Toast Notifications */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-xs font-semibold animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-xs font-semibold animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TOP 4 STATS CARDS (Stripe SaaS Style) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Schools */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-2xs hover:shadow-sm transition-all flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Registered Schools
              </p>
              <h3 className="text-3xl font-extrabold text-gray-900 mt-1">
                {totalSchoolsCount}
              </h3>
              <p className="text-[11px] text-purple-600 font-medium mt-1">Tenant instances</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
              <Building className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Total Students */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-2xs hover:shadow-sm transition-all flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Total Students
              </p>
              <h3 className="text-3xl font-extrabold text-gray-900 mt-1">
                {totalStudentsCount.toLocaleString()}
              </h3>
              <p className="text-[11px] text-blue-600 font-medium mt-1">All schools combined</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Total Revenue */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-2xs hover:shadow-sm transition-all flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Total Revenue
              </p>
              <h3 className="text-3xl font-extrabold text-emerald-700 mt-1">
                ${totalRevenueAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">Collected fee dues</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: Active Today */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-2xs hover:shadow-sm transition-all flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Active Today
              </p>
              <h3 className="text-3xl font-extrabold text-indigo-700 mt-1">
                {activeTodayCount}
              </h3>
              <p className="text-[11px] text-indigo-600 font-medium mt-1">Schools logged activity</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* MAIN TABLE: ALL SCHOOLS LIST */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-2xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                All Schools Directory
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                  {filteredSchools.length} registered
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Manage all registered client schools, view detailed metrics, toggle tenant active status, or purge data.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search school name, ID, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 w-full sm:w-72 transition-all shadow-2xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/60">
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
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredSchools.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
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
                      <tr key={sch.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                              <School className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{sch.name}</p>
                              {sch.city && <p className="text-[11px] text-gray-400">{sch.city}</p>}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs text-gray-600 font-semibold">
                          #{sch.id}
                        </td>

                        <td className="py-3.5 px-4 text-gray-600 text-xs truncate max-w-[180px]">
                          {sch.owner_email || "-"}
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-gray-800">
                          {sch.totalStudents}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-emerald-700">
                          ${sch.totalFeesCollected?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-gray-500">
                          {joinedFormatted}
                        </td>

                        <td className="py-3.5 px-4">
                          {isDisabled ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                              Disabled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                          {/* 1. View Action */}
                          <button
                            onClick={() => setSelectedSchool(sch)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                            title="View Students & Financials"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>

                          {/* 2. Disable / Enable Action */}
                          <button
                            onClick={() => handleToggleStatus(sch)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer shadow-2xs ${
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
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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

      {/* MODAL: VIEW SCHOOL DETAILS (Students & Fees) */}
      {selectedSchool && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                  <School className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    {selectedSchool.name}
                    <span className="font-mono text-xs text-gray-500 font-semibold">
                      (ID #{selectedSchool.id})
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500">Owner: {selectedSchool.owner_email || "N/A"}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSchool(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* School Metrics Row */}
            <div className="p-5 grid grid-cols-3 gap-3 border-b border-gray-100 bg-gray-50/30">
              <div className="p-3 bg-white border border-gray-200 rounded-xl">
                <p className="text-[11px] font-bold text-gray-400 uppercase">Total Students</p>
                <p className="text-xl font-black text-gray-900 mt-0.5">{selectedSchool.totalStudents}</p>
              </div>
              <div className="p-3 bg-white border border-gray-200 rounded-xl">
                <p className="text-[11px] font-bold text-gray-400 uppercase">Fees Collected</p>
                <p className="text-xl font-black text-emerald-700 mt-0.5">
                  ${selectedSchool.totalFeesCollected?.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-white border border-gray-200 rounded-xl">
                <p className="text-[11px] font-bold text-gray-400 uppercase">Teachers</p>
                <p className="text-xl font-black text-purple-700 mt-0.5">{selectedSchool.totalTeachers}</p>
              </div>
            </div>

            {/* Body: Students & Recent Fee Logs */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Enrolled Students ({students.filter((s) => s.school_id === selectedSchool.id).length})
                </h4>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
                      <tr>
                        <th className="py-2 px-3">Student Name</th>
                        <th className="py-2 px-3">Class</th>
                        <th className="py-2 px-3">Monthly Fee</th>
                        <th className="py-2 px-3">Phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {students.filter((s) => s.school_id === selectedSchool.id).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-gray-400">
                            No students registered yet for this school.
                          </td>
                        </tr>
                      ) : (
                        students
                          .filter((s) => s.school_id === selectedSchool.id)
                          .map((s) => (
                            <tr key={s.id} className="hover:bg-gray-50">
                              <td className="py-2 px-3 font-semibold text-gray-900">{s.name}</td>
                              <td className="py-2 px-3 text-gray-600">{s.class}</td>
                              <td className="py-2 px-3 font-bold text-emerald-700">${s.monthly_fee}</td>
                              <td className="py-2 px-3 text-gray-500">{s.phone || "-"}</td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Recent Fee Records ({feeRecords.filter((f) => f.school_id === selectedSchool.id).length})
                </h4>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
                      <tr>
                        <th className="py-2 px-3">Student ID</th>
                        <th className="py-2 px-3">Month</th>
                        <th className="py-2 px-3">Amount</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {feeRecords.filter((f) => f.school_id === selectedSchool.id).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-gray-400">
                            No fee records logged yet.
                          </td>
                        </tr>
                      ) : (
                        feeRecords
                          .filter((f) => f.school_id === selectedSchool.id)
                          .slice(0, 10)
                          .map((f) => (
                            <tr key={f.id} className="hover:bg-gray-50">
                              <td className="py-2 px-3 font-medium text-gray-700">#{f.student_id}</td>
                              <td className="py-2 px-3 text-gray-600">{f.month}</td>
                              <td className="py-2 px-3 font-bold text-gray-900">${f.amount}</td>
                              <td className="py-2 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    f.status?.toLowerCase() === "paid"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-amber-50 text-amber-700 border border-amber-200"
                                  }`}
                                >
                                  {f.status}
                                </span>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedSchool(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
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
