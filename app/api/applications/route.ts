import { NextResponse } from "next/server";
import { db, applications, eq, desc, getAuth } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const paramSchoolId = searchParams.get("school_id");
    const session = await getAuth();
    const schoolId = paramSchoolId || session.user.school_id;

    if (!schoolId) {
      return NextResponse.json([], {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const apps = await db.query.applications.findMany({
      where: eq(applications.school_id, schoolId),
      orderBy: desc(applications.created_at),
    });
    return NextResponse.json(apps, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (err: any) {
    console.error("API /api/applications error:", err);
    return NextResponse.json([], {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
