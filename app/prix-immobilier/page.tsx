import type { Metadata } from "next";
import Link from "next/link";
import MarketExplorer from "@/components/MarketExplorer";

export const metadata: Metadata = {
  title: "Prix de l'immobilier en France — Jumo-Immo",
  description:
    "Consultez les prix au m² partout en France : appartements, maisons, loyers. " +
    "Données estimées à partir des transactions notariales (DVF) et tendances de marché.",
};

export default function PrixImmobilierPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">

      {/* ── Top nav ── */}
      <nav className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-white/10 px-5 py-4 flex items-center gap-3">
        <Link
          href="/"
          className="text-white/60 hover:text-white text-sm font-medium transition-colors flex items-center gap-1.5"
        >
          ← Retour
        </Link>
        <span className="text-white/20 select-none">/</span>
        <span className="text-white/80 text-sm font-medium">Prix au m²</span>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
        <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-4">
          Données DVF · Jumo-Immo
        </p>
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-5">
          Les prix de l'immobilier
          <br className="hidden sm:block" />
          <span className="text-blue-400"> partout en France</span>
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed max-w-xl mx-auto">
          Données estimées à partir des transactions notariales (DVF) et tendances de
          marché. Entrez une ville pour obtenir une analyse instantanée.
        </p>
      </section>

      {/* ── Market explorer ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-28">
        <MarketExplorer />
      </section>

    </main>
  );
}
