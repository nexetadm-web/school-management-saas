import { supabase } from "./supabase";
import { generateSchoolSlug } from "./school-slug";

export interface ApplicationRecord {
  id: string | number;
  school_id: string | number;
  student_name: string;
  name?: string;
  father_name: string;
  dob?: string;
  gender?: string;
  class?: string;
  desired_class?: string;
  class_name?: string;
  class_applied?: string;
  class_applying?: string;
  previous_school?: string;
  phone: string;
  address?: string;
  photo_url?: string;
  tracking_no?: string;
  status: "pending" | "approved" | "rejected";
  source?: string;
  rejection_reason?: string;
  created_at: string;
}

export const applications = {
  id: "id",
  school_id: "school_id",
  student_name: "student_name",
  name: "student_name",
  father_name: "father_name",
  class: "class",
  class_name: "class",
  class_applied: "class_applied",
  phone: "phone",
  status: "status",
  source: "source",
  created_at: "created_at",
  tableName: "online_admissions",
};

export const applicationsTable = applications;

export const schools = {
  id: "id",
  slug: "slug",
  name: "name",
  owner_email: "owner_email",
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
  const tracking = row.tracking_no || `ADM-2026-${row.id}`;
  const cls = row.class || row.class_name || row.class_applied || row.desired_class || row.class_applying || "1st";
  return {
    id: tracking,
    tracking_no: tracking,
    school_id: row.school_id || 1,
    student_name: row.student_name || row.name || row.full_name || "New Applicant",
    name: row.student_name || row.name || row.full_name || "New Applicant",
    father_name: row.father_name || "N/A",
    dob: row.dob || "N/A",
    gender: row.gender || "Male",
    class: cls,
    class_name: cls,
    class_applied: cls,
    desired_class: cls,
    class_applying: cls,
    previous_school: row.previous_school || "N/A",
    phone: row.phone || "",
    address: row.address || "",
    photo_url: row.photo_url || null,
    source: row.source || "online_link",
    status: (row.status === "approved" || row.status === "rejected") ? row.status : "pending",
    rejection_reason: row.rejection_reason,
    created_at: typeof row.created_at === "string" ? row.created_at : row.created_at instanceof Date ? row.created_at.toISOString() : new Date().toISOString(),
  };
}

export async function executeFreshSelect(
  _tableName: string,
  whereClause?: any,
  _orderByClause?: any
): Promise<ApplicationRecord[]> {
  const results: ApplicationRecord[] = [];
  const targetSchoolId = whereClause && whereClause.value !== undefined ? String(whereClause.value) : null;

  // 0. Fetch applications directly from admissions table
  try {
    let q = supabase
      .from("admissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (targetSchoolId && targetSchoolId !== "all") {
      q = q.eq("school_id", targetSchoolId);
    }
    const { data: admData, error: admErr } = await q;
    if (!admErr && admData && admData.length > 0) {
      for (const row of admData) {
        results.push(normalizeRecord(row));
      }
    }
  } catch (err) {}

  // 1. Fetch applications stored in students table with monthly_fee = 0 (Persistent cloud store in Supabase)
  try {
    let q = supabase
      .from("students")
      .select("*")
      .eq("monthly_fee", 0)
      .order("created_at", { ascending: false });

    if (targetSchoolId && targetSchoolId !== "all") {
      q = q.eq("school_id", targetSchoolId);
    }
    const { data: sData } = await q;
    if (sData && sData.length > 0) {
      for (const row of sData) {
        results.push(normalizeRecord(row));
      }
    }
  } catch (err) {
    console.warn("students select notice:", err);
  }

  // 2. Fetch from online_admissions table in DB if it exists
  try {
    let q = supabase.from("online_admissions").select("*").order("created_at", { ascending: false });
    if (targetSchoolId && targetSchoolId !== "all") {
      q = q.eq("school_id", targetSchoolId);
    }
    const { data: oData, error: oErr } = await q;
    if (!oErr && oData && oData.length > 0) {
      for (const row of oData) {
        const norm = normalizeRecord(row);
        if (!results.some((r) => String(r.id) === String(norm.id))) {
          results.push(norm);
        }
      }
    }
  } catch (err) {}

  // 3. Fetch from admission_applications table in DB if it exists
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
  } catch (err) {}

  return results;
}

