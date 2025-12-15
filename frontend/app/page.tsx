import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-900 via-green-950 to-black text-white">
      {/* Hero Section */}
      <header className="flex-1 flex flex-col items-center justify-center px-5 py-16 relative z-10">
        <div className="w-full max-w-2xl text-center flex flex-col items-center">
          <div className="mb-8">
            <Image
              src="/logo.png"
              alt="LeafDoctor Logo"
              width={120}
              height={120}
              className="rounded-full object-cover border-4 border-green-500 shadow-2xl"
              style={{ width: "120px", height: "120px" }}
            />
          </div>  
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight drop-shadow-[0_10px_16px_rgba(16,128,64,0.18)]">
            Save Your Crops with <span className="text-green-400">AI Precision.</span>
          </h1>
          <p className="text-lg md:text-2xl text-gray-300 mb-10">
            Instant disease diagnosis for <span className="text-green-200 font-medium">38 different plant types</span>.
          </p>
          <Link
            href="/diagnosis"
            className="relative transition hover:scale-105 focus:scale-105 active:scale-95 inline-block px-10 py-4 rounded-2xl shadow-lg text-xl font-bold text-gray-900 bg-green-400 hover:bg-green-500 focus:bg-green-500
              before:absolute before:-inset-1 before:-z-10 before:rounded-[inherit]
              before:bg-gradient-to-br before:from-green-500 before:to-green-600
              before:blur-[6px] before:opacity-60 before:animate-pulse
              "
            style={{ boxShadow: "0 0 35px 6px rgba(34,197,94,0.32)" }}
          >
            Start Diagnosis
          </Link>
        </div>
      </header>

      {/* Features Section */}
      <section className="max-w-5xl mx-auto px-6 py-16 md:py-24 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-7">
        {/* Feature 1 */}
        <div className="bg-green-950/60 border border-green-900 rounded-2xl p-8 flex flex-col items-center shadow-md hover:shadow-lg transition-shadow">
          <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-green-800/70">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 28 28" className="h-7 w-7 text-green-300">
              <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                d="M8.5 16.5L13 21l9-9.5M19.5 21H8a2 2 0 01-2-2V9a2 2 0 012-2h8" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg mb-2 text-green-200">Instant Analysis</h3>
          <p className="text-gray-300 text-sm text-center">Upload a plant leaf and get results in seconds, right from your device.</p>
        </div>
        {/* Feature 2 */}
        <div className="bg-green-950/60 border border-green-900 rounded-2xl p-8 flex flex-col items-center shadow-md hover:shadow-lg transition-shadow">
          <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-green-800/70">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-300" fill="none" viewBox="0 0 28 28">
              <circle cx="14" cy="14" r="9" stroke="currentColor" strokeWidth="2" />
              <path stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                d="M10 15.5l3 3 5-6.5" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg mb-2 text-green-200">90+ Accuracy</h3>
          <p className="text-gray-300 text-sm text-center">Powered by advanced MobileNet AI, trusted in academic research.</p>
        </div>
        {/* Feature 3 */}
        <div className="bg-green-950/60 border border-green-900 rounded-2xl p-8 flex flex-col items-center shadow-md hover:shadow-lg transition-shadow">
          <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-green-800/70">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-300" fill="none" viewBox="0 0 28 28">
              <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 13v6a3 3 0 003 3h10a3 3 0 003-3v-6" />
              <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 10V8a3 3 0 013-3h14a3 3 0 013 3v2" />
              <rect width="20" height="6" x="4" y="10" rx="2" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg mb-2 text-green-200">Free to Use</h3>
          <p className="text-gray-300 text-sm text-center">Completely free for all farmers and gardeners—no registration required.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-green-900 py-4 px-5 text-xs text-gray-400 bg-green-950/80">
        <div className="flex flex-col md:flex-row items-center justify-between max-w-5xl mx-auto gap-3">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="LeafDoctor Logo"
              width={24}
              height={24}
              className="rounded-full object-cover"
              style={{ width: "24px", height: "24px" }}
            />
            <span>
              &copy; {new Date().getFullYear()} LeafDoctor. All rights reserved.
            </span>
          </div>
          <nav className="flex gap-6">
            <a
              href="https://github.com/spMohanty/PlantVillage-Dataset "
              className="hover:text-green-400 transition underline"
              target="_blank" rel="noopener noreferrer"
            >
              PlantVillage on GitHub
            </a>
            <a
              href="/diagnosis"
              className="hover:text-green-400 transition underline"
            >
              Diagnosis
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
