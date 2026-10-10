"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { resolveActiveSchoolContext } from "@/lib/school-context";
import { SchoolLogo } from "@/components/school-branding";
import {
  Award,
  ChevronLeft,
  FileCheck,
  GraduationCap,
  Medal,
  Printer,
  Search,
  Sparkles,
  Trophy,
  UserCheck,
} from "lucide-react";

type CertificateType = "leaving" | "character" | "merit" | "sports";

interface StudentOption {
  id: string;
  name: string;
  father_name?: string;
  class_name?: string;
  roll_number?: string;
  admission_number?: string;
  dob?: string;
  gender?: string;
}

export default function CertificatesPage() {
  const [certType, setCertType] = useState<CertificateType>("leaving");
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // School context
  const [schoolContext, setSchoolContext] = useState<any>({
    schoolId: "",
    schoolName: "Registered School",
    schoolAddress: "School Campus",
    schoolPhone: "",
    schoolLogo: "",
  });

  // Certificate Form fields
  const [certNumber, setCertNumber] = useState(
    () => `CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [issueDate, setIssueDate] = useState(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  });

  const [studentName, setStudentName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [className, setClassName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [admissionNo, setAdmissionNo] = useState("");
  const [dob, setDob] = useState("");
  const [reasonLeaving, setReasonLeaving] = useState("والدین کا تبادلہ (Parent Relocation / Migration)");
  const [conduct, setConduct] = useState("بہترین اور بااخلاق (Good & Exemplary)");
  const [achievement, setAchievement] = useState("پہلی پوزیشن - سالانہ امتحانات (First Position in Annual Exam)");
  const [sportsEvent, setSportsEvent] = useState("سالانہ سپورٹس گالا - کرکٹ چیمپیئن (Annual Sports Gala - Cricket Champions)");
  const [remarks, setRemarks] = useState("ہم ان کے تابناک مستقبل کے لیے دعا گو ہیں۔ (We wish them success in future endeavors.)");

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function init() {
      const ctx = await resolveActiveSchoolContext();
      setSchoolContext(ctx);
      fetchStudents(ctx.schoolId ? String(ctx.schoolId) : undefined);
    }
    init();
  }, []);

  const fetchStudents = async (schoolId?: string) => {
    try {
      let q = supabase
        .from("students")
        .select("id, name, father_name, class_name, roll_number, admission_number, dob, gender")
        .order("name");

      if (schoolId) {
        q = q.eq("school_id", schoolId);
      }

      const { data, error } = await q.limit(100);
      if (!error && data && data.length > 0) {
        setStudents(data);
        handleSelectStudent(data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectStudent = (s: StudentOption) => {
    setSelectedStudentId(s.id);
    setStudentName(s.name || "");
    setFatherName(s.father_name || "");
    setClassName(s.class_name || "");
    setRollNumber(s.roll_number || "");
    setAdmissionNo(s.admission_number || `ADM-${s.id.slice(0, 4)}`);
    setDob(s.dob || "01-01-2012");
  };

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.father_name && s.father_name.toLowerCase().includes(q)) ||
        (s.class_name && s.class_name.toLowerCase().includes(q)) ||
        (s.roll_number && s.roll_number.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  const handlePrint = () => {
    window.print();
  };

  const certTitles = {
    leaving: {
      en: "SCHOOL LEAVING CERTIFICATE",
      ur: "سکول چھوڑنے کا سرٹیفکیٹ",
      icon: GraduationCap,
      color: "from-blue-600 to-indigo-700",
    },
    character: {
      en: "CHARACTER CERTIFICATE",
      ur: "سیرت و کردار کا سرٹیفکیٹ",
      icon: UserCheck,
      color: "from-emerald-600 to-teal-700",
    },
    merit: {
      en: "CERTIFICATE OF ACADEMIC MERIT",
      ur: "تعلیمی حسنِ کارکردگی سرٹیفکیٹ",
      icon: Award,
      color: "from-amber-600 to-yellow-600",
    },
    sports: {
      en: "BONAFIDE & SPORTS CERTIFICATE",
      ur: "کھیلوں و غیر نصابی سرگرمیوں کا سرٹیفکیٹ",
      icon: Trophy,
      color: "from-purple-600 to-pink-600",
    },
  };

  const currentMeta = certTitles[certType];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-3 md:p-6 pb-20">
      {/* Top Bar - hidden during print */}
      <div className="print:hidden max-w-7xl mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/"
              className="text-xs bg-white text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center gap-1 shadow-sm font-medium"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> ڈیش بورڈ (Dashboard)
            </Link>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
              Official Certificates
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            سکول اسناد و سرٹیفکیٹ جنریٹر (School Certificates Hub)
          </h1>
          <p className="text-xs md:text-sm text-slate-500">
            {schoolContext.schoolName} — تصدیق شدہ اسکول لیونگ، کریکٹر و حسن کارکردگی سرٹیفکیٹس
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold shadow-lg shadow-indigo-200 hover:brightness-105 transition active:scale-95 text-sm"
        >
          <Printer className="w-4 h-4" /> سرٹیفکیٹ پرنٹ کریں (Print A4)
        </button>
      </div>

      {/* Tabs Row - hidden during print */}
      <div className="print:hidden max-w-7xl mx-auto mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setCertType("leaving")}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs md:text-sm font-bold transition ${
              certType === "leaving"
                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <div className="text-left">
              <div>Leaving Certificate</div>
              <div className="text-[10px] opacity-80 font-normal">سکول لیونگ سرٹیفکیٹ</div>
            </div>
          </button>

          <button
            onClick={() => setCertType("character")}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs md:text-sm font-bold transition ${
              certType === "character"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <div className="text-left">
              <div>Character Certificate</div>
              <div className="text-[10px] opacity-80 font-normal">کریکٹر سرٹیفکیٹ</div>
            </div>
          </button>

          <button
            onClick={() => setCertType("merit")}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs md:text-sm font-bold transition ${
              certType === "merit"
                ? "bg-amber-600 text-white shadow-md shadow-amber-200"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Award className="w-4 h-4" />
            <div className="text-left">
              <div>Academic Merit</div>
              <div className="text-[10px] opacity-80 font-normal">حسنِ کارکردگی سرٹیفکیٹ</div>
            </div>
          </button>

          <button
            onClick={() => setCertType("sports")}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs md:text-sm font-bold transition ${
              certType === "sports"
                ? "bg-purple-600 text-white shadow-md shadow-purple-200"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Trophy className="w-4 h-4" />
            <div className="text-left">
              <div>Bonafide / Sports</div>
              <div className="text-[10px] opacity-80 font-normal">کھیلوں کا سرٹیفکیٹ</div>
            </div>
          </button>
        </div>
      </div>

      {/* Editor & Preview Split View */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Editor Settings (Hidden during print) */}
        <div className="print:hidden lg:col-span-4 space-y-4">
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-black text-slate-800 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileCheck className="w-4 h-4 text-indigo-600" />
              طالب علم منتخب کریں (Select Student)
            </h3>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="تلاش کریں نام / کلاس / رول..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {filteredStudents.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectStudent(s)}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs transition flex items-center justify-between ${
                    selectedStudentId === s.id
                      ? "bg-indigo-50 border-indigo-300 font-bold text-indigo-900"
                      : "bg-slate-50/50 border-slate-100 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <div>
                    <div className="font-semibold text-slate-900">{s.name}</div>
                    <div className="text-[10px] text-slate-500">
                      والد: {s.father_name || "N/A"} • کلاس: {s.class_name || "N/A"}
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200">
                    Roll #{s.roll_number || "—"}
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">سرٹیفکیٹ نمبر</label>
                  <input
                    type="text"
                    value={certNumber}
                    onChange={(e) => setCertNumber(e.target.value)}
                    className="w-full mt-1 p-2 text-xs border rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">تاریخِ اجراء (DD-MM-YYYY)</label>
                  <input
                    type="text"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full mt-1 p-2 text-xs border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">طالب علم کا نام</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full mt-1 p-2 text-xs border rounded-lg font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">والد کا نام</label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    className="w-full mt-1 p-2 text-xs border rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">کلاس (Class)</label>
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full mt-1 p-2 text-xs border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">داخلہ نمبر (Adm No)</label>
                  <input
                    type="text"
                    value={admissionNo}
                    onChange={(e) => setAdmissionNo(e.target.value)}
                    className="w-full mt-1 p-2 text-xs border rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">تاریخِ پیدائش (DOB)</label>
                  <input
                    type="text"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full mt-1 p-2 text-xs border rounded-lg"
                  />
                </div>
              </div>

              {certType === "leaving" && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">سکول چھوڑنے کی وجہ</label>
                  <textarea
                    rows={2}
                    value={reasonLeaving}
                    onChange={(e) => setReasonLeaving(e.target.value)}
                    className="w-full mt-1 p-2 text-xs border rounded-lg"
                  />
                </div>
              )}

              {certType === "character" && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">چال چلن و کردار (Conduct)</label>
                  <input
                    type="text"
                    value={conduct}
                    onChange={(e) => setConduct(e.target.value)}
                    className="w-full mt-1 p-2 text-xs border rounded-lg"
                  />
                </div>
              )}

              {certType === "merit" && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">نمایاں کارکردگی (Achievement)</label>
                  <input
                    type="text"
                    value={achievement}
                    onChange={(e) => setAchievement(e.target.value)}
                    className="w-full mt-1 p-2 text-xs border rounded-lg"
                  />
                </div>
              )}

              {certType === "sports" && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">کھیل / مقابلہ (Event/Sport)</label>
                  <input
                    type="text"
                    value={sportsEvent}
                    onChange={(e) => setSportsEvent(e.target.value)}
                    className="w-full mt-1 p-2 text-xs border rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">پرنسپل ریمارکس / دعا</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full mt-1 p-2 text-xs border rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Certificate Printable Canvas (Full width on print) */}
        <div className="lg:col-span-8 flex justify-center print:col-span-12 print:w-full">
          <div
            ref={printRef}
            className="w-full max-w-[800px] bg-white p-6 md:p-10 rounded-2xl border-8 border-double border-indigo-950/20 shadow-xl print:border-8 print:border-black print:p-8 print:shadow-none print:m-0 print:w-full min-h-[640px] flex flex-col justify-between relative overflow-hidden"
            style={{
              backgroundImage: "radial-gradient(#e0e7ff 0.75px, transparent 0.75px)",
              backgroundSize: "20px 20px",
            }}
          >
            {/* Corner Ornamental Accents */}
            <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-indigo-900 pointer-events-none" />
            <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-indigo-900 pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-indigo-900 pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-indigo-900 pointer-events-none" />

            {/* School Header */}
            <div>
              <div className="text-center border-b-2 border-indigo-900/40 pb-4 mb-4">
                <div className="flex items-center justify-between mb-2 px-2 text-[11px] font-mono text-slate-500 font-bold">
                  <span>Ref: {certNumber}</span>
                  <span>Date: {issueDate}</span>
                </div>

                <div className="flex justify-center mb-2">
                  <SchoolLogo
                    name={schoolContext.schoolName}
                    logoUrl={schoolContext.schoolLogo}
                    size="lg"
                  />
                </div>

                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-wide uppercase">
                  {schoolContext.schoolName}
                </h1>
                <p className="text-xs text-slate-600 font-medium">{schoolContext.schoolAddress}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Phone: {schoolContext.schoolPhone}</p>

                {/* Ribbon Title */}
                <div className="mt-4 inline-block">
                  <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-indigo-900 text-white px-8 py-2 rounded-full font-black tracking-widest text-sm md:text-base shadow-md uppercase">
                    {currentMeta.en}
                  </div>
                  <div className="text-xs font-bold text-indigo-900 mt-1 font-arabic">
                    {currentMeta.ur}
                  </div>
                </div>
              </div>

              {/* Certificate Body */}
              <div className="py-4 text-slate-800 text-sm md:text-base leading-relaxed space-y-4">
                <p className="text-center text-xs text-slate-500 uppercase tracking-widest font-semibold">
                  To Whom It May Concern / تصدیق کی جاتی ہے کہ
                </p>

                <p className="text-justify font-serif text-slate-800">
                  This is to certify that <span className="font-bold underline text-indigo-950 px-1">{studentName || ".............................."}</span>, 
                  son / daughter of <span className="font-bold underline text-indigo-950 px-1">{fatherName || ".............................."}</span>, 
                  holding Admission No. <span className="font-bold underline text-indigo-950 px-1">{admissionNo || "........"}</span> 
                  and Roll No. <span className="font-bold underline text-indigo-950 px-1">{rollNumber || "........"}</span>, 
                  has been a bonafide student of this institution in Class <span className="font-bold underline text-indigo-950 px-1">{className || "........"}</span>.
                </p>

                {certType === "leaving" && (
                  <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 text-xs md:text-sm space-y-1.5 font-serif">
                    <div>
                      <span className="font-semibold text-slate-700">Date of Birth (ریکارڈ کے مطابق):</span>{" "}
                      <span className="font-bold text-slate-900">{dob}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Reason for Leaving (وجہ اخراج):</span>{" "}
                      <span className="font-bold text-slate-900">{reasonLeaving}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Conduct & Character (سیرت و کردار):</span>{" "}
                      <span className="font-bold text-emerald-700">{conduct}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Dues Paid (تمام واجبات ادا شدہ):</span>{" "}
                      <span className="font-bold text-emerald-700">Cleared / ادا شدہ ہیں</span>
                    </div>
                  </div>
                )}

                {certType === "character" && (
                  <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 text-xs md:text-sm space-y-1.5 font-serif">
                    <div>
                      <span className="font-semibold text-slate-700">General Conduct:</span>{" "}
                      <span className="font-bold text-emerald-700">{conduct}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Academic Standing:</span>{" "}
                      <span className="font-bold text-slate-900">Satisfactory & Diligent</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">
                      During their stay at this academy, their moral character, discipline, and devotion to studies remained highly commendable.
                    </p>
                  </div>
                )}

                {certType === "merit" && (
                  <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 text-center space-y-2">
                    <Trophy className="w-8 h-8 text-amber-600 mx-auto" />
                    <div className="text-xs uppercase font-bold text-amber-800 tracking-wider">
                      Distinction Awarded For
                    </div>
                    <div className="text-base md:text-lg font-black text-amber-950 font-serif">
                      {achievement}
                    </div>
                    <p className="text-xs text-slate-600">
                      In recognition of outstanding academic diligence, exemplary scores, and scholastic excellence.
                    </p>
                  </div>
                )}

                {certType === "sports" && (
                  <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200 text-center space-y-2">
                    <Medal className="w-8 h-8 text-purple-600 mx-auto" />
                    <div className="text-xs uppercase font-bold text-purple-800 tracking-wider">
                      Sports & Co-Curricular Recognition
                    </div>
                    <div className="text-base md:text-lg font-black text-purple-950 font-serif">
                      {sportsEvent}
                    </div>
                    <p className="text-xs text-slate-600">
                      Awarded for demonstrating true athletic spirit, exceptional sportsmanship, and outstanding teamwork.
                    </p>
                  </div>
                )}

                <p className="font-serif text-slate-700 italic text-xs md:text-sm text-center pt-2">
                  &ldquo;{remarks}&rdquo;
                </p>
              </div>
            </div>

            {/* Signatures & Seal Footer */}
            <div className="pt-8 mt-6 border-t border-slate-200">
              <div className="grid grid-cols-3 items-end text-center text-xs font-semibold text-slate-700">
                <div>
                  <div className="w-32 mx-auto border-b border-dashed border-slate-400 mb-1" />
                  <div>Class Teacher</div>
                  <div className="text-[10px] text-slate-400">کلاس انچارج</div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full border-2 border-indigo-900/30 flex items-center justify-center text-[9px] uppercase font-bold text-indigo-900 tracking-widest text-center rotate-[-12deg]">
                    Official Seal<br />مہر ادارہ
                  </div>
                </div>

                <div>
                  <div className="w-32 mx-auto border-b border-dashed border-slate-400 mb-1" />
                  <div className="font-bold text-slate-900">Principal / Headmaster</div>
                  <div className="text-[10px] text-slate-400">پرنسپل / ہیڈ ماسٹر</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
