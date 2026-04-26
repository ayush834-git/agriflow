"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BellRing,
  Check,
  CheckCircle2,
  LoaderCircle,
  Mail,
  Send,
  Smartphone,
} from "lucide-react";
import { useRouter } from "next/navigation";

import type { MarketMatch } from "@/lib/matches/types";
import type { AppNotification } from "@/lib/notifications/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";

type AlertsReportsPanelProps = {
  notifications: AppNotification[];
  matches: MarketMatch[];
  title: string;
  description: string;
};

function channelIcon(channel: AppNotification["channel"]) {
  switch (channel) {
    case "EMAIL":
      return Mail;
    case "PUSH":
      return Smartphone;
    case "SMS":
      return Send;
    case "WHATSAPP":
    default:
      return BellRing;
  }
}

function statusClass(status: AppNotification["deliveryStatus"]) {
  switch (status) {
    case "READ":
      return "border-emerald-200 bg-emerald-100 text-emerald-900";
    case "FAILED":
      return "border-red-200 bg-red-100 text-red-900";
    case "PENDING":
      return "border-amber-200 bg-amber-100 text-amber-900";
    case "SENT":
    default:
      return "border-sky-200 bg-sky-100 text-sky-900";
  }
}

function getMatchStatusLabel(status: MarketMatch["status"], dict: ReturnType<typeof useI18n>["dict"]) {
  switch (status) {
    case "OPEN":
      return dict.alerts.matchStatus.open;
    case "CONTACTED":
      return dict.alerts.matchStatus.contacted;
    case "ACCEPTED":
      return dict.alerts.matchStatus.accepted;
    case "COMPLETED":
      return dict.alerts.matchStatus.completed;
    default:
      return status;
  }
}

export function AlertsReportsPanel({
  notifications,
  matches,
  title,
  description,
}: AlertsReportsPanelProps) {
  const { dict } = useI18n();
  const [pushState, setPushState] = useState<string | null>(null);
  const [activeSimulatingMatchId, setActiveSimulatingMatchId] = useState<string | null>(null);
  const [isSimulating, startTransition] = useTransition();
  const router = useRouter();
  const latestNotification = notifications[0];

  function getChannelLabel(channel: AppNotification["channel"]) {
    switch (channel) {
      case "EMAIL":
        return dict.alerts.email;
      case "SMS":
        return dict.alerts.sms;
      case "PUSH":
        return dict.alerts.push;
      case "WHATSAPP":
      default:
        return dict.alerts.whatsapp;
    }
  }

  return (
    <section className="rounded-[2rem] border border-border/70 bg-card/88 p-5 shadow-[0_30px_90px_-64px_rgba(29,77,50,0.45)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
            {dict.alerts.alertsAndInbox}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            if (typeof window === "undefined" || !("Notification" in window)) {
              setPushState(dict.alerts.browserNotSupported);
              return;
            }

            const permission = await Notification.requestPermission();

            if (permission !== "granted") {
              setPushState(dict.alerts.permissionDeniedPushDisabled);
              return;
            }

            const message =
              latestNotification?.message ?? dict.alerts.agriflowAlertsReady;
            new Notification(dict.alerts.notificationTitle, {
              body: message,
            });
            setPushState(dict.alerts.pushPermissionGranted);
          }}
        >
          <BellRing className="size-4" />
          {dict.alerts.enablePushPreview}
        </Button>
      </div>

      {pushState ? (
        <p className="mt-4 text-sm text-muted-foreground">{pushState}</p>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {notifications.map((notification) => {
              const Icon = channelIcon(notification.channel);

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  key={notification.id}
                  className="rounded-[1.3rem] border border-border/70 bg-background/65 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {notification.title ?? notification.kind}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                    <Badge className={cn("border", statusClass(notification.deliveryStatus))}>
                      {getChannelLabel(notification.channel)}
                    </Badge>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {notifications.length === 0 ? (
            <motion.div
              layout
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-[1.3rem] border border-dashed border-border/70 bg-background/60 p-4 text-sm text-muted-foreground"
            >
              {dict.alerts.noAlertsYet}
            </motion.div>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="rounded-[1.3rem] border border-border/70 bg-background/65 p-4">
            <p className="text-sm font-medium">{dict.alerts.liveMatches}</p>
            <div className="mt-3 space-y-3 text-sm text-muted-foreground">
              <AnimatePresence mode="popLayout" initial={false}>
                {matches.map((match) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    key={match.id}
                    className="rounded-[1rem] border border-border/60 bg-card/90 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-foreground">{match.cropName}</p>
                      <Badge className="border border-white/0 bg-white/70 text-foreground">
                        {getMatchStatusLabel(match.status, dict)}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <p>
                        {match.quantityKg?.toLocaleString("en-IN") ?? "--"} kg ·{" "}
                        {match.offeredPricePerKg
                          ? `₹${match.offeredPricePerKg}/kg`
                          : dict.alerts.priceOpen}
                      </p>
                      {match.status === "CONTACTED" || match.status === "OPEN" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isSimulating && activeSimulatingMatchId === match.id}
                          className="h-8 text-xs font-semibold"
                          onClick={() => {
                            startTransition(async () => {
                              setActiveSimulatingMatchId(match.id);
                              await fetch("/api/matches/simulate-accept", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ matchId: match.id }),
                              });
                              setActiveSimulatingMatchId(null);
                              router.refresh();
                            });
                          }}
                        >
                          {isSimulating && activeSimulatingMatchId === match.id ? (
                            <>
                              <LoaderCircle className="mr-1 size-3 animate-spin" />
                              {dict.alerts.simulating}
                            </>
                          ) : (
                            <>
                              <Check className="mr-1 size-3 text-emerald-600" />
                              {dict.alerts.demoWhatsappYes}
                            </>
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {matches.length === 0 ? (
                <motion.p
                  layout
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {dict.alerts.noActiveMatchRecords}
                </motion.p>
              ) : null}
            </div>
          </div>

          <div className="rounded-[1.3rem] border border-border/70 bg-background/65 p-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-4 text-primary" />
              {dict.alerts.emailSummaryNote}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
