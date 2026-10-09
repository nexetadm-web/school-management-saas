import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { PAKISTAN_BOARD_SUBJECTS } from "@/lib/subjects-data";

export const dynamic = "force-dynamic";

interface SchoolDef {
  name: string;
  city: string;
  owner_email: string;
}

const SCHOOLS_DATA: SchoolDef[] = [
  {
    name: "OA Smart School - Main Campus (Sillanwali)",
    city: "Sillanwali",
    owner_email: "maincampus@oasmart.edu.pk",
  },
  {
    name: "OA Smart School - Junior Branch",
    city: "Sillanwali",
    owner_email: "junior@oasmart.edu.pk",
  },
  {
    name: "Al-Noor Public School System",
    city: "Sargodha",
    owner_email: "alnoor@edu.pk",
  },
  {
    name: "The Leaders Academy",
    city: "Lahore",
    owner_email: "leaders@edu.pk",
  },
  {
    name: "Green Valley Grammar School",
    city: "Islamabad",
    owner_email: "greenvalley@edu.pk",
  },
];

const MALE_NAMES = [
  "Ahmed",
  "Ali",
  "Hassan",
  "Hussain",
  "Abdullah",
  "Umar",
  "Bilal",
  "Zain",
  "Huzaifa",
  "Usman",
  "Hamza",
  "Saad",
  "Talha",
  "Mustafa",
  "Danish",
  "Haris",
  "Taha",
  "Subhan",
];

const FEMALE_NAMES = [
  "Ayesha",
  "Fatima",
  "Zainab",
  "Maryam",
  "Noor",
  "Laiba",
  "Alishba",
  "Dua",
  "Hafsa",
  "Khadija",
  "Eman",
  "Areeba",
  "Manahil",
  "Hania",
  "Anaya",
  "Bisma",
  "Iqra",
];

const SURNAMES = [
  "Khan",
  "Bhatti",
  "Chaudhry",
  "Malik",
  "Raza",
  "Shah",
  "Mirza",
  "Qureshi",
  "Ansari",
  "Siddiqui",
  "Cheema",
  "Tarar",
  "Rehman",
  "Abbasi",
  "Butt",
  "Gill",
  "Jutt",
  "Warraich",
];

const FATHERS_NAMES = [
  "Muhammad Tariq",
  "Rashid Khan",
  "Imran Shah",
  "Nasir Mehmood",
  "Sajid Ali",
  "Zafar Iqbal",
  "Asif Javaid",
  "Farooq Ahmed",
  "Naveed Akhtar",
  "Shahid Hussain",
  "Akhtar Abbas",
  "Liaquat Ali",
  "Amjad Farooq",
  "Mushtaq Ahmed",
  "Tanveer Alam",
  "Khalid Mehmood",
  "Irfan Ullah",
  "Waseem Akram",
];

const CLASSES = [
  "Playgroup",
  "Nursery",
  "Prep",
  "Class 1-A",
  "Class 1-B",
  "Class 2-A",
  "Class 2-B",
  "Class 3-A",
  "Class 3-B",
  "Class 4-A",
  "Class 4-B",
  "Class 5-A",
  "Class 5-B",
  "Class 6-A",
  "Class 6-B",
  "Class 7-A",
  "Class 7-B",
  "Class 8-A",
  "Class 8-B",
];

const MONTHLY_FEES = [1500, 1800, 2000, 2200, 2500, 2800, 3000];

const STAFF_PROFILES = [
  { title: "Senior Subject Teacher", rolePrefix: "Teacher", salary: 32000, name: "Muhammad Tariq" },
  { title: "Junior Primary Teacher", rolePrefix: "Teacher", salary: 28000, name: "Saima Bibi" },
  { title: "Accounts Clerk", rolePrefix: "Clerk", salary: 25000, name: "Asim Riaz" },
  { title: "Campus Security Guard", rolePrefix: "Guard", salary: 21000, name: "Ghulam Abbas" },
  { title: "Office Attendant", rolePrefix: "Peon", salary: 18000, name: "Muhammad Boota" },
];

export async function GET() {
  console.log("==================================================");
  console.log("[SEEDER] Starting Mock Data Seeding for 5 Schools");
  console.log("==================================================");

  let totalSchoolsSeeded = 0;
  let totalStudentsCount = 0;
  let totalFeeRecordsCount = 0;
  let totalStaffCount = 0;
  let totalSalaryRecordsCount = 0;
  let totalExpensesCount = 0;

  const results: any[] = [];

  try {
    for (const schoolDef of SCHOOLS_DATA) {
      console.log(`\n[SEEDER] Processing School: "${schoolDef.name}" (${schoolDef.city})`);

      // 1. Idempotency Check: Check if school exists
      let schoolId: number;
      const { data: existingSchool, error: schoolFetchErr } = await supabase
        .from("schools")
        .select("id, name")
        .eq("name", schoolDef.name)
        .maybeSingle();

      if (schoolFetchErr) {
        console.error(`[SEEDER] Error querying school "${schoolDef.name}":`, schoolFetchErr.message);
      }

      if (existingSchool?.id) {
        schoolId = existingSchool.id;
        console.log(`[SEEDER] School already exists (ID: ${schoolId}). Checking existing student records...`);

        const { count: existingStudentCount } = await supabase
          .from("students")
          .select("*", { count: "exact", head: true })
          .eq("school_id", schoolId);

        if (existingStudentCount && existingStudentCount >= 35) {
          console.log(`[SEEDER] School "${schoolDef.name}" already has ${existingStudentCount} students. Skipping re-seed.`);
          totalSchoolsSeeded++;
          totalStudentsCount += existingStudentCount;
          results.push({
            school: schoolDef.name,
            schoolId,
            status: "already_seeded",
            students: existingStudentCount,
          });
          continue;
        }
      } else {
        // Create School
        const { data: newSchool, error: createSchoolErr } = await supabase
          .from("schools")
          .insert([
            {
              name: schoolDef.name,
              city: schoolDef.city,
              owner_email: schoolDef.owner_email,
            },
          ])
          .select()
          .single();

        if (createSchoolErr || !newSchool) {
          throw new Error(`Failed to create school "${schoolDef.name}": ${createSchoolErr?.message}`);
        }
        schoolId = newSchool.id;
        console.log(`[SEEDER] Successfully created school "${schoolDef.name}" with ID: ${schoolId}`);
      }

      totalSchoolsSeeded++;

      // 2. Prepare 35 Students (18 Male, 17 Female)
      const studentBatch: any[] = [];
      let studentIndex = 0;

      // 18 Male Students
      for (let i = 0; i < 18; i++) {
        studentIndex++;
        const firstName = MALE_NAMES[i % MALE_NAMES.length];
        const surname = SURNAMES[(i * 3 + studentIndex) % SURNAMES.length];
        const fatherName = FATHERS_NAMES[i % FATHERS_NAMES.length];
        const assignedClass = CLASSES[(studentIndex * 2) % CLASSES.length];
        const phone = `9230${Math.floor(1000000 + Math.random() * 9000000)}`;
        const monthlyFee = MONTHLY_FEES[(i + studentIndex) % MONTHLY_FEES.length];

        studentBatch.push({
          school_id: schoolId,
          name: `${firstName} ${surname}`,
          class: assignedClass,
          father_name: fatherName,
          phone,
          monthly_fee: monthlyFee,
        });
      }

      // 17 Female Students
      for (let i = 0; i < 17; i++) {
        studentIndex++;
        const firstName = FEMALE_NAMES[i % FEMALE_NAMES.length];
        const surname = SURNAMES[(i * 2 + studentIndex) % SURNAMES.length];
        const fatherName = FATHERS_NAMES[(i + 5) % FATHERS_NAMES.length];
        const assignedClass = CLASSES[(studentIndex * 3) % CLASSES.length];
        const phone = `9230${Math.floor(1000000 + Math.random() * 9000000)}`;
        const monthlyFee = MONTHLY_FEES[(i + studentIndex) % MONTHLY_FEES.length];

        studentBatch.push({
          school_id: schoolId,
          name: `${firstName} ${surname}`,
          class: assignedClass,
          father_name: fatherName,
          phone,
          monthly_fee: monthlyFee,
        });
      }

      const { data: insertedStudents, error: studentsInsertErr } = await supabase
        .from("students")
        .insert(studentBatch)
        .select();

      if (studentsInsertErr || !insertedStudents) {
        throw new Error(`Failed to insert students for school ${schoolId}: ${studentsInsertErr?.message}`);
      }

      const schoolStudentsCount = insertedStudents.length;
      totalStudentsCount += schoolStudentsCount;
      console.log(`[SEEDER] Inserted ${schoolStudentsCount} students for "${schoolDef.name}"`);

      // 3. Create 2 Fee Records per Student (Jan 2026: Paid, Feb 2026: ~70% Paid, 30% Unpaid)
      const feeBatch: any[] = [];
      insertedStudents.forEach((student: any, idx: number) => {
        // Record 1: January 2026 - Always Paid
        feeBatch.push({
          school_id: schoolId,
          student_id: student.id,
          month: "2026-01",
          amount: student.monthly_fee,
          status: "paid",
        });

        // Record 2: February 2026 - 70% Paid, 30% Unpaid
        // Deterministic split: indices where (idx % 10 < 7) are Paid, others are Unpaid
        const isPaid = idx % 10 < 7;
        feeBatch.push({
          school_id: schoolId,
          student_id: student.id,
          month: "2026-02",
          amount: student.monthly_fee,
          status: isPaid ? "paid" : "unpaid",
        });
      });

      const { error: feeInsertErr } = await supabase
        .from("fee_records")
        .insert(feeBatch);

      if (feeInsertErr) {
        console.error(`[SEEDER] Error inserting fee records for school ${schoolId}:`, feeInsertErr.message);
      } else {
        totalFeeRecordsCount += feeBatch.length;
        console.log(`[SEEDER] Inserted ${feeBatch.length} fee records (Jan Paid, Feb 70% Paid / 30% Unpaid)`);
      }

      // 4. Staff Members (5 per school: 2 Teachers, 1 Clerk, 1 Guard, 1 Peon)
      const staffBatch = STAFF_PROFILES.map((staff, sIdx) => ({
        school_id: schoolId,
        name: `${staff.name} (${staff.rolePrefix})`,
        phone: `9230${sIdx + 1}${Math.floor(100000 + Math.random() * 900000)}`,
        monthly_salary: staff.salary,
      }));

      const { data: insertedStaff, error: staffInsertErr } = await supabase
        .from("teachers")
        .insert(staffBatch)
        .select();

      if (staffInsertErr || !insertedStaff) {
        console.error(`[SEEDER] Error inserting staff for school ${schoolId}:`, staffInsertErr?.message);
      } else {
        totalStaffCount += insertedStaff.length;
        console.log(`[SEEDER] Inserted ${insertedStaff.length} staff members for "${schoolDef.name}"`);

        // 5. Salary Records: Jan & Feb 2026 Paid for all staff
        const salaryBatch: any[] = [];
        insertedStaff.forEach((st: any) => {
          salaryBatch.push({
            school_id: schoolId,
            teacher_id: st.id,
            month: "2026-01",
            amount: st.monthly_salary,
            status: "paid",
          });
          salaryBatch.push({
            school_id: schoolId,
            teacher_id: st.id,
            month: "2026-02",
            amount: st.monthly_salary,
            status: "paid",
          });
        });

        const { error: salaryInsertErr } = await supabase
          .from("salary_records")
          .insert(salaryBatch);

        if (salaryInsertErr) {
          console.error(`[SEEDER] Error inserting salary records for school ${schoolId}:`, salaryInsertErr.message);
        } else {
          totalSalaryRecordsCount += salaryBatch.length;
          console.log(`[SEEDER] Inserted ${salaryBatch.length} salary records (Jan & Feb Paid)`);
        }
      }

      // 6. Expenses (6-8 per school) & Other Income (2 per school)
      const accountingBatch = [
        // 6-8 Expenses
        {
          school_id: schoolId,
          title: "Electricity Bill (WAPDA / Utility)",
          amount: 5000,
          type: "expense",
          date: "2026-01-15",
        },
        {
          school_id: schoolId,
          title: "Office & Examination Stationery",
          amount: 3000,
          type: "expense",
          date: "2026-01-22",
        },
        {
          school_id: schoolId,
          title: "Building & Furniture Maintenance",
          amount: 4000,
          type: "expense",
          date: "2026-01-28",
        },
        {
          school_id: schoolId,
          title: "Campus Building Rent (January)",
          amount: 15000,
          type: "expense",
          date: "2026-01-05",
        },
        {
          school_id: schoolId,
          title: "Fiber Internet & Networking Bill",
          amount: 2500,
          type: "expense",
          date: "2026-02-08",
        },
        {
          school_id: schoolId,
          title: "Filtered Drinking Water Supplies",
          amount: 1800,
          type: "expense",
          date: "2026-02-12",
        },
        {
          school_id: schoolId,
          title: "Campus Building Rent (February)",
          amount: 15000,
          type: "expense",
          date: "2026-02-05",
        },
        {
          school_id: schoolId,
          title: "Science Lab & Whiteboard Supplies",
          amount: 2200,
          type: "expense",
          date: "2026-02-20",
        },

        // 2 Income (Other) entries
        {
          school_id: schoolId,
          title: "New Session Admission Fee Collection",
          amount: 14000,
          type: "income",
          date: "2026-01-10",
        },
        {
          school_id: schoolId,
          title: "Community Education Support Donation",
          amount: 25000,
          type: "income",
          date: "2026-02-14",
        },
      ];

      const { error: expensesInsertErr } = await supabase
        .from("expenses")
        .insert(accountingBatch);

      if (expensesInsertErr) {
        console.error(`[SEEDER] Error inserting expenses/income for school ${schoolId}:`, expensesInsertErr.message);
      } else {
        totalExpensesCount += accountingBatch.length;
        console.log(`[SEEDER] Inserted ${accountingBatch.length} accounting entries (8 expenses, 2 other income)`);
      }

      // 7. Seed 21 Pakistan Board Subjects
      try {
        const subjectsBatch = PAKISTAN_BOARD_SUBJECTS.map((sub) => ({
          school_id: schoolId,
          name: sub.name,
          class: sub.classes ? sub.classes.join(", ") : "All",
        }));
        await supabase.from("subjects").upsert(subjectsBatch, { onConflict: "school_id,name" });
        console.log(`[SEEDER] Seeded ${subjectsBatch.length} Pakistan Board subjects for "${schoolDef.name}"`);
      } catch (subErr) {}

      results.push({
        school: schoolDef.name,
        schoolId,
        status: "seeded",
        students: schoolStudentsCount,
        fees: feeBatch.length,
        staff: 5,
        salaries: 10,
        accountingEntries: accountingBatch.length,
      });
    }

    console.log("\n==================================================");
    console.log(`[SEEDER] Complete! Seeded ${totalSchoolsSeeded} schools with ${totalStudentsCount} total students.`);
    console.log("==================================================");

    return NextResponse.json({
      success: true,
      schools: totalSchoolsSeeded,
      students: totalStudentsCount,
      feeRecords: totalFeeRecordsCount,
      staff: totalStaffCount,
      salaryRecords: totalSalaryRecordsCount,
      accountingEntries: totalExpensesCount,
      message: "Mock data inserted",
      details: results,
    });
  } catch (error: any) {
    console.error("[SEEDER ERROR]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to seed mock data",
      },
      { status: 500 }
    );
  }
}
