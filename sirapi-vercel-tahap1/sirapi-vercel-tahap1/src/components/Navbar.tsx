"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FilePlus2, CheckCircle2, ExternalLink } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const navItems = [
    { href: "/", label: "Beranda", icon: Home },
    { href: "/request", label: "Request Dana", icon: FilePlus2 },
    { href: "/pjb", label: "Form PJB", icon: CheckCircle2 },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-sm flex items-center justify-center shadow">
            KUT
          </div>
          <div className="leading-tight">
            <div className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">SiRAPI KUT</div>
            <div className="text-[10px] sm:text-xs font-semibold text-slate-500">Fast Vercel Edition</div>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map((it) => {
            const Icon = it.icon;
            const active = pathname === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden xs:inline sm:inline">{it.label}</span>
              </Link>
            );
          })}
          <a
            href="https://sidata.streamlit.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition"
            title="Buka Portal SiDATA"
          >
            <span>SiDATA</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </nav>
      </div>
    </header>
  );
}