export async function executeFreshInsert(_tableName: string, values: any) {
  const items = Array.isArray(values) ? values : [values];
  const inserted: ApplicationRecord[] = [];

  for (const raw of items) {
    const tracking = raw.tracking_no || raw.id || `ADM-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const studentName = raw.name || raw.student_name || raw.full_name || "New Applicant";
    const targetClass = raw.class_applied || raw.class_name || raw.class || raw.desired_class || raw.class_applying || "1st";

    const record: ApplicationRecord = {
      ...raw,
      id: tracking,
      tracking_no: tracking,
      school_id: raw.school_id || 1,
      student_name: studentName,
      name: studentName,
      father_name: raw.father_name || "N/A",
      phone: raw.phone || "",
      class: targetClass,
      class_name: targetClass,
      class_applied: targetClass,
      desired_class: targetClass,
      class_applying: targetClass,
      status: raw.status || "pending",
      source: raw.source || "online_link",
      created_at: raw.created_at ? (raw.created_at instanceof Date ? raw.created_at.toISOString() : String(raw.created_at)) : new Date().toISOString(),
    };

    // 1. Insert into students table with monthly_fee: 0 (Persistent cross-device cloud store)
    try {
      const { data: sData, error: sErr } = await supabase.from("students").insert([{
        name: record.student_name,
        father_name: record.father_name,
        class: record.class,
        phone: record.phone,
        monthly_fee: 0,
        school_id: String(record.school_id),
      }]).select();

      if (!sErr && sData && sData[0]) {
        record.id = `ADM-2026-${sData[0].id}`;
        record.tracking_no = `ADM-2026-${sData[0].id}`;
      }
    } catch (e) {
      console.warn("students insert warning:", e);
    }

    // 2. Insert into admissions table
    try {
      await supabase.from("admissions").insert([{
        school_id: String(record.school_id),
        student_name: record.student_name,
        father_name: record.father_name,
        class_apply: record.class,
        class: record.class,
        phone: record.phone,
        dob: record.dob || "N/A",
        gender: record.gender || "Male",
        address: record.address || "N/A",
        application_no: record.tracking_no,
        status: record.status,
        created_at: record.created_at,
      }]);
    } catch (e) {}

    // 3. Try online_admissions table
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
        source: record.source,
        created_at: record.created_at,
      }]);
    } catch (e) {}

    // 3. Try admission_applications table
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

    inserted.push(record);
  }

  return { success: true, count: inserted.length, records: inserted };
}

async function findFirstSchool(whereClause?: any) {
  try {
    const { data: allSchools, error } = await supabase.from("schools").select("*");
    if (!error && allSchools && allSchools.length > 0) {
      if (!whereClause) return allSchools[0];

      const targetVal = String(whereClause.value || "").trim().toLowerCase();
      const col = whereClause.column;

      if (col === "slug" || col === schools.slug) {
        // Find school by slug
        const matched = allSchools.find((s: any) => {
          const sSlug = String(s.slug || "").toLowerCase();
          const sId = String(s.id || "").toLowerCase();
          const genSlug = generateSchoolSlug(s.name, s.id).toLowerCase();
          const baseNameSlug = (s.name || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

          return (
            (sSlug && sSlug === targetVal) ||
            sId === targetVal ||
            genSlug === targetVal ||
            targetVal.startsWith(baseNameSlug) ||
            baseNameSlug.startsWith(targetVal)
          );
        });

        if (matched) return matched;
        return allSchools[0];
      }

      if (col === "id" || col === schools.id) {
        const matched = allSchools.find((s: any) => String(s.id).toLowerCase() === targetVal);
        if (matched) return matched;
        return allSchools[0];
      }

      return allSchools[0];
    }
  } catch (e) {
    console.warn("findFirstSchool error:", e);
  }

  return {
    id: "87137fe7-22f2-48dc-820d-f21d21b73686",
    name: "Oxfors Academy",
    slug: "oxfors-academy-8713",
  };
}

export async function getAuth(_req?: Request) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: allSchools } = await supabase.from("schools").select("*");
      if (allSchools && allSchools.length > 0) {
        const matched = allSchools.find(
          (s: any) => s.owner_email && s.owner_email.toLowerCase() === user.email?.toLowerCase()
        );
        const schoolId = matched ? matched.id : allSchools[0].id;
        return {
          user: {
            id: user.id,
            email: user.email,
            school_id: schoolId,
          },
        };
      }
    }
  } catch (e) {}

  try {
    const { data: allSchools } = await supabase.from("schools").select("*").limit(1);
    if (allSchools && allSchools[0]) {
      return {
        user: {
          id: "default-user",
          email: allSchools[0].owner_email || "admin@school.com",
          school_id: allSchools[0].id,
        },
      };
    }
  } catch (e) {}

  return {
    user: {
      id: "default-user",
      email: "admin@school.com",
      school_id: "87137fe7-22f2-48dc-820d-f21d21b73686",
    },
  };
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
      values: (data: any) => {
        const executePromise = executeFreshInsert(tableName, data);
        return Object.assign(executePromise, {
          returning: async () => {
            const res = await executePromise;
            return res.records;
          },
        });
      },
    };
  },
  query: {
    schools: {
      findFirst: async (options?: { where?: any }) => {
        return findFirstSchool(options?.where);
      },
    },
    applications: {
      findMany: async (options?: { where?: any; orderBy?: any }) => {
        return executeFreshSelect("online_admissions", options?.where, options?.orderBy);
      },
    },
  },
};
