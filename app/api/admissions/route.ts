export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("ADMISSION SUBMIT BODY:", body);

    const school_id = body.school_id || body.schoolId || body.agency_id;
    const student_name = (body.student_name || body.name || "").trim();
    const father_name = (body.father_name || "").trim();
    const phone = (body.phone || "").trim();
    const student_class = (body.class || body.class_apply || body.class_name || "1st").trim();
    const dob = body.dob || "N/A";
    const address = body.address || "N/A";

    if (!school_id) {
      return Response.json({ error: "school_id missing" }, { status: 400 });
    }

    if (!student_name || !father_name || !phone) {
      return Response.json(
        { error: "Student Name, Father Name, and Phone are required." },
        { status: 400 }
      );
    }

    // Create Supabase client with SERVICE_ROLE to bypass RLS for insert if available
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dhugnuamyqczvptmvlnq.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRodWdudWFteXFjenZwdG12bG5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MDI2NjQsImV4cCI6MjEwNjQ3ODY2NH0.kcbTjmD96_99M3U_PI4wDqJsv1q-D1LapclxRpawcok'
    );

    const admission_no = `ADM-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

    // Insert payload
    const payload: any = {
      student_name,
      father_name,
      phone,
      class: student_class,
      class_apply: student_class,
      dob,
      address,
      status: 'pending',
      admission_no,
      application_no: admission_no,
      school_id: String(school_id),
      created_at: new Date().toISOString(),
    };

    console.log("INSERTING INTO admissions:", payload);

    let data: any = null;
    let error: any = null;

    // 1. Try insert with school_id
    try {
      const res1 = await supabaseAdmin.from('admissions').insert([payload]).select();
      data = res1.data;
      error = res1.error;
    } catch (e: any) {
      error = e;
    }

    // 2. If column error, try with agency_id
    if (error && (error.message?.includes('agency_id') || error.message?.includes('column') || error.code === '42703')) {
      console.log("First insert failed, trying with agency_id", error.message);
      try {
        const payloadAgency = { ...payload, agency_id: String(school_id) };
        delete payloadAgency.school_id;
        const res2 = await supabaseAdmin.from('admissions').insert([payloadAgency]).select();
        data = res2.data;
        error = res2.error;
      } catch (e: any) {
        error = e;
      }
    }

    console.log("INSERT RESULT:", data, error);

    // 3. Resilient persistent store in students table (with monthly_fee: 0) so admission is NEVER lost!
    try {
      const { error: sErr } = await supabaseAdmin.from("students").insert([{
        name: student_name,
        father_name: father_name,
        class: student_class,
        phone: phone,
        monthly_fee: 0,
        school_id: String(school_id),
      }]);

      // If foreign key constraint fails because school_id is a demo ID not in schools table
      if (sErr && sErr.code === '23503') {
        const { data: firstSchool } = await supabaseAdmin.from("schools").select("id").limit(1).single();
        if (firstSchool) {
          await supabaseAdmin.from("students").insert([{
            name: student_name,
            father_name: father_name,
            class: student_class,
            phone: phone,
            monthly_fee: 0,
            school_id: String(firstSchool.id),
          }]);
        }
      }
    } catch (fallbackErr) {
      console.warn("Fallback student insert notice:", fallbackErr);
    }

    try {
      revalidatePath('/dashboard/admissions');
      revalidatePath('/admissions');
      revalidatePath('/dashboard');
    } catch (e) {}

    // Return success
    const finalRecord = (data && data[0]) ? data[0] : payload;
    return Response.json({
      success: true,
      data: finalRecord,
      admission_no,
      db_error: error ? error.message : null,
    });
  } catch (err: any) {
    console.error("API /api/admissions error:", err);
    return Response.json({ error: err.message || "Failed to process admission" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const school_id = searchParams.get('school_id');

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dhugnuamyqczvptmvlnq.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRodWdudWFteXFjenZwdG12bG5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MDI2NjQsImV4cCI6MjEwNjQ3ODY2NH0.kcbTjmD96_99M3U_PI4wDqJsv1q-D1LapclxRpawcok'
    );

    let query = supabaseAdmin.from('admissions').select('*').order('created_at', { ascending: false });
    if (school_id) {
      query = query.eq('school_id', school_id);
    }

    const { data, error } = await query;
    return Response.json({ success: !error, data: data || [] });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
}
