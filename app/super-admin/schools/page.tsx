"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Shield,
  Building,
  Users,
  Search,
  Trash2,
  RefreshCw,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Plus,
} from "lucide-react";

interface SchoolRecord {
  id: string;
  name: string;
  city?: string | null;
  owner_email?: string | null;
  plan?: string | null;
  created_at?: string | null;
  students_count?: number;
}

export default function SuperAdminSchoolsPage() {
  const router = useRouter();

  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Toast Helper
  const toast = {
    success: (msg: string) => {
      setToastMessage({ type: "success", text: msg });
      setTimeout(() => setToastMessage(null), 4000);
    },
    error: (msg: string) => {
      setToastMessage({ type: "error", text: msg });
      setTimeout(() => setToastMessage(null), 5000);
    },
  };

  // Load Schools & Student Counts
  const loadSchools = async () => {
    try {
      setLoading(true);

      const { data: schoolData, error: sErr } = await supabase
        .from("schools")
        .select("*")
        .order("created_at", { ascending: false });

      if (sErr) throw sErr;

      // Get student count for each school
      const { data: studentData } = await supabase
        .from("students")
        .select("school_id");

      const studentCountMap: Record<string, number> = {};
      if (studentData) {
        studentData.forEach((st: any) => {
          const sId = String(st.school_id || "");
          studentCountMap[sId] = (studentCountMap[sId] || 0) + 1;
        });
      }

      const formatted: SchoolRecord[] = (schoolData || []).map((s: any) => ({
        id: String(s.id),
        name: s.name || "Unnamed School",
        city: s.city || "N/A",
        owner_email: s.owner_email || "N/A",
        plan: s.plan || "free",
        created_at: s.created_at,
        students_count: studentCountMap[String(s.id)] || 0,
      }));

      setSchools(formatted);
    } catch (err: any) {
      console.error("Error loading schools:", err);
      toast.error(err.message || "سکولز لوڈ کرنے میں مسئلہ پیش آیا");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchools();
  }, []);

  // EXACT HANDLER REQUESTED BY USER
  const handleDelete = async (schoolId: string, schoolName: string) => {
    if (!confirm(`کیا آپ ${schoolName} کو ڈیلیٹ کرنا چاہتے ہیں؟ اس کا سارا ڈیٹا ختم ہو جائے گا!`)) return;

    try {
      setDeletingId(schoolId);
      const res = await fetch(`/api/super-admin/schools/${schoolId}`, { method: "DELETE" });

      if (res.ok) {
        toast.success("ڈیلیٹ ہو گیا");
        setSchools((prev) => prev.filter((s) => s.id !== schoolId));
        router.refresh();
      } else {
        toast.error("Error - پہلے اس کے سٹوڈنٹس ڈیلیٹ کریں");
      }
    } catch (err) {
      toast.error("Error - پہلے اس کے سٹوڈنٹس ڈیلیٹ کریں");
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered schools
  const filteredSchools = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return schools;
    return schools.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.city && s.city.toLowerCase().includes(q)) ||
        (s.owner_email && s.owner_email.toLowerCase().includes(q)) ||
        s.id.toLowerCase().includes(q)
    );
  }, [schools, searchQuery]);

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 font-sans pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#0F172A]/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400" />
              <span>ایڈمن ڈیش بورڈ</span>
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>سپر ایڈمن - تمام سکولز لسٹ</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    SUPER ADMIN
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  سکولز کو منظم کریں یا ضرورت پڑنے پر ڈیلیٹ کریں
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={loadSchools}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
              <span>ریفریش</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Toast Notification Banner */}
        {toastMessage && (
          <div
            className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
              toastMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toastMessage.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white"
            >
              &times;
            </button>
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#111827] border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">کل سکولز کی تعداد</p>
              <h3 className="text-xl font-bold text-white">{schools.length}</h3>
            </div>
          </div>

          <div className="bg-[#111827] border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">کل رجسٹرڈ طلباء</p>
              <h3 className="text-xl font-bold text-white">
                {schools.reduce((acc, s) => acc + (s.students_count || 0), 0)}
              </h3>
            </div>
          </div>

          <div className="bg-[#111827] border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">ڈیلیٹ پروٹیکشن</p>
              <h3 className="text-xs font-bold text-rose-400">مکمل کیڈر محفوظ ڈیلیٹ ایکشن</h3>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-[#111827] p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="سکول کا نام، شہر یا ای میل سے تلاش کریں..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700/60 rounded-xl outline-none focus:border-rose-500 focus:bg-slate-900/90 text-white placeholder-slate-500"
            />
          </div>

          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            کل نتائج: <strong className="text-white">{filteredSchools.length}</strong>
          </span>
        </div>

        {/* Schools Table */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-[#1E293B] text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5 text-center w-12">#</th>
                  <th className="px-4 py-3.5">سکول کا نام و شہر</th>
                  <th className="px-4 py-3.5">اونر ای میل (Owner Email)</th>
                  <th className="px-4 py-3.5 text-center">طلباء تعداد</th>
                  <th className="px-4 py-3.5">پلان</th>
                  <th className="px-4 py-3.5">تاریخ رجسٹریشن</th>
                  <th className="px-4 py-3.5 text-center">ایکشن (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
                      <span>سکولز کا ڈیٹا لوڈ ہو رہا ہے...</span>
                    </td>
                  </tr>
                ) : filteredSchools.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <Building className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <span>کوئی سکول موجود نہیں ملا</span>
                    </td>
                  </tr>
                ) : (
                  filteredSchools.map((school, idx) => (
                    <tr
                      key={school.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3.5 text-center font-mono text-slate-500 text-[11px]">
                        {idx + 1}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-white text-sm">
                          {school.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {school.city || "Pakistan"}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-300">
                        {school.owner_email || "N/A"}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 font-bold text-slate-200 border border-slate-700">
                          <Users className="w-3 h-3 text-indigo-400" />
                          <span>{school.students_count || 0}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="uppercase text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {school.plan || "FREE"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-[11px] text-slate-400 font-mono">
                        {school.created_at ? new Date(school.created_at).toLocaleDateString("en-PK") : "N/A"}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/?school_id=${school.id}`}
                            target="_blank"
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                            title="پورٹل کھولیں"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          {/* DELETE SCHOOL BUTTON */}
                          <button
                            onClick={() => handleDelete(school.id, school.name)}
                            disabled={deletingId === school.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg border border-rose-500/30 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                            title="سکول ڈیلیٹ کریں"
                          >
                            <Trash2 className={`w-3.5 h-3.5 ${deletingId === school.id ? "animate-spin" : ""}`} />
                            <span>{deletingId === school.id ? "ڈیلیٹ ہو رہا ہے..." : "ڈیلیٹ"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
