"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { resolveActiveSchoolContext } from "@/lib/school-context";
import {
  BookCheck,
  BookOpen,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Plus,
  RotateCcw,
  Search,
  User,
} from "lucide-react";

interface Book {
  id: string;
  title: string;
  author: string;
  isbn_or_acc: string;
  category: string;
  total_copies: number;
  available_copies: number;
  school_id?: string;
}

interface IssuedBook {
  id: string;
  book_id: string;
  book_title: string;
  borrower_name: string;
  borrower_type: string; // "Student" | "Staff"
  issue_date: string;
  due_date: string;
  status: "Issued" | "Returned";
}

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<"catalog" | "issued">("catalog");
  const [books, setBooks] = useState<Book[]>([]);
  const [issuedList, setIssuedList] = useState<IssuedBook[]>([]);
  const [search, setSearch] = useState("");
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const [schoolContext, setSchoolContext] = useState<any>({
    schoolId: "",
    schoolName: "Registered School",
  });

  // Form states
  const [newBook, setNewBook] = useState({
    title: "",
    author: "",
    isbn_or_acc: "",
    category: "Islamic Studies",
    total_copies: 5,
  });

  const [issueForm, setIssueForm] = useState({
    borrower_name: "",
    borrower_type: "Student",
    due_date: "25-10-2026",
  });

  useEffect(() => {
    async function init() {
      const ctx = await resolveActiveSchoolContext();
      setSchoolContext(ctx);
      fetchData(ctx.schoolId ? String(ctx.schoolId) : undefined);
    }
    init();
  }, []);

  const fetchData = async (schoolId?: string) => {
    try {
      let q = supabase.from("library_books").select("*").order("title");
      if (schoolId) q = q.eq("school_id", schoolId);
      const { data, error } = await q;

      if (!error && data && data.length > 0) {
        setBooks(data);
      } else {
        // Fallback default books
        setBooks([
          {
            id: "1",
            title: "تفسیر تفہیم القرآن (مکمل سیٹ)",
            author: "سید ابوالاعلیٰ مودودی",
            isbn_or_acc: "ACC-101",
            category: "Islamic Studies",
            total_copies: 6,
            available_copies: 4,
          },
          {
            id: "2",
            title: "General Science - Conceptual Physics 9th",
            author: "Dr. Ghulam Rasool",
            isbn_or_acc: "ACC-102",
            category: "Science",
            total_copies: 15,
            available_copies: 11,
          },
          {
            id: "3",
            title: "بانگِ درا (کلیاتِ اقبال)",
            author: "علامہ محمد اقبال",
            isbn_or_acc: "ACC-103",
            category: "Urdu Literature",
            total_copies: 8,
            available_copies: 5,
          },
          {
            id: "4",
            title: "Oxford Advanced Learner's Dictionary",
            author: "A S Hornby",
            isbn_or_acc: "ACC-104",
            category: "English Reference",
            total_copies: 10,
            available_copies: 8,
          },
          {
            id: "5",
            title: "سیرت النبی ﷺ (حصہ اول تا چہارم)",
            author: "علامہ شبلی نعمانی و سید سلیمان ندوی",
            isbn_or_acc: "ACC-105",
            category: "Islamic Studies",
            total_copies: 5,
            available_copies: 2,
          },
        ]);
      }

      // Initial issued books
      setIssuedList([
        {
          id: "iss-1",
          book_id: "1",
          book_title: "تفسیر تفہیم القرآن (مکمل سیٹ)",
          borrower_name: "محمد عبداللہ (Class 9th)",
          borrower_type: "Student",
          issue_date: "01-10-2026",
          due_date: "15-10-2026",
          status: "Issued",
        },
        {
          id: "iss-2",
          book_id: "3",
          book_title: "بانگِ درا (کلیاتِ اقبال)",
          borrower_name: "سر طارق محمود (Urdu Teacher)",
          borrower_type: "Staff",
          issue_date: "28-09-2026",
          due_date: "12-10-2026",
          status: "Issued",
        },
      ]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBook.title.trim()) return;

    const bookItem: Book = {
      id: Date.now().toString(),
      ...newBook,
      available_copies: newBook.total_copies,
      school_id: schoolContext.schoolId || undefined,
    };

    setBooks((prev) => [bookItem, ...prev]);
    setShowAddBookModal(false);
    setNewBook({
      title: "",
      author: "",
      isbn_or_acc: "",
      category: "Islamic Studies",
      total_copies: 5,
    });
  };

  const handleOpenIssueModal = (book: Book) => {
    setSelectedBook(book);
    setShowIssueModal(true);
  };

  const handleConfirmIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook || !issueForm.borrower_name) return;

    const newIssue: IssuedBook = {
      id: `iss-${Date.now()}`,
      book_id: selectedBook.id,
      book_title: selectedBook.title,
      borrower_name: issueForm.borrower_name,
      borrower_type: issueForm.borrower_type,
      issue_date: new Date().toLocaleDateString("en-GB").replace(/\//g, "-"),
      due_date: issueForm.due_date,
      status: "Issued",
    };

    setIssuedList((prev) => [newIssue, ...prev]);
    setBooks((prev) =>
      prev.map((b) =>
        b.id === selectedBook.id ? { ...b, available_copies: Math.max(0, b.available_copies - 1) } : b
      )
    );

    setShowIssueModal(false);
    setIssueForm({ borrower_name: "", borrower_type: "Student", due_date: "25-10-2026" });
  };

  const handleReturnBook = (issueId: string, bookId: string) => {
    setIssuedList((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, status: "Returned" } : i))
    );
    setBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, available_copies: b.available_copies + 1 } : b))
    );
  };

  const filteredBooks = books.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase()) ||
      b.isbn_or_acc.toLowerCase().includes(search.toLowerCase()) ||
      b.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalCopiesCount = books.reduce((sum, b) => sum + (b.total_copies || 0), 0);
  const activeIssuesCount = issuedList.filter((i) => i.status === "Issued").length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-3 md:p-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/"
                className="text-xs bg-white text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center gap-1 shadow-sm font-medium"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> ڈیش بورڈ (Dashboard)
              </Link>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                Library Module
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-teal-600" />
              سکول لائبریری مینجمنٹ سسٹم (School Library Management)
            </h1>
            <p className="text-xs md:text-sm text-slate-500">
              {schoolContext.schoolName} — کتب کا ذخیرہ، اجراء، واپسی اور ریکارڈ
            </p>
          </div>

          <button
            onClick={() => setShowAddBookModal(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold shadow-lg shadow-teal-200 hover:brightness-105 transition active:scale-95 text-sm"
          >
            <Plus className="w-4 h-4" /> نئی کتاب کا اندراج (Add Book)
          </button>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">کل کتب کی اقسام</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{books.length} عناوین</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Total Unique Book Titles</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Bookmark className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">مجموعی کتب کی تعداد</p>
              <h3 className="text-2xl font-black text-blue-700 mt-1">{totalCopiesCount} جلدیں</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Total Volumes In Stock</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <BookCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">جاری شدہ کتب (Issued)</p>
              <h3 className="text-2xl font-black text-amber-700 mt-1">{activeIssuesCount} کتب</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Currently Borrowed by Students/Staff</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Tab Switcher & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("catalog")}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-2 ${
                activeTab === "catalog"
                  ? "bg-teal-600 text-white shadow-md shadow-teal-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <BookOpen className="w-4 h-4" /> کتب کی فہرست (Catalog)
            </button>
            <button
              onClick={() => setActiveTab("issued")}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-2 ${
                activeTab === "issued"
                  ? "bg-teal-600 text-white shadow-md shadow-teal-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Clock className="w-4 h-4" /> جاری شدہ کتب (Issued Tracker)
              {activeIssuesCount > 0 && (
                <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-mono">
                  {activeIssuesCount}
                </span>
              )}
            </button>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="تلاش کریں کتاب کا نام، مصنف یا Accession No..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Tab 1: Catalog */}
        {activeTab === "catalog" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3.5">نمبر / Acc No</th>
                    <th className="p-3.5">کتاب کا نام (Title)</th>
                    <th className="p-3.5">مصنف (Author)</th>
                    <th className="p-3.5">کیٹیگری</th>
                    <th className="p-3.5 text-center">دستیاب / کل کاپیاں</th>
                    <th className="p-3.5 text-right">کارروائی (Action)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBooks.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5 font-mono font-bold text-slate-600">{b.isbn_or_acc || "—"}</td>
                      <td className="p-3.5 font-bold text-slate-900 text-sm">{b.title}</td>
                      <td className="p-3.5 text-slate-600">{b.author || "—"}</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          {b.category}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`font-black text-sm px-2.5 py-0.5 rounded-full ${
                            b.available_copies > 0
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {b.available_copies} / {b.total_copies}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          disabled={b.available_copies <= 0}
                          onClick={() => handleOpenIssueModal(b)}
                          className="px-3.5 py-1.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 disabled:pointer-events-none font-bold text-xs shadow-sm transition"
                        >
                          کتاب جاری کریں (Issue)
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Issued Tracker */}
        {activeTab === "issued" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3.5">کتاب</th>
                    <th className="p-3.5">حاصل کنندہ (Borrower)</th>
                    <th className="p-3.5">نوعیت</th>
                    <th className="p-3.5">تاریخِ اجراء</th>
                    <th className="p-3.5">آخری تاریخ (Due Date)</th>
                    <th className="p-3.5">حیثیت (Status)</th>
                    <th className="p-3.5 text-right">واپسی (Return)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {issuedList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5 font-bold text-slate-900">{item.book_title}</td>
                      <td className="p-3.5 font-semibold text-slate-700">{item.borrower_name}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                          {item.borrower_type}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-500">{item.issue_date}</td>
                      <td className="p-3.5 font-mono font-bold text-amber-700">{item.due_date}</td>
                      <td className="p-3.5">
                        {item.status === "Issued" ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] flex items-center gap-1 w-max">
                            <Clock className="w-3 h-3" /> جاری ہے
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] flex items-center gap-1 w-max">
                            <CheckCircle2 className="w-3 h-3" /> واپس ہو گئی
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        {item.status === "Issued" ? (
                          <button
                            onClick={() => handleReturnBook(item.id, item.book_id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs shadow-sm transition"
                          >
                            <RotateCcw className="w-3 h-3" /> کتاب واپس لیں
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">مکمل (Done)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Add Book */}
        {showAddBookModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
              <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-600" />
                نئی کتاب لائبریری میں شامل کریں
              </h3>

              <form onSubmit={handleAddBook} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">کتاب کا نام (Book Title)</label>
                  <input
                    type="text"
                    required
                    value={newBook.title}
                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                    placeholder="مثال: دیوان غالب"
                    className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">مصنف (Author)</label>
                    <input
                      type="text"
                      value={newBook.author}
                      onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                      placeholder="مصنف کا نام"
                      className="w-full p-2.5 border rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Accession / ISBN</label>
                    <input
                      type="text"
                      value={newBook.isbn_or_acc}
                      onChange={(e) => setNewBook({ ...newBook, isbn_or_acc: e.target.value })}
                      placeholder="ACC-108"
                      className="w-full p-2.5 border rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">کیٹیگری</label>
                    <select
                      value={newBook.category}
                      onChange={(e) => setNewBook({ ...newBook, category: e.target.value })}
                      className="w-full p-2.5 border rounded-xl outline-none"
                    >
                      <option value="Islamic Studies">Islamic Studies</option>
                      <option value="Urdu Literature">Urdu Literature</option>
                      <option value="Science">Science</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="English Reference">English Reference</option>
                      <option value="General Knowledge">General Knowledge</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">کل کاپیاں (Total Copies)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newBook.total_copies}
                      onChange={(e) => setNewBook({ ...newBook, total_copies: Number(e.target.value) })}
                      className="w-full p-2.5 border rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddBookModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                  >
                    منسوخ (Cancel)
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 shadow-md"
                  >
                    محفوظ کریں (Save)
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Issue Book */}
        {showIssueModal && selectedBook && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
              <h3 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
                <BookCheck className="w-5 h-5 text-teal-600" />
                کتاب جاری کریں (Issue Book)
              </h3>
              <p className="text-xs text-slate-500 mb-4 font-semibold">{selectedBook.title}</p>

              <form onSubmit={handleConfirmIssue} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">حاصل کنندہ کا نام (Borrower)</label>
                  <input
                    type="text"
                    required
                    value={issueForm.borrower_name}
                    onChange={(e) => setIssueForm({ ...issueForm, borrower_name: e.target.value })}
                    placeholder="طالب علم کا نام اور کلاس یا استاد کا نام"
                    className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">نوعیت (Borrower Type)</label>
                    <select
                      value={issueForm.borrower_type}
                      onChange={(e) => setIssueForm({ ...issueForm, borrower_type: e.target.value })}
                      className="w-full p-2.5 border rounded-xl outline-none"
                    >
                      <option value="Student">طالب علم (Student)</option>
                      <option value="Staff">استاد / سٹاف (Staff)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">آخری تاریخ واپسی (Due Date)</label>
                    <input
                      type="text"
                      required
                      value={issueForm.due_date}
                      onChange={(e) => setIssueForm({ ...issueForm, due_date: e.target.value })}
                      placeholder="DD-MM-YYYY"
                      className="w-full p-2.5 border rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowIssueModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                  >
                    منسوخ (Cancel)
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 shadow-md"
                  >
                    جاری کریں (Confirm Issue)
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
