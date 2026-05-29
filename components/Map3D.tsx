"use client";
import {
  useEffect, useRef, useState, useCallback,
  forwardRef, useImperativeHandle,
} from 'react';
import { useRouter } from 'next/navigation';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Search, Loader2, MapPin } from 'lucide-react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

/* ── Source / Layer IDs ──────────────────────────────────────────────────── */
/* Kept as constants so setData() never has to rebuild anything             */
const SOURCE_ID  = 'jumo-props';
const LAYER_HEAT = 'heat-glow';
const LAYER_CLS  = 'clusters';
const LAYER_CLBL = 'cluster-label';
/* NOTE: unclustered points are now rendered as premium HTML DOM markers,   */
/* not as a WebGL symbol layer — see syncDomMarkers() below.                */

/* ── Geocoder types ──────────────────────────────────────────────────────── */
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

/* ── Internal listing shape (used for popup rendering) ──────────────────── */
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
  image?: string;
}

/* ── Formatters ──────────────────────────────────────────────────────────── */
const fmtShort = (p: number): string =>
  !p
    ? 'Prix sur demande'
    : p >= 1_000_000
    ? `${(p / 1_000_000).toFixed(1).replace('.', ',')} M€`
    : `${Math.round(p / 1_000)} k€`;

const fmtFull = (p: number): string =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p);

const DPE_BG: Record<string, string> = {
  A: '#059669', B: '#10B981', C: '#84CC16',
  D: '#EAB308', E: '#F97316', F: '#EF4444', G: '#991B1B',
};

/* ── Popup CSS (injected once) ───────────────────────────────────────────── */
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

/* ── Popup card DOM content ───────────────────────────────────────────────── */
function createPopupContent(listing: MapListing, onNavigate: () => void): HTMLElement {
  const isFair      = listing.fairScore >= 80;
  const scoreColor  = listing.fairScore > 0
    ? (listing.fairScore >= 80 ? '#10B981' : listing.fairScore >= 60 ? '#C8A55C' : '#EF4444')
    : '#6B7280';
  const scoreLabel  = listing.fairScore > 0
    ? (listing.fairScore >= 80 ? 'Prix juste' : listing.fairScore >= 60 ? 'À négocier' : 'Surévalué')
    : 'Non analysé';
  const pricePerSqm = listing.price / listing.surface;
  const diff = listing.cityAvgPerSqm > 0
    ? Math.round(Math.abs((pricePerSqm - listing.cityAvgPerSqm) / listing.cityAvgPerSqm) * 100)
    : 0;

  const root = document.createElement('div');
  root.style.cssText = 'width:268px;background:#0B1120;color:#E8ECF4;font-family:-apple-system,sans-serif;overflow:hidden;';

  const heroBg = isFair
    ? 'linear-gradient(135deg,#064E3B 0%,#0B1120 100%)'
    : 'linear-gradient(135deg,#1a2440 0%,#0B1120 100%)';
  const hero = document.createElement('div');

  if (listing.image) {
    hero.style.cssText = 'height:116px;position:relative;overflow:hidden;';
    const img = document.createElement('img');
    img.src = listing.image;
    img.alt = '';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    img.onerror = () => {
      img.remove();
      hero.style.background = heroBg;
      hero.style.display = 'flex';
      hero.style.alignItems = 'center';
      hero.style.justifyContent = 'center';
      hero.style.fontSize = '44px';
      hero.textContent = listing.type === 'Maison' ? '⌂' : '⊞';
    };
    hero.appendChild(img);
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,rgba(11,17,32,0.55) 100%);pointer-events:none;';
    hero.appendChild(overlay);
  } else {
    hero.style.cssText = `height:116px;background:${heroBg};display:flex;align-items:center;justify-content:center;font-size:44px;position:relative;`;
    hero.textContent = listing.type === 'Maison' ? '⌂' : '⊞';
  }

  const dpe = document.createElement('span');
  dpe.style.cssText = `position:absolute;top:10px;right:10px;background:${DPE_BG[listing.dpe] ?? '#4A5568'};color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;letter-spacing:.04em;`;
  dpe.textContent = `DPE ${listing.dpe}`;
  hero.appendChild(dpe);

  if (isFair) {
    const fair = document.createElement('span');
    fair.style.cssText = 'position:absolute;top:10px;left:10px;background:rgba(16,185,129,0.18);color:#10B981;font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;border:1px solid rgba(16,185,129,0.35);letter-spacing:.03em;';
    fair.textContent = `↓ ${diff}% sous le marché`;
    hero.appendChild(fair);
  }

  const body = document.createElement('div');
  body.style.cssText = 'padding:14px 16px 16px;';

  const priceEl = document.createElement('div');
  priceEl.style.cssText = 'font-size:21px;font-weight:800;letter-spacing:-.03em;margin-bottom:3px;color:#fff;';
  priceEl.textContent = fmtFull(listing.price);

  const meta = document.createElement('div');
  meta.style.cssText = 'font-size:12px;color:#7A8599;margin-bottom:10px;line-height:1.5;';
  meta.textContent = `${listing.type} · ${listing.surface} m² · ${listing.rooms} pièce${listing.rooms > 1 ? 's' : ''} · ${listing.city}`;

  const scoreRow = document.createElement('div');
  scoreRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;';
  const scoreLeft = document.createElement('span');
  scoreLeft.style.cssText = 'font-size:11px;color:#7A8599;';
  scoreLeft.textContent = "Score d'équité";
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

