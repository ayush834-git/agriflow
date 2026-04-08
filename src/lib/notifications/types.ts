export type NotificationChannel = "WHATSAPP" | "SMS" | "EMAIL" | "PUSH";
export type NotificationStatus = "PENDING" | "SENT" | "FAILED" | "READ";

export type AppNotification = {
  id: string;
  userId: string;
  channel: NotificationChannel;
  kind: string;
  title?: string | null;
  message: string;
  language: string;
  payload: Record<string, unknown>;
  deliveryStatus: NotificationStatus;
  sentAt?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export type CreateNotificationPayload = {
  userId: string;
  channel: NotificationChannel;
  kind: string;
  title?: string;
  message: string;
  language?: string;
  payload?: Record<string, unknown>;
  deliveryStatus?: NotificationStatus;
  sentAt?: string;
};
