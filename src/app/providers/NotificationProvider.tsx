"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebaseClient";
import { useFirebase } from "@/app/providers/FirebaseProvider";
import { isChatEnabled } from "@/lib/firebaseConfig";
import type { NotificationType } from "@/types/notifications";

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  createdAt?: { toDate?: () => Date } | Date | string | null;
}

type NotificationContextValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { firebaseUser, ready } = useFirebase();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isChatEnabled() || !ready || !firebaseUser) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(getFirebaseDb(), "notifications"),
      where("userId", "==", firebaseUser.uid),
      orderBy("createdAt", "desc"),
      limit(30)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setNotifications(
          snap.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<NotificationItem, "id">),
          }))
        );
        setLoading(false);
      },
      (err) => {
        console.error("Notification listener error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [firebaseUser, ready]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const value = useMemo(
    () => ({ notifications, unreadCount, loading }),
    [notifications, unreadCount, loading]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
