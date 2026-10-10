"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { resolveActiveSchoolContext } from "@/lib/school-context";
import { SchoolLogo } from "@/components/school-branding";
import { getTodayPKDate } from "@/lib/date-utils";
import { formatPKR } from "@/lib/govt-registers";
import {
  ArrowLeft,
  Package,
  Layers,
  ShoppingBag,
  Send,
  MapPin,
  Plus,
  Trash2,
  Edit,
  Printer,
  FileSpreadsheet,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Eye,
  History,
  Building,
  DollarSign,
  TrendingUp,
  Tag,
  Check,
  X,
  FileText,
  Boxes,
} from "lucide-react";

// Types
interface StockCategory {
  id: string | number;
  name: string;
}

interface StockLocation {
  id: string | number;
  location_name: string;
}

interface StockItem {
  id: string | number;
  category_id: string | number | null;
  category_name?: string;
  item_name: string;
  unit: string; // عدد, سیٹ, کلو, میٹر, ڈبہ
  purchase_price: number;
  total_quantity: number;
  current_quantity: number;
  min_limit: number;
  image_url?: string | null;
}

interface StockPurchase {
  id: string | number;
  item_id: string | number;
  item_name?: string;
  quantity_in: number;
  price_per_unit: number;
  total_price: number;
  vendor_name: string;
  bill_no: string;
  purchase_date: string;
  added_by?: string;
}

interface StockIssue {
  id: string | number;
  item_id: string | number;
  item_name?: string;
  quantity_out: number;
  issued_to_type: string;
  issued_to_name: string;
  location_name: string;
  purpose: string;
  issued_by?: string;
  issue_date: string;
  returnable: boolean;
  returned_quantity: number;
  status: "issued" | "returned" | "damaged";
}

const DEFAULT_CATEGORIES: StockCategory[] = [
  { id: 1, name: "فرنیچر (Furniture)" },
  { id: 2, name: "الیکٹرانکس (Electronics)" },
  { id: 3, name: "سٹیشنری و رجسٹر (Stationery)" },
  { id: 4, name: "سپورٹس سامان (Sports)" },
  { id: 5, name: "سائنس لیب (Lab Equipment)" },
  { id: 6, name: "صفائی و دیگر سامان (Cleaning & General)" },
];

const DEFAULT_LOCATIONS: StockLocation[] = [
  { id: 1, location_name: "مین سٹور روم (Main Store)" },
  { id: 2, location_name: "کمرہ نمبر 1 (کلاس اول)" },
  { id: 3, location_name: "کمرہ نمبر 2 (کلاس دوم)" },
  { id: 4, location_name: "کمرہ نمبر 3 (کلاس سوم)" },
  { id: 5, location_name: "کمرہ نمبر 4 (کلاس چہارم)" },
  { id: 6, location_name: "کمرہ نمبر 5 (کلاس پنجم)" },
  { id: 7, location_name: "کمرہ نمبر 8 (کلاس دہم)" },
  { id: 8, location_name: "سٹاف روم (Staff Room)" },
  { id: 9, location_name: "ہیڈ آفس (Principal Office)" },
  { id: 10, location_name: "سائنس لیب (Science Lab)" },
  { id: 11, location_name: "پلے گراؤنڈ (Sports Ground)" },
];

const DEFAULT_STOCK_ITEMS: StockItem[] = [
  {
    id: 1,
    category_id: 1,
    category_name: "فرنیچر (Furniture)",
    item_name: "سٹوڈنٹ کرسی (پلاسٹک)",
    unit: "عدد",
    purchase_price: 1800,
    total_quantity: 60,
    current_quantity: 15,
    min_limit: 10,
  },
  {
    id: 2,
    category_id: 1,
    category_name: "فرنیچر (Furniture)",
    item_name: "لکڑی کا ڈیسک / میز",
    unit: "عدد",
    purchase_price: 4500,
    total_quantity: 30,
    current_quantity: 6,
    min_limit: 5,
  },
  {
    id: 3,
    category_id: 2,
    category_name: "الیکٹرانکس (Electronics)",
    item_name: "چھت والا پنکھا (Ceiling Fan 56\")",
    unit: "عدد",
    purchase_price: 6200,
    total_quantity: 24,
    current_quantity: 4,
    min_limit: 5, // Triggers low stock alert
  },
  {
    id: 4,
    category_id: 2,
    category_name: "الیکٹرانکس (Electronics)",
    item_name: "LED ٹیوب لائٹ راڈ",
    unit: "عدد",
    purchase_price: 850,
    total_quantity: 40,
    current_quantity: 8,
    min_limit: 5,
  },
  {
    id: 5,
    category_id: 3,
    category_name: "سٹیشنری و رجسٹر (Stationery)",
    item_name: "طالب علم حاضری رجسٹر (حاضری بہی)",
    unit: "عدد",
    purchase_price: 350,
    total_quantity: 50,
    current_quantity: 12,
    min_limit: 10,
  },
  {
    id: 6,
    category_id: 3,
    category_name: "سٹیشنری و رجسٹر (Stationery)",
    item_name: "سفید وائٹ بورڈ 4x6 فٹ",
    unit: "عدد",
    purchase_price: 3200,
    total_quantity: 12,
    current_quantity: 2,
    min_limit: 3, // Low stock
  },
  {
    id: 7,
    category_id: 4,
    category_name: "سپورٹس سامان (Sports)",
    item_name: "فٹبال چیمپئن شپ سائز 5",
    unit: "عدد",
    purchase_price: 2400,
    total_quantity: 10,
    current_quantity: 4,
    min_limit: 3,
  },
  {
    id: 8,
    category_id: 5,
    category_name: "سائنس لیب (Lab Equipment)",
    item_name: "کمپاؤنڈ مائیکروسکوپ",
    unit: "سیٹ",
    purchase_price: 18500,
    total_quantity: 6,
    current_quantity: 2,
    min_limit: 2,
  },
];

const DEFAULT_PURCHASES: StockPurchase[] = [
  {
    id: 1,
    item_id: 1,
    item_name: "سٹوڈنٹ کرسی (پلاسٹک)",
    quantity_in: 60,
    price_per_unit: 1800,
    total_price: 108000,
    vendor_name: "ماسٹر فرنیچر مارکیٹ",
    bill_no: "MF-4901",
    purchase_date: "15-09-2026",
    added_by: "ایڈمن",
  },
  {
    id: 2,
    item_id: 3,
    item_name: "چھت والا پنکھا (Ceiling Fan 56\")",
    quantity_in: 24,
    price_per_unit: 6200,
    total_price: 148800,
    vendor_name: "پاک فین ڈیلر سلانوالی",
    bill_no: "PF-882",
    purchase_date: "20-09-2026",
    added_by: "ایڈمن",
  },
  {
    id: 3,
    item_id: 5,
    item_name: "طالب علم حاضری رجسٹر (حاضری بہی)",
    quantity_in: 50,
    price_per_unit: 350,
    total_price: 17500,
    vendor_name: "صاحب پبلشرز و سٹیشنرز",
    bill_no: "SP-1092",
    purchase_date: "01-10-2026",
    added_by: "ایڈمن",
  },
];

