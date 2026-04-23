"use client";
import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useRouter } from 'next/navigation';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Search, Loader2, MapPin } from 'lucide-react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

/* ── Geocoder types ──────────────────────────────────── */
interface GeoFeature {
  id: string;
  place_name: string;
  place_type: string[];
  geometry: { coordinates: [number, number] };
}
interface GeoResponse { features: GeoFeature[]; }

const TYPE_LABEL: Record<string, string> = {
  place: 'Ville', address: 'Adresse', poi: 'Lieu',
  region: 'Région', postcode: 'Code postal', district: 'Quartier', locality: 'Localité',
};

/* ── We now use the real DB Property shape instead of MockListing ── */
// But we still need a generic interface for the Map3D internal listing shape
interface MapListing {
  id: string;
  lat: number;
  lng: number;
  price: number;
  type: string;
  surface: number;
  rooms: number;
  dpe: string;
  city: string;
  fairScore: number; 
  cityAvgPerSqm: number; 
}

/* ── Helpers ─────────────────────────────────────────── */
const fmtShort = (p: number): string =>
  p >= 1_000_000
    ? `${(p / 1_000_000).toFixed(1).replace('.', ',')} M€`
    : `${Math.round(p / 1_000)} k€`;

const fmtFull = (p: number): string =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p);

const DPE_BG: Record<string, string> = {
  A: '#059669', B: '#10B981', C: '#84CC16',
  D: '#EAB308', E: '#F97316', F: '#EF4444', G: '#991B1B',
};

function injectPopupStyles() {
  if (document.getElementById('jumo-popup-styles')) return;
  const s = document.createElement('style');
  s.id = 'jumo-popup-styles';
  s.textContent = `
    .jumo-popup .mapboxgl-popup-content {
      padding: 0;
      background: transparent;
      border-radius: 16px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07);
      overflow: hidden;
    }
    .jumo-popup .mapboxgl-popup-tip { display: none; }
    .jumo-popup { z-index: 10; }
  `;
  document.head.appendChild(s);
}

/* Creates the floating price-tag marker DOM element */
function createMarkerEl(listing: MapListing): HTMLDivElement {
  const isFair = listing.fairScore >= 80;

  const root = document.createElement('div');
  root.style.cssText = [
    'cursor:pointer',
    'pointer-events:auto',
    'user-select:none',
    '-webkit-user-select:none',
  ].join(';');

  const inner = document.createElement('div');
  inner.style.cssText = [
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'transform-origin:bottom center',
    'transition:transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
  ].join(';');
  root.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.13)'; });
  root.addEventListener('mouseleave', () => { inner.style.transform = 'scale(1)'; });

  const pillBg     = isFair ? '#10B981' : 'rgba(8,13,28,0.94)';
  const pillShadow = isFair
    ? '0 4px 18px rgba(16,185,129,0.5),0 0 0 1px rgba(255,255,255,0.22)'
    : '0 4px 18px rgba(0,0,0,0.55),0 0 0 1px rgba(255,255,255,0.1)';

  const pill = document.createElement('div');
  pill.style.cssText = [
    `background:${pillBg}`,
    'color:#fff',
    'padding:5px 11px',
    'border-radius:20px',
    'font-family:-apple-system,sans-serif',
    'font-weight:700',
    'font-size:12px',
    'white-space:nowrap',
    'letter-spacing:-0.01em',
    `box-shadow:${pillShadow}`,
    'backdrop-filter:blur(10px)',
    '-webkit-backdrop-filter:blur(10px)',
  ].join(';');
  pill.textContent = fmtShort(listing.price);

  const dotBg   = isFair ? '#10B981' : 'rgba(255,255,255,0.45)';
  const dotRing = isFair ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.12)';
  const dot = document.createElement('div');
  dot.style.cssText = [
    'width:6px', 'height:6px', 'border-radius:50%', 'margin-top:3px',
    `background:${dotBg}`,
    `box-shadow:0 0 0 2.5px ${dotRing}`,
  ].join(';');

  inner.appendChild(pill);
  inner.appendChild(dot);
  root.appendChild(inner);
  return root;
}

