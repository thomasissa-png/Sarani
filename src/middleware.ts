import { NextRequest, NextResponse } from "next/server";
import { isAuthenticatedFromCookie } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the login page and auth API
  if (pathname === "/admin/login" || pathname.startsWith("/api/admin/auth")) {
    return NextResponse.next();
  }

  // Protect all /admin and /api/admin routes
  const cookieHeader = request.headers.get("cookie");
  const authenticated = await isAuthenticatedFromCookie(cookieHeader);

  if (!authenticated) {
    // For API routes, return 401 instead of redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
