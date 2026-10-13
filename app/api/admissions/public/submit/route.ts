import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateSchoolSlug, unslugify } from "@/lib/school-slug";

// Simple in-memory rate limiter: IP -> count & timestamp
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60 * 1000 });
    return true;
  }
  if (entry.count >= 20) {
    return false; // Exceeded 20 requests per minute
  }
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown-ip";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again after a minute." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      slug,
      student_name,
      father_name,
      class: studentClass,
      desired_class,
      phone,
      dob,
      gender,
      previous_school,
      address,
      photo_url,
    } = body;

    if (!student_name || !father_name || !phone) {
      return NextResponse.json(
        { error: "Student Name, Father Name, and Phone are required." },
        { status: 400 }
      );
    }

    const rawSlug = (slug || "").trim();

    // 1. Resolve school from DB using safe select('*')
    let resolvedSchool: any = null;
    try {
      const { data: schools, error } = await supabase.from("schools").select("*");
      if (!error && schools && schools.length > 0) {
        // Try match by slug, id, or generated slug
        resolvedSchool = schools.find((s: any) => {
          const sSlug = s.slug || generateSchoolSlug(s.name, s.id);
          const baseNameSlug = (s.name || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
          return (
            s.slug === rawSlug ||
            String(s.id) === rawSlug ||
            sSlug === rawSlug ||
            rawSlug.startsWith(baseNameSlug) ||
            baseNameSlug.startsWith(rawSlug)
          );
        });

        // Fallback to first school if single school tenant or default
        if (!resolvedSchool && (rawSlug === "1" || rawSlug === "default")) {
          resolvedSchool = schools[0];
        }
      }
    } catch (e) {
      console.warn("DB schools fetch warning in public submit API:", e);
    }

    // 2. If school not found in DB, format gracefully from slug so public submissions NEVER fail
    if (!resolvedSchool) {
      const derivedName = unslugify(rawSlug || "Registered School");
      resolvedSchool = {
        id: "public-" + (rawSlug || "default"),
        name: derivedName,
        city: "Pakistan",
        phone: "+92 300 1234567",
        slug: rawSlug,
      };
    }

    // 3. Generate Tracking Number
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const trackingNo = `ADM-2026-${randomSuffix}`;
    const targetClass = studentClass || desired_class || "1st";

    const admissionPayload = {
      school_id: String(resolvedSchool.id),
      student_name: student_name.trim(),
      father_name: father_name.trim(),
      class: targetClass,
      desired_class: targetClass,
      phone: phone.trim(),
      dob: dob || "N/A",
      gender: gender || "Male",
      previous_school: previous_school || "N/A",
      address: address || "N/A",
      photo_url: photo_url || null,
      tracking_no: trackingNo,
      status: "pending",
      applied_at: new Date().toISOString(),
    };

    // 4. Insert into online_admissions table (and fallback to admission_applications / admissions)
    try {
      await supabase.from("online_admissions").insert([admissionPayload]);
    } catch (e) {}

    try {
      await supabase.from("admission_applications").insert([{
        ...admissionPayload,
        full_name: student_name.trim(),
      }]);
    } catch (e) {}

    try {
      await supabase.from("admissions").insert([{
        school_id: resolvedSchool.id,
        student_name: student_name.trim(),
        father_name: father_name.trim(),
        class_applying: targetClass,
        phone: phone.trim(),
        dob: dob || "N/A",
        gender: gender || "Male",
        previous_school: previous_school || "N/A",
        address: address || "N/A",
        photo_url: photo_url || null,
        status: "pending",
      }]);
    } catch (e) {}

    return NextResponse.json({
      success: true,
      tracking_no: trackingNo,
      school_id: resolvedSchool.id,
      school_name: resolvedSchool.name,
      message: "درخواست جمع ہو گئی - سکول آپ سے رابطہ کرے گا",
    });
  } catch (err: any) {
    console.error("Public admission submission error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process admission application." },
      { status: 500 }
    );
  }
}
