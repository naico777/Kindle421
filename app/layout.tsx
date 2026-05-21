import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kindle421 — La Revista 421 en tu Kindle",
  description: "Recibí cada número de la Revista 421 como un libro nuevo en tu Kindle. Sin app, sin login, gratis.",
  icons: {
    icon: "/kindle421/logo-421.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
            <span className="brand-mark">421</span>
            Kindle421
          </Link>
          <nav>
            <Link href="/docs">Docs</Link>
            <Link href="/#suscribirme">Suscribirme</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
