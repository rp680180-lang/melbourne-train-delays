"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/lines", label: "Lines" },
  { href: "/correlation", label: "Analysis" },
  { href: "/methodology", label: "Methodology" },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex flex-col justify-center items-center w-8 h-8 gap-1.5 relative"
        aria-label="Toggle menu"
        style={{ zIndex: 60 }}
      >
        <span
          className="block w-5 h-px transition-all duration-200"
          style={{
            background: "var(--text-secondary)",
            transform: open ? "rotate(45deg) translate(2px, 2px)" : "none",
          }}
        />
        <span
          className="block w-5 h-px transition-all duration-200"
          style={{
            background: "var(--text-secondary)",
            opacity: open ? 0 : 1,
          }}
        />
        <span
          className="block w-5 h-px transition-all duration-200"
          style={{
            background: "var(--text-secondary)",
            transform: open ? "rotate(-45deg) translate(2px, -2px)" : "none",
          }}
        />
      </button>

      {/* Full-screen overlay menu */}
      <div
        className="fixed left-0 right-0 bottom-0 transition-transform duration-200"
        style={{
          background: "#0c0c0e",
          top: 0,
          zIndex: 55,
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        <div className="flex flex-col items-center pt-20 gap-2">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-2xl py-4 px-8 transition-colors w-full text-center"
                style={{
                  color: active
                    ? "var(--accent-gold)"
                    : "var(--text-secondary)",
                  fontFamily: "var(--font-display)",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
