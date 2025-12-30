import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// Import the new Client Component we just created

import GlobalNavbar from "./globalnavbar";  
import ChatWidget from "./chat-widget";

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
        {/* The Navbar handles its own visibility logic now */}
        <GlobalNavbar />
        
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}