/* ── GeoJSON builder (unchanged) ────────────────────────────────────────── */
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
  images?: string[];
}

function buildGeoJson(properties: MapPropertyInput[]) {
  return {
    type: 'FeatureCollection' as const,
    features: properties.map(p => {
      const titleMatch = typeof p.title === 'string'
        ? p.title.match(/^(Appartement|Maison|Studio|Terrain|Villa|Loft)/i)
        : null;
      const type          = p.type ?? (titleMatch?.[1] ?? 'Appartement');
      const fairScore     = p.fairScore ?? 50;
      const cityAvgPerSqm = p.cityAvgPerSqm ?? Math.round(p.price / p.surface);

      return {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [p.lng ?? 2.3364, p.lat ?? 48.8602] as [number, number],
        },
        properties: {
          id: p.id,
          price: p.price,
          priceLabel: fmtShort(p.price),
          type,
          surface: p.surface,
          rooms: p.rooms,
          dpe: p.dpe ?? 'C',
          city: p.city,
          fairScore,
          cityAvgPerSqm,
          image: p.images?.[0] ?? "",
        },
      };
    }),
  };
}

/* ── Premium HTML DOM marker (replaces WebGL symbol layer) ──────────────── */
/* Hybrid rendering: WebGL = clusters, HTML = individual price pills        */
function createPremiumMarkerEl(
  priceLabel: string,
  fairScore: number,
  dpe: string,
  onClick: (e: MouseEvent) => void,
): HTMLDivElement {
  /* Background tint: brand blue for unscored external listings, DVF colour for native */
  const bg = fairScore <= 0
    ? 'rgba(30,58,138,0.85)'     // brand blue  — external / unscored
    : fairScore >= 80
    ? 'rgba(16,185,129,0.18)'    // emerald     — great deal
    : fairScore >= 65
    ? 'rgba(245,158,11,0.15)'    // amber       — at market
    : 'rgba(8,13,28,0.90)';      // dark        — overpriced

  const borderColor = fairScore <= 0
    ? 'rgba(59,130,246,0.45)'
    : fairScore >= 80
    ? 'rgba(16,185,129,0.42)'
    : fairScore >= 65
    ? 'rgba(245,158,11,0.32)'
    : 'rgba(255,255,255,0.12)';

  /* Root wrapper — Mapbox controls transform here; never override it */
  const root = document.createElement('div');
  root.style.cssText = [
    'cursor:pointer',
    'pointer-events:auto',
    'touch-action:manipulation',
    'user-select:none',
    '-webkit-user-select:none',
  ].join(';');

  /* Pill — all visual styling + hover animation lives on this inner element */
  const pill = document.createElement('div');
  pill.dataset.origBg     = bg;
  pill.dataset.origBorder = borderColor;
  pill.style.cssText = [
    `background:${bg}`,
    'backdrop-filter:blur(12px)',
    '-webkit-backdrop-filter:blur(12px)',
    'border-radius:14px',
    `border:1px solid ${borderColor}`,
    'padding:6px 10px',
    'display:flex',
    'align-items:center',
    'gap:5px',
    'box-shadow:0 8px 24px rgba(0,0,0,0.35),0 0 0 1px rgba(255,255,255,0.08)',
    'transition:transform 150ms cubic-bezier(0.34,1.56,0.64,1),box-shadow 150ms ease',
    'transform-origin:bottom center',
    'will-change:transform',
  ].join(';');

  /* Price label */
  const label = document.createElement('span');
  label.style.cssText = [
    'color:#ffffff',
    'font-family:-apple-system,system-ui,"Segoe UI",sans-serif',
    'font-size:13px',
    'font-weight:700',
    'letter-spacing:-0.01em',
    'white-space:nowrap',
    'line-height:1',
  ].join(';');
  label.textContent = priceLabel;

  /* DPE colour dot (top-right visual accent) */
  const dot = document.createElement('div');
  dot.style.cssText = [
    `background:${DPE_BG[dpe] ?? '#4A5568'}`,
    'width:7px',
    'height:7px',
    'border-radius:50%',
    'flex-shrink:0',
    'box-shadow:0 0 0 1.5px rgba(255,255,255,0.3)',
  ].join(';');

  /* Hover: scale + shadow lift on inner pill (Mapbox transform on root is untouched) */
  root.addEventListener('mouseenter', () => {
    pill.style.transform = 'scale(1.12) translateY(-1px)';
    pill.style.boxShadow = '0 14px 36px rgba(0,0,0,0.45),0 0 0 1px rgba(255,255,255,0.18)';
  });
  root.addEventListener('mouseleave', () => {
    pill.style.transform = 'scale(1) translateY(0)';
    /* Preserve active shadow if this pill is currently selected */
    if (pill.dataset.active === 'true') {
      pill.style.boxShadow = '0 12px 32px rgba(16,185,129,0.4),0 0 0 2px rgba(16,185,129,0.6)';
    } else {
      pill.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35),0 0 0 1px rgba(255,255,255,0.08)';
    }
  });

  root.addEventListener('click', onClick);

  pill.appendChild(label);
  pill.appendChild(dot);
  root.appendChild(pill);
  return root;
}

