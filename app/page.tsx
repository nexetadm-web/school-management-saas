"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { isSuperAdmin } from "@/lib/constants";
import {
  LayoutDashboard,
  Users,
  Receipt,
  GraduationCap,
  Banknote,
  Wallet,
  Plus,
  Trash2,
  Edit2,
  Search,
  CheckCircle,
  Clock,
  TrendingUp,
  School,
  RefreshCw,
  AlertCircle,
  X,
  Sparkles,
  ChevronRight,
  Filter,
  LogOut,
  UserCheck,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Phone,
  Calendar,
  CreditCard,
  User,
  RotateCcw,
  ArrowUpDown,
  Printer,
  Download,
  FileText,
  MessageSquare,
  Send,
  Shield,
} from "lucide-react";
import jsPDF from "jspdf";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// Types
export interface Student {
  id: number;
  school_id?: number;
  name: string;
  class: string;
  father_name: string | null;
  phone: string | null;
  monthly_fee: number;
  created_at?: string;
}

export interface FeeRecord {
  id: number;
  school_id?: number;
  student_id: number;
  month: string;
  amount: number;
  status: string;
  created_at?: string;
  students?: { name: string; class: string } | { name: string; class: string }[];
}

export interface Teacher {
  id: number;
  school_id?: number;
  name: string;
  phone: string | null;
  monthly_salary: number;
  created_at?: string;
}

export interface SalaryRecord {
  id: number;
  school_id?: number;
  teacher_id: number;
  month: string;
  amount: number;
  status: string;
  created_at?: string;
  teachers?: { name: string } | { name: string }[];
}

export interface Expense {
  id: number;
  school_id?: number;
  title: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  created_at?: string;
}

