"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getTodayPKDate, formatPKWhatsAppPhone } from "@/lib/date-utils";
import { resolveActiveSchoolContext } from "@/lib/school-context";
import {
  ArrowLeft,
  Search,
  MessageCircle,
  CheckSquare,
  Square,
  CheckCircle,
  AlertCircle,
  Filter,
  RefreshCw,
  Building,
  UserCheck,
  Send,
  Calendar,
  ExternalLink,
  Phone,
  DollarSign,
  ChevronRight,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

interface UnpaidFeeItem {
  feeId: number | string;
  studentId: number | string;
  studentName: string;
  studentClass: string;
  fatherName: string;
  phone: string;
  month: string;
  amount: number;
  schoolId: number | string;
  schoolName: string;
}

export default function FeesReminderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [schoolContext, setSchoolContext] = useState<any>(null);
  const [unpaidFees, setUnpaidFees] = useState<UnpaidFeeItem[]>([]);
  const [selectedFeeIds, setSelectedFeeIds] = useState<Set<string | number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Bulk send modal state
  const [bulkQueue, setBulkQueue] = useState<UnpaidFeeItem[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const todayPK = getTodayPKDate();

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const ctx = await resolveActiveSchoolContext();
      setSchoolContext(ctx);

      // Fetch students and fee records
      let studentsQuery = supabase.from("students").select("*");
      let feeQuery = supabase
        .from("fee_records")
        .select("*, students(id, name, class, father_name, phone)")
        .neq("status", "paid");

      if (ctx.schoolId && ctx.schoolId !== "all") {
        studentsQuery = studentsQuery.eq("school_id", ctx.schoolId);
        feeQuery = feeQuery.eq("school_id", ctx.schoolId);
      }

      const [studentsRes, feesRes] = await Promise.all([studentsQuery, feeQuery]);

      const studentsMap = new Map();
      (studentsRes.data || []).forEach((s: any) => {
        studentsMap.set(String(s.id), s);
      });

      const items: UnpaidFeeItem[] = [];
      (feesRes.data || []).forEach((f: any) => {
        const studentInfo =
          (Array.isArray(f.students) ? f.students[0] : f.students) ||
          studentsMap.get(String(f.student_id)) ||
          {};

        items.push({
          feeId: f.id,
          studentId: f.student_id,
          studentName: studentInfo.name || `Student #${f.student_id}`,
          studentClass: studentInfo.class || "-",
          fatherName: studentInfo.father_name || "-",
          phone: studentInfo.phone || "",
          month: f.month || "-",
          amount: Number(f.amount || 0),
          schoolId: f.school_id,
          schoolName: ctx.schoolName || "Registered School",
        });
      });

      setUnpaidFees(items);
    } catch (err: any) {
      console.error(err);
      showToast("error", err.message || "Failed to load fee records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered unpaid fees
  const filteredFees = useMemo(() => {
    return unpaidFees.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.studentName.toLowerCase().includes(q) ||
        item.studentClass.toLowerCase().includes(q) ||
        item.fatherName.toLowerCase().includes(q) ||
        item.phone.includes(q);

      const matchesClass = selectedClass === "all" || item.studentClass.toLowerCase() === selectedClass.toLowerCase();
      const matchesMonth = selectedMonth === "all" || item.month.toLowerCase() === selectedMonth.toLowerCase();

      return matchesSearch && matchesClass && matchesMonth;
    });
  }, [unpaidFees, searchQuery, selectedClass, selectedMonth]);

  // Unique Classes and Months for Filters
  const classOptions = useMemo(() => {
    const set = new Set<string>();
    unpaidFees.forEach((f) => {
      if (f.studentClass && f.studentClass !== "-") set.add(f.studentClass);
    });
    return Array.from(set).sort();
  }, [unpaidFees]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    unpaidFees.forEach((f) => {
      if (f.month && f.month !== "-") set.add(f.month);
    });
    return Array.from(set).sort();
  }, [unpaidFees]);

  // Total Dues Calculation
  const totalDueAmount = useMemo(() => {
    return filteredFees.reduce((acc, curr) => acc + curr.amount, 0);
  }, [filteredFees]);

  // Selected Total Calculation
  const selectedTotalAmount = useMemo(() => {
    return unpaidFees
      .filter((item) => selectedFeeIds.has(item.feeId))
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [unpaidFees, selectedFeeIds]);

  // Multi-select helpers
  const isAllSelected = filteredFees.length > 0 && filteredFees.every((f) => selectedFeeIds.has(f.feeId));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const newSet = new Set(selectedFeeIds);
      filteredFees.forEach((f) => newSet.delete(f.feeId));
      setSelectedFeeIds(newSet);
    } else {
      const newSet = new Set(selectedFeeIds);
      filteredFees.forEach((f) => newSet.add(f.feeId));
      setSelectedFeeIds(newSet);
    }
  };

  const toggleSelectOne = (id: string | number) => {
    const newSet = new Set(selectedFeeIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedFeeIds(newSet);
  };

  // WhatsApp Message Generator
  const generateWhatsAppUrl = (item: UnpaidFeeItem) => {
    const cleanPhone = formatPKWhatsAppPhone(item.phone);
    const schoolTitle = item.schoolName || schoolContext?.schoolName || "Registered School";
    const msg = `Assalamu Alaikum, ${item.studentName} Class ${item.studentClass} ki fee Rs. ${item.amount.toLocaleString()} pending hai. Date ${todayPK}. - ${schoolTitle}.`;
    
    if (cleanPhone) {
      return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    }
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  const handleSendSingle = (item: UnpaidFeeItem) => {
    const url = generateWhatsAppUrl(item);
    window.open(url, "_blank");
    showToast("success", `Opening WhatsApp reminder for ${item.studentName}`);
  };

  // Bulk Send Flow
  const startBulkSend = () => {
    const selectedItems = unpaidFees.filter((f) => selectedFeeIds.has(f.feeId));
    if (selectedItems.length === 0) {
      showToast("error", "Please select at least one student to send reminder.");
      return;
    }
    setBulkQueue(selectedItems);
    setQueueIndex(0);
    setIsBulkModalOpen(true);
  };

  const sendCurrentQueueItemAndNext = () => {
    if (queueIndex < bulkQueue.length) {
      const current = bulkQueue[queueIndex];
      const url = generateWhatsAppUrl(current);
      window.open(url, "_blank");

      if (queueIndex + 1 < bulkQueue.length) {
        setQueueIndex(queueIndex + 1);
      } else {
        showToast("success", `All ${bulkQueue.length} reminders processed!`);
        setIsBulkModalOpen(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-16">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>Dashboard</span>
            </Link>
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  WhatsApp Fee Reminders
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Realtime
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Auto-generate personalized Urdu/English fee notices with 1-click WhatsApp delivery
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 rounded-lg px-2.5 py-1 text-xs text-emerald-800 font-semibold">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>PK Date: {todayPK}</span>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs transition cursor-pointer"
              title="Refresh Dues"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
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

        {/* 4 Light-Themed Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Pending Defaulters
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {unpaidFees.length}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Students with dues</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center font-bold">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Unpaid Dues
              </p>
              <h3 className="text-2xl font-black text-rose-600 mt-1">
                Rs. {totalDueAmount.toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">In selected filter</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Selected for Notice
              </p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">
                {selectedFeeIds.size}
              </h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                Rs. {selectedTotalAmount.toLocaleString()} Selected
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                School Active Context
              </p>
              <h3 className="text-base font-bold text-slate-900 mt-1 truncate max-w-[170px]" title={schoolContext?.schoolName}>
                {schoolContext?.schoolName || "Registered School"}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Date: {todayPK}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold">
              <Building className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter and Action Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search student, father, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Class Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-semibold">Class:</span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">All Classes</option>
                {classOptions.map((c) => (
                  <option key={c} value={c}>
                    Class {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-semibold">Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">All Months</option>
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bulk WhatsApp Reminder Button */}
          <div className="w-full md:w-auto flex items-center justify-end gap-2">
            <button
              onClick={startBulkSend}
              disabled={selectedFeeIds.size === 0}
              className={`w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer ${
                selectedFeeIds.size > 0
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send WhatsApp Reminders ({selectedFeeIds.size})</span>
            </button>
          </div>
        </div>

        {/* Unpaid Fees List Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-emerald-700 cursor-pointer"
              >
                {isAllSelected ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>Select All ({filteredFees.length})</span>
              </button>
              {selectedFeeIds.size > 0 && (
                <span className="text-xs text-slate-400 font-medium">
                  • {selectedFeeIds.size} selected (Rs. {selectedTotalAmount.toLocaleString()})
                </span>
              )}
            </div>

            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredFees.length} defaulters
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider bg-slate-50/80">
                  <th className="py-3 px-4 w-10">Select</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Father Name</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Billing Month</th>
                  <th className="py-3 px-4">Pending Fee</th>
                  <th className="py-3 px-4">Parent Phone</th>
                  <th className="py-3 px-4 text-right">Instant Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600 mb-2" />
                      Loading pending fee records...
                    </td>
                  </tr>
                ) : filteredFees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No unpaid fee records found for the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredFees.map((item) => {
                    const isChecked = selectedFeeIds.has(item.feeId);
                    const cleanPhone = formatPKWhatsAppPhone(item.phone);

                    return (
                      <tr
                        key={item.feeId}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isChecked ? "bg-emerald-50/30" : ""
                        }`}
                      >
                        <td className="py-3 px-4">
                          <button
                            onClick={() => toggleSelectOne(item.feeId)}
                            className="cursor-pointer text-slate-400 hover:text-emerald-600"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">
                              {item.studentName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="leading-tight">{item.studentName}</p>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ID #{item.studentId}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {item.fatherName}
                        </td>

                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {item.studentClass}
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-700">
                            {item.month}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-black text-rose-600 text-sm">
                          Rs. {item.amount.toLocaleString()}
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-600">
                          {cleanPhone ? (
                            <span className="flex items-center gap-1 text-slate-800">
                              <Phone className="w-3 h-3 text-emerald-600" />
                              {item.phone}
                            </span>
                          ) : (
                            <span className="text-amber-600 text-[10px] italic">No phone saved</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleSendSingle(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                            title="Open WhatsApp chat with prefilled notice"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Send WhatsApp</span>
                          </button>
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

      {/* BULK SEND MODAL / QUEUE CONTROLLER */}
      {isBulkModalOpen && bulkQueue.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    WhatsApp Reminders Queue
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Processing {queueIndex + 1} of {bulkQueue.length} selected students
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Current Student Preview */}
            {bulkQueue[queueIndex] && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      {bulkQueue[queueIndex].studentName}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Class: {bulkQueue[queueIndex].studentClass} • Father: {bulkQueue[queueIndex].fatherName}
                    </p>
                  </div>
                  <span className="text-sm font-black text-rose-600">
                    Rs. {bulkQueue[queueIndex].amount.toLocaleString()}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 italic font-sans leading-relaxed">
                  "Assalamu Alaikum, {bulkQueue[queueIndex].studentName} Class {bulkQueue[queueIndex].studentClass} ki fee Rs. {bulkQueue[queueIndex].amount.toLocaleString()} pending hai. Date {todayPK}. - {bulkQueue[queueIndex].schoolName}."
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Target Phone:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {bulkQueue[queueIndex].phone || "Not Specified"}
                  </span>
                </div>
              </div>
            )}

            {/* Progress bar */}
            <div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 transition-all duration-300"
                  style={{
                    width: `${((queueIndex + 1) / bulkQueue.length) * 100}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-semibold">
                <span>Progress</span>
                <span>
                  {queueIndex + 1} / {bulkQueue.length}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                onClick={sendCurrentQueueItemAndNext}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 cursor-pointer transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {queueIndex + 1 === bulkQueue.length
                    ? "Open WhatsApp & Finish"
                    : "Open WhatsApp & Next Student"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
