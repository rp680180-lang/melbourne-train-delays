import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import MobileNav from "./components/MobileNav";

export const metadata: Metadata = {
  title: "Track Record — Melbourne Metro Punctuality Dashboard",
  description:
    "A dashboard of 26 years of Melbourne metro train punctuality, line by line, with socioeconomic indicators from the ABS SEIFA index.",
  openGraph: {
    title: "Track Record — Melbourne Metro Punctuality Dashboard",
    description:
      "26 years of Melbourne metro train punctuality, line by line, paired with the ABS SEIFA (IRSAD) index.",
    type: "website",
  },
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/lines", label: "Lines" },
  { href: "/correlation", label: "Analysis" },
  { href: "/methodology", label: "Methodology" },
];

function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: '#0c0c0e', borderBottom: '1px solid var(--border)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'var(--accent-gold)' }} />
          <span className="text-sm font-medium tracking-wider uppercase" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', letterSpacing: '0.15em' }}>
            Track Record
          </span>
        </Link>
        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm transition-colors duration-200 hover:opacity-100"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
            >
              {link.label}
            </Link>
          ))}
        </div>
        {/* Mobile nav */}
        <MobileNav />
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="mt-auto" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Data sources: PTV, ABS SEIFA 2021, GTFS
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Analysis period: FY 2022-23
            </p>
          </div>
          <div className="text-right">
            <a
              href="https://github.com/Rift-Engineering/Track-Record"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm transition-colors hover:underline"
              style={{ color: 'var(--accent-gold)' }}
            >
              View on GitHub
            </a>
          </div>
        </div>
        <div
          className="mt-10 pt-6 flex justify-center"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <a
            href="https://riftengineering.com.au"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs transition-opacity"
            style={{ color: 'var(--text-muted)', opacity: 0.7 }}
            aria-label="Built by Rift Engineering"
          >
            <span>Built by</span>
            <img
              src="/rift-mark.svg"
              alt="Rift Engineering"
              width={32}
              height={23}
              style={{ display: 'block' }}
            />
            <span style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Rift Engineering
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300;1,9..40,400&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
