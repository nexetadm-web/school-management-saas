"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { resolveActiveSchoolContext } from "@/lib/school-context";
import { getTodayPKDate } from "@/lib/date-utils";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Printer,
  Plus,
  Save,
  CheckCircle,
  AlertCircle,
  Edit2,
  Trash2,
  BookOpen,
  User,
  Sparkles,
  Layers,
} from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const PERIOD_TIMINGS: Record<number, string> = {
  1: "08:00 - 08:45 AM",
  2: "08:45 - 09:30 AM",
  3: "09:30 - 10:15 AM",
  4: "10:15 - 11:00 AM",
  5: "11:30 - 12:15 PM", // After break
  6: "12:15 - 01:00 PM",
  7: "01:00 - 01:40 PM",
  8: "01:40 - 02:20 PM",
};

interface TimetableCell {
  subject: string;
  teacher: string;
  room?: string;
}

const DEFAULT_SCHEDULES: Record<string, Record<string, Record<number, TimetableCell>>> = {
  "Class 10": {
    Monday: {
      1: { subject: "English", teacher: "Sir Tariq", room: "Room 10" },
      2: { subject: "Mathematics", teacher: "Sir Usman", room: "Room 10" },
      3: { subject: "Physics", teacher: "Sir Kamran", room: "Lab 1" },
      4: { subject: "Chemistry", teacher: "Sir Waqas", room: "Lab 2" },
      5: { subject: "Biology / CS", teacher: "Sir Bilal", room: "Comp Lab" },
      6: { subject: "Urdu", teacher: "Sir Aslam", room: "Room 10" },
      7: { subject: "Pak Studies", teacher: "Miss Ayesha", room: "Room 10" },
      8: { subject: "Islamiat", teacher: "Qari Naeem", room: "Room 10" },
    },
    Tuesday: {
      1: { subject: "Mathematics", teacher: "Sir Usman", room: "Room 10" },
      2: { subject: "English", teacher: "Sir Tariq", room: "Room 10" },
      3: { subject: "Chemistry", teacher: "Sir Waqas", room: "Lab 2" },
      4: { subject: "Physics", teacher: "Sir Kamran", room: "Lab 1" },
      5: { subject: "Urdu", teacher: "Sir Aslam", room: "Room 10" },
      6: { subject: "Biology / CS", teacher: "Sir Bilal", room: "Comp Lab" },
      7: { subject: "Islamiat", teacher: "Qari Naeem", room: "Room 10" },
      8: { subject: "Pak Studies", teacher: "Miss Ayesha", room: "Room 10" },
    },
  },
};

