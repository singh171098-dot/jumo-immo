"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { X, Mail, Lock, User, ChevronRight, Home, ShoppingBag } from "lucide-react";
import { registerUser } from "@/app/actions/auth";

interface Props {
  isOpen:  boolean;
  onClose: () => void;
}

const inputCls =
  "w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition placeholder-gray-700";

export default function AuthModal({ isOpen, onClose }: Props) {
  const router = useRouter();
  const [tab, setTab]         = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  /* ── Login state ── */
  const [loginEmail,    setLoginEmail]    = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  /* ── Register state ── */
  const [regName,     setRegName]     = useState("");
  const [regEmail,    setRegEmail]    = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole,     setRegRole]     = useState<"BUYER" | "SELLER">("BUYER");

  function closeAndReset() {
    onClose();
    setError(null);
    setLoading(false);
  }

  function switchTab(t: "login" | "register") {
    setTab(t);
    setError(null);
  }

  /* ── Handlers ── */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await signIn("credentials", {
        email:    loginEmail.trim().toLowerCase(),
        password: loginPassword,
        redirect: false,
      });
      if (result?.error) {
        setError("Email ou mot de passe incorrect.");
      } else {
        closeAndReset();
        router.refresh();
      }
    } catch {
      setError("Erreur de connexion. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await registerUser({
      name:     regName,
      email:    regEmail,
      password: regPassword,
      role:     regRole,
    });

    if (!res.success) {
      setError(res.error ?? "Erreur inconnue.");
      setLoading(false);
      return;
    }

    /* Auto-login after registration */
    try {
      const loginResult = await signIn("credentials", {
        email:    regEmail.trim().toLowerCase(),
        password: regPassword,
        redirect: false,
      });
      if (loginResult?.error) {
        setError("Compte créé ! Connectez-vous maintenant.");
        switchTab("login");
      } else {
        closeAndReset();
        router.refresh();
      }
    } catch {
      setError("Compte créé ! Connectez-vous maintenant.");
      switchTab("login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
            onClick={closeAndReset}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-md"
            initial={{ scale: 0.92, opacity: 0, y: 28 }}
            animate={{ scale: 1,    opacity: 1, y: 0  }}
            exit={{ scale: 0.92,    opacity: 0, y: 28 }}
            transition={{ type: "spring", stiffness: 440, damping: 36 }}
          >
            <div className="bg-[#0C1322] border border-white/[0.09] rounded-2xl shadow-2xl shadow-black/70 overflow-hidden">

              {/* Header */}
              <div className="bg-[#1E3A8A] px-7 py-5 flex items-center justify-between">
                <div>
                  <p className="text-xl font-black text-white tracking-tight">
                    Jumo<span className="text-[#C8A55C]">Immo</span>
                  </p>
                  <p className="text-[10px] text-blue-200/55 uppercase tracking-[0.18em] mt-0.5">
                    Accès sécurisé · Sans commission
                  </p>
                </div>
                <button
                  onClick={closeAndReset}
                  className="p-2 rounded-lg text-blue-200/40 hover:text-white hover:bg-white/10 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex bg-[#0F1729] border-b border-white/[0.07]">
                {(["login", "register"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => switchTab(t)}
                    className={`flex-1 py-3.5 text-sm font-bold transition-all ${
                      tab === t
                        ? "text-white border-b-2 border-[#2563EB]"
                        : "text-gray-600 hover:text-gray-400"
                    }`}
                  >
                    {t === "login" ? "Se connecter" : "Créer un compte"}
                  </button>
                ))}
              </div>

              {/* Body */}
              <div className="px-7 py-6">
                {/* Error banner */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      key="err"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0  }}
                      exit={{ opacity: 0 }}
                      className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl font-medium"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {tab === "login" ? (
                    /* ══════════════ LOGIN ══════════════ */
                    <motion.form
                      key="login"
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0   }}
                      exit={{ opacity: 0,   x: 16   }}
                      transition={{ duration: 0.2 }}
                      onSubmit={handleLogin}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">
                          Email
                        </label>
                        <div className="relative">
                          <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                          <input
                            type="email"
                            required
                            value={loginEmail}
                            onChange={e => setLoginEmail(e.target.value)}
                            placeholder="vous@exemple.fr"
                            className={inputCls}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">
                          Mot de passe
                        </label>
                        <div className="relative">
                          <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                          <input
                            type="password"
                            required
                            value={loginPassword}
                            onChange={e => setLoginPassword(e.target.value)}
                            placeholder="••••••••"
                            className={inputCls}
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-3.5 mt-2 bg-[#2563EB] hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all active:scale-[.98]"
                      >
                        {loading ? "Connexion…" : <><span>Se connecter</span><ChevronRight size={15} /></>}
                      </button>
                    </motion.form>

                  ) : (
                    /* ══════════════ REGISTER ══════════════ */
                    <motion.form
                      key="register"
                      initial={{ opacity: 0, x: 16  }}
                      animate={{ opacity: 1, x: 0   }}
                      exit={{ opacity: 0,   x: -16  }}
                      transition={{ duration: 0.2 }}
                      onSubmit={handleRegister}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">
                          Nom complet
                        </label>
                        <div className="relative">
                          <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                          <input
                            type="text"
                            required
                            value={regName}
                            onChange={e => setRegName(e.target.value)}
                            placeholder="Jean Dupont"
                            className={inputCls}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">
                          Email
                        </label>
                        <div className="relative">
                          <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                          <input
                            type="email"
                            required
                            value={regEmail}
                            onChange={e => setRegEmail(e.target.value)}
                            placeholder="vous@exemple.fr"
                            className={inputCls}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">
                          Mot de passe
                        </label>
                        <div className="relative">
                          <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                          <input
                            type="password"
                            required
                            minLength={8}
                            value={regPassword}
                            onChange={e => setRegPassword(e.target.value)}
                            placeholder="Minimum 8 caractères"
                            className={inputCls}
                          />
                        </div>
                      </div>

                      {/* Role selector */}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3">
                          Vous êtes
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {(["BUYER", "SELLER"] as const).map(r => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setRegRole(r)}
                              className={`flex items-center justify-center gap-2 px-3 py-3.5 rounded-xl border text-sm font-bold transition-all ${
                                regRole === r
                                  ? r === "BUYER"
                                    ? "bg-blue-900/30 border-[#2563EB]/50 text-blue-300"
                                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : "bg-white/[0.03] border-white/[0.07] text-gray-600 hover:text-gray-300 hover:border-white/20"
                              }`}
                            >
                              {r === "BUYER"
                                ? <><ShoppingBag size={14} /> Je veux acheter</>
                                : <><Home        size={14} /> Je veux vendre</>
                              }
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-3.5 mt-2 bg-[#10B981] hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all active:scale-[.98]"
                      >
                        {loading ? "Création…" : <><span>Créer mon compte</span><ChevronRight size={15} /></>}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="px-7 pb-5 text-center">
                <p className="text-[10px] text-gray-700 leading-relaxed">
                  Sans commission · Données DVF officielles · Connexion sécurisée
                </p>
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
