import { getDb } from "@/lib/db";
import { getAdminFirestore, FieldValue } from "@/lib/firebaseAdmin";
import { getAdminMessaging } from "@/lib/firebaseAdmin";
import { paginationMeta } from "@/lib/pagination";
import type { CreateNotificationInput, FcmDeviceDoc, MongoNotificationDoc } from "@/types/apps/notificationTypes";

function deviceDocId(userId: string, deviceId: string) {
  return `${userId}_${deviceId}`;
}

async function getActiveDeviceTokens(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];
  const db = await getDb();
  const devices = await db
    .collection<FcmDeviceDoc>("fcm_devices")
    .find({ userId: { $in: userIds }, enabled: true })
    .toArray();
  return devices.map((d) => d.token).filter(Boolean);
}

async function disableInvalidTokens(tokens: string[]) {
  if (tokens.length === 0) return;
  const db = await getDb();
  await db.collection("fcm_devices").updateMany({ token: { $in: tokens } }, { $set: { enabled: false } });
}

export async function createNotification(input: CreateNotificationInput) {
  const firestore = getAdminFirestore();
  const {
    recipients,
    actorId,
    type,
    title,
    body,
    entityType,
    entityId,
    idempotencyKey,
    sendPush = false,
    route,
  } = input;

  const uniqueRecipients = [...new Set(recipients.filter(Boolean))];
  if (uniqueRecipients.length === 0) return { success: true, created: 0 };

  const batch = firestore.batch();
  let created = 0;
  const pendingMongo: MongoNotificationDoc[] = [];
  const now = new Date();

  for (const userId of uniqueRecipients) {
    const key = `${idempotencyKey}:${userId}`;
    const existing = await firestore.collection("notifications").where("idempotencyKey", "==", key).limit(1).get();
    if (!existing.empty) continue;

    const ref = firestore.collection("notifications").doc();
    batch.set(ref, {
      userId,
      type,
      title,
      body,
      entityType: entityType || null,
      entityId: entityId || null,
      actorId: actorId || null,
      isRead: false,
      readAt: null,
      createdAt: FieldValue.serverTimestamp(),
      idempotencyKey: key,
    });
    pendingMongo.push({
      firestoreId: ref.id,
      userId,
      type,
      title,
      body,
      entityType: entityType || null,
      entityId: entityId || null,
      actorId: actorId || null,
      isRead: false,
      readAt: null,
      createdAt: now,
      idempotencyKey: key,
    });
    created += 1;
  }

  if (created > 0) {
    await batch.commit();
    const db = await getDb();
    await db.collection<MongoNotificationDoc>("notifications").insertMany(pendingMongo);
  }

  if (sendPush && created > 0) {
    const tokens = await getActiveDeviceTokens(uniqueRecipients);
    if (tokens.length > 0) {
      try {
        const messaging = getAdminMessaging();
        const res = await messaging.sendEachForMulticast({
          tokens,
          notification: { title, body },
          data: {
            type,
            entityType: entityType || "",
            entityId: entityId || "",
            route: route || "/notifications",
          },
        });
        const invalid: string[] = [];
        res.responses.forEach((r, i) => {
          if (!r.success && r.error?.code === "messaging/registration-token-not-registered") {
            invalid.push(tokens[i]!);
          }
        });
        await disableInvalidTokens(invalid);
      } catch (error) {
        console.error("FCM send error:", error);
      }
    }
  }

  return { success: true, created };
}

