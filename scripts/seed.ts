import { createClient } from "@supabase/supabase-js";

// Read from process.env or fallback to project .env.local values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dhugnuamyqczvptmvlnq.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRodWdudWFteXFjenZwdG12bG5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MDI2NjQsImV4cCI6MjEwNjQ3ODY2NH0.kcbTjmD96_99M3U_PI4wDqJsv1q-D1LapclxRpawcok";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  "Ahmed", "Ali", "Hassan", "Hussain", "Abdullah", "Umar",
  "Bilal", "Zain", "Huzaifa", "Usman", "Hamza", "Saad",
  "Talha", "Mustafa", "Danish", "Haris", "Taha", "Subhan",
];

const FEMALE_NAMES = [
  "Ayesha", "Fatima", "Zainab", "Maryam", "Noor", "Laiba",
  "Alishba", "Dua", "Hafsa", "Khadija", "Eman", "Areeba",
  "Manahil", "Hania", "Anaya", "Bisma", "Iqra",
];

const SURNAMES = [
  "Khan", "Bhatti", "Chaudhry", "Malik", "Raza", "Shah",
  "Mirza", "Qureshi", "Ansari", "Siddiqui", "Cheema", "Tarar",
  "Rehman", "Abbasi", "Butt", "Gill", "Jutt", "Warraich",
];

const FATHERS_NAMES = [
  "Muhammad Tariq", "Rashid Khan", "Imran Shah", "Nasir Mehmood",
  "Sajid Ali", "Zafar Iqbal", "Asif Javaid", "Farooq Ahmed",
  "Naveed Akhtar", "Shahid Hussain", "Akhtar Abbas", "Liaquat Ali",
  "Amjad Farooq", "Mushtaq Ahmed", "Tanveer Alam", "Khalid Mehmood",
  "Irfan Ullah", "Waseem Akram",
];

const CLASSES = [
  "Playgroup", "Nursery", "Prep",
  "Class 1-A", "Class 1-B", "Class 2-A", "Class 2-B",
  "Class 3-A", "Class 3-B", "Class 4-A", "Class 4-B",
  "Class 5-A", "Class 5-B", "Class 6-A", "Class 6-B",
  "Class 7-A", "Class 7-B", "Class 8-A", "Class 8-B",
];

const MONTHLY_FEES = [1500, 1800, 2000, 2200, 2500, 2800, 3000];

const STAFF_PROFILES = [
  { title: "Senior Subject Teacher", rolePrefix: "Teacher", salary: 32000, name: "Muhammad Tariq" },
  { title: "Junior Primary Teacher", rolePrefix: "Teacher", salary: 28000, name: "Saima Bibi" },
  { title: "Accounts Clerk", rolePrefix: "Clerk", salary: 25000, name: "Asim Riaz" },
  { title: "Campus Security Guard", rolePrefix: "Guard", salary: 21000, name: "Ghulam Abbas" },
  { title: "Office Attendant", rolePrefix: "Peon", salary: 18000, name: "Muhammad Boota" },
];

