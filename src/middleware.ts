import { NextRequest, NextResponse } from "next/server";
import { isAuthenticatedFromCookie } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the login page and auth API without authentication
  if (pathname === "/admin/login" || pathname.startsWith("/api/admin/auth")) {
    return NextResponse.next();
  }

  // Allow cron routes (authenticated by x-cron-secret in route handler, not cookie)
  if (pathname.startsWith("/api/admin/cron")) {
    return NextResponse.next();
  }

  // Allow webhook routes (authenticated by clientState secret in route handler)
  if (pathname.startsWith("/api/webhooks")) {
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

  // Admin-only: all write operations on protected API routes require admin role
  const isWriteMethod = request.method !== "GET" && request.method !== "HEAD";
  const adminOnlyPaths = [
    "/api/admin/users",
    "/api/admin/case-studies",
    "/api/admin/landing-pages",
    "/api/admin/storyboards",
    "/api/admin/project-previews",
    "/api/admin/video-preview",
    "/api/admin/emails",
    "/api/admin/inbox",
    "/api/admin/arya",
    "/api/admin/brief-check",
    "/api/admin/assets",
    "/api/admin/graph-subscriptions",
    "/api/admin/teams",
  ];
  if (isWriteMethod && adminOnlyPaths.some((p) => pathname.startsWith(p))) {
    if (auth.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
