import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LeafDoctor - AI Plant Disease Detection",
  description: "Instant disease diagnosis for 38 different plant types using AI precision",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="w-full border-b border-green-900 bg-green-950/80 backdrop-blur-sm sticky top-0 z-50">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <Image
                  src="/logo.png"
                  alt="LeafDoctor Logo"
                  width={48}
                  height={48}
                  className="rounded-full object-cover border-2 border-green-600"
                  style={{ width: "48px", height: "48px" }}
                />
                <span className="text-xl font-bold text-green-400">LeafDoctor</span>
              </Link>
              <div className="flex items-center gap-6">
                <Link
                  href="/"
                  className="text-gray-300 hover:text-green-400 transition-colors"
                >
                  Home
                </Link>
                <Link
                  href="/dashboard"
                  className="text-gray-300 hover:text-green-400 transition-colors"
                >
                  Diagnosis
                </Link>
              </div>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
