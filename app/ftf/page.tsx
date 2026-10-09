"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { resolveActiveSchoolContext } from "@/lib/school-context";
import { getTodayPKDate } from "@/lib/date-utils";
import {
  FTF_STANDARD_CLASSES,
  URDU_MONTHS,
  matchStudentToFTFClass,
  formatPKR,
} from "@/lib/govt-registers";
import {
  ArrowLeft,
  Printer,
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit3,
  Settings,
  Save,
  CheckCircle,
  AlertCircle,
  Calendar,
  Building,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Layers,
  Coins,
  RefreshCw,
  X,
  UserCheck,
} from "lucide-react";

interface FTFSettings {
  page_no: string;
  markaz: string;
  tehsil: string;
  zila: string;
  school_name: string;
  babat_maah: string;
  previous_balance: number;
  cash_in_hand: number;
  bank_balance: number;
}

interface FTFClassItem {
  sr: number;
  urduName: string;
  studentCount: number;
  feePerStudent: number;
  totalCollected: number;
  teacherSig: string;
  receiverSig: string;
}

interface FTFExpenseItem {
  id: string;
  date: string;
  tafseel: string;
  raqam: number;
}

const DEFAULT_SETTINGS: FTFSettings = {
  page_no: "57",
  markaz: "سلانوالی",
  tehsil: "سلانوالی",
  zila: "سرگودھا",
  school_name: "گورنمنٹ ہائی سکول سلانوالی",
  babat_maah: "اکتوبر 2026",
  previous_balance: 14500,
  cash_in_hand: 5200,
  bank_balance: 18500,
};

const DEFAULT_SAMPLE_EXPENSES: FTFExpenseItem[] = [
  { id: "ftf-exp-1", date: "05-10-2026", tafseel: "خریداری چاک، ڈسٹر اور حاضری رجسٹر", raqam: 1800 },
  { id: "ftf-exp-2", date: "12-10-2026", tafseel: "مرمت فرنیچر ڈیسک و بینچز", raqam: 3500 },
  { id: "ftf-exp-3", date: "18-10-2026", tafseel: "روشنی و پنکھوں کی مرمت، بجلی سامان", raqam: 2200 },
];

