import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { db, applicationsTable } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const trackingNo = body.tracking_no || `ADM-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const applicationData = {
      ...body,
      tracking_no: trackingNo,
      status: body.status || "pending",
      created_at: body.created_at || new Date().toISOString(),
    };

    // Insert into DB
    await db.insert(applicationsTable).values(applicationData);

    // Revalidate paths to clear Next.js route caches immediately
    try {
      revalidatePath("/dashboard/admissions/online", "page");
      revalidatePath("/dashboard/admissions", "page");
      revalidatePath("/dashboard/online-admissions", "page");
      revalidatePath("/admissions/online", "page");
      revalidatePath("/admissions", "page");
      revalidatePath("/dashboard", "page");
    } catch (e) {
      console.warn("revalidatePath warning:", e);
    }

    // Return with no-cache headers as requested
    return new Response(
      JSON.stringify({
        success: true,
        tracking_no: trackingNo,
        message: "درخواست جمع ہو گئی - سکول آپ سے رابطہ کرے گا",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (err: any) {
    console.error("API /api/apply error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to submit application" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
        },
      }
    );
  }
}
