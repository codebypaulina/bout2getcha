import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req) {
  const { pathname, search } = req.nextUrl; // [ aktuelle URL ]: Pfad + query

  // [ public paths ]: whitelist, muss ohne Login erreichbar sein
  const isPublicPath =
    pathname === "/profile" || // Login-page
    pathname.startsWith("/api/auth") || // NextAuth-endpoints (für Login)
    pathname.startsWith("/_next") || // Next.js-assets (für JS/CSS chunks)
    pathname === "/favicon.ico" ||
    pathname.startsWith("/icons");

  if (isPublicPath) {
    return NextResponse.next(); // normal laden
  }

  // [ session prüfen ]
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET }); // token aus cookies
  const isAuthenticated = token ? true : false; // token true = eingeloggt

  // [1. nicht eingeloggt]: redirect auf ProfilePage + callbackUrl (für bookmarks)
  if (!isAuthenticated) {
    const url = req.nextUrl.clone(); // Kopie aktuelle URL
    url.pathname = "/profile"; // Ziel: Login-page

    // callbackUrl setzen (= original-URL: Pfad + query)
    // in ProfilePage lesen -> an LoginSection übergeben -> nach Login dahin redirecten
    url.searchParams.set("callbackUrl", `${pathname}${search}`);

    return NextResponse.redirect(url); // redirect
  }

  // [2. eingeloggt]: normal laden
  return NextResponse.next();
}

// middleware auf allen pages, außer: _next/static, _next/image, favicon
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
