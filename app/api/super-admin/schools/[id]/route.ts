import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const schoolId = String(id).trim();

    if (!schoolId) {
      return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    console.log(`[SuperAdmin] Deleting school ID: ${schoolId} and related data...`);

    // 1. Delete all applications related to this school
    try {
      await supabase.from("online_admissions").delete().eq("school_id", schoolId);
    } catch (e) {}
    try {
      await supabase.from("admission_applications").delete().eq("school_id", schoolId);
    } catch (e) {}
    try {
      await supabase.from("admissions").delete().eq("school_id", schoolId);
    } catch (e) {}

    // 2. Delete all fees and financial records first
    try {
      await supabase.from("fee_records").delete().eq("school_id", schoolId);
    } catch (e) {}
    try {
      await supabase.from("fees").delete().eq("school_id", schoolId);
    } catch (e) {}
    try {
      await supabase.from("fee_vouchers").delete().eq("school_id", schoolId);
    } catch (e) {}
    try {
      await supabase.from("online_payments").delete().eq("school_id", schoolId);
    } catch (e) {}
    try {
      await supabase.from("expenses").delete().eq("school_id", schoolId);
    } catch (e) {}
    try {
      await supabase.from("staff_salaries").delete().eq("school_id", schoolId);
    } catch (e) {}

    // 3. Delete all teachers, staff, classes
    try {
      await supabase.from("teachers").delete().eq("school_id", schoolId);
    } catch (e) {}
    try {
      await supabase.from("staff").delete().eq("school_id", schoolId);
    } catch (e) {}
    try {
      await supabase.from("class_subjects").delete().eq("school_id", schoolId);
    } catch (e) {}

    // 4. Delete all students of this school
    const { error: studentErr } = await supabase
      .from("students")
      .delete()
      .eq("school_id", schoolId);

    if (studentErr) {
      console.error("Error deleting students:", studentErr);
      return NextResponse.json(
        { error: "Error - پہلے اس کے سٹوڈنٹس ڈیلیٹ کریں: " + studentErr.message },
        { status: 400 }
      );
    }

    // 5. Finally, delete the school row from schools table
    const { error: schoolErr } = await supabase
      .from("schools")
      .delete()
      .eq("id", schoolId);

    if (schoolErr) {
      console.error("Error deleting school:", schoolErr);
      return NextResponse.json(
        { error: "Error - پہلے اس کے سٹوڈنٹس ڈیلیٹ کریں: " + schoolErr.message },
        { status: 400 }
      );
    }

    // Revalidate relevant pages
    try {
      revalidatePath("/super-admin/schools");
      revalidatePath("/super-admin");
      revalidatePath("/admin");
      revalidatePath("/dashboard");
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: "سکول اور تمام متعلقہ ڈیٹا کامیابی سے ڈیلیٹ ہو گیا",
      school_id: schoolId,
    });
  } catch (err: any) {
    console.error("Super Admin DELETE School Error:", err);
    return NextResponse.json(
      { error: err.message || "Error - پہلے اس کے سٹوڈنٹس ڈیلیٹ کریں" },
      { status: 500 }
    );
  }
}
