import { LayoutDashboard, Home, FileText, Inbox } from 'lucide-react';
import Link from 'next/link';

export default function EspaceVendeurLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      {/* The Royal Blue Sidebar */}
      <aside className="w-64 bg-[#1E3A8A] text-white flex flex-col fixed h-full shadow-2xl z-20">
        <div className="px-5 py-4 border-b border-blue-800/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Jumo-Immo" className="h-9 w-auto" style={{ mixBlendMode: "screen" }} />
          <p className="text-blue-200 text-[10px] mt-2 uppercase tracking-widest font-bold">Espace Vendeur</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/espace-vendeur" className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-xl font-medium transition shadow-inner">
            <LayoutDashboard className="w-5 h-5" /> Tableau de bord
          </Link>
          <Link href="#" className="flex items-center gap-3 px-4 py-3 text-blue-200 rounded-xl font-medium transition hover:bg-white/5 hover:text-white">
            <Home className="w-5 h-5" /> Mon Annonce
          </Link>
          <Link href="#" className="flex items-center gap-3 px-4 py-3 text-blue-200 rounded-xl font-medium transition hover:bg-white/5 hover:text-white">
            <FileText className="w-5 h-5" /> Dossier Juridique
          </Link>
          <Link href="#" className="flex items-center gap-3 px-4 py-3 text-blue-200 rounded-xl font-medium transition hover:bg-white/5 hover:text-white">
            <Inbox className="w-5 h-5" /> Offres reçues
          </Link>
        </nav>
      </aside>

      {/* Main Content Area (Pushed right to make room for sidebar) */}
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}