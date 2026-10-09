"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { isSuperAdmin } from "@/lib/constants";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  Wallet,
  Banknote,
  Receipt,
  Plus,
  Trash2,
  Edit2,
  Search,
  CheckCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  X,
  ChevronRight,
  Filter,
  LogOut,
  UserCheck,
  Activity,
  Calendar,
  CreditCard,
  User,
  Shield,
  Menu,
  DollarSign,
  BarChart3,
  PieChart,
  Info,
  ShoppingBag,
  Bell,
  Globe,
  Building,
  FileText,
  MessageCircle,
  Sparkles,
  Award,
  BookOpen,
  FileCheck,
  BookMarked,
  Book,
  Coins,
} from "lucide-react";
import { jsPDF } from "jspdf";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
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

export default function Home() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "students" | "teachers" | "fees" | "salary" | "expenses"
  >("dashboard");

  // Auth & Multi-tenant State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [schoolId, setSchoolId] = useState<number | string | null>(null);
  const [schoolName, setSchoolName] = useState<string>("OA Smart School");
  const [availableSchools, setAvailableSchools] = useState<
    Array<{ id: string | number; name: string; city?: string | null }>
  >([]);
  const [isSuperAdminUser, setIsSuperAdminUser] = useState<boolean>(false);

  // Data State
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState<boolean>(false);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  // Search & Filter States
  const [studentSearch, setStudentSearch] = useState<string>("");
  const [feeMonthFilter, setFeeMonthFilter] = useState<string>("all");

  // Dates
  const now = new Date();
  const currentYear = now.getFullYear().toString();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

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

  // Helper to dynamically resolve school_id from schools table using owner_email
  const resolveSchoolId = async (userEmail?: string | null): Promise<string | number | null> => {
    if (!userEmail) return schoolId;
    try {
      const { data: schoolData } = await supabase
        .from("schools")
        .select("id, name")
        .eq("owner_email", userEmail)
        .maybeSingle();

      if (schoolData && schoolData.id) {
        setSchoolName(schoolData.name || "OA Smart School");
        setSchoolId(schoolData.id);
        return schoolData.id;
      }
    } catch (err) {
      console.error("Error fetching school by owner_email:", err);
    }
    return schoolId;
  };

  // Helper to determine active school_id for writes
  const getActionSchoolId = async (): Promise<string | number | null> => {
    if (schoolId && schoolId !== "all") return schoolId;
    const resolved = await resolveSchoolId(currentUser?.email);
    if (resolved && resolved !== "all") return resolved;
    if (availableSchools.length > 0) return availableSchools[0].id;
    return schoolId;
  };

  // Auth Check & Data Fetching (Supports "all" or specific school_id)
  const fetchAllData = async (targetSchoolId?: number | string | null) => {
    const sId = targetSchoolId !== undefined ? targetSchoolId : schoolId;
    if (!sId) return;
    try {
      setLoading(true);

      let studentsQuery = supabase.from("students").select("*").order("id", { ascending: false });
      let feeQuery = supabase.from("fee_records").select("*, students(name, class)").order("id", { ascending: false });
      let teachersQuery = supabase.from("teachers").select("*").order("id", { ascending: false });
      let salaryQuery = supabase.from("salary_records").select("*, teachers(name)").order("id", { ascending: false });
      let expensesQuery = supabase.from("expenses").select("*").order("id", { ascending: false });

      // If specific school selected, apply school_id filter; if "all", fetch cross-tenant aggregation
      if (sId && sId !== "all") {
        studentsQuery = studentsQuery.eq("school_id", sId);
        feeQuery = feeQuery.eq("school_id", sId);
        teachersQuery = teachersQuery.eq("school_id", sId);
        salaryQuery = salaryQuery.eq("school_id", sId);
        expensesQuery = expensesQuery.eq("school_id", sId);
      }

      const [studentsRes, feeRecordsRes, teachersRes, salaryRecordsRes, expensesRes] = await Promise.all([
        studentsQuery,
        feeQuery,
        teachersQuery,
        salaryQuery,
        expensesQuery,
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

  // Switcher Handler for Super Admin
  const handleSelectSchool = async (selectedId: string) => {
    setSchoolId(selectedId);
    if (typeof window !== "undefined") {
      localStorage.setItem("oa_superadmin_selected_school_id", selectedId);
    }

    if (selectedId === "all") {
      setSchoolName("All Schools (Aggregated View)");
      if (typeof window !== "undefined") {
        localStorage.setItem("oa_superadmin_selected_school_name", "All Schools");
      }
    } else {
      const matched = availableSchools.find((s) => String(s.id) === String(selectedId));
      if (matched) {
        setSchoolName(matched.name);
        if (typeof window !== "undefined") {
          localStorage.setItem("oa_superadmin_selected_school_name", matched.name);
        }
      }
    }

    await fetchAllData(selectedId);
    showNotification(
      "success",
      selectedId === "all"
        ? "Switched to All Schools (Aggregated View)"
        : `Switched context to ${availableSchools.find((s) => String(s.id) === String(selectedId))?.name || "Selected School"}`
    );
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

      setCurrentUser(user);

      // Verify if Super Admin
      const isSuper = isSuperAdmin(user.email) || user.email === "mnuhbhatti333@gmail.com";
      setIsSuperAdminUser(isSuper);

      let schoolsList: Array<{ id: string | number; name: string; city?: string | null }> = [];
      if (isSuper) {
        const { data: allSchools } = await supabase
          .from("schools")
          .select("id, name, city")
          .order("id", { ascending: true });
        schoolsList = allSchools || [];
        setAvailableSchools(schoolsList);
      }

      // Check localStorage for super admin selected school or impersonation
      let sId: string | number | null = null;
      if (isSuper && typeof window !== "undefined") {
        const stored = localStorage.getItem("oa_superadmin_selected_school_id");
        if (stored) {
          sId = stored;
        }
      }

      // If not stored in localStorage, resolve user school or default to "all" for super admin
      if (!sId) {
        let resolvedId = user.user_metadata?.school_id || user.app_metadata?.school_id;
        if (user.email) {
          const lookedUpId = await resolveSchoolId(user.email);
          if (lookedUpId) resolvedId = lookedUpId;
        }
        sId = isSuper ? (resolvedId || "all") : resolvedId;
      }

      if (sId) {
        setSchoolId(sId);
        if (sId === "all") {
          setSchoolName("All Schools (Aggregated View)");
        } else {
          const matched = schoolsList.find((s) => String(s.id) === String(sId));
          if (matched) {
            setSchoolName(matched.name);
          } else {
            const { data: singleSch } = await supabase
              .from("schools")
              .select("name")
              .eq("id", sId)
              .maybeSingle();
            if (singleSch) setSchoolName(singleSch.name);
          }
        }
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
      return found ? found.name : "Unknown Staff";
    }
    if (Array.isArray(rec.teachers)) return rec.teachers[0]?.name || "Unknown Staff";
    return rec.teachers.name || "Unknown Staff";
  };

  // REAL DATA COMPUTATIONS (NO MOCK DATA AT ALL)
  const totalStudents = students.length;
  const totalTeachers = teachers.length;

  const totalParents = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.father_name && s.father_name.trim()) {
        set.add(s.father_name.trim().toLowerCase());
      }
    });
    return set.size;
  }, [students]);

  // Date match helpers for Realtime Calculations
  const isMatchingYear = (dateOrMonth?: string | null, createdAt?: string | null) => {
    if (dateOrMonth && dateOrMonth.slice(0, 4) === currentYear) return true;
    if (createdAt) {
      if (createdAt.slice(0, 4) === currentYear) return true;
      try {
        const d = new Date(createdAt);
        if (d.getFullYear().toString() === currentYear) return true;
      } catch {}
    }
    return false;
  };

  const isMatchingMonth = (dateOrMonth?: string | null, createdAt?: string | null) => {
    if (dateOrMonth && dateOrMonth.slice(0, 7) === currentMonth) return true;
    if (createdAt) {
      if (createdAt.slice(0, 7) === currentMonth) return true;
      try {
        const d = new Date(createdAt);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (m === currentMonth) return true;
      } catch {}
    }
    return false;
  };

  const isMatchingToday = (dateStr?: string | null, createdAt?: string | null) => {
    if (dateStr) {
      if (dateStr.slice(0, 10) === todayStr) return true;
      try {
        const d = new Date(dateStr);
        const t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (t === todayStr) return true;
      } catch {}
    }
    if (createdAt) {
      if (createdAt.slice(0, 10) === todayStr) return true;
      try {
        const d = new Date(createdAt);
        const t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (t === todayStr) return true;
      } catch {}
    }
    return false;
  };

  // Unpaid Fees: Realtime Count & Due Amount
  const pendingFeeCount = useMemo(() => {
    return feeRecords.filter((f) => f.status.toLowerCase() !== "paid").length;
  }, [feeRecords]);

  const unpaidFeeDue = useMemo(() => {
    return feeRecords
      .filter((f) => f.status.toLowerCase() !== "paid")
      .reduce((sum, f) => sum + Number(f.amount || 0), 0);
  }, [feeRecords]);

  // Realtime Income Calculations (Sum of Paid Fees + Accounting Income filtered by date)
  const totalIncomeThisYear = useMemo(() => {
    const feesYear = feeRecords
      .filter((f) => f.status.toLowerCase() === "paid" && isMatchingYear(f.month, f.created_at))
      .reduce((sum, f) => sum + Number(f.amount || 0), 0);
    const extraIncomeYear = expenses
      .filter((e) => e.type === "income" && isMatchingYear(e.date, e.created_at))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    return feesYear + extraIncomeYear;
  }, [feeRecords, expenses, currentYear]);

  const totalIncomeThisMonth = useMemo(() => {
    const feesMonth = feeRecords
      .filter((f) => f.status.toLowerCase() === "paid" && isMatchingMonth(f.month, f.created_at))
      .reduce((sum, f) => sum + Number(f.amount || 0), 0);
    const extraIncomeMonth = expenses
      .filter((e) => e.type === "income" && isMatchingMonth(e.date, e.created_at))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    return feesMonth + extraIncomeMonth;
  }, [feeRecords, expenses, currentMonth]);

  const incomeToday = useMemo(() => {
    const feesToday = feeRecords
      .filter((f) => f.status.toLowerCase() === "paid" && isMatchingToday(null, f.created_at))
      .reduce((sum, f) => sum + Number(f.amount || 0), 0);
    const extraIncomeToday = expenses
      .filter((e) => e.type === "income" && isMatchingToday(e.date, e.created_at))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    return feesToday + extraIncomeToday;
  }, [feeRecords, expenses, todayStr]);

  // Realtime Expense Calculations (Sum of Paid Salaries + Expenses filtered by date)
  const totalExpenseThisYear = useMemo(() => {
    const salaryYear = salaryRecords
      .filter((s) => s.status.toLowerCase() === "paid" && isMatchingYear(s.month, s.created_at))
      .reduce((sum, s) => sum + Number(s.amount || 0), 0);
    const expensesYear = expenses
      .filter((e) => e.type === "expense" && isMatchingYear(e.date, e.created_at))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    return salaryYear + expensesYear;
  }, [salaryRecords, expenses, currentYear]);

  const totalExpenseThisMonth = useMemo(() => {
    const salaryMonth = salaryRecords
      .filter((s) => s.status.toLowerCase() === "paid" && isMatchingMonth(s.month, s.created_at))
      .reduce((sum, s) => sum + Number(s.amount || 0), 0);
    const expensesMonth = expenses
      .filter((e) => e.type === "expense" && isMatchingMonth(e.date, e.created_at))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    return salaryMonth + expensesMonth;
  }, [salaryRecords, expenses, currentMonth]);

  const expenseToday = useMemo(() => {
    const salaryToday = salaryRecords
      .filter((s) => s.status.toLowerCase() === "paid" && isMatchingToday(null, s.created_at))
      .reduce((sum, s) => sum + Number(s.amount || 0), 0);
    const expensesToday = expenses
      .filter((e) => e.type === "expense" && isMatchingToday(e.date, e.created_at))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    return salaryToday + expensesToday;
  }, [salaryRecords, expenses, todayStr]);

  // Realtime Profit Calculations (100% dynamic, auto-updates on any fee/salary/expense change)
  const netProfitThisMonth = totalIncomeThisMonth - totalExpenseThisMonth;
  const netProfitThisYear = totalIncomeThisYear - totalExpenseThisYear;

  const totalExtraIncomeThisMonth = useMemo(() => {
    return expenses
      .filter((e) => e.type === "income" && isMatchingMonth(e.date, e.created_at))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses, currentMonth]);

  const totalOtherExpensesThisMonth = useMemo(() => {
    return expenses
      .filter((e) => e.type === "expense" && isMatchingMonth(e.date, e.created_at))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses, currentMonth]);

  // Recharts Monthly Paid vs Unpaid Fee Report Data (REAL DATA ONLY)
  const monthlyFeeReportData = useMemo(() => {
    const monthOrder = ["Feb", "Apr", "Jun", "Aug", "Oct", "Dec"];
    const monthMap: { [key: string]: { month: string; Paid: number; Unpaid: number } } = {
      Feb: { month: "Feb", Paid: 0, Unpaid: 0 },
      Apr: { month: "Apr", Paid: 0, Unpaid: 0 },
      Jun: { month: "Jun", Paid: 0, Unpaid: 0 },
      Aug: { month: "Aug", Paid: 0, Unpaid: 0 },
      Oct: { month: "Oct", Paid: 0, Unpaid: 0 },
      Dec: { month: "Dec", Paid: 0, Unpaid: 0 },
    };

    feeRecords.forEach((f) => {
      let mLabel = "";
      if (f.month) {
        const parts = f.month.split("-");
        const mNum = parseInt(parts[1] || "0", 10);
        if (mNum <= 2) mLabel = "Feb";
        else if (mNum <= 4) mLabel = "Apr";
        else if (mNum <= 6) mLabel = "Jun";
        else if (mNum <= 8) mLabel = "Aug";
        else if (mNum <= 10) mLabel = "Oct";
        else mLabel = "Dec";
      } else if (f.created_at) {
        const mNum = new Date(f.created_at).getMonth() + 1;
        if (mNum <= 2) mLabel = "Feb";
        else if (mNum <= 4) mLabel = "Apr";
        else if (mNum <= 6) mLabel = "Jun";
        else if (mNum <= 8) mLabel = "Aug";
        else if (mNum <= 10) mLabel = "Oct";
        else mLabel = "Dec";
      }

      if (mLabel && monthMap[mLabel]) {
        if (f.status.toLowerCase() === "paid") {
          monthMap[mLabel].Paid += Number(f.amount || 0);
        } else {
          monthMap[mLabel].Unpaid += Number(f.amount || 0);
        }
      }
    });

    return monthOrder.map((m) => monthMap[m]);
  }, [feeRecords]);

  const filteredStudents = useMemo(() => {
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.class.toLowerCase().includes(studentSearch.toLowerCase())
    );
  }, [students, studentSearch]);

  const filteredFeeRecords = useMemo(() => {
    return feeRecords.filter((f) =>
      feeMonthFilter && feeMonthFilter !== "all" ? f.month === feeMonthFilter : true
    );
  }, [feeRecords, feeMonthFilter]);

  // CRUD Handlers - WITH EXACT school_id FOREIGN KEY LOGIC (NO tenant_id)
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    const currentSchoolId = await getActionSchoolId();
    if (!currentSchoolId) return showNotification("error", "No school associated with session.");
    if (!studentForm.name || !studentForm.class) {
      showNotification("error", "Name and Class are required fields.");
      return;
    }

    const payload = {
      school_id: currentSchoolId,
      name: studentForm.name,
      class: studentForm.class,
      father_name: studentForm.father_name || null,
      phone: studentForm.phone || null,
      monthly_fee: parseFloat(studentForm.monthly_fee) || 0,
    };

    try {
      setIsSaving(true);
      if (editingStudentId) {
        let updateQuery = supabase
          .from("students")
          .update(payload)
          .eq("id", editingStudentId);
        if (schoolId && schoolId !== "all") {
          updateQuery = updateQuery.eq("school_id", currentSchoolId);
        }
        const { data, error } = await updateQuery.select().single();
        if (error) throw error;
        if (data) {
          setStudents((prev) => prev.map((s) => (s.id === editingStudentId ? data : s)));
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
      let delQuery = supabase.from("students").delete().eq("id", id);
      if (schoolId && schoolId !== "all") {
        delQuery = delQuery.eq("school_id", schoolId);
      }
      const { error } = await delQuery;
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
    const currentSchoolId = await getActionSchoolId();
    if (!currentSchoolId) return showNotification("error", "No school associated with session.");
    if (!feeForm.student_id || !feeForm.amount || !feeForm.month) {
      showNotification("error", "Please select a student, month, and amount.");
      return;
    }

    const payload = {
      school_id: currentSchoolId,
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
      }
      showNotification("success", "Fee record created!");
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
      let updateQuery = supabase.from("fee_records").update({ status: "paid" }).eq("id", id);
      if (schoolId && schoolId !== "all") {
        updateQuery = updateQuery.eq("school_id", schoolId);
      }
      const { error } = await updateQuery;
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
      let delQuery = supabase.from("fee_records").delete().eq("id", id);
      if (schoolId && schoolId !== "all") {
        delQuery = delQuery.eq("school_id", schoolId);
      }
      const { error } = await delQuery;
      if (error) throw error;
      showNotification("success", "Fee record deleted!");
    } catch (err: any) {
      showNotification("error", err.message || "Failed to delete fee record.");
      fetchAllData();
    }
  };

  // Generate Professional PDF Receipt with OA branding
  const generateFeeReceipt = (fee: FeeRecord) => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a5",
      });

      const effectiveStudent = students.find((s) => s.id === fee.student_id);
      const studentName = effectiveStudent?.name || getStudentName(fee);
      const studentClass = effectiveStudent?.class || getStudentClass(fee) || "N/A";
      const fatherName = effectiveStudent?.father_name || "N/A";
      const isPaid = fee.status.toLowerCase() === "paid";
      const amountNum = Number(fee.amount || 0);
      const currentSchoolName = schoolName || "OA SMART SCHOOL";
      const receiptDate = fee.created_at
        ? new Date(fee.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
      const paymentRef = `REC-${fee.school_id || "OA"}-${fee.id.toString().padStart(6, "0")}`;

      // Outer Border Frame
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.8);
      doc.roundedRect(8, 8, 132, 194, 4, 4, "S");

      // Inner Header Background
      doc.setFillColor(240, 244, 248);
      doc.roundedRect(10, 10, 128, 36, 3, 3, "F");

      // OA Logo Circular Badge (OA Brand Blue & Yellow)
      doc.setFillColor(30, 58, 95); // #1e3a5f
      doc.roundedRect(15, 15, 20, 20, 3, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(241, 196, 15); // #f1c40f
      doc.text("OA", 25, 27.5, { align: "center" });

      // School Name & Subtitles
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(30, 58, 95);
      doc.text(currentSchoolName, 39, 22);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Official Fee Collection Voucher & Receipt", 39, 28);
      doc.text(`Reference: ${paymentRef}`, 39, 33);

      // Divider Line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(12, 50, 136, 50);

      // Receipt Meta Bar
      doc.setFillColor(241, 245, 249);
      doc.rect(12, 54, 124, 12, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("RECEIPT NO:", 16, 61.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`#${fee.id}`, 38, 61.5);

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
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(167, 243, 208);
      doc.roundedRect(12, feeBoxY, 124, 26, 3, 3, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(6, 95, 70);
      doc.text("TOTAL FEE AMOUNT", 18, feeBoxY + 9);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(4, 120, 87);
      doc.text(`Rs. ${amountNum.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, 18, feeBoxY + 20);

      // PAID / UNPAID STAMP
      if (isPaid) {
        doc.setDrawColor(16, 185, 129);
        doc.setLineWidth(1.2);
        doc.roundedRect(92, feeBoxY + 4, 38, 17, 2, 2, "S");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(5, 150, 105);
        doc.text("PAID", 111, feeBoxY + 13, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(16, 185, 129);
        doc.text("VERIFIED BY OA ACCOUNTS", 111, feeBoxY + 18, { align: "center" });
      } else {
        doc.setDrawColor(239, 68, 68);
        doc.setLineWidth(1.2);
        doc.roundedRect(92, feeBoxY + 4, 38, 17, 2, 2, "S");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(220, 38, 38);
        doc.text("UNPAID", 111, feeBoxY + 14, { align: "center" });
      }

      // Footer Notes & Signatures
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Computer-generated payment voucher. OA Smart School Fee System.", 14, 178);

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.line(16, 192, 54, 192);
      doc.line(94, 192, 132, 192);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text("Depositor / Student", 35, 196, { align: "center" });
      doc.text("Authorized Signature", 113, 196, { align: "center" });

      const safeStudent = studentName.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const safeMonth = (fee.month || "month").replace(/[^a-z0-9]/gi, "_");
      const fileName = `receipt_${safeStudent}_${safeMonth}.pdf`;

      doc.save(fileName);
      showNotification("success", "Receipt PDF downloaded!");
    } catch (err) {
      console.error("Failed to generate PDF receipt:", err);
      showNotification("error", "Failed to generate receipt PDF.");
    }
  };

  // WhatsApp Fee Reminder Button Logic
  const handleWhatsAppReminder = (rec: FeeRecord) => {
    const student = students.find((s) => s.id === rec.student_id);
    const rawPhone = student?.phone ? student.phone.trim() : "";
    let cleanPhone = rawPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("03")) {
      cleanPhone = "92" + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith("3") && cleanPhone.length === 10) {
      cleanPhone = "92" + cleanPhone;
    }

    const studentName = student?.name || getStudentName(rec);
    const studentClass = student?.class || getStudentClass(rec) || "";
    const amountVal = Number(rec.amount || 0).toLocaleString();
    const classStr = studentClass ? ` (${studentClass})` : "";
    const message = `Dear Parent, Fee for ${studentName}${classStr} for ${rec.month} Rs.${amountVal} is Pending. - OA Smart School`;

    const targetUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(targetUrl, "_blank");
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    const currentSchoolId = await getActionSchoolId();
    if (!currentSchoolId) return showNotification("error", "No school associated with session.");
    if (!teacherForm.name) {
      showNotification("error", "Teacher name is required.");
      return;
    }

    const payload = {
      school_id: currentSchoolId,
      name: teacherForm.name,
      phone: teacherForm.phone || null,
      monthly_salary: parseFloat(teacherForm.monthly_salary) || 0,
    };

    try {
      setIsSaving(true);
      if (editingTeacherId) {
        let updateQuery = supabase
          .from("teachers")
          .update(payload)
          .eq("id", editingTeacherId);
        if (schoolId && schoolId !== "all") {
          updateQuery = updateQuery.eq("school_id", schoolId);
        }
        const { data, error } = await updateQuery.select().single();
        if (error) throw error;
        if (data) {
          setTeachers((prev) => prev.map((t) => (t.id === editingTeacherId ? data : t)));
        }
        showNotification("success", "Staff member updated!");
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
        showNotification("success", "Staff member added!");
      }

      setTeacherForm({ name: "", phone: "", monthly_salary: "" });
      setEditingTeacherId(null);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to save staff member.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditTeacher = (t: Teacher) => {
    setEditingTeacherId(t.id);
    setTeacherForm({
      name: t.name,
      phone: t.phone || "",
      monthly_salary: t.monthly_salary.toString(),
    });
  };

  const handleDeleteTeacher = async (id: number) => {
    if (!confirm("Are you sure you want to delete this staff member?")) return;
    try {
      setTeachers((prev) => prev.filter((t) => t.id !== id));
      let delQuery = supabase.from("teachers").delete().eq("id", id);
      if (schoolId && schoolId !== "all") {
        delQuery = delQuery.eq("school_id", schoolId);
      }
      const { error } = await delQuery;
      if (error) throw error;
      showNotification("success", "Staff member deleted!");
    } catch (err: any) {
      showNotification("error", err.message || "Failed to delete staff member.");
      fetchAllData();
    }
  };

  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    const currentSchoolId = await getActionSchoolId();
    if (!currentSchoolId) return showNotification("error", "No school associated with session.");
    if (!salaryForm.teacher_id || !salaryForm.amount || !salaryForm.month) {
      showNotification("error", "Please select staff, month, and amount.");
      return;
    }

    const payload = {
      school_id: currentSchoolId,
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
      showNotification("success", "Salary record saved!");
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
      let updQuery = supabase
        .from("salary_records")
        .update({ status: "paid" })
        .eq("id", id);
      if (schoolId && schoolId !== "all") {
        updQuery = updQuery.eq("school_id", schoolId);
      }
      const { error } = await updQuery;
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
      let delQuery = supabase.from("salary_records").delete().eq("id", id);
      if (schoolId && schoolId !== "all") {
        delQuery = delQuery.eq("school_id", schoolId);
      }
      const { error } = await delQuery;
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
    const currentSchoolId = await getActionSchoolId();
    if (!currentSchoolId) return showNotification("error", "No school associated with session.");
    if (!expenseForm.title || !expenseForm.amount) {
      showNotification("error", "Title and Amount are required.");
      return;
    }

    const payload = {
      school_id: currentSchoolId,
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
      let delQuery = supabase.from("expenses").delete().eq("id", id);
      if (schoolId && schoolId !== "all") {
        delQuery = delQuery.eq("school_id", schoolId);
      }
      const { error } = await delQuery;
      if (error) throw error;
      showNotification("success", "Record deleted!");
    } catch (err: any) {
      showNotification("error", err.message || "Failed to delete record.");
      fetchAllData();
    }
  };

  // EXACT 6 SIDEBAR MENU ITEMS
  const sidebarNavItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "students", label: "Student Management", icon: GraduationCap },
    { id: "teachers", label: "Staff Management", icon: Users },
    { id: "fees", label: "Fee Payment", icon: Wallet },
    { id: "salary", label: "Salary Records", icon: Banknote },
    { id: "expenses", label: "Accounting & Expenses", icon: Receipt },
  ];

  // SAAS MODULES (ALL 9 MODULES)
  const saasToolsNav = [
    { href: "/fees-reminder", label: "WhatsApp Reminders", icon: MessageCircle, badge: "Notice" },
    { href: "/fee-challan", label: "Bank Fee Challan", icon: FileText, badge: "3-Part PDF" },
    { href: "/id-cards", label: "ID Card Generator", icon: CreditCard, badge: "Print A4" },
    { href: "/exams", label: "Exams & Report Cards", icon: Award, badge: "Report" },
    { href: "/attendance", label: "Daily Attendance", icon: UserCheck, badge: "P/A/L" },
    { href: "/attendance-report", label: "Attendance Report", icon: BarChart3, badge: "Calendar" },
    { href: "/admissions", label: "Online Admissions", icon: FileCheck, badge: "Desk" },
    { href: "/homework", label: "Daily Homework", icon: BookOpen, badge: "Diary" },
    { href: "/class-subjects", label: "Class Subjects", icon: BookMarked, badge: "Assign" },
  ];

  // GOVT FUNDS REGISTERS (NSB & FTF)
  const fundsNav = [
    { href: "/nsb", label: "NSB کیش بک", icon: Book, badge: "فارم 8" },
    { href: "/ftf", label: "FTF رجسٹر", icon: Coins, badge: "فروغ تعلیم" },
  ];

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-slate-800 flex font-sans">
      {/* 1. DESKTOP LEFT SIDEBAR (bg-[#1e3a5f] Dark Blue Theme) */}
      <aside className="w-64 shrink-0 hidden lg:flex flex-col h-[100dvh] sticky top-0 bg-[#1e3a5f] text-white shadow-xl z-30 overflow-hidden">
        {/* Fixed Top Header */}
        <div className="shrink-0 p-4 border-b border-blue-900/60 text-center">
          <div className="w-14 h-14 rounded-full bg-[#f1c40f] text-[#1e3a5f] font-black text-xl flex items-center justify-center shadow-lg mx-auto mb-2">
            OA
          </div>
          <h1 className="text-base font-bold text-white tracking-wide truncate max-w-full">
            {schoolName}
          </h1>
          <p className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider mt-0.5">
            School System Active
          </p>
        </div>

        {/* Scrollable Middle Navigation Area (Smooth touch scroll with pb-36) */}
        <div
          className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500/50 p-4 pb-36 space-y-4"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {/* 6 Navigation Links */}
          <nav className="space-y-1">
            {sidebarNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-[#2c4d75] text-yellow-400 font-semibold shadow-inner"
                      : "text-slate-200 hover:bg-[#2c4d75]/60 hover:text-white"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-yellow-400" : "text-slate-300"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* NEW PARENT MENU: فنڈز / Funds */}
          <div className="pt-3.5 border-t border-blue-900/60">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-rose-300 mb-1.5 flex items-center gap-1.5 font-urdu">
              <Coins className="w-3.5 h-3.5 text-rose-300" />
              <span>فنڈز / Funds</span>
            </p>
            <nav className="space-y-1">
              {fundsNav.map((fund) => {
                const Icon = fund.icon;
                return (
                  <Link
                    key={fund.href}
                    href={fund.href}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-[#2c4d75]/70 hover:text-white transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-3.5 h-3.5 text-rose-300 group-hover:text-yellow-400" />
                      <span className="font-urdu text-[13px]">{fund.label}</span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {fund.badge}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* SAAS MODULES IN SIDEBAR */}
          <div className="pt-3.5 border-t border-blue-900/60">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-yellow-400 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-yellow-400" />
              <span>SaaS Modules</span>
            </p>
            <nav className="space-y-1 pb-16">
              {saasToolsNav.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-[#2c4d75]/70 hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{tool.label}</span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {tool.badge}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User Account & Exit (Fixed Bottom - Always Visible) */}
        <div className="shrink-0 p-4 border-t border-blue-900/60 bg-[#1e3a5f] space-y-2 z-10">
          <div className="px-2 py-1.5 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-yellow-400 text-[#1e3a5f] flex items-center justify-center font-bold text-xs shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">
                {currentUser?.email || "Admin"}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => fetchAllData()}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-xs font-semibold text-slate-200 bg-[#2c4d75] hover:bg-blue-800 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Sync</span>
            </button>
            <button
              onClick={handleLogout}
              className="py-2 px-3 rounded-lg text-xs font-semibold text-rose-300 bg-rose-900/40 hover:bg-rose-900/60 border border-rose-700/50 cursor-pointer flex items-center justify-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MOBILE DRAWER SIDEBAR NAVIGATION (CRITICAL MOBILE FIX - 100dvh + Smooth Scroll) */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          {/* Overlay */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity"
          />
          {/* Drawer Container: h-[100dvh] flex flex-col overflow-hidden */}
          <div className="fixed inset-y-0 left-0 z-[60] w-[285px] max-w-[85vw] h-[100dvh] bg-[#1e3a5f] text-white shadow-2xl flex flex-col overflow-hidden transform transition-transform duration-300 ease-in-out">
            {/* Top Fixed Header */}
            <div className="shrink-0 p-4 border-b border-blue-900/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f1c40f] text-[#1e3a5f] font-bold flex items-center justify-center text-sm shadow-md">
                  OA
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white truncate max-w-[150px]">{schoolName}</h2>
                  <p className="text-[10px] text-emerald-400 font-semibold">School Active</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Middle Navigation Area (with pb-36 for safe scrolling) */}
            <div
              className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500/50 p-4 pb-36 space-y-4"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {/* 6 Mobile Drawer Links */}
              <nav className="space-y-1">
                {sidebarNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as any);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[#2c4d75] text-yellow-400 font-semibold"
                          : "text-slate-200 hover:bg-[#2c4d75]/60"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-yellow-400" : "text-slate-300"}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Mobile Drawer Govt Funds */}
              <div className="pt-3.5 border-t border-blue-900/60">
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-rose-300 mb-1.5 flex items-center gap-1.5 font-urdu">
                  <Coins className="w-3.5 h-3.5 text-rose-300" />
                  <span>فنڈز / Funds</span>
                </p>
                <nav className="space-y-1">
                  {fundsNav.map((fund) => {
                    const Icon = fund.icon;
                    return (
                      <Link
                        key={fund.href}
                        href={fund.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-200 hover:bg-[#2c4d75]/70 hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-3.5 h-3.5 text-rose-300" />
                          <span className="font-urdu text-[13px]">{fund.label}</span>
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {fund.badge}
                        </span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Mobile Drawer SaaS Modules */}
              <div className="pt-3.5 border-t border-blue-900/60">
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-yellow-400 mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-yellow-400" />
                  <span>SaaS Modules</span>
                </p>
                <nav className="space-y-1 pb-20">
                  {saasToolsNav.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-200 hover:bg-[#2c4d75]/70 hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{tool.label}</span>
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {tool.badge}
                        </span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Fixed Bottom Footer (Always Visible) */}
            <div className="shrink-0 p-4 border-t border-blue-900/60 bg-[#1e3a5f] space-y-2 z-10">
              <div className="px-2 py-1 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-yellow-400 text-[#1e3a5f] flex items-center justify-center font-bold text-xs shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-white truncate">
                  {currentUser?.email || "Admin"}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold text-rose-300 bg-rose-900/40 hover:bg-rose-900/60 border border-rose-700/50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 3. TOP HEADER (Dark Blue Header bg-[#1e3a5f]) */}
        <header className="sticky top-0 z-40 bg-[#1e3a5f] text-white px-4 sm:px-6 py-3 shadow-md flex items-center justify-between gap-4 h-16">
          <div className="flex items-center gap-3 flex-1">
            {/* Hamburger Button for Mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-[#2c4d75] text-white hover:bg-blue-800 cursor-pointer shrink-0"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Header Title */}
            <div className="flex items-center gap-2 lg:hidden">
              <span className="w-7 h-7 rounded-full bg-[#f1c40f] text-[#1e3a5f] font-black text-xs flex items-center justify-center">
                OA
              </span>
              <span className="font-bold text-sm text-white truncate max-w-[140px]">
                {schoolName}
              </span>
            </div>

            {/* Search Input for Desktop */}
            <div className="relative max-w-xs w-full hidden sm:block">
              <Search className="w-4 h-4 text-slate-300 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Student..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#2c4d75] border border-blue-900/40 rounded-lg text-xs text-white placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-yellow-400"
              />
            </div>
          </div>

          {/* Right Controls Header */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Search Toggle Icon */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="sm:hidden p-2 rounded-lg bg-[#2c4d75] text-white hover:bg-blue-800 cursor-pointer"
            >
              <Search className="w-4 h-4 text-yellow-400" />
            </button>

            {/* SUPER ADMIN VIEW BUTTON FOR mnuhbhatti333@gmail.com */}
            {(isSuperAdmin(currentUser?.email) || currentUser?.email === "mnuhbhatti333@gmail.com") && (
              <div className="flex items-center bg-[#2c4d75] p-1 rounded-lg border border-purple-500/40 shadow-xs">
                <button
                  onClick={() => router.push("/")}
                  className="px-2.5 py-1 text-xs font-bold rounded-md bg-[#6f42c1] text-white shadow-xs"
                >
                  School View
                </button>
                <button
                  onClick={() => router.push("/admin")}
                  className="px-2.5 py-1 text-xs font-bold rounded-md text-purple-200 hover:text-white hover:bg-purple-900/50 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Admin View</span>
                </button>
              </div>
            )}

            <div className="hidden md:flex items-center gap-2">
              <span className="px-3 py-1 bg-[#2c4d75] rounded-md text-xs font-semibold text-white flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-yellow-400" />
                English
              </span>
              <span className="px-3 py-1 bg-[#2c4d75] rounded-md text-xs font-semibold text-white flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-emerald-400" />
                Main Campus
              </span>
              {isSuperAdminUser && (
                <div className="flex items-center gap-1.5 bg-[#172e4c] border border-yellow-400/60 rounded-md px-2 py-1 shadow-inner">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-400 shrink-0">
                    Switch School:
                  </span>
                  <select
                    value={String(schoolId || "all")}
                    onChange={(e) => handleSelectSchool(e.target.value)}
                    className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer max-w-[200px] truncate"
                    title="Super Admin School Selector"
                  >
                    <option value="all" className="bg-[#1e3a5f] text-white">
                      All Schools (Aggregated)
                    </option>
                    {availableSchools.map((s) => (
                      <option key={s.id} value={String(s.id)} className="bg-[#1e3a5f] text-white">
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button className="p-2 rounded-lg bg-[#2c4d75] text-white hover:bg-blue-800 relative cursor-pointer">
              <Bell className="w-4 h-4 text-yellow-400" />
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-blue-900/60">
              <div className="w-8 h-8 rounded-full bg-[#f1c40f] text-[#1e3a5f] font-bold flex items-center justify-center text-xs shadow-sm">
                AJ
              </div>
              <span className="text-xs font-semibold text-white hidden sm:inline">
                {currentUser?.email ? currentUser.email.split("@")[0] : "Admin"}
              </span>
            </div>
          </div>
        </header>

        {/* Mobile Search Bar Dropdown */}
        {mobileSearchOpen && (
          <div className="sm:hidden bg-[#1e3a5f] p-3 border-t border-blue-900/60 sticky top-16 z-30 shadow-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-300 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Student by name or class..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#2c4d75] border border-blue-900/40 rounded-lg text-xs text-white placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-yellow-400"
              />
            </div>
          </div>
        )}

        {/* MAIN BODY AREA (bg-[#f0f2f5] Light Grey) */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Notifications */}
          {errorMsg && (
            <div className="bg-rose-500 text-white rounded-lg p-4 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">{errorMsg}</p>
              </div>
              <button onClick={() => setErrorMsg(null)} className="text-white hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-600 text-white rounded-lg p-4 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">{successMsg}</p>
              </div>
              <button onClick={() => setSuccessMsg(null)} className="text-white hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 4. MAIN DASHBOARD TAB */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* 4 KILLER SAAS MODULES LAUNCHER */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Nexeta School SaaS Power Tools</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                        Pro Modules
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      Automated fee recovery notices, student ID generation, academic report cards, and daily attendance
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 hidden sm:block">
                    PK Format DD-MM-YYYY
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <Link
                    href="/fees-reminder"
                    className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-300 transition-all group flex items-start gap-3 shadow-2xs"
                  >
                    <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 truncate">
                        WhatsApp Reminders
                      </h3>
                      <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                        Defaulters notice via 1-click WhatsApp
                      </p>
                    </div>
                  </Link>

                  <Link
                    href="/fee-challan"
                    className="p-3.5 rounded-xl border border-sky-100 bg-sky-50/40 hover:bg-sky-50 hover:border-sky-300 transition-all group flex items-start gap-3 shadow-2xs"
                  >
                    <div className="w-9 h-9 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-900 group-hover:text-sky-700 truncate">
                        Bank Fee Challan
                      </h3>
                      <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                        3-part A4 voucher with scissor cut
                      </p>
                    </div>
                  </Link>

                  <Link
                    href="/id-cards"
                    className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/40 hover:bg-indigo-50 hover:border-indigo-300 transition-all group flex items-start gap-3 shadow-2xs"
                  >
                    <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 truncate">
                        Student ID Cards
                      </h3>
                      <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                        8 cards / A4 sheet with QR & photos
                      </p>
                    </div>
                  </Link>

                  <Link
                    href="/exams"
                    className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/40 hover:bg-amber-50 hover:border-amber-300 transition-all group flex items-start gap-3 shadow-2xs"
                  >
                    <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <Award className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-900 group-hover:text-amber-700 truncate">
                        Exams & Report Cards
                      </h3>
                      <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                        Marks matrix & printable PDF cards
                      </p>
                    </div>
                  </Link>

                  <Link
                    href="/attendance"
                    className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-300 transition-all group flex items-start gap-3 shadow-2xs"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 truncate">
                        Daily Attendance
                      </h3>
                      <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                        1-click P / A / L touch-friendly marking
                      </p>
                    </div>
                  </Link>

                  <Link
                    href="/attendance-report"
                    className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-300 transition-all group flex items-start gap-3 shadow-2xs"
                  >
                    <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 truncate">
                        Attendance Report
                      </h3>
                      <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                        Monthly calendar dots & export
                      </p>
                    </div>
                  </Link>

                  <Link
                    href="/admissions"
                    className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/40 hover:bg-purple-50 hover:border-purple-300 transition-all group flex items-start gap-3 shadow-2xs"
                  >
                    <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-900 group-hover:text-purple-700 truncate">
                        Online Admissions Desk
                      </h3>
                      <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                        Public link & 1-click enroll desk
                      </p>
                    </div>
                  </Link>

                  <Link
                    href="/homework"
                    className="p-3.5 rounded-xl border border-teal-100 bg-teal-50/40 hover:bg-teal-50 hover:border-teal-300 transition-all group flex items-start gap-3 shadow-2xs"
                  >
                    <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-900 group-hover:text-teal-700 truncate">
                        Daily Homework Diary
                      </h3>
                      <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                        Daily diary with WhatsApp broadcast
                      </p>
                    </div>
                  </Link>
                </div>

                {/* GOVT FUNDS REGISTERS (NSB & FTF) QUICK LAUNCH */}
                <div className="mt-4 pt-3.5 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-urdu">
                        <Coins className="w-3.5 h-3.5 text-rose-600" />
                        <span>سرکاری فنڈز رجسٹرز (Govt Funds Registers)</span>
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                        SED / PEF Format
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 hidden sm:block">
                      فارم 8 کیش بک و فروغِ تعلیم فنڈ رجسٹر
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Link
                      href="/nsb"
                      className="p-3 rounded-xl border border-rose-100 bg-rose-50/40 hover:bg-rose-50 hover:border-rose-300 transition-all group flex items-start gap-3 shadow-2xs"
                    >
                      <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                        <Book className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-rose-700 truncate font-urdu">
                            NSB کیش بک (سکول کونسل - فارم نمبر 8)
                          </h4>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                            A4 Landscape
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                          آمدن، اخراجات، 8-باکس ایمس کوڈ، بینک بیلنس و کیش ان ہینڈ
                        </p>
                      </div>
                    </Link>

                    <Link
                      href="/ftf"
                      className="p-3 rounded-xl border border-amber-100 bg-amber-50/40 hover:bg-amber-50 hover:border-amber-300 transition-all group flex items-start gap-3 shadow-2xs"
                    >
                      <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                        <Coins className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-700 truncate font-urdu">
                            FTF رجسٹر (فروغِ تعلیم فنڈ گورنمنٹ)
                          </h4>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                            A4 Portrait
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                          جماعت 1 تا 10 طلباء فیس وصولی، FTF اخراجات و سرکاری حساب
                        </p>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>

              {/* 8 VIBRANT COLORFUL CARDS WITH REAL DATA OR ZERO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                {/* Card 1: Unpaid Fees (Red bg-[#e74c3c]) */}
                <div className="bg-[#e74c3c] rounded-lg p-3 text-white shadow-md relative overflow-hidden flex flex-col justify-between group">
                  <CreditCard className="w-16 h-16 absolute -right-2 -top-2 opacity-20 text-white pointer-events-none" />
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-0.5">
                      {pendingFeeCount} Unpaid
                    </h3>
                    <p className="text-xs sm:text-sm font-medium opacity-90 text-white">
                      Rs. {unpaidFeeDue.toLocaleString()} Due
                    </p>
                  </div>
                  <div
                    onClick={() => setActiveTab("fees")}
                    className="bg-black/15 -mx-3 -mb-3 mt-3 px-3 py-1 flex items-center justify-between text-xs text-white/90 font-medium cursor-pointer hover:bg-black/25 transition-colors"
                  >
                    <span>More info</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Card 2: Total Income This Year (Light Blue bg-[#00a8e8]) */}
                <div className="bg-[#00a8e8] rounded-lg p-3 text-white shadow-md relative overflow-hidden flex flex-col justify-between group">
                  <DollarSign className="w-16 h-16 absolute -right-2 -top-2 opacity-20 text-white pointer-events-none" />
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-0.5">
                      Rs. {totalIncomeThisYear.toLocaleString()}
                    </h3>
                    <p className="text-xs sm:text-sm font-medium opacity-90 text-white">Total Income This Year</p>
                  </div>
                  <div
                    onClick={() => setActiveTab("fees")}
                    className="bg-black/15 -mx-3 -mb-3 mt-3 px-3 py-1 flex items-center justify-between text-xs text-white/90 font-medium cursor-pointer hover:bg-black/25 transition-colors"
                  >
                    <span>More info</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Card 3: Income This Month (Green bg-[#27ae60]) */}
                <div className="bg-[#27ae60] rounded-lg p-3 text-white shadow-md relative overflow-hidden flex flex-col justify-between group">
                  <BarChart3 className="w-16 h-16 absolute -right-2 -top-2 opacity-20 text-white pointer-events-none" />
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-0.5">
                      Rs. {totalIncomeThisMonth.toLocaleString()}
                    </h3>
                    <p className="text-xs sm:text-sm font-medium opacity-90 text-white">Income This Month</p>
                  </div>
                  <div
                    onClick={() => setActiveTab("fees")}
                    className="bg-black/15 -mx-3 -mb-3 mt-3 px-3 py-1 flex items-center justify-between text-xs text-white/90 font-medium cursor-pointer hover:bg-black/25 transition-colors"
                  >
                    <span>More info</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Card 4: Income Today (Dark Blue bg-[#2471a3]) */}
                <div className="bg-[#2471a3] rounded-lg p-3 text-white shadow-md relative overflow-hidden flex flex-col justify-between group">
                  <PieChart className="w-16 h-16 absolute -right-2 -top-2 opacity-20 text-white pointer-events-none" />
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-0.5">
                      Rs. {incomeToday.toLocaleString()}
                    </h3>
                    <p className="text-xs sm:text-sm font-medium opacity-90 text-white">Income Today</p>
                  </div>
                  <div
                    onClick={() => setActiveTab("fees")}
                    className="bg-black/15 -mx-3 -mb-3 mt-3 px-3 py-1 flex items-center justify-between text-xs text-white/90 font-medium cursor-pointer hover:bg-black/25 transition-colors"
                  >
                    <span>More info</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Card 5: Profit This Month (Green bg-[#27ae60]) */}
                <div className="bg-[#27ae60] rounded-lg p-3 text-white shadow-md relative overflow-hidden flex flex-col justify-between group">
                  <Activity className="w-16 h-16 absolute -right-2 -top-2 opacity-20 text-white pointer-events-none" />
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-0.5">
                      Rs. {netProfitThisMonth.toLocaleString()}
                    </h3>
                    <p className="text-xs sm:text-sm font-medium opacity-90 text-white">Profit This Month</p>
                  </div>
                  <div
                    onClick={() => setActiveTab("expenses")}
                    className="bg-black/15 -mx-3 -mb-3 mt-3 px-3 py-1 flex items-center justify-between text-xs text-white/90 font-medium cursor-pointer hover:bg-black/25 transition-colors"
                  >
                    <span>More info</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Card 6: Total Expense This Year (Reddish Brown bg-[#c0392b]) */}
                <div className="bg-[#c0392b] rounded-lg p-3 text-white shadow-md relative overflow-hidden flex flex-col justify-between group">
                  <TrendingUp className="w-16 h-16 absolute -right-2 -top-2 opacity-20 text-white pointer-events-none" />
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-0.5">
                      Rs. {totalExpenseThisYear.toLocaleString()}
                    </h3>
                    <p className="text-xs sm:text-sm font-medium opacity-90 text-white">Total Expense This Year</p>
                  </div>
                  <div
                    onClick={() => setActiveTab("expenses")}
                    className="bg-black/15 -mx-3 -mb-3 mt-3 px-3 py-1 flex items-center justify-between text-xs text-white/90 font-medium cursor-pointer hover:bg-black/25 transition-colors"
                  >
                    <span>More info</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Card 7: Expense This Month (Orange bg-[#f39c12]) */}
                <div className="bg-[#f39c12] rounded-lg p-3 text-white shadow-lg relative overflow-hidden flex flex-col justify-between group">
                  <Info className="w-16 h-16 absolute -right-2 -top-2 opacity-20 text-white pointer-events-none" />
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-0.5">
                      Rs. {totalExpenseThisMonth.toLocaleString()}
                    </h3>
                    <p className="text-xs sm:text-sm font-medium opacity-90 text-white">Expense This Month</p>
                  </div>
                  <div
                    onClick={() => setActiveTab("expenses")}
                    className="bg-black/15 -mx-3 -mb-3 mt-3 px-3 py-1 flex items-center justify-between text-xs text-white/90 font-medium cursor-pointer hover:bg-black/25 transition-colors"
                  >
                    <span>More info</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Card 8: Expense Today (Light Blue bg-[#00a8e8]) */}
                <div className="bg-[#00a8e8] rounded-lg p-3 text-white shadow-lg relative overflow-hidden flex flex-col justify-between group">
                  <ShoppingBag className="w-16 h-16 absolute -right-2 -top-2 opacity-20 text-white pointer-events-none" />
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-0.5">
                      Rs. {expenseToday.toLocaleString()}
                    </h3>
                    <p className="text-xs sm:text-sm font-medium opacity-90 text-white">Expense Today</p>
                  </div>
                  <div
                    onClick={() => setActiveTab("expenses")}
                    className="bg-black/15 -mx-3 -mb-3 mt-3 px-3 py-1 flex items-center justify-between text-xs text-white/90 font-medium cursor-pointer hover:bg-black/25 transition-colors"
                  >
                    <span>More info</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* 5. CHART & 4 QUICK STAT CARDS SECTION */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Bar Chart */}
                <div className="lg:col-span-2 bg-white rounded-lg p-5 shadow-md border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-800">
                      Month Wise Paid Unpaid Fee Report For Current Year
                    </h3>
                    {feeRecords.length === 0 && (
                      <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                        No data recorded yet
                      </span>
                    )}
                  </div>

                  <div className="h-72 w-full pt-2">
                    {chartMounted ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyFeeReportData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#ffffff",
                              borderColor: "#cbd5e1",
                              borderRadius: "8px",
                              color: "#0f172a",
                            }}
                          />
                          <Legend />
                          <Bar dataKey="Paid" fill="#27ae60" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Unpaid" fill="#e74c3c" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400">
                        Loading Fee Report Chart...
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: 4 Small Horizontal Cards */}
                <div className="space-y-4">
                  {/* Card 1: STUDENTS (Green) */}
                  <div
                    onClick={() => setActiveTab("students")}
                    className="bg-[#27ae60] rounded-lg p-4 text-white shadow-md flex items-center justify-between cursor-pointer hover:opacity-95 transition-opacity"
                  >
                    <div className="flex items-center gap-3">
                      <GraduationCap className="w-8 h-8 text-white opacity-90" />
                      <span className="font-bold text-sm tracking-wider uppercase">STUDENTS</span>
                    </div>
                    <span className="text-3xl font-extrabold">{totalStudents}</span>
                  </div>

                  {/* Card 2: PARENTS (Reddish) */}
                  <div
                    onClick={() => setActiveTab("students")}
                    className="bg-[#e74c3c] rounded-lg p-4 text-white shadow-md flex items-center justify-between cursor-pointer hover:opacity-95 transition-opacity"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-8 h-8 text-white opacity-90" />
                      <span className="font-bold text-sm tracking-wider uppercase">PARENTS</span>
                    </div>
                    <span className="text-3xl font-extrabold">{totalParents}</span>
                  </div>

                  {/* Card 3: STAFF (Cyan) */}
                  <div
                    onClick={() => setActiveTab("teachers")}
                    className="bg-[#00a8e8] rounded-lg p-4 text-white shadow-md flex items-center justify-between cursor-pointer hover:opacity-95 transition-opacity"
                  >
                    <div className="flex items-center gap-3">
                      <UserCheck className="w-8 h-8 text-white opacity-90" />
                      <span className="font-bold text-sm tracking-wider uppercase">STAFF</span>
                    </div>
                    <span className="text-3xl font-extrabold">{totalTeachers}</span>
                  </div>

                  {/* Card 4: ATTENDANCE TODAY (Dark Blue) */}
                  <div className="bg-[#1e3a5f] rounded-lg p-4 text-white shadow-md flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-8 h-8 text-white opacity-90" />
                      <span className="font-bold text-sm tracking-wider uppercase">ATTENDANCE TODAY</span>
                    </div>
                    <span className="text-3xl font-extrabold">0</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STUDENTS */}
          {activeTab === "students" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-6 shadow-md border border-slate-200 h-fit space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-600" />
                  {editingStudentId ? "Edit Student Record" : "Register Student"}
                </h3>
                <form onSubmit={handleSaveStudent} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Student Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Eleanor Vance"
                      value={studentForm.name}
                      onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Class / Grade *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Grade 10-B"
                      value={studentForm.class}
                      onChange={(e) => setStudentForm({ ...studentForm, class: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Father's Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Arthur Vance"
                      value={studentForm.father_name}
                      onChange={(e) => setStudentForm({ ...studentForm, father_name: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +92 300 1234567"
                      value={studentForm.phone}
                      onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Monthly Fee (Rs.)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 2500"
                      value={studentForm.monthly_fee}
                      onChange={(e) => setStudentForm({ ...studentForm, monthly_fee: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 px-4 rounded-lg bg-[#27ae60] hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex justify-center items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      {editingStudentId ? "Update Student" : "Save Student"}
                    </button>
                    {editingStudentId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStudentId(null);
                          setStudentForm({ name: "", class: "", father_name: "", phone: "", monthly_fee: "" });
                        }}
                        className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-md border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-lg font-bold text-slate-900">Students Directory ({filteredStudents.length})</h3>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Search name or class..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-60"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Class</th>
                        <th className="py-3 px-4">Father's Name</th>
                        <th className="py-3 px-4">Phone</th>
                        <th className="py-3 px-4">Monthly Fee</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No students registered yet.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((s) => {
                          const initials = getInitials(s.name);
                          const colorClass = getAvatarColor(s.name);
                          return (
                            <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3.5 px-4 font-semibold text-slate-900">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-full ${colorClass} flex items-center justify-center font-bold text-xs shrink-0`}>
                                    {initials}
                                  </div>
                                  <span>{s.name}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-slate-600">{s.class}</td>
                              <td className="py-3.5 px-4 text-slate-500">{s.father_name || "-"}</td>
                              <td className="py-3.5 px-4 text-slate-500">{s.phone || "-"}</td>
                              <td className="py-3.5 px-4 font-bold text-emerald-600">
                                Rs. {Number(s.monthly_fee).toFixed(2)}
                              </td>
                              <td className="py-3.5 px-4 text-right space-x-1">
                                <button
                                  onClick={() => handleEditStudent(s)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(s.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
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
              <div className="bg-white rounded-lg p-6 shadow-md border border-slate-200 h-fit space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-600" />
                  Collect / Log Fee
                </h3>
                <form onSubmit={handleSaveFee} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Select Student *</label>
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Choose Student --</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.class}) - Fee: Rs. {s.monthly_fee}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Month *</label>
                    <input
                      type="month"
                      required
                      value={feeForm.month}
                      onChange={(e) => setFeeForm({ ...feeForm, month: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Amount (Rs.) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 2500"
                      value={feeForm.amount}
                      onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Status *</label>
                    <select
                      value={feeForm.status}
                      onChange={(e) => setFeeForm({ ...feeForm, status: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="paid">Paid</option>
                      <option value="unpaid">Pending / Unpaid</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-lg bg-[#27ae60] hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex justify-center items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Save Fee Entry
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-md border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-lg font-bold text-slate-900">Fee Collection Records</h3>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <input
                      type="month"
                      value={feeMonthFilter}
                      onChange={(e) => setFeeMonthFilter(e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none"
                    />
                    {feeMonthFilter !== "all" && (
                      <button onClick={() => setFeeMonthFilter("all")} className="text-xs text-indigo-600 hover:underline">
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Class</th>
                        <th className="py-3 px-4">Month</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredFeeRecords.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No fee records found.
                          </td>
                        </tr>
                      ) : (
                        filteredFeeRecords.map((rec) => {
                          const name = getStudentName(rec);
                          const initials = getInitials(name);
                          const colorClass = getAvatarColor(name);
                          const isPaid = rec.status.toLowerCase() === "paid";
                          return (
                            <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3.5 px-4 font-semibold text-slate-900">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-full ${colorClass} flex items-center justify-center font-bold text-xs shrink-0`}>
                                    {initials}
                                  </div>
                                  <span>{name}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-slate-600">{getStudentClass(rec)}</td>
                              <td className="py-3.5 px-4 text-slate-600">{rec.month}</td>
                              <td className="py-3.5 px-4 font-bold text-slate-900">Rs. {Number(rec.amount).toFixed(2)}</td>
                              <td className="py-3.5 px-4">
                                {isPaid ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700">
                                    Paid
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-700">
                                    Pending
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5 flex-nowrap min-w-max">
                                  {/* PDF Receipt Action */}
                                  <button
                                    onClick={() => generateFeeReceipt(rec)}
                                    title="Download PDF Receipt"
                                    className="h-7 w-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>

                                  {/* WhatsApp Reminder Action */}
                                  <button
                                    onClick={() => handleWhatsAppReminder(rec)}
                                    title="Send WhatsApp Reminder"
                                    className="h-7 w-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                                  >
                                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                                    </svg>
                                  </button>

                                  {/* Mark as Paid Action (if pending) */}
                                  {!isPaid && (
                                    <button
                                      onClick={() => handleMarkFeePaid(rec.id)}
                                      title="Mark as Paid"
                                      className="h-7 w-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* Delete Action */}
                                  <button
                                    onClick={() => handleDeleteFee(rec.id)}
                                    title="Delete Fee Record"
                                    className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
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

          {/* TAB 4: TEACHERS / STAFF */}
          {activeTab === "teachers" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-6 shadow-md border border-slate-200 h-fit space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-600" />
                  {editingTeacherId ? "Edit Staff" : "Add Staff Member"}
                </h3>
                <form onSubmit={handleSaveTeacher} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Staff Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Marcus Vance"
                      value={teacherForm.name}
                      onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. +92 300 9876543"
                      value={teacherForm.phone}
                      onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Monthly Salary (Rs.)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 35000"
                      value={teacherForm.monthly_salary}
                      onChange={(e) => setTeacherForm({ ...teacherForm, monthly_salary: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 px-4 rounded-lg bg-[#00a8e8] hover:bg-cyan-600 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex justify-center items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Save Staff
                    </button>
                    {editingTeacherId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTeacherId(null);
                          setTeacherForm({ name: "", phone: "", monthly_salary: "" });
                        }}
                        className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-md border border-slate-200 space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Staff Management Roster ({teachers.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                        <th className="py-3 px-4">Staff Member</th>
                        <th className="py-3 px-4">Phone</th>
                        <th className="py-3 px-4">Monthly Salary</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {teachers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400">
                            No staff members added yet.
                          </td>
                        </tr>
                      ) : (
                        teachers.map((t) => {
                          const initials = getInitials(t.name);
                          const colorClass = getAvatarColor(t.name);
                          return (
                            <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3.5 px-4 font-semibold text-slate-900">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-full ${colorClass} flex items-center justify-center font-bold text-xs shrink-0`}>
                                    {initials}
                                  </div>
                                  <span>{t.name}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-slate-600">{t.phone || "-"}</td>
                              <td className="py-3.5 px-4 font-bold text-cyan-600">
                                Rs. {Number(t.monthly_salary).toFixed(2)}
                              </td>
                              <td className="py-3.5 px-4 text-right space-x-1">
                                <button
                                  onClick={() => handleEditTeacher(t)}
                                  className="p-1.5 text-slate-400 hover:text-cyan-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTeacher(t.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
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
              <div className="bg-white rounded-lg p-6 shadow-md border border-slate-200 h-fit space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-pink-600" />
                  Record Salary Payment
                </h3>
                <form onSubmit={handleSaveSalary} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Select Staff *</label>
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="">-- Choose Staff Member --</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} - Salary: Rs. {t.monthly_salary}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Month *</label>
                    <input
                      type="month"
                      required
                      value={salaryForm.month}
                      onChange={(e) => setSalaryForm({ ...salaryForm, month: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Amount (Rs.) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 35000"
                      value={salaryForm.amount}
                      onChange={(e) => setSalaryForm({ ...salaryForm, amount: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Status *</label>
                    <select
                      value={salaryForm.status}
                      onChange={(e) => setSalaryForm({ ...salaryForm, status: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="paid">Paid</option>
                      <option value="unpaid">Pending / Unpaid</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex justify-center items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Save Salary Entry
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-md border border-slate-200 space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Salary Disbursements</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                        <th className="py-3 px-4">Staff Member</th>
                        <th className="py-3 px-4">Month</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {salaryRecords.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
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
                            <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3.5 px-4 font-semibold text-slate-900">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-full ${colorClass} flex items-center justify-center font-bold text-xs shrink-0`}>
                                    {initials}
                                  </div>
                                  <span>{name}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-slate-600">{rec.month}</td>
                              <td className="py-3.5 px-4 font-bold text-slate-900">Rs. {Number(rec.amount).toFixed(2)}</td>
                              <td className="py-3.5 px-4">
                                {isPaid ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700">
                                    Paid
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-700">
                                    Pending
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right space-x-1">
                                {!isPaid && (
                                  <button
                                    onClick={() => handleMarkSalaryPaid(rec.id)}
                                    className="px-2.5 py-1 bg-emerald-600 text-white rounded-md text-xs font-semibold hover:bg-emerald-700 cursor-pointer"
                                  >
                                    Paid
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteSalary(rec.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
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
              <div className="bg-white rounded-lg p-6 shadow-md border border-slate-200 h-fit space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-600" />
                  Add Income / Expense
                </h3>
                <form onSubmit={handleSaveExpense} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Electricity Bill or Book Sale"
                      value={expenseForm.title}
                      onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Amount (Rs.) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 4500"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Type *</label>
                    <select
                      value={expenseForm.type}
                      onChange={(e) =>
                        setExpenseForm({ ...expenseForm, type: e.target.value as "income" | "expense" })
                      }
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="expense">Expense (Outflow)</option>
                      <option value="income">Income (Inflow)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-lg bg-[#f39c12] hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex justify-center items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Save Record
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-md flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-emerald-600 uppercase">Extra Income</p>
                      <p className="text-2xl font-black text-slate-900 mt-0.5">+Rs. {totalExtraIncomeThisMonth.toLocaleString()}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-md flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-rose-600 uppercase">Other Expenses</p>
                      <p className="text-2xl font-black text-slate-900 mt-0.5">-Rs. {totalOtherExpensesThisMonth.toLocaleString()}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-rose-600 transform rotate-180" />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-md border border-slate-200 space-y-4">
                  <h3 className="text-lg font-bold text-slate-900">Expenses & Income Log</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Title</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {expenses.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400">
                              No expenses logged.
                            </td>
                          </tr>
                        ) : (
                          expenses.map((e) => (
                            <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3.5 px-4 text-slate-600">{e.date}</td>
                              <td className="py-3.5 px-4 font-semibold text-slate-900">{e.title}</td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full uppercase ${
                                    e.type === "income"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-rose-100 text-rose-700"
                                  }`}
                                >
                                  {e.type}
                                </span>
                              </td>
                              <td
                                className={`py-3.5 px-4 font-bold ${
                                  e.type === "income" ? "text-emerald-600" : "text-rose-600"
                                }`}
                              >
                                {e.type === "income" ? "+" : "-"}Rs. {Number(e.amount).toFixed(2)}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => handleDeleteExpense(e.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
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
      </div>
    </div>
  );
}