export default function TimetablePage() {
  const [loading, setLoading] = useState(true);
  const [schoolContext, setSchoolContext] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState("Class 10");

  // Schedule matrix: Day -> PeriodNo -> TimetableCell
  const [schedule, setSchedule] = useState<Record<string, Record<number, TimetableCell>>>({});

  // Cell Edit Modal
  const [editingCell, setEditingCell] = useState<{ day: string; period: number } | null>(null);
  const [cellForm, setCellForm] = useState({ subject: "", teacher: "", room: "" });
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const CLASSES = [
    "Play",
    "Nursery",
    "Prep",
    "Class 1",
    "Class 2",
    "Class 3",
    "Class 4",
    "Class 5",
    "Class 6",
    "Class 7",
    "Class 8",
    "Class 9",
    "Class 10",
  ];

  useEffect(() => {
    loadData();
  }, [selectedClass]);

  const loadData = async () => {
    try {
      setLoading(true);
      const ctx = await resolveActiveSchoolContext();
      setSchoolContext(ctx);

      const storeKey = `oa_timetable_${ctx?.schoolId || "all"}_${selectedClass}`;
      let loadedSchedule: Record<string, Record<number, TimetableCell>> = {};

      // 1. Try Supabase
      try {
        let query = supabase.from("timetable").select("*").eq("class_name", selectedClass);
        if (ctx?.schoolId) query = query.eq("school_id", ctx.schoolId);
        const { data: dbRows } = await query;

        if (dbRows && dbRows.length > 0) {
          dbRows.forEach((r: any) => {
            if (!loadedSchedule[r.day_of_week]) loadedSchedule[r.day_of_week] = {};
            loadedSchedule[r.day_of_week][r.period_no] = {
              subject: r.subject_name,
              teacher: r.teacher_name || "",
              room: r.room_no || "",
            };
          });
        }
      } catch (err) {}

      // 2. Fallback to localStorage or default sample
      if (Object.keys(loadedSchedule).length === 0 && typeof window !== "undefined") {
        const local = localStorage.getItem(storeKey);
        if (local) {
          try {
            loadedSchedule = JSON.parse(local);
          } catch (e) {}
        }
      }

      if (Object.keys(loadedSchedule).length === 0) {
        loadedSchedule = DEFAULT_SCHEDULES[selectedClass] || DEFAULT_SCHEDULES["Class 10"] || {};
      }

      setSchedule(loadedSchedule);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCell) return;

    const { day, period } = editingCell;
    const nextSchedule = { ...schedule };
    if (!nextSchedule[day]) nextSchedule[day] = {};

    nextSchedule[day][period] = {
      subject: cellForm.subject || "Free Period",
      teacher: cellForm.teacher,
      room: cellForm.room,
    };

    setSchedule(nextSchedule);

    if (typeof window !== "undefined") {
      const storeKey = `oa_timetable_${schoolContext?.schoolId || "all"}_${selectedClass}`;
      localStorage.setItem(storeKey, JSON.stringify(nextSchedule));
    }

    try {
      await supabase.from("timetable").upsert(
        {
          school_id: schoolContext?.schoolId || null,
          class_name: selectedClass,
          day_of_week: day,
          period_no: period,
          subject_name: cellForm.subject,
          teacher_name: cellForm.teacher,
          room_no: cellForm.room,
        },
        { onConflict: "school_id,class_name,day_of_week,period_no" }
      );
    } catch (e) {}

    setEditingCell(null);
    showToast("success", `Period ${period} on ${day} updated!`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-16 print:bg-white print:p-0">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3 sm:px-6 py-3 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                  Timetable • 8x6 Grid
                </span>
                <h1 className="text-base sm:text-lg font-black text-slate-900">
                  Weekly Class Timetable
                </h1>
              </div>
              <p className="text-[11px] text-slate-500">
                {schoolContext?.schoolName || "Registered School"} • 8 Periods × 6 Days
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-800 cursor-pointer shadow-2xs"
            >
              {CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c} Timetable
                </option>
              ))}
            </select>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Schedule</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-3 sm:p-6 space-y-4 print:p-0 print:max-w-none">
        {toast && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 print:hidden ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toast.text}</span>
          </div>
        )}

        {/* Dynamic School Header for Print */}
        <div className="hidden print:block text-center border-b-2 border-slate-900 pb-3 mb-4">
          <h2 className="text-xl font-black text-slate-900">
            {schoolContext?.schoolName || "Registered School"}
          </h2>
          <p className="text-xs font-bold text-slate-600">
            Official Class Timetable - {selectedClass} (Session 2026-2027)
          </p>
        </div>

        {/* 8x6 Weekly Grid Matrix Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[850px]">
              <thead>
                <tr className="bg-slate-900 text-white font-bold">
                  <th className="p-3 border-r border-slate-800 w-28 text-center uppercase tracking-wider text-[11px]">
                    Day / Period
                  </th>
                  {PERIODS.map((p) => (
                    <th key={p} className="p-2.5 border-r border-slate-800 text-center w-28">
                      <div className="font-bold">Period {p}</div>
                      <div className="text-[9px] font-normal text-slate-400 font-mono mt-0.5">
                        {PERIOD_TIMINGS[p]}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {DAYS.map((day) => (
                  <tr key={day} className="hover:bg-slate-50/70 transition">
                    <td className="p-3 border-r border-slate-200 font-bold bg-slate-50 text-slate-900 text-center text-xs">
                      {day}
                    </td>

                    {PERIODS.map((period) => {
                      const cell = schedule[day]?.[period];

                      return (
                        <td
                          key={period}
                          onClick={() => {
                            setEditingCell({ day, period });
                            setCellForm({
                              subject: cell?.subject || "",
                              teacher: cell?.teacher || "",
                              room: cell?.room || "",
                            });
                          }}
                          className="p-2 border-r border-slate-200 text-center align-top cursor-pointer hover:bg-indigo-50/50 transition group"
                        >
                          {cell ? (
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-900 block text-xs group-hover:text-indigo-700">
                                {cell.subject}
                              </span>
                              <span className="text-[10px] text-slate-500 block truncate">
                                {cell.teacher}
                              </span>
                              {cell.room && (
                                <span className="text-[9px] font-mono text-slate-400 block">
                                  {cell.room}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="py-2 text-slate-300 font-medium text-[10px] group-hover:text-indigo-400">
                              + Assign
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Edit Cell Modal */}
      {editingCell && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Edit Period {editingCell.period}</h3>
                <p className="text-[10px] text-indigo-100">{editingCell.day} • {selectedClass}</p>
              </div>
              <button
                onClick={() => setEditingCell(null)}
                className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCell} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject Name:</label>
                <input
                  type="text"
                  value={cellForm.subject}
                  onChange={(e) => setCellForm({ ...cellForm, subject: e.target.value })}
                  placeholder="e.g. English, Math, Physics"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Teacher Incharge:</label>
                <input
                  type="text"
                  value={cellForm.teacher}
                  onChange={(e) => setCellForm({ ...cellForm, teacher: e.target.value })}
                  placeholder="e.g. Sir Usman, Miss Ayesha"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Room / Lab No:</label>
                <input
                  type="text"
                  value={cellForm.room}
                  onChange={(e) => setCellForm({ ...cellForm, room: e.target.value })}
                  placeholder="e.g. Room 10, Science Lab"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Save Period
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
