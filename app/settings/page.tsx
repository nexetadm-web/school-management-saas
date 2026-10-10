"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSchool } from "@/lib/school-context";
import { SchoolLogo } from "@/components/school-branding";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  UserCheck,
  CreditCard,
  QrCode,
  Save,
  CheckCircle2,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  BellRing,
  Wallet,
} from "lucide-react";

export default function SchoolSettingsPage() {
  const {
    school,
    schoolId,
    schoolName,
    schoolAddress,
    schoolPhone,
    schoolEmail,
    schoolPrincipal,
    schoolCity,
    schoolLogo,
    easypaisaNo,
    easypaisaTitle,
    jazzcashNo,
    jazzcashTitle,
    bankName,
    bankAccount,
    bankTitle,
    updateSchoolProfile,
    isSuperAdmin,
    schools,
    switchSchool,
  } = useSchool();

  const [form, setForm] = useState({
    name: "",
    city: "",
    address: "",
    phone: "",
    email: "",
    principal_name: "",
    logo_url: "",
    easypaisa_no: "",
    easypaisa_title: "",
    jazzcash_no: "",
    jazzcash_title: "",
    bank_name: "",
    bank_account: "",
    bank_title: "",
  });

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync form with current school context
  useEffect(() => {
    setForm({
      name: schoolName || "",
      city: schoolCity || "",
      address: schoolAddress || "",
      phone: schoolPhone || "",
      email: schoolEmail || "",
      principal_name: schoolPrincipal || "",
      logo_url: schoolLogo || "",
      easypaisa_no: easypaisaNo || "",
      easypaisa_title: easypaisaTitle || schoolName || "",
      jazzcash_no: jazzcashNo || "",
      jazzcash_title: jazzcashTitle || schoolName || "",
      bank_name: bankName || "Habib Bank Limited",
      bank_account: bankAccount || "",
      bank_title: bankTitle || schoolName || "",
    });
  }, [
    schoolName,
    schoolCity,
    schoolAddress,
    schoolPhone,
    schoolEmail,
    schoolPrincipal,
    schoolLogo,
    easypaisaNo,
    easypaisaTitle,
    jazzcashNo,
    jazzcashTitle,
    bankName,
    bankAccount,
    bankTitle,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSchoolProfile({
        name: form.name.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        principal_name: form.principal_name.trim(),
        logo_url: form.logo_url.trim() || null,
        easypaisa_no: form.easypaisa_no.trim(),
        easypaisa_title: form.easypaisa_title.trim() || form.name.trim(),
        jazzcash_no: form.jazzcash_no.trim(),
        jazzcash_title: form.jazzcash_title.trim() || form.name.trim(),
        bank_name: form.bank_name.trim(),
        bank_account: form.bank_account.trim(),
        bank_title: form.bank_title.trim() || form.name.trim(),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to update school profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-3 md:p-6 pb-24">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Link
                href="/"
                className="text-xs bg-white text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center gap-1 shadow-sm font-medium"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> ڈیش بورڈ (Dashboard)
              </Link>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                100% Dynamic Brand Engine
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Building2 className="w-7 h-7 text-indigo-600" />
              سکول پروفائل و برانڈنگ سیٹنگز (School Profile & Accounts)
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              سکول کا نام، لوگو، پتہ، فون، پرنسپل اور ایزی پیسہ/جاز کیش اکاؤنٹس سیٹ کریں۔ یہ تمام تبدیلیاں تمام پیجز پر فوراً لاگو ہوں گی۔
            </p>
          </div>

          {savedSuccess && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-sm animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              تبدیلیاں فوراً محفوظ ہو گئیں! (Instantly Applied Everywhere)
            </div>
          )}
        </div>

        {/* Live Brand Preview Card */}
        <div className="bg-gradient-to-r from-[#1e3a5f] to-indigo-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-center gap-4 z-10">
            <SchoolLogo
              name={form.name || "School System"}
              logoUrl={form.logo_url}
              size="xl"
              className="border-2 border-white/30"
            />
            <div>
              <div className="text-[10px] font-bold tracking-widest text-yellow-300 uppercase">
                Active Tenant Preview
              </div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white mt-0.5">
                {form.name || "سکول کا نام درج کریں"}
              </h2>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                <span>{form.address || "کیمپس کا پتہ درج کریں"}</span>
                {form.city && <span>• {form.city}</span>}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-2 font-mono">
                {form.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-yellow-300" /> {form.phone}
                  </span>
                )}
                {form.principal_name && (
                  <span className="flex items-center gap-1 font-sans">
                    <UserCheck className="w-3 h-3 text-yellow-300" /> پرنسپل: {form.principal_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/15 text-xs text-slate-200 space-y-1.5 z-10 w-full md:w-auto">
            <div className="font-bold text-yellow-300 uppercase text-[10px] tracking-wider">
              Fee QR & Online Accounts
            </div>
            <div>
              <span className="opacity-75">EasyPaisa:</span>{" "}
              <span className="font-mono font-bold text-white">{form.easypaisa_no || "0300-XXXXXXX"}</span>
            </div>
            <div>
              <span className="opacity-75">JazzCash:</span>{" "}
              <span className="font-mono font-bold text-white">{form.jazzcash_no || "0301-XXXXXXX"}</span>
            </div>
            <div>
              <span className="opacity-75">Bank:</span>{" "}
              <span className="font-bold text-white">{form.bank_name}</span>
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Basic Profile */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-indigo-600" />
              1. بنیادی سکول معلومات (Basic Institution Profile)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  سکول کا مکمل نام (Official School Name) *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Al-Falah Model School & College"
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  شہر / ضلع (City / District)
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="e.g. Lahore / Sargodha / Islamabad"
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  کیمپس کا پتہ (Complete Campus Address)
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="e.g. Main Campus, Near Railway Station, College Road"
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  رابطہ فون نمبر (Official Phone / WhatsApp)
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. 0300-1234567"
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  پرنسپل / ہیڈ کا نام (Principal / Headmaster Name)
                </label>
                <input
                  type="text"
                  value={form.principal_name}
                  onChange={(e) => setForm({ ...form, principal_name: e.target.value })}
                  placeholder="e.g. Sir Muhammad Asif M.A, M.Ed"
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  سکول لوگو کا لنک (Logo Image URL - Optional)
                </label>
                <input
                  type="text"
                  value={form.logo_url}
                  onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png (خالی چھوڑنے پر خودکار مونوگرام بن جائے گا)"
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  اگر آپ کے پاس لوگو نہیں ہے تو پریشان نہ ہوں، سسٹم خود بخود سکول کے نام سے خوبصورت مونوگرام دکھائے گا۔
                </p>
              </div>
            </div>
          </div>

          {/* 2. Online Fee Payment Accounts (EasyPaisa, JazzCash, Bank) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
              <Wallet className="w-4 h-4 text-emerald-600" />
              2. آن لائن فیس وصولی اکاؤنٹس (EasyPaisa, JazzCash & Bank Accounts for Fee QR)
            </h3>
            <p className="text-xs text-slate-500">
              یہ اکاؤنٹس اور QR کوڈ فیس چالان کے پرنٹ اور والدین کے آن لائن پورٹل پر ظاہر ہوں گے۔
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* EasyPaisa */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  EasyPaisa اکاؤنٹ
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    موبائل اکاؤنٹ نمبر (EasyPaisa Number)
                  </label>
                  <input
                    type="text"
                    value={form.easypaisa_no}
                    onChange={(e) => setForm({ ...form, easypaisa_no: e.target.value })}
                    placeholder="03XX-XXXXXXX"
                    className="w-full p-2 text-xs border border-emerald-200 rounded-lg outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    اکاؤنٹ ٹائٹل (Account Title)
                  </label>
                  <input
                    type="text"
                    value={form.easypaisa_title}
                    onChange={(e) => setForm({ ...form, easypaisa_title: e.target.value })}
                    placeholder={form.name || "School Title"}
                    className="w-full p-2 text-xs border border-emerald-200 rounded-lg outline-none"
                  />
                </div>
              </div>

              {/* JazzCash */}
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs text-rose-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  JazzCash اکاؤنٹ
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    موبائل اکاؤنٹ نمبر (JazzCash Number)
                  </label>
                  <input
                    type="text"
                    value={form.jazzcash_no}
                    onChange={(e) => setForm({ ...form, jazzcash_no: e.target.value })}
                    placeholder="03XX-XXXXXXX"
                    className="w-full p-2 text-xs border border-rose-200 rounded-lg outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    اکاؤنٹ ٹائٹل (Account Title)
                  </label>
                  <input
                    type="text"
                    value={form.jazzcash_title}
                    onChange={(e) => setForm({ ...form, jazzcash_title: e.target.value })}
                    placeholder={form.name || "School Title"}
                    className="w-full p-2 text-xs border border-rose-200 rounded-lg outline-none"
                  />
                </div>
              </div>

              {/* Bank Details */}
              <div className="md:col-span-2 p-4 rounded-xl border border-blue-200 bg-blue-50/30 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    بینک کا نام (Bank Name)
                  </label>
                  <input
                    type="text"
                    value={form.bank_name}
                    onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                    placeholder="e.g. Meezan Bank / HBL / Allied Bank"
                    className="w-full p-2 text-xs border border-blue-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    اکاؤنٹ یا IBAN نمبر
                  </label>
                  <input
                    type="text"
                    value={form.bank_account}
                    onChange={(e) => setForm({ ...form, bank_account: e.target.value })}
                    placeholder="PK00MEZN0000000000"
                    className="w-full p-2 text-xs border border-blue-200 rounded-lg outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    بینک اکاؤنٹ ٹائٹل
                  </label>
                  <input
                    type="text"
                    value={form.bank_title}
                    onChange={(e) => setForm({ ...form, bank_title: e.target.value })}
                    placeholder={form.name || "School Account"}
                    className="w-full p-2 text-xs border border-blue-200 rounded-lg outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 text-xs transition"
            >
              منسوخ کریں (Cancel)
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-lg shadow-indigo-200 transition active:scale-95 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  محفوظ ہو رہا ہے...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  سیٹنگز محفوظ کریں (Save Profile Instantly)
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
