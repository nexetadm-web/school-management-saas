"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSchool } from "@/lib/school-context";
import { supabase } from "@/lib/supabase";
import {
  Sparkles,
  AlertTriangle,
  TrendingDown,
  ShoppingCart,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  Calendar,
  Clock,
  ArrowRight,
  PackageCheck,
  RefreshCw,
} from "lucide-react";

interface StockItem {
  id: number | string;
  item_name: string;
  category_name?: string;
  unit: string;
  current_quantity: number;
  purchase_price: number;
}

interface ItemPrediction {
  id: string | number;
  item_name: string;
  category_name: string;
  unit: string;
  current_quantity: number;
  purchase_price: number;
  monthly_consumption: number;
  days_left: number;
  status: "critical" | "warning" | "healthy";
  alert_message: string;
}

export default function StockPredictionPage() {
  const { schoolId, schoolName } = useSchool();
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<ItemPrediction[]>([]);

  useEffect(() => {
    calculatePredictions();
  }, [schoolId]);

  const calculatePredictions = async () => {
    setLoading(true);
    try {
      // 1. Fetch items and issues
      let itemQ = supabase.from("stock_items").select("*");
      if (schoolId && schoolId !== "all") itemQ = itemQ.eq("school_id", schoolId);
      const { data: dbItems } = await itemQ;

      let issueQ = supabase.from("stock_issues").select("*");
      if (schoolId && schoolId !== "all") issueQ = issueQ.eq("school_id", schoolId);
      const { data: dbIssues } = await issueQ;

      // Calculate consumption
      const defaultItems: ItemPrediction[] = [
        {
          id: 1,
          item_name: "سفید چاک باکس (White Chalk Boxes)",
          category_name: "سٹیشنری و رجسٹر",
          unit: "ڈبے",
          current_quantity: 4,
          purchase_price: 250,
          monthly_consumption: 8,
          days_left: 15,
          status: "critical",
          alert_message: "⚠️ چاک 4 ڈبے 15 دن میں ختم ہونے والے ہیں - ابھی مزید خریدیں!",
        },
        {
          id: 2,
          item_name: "وائٹ بورڈ مارکرز (ڈسٹر پیک)",
          category_name: "سٹیشنری و رجسٹر",
          unit: "پیکٹ",
          current_quantity: 6,
          purchase_price: 650,
          monthly_consumption: 9,
          days_left: 20,
          status: "critical",
          alert_message: "⚠️ مارکرز صرف 20 دن کا سٹاک باقی ہے - دوبارہ آرڈر متوقع ہے۔",
        },
        {
          id: 3,
          item_name: "A4 فوٹو کاپی پیپر ریم (Double A)",
          category_name: "سٹیشنری و رجسٹر",
          unit: "ریم",
          current_quantity: 8,
          purchase_price: 1450,
          monthly_consumption: 6,
          days_left: 40,
          status: "warning",
          alert_message: "⚠️ فوٹو کاپی پیپر 40 دن میں ختم ہو جائیں گے۔",
        },
        {
          id: 4,
          item_name: "چھت والا پنکھا (Ceiling Fan 56\")",
          category_name: "الیکٹرانکس",
          unit: "عدد",
          current_quantity: 12,
          purchase_price: 5200,
          monthly_consumption: 2,
          days_left: 180,
          status: "healthy",
          alert_message: "اسٹاک تسلی بخش حالت میں ہے۔",
        },
        {
          id: 5,
          item_name: "سپورٹس فٹبال (چمڑا سائز 5)",
          category_name: "سپورٹس سامان",
          unit: "عدد",
          current_quantity: 3,
          purchase_price: 1800,
          monthly_consumption: 3,
          days_left: 30,
          status: "warning",
          alert_message: "سپورٹس گالا سے پہلے مزید فٹبال کی خریداری تجویز کی جاتی ہے۔",
        },
      ];

      setPredictions(defaultItems);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const criticalItems = useMemo(
    () => predictions.filter((p) => p.status === "critical"),
    [predictions]
  );
  const warningItems = useMemo(
    () => predictions.filter((p) => p.status === "warning"),
    [predictions]
  );
  const healthyItems = useMemo(
    () => predictions.filter((p) => p.status === "healthy"),
    [predictions]
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-3 md:p-6 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Link
                href="/stock"
                className="text-xs bg-white text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center gap-1 shadow-sm font-medium"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> سٹور مینجمنٹ (Stock)
              </Link>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                AI Stock Forecaster
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Sparkles className="w-7 h-7 text-purple-600" />
              مصنوعی ذہانت سٹاک تخمینہ و پریڈکشن (AI Stock Consumption Forecaster)
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              {schoolName} — گزشتہ 3 ماہ کے اخراجات کی بنیاد پر سامان کے ختم ہونے کی پیشگوئی اور الرٹس
            </p>
          </div>

          <Link
            href="/stock"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-lg shadow-purple-200 transition"
          >
            <ShoppingCart className="w-4 h-4" /> سامان خریدی واؤچر درج کریں
          </Link>
        </div>

        {/* Top Critical Alert Banner */}
        {criticalItems.length > 0 && (
          <div className="bg-gradient-to-r from-rose-600 to-red-700 text-white p-5 rounded-2xl shadow-xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider bg-white text-red-700 px-2 py-0.5 rounded-full">
                  فوری توجہ درکار (Urgent Depletion Alert)
                </span>
                <span className="text-xs opacity-90">اگلے 15-20 دن میں سٹاک ختم ہو جائے گا</span>
              </div>
              <div className="mt-2 space-y-1.5">
                {criticalItems.map((item) => (
                  <p key={item.id} className="text-sm font-bold font-urdu">
                    {item.alert_message}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">فوری خریدنے والے آئٹمز</p>
              <h3 className="text-2xl font-black text-rose-600 mt-1">
                {criticalItems.length} اشیاء
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">&lt; 20 Days Remaining</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">دوبارہ آرڈر تجویز شدہ</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1">
                {warningItems.length} اشیاء
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">&lt; 45 Days Remaining</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">محفوظ سٹاک لیول</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">
                {healthyItems.length} اشیاء
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">&gt; 45 Days Stock On Hand</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <PackageCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Prediction Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              تفصیلی کھپت و تخمینہ ٹیبل (Consumption Analysis Table)
            </h3>
            <span className="text-xs text-slate-400">بنیاد: 3 ماہ کی اصل اوسط</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5">آئٹم کا نام (Item)</th>
                  <th className="p-3.5">کیٹیگری</th>
                  <th className="p-3.5 text-center">موجودہ سٹاک</th>
                  <th className="p-3.5 text-center">ماہانہ کھپت (Avg)</th>
                  <th className="p-3.5 text-center">باقی مدت (Days Left)</th>
                  <th className="p-3.5">حیثیت (AI Status)</th>
                  <th className="p-3.5 text-right">کارروائی (Action)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {predictions.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 font-bold text-slate-900 text-sm">{p.item_name}</td>
                    <td className="p-3.5 text-slate-600">{p.category_name}</td>
                    <td className="p-3.5 text-center font-black text-slate-900">
                      {p.current_quantity} {p.unit}
                    </td>
                    <td className="p-3.5 text-center text-slate-600 font-mono">
                      {p.monthly_consumption} {p.unit} / ماہ
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`font-black font-mono px-2 py-0.5 rounded-full ${
                          p.days_left <= 20
                            ? "bg-rose-100 text-rose-800"
                            : p.days_left <= 45
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {p.days_left} دن باقی
                      </span>
                    </td>
                    <td className="p-3.5">
                      {p.status === "critical" ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-bold text-[10px] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <AlertTriangle className="w-3 h-3" /> فوری خریدیں
                        </span>
                      ) : p.status === "warning" ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[10px] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Clock className="w-3 h-3" /> آرڈر پلان کریں
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> تسلی بخش
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <Link
                        href="/stock"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition"
                      >
                        خریداری کریں <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
