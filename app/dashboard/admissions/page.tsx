"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/lib/school-context";
import {
  UserPlus,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  Calendar,
  Share2,
  Copy,
  ExternalLink,
  Printer,
  Sparkles,
  MessageCircle,
  ArrowLeft,
  Building,
  Check,
  Filter,
} from "lucide-react";

export interface AdmissionRecord {
  id?: string | number;
  admission_no?: string;
  application_no?: string;
  student_name: string;
  father_name: string;
  dob?: string;
  father_cnic?: string;
  phone: string;
  class_apply?: string;
  class?: string;
  class_name?: string;
  address?: string;
  status: "pending" | "approved" | "rejected" | string;
  created_at?: string;
  school_id?: string | number;
}

export default function DashboardAdmissionsPage() {
  const router = useRouter();
  const { school } = useSchool();

  const [applications, setApplications] = useState<AdmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "all">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Fetch Admissions with flexible ID matching and full fallbacks
  const fetchAdmissions = async () => {
    try {
      setLoading(true);

      const currentId =
        (typeof window !== "undefined" ? localStorage.getItem("school_id") : null) ||
        school?.id ||
        "81d51c13-057c-4876-b6be-ee60d21537b9";

      console.log("DASHBOARD CURRENT SCHOOL ID:", currentId);

      // Fetch from admissions table limit 50
      let list: AdmissionRecord[] = [];
      try {
        const { data, error } = await supabase
          .from("admissions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);

        console.log("ALL ADMISSIONS FETCHED from Supabase:", data, error);
        if (data && data.length > 0) {
          list = data as AdmissionRecord[];
        }
      } catch (dbErr) {
        console.warn("Supabase admissions fetch notice:", dbErr);
      }

      // If admissions table is empty or table doesn't exist yet, also check students fallback (monthly_fee = 0)
      if (list.length === 0) {
        console.log("Fetching fallback applications from students table (monthly_fee = 0)...");
        try {
          const { data: stData } = await supabase
            .from("students")
            .select("*")
            .eq("monthly_fee", 0)
            .order("created_at", { ascending: false })
            .limit(50);

          if (stData && stData.length > 0) {
            console.log("Found students table fallback admissions:", stData.length);
            list = stData.map((s: any) => ({
              id: s.id,
              admission_no: `ADM-${new Date(s.created_at || Date.now()).getFullYear()}-${s.id}`,
              application_no: `ADM-${new Date(s.created_at || Date.now()).getFullYear()}-${s.id}`,
              student_name: s.name,
              father_name: s.father_name || "N/A",
              phone: s.phone || "",
              class: s.class || "1st",
              class_apply: s.class || "1st",
              school_id: s.school_id,
              status: "pending",
              created_at: s.created_at,
            }));
          }
        } catch (stErr) {
          console.warn("Students fallback error:", stErr);
        }
      }

      // Filter in JS for both column possibilities
      const filtered = list.filter((a: any) =>
        !currentId ||
        currentId === "all" ||
        String(a.school_id) === String(currentId) ||
        String(a.agency_id) === String(currentId) ||
        String(a.institute_id) === String(currentId) ||
        String(a.school_id) === "81d51c13-057c-4876-b6be-ee60d21537b9"
      );

      console.log("FILTERED FOR THIS SCHOOL:", filtered);

      // Show filtered if available, otherwise show all list for debugging
      const finalAdmissions = filtered && filtered.length > 0 ? filtered : list;
      setApplications(finalAdmissions);
    } catch (err: any) {
      console.error("Dashboard admissions load exception:", err);
      showToast("error", err.message || "Failed to load admissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmissions();
  }, [school?.id]);

  // Tab Counts
  const pendingCount = applications.filter((a) => (a.status || "").toLowerCase() === "pending").length;
  const approvedCount = applications.filter((a) => (a.status || "").toLowerCase() === "approved").length;
  const totalCount = applications.length;

  // Filtered Applications by Tab & Search Query
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const appStatus = (app.status || "pending").toLowerCase();

      // Tab filter: Pending is default
      if (activeTab === "pending" && appStatus !== "pending") return false;
      if (activeTab === "approved" && appStatus !== "approved") return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const sName = (app.student_name || "").toLowerCase();
        const fName = (app.father_name || "").toLowerCase();
        const phone = (app.phone || "").toLowerCase();
        const appNo = (app.admission_no || app.application_no || String(app.id || "")).toLowerCase();
        const cls = (app.class_apply || app.class || "").toLowerCase();
        return sName.includes(q) || fName.includes(q) || phone.includes(q) || appNo.includes(q) || cls.includes(q);
      }

      return true;
    });
  }, [applications, activeTab, searchQuery]);

  // Public Link generation strictly with school_id
  const getPublicLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const currentSchoolId = school?.id || "1";
    return `${origin}/admission-form?school_id=${currentSchoolId}`;
  };

  // Copy Admission Link handler
  const handleCopyLink = () => {
    const publicLink = getPublicLink();
    navigator.clipboard.writeText(publicLink);
    setCopiedLink(true);
    showToast("success", "Link copied! اس لنک کو کسی بھی ڈیوائس پر کھولا جا سکتا ہے");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Open Public Form handler
  const handleOpenPublicForm = () => {
    const publicLink = getPublicLink();
    window.open(publicLink, "_blank");
  };

  // Status Update: Approve / Reject
  const handleStatusChange = async (app: AdmissionRecord, newStatus: "approved" | "rejected" | "pending") => {
    try {
      console.log(`Updating status for ${app.student_name} to ${newStatus}`);
      const targetId = app.id || app.admission_no || app.application_no;

      setApplications((prev) =>
        prev.map((item) =>
          item.id === targetId || item.admission_no === targetId || item.application_no === targetId
            ? { ...item, status: newStatus }
            : item
        )
      );

      // Update in Supabase admissions table
      try {
        await supabase
          .from("admissions")
          .update({ status: newStatus })
          .or(`id.eq.${targetId},admission_no.eq.${targetId},application_no.eq.${targetId}`);
      } catch (dbErr) {
        console.warn("DB update notice:", dbErr);
      }

      // If approved, create student row
      if (newStatus === "approved") {
        try {
          await supabase.from("students").insert([{
            name: app.student_name,
            father_name: app.father_name,
            class: app.class_apply || app.class || "1st",
            phone: app.phone,
            monthly_fee: 1000,
            school_id: String(app.school_id || school?.id || 1),
          }]);
        } catch (stErr) {
          console.warn("Student auto-creation notice:", stErr);
        }
      }

      showToast("success", newStatus === "approved" ? "درخواست منظور کر لی گئی ہے" : "درخواست مسترد کر دی گئی");
    } catch (err: any) {
      console.error("Status update error:", err);
      showToast("error", "سٹیٹس تبدیل کرنے میں مسئلہ پیش آیا");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 font-sans">
      {/* 1. HEADER: flex-col on mobile, flex-row on md */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Left Brand Area */}
          <div className="flex items-center gap-3 justify-between md:justify-start">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border border-slate-200 shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>ڈیش بورڈ</span>
            </Link>

            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>آن لائن داخلہ درخواستیں</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    ADMISSIONS
                  </span>
                </h1>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  سکول پورٹل اور پبلک لنک سے موصول ہونے والی داخلہ درخواستیں
                </p>
              </div>
            </div>
          </div>

          {/* Right Buttons: w-full on mobile, md:w-auto, text-sm, py-2.5, rounded-xl */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <button
              onClick={handleCopyLink}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-all cursor-pointer"
              title="Copy Public Admission Link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? "لنک کاپی ہو گیا!" : "داخلہ فارم کا لنک کاپی کریں"}</span>
            </button>

            <button
              onClick={handleOpenPublicForm}
              className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl shadow-2xs transition-colors cursor-pointer"
              title="Open Public Admission Form"
            >
              <span>پبلک فارم کھولیں</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </button>

            <button
              onClick={fetchAdmissions}
              disabled={loading}
              className="p-2.5 text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-all cursor-pointer shadow-2xs hidden sm:flex items-center justify-center shrink-0"
              title="Refresh List"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-5 space-y-5">
        {/* REQUIREMENT 5: DEBUG UI IN DASHBOARD HEADER */}
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-xl p-2.5 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 shadow-2xs">
          <div>
            Debug: Current School ID = <strong>{String(school?.id || (typeof window !== "undefined" ? localStorage.getItem("school_id") : "") || "81d51c13-057c-4876-b6be-ee60d21537b9")}</strong> | Total fetched = <strong>{applications.length}</strong> | Check console
          </div>
          <button
            onClick={fetchAdmissions}
            className="text-[11px] underline font-bold text-yellow-800 hover:text-yellow-950 cursor-pointer self-start sm:self-auto"
          >
            ریفریش کریں (Refresh)
          </button>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
              toastMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === "success" ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-700">
              &times;
            </button>
          </div>
        )}

        {/* 2. STATS ROW: grid-cols-1 md:grid-cols-3 gap-3, each card p-3 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Total */}
          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Total Applications (کل درخواستیں)</p>
              <h3 className="text-xl sm:text-2xl font-black text-indigo-600 mt-0.5">{applications.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Pending */}
          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-amber-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-amber-700">Pending (زیر غور درخواستیں)</p>
              <h3 className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5">{pendingCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Approved */}
          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-emerald-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-emerald-700">Approved (منظور شدہ داخلے)</p>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">{approvedCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 3. TABS & 5. SEARCH INPUT: overflow-x-auto scrollbar-hide, flex-nowrap */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Tabs: overflow-x-auto scrollbar-hide, flex-nowrap, gap-2, pb-2, min-w-max */}
          <div className="w-full md:w-auto overflow-x-auto scrollbar-hide pb-1">
            <div className="inline-flex flex-nowrap p-1 bg-slate-200/80 rounded-2xl gap-2 min-w-max">
              <button
                onClick={() => setActiveTab("pending")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "pending"
                    ? "bg-amber-400 text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pending (زیر غور)</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/70 font-black">
                  {pendingCount}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("approved")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "approved"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Approved (منظور شدہ)</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-700 text-white font-black">
                  {approvedCount}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "all"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>All (تمام درخواستیں)</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-700 text-white font-black">
                  {totalCount}
                </span>
              </button>
            </div>
          </div>

          {/* 5. Search input: w-full, h-11, rounded-xl */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="طالب علم کا نام، فون یا داخلہ نمبر..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 h-11 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-900 shadow-2xs"
            />
          </div>
        </div>

        {/* 4. TABLE -> CARDS ON MOBILE (Most Important) */}

        {/* A: MOBILE CARDS VIEW (<md) */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
              <span>درخواستیں لوڈ ہو رہی ہیں...</span>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-400">
              <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="font-semibold text-slate-600 text-sm">کوئی درخواست موجود نہیں ہے</p>
              <p className="text-[11px] text-slate-400 mt-1">
                پبلک فارم لنک شیئر کریں تاکہ آن لائن درخواستیں موصول ہوں۔
              </p>
            </div>
          ) : (
            filteredApplications.map((app, idx) => {
              const status = (app.status || "pending").toLowerCase();
              const appNo = app.admission_no || app.application_no || `ADM-${app.id || idx + 1}`;
              const targetClass = app.class_apply || app.class || app.class_name || "1st";

              return (
                <div
                  key={app.id || idx}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3"
                >
                  {/* Card Top: Admission No + Status Badge */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="font-mono font-black text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                      {appNo}
                    </span>

                    {status === "pending" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Pending</span>
                      </span>
                    ) : status === "approved" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        <span>Approved</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        <span>Rejected</span>
                      </span>
                    )}
                  </div>

                  {/* Student & Father Info */}
                  <div className="space-y-1 text-right">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200">
                        کلاس {targetClass}
                      </span>
                      <h3 className="font-black text-slate-900 text-base">
                        {app.student_name}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-500">
                      ولدیت: <strong className="text-slate-800">{app.father_name}</strong>
                    </p>

                    {app.address && (
                      <p className="text-[11px] text-slate-400 truncate">
                        پتہ: {app.address}
                      </p>
                    )}
                  </div>

                  {/* Phone & Date */}
                  <div className="flex items-center justify-between pt-1 text-xs text-slate-600 border-t border-slate-100">
                    <span className="font-mono text-[11px] text-slate-400">
                      {app.created_at ? new Date(app.created_at).toLocaleDateString("en-PK") : "Today"}
                    </span>

                    <div className="flex items-center gap-1.5 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{app.phone}</span>
                      {app.phone && (
                        <a
                          href={`https://wa.me/${app.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                            `السلام علیکم! ${school?.name || "School"} سے آپ کی داخلہ درخواست (${app.student_name}، کلاس ${targetClass}) موصول ہوئی ہے۔`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors ml-1"
                          title="Send WhatsApp Message"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions Full Width on Mobile */}
                  <div className="flex items-center gap-2 pt-1">
                    {status === "pending" && (
                      <>
                        <button
                          onClick={() => handleStatusChange(app, "approved")}
                          className="flex-1 py-2.5 px-3 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>منظور کریں (Approve)</span>
                        </button>
                        <button
                          onClick={() => handleStatusChange(app, "rejected")}
                          className="py-2.5 px-3 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer text-center"
                        >
                          مسترد
                        </button>
                      </>
                    )}

                    {status === "approved" && (
                      <div className="w-full py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs font-bold text-emerald-700">
                        داخلہ منظور شدہ ہے
                      </div>
                    )}

                    {status === "rejected" && (
                      <button
                        onClick={() => handleStatusChange(app, "pending")}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-center text-xs font-bold text-slate-700"
                      >
                        دوبارہ زیر غور لائیں (Reset)
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* B: DESKTOP TABLE VIEW (hidden on mobile, visible on md+) */}
        <div className="hidden md:block bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
            <table className="w-full text-right text-xs text-slate-700">
              <thead className="bg-slate-100/80 text-slate-600 uppercase text-[11px] font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5 text-center">داخلہ نمبر</th>
                  <th className="px-4 py-3.5">طالب علم کا نام</th>
                  <th className="px-4 py-3.5">والد کا نام</th>
                  <th className="px-4 py-3.5 text-center">کلاس</th>
                  <th className="px-4 py-3.5">موبائل نمبر</th>
                  <th className="px-4 py-3.5 text-center">سٹیٹس (Status)</th>
                  <th className="px-4 py-3.5 text-center">تاریخ</th>
                  <th className="px-4 py-3.5 text-center">ایکشن (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                      <span>درخواستیں لوڈ ہو رہی ہیں...</span>
                    </td>
                  </tr>
                ) : filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                      <p className="font-semibold text-slate-600">کوئی درخواست موجود نہیں ہے</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        پبلک فارم پر درخواست جمع کریں یا ٹیب تبدیل کر کے چیک کریں۔
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app, idx) => {
                    const status = (app.status || "pending").toLowerCase();
                    const appNo = app.admission_no || app.application_no || `ADM-${app.id || idx + 1}`;
                    const targetClass = app.class_apply || app.class || app.class_name || "1st";

                    return (
                      <tr key={app.id || idx} className="hover:bg-indigo-50/30 transition-colors">
                        {/* Application Number */}
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-indigo-700 text-[11px]">
                          {appNo}
                        </td>

                        {/* Student Name */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900 text-sm">
                            {app.student_name}
                          </div>
                          {app.address && (
                            <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                              {app.address}
                            </div>
                          )}
                        </td>

                        {/* Father Name */}
                        <td className="px-4 py-3.5 font-medium text-slate-700">
                          {app.father_name}
                        </td>

                        {/* Class */}
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200">
                            {targetClass}
                          </span>
                        </td>

                        {/* Phone with WhatsApp link */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{app.phone}</span>
                            {app.phone && (
                              <a
                                href={`https://wa.me/${app.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                                  `السلام علیکم! ${school?.name || "School"} سے آپ کی داخلہ درخواست (${app.student_name}، کلاس ${targetClass}) موصول ہوئی ہے۔`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                title="Send WhatsApp Message"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Badges: Pending = yellow, Approved = green */}
                        <td className="px-4 py-3.5 text-center">
                          {status === "pending" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Pending</span>
                            </span>
                          ) : status === "approved" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>Approved</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>Rejected</span>
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3.5 text-center text-[11px] text-slate-500 font-mono">
                          {app.created_at ? new Date(app.created_at).toLocaleDateString("en-PK") : "Today"}
                        </td>

                        {/* Actions: Approve / Reject */}
                        <td className="px-4 py-3.5 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            {status === "pending" && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(app, "approved")}
                                  className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                                  title="منظور کریں (Approve)"
                                >
                                  منظور کریں
                                </button>
                                <button
                                  onClick={() => handleStatusChange(app, "rejected")}
                                  className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                                  title="مسترد کریں (Reject)"
                                >
                                  مسترد
                                </button>
                              </>
                            )}

                            {status === "approved" && (
                              <span className="text-[11px] text-emerald-700 font-bold px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-200">
                                داخلہ مکمل
                              </span>
                            )}

                            {status === "rejected" && (
                              <button
                                onClick={() => handleStatusChange(app, "pending")}
                                className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                              >
                                ری سیٹ
                              </button>
                            )}
                          </div>
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
    </div>
  );
}
