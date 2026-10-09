"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { resolveActiveSchoolContext } from "@/lib/school-context";
import { getTodayPKDate } from "@/lib/date-utils";
import { URDU_MONTHS, formatPKR } from "@/lib/govt-registers";
import {
  ArrowLeft,
  Printer,
  Download,
  Plus,
  Trash2,
  Edit3,
  Settings,
  Save,
  CheckCircle,
  AlertCircle,
  Book,
  Calendar,
  Building,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  CreditCard,
  FileSpreadsheet,
  X,
  RefreshCw,
  Coins,
} from "lucide-react";

interface NSBSettings {
  emis: string;
  tehsil: string;
  zila: string;
  school_name: string;
  bank_name: string;
  account_no: string;
  previous_balance: number;
}

interface IncomeRecord {
  id: string;
  sr_no: number;
  date: string;
  description: string;
  amount: number;
  payment_mode: string;
  signature: string;
}

interface ExpenseRecord {
  id: string;
  sr_no: number;
  date: string;
  receipt_no: string;
  description: string;
  bank_withdrawn: number;
  payment: number;
  approval_ref: string;
  signature: string;
}

const DEFAULT_SETTINGS: NSBSettings = {
  emis: "38410294",
  tehsil: "سلانوالی",
  zila: "سرگودھا",
  school_name: "گورنمنٹ ہائی سکول سلانوالی",
  bank_name: "نیشنل بینک آف پاکستان، مین برانچ",
  account_no: "0498-31204921",
  previous_balance: 125000,
};

const SAMPLE_INCOME: IncomeRecord[] = [
  {
    id: "inc-1",
    sr_no: 1,
    date: "05-10-2026",
    description: "NSB قسط اول مالی سال 2026-27 موصولہ بذریعہ چیک نمبر 49102",
    amount: 250000,
    payment_mode: "چیک",
    signature: "منظور",
  },
  {
    id: "inc-2",
    sr_no: 2,
    date: "12-10-2026",
    description: "بینک منافع (پرافٹ آن پی ایل اے اکاؤنٹ)",
    amount: 4850,
    payment_mode: "بینک ٹرانسفر",
    signature: "منظور",
  },
  {
    id: "inc-3",
    sr_no: 3,
    date: "20-10-2026",
    description: "نیلامی ردی و پرانا کاٹھ کباڑ سکول کونسل فنڈ",
    amount: 8500,
    payment_mode: "نقد",
    signature: "منظور",
  },
];

const SAMPLE_EXPENSES: ExpenseRecord[] = [
  {
    id: "exp-1",
    sr_no: 1,
    date: "06-10-2026",
    receipt_no: "R-101",
    description: "مرمت و بحالی واش رومز، نلکے و پلمبنگ سامان",
    bank_withdrawn: 35000,
    payment: 34500,
    approval_ref: "قرارداد نمبر 14، صفحہ 22",
    signature: "منظور",
  },
  {
    id: "exp-2",
    sr_no: 2,
    date: "10-10-2026",
    receipt_no: "R-102",
    description: "سٹیشنری برائے امتحانات، کاغذات و پرنٹنگ و فوٹو کاپی",
    bank_withdrawn: 15000,
    payment: 14800,
    approval_ref: "قرارداد نمبر 15، صفحہ 23",
    signature: "منظور",
  },
  {
    id: "exp-3",
    sr_no: 3,
    date: "15-10-2026",
    receipt_no: "R-103",
    description: "سفیدی سکول عمارت و رنگ و روغن فرنیچر",
    bank_withdrawn: 40000,
    payment: 39500,
    approval_ref: "قرارداد نمبر 16، صفحہ 24",
    signature: "منظور",
  },
  {
    id: "exp-4",
    sr_no: 4,
    date: "22-10-2026",
    receipt_no: "R-104",
    description: "سائنس لیبارٹری کا سامان و کیمیکلز و بجلی کا سامان",
    bank_withdrawn: 20000,
    payment: 19200,
    approval_ref: "قرارداد نمبر 17، صفحہ 25",
    signature: "منظور",
  },
];

