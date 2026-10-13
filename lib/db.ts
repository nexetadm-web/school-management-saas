import { supabase } from "./supabase";

export interface ApplicationRecord {
  id: string | number;
  school_id: string | number;
  student_name: string;
  father_name: string;
  dob?: string;
  gender?: string;
  class?: string;
  desired_class?: string;
  class_applying?: string;
  previous_school?: string;
  phone: string;
  address?: string;
  photo_url?: string;
  tracking_no?: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  created_at: string;
}

export const applicationsTable = {
  id: "id",
  school_id: "school_id",
  student_name: "student_name",
  father_name: "father_name",
  class: "class",
  phone: "phone",
  created_at: "created_at",
  tableName: "online_admissions",
};

export function eq(column: any, value: any) {
  return { type: "eq", column, value };
}

export function desc(column: any) {
  return { type: "desc", column };
}

export function asc(column: any) {
  return { type: "asc", column };
}

function normalizeRecord(row: any): ApplicationRecord {
  const tracking = row.tracking_no || row.id || `ADM-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  return {
    id: tracking,
    tracking_no: tracking,
    school_id: row.school_id || 1,
    student_name: row.student_name || row.full_name || "New Applicant",
    father_name: row.father_name || "N/A",
    dob: row.dob || "N/A",
    gender: row.gender || "Male",
    class: row.class || row.desired_class || row.class_applying || "1st",
    desired_class: row.desired_class || row.class || row.class_applying || "1st",
    class_applying: row.class_applying || row.class || row.desired_class || "1st",
    previous_school: row.previous_school || "N/A",
    phone: row.phone || "",
    address: row.address || "",
    photo_url: row.photo_url || null,
    status: (row.status === "approved" || row.status === "rejected") ? row.status : "pending",
    rejection_reason: row.rejection_reason,
    created_at: row.created_at || row.applied_at || new Date().toISOString(),
  };
}

export async function executeFreshSelect(
  _tableName: string,
  whereClause?: any,
  _orderByClause?: any
): Promise<ApplicationRecord[]> {
  const results: ApplicationRecord[] = [];
  const targetSchoolId = whereClause && whereClause.value !== undefined ? String(whereClause.value) : null;

  // 1. Fetch fresh from online_admissions table in DB
  try {
    let q = supabase.from("online_admissions").select("*").order("created_at", { ascending: false });
    if (targetSchoolId && targetSchoolId !== "all") {
      q = q.eq("school_id", targetSchoolId);
    }
    const { data: oData, error: oErr } = await q;
    if (!oErr && oData && oData.length > 0) {
      for (const row of oData) {
        results.push(normalizeRecord(row));
      }
    }
  } catch (err) {
    console.warn("DB select online_admissions error:", err);
  }

  // 2. Fetch fresh from admission_applications table in DB
  try {
    let q = supabase.from("admission_applications").select("*").order("created_at", { ascending: false });
    if (targetSchoolId && targetSchoolId !== "all") {
      q = q.eq("school_id", targetSchoolId);
    }
    const { data: aData, error: aErr } = await q;
    if (!aErr && aData && aData.length > 0) {
      for (const row of aData) {
        const norm = normalizeRecord(row);
        if (!results.some((r) => String(r.id) === String(norm.id))) {
          results.push(norm);
        }
      }
    }
  } catch (err) {
    console.warn("DB select admission_applications error:", err);
  }

  // 3. Fetch fresh from admissions table in DB
  try {
    let q = supabase.from("admissions").select("*").order("created_at", { ascending: false });
    if (targetSchoolId && targetSchoolId !== "all") {
      q = q.eq("school_id", targetSchoolId);
    }
    const { data: admData, error: admErr } = await q;
    if (!admErr && admData && admData.length > 0) {
      for (const row of admData) {
        const norm = normalizeRecord(row);
        if (!results.some((r) => String(r.id) === String(norm.id))) {
          results.push(norm);
        }
      }
    }
  } catch (err) {}

  return results;
}

export async function executeFreshInsert(_tableName: string, values: any) {
  const items = Array.isArray(values) ? values : [values];
  const inserted: ApplicationRecord[] = [];

  for (const raw of items) {
    const tracking = raw.tracking_no || `ADM-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const record: ApplicationRecord = {
      ...raw,
      id: tracking,
      tracking_no: tracking,
      school_id: raw.school_id || 1,
      student_name: raw.student_name || raw.full_name || "New Applicant",
      father_name: raw.father_name || "N/A",
      phone: raw.phone || "",
      class: raw.class || raw.desired_class || raw.class_applying || "1st",
      desired_class: raw.desired_class || raw.class || raw.class_applying || "1st",
      class_applying: raw.class_applying || raw.class || raw.desired_class || "1st",
      status: raw.status || "pending",
      created_at: raw.created_at || new Date().toISOString(),
    };

    // Insert into online_admissions table
    try {
      await supabase.from("online_admissions").insert([{
        school_id: String(record.school_id),
        student_name: record.student_name,
        father_name: record.father_name,
        class: record.class,
        desired_class: record.desired_class,
        phone: record.phone,
        dob: record.dob || "N/A",
        gender: record.gender || "Male",
        previous_school: record.previous_school || "N/A",
        address: record.address || "N/A",
        photo_url: record.photo_url || null,
        tracking_no: record.tracking_no,
        status: record.status,
        created_at: record.created_at,
      }]);
    } catch (e) {}

    // Insert into admission_applications table
    try {
      await supabase.from("admission_applications").insert([{
        school_id: String(record.school_id),
        full_name: record.student_name,
        father_name: record.father_name,
        desired_class: record.class,
        phone: record.phone,
        tracking_no: record.tracking_no,
        status: record.status,
        created_at: record.created_at,
      }]);
    } catch (e) {}

    // Insert into admissions table
    try {
      await supabase.from("admissions").insert([{
        school_id: String(record.school_id),
        student_name: record.student_name,
        father_name: record.father_name,
        class_applying: record.class,
        phone: record.phone,
        status: record.status,
      }]);
    } catch (e) {}

    inserted.push(record);
  }

  return { success: true, count: inserted.length, records: inserted };
}

export const db = {
  select: () => ({
    from: (table: any) => {
      const tableName = typeof table === "string" ? table : (table?.tableName || "online_admissions");
      let whereClause: any = null;
      return {
        where: (clause: any) => {
          whereClause = clause;
          return {
            orderBy: async (orderClause: any) => {
              return executeFreshSelect(tableName, whereClause, orderClause);
            },
            then: (resolve: any, reject: any) => {
              return executeFreshSelect(tableName, whereClause, null).then(resolve, reject);
            },
          };
        },
        orderBy: async (orderClause: any) => {
          return executeFreshSelect(tableName, null, orderClause);
        },
        then: (resolve: any, reject: any) => {
          return executeFreshSelect(tableName, null, null).then(resolve, reject);
        },
      };
    },
  }),
  insert: (table: any) => {
    const tableName = typeof table === "string" ? table : (table?.tableName || "online_admissions");
    return {
      values: async (data: any) => {
        return executeFreshInsert(tableName, data);
      },
    };
  },
};
