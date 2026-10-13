import { NextResponse } from "next/server";
import { db, applications, schools, eq } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { slug, name, student_name, father_name, phone, class_name, class: targetClass } = body;
    console.log("APPLY SLUG:", slug);

    // IMPORTANT: Find school by slug from URL, not from client localStorage
    const school = await db.query.schools.findFirst({
      where: eq(schools.slug, slug),
    });
    if (!school) {
      return NextResponse.json(
        { error: "School not found for slug: " + slug },
        { status: 404 }
      );
    }

    const applicantName = name || student_name || "New Applicant";
    const applicantClass = class_name || targetClass || "1st";

    const newApp = await db
      .insert(applications)
      .values({
        id: crypto.randomUUID(),
        school_id: school.id, // Use school.id from slug lookup
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
      })
      .returning();

    // Revalidate all paths
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/dashboard/admissions/online");
    revalidatePath("/admissions/online");
    revalidatePath("/dashboard");

    return NextResponse.json(
      { success: true, school_id: school.id, app: newApp },
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
