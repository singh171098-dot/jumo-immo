"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function requireAuth() {
  return auth().then(session => {
    if (!session?.user?.id) throw new Error("Non authentifié");
    return session.user.id;
  });
}

// ─── Civil Status ─────────────────────────────────────────────────────────────

export interface CivilStatusInput {
  personType: "PARTICULIER" | "SOCIETE";
  // Particulier
  gender?: "MONSIEUR" | "MADAME" | null;
  firstName?: string;
  lastName?: string;
  maidenName?: string;
  dateOfBirth?: string | null;
  placeOfBirth?: string;
  nationality?: string;
  profession?: string;
  currentAddress?: string;
  phoneNumber?: string;
  maritalStatus?: "CELIBATAIRE" | "MARIE" | "PACSE" | "DIVORCE" | "VEUF" | null;
  dateOfMarriageOrPacs?: string | null;
  placeOfMarriageOrPacs?: string;
  matrimonialRegime?: "COMMUNAUTE_REDUITE_ACQUETS" | "SEPARATION_BIENS" | "COMMUNAUTE_UNIVERSELLE" | "PARTICIPATION_ACQUETS" | null;
  hasMarriageContract?: boolean;
  notaryName?: string;
  notaryCity?: string;
  // Société
  companyName?: string;
  siretNumber?: string;
  registeredAddress?: string;
  managerName?: string;
}

export async function saveCivilStatus(
  data: CivilStatusInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    const payload = {
      personType: data.personType,
      gender:        data.gender        ?? null,
      firstName:     data.firstName     ?? null,
      lastName:      data.lastName      ?? null,
      maidenName:    data.maidenName    ?? null,
      dateOfBirth:   data.dateOfBirth   ? new Date(data.dateOfBirth) : null,
      placeOfBirth:  data.placeOfBirth  ?? null,
      nationality:   data.nationality   ?? null,
      profession:    data.profession    ?? null,
      currentAddress: data.currentAddress ?? null,
      phoneNumber:   data.phoneNumber   ?? null,
      maritalStatus: data.maritalStatus ?? null,
      dateOfMarriageOrPacs:  data.dateOfMarriageOrPacs  ? new Date(data.dateOfMarriageOrPacs) : null,
      placeOfMarriageOrPacs: data.placeOfMarriageOrPacs ?? null,
      matrimonialRegime:     data.matrimonialRegime     ?? null,
      hasMarriageContract:   data.hasMarriageContract   ?? false,
      notaryName:    data.notaryName    ?? null,
      notaryCity:    data.notaryCity    ?? null,
      companyName:       data.companyName       ?? null,
      siretNumber:       data.siretNumber       ?? null,
      registeredAddress: data.registeredAddress ?? null,
      managerName:       data.managerName       ?? null,
    };

    await prisma.civilStatus.upsert({
      where:  { userId },
      update: payload,
      create: { userId, ...payload },
    });

    revalidatePath("/onboarding/acquereur");
    revalidatePath("/onboarding/vendeur");
    return { success: true };
  } catch (err) {
    console.error("[saveCivilStatus]", err);
    return { success: false, error: "Erreur serveur. Veuillez réessayer." };
  }
}

// ─── Buyer Profile ────────────────────────────────────────────────────────────

export interface BuyerProfileInput {
  purchasingCapacity?:     number | null;
  personalContribution?:   number | null;
  needsMortgage?:          boolean;
  loanAmountRequested?:    number | null;
  isSellingPropertyToBuy?: boolean;
}

export async function saveBuyerProfile(
  data: BuyerProfileInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    const payload = {
      purchasingCapacity:     data.purchasingCapacity     ?? null,
      personalContribution:   data.personalContribution   ?? null,
      needsMortgage:          data.needsMortgage          ?? false,
      loanAmountRequested:    data.loanAmountRequested    ?? null,
      isSellingPropertyToBuy: data.isSellingPropertyToBuy ?? false,
    };

    await prisma.buyerProfile.upsert({
      where:  { userId },
      update: payload,
      create: { userId, ...payload },
    });

    revalidatePath("/onboarding/acquereur");
    revalidatePath("/espace-acheteur");
    return { success: true };
  } catch (err) {
    console.error("[saveBuyerProfile]", err);
    return { success: false, error: "Erreur serveur. Veuillez réessayer." };
  }
}

// ─── Seller Profile ───────────────────────────────────────────────────────────

export interface SellerProfileInput {
  propertyCity?:    string;
  propertyType?:    string;
  propertySurface?: number | null;
  estimatedPrice?:  number | null;
  desiredSaleDate?: string | null;
  hasAgentMandate?: boolean;
  mandateType?:     string;
  cadastralParcel?:       string;
  fiscalInvariantNumber?: string;
  isCopropriete?:         boolean;
  lotNumbers?:            string;
  tantiemes?:             number | null;
}

export async function saveSellerProfile(
  data: SellerProfileInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    const payload = {
      propertyCity:    data.propertyCity    ?? null,
      propertyType:    data.propertyType    ?? null,
      propertySurface: data.propertySurface ?? null,
      estimatedPrice:  data.estimatedPrice  ?? null,
      desiredSaleDate: data.desiredSaleDate ? new Date(data.desiredSaleDate) : null,
      hasAgentMandate: data.hasAgentMandate ?? false,
      mandateType:     data.mandateType     ?? null,
      cadastralParcel:       data.cadastralParcel       ?? null,
      fiscalInvariantNumber: data.fiscalInvariantNumber ?? null,
      isCopropriete:         data.isCopropriete         ?? false,
      lotNumbers:            data.lotNumbers            ?? null,
      tantiemes:             data.tantiemes             ?? null,
    };

    await prisma.sellerProfile.upsert({
      where:  { userId },
      update: payload,
      create: { userId, ...payload },
    });

    revalidatePath("/onboarding/vendeur");
    revalidatePath("/espace-vendeur");
    return { success: true };
  } catch (err) {
    console.error("[saveSellerProfile]", err);
    return { success: false, error: "Erreur serveur. Veuillez réessayer." };
  }
}