/* ── Component props / handle ────────────────────────────────────────────── */
interface Map3DProps {
  fullscreen?: boolean;
  properties?: MapPropertyInput[];
}
export interface MapHandle { flyTo: (lng: number, lat: number) => void; }

/* ── Map3D ───────────────────────────────────────────────────────────────── */
const Map3D = forwardRef<MapHandle, Map3DProps>(function Map3D(
  { fullscreen = false, properties = [] },
  ref,
) {
  const router    = useRouter();
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; }, [router]);

  const mapContainer       = useRef<HTMLDivElement>(null);
  const map                = useRef<mapboxgl.Map | null>(null);
  const popupRef           = useRef<mapboxgl.Popup | null>(null);
  const markersRef         = useRef<mapboxgl.Marker[]>([]);        // DOM marker pool
  const syncMarkersRef     = useRef<(() => void) | null>(null);    // callable from outside style.load
  const styleReady         = useRef(false);
  const pendingData        = useRef<ReturnType<typeof buildGeoJson> | null>(null);
  const debounceTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activePropertyIdRef = useRef<string | null>(null);         // selected property id
  const activeMarkerPillRef = useRef<HTMLDivElement | null>(null); // selected pill DOM element

  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState<GeoFeature[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused,   setIsFocused]   = useState(false);

  /* Expose flyTo to parent (unchanged) */
  useImperativeHandle(ref, () => ({
    flyTo: (lng: number, lat: number) => {
      map.current?.flyTo({ center: [lng, lat], zoom: 16, pitch: 68, bearing: 25, duration: 3200, essential: true });
    },
  }));

  /* ── Map init — runs once ────────────────────────────────────────────── */
  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/standard',
      center: [2.3364, 48.8602],
      zoom: 5.5,
      pitch: 45,
      bearing: -10,
      antialias: true,
    });
    map.current = m;

    m.on('style.load', () => {
      /* Night mode + atmosphere (unchanged) */
      m.setConfigProperty('basemap', 'lightPreset', 'night');
      m.setConfigProperty('basemap', 'showPointsOfInterest', true);
      m.setFog({
        range: [0.5, 10],
        color: '#1a2040',
        'horizon-blend': 0.08,
        'high-color': '#0a0e24',
        'space-color': '#020408',
        'star-intensity': 0.85,
      });
      injectPopupStyles();

      /* GeoJSON source — clustered (unchanged) */
      const initialGeoJson = pendingData.current ?? { type: 'FeatureCollection' as const, features: [] };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      m.addSource(SOURCE_ID, {
        type: 'geojson',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: initialGeoJson as any,
        cluster: true,
        clusterMaxZoom: 11,
        clusterRadius: 30,
        clusterProperties: {
          sum_fairScore: ['+', ['get', 'fairScore']],
          sum_price:     ['+', ['get', 'price']],
        },
      });

      /* ── Layer 1: Heat glow (unchanged) ── */
      m.addLayer({
        id:     LAYER_HEAT,
        type:   'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'step', ['get', 'fairScore'],
            '#EF4444',
            65, '#F59E0B',
            80, '#10B981',
          ],
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            4, 18, 10, 55, 14, 95,
          ],
          'circle-opacity': [
            'interpolate', ['linear'], ['zoom'],
            5, 0.18, 12, 0.09,
          ],
          'circle-blur': 1.4,
        },
      });

      /* ── Layer 2: Cluster circles (unchanged) ── */
      m.addLayer({
        id:     LAYER_CLS,
        type:   'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['/', ['get', 'sum_fairScore'], ['get', 'point_count']],
            '#EF4444', 65, '#F59E0B', 80, '#10B981',
          ],
          'circle-radius': [
            'step', ['get', 'point_count'],
            28, 4, 36, 12, 44,
          ],
          'circle-stroke-width': 3,
          'circle-stroke-color': 'rgba(255,255,255,0.88)',
          'circle-opacity': 0.95,
        },
      });

      /* ── Layer 3: Cluster labels (unchanged) ── */
      m.addLayer({
        id:     LAYER_CLBL,
        type:   'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': [
            'concat',
            ['to-string', ['get', 'point_count']], ' biens\n',
            ['to-string',
              ['round',
                ['/', ['/', ['get', 'sum_price'], ['get', 'point_count']], 1000],
              ],
            ], 'k€ moy.',
          ],
          'text-size': 11,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-line-height': 1.35,
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.15)',
          'text-halo-width': 0.5,
        },
      });

      /* ── Cluster click → zoom in (unchanged) ── */
      m.on('click', LAYER_CLS, e => {
        const features = m.queryRenderedFeatures(e.point, { layers: [LAYER_CLS] });
        if (!features.length) return;
        const clusterId = features[0].properties?.cluster_id as number;
        const coords    = (features[0].geometry as unknown as { coordinates: [number, number] }).coordinates;
        (m.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
          clusterId,
          (err, zoom) => {
            if (err || zoom == null) return;
            m.flyTo({ center: coords, zoom: zoom + 0.5, duration: 750, essential: true });
          },
        );
      });

      /* Cluster cursor */
      m.on('mouseenter', LAYER_CLS, () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', LAYER_CLS, () => { m.getCanvas().style.cursor = ''; });

      /* Clicking empty map background clears active marker + popup */
      m.on('click', () => {
        if (activeMarkerPillRef.current) {
          const prev = activeMarkerPillRef.current;
          prev.dataset.active    = 'false';
          prev.style.background  = prev.dataset.origBg     ?? '';
          prev.style.borderColor = prev.dataset.origBorder ?? '';
          prev.style.boxShadow   = '0 8px 24px rgba(0,0,0,0.35),0 0 0 1px rgba(255,255,255,0.08)';
          activeMarkerPillRef.current  = null;
          activePropertyIdRef.current  = null;
        }
        popupRef.current?.remove();
      });

      /* ── Hybrid pattern: DOM markers for unclustered points ─────────── */
      /* Called on moveend + zoomend — no per-frame updates                */
      function syncDomMarkers() {
        /* 1. Clear previous markers — prevent memory leaks */
        markersRef.current.forEach(mk => mk.remove());
        markersRef.current = [];
        /* Pill DOM ref is stale after clear — reset it; activePropertyIdRef stays */
        activeMarkerPillRef.current = null;

        /* 2. Query unclustered features from source                       */
        /* querySourceFeatures returns only currently-loaded tiles         */
        const features = m.querySourceFeatures(SOURCE_ID, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          filter: ['!', ['has', 'point_count']] as any,
        });

        /* 3. Deduplicate — querySourceFeatures can return the same        */
        /* feature across tile boundaries                                  */
        const seen = new Set<string>();

        features.forEach(feature => {
          if (!feature.properties || !feature.geometry) return;
          const props = feature.properties;
          const id    = props.id as string;
          if (!id || seen.has(id)) return;
          seen.add(id);

          const coords = (feature.geometry as unknown as { coordinates: [number, number] }).coordinates;

          /* 4. Build popup listing shape from feature properties */
          const listing: MapListing = {
            id,
            lat:           coords[1],
            lng:           coords[0],
            price:         props.price         as number,
            type:          props.type          as string,
            surface:       props.surface       as number,
            rooms:         props.rooms         as number,
            dpe:           props.dpe           as string,
            city:          props.city          as string,
            fairScore:     props.fairScore     as number,
            cityAvgPerSqm: props.cityAvgPerSqm as number,
            image:         (props.image as string) || undefined,
          };

          /* 5. Create premium glassmorphism pill element */
          const el = createPremiumMarkerEl(
            props.priceLabel as string,
            listing.fairScore,
            listing.dpe,
            (e: MouseEvent) => {
              e.stopPropagation();

              /* ── Active state: restore previous, activate current ── */
              if (activeMarkerPillRef.current) {
                const prev = activeMarkerPillRef.current;
                prev.dataset.active    = 'false';
                prev.style.background  = prev.dataset.origBg     ?? '';
                prev.style.borderColor = prev.dataset.origBorder ?? '';
                prev.style.boxShadow   = '0 8px 24px rgba(0,0,0,0.35),0 0 0 1px rgba(255,255,255,0.08)';
              }
              const pill = el.firstElementChild as HTMLDivElement;
              pill.dataset.active    = 'true';
              pill.style.background  = 'rgba(16,185,129,0.9)';
              pill.style.borderColor = 'rgba(16,185,129,0.7)';
              pill.style.boxShadow   = '0 12px 32px rgba(16,185,129,0.4),0 0 0 2px rgba(16,185,129,0.6)';
              activeMarkerPillRef.current = pill;
              activePropertyIdRef.current = id;

              const content = createPopupContent(listing, () => {
                routerRef.current.push(`/annonces/${listing.id}`);
                popupRef.current?.remove();
              });
              popupRef.current?.remove();
              popupRef.current = new mapboxgl.Popup({
                closeButton: false,
                maxWidth: 'none',
                className: 'jumo-popup',
                offset: 16,
              })
                .setLngLat(coords)
                .setDOMContent(content)
                .addTo(m);
            },
          );

          /* Re-apply active style if this property was selected before re-sync */
          if (id === activePropertyIdRef.current) {
            const pill = el.firstElementChild as HTMLDivElement;
            pill.dataset.active    = 'true';
            pill.style.background  = 'rgba(16,185,129,0.9)';
            pill.style.borderColor = 'rgba(16,185,129,0.7)';
            pill.style.boxShadow   = '0 12px 32px rgba(16,185,129,0.4),0 0 0 2px rgba(16,185,129,0.6)';
            activeMarkerPillRef.current = pill;
          }

          /* 6. Add Mapbox marker (anchor bottom so pill floats above pin) */
          const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat(coords)
            .addTo(m);

          markersRef.current.push(marker);
        });
      }

      /* Store reference so the data-sync effect can trigger a re-sync */
      syncMarkersRef.current = syncDomMarkers;

      /* Re-sync on every camera move end (covers both pan and zoom)       */
      m.on('moveend', syncDomMarkers);
      m.on('zoomend', syncDomMarkers);

      /* Initial sync — wait for map to finish its first full render      */
      m.once('idle', syncDomMarkers);

      styleReady.current = true;

      /* Apply data that arrived before style was ready */
      if (pendingData.current) {
        (m.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .setData(pendingData.current as any);
      }
    });

    m.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    return () => {
      /* Clean up DOM markers before destroying the map */
      markersRef.current.forEach(mk => mk.remove());
      markersRef.current = [];
      syncMarkersRef.current = null;
      popupRef.current?.remove();
      popupRef.current  = null;
      styleReady.current = false;
      m.remove();
      map.current = null;
    };
  }, []);

  /* ── Data sync — setData() only, no layer rebuild ───────────────────── */
  useEffect(() => {
    const geoJson = buildGeoJson(properties);
    pendingData.current = geoJson;
    if (!map.current || !styleReady.current) return;

    const src = map.current.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    src?.setData(geoJson as any);

    /* Re-sync DOM markers after source finishes processing new data */
    setTimeout(() => syncMarkersRef.current?.(), 300);
  }, [properties]);

  /* ── Internal geocoder search (unchanged) ───────────────────────────── */
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
        const res  = await fetch(url);
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
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none' }} />

      {/* Search bar + DVF legend — hidden in fullscreen hero mode */}
      {!fullscreen && (
        <>
          {/* Search */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 w-full max-w-lg px-4">
            <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 px-4 py-3">
              {isSearching
                ? <Loader2 size={17} className="text-[#1E3A8A] shrink-0 animate-spin" />
                : <Search  size={17} className="text-slate-400 shrink-0" />}
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

          {/* DVF legend + radar badge */}
          <div className="absolute bottom-12 left-5 z-10 space-y-2">
            <div className="bg-black/50 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 shadow-xl">
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-2">
                Prix vs DVF
              </p>
              <div className="flex flex-col gap-1">
                {[
                  { color: '#10B981', label: 'Sous le marché' },
                  { color: '#F59E0B', label: 'Prix du marché' },
                  { color: '#EF4444', label: 'Surévalué'      },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-[10px] text-slate-400 font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-black/50 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 shadow-xl">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 bg-[#10B981] rounded-full animate-pulse" />
                <h3 className="font-black text-white text-sm">Radar DVF</h3>
              </div>
              <p className="text-xs text-slate-400 font-medium">Analyse des prix en temps réel</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default Map3D;
