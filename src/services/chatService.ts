import { getDb } from "@/lib/db";
import { getAdminFirestore, FieldValue } from "@/lib/firebaseAdmin";
import type { DocumentReference } from "firebase-admin/firestore";
import { UserRole } from "@/models/User";
import type { ConversationDoc } from "@/types/chat";
import { createNotification } from "@/services/notificationService";

const MAX_MESSAGE_LENGTH = 4000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

function memberDocId(conversationId: string, userId: string) {
  return `${conversationId}_${userId}`;
}

function previewText(text: string) {
  const trimmed = text.trim();
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
}

async function getAdminUserIds(): Promise<string[]> {
  const db = await getDb();
  const admins = await db
    .collection("users")
    .find({ role: UserRole.ADMIN })
    .project({ _id: 1 })
    .toArray();
  return admins.map((a) => String(a._id));
}

async function getUserProfileMap(customerIds: string[]) {
  const uniqueIds = [...new Set(customerIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map<string, { name: string; email: string }>();

  const db = await getDb();
  const { ObjectId } = await import("mongodb");
  const objectIds = uniqueIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  if (objectIds.length === 0) return new Map<string, { name: string; email: string }>();

  const users = await db
    .collection("users")
    .find({ _id: { $in: objectIds } })
    .project({ _id: 1, name: 1, email: 1 })
    .toArray();

  return new Map(
    users.map((u) => [
      String(u._id),
      { name: String(u.name || ""), email: String(u.email || "") },
    ])
  );
}

async function resolveCustomerProfile(customerId: string) {
  const profiles = await getUserProfileMap([customerId]);
  return profiles.get(customerId);
}

function buildParticipantIds(customerId: string, adminIds: string[]) {
  return [...new Set([customerId, ...adminIds])];
}

async function ensureConversationParticipants(
  conversationRef: DocumentReference,
  data: ConversationDoc
) {
  const adminIds = await getAdminUserIds();
  const required = buildParticipantIds(data.customerId, adminIds);
  const current = new Set(data.participantIds || []);
  const missing = required.filter((id) => !current.has(id));
  if (missing.length > 0) {
    await conversationRef.update({
      participantIds: FieldValue.arrayUnion(...missing),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  return [...new Set([...current, ...required])];
}

async function assertCanAccessConversation(conversationId: string, userId: string, role: string) {
  const firestore = getAdminFirestore();
  const snap = await firestore.collection("conversations").doc(conversationId).get();
  if (!snap.exists) {
    return { ok: false as const, message: "Conversation not found", status: 404 };
  }
  const data = snap.data() as ConversationDoc;
  const isParticipant = data.participantIds.includes(userId);
  const isAdmin = role === UserRole.ADMIN;
  if (!isParticipant && !isAdmin) {
    return { ok: false as const, message: "Forbidden", status: 403 };
  }
  return { ok: true as const, data };
}

async function checkRateLimit(senderId: string) {
  const db = await getDb();
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const count = await db.collection("rate_limits").countDocuments({
    userId: senderId,
    type: "message",
    createdAt: { $gte: windowStart },
  });
  if (count >= RATE_LIMIT_MAX) return false;
  await db.collection("rate_limits").insertOne({
    userId: senderId,
    type: "message",
    createdAt: new Date(),
  });
  return true;
}

export async function getOrCreateSupportConversation(customerId: string, orderId?: string | null) {
  const firestore = getAdminFirestore();
  const existing = await firestore
    .collection("conversations")
    .where("type", "==", "support")
    .where("customerId", "==", customerId)
    .limit(1)
    .get();

  if (!existing.empty) {
    const doc = existing.docs[0]!;
    const data = doc.data() as ConversationDoc;
    await ensureConversationParticipants(doc.ref, data);
    if (!data.customerName?.trim()) {
      const profile = await resolveCustomerProfile(customerId);
      if (profile?.name.trim()) {
        await doc.ref.update({
          customerName: profile.name.trim(),
          customerEmail: profile.email || null,
          updatedAt: FieldValue.serverTimestamp(),
        });
        data.customerName = profile.name.trim();
        data.customerEmail = profile.email || null;
      }
    }
    if (orderId && !data.orderId) {
      await doc.ref.update({ orderId, updatedAt: FieldValue.serverTimestamp() });
    }
    return { success: true as const, conversationId: doc.id, conversation: { id: doc.id, ...data } };
  }

  const adminIds = await getAdminUserIds();
  const customerProfile = await resolveCustomerProfile(customerId);
  const now = FieldValue.serverTimestamp();
  const conversationRef = firestore.collection("conversations").doc();
  const conversationData = {
    type: "support" as const,
    customerId,
    customerName: customerProfile?.name || null,
    customerEmail: customerProfile?.email || null,
    participantIds: buildParticipantIds(customerId, adminIds),
    orderId: orderId || null,
    createdBy: customerId,
    createdAt: now,
    updatedAt: now,
    lastMessage: null,
  };

  const batch = firestore.batch();
  batch.set(conversationRef, conversationData);

  const memberIds = [customerId, ...adminIds];
  for (const uid of memberIds) {
    const ref = firestore.collection("conversationMembers").doc(memberDocId(conversationRef.id, uid));
    batch.set(ref, {
      conversationId: conversationRef.id,
      userId: uid,
      joinedAt: now,
      lastReadMessageId: null,
      lastReadAt: null,
      unreadCount: 0,
      muted: false,
      archived: false,
      updatedAt: now,
    });
  }

  await batch.commit();
  return {
    success: true as const,
    conversationId: conversationRef.id,
    conversation: { id: conversationRef.id, ...conversationData },
  };
}

export async function listConversations(userId: string, role: string) {
  const firestore = getAdminFirestore();

  if (role === UserRole.ADMIN) {
    const snap = await firestore
      .collection("conversations")
      .where("type", "==", "support")
      .orderBy("updatedAt", "desc")
      .limit(50)
      .get();

    const results: Array<
      ConversationDoc & {
        id: string;
        unreadCount: number;
      }
    > = [];
    for (const doc of snap.docs) {
      const data = doc.data() as ConversationDoc;
      await ensureConversationParticipants(doc.ref, data);
      const memberSnap = await firestore
        .collection("conversationMembers")
        .doc(memberDocId(doc.id, userId))
        .get();
      const unreadCount = memberSnap.exists ? memberSnap.data()?.unreadCount || 0 : 0;
      results.push({ id: doc.id, ...(doc.data() as ConversationDoc), unreadCount });
    }

    const customerIds = [
      ...new Set(results.map((r) => r.customerId).filter(Boolean) as string[]),
    ];
    const profileMap = await getUserProfileMap(customerIds);
    for (const row of results) {
      const profile = row.customerId ? profileMap.get(row.customerId) : undefined;
      if (!profile) continue;
      const resolvedName = profile.name.trim();
      const hadName = Boolean(row.customerName?.trim());
      if (resolvedName) {
        row.customerName = resolvedName;
        row.customerEmail = profile.email || row.customerEmail;
        if (!hadName) {
          await firestore.collection("conversations").doc(row.id).set(
            { customerName: resolvedName, customerEmail: profile.email || null },
            { merge: true }
          );
        }
      } else if (profile.email) {
        row.customerEmail = profile.email;
      }
    }

    return results;
  }

  const memberSnap = await firestore
    .collection("conversationMembers")
    .where("userId", "==", userId)
    .where("archived", "==", false)
    .orderBy("updatedAt", "desc")
    .limit(50)
    .get();

  const conversations = [];
  for (const memberDoc of memberSnap.docs) {
    const member = memberDoc.data();
    const convSnap = await firestore.collection("conversations").doc(member.conversationId).get();
    if (convSnap.exists) {
      conversations.push({
        id: convSnap.id,
        ...convSnap.data(),
        unreadCount: member.unreadCount || 0,
      });
    }
  }
  return conversations;
}

export async function sendMessage(input: {
  conversationId: string;
  senderId: string;
  role: string;
  text: string;
  clientMessageId: string;
  orderId?: string | null;
}) {
  const { conversationId, senderId, role, text, clientMessageId, orderId } = input;
  const trimmed = text?.trim() || "";
  if (!trimmed) {
    return { success: false as const, message: "Message cannot be empty", status: 400 };
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { success: false as const, message: "Message too long", status: 400 };
  }

  const access = await assertCanAccessConversation(conversationId, senderId, role);
  if (!access.ok) return access;

  const firestore = getAdminFirestore();
  const dup = await firestore
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .where("clientMessageId", "==", clientMessageId)
    .limit(1)
    .get();
  if (!dup.empty) {
    const doc = dup.docs[0]!;
    return { success: true as const, messageId: doc.id, duplicate: true };
  }

  if (!(await checkRateLimit(senderId))) {
    return { success: false as const, message: "Rate limit exceeded. Try again shortly.", status: 429 };
  }

  const messageRef = firestore.collection("conversations").doc(conversationId).collection("messages").doc();
  const now = FieldValue.serverTimestamp();
  const messageData = {
    senderId,
    type: "text" as const,
    text: trimmed,
    attachment: null,
    orderId: orderId || null,
    editedAt: null,
    deletedAt: null,
    clientMessageId,
    createdAt: now,
  };

  const memberSnap = await firestore.collection("conversationMembers").where("conversationId", "==", conversationId).get();
  const batch = firestore.batch();
  batch.set(messageRef, messageData);
  batch.update(firestore.collection("conversations").doc(conversationId), {
    updatedAt: now,
    lastMessage: {
      messageId: messageRef.id,
      senderId,
      preview: previewText(trimmed),
      type: "text",
      createdAt: now,
    },
    ...(orderId ? { orderId } : {}),
  });

  const recipientIds: string[] = [];
  memberSnap.docs.forEach((doc) => {
    const member = doc.data();
    if (member.userId !== senderId) {
      recipientIds.push(member.userId);
      batch.update(doc.ref, {
        unreadCount: FieldValue.increment(1),
        updatedAt: now,
      });
    }
  });

  await batch.commit();

  if (recipientIds.length > 0) {
    await createNotification({
      recipients: recipientIds,
      actorId: senderId,
      type: "new_message",
      title: "New support message",
      body: previewText(trimmed),
      entityType: "conversation",
      entityId: conversationId,
      idempotencyKey: `new_message:${messageRef.id}`,
      sendPush: true,
      route: role === UserRole.ADMIN ? `/admin/support?c=${conversationId}` : `/support?c=${conversationId}`,
    });
  }

  return { success: true as const, messageId: messageRef.id, duplicate: false };
}

export async function markConversationRead(conversationId: string, userId: string, role: string) {
  const access = await assertCanAccessConversation(conversationId, userId, role);
  if (!access.ok) return access;

  const firestore = getAdminFirestore();
  const memberRef = firestore.collection("conversationMembers").doc(memberDocId(conversationId, userId));
  const latest = await firestore
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  const latestId = latest.docs[0]?.id || null;
  await memberRef.set(
    {
      conversationId,
      userId,
      lastReadMessageId: latestId,
      lastReadAt: FieldValue.serverTimestamp(),
      unreadCount: 0,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { success: true as const };
}
