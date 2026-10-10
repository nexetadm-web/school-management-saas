"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSchool } from "@/lib/school-context";
import { supabase } from "@/lib/supabase";
import QRCode from "qrcode";
import {
  Wallet,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Filter,
  Plus,
  Send,
  Building,
  CreditCard,
  QrCode,
  ChevronLeft,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  FileCheck,
} from "lucide-react";

interface OnlinePayment {
  id: string | number;
  school_id: string | number;
  student_id: string | number;
  student_name: string;
  student_class: string;
  challan_no: string;
  transaction_id: string;
  amount: number;
  method: "easypaisa" | "jazzcash" | "bank" | "cash";
  sender_phone: string;
  status: "pending" | "verified" | "rejected";
  created_at: string;
}

export default function OnlineFeesVerificationPage() {
  const {
    schoolId,
    schoolName,
    easypaisaNo,
    easypaisaTitle,
    jazzcashNo,
    jazzcashTitle,
    bankName,
    bankAccount,
    bankTitle,
  } = useSchool();

  const [payments, setPayments] = useState<OnlinePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [schoolQrUrl, setSchoolQrUrl] = useState<string>("");

  // Submit modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    student_name: "",
    student_class: "Class 10",
    challan_no: `CH-${Date.now().toString().slice(-4)}`,
    transaction_id: "",
    amount: "2500",
    method: "easypaisa" as OnlinePayment["method"],
    sender_phone: "03001234567",
  });

  useEffect(() => {
    loadPayments();
    generateSampleQr();
  }, [schoolId, easypaisaNo, jazzcashNo]);

  const generateSampleQr = async () => {
    try {
      const qrData = `PAYMENT TO: ${schoolName}\nEASYPAISA: ${easypaisaNo}\nJAZZCASH: ${jazzcashNo}\nBANK: ${bankName} (${bankAccount})\nTITLE: ${easypaisaTitle}`;
      const url = await QRCode.toDataURL(qrData, { width: 180, margin: 1 });
      setSchoolQrUrl(url);
    } catch (e) {}
  };

  const loadPayments = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("online_payments")
        .select("*, students(name, class)")
        .order("created_at", { ascending: false });

      if (schoolId && schoolId !== "all") {
        q = q.eq("school_id", schoolId);
      }

      const { data, error } = await q;

      if (!error && data && data.length > 0) {
        setPayments(
          data.map((p: any) => ({
            id: p.id,
            school_id: p.school_id,
            student_id: p.student_id,
            student_name: p.students?.name || "Student",
            student_class: p.students?.class || "-",
            challan_no: p.challan_no || `CH-${p.id}`,
            transaction_id: p.transaction_id,
            amount: Number(p.amount || 0),
            method: p.method,
            sender_phone: p.sender_phone || "",
            status: p.status || "pending",
            created_at: p.created_at,
          }))
        );
      } else {
        // Fallback default sample data
        setPayments([
          {
            id: "1",
            school_id: schoolId || 1,
            student_id: "101",
            student_name: "Muhammad Abdullah",
            student_class: "Class 10",
            challan_no: "CH-2026-101",
            transaction_id: "EP-982341209",
            amount: 2500,
            method: "easypaisa",
            sender_phone: "03001234567",
            status: "pending",
            created_at: new Date().toISOString(),
          },
          {
            id: "2",
            school_id: schoolId || 1,
            student_id: "102",
            student_name: "Fatima Noor",
            student_class: "Class 8",
            challan_no: "CH-2026-102",
            transaction_id: "JC-554411982",
            amount: 2200,
            method: "jazzcash",
            sender_phone: "03019876543",
            status: "verified",
            created_at: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: "3",
            school_id: schoolId || 1,
            student_id: "103",
            student_name: "Ali Hassan",
            student_class: "Class 9",
            challan_no: "CH-2026-103",
            transaction_id: "HBL-887712390",
            amount: 3000,
            method: "bank",
            sender_phone: "03055554433",
            status: "verified",
            created_at: new Date(Date.now() - 172800000).toISOString(),
          },
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async (payment: OnlinePayment) => {
    // 1. Update status locally
    setPayments((prev) =>
      prev.map((p) => (p.id === payment.id ? { ...p, status: "verified" } : p))
    );

    // 2. Open WhatsApp Receipt Link
    const cleanPhone = payment.sender_phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("92")
      ? cleanPhone
      : "92" + cleanPhone.replace(/^0/, "");
    const msg = `السلام علیکم! محترم والدین، ${payment.student_name} کی فیس مبلغ Rs. ${payment.amount.toLocaleString()} بذریعہ ${payment.method.toUpperCase()} تصدیق ہو چکی ہے۔ Transaction ID: ${payment.transaction_id}۔ شکریہ - ${schoolName}`;
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");

    // 3. Sync to Supabase
    try {
      await supabase
        .from("online_payments")
        .update({ status: "verified", verified_at: new Date().toISOString() })
        .eq("id", payment.id);

      // Log in parent_messages_log
      await supabase.from("parent_messages_log").insert([
        {
          school_id: schoolId && schoolId !== "all" ? schoolId : 1,
          type: "fee_paid",
          recipient_phone: payment.sender_phone,
          message: msg,
          status: "sent",
        },
      ]);
    } catch (err) {}
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.transaction_id.trim() || !form.student_name.trim()) return;

    const newPayment: OnlinePayment = {
      id: Date.now(),
      school_id: schoolId || 1,
      student_id: 1,
      student_name: form.student_name,
      student_class: form.student_class,
      challan_no: form.challan_no,
      transaction_id: form.transaction_id,
      amount: Number(form.amount || 0),
      method: form.method,
      sender_phone: form.sender_phone,
      status: "pending",
      created_at: new Date().toISOString(),
    };

    setPayments((prev) => [newPayment, ...prev]);
    setShowAddModal(false);
    setForm({
      student_name: "",
      student_class: "Class 10",
      challan_no: `CH-${Date.now().toString().slice(-4)}`,
      transaction_id: "",
      amount: "2500",
      method: "easypaisa",
      sender_phone: "03001234567",
    });

    try {
      await supabase.from("online_payments").insert([
        {
          school_id: schoolId && schoolId !== "all" ? schoolId : 1,
          challan_no: newPayment.challan_no,
          transaction_id: newPayment.transaction_id,
          amount: newPayment.amount,
          method: newPayment.method,
          sender_phone: newPayment.sender_phone,
          status: "pending",
        },
      ]);
    } catch (err) {}
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.transaction_id.toLowerCase().includes(q) ||
        p.student_name.toLowerCase().includes(q) ||
        p.challan_no.toLowerCase().includes(q) ||
        p.sender_phone.includes(q);

      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      const matchMethod = methodFilter === "all" || p.method === methodFilter;

      return matchSearch && matchStatus && matchMethod;
    });
  }, [payments, search, statusFilter, methodFilter]);

  const stats = useMemo(() => {
    const verified = payments.filter((p) => p.status === "verified");
    const pending = payments.filter((p) => p.status === "pending");
    const totalCollected = verified.reduce((sum, p) => sum + p.amount, 0);

    return {
      verifiedCount: verified.length,
      pendingCount: pending.length,
      totalCollected,
    };
  }, [payments]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-3 md:p-6 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
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
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Online Payment Gateway
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Wallet className="w-7 h-7 text-emerald-600" />
              آن لائن فیس وصولی و تصدیق (EasyPaisa & JazzCash Fee Verification)
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              {schoolName} — EasyPaisa، JazzCash اور Bank کی فیس کی بذریعہ Transaction ID فوری تصدیق
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/fee-challan"
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-sm transition"
            >
              فیس چالان بنائیں (Print Challan)
            </Link>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-lg shadow-emerald-200 hover:brightness-105 transition active:scale-95"
            >
              <Plus className="w-4 h-4" /> فیس ادائیگی درج کریں (Add Trx)
            </button>
          </div>
        </div>

        {/* School Online Accounts & QR Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Official School Fee Receiving Accounts
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white">{schoolName}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div className="bg-white/10 p-3 rounded-xl border border-white/15">
                <div className="text-[10px] text-emerald-300 font-bold">EasyPaisa Account</div>
                <div className="text-sm font-black font-mono mt-0.5">{easypaisaNo}</div>
                <div className="text-[10px] opacity-80 truncate">Title: {easypaisaTitle}</div>
              </div>

              <div className="bg-white/10 p-3 rounded-xl border border-white/15">
                <div className="text-[10px] text-rose-300 font-bold">JazzCash Account</div>
                <div className="text-sm font-black font-mono mt-0.5">{jazzcashNo}</div>
                <div className="text-[10px] opacity-80 truncate">Title: {jazzcashTitle}</div>
              </div>

              <div className="bg-white/10 p-3 rounded-xl border border-white/15">
                <div className="text-[10px] text-blue-300 font-bold">Bank Account / IBAN</div>
                <div className="text-sm font-black truncate mt-0.5">{bankName}</div>
                <div className="text-[10px] font-mono opacity-80 truncate">{bankAccount}</div>
              </div>
            </div>
          </div>

          {/* QR Code */}
          {schoolQrUrl && (
            <div className="bg-white p-3 rounded-2xl border-4 border-yellow-400/40 shadow-lg text-center shrink-0">
              <img src={schoolQrUrl} alt="Fee QR" className="w-28 h-28 mx-auto" />
              <span className="text-[9px] font-bold text-slate-800 block mt-1 uppercase tracking-wider">
                Scan to Pay Fee
              </span>
            </div>
          )}
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">کل آن لائن وصول شدہ فیس</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">
                Rs. {stats.totalCollected.toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Verified Online Collection</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">زیر التواء تصدیق (Pending)</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1">
                {stats.pendingCount} ادائیگیاں
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Awaiting Trx ID Verification</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">تصدیق شدہ کل چالان</p>
              <h3 className="text-2xl font-black text-indigo-600 mt-1">
                {stats.verifiedCount} چالان
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Total Verified Transactions</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <FileCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="تلاش کریں Transaction ID، چالان نمبر، طالب علم..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs p-1.5 border border-slate-200 rounded-xl outline-none bg-white"
            >
              <option value="all">تمام سٹیٹس (All Status)</option>
              <option value="pending">زیر التواء (Pending)</option>
              <option value="verified">تصدیق شدہ (Verified)</option>
            </select>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="text-xs p-1.5 border border-slate-200 rounded-xl outline-none bg-white"
            >
              <option value="all">تمام طریقے (All Methods)</option>
              <option value="easypaisa">EasyPaisa</option>
              <option value="jazzcash">JazzCash</option>
              <option value="bank">Bank Transfer</option>
            </select>

            <button
              onClick={loadPayments}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              title="تازہ کریں"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Online Payments Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5">چالان نمبر</th>
                  <th className="p-3.5">طالب علم / کلاس</th>
                  <th className="p-3.5">طریقہ کار (Method)</th>
                  <th className="p-3.5">Transaction ID (Trx ID)</th>
                  <th className="p-3.5">رقم (Amount)</th>
                  <th className="p-3.5">حیثیت (Status)</th>
                  <th className="p-3.5 text-right">کارروائی (Action)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      کوئی ادائیگی موجود نہیں ہے۔
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5 font-mono font-bold text-slate-800">{p.challan_no}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{p.student_name}</div>
                        <div className="text-[10px] text-slate-500">{p.student_class}</div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            p.method === "easypaisa"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : p.method === "jazzcash"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {p.method}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-black text-indigo-950">
                        {p.transaction_id}
                      </td>
                      <td className="p-3.5 font-bold text-emerald-700 text-sm">
                        Rs. {p.amount.toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        {p.status === "verified" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> تصدیق شدہ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[10px] bg-amber-50 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" /> تصدیق طلب
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        {p.status === "pending" ? (
                          <button
                            onClick={() => handleVerifyPayment(p)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition active:scale-95"
                          >
                            <CheckCircle2 className="w-3 h-3" /> تصدیق کریں + رسید
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-semibold">ادا شدہ (Done)</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Add Manual Payment */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
              <h3 className="text-base font-black text-slate-900 mb-3 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                آن لائن فیس ادائیگی کا اندراج
              </h3>

              <form onSubmit={handleCreatePayment} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">طالب علم کا نام</label>
                  <input
                    type="text"
                    required
                    value={form.student_name}
                    onChange={(e) => setForm({ ...form, student_name: e.target.value })}
                    placeholder="طالب علم کا نام"
                    className="w-full p-2.5 border rounded-xl outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">کلاس</label>
                    <input
                      type="text"
                      value={form.student_class}
                      onChange={(e) => setForm({ ...form, student_class: e.target.value })}
                      className="w-full p-2.5 border rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">چالان نمبر</label>
                    <input
                      type="text"
                      value={form.challan_no}
                      onChange={(e) => setForm({ ...form, challan_no: e.target.value })}
                      className="w-full p-2.5 border rounded-xl outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">طریقہ کار (Method)</label>
                    <select
                      value={form.method}
                      onChange={(e) => setForm({ ...form, method: e.target.value as any })}
                      className="w-full p-2.5 border rounded-xl outline-none bg-white font-bold"
                    >
                      <option value="easypaisa">EasyPaisa</option>
                      <option value="jazzcash">JazzCash</option>
                      <option value="bank">Bank Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">رقم (Rs.)</label>
                    <input
                      type="number"
                      required
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="w-full p-2.5 border rounded-xl outline-none font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Transaction ID / Trx ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.transaction_id}
                    onChange={(e) => setForm({ ...form, transaction_id: e.target.value })}
                    placeholder="e.g. EP-123456789 یا 39485721"
                    className="w-full p-2.5 border rounded-xl outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">والدین کا فون نمبر</label>
                  <input
                    type="text"
                    value={form.sender_phone}
                    onChange={(e) => setForm({ ...form, sender_phone: e.target.value })}
                    placeholder="0300-1234567"
                    className="w-full p-2.5 border rounded-xl outline-none font-mono"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                  >
                    منسوخ
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-md"
                  >
                    محفوظ کریں
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
