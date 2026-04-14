import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Vercel provides x-vercel-ip-country on all plans for free.
  // In local dev this header is absent — fall back to a query param or "US".
  let country: string;
  if (process.env.NODE_ENV === "development") {
    country = request.nextUrl.searchParams.get("country") ?? "US";
  } else {
    country = request.headers.get("x-vercel-ip-country") ?? "US";
  }

  response.cookies.set("user-country", country, {
    httpOnly: false,
    secure: true,
    sameSite: "lax",
    maxAge: 86400, // 24 hours
  });

  return response;
}

export const config = {
  matcher: ["/pricing", "/upgrade", "/api/checkout/:path*", "/api/pricing/:path*"],
};
