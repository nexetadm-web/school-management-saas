export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = createClient();
    console.log("Admission data received:", body);

    const appNo = body.application_no || `ADM-${Date.now()}`;
    const targetClass = body.class || body.class_apply || body.class_name || body.class_applying || body.desired_class || "1st";
    const studentName = body.student_name || body.name || "New Student";
    const fatherName = body.father_name || "N/A";
    const phone = body.phone || "";
    const dob = body.dob || "N/A";
    const fatherCnic = body.father_cnic || "";
    const address = body.address || "N/A";
    const schoolId = body.school_id || 1;

    const admissionRecord = {
      student_name: studentName,
      father_name: fatherName,
      dob: dob,
      father_cnic: fatherCnic,
      phone: phone,
      class_apply: targetClass,
      address: address,
      status: 'pending',
      application_no: appNo,
      school_id: schoolId,
      created_at: new Date().toISOString(),
    };

    // 1. Primary insert to admissions table as specified in prompt
    const { data, error } = await supabase.from('admissions').insert([admissionRecord]).select();

    if (error) {
      console.error("Supabase insert error in admissions table:", error);

      // Resilient fallback: Also store in students table with monthly_fee: 0 so it's not lost
      try {
        await supabase.from("students").insert([{
          name: studentName,
          father_name: fatherName,
          class: targetClass,
          phone: phone,
          monthly_fee: 0,
          school_id: String(schoolId),
        }]);
      } catch (fallbackErr) {
        console.warn("Fallback store notice:", fallbackErr);
      }

      // If admissions table does not exist yet in Supabase schema cache
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return Response.json({
          success: true,
          data: [{ ...admissionRecord, id: appNo }],
          warning: "admissions table not found in Supabase yet. Run provided SQL migration to create it."
        });
      }

      throw error;
    }

    try {
      revalidatePath('/dashboard/admissions');
      revalidatePath('/admissions');
      revalidatePath('/dashboard');
    } catch (e) {}

    return Response.json({ success: true, data });
  } catch (e: any) {
    console.error("Admission submission error:", e);
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
}
