import { randomUUID } from "node:crypto";

import { hasSupabaseWriteConfig } from "@/lib/env";
import { sendWhatsAppText } from "@/lib/twilio";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { findUserById } from "@/lib/users/store";
import type {
  AppNotification,
  CreateNotificationPayload,
} from "@/lib/notifications/types";

declare global {
  var __agriflowNotifications: Map<string, AppNotification> | undefined;
}

type PersistedNotificationRow = {
  id: string;
  user_id: string;
  channel: AppNotification["channel"];
  kind: string;
  title: string | null;
  message: string;
  language: string;
  payload: Record<string, unknown> | null;
  delivery_status: AppNotification["deliveryStatus"];
  sent_at: string | null;
  read_at: string | null;
  created_at: string;
};

function getNotificationStore() {
  if (!globalThis.__agriflowNotifications) {
    globalThis.__agriflowNotifications = new Map<string, AppNotification>();
  }

  return globalThis.__agriflowNotifications;
}

export function resetFallbackNotifications() {
  if (hasSupabaseWriteConfig()) {
    return;
  }

  globalThis.__agriflowNotifications = new Map<string, AppNotification>();
}

function mapNotificationRow(row: PersistedNotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    channel: row.channel,
    kind: row.kind,
    title: row.title,
    message: row.message,
    language: row.language,
    payload: row.payload ?? {},
    deliveryStatus: row.delivery_status,
    sentAt: row.sent_at,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

function buildNotification(payload: CreateNotificationPayload): AppNotification {
  const createdAt = new Date().toISOString();

  return {
    id: randomUUID(),
    userId: payload.userId,
    channel: payload.channel,
    kind: payload.kind,
    title: payload.title ?? null,
    message: payload.message,
    language: payload.language ?? "te",
    payload: payload.payload ?? {},
    deliveryStatus: payload.deliveryStatus ?? "SENT",
    sentAt: payload.sentAt ?? createdAt,
    readAt: null,
    createdAt,
  };
}

export async function createNotification(payload: CreateNotificationPayload) {
  let deliveryStatus = payload.deliveryStatus ?? "SENT";
  let sentAt: string | undefined = payload.sentAt ?? new Date().toISOString();

  if (payload.channel === "WHATSAPP" && !payload.userId.startsWith("demo-")) {
    try {
      const user = await findUserById(payload.userId);

      if (user?.phone) {
        await sendWhatsAppText({
          to: user.phone,
          body: payload.message,
        });
      } else {
        deliveryStatus = "PENDING";
        sentAt = undefined;
      }
    } catch {
      deliveryStatus = "FAILED";
      sentAt = undefined;
    }
  }

  const notification = buildNotification({
    ...payload,
    deliveryStatus,
    sentAt,
  });

  if (!hasSupabaseWriteConfig() || notification.userId.startsWith("demo-")) {
    getNotificationStore().set(notification.id, notification);
    return notification;
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .insert({
      user_id: notification.userId,
      channel: notification.channel,
      kind: notification.kind,
      title: notification.title,
      message: notification.message,
      language: notification.language,
      payload: notification.payload,
      delivery_status: notification.deliveryStatus,
      sent_at: notification.sentAt,
      read_at: notification.readAt,
    } as never)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create notification: ${error.message}`);
  }

  return mapNotificationRow(data as PersistedNotificationRow);
}

export async function listNotificationsForUser(userId: string, limit = 8) {
  if (!hasSupabaseWriteConfig() || userId.startsWith("demo-")) {
    return Array.from(getNotificationStore().values())
      .filter((notification) => notification.userId === userId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit);
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to list notifications: ${error.message}`);
  }

  return ((data ?? []) as PersistedNotificationRow[]).map(mapNotificationRow);
}

export async function markNotificationRead(notificationId: string) {
  const current = Array.from(getNotificationStore().values()).find(
    (notification) => notification.id === notificationId,
  );

  if (!hasSupabaseWriteConfig() || current?.userId.startsWith("demo-")) {
    if (!current) {
      return null;
    }

    const next: AppNotification = {
      ...current,
      deliveryStatus: "READ",
      readAt: new Date().toISOString(),
    };
    getNotificationStore().set(next.id, next);
    return next;
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .update({
      delivery_status: "READ",
      read_at: new Date().toISOString(),
    } as never)
    .eq("id", notificationId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to mark notification read: ${error.message}`);
  }

  return mapNotificationRow(data as PersistedNotificationRow);
}
