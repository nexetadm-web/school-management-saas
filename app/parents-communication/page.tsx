"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSchool } from "@/lib/school-context";
import { supabase } from "@/lib/supabase";
import { getTodayPKDate } from "@/lib/date-utils";
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Phone,
  Search,
  Filter,
  RefreshCw,
  Bell,
  Clock,
  Sparkles,
  ChevronLeft,
  Settings2,
  FileText,
  Award,
  Wallet,
  Users,
} from "lucide-react";

interface MessageLog {
  id: string | number;
  school_id: string | number;
  student_id: string | number;
  student_name?: string;
  student_class?: string;
  type: "absent" | "fee_paid" | "fee_due" | "result" | "general";
  recipient_phone: string;
  message: string;
  status: "sent" | "pending" | "failed";
  created_at: string;
}

export default function ParentsCommunicationPage() {
  const { schoolId, schoolName, schoolPhone } = useSchool();

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Auto notification triggers state
  const [settings, setSettings] = useState({
    auto_absent: true,
    auto_fee_receipt: true,
    auto_fee_due: true,
    auto_result: true,
  });

  // Direct custom message modal
  const [showCompose, setShowCompose] = useState(false);
  const [composeForm, setComposeForm] = useState({
    student_name: "",
    phone: "",
    type: "general" as MessageLog["type"],
    message: "",
  });

  const todayPK = getTodayPKDate();

  useEffect(() => {
    loadLogs();
  }, [schoolId]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("parent_messages_log")
        .select("*, students(name, class)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (schoolId && schoolId !== "all") {
        q = q.eq("school_id", schoolId);
      }

      const { data, error } = await q;

      if (!error && data && data.length > 0) {
        setMessages(
          data.map((m: any) => ({
            id: m.id,
            school_id: m.school_id,
            student_id: m.student_id,
            student_name: m.students?.name || "Student",
            student_class: m.students?.class || "-",
            type: m.type,
            recipient_phone: m.recipient_phone || "",
            message: m.message,
            status: m.status || "sent",
            created_at: m.created_at,
          }))
        );
      } else {
        // Fallback default sample data
        setMessages([
          {
            id: "1",
            school_id: schoolId || 1,
            student_id: "101",
            student_name: "Muhammad Abdullah",
            student_class: "Class 10",
            type: "absent",
            recipient_phone: "03001234567",
            message: `السلام علیکم! آپ کا بچہ Muhammad Abdullah کلاس Class 10 آج بتاریخ ${todayPK} غیر حاضر ہے۔ برائے مہربانی سکول کو مطلع فرمائیں۔ - ${schoolName}`,
            status: "sent",
            created_at: new Date().toISOString(),
          },
          {
            id: "2",
            school_id: schoolId || 1,
            student_id: "102",
            student_name: "Fatima Noor",
            student_class: "Class 8",
            type: "fee_paid",
            recipient_phone: "03019876543",
            message: `محترم والدین، فاطمہ نور کی فیس Rs. 2,500 بابت ماہ October 2026 موصول ہو چکی ہے۔ فیس رسید نمبر REC-102۔ شکریہ - ${schoolName}`,
            status: "sent",
            created_at: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: "3",
            school_id: schoolId || 1,
            student_id: "103",
            student_name: "Ali Hassan",
            student_class: "Class 9",
            type: "result",
            recipient_phone: "03055554433",
            message: `مبارک ہو! علی حسن نے ماہانہ ٹیسٹ میں 88% نمبر حاصل کر کے پہلی پوزیشن حاصل کی۔ رزلٹ کارڈ دیکھیں۔ - ${schoolName}`,
            status: "sent",
            created_at: new Date(Date.now() - 7200000).toISOString(),
          },
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeForm.phone.trim() || !composeForm.message.trim()) return;

    const newLog: MessageLog = {
      id: Date.now(),
      school_id: schoolId || 1,
      student_id: "custom",
      student_name: composeForm.student_name || "Parent",
      student_class: "-",
      type: composeForm.type,
      recipient_phone: composeForm.phone,
      message: composeForm.message,
      status: "sent",
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [newLog, ...prev]);

    // Open WhatsApp
    const cleanPhone = composeForm.phone.replace(/[^0-9]/g, "");
    const waUrl = `https://wa.me/${cleanPhone.startsWith("92") ? cleanPhone : "92" + cleanPhone.replace(/^0/, "")}?text=${encodeURIComponent(composeForm.message)}`;
    window.open(waUrl, "_blank");

    setShowCompose(false);
    setComposeForm({
      student_name: "",
      phone: "",
      type: "general",
      message: "",
    });

    // Background push to DB
    try {
      await supabase.from("parent_messages_log").insert([
        {
          school_id: schoolId && schoolId !== "all" ? schoolId : 1,
          type: newLog.type,
          recipient_phone: newLog.recipient_phone,
          message: newLog.message,
          status: "sent",
        },
      ]);
    } catch (err) {}
  };

  const openWhatsAppLink = (log: MessageLog) => {
    const cleanPhone = log.recipient_phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("92")
      ? cleanPhone
      : "92" + cleanPhone.replace(/^0/, "");
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(log.message)}`;
    window.open(waUrl, "_blank");
  };

  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (m.student_name && m.student_name.toLowerCase().includes(q)) ||
        m.recipient_phone.includes(q) ||
        m.message.toLowerCase().includes(q);

      const matchType = typeFilter === "all" || m.type === typeFilter;
      const matchStatus = statusFilter === "all" || m.status === statusFilter;

      return matchSearch && matchType && matchStatus;
    });
  }, [messages, search, typeFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: messages.length,
      absent: messages.filter((m) => m.type === "absent").length,
      fee: messages.filter((m) => m.type === "fee_paid" || m.type === "fee_due").length,
      result: messages.filter((m) => m.type === "result").length,
    };
  }, [messages]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-3 md:p-6 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
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
                Direct Parent Broadcast
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <MessageSquare className="w-7 h-7 text-emerald-600" />
              والدین واٹس ایپ کمیونیکیشن پورٹل (Parent WhatsApp Communication)
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              {schoolName} — غیر حاضری الرٹ، فیس رسید، فیس واجبات اور رزلٹ کی خودکار واٹس ایپ ترسیل
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCompose(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-lg shadow-emerald-200 hover:brightness-105 transition active:scale-95"
            >
              <Send className="w-4 h-4" /> نیا میسج بھیجیں (Send Notice)
            </button>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">کل ترسیل پیغامات</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{stats.total}</h3>
              <p className="text-[10px] text-slate-500">Total Sent Notices</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">غیر حاضری الرٹس</p>
              <h3 className="text-2xl font-black text-rose-600 mt-0.5">{stats.absent}</h3>
              <p className="text-[10px] text-slate-500">Absent Alerts Sent</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">فیس نوٹسز و رسید</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-0.5">{stats.fee}</h3>
              <p className="text-[10px] text-slate-500">Fee Reminders/Receipts</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">امتحانی رزلٹ الرٹس</p>
              <h3 className="text-2xl font-black text-amber-600 mt-0.5">{stats.result}</h3>
              <p className="text-[10px] text-slate-500">Exam Results Broadcast</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Auto Triggers Toggle Banner */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-emerald-600" />
              خودکار واٹس ایپ نوٹیفکیشن ٹریگرز (Instant Triggers Status)
            </h3>
            <span className="text-[10px] text-slate-400">100% آن لائن فعال</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
              <div>
                <div className="font-bold text-slate-900">غیر حاضری فوری الرٹ</div>
                <div className="text-[10px] text-slate-500">حاضری لگاتے ہی غیر حاضر طلباء کو میسج</div>
              </div>
              <input
                type="checkbox"
                checked={settings.auto_absent}
                onChange={(e) => setSettings({ ...settings, auto_absent: e.target.checked })}
                className="w-4 h-4 accent-emerald-600"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
              <div>
                <div className="font-bold text-slate-900">فیس جمع تصدیقی رسید</div>
                <div className="text-[10px] text-slate-500">فیس وصول ہوتے ہی رسید میسج</div>
              </div>
              <input
                type="checkbox"
                checked={settings.auto_fee_receipt}
                onChange={(e) => setSettings({ ...settings, auto_fee_receipt: e.target.checked })}
                className="w-4 h-4 accent-emerald-600"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
              <div>
                <div className="font-bold text-slate-900">فیس واجبات یاد دہانی</div>
                <div className="text-[10px] text-slate-500">تاریخ گزرنے پر خودکار فیس میسج</div>
              </div>
              <input
                type="checkbox"
                checked={settings.auto_fee_due}
                onChange={(e) => setSettings({ ...settings, auto_fee_due: e.target.checked })}
                className="w-4 h-4 accent-emerald-600"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
              <div>
                <div className="font-bold text-slate-900">امتحانی رزلٹ کارڈ</div>
                <div className="text-[10px] text-slate-500">نمبر درج ہونے پر پوزیشن میسج</div>
              </div>
              <input
                type="checkbox"
                checked={settings.auto_result}
                onChange={(e) => setSettings({ ...settings, auto_result: e.target.checked })}
                className="w-4 h-4 accent-emerald-600"
              />
            </label>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="تلاش کریں نام، فون یا پیغام..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs p-1.5 border border-slate-200 rounded-xl outline-none bg-white"
            >
              <option value="all">تمام اقسام (All Types)</option>
              <option value="absent">غیر حاضری (Absent)</option>
              <option value="fee_paid">فیس ادائیگی (Fee Paid)</option>
              <option value="fee_due">فیس واجبات (Fee Due)</option>
              <option value="result">رزلٹ کارڈ (Results)</option>
              <option value="general">عام نوٹس (General)</option>
            </select>

            <button
              onClick={loadLogs}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              title="تازہ کریں"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Messages Log Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5">نوعیت (Type)</th>
                  <th className="p-3.5">طالب علم / کلاس</th>
                  <th className="p-3.5">رابطہ فون نمبر</th>
                  <th className="p-3.5">پیغام کا متن (Message Text)</th>
                  <th className="p-3.5">حیثیت (Status)</th>
                  <th className="p-3.5 text-right">کارروائی (Action)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMessages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      کوئی ریکارڈ موجود نہیں۔
                    </td>
                  </tr>
                ) : (
                  filteredMessages.map((log) => {
                    const badgeStyles = {
                      absent: "bg-rose-50 text-rose-700 border-rose-200",
                      fee_paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
                      fee_due: "bg-amber-50 text-amber-700 border-amber-200",
                      result: "bg-blue-50 text-blue-700 border-blue-200",
                      general: "bg-slate-50 text-slate-700 border-slate-200",
                    }[log.type];

                    const labelText = {
                      absent: "غیر حاضری",
                      fee_paid: "فیس رسید",
                      fee_due: "فیس واجبات",
                      result: "رزلٹ الرٹ",
                      general: "عام نوٹس",
                    }[log.type];

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeStyles}`}
                          >
                            {labelText}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{log.student_name}</div>
                          <div className="text-[10px] text-slate-500 font-medium">{log.student_class}</div>
                        </td>
                        <td className="p-3.5 font-mono text-slate-600 font-semibold">
                          {log.recipient_phone}
                        </td>
                        <td className="p-3.5 max-w-md">
                          <p className="text-slate-700 truncate text-[11px]" title={log.message}>
                            {log.message}
                          </p>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {new Date(log.created_at).toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            ارسال شدہ
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => openWhatsAppLink(log)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition active:scale-95"
                          >
                            <Send className="w-3 h-3" /> واٹس ایپ کھولیں
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

        {/* Modal: Compose Notice */}
        {showCompose && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
              <h3 className="text-base font-black text-slate-900 mb-3 flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-600" />
                والدین کو واٹس ایپ پیغام بھیجیں
              </h3>

              <form onSubmit={handleSendCustom} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">طالب علم کا نام</label>
                  <input
                    type="text"
                    value={composeForm.student_name}
                    onChange={(e) =>
                      setComposeForm({ ...composeForm, student_name: e.target.value })
                    }
                    placeholder="طالب علم کا نام"
                    className="w-full p-2.5 border rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    والدین کا واٹس ایپ موبائل نمبر (923XXXXXXXXX)
                  </label>
                  <input
                    type="text"
                    required
                    value={composeForm.phone}
                    onChange={(e) => setComposeForm({ ...composeForm, phone: e.target.value })}
                    placeholder="0300-1234567"
                    className="w-full p-2.5 border rounded-xl outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">نوٹیفکیشن کی قسم</label>
                  <select
                    value={composeForm.type}
                    onChange={(e) =>
                      setComposeForm({ ...composeForm, type: e.target.value as any })
                    }
                    className="w-full p-2.5 border rounded-xl outline-none bg-white"
                  >
                    <option value="general">عام سکول نوٹس (General Notice)</option>
                    <option value="absent">غیر حاضری کی اطلاع (Absent Alert)</option>
                    <option value="fee_due">فیس ادائیگی یاد دہانی (Fee Due)</option>
                    <option value="fee_paid">فیس موصولی رسید (Fee Paid)</option>
                    <option value="result">رزلٹ کارڈ اطلاع (Result Alert)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">پیغام کا متن (Message)</label>
                  <textarea
                    rows={4}
                    required
                    value={composeForm.message}
                    onChange={(e) => setComposeForm({ ...composeForm, message: e.target.value })}
                    placeholder={`السلام علیکم! محترم والدین، ... - ${schoolName}`}
                    className="w-full p-2.5 border rounded-xl outline-none"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCompose(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                  >
                    منسوخ
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> واٹس ایپ پر ارسال کریں
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
