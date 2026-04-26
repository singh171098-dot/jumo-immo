import {
  LayoutDashboard, Calendar, FileText, Clock, ShieldCheck, Home,
} from "lucide-react";
import Link from "next/link";

const NAV = [
  { href: "/espace-acheteur",            icon: LayoutDashboard, label: "Tableau de bord", active: true  },
  { href: "#",                           icon: Home,            label: "Mon bien cible",  active: false },
  { href: "#",                           icon: FileText,        label: "Mes offres",      active: false },
  { href: "#",                           icon: Calendar,        label: "Mes visites",     active: false },
  { href: "#",                           icon: Clock,           label: "Délai SRU",       active: false },
  { href: "#",                           icon: ShieldCheck,     label: "Documents",       active: false },
];

export default function EspaceAcheteurLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-gray-950 font-sans">

      {/* ── Sidebar ── */}
      <aside className="w-64 bg-gray-900/80 backdrop-blur-xl border-r border-white/[0.08] flex flex-col fixed h-full z-20 shadow-2xl">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/[0.06]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Jumo-Immo"
            className="h-9 w-auto"
            style={{ mixBlendMode: "screen" }}
          />
          <p className="text-[10px] text-emerald-400/80 mt-2.5 uppercase tracking-widest font-bold">
            Espace Acheteur
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map(({ href, icon: Icon, label, active }) => (
            <Link
              key={label}
              href={href}
              className={[
                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all",
                active
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm"
                  : "text-gray-500 hover:text-white hover:bg-white/[0.05] border border-transparent",
              ].join(" ")}
            >
              <Icon size={17} className={active ? "text-emerald-400" : "text-gray-600"} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Legal footer card */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3">
            <p className="text-[10px] text-emerald-400/70 font-bold uppercase tracking-widest">
              Protection légale
            </p>
            <p className="text-xs text-gray-400 font-medium mt-1 leading-snug">
              Droits garantis par la loi SRU et la loi ALUR
            </p>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 ml-64 min-h-screen">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
