"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Wifi, WifiOff, Loader2, Trash2 } from "lucide-react";

type TelegramStatus = "disconnected" | "connected";

export default function TelegramPage() {
  const [status, setStatus] = useState<TelegramStatus>("disconnected");
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    const res = await fetch("/api/telegram/status");
    const data = await res.json();
    setStatus(data.status);
    setBotUsername(data.botUsername);
  }

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        setStatus(data.status || "connected");
        setBotUsername(data.botUsername);
      }
    } catch {
      setError("Failed to connect.");
    }
    setConnecting(false);
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    await fetch("/api/telegram/disconnect", { method: "POST" });
    setStatus("disconnected");
    setBotUsername(null);
    setDisconnecting(false);
  }

  return (
    <main className="mx-auto max-w-md p-6 pb-24">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/"
          className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-accent"
        >
          ← Back
        </Link>
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-blue-500">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
          <h1 className="text-2xl font-bold tracking-tight">Telegram Bot</h1>
        </div>
      </div>

      {/* Connection Status Card */}
      <div className="mb-6 rounded-2xl bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status === "connected" ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Wifi size={20} className="text-blue-600" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <WifiOff size={20} className="text-muted-foreground" />
              </div>
            )}
            <div>
              <div className="font-semibold">
                {status === "connected" ? "Connected" : "Disconnected"}
              </div>
              {botUsername && (
                <div className="text-sm text-muted-foreground">
                  @{botUsername}
                </div>
              )}
              {status === "disconnected" && (
                <div className="text-sm text-muted-foreground">
                  Set TELEGRAM_BOT_TOKEN in .env.local, then connect
                </div>
              )}
            </div>
          </div>

          {status === "disconnected" && (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
            >
              {connecting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Connect"
              )}
            </button>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* Connected state */}
      {status === "connected" && (
        <>
          {/* Info */}
          <div className="mb-6 rounded-2xl border-2 border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-800">
              Bot is listening for commands. Send messages to @{botUsername} on
              Telegram. Daily standups are sent at 08:00 by default.
            </p>
          </div>

          {/* Command Reference */}
          <div className="mb-6 rounded-2xl bg-card p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">Commands</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5">/talked</code>{" "}
                <span className="text-muted-foreground">— general interaction</span>
              </li>
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5">/called</code>{" "}
                <span className="text-muted-foreground">— phone call</span>
              </li>
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5">/texted</code>{" "}
                <span className="text-muted-foreground">— text message</span>
              </li>
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5">/emailed</code>{" "}
                <span className="text-muted-foreground">— email</span>
              </li>
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5">/coffee</code>{" "}
                <span className="text-muted-foreground">— coffee meetup</span>
              </li>
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5">/met</code>{" "}
                <span className="text-muted-foreground">— hangout</span>
              </li>
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5">/standup</code>{" "}
                <span className="text-muted-foreground">— send today&apos;s standup now</span>
              </li>
            </ul>
            <div className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              Example: <code>/talked Bob Smith had a rough day</code>
            </div>
          </div>

          {/* Disconnect */}
          <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5">
            <h3 className="mb-2 text-sm font-semibold text-red-800">
              Danger Zone
            </h3>
            <p className="mb-3 text-sm text-red-600">
              Disconnect will stop the Telegram bot from listening for commands.
            </p>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
            >
              <Trash2 size={14} />
              {disconnecting ? "Disconnecting..." : "Disconnect Bot"}
            </button>
          </div>
        </>
      )}

      {/* Command Reference when disconnected */}
      {status === "disconnected" && (
        <div className="rounded-2xl bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Commands</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Once connected, you can send these commands to your bot:
          </p>
          <ul className="space-y-2 text-sm">
            <li>
              <code className="rounded bg-muted px-1.5 py-0.5">/talked</code>{" "}
              <span className="text-muted-foreground">— general interaction</span>
            </li>
            <li>
              <code className="rounded bg-muted px-1.5 py-0.5">/called</code>{" "}
              <span className="text-muted-foreground">— phone call</span>
            </li>
            <li>
              <code className="rounded bg-muted px-1.5 py-0.5">/texted</code>{" "}
              <span className="text-muted-foreground">— text message</span>
            </li>
            <li>
              <code className="rounded bg-muted px-1.5 py-0.5">/emailed</code>{" "}
              <span className="text-muted-foreground">— email</span>
            </li>
            <li>
              <code className="rounded bg-muted px-1.5 py-0.5">/coffee</code>{" "}
              <span className="text-muted-foreground">— coffee meetup</span>
            </li>
            <li>
              <code className="rounded bg-muted px-1.5 py-0.5">/met</code>{" "}
              <span className="text-muted-foreground">— hangout</span>
            </li>
            <li>
              <code className="rounded bg-muted px-1.5 py-0.5">/standup</code>{" "}
              <span className="text-muted-foreground">— send today&apos;s standup now</span>
            </li>
          </ul>
          <div className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Example: <code>/talked Bob Smith had a rough day</code>
          </div>
        </div>
      )}
    </main>
  );
}
