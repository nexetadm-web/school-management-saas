import { NextRequest, NextResponse } from "next/server";
import { db, applicationsTable, eq, desc } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("school_id") || "all";

    const apps = await db
      .select()
      .from(applicationsTable)
      .where(eq(applicationsTable.school_id, schoolId))
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
    return NextResponse.json(
      { error: err.message || "Failed to fetch applications" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
        },
      }
    );
  }
}
