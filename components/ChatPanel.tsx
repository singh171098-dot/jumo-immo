"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageCircle, Loader2 } from "lucide-react";
import { sendMessage, getConversation } from "@/app/actions/messaging";
import type { MessageDTO } from "@/app/actions/messaging";

/* ── Props ───────────────────────────────────────────────────────────────── */
export interface ChatPanelProps {
  propertyId:      string;
  otherUserId:     string;
  otherUserName:   string;
  propertyTitle:   string;
  currentUserId:   string;
  currentUserName: string;
  isOpen:          boolean;
  onClose:         () => void;
}

/* ── Animation variants ──────────────────────────────────────────────────── */
const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.18 } },
};

const drawerVariants = {
  hidden:  { x: "100%" },
  visible: { x: 0, transition: { type: "spring" as const, stiffness: 320, damping: 32 } },
  exit:    { x: "100%", transition: { duration: 0.22, ease: "easeIn" as const } },
};

/* ── Typing dots ─────────────────────────────────────────────────────────── */
function TypingDots({ name }: { name: string }) {
  return (
    <div className="flex gap-2.5 items-end">
      <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-[11px] font-black shrink-0">
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="flex flex-col gap-1 items-start">
        <p className="text-[10px] text-gray-600 px-1">{name}</p>
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
  propertyId,
  otherUserId,
  otherUserName,
  propertyTitle,
  currentUserId,
  currentUserName,
  isOpen,
  onClose,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [body,     setBody]     = useState("");
  const [sending,  setSending]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  /* ── Fetch conversation ── */
  const fetchMessages = useCallback(async () => {
    const result = await getConversation(otherUserId, propertyId);
    if (result.success) setMessages(result.messages);
  }, [otherUserId, propertyId]);

  /* ── Mount + polling (5 s) ── */
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    fetchMessages().finally(() => setLoading(false));

    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [isOpen, fetchMessages]);

  /* ── Auto-scroll to latest ── */
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    return () => clearTimeout(t);
  }, [messages, isOpen]);

  /* ── Focus input when panel opens ── */
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  /* ── Send handler with optimistic update ── */
  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed || sending) return;

    const optimistic: MessageDTO = {
      id:         `optimistic-${Date.now()}`,
      body:       trimmed,
      createdAt:  new Date().toISOString(),
      senderId:   currentUserId,
      receiverId: otherUserId,
      isRead:     false,
    };

    setMessages(prev => [...prev, optimistic]);
    setBody("");
    setSending(true);

    const result = await sendMessage(otherUserId, propertyId, trimmed);

    if (result.success && result.message) {
      setMessages(prev =>
        prev.map(m => (m.id === optimistic.id ? result.message! : m)),
      );
    } else {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    }

    setSending(false);
  }

  const isMine = (msg: MessageDTO) => msg.senderId === currentUserId;

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="chat-backdrop"
            variants={backdropVariants}
            initial="hidden" animate="visible" exit="exit"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            key="chat-drawer"
            variants={drawerVariants}
            initial="hidden" animate="visible" exit="exit"
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-gray-950 border-l border-white/10 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 shrink-0 bg-gray-950/95 backdrop-blur-sm">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-sm font-black">
                  {otherUserName.charAt(0).toUpperCase()}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-gray-950" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">{otherUserName}</p>
                <p className="text-gray-500 text-xs truncate">{propertyTitle}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-white/[0.06] text-gray-400 hover:text-white transition shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

              {/* Loading skeleton */}
              {loading && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Loader2 size={22} className="text-gray-600 animate-spin" />
                  <p className="text-gray-600 text-xs">Chargement…</p>
                </div>
              )}

              {/* Empty state */}
              {!loading && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                    <MessageCircle size={24} className="text-gray-600" />
                  </div>
                  <p className="text-gray-500 text-sm font-medium">Aucun message</p>
                  <p className="text-gray-700 text-xs">Posez votre première question</p>
                </div>
              )}

              {/* Bubbles */}
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className={`flex gap-2.5 ${isMine(msg) ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div className={[
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-black",
                    isMine(msg)
                      ? "bg-emerald-600/20 text-emerald-400"
                      : "bg-blue-600/20 text-blue-400",
                  ].join(" ")}>
                    {(isMine(msg) ? currentUserName : otherUserName).charAt(0).toUpperCase()}
                  </div>
                  <div className={`max-w-[78%] flex flex-col gap-1 ${isMine(msg) ? "items-end" : "items-start"}`}>
                    <p className="text-[10px] text-gray-600 px-1">
                      {isMine(msg) ? currentUserName : otherUserName}
                    </p>
                    <div className={[
                      "px-3.5 py-2.5 rounded-2xl text-sm font-medium leading-relaxed",
                      isMine(msg)
                        ? "bg-blue-600 text-white rounded-tr-sm"
                        : "bg-white/[0.06] text-gray-200 rounded-tl-sm",
                      msg.id.startsWith("optimistic-") ? "opacity-60" : "",
                    ].join(" ")}>
                      {msg.body}
                    </div>
                    <p className="text-[9px] text-gray-700 px-1">{formatTime(msg.createdAt)}</p>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator while sending */}
              <AnimatePresence>
                {sending && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TypingDots name={otherUserName} />
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
                  disabled={sending}
                  placeholder={sending ? "Envoi en cours…" : "Écrivez un message…"}
                  className="flex-1 bg-white/[0.05] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition placeholder-gray-600 disabled:opacity-40"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !body.trim()}
                  className="p-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl transition active:scale-95 shrink-0"
                >
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
