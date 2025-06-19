import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = ["/dashboard", "/admin"];
const authRoutes = ["/auth/login", "/auth/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get user ID from cookie
  const userId = request.cookies.get("userId")?.value;
  const isAuthenticated = !!userId;

  // Redirect unauthenticated users to login
  if (
    !isAuthenticated &&
    protectedRoutes.some((route) => pathname.startsWith(route))
  ) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Check role-based permissions for protected routes
  if (
    isAuthenticated &&
    protectedRoutes.some((route) => pathname.startsWith(route))
  ) {
    try {
      // Get user metadata via API route
      const userMetadataResponse = await fetch(
        new URL(`/api/user-metadata/${userId}`, request.url)
      );

      if (!userMetadataResponse.ok) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }

      const userMetadataData = await userMetadataResponse.json();

      if (!userMetadataData.data?.length) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }

      // Get the first role (assuming single role per user for now)
      const roleId = userMetadataData.data[0].role_id;
      const roleResponse = await fetch(
        new URL(`/api/roles/${roleId}`, request.url)
      );

      if (!roleResponse.ok) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }

      const roleData = await roleResponse.json();

      if (!roleData.data) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }

      const permissions = roleData.data.permissions;

      // Check specific route permissions
      if (
        pathname.startsWith("/dashboard/admin") &&
        !permissions.includes("admin")
      ) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }

      if (pathname.startsWith("/dashboard") && !permissions.includes("read")) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }

      if (
        pathname.startsWith("/dashboard/upload") &&
        !permissions.includes("write")
      ) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    } catch (error) {
      console.error("Error checking permissions:", error);
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
