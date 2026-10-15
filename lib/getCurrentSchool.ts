import { supabase } from "./supabase";

// EMERGENCY CLEAR: Nuke any corrupted/stale fake IDs from localStorage immediately
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("oa_superadmin_selected_school_id");
    localStorage.removeItem("oa_active_school_context_cache");
    localStorage.removeItem("school_id");
    localStorage.removeItem("active_school_id");
    localStorage.removeItem("current_school_id");
    localStorage.removeItem("oa_superadmin_selected_school_name");
  } catch (e) {}
}

export interface ResolvedSchoolInfo {
  schoolId: string | null;
  schoolName: string;
  userEmail: string | null;
  userId: string | null;
}

/**
 * Bulletproof single source of truth for the active School ID across ALL devices.
 * Directly queries Supabase Auth and schools table.
 */
export async function getCurrentSchoolId(): Promise<string | null> {
  try {
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      console.log("getCurrentSchoolId: No authenticated user found");
      return null;
    }

    console.log("DEBUG USER:", user.id, user.email);

    // Step 1: Try schools table by owner_id
    try {
      const { data } = await supabase
        .from("schools")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (data?.id) {
        console.log("Current user:", user.id, "Resolved school_id (owner_id):", data.id);
        return String(data.id);
      }
    } catch (e) {}

    // Step 2: Try by user_id column
    try {
      const { data: data2 } = await supabase
        .from("schools")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data2?.id) {
        console.log("Current user:", user.id, "Resolved school_id (user_id):", data2.id);
        return String(data2.id);
      }
    } catch (e) {}

    // Step 3: Try by owner_email (case-insensitive)
    if (user.email) {
      const userEmailTrimmed = user.email.trim();
      try {
        const { data: data3 } = await supabase
          .from("schools")
          .select("id")
          .ilike("owner_email", userEmailTrimmed)
          .maybeSingle();

        if (data3?.id) {
          console.log("Current user:", user.id, "Resolved school_id (owner_email):", data3.id);
          return String(data3.id);
        }
      } catch (e) {}

      // Step 4: Try email column
      try {
        const { data: data4 } = await supabase
          .from("schools")
          .select("id")
          .ilike("email", userEmailTrimmed)
          .maybeSingle();

        if (data4?.id) {
          console.log("Current user:", user.id, "Resolved school_id (email):", data4.id);
          return String(data4.id);
        }
      } catch (e) {}
    }

    console.error("NO SCHOOL FOUND FOR USER", user.email);
    return null;
  } catch (err) {
    console.error("Error in getCurrentSchoolId:", err);
    return null;
  }
}

export async function getCurrentSchool(): Promise<ResolvedSchoolInfo> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const schoolId = await getCurrentSchoolId();
  let schoolName = "Registered School";

  if (schoolId) {
    try {
      const { data: sch } = await supabase
        .from("schools")
        .select("name")
        .eq("id", schoolId)
        .maybeSingle();
      if (sch?.name) schoolName = sch.name;
    } catch (e) {}
  }

  return {
    schoolId,
    schoolName,
    userEmail: user?.email || null,
    userId: user?.id || null,
  };
}

export default getCurrentSchool;
