import { supabase } from "./supabase";
import { isSuperAdmin } from "./constants";

export interface ActiveSchoolContext {
  schoolId: string | number | null;
  schoolName: string;
  isSuperAdmin: boolean;
  currentUserEmail: string | null;
  schools: Array<{ id: string | number; name: string }>;
}

export async function resolveActiveSchoolContext(): Promise<ActiveSchoolContext> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userEmail = user?.email || null;
  const isSuper = isSuperAdmin(userEmail) || userEmail === "mnuhbhatti333@gmail.com";

  let schoolsList: Array<{ id: string | number; name: string }> = [];
  try {
    const { data: allSchools } = await supabase
      .from("schools")
      .select("id, name")
      .order("id", { ascending: true });
    schoolsList = allSchools || [];
  } catch (err) {
    console.error("Error loading schools list:", err);
  }

  let selectedId: string | number | null = null;
  let selectedName = "OA Smart School";

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
  } else if (selectedId) {
    const found = schoolsList.find((s) => String(s.id) === String(selectedId));
    if (found) selectedName = found.name;
  }

  return {
    schoolId: selectedId,
    schoolName: selectedName,
    isSuperAdmin: isSuper,
    currentUserEmail: userEmail,
    schools: schoolsList,
  };
}
