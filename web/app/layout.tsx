import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Melbourne Train Delays vs Suburb Wealth",
  description:
    "An interactive data analysis exploring whether wealthier Melbourne suburbs get better train service.",
  openGraph: {
    title: "Melbourne Train Delays vs Suburb Wealth",
    description:
      "Do wealthier Melbourne suburbs get better train service? We analysed 16 metro lines to find out.",
    type: "website",
  },
};

function Nav() {
  const links = [
    { href: "/", label: "Home" },
    { href: "/lines", label: "By Line" },
    { href: "/correlation", label: "Correlation" },
    { href: "/methodology", label: "Methodology" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md" style={{ background: 'rgba(12,12,14,0.85)', borderBottom: '1px solid var(--border)' }}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'var(--accent-gold)' }} />
          <span className="text-sm font-medium tracking-wider uppercase" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', letterSpacing: '0.15em' }}>
            Track Record
          </span>
        </Link>
        <div className="flex items-center gap-8">
          {links.map((link) => (
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
              href="https://github.com/rp680180-lang/melbourne-train-delays"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm transition-colors hover:underline"
              style={{ color: 'var(--accent-gold)' }}
            >
              View on GitHub
            </a>
          </div>
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
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