export default function NSBCashBookPage() {
  const [loading, setLoading] = useState(true);
  const [schoolContext, setSchoolContext] = useState<any>(null);

  // Month & Year Filter
  const [selectedMonth, setSelectedMonth] = useState<string>("10"); // October
  const [selectedYear, setSelectedYear] = useState<string>("2026");

  // Settings & Records
  const [settings, setSettings] = useState<NSBSettings>(DEFAULT_SETTINGS);
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);

  // Modals
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Form states
  const [incomeForm, setIncomeForm] = useState({
    date: getTodayPKDate(),
    description: "",
    amount: "",
    payment_mode: "چیک",
    signature: "منظور",
  });

  const [expenseForm, setExpenseForm] = useState({
    date: getTodayPKDate(),
    receipt_no: "",
    description: "",
    bank_withdrawn: "",
    payment: "",
    approval_ref: "",
    signature: "منظور",
  });

  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // Get active school & load data
  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      const ctx = await resolveActiveSchoolContext();
      setSchoolContext(ctx);

      const storageKey = `oa_nsb_${ctx?.schoolId || "all"}_${selectedYear}_${selectedMonth}`;
      let loadedSettings = { ...DEFAULT_SETTINGS };
      if (ctx?.schoolName) {
        loadedSettings.school_name = ctx.schoolName;
      }

      let loadedIncome: IncomeRecord[] = [];
      let loadedExpenses: ExpenseRecord[] = [];

      // 1. Try Supabase
      try {
        let setQuery = supabase
          .from("nsb_settings")
          .select("*")
          .eq("month", selectedMonth)
          .eq("year", selectedYear);
        if (ctx?.schoolId) setQuery = setQuery.eq("school_id", ctx.schoolId);
        const { data: setRes } = await setQuery.maybeSingle();

        if (setRes) {
          loadedSettings = {
            emis: setRes.emis || loadedSettings.emis,
            tehsil: setRes.tehsil || loadedSettings.tehsil,
            zila: setRes.zila || loadedSettings.zila,
            school_name: setRes.school_name || loadedSettings.school_name,
            bank_name: setRes.bank_name || loadedSettings.bank_name,
            account_no: setRes.account_no || loadedSettings.account_no,
            previous_balance: Number(setRes.previous_balance || 0),
          };
        }

        // Fetch income
        let incQuery = supabase
          .from("nsb_income")
          .select("*")
          .eq("month", selectedMonth)
          .eq("year", selectedYear)
          .order("sr_no", { ascending: true });
        if (ctx?.schoolId) incQuery = incQuery.eq("school_id", ctx.schoolId);
        const { data: incRes } = await incQuery;

        if (incRes && incRes.length > 0) {
          loadedIncome = incRes.map((r: any, idx: number) => ({
            id: String(r.id),
            sr_no: r.sr_no || idx + 1,
            date: r.date,
            description: r.description,
            amount: Number(r.amount || 0),
            payment_mode: r.payment_mode || "چیک",
            signature: r.signature || "منظور",
          }));
        }

        // Fetch expenses
        let expQuery = supabase
          .from("nsb_expense")
          .select("*")
          .eq("month", selectedMonth)
          .eq("year", selectedYear)
          .order("sr_no", { ascending: true });
        if (ctx?.schoolId) expQuery = expQuery.eq("school_id", ctx.schoolId);
        const { data: expRes } = await expQuery;

        if (expRes && expRes.length > 0) {
          loadedExpenses = expRes.map((r: any, idx: number) => ({
            id: String(r.id),
            sr_no: r.sr_no || idx + 1,
            date: r.date,
            receipt_no: r.receipt_no || "",
            description: r.description,
            bank_withdrawn: Number(r.bank_withdrawn || 0),
            payment: Number(r.payment || 0),
            approval_ref: r.approval_ref || "",
            signature: r.signature || "منظور",
          }));
        }
      } catch (err) {
        console.warn("Supabase fetch note:", err);
      }

      // 2. Fallback to localStorage or sample data
      if (typeof window !== "undefined") {
        const local = localStorage.getItem(storageKey);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (parsed.settings) loadedSettings = parsed.settings;
            if (parsed.income && loadedIncome.length === 0) loadedIncome = parsed.income;
            if (parsed.expenses && loadedExpenses.length === 0) loadedExpenses = parsed.expenses;
          } catch (e) {}
        }
      }

      // If empty for default month, seed with realistic mock records
      if (loadedIncome.length === 0 && loadedExpenses.length === 0) {
        loadedIncome = SAMPLE_INCOME;
        loadedExpenses = SAMPLE_EXPENSES;
      }

      setSettings(loadedSettings);
      setIncomeRecords(loadedIncome);
      setExpenseRecords(loadedExpenses);
    } catch (err: any) {
      console.error(err);
      showToast("error", "ڈیٹا لوڈ کرنے میں خرابی پیش آئی");
    } finally {
      setLoading(false);
    }
  };

  // Sync to local storage
  const syncToLocalStorage = (
    newSettings = settings,
    newIncome = incomeRecords,
    newExpenses = expenseRecords
  ) => {
    if (typeof window !== "undefined") {
      const storageKey = `oa_nsb_${schoolContext?.schoolId || "all"}_${selectedYear}_${selectedMonth}`;
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          settings: newSettings,
          income: newIncome,
          expenses: newExpenses,
        })
      );
    }
  };

  // Mathematical Calculations
  const calculations = useMemo(() => {
    const totalIncome = incomeRecords.reduce((sum, r) => sum + r.amount, 0);
    const totalBankWithdrawn = expenseRecords.reduce((sum, r) => sum + r.bank_withdrawn, 0);
    const totalPayments = expenseRecords.reduce((sum, r) => sum + r.payment, 0);

    // Bank Balance = Previous Balance + Bank Income - Bank Withdrawn
    const bankIncome = incomeRecords
      .filter((r) => r.payment_mode !== "نقد")
      .reduce((sum, r) => sum + r.amount, 0);
    const cashIncome = incomeRecords
      .filter((r) => r.payment_mode === "نقد")
      .reduce((sum, r) => sum + r.amount, 0);

    const bankBalance = Math.max(0, settings.previous_balance + bankIncome - totalBankWithdrawn);
    const cashInHand = Math.max(0, totalBankWithdrawn + cashIncome - totalPayments);

    // Compute running income total
    let runInc = 0;
    const incomeWithRunning = incomeRecords.map((r) => {
      runInc += r.amount;
      return { ...r, running_total: runInc };
    });

    // Compute running expense total
    let runExp = 0;
    const expensesWithRunning = expenseRecords.map((r) => {
      runExp += r.payment;
      return { ...r, running_total: runExp };
    });

    return {
      totalIncome,
      totalBankWithdrawn,
      totalPayments,
      bankBalance,
      cashInHand,
      incomeWithRunning,
      expensesWithRunning,
    };
  }, [incomeRecords, expenseRecords, settings]);

  // Handle Add Income
  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeForm.description || !incomeForm.amount) {
      showToast("error", "براہ کرم تفصیل اور رقم درج کریں");
      return;
    }

    const newRecord: IncomeRecord = {
      id: "inc-" + Date.now(),
      sr_no: incomeRecords.length + 1,
      date: incomeForm.date || getTodayPKDate(),
      description: incomeForm.description,
      amount: parseFloat(incomeForm.amount) || 0,
      payment_mode: incomeForm.payment_mode,
      signature: incomeForm.signature || "منظور",
    };

    const updated = [...incomeRecords, newRecord];
    setIncomeRecords(updated);
    syncToLocalStorage(settings, updated, expenseRecords);

    // Save to Supabase
    try {
      await supabase.from("nsb_income").insert({
        school_id: schoolContext?.schoolId || null,
        month: selectedMonth,
        year: selectedYear,
        sr_no: newRecord.sr_no,
        date: newRecord.date,
        description: newRecord.description,
        amount: newRecord.amount,
        payment_mode: newRecord.payment_mode,
        signature: newRecord.signature,
      });
    } catch (e) {}

    setIsIncomeModalOpen(false);
    setIncomeForm({
      date: getTodayPKDate(),
      description: "",
      amount: "",
      payment_mode: "چیک",
      signature: "منظور",
    });
    showToast("success", "آمدن کا نیا اندراج کامیابی سے محفوظ کر لیا گیا");
  };

  // Handle Add Expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.description || !expenseForm.payment) {
      showToast("error", "براہ کرم تفصیل اور رقم ادائیگی درج کریں");
      return;
    }

    const newRecord: ExpenseRecord = {
      id: "exp-" + Date.now(),
      sr_no: expenseRecords.length + 1,
      date: expenseForm.date || getTodayPKDate(),
      receipt_no: expenseForm.receipt_no || `R-${expenseRecords.length + 101}`,
      description: expenseForm.description,
      bank_withdrawn: parseFloat(expenseForm.bank_withdrawn) || 0,
      payment: parseFloat(expenseForm.payment) || 0,
      approval_ref: expenseForm.approval_ref || "قرارداد سکول کونسل",
      signature: expenseForm.signature || "منظور",
    };

    const updated = [...expenseRecords, newRecord];
    setExpenseRecords(updated);
    syncToLocalStorage(settings, incomeRecords, updated);

    // Save to Supabase
    try {
      await supabase.from("nsb_expense").insert({
        school_id: schoolContext?.schoolId || null,
        month: selectedMonth,
        year: selectedYear,
        sr_no: newRecord.sr_no,
        date: newRecord.date,
        receipt_no: newRecord.receipt_no,
        description: newRecord.description,
        bank_withdrawn: newRecord.bank_withdrawn,
        payment: newRecord.payment,
        approval_ref: newRecord.approval_ref,
        signature: newRecord.signature,
      });
    } catch (e) {}

    setIsExpenseModalOpen(false);
    setExpenseForm({
      date: getTodayPKDate(),
      receipt_no: "",
      description: "",
      bank_withdrawn: "",
      payment: "",
      approval_ref: "",
      signature: "منظور",
    });
    showToast("success", "اخراجات کا نیا اندراج کامیابی سے محفوظ کر لیا گیا");
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    syncToLocalStorage(settings, incomeRecords, expenseRecords);

    try {
      await supabase.from("nsb_settings").upsert({
        school_id: schoolContext?.schoolId || null,
        month: selectedMonth,
        year: selectedYear,
        emis: settings.emis,
        tehsil: settings.tehsil,
        zila: settings.zila,
        school_name: settings.school_name,
        bank_name: settings.bank_name,
        account_no: settings.account_no,
        previous_balance: settings.previous_balance,
        bank_balance: calculations.bankBalance,
        cash_in_hand: calculations.cashInHand,
      });
    } catch (e) {}

    setIsSettingsModalOpen(false);
    showToast("success", "رجسٹر سیٹنگز کامیابی سے محفوظ ہو گئیں");
  };

  // Delete Income
  const handleDeleteIncome = (id: string) => {
    if (!confirm("کیا آپ واقعی یہ اندراج حذف کرنا چاہتے ہیں؟")) return;
    const updated = incomeRecords.filter((r) => r.id !== id);
    setIncomeRecords(updated);
    syncToLocalStorage(settings, updated, expenseRecords);
    showToast("success", "اندراج حذف کر دیا گیا");
  };

  // Delete Expense
  const handleDeleteExpense = (id: string) => {
    if (!confirm("کیا آپ واقعی یہ خرچ حذف کرنا چاہتے ہیں؟")) return;
    const updated = expenseRecords.filter((r) => r.id !== id);
    setExpenseRecords(updated);
    syncToLocalStorage(settings, incomeRecords, updated);
    showToast("success", "خرچ حذف کر دیا گیا");
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Export CSV
  const handleExportCSV = () => {
    let csv = "\uFEFF"; // UTF-8 BOM for Urdu support
    csv += "NSB کیش بک (سکول کونسل) - فارم نمبر 8\n";
    csv += `سکول کا نام: ${settings.school_name}, ایمس کوڈ: ${settings.emis}, ماہ: ${selectedMonth}-${selectedYear}\n\n`;

    csv += "--- آمدن ---\n";
    csv += "نمبر شمار,تاریخ,تفصیل آمدن,رقم نقد/چیک,ادائیگی قسم,دستخط\n";
    incomeRecords.forEach((r) => {
      csv += `"${r.sr_no}","${r.date}","${r.description.replace(/"/g, '""')}","${r.amount}","${r.payment_mode}","${r.signature}"\n`;
    });
    csv += `,,کل آمدن,${calculations.totalIncome},,\n\n`;

    csv += "--- اخراجات ---\n";
    csv += "نمبر شمار,تاریخ,رسید نمبر,تفصیل اخراجات,چیک سے نکالی رقم,ادائیگی,منظوری کا حوالہ,دستخط\n";
    expenseRecords.forEach((r) => {
      csv += `"${r.sr_no}","${r.date}","${r.receipt_no}","${r.description.replace(/"/g, '""')}","${r.bank_withdrawn}","${r.payment}","${r.approval_ref}","${r.signature}"\n`;
    });
    csv += `,,,کل اخراجات,,${calculations.totalPayments},,\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `NSB_CashBook_${selectedYear}_${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("success", "ایکسل فائل کامیابی سے ڈاؤنلوڈ ہو گئی");
  };

  // Urdu Month Name
  const currentMonthName = useMemo(() => {
    const m = URDU_MONTHS.find((item) => item.key === selectedMonth);
    return m ? m.name : "ماہ حال";
  }, [selectedMonth]);

  // EMIS Code Boxes (8 digits)
  const emisDigits = useMemo(() => {
    const padded = (settings.emis || "").padEnd(8, " ").slice(0, 8);
    return padded.split("");
  }, [settings.emis]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-16 print:bg-white print:p-0 print:pb-0">
      {/* 1. TOP HEADER & BREADCRUMB (Hidden in Print) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs px-3 sm:px-6 py-2.5 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left Title & Back */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition flex items-center justify-center shrink-0 cursor-pointer"
              title="واپس ڈیش بورڈ"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
                  Form No 8 • فارم نمبر 8
                </span>
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 font-urdu">
                  <span>کیش بک (سکول کونسل فنڈ)</span>
                </h1>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate max-w-md">
                {settings.school_name} • ایمس کوڈ: {settings.emis}
              </p>
            </div>
          </div>

          {/* Right Filters & Quick Action Bar */}
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 md:pb-0 scrollbar-none justify-end">
            {/* Month Selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer pr-1"
              >
                {URDU_MONTHS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.name} ({m.en})
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>

            {/* Action Buttons */}
            <button
              onClick={() => setIsIncomeModalOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>آمدن درج کریں</span>
            </button>

            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>خرچ درج کریں</span>
            </button>

            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
              title="رجسٹر سیٹنگز"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={handleExportCSV}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
              title="CSV ایکسل ڈاؤنلوڈ"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-rose-400" />
              <span>پرنٹ رجسٹر</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6 print:p-0 print:max-w-none">
        {/* Toast Notification */}
        {toast && (
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold animate-in fade-in print:hidden ${
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

        {/* 3. FOUR SUMMARY CARDS (Top Overview - Screen Only) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:hidden">
          {/* Card 1: کل آمدن */}
          <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-urdu">
                کل آمدن (ماہِ رواں)
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">
                Rs. {formatPKR(calculations.totalIncome)}
              </h3>
              <p className="text-[10px] text-emerald-700/80 mt-1 font-medium">
                {incomeRecords.length} اندراجات آمدن
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: کل اخراجات */}
          <div className="bg-white rounded-2xl p-4 border border-rose-100 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-urdu">
                کل اخراجات (ادائیگی)
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-rose-600 mt-0.5">
                Rs. {formatPKR(calculations.totalPayments)}
              </h3>
              <p className="text-[10px] text-rose-700/80 mt-1 font-medium">
                {expenseRecords.length} رسیدات اخراجات
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: بینک بیلنس */}
          <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-urdu">
                بینک بیلنس (اختتامی)
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-blue-600 mt-0.5">
                Rs. {formatPKR(calculations.bankBalance)}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[130px]">
                {settings.bank_name}
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: کیش ان ہینڈ */}
          <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-urdu">
                کیش ان ہینڈ (موجود نقد)
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5">
                Rs. {formatPKR(calculations.cashInHand)}
              </h3>
              <p className="text-[10px] text-amber-700/80 mt-1 font-medium">
                باقی نقد رقم برائے خرچ
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 4. AUTHENTIC GOVT REGISTER SPREAD CONTAINER (EXACT REPLICA OF PHOTO 1) */}
        <div className="bg-white rounded-3xl border-2 border-slate-800 shadow-md p-4 sm:p-6 print:border-none print:shadow-none print:p-0 overflow-x-auto">
          {/* TWO-PAGE SPREAD WRAPPER (Landscape Side-by-Side: Left = اخراجات, Right = آمدن in RTL) */}
          <div className="min-w-[1050px] print:min-w-0 flex flex-col gap-6" dir="rtl">
            {/* TOP HEADER AS PER PHOTO 1 */}
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="grid grid-cols-2 gap-8 items-start">
                {/* RIGHT PAGE HEADER (دایاں صفحہ - کیش بک سکول کونسل) */}
                <div className="space-y-2 border-l-2 border-slate-300 pl-4">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-full border-2 border-rose-500 text-rose-600 font-bold flex items-center justify-center text-xs">
                      47
                    </div>
                    <div className="text-center">
                      <h2 className="text-2xl font-black text-rose-600 font-urdu tracking-wide">
                        کیش بک <span className="text-rose-500 font-bold">(سکول کونسل)</span>
                      </h2>
                    </div>
                    <span className="text-xs font-bold text-slate-600">
                      &lt; دایاں صفحہ &gt;
                    </span>
                  </div>

                  {/* Fields: ایمس کوڈ: [8 boxes] تحصیل و ضلع: سکول کا نام: */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800 shrink-0">ایمس کوڈ:</span>
                      <div className="flex items-center gap-0.5" dir="ltr">
                        {emisDigits.map((digit, i) => (
                          <span
                            key={i}
                            className="w-5 h-6 border border-slate-800 flex items-center justify-center font-bold text-xs bg-slate-50 text-slate-900"
                          >
                            {digit}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800 shrink-0">تحصیل و ضلع:</span>
                      <span className="font-bold text-slate-900 border-b border-dashed border-slate-600 flex-1 truncate pb-0.5">
                        {settings.tehsil} ، {settings.zila}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-bold text-slate-800 shrink-0">سکول کا نام:</span>
                    <span className="font-bold text-slate-900 border-b border-dashed border-slate-600 flex-1 truncate pb-0.5">
                      {settings.school_name}
                    </span>
                  </div>
                </div>

                {/* LEFT PAGE HEADER (بایاں صفحہ - فارم نمبر 8) */}
                <div className="space-y-2 pr-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">
                      &lt; بایاں صفحہ &gt;
                    </span>
                    <div className="px-3 py-0.5 border-2 border-rose-600 text-rose-600 font-black text-sm rounded bg-rose-50/50">
                      فارم نمبر 8
                    </div>
                    <div className="w-8 h-8 rounded-full border-2 border-rose-500 text-rose-600 font-bold flex items-center justify-center text-xs">
                      48
                    </div>
                  </div>

                  {/* Fields: ماہ: [3 boxes] سال: بنک کا نام و پتہ: سکول کونسل بنک اکاؤنٹ نمبر: */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 shrink-0">ماہ:</span>
                      <div className="flex items-center gap-0.5">
                        <span className="px-2 py-0.5 border border-slate-800 bg-slate-50 font-bold text-xs">
                          {currentMonthName}
                        </span>
                      </div>
                      <span className="font-bold text-slate-800 shrink-0 mr-2">سال:</span>
                      <span className="border-b border-dashed border-slate-600 font-bold px-2">
                        {selectedYear}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800 shrink-0">بنک کا نام و پتہ:</span>
                      <span className="font-bold text-slate-900 border-b border-dashed border-slate-600 flex-1 truncate pb-0.5">
                        {settings.bank_name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-bold text-slate-800 shrink-0">
                      سکول کونسل کا بنک اکاؤنٹ نمبر:
                    </span>
                    <span className="font-mono font-bold text-slate-900 border-b border-dashed border-slate-600 flex-1 truncate pb-0.5">
                      {settings.account_no}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* TWO TABLES SPREAD: RIGHT TABLE (آمدن) & LEFT TABLE (اخراجات) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* ========================================================= */}
              {/* RIGHT TABLE: آمدن (Receipts / Income) */}
              {/* ========================================================= */}
              <div className="border-2 border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between h-full bg-white">
                <div>
                  <div className="bg-[#fce7f3] border-b-2 border-slate-800 p-2 text-center">
                    <h3 className="text-base font-black text-rose-800 tracking-wider font-urdu">
                      آمدن
                    </h3>
                  </div>

                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-800 font-bold text-slate-900 text-[11px]">
                        <th className="p-2 border-l border-slate-400 w-10 text-center">نمبرشمار</th>
                        <th className="p-2 border-l border-slate-400 w-24 text-center">تاریخ</th>
                        <th className="p-2 border-l border-slate-400">تفصیل آمدن</th>
                        <th className="p-2 border-l border-slate-400 w-24 text-center">
                          رقم (نقد/چیک)
                        </th>
                        <th className="p-2 border-l border-slate-400 w-20 text-center">میزان</th>
                        <th className="p-2 w-28 text-center text-[10px]">
                          دستخط ہیڈ ٹیچر / چیئرپرسن
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {calculations.incomeWithRunning.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50 transition group">
                          <td className="p-2 border-l border-slate-300 text-center font-bold">
                            {row.sr_no}
                          </td>
                          <td className="p-2 border-l border-slate-300 text-center font-mono whitespace-nowrap text-[11px]">
                            {row.date}
                          </td>
                          <td className="p-2 border-l border-slate-300">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-800">{row.description}</span>
                              <button
                                onClick={() => handleDeleteIncome(row.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-rose-500 hover:text-rose-700 transition print:hidden"
                                title="حذف کریں"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="p-2 border-l border-slate-300 text-center font-bold font-mono text-emerald-700">
                            {formatPKR(row.amount)}
                          </td>
                          <td className="p-2 border-l border-slate-300 text-center font-bold font-mono text-slate-900">
                            {formatPKR(row.running_total)}
                          </td>
                          <td className="p-2 text-center text-[11px] font-urdu text-slate-700">
                            {row.signature || "منظور"}
                          </td>
                        </tr>
                      ))}

                      {/* Empty padding rows for authentic ledger look */}
                      {Array.from({ length: Math.max(0, 8 - calculations.incomeWithRunning.length) }).map(
                        (_, i) => (
                          <tr key={`empty-inc-${i}`} className="h-8">
                            <td className="border-l border-slate-300"></td>
                            <td className="border-l border-slate-300"></td>
                            <td className="border-l border-slate-300"></td>
                            <td className="border-l border-slate-300"></td>
                            <td className="border-l border-slate-300"></td>
                            <td></td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                {/* BOTTOM FOOTER OF RIGHT TABLE AS PER PHOTO 1 */}
                <div className="border-t-2 border-slate-800 bg-[#fef2f2] p-2.5 text-xs space-y-1.5 font-urdu">
                  <div className="flex items-center justify-between border-b border-dashed border-slate-400 pb-1">
                    <span className="font-bold text-slate-800">
                      روان ماہ میں بنک سے نکلوائی گئی رقم:
                    </span>
                    <span className="font-bold font-mono text-slate-900">
                      Rs. {formatPKR(calculations.totalBankWithdrawn)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-dashed border-slate-400 pb-1">
                    <span className="font-bold text-slate-800">
                      روان ماہ میں بنک کھاتے کا اختتامی میزان:
                    </span>
                    <span className="font-bold font-mono text-blue-700">
                      Rs. {formatPKR(calculations.bankBalance)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="font-black text-rose-800">کل آمدن:</span>
                    <span className="font-black font-mono text-sm text-emerald-800">
                      Rs. {formatPKR(calculations.totalIncome)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* LEFT TABLE: اخراجات (Expenditures / Payments) */}
              {/* ========================================================= */}
              <div className="border-2 border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between h-full bg-white">
                <div>
                  <div className="bg-[#fee2e2] border-b-2 border-slate-800 p-2 text-center">
                    <h3 className="text-base font-black text-rose-900 tracking-wider font-urdu">
                      اخراجات
                    </h3>
                  </div>

                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-800 font-bold text-slate-900 text-[10.5px]">
                        <th className="p-1.5 border-l border-slate-400 w-8 text-center">نمبرشمار</th>
                        <th className="p-1.5 border-l border-slate-400 w-20 text-center">تاریخ</th>
                        <th className="p-1.5 border-l border-slate-400 w-16 text-center">رسید نمبر</th>
                        <th className="p-1.5 border-l border-slate-400">تفصیل اخراجات</th>
                        <th className="p-1.5 border-l border-slate-400 w-20 text-center">
                          چیک سے نکالی رقم
                        </th>
                        <th className="p-1.5 border-l border-slate-400 w-20 text-center">ادائیگی</th>
                        <th className="p-1.5 border-l border-slate-400 w-18 text-center">میزان</th>
                        <th className="p-1.5 border-l border-slate-400 w-24 text-center text-[9.5px]">
                          منظوری حوالہ و صفحہ
                        </th>
                        <th className="p-1.5 w-20 text-center text-[10px]">دستخط</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {calculations.expensesWithRunning.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50 transition group">
                          <td className="p-1.5 border-l border-slate-300 text-center font-bold">
                            {row.sr_no}
                          </td>
                          <td className="p-1.5 border-l border-slate-300 text-center font-mono whitespace-nowrap text-[10.5px]">
                            {row.date}
                          </td>
                          <td className="p-1.5 border-l border-slate-300 text-center font-mono text-slate-600 text-[10.5px]">
                            {row.receipt_no}
                          </td>
                          <td className="p-1.5 border-l border-slate-300">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-800">{row.description}</span>
                              <button
                                onClick={() => handleDeleteExpense(row.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-rose-500 hover:text-rose-700 transition print:hidden"
                                title="حذف کریں"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="p-1.5 border-l border-slate-300 text-center font-mono text-slate-700">
                            {row.bank_withdrawn > 0 ? formatPKR(row.bank_withdrawn) : "-"}
                          </td>
                          <td className="p-1.5 border-l border-slate-300 text-center font-bold font-mono text-rose-700">
                            {formatPKR(row.payment)}
                          </td>
                          <td className="p-1.5 border-l border-slate-300 text-center font-bold font-mono text-slate-900">
                            {formatPKR(row.running_total)}
                          </td>
                          <td className="p-1.5 border-l border-slate-300 text-center text-[10px] text-slate-600 truncate max-w-[90px]">
                            {row.approval_ref}
                          </td>
                          <td className="p-1.5 text-center text-[10.5px] font-urdu text-slate-700">
                            {row.signature || "منظور"}
                          </td>
                        </tr>
                      ))}

                      {/* Empty padding rows for authentic ledger look */}
                      {Array.from({ length: Math.max(0, 8 - calculations.expensesWithRunning.length) }).map(
                        (_, i) => (
                          <tr key={`empty-exp-${i}`} className="h-8">
                            <td className="border-l border-slate-300"></td>
                            <td className="border-l border-slate-300"></td>
                            <td className="border-l border-slate-300"></td>
                            <td className="border-l border-slate-300"></td>
                            <td className="border-l border-slate-300"></td>
                            <td className="border-l border-slate-300"></td>
                            <td className="border-l border-slate-300"></td>
                            <td className="border-l border-slate-300"></td>
                            <td></td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                {/* BOTTOM FOOTER OF LEFT TABLE AS PER PHOTO 1 */}
                <div className="border-t-2 border-slate-800 bg-[#fef2f2] p-2.5 text-xs space-y-1.5 font-urdu">
                  <div className="flex items-center justify-between border-b border-dashed border-slate-400 pb-1">
                    <span className="font-bold text-slate-800">سابقہ بقایا:</span>
                    <span className="font-bold font-mono text-slate-900">
                      Rs. {formatPKR(settings.previous_balance)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-dashed border-slate-400 pb-1">
                    <span className="font-bold text-slate-800">
                      روان ماہ میں بنک سے نکلوائی گئی رقم:
                    </span>
                    <span className="font-bold font-mono text-slate-900">
                      Rs. {formatPKR(calculations.totalBankWithdrawn)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-dashed border-slate-400 pb-1">
                    <span className="font-bold text-slate-800">روان ماہ کے کل اخراجات:</span>
                    <span className="font-bold font-mono text-rose-700">
                      Rs. {formatPKR(calculations.totalPayments)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="font-black text-rose-800">
                      روان ماہ کے آخر میں موجود نقد رقم:
                    </span>
                    <span className="font-black font-mono text-sm text-amber-800">
                      Rs. {formatPKR(calculations.cashInHand)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM AUTHENTICATION & SIGNATURE ROW AS PER PHOTO 1 */}
            <div className="pt-4 border-t-2 border-slate-800 grid grid-cols-2 gap-8 text-xs font-urdu text-center">
              <div>
                <p className="font-bold text-slate-800 mb-8">
                  دستخط انچارج / کوآرڈینیٹر سکول کونسل فنڈ
                </p>
                <div className="w-48 mx-auto border-b border-slate-800"></div>
              </div>
              <div>
                <p className="font-bold text-slate-800 mb-8">
                  دستخط ہیڈ ماسٹر / چیئرپرسن سکول کونسل مع مہر
                </p>
                <div className="w-48 mx-auto border-b border-slate-800"></div>
              </div>
            </div>

            {/* FOOTER PUBLISHER CREDIT NOTE AS IN PHOTO 1 */}
            <div className="text-[10px] text-slate-400 text-center font-urdu pt-2 border-t border-slate-200">
              صاحب پبلشرز نزد کچہری، فرید گیٹ، بہاولپور • NSB رجسٹر فارم نمبر 8 برائے پنجاب ایجوکیشن فاؤنڈیشن و سکول ایجوکیشن ڈیپارٹمنٹ
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 5. MODAL: ADD INCOME (آمدن درج کریں) */}
      {/* ========================================================================= */}
      {isIncomeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in" dir="rtl">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-200" />
                <h3 className="text-sm font-black font-urdu">نیا اندراج آمدن (Receipt)</h3>
              </div>
              <button
                onClick={() => setIsIncomeModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddIncome} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">تاریخ (DD-MM-YYYY):</label>
                <input
                  type="text"
                  value={incomeForm.date}
                  onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-left"
                  dir="ltr"
                  placeholder="DD-MM-YYYY"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تفصیل آمدن (Description):</label>
                <textarea
                  value={incomeForm.description}
                  onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none h-20"
                  placeholder="مثلاً: NSB قسط اول موصول بذریعہ چیک نمبر..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم (PKR):</label>
                  <input
                    type="number"
                    value={incomeForm.amount}
                    onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold font-mono text-left"
                    dir="ltr"
                    placeholder="25000"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ادائیگی موڈ:</label>
                  <select
                    value={incomeForm.payment_mode}
                    onChange={(e) => setIncomeForm({ ...incomeForm, payment_mode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="چیک">چیک (Cheque)</option>
                    <option value="بینک ٹرانسفر">بینک ٹرانسفر (Online)</option>
                    <option value="نقد">نقد (Cash)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">دستخط / منظوری:</label>
                <input
                  type="text"
                  value={incomeForm.signature}
                  onChange={(e) => setIncomeForm({ ...incomeForm, signature: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="منظور / تصدیق شدہ"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsIncomeModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  منسوخ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>محفوظ کریں</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: ADD EXPENSE (خرچ درج کریں) */}
      {/* ========================================================================= */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in" dir="rtl">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-200" />
                <h3 className="text-sm font-black font-urdu">نیا اندراج خرچ (Payment Voucher)</h3>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاریخ (DD-MM-YYYY):</label>
                  <input
                    type="text"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono text-left"
                    dir="ltr"
                    placeholder="DD-MM-YYYY"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">رسید نمبر (Voucher):</label>
                  <input
                    type="text"
                    value={expenseForm.receipt_no}
                    onChange={(e) => setExpenseForm({ ...expenseForm, receipt_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono text-left"
                    dir="ltr"
                    placeholder={`R-${expenseRecords.length + 101}`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تفصیل اخراجات (Details):</label>
                <textarea
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none h-18"
                  placeholder="مثلاً: سٹیشنری برائے امتحانات، مرمت بجلی سامان..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    چیک سے نکالی رقم (Withdrawn):
                  </label>
                  <input
                    type="number"
                    value={expenseForm.bank_withdrawn}
                    onChange={(e) => setExpenseForm({ ...expenseForm, bank_withdrawn: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold font-mono text-left"
                    dir="ltr"
                    placeholder="15000"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ادائیگی / خرچ (Payment):
                  </label>
                  <input
                    type="number"
                    value={expenseForm.payment}
                    onChange={(e) => setExpenseForm({ ...expenseForm, payment: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold font-mono text-left text-rose-700"
                    dir="ltr"
                    placeholder="14500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  سکول کونسل کی منظوری حوالہ و صفحہ نمبر:
                </label>
                <input
                  type="text"
                  value={expenseForm.approval_ref}
                  onChange={(e) => setExpenseForm({ ...expenseForm, approval_ref: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="قرارداد نمبر 16، صفحہ نمبر 24"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  منسوخ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 font-bold text-white shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>محفوظ کریں</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: REGISTER SETTINGS (رجسٹر سیٹنگز) */}
      {/* ========================================================================= */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in" dir="rtl">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-yellow-400" />
                <h3 className="text-sm font-black font-urdu">کیش بک رجسٹر سیٹنگز (Form 8 Header)</h3>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">سکول کا نام:</label>
                <input
                  type="text"
                  value={settings.school_name}
                  onChange={(e) => setSettings({ ...settings, school_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ایمس کوڈ (8 ہندسے):</label>
                  <input
                    type="text"
                    maxLength={8}
                    value={settings.emis}
                    onChange={(e) => setSettings({ ...settings, emis: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono text-left"
                    dir="ltr"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">تحصیل:</label>
                  <input
                    type="text"
                    value={settings.tehsil}
                    onChange={(e) => setSettings({ ...settings, tehsil: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ضلع:</label>
                  <input
                    type="text"
                    value={settings.zila}
                    onChange={(e) => setSettings({ ...settings, zila: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">بنک کا نام و پتہ:</label>
                <input
                  type="text"
                  value={settings.bank_name}
                  onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">سکول کونسل بنک اکاؤنٹ نمبر:</label>
                  <input
                    type="text"
                    value={settings.account_no}
                    onChange={(e) => setSettings({ ...settings, account_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono text-left"
                    dir="ltr"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">سابقہ بقایا (Previous Balance):</label>
                  <input
                    type="number"
                    value={settings.previous_balance}
                    onChange={(e) =>
                      setSettings({ ...settings, previous_balance: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 font-bold font-mono text-left"
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  منسوخ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 font-bold text-white shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>سیٹنگز محفوظ کریں</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
