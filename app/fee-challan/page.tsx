"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveActiveSchoolContext } from "@/lib/school-context";
import { getTodayPKDate } from "@/lib/date-utils";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  ArrowLeft,
  Printer,
  Download,
  Search,
  Filter,
  Receipt,
  Building,
  Calendar,
  CheckCircle,
  AlertCircle,
  Scissors,
  DollarSign,
  User,
  CreditCard,
  RefreshCw,
} from "lucide-react";

interface Student {
  id: number | string;
  name: string;
  class: string;
  father_name?: string | null;
  phone?: string | null;
  monthly_fee?: number;
  school_id?: number | string;
  avatar_url?: string;
}

export default function FeeChallanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [schoolContext, setSchoolContext] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);

  // Filter & Selection
  const [selectedClass, setSelectedClass] = useState<string>("Play");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("all");
  const [billingMonth, setBillingMonth] = useState<string>("October 2026");
  const [issueDate, setIssueDate] = useState<string>(getTodayPKDate());
  const [dueDate, setDueDate] = useState<string>("10-10-2026");

  // Fee Details Customization
  const [lateFine, setLateFine] = useState<number>(100);
  const [discount, setDiscount] = useState<number>(0);
  const [bankName, setBankName] = useState<string>("Meezan Bank / HBL / Cash Counter");
  const [bankAccount, setBankAccount] = useState<string>("PK92MEZN00012345678901");

  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const challanPrintAreaRef = useRef<HTMLDivElement>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const ctx = await resolveActiveSchoolContext();
      setSchoolContext(ctx);

      let query = supabase.from("students").select("*").order("name", { ascending: true });
      if (ctx.schoolId && ctx.schoolId !== "all") {
        query = query.eq("school_id", ctx.schoolId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const studentList: Student[] = data || [];
      setStudents(studentList);

      if (studentList.length > 0) {
        const classes = Array.from(new Set(studentList.map((s) => s.class)));
        if (!classes.includes(selectedClass) && classes.length > 0) {
          setSelectedClass(classes[0]);
        }
      }
    } catch (err: any) {
      console.error(err);
      showToast("error", err.message || "Failed to load students.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const classOptions = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.class) set.add(s.class);
    });
    return Array.from(set).sort();
  }, [students]);

  // Filtered Students to Generate Challans For
  const studentsToPrint = useMemo(() => {
    const byClass = students.filter(
      (s) => s.class.toLowerCase().trim() === selectedClass.toLowerCase().trim()
    );
    if (selectedStudentId === "all") return byClass;
    return byClass.filter((s) => String(s.id) === String(selectedStudentId));
  }, [students, selectedClass, selectedStudentId]);

  // Print Handler
  const handlePrint = () => {
    if (studentsToPrint.length === 0) {
      showToast("error", "No students selected to print challan.");
      return;
    }
    window.print();
  };

  // Download PDF Handler
  const handleDownloadPDF = async () => {
    if (studentsToPrint.length === 0) {
      showToast("error", "No students selected.");
      return;
    }
    if (!challanPrintAreaRef.current) return;

    try {
      setDownloadingPdf(true);
      showToast("success", "Generating Fee Challan PDF...");

      const pages = challanPrintAreaRef.current.querySelectorAll<HTMLElement>(".a4-challan-page");
      const pdf = new jsPDF("l", "mm", "a4"); // Landscape A4 for 3 vertical copies side-by-side

      for (let i = 0; i < pages.length; i++) {
        const pageElem = pages[i];
        const canvas = await html2canvas(pageElem, {
          scale: 2.2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        if (i > 0) pdf.addPage("a4", "l");
        pdf.addImage(imgData, "JPEG", 0, 0, 297, 210);
      }

      pdf.save(`fee-challan-${selectedClass}-${billingMonth.replace(/\s+/g, "_")}.pdf`);
      showToast("success", "Fee Challans PDF downloaded successfully!");
    } catch (err: any) {
      console.error(err);
      showToast("error", "Failed to generate PDF. You can also use Print to Save as PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-16">
      {/* Print Styles for 3-Part Landscape A4 Fee Challan */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            color: black !important;
          }
          header,
          .no-print {
            display: none !important;
          }
          .a4-challan-page {
            width: 297mm !important;
            min-height: 210mm !important;
            height: 210mm !important;
            padding: 8mm 6mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box !important;
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 4mm !important;
          }
          .challan-copy {
            border: 1.5px solid #0f172a !important;
            box-shadow: none !important;
            height: 100% !important;
          }
        }
      `}</style>

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3 sm:px-6 py-3 shadow-xs no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>Dashboard</span>
            </Link>
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Fee Challan Generator
                </h1>
                <span className="text-[10px] text-slate-500 hidden sm:inline">
                  3 Copies per A4 (Bank, School, Parent)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPdf || studentsToPrint.length === 0}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className={`w-3.5 h-3.5 ${downloadingPdf ? "animate-bounce" : ""}`} />
              <span>{downloadingPdf ? "Exporting..." : "Download PDF"}</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={studentsToPrint.length === 0}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Challans ({studentsToPrint.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
        {/* Toast Alert */}
        {toast && (
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold animate-in fade-in no-print ${
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

        {/* Filter & Customization Controls (No-print) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4 no-print">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Class */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                {classOptions.map((c) => (
                  <option key={c} value={c}>
                    Class {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Student */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Student</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="all">All Students in Class ({studentsToPrint.length})</option>
                {students
                  .filter((s) => s.class.toLowerCase().trim() === selectedClass.toLowerCase().trim())
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Roll #{s.id})
                    </option>
                  ))}
              </select>
            </div>

            {/* Billing Month */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Billing Month</label>
              <input
                type="text"
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none"
              />
            </div>

            {/* Issue Date */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Issue Date</label>
              <input
                type="text"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none font-mono"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Due Date</label>
              <input
                type="text"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Bank Name / Cash</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Account No.</label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Late Fee Fine (Rs.)</label>
              <input
                type="number"
                value={lateFine}
                onChange={(e) => setLateFine(Number(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Concession / Discount (Rs.)</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* PRINTABLE A4 CHALLAN CONTAINER */}
        <div ref={challanPrintAreaRef} className="space-y-8">
          {studentsToPrint.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
              <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold">No students selected for Fee Challan.</p>
              <p className="text-xs mt-1">Select class or students from the filters above.</p>
            </div>
          ) : (
            studentsToPrint.map((student) => {
              const tuitionFee = student.monthly_fee || 2500;
              const totalBeforeDueDate = Math.max(0, tuitionFee - discount);
              const totalAfterDueDate = totalBeforeDueDate + lateFine;
              const schoolTitle = schoolContext?.schoolName || "OA SMART SCHOOL SYSTEM";
              const schoolAddr = schoolContext?.schoolAddress || "Main Campus, Education City, Sillanwali";
              const schoolPh = schoolContext?.schoolPhone || "+92 300 1234567";

              const copyTypes = [
                { title: "BANK COPY", badge: "bg-slate-900 text-white" },
                { title: "SCHOOL COPY", badge: "bg-emerald-700 text-white" },
                { title: "STUDENT / PARENT COPY", badge: "bg-indigo-700 text-white" },
              ];

              return (
                <div
                  key={student.id}
                  className="a4-challan-page bg-white mx-auto shadow-md border border-slate-300 rounded-2xl p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-[297mm] relative"
                  style={{ minHeight: "205mm", boxSizing: "border-box" }}
                >
                  {copyTypes.map((copy, copyIdx) => (
                    <div
                      key={copyIdx}
                      className={`challan-copy relative bg-white border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between text-xs ${
                        copyIdx < 2 ? "border-r-2 border-dashed lg:border-r-2" : ""
                      }`}
                    >
                      {/* Dotted Scissors Line Indicator (on screens) */}
                      {copyIdx < 2 && (
                        <div className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 flex-col items-center text-slate-400 z-10">
                          <Scissors className="w-3.5 h-3.5 rotate-90" />
                        </div>
                      )}

                      {/* Header Strip */}
                      <div>
                        <div className="text-center border-b border-slate-800 pb-2">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <div className="w-6 h-6 rounded-full bg-[#f1c40f] text-[#1e3a5f] font-black text-[10px] flex items-center justify-center">
                              OA
                            </div>
                            <h2 className="text-xs font-black uppercase text-slate-900 leading-tight truncate">
                              {schoolTitle}
                            </h2>
                          </div>
                          <p className="text-[9px] text-slate-500 leading-none truncate">{schoolAddr}</p>
                          <p className="text-[8px] text-slate-400 font-mono mt-0.5">Ph: {schoolPh}</p>

                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="font-mono text-[9px] font-bold text-slate-600">
                              Challan #{student.id}-{new Date().getFullYear()}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${copy.badge}`}>
                              {copy.title}
                            </span>
                          </div>
                        </div>

                        {/* Bank Details */}
                        <div className="bg-slate-50 p-1.5 rounded mt-2 border border-slate-200 text-[9px] leading-tight">
                          <p className="font-semibold text-slate-800 truncate">
                            Bank: <span className="font-normal">{bankName}</span>
                          </p>
                          <p className="font-mono text-slate-600 truncate">A/C: {bankAccount}</p>
                        </div>

                        {/* Student Info Box */}
                        <div className="mt-2 space-y-1 text-[10px] bg-slate-50/70 p-2 rounded border border-slate-200">
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-semibold">Student Name:</span>
                            <strong className="text-slate-900 truncate max-w-[140px]">{student.name}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-semibold">Father Name:</span>
                            <span className="text-slate-800 truncate max-w-[140px]">{student.father_name || "N/A"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-semibold">Class / Roll:</span>
                            <strong className="text-slate-800">{student.class} • #{student.id}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-semibold">Month:</span>
                            <strong className="text-emerald-700 font-bold">{billingMonth}</strong>
                          </div>
                          <div className="flex justify-between border-t border-slate-200 pt-1 text-[9px]">
                            <span>Issue: <strong>{issueDate}</strong></span>
                            <span>Due: <strong className="text-rose-600">{dueDate}</strong></span>
                          </div>
                        </div>

                        {/* Fee Particulars Table */}
                        <div className="mt-2 border border-slate-300 rounded overflow-hidden">
                          <table className="w-full text-left text-[9px]">
                            <thead>
                              <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                                <th className="p-1">Particulars</th>
                                <th className="p-1 text-right">Amount (Rs.)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              <tr>
                                <td className="p-1 font-medium text-slate-800">Monthly Tuition Fee</td>
                                <td className="p-1 text-right font-bold">{tuitionFee.toLocaleString()}</td>
                              </tr>
                              {discount > 0 && (
                                <tr>
                                  <td className="p-1 text-emerald-700">Fee Concession / Discount</td>
                                  <td className="p-1 text-right text-emerald-700 font-bold">-{discount}</td>
                                </tr>
                              )}
                              <tr className="bg-slate-50 font-bold">
                                <td className="p-1 text-slate-900">Total Within Due Date</td>
                                <td className="p-1 text-right text-slate-900 font-black">
                                  Rs. {totalBeforeDueDate.toLocaleString()}
                                </td>
                              </tr>
                              <tr>
                                <td className="p-1 text-rose-600 font-medium">Late Payment Surcharge</td>
                                <td className="p-1 text-right text-rose-600 font-bold">+{lateFine}</td>
                              </tr>
                              <tr className="bg-rose-50/50 font-black text-rose-700">
                                <td className="p-1">Total After Due Date</td>
                                <td className="p-1 text-right font-black">
                                  Rs. {totalAfterDueDate.toLocaleString()}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Payment Notes */}
                        <p className="text-[8px] text-slate-400 italic mt-1.5 leading-tight">
                          * Please deposit fee within due date. Late fee fine applies after {dueDate}.
                        </p>
                      </div>

                      {/* Signatures */}
                      <div className="pt-4 border-t border-slate-200 mt-2 flex justify-between text-[8px] text-slate-500">
                        <div className="text-center">
                          <span className="border-b border-dotted border-slate-400 w-16 block mb-0.5" />
                          <span>Bank Cashier</span>
                        </div>
                        <div className="text-center">
                          <span className="border-b border-dotted border-slate-400 w-16 block mb-0.5" />
                          <span>Account Officer</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
