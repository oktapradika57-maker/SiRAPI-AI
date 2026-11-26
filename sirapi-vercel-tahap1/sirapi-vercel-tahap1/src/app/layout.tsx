import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "SiRAPI KUT — Portal Request Dana & PJB",
  description: "SiRAPI NOP PLK & PBU Enterprise Web App (Vercel Edition) — PT Kinarya Utama Teknik",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#007BFF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 pt-4 pb-16">
          {children}
        </main>
        <footer className="text-center text-xs text-slate-500 font-semibold py-6 border-t border-slate-200 bg-white">
          Created by Okta Pradika • KUT SYSTEM — SiRAPI Vercel Edition (Google Sheets Sync)
        </footer>
      </body>
    </html>
  );
}
