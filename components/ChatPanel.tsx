"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, MessageCircle } from "lucide-react";
import { sendMessage } from "../app/actions/communication";

interface MsgShape {
  id: string;
  senderName: string;
  senderRole: string;
  body: string;
  createdAt: string;
}

interface ChatPanelProps {
  propertyId: string;
  sellerName: string;
  propertyTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatPanel({
  propertyId,
  sellerName,
  propertyTitle,
  isOpen,
  onClose,
}: ChatPanelProps) {
  const [messages,  setMessages]  = useState<MsgShape[]>([]);
  const [body,      setBody]      = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [nameSet,   setNameSet]   = useState(false);
  const [sending,   setSending]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages/${propertyId}`);
      if (res.ok) setMessages(await res.json());
    } catch { /* ignore network errors */ }
  }, [propertyId]);

  /* Poll while panel is open */
  useEffect(() => {
    if (!isOpen) return;
    loadMessages();
    const id = setInterval(loadMessages, 3000);
    return () => clearInterval(id);
  }, [isOpen, loadMessages]);

  /* Scroll to latest message */
  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  async function handleSend() {
    if (!body.trim() || !buyerName.trim() || sending) return;
    setSending(true);
    await sendMessage(propertyId, buyerName, body.trim());
    setBody("");
    await loadMessages();
    setSending(false);
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Sliding panel */}
      <div
        className={[
          "fixed right-0 top-0 h-full w-full max-w-sm bg-gray-950 border-l border-white/10",
          "z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 shrink-0">
          <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-sm font-black shrink-0">
            {sellerName.charAt(0).toUpperCase()}
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

        {/* Name setup (first time) */}
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
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                <MessageCircle size={24} className="text-gray-600" />
              </div>
              <p className="text-gray-500 text-sm font-medium">Aucun message</p>
              <p className="text-gray-700 text-xs">Posez votre première question au vendeur</p>
            </div>
          )}
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.senderRole === "buyer" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className={[
                "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black",
                msg.senderRole === "seller"
                  ? "bg-blue-600/20 text-blue-400"
                  : "bg-emerald-600/20 text-emerald-400",
              ].join(" ")}>
                {msg.senderName.charAt(0).toUpperCase()}
              </div>
              <div className={`max-w-[78%] flex flex-col gap-1 ${msg.senderRole === "buyer" ? "items-end" : "items-start"}`}>
                <p className="text-[10px] text-gray-600 px-1">{msg.senderName}</p>
                <div className={[
                  "px-3.5 py-2.5 rounded-2xl text-sm font-medium leading-relaxed",
                  msg.senderRole === "buyer"
                    ? "bg-blue-600 text-white rounded-tr-sm"
                    : "bg-white/[0.06] text-gray-200 rounded-tl-sm",
                ].join(" ")}>
                  {msg.body}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-white/10 shrink-0">
          <div className="flex gap-2">
            <input
              value={body}
              onChange={e => setBody(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              disabled={!nameSet || sending}
              placeholder={nameSet ? "Écrivez un message…" : "Entrez votre nom d'abord"}
              className="flex-1 bg-white/[0.05] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition placeholder-gray-600 disabled:opacity-40"
            />
            <button
              onClick={handleSend}
              disabled={!nameSet || !body.trim() || sending}
              className="p-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl transition active:scale-95 shrink-0"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
