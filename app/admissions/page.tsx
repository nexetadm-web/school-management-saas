"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useSchool, generateSchoolSlug } from "@/lib/school-context";
import { SchoolLogo } from "@/components/school-branding";
import { getTodayPKDate } from "@/lib/date-utils";
import QRCode from "qrcode";
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
  CreditCard,
  X,
  FileCheck,
  QrCode,
  Download,
  Printer,
} from "lucide-react";

export interface AdmissionApplication {
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
  rejection_reason?: string;
  created_at?: string;
}

export default function AdminAdmissionsPage() {
  const router = useRouter();
  const { school } = useSchool();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // QR Code & Modals State
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [rejectModalApp, setRejectModalApp] = useState<AdmissionApplication | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("سیٹیں مکمل ہو چکی ہیں");

  const todayPK = getTodayPKDate();

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAdmissions = async () => {
    try {
      setLoading(true);
      const sId = school.id || "all";
      let appList: AdmissionApplication[] = [];

      // 1. Fetch fresh from /api/applications with cache: no-store
      try {
        const res = await fetch("/api/applications", { cache: "no-store" });
        if (res.ok) {
          const freshData = await res.json();
          if (Array.isArray(freshData) && freshData.length > 0) {
            appList = freshData;
          }
        }
      } catch (e) {}

      // 2. Fetch from online_admissions table in DB
      try {
        let oQuery = supabase.from("online_admissions").select("*").order("id", { ascending: false });
        if (sId && sId !== "all") {
          oQuery = oQuery.eq("school_id", String(sId));
        }
        const { data: oData, error: oError } = await oQuery;
        if (!oError && oData && oData.length > 0) {
          oData.forEach((row: any) => {
            appList.push({
              id: row.tracking_no || row.id,
              school_id: row.school_id,
              student_name: row.student_name || row.full_name,
              father_name: row.father_name,
              dob: row.dob || "N/A",
              gender: row.gender || "Male",
              class_applying: row.class || row.desired_class || row.class_applying || "1st",
              previous_school: row.previous_school,
              phone: row.phone,
              address: row.address,
              photo_url: row.photo_url,
              status: row.status || "pending",
              created_at: row.applied_at || row.created_at,
            });
          });
        }
      } catch (e) {}

      // 2. Fetch from admission_applications
      try {
        let appQuery = supabase.from("admission_applications").select("*").order("id", { ascending: false });
        if (sId && sId !== "all") {
          appQuery = appQuery.eq("school_id", sId);
        }
        const { data: aData } = await appQuery;
        if (aData && aData.length > 0) {
          aData.forEach((row: any) => {
            const rowId = row.tracking_no || row.id;
            if (!appList.some((x) => String(x.id) === String(rowId))) {
              appList.push({
                id: rowId,
                school_id: row.school_id,
                student_name: row.full_name || row.student_name,
                father_name: row.father_name,
                dob: row.dob || "N/A",
                gender: row.gender || "Male",
                class_applying: row.desired_class || row.class || row.class_applying || "1st",
                previous_school: row.previous_school,
                phone: row.phone,
                address: row.address,
                photo_url: row.photo_url,
                status: row.status || "pending",
                created_at: row.created_at,
              });
            }
          });
        }
      } catch (e) {}

      // 3. Fetch from legacy admissions
      try {
        let query = supabase.from("admissions").select("*").order("id", { ascending: false });
        if (sId && sId !== "all") {
          query = query.eq("school_id", sId);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          data.forEach((row: any) => {
            if (!appList.some((x) => String(x.id) === String(row.id))) {
              appList.push(row);
            }
          });
        }
      } catch (dbErr) {}

      // 4. Fallback to localStorage
      if (appList.length === 0) {
        const localStoreKey = `oa_school_admissions_${sId}`;
        const stored = typeof window !== "undefined" ? localStorage.getItem(localStoreKey) : null;
        if (stored) {
          try {
            appList = JSON.parse(stored);
          } catch (e) {}
        } else {
          // Realistic initial applications
          appList = [
            {
              id: "ADM-2026-1042",
              school_id: sId === "all" ? 1 : sId,
              student_name: "Hamza Tariq",
              father_name: "Tariq Mehmood",
              dob: "12-04-2018",
              gender: "Male",
              class_applying: "2nd",
              previous_school: "Army Public School",
              phone: "03001234567",
              address: "Civil Lines",
              status: "pending",
              created_at: new Date().toISOString(),
            },
            {
              id: "ADM-2026-1043",
              school_id: sId === "all" ? 1 : sId,
              student_name: "Ayesha Noor",
              father_name: "Muhammad Noor",
              dob: "20-08-2019",
              gender: "Female",
              class_applying: "1st",
              previous_school: "Fresh Admission",
              phone: "03019876543",
              address: "Model Town",
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

    if (!school.id || school.id === "all") return;

    // Realtime subscription for incoming applications
    const channel = supabase
      .channel(`realtime_admissions_${school.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "online_admissions",
          filter: `school_id=eq.${school.id}`,
        },
        (payload: any) => {
          if (payload.new) {
            const newItem: AdmissionApplication = {
              id: payload.new.tracking_no || payload.new.id,
              school_id: payload.new.school_id,
              student_name: payload.new.student_name || payload.new.full_name,
              father_name: payload.new.father_name,
              dob: payload.new.dob || "N/A",
              gender: payload.new.gender || "Male",
              class_applying: payload.new.class || payload.new.desired_class || "1st",
              previous_school: payload.new.previous_school,
              phone: payload.new.phone,
              address: payload.new.address,
              photo_url: payload.new.photo_url,
              status: payload.new.status || "pending",
              created_at: payload.new.applied_at || payload.new.created_at,
            };
            setApplications((prev) => [newItem, ...prev.filter((p) => p.id !== newItem.id)]);
            showToast("success", `نئی داخلہ درخواست موصول ہوئی: ${newItem.student_name}`);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admission_applications",
          filter: `school_id=eq.${school.id}`,
        },
        (payload: any) => {
          if (payload.new) {
            const newItem: AdmissionApplication = {
              id: payload.new.tracking_no || payload.new.id,
              school_id: payload.new.school_id,
              student_name: payload.new.full_name || payload.new.student_name,
              father_name: payload.new.father_name,
              dob: payload.new.dob || "N/A",
              gender: payload.new.gender || "Male",
              class_applying: payload.new.desired_class || payload.new.class_applying || "1st",
              previous_school: payload.new.previous_school,
              phone: payload.new.phone,
              address: payload.new.address,
              photo_url: payload.new.photo_url,
              status: payload.new.status || "pending",
              created_at: payload.new.created_at,
            };
            setApplications((prev) => [newItem, ...prev.filter((p) => p.id !== newItem.id)]);
            showToast("success", `نئی داخلہ درخواست موصول ہوئی: ${newItem.student_name}`);
          }
        }
      )
      .subscribe();

    // Polling every 10 seconds to guarantee fresh data on all devices
    const interval = setInterval(loadAdmissions, 10000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [school.id]);

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

  // APPROVE & ENROLL HANDLER (آٹو سٹوڈنٹ داخلہ + داخلہ نمبر + واٹس ایپ)
  const handleApproveAndEnroll = async (app: AdmissionApplication) => {
    try {
      const sId = school.id || 1;
      const admNo = String(app.id).startsWith("ADM-") ? String(app.id) : `ADM-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Insert into students table
      const studentPayload = {
        school_id: sId === "all" ? 1 : sId,
        name: app.student_name,
        father_name: app.father_name,
        class: app.class_applying,
        phone: app.phone,
        monthly_fee: 2500,
        roll_no: Math.floor(10 + Math.random() * 89),
      };

      try {
        await supabase.from("students").insert([studentPayload]);
      } catch (dbErr) {
        console.warn("DB insert students fallback:", dbErr);
      }

      // 2. Update admission status to 'approved'
      try {
        await supabase.from("online_admissions").update({ status: "approved" }).eq("tracking_no", app.id);
      } catch (e) {}
      try {
        await supabase.from("admissions").update({ status: "approved" }).eq("id", app.id);
      } catch (e) {}
      try {
        await supabase.from("admission_applications").update({ status: "approved" }).eq("id", app.id);
      } catch (e) {}

      // 3. Update local state
      const updated = applications.map((a) => (a.id === app.id ? { ...a, status: "approved" as const } : a));
      setApplications(updated);

      const localStoreKey = `oa_school_admissions_${sId}`;
      if (typeof window !== "undefined") {
        localStorage.setItem(localStoreKey, JSON.stringify(updated));
      }

      showToast("success", `طالب علم ${app.student_name} کا داخلہ کلاس ${app.class_applying} میں منظور ہو گیا!`);

      // 4. Send Approval WhatsApp message
      const phoneDigits = app.phone.replace(/[^0-9]/g, "");
      const intlPhone = phoneDigits.startsWith("0") ? `92${phoneDigits.slice(1)}` : phoneDigits;
      const whatsappMsg = `السلام علیکم محترم ${app.father_name}! مبارک ہو، آپ کے بچے ${app.student_name} کا داخلہ کلاس ${app.class_applying} میں منظور ہو گیا ہے۔ داخلہ نمبر: ${admNo}۔ سٹوڈنٹ آئی ڈی کارڈ اور مزید کوائف کے لیے سکول آفس تشریف لائیں۔ - ${school.name}`;

      window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(whatsappMsg)}`, "_blank");
    } catch (err: any) {
      console.error(err);
      showToast("error", err.message || "Failed to enroll student.");
    }
  };

  // REJECT HANDLER (واٹس ایپ وجہ کے ساتھ)
  const handleConfirmReject = async () => {
    if (!rejectModalApp) return;
    const app = rejectModalApp;
    const reason = rejectReason.trim() || "سیٹیں مکمل ہو چکی ہیں";

    try {
      const sId = school.id || 1;

      try {
        await supabase.from("online_admissions").update({ status: "rejected", rejection_reason: reason }).eq("tracking_no", app.id);
      } catch (e) {}
      try {
        await supabase.from("admissions").update({ status: "rejected" }).eq("id", app.id);
      } catch (e) {}
      try {
        await supabase.from("admission_applications").update({ status: "rejected", rejection_reason: reason }).eq("id", app.id);
      } catch (e) {}

      const updated = applications.map((a) =>
        a.id === app.id ? { ...a, status: "rejected" as const, rejection_reason: reason } : a
      );
      setApplications(updated);

      const localStoreKey = `oa_school_admissions_${sId}`;
      if (typeof window !== "undefined") {
        localStorage.setItem(localStoreKey, JSON.stringify(updated));
      }

      setRejectModalApp(null);
      showToast("success", `درخواست #${app.id} مسترد کر دی گئی۔`);

      // Send Rejection WhatsApp notice
      const phoneDigits = app.phone.replace(/[^0-9]/g, "");
      const intlPhone = phoneDigits.startsWith("0") ? `92${phoneDigits.slice(1)}` : phoneDigits;
      const whatsappMsg = `السلام علیکم محترم ${app.father_name}! معذرت کے ساتھ مطلع کیا جاتا ہے کہ آپ کے بچے ${app.student_name} کی کلاس ${app.class_applying} کے لیے داخلہ درخواست منظور نہیں ہو سکی۔ وجہ: ${reason}۔ - ${school.name}`;

      window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(whatsappMsg)}`, "_blank");
    } catch (err: any) {
      showToast("error", "Failed to update status.");
    }
  };

  // Public Admission Link with School Specific Slug
  const schoolSlug = school.slug || generateSchoolSlug(school.name, school.id);
  const publicLink = typeof window !== "undefined" && window.location.origin
    ? `${window.location.origin}/apply/${schoolSlug}`
    : `https://s-iota.vercel.app/apply/${schoolSlug}`;

  useEffect(() => {
    if (publicLink) {
      QRCode.toDataURL(publicLink, { width: 300, margin: 2 })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error("QR Code generation error:", err));
    }
  }, [publicLink]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
    showToast("success", `لنک کاپی ہو گیا: /apply/${schoolSlug}`);
  };

  const handleShareWhatsApp = () => {
    const msg = `ہمارے سکول ${school.name} میں آن لائن داخلہ جاری ہے - لنک: ${publicLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleDownloadQr = () => {
    if (!qrCodeDataUrl) return;
    const a = document.createElement("a");
    a.href = qrCodeDataUrl;
    a.download = `${schoolSlug}-admission-qr.png`;
    a.click();
    showToast("success", "کیو آر کوڈ ڈاؤن لوڈ ہو گیا!");
  };

  const handlePrintQr = () => {
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    printWin.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ur">
      <head>
        <meta charset="utf-8" />
        <title>${school.name} - Online Admission QR Code</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 20px; margin: 0; background: #fff; color: #0f172a; }
          .card { border: 3px dashed #1e3a5f; border-radius: 24px; padding: 36px 24px; max-width: 480px; margin: 0 auto; box-sizing: border-box; }
          .badge { display: inline-block; background: #fef08a; color: #1e3a5f; padding: 6px 16px; border-radius: 999px; font-weight: 800; font-size: 13px; margin-bottom: 16px; border: 1px solid #facc15; }
          h1 { color: #1e3a5f; margin: 0 0 8px; font-size: 26px; font-weight: 900; }
          .info { color: #475569; font-size: 13px; margin: 4px 0 20px; line-height: 1.5; }
          .qr-box { background: #ffffff; padding: 16px; display: inline-block; border-radius: 16px; border: 2px solid #e2e8f0; margin: 10px auto; }
          img { display: block; margin: 0 auto; }
          .instructions { margin-top: 18px; font-size: 15px; font-weight: 800; color: #1e3a5f; line-height: 1.6; }
          .sub-inst { font-size: 12px; color: #64748b; margin-top: 4px; }
          .link-box { margin-top: 20px; padding: 10px 14px; background: #f1f5f9; border-radius: 10px; font-family: monospace; font-size: 12px; color: #1d4ed8; word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">آن لائن داخلہ جاری ہے • سیشن 2026-2027</div>
          <h1>${school.name}</h1>
          <p class="info">${school.address || "Main Campus"} &bull; رابطہ: ${school.phone || "+92 300 1234567"}</p>
          <div class="qr-box">
            <img src="${qrCodeDataUrl}" width="260" height="260" alt="Admission QR Code" />
          </div>
          <p class="instructions">موبائل کیمرہ سے کیو آر کوڈ اسکین کریں اور داخلہ فارم پر کریں</p>
          <p class="sub-inst">Scan this QR Code with any phone camera to open online admission</p>
          <div class="link-box">${publicLink}</div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(() => { window.print(); }, 400);
          };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
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
              <span>ڈیش بورڈ</span>
            </Link>
            <div className="flex items-center gap-2">
              <SchoolLogo name={school.name} logoUrl={school.logo_url} size="sm" />
              <div>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  آن لائن داخلہ ڈیسک (Online Admissions)
                </h1>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  {school.name} &bull; داخلہ درخواستیں، آٹو سٹوڈنٹ انرولمنٹ و واٹس ایپ
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? "کاپی ہو گیا" : "داخلہ لنک کاپی کریں"}</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp پر شیئر کریں</span>
            </button>
            <button
              onClick={() => setShowQrModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR کوڈ</span>
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

        {/* Public Link Banner */}
        <div className="bg-linear-to-r from-indigo-900 to-[#1e3a5f] rounded-2xl p-5 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
          <div className="space-y-1 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-yellow-400 text-[#1e3a5f] text-[10px] font-black uppercase">
              پبلک ایڈمشن پورٹل
            </div>
            <h2 className="text-base font-bold text-white">والدین کے لیے آن لائن داخلہ فارم لنک</h2>
            <p className="text-xs text-blue-200">
              اس لنک کو فیس بک، واٹس ایپ گروپس اور بروشر پر شیئر کریں تاکہ نئے داخلے بڑھ سکیں۔
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/20 w-full md:w-auto">
            <span className="text-xs text-yellow-300 font-mono truncate max-w-[200px] sm:max-w-xs">
              {publicLink}
            </span>
            <button
              onClick={handleCopyLink}
              className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors cursor-pointer shrink-0"
              title="Copy Link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setShowQrModal(true)}
              className="p-1.5 bg-white/20 hover:bg-white/30 text-yellow-300 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Show QR Code"
            >
              <QrCode className="w-3.5 h-3.5" />
            </button>
            <Link
              href={`/apply/${schoolSlug}`}
              target="_blank"
              className="p-1.5 bg-white text-indigo-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              title="Open public form"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Filter and Search */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="نام، والد کا نام یا فون سے تلاش کریں..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold w-full sm:w-auto justify-center">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
              }`}
            >
              تمام ({applications.length})
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === "pending" ? "bg-white text-amber-700 shadow-xs" : "text-slate-600"
              }`}
            >
              زیر غور ({applications.filter((a) => a.status === "pending").length})
            </button>
            <button
              onClick={() => setStatusFilter("approved")}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === "approved" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600"
              }`}
            >
              منظور شدہ ({applications.filter((a) => a.status === "approved").length})
            </button>
            <button
              onClick={() => setStatusFilter("rejected")}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                statusFilter === "rejected" ? "bg-white text-rose-700 shadow-xs" : "text-slate-600"
              }`}
            >
              مسترد شدہ ({applications.filter((a) => a.status === "rejected").length})
            </button>
          </div>
        </div>

        {/* Application Cards Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
            <span>درخواستیں لوڈ ہو رہی ہیں...</span>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
            <FileCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">کوئی داخلہ درخواست موجود نہیں ہے</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              اوپر دیا گیا پبلک لنک والدین کے ساتھ شیئر کریں تاکہ وہ آن لائن داخلہ فارم جمع کروا سکیں۔
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredApps.map((app) => (
              <div
                key={app.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4 hover:shadow-md transition-shadow relative overflow-hidden"
              >
                {/* Status Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      #{app.id}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      Class {app.class_applying}
                    </span>
                  </div>

                  {app.status === "approved" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      <CheckCircle className="w-3 h-3" />
                      <span>منظور شدہ (Approved)</span>
                    </span>
                  ) : app.status === "rejected" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      <XCircle className="w-3 h-3" />
                      <span>مسترد شدہ (Rejected)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      <Clock className="w-3 h-3" />
                      <span>زیر غور (Pending)</span>
                    </span>
                  )}
                </div>

                {/* Candidate Info */}
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden font-bold text-slate-600 text-sm">
                    {app.photo_url ? (
                      <img src={app.photo_url} alt={app.student_name} className="w-full h-full object-cover" />
                    ) : (
                      app.student_name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{app.student_name}</h3>
                    <p className="text-xs text-slate-500">والد: {app.father_name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span>{app.phone}</span>
                    </p>
                  </div>
                </div>

                {/* Meta Details */}
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">تاریخ پیدائش:</span>
                    <span className="font-semibold text-slate-700">{app.dob}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">سابقہ سکول:</span>
                    <span className="font-semibold text-slate-700 truncate block">
                      {app.previous_school || "Fresh"}
                    </span>
                  </div>
                </div>

                {app.rejection_reason && (
                  <p className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100 font-medium">
                    وجہ مستردگی: {app.rejection_reason}
                  </p>
                )}

                {/* Actions */}
                <div className="pt-2 flex items-center gap-2">
                  {app.status === "pending" ? (
                    <>
                      <button
                        onClick={() => handleApproveAndEnroll(app)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>منظور کریں (Approve)</span>
                      </button>
                      <button
                        onClick={() => {
                          setRejectModalApp(app);
                          setRejectReason("سیٹیں مکمل ہو چکی ہیں");
                        }}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>مسترد</span>
                      </button>
                    </>
                  ) : app.status === "approved" ? (
                    <div className="w-full flex items-center justify-between gap-2">
                      <Link
                        href="/id-cards"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>ID کارڈ دیکھیں</span>
                      </Link>
                      <button
                        onClick={() => {
                          const phoneDigits = app.phone.replace(/[^0-9]/g, "");
                          const intlPhone = phoneDigits.startsWith("0") ? `92${phoneDigits.slice(1)}` : phoneDigits;
                          const msg = `السلام علیکم محترم ${app.father_name}! آپ کے بچے ${app.student_name} کا داخلہ کلاس ${app.class_applying} میں منظور ہو چکا ہے۔ - ${school.name}`;
                          window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`, "_blank");
                        }}
                        className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 cursor-pointer"
                        title="Send WhatsApp confirmation"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setRejectModalApp(app);
                        setRejectReason(app.rejection_reason || "سیٹیں مکمل ہو چکی ہیں");
                      }}
                      className="w-full py-1.5 text-center text-xs text-rose-600 bg-rose-50 rounded-xl font-bold border border-rose-100 cursor-pointer hover:bg-rose-100"
                    >
                      دوبارہ وجہ واٹس ایپ کریں
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* REJECT MODAL WITH REASON */}
      {rejectModalApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-rose-700 flex items-center gap-1.5">
                <XCircle className="w-4 h-4" />
                <span>درخواست مسترد کرنے کی وجہ لکھیں</span>
              </h3>
              <button
                onClick={() => setRejectModalApp(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              طالب علم <strong className="text-slate-800">{rejectModalApp.student_name}</strong> (والد: {rejectModalApp.father_name}) کے والد کو واٹس ایپ پر یہ وجہ بھیجی جائے گی:
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">وجہ منتخب کریں یا درج کریں:</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none font-semibold text-slate-800"
              >
                <option value="سیٹیں مکمل ہو چکی ہیں">سیٹیں مکمل ہو چکی ہیں (Class Seats Full)</option>
                <option value="عمر کی حد پوری نہیں ہے">عمر کی حد پوری نہیں ہے (Age Criteria Not Met)</option>
                <option value="سابقہ سکول رزلٹ ریکارڈ نامکمل ہے">سابقہ سکول رزلٹ ریکارڈ نامکمل ہے</option>
                <option value="داخلہ ٹیسٹ میں مطلوبہ نمبر حاصل نہیں ہوئے">داخلہ ٹیسٹ میں مطلوبہ نمبر حاصل نہیں ہوئے</option>
              </select>

              <textarea
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="تفصیلی وجہ لکھیں..."
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-rose-400 text-slate-800"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleConfirmReject}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                مسترد کریں اور WhatsApp بھیجیں
              </button>
              <button
                onClick={() => setRejectModalApp(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                منسوخ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR CODE MODAL (کیو آر کوڈ برائے آن لائن داخلہ) */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-200 text-center relative animate-in fade-in zoom-in duration-150">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 pt-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>آن لائن داخلہ سیشن 2026-2027</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">{school.name}</h3>
              <p className="text-xs text-slate-500">کیو آر کوڈ اسکین کر کے داخلہ فارم پر کریں</p>
            </div>

            {/* QR Image Box */}
            <div className="p-4 bg-slate-50 border-2 border-dashed border-indigo-200 rounded-2xl flex flex-col items-center justify-center">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="Online Admission QR Code"
                  className="w-56 h-56 rounded-xl shadow-xs bg-white p-2"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-400">
                  QR کوڈ تیار ہو رہا ہے...
                </div>
              )}
              <span className="text-[11px] text-slate-500 font-medium mt-2">
                کسی بھی فون کیمرہ یا واٹس ایپ سے اسکین کریں
              </span>
            </div>

            {/* Link Preview with Copy */}
            <div className="flex items-center gap-1.5 p-2 bg-slate-100 rounded-xl text-left">
              <span className="text-[11px] text-slate-600 font-mono truncate flex-1 px-1">
                {publicLink}
              </span>
              <button
                onClick={handleCopyLink}
                className="px-2.5 py-1 bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors cursor-pointer shrink-0"
              >
                {copiedLink ? "کاپی ہو گیا" : "کاپی"}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleDownloadQr}
                className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>ڈاؤن لوڈ کریں</span>
              </button>
              <button
                onClick={handlePrintQr}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>پرنٹ کریں</span>
              </button>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
            >
              بند کریں
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
