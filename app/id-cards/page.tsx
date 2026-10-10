"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { resolveActiveSchoolContext } from "@/lib/school-context";
import { getTodayPKDate } from "@/lib/date-utils";
import QRCode from "qrcode";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  ArrowLeft,
  Printer,
  Download,
  Search,
  Filter,
  CheckSquare,
  Square,
  RefreshCw,
  CreditCard,
  Building,
  User,
  Phone,
  Calendar,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Camera,
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
  blood_group?: string;
}

export default function IDCardGeneratorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [schoolContext, setSchoolContext] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string | number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [qrCodes, setQrCodes] = useState<{ [studentId: string]: string }>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Card customization options
  const [cardColorTheme, setCardColorTheme] = useState<"navy" | "indigo" | "emerald" | "purple">("navy");
  const [validUntil, setValidUntil] = useState("31-12-2026");
  const [sessionYear, setSessionYear] = useState("2026-2027");

  const printAreaRef = useRef<HTMLDivElement>(null);
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

      let query = supabase.from("students").select("*").order("name", { ascending: true });
      if (ctx.schoolId && ctx.schoolId !== "all") {
        query = query.eq("school_id", ctx.schoolId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const studentList: Student[] = data || [];
      setStudents(studentList);

      // Select first 8 by default for instant 1-page A4 preview
      const initialSelected = new Set(studentList.slice(0, 8).map((s) => s.id));
      setSelectedStudentIds(initialSelected);

      // Generate QR codes for all students
      const qrMap: { [key: string]: string } = {};
      await Promise.all(
        studentList.map(async (st) => {
          try {
            const qrData = `STUDENT ID: ${st.id}\nNAME: ${st.name}\nFATHER: ${st.father_name || "N/A"}\nCLASS: ${st.class}\nSCHOOL: ${ctx.schoolName}\nEMERGENCY: ${st.phone || "N/A"}`;
            const qrUrl = await QRCode.toDataURL(qrData, {
              margin: 1,
              width: 90,
              color: {
                dark: "#0f172a",
                light: "#ffffff",
              },
            });
            qrMap[String(st.id)] = qrUrl;
          } catch (e) {
            console.error("QR Error", e);
          }
        })
      );
      setQrCodes(qrMap);
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

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.father_name && s.father_name.toLowerCase().includes(q)) ||
        s.class.toLowerCase().includes(q) ||
        String(s.id).includes(q);

      const matchesClass = selectedClass === "all" || s.class.toLowerCase() === selectedClass.toLowerCase();

      return matchesSearch && matchesClass;
    });
  }, [students, searchQuery, selectedClass]);

  const classOptions = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.class) set.add(s.class);
    });
    return Array.from(set).sort();
  }, [students]);

  // Students currently selected for printing (filtered order)
  const studentsToPrint = useMemo(() => {
    return students.filter((s) => selectedStudentIds.has(s.id));
  }, [students, selectedStudentIds]);

  const toggleSelectAllFiltered = () => {
    const allFilteredSelected = filteredStudents.every((s) => selectedStudentIds.has(s.id));
    const nextSet = new Set(selectedStudentIds);
    if (allFilteredSelected) {
      filteredStudents.forEach((s) => nextSet.delete(s.id));
    } else {
      filteredStudents.forEach((s) => nextSet.add(s.id));
    }
    setSelectedStudentIds(nextSet);
  };

  const toggleStudentSelection = (id: string | number) => {
    const nextSet = new Set(selectedStudentIds);
    if (nextSet.has(id)) nextSet.delete(id);
    else nextSet.add(id);
    setSelectedStudentIds(nextSet);
  };

  // Color Theme Configuration
  const themeStyles = {
    navy: {
      headerBg: "bg-[#1e3a5f]",
      headerText: "text-white",
      accentBorder: "border-[#1e3a5f]",
      tagBg: "bg-[#1e3a5f]/10 text-[#1e3a5f]",
      subHeader: "bg-[#f1c40f] text-[#1e3a5f]",
    },
    indigo: {
      headerBg: "bg-indigo-700",
      headerText: "text-white",
      accentBorder: "border-indigo-700",
      tagBg: "bg-indigo-50 text-indigo-700",
      subHeader: "bg-indigo-100 text-indigo-900",
    },
    emerald: {
      headerBg: "bg-emerald-700",
      headerText: "text-white",
      accentBorder: "border-emerald-700",
      tagBg: "bg-emerald-50 text-emerald-800",
      subHeader: "bg-emerald-100 text-emerald-900",
    },
    purple: {
      headerBg: "bg-purple-800",
      headerText: "text-white",
      accentBorder: "border-purple-800",
      tagBg: "bg-purple-50 text-purple-800",
      subHeader: "bg-purple-100 text-purple-900",
    },
  }[cardColorTheme];

  // Print Handler
  const handlePrint = () => {
    if (studentsToPrint.length === 0) {
      showToast("error", "Please select at least 1 student to print ID cards.");
      return;
    }
    window.print();
  };

  // Download PDF Handler with html2canvas and jsPDF
  const handleDownloadPDF = async () => {
    if (studentsToPrint.length === 0) {
      showToast("error", "Please select at least 1 student.");
      return;
    }
    if (!printAreaRef.current) return;

    try {
      setDownloadingPdf(true);
      showToast("success", "Generating high-resolution ID cards PDF...");

      const pages = printAreaRef.current.querySelectorAll<HTMLElement>(".a4-page");
      const pdf = new jsPDF("p", "mm", "a4");

      for (let i = 0; i < pages.length; i++) {
        const pageElem = pages[i];
        const canvas = await html2canvas(pageElem, {
          scale: 2.5,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        if (i > 0) pdf.addPage("a4", "p");
        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
      }

      pdf.save(`student-id-cards-${todayPK}.pdf`);
      showToast("success", "ID cards PDF downloaded successfully!");
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      showToast("error", "Failed to generate PDF. You can also use the Print button to Save as PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Chunk students into pages of 8 for exact A4 (2 columns x 4 rows)
  const chunkedPages = useMemo(() => {
    const pages: Student[][] = [];
    for (let i = 0; i < studentsToPrint.length; i += 8) {
      pages.push(studentsToPrint.slice(i, i + 8));
    }
    return pages;
  }, [studentsToPrint]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-16">
      {/* Print Stylesheet for exact 8 cards per A4 page */}
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
          .a4-page {
            width: 210mm !important;
            min-height: 297mm !important;
            height: 297mm !important;
            padding: 10mm 8mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box !important;
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            grid-template-rows: repeat(4, 1fr) !important;
            gap: 5mm !important;
          }
          .id-card-item {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            border: 1.5px solid #cbd5e1 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3 sm:px-6 py-3 shadow-xs no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span className="hidden xs:inline">Back</span>
            </Link>
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                  Student ID Card Generator
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                  8 / Sheet
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block truncate">
                Printable PVC / Paper ID cards with student photo, QR code & signature
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPdf || studentsToPrint.length === 0}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer"
            >
              <Download className={`w-3.5 h-3.5 ${downloadingPdf ? "animate-bounce" : ""}`} />
              <span>{downloadingPdf ? "Exporting..." : "Download PDF"}</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={studentsToPrint.length === 0}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4 ({studentsToPrint.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Toast Notification */}
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

        {/* Control and Customization Card (No-print) */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-xs space-y-4 no-print">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Filter Section */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="relative w-full sm:w-60">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search student or roll no..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

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

              <button
                onClick={toggleSelectAllFiltered}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer flex items-center gap-1.5"
              >
                {filteredStudents.every((s) => selectedStudentIds.has(s.id)) && filteredStudents.length > 0 ? (
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>Select All ({filteredStudents.length})</span>
              </button>
            </div>

            {/* Customization Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-semibold">Theme:</span>
                <div className="flex items-center gap-1">
                  {(["navy", "indigo", "emerald", "purple"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setCardColorTheme(t)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                        cardColorTheme === t ? "scale-110 border-slate-900" : "border-transparent"
                      } ${
                        t === "navy"
                          ? "bg-[#1e3a5f]"
                          : t === "indigo"
                          ? "bg-indigo-600"
                          : t === "emerald"
                          ? "bg-emerald-600"
                          : "bg-purple-700"
                      }`}
                      title={`${t} theme`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-semibold">Session:</span>
                <input
                  type="text"
                  value={sessionYear}
                  onChange={(e) => setSessionYear(e.target.value)}
                  className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-semibold">Valid Till:</span>
                <input
                  type="text"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>
              Selected: <strong className="text-indigo-600">{studentsToPrint.length}</strong> students • Fits into{" "}
              <strong className="text-indigo-600">{chunkedPages.length}</strong> A4 Sheet(s)
            </span>
            <span className="text-[11px] text-slate-400">
              Tip: Click any student's checkbox below to toggle inclusion in the print sheet
            </span>
          </div>
        </div>

        {/* Student Quick-Select Chips (No-print) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2 no-print">
          <p className="text-xs font-bold text-slate-700">Quick Selection:</p>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
            {filteredStudents.map((s) => {
              const isSelected = selectedStudentIds.has(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleStudentSelection(s.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-indigo-50 border-indigo-300 text-indigo-800 font-bold"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="w-3 h-3 text-indigo-600" />
                  ) : (
                    <Square className="w-3 h-3 text-slate-400" />
                  )}
                  <span>{s.name}</span>
                  <span className="text-[10px] text-slate-400">({s.class})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* PRINTABLE A4 PAGES CONTAINER */}
        <div ref={printAreaRef} className="space-y-8">
          {chunkedPages.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
              <CreditCard className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold">No students selected for ID cards.</p>
              <p className="text-xs mt-1">Select students from the list above to preview and print.</p>
            </div>
          ) : (
            chunkedPages.map((pageStudents, pageIdx) => (
              <div
                key={pageIdx}
                className="a4-page bg-white mx-auto shadow-md border border-slate-200 rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[210mm] relative"
                style={{
                  minHeight: "297mm",
                  boxSizing: "border-box",
                }}
              >
                {/* Page Watermark Indicator for Screen */}
                <div className="col-span-full text-right text-[10px] text-slate-400 font-mono no-print">
                  A4 Page {pageIdx + 1} of {chunkedPages.length} (8 Cards per sheet)
                </div>

                {pageStudents.map((student) => {
                  const qr = qrCodes[String(student.id)];
                  const schoolTitle = schoolContext?.schoolName || "Registered School";
                  const schoolInitials =
                    schoolContext?.schoolInitials ||
                    schoolTitle
                      .split(" ")
                      .map((w: string) => w[0])
                      .filter(Boolean)
                      .slice(0, 2)
                      .join("")
                      .toUpperCase() ||
                    "SC";
                  const schoolSub = schoolContext?.schoolCity || schoolContext?.city
                    ? `${schoolContext.schoolCity || schoolContext.city} • Session ${sessionYear}`
                    : `Academic Session ${sessionYear}`;

                  return (
                    <div
                      key={student.id}
                      className="id-card-item relative bg-white border border-slate-300 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between"
                      style={{
                        height: "64mm",
                        maxHeight: "68mm",
                        boxSizing: "border-box",
                      }}
                    >
                      {/* Top School Header Strip */}
                      <div className={`${themeStyles.headerBg} ${themeStyles.headerText} px-3 py-1.5 flex items-center justify-between`}>
                        <div className="flex items-center gap-2">
                          {(schoolContext?.schoolLogo || schoolContext?.logoUrl) ? (
                            <img
                              src={schoolContext.schoolLogo || schoolContext.logoUrl}
                              alt="Logo"
                              className="w-6 h-6 rounded-full object-cover bg-white p-0.5 shadow-xs"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-yellow-400 text-[#1e3a5f] font-black text-[10px] flex items-center justify-center shadow-xs">
                              {schoolInitials}
                            </div>
                          )}
                          <div>
                            <h2 className="text-[11px] font-black uppercase tracking-wide leading-tight truncate max-w-[170px]" title={schoolTitle}>
                              {schoolTitle}
                            </h2>
                            <p className="text-[8px] opacity-85 leading-none truncate max-w-[170px]">
                              {schoolSub}
                            </p>
                          </div>
                        </div>
                        <span className="text-[8px] font-bold bg-white/20 px-1.5 py-0.5 rounded uppercase">
                          Student ID
                        </span>
                      </div>

                      {/* Card Body */}
                      <div className="p-2.5 flex gap-2.5 items-center flex-1 bg-gradient-to-b from-white to-slate-50/50">
                        {/* Student Avatar / Photo Frame */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className="w-16 h-18 rounded-lg bg-slate-100 border-2 border-slate-300 flex flex-col items-center justify-center overflow-hidden shadow-2xs relative">
                            {student.avatar_url ? (
                              <img
                                src={student.avatar_url}
                                alt={student.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-slate-100 to-indigo-50 text-slate-400">
                                <User className="w-8 h-8 text-slate-400" />
                                <span className="text-[8px] font-bold text-slate-500 mt-0.5">PHOTO</span>
                              </div>
                            )}
                          </div>
                          <span className="text-[8px] font-mono font-bold text-slate-600 mt-1">
                            ROLL #{student.id}
                          </span>
                        </div>

                        {/* Student Info Table */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div>
                            <h3 className="text-xs font-black text-slate-900 leading-tight truncate">
                              {student.name}
                            </h3>
                            <p className="text-[9px] text-slate-500 leading-tight truncate">
                              S/O: <strong className="text-slate-700">{student.father_name || "N/A"}</strong>
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-1 text-[9px] pt-0.5">
                            <div className="bg-slate-100/80 px-1.5 py-0.5 rounded">
                              <span className="text-slate-400 block text-[7px] uppercase font-bold">Class</span>
                              <span className="font-bold text-slate-800">{student.class}</span>
                            </div>
                            <div className="bg-slate-100/80 px-1.5 py-0.5 rounded">
                              <span className="text-slate-400 block text-[7px] uppercase font-bold">Valid Till</span>
                              <span className="font-bold text-slate-800">{validUntil}</span>
                            </div>
                          </div>

                          <div className="text-[8px] text-slate-600 flex items-center gap-1 truncate pt-0.5">
                            <Phone className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                            <span className="font-mono font-semibold">{student.phone || "Emergency Contact"}</span>
                          </div>
                        </div>

                        {/* Right: QR Code */}
                        <div className="shrink-0 flex flex-col items-center">
                          {qr ? (
                            <img
                              src={qr}
                              alt="QR"
                              className="w-13 h-13 border border-slate-200 rounded p-0.5 bg-white shadow-2xs"
                            />
                          ) : (
                            <div className="w-13 h-13 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-[7px] text-slate-400">
                              QR
                            </div>
                          )}
                          <span className="text-[7px] text-slate-400 font-bold uppercase mt-0.5">
                            Scan ID
                          </span>
                        </div>
                      </div>

                      {/* Card Bottom Strip with Signature */}
                      <div className="px-3 py-1 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-600">
                        <span className="italic text-[7px] text-slate-400">Card is non-transferable</span>
                        <div className="flex items-center gap-1">
                          <span className="border-b border-dotted border-slate-400 w-12 block" />
                          <span className="font-bold uppercase text-[7px] text-slate-600">Principal</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
