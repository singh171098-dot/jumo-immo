import { z } from "zod";

/* ── Email ───────────────────────────────────────────────────────────────── */
export const emailSchema = z
  .string()
  .min(1, "Veuillez saisir une adresse e-mail valide.")
  .email("Veuillez saisir une adresse e-mail valide.")
  .transform(s => s.trim().toLowerCase());

/* ── French phone ─────────────────────────────────────────────────────────
   Accepts: 0612345678 | 06 12 34 56 78 | +33 6 12 34 56 78 | 0033 6…
   Rejects: 0000000000 | 1111111111 | 12345 | abc…
────────────────────────────────────────────────────────────────────────── */
const FRENCH_PHONE_RE = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.\-]*\d{2}){4}$/;

export const phoneSchema = z
  .string()
  .trim()
  .regex(FRENCH_PHONE_RE, "Veuillez saisir un numéro de téléphone français valide.");

/* ── French name ──────────────────────────────────────────────────────────
   Accepts: Martin | Jean-Pierre | Le Gall | O'Brien
   Rejects: 1234 | @@@ | A | Test123
────────────────────────────────────────────────────────────────────────── */
const NAME_RE = /^[a-zA-ZÀ-ÖØ-öø-ÿ'\- ]{2,60}$/;

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Veuillez saisir un nom valide.")
  .regex(NAME_RE, "Veuillez saisir un nom valide.");

/* ── Password ─────────────────────────────────────────────────────────── */
export const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit comporter au moins 8 caractères.");

/* ── French postal code ───────────────────────────────────────────────── */
export const postalCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{5}$/, "Code postal invalide (5 chiffres requis).");

/* ── Composite schemas ────────────────────────────────────────────────── */

export const registerSchema = z.object({
  name:     nameSchema,
  email:    emailSchema,
  password: passwordSchema,
  role:     z.enum(["BUYER", "SELLER"]),
});

export const leadSchema = z.object({
  firstName:   nameSchema,
  lastName:    nameSchema,
  email:       emailSchema,
  postalCode:  postalCodeSchema,
  propertyId:  z.string().min(1, "Bien requis."),
  rgpdConsent: z.literal(true, { error: "Le consentement RGPD est obligatoire." }),
});

export const estimationLeadSchema = z.object({
  firstName:   nameSchema,
  email:       emailSchema,
  city:        z.string().trim().min(1, "Ville requise."),
  postalCode:  z.string().trim().regex(/^\d{5}$/).optional(),
  askingPrice: z.number().int().positive().optional(),
  surface:     z.number().int().positive().optional(),
});

export const sendMessageSchema = z.object({
  receiverId: z.string().min(1),
  propertyId: z.string().min(1),
  content:    z.string().trim().min(1, "Le message ne peut pas être vide.").max(2000, "Message trop long (max 2000 caractères)."),
});

export const bookVisitSchema = z.object({
  propertyId:      z.string().min(1),
  buyerName:       nameSchema,
  buyerEmail:      emailSchema,
  slot:            z.string().min(1, "Veuillez choisir un créneau."),
  proofOfFundsUrl: z.string().url().optional().or(z.literal("")),
});

export const submitOfferSchema = z.object({
  propertyId:       z.string().min(1),
  buyerName:        nameSchema,
  buyerEmail:       emailSchema,
  amount:           z.number().int().min(1000, "Montant invalide.").max(100_000_000, "Montant non plausible."),
  financingDetails: z.string().max(500).optional(),
});

/* ── Helper: extract first Zod error message ──────────────────────────── */
export function firstZodError(err: z.ZodError): string {
  // Zod v4 exposes issues; fall back to the legacy errors alias if present
  const issues = (err as { issues?: { message: string }[] }).issues
    ?? (err as { errors?: { message: string }[] }).errors
    ?? [];
  return issues[0]?.message ?? "Données invalides.";
}
