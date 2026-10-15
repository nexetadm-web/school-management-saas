"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSchool } from "@/lib/school-context";
import { generateSchoolSlug } from "@/lib/school-slug";
import { SchoolLogo } from "@/components/school-branding";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  RefreshCw,
  RotateCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Phone,
  User,
  Calendar,
  Building,
  Check,
  Copy,
  MessageCircle,
  QrCode,
  Download,
  Printer,
  ExternalLink,
  Sparkles,
  UserCheck,
  X,
  FileCheck,
} from "lucide-react";

export interface ApplicationItem {
  id: string | number;
  tracking_no?: string;
  school_id: string | number;
  student_name: string;
  father_name: string;
  dob?: string;
  gender?: string;
  class?: string;
  desired_class?: string;
  class_applying?: string;
  previous_school?: string;
  phone: string;
  address?: string;
  photo_url?: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  created_at: string | Date;
}

interface OnlineAdmissionsClientProps {
  initialApplications?: ApplicationItem[];
  initialSchoolId?: string | number;
}

export default function OnlineAdmissionsClient({
  initialApplications = [],
  initialSchoolId,
}: OnlineAdmissionsClientProps) {
  const router = useRouter();
  const { school } = useSchool();

  const activeSchoolId = school.id || initialSchoolId || "1";
  const [apps, setApps] = useState<ApplicationItem[]>(initialApplications);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // QR Modal State
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Reject Modal State
  const [rejectModalApp, setRejectModalApp] = useState<ApplicationItem | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("سیٹیں مکمل ہو چکی ہیں");

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // AUTO POLLING: Har 10 sec me check karega with cache: 'no-store' strictly for activeSchoolId
  useEffect(() => {
    if (!activeSchoolId || activeSchoolId === "all") return;
    const fetchApps = () =>
      fetch(`/api/applications?school_id=${encodeURIComponent(String(activeSchoolId))}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setApps(data);
          }
        })
        .catch(() => {});

    fetchApps();
    const interval = setInterval(fetchApps, 10000); // Har 10 sec me check karega
    return () => clearInterval(interval);
  }, [activeSchoolId]);

  // Realtime subscription via Supabase for immediate sub-second notification
  useEffect(() => {
    if (!activeSchoolId || activeSchoolId === "all") return;

    const channel = supabase
      .channel(`realtime_online_admissions_${activeSchoolId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "online_admissions",
          filter: `school_id=eq.${activeSchoolId}`,
        },
        (payload: any) => {
          if (payload.new) {
            const newItem: ApplicationItem = {
              id: payload.new.tracking_no || payload.new.id,
              tracking_no: payload.new.tracking_no,
              school_id: payload.new.school_id,
              student_name: payload.new.student_name || payload.new.full_name,
              father_name: payload.new.father_name,
              dob: payload.new.dob || "N/A",
              gender: payload.new.gender || "Male",
              class: payload.new.class || payload.new.desired_class || "1st",
              desired_class: payload.new.desired_class || payload.new.class || "1st",
              previous_school: payload.new.previous_school,
              phone: payload.new.phone,
              address: payload.new.address,
              photo_url: payload.new.photo_url,
              status: payload.new.status || "pending",
              created_at: payload.new.created_at || payload.new.applied_at || new Date().toISOString(),
            };
            setApps((prev) => [newItem, ...prev.filter((p) => p.id !== newItem.id)]);
            showToast("success", `نئی آن لائن درخواست موصول ہوئی: ${newItem.student_name}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSchoolId]);

  // Public Admission Link with slug
  const schoolSlug = school.slug || generateSchoolSlug(school.name, school.id || activeSchoolId);
  const origin = typeof window !== "undefined" && window.location.origin
    ? window.location.origin
    : "https://s-iota.vercel.app";
  const publicLink = `${origin}/apply/${schoolSlug}`;

  useEffect(() => {
    if (publicLink) {
      QRCode.toDataURL(publicLink, { width: 300, margin: 2 })
        .then(setQrCodeDataUrl)
        .catch(() => {});
    }
  }, [publicLink]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
    showToast("success", `داخلہ لنک کاپی ہو گیا: /apply/${schoolSlug}`);
  };

  const handleShareWhatsApp = () => {
    const msg = `ہمارے سکول ${school.name} میں آن لائن داخلہ جاری ہے - لنک: ${publicLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Manual Refresh Handler with router.refresh() and window.location.reload()
  const handleManualRefresh = () => {
    setRefreshing(true);
    fetch("/api/applications", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setApps(data);
        router.refresh();
        showToast("success", "ڈیٹا کامیابی سے ریفریش ہو گیا!");
      })
      .catch(() => {
        showToast("error", "ریفریش میں مسئلہ پیش آیا");
      })
      .finally(() => {
        setTimeout(() => setRefreshing(false), 400);
      });
  };

  const handleHardReload = () => {
    window.location.reload();
  };

  // Approve & Enroll Handler
  const handleApproveAndEnroll = async (app: ApplicationItem) => {
    try {
      const admNo = app.tracking_no || `ADM-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Update pending student to enrolled (monthly_fee: 2500)
      const numId = parseInt(String(app.id).replace("ADM-2026-", ""));
      if (!isNaN(numId)) {
        try {
          await supabase.from("students").update({ monthly_fee: 2500 }).eq("id", numId);
        } catch (e) {}
      } else {
        try {
          await supabase.from("students").insert([
            {
              school_id: activeSchoolId === "all" ? 1 : activeSchoolId,
              name: app.student_name,
              father_name: app.father_name,
              class: app.class || app.desired_class || "1st",
              phone: app.phone,
              monthly_fee: 2500,
              roll_no: Math.floor(10 + Math.random() * 89),
            },
          ]);
        } catch (e) {}
      }

      // 2. Update status in online_admissions, admission_applications, admissions
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
      setApps((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, status: "approved" as const } : a))
      );

      showToast("success", `طالب علم ${app.student_name} کا داخلہ کلاس ${app.class || "1st"} میں منظور ہو گیا!`);

      // 4. Send Approval WhatsApp message
      const phoneDigits = app.phone.replace(/[^0-9]/g, "");
      const intlPhone = phoneDigits.startsWith("0") ? `92${phoneDigits.slice(1)}` : phoneDigits;
      const targetClass = app.class || app.desired_class || "1st";
      const whatsappMsg = `السلام علیکم محترم ${app.father_name}! مبارک ہو، آپ کے بچے ${app.student_name} کا داخلہ کلاس ${targetClass} میں منظور ہو گیا ہے۔ داخلہ نمبر: ${admNo}۔ سٹوڈنٹ کارڈ اور کوائف کے لیے سکول آفس تشریف لائیں۔ - ${school.name}`;

      window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(whatsappMsg)}`, "_blank");
    } catch (err: any) {
      showToast("error", err.message || "داخلہ منظور کرنے میں غلطی");
    }
  };

  // Confirm Reject Handler
  const handleConfirmReject = async () => {
    if (!rejectModalApp) return;
    const app = rejectModalApp;
    const reason = rejectReason.trim() || "سیٹیں مکمل ہو چکی ہیں";

    try {
      const numId = parseInt(String(app.id).replace("ADM-2026-", ""));
      if (!isNaN(numId)) {
        try {
          await supabase.from("students").delete().eq("id", numId);
        } catch (e) {}
      }

      try {
        await supabase.from("online_admissions").update({ status: "rejected", rejection_reason: reason }).eq("tracking_no", app.id);
      } catch (e) {}
      try {
        await supabase.from("admissions").update({ status: "rejected" }).eq("id", app.id);
      } catch (e) {}
      try {
        await supabase.from("admission_applications").update({ status: "rejected", rejection_reason: reason }).eq("id", app.id);
      } catch (e) {}

      setApps((prev) =>
        prev.map((a) =>
          a.id === app.id ? { ...a, status: "rejected" as const, rejection_reason: reason } : a
        )
      );

      setRejectModalApp(null);
      showToast("success", `درخواست #${app.id} مسترد کر دی گئی۔`);

      const phoneDigits = app.phone.replace(/[^0-9]/g, "");
      const intlPhone = phoneDigits.startsWith("0") ? `92${phoneDigits.slice(1)}` : phoneDigits;
      const targetClass = app.class || app.desired_class || "1st";
      const whatsappMsg = `السلام علیکم محترم ${app.father_name}! معذرت کے ساتھ مطلع کیا جاتا ہے کہ آپ کے بچے ${app.student_name} کی کلاس ${targetClass} کے لیے داخلہ درخواست منظور نہیں ہو سکی۔ وجہ: ${reason}۔ - ${school.name}`;

      window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(whatsappMsg)}`, "_blank");
    } catch (err: any) {
      showToast("error", "درخواست اپ ڈیٹ نہ ہو سکی");
    }
  };

  // Download & Print QR Flyer
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

  // Filtered Applications
  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const matchesStatus = statusFilter === "all" || app.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (app.student_name && app.student_name.toLowerCase().includes(q)) ||
        (app.father_name && app.father_name.toLowerCase().includes(q)) ||
        (app.phone && app.phone.includes(q)) ||
        String(app.id).toLowerCase().includes(q) ||
        (app.tracking_no && app.tracking_no.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [apps, statusFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>ڈیش بورڈ</span>
            </Link>
            <div className="flex items-center gap-2">
              <SchoolLogo name={school.name} logoUrl={school.logo_url} size="sm" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                    آن لائن داخلہ ڈیسک (Live Applications)
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>لائیو نو کیش (10s Polling)</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  {school.name} &bull; تمام ڈیوائسز پر فوری لائیو اپ ڈیٹ
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons: Refresh, WhatsApp, QR, Copy Link */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {/* Manual Refresh button with router.refresh() and window.location.reload() */}
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              title="تین سیکنڈ میں تازہ ترین ڈیٹا ریفریش کریں"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
              <span>{refreshing ? "تازہ ہو رہا ہے..." : "ریفریش (Fresh)"}</span>
            </button>

            <button
              onClick={handleHardReload}
              title="براؤزر فل ری لوڈ (Hard Reload)"
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-lg transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

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
              <span>WhatsApp</span>
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

      {/* Main Content */}
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
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
        )}

        {/* Public Link Banner */}
        <div className="bg-linear-to-r from-[#0f172a] via-[#1e3a5f] to-[#0f172a] rounded-2xl p-5 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
          <div className="space-y-1 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-yellow-400 text-[#1e3a5f] text-[10px] font-black uppercase">
              آن لائن داخلہ پورٹل
            </div>
            <h2 className="text-base font-bold text-white">والدین کے لیے پبلک داخلہ فارم لنک</h2>
            <p className="text-xs text-blue-200">
              ہر ڈیوائس پر کیش کے بغیر فوری کھلے گا &bull; داخلہ فارم پر ہوتے ہی یہاں 10 سیکنڈ میں آٹو ریفریش ہوگا
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

        {/* Filter and Search Bar */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="طالب علم، والد کا نام، موبائل یا ٹریکنگ نمبر..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-end">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  statusFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                }`}
              >
                تمام ({apps.length})
              </button>
              <button
                onClick={() => setStatusFilter("pending")}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  statusFilter === "pending" ? "bg-white text-amber-700 shadow-xs" : "text-slate-600"
                }`}
              >
                زیر غور ({apps.filter((a) => a.status === "pending").length})
              </button>
              <button
                onClick={() => setStatusFilter("approved")}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  statusFilter === "approved" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600"
                }`}
              >
                منظور شدہ ({apps.filter((a) => a.status === "approved").length})
              </button>
              <button
                onClick={() => setStatusFilter("rejected")}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  statusFilter === "rejected" ? "bg-white text-rose-700 shadow-xs" : "text-slate-600"
                }`}
              >
                مسترد ({apps.filter((a) => a.status === "rejected").length})
              </button>
            </div>
          </div>
        </div>

        {/* Applications List */}
        {filteredApps.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <FileCheck className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-700">کوئی درخواست موجود نہیں ہے</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              اوپر دیے گئے داخلہ لنک کو والدین کے ساتھ شیئر کریں۔ نئی درخواستیں فوراً یہاں ظاہر ہوں گی۔
            </p>
            <button
              onClick={handleManualRefresh}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>دوبارہ چیک کریں</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredApps.map((app) => (
              <div
                key={String(app.id)}
                className={`bg-white rounded-2xl border p-5 space-y-4 shadow-xs transition-all hover:shadow-md ${
                  app.status === "approved"
                    ? "border-emerald-200 bg-emerald-50/10"
                    : app.status === "rejected"
                    ? "border-rose-200 bg-rose-50/10"
                    : "border-slate-200"
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm">
                      {app.student_name ? app.student_name.charAt(0).toUpperCase() : "S"}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        {app.student_name}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        والد: {app.father_name}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      app.status === "approved"
                        ? "bg-emerald-100 text-emerald-800"
                        : app.status === "rejected"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {app.status === "approved"
                      ? "منظور شدہ"
                      : app.status === "rejected"
                      ? "مسترد"
                      : "زیر غور"}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">مطلوبہ کلاس:</span>
                    <strong className="text-slate-800 font-bold">
                      {app.class || app.desired_class || app.class_applying || "1st"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">موبائل نمبر:</span>
                    <strong className="text-slate-800 font-mono font-bold">{app.phone}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">ٹریکنگ نمبر:</span>
                    <span className="text-indigo-700 font-mono font-bold text-[10px]">
                      {app.tracking_no || String(app.id)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">تاریخ پیدائش:</span>
                    <span className="text-slate-700">{app.dob || "N/A"}</span>
                  </div>
                  {app.previous_school && app.previous_school !== "N/A" && (
                    <div className="col-span-2 pt-1 border-t border-slate-200/60">
                      <span className="text-slate-400 block text-[10px]">سابقہ سکول:</span>
                      <span className="text-slate-700 truncate block">{app.previous_school}</span>
                    </div>
                  )}
                  {app.address && app.address !== "N/A" && (
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[10px]">پتہ:</span>
                      <span className="text-slate-700 truncate block">{app.address}</span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="space-y-2 pt-1">
                  {app.status === "pending" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleApproveAndEnroll(app)}
                        className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>منظور کریں</span>
                      </button>
                      <button
                        onClick={() => {
                          setRejectModalApp(app);
                          setRejectReason("سیٹیں مکمل ہو چکی ہیں");
                        }}
                        className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>مسترد</span>
                      </button>
                    </div>
                  ) : app.status === "approved" ? (
                    <div className="p-2 bg-emerald-100/50 rounded-xl text-[11px] font-bold text-emerald-800 text-center flex items-center justify-center gap-1.5 border border-emerald-200">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      <span>طالب علم سکول میں داخل ہو چکا ہے</span>
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

      {/* QR CODE MODAL */}
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
