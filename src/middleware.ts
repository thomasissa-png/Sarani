import { NextRequest, NextResponse } from "next/server";
import { isAuthenticatedFromCookie } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes (except the login page and auth API)
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Allow the login page and auth API routes
  if (pathname === "/admin/login" || pathname.startsWith("/api/admin/auth")) {
    return NextResponse.next();
  }

  const cookieHeader = request.headers.get("cookie");
  const authenticated = isAuthenticatedFromCookie(cookieHeader);

  if (!authenticated) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
