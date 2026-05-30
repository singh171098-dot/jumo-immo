"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronRight, ChevronLeft, CheckCircle2, User, Banknote, Home, ClipboardList } from "lucide-react";
import { saveCivilStatus, saveBuyerProfile } from "@/app/actions/profiles";

/* ── helpers ── */
const fmtEur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

/* ─────────────────── Zod schemas (one per step) ─────────────────────────── */

const step1Schema = z.object({
  personType: z.enum(["PARTICULIER", "SOCIETE"]),
  // Particulier
  gender:         z.enum(["MONSIEUR", "MADAME"]).optional(),
  firstName:      z.string().min(1, "Requis").optional(),
  lastName:       z.string().min(1, "Requis").optional(),
  maidenName:     z.string().optional(),
  dateOfBirth:    z.string().optional(),
  placeOfBirth:   z.string().optional(),
  nationality:    z.string().optional(),
  profession:     z.string().optional(),
  currentAddress: z.string().optional(),
  phoneNumber:    z.string().optional(),
  maritalStatus:  z.enum(["CELIBATAIRE", "MARIE", "PACSE", "DIVORCE", "VEUF"]).optional(),
  dateOfMarriageOrPacs:  z.string().optional(),
  placeOfMarriageOrPacs: z.string().optional(),
  matrimonialRegime: z.enum(["COMMUNAUTE_REDUITE_ACQUETS", "SEPARATION_BIENS", "COMMUNAUTE_UNIVERSELLE", "PARTICIPATION_ACQUETS"]).optional(),
  hasMarriageContract: z.boolean().optional(),
  notaryName: z.string().optional(),
  notaryCity: z.string().optional(),
  // Société
  companyName:       z.string().optional(),
  siretNumber:       z.string().optional(),
  registeredAddress: z.string().optional(),
  managerName:       z.string().optional(),
});

const step2Schema = z.object({
  purchasingCapacity:     z.number().min(1, "Requis"),
  personalContribution:   z.number().min(0, "Requis"),
  isSellingPropertyToBuy: z.boolean(),
});

const step3Schema = z.object({
  needsMortgage:       z.boolean(),
  loanAmountRequested: z.number().optional().nullable(),
}).refine(d => !d.needsMortgage || (d.loanAmountRequested != null && d.loanAmountRequested > 0), {
  message: "Veuillez indiquer le montant du prêt souhaité",
  path: ["loanAmountRequested"],
});

type Step1Values = z.infer<typeof step1Schema>;
type Step2Values = z.infer<typeof step2Schema>;
type Step3Values = z.infer<typeof step3Schema>;

/* ── Props ── */
interface Props {
  userId:                string;
  existingCivilStatus:   Record<string, unknown> | null;
  existingBuyerProfile:  Record<string, unknown> | null;
}

/* ── Shared input classes ── */
const inp = "w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition placeholder-gray-600 [color-scheme:dark]";
const lbl = "block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2";
const err = "text-xs text-red-400 mt-1";

