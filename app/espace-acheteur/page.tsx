"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock, CheckCircle2, Circle, FileText, ShieldCheck,
  KeyRound, AlertTriangle, Home, ChevronRight,
} from "lucide-react";

/* ── Countdown helper ────────────────────────────────────────────────────── */
function formatMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
    expired: ms <= 0,
  };
}

/* ── Countdown cell ──────────────────────────────────────────────────────── */
function Cell({ value, label, urgent }: { value: number; label: string; urgent: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shadow-md transition-colors duration-1000 ${
        urgent ? "bg-red-500 shadow-red-200" : "bg-[#1E3A8A] shadow-blue-200"
      }`}>
        <span className="text-2xl sm:text-4xl font-black text-white tabular-nums">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{label}</span>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function EspaceAcheteur() {
  /* Real-time clock — ticks every second */
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  /* User enters the date the compromis was signed */
  const [compromisDate, setCompromisDate] = useState("");

  /* Compute remaining SRU time from Date.now() */
  const sruDeadline  = compromisDate
    ? new Date(compromisDate).getTime() + 10 * 24 * 60 * 60 * 1000
    : null;
  const sruMs        = sruDeadline !== null ? Math.max(0, sruDeadline - now) : null;
  const sru          = sruMs !== null ? formatMs(sruMs) : null;
  const sruActive    = sruMs !== null;
  const sruProgress  = sruMs !== null ? (sruMs / (10 * 24 * 60 * 60 * 1000)) * 100 : 100;
  const urgent       = sruMs !== null && sruMs < 2 * 24 * 60 * 60 * 1000;   // < 2 days
  const warning      = sruMs !== null && sruMs < 5 * 24 * 60 * 60 * 1000;   // < 5 days

  /* Border + bg of the SRU card */
  const cardBorder = sru?.expired ? "border-red-300 bg-red-50"
    : urgent  ? "border-red-200 bg-red-50"
    : warning ? "border-orange-200 bg-orange-50"
    : sruActive ? "border-emerald-200 bg-emerald-50"
    :             "border-slate-200 bg-white/80";

  /* Progress bar color */
  const barColor = sru?.expired ? "bg-red-500"
    : urgent  ? "bg-red-500"
    : warning ? "bg-orange-500"
    :           "bg-emerald-500";

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Bonjour, Marie</h1>
        <p className="text-slate-500 mt-1 font-medium">
          Suivi de votre acquisition · Protection légale garantie
        </p>
      </div>

      {/* ── Active offer summary ── */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-lg shadow-slate-200/40 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Home className="w-5 h-5 text-[#1E3A8A]" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Offre en cours</p>
            <p className="text-lg font-black text-slate-900">Appartement · Paris 11e</p>
          </div>
          <span className="ml-auto text-xs font-bold px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full">
            En attente vendeur
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          {[
            { label: "Prix proposé", value: "418 000 €" },
            { label: "Validité",     value: "8 jours"   },
            { label: "FairScore™",   value: "82 / 100"  },
          ].map(item => (
            <div key={item.label}>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">{item.label}</p>
              <p className="text-lg font-black text-slate-900 mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SRU COUNTDOWN — Critical legal feature
      ══════════════════════════════════════════ */}
      <div className={`border-2 rounded-2xl p-6 space-y-5 backdrop-blur-xl shadow-lg transition-colors duration-500 ${cardBorder}`}>

        {/* Card header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Clock className={`w-5 h-5 ${sru?.expired ? "text-red-600" : urgent ? "text-red-500" : sruActive ? "text-orange-600" : "text-slate-500"}`} />
              <p className="text-lg font-black text-slate-900">Délai de rétractation SRU</p>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Art. L271-1 Code de la Construction et de l'Habitation · 10 jours après signature du compromis
            </p>
          </div>
          <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-full ${
            sru?.expired ? "bg-red-200 text-red-800"
            : urgent     ? "bg-red-100 text-red-700"
            : warning    ? "bg-orange-100 text-orange-700"
            : sruActive  ? "bg-emerald-100 text-emerald-700"
            :              "bg-slate-100 text-slate-500"
          }`}>
            {sru?.expired ? "EXPIRÉ"
              : urgent    ? "URGENT"
              : sruActive ? "EN COURS"
              :             "Non démarré"}
          </span>
        </div>

        {/* Compromis date input */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Date de signature du compromis
          </label>
          <input
            type="date"
            value={compromisDate}
            max={new Date().toISOString().split("T")[0]}
            onChange={e => setCompromisDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
          />
        </div>

        {/* Live countdown */}
        {sru && !sru.expired && (
          <>
            <div className="flex gap-3 justify-center py-2">
              <Cell value={sru.d} label="Jours"  urgent={urgent} />
              <Cell value={sru.h} label="Heures" urgent={false}  />
              <Cell value={sru.m} label="Min"    urgent={false}  />
              <Cell value={sru.s} label="Sec"    urgent={false}  />
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-medium">
                <span>Début du délai</span>
                <span>{sru.d}j {sru.h}h restants</span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-1000 ${barColor}`}
                  style={{ width: `${sruProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
                <span>
                  {compromisDate
                    ? new Date(compromisDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
                    : "—"}
                </span>
                <span>
                  {sruDeadline
                    ? new Date(sruDeadline).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
                    : "—"}
                </span>
              </div>
            </div>

            {/* Legal info */}
            <div className="flex items-start gap-2.5 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
              <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${urgent ? "text-red-500" : "text-amber-500"}`} />
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {urgent
                  ? "Délai critique — moins de 2 jours restants. Envoyez votre rétractation immédiatement si vous souhaitez vous désister."
                  : "Vous pouvez vous rétracter "}
                {!urgent && (
                  <>
                    <strong>sans frais ni pénalités</strong> avant l'expiration de ce délai.
                    Envoyez votre rétractation par <strong>lettre recommandée avec avis de réception (LRAR)</strong>.
                  </>
                )}
              </p>
            </div>
          </>
        )}

        {/* Expired state */}
        {sru?.expired && (
          <div className="flex items-start gap-2.5 bg-red-100 border border-red-200 rounded-xl px-4 py-4">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-800 font-black">Délai de rétractation expiré</p>
              <p className="text-xs text-red-700 font-medium mt-1">
                Le délai SRU est écoulé. Vous êtes légalement engagé dans cette transaction.
                Consultez votre notaire pour connaître vos options.
              </p>
            </div>
          </div>
        )}

        {/* Not started yet */}
        {!sruActive && (
          <p className="text-center text-sm text-slate-400 font-medium">
            Renseignez la date de signature du compromis pour démarrer le chronomètre légal.
          </p>
        )}
      </div>

      {/* ── Transaction timeline ── */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-lg shadow-slate-200/40 rounded-2xl p-6">
        <h2 className="text-lg font-black text-slate-900 mb-5">Parcours d'acquisition</h2>
        <div className="space-y-3">
          {[
            {
              icon: FileText, label: "Offre d'achat",
              desc: "Envoyée · En attente de réponse du vendeur",
              done: true, active: false,
            },
            {
              icon: ShieldCheck, label: "Compromis de vente",
              desc: "Délai SRU 10 jours · Conditions suspensives",
              done: false, active: sruActive && !(sru?.expired ?? false),
            },
            {
              icon: KeyRound, label: "Acte authentique",
              desc: "Signature chez le notaire · Remise des clés",
              done: false, active: false,
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                item.done   ? "bg-emerald-50 border-emerald-200"
                : item.active ? "bg-blue-50 border-blue-200"
                :               "bg-slate-50 border-slate-100"
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  item.done   ? "bg-emerald-100"
                  : item.active ? "bg-blue-100"
                  :               "bg-slate-100"
                }`}>
                  {item.done
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    : <Icon className={`w-5 h-5 ${item.active ? "text-blue-600" : "text-slate-400"}`} />
                  }
                </div>
                <div className="flex-1">
                  <p className={`font-bold text-sm ${
                    item.done ? "text-emerald-800" : item.active ? "text-blue-900" : "text-slate-400"
                  }`}>{item.label}</p>
                  <p className={`text-xs mt-0.5 ${
                    item.done ? "text-emerald-600" : item.active ? "text-blue-600" : "text-slate-400"
                  }`}>{item.desc}</p>
                </div>
                {item.active && (
                  <span className="text-xs font-bold px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full animate-pulse shrink-0">
                    En cours
                  </span>
                )}
                {item.done && (
                  <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full shrink-0">
                    Fait ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Document status ── */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-lg shadow-slate-200/40 rounded-2xl p-6">
        <h2 className="text-lg font-black text-slate-900 mb-5">Documents acheteur</h2>
        <div className="space-y-2">
          {[
            { label: "Pièce d'identité",     done: false },
            { label: "Justificatif d'état civil", done: false },
            { label: "Fiche d'état civil",    done: false },
            { label: "Preuve de financement", done: false },
          ].map((item, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
              item.done ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-100"
            }`}>
              {item.done
                ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                : <Circle       className="w-4 h-4 text-slate-400 shrink-0" />
              }
              <span className={`text-sm font-medium ${item.done ? "text-emerald-800" : "text-slate-500"}`}>
                {item.label}
              </span>
              {!item.done && (
                <span className="ml-auto text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                  À téléverser
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA to full wizard ── */}
      <div className="text-center pb-4">
        <p className="text-sm text-slate-400 mb-3">
          Gérez l'offre, les documents et l'acte définitif via l'assistant complet
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
        >
          Accéder à l'assistant d'achat <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
