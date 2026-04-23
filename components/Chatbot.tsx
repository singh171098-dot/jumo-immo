"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";

/* ── Types ───────────────────────────────────────────────────────────────── */
interface Message {
  id: string;
  role: "assistant" | "user";
  text: string;
}

/* ── Knowledge base ──────────────────────────────────────────────────────── */
const KB: { patterns: string[]; answer: string }[] = [
  {
    patterns: ["bonjour", "salut", "hello", "bonsoir", "coucou", "hi"],
    answer:
      "Bonjour ! Je peux répondre à vos questions sur l'achat, la vente, le FairScore DVF, le DPE, les démarches juridiques ou la carte interactive. Par où commencer ?",
  },
  {
    patterns: ["fairscore", "fair score", "score dvf", "prix juste", "dvf", "indice"],
    answer:
      "Le FairScore™ compare chaque bien aux ventes officielles DVF (28,4 M de transactions). Score ≥ 80 = Prix juste · 65–79 = Prix du marché · < 65 = Surévalué. Il est calculé automatiquement sur chaque annonce.",
  },
  {
    patterns: ["commission", "frais agence", "frais d'agence", "gratuit", "tarif", "cout", "coût"],
    answer:
      "Jumo-Immo est 100 % gratuit — 0 % de commission. Sur un bien à 350 000 €, vous économisez en moyenne 17 500 € de frais d'agence par rapport à une agence traditionnelle.",
  },
  {
    patterns: ["vendre", "vendeur", "publier annonce", "mettre en vente", "publication"],
    answer:
      "Pour vendre : Espace Vendeur → Publier une annonce. Remplissez titre, type, ville, prix, surface et DPE. Votre annonce est en ligne en 2 minutes avec un FairScore DVF généré automatiquement.",
  },
  {
    patterns: ["acheter", "achat", "trouver", "chercher", "rechercher", "annonce"],
    answer:
      "Parcourez la carte 3D ou la liste des annonces. Chaque fiche affiche le FairScore, l'historique des prix et l'analyse DVF du quartier. Filtrez par Prix juste, À négocier ou Surévalué.",
  },
  {
    patterns: ["dpe", "energie", "énergie", "energetique", "énergétique", "classe", "diagnostic", "f g"],
    answer:
      "Le DPE (A → G) mesure la consommation énergétique. Les biens G sont progressivement interdits à la location depuis 2025. Sur chaque annonce, notre calculateur estime le coût de rénovation et les aides MaPrimeRénov disponibles.",
  },
  {
    patterns: ["maprimere", "maprimerenov", "aide", "subvention", "travaux", "renovation", "rénovation", "cee", "eco-ptz"],
    answer:
      "Aides disponibles : MaPrimeRénov (jusqu'à 50 % du coût), CEE, Éco-PTZ jusqu'à 50 000 €, TVA à 5,5 %. Le calculateur énergétique sur chaque annonce intègre toutes ces aides dans l'estimation du reste à charge.",
  },
  {
    patterns: ["compromis", "sru", "retractation", "rétractation", "delai", "délai", "10 jours"],
    answer:
      "Après signature du compromis, l'acheteur dispose de 10 jours SRU pour se rétracter sans frais (art. L271-1 CCH). Notre assistant juridique inclut un compte à rebours en temps réel et tous les modèles de documents.",
  },
  {
    patterns: ["notaire", "acte", "frais notaire", "authentique", "signature finale"],
    answer:
      "Les frais de notaire représentent 7–8 % du prix (dont 5,8 % de droits de mutation). Notre calculateur de prorata de taxe foncière est intégré à l'étape Acte Définitif de l'assistant juridique.",
  },
  {
    patterns: ["pret", "prêt", "credit", "crédit", "financement", "hypotheque", "hypothèque", "banque"],
    answer:
      "La condition suspensive de prêt vous accorde 11 jours minimum après le compromis pour sécuriser votre financement. Notre assistant juridique suit ce délai automatiquement avec un compte à rebours.",
  },
  {
    patterns: ["carte", "map", "mapbox", "3d", "localisation", "quartier", "ville"],
    answer:
      "La carte 3D (Mapbox) affiche tous les biens avec leur prix en temps réel. Les biens au prix juste apparaissent en vert. Recherchez n'importe quelle ville ou adresse française via la barre de recherche intégrée.",
  },
  {
    patterns: ["particulier", "sans intermediaire", "sans intermédiaire", "direct", "agence"],
    answer:
      "Jumo-Immo met directement en relation acheteurs et vendeurs — zéro intermédiaire. Messagerie directe, modèles juridiques inclus, et FairScore DVF pour une négociation parfaitement éclairée.",
  },
  {
    patterns: ["contact", "contacter", "joindre", "message", "appel", "telephone"],
    answer:
      "Sur chaque annonce, cliquez « Contacter le vendeur » ou « Faire une offre » pour entrer directement en relation avec le vendeur. Aucun filtre ni délai.",
  },
  {
    patterns: ["merci", "parfait", "super", "genial", "génial", "excellent", "nickel", "top"],
    answer: "Avec plaisir ! N'hésitez pas si vous avez d'autres questions. Bonne recherche sur Jumo-Immo 🏡",
  },
  {
    patterns: ["aide", "help", "comment", "fonctionnement", "comment ca marche", "comment ça marche"],
    answer:
      "Je peux vous renseigner sur : le FairScore DVF · les annonces · la vente entre particuliers · le DPE et la rénovation · le compromis et les délais légaux · les frais de notaire. Quel sujet vous intéresse ?",
  },
];

