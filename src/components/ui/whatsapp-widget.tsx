"use client";

import { useState } from "react";
import { Mic, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";

export function WhatsAppWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { dict } = useI18n();
  const d = dict as any;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 sm:bottom-8 sm:right-8">
      {isOpen && (
        <div className="animate-in slide-in-from-bottom-5 fade-in zoom-in-95 w-[90vw] max-w-[340px] origin-bottom-right rounded-[1.75rem] border border-border/60 bg-card/95 p-5 shadow-[0_24px_80px_-24px_rgba(37,211,102,0.3)] backdrop-blur-xl duration-300">
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
              {d.common?.waWidgetTitle ?? "Talk to AgriFlow AI"}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {d.common?.waWidgetDesc ?? "Send a voice note in Hindi, Telugu, Kannada, or English on WhatsApp to match your inventory, get recommendations, or negotiate prices instantly."}
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-[1rem] bg-[#25D366]/10 px-4 py-3 text-sm text-[#25D366]">
              <span className="font-medium">{d.common?.waWidgetTry ?? "Try saying:"}</span> 
              <br />
              <span className="opacity-90">"I have 50 quintals of Guntur onions, who is paying the best price?"</span>
            </div>

            <Button
              asChild
              className="w-full rounded-[1.25rem] bg-[#25D366] text-white hover:bg-[#25D366]/90 font-medium"
            >
              <a
                href="https://wa.me/14155238886?text=Hi"
                target="_blank"
                rel="noreferrer noopener"
                onClick={() => setIsOpen(false)}
              >
                <MessageCircle className="mr-2 size-4" />
                {d.common?.waWidgetConnect ?? "Connect on WhatsApp"}
              </a>
            </Button>
          </div>
        </div>
      )}

      <button
        type="button"
        className={cn(
          "group flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-all duration-300 hover:scale-105 active:scale-95",
          isOpen ? "bg-card text-foreground border border-border/50" : "shadow-[0_8px_32px_-8px_rgba(37,211,102,0.6)]"
        )}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="WhatsApp Assistant"
      >
        {isOpen ? (
          <X className="size-6 transition-transform duration-300 group-hover:rotate-90" />
        ) : (
          <MessageCircle className="size-7" />
        )}
      </button>
    </div>
  );
}
