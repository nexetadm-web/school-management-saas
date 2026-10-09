"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveActiveSchoolContext } from "@/lib/school-context";
import { getTodayPKDate } from "@/lib/date-utils";
import {
  ArrowLeft,
  UserPlus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Share2,
  Copy,
  ExternalLink,
  Search,
  Filter,
  User,
  Phone,
  Calendar,
  Check,
  RefreshCw,
  MessageCircle,
  Clock,
  Sparkles,
} from "lucide-react";

interface AdmissionApplication {
  id: string | number;
  school_id: string | number;
  student_name: string;
  father_name: string;
  dob: string;
  gender: string;
  class_applying: string;
  previous_school?: string;
  phone: string;
  address?: string;
  photo_url?: string;
  status: "pending" | "approved" | "rejected";
  created_at?: string;
}

export default function AdminAdmissionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [schoolContext, setSchoolContext] = useState<any>(null);
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAdmissions = async () => {
    try {
      setLoading(true);
      const ctx = await resolveActiveSchoolContext();
      setSchoolContext(ctx);

      let appList: AdmissionApplication[] = [];

      // 1. Try Supabase
      try {
        let query = supabase.from("admissions").select("*").order("id", { ascending: false });
        if (ctx.schoolId && ctx.schoolId !== "all") {
          query = query.eq("school_id", ctx.schoolId);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          appList = data;
        }
      } catch (dbErr) {}

      // 2. Fallback to localStorage
      if (appList.length === 0) {
        const localStoreKey = `oa_school_admissions_${ctx.schoolId || "all"}`;
        const stored = typeof window !== "undefined" ? localStorage.getItem(localStoreKey) : null;
        if (stored) {
          appList = JSON.parse(stored);
        } else {
          // Mock realistic initial applications for testing
          appList = [
            {
              id: "ADM-2026-1042",
              school_id: ctx.schoolId || 1,
              student_name: "Hamza Tariq",
              father_name: "Tariq Mehmood",
              dob: "12-04-2018",
              gender: "Male",
              class_applying: "2nd",
              previous_school: "Army Public School",
              phone: "03001234567",
              address: "Civil Lines, Sillanwali",
              status: "pending",
              created_at: new Date().toISOString(),
            },
            {
              id: "ADM-2026-1043",
              school_id: ctx.schoolId || 1,
              student_name: "Ayesha Noor",
              father_name: "Muhammad Noor",
              dob: "20-08-2019",
              gender: "Female",
              class_applying: "1st",
              previous_school: "Fresh Admission",
              phone: "03019876543",
              address: "Model Town, Sillanwali",
              status: "pending",
              created_at: new Date().toISOString(),
            },
          ];
        }
      }

      setApplications(appList);
    } catch (err: any) {
      console.error(err);
      showToast("error", err.message || "Failed to load admissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmissions();
  }, []);

  // Filtered Applications
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const matchesStatus = statusFilter === "all" || app.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        app.student_name.toLowerCase().includes(q) ||
        app.father_name.toLowerCase().includes(q) ||
        app.phone.includes(q) ||
        String(app.id).toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [applications, statusFilter, searchQuery]);

  // Approve & Enroll Handler
  const handleApproveAndEnroll = async (app: AdmissionApplication) => {
    try {
      // 1. Insert into students table
      const studentPayload = {
        school_id: app.school_id || schoolContext?.schoolId || 1,
        name: app.student_name,
        father_name: app.father_name,
        class: app.class_applying,
        phone: app.phone,
        monthly_fee: 2500,
      };

      const { error: studentErr } = await supabase.from("students").insert([studentPayload]);
      if (studentErr) throw studentErr;

      // 2. Update admission status to 'approved'
      try {
        await supabase.from("admissions").update({ status: "approved" }).eq("id", app.id);
      } catch (e) {}

      // 3. Update local state
      const updated = applications.map((a) => (a.id === app.id ? { ...a, status: "approved" as const } : a));
      setApplications(updated);

      const localStoreKey = `oa_school_admissions_${schoolContext?.schoolId || "all"}`;
      if (typeof window !== "undefined") {
        localStorage.setItem(localStoreKey, JSON.stringify(updated));
      }

      showToast("success", `Student ${app.student_name} approved and enrolled into Class ${app.class_applying}!`);
    } catch (err: any) {
      console.error(err);
      showToast("error", err.message || "Failed to enroll student.");
    }
  };

  // Reject Handler
  const handleReject = async (app: AdmissionApplication) => {
    if (!confirm(`Are you sure you want to reject the application for ${app.student_name}?`)) return;

    try {
      try {
        await supabase.from("admissions").update({ status: "rejected" }).eq("id", app.id);
      } catch (e) {}

      const updated = applications.map((a) => (a.id === app.id ? { ...a, status: "rejected" as const } : a));
      setApplications(updated);

      const localStoreKey = `oa_school_admissions_${schoolContext?.schoolId || "all"}`;
      if (typeof window !== "undefined") {
        localStorage.setItem(localStoreKey, JSON.stringify(updated));
      }

      showToast("success", `Application #${app.id} marked as rejected.`);
    } catch (err: any) {
      showToast("error", "Failed to update status.");
    }
  };

  // Copy & Share Public Admission Link
  const publicLink = typeof window !== "undefined"
    ? `${window.location.origin}/admission${schoolContext?.schoolId ? `?school=${schoolContext.schoolId}` : ""}`
    : "http://localhost:3001/admission";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
    showToast("success", "Public admission link copied to clipboard!");
  };

  const handleShareWhatsApp = () => {
    const msg = `Dear Parents, Online Admissions for ${schoolContext?.schoolName || "Our School"} (Session 2026-2027) are open! Fill the online admission form here: ${publicLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 shadow-xs">
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
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Online Admissions Desk
                </h1>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Review inquiries, approve applicants, and share public registration link
                </p>
              </div>
            </div>
          </div>

          {/* Share Links */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
              title="Copy Public Admission Link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Share via WhatsApp</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
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

        {/* Public Link Share Banner */}
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-white p-4.5 rounded-2xl border border-purple-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
              Public URL (No Login Needed)
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Parents can register directly from their mobile phones
            </h3>
            <p className="text-xs text-slate-500 font-mono break-all">{publicLink}</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admission"
              target="_blank"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span>Preview Form</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search applicant name, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-semibold">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">All ({applications.length})</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredApps.length} applications
          </span>
        </div>

        {/* Applications List */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
              <p className="font-semibold text-xs">Loading admission requests...</p>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
              <UserPlus className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold">No admission applications found.</p>
              <p className="text-xs mt-1">Share the public admission link with parents to receive registrations.</p>
            </div>
          ) : (
            filteredApps.map((app) => (
              <div
                key={app.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:shadow-sm transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Applicant Info */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-800 font-bold flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                    {app.photo_url ? (
                      <img src={app.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      app.student_name.slice(0, 2).toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">{app.student_name}</h4>
                      <span className="font-mono text-[10px] text-slate-400 font-semibold">
                        #{app.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          app.status === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : app.status === "rejected"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">
                      Father: <strong>{app.father_name}</strong> • Class Applying:{" "}
                      <strong className="text-indigo-700">Class {app.class_applying}</strong>
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        {app.phone}
                      </span>
                      <span>DOB: {app.dob}</span>
                      {app.previous_school && (
                        <span>Prev: {app.previous_school}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {app.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleApproveAndEnroll(app)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Approve & Enroll</span>
                      </button>

                      <button
                        onClick={() => handleReject(app)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                      >
                        <span>Reject</span>
                      </button>
                    </>
                  )}

                  {app.status === "approved" && (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      <span>Enrolled</span>
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
