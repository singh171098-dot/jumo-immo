"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, CheckCircle2, User, Sparkles } from "lucide-react";
import { bookVisit } from "../app/actions/communication";
import UploadLink from "./UploadLink";

/* ── Date / time helpers ────────────────────────────────────────────────── */
const DAY_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MON_FR = ["jan", "fév", "mar", "avr", "mai", "jun", "jul", "aoû", "sep", "oct", "nov", "déc"];

/** Slots as specified: 10:00 · 12:00 · 14:00 · 16:00 · 17:00 */
const SLOTS = ["10:00", "12:00", "14:00", "16:00", "17:00"];

function nextAvailableDays(count = 7): Date[] {
  const days: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1); // start tomorrow
  while (days.length < count) {
    if (d.getDay() !== 0) days.push(new Date(d)); // skip Sundays
    d.setDate(d.getDate() + 1);
  }
  return days;
}

/* ── Animation variants ─────────────────────────────────────────────────── */
const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22 } },
  exit:    { opacity: 0, transition: { duration: 0.18 } },
};

const modalVariants = {
  hidden:  { opacity: 0, scale: 0.95, y: 12 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { type: "spring" as const, stiffness: 380, damping: 30 },
  },
  exit:    { opacity: 0, scale: 0.97, y: 6, transition: { duration: 0.15 } },
};

/* ── Props ──────────────────────────────────────────────────────────────── */
interface VisitBookerProps {
  propertyId:    string;
  propertyTitle: string;
  isOpen:        boolean;
  onClose:       () => void;
}