function matchResponse(input: string): string {
  const normalise = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const q = normalise(input);
  for (const { patterns, answer } of KB) {
    if (patterns.some(p => q.includes(normalise(p)))) return answer;
  }
  return "Je ne suis pas certain de comprendre. Pouvez-vous reformuler ? Je peux vous aider sur l'achat, la vente, le FairScore, le DPE ou les démarches d'acquisition.";
}

/* ── Quick suggestions ───────────────────────────────────────────────────── */
const SUGGESTIONS = [
  "Qu'est-ce que le FairScore ?",
  "Comment vendre mon bien ?",
  "DPE et aides à la rénovation",
];

/* ── Typing dots ─────────────────────────────────────────────────────────── */
function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 0" }}>
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(37,99,235,0.7)", display: "block" }}
          animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function Chatbot() {
  const [open, setOpen]       = useState(false);
  const [messages, setMsgs]   = useState<Message[]>([
    { id: "init", role: "assistant", text: "Bonjour ! Je suis l'assistant Jumo-Immo. Comment puis-je vous aider aujourd'hui ?" },
  ]);
  const [input, setInput]     = useState("");
  const [typing, setTyping]   = useState(false);
  const [suggested, setSuggested] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  /* Auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  /* Focus input when opening */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 280);
  }, [open]);

  const send = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;
    setSuggested(false);
    setInput("");

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text: trimmed };
    setMsgs(prev => [...prev, userMsg]);
    setTyping(true);

    setTimeout(() => {
      setTyping(false);
      const reply: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: matchResponse(trimmed),
      };
      setMsgs(prev => [...prev, reply]);
    }, 750 + Math.random() * 500);
  }, [typing]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); send(input); };

  /* ── Styles ─────────────────────────────────────────────────────────────── */
  const WINDOW_STYLE: React.CSSProperties = {
    position: "fixed",
    bottom: 92,
    right: 24,
    zIndex: 9999,
    width: "min(370px, calc(100vw - 32px))",
    height: "min(540px, calc(100dvh - 120px))",
    display: "flex",
    flexDirection: "column",
    background: "rgba(5, 9, 20, 0.96)",
    backdropFilter: "blur(28px) saturate(2)",
    WebkitBackdropFilter: "blur(28px) saturate(2)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 22,
    boxShadow: "0 40px 100px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.06)",
    overflow: "hidden",
  };

  return (
    <>
      {/* ── Chat window ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            style={WINDOW_STYLE}
            initial={{ opacity: 0, scale: 0.82, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.86, y: 12 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div style={{
              padding: "13px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", gap: 11,
              background: "linear-gradient(135deg, rgba(37,99,235,0.18) 0%, rgba(16,185,129,0.08) 100%)",
              flexShrink: 0,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                background: "linear-gradient(135deg, #1E40AF, #059669)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 18px rgba(37,99,235,0.45)",
              }}>
                <Sparkles size={17} color="#fff" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#E8ECF4", fontFamily: "-apple-system,sans-serif", letterSpacing: "-0.01em" }}>
                  Assistant Jumo-Immo
                </div>
                <div style={{ fontSize: 11, color: "#10B981", display: "flex", alignItems: "center", gap: 5, marginTop: 1, fontFamily: "-apple-system,sans-serif" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block", boxShadow: "0 0 6px #10B981" }} />
                  En ligne · Données DVF officielles
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  color: "rgba(255,255,255,0.45)", transition: "all 0.18s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 13px", display: "flex", flexDirection: "column", gap: 9 }}>
              <AnimatePresence initial={false}>
                {messages.map(m => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}
                  >
                    <div style={{
                      maxWidth: "82%",
                      padding: "10px 14px",
                      borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
                      background: m.role === "user"
                        ? "linear-gradient(135deg, #2563EB, #1D4ED8)"
                        : "rgba(255,255,255,0.06)",
                      border: m.role === "assistant" ? "1px solid rgba(255,255,255,0.09)" : "none",
                      color: "#DDE4F0",
                      fontSize: 13,
                      lineHeight: 1.58,
                      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
                      boxShadow: m.role === "user" ? "0 4px 18px rgba(37,99,235,0.35)" : "none",
                      letterSpacing: "0.01em",
                    }}>
                      {m.text}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              <AnimatePresence>
                {typing && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    style={{ display: "flex", justifyContent: "flex-start" }}
                  >
                    <div style={{
                      padding: "10px 16px",
                      borderRadius: "4px 18px 18px 18px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.09)",
                    }}>
                      <TypingDots />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={bottomRef} />
            </div>

            {/* Quick suggestions — only shown once at the start */}
            <AnimatePresence>
              {suggested && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ padding: "0 13px 10px", display: "flex", flexWrap: "wrap", gap: 6, flexShrink: 0 }}
                >
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      style={{
                        padding: "5px 11px", borderRadius: 20,
                        background: "rgba(37,99,235,0.12)",
                        border: "1px solid rgba(37,99,235,0.28)",
                        color: "#93B4FF", fontSize: 11, fontWeight: 600,
                        cursor: "pointer", fontFamily: "-apple-system,sans-serif",
                        letterSpacing: "0.01em", transition: "all 0.18s ease",
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(37,99,235,0.22)"; e.currentTarget.style.borderColor = "rgba(37,99,235,0.5)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(37,99,235,0.12)"; e.currentTarget.style.borderColor = "rgba(37,99,235,0.28)"; }}
                    >
                      {s}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input bar */}
            <form
              onSubmit={handleSubmit}
              style={{
                borderTop: "1px solid rgba(255,255,255,0.07)",
                padding: "10px 12px",
                display: "flex", gap: 8, alignItems: "center",
                background: "rgba(255,255,255,0.02)",
                flexShrink: 0,
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Posez votre question…"
                disabled={typing}
                style={{
                  flex: 1, background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 14, padding: "9px 14px",
                  color: "#E8ECF4", fontSize: 13,
                  fontFamily: "-apple-system,sans-serif",
                  outline: "none", transition: "border 0.18s ease",
                  minWidth: 0,
                }}
                onFocus={e => { e.currentTarget.style.borderColor = "rgba(37,99,235,0.5)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
              />
              <motion.button
                type="submit"
                disabled={!input.trim() || typing}
                whileTap={{ scale: 0.9 }}
                style={{
                  width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                  background: input.trim() && !typing
                    ? "linear-gradient(135deg, #2563EB, #1D4ED8)"
                    : "rgba(255,255,255,0.07)",
                  border: "none", cursor: input.trim() && !typing ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.2s ease",
                  boxShadow: input.trim() && !typing ? "0 4px 14px rgba(37,99,235,0.4)" : "none",
                }}
              >
                <Send size={15} color={input.trim() && !typing ? "#fff" : "rgba(255,255,255,0.3)"} />
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FAB button ── */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? "Fermer le chat" : "Ouvrir l'assistant Jumo-Immo"}
        style={{
          position: "fixed",
          bottom: 24, right: 24,
          zIndex: 9999,
          width: 58, height: 58,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #1E3A8A 0%, #2563EB 60%, #059669 100%)",
          border: "none",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: open
            ? "0 8px 32px rgba(37,99,235,0.5), 0 0 0 2px rgba(37,99,235,0.25)"
            : "0 8px 28px rgba(37,99,235,0.45)",
          outline: "none",
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        animate={!open ? {
          boxShadow: [
            "0 8px 28px rgba(37,99,235,0.45)",
            "0 8px 44px rgba(37,99,235,0.7)",
            "0 8px 28px rgba(37,99,235,0.45)",
          ],
        } : {}}
        transition={!open ? { duration: 2.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0.15 }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <X size={22} color="#fff" />
            </motion.span>
          ) : (
            <motion.span
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <MessageCircle size={24} color="#fff" fill="rgba(255,255,255,0.15)" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
