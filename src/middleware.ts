import { NextRequest, NextResponse } from "next/server";
import { isAuthenticatedFromCookie } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the login page and auth API without authentication
  if (pathname === "/admin/login" || pathname.startsWith("/api/admin/auth")) {
    return NextResponse.next();
  }

  // Protect all /admin and /api/admin routes
  const cookieHeader = request.headers.get("cookie");
  const auth = await isAuthenticatedFromCookie(cookieHeader);

  if (!auth.authenticated) {
    // For API routes, return 401 instead of redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only routes: /api/admin/users requires admin role
  if (pathname.startsWith("/api/admin/users")) {
    if (auth.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
