import { LayoutDashboard, Home, FileText, Clock, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function EspaceAcheteurLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">

      {/* Sidebar */}
      <aside className="w-64 bg-[#1E3A8A] text-white flex flex-col fixed h-full shadow-2xl z-20">
        <div className="px-5 py-4 border-b border-blue-800/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Jumo-Immo"
            className="h-9 w-auto"
            style={{ mixBlendMode: "screen" }}
          />
          <p className="text-blue-200 text-[10px] mt-2 uppercase tracking-widest font-bold">
            Espace Acheteur
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/espace-acheteur"
            className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-xl font-medium transition shadow-inner"
          >
            <LayoutDashboard className="w-5 h-5" /> Tableau de bord
          </Link>
          <Link
            href="#"
            className="flex items-center gap-3 px-4 py-3 text-blue-200 rounded-xl font-medium transition hover:bg-white/5 hover:text-white"
          >
            <Home className="w-5 h-5" /> Mon bien cible
          </Link>
          <Link
            href="#"
            className="flex items-center gap-3 px-4 py-3 text-blue-200 rounded-xl font-medium transition hover:bg-white/5 hover:text-white"
          >
            <FileText className="w-5 h-5" /> Mon offre d'achat
          </Link>
          <Link
            href="#"
            className="flex items-center gap-3 px-4 py-3 text-blue-200 rounded-xl font-medium transition hover:bg-white/5 hover:text-white"
          >
            <Clock className="w-5 h-5" /> Délai SRU
          </Link>
          <Link
            href="#"
            className="flex items-center gap-3 px-4 py-3 text-blue-200 rounded-xl font-medium transition hover:bg-white/5 hover:text-white"
          >
            <ShieldCheck className="w-5 h-5" /> Documents
          </Link>
        </nav>

        <div className="p-4 border-t border-blue-800/50">
          <div className="bg-white/10 rounded-xl px-4 py-3">
            <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest">Protection légale</p>
            <p className="text-xs text-white font-medium mt-1 leading-snug">
              Droits garantis par la loi SRU et la loi ALUR
            </p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}