export default function FTFRegisterPage() {
  const [loading, setLoading] = useState(true);
  const [schoolContext, setSchoolContext] = useState<any>(null);

  // Month & Year Filter
  const [selectedMonth, setSelectedMonth] = useState<string>("10"); // October
  const [selectedYear, setSelectedYear] = useState<string>("2026");

  // Settings, Classes & Expenses
  const [settings, setSettings] = useState<FTFSettings>(DEFAULT_SETTINGS);
  const [classRows, setClassRows] = useState<FTFClassItem[]>([]);
  const [expenses, setExpenses] = useState<FTFExpenseItem[]>([]);

  // Modals
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isFeeEditModalOpen, setIsFeeEditModalOpen] = useState(false);

  // Expense form
  const [expenseForm, setExpenseForm] = useState({
    date: getTodayPKDate(),
    tafseel: "",
    raqam: "",
  });

  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      const ctx = await resolveActiveSchoolContext();
      setSchoolContext(ctx);

      const storageKey = `oa_ftf_${ctx?.schoolId || "all"}_${selectedYear}_${selectedMonth}`;
      let loadedSettings = { ...DEFAULT_SETTINGS };
      if (ctx?.schoolName) {
        loadedSettings.school_name = ctx.schoolName;
      }

      // Initialize default 10 classes
      let initialClasses: FTFClassItem[] = FTF_STANDARD_CLASSES.map((c) => ({
        sr: c.sr,
        urduName: c.urduName,
        studentCount: 25, // default fallback
        feePerStudent: c.defaultFee,
        totalCollected: 25 * c.defaultFee,
        teacherSig: "✓",
        receiverSig: "✓",
      }));

      let loadedExpenses: FTFExpenseItem[] = [];

      // 1. Fetch Students from DB to calculate real student counts per class
      try {
        let stuQuery = supabase.from("students").select("class, school_id");
        if (ctx?.schoolId) stuQuery = stuQuery.eq("school_id", ctx.schoolId);
        const { data: studentsData } = await stuQuery;

        if (studentsData && studentsData.length > 0) {
          const countMap: Record<string, number> = {};
          studentsData.forEach((s: any) => {
            const matched = matchStudentToFTFClass(s.class);
            if (matched) {
              countMap[matched] = (countMap[matched] || 0) + 1;
            }
          });

          // Apply counts if found
          initialClasses = initialClasses.map((item) => {
            const cCount = countMap[item.urduName] ?? item.studentCount;
            return {
              ...item,
              studentCount: cCount,
              totalCollected: cCount * item.feePerStudent,
            };
          });
        }
      } catch (err) {
        console.warn("Students count fetch note:", err);
      }

      // 2. Fetch custom settings and expenses from Supabase
      try {
        let setQuery = supabase
          .from("ftf_settings")
          .select("*")
          .eq("month", selectedMonth)
          .eq("year", selectedYear);
        if (ctx?.schoolId) setQuery = setQuery.eq("school_id", ctx.schoolId);
        const { data: setRes } = await setQuery.maybeSingle();

        if (setRes) {
          loadedSettings = {
            page_no: setRes.page_no || loadedSettings.page_no,
            markaz: setRes.markaz || loadedSettings.markaz,
            tehsil: setRes.tehsil || loadedSettings.tehsil,
            zila: setRes.zila || loadedSettings.zila,
            school_name: setRes.school_name || loadedSettings.school_name,
            babat_maah: setRes.babat_maah || loadedSettings.babat_maah,
            previous_balance: Number(setRes.previous_balance || 0),
            cash_in_hand: Number(setRes.cash_in_hand || 0),
            bank_balance: Number(setRes.bank_balance || 0),
          };
        }

        // Fetch custom fee structures
        let feeQuery = supabase.from("ftf_fee_structure").select("*");
        if (ctx?.schoolId) feeQuery = feeQuery.eq("school_id", ctx.schoolId);
        const { data: feeRes } = await feeQuery;
        if (feeRes && feeRes.length > 0) {
          const feeMap: Record<string, number> = {};
          feeRes.forEach((f: any) => {
            feeMap[f.class_name] = Number(f.fee_amount || 20);
          });
          initialClasses = initialClasses.map((item) => {
            const rate = feeMap[item.urduName] ?? item.feePerStudent;
            return {
              ...item,
              feePerStudent: rate,
              totalCollected: item.studentCount * rate,
            };
          });
        }

        // Fetch FTF expenses
        let expQuery = supabase
          .from("ftf_expenses")
          .select("*")
          .eq("month", selectedMonth)
          .eq("year", selectedYear)
          .order("id", { ascending: true });
        if (ctx?.schoolId) expQuery = expQuery.eq("school_id", ctx.schoolId);
        const { data: expRes } = await expQuery;
        if (expRes && expRes.length > 0) {
          loadedExpenses = expRes.map((r: any) => ({
            id: String(r.id),
            date: r.date,
            tafseel: r.tafseel,
            raqam: Number(r.raqam || 0),
          }));
        }
      } catch (err) {}

      // 3. Fallback to localStorage
      if (typeof window !== "undefined") {
        const local = localStorage.getItem(storageKey);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (parsed.settings) loadedSettings = parsed.settings;
            if (parsed.classes && parsed.classes.length > 0) initialClasses = parsed.classes;
            if (parsed.expenses && loadedExpenses.length === 0) loadedExpenses = parsed.expenses;
          } catch (e) {}
        }
      }

      if (loadedExpenses.length === 0) {
        loadedExpenses = DEFAULT_SAMPLE_EXPENSES;
      }

      setSettings(loadedSettings);
      setClassRows(initialClasses);
      setExpenses(loadedExpenses);
    } catch (err) {
      console.error(err);
      showToast("error", "فروغ تعلیم فنڈ ڈیٹا لوڈ کرنے میں خرابی");
    } finally {
      setLoading(false);
    }
  };

  const syncToLocalStorage = (
    newSettings = settings,
    newClasses = classRows,
    newExpenses = expenses
  ) => {
    if (typeof window !== "undefined") {
      const storageKey = `oa_ftf_${schoolContext?.schoolId || "all"}_${selectedYear}_${selectedMonth}`;
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          settings: newSettings,
          classes: newClasses,
          expenses: newExpenses,
        })
      );
    }
  };

  // Math Calculations for FTF Ledger
  const ftfMath = useMemo(() => {
    const totalStudents = classRows.reduce((sum, c) => sum + c.studentCount, 0);
    const totalCurrentMonthCollection = classRows.reduce((sum, c) => sum + c.totalCollected, 0);

    // Total expenses this month (خرچ مطلوبہ)
    const totalExpenses = expenses.reduce((sum, e) => sum + e.raqam, 0);

    // میزان = سابقہ بقایا + آمدہ ماہ حال
    const meezanKull = settings.previous_balance + totalCurrentMonthCollection;

    // بقایا = میزان - خرچ مطلوبہ
    const netRemaining = meezanKull - totalExpenses;

    // In-hand and Bank balance breakdown
    const cashInHand = settings.cash_in_hand || Math.round(netRemaining * 0.25);
    const inBank = netRemaining - cashInHand;

    return {
      totalStudents,
      totalCurrentMonthCollection,
      totalExpenses,
      meezanKull,
      netRemaining,
      cashInHand,
      inBank,
    };
  }, [classRows, expenses, settings]);

  // Update a single class row
  const handleUpdateClass = (
    sr: number,
    field: "studentCount" | "feePerStudent",
    value: number
  ) => {
    const updated = classRows.map((item) => {
      if (item.sr === sr) {
        const studentCount = field === "studentCount" ? value : item.studentCount;
        const feePerStudent = field === "feePerStudent" ? value : item.feePerStudent;
        return {
          ...item,
          studentCount,
          feePerStudent,
          totalCollected: studentCount * feePerStudent,
        };
      }
      return item;
    });
    setClassRows(updated);
    syncToLocalStorage(settings, updated, expenses);
  };

  // Add FTF Expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.tafseel || !expenseForm.raqam) {
      showToast("error", "براہ کرم تفصیل اور رقم درج کریں");
      return;
    }

    const newExp: FTFExpenseItem = {
      id: "ftf-exp-" + Date.now(),
      date: expenseForm.date || getTodayPKDate(),
      tafseel: expenseForm.tafseel,
      raqam: parseFloat(expenseForm.raqam) || 0,
    };

    const updated = [...expenses, newExp];
    setExpenses(updated);
    syncToLocalStorage(settings, classRows, updated);

    try {
      await supabase.from("ftf_expenses").insert({
        school_id: schoolContext?.schoolId || null,
        month: selectedMonth,
        year: selectedYear,
        date: newExp.date,
        tafseel: newExp.tafseel,
        raqam: newExp.raqam,
      });
    } catch (e) {}

    setIsExpenseModalOpen(false);
    setExpenseForm({ date: getTodayPKDate(), tafseel: "", raqam: "" });
    showToast("success", "خرچ کامیابی سے رجسٹر میں شامل کر لیا گیا");
  };

  // Delete Expense
  const handleDeleteExpense = (id: string) => {
    if (!confirm("کیا آپ واقعی یہ خرچ حذف کرنا چاہتے ہیں؟")) return;
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    syncToLocalStorage(settings, classRows, updated);
    showToast("success", "خرچ حذف کر دیا گیا");
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    syncToLocalStorage(settings, classRows, expenses);

    try {
      await supabase.from("ftf_settings").upsert({
        school_id: schoolContext?.schoolId || null,
        month: selectedMonth,
        year: selectedYear,
        page_no: settings.page_no,
        markaz: settings.markaz,
        tehsil: settings.tehsil,
        zila: settings.zila,
        school_name: settings.school_name,
        babat_maah: settings.babat_maah,
        previous_balance: settings.previous_balance,
        cash_in_hand: settings.cash_in_hand,
        bank_balance: settings.bank_balance,
      });
    } catch (e) {}

    setIsSettingsModalOpen(false);
    showToast("success", "سیٹنگز محفوظ ہو گئیں");
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Export CSV
  const handleExportCSV = () => {
    let csv = "\uFEFF";
    csv += `فروغ تعلیم فنڈ گورنمنٹ - ${settings.school_name}\n`;
    csv += `مرکز: ${settings.markaz}, تحصیل: ${settings.tehsil}, ضلع: ${settings.zila}, بابت ماہ: ${settings.babat_maah}\n\n`;

    csv += "نمبر شمار,نام جماعت,تعداد طلباء,رقم جماعت وار,میزان کل\n";
    classRows.forEach((c) => {
      csv += `"${c.sr}","${c.urduName}","${c.studentCount}","${c.feePerStudent}","${c.totalCollected}"\n`;
    });
    csv += `,"میزان",${ftfMath.totalStudents},,${ftfMath.totalCurrentMonthCollection}\n\n`;

    csv += "--- خلاصہ حسابات ---\n";
    csv += `سابقہ بقایا,${settings.previous_balance}\n`;
    csv += `آمدہ ماہ حال,${ftfMath.totalCurrentMonthCollection}\n`;
    csv += `میزان,${ftfMath.meezanKull}\n`;
    csv += `خرچ مطلوبہ,${ftfMath.totalExpenses}\n`;
    csv += `بقایا,${ftfMath.netRemaining}\n`;
    csv += `بدست (نقد),${ftfMath.cashInHand}\n`;
    csv += `در بینک,${ftfMath.inBank}\n\n`;

    csv += "--- تفصیل اخراجات ---\n";
    csv += "نمبر,تاریخ,تفصیل خرچ,رقم\n";
    expenses.forEach((e, idx) => {
      csv += `"${idx + 1}","${e.date}","${e.tafseel.replace(/"/g, '""')}","${e.raqam}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `FTF_Register_${selectedYear}_${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("success", "ایکسل فائل کامیابی سے ڈاؤنلوڈ ہو گئی");
  };

  // Urdu Month Name
  const currentMonthName = useMemo(() => {
    const m = URDU_MONTHS.find((item) => item.key === selectedMonth);
    return m ? m.name : "ماہ حال";
  }, [selectedMonth]);

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
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                  FTF Register • فروغ تعلیم فنڈ
                </span>
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 font-urdu">
                  <span>رجسٹر فروغِ تعلیم فنڈ (گورنمنٹ)</span>
                </h1>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate max-w-md">
                {settings.school_name} • بابت ماہ: {settings.babat_maah || `${currentMonthName} ${selectedYear}`}
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 md:pb-0 scrollbar-none justify-end">
            {/* Month & Year */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1" />
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  const mName = URDU_MONTHS.find((m) => m.key === e.target.value)?.name || "";
                  setSettings((prev) => ({ ...prev, babat_maah: `${mName} ${selectedYear}` }));
                }}
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
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setSettings((prev) => ({ ...prev, babat_maah: `${currentMonthName} ${e.target.value}` }));
                }}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>

            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>FTF خرچ درج کریں</span>
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
              title="ایکسل فائل ڈاؤنلوڈ"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-yellow-400" />
              <span>پرنٹ رجسٹر (A4)</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6 print:p-0 print:max-w-none">
        {/* Toast Alert */}
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

        {/* 3. FOUR SUMMARY METRICS (Screen Only) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:hidden">
          <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-urdu">
                آمدہ ماہ حال (کل وصولی)
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">
                Rs. {formatPKR(ftfMath.totalCurrentMonthCollection)}
              </h3>
              <p className="text-[10px] text-emerald-700/80 mt-1 font-medium">
                {ftfMath.totalStudents} کل طلباء (جماعت 1 تا 10)
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-urdu">
                سابقہ بقایا (Carry Forward)
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-blue-600 mt-0.5">
                Rs. {formatPKR(settings.previous_balance)}
              </h3>
              <p className="text-[10px] text-blue-700/80 mt-1 font-medium">
                گذشتہ ماہ کا بقایا بیلنس
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-rose-100 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-urdu">
                خرچ مطلوبہ (FTF اخراجات)
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-rose-600 mt-0.5">
                Rs. {formatPKR(ftfMath.totalExpenses)}
              </h3>
              <p className="text-[10px] text-rose-700/80 mt-1 font-medium">
                {expenses.length} بل و رسیدات اخراجات
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-urdu">
                خالص بقایا (Net Balance)
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-amber-700 mt-0.5">
                Rs. {formatPKR(ftfMath.netRemaining)}
              </h3>
              <p className="text-[10px] text-amber-800/80 mt-1 font-medium">
                بدست Rs. {formatPKR(ftfMath.cashInHand)} • بینک Rs. {formatPKR(ftfMath.inBank)}
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 4. EXACT GOVT REGISTER REPLICA CONTAINER (MATCHING PHOTO 2) */}
        <div className="bg-white rounded-3xl border-2 border-slate-900 shadow-lg p-4 sm:p-8 print:border-none print:shadow-none print:p-0 overflow-x-auto">
          <div className="min-w-[900px] print:min-w-0 flex flex-col gap-4" dir="rtl">
            {/* REGISTER HEADER AS PER PHOTO 2 */}
            <div className="text-center relative pb-3 border-b-2 border-slate-900">
              {/* Circle Page No (as in photo 2: 57 / 58) */}
              <div className="absolute top-0 right-2 w-9 h-9 rounded-full border-2 border-slate-800 text-slate-900 font-bold flex items-center justify-center text-sm font-mono">
                {settings.page_no || "57"}
              </div>

              {/* Title: فروغ تعلیم فنڈ گورنمنٹ ... */}
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-urdu tracking-wide">
                فروغِ تعلیم فنڈ <span className="text-2xl font-bold">گورنمنٹ {settings.school_name}</span>
              </h2>

              {/* Meta Fields: مرکز: تحصیل: ضلع: بابت ماہ: */}
              <div className="grid grid-cols-4 gap-4 text-sm font-urdu font-bold text-slate-900 pt-3 max-w-4xl mx-auto">
                <div className="flex items-center gap-1.5">
                  <span className="shrink-0">مرکز:</span>
                  <span className="border-b border-dotted border-slate-800 flex-1 pb-0.5 font-bold">
                    {settings.markaz}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="shrink-0">تحصیل:</span>
                  <span className="border-b border-dotted border-slate-800 flex-1 pb-0.5 font-bold">
                    {settings.tehsil}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="shrink-0">ضلع:</span>
                  <span className="border-b border-dotted border-slate-800 flex-1 pb-0.5 font-bold">
                    {settings.zila}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="shrink-0">بابت ماہ:</span>
                  <span className="border-b border-dotted border-slate-800 flex-1 pb-0.5 font-bold">
                    {settings.babat_maah}
                  </span>
                </div>
              </div>
            </div>

            {/* MAIN REGISTER TABLE AS PER PHOTO 2 */}
            <div className="border-2 border-slate-900 rounded-none overflow-hidden bg-white">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-900 font-bold text-slate-900 text-center font-urdu">
                    <th className="p-2 border-l border-slate-900 w-10">نمبر شمار</th>
                    <th className="p-2 border-l border-slate-900 w-16">نام جماعت</th>
                    <th className="p-2 border-l border-slate-900 w-20">تعداد طلباء</th>
                    <th className="p-2 border-l border-slate-900 w-24">رقم جماعت وار</th>
                    <th className="p-2 border-l border-slate-900 w-20 text-[11px]">دستخط ٹیچر انچارج</th>
                    <th className="p-2 border-l border-slate-900 w-20 text-[11px]">دستخط وصول کنندہ</th>
                    <th className="p-2 border-l border-slate-900 w-44">تفصیل خرچ</th>
                    <th className="p-2 border-l border-slate-900 w-20">میزان کل</th>
                    <th className="p-2 border-l border-slate-900 w-20">بیلنس</th>
                    <th className="p-2 w-20">بقایا</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-900">
                  {classRows.map((row, index) => {
                    // Match summary row items on the left side (Photo 2 rows)
                    let summaryLabel = "";
                    let summaryVal = "";

                    if (index === 0) {
                      summaryLabel = "سابقہ بقایا";
                      summaryVal = formatPKR(settings.previous_balance);
                    } else if (index === 1) {
                      summaryLabel = "آمدہ ماہ حال";
                      summaryVal = formatPKR(ftfMath.totalCurrentMonthCollection);
                    } else if (index === 2) {
                      summaryLabel = "میزان";
                      summaryVal = formatPKR(ftfMath.meezanKull);
                    } else if (index === 3) {
                      summaryLabel = "خرچ مطلوبہ";
                      summaryVal = formatPKR(ftfMath.totalExpenses);
                    } else if (index === 4) {
                      summaryLabel = "بقایا";
                      summaryVal = formatPKR(ftfMath.netRemaining);
                    } else if (index === 5) {
                      summaryLabel = "بدست";
                      summaryVal = formatPKR(ftfMath.cashInHand);
                    } else if (index === 6) {
                      summaryLabel = "در بینک";
                      summaryVal = formatPKR(ftfMath.inBank);
                    }

                    return (
                      <tr key={row.sr} className="h-8 border-b border-slate-900">
                        {/* 1. نمبر شمار */}
                        <td className="p-1 border-l border-slate-900 text-center font-bold">
                          {row.sr}
                        </td>

                        {/* 2. نام جماعت */}
                        <td className="p-1 border-l border-slate-900 text-center font-urdu font-black text-sm">
                          {row.urduName}
                        </td>

                        {/* 3. تعداد طلباء */}
                        <td className="p-1 border-l border-slate-900 text-center font-bold font-mono">
                          <input
                            type="number"
                            value={row.studentCount}
                            onChange={(e) =>
                              handleUpdateClass(row.sr, "studentCount", parseInt(e.target.value) || 0)
                            }
                            className="w-14 text-center font-bold font-mono bg-transparent hover:bg-slate-100 focus:bg-white focus:outline-none rounded print:border-none print:w-auto"
                          />
                        </td>

                        {/* 4. رقم جماعت وار */}
                        <td className="p-1 border-l border-slate-900 text-center font-bold font-mono text-emerald-800">
                          {formatPKR(row.totalCollected)}
                          <span className="text-[10px] text-slate-400 block font-normal print:hidden">
                            @{row.feePerStudent}/-
                          </span>
                        </td>

                        {/* 5. دستخط ٹیچر انچارج */}
                        <td className="p-1 border-l border-slate-900 text-center font-urdu text-slate-700">
                          {row.teacherSig || "✓"}
                        </td>

                        {/* 6. دستخط وصول کنندہ */}
                        <td className="p-1 border-l border-slate-900 text-center font-urdu text-slate-700">
                          {row.receiverSig || "✓"}
                        </td>

                        {/* 7. تفصیل خرچ (Fixed summary labels inside photo 2) */}
                        <td className="p-1 border-l border-slate-900 font-urdu font-bold text-slate-900 px-2">
                          {summaryLabel ? (
                            <span className="text-xs">{summaryLabel}</span>
                          ) : expenses[index - 7] ? (
                            <span className="text-[11px] font-normal truncate block max-w-[150px]">
                              {expenses[index - 7].tafseel}
                            </span>
                          ) : (
                            ""
                          )}
                        </td>

                        {/* 8. میزان کل */}
                        <td className="p-1 border-l border-slate-900 text-center font-mono font-bold">
                          {summaryVal && (index === 0 || index === 1 || index === 2)
                            ? summaryVal
                            : ""}
                        </td>

                        {/* 9. بیلنس */}
                        <td className="p-1 border-l border-slate-900 text-center font-mono font-bold">
                          {summaryVal && index === 3 ? summaryVal : ""}
                        </td>

                        {/* 10. بقایا */}
                        <td className="p-1 text-center font-mono font-bold text-amber-900">
                          {summaryVal && (index === 4 || index === 5 || index === 6)
                            ? summaryVal
                            : ""}
                        </td>
                      </tr>
                    );
                  })}

                  {/* BOTTOM ROW: میزان (TOTALS) AS PER PHOTO 2 */}
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-900 h-9 font-urdu">
                    <td className="p-1 border-l border-slate-900 text-center"></td>
                    <td className="p-1 border-l border-slate-900 text-center font-black text-sm">
                      میزان
                    </td>
                    <td className="p-1 border-l border-slate-900 text-center font-mono font-black text-sm">
                      {ftfMath.totalStudents}
                    </td>
                    <td className="p-1 border-l border-slate-900 text-center font-mono font-black text-sm text-emerald-800">
                      {formatPKR(ftfMath.totalCurrentMonthCollection)}
                    </td>
                    <td className="p-1 border-l border-slate-900 text-center">✓</td>
                    <td className="p-1 border-l border-slate-900 text-center">✓</td>
                    <td className="p-1 border-l border-slate-900 px-2 font-bold">
                      کل وصولی جمع سابقہ
                    </td>
                    <td className="p-1 border-l border-slate-900 text-center font-mono font-black">
                      {formatPKR(ftfMath.meezanKull)}
                    </td>
                    <td className="p-1 border-l border-slate-900 text-center font-mono font-black text-rose-800">
                      {formatPKR(ftfMath.totalExpenses)}
                    </td>
                    <td className="p-1 text-center font-mono font-black text-amber-900">
                      {formatPKR(ftfMath.netRemaining)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* EXPENSES DETAILS EXPANDED TABLE (Under register for easy viewing) */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3 print:hidden">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-urdu">
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                  <span>تفصیل FTF اخراجات (ماہِ رواں)</span>
                </h4>
                <button
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>خرچ شامل کریں</span>
                </button>
              </div>

              {expenses.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 text-center">اس ماہ کوئی خرچ درج نہیں ہے</p>
              ) : (
                <div className="space-y-1.5">
                  {expenses.map((exp, i) => (
                    <div
                      key={exp.id}
                      className="p-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs hover:border-slate-300 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-600">
                          {i + 1}
                        </span>
                        <span className="font-mono text-slate-500 text-[11px]">{exp.date}</span>
                        <span className="font-medium text-slate-800">{exp.tafseel}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold font-mono text-rose-700">
                          Rs. {formatPKR(exp.raqam)}
                        </span>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SIGNATURE FOOTER AS PER PHOTO 2 */}
            <div className="pt-6 grid grid-cols-2 gap-12 text-sm font-urdu font-bold text-slate-900">
              <div className="text-right">
                <p className="mb-8">دستخط پڑتال کنندہ: _______________________</p>
              </div>
              <div className="text-left">
                <p className="mb-8">دستخط ہیڈ ماسٹر مع مہر سکول: _______________________</p>
              </div>
            </div>

            {/* BOTTOM PRINTER IMPRINT AS IN PHOTO 2 */}
            <div className="text-[10px] text-slate-400 text-center font-urdu pt-2 border-t border-slate-300">
              ملنے کا پتہ: فریدز ڈائیو کمرشل سروسز، یوسف پلازہ، روڈ جھنگ صدر • رجسٹر فروغ تعلیم فنڈ (FTF)
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 5. MODAL: ADD FTF EXPENSE (خرچ درج کریں) */}
      {/* ========================================================================= */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in" dir="rtl">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-amber-200" />
                <h3 className="text-sm font-black font-urdu">نیا FTF خرچ درج کریں</h3>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">تاریخ (DD-MM-YYYY):</label>
                <input
                  type="text"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-left"
                  dir="ltr"
                  placeholder="DD-MM-YYYY"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تفصیل خرچ (Description):</label>
                <textarea
                  value={expenseForm.tafseel}
                  onChange={(e) => setExpenseForm({ ...expenseForm, tafseel: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none h-20"
                  placeholder="مثلاً: خریداری چاک، ڈسٹر، مرمت ڈیسک یا پلمبنگ سامان..."
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم خرچ (PKR):</label>
                <input
                  type="number"
                  value={expenseForm.raqam}
                  onChange={(e) => setExpenseForm({ ...expenseForm, raqam: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold font-mono text-left"
                  dir="ltr"
                  placeholder="2500"
                  required
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
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 font-bold text-white shadow-md cursor-pointer flex items-center gap-1.5"
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
      {/* 6. MODAL: REGISTER SETTINGS (رجسٹر سیٹنگز) */}
      {/* ========================================================================= */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in" dir="rtl">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-yellow-400" />
                <h3 className="text-sm font-black font-urdu">رجسٹر فروغِ تعلیم فنڈ سیٹنگز</h3>
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
                  <label className="block font-bold text-slate-700 mb-1">مرکز:</label>
                  <input
                    type="text"
                    value={settings.markaz}
                    onChange={(e) => setSettings({ ...settings, markaz: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">بابت ماہ:</label>
                  <input
                    type="text"
                    value={settings.babat_maah}
                    onChange={(e) => setSettings({ ...settings, babat_maah: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">صفحہ نمبر (دائرہ):</label>
                  <input
                    type="text"
                    value={settings.page_no}
                    onChange={(e) => setSettings({ ...settings, page_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono text-left"
                    dir="ltr"
                    placeholder="57"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">سابقہ بقایا:</label>
                  <input
                    type="number"
                    value={settings.previous_balance}
                    onChange={(e) =>
                      setSettings({ ...settings, previous_balance: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 font-bold font-mono text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">بدست (نقد):</label>
                  <input
                    type="number"
                    value={settings.cash_in_hand}
                    onChange={(e) =>
                      setSettings({ ...settings, cash_in_hand: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 font-bold font-mono text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">در بینک:</label>
                  <input
                    type="number"
                    value={settings.bank_balance}
                    onChange={(e) =>
                      setSettings({ ...settings, bank_balance: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 font-bold font-mono text-left"
                    dir="ltr"
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