/* ── Step indicator ── */
const STEPS = [
  { icon: User,          label: "Identité"   },
  { icon: Banknote,      label: "Budget"     },
  { icon: Home,          label: "Financement"},
  { icon: ClipboardList, label: "Confirmation"},
];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-10">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const done   = i < current;
        const active = i === current;
        const last   = i === STEPS.length - 1;
        return (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={[
                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                done   ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                : active ? "bg-blue-500/20 border-blue-500 text-blue-400"
                :          "bg-white/[0.04] border-white/[0.08] text-gray-600",
              ].join(" ")}>
                {done ? <CheckCircle2 size={18} /> : <Icon size={16} />}
              </div>
              <p className={`text-[10px] font-bold mt-1.5 uppercase tracking-wider ${
                done ? "text-emerald-500" : active ? "text-blue-400" : "text-gray-600"
              }`}>{s.label}</p>
            </div>
            {!last && (
              <div className={`flex-1 h-px mx-2 mb-4 transition-all ${done ? "bg-emerald-500/40" : "bg-white/[0.06]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Section wrapper ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/[0.06] pb-3">
        {title}
      </p>
      {children}
    </div>
  );
}

/* ── Helper text ── */
function Helper({ text }: { text: string }) {
  return <p className="text-[11px] text-gray-600 mt-1.5 leading-relaxed">{text}</p>;
}

/* ─────────────────── Main component ──────────────────────────────────────── */
export default function AcquereurOnboardingClient({ existingCivilStatus, existingBuyerProfile }: Props) {
  const router = useRouter();
  const [step, setStep]       = useState(0);
  const [saving, setSaving]   = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  /* Summaries collected as steps complete */
  const [s1Data, setS1Data] = useState<Step1Values | null>(null);
  const [s2Data, setS2Data] = useState<Step2Values | null>(null);
  const [s3Data, setS3Data] = useState<Step3Values | null>(null);

  /* ── Step 1 form ── */
  const f1 = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      personType:    (existingCivilStatus?.personType as string ?? "PARTICULIER") as "PARTICULIER" | "SOCIETE",
      gender:        existingCivilStatus?.gender     as "MONSIEUR" | "MADAME" | undefined,
      firstName:     existingCivilStatus?.firstName  as string ?? "",
      lastName:      existingCivilStatus?.lastName   as string ?? "",
      maidenName:    existingCivilStatus?.maidenName as string ?? "",
      nationality:   (existingCivilStatus?.nationality as string) || "Française",
      profession:    existingCivilStatus?.profession    as string ?? "",
      currentAddress:existingCivilStatus?.currentAddress as string ?? "",
      phoneNumber:   existingCivilStatus?.phoneNumber   as string ?? "",
      maritalStatus: existingCivilStatus?.maritalStatus as "CELIBATAIRE" | "MARIE" | "PACSE" | "DIVORCE" | "VEUF" | undefined,
      hasMarriageContract: (existingCivilStatus?.hasMarriageContract as boolean) ?? false,
      companyName:   existingCivilStatus?.companyName   as string ?? "",
      siretNumber:   existingCivilStatus?.siretNumber   as string ?? "",
      registeredAddress: existingCivilStatus?.registeredAddress as string ?? "",
      managerName:   existingCivilStatus?.managerName   as string ?? "",
    },
  });

  const personType  = f1.watch("personType");
  const marital     = f1.watch("maritalStatus");
  const hasContract = f1.watch("hasMarriageContract");
  const isCoupled   = marital === "MARIE" || marital === "PACSE";

  /* ── Step 2 form ── */
  const f2 = useForm<Step2Values, unknown, Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      purchasingCapacity:     (existingBuyerProfile?.purchasingCapacity   as number) ?? undefined,
      personalContribution:   (existingBuyerProfile?.personalContribution as number) ?? undefined,
      isSellingPropertyToBuy: (existingBuyerProfile?.isSellingPropertyToBuy as boolean) ?? false,
    },
  });

  /* ── Step 3 form ── */
  const f3 = useForm<Step3Values, unknown, Step3Values>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      needsMortgage:       (existingBuyerProfile?.needsMortgage       as boolean) ?? false,
      loanAmountRequested: (existingBuyerProfile?.loanAmountRequested as number)  ?? undefined,
    },
  });

  const needsMortgage = f3.watch("needsMortgage");

  /* ── Submit step 1 ── */
  const onStep1 = f1.handleSubmit(async (data) => {
    setSaving(true);
    setApiError(null);
    const res = await saveCivilStatus(data);
    setSaving(false);
    if (!res.success) { setApiError(res.error ?? "Erreur"); return; }
    setS1Data(data);
    setStep(1);
  });

  /* ── Submit step 2 ── */
  const onStep2 = f2.handleSubmit(async (data: Step2Values) => {
    setSaving(true);
    setApiError(null);
    const res = await saveBuyerProfile(data);
    setSaving(false);
    if (!res.success) { setApiError(res.error ?? "Erreur"); return; }
    setS2Data(data);
    setStep(2);
  });

  /* ── Submit step 3 ── */
  const onStep3 = f3.handleSubmit(async (data: Step3Values) => {
    setSaving(true);
    setApiError(null);
    const res = await saveBuyerProfile({ ...data, loanAmountRequested: data.loanAmountRequested ?? null });
    setSaving(false);
    if (!res.success) { setApiError(res.error ?? "Erreur"); return; }
    setS3Data(data);
    setStep(3);
  });

  /* ── Final submit ── */
  async function handleFinish() {
    router.push("/espace-acheteur");
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight">Espace Acquéreur</h1>
        <p className="text-gray-500 text-sm mt-1">Configurez votre profil acheteur en quelques étapes.</p>
      </div>

      <StepBar current={step} />

      {apiError && (
        <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
          {apiError}
        </div>
      )}

      {/* ══════════ STEP 1 — Identité civile ══════════ */}
      {step === 0 && (
        <form onSubmit={onStep1} className="space-y-6">

          <Section title="Type de personne">
            <div className="grid grid-cols-2 gap-3">
              {(["PARTICULIER", "SOCIETE"] as const).map(pt => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => f1.setValue("personType", pt)}
                  className={[
                    "py-3 rounded-xl border text-sm font-bold transition-all",
                    personType === pt
                      ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                      : "bg-white/[0.04] border-white/[0.08] text-gray-500 hover:text-white",
                  ].join(" ")}
                >
                  {pt === "PARTICULIER" ? "Particulier" : "Société"}
                </button>
              ))}
            </div>
          </Section>

          {personType === "PARTICULIER" && (
            <>
              <Section title="Civilité & Identité">
                {/* Gender */}
                <div>
                  <label className={lbl}>Civilité *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["MONSIEUR", "MADAME"] as const).map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => f1.setValue("gender", g)}
                        className={[
                          "py-2.5 rounded-xl border text-sm font-semibold transition-all",
                          f1.watch("gender") === g
                            ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                            : "bg-white/[0.04] border-white/[0.08] text-gray-500 hover:text-white",
                        ].join(" ")}
                      >
                        {g === "MONSIEUR" ? "M." : "Mme"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Prénom *</label>
                    <input {...f1.register("firstName")} placeholder="Jean" className={inp} />
                    {f1.formState.errors.firstName && <p className={err}>{f1.formState.errors.firstName.message}</p>}
                  </div>
                  <div>
                    <label className={lbl}>Nom *</label>
                    <input {...f1.register("lastName")} placeholder="Dupont" className={inp} />
                  </div>
                </div>

                <div>
                  <label className={lbl}>Nom de naissance</label>
                  <input {...f1.register("maidenName")} placeholder="Optionnel" className={inp} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Date de naissance</label>
                    <input type="date" {...f1.register("dateOfBirth")} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Lieu de naissance</label>
                    <input {...f1.register("placeOfBirth")} placeholder="Paris" className={inp} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Nationalité</label>
                    <input {...f1.register("nationality")} placeholder="Française" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Profession</label>
                    <input {...f1.register("profession")} placeholder="Ingénieur" className={inp} />
                  </div>
                </div>
              </Section>

              <Section title="Coordonnées">
                <div>
                  <label className={lbl}>Adresse actuelle</label>
                  <input {...f1.register("currentAddress")} placeholder="12 rue de la Paix, 75001 Paris" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Téléphone</label>
                  <input {...f1.register("phoneNumber")} type="tel" placeholder="06 00 00 00 00" className={inp} />
                </div>
              </Section>

              <Section title="Situation matrimoniale">
                <select {...f1.register("maritalStatus")} className={inp}>
                  <option value="">Sélectionnez…</option>
                  <option value="CELIBATAIRE">Célibataire</option>
                  <option value="MARIE">Marié(e)</option>
                  <option value="PACSE">Pacsé(e)</option>
                  <option value="DIVORCE">Divorcé(e)</option>
                  <option value="VEUF">Veuf / Veuve</option>
                </select>

                {isCoupled && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={lbl}>Date du {marital === "MARIE" ? "mariage" : "PACS"}</label>
                        <input type="date" {...f1.register("dateOfMarriageOrPacs")} className={inp} />
                      </div>
                      <div>
                        <label className={lbl}>Lieu du {marital === "MARIE" ? "mariage" : "PACS"}</label>
                        <input {...f1.register("placeOfMarriageOrPacs")} placeholder="Paris" className={inp} />
                      </div>
                    </div>

                    {marital === "MARIE" && (
                      <>
                        <div>
                          <label className={lbl}>Régime matrimonial</label>
                          <select {...f1.register("matrimonialRegime")} className={inp}>
                            <option value="">Sélectionnez…</option>
                            <option value="COMMUNAUTE_REDUITE_ACQUETS">Communauté réduite aux acquêts (légal)</option>
                            <option value="SEPARATION_BIENS">Séparation de biens</option>
                            <option value="COMMUNAUTE_UNIVERSELLE">Communauté universelle</option>
                            <option value="PARTICIPATION_ACQUETS">Participation aux acquêts</option>
                          </select>
                          <Helper text="Cette information peut être nécessaire pour préparer certains actes de vente." />
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" {...f1.register("hasMarriageContract")}
                            className="w-4 h-4 rounded border border-white/20 bg-white/[0.05] accent-blue-500" />
                          <span className="text-sm text-gray-300">Contrat de mariage notarié</span>
                        </label>

                        {hasContract && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className={lbl}>Nom du notaire</label>
                              <input {...f1.register("notaryName")} placeholder="Me Martin" className={inp} />
                            </div>
                            <div>
                              <label className={lbl}>Ville du notaire</label>
                              <input {...f1.register("notaryCity")} placeholder="Lyon" className={inp} />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </Section>
            </>
          )}

          {personType === "SOCIETE" && (
            <Section title="Informations de la société">
              <div>
                <label className={lbl}>Raison sociale *</label>
                <input {...f1.register("companyName")} placeholder="SCI Dupont" className={inp} />
              </div>
              <div>
                <label className={lbl}>Numéro SIRET *</label>
                <input {...f1.register("siretNumber")} placeholder="000 000 000 00000" className={inp} />
              </div>
              <div>
                <label className={lbl}>Adresse du siège social</label>
                <input {...f1.register("registeredAddress")} placeholder="12 avenue des Champs, 75008 Paris" className={inp} />
              </div>
              <div>
                <label className={lbl}>Nom du gérant *</label>
                <input {...f1.register("managerName")} placeholder="Jean Dupont" className={inp} />
              </div>
            </Section>
          )}

          <NavButtons loading={saving} onBack={null} />
        </form>
      )}

      {/* ══════════ STEP 2 — Budget ══════════ */}
      {step === 1 && (
        <form onSubmit={onStep2} className="space-y-6">
          <Section title="Capacité financière">
            <div>
              <label className={lbl}>Budget maximum d'acquisition (€) *</label>
              <input
                type="number"
                {...f2.register("purchasingCapacity", { valueAsNumber: true })}
                placeholder="350 000"
                className={inp}
                min={0}
              />
              {f2.formState.errors.purchasingCapacity && (
                <p className={err}>{f2.formState.errors.purchasingCapacity.message}</p>
              )}
            </div>

            <div>
              <label className={lbl}>Apport personnel (€) *</label>
              <input
                type="number"
                {...f2.register("personalContribution", { valueAsNumber: true })}
                placeholder="50 000"
                className={inp}
                min={0}
              />
              {f2.formState.errors.personalContribution && (
                <p className={err}>{f2.formState.errors.personalContribution.message}</p>
              )}
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...f2.register("isSellingPropertyToBuy")}
                className="w-4 h-4 rounded border border-white/20 bg-white/[0.05] accent-blue-500" />
              <span className="text-sm text-gray-300">
                Je vends un bien immobilier pour financer cet achat
              </span>
            </label>
          </Section>

          <NavButtons loading={saving} onBack={() => setStep(0)} />
        </form>
      )}

      {/* ══════════ STEP 3 — Financement bancaire ══════════ */}
      {step === 2 && (
        <form onSubmit={onStep3} className="space-y-6">
          <Section title="Recours à un prêt immobilier">
            <div className="grid grid-cols-2 gap-3">
              {([true, false] as const).map(v => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => f3.setValue("needsMortgage", v)}
                  className={[
                    "py-3 rounded-xl border text-sm font-bold transition-all",
                    needsMortgage === v
                      ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                      : "bg-white/[0.04] border-white/[0.08] text-gray-500 hover:text-white",
                  ].join(" ")}
                >
                  {v ? "Oui, avec prêt" : "Non, comptant"}
                </button>
              ))}
            </div>

            {needsMortgage && (
              <div>
                <label className={lbl}>Montant du prêt souhaité (€) *</label>
                <input
                  type="number"
                  {...f3.register("loanAmountRequested", { valueAsNumber: true })}
                  placeholder="300 000"
                  className={inp}
                  min={0}
                />
                {f3.formState.errors.loanAmountRequested && (
                  <p className={err}>{f3.formState.errors.loanAmountRequested.message}</p>
                )}
              </div>
            )}
          </Section>

          <NavButtons loading={saving} onBack={() => setStep(1)} />
        </form>
      )}

      {/* ══════════ STEP 4 — Confirmation ══════════ */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-6 flex items-center gap-4">
            <CheckCircle2 size={32} className="text-emerald-400 shrink-0" />
            <div>
              <p className="font-black text-white text-lg">Profil acheteur configuré !</p>
              <p className="text-emerald-300/70 text-sm mt-0.5">Toutes vos informations ont été enregistrées.</p>
            </div>
          </div>

          {/* Summary cards */}
          <div className="space-y-3">
            {s1Data && (
              <SummaryCard title="Identité civile">
                {s1Data.personType === "PARTICULIER" ? (
                  <>
                    <Row label="Nom" value={`${s1Data.gender === "MADAME" ? "Mme" : "M."} ${s1Data.firstName} ${s1Data.lastName}`} />
                    {s1Data.nationality && <Row label="Nationalité" value={s1Data.nationality} />}
                    {s1Data.maritalStatus && <Row label="Situation" value={s1Data.maritalStatus} />}
                  </>
                ) : (
                  <>
                    <Row label="Société" value={s1Data.companyName ?? ""} />
                    <Row label="SIRET"   value={s1Data.siretNumber  ?? ""} />
                  </>
                )}
              </SummaryCard>
            )}

            {s2Data && (
              <SummaryCard title="Capacité financière">
                <Row label="Budget max"   value={fmtEur(s2Data.purchasingCapacity)} />
                <Row label="Apport"       value={fmtEur(s2Data.personalContribution)} />
                {s2Data.isSellingPropertyToBuy && <Row label="Vente en cours" value="Oui" />}
              </SummaryCard>
            )}

            {s3Data && (
              <SummaryCard title="Financement">
                <Row label="Prêt bancaire" value={s3Data.needsMortgage ? "Oui" : "Comptant"} />
                {s3Data.needsMortgage && s3Data.loanAmountRequested && (
                  <Row label="Montant prêt" value={fmtEur(s3Data.loanAmountRequested)} />
                )}
              </SummaryCard>
            )}
          </div>

          <button
            onClick={handleFinish}
            className="w-full py-4 bg-gradient-to-r from-[#1E3A8A] to-blue-600 hover:from-blue-800 hover:to-blue-500 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30"
          >
            Accéder à mon espace acheteur <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Shared sub-components ──────────────────────────────────────────────────── */

function NavButtons({ loading, onBack }: { loading: boolean; onBack: (() => void) | null }) {
  return (
    <div className="flex gap-3 pt-2">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.05] transition text-sm font-semibold"
        >
          <ChevronLeft size={16} /> Retour
        </button>
      )}
      <button
        type="submit"
        disabled={loading}
        className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-[#1E3A8A] to-blue-600 hover:from-blue-800 hover:to-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all text-sm"
      >
        {loading ? "Enregistrement…" : <><span>Étape suivante</span><ChevronRight size={16} /></>}
      </button>
    </div>
  );
}

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] px-5 py-4">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-white font-semibold">{value}</span>
    </div>
  );
}
