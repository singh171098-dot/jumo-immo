"use client";
import { useState, useMemo } from "react";
import { X, Calendar, Clock, CheckCircle2, User } from "lucide-react";
import { bookVisit } from "../app/actions/communication";
import UploadLink from "./UploadLink";

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const DAY_FR  = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MON_FR  = ["jan", "fév", "mar", "avr", "mai", "jun", "jul", "aoû", "sep", "oct", "nov", "déc"];
const SLOTS   = ["10:00", "11:30", "14:00", "15:30", "17:00"];

function nextAvailableDays(count = 7): Date[] {
  const days: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1); // start from tomorrow
  while (days.length < count) {
    if (d.getDay() !== 0) days.push(new Date(d)); // exclude Sundays
    d.setDate(d.getDate() + 1);
  }
  return days;
}

/* ── Props ───────────────────────────────────────────────────────────────── */
interface VisitBookerProps {
  propertyId:    string;
  propertyTitle: string;
  isOpen:        boolean;
  onClose:       () => void;
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function VisitBooker({ propertyId, propertyTitle, isOpen, onClose }: VisitBookerProps) {
  const [selectedDay,  setSelectedDay]  = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [buyerName,    setBuyerName]    = useState("");
  const [buyerEmail,   setBuyerEmail]   = useState("");
  const [proofFile,    setProofFile]    = useState<File | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [success,      setSuccess]      = useState(false);
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
      buyerName:      buyerName.trim(),
      buyerEmail:     buyerEmail.trim(),
      slot:           slot.toISOString(),
      proofOfFundsUrl: proofFile?.name,
    });
    setLoading(false);
    if (result.success) setSuccess(true);
    else setError(result.error ?? "Erreur lors de la réservation.");
  }

  function handleClose() {
    onClose();
    // Reset for next open
    setTimeout(() => {
      setSuccess(false);
      setError(null);
      setSelectedDay(null);
      setSelectedTime(null);
    }, 300);
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-lg bg-gray-950 border border-white/10 rounded-3xl shadow-2xl overflow-y-auto max-h-[92vh] pointer-events-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 sticky top-0 bg-gray-950 z-10">
            <div>
              <p className="text-white font-black text-base">Réserver une visite</p>
              <p className="text-gray-500 text-xs mt-0.5 truncate max-w-72">{propertyTitle}</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-xl hover:bg-white/[0.06] text-gray-400 hover:text-white transition shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {success ? (
            /* Success state */
            <div className="px-6 py-12 flex flex-col items-center text-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-black text-xl">Visite demandée !</p>
                <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">
                  Le vendeur confirmera votre créneau sous peu.
                </p>
                <p className="text-gray-600 text-xs mt-3">
                  {selectedDay?.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · {selectedTime}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="mt-1 px-6 py-2.5 bg-white/[0.06] hover:bg-white/10 text-white font-bold rounded-xl text-sm transition"
              >
                Fermer
              </button>
            </div>
          ) : (
            <div className="px-6 py-5 space-y-6">

              {/* Date picker */}
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Calendar size={11} /> Date de visite
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
                          "flex flex-col items-center py-2.5 px-1 rounded-xl border text-center transition-all",
                          active
                            ? "bg-blue-600 border-blue-500 text-white"
                            : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.07] hover:border-white/20 text-gray-300",
                        ].join(" ")}
                      >
                        <span className={`text-[9px] uppercase tracking-wider font-bold ${active ? "text-blue-200" : "text-gray-600"}`}>
                          {DAY_FR[day.getDay()]}
                        </span>
                        <span className="text-base font-black mt-0.5">{day.getDate()}</span>
                        <span className={`text-[9px] ${active ? "text-blue-200" : "text-gray-600"}`}>
                          {MON_FR[day.getMonth()]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time slots (shown only after date is selected) */}
              {selectedDay && (
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Clock size={11} /> Créneau horaire
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SLOTS.map(time => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={[
                          "px-4 py-2.5 rounded-xl border text-sm font-bold transition-all",
                          selectedTime === time
                            ? "bg-blue-600 border-blue-500 text-white"
                            : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.07] text-gray-300",
                        ].join(" ")}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Buyer info */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                  <User size={11} /> Vos coordonnées
                </p>
                <input
                  value={buyerName}
                  onChange={e => setBuyerName(e.target.value)}
                  placeholder="Prénom Nom"
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition placeholder-gray-600"
                />
                <input
                  value={buyerEmail}
                  onChange={e => setBuyerEmail(e.target.value)}
                  placeholder="votre@email.fr"
                  type="email"
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition placeholder-gray-600"
                />
              </div>

              {/* Optional proof of funds */}
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
                <p className="text-[10px] text-gray-700 mt-1.5">
                  Augmente vos chances d'obtenir un créneau prioritaire
                </p>
              </div>

              {/* Slot recap */}
              {selectedDay && selectedTime && (
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-sm">
                      {selectedDay.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">{selectedTime} · En attente de confirmation</p>
                  </div>
                  <Calendar size={18} className="text-blue-400 shrink-0" />
                </div>
              )}

              {/* Error */}
              {error && (
                <p className="text-red-400 text-xs font-medium bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                onClick={handleBook}
                disabled={loading || !selectedDay || !selectedTime || !buyerName.trim() || !buyerEmail.trim()}
                className="w-full py-4 bg-gradient-to-r from-[#1E3A8A] to-blue-600 hover:from-blue-800 hover:to-blue-500 disabled:from-gray-800 disabled:to-gray-800 disabled:cursor-not-allowed text-white font-black rounded-2xl text-sm transition-all hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 disabled:translate-y-0 active:translate-y-0"
              >
                {loading ? "Réservation en cours…" : "Confirmer la visite"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
