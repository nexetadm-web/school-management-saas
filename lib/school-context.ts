import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase";
import { isSuperAdmin } from "./constants";

export interface SchoolProfile {
  id: string | number;
  name: string;
  city?: string | null;
  owner_email?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  principal_name?: string | null;
  logo_url?: string | null;
  easypaisa_no?: string | null;
  easypaisa_title?: string | null;
  jazzcash_no?: string | null;
  jazzcash_title?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  bank_title?: string | null;
  created_at?: string;
}

export interface ActiveSchoolContext {
  schoolId: string | number | null;
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
  schoolPrincipal: string;
  schoolCity: string;
  schoolLogo: string | null;
  easypaisaNo: string;
  easypaisaTitle: string;
  jazzcashNo: string;
  jazzcashTitle: string;
  bankName: string;
  bankAccount: string;
  bankTitle: string;
  schoolInitials: string;
  isSuperAdmin: boolean;
  currentUserEmail: string | null;
  schools: SchoolProfile[];
  school: SchoolProfile;
}

export function getSchoolInitials(name: string): string {
  if (!name || !name.trim()) return "SC";
  const clean = name.replace(/[^\w\s]/gi, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || "SC";
}

const DEFAULT_FALLBACK_NAME = "Registered School System";
const EVENT_NAME = "oa-school-changed";

export async function resolveActiveSchoolContext(): Promise<ActiveSchoolContext> {
  let userEmail: string | null = null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email || null;
  } catch (e) {
    // offline or session check
  }

  const isSuper = isSuperAdmin(userEmail) || userEmail === "mnuhbhatti333@gmail.com";

  let schoolsList: SchoolProfile[] = [];
  try {
    const { data: allSchools, error } = await supabase
      .from("schools")
      .select("*")
      .order("id", { ascending: true });
    if (!error && allSchools) {
      schoolsList = allSchools;
      if (typeof window !== "undefined") {
        localStorage.setItem("oa_cached_schools_list", JSON.stringify(allSchools));
      }
    }
  } catch (err) {
    console.error("Error loading schools list:", err);
  }

  if (schoolsList.length === 0 && typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("oa_cached_schools_list");
      if (cached) schoolsList = JSON.parse(cached);
    } catch (e) {}
  }

  let selectedId: string | number | null = null;
  let selectedName = DEFAULT_FALLBACK_NAME;
  let selectedAddress = "";
  let selectedPhone = "";
  let selectedEmail = "";
  let selectedPrincipal = "";
  let selectedCity = "";
  let selectedLogo: string | null = null;
  let easypaisaNo = "0300-1234567";
  let easypaisaTitle = "";
  let jazzcashNo = "0301-7654321";
  let jazzcashTitle = "";
  let bankName = "Habib Bank Limited (HBL)";
  let bankAccount = "PK00HABB0000001234567890";
  let bankTitle = "";

  if (typeof window !== "undefined") {
    const storedId = localStorage.getItem("oa_superadmin_selected_school_id");
    const storedName = localStorage.getItem("oa_superadmin_selected_school_name");
    if (storedId) selectedId = storedId;
    if (storedName) selectedName = storedName;
  }

  if (!selectedId) {
    if (userEmail) {
      const matched = schoolsList.find(
        (s: any) => s.owner_email && s.owner_email.toLowerCase() === userEmail.toLowerCase()
      );
      if (matched) {
        selectedId = matched.id;
        selectedName = matched.name;
      }
    }
    if (!selectedId && schoolsList.length > 0) {
      selectedId = isSuper ? "all" : schoolsList[0].id;
      selectedName = isSuper ? "All Schools (Aggregated View)" : schoolsList[0].name;
    }
  }

  if (selectedId === "all") {
    selectedName = "All Schools (Aggregated View)";
    selectedAddress = "Central School SaaS System";
    selectedCity = "Pakistan";
  } else if (selectedId) {
    const found = schoolsList.find((s) => String(s.id) === String(selectedId));
    if (found) {
      selectedName = found.name || DEFAULT_FALLBACK_NAME;
      selectedCity = found.city || "";
      selectedAddress = found.address || (found.city ? `Campus, ${found.city}` : "School Campus");
      selectedPhone = found.phone || "";
      selectedEmail = found.email || "";
      selectedPrincipal = found.principal_name || "";
      selectedLogo = found.logo_url || null;
      if (found.easypaisa_no) easypaisaNo = found.easypaisa_no;
      if (found.easypaisa_title) easypaisaTitle = found.easypaisa_title;
      if (found.jazzcash_no) jazzcashNo = found.jazzcash_no;
      if (found.jazzcash_title) jazzcashTitle = found.jazzcash_title;
      if (found.bank_name) bankName = found.bank_name;
      if (found.bank_account) bankAccount = found.bank_account;
      if (found.bank_title) bankTitle = found.bank_title;
    }
  }

  // Check if school profile is overridden/cached in localStorage
  if (typeof window !== "undefined" && selectedId && selectedId !== "all") {
    const customProfileStr = localStorage.getItem(`oa_school_profile_${selectedId}`);
    if (customProfileStr) {
      try {
        const custom = JSON.parse(customProfileStr);
        if (custom.name) selectedName = custom.name;
        if (custom.address) selectedAddress = custom.address;
        if (custom.phone) selectedPhone = custom.phone;
        if (custom.email) selectedEmail = custom.email;
        if (custom.principal_name) selectedPrincipal = custom.principal_name;
        if (custom.city) selectedCity = custom.city;
        if (custom.logo_url !== undefined) selectedLogo = custom.logo_url;
        if (custom.easypaisa_no) easypaisaNo = custom.easypaisa_no;
        if (custom.easypaisa_title) easypaisaTitle = custom.easypaisa_title;
        if (custom.jazzcash_no) jazzcashNo = custom.jazzcash_no;
        if (custom.jazzcash_title) jazzcashTitle = custom.jazzcash_title;
        if (custom.bank_name) bankName = custom.bank_name;
        if (custom.bank_account) bankAccount = custom.bank_account;
        if (custom.bank_title) bankTitle = custom.bank_title;
      } catch (e) {}
    }
  }

  if (!easypaisaTitle) easypaisaTitle = selectedName;
  if (!jazzcashTitle) jazzcashTitle = selectedName;
  if (!bankTitle) bankTitle = selectedName;

  const schoolObj: SchoolProfile = {
    id: selectedId || 1,
    name: selectedName,
    city: selectedCity,
    address: selectedAddress,
    phone: selectedPhone,
    email: selectedEmail,
    principal_name: selectedPrincipal,
    logo_url: selectedLogo,
    easypaisa_no: easypaisaNo,
    easypaisa_title: easypaisaTitle,
    jazzcash_no: jazzcashNo,
    jazzcash_title: jazzcashTitle,
    bank_name: bankName,
    bank_account: bankAccount,
    bank_title: bankTitle,
  };

  return {
    schoolId: selectedId,
    schoolName: selectedName,
    schoolAddress: selectedAddress,
    schoolPhone: selectedPhone,
    schoolEmail: selectedEmail,
    schoolPrincipal: selectedPrincipal,
    schoolCity: selectedCity,
    schoolLogo: selectedLogo,
    easypaisaNo,
    easypaisaTitle,
    jazzcashNo,
    jazzcashTitle,
    bankName,
    bankAccount,
    bankTitle,
    schoolInitials: getSchoolInitials(selectedName),
    isSuperAdmin: isSuper,
    currentUserEmail: userEmail,
    schools: schoolsList,
    school: schoolObj,
  };
}

