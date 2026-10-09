import { supabase } from "./supabase";
import { isSuperAdmin } from "./constants";

export interface SchoolProfile {
  id: string | number;
  name: string;
  city?: string | null;
  owner_email?: string | null;
  address?: string | null;
  phone?: string | null;
  logo_url?: string | null;
}

export interface ActiveSchoolContext {
  schoolId: string | number | null;
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolCity: string;
  schoolLogo: string | null;
  isSuperAdmin: boolean;
  currentUserEmail: string | null;
  schools: SchoolProfile[];
}

export async function resolveActiveSchoolContext(): Promise<ActiveSchoolContext> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userEmail = user?.email || null;
  const isSuper = isSuperAdmin(userEmail) || userEmail === "mnuhbhatti333@gmail.com";

  let schoolsList: SchoolProfile[] = [];
  try {
    const { data: allSchools } = await supabase
      .from("schools")
      .select("*")
      .order("id", { ascending: true });
    schoolsList = allSchools || [];
  } catch (err) {
    console.error("Error loading schools list:", err);
  }

  let selectedId: string | number | null = null;
  let selectedName = "OA Smart School System";
  let selectedAddress = "Main Campus, Education Hub, Sillanwali Road";
  let selectedPhone = "+92 300 1234567";
  let selectedCity = "Sillanwali";
  let selectedLogo: string | null = null;

  if (typeof window !== "undefined") {
    const storedId = localStorage.getItem("oa_superadmin_selected_school_id");
    const storedName = localStorage.getItem("oa_superadmin_selected_school_name");
    if (storedId) selectedId = storedId;
    if (storedName) selectedName = storedName;
  }

  if (!selectedId) {
    // Lookup by user owner email
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
    selectedAddress = "Central SaaS Administration";
    selectedPhone = "+92 300 0000000";
    selectedCity = "Pakistan";
  } else if (selectedId) {
    const found = schoolsList.find((s) => String(s.id) === String(selectedId));
    if (found) {
      selectedName = found.name;
      selectedCity = found.city || "Sillanwali";
      selectedAddress = found.address || `${found.city || "Campus Area"}, Main Road`;
      selectedPhone = found.phone || "+92 300 1234567";
      selectedLogo = found.logo_url || null;
    }
  }

  // Check if school profile is overridden in localStorage
  if (typeof window !== "undefined" && selectedId && selectedId !== "all") {
    const customProfileStr = localStorage.getItem(`oa_school_profile_${selectedId}`);
    if (customProfileStr) {
      try {
        const custom = JSON.parse(customProfileStr);
        if (custom.name) selectedName = custom.name;
        if (custom.address) selectedAddress = custom.address;
        if (custom.phone) selectedPhone = custom.phone;
        if (custom.city) selectedCity = custom.city;
        if (custom.logo_url) selectedLogo = custom.logo_url;
      } catch (e) {}
    }
  }

  return {
    schoolId: selectedId,
    schoolName: selectedName,
    schoolAddress: selectedAddress,
    schoolPhone: selectedPhone,
    schoolCity: selectedCity,
    schoolLogo: selectedLogo,
    isSuperAdmin: isSuper,
    currentUserEmail: userEmail,
    schools: schoolsList,
  };
}
