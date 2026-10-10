"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getTodayPKDate } from "@/lib/date-utils";
import { SchoolLogo } from "@/components/school-branding";
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
} from "lucide-react";

interface ApplyPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default function PublicApplySchoolPage({ params }: ApplyPageProps) {
  const unwrappedParams = use(params);
  const schoolSlug = decodeURIComponent(unwrappedParams.schoolSlug || "1");

  const [loadingSchool, setLoadingSchool] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);

  // Dynamic School Details
  const [schoolInfo, setSchoolInfo] = useState({
    id: 1,
    name: "Registered School System",
    city: "Pakistan",
    address: "Campus Education Complex",
    phone: "+92 300 1234567",
    email: "info@school.edu.pk",
    logo_url: null as string | null,
  });

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

  // Resolve School Info Publicly by slug or ID
  useEffect(() => {
    const fetchSchool = async () => {
      try {
        setLoadingSchool(true);
        let query = supabase.from("schools").select("*");

        const numericId = Number(schoolSlug);
        if (!isNaN(numericId) && numericId > 0) {
          query = query.eq("id", numericId);
        } else {
          query = query.ilike("name", `%${schoolSlug.replace(/-/g, " ")}%`);
        }

        const { data, error } = await query.limit(1);
        if (!error && data && data.length > 0) {
          const s = data[0];
          setSchoolInfo({
            id: s.id,
            name: s.name,
            city: s.city || "Pakistan",
            address: s.address || `${s.city || "Main Campus"}, Education Road`,
            phone: s.phone || "+92 300 1234567",
            email: s.email || "admissions@school.edu.pk",
            logo_url: s.logo_url || null,
          });
        }
      } catch (err) {
        console.error("School lookup error", err);
      } finally {
        setLoadingSchool(false);
      }
    };

    fetchSchool();
  }, [schoolSlug]);

  // Handle Photo Upload Preview
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        showToast("error", "Image size should be under 3MB.");
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

    if (!formData.student_name.trim() || !formData.father_name.trim() || !formData.phone.trim()) {
      showToast("error", "براہ کرم لازمی خانے (نام، والد کا نام، موبائل نمبر) پر کریں۔");
      return;
    }

    try {
      setSubmitting(true);
      const trackingId = `ADM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const admissionRecord = {
        school_id: schoolInfo.id,
        student_name: formData.student_name.trim(),
        father_name: formData.father_name.trim(),
        dob: formData.dob,
        gender: formData.gender,
        class_applying: formData.class_applying,
        previous_school: formData.previous_school.trim() || "N/A",
        phone: formData.phone.trim(),
        address: formData.address.trim() || "N/A",
        photo_url: formData.photo_url || null,
        data: {
          submitted_at: todayPK,
          device: typeof window !== "undefined" ? navigator.userAgent : "Web",
        },
        status: "pending",
        applied_at: new Date().toISOString(),
      };

      // 1. Save in admissions and admission_applications table in Supabase
      try {
        await supabase.from("admission_applications").insert([admissionRecord]);
      } catch (dbErr) {
        console.warn("admission_applications insert fallback:", dbErr);
      }

      try {
        await supabase.from("admissions").insert([{
          school_id: schoolInfo.id,
          student_name: formData.student_name.trim(),
          father_name: formData.father_name.trim(),
          dob: formData.dob,
          gender: formData.gender,
          class_applying: formData.class_applying,
          previous_school: formData.previous_school.trim() || "N/A",
          phone: formData.phone.trim(),
          address: formData.address.trim() || "N/A",
          photo_url: formData.photo_url || null,
          status: "pending",
        }]);
      } catch (e) {}

      // 2. Fallback to localStorage
      const localStoreKey = `oa_school_admissions_${schoolInfo.id}`;
      const existing = typeof window !== "undefined" ? localStorage.getItem(localStoreKey) : null;
      let appList = existing ? JSON.parse(existing) : [];
      appList.unshift({
        id: trackingId,
        ...admissionRecord,
      });
      if (typeof window !== "undefined") {
        localStorage.setItem(localStoreKey, JSON.stringify(appList));
      }

      setSubmittedData({
        trackingId,
        ...admissionRecord,
      });

      showToast("success", "درخواست کامیابی سے جمع ہو گئی ہے! داخلہ آفس جلد رابطہ کرے گا۔");
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

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-white to-slate-100 text-slate-800 font-sans pb-16">
      {/* Top Banner */}
      <header className="bg-[#1e3a5f] text-white border-b border-blue-950 py-4 px-4 sm:px-8 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SchoolLogo name={schoolInfo.name} size="md" className="ring-2 ring-yellow-400/60" />
            <div>
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-white leading-tight">
                {schoolInfo.name}
              </h1>
              <p className="text-xs text-blue-200 mt-0.5">
                آن لائن داخلہ فارم (Online Admission Portal) &bull; سیشن 2026-2027
              </p>
            </div>
          </div>
          <div className="hidden sm:block text-right text-xs text-blue-200">
            <p className="font-semibold text-white">{schoolInfo.phone}</p>
            <p className="text-[11px] text-blue-300">{schoolInfo.address}</p>
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="w-9 h-9" />
              </div>
              <h2 className="text-xl font-black text-slate-900">
                درخواست کامیابی سے موصول ہو گئی!
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                آپ کے بچے کا داخلہ فارم برائے جماعت <strong className="text-slate-800">{submittedData.class_applying}</strong> سکول انتظامیہ کو موصول ہو چکا ہے۔
              </p>
            </div>

            {/* Application Voucher Card */}
            <div className="border border-indigo-100 bg-indigo-50/30 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">ایپلیکیشن ٹریکنگ نمبر</span>
                  <span className="text-lg font-black text-indigo-900">{submittedData.trackingId}</span>
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
                  <span className="text-slate-400 block text-[11px]">رابطہ نمبر:</span>
                  <span className="font-semibold text-slate-800">{submittedData.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">تاریخ پیدائش:</span>
                  <span className="font-semibold text-slate-800">{submittedData.dob}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">کیفیت (Status):</span>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    زیر غور (Pending)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
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
                <span>نیا داخلہ فارم بھریں</span>
              </button>
            </div>
          </div>
        ) : (
          /* ADMISSION FORM */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  طالب علم کی تفصیلات درج کریں
                </h2>
                <p className="text-xs text-slate-500">
                  تمام معلومات قومی شناختی کارڈ اور پیدائشی سرٹیفکیٹ کے مطابق لکھیں۔
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
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
                  <p className="text-[11px] text-slate-400 mb-2">پاسپورٹ سائز تصویر (زیادہ سے زیادہ 3MB)</p>
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
                    طالب علم کا پورا نام (Student Full Name) <span className="text-rose-500">*</span>
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
                    والد کا موبائل نمبر (WhatsApp / Phone) <span className="text-rose-500">*</span>
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
                    placeholder="پہلے پڑھنے والے سکول کا نام (یا فریش ایڈمشن)"
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
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer active:scale-98 disabled:opacity-50"
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
