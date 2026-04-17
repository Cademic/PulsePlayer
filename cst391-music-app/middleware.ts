import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const loggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  if (pathname.startsWith("/admin")) {
    if (!loggedIn) {
      const signIn = new URL("/auth/signin", req.nextUrl.origin);
      signIn.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signIn);
    }
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/", req.nextUrl.origin));
    }
    return NextResponse.next();
  }

  if (pathname === "/playlists/create" || pathname === "/library/create") {
    if (!loggedIn) {
      const signIn = new URL("/auth/signin", req.nextUrl.origin);
      signIn.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signIn);
    }
    return NextResponse.next();
  }

  if (
    (pathname.startsWith("/playlists/") && pathname !== "/playlists/create") ||
    (pathname.startsWith("/library/") && pathname !== "/library/create")
  ) {
    if (!loggedIn) {
      const signIn = new URL("/auth/signin", req.nextUrl.origin);
      signIn.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signIn);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/playlists", "/playlists/:path*", "/library", "/library/:path*", "/admin/:path*"],
};
