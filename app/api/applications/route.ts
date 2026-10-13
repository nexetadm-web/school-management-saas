import { NextResponse } from "next/server";
import { db, applicationsTable, schools, eq, desc, getAuth } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req?: Request) {
  try {
    const session = await getAuth(req);
    const currentSchool = await db.query.schools.findFirst({
      where: eq(schools.id, session.user.school_id),
    });
    const apps = await db
      .select()
      .from(applicationsTable)
      .where(eq(applicationsTable.school_id, currentSchool.id))
      .orderBy(desc(applicationsTable.created_at));

    return NextResponse.json(apps, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (err: any) {
    console.error("API /api/applications error:", err);
    return NextResponse.json([], {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