export async function runSeeder() {
  console.log("==================================================");
  console.log("[SEEDER] Starting Mock Data Seeding for 5 Schools");
  console.log("==================================================");

  let totalSchools = 0;
  let totalStudents = 0;
  let totalFeeRecords = 0;
  let totalStaff = 0;
  let totalSalaryRecords = 0;
  let totalAccounting = 0;

  for (const schoolDef of SCHOOLS_DATA) {
    console.log(`\n[SEEDER] Processing School: "${schoolDef.name}" (${schoolDef.city})`);

    let schoolId: number;
    const { data: existingSchool, error: schoolFetchErr } = await supabase
      .from("schools")
      .select("id, name")
      .eq("name", schoolDef.name)
      .maybeSingle();

    if (schoolFetchErr) {
      console.error(`[SEEDER] Error finding school "${schoolDef.name}":`, schoolFetchErr.message);
    }

    if (existingSchool?.id) {
      schoolId = existingSchool.id;
      console.log(`[SEEDER] School already exists (ID: ${schoolId}). Checking student records...`);

      const { count } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("school_id", schoolId);

      if (count && count >= 35) {
        console.log(`[SEEDER] School "${schoolDef.name}" already has ${count} students. Skipping re-seed.`);
        totalSchools++;
        totalStudents += count;
        continue;
      }
    } else {
      const { data: newSchool, error: createErr } = await supabase
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

      if (createErr || !newSchool) {
        console.error(`[SEEDER] Error creating school "${schoolDef.name}":`, createErr?.message);
        continue;
      }
      schoolId = newSchool.id;
      console.log(`[SEEDER] Created school "${schoolDef.name}" with ID: ${schoolId}`);
    }

    totalSchools++;

    // 35 Students (18 Male, 17 Female)
    const studentBatch: any[] = [];
    let studentIndex = 0;

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

    const { data: insertedStudents, error: studentsErr } = await supabase
      .from("students")
      .insert(studentBatch)
      .select();

    if (studentsErr || !insertedStudents) {
      console.error(`[SEEDER] Error inserting students:`, studentsErr?.message);
      continue;
    }

    totalStudents += insertedStudents.length;
    console.log(`[SEEDER] Inserted ${insertedStudents.length} students for "${schoolDef.name}"`);

    // Fee Records: Jan 2026 Paid, Feb 2026 70% Paid / 30% Unpaid
    const feeBatch: any[] = [];
    insertedStudents.forEach((student: any, idx: number) => {
      feeBatch.push({
        school_id: schoolId,
        student_id: student.id,
        month: "2026-01",
        amount: student.monthly_fee,
        status: "paid",
      });

      const isPaid = idx % 10 < 7;
      feeBatch.push({
        school_id: schoolId,
        student_id: student.id,
        month: "2026-02",
        amount: student.monthly_fee,
        status: isPaid ? "paid" : "unpaid",
      });
    });

    const { error: feeErr } = await supabase.from("fee_records").insert(feeBatch);
    if (feeErr) {
      console.error(`[SEEDER] Fee insert error:`, feeErr.message);
    } else {
      totalFeeRecords += feeBatch.length;
      console.log(`[SEEDER] Inserted ${feeBatch.length} fee records.`);
    }

    // Staff (5 per school)
    const staffBatch = STAFF_PROFILES.map((staff, sIdx) => ({
      school_id: schoolId,
      name: `${staff.name} (${staff.rolePrefix})`,
      phone: `9230${sIdx + 1}${Math.floor(100000 + Math.random() * 900000)}`,
      monthly_salary: staff.salary,
    }));

    const { data: insertedStaff, error: staffErr } = await supabase
      .from("teachers")
      .insert(staffBatch)
      .select();

    if (staffErr || !insertedStaff) {
      console.error(`[SEEDER] Staff insert error:`, staffErr?.message);
    } else {
      totalStaff += insertedStaff.length;
      console.log(`[SEEDER] Inserted ${insertedStaff.length} staff members.`);

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

      const { error: salErr } = await supabase.from("salary_records").insert(salaryBatch);
      if (salErr) {
        console.error(`[SEEDER] Salary insert error:`, salErr.message);
      } else {
        totalSalaryRecords += salaryBatch.length;
        console.log(`[SEEDER] Inserted ${salaryBatch.length} salary records.`);
      }
    }

    // Expenses (6-8) & Other Income (2)
    const accountingBatch = [
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

    const { error: expErr } = await supabase.from("expenses").insert(accountingBatch);
    if (expErr) {
      console.error(`[SEEDER] Expenses insert error:`, expErr.message);
    } else {
      totalAccounting += accountingBatch.length;
      console.log(`[SEEDER] Inserted ${accountingBatch.length} accounting entries.`);
    }
  }

  console.log("\n==================================================");
  console.log(`[SEEDER] SUMMARY:`);
  console.log(`- Schools: ${totalSchools}`);
  console.log(`- Students: ${totalStudents}`);
  console.log(`- Fee Records: ${totalFeeRecords}`);
  console.log(`- Staff: ${totalStaff}`);
  console.log(`- Salary Records: ${totalSalaryRecords}`);
  console.log(`- Accounting/Expenses: ${totalAccounting}`);
  console.log("==================================================");

  return {
    success: true,
    schools: totalSchools,
    students: totalStudents,
    feeRecords: totalFeeRecords,
    staff: totalStaff,
    salaryRecords: totalSalaryRecords,
    accountingEntries: totalAccounting,
    message: "Mock data inserted",
  };
}

// Execute directly if run with tsx or node
runSeeder()
  .then((res) => {
    console.log("Seeding finished successfully:", JSON.stringify(res, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });
