import "./globals.css";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
  title: "ReRoute Control",
  description: "Real-time airspace risk and rerouting console"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="page-wrapper">
        <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
          <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-xl bg-sky-600 flex items-center justify-center text-xs font-bold">
                RR
              </span>
              <span className="font-semibold tracking-tight">
                ReRoute Control
              </span>
            </Link>
            <nav className="flex items-center gap-3 text-sm text-slate-300">
              <Link href="/upload" className="hover:text-white">
                Upload Data
              </Link>
              <Link href="/flights" className="hover:text-white">
                Flights
              </Link>
              <Link href="/approvals" className="hover:text-white">
                Approvals
              </Link>
            </nav>
          </div>
        </header>
        <main className="page-inner">{children}</main>
      </body>
    </html>
  );
}
