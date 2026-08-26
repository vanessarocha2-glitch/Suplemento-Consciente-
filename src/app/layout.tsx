import type { Metadata } from "next";
import { Caprasimo, Figtree } from "next/font/google";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const caprasimo = Caprasimo({
  variable: "--font-caprasimo",
  weight: "400",
  subsets: ["latin"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  weight: ["400", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Suplemento Consciente",
  description:
    "Consulte ingredientes, situação na Anvisa e alertas de uso de suplementos alimentares.",
};

const navLinks = [
  { href: "/", label: "Consultar" },
  { href: "/videos", label: "Vídeos" },
  { href: "/quiz", label: "Quiz" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${caprasimo.variable} ${figtree.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="flex items-center gap-7 px-6 py-5 sm:px-12">
          <Link
            href="/"
            className="mr-auto flex items-center gap-2.5 font-heading text-lg"
          >
            <span className="block size-[22px] rounded-full bg-accent-2" />
            Suplemento Consciente
          </Link>
          <nav className="flex items-center gap-7 text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-foreground/80 transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-16 flex flex-col gap-8 bg-card px-6 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-12">
          <div className="flex max-w-[420px] flex-col gap-1.5">
            <span className="font-heading text-lg">Suplemento Consciente</span>
            <p className="text-xs text-muted-foreground">
              Informação de caráter educativo, construída a partir de bases
              públicas. Não substitui orientação de profissional de saúde.
            </p>
          </div>
          <div className="flex gap-12 text-sm">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                Consultar
              </span>
              <Link href="/" className="text-foreground hover:text-primary">
                Suplementos
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                Aprender
              </span>
              <Link href="/videos" className="text-foreground hover:text-primary">
                Vídeos
              </Link>
              <Link href="/quiz" className="text-foreground hover:text-primary">
                Quiz
              </Link>
            </div>
          </div>
        </footer>

        <Toaster />
      </body>
    </html>
  );
}
