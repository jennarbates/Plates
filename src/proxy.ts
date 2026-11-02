import { NextResponse, type NextRequest } from "next/server";

// Basic password check for the owner's pages. With no ADMIN_PASSWORD set, they don't exist.
export function proxy(request: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return new NextResponse("Not found", { status: 404 });

  const [scheme, encoded] = (request.headers.get("authorization") ?? "").split(" ");
  const supplied = scheme === "Basic" && encoded ? atob(encoded).split(":").slice(1).join(":") : "";
  let difference = supplied.length ^ password.length;
  for (let i = 0; i < password.length; i += 1) {
    difference |= password.charCodeAt(i) ^ supplied.charCodeAt(i);
  }
  if (difference === 0) return NextResponse.next();

  return new NextResponse("Password required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Bookings"' },
  });
}

export const config = { matcher: "/admin/:path*" };
