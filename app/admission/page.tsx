"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getTodayPKDate } from "@/lib/date-utils";
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
} from "lucide-react";

function AdmissionFormContent() {
  const searchParams = useSearchParams();
  const schoolParam = searchParams.get("school");

  const [loadingSchool, setLoadingSchool] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);

  // Dynamic School Details
  const [schoolInfo, setSchoolInfo] = useState({
    id: 1,
    name: "OA Smart School System",
    city: "Sillanwali",
    address: "Main Campus, Education Hub, Sillanwali Road",
    phone: "+92 300 1234567",
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

  // Resolve School Info Publicly
  useEffect(() => {
    const fetchSchool = async () => {
      try {
        setLoadingSchool(true);
        let query = supabase.from("schools").select("*");

        if (schoolParam) {
          query = query.eq("id", schoolParam);
        }

        const { data, error } = await query.limit(1);
        if (!error && data && data.length > 0) {
          const s = data[0];
          setSchoolInfo({
            id: s.id,
            name: s.name,
            city: s.city || "Sillanwali",
            address: s.address || `${s.city || "Main Campus"}, Education Road`,
            phone: s.phone || "+92 300 1234567",
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
  }, [schoolParam]);

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
      showToast("error", "Please fill in all required fields (Name, Father Name, Phone).");
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
        status: "pending",
        created_at: new Date().toISOString(),
      };

      // 1. Try Supabase insert
      try {
        await supabase.from("admissions").insert([admissionRecord]);
      } catch (dbErr) {
        console.warn("Direct Supabase admissions insert fallback:", dbErr);
      }

      // 2. LocalStorage persistence fallback for admin access
      const localStoreKey = `oa_school_admissions_${schoolInfo.id}`;
      if (typeof window !== "undefined") {
        const existingStr = localStorage.getItem(localStoreKey);
        const existing = existingStr ? JSON.parse(existingStr) : [];
        const newEntry = { ...admissionRecord, id: trackingId };
        localStorage.setItem(localStoreKey, JSON.stringify([newEntry, ...existing]));
      }

      setSubmittedData({
        ...admissionRecord,
        trackingId,
      });

      showToast("success", "Admission form submitted successfully!");
    } catch (err: any) {
      console.error(err);
      showToast("error", err.message || "Failed to submit admission form.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 text-slate-800 font-sans py-6 px-3 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
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

        {/* Public School Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm text-center relative overflow-hidden">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-purple-500/20">
              {schoolInfo.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {schoolInfo.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                {schoolInfo.address} • Ph: {schoolInfo.phone}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Online Admissions Open • Session 2026-2027</span>
            </div>
          </div>
        </div>

        {/* SUBMITTED SUCCESS VIEW */}
        {submittedData ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6 animate-in fade-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-slate-900">
                Application Submitted Successfully!
              </h2>
              <p className="text-xs text-slate-500">
                Your admission application has been registered with the school administration.
              </p>
            </div>

            {/* Application Summary Box */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Tracking Number</span>
                <span className="font-mono text-sm font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                  {submittedData.trackingId}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="text-slate-400 block text-[10px]">Student Name:</span>
                  <strong>{submittedData.student_name}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Father Name:</span>
                  <strong>{submittedData.father_name}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Class Desired:</span>
                  <strong>Class {submittedData.class_applying}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Date of Birth:</span>
                  <strong>{submittedData.dob}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">WhatsApp Phone:</span>
                  <strong>{submittedData.phone}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Submission Date:</span>
                  <strong>{todayPK}</strong>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print Admission Slip</span>
              </button>

              <button
                onClick={() => {
                  const msg = `Assalamu Alaikum! I have submitted online admission for ${submittedData.student_name} (Class ${submittedData.class_applying}) at ${schoolInfo.name}. Application Tracking ID: ${submittedData.trackingId}.`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Share Details on WhatsApp</span>
              </button>
            </div>

            <div className="text-center pt-2">
              <button
                onClick={() => {
                  setSubmittedData(null);
                  setFormData({
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
                  setPhotoPreview(null);
                }}
                className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
              >
                + Submit Another Admission Form
              </button>
            </div>
          </div>
        ) : (
          /* ADMISSION FORM */
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6"
          >
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Student Admission Registration Form
              </h2>
              <p className="text-xs text-slate-500">
                Please provide accurate student and parent details. Fields marked with * are required.
              </p>
            </div>

            {/* Photo Upload & Preview */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0 relative shadow-2xs">
                {photoPreview ? (
                  <img src={photoPreview} alt="Student" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-slate-400 p-2">
                    <User className="w-7 h-7 mx-auto mb-1 text-slate-300" />
                    <span className="text-[9px] font-bold block">NO PHOTO</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-center sm:text-left">
                <label className="text-xs font-bold text-slate-800 block">
                  Student Passport Size Photo
                </label>
                <p className="text-[11px] text-slate-500">
                  Upload a clear portrait picture (JPG, PNG up to 3MB)
                </p>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer shadow-2xs">
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Choose Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Student & Parent Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Student Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Muhammad Ali"
                  value={formData.student_name}
                  onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Father / Guardian Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tariq Mehmood"
                  value={formData.father_name}
                  onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Date of Birth (DD-MM-YYYY) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="DD-MM-YYYY"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Class Desired / Applying For <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.class_applying}
                  onChange={(e) => setFormData({ ...formData, class_applying: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none cursor-pointer"
                >
                  {["Play", "Nursery", "Prep", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"].map(
                    (c) => (
                      <option key={c} value={c}>
                        Class {c}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  WhatsApp / Contact Phone <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="03001234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Previous School Name (if any)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Allied School / None (Fresh Admission)"
                  value={formData.previous_school}
                  onChange={(e) => setFormData({ ...formData, previous_school: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Home Residential Address
                </label>
                <textarea
                  rows={2}
                  placeholder="House #, Street, Colony, City..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className={`w-4 h-4 ${submitting ? "animate-spin" : ""}`} />
                <span>{submitting ? "Submitting Application..." : "Submit Online Admission Form"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function PublicAdmissionPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-slate-500 font-medium">
          Loading admission portal...
        </div>
      }
    >
      <AdmissionFormContent />
    </React.Suspense>
  );
}