/* Creates the popup card DOM element (pure DOM, no React) */
function createPopupContent(listing: MapListing, onNavigate: () => void): HTMLElement {
  const isFair = listing.fairScore >= 80;
  const scoreColor = listing.fairScore >= 80 ? '#10B981' : listing.fairScore >= 60 ? '#C8A55C' : '#EF4444';
  const scoreLabel = listing.fairScore >= 80 ? 'Prix juste' : listing.fairScore >= 60 ? 'À négocier' : 'Surévalué';
  const pricePerSqm = listing.price / listing.surface;
  
  // Guard against divide by zero if cityAvgPerSqm is somehow 0
  const diff = listing.cityAvgPerSqm > 0 
      ? Math.round(Math.abs((pricePerSqm - listing.cityAvgPerSqm) / listing.cityAvgPerSqm) * 100)
      : 0;

  /* Root card */
  const root = document.createElement('div');
  root.style.cssText = 'width:268px;background:#0B1120;color:#E8ECF4;font-family:-apple-system,sans-serif;overflow:hidden;';

  /* Hero */
  const heroBg = isFair
    ? 'linear-gradient(135deg,#064E3B 0%,#0B1120 100%)'
    : 'linear-gradient(135deg,#1a2440 0%,#0B1120 100%)';
  const hero = document.createElement('div');
  hero.style.cssText = `height:116px;background:${heroBg};display:flex;align-items:center;justify-content:center;font-size:44px;position:relative;`;
  hero.textContent = listing.type === 'Maison' ? '⌂' : '⊞';

  /* DPE badge */
  const dpe = document.createElement('span');
  dpe.style.cssText = `position:absolute;top:10px;right:10px;background:${DPE_BG[listing.dpe] ?? '#4A5568'};color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;letter-spacing:.04em;`;
  dpe.textContent = `DPE ${listing.dpe}`;
  hero.appendChild(dpe);

  /* Fair-price badge */
  if (isFair) {
    const fair = document.createElement('span');
    fair.style.cssText = 'position:absolute;top:10px;left:10px;background:rgba(16,185,129,0.18);color:#10B981;font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;border:1px solid rgba(16,185,129,0.35);letter-spacing:.03em;';
    fair.textContent = `↓ ${diff}% sous le marché`;
    hero.appendChild(fair);
  }

  /* Body */
  const body = document.createElement('div');
  body.style.cssText = 'padding:14px 16px 16px;';

  const priceEl = document.createElement('div');
  priceEl.style.cssText = 'font-size:21px;font-weight:800;letter-spacing:-.03em;margin-bottom:3px;color:#fff;';
  priceEl.textContent = fmtFull(listing.price);

  const meta = document.createElement('div');
  meta.style.cssText = 'font-size:12px;color:#7A8599;margin-bottom:10px;line-height:1.5;';
  meta.textContent = `${listing.type} · ${listing.surface} m² · ${listing.rooms} pièce${listing.rooms > 1 ? 's' : ''} · ${listing.city}`;

  /* FairScore row */
  const scoreRow = document.createElement('div');
  scoreRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;';
  const scoreLeft = document.createElement('span');
  scoreLeft.style.cssText = 'font-size:11px;color:#7A8599;';
  scoreLeft.textContent = 'Score d\'équité';
  const scorePill = document.createElement('span');
  scorePill.style.cssText = `font-size:11px;font-weight:700;color:${scoreColor};background:${scoreColor}1a;padding:2px 8px;border-radius:6px;border:1px solid ${scoreColor}40;`;
  scorePill.textContent = `${listing.fairScore}/100 — ${scoreLabel}`;
  scoreRow.appendChild(scoreLeft);
  scoreRow.appendChild(scorePill);

  const divider = document.createElement('div');
  divider.style.cssText = 'height:1px;background:rgba(255,255,255,0.06);margin-bottom:12px;';

  const btn = document.createElement('button');
  btn.style.cssText = 'width:100%;padding:11px;background:#2563EB;border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;letter-spacing:.01em;transition:background .18s ease;';
  btn.textContent = "Voir l'annonce →";
  btn.onmouseenter = () => { btn.style.background = '#1D4ED8'; };
  btn.onmouseleave = () => { btn.style.background = '#2563EB'; };
  btn.onclick = onNavigate;

  body.appendChild(priceEl);
  body.appendChild(meta);
  body.appendChild(scoreRow);
  body.appendChild(divider);
  body.appendChild(btn);

  root.appendChild(hero);
  root.appendChild(body);
  return root;
}

