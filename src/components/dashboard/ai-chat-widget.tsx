"use client";

import { useRef, useState } from "react";
import { Bot, MessageCircle, Send, X } from "lucide-react";

import { useI18n } from "@/lib/i18n/context";

type Message = {
  role: "user" | "assistant";
  text: string;
};

export function AiChatWidget({ userId }: { userId: string }) {
  const { dict } = useI18n();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    dict.common.quickPromptUrgentInventory,
    dict.common.quickPromptSellOrHold,
    dict.common.quickPromptWhichFpo,
    dict.common.quickPromptBestMarket,
  ];

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message: text }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        reply?: string;
        error?: string;
      };
      const reply =
        data.ok && data.reply
          ? data.reply
          : (data.error ?? dict.common.chatError);
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: dict.common.networkError },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 50);
    }
  }

  return (
    <>
      {!open && (
        <button
          id="ai-chat-open-btn"
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-5 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-emerald-600 px-4 py-3 text-white shadow-2xl transition-transform hover:scale-105"
          aria-label={dict.common.openAiAssistant}
        >
          <Bot className="size-5" />
          <span className="hidden text-sm font-bold sm:block">
            {dict.common.askAi}
          </span>
        </button>
      )}

      {open && (
        <div
          id="ai-chat-panel"
          className="fixed bottom-5 right-5 z-50 flex w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-2xl"
          style={{ height: "min(500px, calc(100dvh - 6rem))" }}
        >
          <div className="flex items-center justify-between bg-gradient-to-r from-primary to-emerald-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Bot className="size-5" />
              <span className="text-sm font-bold">
                {dict.common.aiAssistantTitle}
              </span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
                {dict.common.liveData}
              </span>
            </div>
            <button
              id="ai-chat-close-btn"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 transition-colors hover:bg-white/20"
            >
              <X className="size-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="size-4 text-primary" />
                  </div>
                  <div className="rounded-xl rounded-tl-none bg-surface-container px-3 py-2 text-sm text-on-surface">
                    {dict.common.chatGreeting}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="flex items-center gap-2 rounded-lg border border-outline-variant/20 bg-surface-container px-3 py-2 text-left text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high"
                    >
                      <MessageCircle className="size-3 shrink-0 text-primary" />
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 ${
                  msg.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="size-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "rounded-tr-none bg-primary text-white"
                      : "rounded-tl-none bg-surface-container text-on-surface"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-start gap-2">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="size-4 text-primary" />
                </div>
                <div className="rounded-xl rounded-tl-none bg-surface-container px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="size-2 rounded-full bg-primary/60 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex gap-2 border-t border-outline-variant/20 bg-surface-container-low p-3"
          >
            <input
              id="ai-chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={dict.common.chatPlaceholder}
              className="flex-1 rounded-lg border border-outline-variant/20 bg-surface-container px-3 py-2 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/60 focus:ring-2 focus:ring-primary/30"
              disabled={loading}
            />
            <button
              id="ai-chat-send-btn"
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-lg bg-primary px-3 py-2 text-white transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
