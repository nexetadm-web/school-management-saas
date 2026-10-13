import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db, applicationsTable, schools, eq } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { slug, name, student_name, father_name, phone, class_name, class: targetClass } = body;

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    // Find school by slug ONLY - This is the main fix
    const school = await db.query.schools.findFirst({ where: eq(schools.slug, slug) });
    if (!school) {
      return NextResponse.json({ error: "School not found for slug " + slug }, { status: 404 });
    }

    const applicantName = name || student_name;
    const applicantClass = class_name || targetClass || "1st";

    // Use ID from slug lookup, NOT from client
    await db.insert(applicationsTable).values({
      school_id: school.id, // Use ID from slug lookup, NOT from client
      name: applicantName,
      student_name: applicantName,
      father_name,
      phone,
      class_name: applicantClass,
      class: applicantClass,
      desired_class: applicantClass,
      dob: body.dob || "N/A",
      gender: body.gender || "Male",
      previous_school: body.previous_school || "N/A",
      address: body.address || "N/A",
      photo_url: body.photo_url || null,
      tracking_no: body.tracking_no,
      status: "pending",
      source: "online_link",
      created_at: new Date(),
    });

    revalidatePath("/dashboard/admissions/online");
    revalidatePath("/admissions/online");
    revalidatePath("/dashboard");

    return NextResponse.json({
      success: true,
      school_id: school.id,
      school_name: school.name,
      message: "درخواست جمع ہو گئی - سکول آپ سے رابطہ کرے گا",
    });
  } catch (err: any) {
    console.error("API /api/apply error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process application" },
      { status: 500 }
    );
  }
}
