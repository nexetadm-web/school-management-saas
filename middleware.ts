import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 100% PUBLIC ROUTES - NO AUTH CHECK REQUIRED
  if (
    pathname.startsWith("/apply") ||
    pathname.startsWith("/api/admissions/public") ||
    pathname.startsWith("/admission") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/apply/:path*",
    "/api/admissions/public/:path*",
    "/admission/:path*",
  ],
};
