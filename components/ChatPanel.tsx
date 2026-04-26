"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageCircle } from "lucide-react";

/* ── Types ───────────────────────────────────────────────────────────────── */
interface Msg {
  id: string;
  role: "buyer" | "seller";
  name: string;
  body: string;
  ts: Date;
}

interface ChatPanelProps {
  propertyId:    string;
  sellerName:    string;
  propertyTitle: string;
  isOpen:        boolean;
  onClose:       () => void;
}

/* ── Mock seller replies (cycled in order) ───────────────────────────────── */
const SELLER_REPLIES = [
  "Bonjour ! Merci pour votre message. Le bien est toujours disponible — êtes-vous disponible pour une visite cette semaine ?",
  "Les charges de copropriété s'élèvent à environ 150 €/mois. Le bien est libre à partir du mois prochain.",
  "Je peux organiser une visite en semaine ou le week-end. Quelle date vous conviendrait le mieux ?",
  "Le diagnostic DPE est en classe C, refait récemment. Les fenêtres ont été changées il y a 2 ans.",
  "N'hésitez pas si vous avez d'autres questions. Je suis disponible pour vous accompagner dans votre projet.",
];

let _replyIdx = 0;
function nextSellerReply() {
  return SELLER_REPLIES[_replyIdx++ % SELLER_REPLIES.length];
}

/* ── Animation variants ──────────────────────────────────────────────────── */
const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.18 } },
};

const drawerVariants = {
  hidden:  { x: "100%" },
  visible: {
    x: 0,
    transition: { type: "spring" as const, stiffness: 320, damping: 32 },
  },
  exit: {
    x: "100%",
    transition: { duration: 0.22, ease: "easeIn" as const },
  },
};

/* ── Typing indicator (3 animated dots) ─────────────────────────────────── */
function TypingIndicator({ sellerName }: { sellerName: string }) {
  return (
    <div className="flex gap-2.5 items-end">
      <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-[11px] font-black shrink-0">
        {sellerName.charAt(0).toUpperCase()}
      </div>
      <div className="flex flex-col gap-1 items-start">
        <p className="text-[10px] text-gray-600 px-1">{sellerName}</p>
        <div className="bg-white/[0.06] px-4 py-3.5 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
          {[0, 150, 300].map(delay => (
            <span
              key={delay}
              className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function ChatPanel({
  propertyId: _propertyId,
  sellerName,
  propertyTitle,
  isOpen,
  onClose,
}: ChatPanelProps) {
  const [messages,  setMessages]  = useState<Msg[]>([]);
  const [body,      setBody]      = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [nameSet,   setNameSet]   = useState(false);
  const [isTyping,  setIsTyping]  = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  /* Scroll to latest message or typing indicator */
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    return () => clearTimeout(t);
  }, [messages, isTyping, isOpen]);

  /* Focus the message input once name is confirmed */
  useEffect(() => {
    if (nameSet && isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [nameSet, isOpen]);

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed || !buyerName.trim() || isTyping) return;

    const buyerMsg: Msg = {
      id: crypto.randomUUID(),
      role: "buyer",
      name: buyerName.trim(),
      body: trimmed,
      ts: new Date(),
    };
    setMessages(prev => [...prev, buyerMsg]);
    setBody("");
    setIsTyping(true);

    await new Promise<void>(res => setTimeout(res, 1000));

    const sellerMsg: Msg = {
      id: crypto.randomUUID(),
      role: "seller",
      name: sellerName,
      body: nextSellerReply(),
      ts: new Date(),
    };
    setIsTyping(false);
    setMessages(prev => [...prev, sellerMsg]);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="chat-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* ── Drawer ── */}
          <motion.div
            key="chat-drawer"
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-gray-950 border-l border-white/10 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 shrink-0 bg-gray-950/95 backdrop-blur-sm">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-sm font-black">
                  {sellerName.charAt(0).toUpperCase()}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-gray-950" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">{sellerName}</p>
                <p className="text-gray-500 text-xs truncate">{propertyTitle}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-white/[0.06] text-gray-400 hover:text-white transition shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Name setup (shown only before first message) */}
            {!nameSet && (
              <div className="px-5 py-3 border-b border-white/10 bg-white/[0.02] shrink-0">
                <p className="text-gray-400 text-xs mb-2 font-medium">
                  Votre nom pour cette conversation
                </p>
                <div className="flex gap-2">
                  <input
                    value={buyerName}
                    onChange={e => setBuyerName(e.target.value)}
                    placeholder="Prénom Nom"
                    onKeyDown={e => e.key === "Enter" && buyerName.trim() && setNameSet(true)}
                    autoFocus
                    className="flex-1 bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition placeholder-gray-600"
                  />
                  <button
                    onClick={() => buyerName.trim() && setNameSet(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition"
                  >
                    OK
                  </button>
                </div>
              </div>
            )}

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

              {/* Empty state */}
              {messages.length === 0 && !isTyping && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                    <MessageCircle size={24} className="text-gray-600" />
                  </div>
                  <p className="text-gray-500 text-sm font-medium">Aucun message</p>
                  <p className="text-gray-700 text-xs">Posez votre première question au vendeur</p>
                </div>
              )}

              {/* Bubbles */}
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className={`flex gap-2.5 ${msg.role === "buyer" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div className={[
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-black",
                    msg.role === "seller"
                      ? "bg-blue-600/20 text-blue-400"
                      : "bg-emerald-600/20 text-emerald-400",
                  ].join(" ")}>
                    {msg.name.charAt(0).toUpperCase()}
                  </div>
                  <div className={`max-w-[78%] flex flex-col gap-1 ${msg.role === "buyer" ? "items-end" : "items-start"}`}>
                    <p className="text-[10px] text-gray-600 px-1">{msg.name}</p>
                    <div className={[
                      "px-3.5 py-2.5 rounded-2xl text-sm font-medium leading-relaxed",
                      msg.role === "buyer"
                        ? "bg-blue-600 text-white rounded-tr-sm"
                        : "bg-white/[0.06] text-gray-200 rounded-tl-sm",
                    ].join(" ")}>
                      {msg.body}
                    </div>
                    <p className="text-[9px] text-gray-700 px-1">
                      {msg.ts.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TypingIndicator sellerName={sellerName} />
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="px-5 py-4 border-t border-white/10 shrink-0">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                  disabled={!nameSet || isTyping}
                  placeholder={
                    !nameSet   ? "Entrez votre nom d'abord"
                    : isTyping ? "Le vendeur répond…"
                    :            "Écrivez un message…"
                  }
                  className="flex-1 bg-white/[0.05] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition placeholder-gray-600 disabled:opacity-40"
                />
                <button
                  onClick={handleSend}
                  disabled={!nameSet || !body.trim() || isTyping}
                  className="p-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl transition active:scale-95 shrink-0"
                >
                  <Send size={18} />
                </button>
              </div>
              <AnimatePresence>
                {isTyping && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-[10px] text-gray-600 mt-2 text-center"
                  >
                    {sellerName} est en train d&apos;écrire…
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
