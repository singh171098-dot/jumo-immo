import Link from "next/link";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      {/* Minimal top bar */}
      <header className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Jumo-Immo" className="h-8 w-auto" style={{ mixBlendMode: "screen" }} />
        </Link>
        <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">
          Configuration du profil
        </p>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        {children}
      </main>
    </div>
  );
}
