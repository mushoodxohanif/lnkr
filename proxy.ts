import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const apiKey = process.env.API_KEY;

  if (apiKey && request.nextUrl.pathname.startsWith("/api/")) {
    const provided = request.headers.get("x-api-key");
    if (provided !== apiKey) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
