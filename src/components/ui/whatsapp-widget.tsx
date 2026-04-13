"use client";

import { useState } from "react";
import { Mic, MessageCircle, Phone, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

type WidgetCopy = {
  waWidgetTitle?: string;
  waWidgetDesc?: string;
  waWidgetTry?: string;
  waWidgetConnect?: string;
};

export function WhatsAppWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { dict } = useI18n();
  const common = dict.common as typeof dict.common & WidgetCopy;

  return (
    <div className="fixed bottom-20 right-6 z-50 flex flex-col items-end gap-3 sm:bottom-8 sm:right-8">
      {isOpen ? (
        <div className="animate-in slide-in-from-bottom-5 fade-in zoom-in-95 w-[90vw] max-w-[360px] origin-bottom-right rounded-[1.75rem] border border-border/60 bg-card/95 p-5 shadow-[0_24px_80px_-24px_rgba(37,211,102,0.3)] backdrop-blur-xl duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#25D366]/10 text-[#25D366]">
              <Mic className="size-5" />
            </div>
            <button
              type="button"
              className="mt-1 text-muted-foreground hover:text-foreground"
              onClick={() => setIsOpen(false)}
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-4">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">
              {common.waWidgetTitle ?? "Talk to AgriFlow AI"}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {common.waWidgetDesc ??
                "Send a voice note in Hindi, Telugu, Kannada, or English on WhatsApp to get prices or find buyers."}
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-[1rem] bg-[#25D366]/10 px-4 py-3 text-sm text-[#25D366]">
              <span className="font-medium">{common.waWidgetTry ?? "Try saying:"}</span>
              <br />
              <span className="opacity-90">
                &quot;What is the price of tomatoes today?&quot;
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                asChild
                className="w-full rounded-[1.25rem] bg-[#25D366] font-medium text-white hover:bg-[#25D366]/90"
              >
                <a
                  href="https://wa.me/14155238886?text=Hi"
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={() => setIsOpen(false)}
                >
                  <MessageCircle className="mr-2 size-4" />
                  {common.waWidgetConnect ?? "Chat on WhatsApp"}
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full rounded-[1.25rem]"
              >
                <a
                  href="tel:+14155238886"
                  onClick={() => setIsOpen(false)}
                >
                  <Phone className="mr-2 size-4" />
                  Call instead
                </a>
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className={cn(
          "group flex size-14 sm:size-16 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-all duration-300 hover:scale-105 active:scale-95",
          isOpen
            ? "border border-border/50 bg-card text-foreground"
            : "shadow-[0_8px_32px_-8px_rgba(37,211,102,0.6)]",
        )}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="WhatsApp Assistant"
      >
        {isOpen ? (
          <X className="size-6 sm:size-7 transition-transform duration-300 group-hover:rotate-90" />
        ) : (
          <MessageCircle className="size-7 sm:size-8" />
        )}
      </button>
    </div>
  );
}