/* ── Component ──────────────────────────────────────────────────────────── */
export default function VisitBooker({
  propertyId,
  propertyTitle,
  isOpen,
  onClose,
}: VisitBookerProps) {
  const [selectedDay,  setSelectedDay]  = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [buyerName,    setBuyerName]    = useState("");
  const [buyerEmail,   setBuyerEmail]   = useState("");
  const [proofFile,    setProofFile]    = useState<File | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [success,      setSuccess]      = useState(false);
  const [referenceId,  setReferenceId]  = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);

  const days = useMemo(nextAvailableDays, []);

  async function handleBook() {
    if (!selectedDay || !selectedTime || !buyerName.trim() || !buyerEmail.trim()) {
      setError("Veuillez remplir tous les champs et choisir un créneau.");
      return;
    }
    const [h, m] = selectedTime.split(":").map(Number);
    const slot = new Date(selectedDay);
    slot.setHours(h, m, 0, 0);

    setLoading(true);
    setError(null);

    const result = await bookVisit({
      propertyId,
      buyerName:       buyerName.trim(),
      buyerEmail:      buyerEmail.trim(),
      slot:            slot.toISOString(),
      proofOfFundsUrl: proofFile?.name,
    });

    setLoading(false);
    if (result.success) {
      setSuccess(true);
      setReferenceId(result.referenceId ?? null);
    } else {
      setError(result.error ?? "Erreur lors de la réservation.");
    }
  }

  function handleClose() {
    onClose();
    // Reset state after exit animation completes
    setTimeout(() => {
      setSuccess(false);
      setError(null);
      setReferenceId(null);
      setSelectedDay(null);
      setSelectedTime(null);
      setBuyerName("");
      setBuyerEmail("");
      setProofFile(null);
    }, 300);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="visit-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={handleClose}
          />

          {/* ── Modal ── */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              key="visit-modal"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-lg bg-gray-950 border border-white/10 rounded-3xl shadow-2xl overflow-y-auto max-h-[92vh] pointer-events-auto"
            >
              {/* ── Header ── */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08] sticky top-0 bg-gray-950/95 backdrop-blur-sm z-10">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Calendar size={15} className="text-blue-400" />
                    <p className="text-white font-black text-base">Réserver une visite</p>
                  </div>
                  <p className="text-gray-500 text-xs truncate max-w-64 pl-[23px]">
                    {propertyTitle}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-xl hover:bg-white/[0.06] text-gray-500 hover:text-white transition shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* ── Success state ── */}
              {success ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="px-6 py-12 flex flex-col items-center text-center gap-5"
                >
                  {/* Icon */}
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 size={36} className="text-emerald-400" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Sparkles size={12} className="text-white" />
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <p className="text-white font-black text-2xl tracking-tight">
                      Visite demandée !
                    </p>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                      Le vendeur recevra votre demande et confirmera votre créneau sous peu.
                    </p>
                  </div>

                  {/* Booking recap */}
                  <div className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-5 py-4 text-left space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Date</span>
                      <span className="text-sm text-white font-semibold">
                        {selectedDay?.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Horaire</span>
                      <span className="text-sm text-white font-semibold">{selectedTime}</span>
                    </div>
                    {referenceId && (
                      <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06]">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Référence</span>
                        <span className="text-sm font-black text-emerald-400 font-mono tracking-wide">
                          {referenceId}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleClose}
                    className="px-8 py-3 bg-white/[0.06] hover:bg-white/10 text-white font-bold rounded-xl text-sm transition-all active:scale-[0.98]"
                  >
                    Fermer
                  </button>
                </motion.div>
              ) : (
                <div className="px-6 py-6 space-y-6">

                  {/* ── Date picker ── */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Calendar size={10} /> Choisissez une date
                    </p>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                      {days.map((day, i) => {
                        const active = selectedDay?.toDateString() === day.toDateString();
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => { setSelectedDay(day); setSelectedTime(null); }}
                            className={[
                              "flex flex-col items-center py-2.5 px-1 rounded-xl border text-center transition-all duration-150",
                              active
                                ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                                : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.18] text-gray-300",
                            ].join(" ")}
                          >
                            <span className={`text-[9px] uppercase tracking-wider font-bold leading-none ${active ? "text-blue-200" : "text-gray-600"}`}>
                              {DAY_FR[day.getDay()]}
                            </span>
                            <span className="text-base font-black mt-1 leading-none">
                              {day.getDate()}
                            </span>
                            <span className={`text-[9px] mt-0.5 leading-none ${active ? "text-blue-200" : "text-gray-600"}`}>
                              {MON_FR[day.getMonth()]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Time slots (appears after date selection) ── */}
                  <AnimatePresence>
                    {selectedDay && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                      >
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <Clock size={10} /> Créneau horaire
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {SLOTS.map(time => (
                            <button
                              key={time}
                              type="button"
                              onClick={() => setSelectedTime(time)}
                              className={[
                                "px-5 py-2.5 rounded-xl border text-sm font-bold transition-all duration-150",
                                selectedTime === time
                                  ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                                  : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.18] text-gray-300",
                              ].join(" ")}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ── Buyer info ── */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                      <User size={10} /> Vos coordonnées
                    </p>
                    <input
                      value={buyerName}
                      onChange={e => setBuyerName(e.target.value)}
                      placeholder="Prénom Nom"
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition placeholder-gray-600"
                    />
                    <input
                      value={buyerEmail}
                      onChange={e => setBuyerEmail(e.target.value)}
                      placeholder="votre@email.fr"
                      type="email"
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition placeholder-gray-600"
                    />
                  </div>

                  {/* ── Optional proof of funds ── */}
                  <div>
                    <UploadLink
                      role="buyer"
                      docType="proof_visit"
                      label="Justificatif de financement (optionnel)"
                      required={false}
                      value={proofFile}
                      onChange={setProofFile}
                      dark
                    />
                    <p className="text-[10px] text-gray-700 mt-1.5 pl-0.5">
                      Augmente vos chances d&apos;obtenir un créneau prioritaire
                    </p>
                  </div>

                  {/* ── Booking recap pill ── */}
                  <AnimatePresence>
                    {selectedDay && selectedTime && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3.5 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-white font-bold text-sm">
                            {selectedDay.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                          </p>
                          <p className="text-gray-500 text-xs mt-0.5">
                            {selectedTime} · En attente de confirmation
                          </p>
                        </div>
                        <Calendar size={18} className="text-blue-400 shrink-0" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ── Error ── */}
                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-red-400 text-xs font-medium bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {/* ── Submit ── */}
                  <button
                    onClick={handleBook}
                    disabled={
                      loading ||
                      !selectedDay ||
                      !selectedTime ||
                      !buyerName.trim() ||
                      !buyerEmail.trim()
                    }
                    className="w-full py-4 bg-gradient-to-r from-[#1E3A8A] to-blue-600 hover:from-blue-800 hover:to-blue-500 disabled:from-gray-800 disabled:to-gray-800 disabled:cursor-not-allowed text-white font-black rounded-2xl text-sm transition-all hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 disabled:translate-y-0 active:translate-y-0 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Réservation en cours…
                      </>
                    ) : (
                      "Confirmer la visite"
                    )}
                  </button>

                  <p className="text-center text-[10px] text-gray-600 pb-1">
                    Visite gratuite · Sans engagement · Confirmation sous 24h
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