const DEFAULT_ISSUES: StockIssue[] = [
  {
    id: 1,
    item_id: 1,
    item_name: "سٹوڈنٹ کرسی (پلاسٹک)",
    quantity_out: 25,
    issued_to_type: "Class",
    issued_to_name: "کلاس دہم سائنس",
    location_name: "کمرہ نمبر 8 (کلاس دہم)",
    purpose: "نئے سیشن کے طلباء کے بیٹھنے کے لیے",
    issue_date: "16-09-2026",
    returnable: false,
    returned_quantity: 0,
    status: "issued",
  },
  {
    id: 2,
    item_id: 1,
    item_name: "سٹوڈنٹ کرسی (پلاسٹک)",
    quantity_out: 20,
    issued_to_type: "Class",
    issued_to_name: "کلاس پنجم",
    location_name: "کمرہ نمبر 5 (کلاس پنجم)",
    purpose: "پرانی ٹوٹی کرسیوں کے بدلے نیا سامان",
    issue_date: "18-09-2026",
    returnable: false,
    returned_quantity: 0,
    status: "issued",
  },
  {
    id: 3,
    item_id: 3,
    item_name: "چھت والا پنکھا (Ceiling Fan 56\")",
    quantity_out: 4,
    issued_to_type: "Room",
    issued_to_name: "سائنس لیب",
    location_name: "سائنس لیب (Science Lab)",
    purpose: "لیبارٹری میں وینٹیلیشن کی تنصیب",
    issue_date: "22-09-2026",
    returnable: false,
    returned_quantity: 0,
    status: "issued",
  },
  {
    id: 4,
    item_id: 3,
    item_name: "چھت والا پنکھا (Ceiling Fan 56\")",
    quantity_out: 16,
    issued_to_type: "Room",
    issued_to_name: "کلاس رومز 1 تا 8",
    location_name: "مختلف کلاس رومز",
    purpose: "ہر کلاس میں 2 پنکھے لگائے گئے",
    issue_date: "24-09-2026",
    returnable: false,
    returned_quantity: 0,
    status: "issued",
  },
  {
    id: 5,
    item_id: 7,
    item_name: "فٹبال چیمپئن شپ سائز 5",
    quantity_out: 2,
    issued_to_type: "Teacher",
    issued_to_name: "پی ٹی آئی استاد طاہر",
    location_name: "پلے گراؤنڈ (Sports Ground)",
    purpose: "انٹر کلاس فٹبال ٹورنامنٹ پریکٹس",
    issue_date: getTodayPKDate(),
    returnable: true,
    returned_quantity: 0,
    status: "issued",
  },
];

