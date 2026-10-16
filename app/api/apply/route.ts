import { NextResponse } from "next/server";
import { db, applications, schools, eq, or } from "@/lib/db";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { slug, name, student_name, father_name, phone, class_name, class: targetClass, school_id } = body;
    console.log("APPLY SLUG / SCHOOL_ID:", slug, school_id);

    const lookupKey = slug || school_id || "";

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dhugnuamyqczvptmvlnq.supabase.co",
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRodWdudWFteXFjenZwdG12bG5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MDI2NjQsImV4cCI6MjEwNjQ3ODY2NH0.kcbTjmD96_99M3U_PI4wDqJsv1q-D1LapclxRpawcok"
    );

    let resolvedId: string | null = null;
    let resolvedName: string = "School Admission";

    // 1. Try Drizzle lookup by slug OR id
    try {
      const dSchool = await db.query.schools.findFirst({
        where: or(eq(schools.slug, lookupKey), eq(schools.id, lookupKey)),
      });
      if (dSchool) {
        resolvedId = String(dSchool.id);
        resolvedName = dSchool.name || resolvedName;
      }
    } catch (e) {}

    // 2. Try Supabase schools lookup by id OR slug
    if (!resolvedId) {
      try {
        const { data: sSchool } = await supabaseAdmin
          .from("schools")
          .select("id, name, school_name")
          .or(`id.eq.${lookupKey},slug.eq.${lookupKey}`)
          .maybeSingle();

        if (sSchool) {
          resolvedId = String(sSchool.id);
          resolvedName = (sSchool as any).school_name || sSchool.name || resolvedName;
        }
      } catch (e) {}
    }

    // 3. Fallback: if lookupKey looks like a UUID or valid ID, accept it directly
    if (!resolvedId && lookupKey) {
      resolvedId = String(lookupKey);
    }

    if (!resolvedId) {
      return NextResponse.json(
        { error: "School not found for identifier: " + lookupKey },
        { status: 404 }
      );
    }

    const applicantName = (name || student_name || "New Applicant").trim();
    const applicantClass = (class_name || targetClass || "1st").trim();
    const trackingNo = body.tracking_no || `ADM-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    // 4. Insert into Supabase online_admissions table
    try {
      await supabaseAdmin.from("online_admissions").insert([
        {
          tracking_no: trackingNo,
          school_id: resolvedId,
          student_name: applicantName,
          father_name: father_name || "N/A",
          phone: phone || "",
          class: applicantClass,
          desired_class: applicantClass,
          dob: body.dob || "N/A",
          gender: body.gender || "Male",
          previous_school: body.previous_school || "N/A",
          address: body.address || "N/A",
          photo_url: body.photo_url || null,
          status: "pending",
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (sbErr) {
      console.warn("Supabase online_admissions insert in /api/apply:", sbErr);
    }

    // 5. Also insert into Supabase admissions table
    try {
      await supabaseAdmin.from("admissions").insert([
        {
          admission_no: trackingNo,
          application_no: trackingNo,
          school_id: resolvedId,
          student_name: applicantName,
          father_name: father_name || "N/A",
          phone: phone || "",
          class: applicantClass,
          class_apply: applicantClass,
          dob: body.dob || "N/A",
          address: body.address || "N/A",
          status: "pending",
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (sbErr) {
      console.warn("Supabase admissions insert in /api/apply:", sbErr);
    }

    // 6. Also insert into Drizzle DB if available
    try {
      await db.insert(applications).values({
        id: crypto.randomUUID(),
        school_id: resolvedId,
        name: applicantName,
        student_name: applicantName,
        father_name: father_name || "N/A",
        phone: phone || "",
        class_applied: applicantClass,
        class_name: applicantClass,
        class: applicantClass,
        status: "pending",
        source: "online_link",
        created_at: new Date(),
      });
    } catch (dErr) {}

    // Revalidate paths
    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/dashboard/admissions");
      revalidatePath("/dashboard/admissions/online");
      revalidatePath("/admissions/online");
      revalidatePath("/dashboard");
    } catch (e) {}

    return NextResponse.json(
      {
        success: true,
        school_id: resolvedId,
        school_name: resolvedName,
        tracking_no: trackingNo,
      },
      {
        headers: { "Cache-Control": "no-store, no-cache" },
      }
    );
  } catch (err: any) {
    console.error("API /api/apply error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to submit application" },
      { status: 500 }
    );
  }
}