/* ── Component props / handle ────────────────────────── */
interface MapPropertyInput {
  id: string;
  title?: string;
  type?: string;
  price: number;
  surface: number;
  rooms: number;
  dpe?: string;
  city: string;
  fairScore?: number;
  cityAvgPerSqm?: number;
  lat?: number | null;
  lng?: number | null;
}
interface Map3DProps {
  fullscreen?: boolean;
  properties?: MapPropertyInput[];
}
export interface MapHandle { flyTo: (lng: number, lat: number) => void; }

/* ── Map3D ───────────────────────────────────────────── */
const Map3D = forwardRef<MapHandle, Map3DProps>(function Map3D({ fullscreen = false, properties = [] }, ref) {
  const router      = useRouter();
  const routerRef   = useRef(router);
  useEffect(() => { routerRef.current = router; }, [router]);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map          = useRef<mapboxgl.Map | null>(null);
  const markersRef   = useRef<mapboxgl.Marker[]>([]);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query,      setQuery]      = useState('');
  const [results,    setResults]    = useState<GeoFeature[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused,  setIsFocused]  = useState(false);

  /* Expose flyTo handle to parent */
  useImperativeHandle(ref, () => ({
    flyTo: (lng: number, lat: number) => {
      map.current?.flyTo({ center: [lng, lat], zoom: 16, pitch: 68, bearing: 25, duration: 3200, essential: true });
    },
  }));

  /* Map initialisation — runs once */
  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/standard',
      center: [2.3364, 48.8602], // Paris default
      zoom: 5.5, // Zoomed out to see all of France
      pitch: 45,
      bearing: -10,
      antialias: true,
    });

    map.current.on('style.load', () => {
      if (!map.current) return;

      /* Night mode + atmosphere */
      map.current.setConfigProperty('basemap', 'lightPreset', 'night');
      map.current.setConfigProperty('basemap', 'showPointsOfInterest', true);
      map.current.setFog({
        range: [0.5, 10],
        color: '#1a2040',
        'horizon-blend': 0.08,
        'high-color': '#0a0e24',
        'space-color': '#020408',
        'star-intensity': 0.85,
      });

      injectPopupStyles();
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, []);

  /* Marker Sync - Updates whenever 'properties' prop changes */
  useEffect(() => {
    if (!map.current) return;

    // Remove old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add new markers from database
    properties.forEach(p => {
      // Derive property type from title when not explicitly set
      const titleMatch = typeof p.title === 'string'
        ? p.title.match(/^(Appartement|Maison|Studio|Terrain|Villa|Loft)/i)
        : null;
      const resolvedType: string = p.type ?? (titleMatch ? titleMatch[1] : 'Appartement');

      const mapListing: MapListing = {
        id: p.id,
        lat: p.lat ?? 48.8602,   // Paris fallback for any missing coordinates
        lng: p.lng ?? 2.3364,
        price: p.price,
        type: resolvedType,
        surface: p.surface,
        rooms: p.rooms,
        dpe: p.dpe ?? 'C',
        city: p.city,
        fairScore: p.fairScore ?? 50,
        cityAvgPerSqm: p.cityAvgPerSqm ?? Math.round(p.price / p.surface),
      };

      const el = createMarkerEl(mapListing);

      const popupContent = createPopupContent(
        mapListing,
        () => routerRef.current.push(`/annonces/${mapListing.id}`)
      );

      const popup = new mapboxgl.Popup({
        closeButton: false,
        maxWidth: 'none',
        className: 'jumo-popup',
        offset: 16,
      }).setDOMContent(popupContent);

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([mapListing.lng, mapListing.lat])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

  }, [properties]); // Reruns whenever DB data changes

  /* Internal geocoder search (non-fullscreen mode) */
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (query.trim().length <= 2) { setResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const url = [
          'https://api.mapbox.com/geocoding/v5/mapbox.places/',
          encodeURIComponent(query),
          '.json?language=fr&country=fr',
          '&types=place,address,poi,region,district,locality',
          '&limit=6',
          `&access_token=${MAPBOX_TOKEN}`,
        ].join('');
        const res = await fetch(url);
        const data: GeoResponse = await res.json();
        setResults(data.features ?? []);
      } catch { setResults([]); }
      finally { setIsSearching(false); }
    }, 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [query]);

  const handleSelect = useCallback((feature: GeoFeature) => {
    const [lng, lat] = feature.geometry.coordinates;
    map.current?.flyTo({ center: [lng, lat], zoom: 15.5, pitch: 65, bearing: 20, duration: 2800 });
    setQuery(''); setResults([]); setIsFocused(false);
  }, []);

  const clearSearch = () => { setQuery(''); setResults([]); };

  const containerClass = fullscreen
    ? 'relative w-full h-full'
    : 'relative w-full h-[680px] rounded-2xl overflow-hidden shadow-2xl border border-slate-800';

  if (!MAPBOX_TOKEN) {
    return (
      <div className={`${containerClass} bg-slate-900 flex items-center justify-center`}>
        <p className="text-slate-400 text-lg font-medium">Veuillez configurer votre clé API Mapbox</p>
      </div>
    );
  }

  const showDropdown = isFocused && results.length > 0;

  return (
    <div className={containerClass}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Internal search + DVF badge — hidden in fullscreen hero mode */}
      {!fullscreen && (
        <>
          <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 w-full max-w-lg px-4">
            <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 px-4 py-3">
              {isSearching
                ? <Loader2 size={17} className="text-[#1E3A8A] shrink-0 animate-spin" />
                : <Search size={17} className="text-slate-400 shrink-0" />}
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 150)}
                placeholder="Rechercher une ville, adresse, commerce..."
                className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
              />
              {query && (
                <button
                  onMouseDown={e => e.preventDefault()}
                  onClick={clearSearch}
                  className="text-slate-300 hover:text-slate-500 transition-colors text-base leading-none px-1"
                  aria-label="Effacer la recherche"
                >×</button>
              )}
            </div>

            {showDropdown && (
              <ul className="mt-1.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/30 overflow-hidden">
                {results.map(feature => {
                  const typeKey   = feature.place_type?.[0] ?? '';
                  const typeLabel = TYPE_LABEL[typeKey] ?? typeKey;
                  const [name, ...context] = feature.place_name.split(', ');
                  return (
                    <li key={feature.id}>
                      <button
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => handleSelect(feature)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center shrink-0 transition-colors">
                          <MapPin size={13} className="text-[#1E3A8A]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
                          {context.length > 0 && (
                            <p className="text-xs text-slate-400 truncate">{context.join(', ')}</p>
                          )}
                        </div>
                        <span className="text-xs text-slate-300 shrink-0">{typeLabel}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="absolute bottom-12 left-5 bg-black/50 backdrop-blur-md p-4 rounded-xl shadow-xl z-10 border border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 bg-[#10B981] rounded-full animate-pulse" />
              <h3 className="font-black text-white text-sm">Radar DVF</h3>
            </div>
            <p className="text-xs text-slate-400 font-medium">Analyse des prix en temps réel</p>
          </div>
        </>
      )}
    </div>
  );
});

export default Map3D;