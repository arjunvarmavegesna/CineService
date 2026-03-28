import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Admin routes require a Clerk session — unauthenticated users get redirected to sign-in
  if (isAdminRoute(req)) {
    await auth.protect();
  }
  // Email allowlist enforcement happens in src/lib/auth.ts → requireApprovedAdmin()
  // which is called by every admin API route handler.
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