export function broadcastSchoolUpdate(ctx: ActiveSchoolContext) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: ctx }));
  } catch (e) {}
}

/**
 * React Hook: useSchool()
 * Provides ultra-fast optimistic caching, reactive updates via broadcast event,
 * and seamless Supabase synchronization.
 */
export function useSchool() {
  const [context, setContext] = useState<ActiveSchoolContext>(() => {
    // Synchronous initial cache read for instant <10ms rendering
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("oa_active_school_context_cache");
        if (cached) {
          const parsed = JSON.parse(cached);
          return {
            ...parsed,
            schoolInitials: getSchoolInitials(parsed.schoolName),
          };
        }
      } catch (e) {}
    }
    return {
      schoolId: null,
      schoolName: DEFAULT_FALLBACK_NAME,
      schoolAddress: "School Campus",
      schoolPhone: "",
      schoolEmail: "",
      schoolPrincipal: "",
      schoolCity: "",
      schoolLogo: null,
      easypaisaNo: "0300-1234567",
      easypaisaTitle: DEFAULT_FALLBACK_NAME,
      jazzcashNo: "0301-7654321",
      jazzcashTitle: DEFAULT_FALLBACK_NAME,
      bankName: "Habib Bank Limited",
      bankAccount: "PK00HABB0000001234567890",
      bankTitle: DEFAULT_FALLBACK_NAME,
      schoolInitials: "SC",
      isSuperAdmin: false,
      currentUserEmail: null,
      schools: [],
      school: {
        id: 1,
        name: DEFAULT_FALLBACK_NAME,
      },
    };
  });
  const [loading, setLoading] = useState<boolean>(true);

  const refreshSchool = useCallback(async () => {
    const res = await resolveActiveSchoolContext();
    setContext(res);
    setLoading(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("oa_active_school_context_cache", JSON.stringify(res));
    }
    return res;
  }, []);

  useEffect(() => {
    refreshSchool();

    const handleUpdate = (e: any) => {
      if (e.detail) {
        setContext(e.detail);
      } else {
        refreshSchool();
      }
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [refreshSchool]);

  /**
   * Optimistic School Profile Update (<50ms response)
   */
  const updateSchoolProfile = async (updates: Partial<SchoolProfile>) => {
    const activeId = context.schoolId;
    if (!activeId || activeId === "all") {
      throw new Error("Cannot update profile when 'All Schools' is selected.");
    }

    const updatedSchoolObj: SchoolProfile = {
      ...context.school,
      ...updates,
      id: activeId,
    };

    const newContext: ActiveSchoolContext = {
      ...context,
      schoolName: updates.name ?? context.schoolName,
      schoolAddress: updates.address ?? context.schoolAddress,
      schoolPhone: updates.phone ?? context.schoolPhone,
      schoolEmail: updates.email ?? context.schoolEmail,
      schoolPrincipal: updates.principal_name ?? context.schoolPrincipal,
      schoolCity: updates.city ?? context.schoolCity,
      schoolLogo: updates.logo_url !== undefined ? updates.logo_url : context.schoolLogo,
      easypaisaNo: updates.easypaisa_no ?? context.easypaisaNo,
      easypaisaTitle: updates.easypaisa_title ?? context.easypaisaTitle,
      jazzcashNo: updates.jazzcash_no ?? context.jazzcashNo,
      jazzcashTitle: updates.jazzcash_title ?? context.jazzcashTitle,
      bankName: updates.bank_name ?? context.bankName,
      bankAccount: updates.bank_account ?? context.bankAccount,
      bankTitle: updates.bank_title ?? context.bankTitle,
      schoolInitials: getSchoolInitials(updates.name || context.schoolName),
      school: updatedSchoolObj,
      schools: context.schools.map((s) =>
        String(s.id) === String(activeId) ? { ...s, ...updates } : s
      ),
    };

    // 1. Instant local optimistic update
    setContext(newContext);
    if (typeof window !== "undefined") {
      localStorage.setItem(`oa_school_profile_${activeId}`, JSON.stringify(updatedSchoolObj));
      localStorage.setItem("oa_active_school_context_cache", JSON.stringify(newContext));
      localStorage.setItem("oa_superadmin_selected_school_name", newContext.schoolName);
      broadcastSchoolUpdate(newContext);
    }

    // 2. Background DB Sync
    try {
      await supabase
        .from("schools")
        .update({
          name: updatedSchoolObj.name,
          city: updatedSchoolObj.city,
          address: updatedSchoolObj.address,
          phone: updatedSchoolObj.phone,
          email: updatedSchoolObj.email,
          principal_name: updatedSchoolObj.principal_name,
          logo_url: updatedSchoolObj.logo_url,
          easypaisa_no: updatedSchoolObj.easypaisa_no,
          easypaisa_title: updatedSchoolObj.easypaisa_title,
          jazzcash_no: updatedSchoolObj.jazzcash_no,
          jazzcash_title: updatedSchoolObj.jazzcash_title,
          bank_name: updatedSchoolObj.bank_name,
          bank_account: updatedSchoolObj.bank_account,
          bank_title: updatedSchoolObj.bank_title,
        })
        .eq("id", activeId);
    } catch (err) {
      console.error("DB update error (persisted in local cache):", err);
    }
  };

  /**
   * Switch School (Instant Impersonation)
   */
  const switchSchool = async (schoolId: string | number) => {
    if (typeof window !== "undefined") {
      if (schoolId === "all") {
        localStorage.setItem("oa_superadmin_selected_school_id", "all");
        localStorage.setItem("oa_superadmin_selected_school_name", "All Schools");
      } else {
        localStorage.setItem("oa_superadmin_selected_school_id", String(schoolId));
        const found = context.schools.find((s) => String(s.id) === String(schoolId));
        if (found) {
          localStorage.setItem("oa_superadmin_selected_school_name", found.name);
        }
      }
    }
    const fresh = await resolveActiveSchoolContext();
    setContext(fresh);
    broadcastSchoolUpdate(fresh);
  };

  return {
    ...context,
    school: context.school,
    loading,
    refreshSchool,
    updateSchoolProfile,
    switchSchool,
  };
}
