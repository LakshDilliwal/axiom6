"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./WalletButton";

export function Navbar() {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/register", label: "Deploy Agent" },
    { href: "/my-agent", label: "My Agent" },
    { href: "/docs", label: "Docs" },
    { href: "/faq", label: "FAQ" },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <span className="font-bold text-white tracking-tight text-base font-mono">
              AXIOM<span className="text-[#01696f]">6</span>
            </span>
          </Link>

          {/* DESKTOP nav links — hidden on mobile */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href}
                className={`px-3 py-1.5 rounded text-sm font-sans transition-colors ${
                  path === href
                    ? "bg-[#01696f]/10 text-[#01696f] border border-[#01696f]/30"
                    : "text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
                }`}>
                {label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#1f1f1f] bg-[#111] text-[10px] font-mono text-[#01696f] tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-[#01696f] animate-pulse"/>
              DEVNET
            </span>
            <WalletButton />
            {/* Hamburger — only on mobile */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded hover:bg-[#1a1a1a] transition-colors"
              aria-label="Toggle menu"
            >
              <span className={`block w-5 h-0.5 bg-gray-400 transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block w-5 h-0.5 bg-gray-400 transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-gray-400 transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>

        {/* MOBILE dropdown menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-[#1f1f1f] bg-[#0a0a0a]/95 backdrop-blur-md px-4 py-3 flex flex-col gap-1">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href}
                onClick={() => setMenuOpen(false)}
                className={`px-3 py-2.5 rounded text-sm font-sans transition-colors ${
                  path === href
                    ? "bg-[#01696f]/10 text-[#01696f] border border-[#01696f]/30"
                    : "text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
                }`}>
                {label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </>
  );
}
