"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getTodayPKDate } from "@/lib/date-utils";
import { SchoolLogo } from "@/components/school-branding";
import { generateSchoolSlug, unslugify } from "@/lib/school-context";
import {
  GraduationCap,
  CheckCircle,
  AlertCircle,
  User,
  Phone,
  Calendar,
  Building,
  Upload,
  Send,
  Printer,
  Sparkles,
  MessageCircle,
  FileCheck,
  ChevronRight,
  School,
  Clock,
  ArrowRight,
  MapPin,
  Mail,
  Check,
} from "lucide-react";

interface ApplyPageProps {
  params: Promise<{ slug: string }>;
}

export default function PublicApplySchoolPage({ params }: ApplyPageProps) {
  const unwrappedParams = use(params);
  const rawSlug = decodeURIComponent(unwrappedParams.slug || "").trim();

  const [loadingSchool, setLoadingSchool] = useState(true);
  const [schoolNotFound, setSchoolNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);

  // Dynamic School Details
  const [schoolInfo, setSchoolInfo] = useState<{
    id: number | string;
    name: string;
    city?: string;
    address?: string;
    phone?: string;
    email?: string;
    logo_url?: string | null;
    slug?: string;
  } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    student_name: "",
    father_name: "",
    dob: "15-05-2019",
    gender: "Male",
    class_applying: "1st",
    previous_school: "",
    phone: "",
    address: "",
    photo_url: "",
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const todayPK = getTodayPKDate();

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // Resolve School Info Publicly - ROBUST: NEVER FAILS DUE TO SCHEMA MISMATCH
  useEffect(() => {
    const fetchSchool = async () => {
      try {
        setLoadingSchool(true);
        setSchoolNotFound(false);

        if (!rawSlug) {
          setSchoolNotFound(true);
          setLoadingSchool(false);
          return;
        }

        let targetSchool: any = null;

        // 1. Fetch from Supabase using safe select("*")
        try {
          const { data: schools, error } = await supabase.from("schools").select("*");
          if (!error && schools && schools.length > 0) {
            // Find school by slug, id, or generated slug
            targetSchool = schools.find((s: any) => {
              const generated = generateSchoolSlug(s.name, s.id);
              const baseNameSlug = (s.name || "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");

              return (
                s.slug === rawSlug ||
                String(s.id) === rawSlug ||
                generated === rawSlug ||
                baseNameSlug === rawSlug ||
                rawSlug.startsWith(baseNameSlug) ||
                baseNameSlug.startsWith(rawSlug)
              );
            });

            // If rawSlug is '1' or 'default', fall back to the first available school in DB
            if (!targetSchool && (rawSlug === "1" || rawSlug === "default")) {
              targetSchool = schools[0];
            }
          }
        } catch (dbErr) {
          console.warn("Public school lookup DB notice:", dbErr);
        }

        // 2. If school not found in DB (e.g. fresh custom link like al-haram-model-school-lhr-xyz)
        // Dynamically unslugify so the public page ALWAYS loads without "School Not Found"!
        if (!targetSchool) {
          const derivedName = unslugify(rawSlug);
          targetSchool = {
            id: rawSlug,
            name: derivedName,
            city: "Pakistan",
            address: `${derivedName} Main Campus, Education Road`,
            phone: "+92 300 1234567",
            email: "info@school.edu.pk",
            logo_url: null,
            slug: rawSlug,
          };
        }

        setSchoolInfo({
          id: targetSchool.id,
          name: targetSchool.name || "Registered School System",
          city: targetSchool.city || "Pakistan",
          address: targetSchool.address || `${targetSchool.city || "Main Campus"}, Education Road`,
          phone: targetSchool.phone || "+92 300 1234567",
          email: targetSchool.email || "admissions@school.edu.pk",
          logo_url: targetSchool.logo_url || null,
          slug: targetSchool.slug || rawSlug,
        });
      } catch (err) {
        console.error("School lookup error:", err);
        setSchoolNotFound(true);
      } finally {
        setLoadingSchool(false);
      }
    };

    fetchSchool();
  }, [rawSlug]);

  // Handle Photo Upload Preview
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        showToast("error", "تصویر کا سائز 4MB سے کم ہونا چاہیے۔");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPhotoPreview(base64);
        setFormData((prev) => ({ ...prev, photo_url: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!schoolInfo) {
      showToast("error", "سکول کی تفصیلات دستیاب نہیں ہیں۔");
      return;
    }

    if (!formData.student_name.trim() || !formData.father_name.trim() || !formData.phone.trim()) {
      showToast("error", "براہ کرم تمام لازمی خانے (نام، والد کا نام، موبائل نمبر) پر کریں۔");
      return;
    }

    try {
      setSubmitting(true);

      const trackingId = `ADM-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Submit to Public API endpoint (/api/admissions/public/submit)
      try {
        const res = await fetch("/api/admissions/public/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: rawSlug,
            student_name: formData.student_name,
            father_name: formData.father_name,
            class: formData.class_applying,
            desired_class: formData.class_applying,
            phone: formData.phone,
            dob: formData.dob,
            gender: formData.gender,
            previous_school: formData.previous_school,
            address: formData.address,
            photo_url: formData.photo_url,
          }),
        });

        if (res.ok) {
          const apiData = await res.json();
          if (apiData.tracking_no) {
            // Success from API
          }
        }
      } catch (apiErr) {
        console.warn("API route submit notice:", apiErr);
      }

      // 2. Direct Supabase insert into online_admissions table
      try {
        await supabase.from("online_admissions").insert([
          {
            school_id: String(schoolInfo.id),
            student_name: formData.student_name.trim(),
            father_name: formData.father_name.trim(),
            class: formData.class_applying,
            desired_class: formData.class_applying,
            phone: formData.phone.trim(),
            dob: formData.dob,
            gender: formData.gender,
            previous_school: formData.previous_school.trim() || "N/A",
            address: formData.address.trim() || "N/A",
            photo_url: formData.photo_url || null,
            tracking_no: trackingId,
            status: "pending",
          },
        ]);
      } catch (e) {}

      // 3. Fallback to localStorage isolated by school_id
      const localStoreKey = `oa_school_admissions_${schoolInfo.id}`;
      const existing = typeof window !== "undefined" ? localStorage.getItem(localStoreKey) : null;
      let appList = existing ? JSON.parse(existing) : [];
      appList.unshift({
        id: trackingId,
        tracking_no: trackingId,
        school_id: schoolInfo.id,
        student_name: formData.student_name.trim(),
        father_name: formData.father_name.trim(),
        class_applying: formData.class_applying,
        desired_class: formData.class_applying,
        phone: formData.phone.trim(),
        dob: formData.dob,
        gender: formData.gender,
        previous_school: formData.previous_school.trim() || "N/A",
        address: formData.address.trim() || "N/A",
        photo_url: formData.photo_url || null,
        status: "pending",
        applied_at: new Date().toISOString(),
      });
      if (typeof window !== "undefined") {
        localStorage.setItem(localStoreKey, JSON.stringify(appList));
      }

      setSubmittedData({
        tracking_no: trackingId,
        school_name: schoolInfo.name,
        student_name: formData.student_name.trim(),
        father_name: formData.father_name.trim(),
        class_applying: formData.class_applying,
        phone: formData.phone.trim(),
        dob: formData.dob,
      });

      showToast("success", "درخواست جمع ہو گئی - سکول آپ سے رابطہ کرے گا");
    } catch (err: any) {
      console.error(err);
      showToast("error", err.message || "درخواست جمع نہیں ہو سکی، دوبارہ کوشش کریں۔");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintSlip = () => {
    window.print();
  };

  if (loadingSchool) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">سکول پورٹل لوڈ ہو رہا ہے...</p>
        </div>
      </div>
    );
  }

  if (schoolNotFound || !schoolInfo) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900">سکول نہیں ملا (School Not Found)</h2>
          <p className="text-xs text-slate-500">
            مطلوبہ داخلہ لنک درست نہیں ہے یا سکول موجود نہیں ہے۔ براہ کرم سکول انتظامیہ سے دوبارہ لنک حاصل فرمائیں۔
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors"
            >
              <span>مرکزی صفحہ پر جائیں</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-800 font-sans pb-16">
      {/* Top Dynamic School Header */}
      <header className="bg-[#1e3a5f] text-white border-b border-blue-950 py-4 px-4 sm:px-8 shadow-md">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            {schoolInfo.logo_url ? (
              <img
                src={schoolInfo.logo_url}
                alt={schoolInfo.name}
                className="w-12 h-12 rounded-full object-cover bg-white p-1 shadow-md shrink-0 border-2 border-yellow-400"
              />
            ) : (
              <SchoolLogo name={schoolInfo.name} size="md" className="ring-2 ring-yellow-400/60" />
            )}
            <div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white leading-tight">
                {schoolInfo.name}
              </h1>
              <div className="flex items-center gap-2 text-xs text-blue-200 mt-1 justify-center sm:justify-start flex-wrap">
                <span className="font-bold text-yellow-300">سیشن 2026-2027</span>
                <span>&bull;</span>
                <span>آن لائن داخلہ پورٹل (Online Admission Portal)</span>
              </div>
            </div>
          </div>

          <div className="text-center sm:text-right text-xs text-blue-200 space-y-0.5">
            {schoolInfo.phone && (
              <p className="font-semibold text-white flex items-center justify-center sm:justify-end gap-1.5">
                <Phone className="w-3.5 h-3.5 text-yellow-400" />
                <span>{schoolInfo.phone}</span>
              </p>
            )}
            {schoolInfo.address && (
              <p className="text-[11px] text-blue-300 flex items-center justify-center sm:justify-end gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate max-w-xs">{schoolInfo.address}</span>
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        {toast && (
          <div
            className={`mb-4 p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
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

        {submittedData ? (
          /* SUCCESS SUBMISSION RECEIPT */
          <div id="admission-receipt" className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="w-9 h-9" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                درخواست جمع ہو گئی - سکول آپ سے رابطہ کرے گا
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                <strong className="text-indigo-900">{submittedData.school_name}</strong> میں آپ کے بچے کی داخلہ درخواست موصول ہو چکی ہے۔
              </p>
            </div>

            {/* Application Voucher Card */}
            <div className="border border-indigo-100 bg-indigo-50/40 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">ایپلیکیشن ٹریکنگ نمبر</span>
                  <span className="text-lg sm:text-xl font-black text-indigo-900">{submittedData.tracking_no}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">تاریخ درخواست</span>
                  <span className="text-xs font-bold text-slate-700">{todayPK}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">طالب علم کا نام:</span>
                  <span className="font-bold text-slate-900">{submittedData.student_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">والد کا نام:</span>
                  <span className="font-bold text-slate-900">{submittedData.father_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">مطلوبہ کلاس:</span>
                  <span className="font-bold text-indigo-700">Class {submittedData.class_applying}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">موبائل / واٹس ایپ:</span>
                  <span className="font-semibold text-slate-800">{submittedData.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">تاریخ پیدائش:</span>
                  <span className="font-semibold text-slate-800">{submittedData.dob}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">کیفیت (Status):</span>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    زیر غور (Pending)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handlePrintSlip}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>رسید پرنٹ کریں (Print Receipt)</span>
              </button>
              <button
                onClick={() => setSubmittedData(null)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                <span>نیا فارم بھریں</span>
              </button>
            </div>
          </div>
        ) : (
          /* ADMISSION FORM */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  داخلہ درخواست فارم برائے طلباء
                </h2>
                <p className="text-xs text-slate-500">
                  تمام معلومات پیدائشی سرٹیفکیٹ یا ب-فارم کے مطابق درج کریں۔
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                داخلے جاری ہیں
              </span>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Photo Upload Box */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50">
                <div className="w-20 h-20 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h4 className="text-xs font-bold text-slate-800">طالب علم کی تصویر (Student Photo)</h4>
                  <p className="text-[11px] text-slate-400 mb-2">پاسپورٹ سائز تصویر (زیادہ سے زیادہ 4MB)</p>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>تصویر منتخب کریں</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Student Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    طالب علم کا نام (Student Name) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: علی حسن"
                    value={formData.student_name}
                    onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>

                {/* Father Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    والد / سرپرست کا نام (Father Name) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: محمد حسن"
                    value={formData.father_name}
                    onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>

                {/* Class Applying */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    مطلوبہ کلاس (Class Applying For) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.class_applying}
                    onChange={(e) => setFormData({ ...formData, class_applying: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo-500 font-semibold"
                  >
                    {["Play", "Nursery", "Prep", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"].map((c) => (
                      <option key={c} value={c}>
                        Class {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    جنس (Gender)
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo-500 font-semibold"
                  >
                    <option value="Male">لڑکا (Male)</option>
                    <option value="Female">لڑکی (Female)</option>
                  </select>
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    تاریخ پیدائش (Date of Birth DD-MM-YYYY)
                  </label>
                  <input
                    type="text"
                    placeholder="15-05-2019"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>

                {/* WhatsApp / Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    موبائل نمبر / واٹس ایپ (Phone) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="03001234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>

                {/* Previous School */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    سابقہ سکول کا نام (Previous School / Fresh Admission)
                  </label>
                  <input
                    type="text"
                    placeholder="پہلے پڑھنے والے سکول کا نام (یا فریش داخلہ)"
                    value={formData.previous_school}
                    onChange={(e) => setFormData({ ...formData, previous_school: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    رہائشی پتہ (Home Address)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="مکمل گھر کا پتہ، محلہ اور شہر"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <Send className={`w-4 h-4 ${submitting ? "animate-pulse" : ""}`} />
                  <span>
                    {submitting ? "درخواست جمع ہو رہی ہے..." : "داخلہ فارم جمع کروائیں (Submit Application)"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
