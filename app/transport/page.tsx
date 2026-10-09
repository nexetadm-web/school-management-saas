"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { resolveActiveSchoolContext } from "@/lib/school-context";
import {
  Bus,
  ChevronLeft,
  DollarSign,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  Users,
} from "lucide-react";

interface TransportRoute {
  id: string;
  route_name: string;
  vehicle_number: string;
  driver_name: string;
  driver_phone: string;
  monthly_fee: number;
  capacity: number;
  school_id?: string;
  students_count?: number;
}

export default function TransportPage() {
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [schoolContext, setSchoolContext] = useState<any>({
    schoolId: "",
    schoolName: "OA Smart School",
  });

  // New route form
  const [formData, setFormData] = useState({
    route_name: "",
    vehicle_number: "",
    driver_name: "",
    driver_phone: "",
    monthly_fee: 1500,
    capacity: 25,
  });

  useEffect(() => {
    async function init() {
      const ctx = await resolveActiveSchoolContext();
      setSchoolContext(ctx);
      fetchRoutes(ctx.schoolId ? String(ctx.schoolId) : undefined);
    }
    init();
  }, []);

  const fetchRoutes = async (schoolId?: string) => {
    setLoading(true);
    try {
      let q = supabase.from("transport_routes").select("*").order("route_name");
      if (schoolId) {
        q = q.eq("school_id", schoolId);
      }
      const { data, error } = await q;
      if (!error && data && data.length > 0) {
        setRoutes(data);
      } else {
        // Fallback default sample data
        setRoutes([
          {
            id: "1",
            route_name: "Route 1: Sillanwali City to Campus",
            vehicle_number: "LES-4120 (Hiace Van)",
            driver_name: "Muhammad Aslam",
            driver_phone: "0301-7654321",
            monthly_fee: 1500,
            capacity: 22,
            students_count: 18,
          },
          {
            id: "2",
            route_name: "Route 2: Kot Momin Morh & Chak 128",
            vehicle_number: "FSD-8890 (Coaster)",
            driver_name: "Tariq Mehmood",
            driver_phone: "0305-9876543",
            monthly_fee: 2000,
            capacity: 32,
            students_count: 27,
          },
          {
            id: "3",
            route_name: "Route 3: Station Chowk to Junior Branch",
            vehicle_number: "SGD-3341 (Bolan)",
            driver_name: "Rashid Ali",
            driver_phone: "0302-3344556",
            monthly_fee: 1200,
            capacity: 14,
            students_count: 12,
          },
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.route_name.trim()) return;

    try {
      const newEntry = {
        ...formData,
        school_id: schoolContext.schoolId || undefined,
      };

      const { data, error } = await supabase
        .from("transport_routes")
        .insert([newEntry])
        .select()
        .single();

      if (!error && data) {
        setRoutes((prev) => [data, ...prev]);
      } else {
        // Local state fallback
        const mockNew: TransportRoute = {
          id: Date.now().toString(),
          ...formData,
          students_count: 0,
        };
        setRoutes((prev) => [mockNew, ...prev]);
      }

      setShowAddModal(false);
      setFormData({
        route_name: "",
        vehicle_number: "",
        driver_name: "",
        driver_phone: "",
        monthly_fee: 1500,
        capacity: 25,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredRoutes = routes.filter(
    (r) =>
      r.route_name.toLowerCase().includes(search.toLowerCase()) ||
      r.driver_name.toLowerCase().includes(search.toLowerCase()) ||
      r.vehicle_number.toLowerCase().includes(search.toLowerCase())
  );

  const totalSeats = routes.reduce((sum, r) => sum + (r.capacity || 0), 0);
  const totalStudents = routes.reduce((sum, r) => sum + (r.students_count || 0), 0);

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
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Transport Fleet
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Bus className="w-6 h-6 text-amber-600" />
              سکول ٹرانسپورٹ و وین مینجمنٹ (School Transport Management)
            </h1>
            <p className="text-xs md:text-sm text-slate-500">
              {schoolContext.schoolName} — روٹس، ڈرائیورز، گاڑیاں اور طلبہ وین ایلوکیشن
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold shadow-lg shadow-amber-200 hover:brightness-105 transition active:scale-95 text-sm"
          >
            <Plus className="w-4 h-4" /> نیا روٹ شامل کریں (Add Route)
          </button>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">کل روٹس / گاڑیاں</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{routes.length}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Active Transport Fleet</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Bus className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">سوار طلباء / کل نشستیں</p>
              <h3 className="text-2xl font-black text-blue-700 mt-1">
                {totalStudents} <span className="text-sm font-normal text-slate-400">/ {totalSeats}</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {totalSeats > 0 ? Math.round((totalStudents / totalSeats) * 100) : 0}% سیٹیں پُر ہیں
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">ماہانہ فیس کلیکشن متوقع</p>
              <h3 className="text-2xl font-black text-emerald-700 mt-1">
                Rs. {(totalStudents * 1500).toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Monthly Van Fee Accrual</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filter and Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="تلاش کریں روٹ کا نام، گاڑی نمبر یا ڈرائیور..."
              className="w-full pl-9 pr-3 py-2 text-xs md:text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Routes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoutes.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                      <Bus className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">{r.route_name}</h4>
                      <span className="text-[11px] font-mono text-slate-500">{r.vehicle_number}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 py-3 border-y border-slate-100 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <User className="w-3.5 h-3.5 text-slate-400" /> ڈرائیور:
                    </span>
                    <span className="font-semibold text-slate-800">{r.driver_name}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> فون نمبر:
                    </span>
                    <a
                      href={`tel:${r.driver_phone}`}
                      className="font-mono text-indigo-600 hover:underline font-semibold"
                    >
                      {r.driver_phone}
                    </a>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400" /> ماہانہ فیس:
                    </span>
                    <span className="font-bold text-emerald-700">Rs. {r.monthly_fee.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Users className="w-3.5 h-3.5 text-slate-400" /> نشستیں:
                    </span>
                    <span className="font-semibold text-slate-800">
                      {r.students_count || 0} / {r.capacity} طلبہ
                    </span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="mt-4 pt-2 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">حیثیت: فعال (Active)</span>
                <a
                  href={`https://wa.me/${r.driver_phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold transition flex items-center gap-1"
                >
                  WhatsApp ڈرائیور
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Modal: Add Route */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
              <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                <Bus className="w-5 h-5 text-amber-600" />
                نیا وین / بس روٹ شامل کریں
              </h3>

              <form onSubmit={handleSaveRoute} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">روٹ کا نام (Route Name / Area)</label>
                  <input
                    type="text"
                    required
                    value={formData.route_name}
                    onChange={(e) => setFormData({ ...formData, route_name: e.target.value })}
                    placeholder="مثال: روٹ 4 - ریلوے روڈ تا مین کیمپس"
                    className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">گاڑی نمبر (Vehicle No)</label>
                    <input
                      type="text"
                      required
                      value={formData.vehicle_number}
                      onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                      placeholder="FSD-1234 (Hiace)"
                      className="w-full p-2.5 border rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">نشستیں (Capacity)</label>
                    <input
                      type="number"
                      required
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                      className="w-full p-2.5 border rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">ڈرائیور کا نام</label>
                    <input
                      type="text"
                      required
                      value={formData.driver_name}
                      onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                      placeholder="ڈرائیور کا نام"
                      className="w-full p-2.5 border rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">ڈرائیور فون نمبر</label>
                    <input
                      type="text"
                      required
                      value={formData.driver_phone}
                      onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
                      placeholder="0300-1234567"
                      className="w-full p-2.5 border rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">ماہانہ وین فیس (Rs.)</label>
                  <input
                    type="number"
                    required
                    value={formData.monthly_fee}
                    onChange={(e) => setFormData({ ...formData, monthly_fee: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl outline-none"
                  />
                </div>

                <div className="pt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                  >
                    منسوخ (Cancel)
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 shadow-md"
                  >
                    محفوظ کریں (Save)
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