export async function fetchNotificationsPaginated(
  userId: string,
  options: { page?: number; limit?: number; unreadOnly?: boolean } = {}
) {
  const db = await getDb();
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(50, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = { userId };
  if (options.unreadOnly) filter.isRead = false;

  let total = await db.collection<MongoNotificationDoc>("notifications").countDocuments(filter);

  if (total === 0 && page === 1) {
    await backfillNotificationsFromFirestore(userId);
    total = await db.collection<MongoNotificationDoc>("notifications").countDocuments(filter);
  }

  const [items, unreadCount] = await Promise.all([
    db.collection<MongoNotificationDoc>("notifications").find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    db.collection<MongoNotificationDoc>("notifications").countDocuments({ userId, isRead: false }),
  ]);

  return {
    success: true,
    notifications: items.map((n) => ({
      id: n.firestoreId,
      userId: n.userId,
      type: n.type,
      title: n.title,
      body: n.body,
      entityType: n.entityType,
      entityId: n.entityId,
      isRead: n.isRead,
      createdAt: n.createdAt,
    })),
    pagination: paginationMeta(page, limit, total),
    unreadCount,
  };
}

async function backfillNotificationsFromFirestore(userId: string) {
  const firestore = getAdminFirestore();
  const snap = await firestore
    .collection("notifications")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  if (snap.empty) return;

  const db = await getDb();
  const docs: MongoNotificationDoc[] = [];

  snap.docs.forEach((doc) => {
    const data = doc.data();
    docs.push({
      firestoreId: doc.id,
      userId: String(data.userId),
      type: data.type,
      title: data.title,
      body: data.body,
      entityType: data.entityType ?? null,
      entityId: data.entityId ?? null,
      actorId: data.actorId ?? null,
      isRead: Boolean(data.isRead),
      readAt: data.readAt ? new Date(String(data.readAt)) : null,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      idempotencyKey: data.idempotencyKey || `${doc.id}:${userId}`,
    });
  });

  for (const doc of docs) {
    await db.collection<MongoNotificationDoc>("notifications").updateOne(
      { idempotencyKey: doc.idempotencyKey },
      { $setOnInsert: doc },
      { upsert: true }
    );
  }
}

export async function markNotificationRead(notificationId: string, userId: string) {
  const firestore = getAdminFirestore();
  const ref = firestore.collection("notifications").doc(notificationId);
  const snap = await ref.get();
  if (!snap.exists) return { success: false, message: "Not found", status: 404 };
  const data = snap.data();
  if (data?.userId !== userId) return { success: false, message: "Forbidden", status: 403 };

  const readAt = FieldValue.serverTimestamp();
  await ref.update({ isRead: true, readAt });

  const db = await getDb();
  await db.collection<MongoNotificationDoc>("notifications").updateOne(
    { firestoreId: notificationId, userId },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return { success: true };
}

export async function markAllNotificationsRead(userId: string) {
  const firestore = getAdminFirestore();
  const snap = await firestore
    .collection("notifications")
    .where("userId", "==", userId)
    .where("isRead", "==", false)
    .limit(200)
    .get();
  if (snap.empty) return { success: true, updated: 0 };

  const batch = firestore.batch();
  snap.docs.forEach((doc) => {
    batch.update(doc.ref, { isRead: true, readAt: FieldValue.serverTimestamp() });
  });
  await batch.commit();

  const db = await getDb();
  const result = await db.collection<MongoNotificationDoc>("notifications").updateMany(
    { userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return { success: true, updated: result.modifiedCount || snap.size };
}

export async function registerFcmDevice(input: {
  userId: string;
  deviceId: string;
  token: string;
  userAgent?: string;
}) {
  const db = await getDb();
  const now = new Date();
  const docId = deviceDocId(input.userId, input.deviceId);
  await db.collection<FcmDeviceDoc & { docId: string }>("fcm_devices").updateOne(
    { docId },
    {
      $set: {
        docId,
        userId: input.userId,
        deviceId: input.deviceId,
        token: input.token,
        platform: "web",
        userAgent: input.userAgent || "",
        enabled: true,
        lastSeenAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
  return { success: true };
}

export async function removeFcmDevice(userId: string, deviceId: string) {
  const db = await getDb();
  await db.collection<FcmDeviceDoc & { docId: string }>("fcm_devices").updateOne(
    { docId: deviceDocId(userId, deviceId) },
    { $set: { enabled: false, lastSeenAt: new Date() } }
  );
  return { success: true };
}

export async function notifyAdmins(input: Omit<CreateNotificationInput, "recipients">) {
  const db = await getDb();
  const admins = await db.collection("users").find({ role: "admin" }).project({ _id: 1 }).toArray();
  const recipients = admins.map((a) => String(a._id));
  return createNotification({ ...input, recipients });
}
