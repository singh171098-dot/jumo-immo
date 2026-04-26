"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import Map3D, { type MapHandle } from "./Map3D";
import AuthModal from "./AuthModal";

/* ───────────── TYPES ───────────── */
interface AdresseFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    label: string;
    type: string;
    name?: string;
    city?: string;
    context?: string;
    postcode?: string;
  };
}

const ADDR_TYPE: Record<string, string> = {
  municipality: 'Commune',
  locality: 'Lieu-dit',
  street: 'Rue',
  housenumber: 'Adresse',
  poi: 'Lieu',
};

interface Region {
  name: string; x: number; y: number;
  price: number; change: number; listings: number; pop: string;
}
interface Listing {
  id: string; type: string; city: string; price: number; surface: number;
  rooms: number; dpe: string; priceHistory: number[]; daysOnMarket: number;
  fairScore: number; img: string; isBoosted: boolean;
}

// Shape received from the Server Component — only serializable primitives
export interface DbProperty {
  id: string;
  title: string;
  price: number;
  originalPrice: number | null;
  surface: number;
  rooms: number;
  dpe: string;
  city: string;
  fairScore: number;
  cityAvgPerSqm: number;
  isBoosted: boolean;
  createdAtMs: number;
  lat: number | null;
  lng: number | null;
}


/* ───────────── DATA ───────────── */
const REGIONS: Region[] = [
  { name: "Île-de-France", x: 340, y: 155, price: 6420, change: -2.1, listings: 45230, pop: "12.3M" },
  { name: "Provence-Alpes-Côte d'Azur", x: 400, y: 340, price: 4180, change: 1.8, listings: 18920, pop: "5.1M" },
  { name: "Auvergne-Rhône-Alpes", x: 370, y: 270, price: 3250, change: 0.4, listings: 22100, pop: "8.1M" },
  { name: "Nouvelle-Aquitaine", x: 240, y: 290, price: 2180, change: -0.7, listings: 19800, pop: "6.0M" },
  { name: "Occitanie", x: 310, y: 350, price: 2540, change: 1.2, listings: 16700, pop: "5.9M" },
  { name: "Bretagne", x: 160, y: 170, price: 2320, change: 2.5, listings: 12400, pop: "3.4M" },
  { name: "Pays de la Loire", x: 200, y: 215, price: 2480, change: -0.3, listings: 11200, pop: "3.8M" },
  { name: "Grand Est", x: 440, y: 145, price: 1890, change: -1.4, listings: 14500, pop: "5.6M" },
  { name: "Hauts-de-France", x: 360, y: 95, price: 1720, change: -2.8, listings: 13100, pop: "6.0M" },
  { name: "Normandie", x: 250, y: 135, price: 2050, change: 0.9, listings: 9800, pop: "3.3M" },
  { name: "Bourgogne-Franche-Comté", x: 400, y: 210, price: 1650, change: -1.1, listings: 8700, pop: "2.8M" },
  { name: "Centre-Val de Loire", x: 290, y: 215, price: 1780, change: -0.5, listings: 7900, pop: "2.6M" },
  { name: "Corse", x: 480, y: 380, price: 3450, change: 3.2, listings: 2100, pop: "0.3M" },
];


const NEWS_ITEMS = [
  { title: "Les taux d'intérêt baissent à 2.9% — impact sur le marché", source: "Banque de France", time: "Il y a 2h", tag: "Taux" },
  { title: "Nouvelle loi : DPE F et G interdits à la location dès 2025", source: "Ministère du Logement", time: "Il y a 5h", tag: "Loi" },
  { title: "Prix en baisse de 3.2% en Île-de-France au T1 2026", source: "Notaires de France", time: "Hier", tag: "Prix" },
  { title: "Le PTZ élargi à toutes les zones — ce qui change", source: "Les Echos", time: "Hier", tag: "Aide" },
];

/* ───────────── DB → LISTING MAPPER ───────────── */
function dbToListings(dbProperties: DbProperty[]): Listing[] {
  return dbProperties.map((p) => {
    const daysOnMarket = Math.floor((Date.now() - p.createdAtMs) / (1000 * 60 * 60 * 24));
    const priceHistory =
      p.originalPrice != null && p.originalPrice !== p.price
        ? [p.originalPrice, p.price]
        : [p.price];
    const typeMatch = p.title.match(/^(Appartement|Maison|Studio|Terrain|Villa|Loft)/i);
    const type = typeMatch ? typeMatch[1] : "Appartement";
    return {
      id: p.id,
      type,
      city: p.city,
      price: p.price,
      surface: p.surface,
      rooms: p.rooms,
      dpe: p.dpe,
      priceHistory,
      daysOnMarket,
      fairScore: p.fairScore,
      isBoosted: p.isBoosted,
      img: type === "Maison" ? "house" : type === "Terrain" ? "land" : "apt",
    };
  });
}

/* ───────────── ANIMATION HOOK ───────────── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible] as const;
}

/* ───────────── STYLE INJECTION ───────────── */
const STYLE_TAG = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');

