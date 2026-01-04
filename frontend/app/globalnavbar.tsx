"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf, User } from "lucide-react";

export default function GlobalNavbar() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check token on mount
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      setIsLoggedIn(!!token);
    };
    checkAuth();

    // Listen for storage events (login/logout from other tabs/components)
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, []);

  return (
    <header className="w-full border-b border-green-100 bg-green-50/90 backdrop-blur-sm sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Leaf className="w-10 h-10 text-green-600" />
            <span className="text-2xl font-bold text-slate-900">LeafDoctor</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className={`font-medium transition-colors ${pathname === "/" ? "text-green-600" : "text-slate-600 hover:text-green-600"}`}
            >
              Home
            </Link>
            <Link
              href="/diagnosis"
              className={`font-medium transition-colors ${pathname === "/diagnosis" ? "text-green-600" : "text-slate-600 hover:text-green-600"}`}
            >
              Diagnosis
            </Link>
            {isLoggedIn ? (
              <Link
                href="/my-garden"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors font-bold text-sm shadow-sm"
              >
                <User className="w-4 h-4" />
                My Garden
              </Link>
            ) : (
              <Link
                href="/login"
                className="font-medium text-slate-600 hover:text-green-600 transition-colors"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}