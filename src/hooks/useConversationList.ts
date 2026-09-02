"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebaseClient";
import { authHeaders } from "@/lib/cart";
import { isChatEnabled } from "@/lib/firebaseConfig";

export interface LiveConversation {
  id: string;
  type?: string;
  customerId?: string;
  updatedAt?: unknown;
  lastMessage?: string | { preview?: string } | null;
  customerName?: string;
  customerEmail?: string;
  unreadCount?: number;
}

function mergeConversation(
  base: LiveConversation,
  update: Partial<LiveConversation>
): LiveConversation {
  return {
    ...base,
    ...update,
    customerName: update.customerName ?? base.customerName,
    customerEmail: update.customerEmail ?? base.customerEmail,
  };
}

function mapFirestoreConversation(id: string, data: DocumentData): LiveConversation {
  return {
    id,
    type: data.type,
    customerId: data.customerId,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    updatedAt: data.updatedAt,
    lastMessage: data.lastMessage ?? null,
  };
}

function sortConversations(list: LiveConversation[]) {
  return [...list].sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt));
}

function toMillis(value: unknown) {
  if (!value) return 0;
  if (typeof value === "string") return new Date(value).getTime() || 0;
  if (typeof value === "object" && value !== null) {
    if ("toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
      return (value as { toDate: () => Date }).toDate().getTime();
    }
    if ("seconds" in value) return (value as { seconds: number }).seconds * 1000;
    if ("_seconds" in value) return (value as { _seconds: number })._seconds * 1000;
  }
  return 0;
}

export function useConversationList(userId: string | null, isAdmin: boolean, firebaseReady: boolean) {
  const [conversations, setConversations] = useState<LiveConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const metaRef = useRef<Map<string, Pick<LiveConversation, "customerName" | "customerEmail" | "unreadCount">>>(
    new Map()
  );

  const loadFromApi = useCallback(async () => {
    if (!userId || !isChatEnabled()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/conversations", { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to load conversations");
      const list: LiveConversation[] = data.conversations ?? [];
      metaRef.current = new Map(
        list.map((c) => [
          c.id,
          { customerName: c.customerName, customerEmail: c.customerEmail, unreadCount: c.unreadCount },
        ])
      );
      setConversations(sortConversations(list));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (firebaseReady && userId && isChatEnabled()) {
      loadFromApi();
    } else if (firebaseReady && !userId) {
      setLoading(false);
    }
  }, [firebaseReady, userId, loadFromApi]);

  useEffect(() => {
    if (!firebaseReady || !userId || !isChatEnabled()) return;

    const db = getFirebaseDb();
    const liveQuery = isAdmin
      ? query(
          collection(db, "conversations"),
          where("participantIds", "array-contains", userId),
          orderBy("updatedAt", "desc"),
          limit(50)
        )
      : query(
          collection(db, "conversations"),
          where("type", "==", "support"),
          where("customerId", "==", userId),
          limit(5)
        );

    const unsub = onSnapshot(
      liveQuery,
      (snap) => {
        setConversations((prev) => {
          const byId = new Map(prev.map((c) => [c.id, c]));
          snap.docs.forEach((docSnap) => {
            const meta = metaRef.current.get(docSnap.id);
            const mapped = mapFirestoreConversation(docSnap.id, docSnap.data());
            const existing = byId.get(docSnap.id);
            byId.set(
              docSnap.id,
              mergeConversation(existing || mapped, {
                ...mapped,
                customerName: meta?.customerName ?? mapped.customerName ?? existing?.customerName,
                customerEmail: meta?.customerEmail ?? mapped.customerEmail ?? existing?.customerEmail,
                unreadCount: meta?.unreadCount ?? existing?.unreadCount,
              })
            );
          });
          return sortConversations(Array.from(byId.values()));
        });
        setLoading(false);
      },
      (err) => {
        console.error("Conversation listener error:", err);
        const isPermissionDenied =
          err.code === "permission-denied" ||
          err.message.toLowerCase().includes("insufficient permissions");
        if (isPermissionDenied) {
          // Keep API-loaded data; poll instead of blocking the inbox.
          setError((prev) =>
            prev ||
            "Live sync unavailable showing saved conversations. Deploy Firestore rules if this persists."
          );
        } else {
          setError(err.message);
        }
      }
    );

    return () => unsub();
  }, [firebaseReady, userId, isAdmin]);

  return { conversations, loading, error, reload: loadFromApi, setConversations };
}
