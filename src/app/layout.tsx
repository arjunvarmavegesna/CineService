import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "CineServe — Order food at your seat",
  description: "In-seat food ordering for cinemas. Scan your seat QR and get food delivered right to you.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "CineServe — Order food at your seat",
    description: "In-seat food ordering for cinemas",
    type: "website",
  },
  robots: {
    index: false,  // Private app — keep off search engines
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}