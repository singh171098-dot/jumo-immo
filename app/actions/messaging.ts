"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendMessageSchema, firstZodError } from "@/lib/validations";

/* ── Shared serialisable types ──────────────────────────────────────────── */

export interface MessageDTO {
  id:         string;
  body:       string;
  createdAt:  string;   // ISO string — safe to pass across server boundary
  senderId:   string | null;
  receiverId: string | null;
  isRead:     boolean;
}

export interface ConversationSummary {
  propertyId:    string;
  propertyTitle: string;
  propertyCover: string;
  propertyCity:  string;
  otherUserId:   string;
  otherUserName: string;
  lastMessage:   string;
  lastActivity:  string;  // ISO string
  unreadCount:   number;
}

/* ── sendMessage ────────────────────────────────────────────────────────── */

export async function sendMessage(
  receiverId: string,
  propertyId: string,
  content:    string,
): Promise<{ success: boolean; message?: MessageDTO; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Non authentifié." };

  const senderId = session.user.id;

  const parsed = sendMessageSchema.safeParse({ receiverId, propertyId, content });
  if (!parsed.success) return { success: false, error: firstZodError(parsed.error) };
  const trimmed = parsed.data.content;

  if (senderId === receiverId) return { success: false, error: "Action non autorisée." };

  const [property, receiver] = await Promise.all([
    prisma.property.findUnique({ where: { id: propertyId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: receiverId }, select: { id: true } }),
  ]);

  if (!property) return { success: false, error: "Bien introuvable." };
  if (!receiver) return { success: false, error: "Destinataire introuvable." };

  const msg = await prisma.message.create({
    data: {
      propertyId,
      senderId,
      receiverId,
      senderName: session.user.name ?? "Utilisateur",
      senderRole: "buyer",
      body:       trimmed,
      isRead:     false,
    },
    select: {
      id:         true,
      body:       true,
      createdAt:  true,
      senderId:   true,
      receiverId: true,
      isRead:     true,
    },
  });

  revalidatePath("/espace-vendeur");
  revalidatePath("/espace-acheteur");

  return {
    success: true,
    message: { ...msg, createdAt: msg.createdAt.toISOString() },
  };
}

/* ── getConversation ────────────────────────────────────────────────────── */

export async function getConversation(
  otherUserId: string,
  propertyId:  string,
): Promise<{ success: boolean; messages: MessageDTO[]; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, messages: [], error: "Non authentifié." };

  const userId = session.user.id;

  const rows = await prisma.message.findMany({
    where: {
      propertyId,
      OR: [
        { senderId: userId,      receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId      },
      ],
    },
    select: {
      id:         true,
      body:       true,
      createdAt:  true,
      senderId:   true,
      receiverId: true,
      isRead:     true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Mark unread received messages as read
  const unreadIds = rows
    .filter(m => m.receiverId === userId && !m.isRead)
    .map(m => m.id);

  if (unreadIds.length > 0) {
    await prisma.message.updateMany({
      where: { id: { in: unreadIds } },
      data:  { isRead: true },
    }).catch(() => {});
  }

  return {
    success:  true,
    messages: rows.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })),
  };
}

/* ── getInbox — returns one entry per (property + otherUser) conversation ── */

export async function getInbox(): Promise<{
  success:       boolean;
  conversations: ConversationSummary[];
}> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, conversations: [] };

  const userId = session.user.id;

  const rows = await prisma.message.findMany({
    where: {
      OR: [
        { senderId:   userId },
        { receiverId: userId },
      ],
      AND: [
        { senderId:   { not: null } },
        { receiverId: { not: null } },
      ],
    },
    select: {
      id:         true,
      body:       true,
      createdAt:  true,
      senderId:   true,
      receiverId: true,
      propertyId: true,
      isRead:     true,
      property: {
        select: { id: true, title: true, images: true, city: true },
      },
      sender:   { select: { id: true, name: true } },
      receiver: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const convMap = new Map<string, ConversationSummary>();

  for (const msg of rows) {
    if (!msg.senderId || !msg.receiverId) continue;

    const isFromMe   = msg.senderId === userId;
    const otherId    = isFromMe ? msg.receiverId : msg.senderId;
    const otherUser  = isFromMe ? msg.receiver   : msg.sender;
    const key        = `${msg.propertyId}__${otherId}`;

    if (!convMap.has(key)) {
      convMap.set(key, {
        propertyId:    msg.propertyId,
        propertyTitle: msg.property.title,
        propertyCover: msg.property.images[0] ?? "",
        propertyCity:  msg.property.city,
        otherUserId:   otherId,
        otherUserName: otherUser?.name ?? "Utilisateur",
        lastMessage:   msg.body,
        lastActivity:  msg.createdAt.toISOString(),
        unreadCount:   !isFromMe && !msg.isRead ? 1 : 0,
      });
    } else if (!isFromMe && !msg.isRead) {
      convMap.get(key)!.unreadCount++;
    }
  }

  return {
    success:       true,
    conversations: Array.from(convMap.values()),
  };
}