:root {
  --c-bg: #060B14;
  --c-bg-elevated: #0C1322;
  --c-bg-card: #0F1729;
  --c-surface: rgba(255,255,255,0.03);
  --c-border: rgba(255,255,255,0.06);
  --c-border-hover: rgba(255,255,255,0.12);
  --c-text: #E8ECF4;
  --c-text-muted: #7A8599;
  --c-text-dim: #4A5568;
  --c-navy: #1E3A5F;
  --c-blue: #2563EB;
  --c-blue-glow: rgba(37,99,235,0.15);
  --c-gold: #C8A55C;
  --c-gold-dim: rgba(200,165,92,0.12);
  --c-green: #34D399;
  --c-red: #EF4444;
  --c-emerald: #059669;
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body: 'DM Sans', -apple-system, sans-serif;
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-gleasing: cubic-bezier(0.4, 0, 0, 1);
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(40px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 20px rgba(37,99,235,0.1); }
  50%       { box-shadow: 0 0 40px rgba(37,99,235,0.25); }
}
@keyframes dropdownIn {
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Mobile responsive overrides ────────────────────────────────────── */
@media (max-width: 767px) {
  /* NavBar */
  .jumo-nav          { padding: 12px 16px !important; }
  .jumo-nav-link     { padding: 6px 10px !important; font-size: 11px !important; }

  /* Landing hero — stack vertically on mobile */
  .hero-root         { align-items: flex-start !important; }
  .hero-overlay      {
    flex-direction: column !important;
    align-items: flex-start !important;
    justify-content: flex-start !important;
    padding: 32px 20px 72px !important;
    gap: 28px !important;
  }
  .hero-text-col     { max-width: 100% !important; }
  .hero-cards-col    {
    flex-direction: row !important;
    overflow-x: auto !important;
    gap: 10px !important;
    width: 100% !important;
    padding-bottom: 4px !important;
  }
  .hero-prop-card    { min-width: 220px !important; width: 220px !important; flex-shrink: 0 !important; }
  .hero-stats        { gap: 24px !important; }

  /* Landing below-fold sections */
  .features-section  { padding: 40px 16px !important; }
  .features-grid     { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
  .opps-section      { padding: 0 16px 40px !important; }
  .opps-grid         { grid-template-columns: 1fr !important; }

  /* Map view */
  .map-view-outer    { overflow: auto !important; }
  .map-view-grid     {
    grid-template-columns: 1fr !important;
    grid-template-rows: 55vh auto !important;
    height: auto !important;
    overflow-y: auto !important;
  }
  .map-sidebar {
    border-left: none !important;
    border-top: 1px solid var(--c-border) !important;
    height: auto !important;
    max-height: 50vh !important;
    overflow-y: auto !important;
  }

  /* Listings view */
  .listings-container { padding: 16px !important; }
  .listing-row        { grid-template-columns: 80px 1fr !important; }
  .listing-actions-col{ display: none !important; }

  /* Shared */
  .jumo-footer        { padding: 32px 16px !important; }
}
`;

/* ───────────── COMPONENTS ───────────── */
interface AnimatedHeadingProps {
  children: React.ReactNode;
  delay?: number;
  visible?: boolean;
  as?: keyof React.JSX.IntrinsicElements;
  style?: React.CSSProperties;
}
function AnimatedHeading({ children, delay = 0, visible = true, as: Tag = "h1", style = {} }: AnimatedHeadingProps) {
  return (
    <Tag style={{ fontFamily: "var(--font-display)", overflow: "hidden", ...style }}>
      <span style={{
        display: "inline-block",
        transform: visible ? "translateY(0)" : "translateY(110%)",
        opacity: visible ? 1 : 0,
        transition: `transform 1s var(--ease-out-expo) ${delay}s, opacity 0.8s ease ${delay}s`,
      }}>
        {children}
      </span>
    </Tag>
  );
}

function FairScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "var(--c-emerald)" : score >= 60 ? "var(--c-gold)" : "var(--c-red)";
  const label = score >= 80 ? "Prix juste" : score >= 60 ? "À négocier" : "Surévalué";
  const bg    = score >= 80 ? "rgba(5,150,105,0.1)" : score >= 60 ? "var(--c-gold-dim)" : "rgba(239,68,68,0.1)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        border: `2px solid ${color}`, background: bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 700, color, fontFamily: "var(--font-body)",
      }}>{score}</div>
      <span style={{ fontSize: 11, color, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "var(--font-body)" }}>
        {label}
      </span>
    </div>
  );
}

function PriceHistoryMini({ history }: { history: number[] }) {
  if (history.length < 2) return <span style={{ fontSize: 11, color: "var(--c-text-muted)", fontFamily: "var(--font-body)" }}>Nouveau</span>;
  const max = Math.max(...history), min = Math.min(...history), range = max - min || 1;
  const w = 80, h = 28;
  const points = history.map((p, i) => `${(i / (history.length - 1)) * w},${h - ((p - min) / range) * h}`).join(" ");
  const dropped = history[history.length - 1] < history[0];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <polyline points={points} fill="none" stroke={dropped ? "var(--c-red)" : "var(--c-green)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ fontSize: 11, color: dropped ? "var(--c-red)" : "var(--c-green)", fontWeight: 600, fontFamily: "var(--font-body)" }}>
        {dropped ? "▼" : "▲"} {Math.abs(Math.round(((history[history.length - 1] - history[0]) / history[0]) * 100))}%
      </span>
    </div>
  );
}

function DPEBadge({ dpe }: { dpe: string }) {
  const colors: Record<string, string> = { A: "#059669", B: "#10B981", C: "#84CC16", D: "#EAB308", E: "#F97316", F: "#EF4444", G: "#991B1B" };
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 4,
      fontSize: 10, fontWeight: 700, color: "#fff", fontFamily: "var(--font-body)",
      background: colors[dpe] ?? "#4A5568", letterSpacing: "0.05em",
    }}>DPE {dpe}</span>
  );
}

interface NavBarProps {
  currentView:    string;
  setCurrentView: (v: string) => void;
  sessionUser:    { name: string; role: string } | null;
  onOpenAuth:     () => void;
}

function NavBar({ currentView, setCurrentView, sessionUser, onOpenAuth }: NavBarProps) {
  const links = [
    { key: "map",       label: "Carte" },
    { key: "listings",  label: "Annonces" },
    { key: "news",      label: "Actualités" },
    { key: "paperwork", label: "Démarches" },
  ];
  const dashboardHref = sessionUser?.role === "SELLER" ? "/espace-vendeur" : "/espace-acheteur";

  return (
    <nav className="jumo-nav" style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "18px 32px",
      borderBottom: "1px solid var(--c-border)",
      backdropFilter: "blur(24px) saturate(1.5)",
      WebkitBackdropFilter: "blur(24px) saturate(1.5)",
      background: "rgba(6,11,20,0.75)",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      <div onClick={() => setCurrentView("landing")} style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Jumo-Immo"
          style={{ height: 36, width: "auto", display: "block", mixBlendMode: "screen" }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {links.map(l => (
          <button key={l.key} className="jumo-nav-link" onClick={() => setCurrentView(l.key)} style={{
            padding: "8px 18px", borderRadius: 6, fontSize: 13, fontWeight: 500,
            cursor: "pointer", border: "none", fontFamily: "var(--font-body)",
            background: currentView === l.key ? "var(--c-blue-glow)" : "transparent",
            color: currentView === l.key ? "var(--c-blue)" : "var(--c-text-muted)",
            transition: "all 0.3s ease", letterSpacing: "0.02em",
          }}>{l.label}</button>
        ))}

        {/* ── Auth zone ── */}
        {sessionUser ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 12 }}>
            <a
              href={dashboardHref}
              style={{
                padding: "8px 18px", borderRadius: 6, fontSize: 13, fontWeight: 600,
                background: "var(--c-blue)", color: "#fff", textDecoration: "none",
                fontFamily: "var(--font-body)", letterSpacing: "0.02em",
                transition: "background 0.25s ease",
              }}
            >
              Mon espace
            </a>
            <button
              onClick={() => signOut({ redirectTo: "/" })}
              style={{
                padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                cursor: "pointer", border: "1px solid var(--c-border)",
                background: "transparent", color: "var(--c-text-muted)",
                fontFamily: "var(--font-body)", letterSpacing: "0.02em",
                transition: "all 0.25s ease",
              }}
            >
              Déconnexion
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            style={{
              marginLeft: 12, padding: "8px 20px", borderRadius: 6, fontSize: 13, fontWeight: 600,
              cursor: "pointer", border: "none", fontFamily: "var(--font-body)",
              background: "var(--c-blue)", color: "#fff", letterSpacing: "0.02em",
              transition: "background 0.25s ease",
            }}
          >
            Se connecter
          </button>
        )}
      </div>
    </nav>
  );
}

/* ───────────── MAIN APP ───────────── */
interface HomeClientProps {
  dbProperties: DbProperty[];
  sessionUser:  { name: string; role: string } | null;
}

export default function HomeClientUI({ dbProperties, sessionUser }: HomeClientProps) {
  const router = useRouter();
  const [currentView, setCurrentView] = useState("landing");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [animatedCount, setAnimatedCount] = useState(0);
  const [priceType, setPriceType] = useState("all");
  const [sortBy, setSortBy] = useState("fairScore");
  const [hoveredListing, setHoveredListing] = useState<string | null>(null);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const mapRef = useRef<MapHandle | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchResults, setSearchResults] = useState<AdresseFeature[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [searchBarVisible, setSearchBarVisible] = useState(true);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [ref1, vis1] = useReveal();
  const [ref2, vis2] = useReveal();

  const listings: Listing[] = dbToListings(dbProperties);

  useEffect(() => { setTimeout(() => setHeroLoaded(true), 100); }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (searchQuery.trim().length < 2) { setSearchResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(searchQuery)}&limit=5`
        );
        const data = await res.json();
        setSearchResults(data.features ?? []);
      } catch { setSearchResults([]); }
      finally { setIsSearching(false); }
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery]);

  useEffect(() => { setHighlightedIndex(-1); }, [searchResults]);

  // When bar is hidden, reset the 5-second inactivity timer on any user interaction
  useEffect(() => {
    if (searchBarVisible) return;
    const restart = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => setSearchBarVisible(true), 5000);
    };
    window.addEventListener('touchstart', restart, { passive: true });
    window.addEventListener('mousedown', restart);
    return () => {
      window.removeEventListener('touchstart', restart);
      window.removeEventListener('mousedown', restart);
    };
  }, [searchBarVisible]);

  useEffect(() => () => { if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current); }, []);

  const handleSelect = (feature: AdresseFeature) => {
    const [lng, lat] = feature.geometry.coordinates;
    mapRef.current?.flyTo(lng, lat);
    setSearchQuery(feature.properties.label);
    setSearchResults([]);
    setHighlightedIndex(-1);
    setIsFocused(false);
    // Hide search bar; reappear automatically after 5s of no interaction
    setSearchBarVisible(false);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => setSearchBarVisible(true), 5000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = highlightedIndex >= 0 ? searchResults[highlightedIndex] : searchResults[0];
      if (target) handleSelect(target);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSearchResults([]);
      setHighlightedIndex(-1);
      setIsFocused(false);
    }
  };

  useEffect(() => {
    if (currentView !== "landing") return;
    let count = 0;
    const target = 28_400_000;
    const step = target / 80;
    const interval = setInterval(() => {
      count += step;
      if (count >= target) { count = target; clearInterval(interval); }
      setAnimatedCount(Math.floor(count));
    }, 16);
    return () => clearInterval(interval);
  }, [currentView]);

  const filteredListings = listings
    .filter(l => {
      if (priceType === "fair") return l.fairScore >= 80;
      if (priceType === "negotiate") return l.fairScore >= 50 && l.fairScore < 80;
      if (priceType === "overpriced") return l.fairScore < 50;
      return true;
    })
    .sort((a, b) =>
      sortBy === "fairScore" ? b.fairScore - a.fairScore :
      sortBy === "price" ? a.price - b.price :
      a.daysOnMarket - b.daysOnMarket
    );

  /* ═══════════════════════════════════════════════════
     LANDING
  ═══════════════════════════════════════════════════ */
  if (currentView === "landing") {
    return (
      <div style={{ fontFamily: "var(--font-body)", minHeight: "100vh", background: "var(--c-bg)", color: "var(--c-text)", overflowX: "hidden" }}>
        <style>{STYLE_TAG}</style>
        <NavBar currentView={currentView} setCurrentView={setCurrentView} sessionUser={sessionUser} onOpenAuth={() => setShowAuthModal(true)} />

        {/* ── HERO — Cinematic full-viewport 3D map ── */}
        <div className="hero-root" style={{ position: "relative", height: "calc(100vh - 76px)", overflow: "hidden", display: "flex", alignItems: "center" }}>

          {/* Map3D — absolute fill, z-index 0 */}
          <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
            <Map3D fullscreen ref={mapRef} properties={dbProperties} />
          </div>

          {/* Gradient layer — separate from content so text column doesn't define overlay width */}
          <div style={{
            position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
            background: [
              "linear-gradient(to right,  rgba(6,11,20,0.96) 0%, rgba(6,11,20,0.72) 42%, rgba(6,11,20,0.10) 72%, transparent 100%)",
              "linear-gradient(to bottom, rgba(6,11,20,0.50) 0%, transparent 28%)",
            ].join(", "),
          }} />

          {/* ── FLEX CONTENT LAYER — in-flow, not absolute ── */}
          <div className="hero-overlay" style={{
            position: "relative", height: "100%", zIndex: 10,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 40,
            padding: "0 52px",
            width: "100%",
            pointerEvents: "none",
            opacity: heroLoaded ? 1 : 0,
            transform: heroLoaded ? "translateY(0)" : "translateY(-22px)",
            transition: "opacity 1s cubic-bezier(0.16,1,0.3,1) 0.3s, transform 1s cubic-bezier(0.16,1,0.3,1) 0.3s",
          }}>

            {/* LEFT — Text column */}
            <div className="hero-text-col" style={{
              display: "flex", flexDirection: "column", gap: 28,
              maxWidth: 560, flexShrink: 0,
            }}>
              {/* Overline */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 1, background: "var(--c-gold)", flexShrink: 0 }} />
                <span style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--c-gold)", fontWeight: 600, fontFamily: "var(--font-body)" }}>
                  Immobilier entre particuliers
                </span>
              </div>

              {/* Headline */}
              <h1 style={{
                fontFamily: "var(--font-display)", fontSize: "clamp(34px, 4.5vw, 58px)",
                fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.03em",
                color: "var(--c-text)", margin: 0,
              }}>
                Le vrai prix de l'immobilier.{" "}
                <span style={{ color: "var(--c-gold)", fontStyle: "italic" }}>Sans agence.</span>
              </h1>

              {/* Stats row */}
              <div className="hero-stats" style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
                {[
                  { n: animatedCount.toLocaleString("fr-FR"), label: "Transactions DVF", color: "var(--c-text)" },
                  { n: "0%",   label: "Commission",          color: "var(--c-gold)" },
                  { n: "100%", label: "Données officielles", color: "var(--c-blue)" },
                ].map((s, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "var(--font-display)", color: s.color, letterSpacing: "-0.02em" }}>{s.n}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — Property preview cards */}
            {listings.length > 0 && (
              <div className="hero-cards-col" style={{
                display: "flex", flexDirection: "column", gap: 10,
                flexShrink: 0, pointerEvents: "auto",
              }}>
                {listings.slice(0, 3).map((l, idx) => {
                  const typeEmoji  = l.type === "Maison" ? "⌂" : l.type === "Terrain" ? "▦" : "⊞";
                  const scoreColor = l.fairScore >= 80 ? "var(--c-emerald)" : l.fairScore >= 60 ? "var(--c-gold)" : "var(--c-red)";
                  const thumbBg    = l.fairScore > 70
                    ? "rgba(5,150,105,0.18)"
                    : l.fairScore > 50 ? "rgba(200,165,92,0.15)" : "rgba(239,68,68,0.14)";
                  return (
                    <div
                      key={l.id}
                      className="hero-prop-card"
                      onClick={() => router.push(`/annonces/${l.id}`)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "11px 14px", borderRadius: 14, width: 272,
                        background: "rgba(10,16,30,0.74)",
                        backdropFilter: "blur(20px) saturate(1.6)",
                        WebkitBackdropFilter: "blur(20px) saturate(1.6)",
                        border: "1px solid rgba(255,255,255,0.09)",
                        boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
                        cursor: "pointer",
                        opacity: heroLoaded ? 1 : 0,
                        transform: heroLoaded ? "translateX(0)" : "translateX(20px)",
                        transition: `opacity 0.7s ease ${0.45 + idx * 0.11}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${0.45 + idx * 0.11}s, border-color 0.2s ease, background 0.2s ease`,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                        e.currentTarget.style.background  = "rgba(10,16,30,0.90)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)";
                        e.currentTarget.style.background  = "rgba(10,16,30,0.74)";
                      }}
                    >
                      {/* Type thumbnail */}
                      <div style={{
                        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                        background: thumbBg, display: "flex",
                        alignItems: "center", justifyContent: "center", fontSize: 20,
                      }}>
                        {typeEmoji}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--c-text)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                          {l.price.toLocaleString("fr-FR")} €
                        </div>
                        <div style={{ fontSize: 11, color: "var(--c-text-muted)", marginTop: 3, fontFamily: "var(--font-body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {l.type} · {l.city} · {l.surface} m²
                        </div>
                      </div>

                      {/* FairScore */}
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 17, fontWeight: 800, color: scoreColor, fontFamily: "var(--font-display)", lineHeight: 1 }}>{l.fairScore}</div>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", letterSpacing: "0.07em", textTransform: "uppercase", marginTop: 2 }}>score</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>{/* end FLEX CONTENT LAYER */}

          {/* Floating search — pill + dropdown, centred near bottom */}
          <div style={{
            position: "absolute",
            bottom: "14%", left: "50%",
            transform: !heroLoaded
              ? "translateX(-50%) translateY(20px)"
              : searchBarVisible
              ? "translateX(-50%) translateY(0)"
              : "translateX(-50%) translateY(-14px)",
            opacity: !heroLoaded ? 0 : searchBarVisible ? 1 : 0,
            pointerEvents: searchBarVisible ? 'auto' : 'none',
            transition: heroLoaded
              ? "opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)"
              : "opacity 1s cubic-bezier(0.16,1,0.3,1) 0.6s, transform 1s cubic-bezier(0.16,1,0.3,1) 0.6s",
            zIndex: 10,
            width: "min(580px, 88vw)",
          }}>

            {/* Suggestions dropdown — appears above the pill */}
            {isFocused && searchResults.length > 0 && (
              <div style={{
                position: "absolute",
                bottom: "calc(100% + 12px)", left: 0, right: 0,
                background: "rgba(8, 12, 24, 0.97)",
                backdropFilter: "blur(24px) saturate(1.8)",
                WebkitBackdropFilter: "blur(24px) saturate(1.8)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 20,
                boxShadow: "0 32px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03)",
                overflow: "hidden",
                animation: "dropdownIn 0.22s cubic-bezier(0.16,1,0.3,1)",
              }}>
                {searchResults.map((feature, i) => {
                  const typeLabel = ADDR_TYPE[feature.properties.type] ?? feature.properties.type;
                  return (
                    <button
                      key={i}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => handleSelect(feature)}
                      onMouseEnter={() => setHighlightedIndex(i)}
                      onMouseLeave={() => setHighlightedIndex(-1)}
                      style={{
                        display: "flex", alignItems: "center", gap: 14,
                        width: "100%", padding: "13px 18px 13px 16px",
                        background: highlightedIndex === i
                          ? "rgba(37,99,235,0.14)"
                          : "transparent",
                        border: "none",
                        borderLeft: `2px solid ${highlightedIndex === i ? "rgba(37,99,235,0.55)" : "transparent"}`,
                        borderBottom: i < searchResults.length - 1
                          ? "1px solid rgba(255,255,255,0.05)" : "none",
                        cursor: "pointer", textAlign: "left",
                        transition: "background 0.12s ease, border-left-color 0.12s ease",
                      }}
                    >
                      {/* Pin icon */}
                      <div style={{
                        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                        background: "rgba(37,99,235,0.14)",
                        border: "1px solid rgba(37,99,235,0.28)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <svg width="12" height="15" viewBox="0 0 12 15" fill="none">
                          <path d="M6 0C3.239 0 1 2.239 1 5c0 4.25 5 10 5 10s5-5.75 5-10C11 2.239 8.761 0 6 0z"
                            fill="rgba(37,99,235,0.25)" stroke="#2563EB" strokeWidth="1.3" strokeLinejoin="round" />
                          <circle cx="6" cy="5" r="2" fill="#2563EB" />
                        </svg>
                      </div>

                      {/* Label + context */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 600,
                          color: "var(--c-text)", fontFamily: "var(--font-body)",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {feature.properties.label}
                        </div>
                        {feature.properties.context && (
                          <div style={{
                            fontSize: 11, color: "var(--c-text-muted)", marginTop: 2,
                            fontFamily: "var(--font-body)",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>
                            {feature.properties.context}
                          </div>
                        )}
                      </div>

                      {/* Type pill */}
                      <span style={{
                        fontSize: 10, fontWeight: 600, flexShrink: 0,
                        padding: "3px 9px", borderRadius: 6,
                        background: "rgba(255,255,255,0.06)",
                        color: "var(--c-text-dim)", fontFamily: "var(--font-body)",
                        letterSpacing: "0.04em", textTransform: "capitalize",
                      }}>
                        {typeLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Pill search bar */}
            <div style={{
              display: "flex", alignItems: "center",
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(16px) saturate(1.8)",
              WebkitBackdropFilter: "blur(16px) saturate(1.8)",
              borderRadius: "99px",
              border: isFocused ? "1px solid rgba(255,255,255,0.35)" : "1px solid rgba(255,255,255,0.2)",
              boxShadow: isFocused
                ? "0 20px 40px rgba(0,0,0,0.4), 0 0 0 3px rgba(37,99,235,0.18)"
                : "0 20px 40px rgba(0,0,0,0.4)",
              padding: "6px 6px 6px 24px",
              overflow: "hidden",
              transition: "border 0.2s ease, box-shadow 0.2s ease",
            }}>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 150)}
                placeholder="Ville, quartier, code postal..."
                style={{
                  flex: 1, background: "transparent", border: "none",
                  color: "#fff", fontSize: 14, outline: "none",
                  fontFamily: "var(--font-body)", caretColor: "var(--c-gold)", minWidth: 0,
                }}
              />
              {isSearching && (
                <div style={{
                  width: 16, height: 16, borderRadius: "50%", flexShrink: 0, marginRight: 10,
                  border: "2px solid rgba(255,255,255,0.15)",
                  borderTopColor: "var(--c-gold)",
                  animation: "spin 0.7s linear infinite",
                }} />
              )}
              <button
                onClick={() => {
                  const target = highlightedIndex >= 0 ? searchResults[highlightedIndex] : searchResults[0];
                  if (target) handleSelect(target);
                }}
                style={{
                  padding: "13px 28px", background: "var(--c-blue)", border: "none",
                  color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer",
                  fontFamily: "var(--font-body)", letterSpacing: "0.02em",
                  borderRadius: "99px", transition: "background 0.25s ease",
                  flexShrink: 0, whiteSpace: "nowrap",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#1D4ED8"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--c-blue)"; }}
              >
                Rechercher
              </button>
            </div>
          </div>

        </div>

        {/* ── Decorative divider ── */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
          <div style={{ height: 1, background: "linear-gradient(90deg, var(--c-border), var(--c-gold), var(--c-border))", opacity: 0.4 }} />
        </div>

        {/* ── FEATURES ── */}
        <div ref={ref1} className="features-section" style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 1, background: "var(--c-blue)" }} />
            <span style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: "var(--c-blue)", fontWeight: 600 }}>Nos outils</span>
          </div>
          <AnimatedHeading visible={vis1} as="h2" style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 48 }}>
            Chaque donnée,{" "}
            <span style={{ color: "var(--c-gold)", fontStyle: "italic" }}>à votre avantage.</span>
          </AnimatedHeading>
          <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {[
              { icon: "◎", title: "Score d'équité",    desc: "Notre IA compare chaque annonce aux ventes réelles DVF pour détecter les prix gonflés",       color: "var(--c-blue)" },
              { icon: "◈", title: "Historique complet", desc: "Chaque baisse, chaque hausse, chaque modification — depuis la première publication",          color: "var(--c-gold)" },
              { icon: "◇", title: "Zéro intermédiaire", desc: "Messagerie directe, prise de RDV intégrée, modèles de documents juridiques inclus",           color: "var(--c-green)" },
              { icon: "◆", title: "Prédictions IA",     desc: "Prévisions de prix à 1, 3 et 5 ans par commune, basées sur les tendances DVF",               color: "var(--c-gold)" },
            ].map((f, i) => (
              <div key={i} style={{
                padding: 28, borderRadius: 12, border: "1px solid var(--c-border)", background: "var(--c-surface)", cursor: "pointer",
                transition: "all 0.4s var(--ease-gleasing)",
                opacity: vis1 ? 1 : 0, transform: vis1 ? "translateY(0)" : "translateY(30px)", transitionDelay: `${0.2 + i * 0.1}s`,
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = f.color; e.currentTarget.style.background = "var(--c-bg-card)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--c-border)"; e.currentTarget.style.background = "var(--c-surface)"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{ fontSize: 28, marginBottom: 16, color: f.color }}>{f.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, fontFamily: "var(--font-display)" }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "var(--c-text-muted)", lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── OPPORTUNITIES ── */}
        <div ref={ref2} className="opps-section" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px 80px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
            <AnimatedHeading visible={vis2} as="h2" style={{ fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
              Opportunités du moment
            </AnimatedHeading>
            <button onClick={() => setCurrentView("listings")} style={{ fontSize: 13, color: "var(--c-gold)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", fontWeight: 600, letterSpacing: "0.05em" }}>
              Voir tout →
            </button>
          </div>
          <div className="opps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {listings.slice(0, 3).map((l, idx) => (
              <div key={l.id} style={{
                borderRadius: 12, border: "1px solid var(--c-border)", background: "var(--c-bg-card)", overflow: "hidden", cursor: "pointer",
                transition: "all 0.4s var(--ease-gleasing)",
                opacity: vis2 ? 1 : 0, transform: vis2 ? "translateY(0)" : "translateY(30px)", transitionDelay: `${0.15 + idx * 0.1}s`,
              }}
                onClick={() => router.push(`/annonces/${l.id}`)}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--c-blue)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--c-border)"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{ height: 120, background: l.fairScore > 70 ? "linear-gradient(135deg, #0B2E1F, var(--c-bg-card))" : l.fairScore > 50 ? "linear-gradient(135deg, #2D2410, var(--c-bg-card))" : "linear-gradient(135deg, #2D1010, var(--c-bg-card))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, opacity: 0.5, position: "relative" }}>
                  {l.type === "Maison" ? "⌂" : l.type === "Terrain" ? "▦" : "⊞"}
                  <div style={{ position: "absolute", top: 12, right: 12 }}><DPEBadge dpe={l.dpe} /></div>
                  {l.isBoosted && (
                    <div style={{ position: "absolute", top: 12, left: 12, background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 4, letterSpacing: "0.06em", fontFamily: "var(--font-body)" }}>★ PREMIUM</div>
                  )}
                </div>
                <div style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--font-display)" }}>{l.price.toLocaleString("fr-FR")} €</div>
                      <div style={{ fontSize: 12, color: "var(--c-text-muted)", marginTop: 2 }}>{l.type} · {l.city}</div>
                    </div>
                    <FairScoreBadge score={l.fairScore} />
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--c-text-dim)", marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--c-border)" }}>
                    <span>{l.surface} m²</span>
                    {l.rooms > 0 && <span>{l.rooms} pièces</span>}
                    <span>{Math.round(l.price / l.surface).toLocaleString("fr-FR")} €/m²</span>
                  </div>
                  <div style={{ marginTop: 10 }}><PriceHistoryMini history={l.priceHistory} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="jumo-footer" style={{ textAlign: "center", padding: "40px 32px", borderTop: "1px solid var(--c-border)", fontSize: 12, color: "var(--c-text-dim)", fontFamily: "var(--font-body)" }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--c-text-muted)", fontSize: 14 }}>Jumo-Immo</span>
          <span style={{ margin: "0 12px", color: "var(--c-border)" }}>·</span>
          Données DVF officielles (data.gouv.fr)
          <span style={{ margin: "0 12px", color: "var(--c-border)" }}>·</span>
          Licence Ouverte 2.0
          <span style={{ margin: "0 12px", color: "var(--c-border)" }}>·</span>
          Sans commission
        </div>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     MAP
  ═══════════════════════════════════════════════════ */
  if (currentView === "map") {
    return (
      <div className="map-view-outer" style={{ fontFamily: "var(--font-body)", minHeight: "100vh", background: "var(--c-bg)", color: "var(--c-text)", overflow: "hidden" }}>
        <style>{STYLE_TAG}</style>
        <NavBar currentView={currentView} setCurrentView={setCurrentView} sessionUser={sessionUser} onOpenAuth={() => setShowAuthModal(true)} />
        <div className="map-view-grid" style={{ display: "grid", gridTemplateColumns: "1fr 320px", height: "calc(100vh - 62px)" }}>
          <div style={{ position: "relative", background: "#070D19" }}>
            <svg viewBox="0 0 560 460" style={{ width: "100%", height: "100%" }}>
              <defs>
                <radialGradient id="sea"><stop offset="0%" stopColor="#0D1628" /><stop offset="100%" stopColor="#070D19" /></radialGradient>
                <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              </defs>
              <rect width="560" height="460" fill="url(#sea)" />
              <path d="M145,85 C160,72 185,65 210,60 C230,55 250,58 265,50 C285,40 310,42 330,48 C350,52 365,58 380,55 C400,50 425,55 445,65 C460,72 470,85 475,100 C478,115 480,130 475,148 C470,160 460,170 455,185 C448,200 440,215 435,230 C432,240 428,250 420,258 C415,268 405,275 398,285 C390,295 385,308 380,320 C375,332 368,340 358,348 C348,358 338,365 325,370 C312,375 300,378 288,380 C275,382 262,378 250,372 C238,368 228,360 218,352 C208,342 198,335 190,325 C182,315 178,305 172,295 C165,282 160,270 155,258 C148,245 145,232 142,218 C138,205 135,192 135,178 C134,165 136,152 138,140 C140,125 142,110 142,95 Z"
                fill="var(--c-bg-card)" stroke="rgba(37,99,235,0.15)" strokeWidth="0.8" />
              {REGIONS.map((r, i) => {
                const size = Math.max(8, Math.min(20, r.listings / 3000));
                const isSel = selectedRegion?.name === r.name;
                return (
                  <g key={i} style={{ cursor: "pointer" }} onClick={() => setSelectedRegion(isSel ? null : r)}>
                    <circle cx={r.x} cy={r.y} r={size + 10} fill={r.change > 0 ? "rgba(239,68,68,0.08)" : "rgba(37,99,235,0.08)"} opacity={isSel ? 1 : 0.6}>
                      <animate attributeName="r" values={`${size + 8};${size + 14};${size + 8}`} dur="4s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={r.x} cy={r.y} r={size} fill={r.change > 0 ? "var(--c-red)" : "var(--c-blue)"} opacity={isSel ? 1 : 0.7} stroke={isSel ? "var(--c-gold)" : "#fff"} strokeWidth={isSel ? 2 : 0.5} filter={isSel ? "url(#glow)" : undefined} />
                    <text x={r.x} y={r.y + size + 14} textAnchor="middle" fill="var(--c-text-muted)" fontSize="8" fontWeight="500" fontFamily="var(--font-body)">{r.name.split(" ")[0]}</text>
                  </g>
                );
              })}
              <text x="280" y="440" textAnchor="middle" fill="var(--c-text-dim)" fontSize="10" fontFamily="var(--font-body)">Cliquez sur une région pour voir les détails</text>
            </svg>
            <div style={{ position: "absolute", top: 20, left: 20, display: "flex", gap: 16, fontSize: 11, fontFamily: "var(--font-body)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--c-text-muted)" }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--c-blue)" }} /> Prix en baisse</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--c-text-muted)" }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--c-red)" }} /> Prix en hausse</div>
            </div>
          </div>
          <div className="map-sidebar" style={{ background: "var(--c-bg-elevated)", borderLeft: "1px solid var(--c-border)", padding: 24, overflowY: "auto" }}>
            {selectedRegion ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
                  <div style={{ width: 3, height: 24, background: "var(--c-gold)", borderRadius: 2 }} />
                  <h3 style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--font-display)" }}>{selectedRegion.name}</h3>
                </div>
                {[
                  { label: "Prix moyen / m²", value: `${selectedRegion.price.toLocaleString("fr-FR")} €`, sub: `${selectedRegion.change > 0 ? "+" : ""}${selectedRegion.change}% / an`, subColor: selectedRegion.change > 0 ? "var(--c-red)" : "var(--c-green)" },
                  { label: "Annonces actives", value: selectedRegion.listings.toLocaleString("fr-FR"), sub: undefined, subColor: undefined },
                  { label: "Population",       value: selectedRegion.pop,                                sub: undefined, subColor: undefined },
                ].map((item, i) => (
                  <div key={i} style={{ padding: "16px 0", borderBottom: "1px solid var(--c-border)" }}>
                    <div style={{ fontSize: 11, color: "var(--c-text-dim)", marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>{item.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)" }}>{item.value}</div>
                    {item.sub && <div style={{ fontSize: 12, color: item.subColor, marginTop: 4, fontWeight: 600 }}>{item.sub}</div>}
                  </div>
                ))}
                <button onClick={() => setCurrentView("listings")} style={{ width: "100%", marginTop: 20, padding: "14px", borderRadius: 8, background: "var(--c-blue)", border: "none", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)", letterSpacing: "0.02em", transition: "background 0.3s ease" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#1D4ED8"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--c-blue)"; }}
                >Voir les annonces →</button>
              </>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 3, height: 20, background: "var(--c-blue)", borderRadius: 2 }} />
                  <h3 style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--font-display)" }}>Carte de France</h3>
                </div>
                <p style={{ fontSize: 12, color: "var(--c-text-dim)", margin: "0 0 24px", paddingLeft: 11 }}>13 régions · Prix moyens au m²</p>
                {[...REGIONS].sort((a, b) => b.price - a.price).map((r, i) => (
                  <div key={i} onClick={() => setSelectedRegion(r)} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--c-border)", cursor: "pointer", fontSize: 12, transition: "all 0.2s ease" }}
                    onMouseEnter={e => { e.currentTarget.style.paddingLeft = "8px"; }}
                    onMouseLeave={e => { e.currentTarget.style.paddingLeft = "0"; }}
                  >
                    <span style={{ color: "var(--c-text-muted)" }}>{r.name}</span>
                    <div style={{ display: "flex", gap: 10 }}>
                      <span style={{ fontWeight: 700, fontFamily: "var(--font-display)" }}>{r.price.toLocaleString("fr-FR")} €</span>
                      <span style={{ color: r.change > 0 ? "var(--c-red)" : "var(--c-green)", fontWeight: 600 }}>{r.change > 0 ? "+" : ""}{r.change}%</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     LISTINGS
  ═══════════════════════════════════════════════════ */
  if (currentView === "listings") {
    return (
      <div style={{ fontFamily: "var(--font-body)", minHeight: "100vh", background: "var(--c-bg)", color: "var(--c-text)" }}>
        <style>{STYLE_TAG}</style>
        <NavBar currentView={currentView} setCurrentView={setCurrentView} sessionUser={sessionUser} onOpenAuth={() => setShowAuthModal(true)} />
        <div className="listings-container" style={{ padding: "28px 32px", maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { key: "all",        label: "Toutes" },
              { key: "fair",       label: "Prix juste (80+)" },
              { key: "negotiate",  label: "À négocier (50-79)" },
              { key: "overpriced", label: "Surévalué (<50)" },
            ].map(f => (
              <button key={f.key} onClick={() => setPriceType(f.key)} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "1px solid", fontFamily: "var(--font-body)", borderColor: priceType === f.key ? "var(--c-blue)" : "var(--c-border)", background: priceType === f.key ? "var(--c-blue-glow)" : "transparent", color: priceType === f.key ? "var(--c-blue)" : "var(--c-text-muted)", cursor: "pointer", transition: "all 0.3s ease", letterSpacing: "0.02em" }}>
                {f.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: "8px 16px", borderRadius: 8, background: "var(--c-bg-elevated)", border: "1px solid var(--c-border)", color: "var(--c-text)", fontSize: 12, fontFamily: "var(--font-body)" }}>
              <option value="fairScore">Score d'équité</option>
              <option value="price">Prix croissant</option>
              <option value="daysOnMarket">Ancienneté</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filteredListings.map((l, idx) => (
              <div key={l.id} className="listing-row" style={{ display: "grid", gridTemplateColumns: "130px 1fr auto", borderRadius: 12, border: `1px solid ${hoveredListing === l.id ? "var(--c-blue)" : "var(--c-border)"}`, background: "var(--c-bg-card)", overflow: "hidden", cursor: "pointer", transition: "all 0.3s var(--ease-gleasing)", animation: `fadeUp 0.6s var(--ease-out-expo) ${idx * 0.08}s both` }}
                onClick={() => router.push(`/annonces/${l.id}`)}
                onMouseEnter={() => setHoveredListing(l.id)}
                onMouseLeave={() => setHoveredListing(null)}
              >
                <div style={{ background: l.fairScore > 70 ? "linear-gradient(135deg, #0B2E1F, var(--c-bg-card))" : l.fairScore > 50 ? "linear-gradient(135deg, #2D2410, var(--c-bg-card))" : "linear-gradient(135deg, #2D1010, var(--c-bg-card))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, opacity: 0.5 }}>
                  {l.type === "Maison" ? "⌂" : l.type === "Terrain" ? "▦" : "⊞"}
                </div>
                <div style={{ padding: 18 }}>
                  {l.isBoosted && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 8, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "#F59E0B", fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: 6, fontFamily: "var(--font-body)", letterSpacing: "0.06em" }}>★ ANNONCE BOOSTÉE</div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--font-display)" }}>{l.price.toLocaleString("fr-FR")} €</span>
                    <DPEBadge dpe={l.dpe} />
                    {l.daysOnMarket > 100 && <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "rgba(239,68,68,0.1)", color: "var(--c-red)", fontWeight: 600 }}>Bien en difficulté</span>}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--c-text-muted)", marginBottom: 10 }}>{l.type} · {l.city} · {l.surface} m² {l.rooms > 0 ? `· ${l.rooms} pièces` : ""}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <PriceHistoryMini history={l.priceHistory} />
                    <span style={{ fontSize: 11, color: "var(--c-text-dim)" }}>{l.daysOnMarket} jours</span>
                    <span style={{ fontSize: 11, color: "var(--c-text-dim)" }}>{Math.round(l.price / l.surface).toLocaleString("fr-FR")} €/m²</span>
                  </div>
                </div>
                <div className="listing-actions-col" style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderLeft: "1px solid var(--c-border)", minWidth: 100 }}>
                  <FairScoreBadge score={l.fairScore} />
                  <button style={{ marginTop: 12, padding: "8px 18px", borderRadius: 6, background: "var(--c-blue-glow)", border: "1px solid rgba(37,99,235,0.3)", color: "var(--c-blue)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)", transition: "all 0.3s ease" }}
                    onClick={e => e.stopPropagation()}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--c-blue)"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "var(--c-blue-glow)"; e.currentTarget.style.color = "var(--c-blue)"; }}
                  >Contacter</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     NEWS
  ═══════════════════════════════════════════════════ */
  if (currentView === "news") {
    return (
      <div style={{ fontFamily: "var(--font-body)", minHeight: "100vh", background: "var(--c-bg)", color: "var(--c-text)" }}>
        <style>{STYLE_TAG}</style>
        <NavBar currentView={currentView} setCurrentView={setCurrentView} sessionUser={sessionUser} onOpenAuth={() => setShowAuthModal(true)} />
        <div style={{ padding: "36px 32px", maxWidth: 740, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 40, height: 1, background: "var(--c-gold)" }} />
            <span style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: "var(--c-gold)", fontWeight: 600 }}>Flux en temps réel</span>
          </div>
          <h2 style={{ fontSize: 36, fontWeight: 800, fontFamily: "var(--font-display)", letterSpacing: "-0.02em", marginBottom: 8 }}>Actualités</h2>
          <p style={{ fontSize: 14, color: "var(--c-text-muted)", marginBottom: 36 }}>Notaires, inflation, taux, législation</p>
          {NEWS_ITEMS.map((n, i) => {
            const tagColors: Record<string, { bg: string; c: string }> = { Prix: { bg: "var(--c-blue-glow)", c: "var(--c-blue)" }, Taux: { bg: "rgba(52,211,153,0.1)", c: "var(--c-green)" }, Loi: { bg: "rgba(239,68,68,0.1)", c: "var(--c-red)" }, Aide: { bg: "var(--c-gold-dim)", c: "var(--c-gold)" } };
            const tc = tagColors[n.tag] ?? tagColors.Aide;
            return (
              <div key={i} style={{ padding: "20px 0", borderBottom: "1px solid var(--c-border)", cursor: "pointer", transition: "all 0.3s ease", animation: `fadeUp 0.5s var(--ease-out-expo) ${i * 0.1}s both` }}
                onMouseEnter={e => { e.currentTarget.style.paddingLeft = "12px"; }}
                onMouseLeave={e => { e.currentTarget.style.paddingLeft = "0"; }}
              >
                <div style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, background: tc.bg, color: tc.c, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>{n.tag}</span>
                  <span style={{ fontSize: 11, color: "var(--c-text-dim)" }}>{n.source}</span>
                  <span style={{ fontSize: 11, color: "var(--c-text-dim)" }}>·</span>
                  <span style={{ fontSize: 11, color: "var(--c-text-dim)" }}>{n.time}</span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.5, fontFamily: "var(--font-display)" }}>{n.title}</div>
              </div>
            );
          })}
          <div style={{ marginTop: 40, padding: 24, borderRadius: 12, border: "1px solid var(--c-border)", background: "var(--c-surface)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, fontFamily: "var(--font-display)" }}>Sources agrégées</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["Banque de France", "Notaires de France", "INSEE", "ECB", "Le Monde Immo", "Les Echos", "Le Figaro", "ADEME", "Ministère du Logement", "data.gouv.fr"].map(s => (
                <span key={s} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 6, border: "1px solid var(--c-border)", color: "var(--c-text-muted)" }}>{s}</span>
              ))}
            </div>
          </div>
        </div>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     PAPERWORK
  ═══════════════════════════════════════════════════ */
  if (currentView === "paperwork") {
    const steps = [
      { num: 1, title: "Recherche et visite",      desc: "Trouvez votre bien, vérifiez le score d'équité, planifiez la visite directement avec le vendeur",          status: "ready" },
      { num: 2, title: "Offre d'achat",             desc: "Rédigez et envoyez votre offre — modèle pré-rempli avec les données DVF du quartier",                      status: "ready" },
      { num: 3, title: "Compromis de vente",        desc: "Générez le compromis avec toutes les clauses suspensives. Délai de rétractation : 10 jours",                status: "ready" },
      { num: 4, title: "Diagnostics obligatoires",  desc: "Checklist complète : DPE, amiante, plomb, termites, ERP, mesurage Carrez, assainissement",                 status: "info" },
      { num: 5, title: "Financement",               desc: "Comparateur de prêts intégré, simulation de mensualités, dossier bancaire pré-rempli",                      status: "info" },
      { num: 6, title: "Notaire",                   desc: "Annuaire de notaires par commune, estimation des frais, suivi du délai (2-3 mois)",                         status: "info" },
      { num: 7, title: "Acte authentique",          desc: "Signature chez le notaire, remise des clés. Documents archivés dans votre espace",                          status: "done" },
    ];
    return (
      <div style={{ fontFamily: "var(--font-body)", minHeight: "100vh", background: "var(--c-bg)", color: "var(--c-text)" }}>
        <style>{STYLE_TAG}</style>
        <NavBar currentView={currentView} setCurrentView={setCurrentView} sessionUser={sessionUser} onOpenAuth={() => setShowAuthModal(true)} />
        <div style={{ padding: "36px 32px", maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 40, height: 1, background: "var(--c-blue)" }} />
            <span style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: "var(--c-blue)", fontWeight: 600 }}>Parcours complet</span>
          </div>
          <h2 style={{ fontSize: 36, fontWeight: 800, fontFamily: "var(--font-display)", letterSpacing: "-0.02em", marginBottom: 8 }}>Démarches d'achat</h2>
          <p style={{ fontSize: 14, color: "var(--c-text-muted)", marginBottom: 40 }}>Tout le parcours, étape par étape — sans agence, avec les bons documents</p>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 21, top: 24, bottom: 24, width: 2, background: "linear-gradient(to bottom, var(--c-blue), var(--c-gold), var(--c-green))", borderRadius: 2, opacity: 0.3 }} />
            {steps.map((s, i) => {
              const colors = { ready: { bg: "var(--c-blue-glow)", border: "var(--c-blue)", text: "var(--c-blue)" }, info: { bg: "var(--c-surface)", border: "var(--c-border)", text: "var(--c-text-muted)" }, done: { bg: "rgba(52,211,153,0.1)", border: "var(--c-green)", text: "var(--c-green)" } }[s.status];
              return (
                <div key={i} style={{ display: "flex", gap: 20, marginBottom: 24, position: "relative", animation: `fadeUp 0.5s var(--ease-out-expo) ${i * 0.08}s both` }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, fontFamily: "var(--font-display)", background: colors?.bg, color: colors?.text, border: `2px solid ${colors?.border}` }}>{s.num}</div>
                  <div style={{ paddingTop: 4 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, fontFamily: "var(--font-display)" }}>{s.title}</div>
                    <div style={{ fontSize: 13, color: "var(--c-text-muted)", lineHeight: 1.6 }}>{s.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 32, padding: 24, borderRadius: 12, background: "var(--c-blue-glow)", border: "1px solid rgba(37,99,235,0.2)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, fontFamily: "var(--font-display)" }}>Documents générés automatiquement</div>
            <div style={{ fontSize: 13, color: "var(--c-text-muted)", lineHeight: 1.7 }}>
              Offre d'achat · Compromis de vente · Checklist diagnostics · Simulation de prêt · Lettre au notaire · État des lieux · Procuration · Attestation de propriété
            </div>
          </div>
        </div>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    );
  }

  return null;
}