// Helpers
const getInitials = (name: string) => {
  if (!name) return "??";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getAvatarColor = (name: string) => {
  const colors = [
    "bg-purple-100 text-purple-700 border border-purple-200",
    "bg-emerald-100 text-emerald-700 border border-emerald-200",
    "bg-blue-100 text-blue-700 border border-blue-200",
    "bg-amber-100 text-amber-700 border border-amber-200",
    "bg-pink-100 text-pink-700 border border-pink-200",
    "bg-indigo-100 text-indigo-700 border border-indigo-200",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const formatTimeAgo = (dateInput?: string | Date) => {
  if (!dateInput) return "Just now";
  const date = new Date(dateInput);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (isNaN(diffSec) || diffSec < 0) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function Home() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "students" | "fees" | "teachers" | "salary" | "expenses"
  >("dashboard");

  // Auth & Multi-tenant State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [schoolId, setSchoolId] = useState<number | null>(null);
  const [schoolName, setSchoolName] = useState<string>("");

  // Data State - strict empty arrays (NO mock data)
  const [students, setStudents] = useState<Student[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // UI States
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [chartMounted, setChartMounted] = useState<boolean>(false);

  // Student Profile Drawer State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [drawerTab, setDrawerTab] = useState<"overview" | "history">("overview");

  // Fee Receipt Modal State
  const [receiptModalRecord, setReceiptModalRecord] = useState<FeeRecord | null>(null);

  // Bulk WhatsApp Reminder Modal State
  const [isBulkReminderOpen, setIsBulkReminderOpen] = useState<boolean>(false);
  const [selectedReminderIds, setSelectedReminderIds] = useState<number[]>([]);

  // Search & Filter States - Students
  const [studentSearch, setStudentSearch] = useState<string>("");
  const [studentClassFilter, setStudentClassFilter] = useState<string>("all");
  const [studentStatusFilter, setStudentStatusFilter] = useState<"all" | "paid" | "pending">("all");
  const [studentSortOrder, setStudentSortOrder] = useState<"newest" | "oldest">("newest");

  // Search & Filter States - Fee Records
  const [feeStudentSearch, setFeeStudentSearch] = useState<string>("");
  const [feeMonthFilter, setFeeMonthFilter] = useState<string>("all");
  const [feeYearFilter, setFeeYearFilter] = useState<string>("all");
  const [feeClassFilter, setFeeClassFilter] = useState<string>("all");
  const [feeDateFrom, setFeeDateFrom] = useState<string>("");
  const [feeDateTo, setFeeDateTo] = useState<string>("");

  // Current Month helper (e.g. "2026-10")
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Forms State
  const [studentForm, setStudentForm] = useState({
    name: "",
    class: "",
    father_name: "",
    phone: "",
    monthly_fee: "",
  });
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);

  const [feeForm, setFeeForm] = useState({
    student_id: "",
    month: currentMonth,
    amount: "",
    status: "paid",
  });

  const [teacherForm, setTeacherForm] = useState({
    name: "",
    phone: "",
    monthly_salary: "",
  });
  const [editingTeacherId, setEditingTeacherId] = useState<number | null>(null);

  const [salaryForm, setSalaryForm] = useState({
    teacher_id: "",
    month: currentMonth,
    amount: "",
    status: "paid",
  });

  const [expenseForm, setExpenseForm] = useState({
    title: "",
    amount: "",
    type: "expense" as "income" | "expense",
    date: new Date().toISOString().slice(0, 10),
  });

  const showNotification = (type: "success" | "error", message: string) => {
    if (type === "success") {
      setSuccessMsg(message);
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(message);
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

  // Auth Check & Data Fetching (strictly scoped by school_id for multi-tenant isolation)
  const fetchAllData = async (targetSchoolId?: number | string) => {
    const sId = targetSchoolId || schoolId;
    if (!sId) return;
    try {
      setLoading(true);
      const [studentsRes, feeRecordsRes, teachersRes, salaryRecordsRes, expensesRes] = await Promise.all([
        supabase.from("students").select("*").eq("school_id", sId).order("id", { ascending: false }),
        supabase.from("fee_records").select("*, students(name, class)").eq("school_id", sId).order("id", { ascending: false }),
        supabase.from("teachers").select("*").eq("school_id", sId).order("id", { ascending: false }),
        supabase.from("salary_records").select("*, teachers(name)").eq("school_id", sId).order("id", { ascending: false }),
        supabase.from("expenses").select("*").eq("school_id", sId).order("id", { ascending: false }),
      ]);

      setStudents(studentsRes.data || []);
      setFeeRecords(feeRecordsRes.data || []);
      setTeachers(teachersRes.data || []);
      setSalaryRecords(salaryRecordsRes.data || []);
      setExpenses(expensesRes.data || []);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initAuthAndFetch = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Check if redirected with error param (e.g. ?error=Unauthorized)
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const errParam = urlParams.get("error");
        if (errParam) {
          showNotification("error", errParam === "Unauthorized" ? "Unauthorized: Super Admin access required." : errParam);
        }
      }

      setCurrentUser(user);
      const sId = user.user_metadata?.school_id || user.app_metadata?.school_id;
      const sName = user.user_metadata?.school_name || "My School";

      setSchoolName(sName);

      if (sId) {
        setSchoolId(sId);
        await fetchAllData(sId);
      } else {
        setErrorMsg("No school associated with this user. Please sign up or contact support.");
        setLoading(false);
      }
      setChartMounted(true);
    };

    initAuthAndFetch();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Helper getters
  const getStudentName = (rec: FeeRecord) => {
    if (!rec.students) {
      const found = students.find((s) => s.id === rec.student_id);
      return found ? found.name : "Unknown Student";
    }
    if (Array.isArray(rec.students)) return rec.students[0]?.name || "Unknown Student";
    return rec.students.name || "Unknown Student";
  };

  const getStudentClass = (rec: FeeRecord) => {
    if (!rec.students) {
      const found = students.find((s) => s.id === rec.student_id);
      return found ? found.class : "";
    }
    if (Array.isArray(rec.students)) return rec.students[0]?.class || "";
    return rec.students.class || "";
  };

  const getTeacherName = (rec: SalaryRecord) => {
    if (!rec.teachers) {
      const found = teachers.find((t) => t.id === rec.teacher_id);
      return found ? found.name : "Unknown Teacher";
    }
    if (Array.isArray(rec.teachers)) return rec.teachers[0]?.name || "Unknown Teacher";
    return rec.teachers.name || "Unknown Teacher";
  };

  // DASHBOARD COMPUTATIONS
  const totalStudents = students.length;
  const totalTeachers = teachers.length;

  const totalFeesCollectedThisMonth = feeRecords
    .filter(
      (f) =>
        f.status.toLowerCase() === "paid" &&
        (f.month === currentMonth || !f.month)
    )
    .reduce((sum, f) => sum + Number(f.amount || 0), 0);

  const totalFeesCollectedAllTime = feeRecords
    .filter((f) => f.status.toLowerCase() === "paid")
    .reduce((sum, f) => sum + Number(f.amount || 0), 0);

  const pendingFees = feeRecords
    .filter((f) => f.status.toLowerCase() !== "paid")
    .reduce((sum, f) => sum + Number(f.amount || 0), 0);

  const totalSalaryPaidThisMonth = salaryRecords
    .filter(
      (s) =>
        s.status.toLowerCase() === "paid" &&
        (s.month === currentMonth || !s.month)
    )
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);

  const totalSalaryPaidAllTime = salaryRecords
    .filter((s) => s.status.toLowerCase() === "paid")
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);

  const totalOtherExpenses = expenses
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const totalExtraIncome = expenses
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const totalIncome = totalFeesCollectedAllTime + totalExtraIncome;
  const totalExpense = totalSalaryPaidAllTime + totalOtherExpenses;
  const netProfit = totalIncome - totalExpense;

  // Selected Student Profile Statistics
  const selectedStudentFees = useMemo(() => {
    if (!selectedStudent) return [];
    return feeRecords.filter((f) => f.student_id === selectedStudent.id);
  }, [selectedStudent, feeRecords]);

  const selectedStudentPaid = useMemo(() => {
    return selectedStudentFees
      .filter((f) => f.status.toLowerCase() === "paid")
      .reduce((sum, f) => sum + Number(f.amount || 0), 0);
  }, [selectedStudentFees]);

  const selectedStudentPending = useMemo(() => {
    return selectedStudentFees
      .filter((f) => f.status.toLowerCase() !== "paid")
      .reduce((sum, f) => sum + Number(f.amount || 0), 0);
  }, [selectedStudentFees]);

  // Recharts Data Computation - Strictly from database (NO mock fallbacks)
  const feeTrendData = useMemo(() => {
    const monthMap: { [key: string]: { month: string; collected: number; pending: number } } = {};

    feeRecords.forEach((f) => {
      const m = f.month || "Unknown";
      if (!monthMap[m]) {
        monthMap[m] = { month: m, collected: 0, pending: 0 };
      }
      if (f.status.toLowerCase() === "paid") {
        monthMap[m].collected += Number(f.amount || 0);
      } else {
        monthMap[m].pending += Number(f.amount || 0);
      }
    });

    return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
  }, [feeRecords]);

  const expenseBreakdownData = useMemo(() => {
    return [
      { name: "Teacher Salaries", value: totalSalaryPaidAllTime, color: "#ec4899" },
      { name: "Other Expenses", value: totalOtherExpenses, color: "#eab308" },
      { name: "Fees Collected", value: totalFeesCollectedAllTime, color: "#10b981" },
      { name: "Extra Income", value: totalExtraIncome, color: "#06b6d4" },
    ].filter((item) => item.value > 0);
  }, [totalSalaryPaidAllTime, totalOtherExpenses, totalFeesCollectedAllTime, totalExtraIncome]);

  // Recent Activities computed live from database (last 10 items)
  const recentActivities = useMemo(() => {
    const list: Array<{
      id: string;
      type: "student" | "fee" | "teacher" | "expense";
      title: string;
      description: string;
      time: string;
      rawDate?: Date;
    }> = [];

    students.forEach((s) => {
      const dt = s.created_at ? new Date(s.created_at) : new Date();
      list.push({
        id: `s-${s.id}`,
        type: "student",
        title: `${s.name} added`,
        description: `Class ${s.class} • $${s.monthly_fee}/mo`,
        time: formatTimeAgo(s.created_at || dt),
        rawDate: dt,
      });
    });

    feeRecords.forEach((f) => {
      const studentName = getStudentName(f);
      const isPaid = f.status.toLowerCase() === "paid";
      const dt = f.created_at ? new Date(f.created_at) : new Date();
      list.push({
        id: `f-${f.id}`,
        type: "fee",
        title: isPaid ? `Fee $${Number(f.amount).toLocaleString()} collected` : `Fee $${Number(f.amount).toLocaleString()} logged`,
        description: `${studentName} (${f.month})`,
        time: formatTimeAgo(f.created_at || dt),
        rawDate: dt,
      });
    });

    teachers.forEach((t) => {
      const dt = t.created_at ? new Date(t.created_at) : new Date();
      list.push({
        id: `t-${t.id}`,
        type: "teacher",
        title: `${t.name} added`,
        description: `Salary: $${Number(t.monthly_salary).toLocaleString()}`,
        time: formatTimeAgo(t.created_at || dt),
        rawDate: dt,
      });
    });

    expenses.forEach((e) => {
      const dt = e.created_at ? new Date(e.created_at) : new Date(e.date);
      list.push({
        id: `e-${e.id}`,
        type: "expense",
        title: e.type === "income" ? `Income +$${Number(e.amount).toLocaleString()}` : `Expense -$${Number(e.amount).toLocaleString()}`,
        description: e.title,
        time: formatTimeAgo(e.created_at || e.date),
        rawDate: dt,
      });
    });

    list.sort((a, b) => (b.rawDate?.getTime() || 0) - (a.rawDate?.getTime() || 0));
    return list.slice(0, 10);
  }, [students, feeRecords, teachers, expenses]);

  // CRUD Handlers with Double Entry Prevention & Optimistic Updates
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!schoolId) return showNotification("error", "No school associated with session.");
    if (!studentForm.name || !studentForm.class) {
      showNotification("error", "Name and Class are required fields.");
      return;
    }

    const payload = {
      school_id: schoolId,
      name: studentForm.name,
      class: studentForm.class,
      father_name: studentForm.father_name || null,
      phone: studentForm.phone || null,
      monthly_fee: parseFloat(studentForm.monthly_fee) || 0,
    };

    try {
      setIsSaving(true);
      if (editingStudentId) {
        const { data, error } = await supabase
          .from("students")
          .update(payload)
          .eq("id", editingStudentId)
          .eq("school_id", schoolId)
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setStudents((prev) => prev.map((s) => (s.id === editingStudentId ? data : s)));
          if (selectedStudent?.id === editingStudentId) {
            setSelectedStudent(data);
          }
        }
        showNotification("success", "Student updated successfully!");
      } else {
        const { data, error } = await supabase
          .from("students")
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setStudents((prev) => [data, ...prev]);
        }
        showNotification("success", "Student added successfully!");
      }

      setStudentForm({
        name: "",
        class: "",
        father_name: "",
        phone: "",
        monthly_fee: "",
      });
      setEditingStudentId(null);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to save student.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudentId(student.id);
    setStudentForm({
      name: student.name,
      class: student.class,
      father_name: student.father_name || "",
      phone: student.phone || "",
      monthly_fee: student.monthly_fee.toString(),
    });
  };

  const handleDeleteStudent = async (id: number) => {
    if (!confirm("Are you sure you want to delete this student?")) return;
    try {
      setStudents((prev) => prev.filter((s) => s.id !== id));
      if (selectedStudent?.id === id) {
        setSelectedStudent(null);
      }
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);
      if (error) throw error;
      showNotification("success", "Student deleted successfully!");
    } catch (err: any) {
      showNotification("error", err.message || "Failed to delete student.");
      fetchAllData();
    }
  };

  const handleSaveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!schoolId) return showNotification("error", "No school associated with session.");
    if (!feeForm.student_id || !feeForm.amount || !feeForm.month) {
      showNotification("error", "Please select a student, month, and amount.");
      return;
    }

    const payload = {
      school_id: schoolId,
      student_id: parseInt(feeForm.student_id),
      month: feeForm.month,
      amount: parseFloat(feeForm.amount),
      status: feeForm.status,
    };

    try {
      setIsSaving(true);
      const { data, error } = await supabase
        .from("fee_records")
        .insert([payload])
        .select("*, students(name, class)")
        .single();
      if (error) throw error;
      if (data) {
        setFeeRecords((prev) => [data, ...prev]);
        // Open receipt choice modal (do NOT auto-download without asking)
        setReceiptModalRecord(data);
      }
      showNotification("success", "Fee record created! Choose an action for the receipt.");
      setFeeForm({
        student_id: "",
        month: currentMonth,
        amount: "",
        status: "paid",
      });
    } catch (err: any) {
      showNotification("error", err.message || "Failed to add fee record.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkFeePaid = async (id: number) => {
    try {
      setFeeRecords((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: "paid" } : f))
      );
      const { error } = await supabase
        .from("fee_records")
        .update({ status: "paid" })
        .eq("id", id)
        .eq("school_id", schoolId);
      if (error) throw error;
      showNotification("success", "Fee marked as Paid!");
    } catch (err: any) {
      showNotification("error", err.message || "Failed to update fee status.");
      fetchAllData();
    }
  };

  const handleDeleteFee = async (id: number) => {
    if (!confirm("Are you sure you want to delete this fee record?")) return;
    try {
      setFeeRecords((prev) => prev.filter((f) => f.id !== id));
      const { error } = await supabase
        .from("fee_records")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);
      if (error) throw error;
      showNotification("success", "Fee record deleted!");
    } catch (err: any) {
      showNotification("error", err.message || "Failed to delete fee record.");
      fetchAllData();
    }
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!schoolId) return showNotification("error", "No school associated with session.");
    if (!teacherForm.name) {
      showNotification("error", "Teacher name is required.");
      return;
    }

    const payload = {
      school_id: schoolId,
      name: teacherForm.name,
      phone: teacherForm.phone || null,
      monthly_salary: parseFloat(teacherForm.monthly_salary) || 0,
    };

    try {
      setIsSaving(true);
      if (editingTeacherId) {
        const { data, error } = await supabase
          .from("teachers")
          .update(payload)
          .eq("id", editingTeacherId)
          .eq("school_id", schoolId)
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setTeachers((prev) => prev.map((t) => (t.id === editingTeacherId ? data : t)));
        }
        showNotification("success", "Teacher updated!");
      } else {
        const { data, error } = await supabase
          .from("teachers")
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setTeachers((prev) => [data, ...prev]);
        }
        showNotification("success", "Teacher added!");
      }

      setTeacherForm({ name: "", phone: "", monthly_salary: "" });
      setEditingTeacherId(null);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to save teacher.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setEditingTeacherId(teacher.id);
    setTeacherForm({
      name: teacher.name,
      phone: teacher.phone || "",
      monthly_salary: teacher.monthly_salary.toString(),
    });
  };

  const handleDeleteTeacher = async (id: number) => {
    if (!confirm("Are you sure you want to delete this teacher?")) return;
    try {
      setTeachers((prev) => prev.filter((t) => t.id !== id));
      const { error } = await supabase
        .from("teachers")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);
      if (error) throw error;
      showNotification("success", "Teacher deleted!");
    } catch (err: any) {
      showNotification("error", err.message || "Failed to delete teacher.");
      fetchAllData();
    }
  };

  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!schoolId) return showNotification("error", "No school associated with session.");
    if (!salaryForm.teacher_id || !salaryForm.amount || !salaryForm.month) {
      showNotification("error", "Select teacher, month, and enter amount.");
      return;
    }

    const payload = {
      school_id: schoolId,
      teacher_id: parseInt(salaryForm.teacher_id),
      month: salaryForm.month,
      amount: parseFloat(salaryForm.amount),
      status: salaryForm.status,
    };

    try {
      setIsSaving(true);
      const { data, error } = await supabase
        .from("salary_records")
        .insert([payload])
        .select("*, teachers(name)")
        .single();
      if (error) throw error;
      if (data) {
        setSalaryRecords((prev) => [data, ...prev]);
      }
      showNotification("success", "Salary record created!");
      setSalaryForm({
        teacher_id: "",
        month: currentMonth,
        amount: "",
        status: "paid",
      });
    } catch (err: any) {
      showNotification("error", err.message || "Failed to save salary record.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkSalaryPaid = async (id: number) => {
    try {
      setSalaryRecords((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: "paid" } : s))
      );
      const { error } = await supabase
        .from("salary_records")
        .update({ status: "paid" })
        .eq("id", id)
        .eq("school_id", schoolId);
      if (error) throw error;
      showNotification("success", "Salary marked as Paid!");
    } catch (err: any) {
      showNotification("error", err.message || "Failed to update salary.");
      fetchAllData();
    }
  };

  const handleDeleteSalary = async (id: number) => {
    if (!confirm("Are you sure you want to delete this salary record?")) return;
    try {
      setSalaryRecords((prev) => prev.filter((s) => s.id !== id));
      const { error } = await supabase
        .from("salary_records")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);
      if (error) throw error;
      showNotification("success", "Salary record deleted!");
    } catch (err: any) {
      showNotification("error", err.message || "Failed to delete salary.");
      fetchAllData();
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!schoolId) return showNotification("error", "No school associated with session.");
    if (!expenseForm.title || !expenseForm.amount) {
      showNotification("error", "Title and Amount are required.");
      return;
    }

    const payload = {
      school_id: schoolId,
      title: expenseForm.title,
      amount: parseFloat(expenseForm.amount),
      type: expenseForm.type,
      date: expenseForm.date || new Date().toISOString().slice(0, 10),
    };

    try {
      setIsSaving(true);
      const { data, error } = await supabase
        .from("expenses")
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      if (data) {
        setExpenses((prev) => [data, ...prev]);
      }
      showNotification("success", "Expense/Income record saved!");
      setExpenseForm({
        title: "",
        amount: "",
        type: "expense",
        date: new Date().toISOString().slice(0, 10),
      });
    } catch (err: any) {
      showNotification("error", err.message || "Failed to save expense.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm("Are you sure you want to delete this expense record?")) return;
    try {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id)
        .eq("school_id", schoolId);
      if (error) throw error;
      showNotification("success", "Record deleted!");
    } catch (err: any) {
      showNotification("error", err.message || "Failed to delete record.");
      fetchAllData();
    }
  };

  // Helper actions for Drawer
  const handleDrawerCollectFee = (student: Student) => {
    setFeeForm({
      student_id: student.id.toString(),
      month: currentMonth,
      amount: student.monthly_fee.toString(),
      status: "paid",
    });
    setActiveTab("fees");
    setSelectedStudent(null);
  };

  const handleDrawerEditStudent = (student: Student) => {
    handleEditStudent(student);
    setActiveTab("students");
    setSelectedStudent(null);
  };

  // Helper to resolve student father name
  const getStudentFatherName = (rec: FeeRecord) => {
    const found = students.find((s) => s.id === rec.student_id);
    return found ? found.father_name || "N/A" : "N/A";
  };

  // Professional Common Fee Receipt Generator
  const generateFeeReceipt = (
    fee: FeeRecord,
    student?: Student | null,
    sName?: string,
    actionType: "download" | "print" = "download"
  ) => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a5", // Crisp A5 voucher/receipt format
      });

      const effectiveStudent = student || students.find((s) => s.id === fee.student_id);
      const studentName = effectiveStudent?.name || getStudentName(fee);
      const studentClass = effectiveStudent?.class || getStudentClass(fee) || "N/A";
      const fatherName = effectiveStudent?.father_name || getStudentFatherName(fee);
      const isPaid = fee.status.toLowerCase() === "paid";
      const amountNum = Number(fee.amount || 0);
      const currentSchoolName = sName || schoolName || "SMART FEE MANAGER";
      const receiptDate = fee.created_at ? new Date(fee.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }) : new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const paymentRef = `REC-${fee.school_id || "SCH"}-${fee.id.toString().padStart(6, "0")}`;

      // Outer Card Frame
      doc.setDrawColor(226, 232, 240); // #e2e8f0 (border-gray-200)
      doc.setLineWidth(0.8);
      doc.roundedRect(8, 8, 132, 194, 4, 4, "S");

      // Inner Accent Header Background
      doc.setFillColor(248, 250, 252); // #f8fafc
      doc.roundedRect(10, 10, 128, 36, 3, 3, "F");

      // School Logo Placeholder Badge
      doc.setFillColor(147, 51, 234); // #9333ea (purple-600)
      doc.roundedRect(16, 16, 18, 18, 3, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("SF", 25, 28, { align: "center" });

      // School Name & Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(17, 24, 39); // gray-900
      doc.text(currentSchoolName, 38, 22);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text("Official Fee Collection Voucher & Receipt", 38, 28);
      doc.text(`Reference: ${paymentRef}`, 38, 33);

      // Divider Line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(12, 50, 136, 50);

      // Receipt Meta Bar (Receipt No & Issue Date)
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(12, 54, 124, 12, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("RECEIPT NO:", 16, 61.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`#${fee.id}`, 38, 61.5);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text("DATE:", 80, 61.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(receiptDate, 93, 61.5);

      // Student Profile Table Grid
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text("Student & Billing Details", 14, 76);

      const startY = 82;
      const rowH = 9;

      const details = [
        { label: "Student Name", value: studentName },
        { label: "Class / Grade", value: studentClass },
        { label: "Father Name", value: fatherName },
        { label: "Student ID", value: `#${fee.student_id}` },
        { label: "Billing Month", value: fee.month },
        { label: "Payment Status", value: isPaid ? "PAID" : "PENDING" },
      ];

      details.forEach((item, idx) => {
        const curY = startY + idx * rowH;
        // Alternating row background
        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(12, curY - 6, 124, rowH, "F");
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(item.label, 16, curY);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text(item.value, 70, curY);
      });

      // Amount Breakdown Box
      const feeBoxY = 142;
      doc.setFillColor(236, 253, 245); // emerald-50
      doc.setDrawColor(167, 243, 208); // emerald-200
      doc.roundedRect(12, feeBoxY, 124, 26, 3, 3, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(6, 95, 70); // emerald-800
      doc.text("TOTAL FEE AMOUNT COLLECTED", 18, feeBoxY + 9);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(4, 120, 87); // emerald-700
      doc.text(`Rs. ${amountNum.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, 18, feeBoxY + 20);

      // PAID STAMP (Professional Stamp Circle/Box)
      if (isPaid) {
        doc.setDrawColor(16, 185, 129); // emerald-500
        doc.setLineWidth(1.2);
        doc.roundedRect(92, feeBoxY + 4, 38, 17, 2, 2, "S");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(5, 150, 105);
        doc.text("PAID", 111, feeBoxY + 13, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(16, 185, 129);
        doc.text("VERIFIED BY ACCOUNTS", 111, feeBoxY + 18, { align: "center" });
      } else {
        doc.setDrawColor(245, 158, 11); // amber-500
        doc.setLineWidth(1.2);
        doc.roundedRect(92, feeBoxY + 4, 38, 17, 2, 2, "S");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(217, 119, 6);
        doc.text("UNPAID", 111, feeBoxY + 14, { align: "center" });
      }

      // Footer Notes & Signatures
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Computer-generated payment voucher. No signature required.", 14, 178);

      // Signature Lines
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.line(16, 192, 54, 192);
      doc.line(94, 192, 132, 192);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text("Depositor / Student", 35, 196, { align: "center" });
      doc.text("Authorized Signature", 113, 196, { align: "center" });

      // Clean filename requested: receipt_{studentName}_{month}.pdf
      const safeStudent = studentName.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const safeMonth = (fee.month || "month").replace(/[^a-z0-9]/gi, "_");
      const fileName = `receipt_${safeStudent}_${safeMonth}.pdf`;

      if (actionType === "print") {
        doc.autoPrint();
        const blobUrl = doc.output("bloburl");
        window.open(blobUrl, "_blank");
      } else {
        doc.save(fileName);
      }
    } catch (err) {
      console.error("Failed to generate PDF receipt:", err);
      showNotification("error", "Failed to generate receipt PDF.");
    }
  };

  // Wrapper for existing calls
  const generateFeeReceiptPDF = (rec: FeeRecord, action: "download" | "print" = "download") => {
    generateFeeReceipt(rec, null, schoolName, action);
  };

  // WhatsApp Fee Reminder Logic
  const handleSendWhatsAppReminder = (student: Student, overrideAmount?: number, overrideMonth?: string) => {
    const rawPhone = student.phone ? student.phone.trim() : "";
    if (!rawPhone) {
      showNotification("error", "Phone number not found for this student.");
      return;
    }

    // Clean phone number: keep only digits
    let cleanPhone = rawPhone.replace(/[^0-9]/g, "");
    // If Pakistani local number starting with 0 (e.g. 0300...), convert to 92300...
    if (cleanPhone.startsWith("03")) {
      cleanPhone = "92" + cleanPhone.slice(1);
    }

    // Determine pending amount for this month / all pending
    const studentFees = feeRecords.filter((f) => f.student_id === student.id);
    const pendingMonthFee = studentFees.find(
      (f) => f.month === (overrideMonth || currentMonth) && f.status.toLowerCase() !== "paid"
    );
    const amountToRemind = overrideAmount !== undefined
      ? overrideAmount
      : pendingMonthFee
      ? pendingMonthFee.amount
      : student.monthly_fee;

    const fatherNameDisplay = student.father_name?.trim() ? student.father_name.trim() : "Wali";
    const targetMonth = overrideMonth || currentMonth;
    const sName = schoolName || "Our School";

    const message = `Assalam o Alaikum, ${fatherNameDisplay} sb, ${student.name} (Class ${student.class}) ki ${targetMonth} ki fee Rs. ${Number(amountToRemind).toLocaleString()} pending hai. Kindly jama karwa dein. - ${sName}`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  // Pending students this month (for Bulk Reminder Modal)
  const pendingStudentsThisMonth = useMemo(() => {
    return students
      .map((student) => {
        const thisMonthFee = feeRecords.find(
          (f) => f.student_id === student.id && f.month === currentMonth
        );
        const isPaid = thisMonthFee?.status.toLowerCase() === "paid";
        const pendingAmount = thisMonthFee ? Number(thisMonthFee.amount) : Number(student.monthly_fee);

        return {
          student,
          isPaid,
          hasRecord: !!thisMonthFee,
          pendingAmount,
        };
      })
      .filter((item) => !item.isPaid);
  }, [students, feeRecords, currentMonth]);

  // Pro Filter Data Computations
  const uniqueStudentClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.class && s.class.trim()) set.add(s.class.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [students]);

  const uniqueFeeYears = useMemo(() => {
    const set = new Set<string>();
    feeRecords.forEach((f) => {
      if (f.month && f.month.length >= 4) {
        set.add(f.month.slice(0, 4));
      } else if (f.created_at) {
        set.add(new Date(f.created_at).getFullYear().toString());
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [feeRecords]);

  // Combined Students Filter & Sort
  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        // Search by Name or Roll No / ID
        if (studentSearch.trim()) {
          const q = studentSearch.trim().toLowerCase();
          const matchName = s.name.toLowerCase().includes(q);
          const matchId = s.id.toString().includes(q);
          const matchClass = (s.class || "").toLowerCase().includes(q);
          const matchPhone = (s.phone || "").toLowerCase().includes(q);
          if (!matchName && !matchId && !matchClass && !matchPhone) return false;
        }

        // Class Filter
        if (studentClassFilter !== "all") {
          if ((s.class || "").trim().toLowerCase() !== studentClassFilter.trim().toLowerCase()) {
            return false;
          }
        }

        // Status Filter: Based on whether student has pending fees or is all paid
        if (studentStatusFilter !== "all") {
          const sFees = feeRecords.filter((f) => f.student_id === s.id);
          const hasPending = sFees.some((f) => f.status.toLowerCase() !== "paid");
          if (studentStatusFilter === "pending" && !hasPending) return false;
          if (studentStatusFilter === "paid" && (hasPending || sFees.length === 0)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (studentSortOrder === "newest") {
          return b.id - a.id;
        } else {
          return a.id - b.id;
        }
      });
  }, [students, studentSearch, studentClassFilter, studentStatusFilter, studentSortOrder, feeRecords]);

  // Combined Fee Records Filter
  const filteredFeeRecords = useMemo(() => {
    return feeRecords.filter((f) => {
      // Search Student
      if (feeStudentSearch.trim()) {
        const q = feeStudentSearch.trim().toLowerCase();
        const studentName = getStudentName(f).toLowerCase();
        const studentId = f.student_id.toString();
        const stdClass = getStudentClass(f).toLowerCase();
        if (!studentName.includes(q) && !studentId.includes(q) && !stdClass.includes(q)) {
          return false;
        }
      }

      // Filter by Month (e.g. "01" through "12")
      if (feeMonthFilter !== "all") {
        if (!f.month || !f.month.includes(`-${feeMonthFilter}`)) {
          return false;
        }
      }

      // Filter by Year (e.g. "2026")
      if (feeYearFilter !== "all") {
        const yearPart = f.month ? f.month.slice(0, 4) : "";
        if (yearPart !== feeYearFilter) return false;
      }

      // Filter by Class
      if (feeClassFilter !== "all") {
        const stdClass = (getStudentClass(f) || "").trim().toLowerCase();
        if (stdClass !== feeClassFilter.trim().toLowerCase()) return false;
      }

      // Date Range (From - To) based on created_at or record month
      if (feeDateFrom) {
        const recDate = f.created_at ? f.created_at.slice(0, 10) : `${f.month}-01`;
        if (recDate < feeDateFrom) return false;
      }
      if (feeDateTo) {
        const recDate = f.created_at ? f.created_at.slice(0, 10) : `${f.month}-01`;
        if (recDate > feeDateTo) return false;
      }

      return true;
    });
  }, [
    feeRecords,
    feeStudentSearch,
    feeMonthFilter,
    feeYearFilter,
    feeClassFilter,
    feeDateFrom,
    feeDateTo,
    students,
  ]);

  // Summary statistics for filtered Fee Records
  const filteredFeeTotalAmount = useMemo(() => {
    return filteredFeeRecords.reduce((sum, f) => sum + Number(f.amount || 0), 0);
  }, [filteredFeeRecords]);

  const filteredFeePaidCount = useMemo(() => {
    return filteredFeeRecords.filter((f) => f.status.toLowerCase() === "paid").length;
  }, [filteredFeeRecords]);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "students", label: "Students", icon: Users },
    { id: "fees", label: "Fees", icon: Receipt },
    { id: "teachers", label: "Teachers", icon: GraduationCap },
    { id: "salary", label: "Salary", icon: Banknote },
    { id: "expenses", label: "Expenses", icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex font-sans selection:bg-purple-100 selection:text-purple-900">
      {/* 1. LEFT SIDEBAR */}
      <aside className="w-64 shrink-0 hidden lg:flex flex-col justify-between sticky top-0 h-screen p-4 bg-white border-r border-gray-200 z-30 overflow-y-auto">
        <div>
          {/* Logo & Tenant Info */}
          <div className="flex items-center gap-3 px-2 py-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <School className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-gray-900 tracking-wide truncate flex items-center gap-1">
                {schoolName}
                <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              </h1>
              <p className="text-[11px] text-gray-500 truncate">
                ID: #{schoolId || "..."}
              </p>
            </div>
          </div>

          {/* Nav Menu */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-purple-50 text-purple-700 font-semibold border border-purple-200/60 shadow-2xs"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? "text-purple-600" : "text-gray-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-purple-600" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Actions */}
        <div className="pt-4 border-t border-gray-200 space-y-2">
          <div className="px-2 py-1.5 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-gray-700 truncate">
                {currentUser?.email || "Admin"}
              </p>
            </div>
          </div>

          {/* Super Admin Link (Only visible if user email is super admin) */}
          {isSuperAdmin(currentUser?.email) && (
            <Link
              href="/admin"
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-linear-to-r from-purple-50 to-indigo-50 border border-purple-200 text-purple-700 hover:text-purple-900 hover:border-purple-300 font-bold text-xs transition-all shadow-2xs group"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-purple-600 group-hover:scale-110 transition-transform" />
                <span>Super Admin Panel</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-purple-500" />
            </Link>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => fetchAllData()}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-all cursor-pointer"
              title="Sync Database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Sync</span>
            </button>
            <button
              onClick={handleLogout}
              className="py-2 px-3 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer flex items-center justify-center gap-1"
              title="Log Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 2. CENTER MAIN CONTENT */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-8 overflow-y-auto">
        {/* Top Header / Status Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight capitalize">
              {activeTab} Overview
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Multi-Tenant Fee Management Portal for <span className="text-purple-600 font-semibold">{schoolName}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Tenant ID #{schoolId || "..."} Active
            </div>
          </div>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between text-rose-800">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <p className="text-sm font-medium">{errorMsg}</p>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between text-emerald-800">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm font-medium">{successMsg}</p>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* LIGHT PASTEL ACCENT STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Total Students */}
          <div className="rounded-xl p-5 bg-purple-50/70 border border-purple-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between group">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-purple-700">
                Total Students
              </p>
              <h3 className="text-3xl font-extrabold text-gray-900 mt-1 group-hover:scale-105 transition-transform">
                {totalStudents}
              </h3>
              <p className="text-[11px] text-purple-600/80 mt-1">Enrolled students</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-xl shadow-2xs">
              🎓
            </div>
          </div>

          {/* Card 2: Fees Collected */}
          <div className="rounded-xl p-5 bg-emerald-50/70 border border-emerald-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between group">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Fees ({currentMonth})
              </p>
              <h3 className="text-3xl font-extrabold text-emerald-700 mt-1 group-hover:scale-105 transition-transform">
                ${totalFeesCollectedThisMonth.toLocaleString()}
              </h3>
              <p className="text-[11px] text-emerald-600/80 mt-1">
                All time: ${totalFeesCollectedAllTime.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-xl shadow-2xs">
              💰
            </div>
          </div>

          {/* Card 3: Pending Fees */}
          <div className="rounded-xl p-5 bg-amber-50/70 border border-amber-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between group">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Pending Fees
              </p>
              <h3 className="text-3xl font-extrabold text-amber-700 mt-1 group-hover:scale-105 transition-transform">
                ${pendingFees.toLocaleString()}
              </h3>
              <p className="text-[11px] text-amber-600/80 mt-1">Uncollected receivables</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-xl shadow-2xs">
              ⏳
            </div>
          </div>

          {/* Card 4: Total Teachers */}
          <div className="rounded-xl p-5 bg-blue-50/70 border border-blue-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between group">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                Total Teachers
              </p>
              <h3 className="text-3xl font-extrabold text-gray-900 mt-1 group-hover:scale-105 transition-transform">
                {totalTeachers}
              </h3>
              <p className="text-[11px] text-blue-600/80 mt-1">Faculty count</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-xl shadow-2xs">
              👨‍🏫
            </div>
          </div>

          {/* Card 5: Salary Paid */}
          <div className="rounded-xl p-5 bg-rose-50/70 border border-rose-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between group">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-700">
                Salary ({currentMonth})
              </p>
              <h3 className="text-3xl font-extrabold text-rose-700 mt-1 group-hover:scale-105 transition-transform">
                ${totalSalaryPaidThisMonth.toLocaleString()}
              </h3>
              <p className="text-[11px] text-rose-600/80 mt-1">
                All time: ${totalSalaryPaidAllTime.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-xl shadow-2xs">
              💵
            </div>
          </div>

          {/* Card 6: Expenses */}
          <div className="rounded-xl p-5 bg-yellow-50/70 border border-yellow-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between group">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-yellow-800">
                Other Expenses
              </p>
              <h3 className="text-3xl font-extrabold text-yellow-800 mt-1 group-hover:scale-105 transition-transform">
                ${totalOtherExpenses.toLocaleString()}
              </h3>
              <p className="text-[11px] text-yellow-700/80 mt-1">Operational costs</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-yellow-100 border border-yellow-200 flex items-center justify-center text-xl shadow-2xs">
              📊
            </div>
          </div>

          {/* Card 7: Net Profit */}
          <div className="sm:col-span-2 rounded-xl p-5 bg-emerald-50 border border-emerald-200 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between group">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Net Profit (Income - Expenses)
              </p>
              <h3
                className={`text-4xl font-black mt-1 group-hover:scale-105 transition-transform ${
                  netProfit >= 0 ? "text-emerald-700" : "text-rose-600"
                }`}
              >
                ${netProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-emerald-700/80 mt-1">
                Income (${totalIncome.toLocaleString()}) - Expenses (${totalExpense.toLocaleString()})
              </p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-2xl shadow-2xs">
              📈
            </div>
          </div>
        </div>

        {/* TAB 1: DASHBOARD ANALYTICS */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* 2 CHARTS SIDE BY SIDE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Fee Collection Trend */}
              <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                      Fees Collection Trend
                    </h3>
                    <p className="text-xs text-gray-500">Monthly breakdown of collected vs pending fees</p>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-medium">
                    School #{schoolId}
                  </span>
                </div>

                <div className="h-72 w-full pt-4">
                  {chartMounted && feeTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={feeTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            borderColor: "#e2e8f0",
                            borderRadius: "12px",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                            color: "#0f172a",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="collected"
                          name="Collected ($)"
                          stroke="#10b981"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorCollected)"
                        />
                        <Area
                          type="monotone"
                          dataKey="pending"
                          name="Pending ($)"
                          stroke="#f97316"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          fillOpacity={1}
                          fill="url(#colorPending)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs py-12">
                      <Receipt className="w-8 h-8 text-gray-300 mb-2" />
                      <p className="font-medium">No fee collection records yet</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Log fee entries in the Fees tab to see collection trends</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Expense Breakdown */}
              <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-pink-600" />
                    Financial Distribution
                  </h3>
                  <p className="text-xs text-gray-500">Ratio of salaries, fees & expenses</p>
                </div>

                <div className="h-72 w-full flex items-center justify-center pt-4">
                  {chartMounted && expenseBreakdownData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseBreakdownData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={85}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {expenseBreakdownData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            borderColor: "#e2e8f0",
                            borderRadius: "12px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                            color: "#0f172a",
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          formatter={(value) => <span className="text-xs text-gray-600 font-medium">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs py-12">
                      <Wallet className="w-8 h-8 text-gray-300 mb-2" />
                      <p className="font-medium">No financial records yet</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Add fees, salaries, or expenses to view breakdown</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* TRANSACTIONS TABLE */}
            <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-indigo-600" />
                  Recent Transactions Log
                </h3>
                <button
                  onClick={() => setActiveTab("fees")}
                  className="text-xs font-semibold text-purple-600 hover:text-purple-800 cursor-pointer"
                >
                  View All Fees →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Month</th>
                      <th className="py-3 px-4">Class</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {feeRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400">
                          No transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      feeRecords.slice(0, 8).map((rec) => {
                        const name = getStudentName(rec);
                        const initials = getInitials(name);
                        const colorClass = getAvatarColor(name);
                        const isPaid = rec.status.toLowerCase() === "paid";
                        const targetStudent = students.find((st) => st.id === rec.student_id);
                        return (
                          <tr key={rec.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <button
                                onClick={() => {
                                  if (targetStudent) {
                                    setSelectedStudent(targetStudent);
                                    setDrawerTab("overview");
                                  }
                                }}
                                className="flex items-center gap-3 text-left group/std cursor-pointer"
                              >
                                <div
                                  className={`w-9 h-9 rounded-full ${colorClass} flex items-center justify-center font-bold text-xs shrink-0 group-hover/std:scale-105 transition-transform`}
                                >
                                  {initials}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 group-hover/std:text-purple-700 transition-colors">
                                    {name}
                                  </p>
                                  <p className="text-xs text-gray-500">ID #{rec.student_id}</p>
                                </div>
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-gray-700 font-medium">{rec.month}</td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-md text-xs text-gray-700 font-medium">
                                {getStudentClass(rec) || "N/A"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-gray-900">
                              ${Number(rec.amount).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4">
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Paid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {!isPaid && (
                                <button
                                  onClick={() => handleMarkFeePaid(rec.id)}
                                  className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                                >
                                  Mark Paid
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STUDENTS */}
        {activeTab === "students" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-6 h-fit space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                {editingStudentId ? "Edit Student Record" : "Register Student"}
              </h3>
              <form onSubmit={handleSaveStudent} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Student Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Eleanor Vance"
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Class / Grade *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Grade 10-B"
                    value={studentForm.class}
                    onChange={(e) => setStudentForm({ ...studentForm, class: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Father's Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Arthur Vance"
                    value={studentForm.father_name}
                    onChange={(e) => setStudentForm({ ...studentForm, father_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +1 555-0192"
                    value={studentForm.phone}
                    onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Monthly Fee ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 200"
                    value={studentForm.monthly_fee}
                    onChange={(e) => setStudentForm({ ...studentForm, monthly_fee: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-2.5 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-xs transition-all cursor-pointer flex justify-center items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>{editingStudentId ? "Update Student" : "Save Student"}</span>
                      </>
                    )}
                  </button>
                  {editingStudentId && (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        setEditingStudentId(null);
                        setStudentForm({ name: "", class: "", father_name: "", phone: "", monthly_fee: "" });
                      }}
                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold cursor-pointer transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white border border-gray-200 shadow-xs rounded-xl p-6 space-y-4">
              {/* Header & Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    Students
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                      Showing {filteredStudents.length} of {students.length}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500">Click student name to view detailed profile and fee history</p>
                </div>
                {(studentSearch || studentClassFilter !== "all" || studentStatusFilter !== "all" || studentSortOrder !== "newest") && (
                  <button
                    onClick={() => {
                      setStudentSearch("");
                      setStudentClassFilter("all");
                      setStudentStatusFilter("all");
                      setStudentSortOrder("newest");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Pro Filters Row on Top */}
              <div className="p-3.5 bg-gray-50/70 border border-gray-200/80 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Search by Name / Roll No */}
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search Name or Roll No..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-2xs"
                  />
                </div>

                {/* 2. Filter by Class */}
                <div>
                  <select
                    value={studentClassFilter}
                    onChange={(e) => setStudentClassFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="all">All Classes</option>
                    {uniqueStudentClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        Class {cls}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Filter by Status */}
                <div>
                  <select
                    value={studentStatusFilter}
                    onChange={(e) => setStudentStatusFilter(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="all">Status: All Students</option>
                    <option value="paid">All Fees Paid</option>
                    <option value="pending">Has Pending Fees</option>
                  </select>
                </div>

                {/* 4. Sort Order */}
                <div>
                  <select
                    value={studentSortOrder}
                    onChange={(e) => setStudentSortOrder(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-2xs cursor-pointer"
                  >
                    <option value="newest">Sort: Newest First</option>
                    <option value="oldest">Sort: Oldest First</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Class</th>
                      <th className="py-3 px-4">Father's Name</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Monthly Fee</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400">
                          No students registered.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((s) => {
                        const initials = getInitials(s.name);
                        const colorClass = getAvatarColor(s.name);
                        return (
                          <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <button
                                onClick={() => {
                                  setSelectedStudent(s);
                                  setDrawerTab("overview");
                                }}
                                className="flex items-center gap-3 text-left group/std cursor-pointer"
                              >
                                <div
                                  className={`w-9 h-9 rounded-full ${colorClass} flex items-center justify-center font-bold text-xs shrink-0 group-hover/std:scale-105 group-hover/std:ring-2 group-hover/std:ring-purple-400 transition-all`}
                                >
                                  {initials}
                                </div>
                                <div>
                                  <span className="font-semibold text-gray-900 group-hover/std:text-purple-700 transition-colors block">
                                    {s.name}
                                  </span>
                                  <span className="text-[11px] text-gray-400 group-hover/std:text-purple-600 transition-colors block">
                                    View CRM Profile →
                                  </span>
                                </div>
                              </button>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-md text-xs text-gray-700 font-medium">
                                {s.class}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-gray-500">{s.father_name || "-"}</td>
                            <td className="py-3.5 px-4 text-gray-500">{s.phone || "-"}</td>
                            <td className="py-3.5 px-4 font-bold text-emerald-700">
                              ${Number(s.monthly_fee).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-1">
                              {/* WhatsApp Fee Reminder Button */}
                              <button
                                onClick={() => handleSendWhatsAppReminder(s)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                                title="Send WhatsApp Fee Reminder"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
                                <span>Remind</span>
                              </button>
                              <button
                                onClick={() => handleEditStudent(s)}
                                className="p-2 text-gray-400 hover:text-purple-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                title="Edit Student"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(s.id)}
                                className="p-2 text-gray-400 hover:text-rose-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                title="Delete Student"
                              >
                                <Trash2 className="w-4 h-4" />
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
          </div>
        )}

        {/* TAB 3: FEES */}
        {activeTab === "fees" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-6 h-fit space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                Collect / Log Fee
              </h3>
              <form onSubmit={handleSaveFee} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Select Student *</label>
                  <select
                    required
                    value={feeForm.student_id}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedStudent = students.find((s) => s.id.toString() === selectedId);
                      setFeeForm({
                        ...feeForm,
                        student_id: selectedId,
                        amount: selectedStudent ? selectedStudent.monthly_fee.toString() : feeForm.amount,
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  >
                    <option value="">-- Choose Student --</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.class}) - Fee: ${s.monthly_fee}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Month *</label>
                  <input
                    type="month"
                    required
                    value={feeForm.month}
                    onChange={(e) => setFeeForm({ ...feeForm, month: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 200"
                    value={feeForm.amount}
                    onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status *</label>
                  <select
                    value={feeForm.status}
                    onChange={(e) => setFeeForm({ ...feeForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  >
                    <option value="paid">Paid</option>
                    <option value="unpaid">Pending / Unpaid</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-xs transition-all cursor-pointer flex justify-center items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Save Fee Entry</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white border border-gray-200 shadow-xs rounded-xl p-6 space-y-4">
              {/* Header with Title and Clear Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    Fee Collection Records
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Showing {filteredFeeRecords.length} of {feeRecords.length}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500">Search and filter payments across months, years, and student classes</p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                  {/* Bulk WhatsApp Reminders Button */}
                  <button
                    onClick={() => {
                      setSelectedReminderIds(pendingStudentsThisMonth.map((p) => p.student.id));
                      setIsBulkReminderOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
                    title="Send WhatsApp Reminders for this month's pending fees"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
                    <span>Send Due Reminders</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-600 text-white font-bold">
                      {pendingStudentsThisMonth.length}
                    </span>
                  </button>

                  {(feeStudentSearch || feeMonthFilter !== "all" || feeYearFilter !== "all" || feeClassFilter !== "all" || feeDateFrom || feeDateTo) && (
                    <button
                      onClick={() => {
                        setFeeStudentSearch("");
                        setFeeMonthFilter("all");
                        setFeeYearFilter("all");
                        setFeeClassFilter("all");
                        setFeeDateFrom("");
                        setFeeDateTo("");
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Pro Summary Banner */}
              <div className="p-3.5 bg-linear-to-r from-emerald-50/80 via-white to-blue-50/80 border border-emerald-200/70 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-sm">
                    💵
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide block">
                      Filtered Summary
                    </span>
                    <span className="text-sm font-extrabold text-gray-900">
                      Showing {filteredFeeRecords.length} records — Total:{" "}
                      <span className="text-emerald-700 font-black">
                        Rs. {filteredFeeTotalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100/70 text-emerald-800 border border-emerald-200">
                    Paid: {filteredFeePaidCount}
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-100/70 text-amber-800 border border-amber-200">
                    Pending: {filteredFeeRecords.length - filteredFeePaidCount}
                  </span>
                </div>
              </div>

              {/* Pro Filters Row on Top */}
              <div className="p-3.5 bg-gray-50/70 border border-gray-200/80 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* 1. Search Student */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search Student..."
                      value={feeStudentSearch}
                      onChange={(e) => setFeeStudentSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs"
                    />
                  </div>

                  {/* 2. Filter by Month (Jan-Dec) */}
                  <div>
                    <select
                      value={feeMonthFilter}
                      onChange={(e) => setFeeMonthFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs cursor-pointer"
                    >
                      <option value="all">All Months (Jan-Dec)</option>
                      <option value="01">January</option>
                      <option value="02">February</option>
                      <option value="03">March</option>
                      <option value="04">April</option>
                      <option value="05">May</option>
                      <option value="06">June</option>
                      <option value="07">July</option>
                      <option value="08">August</option>
                      <option value="09">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </select>
                  </div>

                  {/* 3. Filter by Year */}
                  <div>
                    <select
                      value={feeYearFilter}
                      onChange={(e) => setFeeYearFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs cursor-pointer"
                    >
                      <option value="all">All Years</option>
                      {uniqueFeeYears.map((yr) => (
                        <option key={yr} value={yr}>
                          Year {yr}
                        </option>
                      ))}
                      {/* Fallback current year if empty */}
                      {!uniqueFeeYears.includes(new Date().getFullYear().toString()) && (
                        <option value={new Date().getFullYear().toString()}>
                          Year {new Date().getFullYear()}
                        </option>
                      )}
                    </select>
                  </div>

                  {/* 4. Filter by Class */}
                  <div>
                    <select
                      value={feeClassFilter}
                      onChange={(e) => setFeeClassFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs cursor-pointer"
                    >
                      <option value="all">All Classes</option>
                      {uniqueStudentClasses.map((cls) => (
                        <option key={cls} value={cls}>
                          Class {cls}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date Range Row (From - To) */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-gray-200/60">
                  <span className="text-xs font-semibold text-gray-500 shrink-0 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    Date Range:
                  </span>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="date"
                      value={feeDateFrom}
                      onChange={(e) => setFeeDateFrom(e.target.value)}
                      placeholder="From"
                      title="Date From"
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs w-full sm:w-36"
                    />
                    <span className="text-xs text-gray-400">to</span>
                    <input
                      type="date"
                      value={feeDateTo}
                      onChange={(e) => setFeeDateTo(e.target.value)}
                      placeholder="To"
                      title="Date To"
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs w-full sm:w-36"
                    />
                  </div>
                  {(feeDateFrom || feeDateTo) && (
                    <button
                      onClick={() => {
                        setFeeDateFrom("");
                        setFeeDateTo("");
                      }}
                      className="text-[11px] text-gray-500 hover:text-emerald-700 underline cursor-pointer"
                    >
                      Clear Range
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Class</th>
                      <th className="py-3 px-4">Month</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredFeeRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400">
                          No fee records found.
                        </td>
                      </tr>
                    ) : (
                      filteredFeeRecords.map((rec) => {
                        const name = getStudentName(rec);
                        const initials = getInitials(name);
                        const colorClass = getAvatarColor(name);
                        const isPaid = rec.status.toLowerCase() === "paid";
                        const targetStudent = students.find((st) => st.id === rec.student_id);
                        return (
                          <tr key={rec.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <button
                                onClick={() => {
                                  if (targetStudent) {
                                    setSelectedStudent(targetStudent);
                                    setDrawerTab("history");
                                  }
                                }}
                                className="flex items-center gap-3 text-left group/std cursor-pointer"
                              >
                                <div
                                  className={`w-9 h-9 rounded-full ${colorClass} flex items-center justify-center font-bold text-xs shrink-0 group-hover/std:scale-105 transition-transform`}
                                >
                                  {initials}
                                </div>
                                <span className="font-semibold text-gray-900 group-hover/std:text-purple-700 transition-colors">
                                  {name}
                                </span>
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-gray-700">{getStudentClass(rec)}</td>
                            <td className="py-3.5 px-4 text-gray-700">{rec.month}</td>
                            <td className="py-3.5 px-4 font-bold text-gray-900">${Number(rec.amount).toFixed(2)}</td>
                            <td className="py-3.5 px-4">
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                                  Paid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-1">
                              {/* Re-generate / View Receipt Button */}
                              <button
                                onClick={() => {
                                  setReceiptModalRecord(rec);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold cursor-pointer transition-all shadow-2xs"
                                title="Download or Print Receipt"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>Receipt</span>
                              </button>
                              {!isPaid && (
                                <button
                                  onClick={() => handleMarkFeePaid(rec.id)}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                                >
                                  Paid
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteFee(rec.id)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
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
          </div>
        )}

        {/* TAB 4: TEACHERS */}
        {activeTab === "teachers" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-6 h-fit space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                {editingTeacherId ? "Edit Teacher" : "Add Teacher"}
              </h3>
              <form onSubmit={handleSaveTeacher} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Teacher Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Marcus Vance"
                    value={teacherForm.name}
                    onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +1 555-0988"
                    value={teacherForm.phone}
                    onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Monthly Salary ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1500"
                    value={teacherForm.monthly_salary}
                    onChange={(e) => setTeacherForm({ ...teacherForm, monthly_salary: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-xs transition-all cursor-pointer flex justify-center items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>{editingTeacherId ? "Update Teacher" : "Save Teacher"}</span>
                      </>
                    )}
                  </button>
                  {editingTeacherId && (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        setEditingTeacherId(null);
                        setTeacherForm({ name: "", phone: "", monthly_salary: "" });
                      }}
                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold cursor-pointer transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white border border-gray-200 shadow-xs rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Teachers Roster ({teachers.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                      <th className="py-3 px-4">Teacher</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Monthly Salary</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {teachers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400">
                          No teachers added.
                        </td>
                      </tr>
                    ) : (
                      teachers.map((t) => {
                        const initials = getInitials(t.name);
                        const colorClass = getAvatarColor(t.name);
                        return (
                          <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-full ${colorClass} flex items-center justify-center font-bold text-xs shrink-0`}
                                >
                                  {initials}
                                </div>
                                <span className="font-semibold text-gray-900">{t.name}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-gray-500">{t.phone || "-"}</td>
                            <td className="py-3.5 px-4 font-bold text-blue-700">
                              ${Number(t.monthly_salary).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-1">
                              <button
                                onClick={() => handleEditTeacher(t)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTeacher(t.id)}
                                className="p-2 text-gray-400 hover:text-rose-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
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
          </div>
        )}

        {/* TAB 5: SALARY */}
        {activeTab === "salary" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-6 h-fit space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-pink-600" />
                Record Salary Payment
              </h3>
              <form onSubmit={handleSaveSalary} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Select Teacher *</label>
                  <select
                    required
                    value={salaryForm.teacher_id}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedTeacher = teachers.find((t) => t.id.toString() === selectedId);
                      setSalaryForm({
                        ...salaryForm,
                        teacher_id: selectedId,
                        amount: selectedTeacher ? selectedTeacher.monthly_salary.toString() : salaryForm.amount,
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
                  >
                    <option value="">-- Choose Teacher --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} - Salary: ${t.monthly_salary}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Month *</label>
                  <input
                    type="month"
                    required
                    value={salaryForm.month}
                    onChange={(e) => setSalaryForm({ ...salaryForm, month: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 1500"
                    value={salaryForm.amount}
                    onChange={(e) => setSalaryForm({ ...salaryForm, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status *</label>
                  <select
                    value={salaryForm.status}
                    onChange={(e) => setSalaryForm({ ...salaryForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
                  >
                    <option value="paid">Paid</option>
                    <option value="unpaid">Pending / Unpaid</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-2.5 px-4 rounded-lg bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-xs transition-all cursor-pointer flex justify-center items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Save Salary Entry</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white border border-gray-200 shadow-xs rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Salary Disbursements</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                      <th className="py-3 px-4">Teacher</th>
                      <th className="py-3 px-4">Month</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {salaryRecords.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">
                          No salary logs recorded.
                        </td>
                      </tr>
                    ) : (
                      salaryRecords.map((rec) => {
                        const name = getTeacherName(rec);
                        const initials = getInitials(name);
                        const colorClass = getAvatarColor(name);
                        const isPaid = rec.status.toLowerCase() === "paid";
                        return (
                          <tr key={rec.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-9 h-9 rounded-full ${colorClass} flex items-center justify-center font-bold text-xs shrink-0`}
                                >
                                  {initials}
                                </div>
                                <span className="font-semibold text-gray-900">{name}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-gray-700">{rec.month}</td>
                            <td className="py-3.5 px-4 font-bold text-gray-900">${Number(rec.amount).toFixed(2)}</td>
                            <td className="py-3.5 px-4">
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                                  Paid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-1">
                              {!isPaid && (
                                <button
                                  onClick={() => handleMarkSalaryPaid(rec.id)}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                                >
                                  Paid
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteSalary(rec.id)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
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
          </div>
        )}

        {/* TAB 6: EXPENSES */}
        {activeTab === "expenses" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-6 h-fit space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-600" />
                Add Income / Expense
              </h3>
              <form onSubmit={handleSaveExpense} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Utility Bills or Book Sale"
                    value={expenseForm.title}
                    onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 350"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Type *</label>
                  <select
                    value={expenseForm.type}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, type: e.target.value as "income" | "expense" })
                    }
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  >
                    <option value="expense">Expense (Outflow)</option>
                    <option value="income">Income (Inflow)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-xs transition-all cursor-pointer flex justify-center items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Save Record</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50/80 rounded-xl p-4 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-emerald-700 uppercase">Extra Income</p>
                    <p className="text-2xl font-extrabold text-emerald-800 mt-1">+${totalExtraIncome.toLocaleString()}</p>
                  </div>
                  <ArrowUpRight className="w-8 h-8 text-emerald-600" />
                </div>
                <div className="bg-rose-50/80 rounded-xl p-4 border border-rose-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-rose-700 uppercase">Other Expenses</p>
                    <p className="text-2xl font-extrabold text-rose-800 mt-1">-${totalOtherExpenses.toLocaleString()}</p>
                  </div>
                  <ArrowDownRight className="w-8 h-8 text-rose-600" />
                </div>
              </div>

              <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-gray-900">Expenses & Income Log</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Title</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {expenses.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-400">
                            No expenses logged.
                          </td>
                        </tr>
                      ) : (
                        expenses.map((e) => (
                          <tr key={e.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="py-3.5 px-4 text-gray-500">{e.date}</td>
                            <td className="py-3.5 px-4 font-semibold text-gray-900">{e.title}</td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full uppercase ${
                                  e.type === "income"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {e.type}
                              </span>
                            </td>
                            <td
                              className={`py-3.5 px-4 font-bold ${
                                e.type === "income" ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              {e.type === "income" ? "+" : "-"}${Number(e.amount).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => handleDeleteExpense(e.id)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. RIGHT SIDEBAR RAIL (320px wide, fixed rail on desktop) */}
      <aside className="w-[320px] shrink-0 hidden xl:flex flex-col justify-between sticky top-0 h-screen bg-white border-l border-gray-200 p-4 z-20 overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0 space-y-5 overflow-hidden">
          {/* A) Quick Actions on top (2x2 grid buttons: Add Student, Collect Fee, Add Teacher, Add Expense) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Quick Actions
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveTab("students")}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200/80 text-purple-700 font-semibold text-xs transition-all cursor-pointer group"
              >
                <Users className="w-4 h-4 mb-1 text-purple-600 group-hover:scale-110 transition-transform" />
                <span>Add Student</span>
              </button>

              <button
                onClick={() => setActiveTab("fees")}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-700 font-semibold text-xs transition-all cursor-pointer group"
              >
                <Receipt className="w-4 h-4 mb-1 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span>Collect Fee</span>
              </button>

              <button
                onClick={() => setActiveTab("teachers")}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200/80 text-blue-700 font-semibold text-xs transition-all cursor-pointer group"
              >
                <GraduationCap className="w-4 h-4 mb-1 text-blue-600 group-hover:scale-110 transition-transform" />
                <span>Add Teacher</span>
              </button>

              <button
                onClick={() => setActiveTab("expenses")}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-700 font-semibold text-xs transition-all cursor-pointer group"
              >
                <Wallet className="w-4 h-4 mb-1 text-amber-600 group-hover:scale-110 transition-transform" />
                <span>Add Expense</span>
              </button>
            </div>
          </div>

          {/* B) Recent Activities below it (scrollable list of last 10 activities with icons, name, and "2m ago" style time) */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-purple-600" />
                Recent Activity
              </h3>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Live
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {recentActivities.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs">
                  <Clock className="w-6 h-6 mx-auto mb-1.5 text-gray-300" />
                  <p className="font-medium">No recent activities</p>
                  <p className="text-[10px] text-gray-400">Actions appear here in real-time</p>
                </div>
              ) : (
                recentActivities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start justify-between gap-2.5 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 ${
                          act.type === "student"
                            ? "bg-purple-100 text-purple-700"
                            : act.type === "fee"
                            ? "bg-emerald-100 text-emerald-700"
                            : act.type === "teacher"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {act.type === "student" && <Users className="w-3.5 h-3.5" />}
                        {act.type === "fee" && <Receipt className="w-3.5 h-3.5" />}
                        {act.type === "teacher" && <GraduationCap className="w-3.5 h-3.5" />}
                        {act.type === "expense" && <Wallet className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{act.title}</p>
                        <p className="text-[11px] text-gray-500 truncate">{act.description}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0 mt-0.5 font-medium">
                      {act.time}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* C) At bottom of rail: School info card. */}
        <div className="pt-3 mt-3 border-t border-gray-200">
          <div className="p-3 bg-gradient-to-br from-purple-50/70 to-indigo-50/70 border border-purple-100 rounded-xl">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                <School className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{schoolName}</p>
                <p className="text-[10px] text-gray-500">School ID #{schoolId || "..."}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-600 pt-2 border-t border-purple-100">
              <span className="truncate max-w-[150px]">{currentUser?.email || "Admin"}</span>
              <span className="font-semibold text-emerald-700 flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* 4. STUDENT CRM PROFILE DRAWER (500px wide from right) */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            onClick={() => setSelectedStudent(null)}
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px] transition-opacity cursor-pointer"
          />

          {/* Drawer Container */}
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-[500px] bg-white border-l border-gray-200 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
              {/* Drawer Header */}
              <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-purple-50/50 via-white to-gray-50 relative">
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-white rounded-xl transition-all border border-transparent hover:border-gray-200 cursor-pointer"
                  title="Close Drawer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-start gap-4">
                  {/* Student Photo Placeholder / Avatar */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-xl shadow-md shrink-0">
                    {getInitials(selectedStudent.name)}
                  </div>
                  <div className="min-w-0 pr-8">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-gray-900 truncate">
                        {selectedStudent.name}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                        {selectedStudent.class}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                      <span>Roll No / ID: <span className="font-semibold text-gray-700">#{selectedStudent.id}</span></span>
                      <span>•</span>
                      <span>Fee: <span className="font-semibold text-emerald-600">${Number(selectedStudent.monthly_fee).toFixed(2)}/mo</span></span>
                    </p>
                    <div className="mt-2.5 flex items-center gap-4 text-xs text-gray-600">
                      <span className="flex items-center gap-1 truncate">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        {selectedStudent.father_name ? `Father: ${selectedStudent.father_name}` : "No Father Name"}
                      </span>
                      <span className="flex items-center gap-1 truncate">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {selectedStudent.phone || "No phone"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Drawer Tabs */}
                <div className="flex gap-4 mt-6 border-b border-gray-200 -mb-6">
                  <button
                    onClick={() => setDrawerTab("overview")}
                    className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                      drawerTab === "overview"
                        ? "border-purple-600 text-purple-700"
                        : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Overview</span>
                  </button>
                  <button
                    onClick={() => setDrawerTab("history")}
                    className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                      drawerTab === "history"
                        ? "border-purple-600 text-purple-700"
                        : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Fee History</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                      {selectedStudentFees.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* CRM STATS CARDS */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Total Paid</p>
                    <p className="text-xl font-extrabold text-emerald-700 mt-1">
                      ${selectedStudentPaid.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">Cleared dues</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Pending</p>
                    <p className="text-xl font-extrabold text-amber-700 mt-1">
                      ${selectedStudentPending.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-amber-600 mt-0.5">Outstanding</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                    <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Months</p>
                    <p className="text-xl font-extrabold text-blue-700 mt-1">
                      {selectedStudentFees.length}
                    </p>
                    <p className="text-[10px] text-blue-600 mt-0.5">Billing logs</p>
                  </div>
                </div>

                {/* TAB 1: OVERVIEW */}
                {drawerTab === "overview" && (
                  <div className="space-y-6">
                    {/* Student Information Card */}
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3">
                      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-purple-600" />
                        Student Information
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-gray-400">Class / Grade</p>
                          <p className="font-semibold text-gray-900 mt-0.5">{selectedStudent.class}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Monthly Tuition Fee</p>
                          <p className="font-semibold text-emerald-700 mt-0.5">${Number(selectedStudent.monthly_fee).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Father's Name</p>
                          <p className="font-semibold text-gray-900 mt-0.5">{selectedStudent.father_name || "Not specified"}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Contact Number</p>
                          <p className="font-semibold text-gray-900 mt-0.5">{selectedStudent.phone || "Not specified"}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Enrolled Since</p>
                          <p className="font-semibold text-gray-900 mt-0.5">
                            {selectedStudent.created_at
                              ? new Date(selectedStudent.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : "Recently"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Account Status</p>
                          <p className="font-semibold text-emerald-700 mt-0.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active Student
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Latest 3 Fees Preview */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                          Recent Fee Activity
                        </h3>
                        <button
                          onClick={() => setDrawerTab("history")}
                          className="text-xs font-semibold text-purple-600 hover:text-purple-800 cursor-pointer"
                        >
                          View all ({selectedStudentFees.length}) →
                        </button>
                      </div>

                      {selectedStudentFees.length === 0 ? (
                        <div className="p-6 text-center rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs">
                          <CreditCard className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                          <p className="font-medium">No fees logged for this student yet</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Click "Collect Fee" below to record the first payment</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedStudentFees.slice(0, 3).map((f) => {
                            const isPaid = f.status.toLowerCase() === "paid";
                            return (
                              <div
                                key={f.id}
                                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs"
                              >
                                <div>
                                  <p className="font-bold text-gray-900">{f.month}</p>
                                  <p className="text-[11px] text-gray-500">
                                    {f.created_at ? new Date(f.created_at).toLocaleDateString() : "Logged"}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-extrabold text-gray-900">${Number(f.amount).toFixed(2)}</span>
                                  {isPaid ? (
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      Paid
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                      Pending
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: FEE HISTORY */}
                {drawerTab === "history" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                        Complete Fee Records
                      </h3>
                      <span className="text-xs text-gray-500 font-medium">
                        Total {selectedStudentFees.length} entries
                      </span>
                    </div>

                    {selectedStudentFees.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl border border-dashed border-gray-200 text-gray-400 text-xs space-y-3">
                        <CreditCard className="w-10 h-10 mx-auto text-gray-300" />
                        <div>
                          <p className="font-bold text-gray-700 text-sm">No fee records found</p>
                          <p className="text-gray-500 mt-1">This student has no past payment history recorded yet.</p>
                        </div>
                        <button
                          onClick={() => handleDrawerCollectFee(selectedStudent)}
                          className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold text-xs shadow-xs hover:bg-purple-700 cursor-pointer transition-all"
                        >
                          Collect First Fee
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                              <th className="py-2.5 px-3">Month</th>
                              <th className="py-2.5 px-3">Amount</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {selectedStudentFees.map((f) => {
                              const isPaid = f.status.toLowerCase() === "paid";
                              return (
                                <tr key={f.id} className="hover:bg-gray-50/80 transition-colors">
                                  <td className="py-2.5 px-3 font-bold text-gray-900">{f.month}</td>
                                  <td className="py-2.5 px-3 font-semibold text-gray-900">
                                    ${Number(f.amount).toFixed(2)}
                                  </td>
                                  <td className="py-2.5 px-3 text-gray-500">
                                    {f.created_at ? new Date(f.created_at).toLocaleDateString() : f.month}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {isPaid ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        Paid
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                        Pending
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-right space-x-1">
                                    <button
                                      onClick={() => {
                                        setReceiptModalRecord(f);
                                      }}
                                      className="px-2 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-semibold cursor-pointer transition-all inline-flex items-center gap-1 shadow-2xs"
                                      title="View / Download Receipt"
                                    >
                                      <Receipt className="w-3 h-3" />
                                      <span>Receipt</span>
                                    </button>
                                    {!isPaid && (
                                      <button
                                        onClick={() => handleMarkFeePaid(f.id)}
                                        className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-semibold text-[10px] hover:bg-emerald-700 cursor-pointer transition-all"
                                      >
                                        Mark Paid
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Drawer Action Bar (Footer) */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center gap-2">
                <button
                  onClick={() => handleDrawerCollectFee(selectedStudent)}
                  className="flex-1 py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Collect Fee</span>
                </button>

                <button
                  onClick={() => handleDrawerEditStudent(selectedStudent)}
                  className="py-2.5 px-3.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  onClick={() => handleDeleteStudent(selectedStudent.id)}
                  className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                  title="Delete Student"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FEE RECEIPT CHOICE MODAL */}
      {receiptModalRecord && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shadow-2xs">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Fee Receipt</h3>
                  <p className="text-xs text-gray-500">What do you want to do with this receipt?</p>
                </div>
              </div>
              <button
                onClick={() => setReceiptModalRecord(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Summary Card */}
            <div className="p-5 space-y-4">
              <div className="p-4 bg-linear-to-b from-purple-50/40 via-white to-gray-50/40 border border-gray-200 rounded-xl space-y-3 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div>
                    <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider block">
                      {schoolName || "Smart Fee Manager"}
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {getStudentName(receiptModalRecord)}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      receiptModalRecord.status.toLowerCase() === "paid"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {receiptModalRecord.status.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400 block">Class / Grade</span>
                    <span className="font-semibold text-gray-800">{getStudentClass(receiptModalRecord) || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Billing Month</span>
                    <span className="font-semibold text-gray-800">{receiptModalRecord.month}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Father Name</span>
                    <span className="font-semibold text-gray-800">{getStudentFatherName(receiptModalRecord)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Receipt ID</span>
                    <span className="font-semibold text-gray-800">#{receiptModalRecord.id}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600">Total Fee Amount</span>
                  <span className="text-lg font-black text-emerald-700">
                    Rs. {Number(receiptModalRecord.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Two Big Action Buttons with Icons */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => {
                    generateFeeReceipt(receiptModalRecord, null, schoolName, "download");
                    setReceiptModalRecord(null);
                  }}
                  className="py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-xs flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.99]"
                >
                  <Download className="w-5 h-5" />
                  <span>Download PDF</span>
                </button>

                <button
                  onClick={() => {
                    generateFeeReceipt(receiptModalRecord, null, schoolName, "print");
                    setReceiptModalRecord(null);
                  }}
                  className="py-3 px-4 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-900 font-semibold text-xs border border-gray-300 shadow-2xs flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.99]"
                >
                  <Printer className="w-5 h-5 text-gray-700" />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>

            {/* Modal Footer with Cancel Button */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setReceiptModalRecord(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK WHATSAPP FEE REMINDER MODAL */}
      {isBulkReminderOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-emerald-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                  <MessageSquare className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    Send Due Fee Reminders
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {currentMonth}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-600">
                    Send WhatsApp fee reminder messages to parents for unpaid dues
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkReminderOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Subheader & Bulk Selection Controls */}
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200/70 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 font-semibold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      pendingStudentsThisMonth.length > 0 &&
                      selectedReminderIds.length === pendingStudentsThisMonth.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedReminderIds(pendingStudentsThisMonth.map((p) => p.student.id));
                      } else {
                        setSelectedReminderIds([]);
                      }
                    }}
                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Select All ({pendingStudentsThisMonth.length})</span>
                </label>
              </div>
              <span className="text-gray-500">
                Selected: <strong className="text-emerald-700">{selectedReminderIds.length}</strong> students
              </span>
            </div>

            {/* Students List with Checkboxes and Individual WhatsApp Send Button */}
            <div className="flex-1 overflow-y-auto p-5 divide-y divide-gray-100">
              {pendingStudentsThisMonth.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="text-sm font-semibold text-gray-800">All fees paid for this month!</p>
                  <p className="text-xs text-gray-500">There are no pending student dues for {currentMonth}.</p>
                </div>
              ) : (
                pendingStudentsThisMonth.map(({ student, pendingAmount }) => {
                  const isChecked = selectedReminderIds.includes(student.id);
                  const hasPhone = !!student.phone && student.phone.trim().length > 0;
                  const initials = getInitials(student.name);
                  const colorClass = getAvatarColor(student.name);

                  return (
                    <div
                      key={student.id}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-gray-50/80 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedReminderIds((prev) => [...prev, student.id]);
                            } else {
                              setSelectedReminderIds((prev) => prev.filter((id) => id !== student.id));
                            }
                          }}
                          className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer shrink-0"
                        />
                        <div
                          className={`w-9 h-9 rounded-full ${colorClass} flex items-center justify-center font-bold text-xs shrink-0`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {student.name}
                            <span className="ml-2 font-normal text-gray-500">Class {student.class}</span>
                          </p>
                          <p className="text-[11px] text-gray-500 truncate flex items-center gap-1.5">
                            <span>Father: {student.father_name || "N/A"}</span>
                            <span>•</span>
                            <span className={hasPhone ? "text-emerald-700 font-medium" : "text-rose-500"}>
                              {hasPhone ? student.phone : "No phone number"}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-bold text-amber-700">Rs. {pendingAmount.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400">Due for {currentMonth}</p>
                        </div>
                        <button
                          onClick={() => handleSendWhatsAppReminder(student, pendingAmount, currentMonth)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
                          title="Open WhatsApp chat for this student"
                        >
                          <MessageSquare className="w-3.5 h-3.5 fill-white" />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Clicking WhatsApp opens WhatsApp with the pre-filled reminder template.
              </span>
              <button
                onClick={() => setIsBulkReminderOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
