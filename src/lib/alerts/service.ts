import { resolveAgmarknetFeed } from "@/lib/agmarknet/service";
import { scoreSpoilageRisk } from "@/lib/inventory/scoring";
import {
  listAllInventory,
  refreshInventoryRiskAssessment,
} from "@/lib/inventory/store";
import { loadStoredGapsForCrop } from "@/lib/market/repository";
import { createNotification } from "@/lib/notifications/store";
import { generateRecommendationsForInventory } from "@/lib/recommendations/engine";
import {
  DEMO_FPO_CONTACT,
  DEMO_FPO_OWNER_ID,
} from "@/lib/users/demo";
import {
  findUserById,
  listFarmersWithCrops,
} from "@/lib/users/store";
import type { SupportedLanguage } from "@/lib/whatsapp/types";
import { computePriceGaps } from "@/lib/market/engine";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function daysUntil(dateValue: string) {
  const diff = new Date(`${dateValue}T23:59:59.000Z`).getTime() - Date.now();
  return Math.max(1, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

async function loadRoutesForCrop(cropSlug: string) {
  let routes = await loadStoredGapsForCrop(cropSlug, 12);

  if (routes.length === 0) {
    const feed = await resolveAgmarknetFeed({
      cropSlugs: [cropSlug],
      historyDays: 7,
      mode: "auto",
    });
    routes = computePriceGaps(feed.records).filter((route) => route.cropSlug === cropSlug);
  }

  return routes;
}

function formatDailyAlertMessage(language: SupportedLanguage, input: {
  cropName: string;
  sourceDistrict: string;
  targetDistrict: string;
  priceGap: number;
  targetPrice: number;
}) {
  if (language === "te") {
    return `${input.cropName} lo ${input.sourceDistrict} nundi ${input.targetDistrict} ki ${formatCurrency(input.priceGap)} gap undi. Target price ${formatCurrency(input.targetPrice)}.`;
  }

  if (language === "hi") {
    return `${input.cropName} mein ${input.sourceDistrict} se ${input.targetDistrict} tak ${formatCurrency(input.priceGap)} gap hai. Target price ${formatCurrency(input.targetPrice)}.`;
  }

  if (language === "kn") {
    return `${input.cropName} ge ${input.sourceDistrict} inda ${input.targetDistrict} varege ${formatCurrency(input.priceGap)} gap ide. Target price ${formatCurrency(input.targetPrice)}.`;
  }

  return `${input.cropName} has a ${formatCurrency(input.priceGap)} opportunity from ${input.sourceDistrict} to ${input.targetDistrict}. Target price is ${formatCurrency(input.targetPrice)}.`;
}

export async function runDailyAlerts() {
  const farmers = await listFarmersWithCrops();
  const notifications = [];

  for (const entry of farmers) {
    for (const crop of entry.crops) {
      if (!crop.alertThreshold) {
        continue;
      }

      const routes = await loadRoutesForCrop(crop.cropSlug);
      const route =
        routes.find((item) => item.sourceDistrict === (crop.district ?? entry.user.district)) ??
        routes[0];

      if (!route || route.priceGap < crop.alertThreshold) {
        continue;
      }

      const channel = entry.user.phone ? "WHATSAPP" : "SMS";
      const notification = await createNotification({
        userId: entry.user.id,
        channel,
        kind: "DAILY_PRICE_ALERT",
        title: `${crop.cropName} opportunity alert`,
        message: formatDailyAlertMessage(entry.user.preferredLanguage, {
          cropName: crop.cropName,
          sourceDistrict: route.sourceDistrict,
          targetDistrict: route.targetDistrict,
          priceGap: route.priceGap,
          targetPrice: route.targetModalPrice,
        }),
        language: entry.user.preferredLanguage,
        payload: {
          cropSlug: crop.cropSlug,
          threshold: crop.alertThreshold,
          route,
        },
      });

      notifications.push(notification);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    farmersChecked: farmers.length,
    alertsSent: notifications.length,
    notifications,
  };
}

function formatSpoilageAlert(language: SupportedLanguage, input: {
  cropName: string;
  district: string;
  score: number;
  daysLeft: number;
  targetDistrict?: string;
  netProfit?: number | null;
}) {
  if (language === "te") {
    return `${input.cropName} stock ${input.district} lo risk ${input.score.toFixed(0)}. ${input.daysLeft} rojullo move cheyyali. ${input.targetDistrict ? `${input.targetDistrict} route ${formatCurrency(input.netProfit ?? 0)} net margin istundi.` : ""}`;
  }

  if (language === "hi") {
    return `${input.cropName} stock ${input.district} mein risk ${input.score.toFixed(0)} hai. ${input.daysLeft} din mein move kijiye. ${input.targetDistrict ? `${input.targetDistrict} route ${formatCurrency(input.netProfit ?? 0)} net margin de raha hai.` : ""}`;
  }

  if (language === "kn") {
    return `${input.cropName} stock ${input.district} alli risk ${input.score.toFixed(0)} ide. ${input.daysLeft} dina olage move madi. ${input.targetDistrict ? `${input.targetDistrict} route ${formatCurrency(input.netProfit ?? 0)} net margin kodutte.` : ""}`;
  }

  return `${input.cropName} inventory in ${input.district} is now at risk ${input.score.toFixed(0)}. Move within ${input.daysLeft} day(s). ${input.targetDistrict ? `${input.targetDistrict} currently offers about ${formatCurrency(input.netProfit ?? 0)} net margin.` : ""}`;
}

export async function runSpoilageChecks() {
  const inventory = await listAllInventory();
  const alerts = [];
  const reports = [];
  const groupedByOwner = new Map<string, Awaited<ReturnType<typeof refreshInventoryRiskAssessment>>[]>();

  for (const item of inventory) {
    if (item.status !== "ACTIVE") {
      continue;
    }

    const spoilage = scoreSpoilageRisk({
      cropSlug: item.cropSlug,
      district: item.district,
      state: item.state,
      deadlineDate: item.deadlineDate,
      storageType: item.storageType ?? undefined,
      temperatureCelsius: item.temperatureCelsius ?? undefined,
      humidityPercent: item.humidityPercent ?? undefined,
    });
    const refreshed = await refreshInventoryRiskAssessment(item.id, spoilage);
    const current = groupedByOwner.get(item.ownerUserId) ?? [];
    current.push(refreshed);
    groupedByOwner.set(item.ownerUserId, current);

    const daysLeft = daysUntil(refreshed.deadlineDate);

    if (spoilage.score <= 70 && daysLeft > 3) {
      continue;
    }

    const recommendation = (await generateRecommendationsForInventory(item.id, {
      force: true,
    }))[0];
    const owner = await findUserById(item.ownerUserId);
    const language = owner?.preferredLanguage ?? "en";
    const notification = await createNotification({
      userId: item.ownerUserId,
      channel: "WHATSAPP",
      kind: "SPOILAGE_ALERT",
      title: `${item.cropName} needs movement`,
      message: formatSpoilageAlert(language, {
        cropName: item.cropName,
        district: item.district,
        score: spoilage.score,
        daysLeft,
        targetDistrict: recommendation?.targetDistrict,
        netProfit: recommendation?.totalNetProfitInr ?? null,
      }),
      language,
      payload: {
        inventoryId: item.id,
        recommendationId: recommendation?.id ?? null,
        spoilageScore: spoilage.score,
      },
    });
    alerts.push(notification);

    await createNotification({
      userId: item.ownerUserId,
      channel: "PUSH",
      kind: "SPOILAGE_PUSH_PREVIEW",
      title: `${item.cropName} spoilage alert`,
      message: `${item.cropName} in ${item.district} needs action within ${daysLeft} day(s).`,
      language,
      payload: {
        inventoryId: item.id,
        severity: spoilage.level,
      },
    });
  }

  for (const [ownerUserId, items] of groupedByOwner.entries()) {
    const owner =
      (await findUserById(ownerUserId)) ??
      ({
        preferredLanguage: "en",
        email: DEMO_FPO_CONTACT.email,
        fullName: DEMO_FPO_CONTACT.fullName,
        organizationName: DEMO_FPO_CONTACT.organizationName,
      } as const);
    const criticalLots = items.filter((item) => item.spoilageLevel === "CRITICAL").length;
    const urgentLots = items.filter(
      (item) => item.spoilageLevel === "HIGH" || item.spoilageLevel === "CRITICAL",
    ).length;
    const report = await createNotification({
      userId: ownerUserId === DEMO_FPO_OWNER_ID ? DEMO_FPO_OWNER_ID : ownerUserId,
      channel: "EMAIL",
      kind: "FPO_DAILY_REPORT",
      title: "Daily market summary",
      message: `${owner.organizationName ?? owner.fullName}: ${items.length} active lots, ${urgentLots} urgent, ${criticalLots} critical. Top deadline board should be reviewed today.`,
      language: owner.preferredLanguage,
      payload: {
        ownerEmail: owner.email,
        inventoryCount: items.length,
        urgentLots,
        criticalLots,
      },
    });
    reports.push(report);
  }

  return {
    generatedAt: new Date().toISOString(),
    inventoryChecked: inventory.length,
    alertsSent: alerts.length,
    reportsGenerated: reports.length,
    alerts,
    reports,
  };
}