export default function StockInventoryPage() {
  const [loading, setLoading] = useState(true);
  const [schoolContext, setSchoolContext] = useState<any>(null);

  // Active Tab: dashboard | purchase | issue | locations
  const [activeTab, setActiveTab] = useState<"dashboard" | "purchase" | "issue" | "locations">("dashboard");

  // State
  const [categories, setCategories] = useState<StockCategory[]>(DEFAULT_CATEGORIES);
  const [locations, setLocations] = useState<StockLocation[]>(DEFAULT_LOCATIONS);
  const [stockItems, setStockItems] = useState<StockItem[]>(DEFAULT_STOCK_ITEMS);
  const [purchases, setPurchases] = useState<StockPurchase[]>(DEFAULT_PURCHASES);
  const [issues, setIssues] = useState<StockIssue[]>(DEFAULT_ISSUES);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [selectedLocationReport, setSelectedLocationReport] = useState("all");

  // Modals
  const [detailModalItem, setDetailModalItem] = useState<StockItem | null>(null);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isPurchaseSlipOpen, setIsPurchaseSlipOpen] = useState(false);
  const [activeSlipPurchase, setActiveSlipPurchase] = useState<StockPurchase | null>(null);

  // New Item Form
  const [newItemForm, setNewItemForm] = useState({
    item_name: "",
    category_id: "",
    unit: "عدد",
    purchase_price: "",
    initial_quantity: "0",
    min_limit: "5",
  });

  // Purchase Form
  const [purchaseForm, setPurchaseForm] = useState({
    item_id: "",
    quantity_in: "",
    price_per_unit: "",
    vendor_name: "",
    bill_no: "",
    purchase_date: getTodayPKDate(),
  });

  // Issue Form
  const [issueForm, setIssueForm] = useState({
    item_id: "",
    quantity_out: "",
    issued_to_type: "Class",
    issued_to_name: "",
    location_name: "",
    purpose: "",
    issue_date: getTodayPKDate(),
    returnable: false,
  });

  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const ctx = await resolveActiveSchoolContext();
      setSchoolContext(ctx);

      const storageKey = `oa_stock_${ctx?.schoolId || "all"}`;

      let loadedItems = DEFAULT_STOCK_ITEMS;
      let loadedPurchases = DEFAULT_PURCHASES;
      let loadedIssues = DEFAULT_ISSUES;
      let loadedCats = DEFAULT_CATEGORIES;
      let loadedLocs = DEFAULT_LOCATIONS;

      // 1. Try Supabase
      try {
        let catQ = supabase.from("stock_categories").select("*");
        if (ctx?.schoolId) catQ = catQ.eq("school_id", ctx.schoolId);
        const { data: dbCats } = await catQ;
        if (dbCats && dbCats.length > 0) loadedCats = dbCats;

        let locQ = supabase.from("stock_locations").select("*");
        if (ctx?.schoolId) locQ = locQ.eq("school_id", ctx.schoolId);
        const { data: dbLocs } = await locQ;
        if (dbLocs && dbLocs.length > 0) loadedLocs = dbLocs;

        let itemQ = supabase.from("stock_items").select("*");
        if (ctx?.schoolId) itemQ = itemQ.eq("school_id", ctx.schoolId);
        const { data: dbItems } = await itemQ;
        if (dbItems && dbItems.length > 0) {
          loadedItems = dbItems.map((item: any) => ({
            ...item,
            purchase_price: Number(item.purchase_price || 0),
            total_quantity: Number(item.total_quantity || 0),
            current_quantity: Number(item.current_quantity || 0),
            min_limit: Number(item.min_limit || 5),
          }));
        }

        let purQ = supabase.from("stock_purchases").select("*").order("id", { ascending: false });
        if (ctx?.schoolId) purQ = purQ.eq("school_id", ctx.schoolId);
        const { data: dbPurchases } = await purQ;
        if (dbPurchases && dbPurchases.length > 0) loadedPurchases = dbPurchases;

        let issQ = supabase.from("stock_issues").select("*").order("id", { ascending: false });
        if (ctx?.schoolId) issQ = issQ.eq("school_id", ctx.schoolId);
        const { data: dbIssues } = await issQ;
        if (dbIssues && dbIssues.length > 0) loadedIssues = dbIssues;
      } catch (err) {}

      // 2. Fallback to localStorage
      if (typeof window !== "undefined") {
        const local = localStorage.getItem(storageKey);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (parsed.items && parsed.items.length > 0) loadedItems = parsed.items;
            if (parsed.purchases && parsed.purchases.length > 0) loadedPurchases = parsed.purchases;
            if (parsed.issues && parsed.issues.length > 0) loadedIssues = parsed.issues;
            if (parsed.categories && parsed.categories.length > 0) loadedCats = parsed.categories;
            if (parsed.locations && parsed.locations.length > 0) loadedLocs = parsed.locations;
          } catch (e) {}
        }
      }

      setCategories(loadedCats);
      setLocations(loadedLocs);
      setStockItems(loadedItems);
      setPurchases(loadedPurchases);
      setIssues(loadedIssues);
    } catch (err: any) {
      console.error(err);
      showToast("error", "سٹاک ڈیٹا لوڈ کرنے میں خرابی");
    } finally {
      setLoading(false);
    }
  };

  const syncToLocalStorage = (
    items = stockItems,
    purs = purchases,
    isss = issues,
    cats = categories,
    locs = locations
  ) => {
    if (typeof window !== "undefined") {
      const storageKey = `oa_stock_${schoolContext?.schoolId || "all"}`;
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          items,
          purchases: purs,
          issues: isss,
          categories: cats,
          locations: locs,
        })
      );
    }
  };

  // Dashboard Stats
  const stats = useMemo(() => {
    const totalItemsCount = stockItems.length;
    const totalValuation = stockItems.reduce(
      (sum, item) => sum + item.current_quantity * item.purchase_price,
      0
    );
    const lowStockCount = stockItems.filter(
      (item) => item.current_quantity <= item.min_limit
    ).length;

    const todayDate = getTodayPKDate();
    const issuedTodayCount = issues
      .filter((iss) => iss.issue_date === todayDate)
      .reduce((sum, iss) => sum + iss.quantity_out, 0);

    return {
      totalItemsCount,
      totalValuation,
      lowStockCount,
      issuedTodayCount,
    };
  }, [stockItems, issues]);

  // Filtered Items for Tab 1
  const filteredStockItems = useMemo(() => {
    return stockItems.filter((item) => {
      const matchesSearch =
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.category_name && item.category_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategoryFilter === "all" ||
        String(item.category_id) === String(selectedCategoryFilter);

      return matchesSearch && matchesCat;
    });
  }, [stockItems, searchQuery, selectedCategoryFilter]);

  // Handle Add New Stock Item
  const handleAddNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemForm.item_name) {
      showToast("error", "آئٹم کا نام درج کریں");
      return;
    }

    const catObj = categories.find((c) => String(c.id) === String(newItemForm.category_id));
    const initQty = parseInt(newItemForm.initial_quantity) || 0;
    const price = parseFloat(newItemForm.purchase_price) || 0;

    const newItem: StockItem = {
      id: "item-" + Date.now(),
      item_name: newItemForm.item_name,
      category_id: newItemForm.category_id || (categories[0]?.id ?? null),
      category_name: catObj?.name || "جنرل",
      unit: newItemForm.unit,
      purchase_price: price,
      total_quantity: initQty,
      current_quantity: initQty,
      min_limit: parseInt(newItemForm.min_limit) || 5,
    };

    const updated = [newItem, ...stockItems];
    setStockItems(updated);
    syncToLocalStorage(updated, purchases, issues);

    try {
      await supabase.from("stock_items").insert({
        school_id: schoolContext?.schoolId || null,
        item_name: newItem.item_name,
        category_id: newItem.category_id,
        unit: newItem.unit,
        purchase_price: newItem.purchase_price,
        total_quantity: newItem.total_quantity,
        current_quantity: newItem.current_quantity,
        min_limit: newItem.min_limit,
      });
    } catch (e) {}

    setIsAddItemModalOpen(false);
    setNewItemForm({
      item_name: "",
      category_id: "",
      unit: "عدد",
      purchase_price: "",
      initial_quantity: "0",
      min_limit: "5",
    });
    showToast("success", "نیا آئٹم کامیابی سے شامل کر دیا گیا");
  };

  // Handle Purchase Submission
  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = stockItems.find((i) => String(i.id) === String(purchaseForm.item_id));
    if (!item) {
      showToast("error", "براہ کرم آئٹم منتخب کریں");
      return;
    }

    const qty = parseInt(purchaseForm.quantity_in) || 0;
    const price = parseFloat(purchaseForm.price_per_unit) || item.purchase_price;
    if (qty <= 0) {
      showToast("error", "خریداری کی تعداد درج کریں");
      return;
    }

    const newPurchase: StockPurchase = {
      id: "pur-" + Date.now(),
      item_id: item.id,
      item_name: item.item_name,
      quantity_in: qty,
      price_per_unit: price,
      total_price: qty * price,
      vendor_name: purchaseForm.vendor_name || "لوکل وینڈر",
      bill_no: purchaseForm.bill_no || `BILL-${Date.now().toString().slice(-4)}`,
      purchase_date: purchaseForm.purchase_date || getTodayPKDate(),
      added_by: "ایڈمن",
    };

    // Update item quantities
    const updatedItems = stockItems.map((i) => {
      if (String(i.id) === String(item.id)) {
        return {
          ...i,
          purchase_price: price,
          total_quantity: i.total_quantity + qty,
          current_quantity: i.current_quantity + qty,
        };
      }
      return i;
    });

    const updatedPurchases = [newPurchase, ...purchases];
    setStockItems(updatedItems);
    setPurchases(updatedPurchases);
    syncToLocalStorage(updatedItems, updatedPurchases, issues);

    try {
      await supabase.from("stock_purchases").insert({
        school_id: schoolContext?.schoolId || null,
        item_id: item.id,
        quantity_in: newPurchase.quantity_in,
        price_per_unit: newPurchase.price_per_unit,
        total_price: newPurchase.total_price,
        vendor_name: newPurchase.vendor_name,
        bill_no: newPurchase.bill_no,
        purchase_date: newPurchase.purchase_date,
        added_by: "ایڈمن",
      });
      await supabase
        .from("stock_items")
        .update({
          purchase_price: price,
          total_quantity: item.total_quantity + qty,
          current_quantity: item.current_quantity + qty,
        })
        .eq("id", item.id);
    } catch (e) {}

    // Open slip option
    setActiveSlipPurchase(newPurchase);
    setIsPurchaseSlipOpen(true);

    setPurchaseForm({
      item_id: "",
      quantity_in: "",
      price_per_unit: "",
      vendor_name: "",
      bill_no: "",
      purchase_date: getTodayPKDate(),
    });
    showToast("success", "خریداری کا اندراج محفوظ کر لیا گیا");
  };

  // Handle Issue Submission
  const handleAddIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = stockItems.find((i) => String(i.id) === String(issueForm.item_id));
    if (!item) {
      showToast("error", "براہ کرم آئٹم منتخب کریں");
      return;
    }

    const qty = parseInt(issueForm.quantity_out) || 0;
    if (qty <= 0) {
      showToast("error", "جاری کرنے کی تعداد درج کریں");
      return;
    }

    if (qty > item.current_quantity) {
      showToast("error", `سٹاک میں صرف ${item.current_quantity} ${item.unit} موجود ہیں!`);
      return;
    }

    const newIssue: StockIssue = {
      id: "iss-" + Date.now(),
      item_id: item.id,
      item_name: item.item_name,
      quantity_out: qty,
      issued_to_type: issueForm.issued_to_type,
      issued_to_name: issueForm.issued_to_name || issueForm.location_name,
      location_name: issueForm.location_name || "مین سٹور",
      purpose: issueForm.purpose || "سکول استعمال",
      issue_date: issueForm.issue_date || getTodayPKDate(),
      returnable: issueForm.returnable,
      returned_quantity: 0,
      status: "issued",
    };

    // Deduct from item current_quantity
    const updatedItems = stockItems.map((i) => {
      if (String(i.id) === String(item.id)) {
        return {
          ...i,
          current_quantity: Math.max(0, i.current_quantity - qty),
        };
      }
      return i;
    });

    const updatedIssues = [newIssue, ...issues];
    setStockItems(updatedItems);
    setIssues(updatedIssues);
    syncToLocalStorage(updatedItems, purchases, updatedIssues);

    try {
      await supabase.from("stock_issues").insert({
        school_id: schoolContext?.schoolId || null,
        item_id: item.id,
        quantity_out: newIssue.quantity_out,
        issued_to_type: newIssue.issued_to_type,
        issued_to_name: newIssue.issued_to_name,
        location_name: newIssue.location_name,
        purpose: newIssue.purpose,
        issue_date: newIssue.issue_date,
        returnable: newIssue.returnable,
        returned_quantity: 0,
        status: "issued",
      });
      await supabase
        .from("stock_items")
        .update({
          current_quantity: Math.max(0, item.current_quantity - qty),
        })
        .eq("id", item.id);
    } catch (e) {}

    setIssueForm({
      item_id: "",
      quantity_out: "",
      issued_to_type: "Class",
      issued_to_name: "",
      location_name: "",
      purpose: "",
      issue_date: getTodayPKDate(),
      returnable: false,
    });
    showToast("success", `آئٹم کامیابی سے ${newIssue.location_name} کو جاری کر دیا گیا`);
  };

  // Return an issued item
  const handleReturnItem = async (issueId: string | number) => {
    const iss = issues.find((i) => String(i.id) === String(issueId));
    if (!iss) return;

    const remainingToReturn = iss.quantity_out - iss.returned_quantity;
    const returnQtyStr = prompt(`کتنی تعداد واپس لینی ہے؟ (زیادہ سے زیادہ: ${remainingToReturn})`, String(remainingToReturn));
    if (!returnQtyStr) return;

    const returnQty = parseInt(returnQtyStr) || 0;
    if (returnQty <= 0 || returnQty > remainingToReturn) {
      alert("غلط تعداد درج کی گئی");
      return;
    }

    const updatedIssues = issues.map((i) => {
      if (String(i.id) === String(issueId)) {
        const newReturned = i.returned_quantity + returnQty;
        return {
          ...i,
          returned_quantity: newReturned,
          status: (newReturned >= i.quantity_out ? "returned" : "issued") as any,
        };
      }
      return i;
    });

    const updatedItems = stockItems.map((item) => {
      if (String(item.id) === String(iss.item_id)) {
        return {
          ...item,
          current_quantity: item.current_quantity + returnQty,
        };
      }
      return item;
    });

    setIssues(updatedIssues);
    setStockItems(updatedItems);
    syncToLocalStorage(updatedItems, purchases, updatedIssues);
    showToast("success", `${returnQty} واپس سٹور میں جمع کر لیے گئے`);
  };

  // Get location distribution for an item (e.g. Where is this item?)
  const getItemLocationDistribution = (itemId: string | number) => {
    const itemIssues = issues.filter(
      (iss) => String(iss.item_id) === String(itemId) && iss.quantity_out > iss.returned_quantity
    );

    const dist: Record<string, { qty: number; to: string; date: string }> = {};
    itemIssues.forEach((iss) => {
      const netIssued = iss.quantity_out - iss.returned_quantity;
      const key = iss.location_name || "دیگر مقام";
      if (!dist[key]) {
        dist[key] = { qty: 0, to: iss.issued_to_name, date: iss.issue_date };
      }
      dist[key].qty += netIssued;
    });

    return dist;
  };

  // Items currently inside a specific location
  const locationReportItems = useMemo(() => {
    if (selectedLocationReport === "all") return [];
    return issues.filter(
      (iss) =>
        iss.location_name === selectedLocationReport &&
        iss.quantity_out > iss.returned_quantity
    );
  }, [issues, selectedLocationReport]);

  // Export Stock to CSV
  const handleExportCSV = () => {
    let csv = "\uFEFF";
    csv += `سکول سٹاک انوینٹری رجسٹر - ${schoolContext?.schoolName || "OA School"}\n`;
    csv += `تاریخ: ${getTodayPKDate()}\n\n`;
    csv += "نمبر شمار,آئٹم نام,کیٹیگری,کل آیا,جاری ہوا,موجودہ بیلنس,یونٹ,فی یونٹ قیمت,کل مالیت\n";

    stockItems.forEach((item, idx) => {
      const issuedCount = item.total_quantity - item.current_quantity;
      const val = item.current_quantity * item.purchase_price;
      csv += `"${idx + 1}","${item.item_name.replace(/"/g, '""')}","${item.category_name || "جنرل"}","${item.total_quantity}","${issuedCount}","${item.current_quantity}","${item.unit}","${item.purchase_price}","${val}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `School_Stock_Inventory_${getTodayPKDate()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("success", "سٹاک ایکسل فائل ڈاؤنلوڈ ہو گئی");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-16 print:bg-white print:p-0">
      {/* 1. TOP HEADER & NAVIGATION */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs px-3 sm:px-6 py-2.5 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left Title & Back */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition flex items-center justify-center shrink-0 cursor-pointer"
              title="واپس ڈیش بورڈ"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Inventory & Store • سٹور و انوینٹری
                </span>
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 font-urdu">
                  <span>سکول سٹاک انوینٹری و لوکیشن ٹریکنگ</span>
                </h1>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate max-w-md">
                {schoolContext?.schoolName || "Registered School"} • سامان، فرنیچر، لیب و سٹیشنری
              </p>
            </div>
          </div>

          {/* Right Action Buttons & Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 md:pb-0 scrollbar-none justify-end">
            <button
              onClick={() => setIsAddItemModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>نیا آئٹم شامل کریں</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
              title="ایکسل فائل ڈاؤنلوڈ"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-yellow-400" />
              <span>پرنٹ رپورٹ</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6 print:p-0 print:max-w-none">
        {/* Toast Alert */}
        {toast && (
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold animate-in fade-in print:hidden ${
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

        {/* 3. FOUR TOP SUMMARY CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:hidden">
          {/* Card 1: کل آئٹمز */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-indigo-100 shadow-md relative overflow-hidden flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-urdu">
                کل آئٹمز (Total Items)
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-indigo-700 mt-0.5">
                {stats.totalItemsCount}
              </h3>
              <p className="text-[10px] text-indigo-600/80 mt-1 font-medium">
                {categories.length} کیٹیگریز میں تقسیم
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Boxes className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: کل مالیت */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-100 shadow-md relative overflow-hidden flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-urdu">
                کل مالیت (Stock Value)
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 mt-0.5">
                Rs. {formatPKR(stats.totalValuation)}
              </h3>
              <p className="text-[10px] text-emerald-700/80 mt-1 font-medium">
                موجودہ فزیکل انوینٹری ویلیو
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Low Stock Alert (Red) */}
          <div
            className={`rounded-2xl p-4 sm:p-5 border shadow-md relative overflow-hidden flex items-center justify-between ${
              stats.lowStockCount > 0
                ? "bg-rose-50/70 border-rose-200"
                : "bg-white border-slate-200"
            }`}
          >
            <div>
              <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider font-urdu flex items-center gap-1">
                {stats.lowStockCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>}
                <span>کم سٹاک الرٹ (Low Stock)</span>
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-rose-600 mt-0.5">
                {stats.lowStockCount}
              </h3>
              <p className="text-[10px] text-rose-700 mt-1 font-medium">
                {stats.lowStockCount > 0 ? "فوری خریداری درکار ہے" : "تمام سٹاک تسلی بخش ہے"}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: آج جاری کردہ */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-100 shadow-md relative overflow-hidden flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-urdu">
                آج جاری کردہ (Issued Today)
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-amber-600 mt-0.5">
                {stats.issuedTodayCount}
              </h3>
              <p className="text-[10px] text-amber-700 mt-1 font-medium">
                تاریخ: {getTodayPKDate()}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Send className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* 4. MAIN NAVIGATION TABS BAR */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none print:hidden">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>موجودہ سٹاک (Current Stock)</span>
          </button>

          <button
            onClick={() => setActiveTab("purchase")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "purchase"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-emerald-500" />
            <span>خریداری اندراج (Purchase Entry)</span>
          </button>

          <button
            onClick={() => setActiveTab("issue")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "issue"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Send className="w-4 h-4 text-amber-500" />
            <span>سامان جاری کرنا (Issue & Tracking)</span>
          </button>

          <button
            onClick={() => setActiveTab("locations")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "locations"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <MapPin className="w-4 h-4 text-rose-500" />
            <span>لوکیشن وائز رپورٹ (Room Reports)</span>
          </button>
        </div>

        {/* ======================================================================= */}
        {/* TAB 1: موجودہ سٹاک / CURRENT STOCK DASHBOARD */}
        {/* ======================================================================= */}
        {activeTab === "dashboard" && (
          <div className="space-y-4">
            {/* Search & Category Filter Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="آئٹم یا کیٹیگری تلاش کریں (Search item name)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-right"
                  dir="rtl"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">تمام کیٹیگریز (All Categories)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Print Header for Physical Register Replica */}
            <div className="hidden print:block text-center border-b-2 border-slate-900 pb-3 mb-4">
              <h2 className="text-2xl font-black font-urdu text-slate-900">
                سکول سٹور و فزیکل سٹاک رجسٹر
              </h2>
              <p className="text-sm font-bold text-slate-700">
                {schoolContext?.schoolName || "OA Smart School System"} • تاریخ پرنٹ: {getTodayPKDate()}
              </p>
            </div>

            {/* Main Stock Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs" dir="rtl">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold font-urdu">
                      <th className="p-3 text-center w-12">تصویر</th>
                      <th className="p-3">آئٹم کا نام</th>
                      <th className="p-3">کیٹیگری</th>
                      <th className="p-3 text-center">کل آیا</th>
                      <th className="p-3 text-center">جاری ہوا</th>
                      <th className="p-3 text-center">موجودہ بیلنس</th>
                      <th className="p-3 text-center">فی یونٹ قیمت</th>
                      <th className="p-3 text-center">کل مالیت</th>
                      <th className="p-3">کہاں لگا ہے؟ (لوکیشن)</th>
                      <th className="p-3 text-center print:hidden">کارروائی</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {filteredStockItems.map((item) => {
                      const isLowStock = item.current_quantity <= item.min_limit;
                      const issuedTotal = item.total_quantity - item.current_quantity;
                      const totalVal = item.current_quantity * item.purchase_price;
                      const dist = getItemLocationDistribution(item.id);
                      const locCount = Object.keys(dist).length;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/80 transition ${
                            isLowStock ? "bg-rose-50/30" : ""
                          }`}
                        >
                          {/* تصویر / Icon */}
                          <td className="p-2.5 text-center">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs mx-auto">
                              <Package className="w-4 h-4" />
                            </div>
                          </td>

                          {/* آئٹم کا نام */}
                          <td className="p-2.5 font-bold text-slate-900">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{item.item_name}</span>
                              {isLowStock && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-700 border border-rose-300">
                                  Low Stock!
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block font-normal">
                              یونٹ: {item.unit} • کم از کم حد: {item.min_limit}
                            </span>
                          </td>

                          {/* کیٹیگری */}
                          <td className="p-2.5 font-medium text-slate-600 font-urdu text-[11px]">
                            {item.category_name || "جنرل"}
                          </td>

                          {/* کل آیا */}
                          <td className="p-2.5 text-center font-mono font-bold text-slate-700">
                            {item.total_quantity} {item.unit}
                          </td>

                          {/* جاری ہوا */}
                          <td className="p-2.5 text-center font-mono font-bold text-amber-700">
                            {issuedTotal} {item.unit}
                          </td>

                          {/* موجودہ بیلنس */}
                          <td className="p-2.5 text-center font-mono font-black text-emerald-700 text-sm">
                            {item.current_quantity} {item.unit}
                          </td>

                          {/* فی یونٹ قیمت */}
                          <td className="p-2.5 text-center font-mono text-slate-600">
                            Rs. {formatPKR(item.purchase_price)}
                          </td>

                          {/* کل مالیت */}
                          <td className="p-2.5 text-center font-mono font-bold text-indigo-900">
                            Rs. {formatPKR(totalVal)}
                          </td>

                          {/* لوکیشن سمری */}
                          <td className="p-2.5">
                            {locCount > 0 ? (
                              <button
                                onClick={() => setDetailModalItem(item)}
                                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium underline cursor-pointer text-right block truncate max-w-[170px]"
                                title="تفصیل دیکھیں"
                              >
                                {locCount} مقامات میں تقسیم (کلک کریں)
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400">تمام سٹور میں محفوظ ہے</span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="p-2.5 text-center print:hidden">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setDetailModalItem(item)}
                                className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition cursor-pointer"
                                title="مکمل لوکیشن تفصیل"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setIssueForm((prev) => ({ ...prev, item_id: String(item.id) }));
                                  setActiveTab("issue");
                                }}
                                className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] cursor-pointer shadow-2xs"
                                title="جاری کریں"
                              >
                                جاری کریں
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 2: خریداری اندراج / PURCHASE ENTRY */}
        {/* ======================================================================= */}
        {activeTab === "purchase" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Purchase Entry Form (5 Cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4" dir="rtl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 font-urdu flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
                  <span>سٹاک خریداری فارم (New Purchase)</span>
                </h3>
                <span className="text-[10px] font-bold text-slate-400">
                  انوینٹری خودکار اپڈیٹ ہوگی
                </span>
              </div>

              <form onSubmit={handleAddPurchase} className="space-y-3.5 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">آئٹم منتخب کریں:</label>
                    <button
                      type="button"
                      onClick={() => setIsAddItemModalOpen(true)}
                      className="text-[11px] text-indigo-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ نیا آئٹم بنائیں</span>
                    </button>
                  </div>
                  <select
                    value={purchaseForm.item_id}
                    onChange={(e) => {
                      const sItem = stockItems.find((i) => String(i.id) === e.target.value);
                      setPurchaseForm({
                        ...purchaseForm,
                        item_id: e.target.value,
                        price_per_unit: sItem ? String(sItem.purchase_price) : "",
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white cursor-pointer font-bold"
                    required
                  >
                    <option value="">-- آئٹم منتخب کریں --</option>
                    {stockItems.map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        {item.item_name} ({item.current_quantity} {item.unit} سٹاک میں)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">خریداری تعداد (Qty In):</label>
                    <input
                      type="number"
                      value={purchaseForm.quantity_in}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity_in: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-left font-bold"
                      dir="ltr"
                      placeholder="10"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">فی یونٹ قیمت (PKR):</label>
                    <input
                      type="number"
                      value={purchaseForm.price_per_unit}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, price_per_unit: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-left"
                      dir="ltr"
                      placeholder="1500"
                      required
                    />
                  </div>
                </div>

                {/* Total Auto Calculate Badge */}
                {purchaseForm.quantity_in && purchaseForm.price_per_unit && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <span className="font-bold text-emerald-800">کل رقم خریداری:</span>
                    <span className="font-mono font-black text-sm text-emerald-900">
                      Rs.{" "}
                      {formatPKR(
                        (parseInt(purchaseForm.quantity_in) || 0) *
                          (parseFloat(purchaseForm.price_per_unit) || 0)
                      )}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">وینڈر / دکاندار کا نام:</label>
                    <input
                      type="text"
                      value={purchaseForm.vendor_name}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, vendor_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="مثلاً: ماسٹر فرنیچر"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">بل نمبر / رسید:</label>
                    <input
                      type="text"
                      value={purchaseForm.bill_no}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, bill_no: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-left"
                      dir="ltr"
                      placeholder="BILL-401"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">خریداری تاریخ (DD-MM-YYYY):</label>
                  <input
                    type="text"
                    value={purchaseForm.purchase_date}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, purchase_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-left"
                    dir="ltr"
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 font-bold text-white shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>خریداری محفوظ کریں و سٹاک اپڈیٹ کریں</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Recent Purchases History Table (7 Cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3" dir="rtl">
              <h3 className="text-sm font-bold text-slate-900 font-urdu pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>حالیہ خریداری کا ریکارڈ (Purchases History)</span>
                <span className="text-[10px] text-slate-400 font-normal">کل {purchases.length} رسیدات</span>
              </h3>

              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-urdu">
                    <tr>
                      <th className="p-2">تاریخ</th>
                      <th className="p-2">آئٹم نام</th>
                      <th className="p-2 text-center">تعداد</th>
                      <th className="p-2 text-center">کل رقم</th>
                      <th className="p-2">وینڈر و بل</th>
                      <th className="p-2 text-center">سلپ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {purchases.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="p-2 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {p.purchase_date}
                        </td>
                        <td className="p-2 font-bold text-slate-900">{p.item_name}</td>
                        <td className="p-2 text-center font-mono font-bold text-emerald-700">
                          +{p.quantity_in}
                        </td>
                        <td className="p-2 text-center font-mono font-black text-slate-900">
                          Rs. {formatPKR(p.total_price)}
                        </td>
                        <td className="p-2 text-[11px] text-slate-600">
                          <span>{p.vendor_name}</span>
                          <span className="block font-mono text-[10px] text-slate-400">#{p.bill_no}</span>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => {
                              setActiveSlipPurchase(p);
                              setIsPurchaseSlipOpen(true);
                            }}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                            title="پرنٹ پرچیز سلپ"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 3: سامان جاری کرنا / ISSUE & LOCATION TRACKING */}
        {/* ======================================================================= */}
        {activeTab === "issue" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Issue Entry Form (5 Cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4" dir="rtl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 font-urdu flex items-center gap-2">
                  <Send className="w-4 h-4 text-amber-600" />
                  <span>سامان جاری کرنے کا فارم (Issue Item)</span>
                </h3>
                <span className="text-[10px] font-bold text-slate-400">
                  لوکیشن ٹریکنگ
                </span>
              </div>

              <form onSubmit={handleAddIssue} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">آئٹم منتخب کریں:</label>
                  <select
                    value={issueForm.item_id}
                    onChange={(e) => setIssueForm({ ...issueForm, item_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white cursor-pointer font-bold"
                    required
                  >
                    <option value="">-- منتخب کریں --</option>
                    {stockItems.map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        {item.item_name} (دستیاب: {item.current_quantity} {item.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">تعداد جاری کریں (Qty Out):</label>
                    <input
                      type="number"
                      value={issueForm.quantity_out}
                      onChange={(e) => setIssueForm({ ...issueForm, quantity_out: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-left font-bold"
                      dir="ltr"
                      placeholder="5"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">قسم (Issued To Type):</label>
                    <select
                      value={issueForm.issued_to_type}
                      onChange={(e) => setIssueForm({ ...issueForm, issued_to_type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white cursor-pointer"
                    >
                      <option value="Class">کلاس روم (Classroom)</option>
                      <option value="Room">کمرہ / ہال (Room / Hall)</option>
                      <option value="Office">دفتر (Office)</option>
                      <option value="Lab">سائنس / کمپیوٹر لیب</option>
                      <option value="Teacher">استاد (Teacher)</option>
                      <option value="Student">طالب علم (Student)</option>
                      <option value="Other">دیگر (Other)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    لوکیشن / کمرہ منتخب کریں (Location):
                  </label>
                  <select
                    value={issueForm.location_name}
                    onChange={(e) =>
                      setIssueForm({
                        ...issueForm,
                        location_name: e.target.value,
                        issued_to_name: issueForm.issued_to_name || e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white cursor-pointer"
                    required
                  >
                    <option value="">-- لوکیشن منتخب کریں --</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.location_name}>
                        {loc.location_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    نام وصول کنندہ / مخصوص جگہ (e.g. کلاس 10، ٹیچر احمد):
                  </label>
                  <input
                    type="text"
                    value={issueForm.issued_to_name}
                    onChange={(e) => setIssueForm({ ...issueForm, issued_to_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="مثلاً: کلاس پنجم اے یا استاد زاہد صاحب"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">مقصد / وجہ اجراء (Purpose):</label>
                  <input
                    type="text"
                    value={issueForm.purpose}
                    onChange={(e) => setIssueForm({ ...issueForm, purpose: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="مثلاً: نئی کلاس کے لیے، یا خراب ہونے پر متبادل"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">تاریخ (DD-MM-YYYY):</label>
                    <input
                      type="text"
                      value={issueForm.issue_date}
                      onChange={(e) => setIssueForm({ ...issueForm, issue_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-left"
                      dir="ltr"
                      required
                    />
                  </div>

                  <div className="pt-4 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="returnable-check"
                      checked={issueForm.returnable}
                      onChange={(e) => setIssueForm({ ...issueForm, returnable: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <label htmlFor="returnable-check" className="font-bold text-slate-700 cursor-pointer">
                      واپس ہونے والا ہے؟ (Returnable)
                    </label>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 font-bold text-white shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>سامان جاری کریں و لوکیشن ٹریک کریں</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Issued Items Tracking Table (7 Cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3" dir="rtl">
              <h3 className="text-sm font-bold text-slate-900 font-urdu pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>جاری کردہ سامان و لوکیشن لسٹ (Active Allocations)</span>
                <span className="text-[10px] text-slate-400 font-normal">کل {issues.length} اندراجات</span>
              </h3>

              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-urdu">
                    <tr>
                      <th className="p-2">تاریخ</th>
                      <th className="p-2">آئٹم نام</th>
                      <th className="p-2 text-center">تعداد</th>
                      <th className="p-2">کہاں گیا؟ (لوکیشن / نام)</th>
                      <th className="p-2">مقصد</th>
                      <th className="p-2 text-center">واپسی</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {issues.map((iss) => (
                      <tr key={iss.id} className="hover:bg-slate-50 transition">
                        <td className="p-2 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {iss.issue_date}
                        </td>
                        <td className="p-2 font-bold text-slate-900">{iss.item_name}</td>
                        <td className="p-2 text-center font-mono font-bold text-rose-700">
                          -{iss.quantity_out}
                          {iss.returned_quantity > 0 && (
                            <span className="block text-[9px] text-emerald-600 font-medium">
                              ({iss.returned_quantity} واپس)
                            </span>
                          )}
                        </td>
                        <td className="p-2">
                          <span className="font-bold text-indigo-900 block">{iss.location_name}</span>
                          <span className="text-[10px] text-slate-500">{iss.issued_to_name}</span>
                        </td>
                        <td className="p-2 text-[11px] text-slate-600 truncate max-w-[120px]">
                          {iss.purpose || "-"}
                        </td>
                        <td className="p-2 text-center">
                          {iss.returnable ? (
                            iss.status === "returned" ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                                مکمل واپس
                              </span>
                            ) : (
                              <button
                                onClick={() => handleReturnItem(iss.id)}
                                className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold cursor-pointer"
                                title="سٹور میں واپسی درج کریں"
                              >
                                واپس لیں
                              </button>
                            )
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 4: لوکیشن وائز رپورٹ / LOCATION-WISE ROOM REPORTS */}
        {/* ======================================================================= */}
        {activeTab === "locations" && (
          <div className="space-y-4" dir="rtl">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 font-urdu flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-600" />
                  <span>کمرہ / لوکیشن وائز سامان رپورٹ (Room Audit)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  کسی بھی کمرے کو منتخب کر کے دیکھیں کہ اس میں کون کون سا سامان موجود ہے
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">لوکیشن منتخب کریں:</span>
                <select
                  value={selectedLocationReport}
                  onChange={(e) => setSelectedLocationReport(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                >
                  <option value="all">-- لوکیشن منتخب کریں --</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.location_name}>
                      {loc.location_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedLocationReport === "all" ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
                <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-600 font-urdu">
                  براہ کرم اوپر ڈراپ ڈاؤن سے کمرہ یا لوکیشن منتخب کریں
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  مثلاً: کمرہ نمبر 1، سائنس لیب، یا ہیڈ آفس
                </p>
              </div>
            ) : locationReportItems.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
                <p className="text-xs font-bold text-slate-500 font-urdu">
                  اس لوکیشن ({selectedLocationReport}) کو فی الحال کوئی سامان جاری نہیں کیا گیا
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-indigo-900">
                    مقام: <span className="text-rose-600 font-black">{selectedLocationReport}</span>
                  </h4>
                  <span className="text-xs font-bold text-slate-500">
                    کل {locationReportItems.length} آئٹمز اس جگہ نصب ہیں
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {locationReportItems.map((iss) => {
                    const netQty = iss.quantity_out - iss.returned_quantity;
                    return (
                      <div
                        key={iss.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between shadow-2xs"
                      >
                        <div>
                          <h5 className="text-xs font-bold text-slate-900">{iss.item_name}</h5>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            وصول کنندہ: {iss.issued_to_name} • تاریخ: {iss.issue_date}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            مقصد: {iss.purpose || "سکول استعمال"}
                          </p>
                        </div>
                        <div className="text-left shrink-0 pl-2">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-mono font-black text-xs shadow-2xs">
                            {netQty} عدد
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ======================================================================= */}
      {/* 5. MODAL: WHERE IS THIS ITEM? (DETAIL DISTRIBUTION MODAL) */}
      {/* ======================================================================= */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in" dir="rtl">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-yellow-400" />
                <div>
                  <h3 className="text-sm font-black font-urdu">
                    یہ آئٹم کہاں ہے؟ ({detailModalItem.item_name})
                  </h3>
                  <p className="text-[10px] text-slate-300">
                    موجودہ لوکیشن و کلاس وائز تقسیم
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalItem(null)}
                className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block">کل خریدا گیا</span>
                  <span className="text-sm font-mono font-black text-slate-900">
                    {detailModalItem.total_quantity} {detailModalItem.unit}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-700 block">جاری کردہ</span>
                  <span className="text-sm font-mono font-black text-amber-900">
                    {detailModalItem.total_quantity - detailModalItem.current_quantity} {detailModalItem.unit}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-700 block">سٹور میں موجود</span>
                  <span className="text-sm font-mono font-black text-emerald-900">
                    {detailModalItem.current_quantity} {detailModalItem.unit}
                  </span>
                </div>
              </div>

              {/* Location Breakdown List */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 font-urdu pb-1 border-b border-slate-100">
                  تفصیلی لوکیشن ڈسٹری بیوشن:
                </h4>
                {(() => {
                  const dist = getItemLocationDistribution(detailModalItem.id);
                  const keys = Object.keys(dist);

                  return (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {/* Main Store Room entry */}
                      <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-emerald-950 block">مین سٹور روم (Main Store)</span>
                          <span className="text-[10px] text-emerald-700">دستیاب برائے اجراء</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-mono font-bold text-xs">
                          {detailModalItem.current_quantity} {detailModalItem.unit}
                        </span>
                      </div>

                      {keys.map((loc) => (
                        <div
                          key={loc}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-slate-900 block">{loc}</span>
                            <span className="text-[10px] text-slate-500">
                              وصول کنندہ: {dist[loc].to} • تاریخ: {dist[loc].date}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-mono font-bold text-xs">
                            {dist[loc].qty} {detailModalItem.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setDetailModalItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold cursor-pointer hover:bg-slate-800"
                >
                  بند کریں
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 6. MODAL: ADD NEW STOCK ITEM */}
      {/* ======================================================================= */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in" dir="rtl">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-200" />
                <h3 className="text-sm font-black font-urdu">نیا سٹاک آئٹم شامل کریں</h3>
              </div>
              <button
                onClick={() => setIsAddItemModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewItem} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">آئٹم کا نام (Item Name):</label>
                <input
                  type="text"
                  value={newItemForm.item_name}
                  onChange={(e) => setNewItemForm({ ...newItemForm, item_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="مثلاً: کرسی، وائٹ بورڈ، پنکھا، ڈسٹر..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">کیٹیگری:</label>
                  <select
                    value={newItemForm.category_id}
                    onChange={(e) => setNewItemForm({ ...newItemForm, category_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">یونٹ (Unit):</label>
                  <select
                    value={newItemForm.unit}
                    onChange={(e) => setNewItemForm({ ...newItemForm, unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="عدد">عدد (Piece)</option>
                    <option value="سیٹ">سیٹ (Set)</option>
                    <option value="کلو">کلو (Kg)</option>
                    <option value="میٹر">میٹر (Meter)</option>
                    <option value="ڈبہ">ڈبہ (Box / Pack)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تخمینہ قیمت (PKR):</label>
                  <input
                    type="number"
                    value={newItemForm.purchase_price}
                    onChange={(e) => setNewItemForm({ ...newItemForm, purchase_price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-left"
                    dir="ltr"
                    placeholder="1500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">کم از کم الرٹ حد:</label>
                  <input
                    type="number"
                    value={newItemForm.min_limit}
                    onChange={(e) => setNewItemForm({ ...newItemForm, min_limit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-left"
                    dir="ltr"
                    placeholder="5"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  منسوخ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>آئٹم محفوظ کریں</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 7. MODAL: PURCHASE SLIP PRINT PREVIEW (DYNAMIC SCHOOL HEADER) */}
      {/* ======================================================================= */}
      {isPurchaseSlipOpen && activeSlipPurchase && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in" dir="rtl">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-yellow-400" />
                <h3 className="text-sm font-black font-urdu">سٹاک خریداری واؤچر / سلپ</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>پرنٹ کریں</span>
                </button>
                <button
                  onClick={() => setIsPurchaseSlipOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* PRINTABLE SLIP BODY */}
            <div className="p-6 space-y-4 text-xs font-sans border-4 border-slate-900 m-3 rounded-xl bg-white">
              {/* Dynamic School Header */}
              <div className="text-center pb-3 border-b-2 border-slate-900">
                <div className="flex justify-center mb-1">
                  <SchoolLogo
                    name={schoolContext?.schoolName || "School System"}
                    logoUrl={schoolContext?.schoolLogo}
                    size="md"
                  />
                </div>
                <h2 className="text-base font-black text-slate-900 font-urdu">
                  {schoolContext?.schoolName || "Registered School"}
                </h2>
                <p className="text-[10px] text-slate-500 font-medium">
                  {schoolContext?.schoolAddress || "School Campus"} • فون: {schoolContext?.schoolPhone || ""}
                </p>
                <div className="mt-2 inline-block px-3 py-0.5 rounded-full bg-slate-100 border border-slate-300 font-bold text-[10px] uppercase tracking-wider text-slate-800">
                  آفیشل سٹاک خریداری رسید (Purchase Voucher)
                </div>
              </div>

              {/* Voucher Meta */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-800 pb-2 border-b border-dashed border-slate-300">
                <div>
                  <span>بل نمبر: </span>
                  <span className="font-mono">{activeSlipPurchase.bill_no}</span>
                </div>
                <div className="text-left font-mono">
                  <span>تاریخ: </span>
                  <span>{activeSlipPurchase.purchase_date}</span>
                </div>
                <div>
                  <span>وینڈر / دکاندار: </span>
                  <span>{activeSlipPurchase.vendor_name}</span>
                </div>
                <div className="text-left">
                  <span>اندراج کنندہ: </span>
                  <span>{activeSlipPurchase.added_by || "ایڈمن"}</span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-right border-collapse text-xs border border-slate-900">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-900 font-bold">
                    <th className="p-2 border-l border-slate-900">تفصیل آئٹم</th>
                    <th className="p-2 border-l border-slate-900 text-center">تعداد</th>
                    <th className="p-2 border-l border-slate-900 text-center">فی یونٹ قیمت</th>
                    <th className="p-2 text-center">کل رقم</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2.5 border-l border-slate-900 font-bold">{activeSlipPurchase.item_name}</td>
                    <td className="p-2.5 border-l border-slate-900 text-center font-mono font-bold">
                      {activeSlipPurchase.quantity_in}
                    </td>
                    <td className="p-2.5 border-l border-slate-900 text-center font-mono">
                      Rs. {formatPKR(activeSlipPurchase.price_per_unit)}
                    </td>
                    <td className="p-2.5 text-center font-mono font-black text-slate-900">
                      Rs. {formatPKR(activeSlipPurchase.total_price)}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-900 font-black">
                    <td colSpan={3} className="p-2 border-l border-slate-900 text-left font-urdu">
                      میزان کل (Net Payable):
                    </td>
                    <td className="p-2 text-center font-mono text-sm text-emerald-800">
                      Rs. {formatPKR(activeSlipPurchase.total_price)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Signature Lines */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-[10px] font-bold text-slate-800 font-urdu">
                <div>
                  <div className="w-32 mx-auto border-b border-slate-800 mb-1"></div>
                  <p>دستخط سٹور انچارج / وصول کنندہ</p>
                </div>
                <div>
                  <div className="w-32 mx-auto border-b border-slate-800 mb-1"></div>
                  <p>دستخط پرنسپل / مہر سکول</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
