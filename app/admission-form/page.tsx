"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  User,
  Phone,
  Calendar,
  Building,
  Send,
  Printer,
  Sparkles,
  School,
  MapPin,
  RefreshCw,
  Share2,
} from "lucide-react";

function AdmissionFormComponent() {
  const searchParams = useSearchParams();
  const rawSchoolId = searchParams.get("school_id") || searchParams.get("schoolId") || searchParams.get("school");

  // School ID stored strictly in STATE, never in localStorage
  const [schoolId, setSchoolId] = useState<string | null>(rawSchoolId);
  const [loadingSchool, setLoadingSchool] = useState(true);
  const [schoolData, setSchoolData] = useState<{
    id: string;
    name: string;
    city?: string;
    phone?: string;
    address?: string;
    logo_url?: string;
  } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    student_name: "",
    father_name: "",
    dob: "2019-05-15",
    class: "1st",
    phone: "",
    address: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submittedAdmission, setSubmittedAdmission] = useState<{
    admission_no: string;
    student_name: string;
    father_name: string;
    class: string;
    phone: string;
    school_name: string;
    date: string;
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch school by school_id strictly from URL
  useEffect(() => {
    if (!rawSchoolId) {
      setSchoolId(null);
      setLoadingSchool(false);
      return;
    }

    setSchoolId(rawSchoolId);

    const fetchSchoolInfo = async () => {
      try {
        setLoadingSchool(true);
        setErrorMessage(null);

        // Fetch school by id
        const { data, error } = await supabase
          .from("schools")
          .select("*")
          .eq("id", rawSchoolId)
          .single();

        if (error || !data) {
          // If single fails, try fallback without single in case of string/number casting
          const { data: list } = await supabase.from("schools").select("*");
          const found = list?.find(
            (s: any) => String(s.id).toLowerCase() === String(rawSchoolId).toLowerCase()
          );

          if (found) {
            setSchoolData({
              id: String(found.id),
              name: found.name || "School",
              city: found.city || "Pakistan",
              phone: found.phone || "",
              address: found.address || "",
              logo_url: found.logo_url || null,
            });
          } else {
            setErrorMessage("Invalid admission link. Please get correct link from school.");
          }
        } else {
          setSchoolData({
            id: String(data.id),
            name: data.name || "School",
            city: data.city || "Pakistan",
            phone: data.phone || "",
            address: data.address || "",
            logo_url: data.logo_url || null,
          });
        }
      } catch (err) {
        console.error("School fetch error:", err);
        setErrorMessage("Invalid admission link. Please get correct link from school.");
      } finally {
        setLoadingSchool(false);
      }
    };

    fetchSchoolInfo();
  }, [rawSchoolId]);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!schoolId) {
      setErrorMessage("School ID missing - use valid public link");
      return;
    }

    if (!formData.student_name.trim() || !formData.father_name.trim() || !formData.phone.trim()) {
      alert("براہ کرم تمام لازمی خانے (طالب علم کا نام، والد کا نام، موبائل نمبر) پر کریں۔");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const payload = {
        student_name: formData.student_name.trim(),
        father_name: formData.father_name.trim(),
        class: formData.class,
        phone: formData.phone.trim(),
        dob: formData.dob,
        address: formData.address.trim() || "N/A",
        school_id: schoolId,
      };

      const res = await fetch("/api/admissions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      const resData = await res.json();

      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "درخواست جمع کرنے میں ناکامی ہوئی");
      }

      setSubmittedAdmission({
        admission_no: resData.admission_no || resData.application_no || `ADM-2026-001`,
        student_name: formData.student_name.trim(),
        father_name: formData.father_name.trim(),
        class: formData.class,
        phone: formData.phone.trim(),
        school_name: schoolData?.name || "School",
        date: new Date().toLocaleDateString("en-PK"),
      });
    } catch (err: any) {
      console.error("Submission failed:", err);
      setErrorMessage(err.message || "Failed to submit admission form");
    } finally {
      setSubmitting(false);
    }
  };

  // If no school_id in URL or school not found
  if (!loadingSchool && (!schoolId || errorMessage)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Invalid Admission Link
          </h2>
          <p className="text-sm text-slate-600">
            Please get the correct online admission link from your school administration.
          </p>
          <div className="p-3 bg-rose-50 text-rose-800 rounded-xl text-xs font-semibold">
            غلط داخلہ فارم لنک! براہ کرم اپنے سکول سے درست داخلہ لنک حاصل کریں۔
          </div>
        </div>
      </div>
    );
  }

  // Submitted Receipt Screen
  if (submittedAdmission) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4 flex items-center justify-center font-sans">
        <div className="max-w-lg w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600 mx-auto animate-in zoom-in">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-[11px] font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              درخواست کامیابی سے موصول ہو گئی
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-2">
              داخلہ فارم جمع ہو گیا ہے
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {submittedAdmission.school_name} آپ کی درخواست کا جائزہ لے کر جلد رابطہ کرے گا۔
            </p>
          </div>

          {/* Admission Slip Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-right space-y-3">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="text-xs text-slate-500 font-semibold">درخواست نمبر:</span>
              <span className="font-mono font-black text-base text-indigo-600">
                {submittedAdmission.admission_no}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">طالب علم کا نام:</span>
              <strong className="text-slate-900">{submittedAdmission.student_name}</strong>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">والد کا نام:</span>
              <strong className="text-slate-900">{submittedAdmission.father_name}</strong>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">کلاس:</span>
              <strong className="text-slate-900">{submittedAdmission.class}</strong>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">موبائل نمبر:</span>
              <strong className="text-slate-900 font-mono">{submittedAdmission.phone}</strong>
            </div>

            <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-2">
              <span className="text-slate-500">تاریخ:</span>
              <span className="text-slate-600 font-mono">{submittedAdmission.date}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => window.print()}
              className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>رسید پرنٹ کریں (Print)</span>
            </button>

            <button
              onClick={() => {
                setSubmittedAdmission(null);
                setFormData({
                  student_name: "",
                  father_name: "",
                  dob: "2019-05-15",
                  class: "1st",
                  phone: "",
                  address: "",
                });
              }}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              ایک اور فارم پر کریں
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-10 px-3 sm:px-6 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* School Header Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm text-center relative overflow-hidden">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-500/20">
              <GraduationCap className="w-8 h-8" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                <span>آن لائن داخلہ فارم سیشن 2026-2027</span>
              </span>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-2">
                {schoolData?.name || "School Admission Portal"}
              </h1>

              {schoolData?.city && (
                <p className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{schoolData.city}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Admission Form */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Student Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 text-right">
                طالب علم کا پورا نام (Student Name) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="طالب علم کا نام درج کریں..."
                  value={formData.student_name}
                  onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                  className="w-full pr-10 pl-3 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none transition-all text-slate-900"
                />
              </div>
            </div>

            {/* Father's Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 text-right">
                والد کا نام (Father Name) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="والد کا نام درج کریں..."
                  value={formData.father_name}
                  onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                  className="w-full pr-10 pl-3 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none transition-all text-slate-900"
                />
              </div>
            </div>

            {/* Class & Date of Birth Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Class Applying */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 text-right">
                  مطلوبہ کلاس (Class Applying) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.class}
                  onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                  className="w-full px-3 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none transition-all text-slate-900"
                >
                  <option value="Playgroup">Playgroup (پلے گروپ)</option>
                  <option value="Nursery">Nursery (نرسری)</option>
                  <option value="Prep">Prep (پریپ)</option>
                  <option value="1st">1st Class (پہلی)</option>
                  <option value="2nd">2nd Class (دوسری)</option>
                  <option value="3rd">3rd Class (تیسری)</option>
                  <option value="4th">4th Class (چوتھی)</option>
                  <option value="5th">5th Class (پانچویں)</option>
                  <option value="6th">6th Class (چھٹی)</option>
                  <option value="7th">7th Class (ساتویں)</option>
                  <option value="8th">8th Class (آٹھویں)</option>
                  <option value="9th">9th Class (نویں)</option>
                  <option value="10th">10th Class (دسویں)</option>
                </select>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 text-right">
                  تاریخ پیدائش (Date of Birth)
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full pr-10 pl-3 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none transition-all text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Mobile / WhatsApp Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 text-right">
                موبائل / واٹس ایپ نمبر (Phone / WhatsApp) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="0300-1234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pr-10 pl-3 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none transition-all text-slate-900 font-mono"
                />
              </div>
            </div>

            {/* Home Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 text-right">
                مکمل پتہ (Residential Address)
              </label>
              <textarea
                rows={2}
                placeholder="محلہ، گلی نمبر، شہر درج کریں..."
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 focus:outline-none transition-all text-slate-900"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>درخواست جمع ہو رہی ہے...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>داخلہ درخواست جمع کروائیں (Submit)</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function PublicAdmissionFormPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
        </div>
      }
    >
      <AdmissionFormComponent />
    </Suspense>
  );
}
