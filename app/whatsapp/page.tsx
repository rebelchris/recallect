"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MessageCircle,
  Wifi,
  WifiOff,
  Loader2,
  Trash2,
  LinkIcon,
  RefreshCw,
} from "lucide-react";

type WhatsAppStatus = "disconnected" | "qr" | "connecting" | "ready";

interface ChatItem {
  id: string;
  name: string;
  lastMessage: string | null;
  timestamp: string | null;
  matchedContact: { id: string; name: string } | null;
}

export default function WhatsAppPage() {
  const [status, setStatus] = useState<WhatsAppStatus>("disconnected");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  async function fetchStatus() {
    const res = await fetch("/api/whatsapp/status");
    const data = await res.json();
    setStatus(data.status);
    setQrDataUrl(data.qrDataUrl);
    setConnectedPhone(data.connectedPhone);
  }

  async function fetchChats() {
    setLoadingChats(true);
    const res = await fetch("/api/whatsapp/chats");
    if (res.ok) {
      setChats(await res.json());
    }
    setLoadingChats(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      const res = await fetch("/api/whatsapp/status");
      const data = await res.json();
      if (cancelled) return;
      setStatus(data.status);
      setQrDataUrl(data.qrDataUrl);
      setConnectedPhone(data.connectedPhone);
    }

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== "ready") return;

    let cancelled = false;

    async function loadChats() {
      setLoadingChats(true);
      const res = await fetch("/api/whatsapp/chats");
      if (cancelled) return;
      if (res.ok) {
        setChats(await res.json());
      }
      setLoadingChats(false);
    }

    void loadChats();

    return () => {
      cancelled = true;
    };
  }, [status]);

  async function handleConnect() {
    setConnecting(true);
    await fetch("/api/whatsapp/connect", { method: "POST" });

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource("/api/whatsapp/qr");
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.qr) {
        setQrDataUrl(data.qr);
        setStatus("qr");
        setConnecting(false);
      }
      if (data.status) {
        setStatus(data.status);
        if (data.status === "ready") {
          setQrDataUrl(null);
          setConnecting(false);
          void fetchStatus();
          es.close();
        }
        if (data.status === "disconnected") {
          setConnecting(false);
          es.close();
        }
      }
    };

    es.onerror = () => {
      setConnecting(false);
      es.close();
    };
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    await fetch("/api/whatsapp/disconnect", { method: "POST" });
    setStatus("disconnected");
    setConnectedPhone(null);
    setQrDataUrl(null);
    setChats([]);
    setDisconnecting(false);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
  }

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

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
          <MessageCircle size={24} className="text-green-500" />
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp Sync</h1>
        </div>
      </div>

      {/* Connection Status Card */}
      <div className="mb-6 rounded-2xl bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status === "ready" ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <Wifi size={20} className="text-green-600" />
              </div>
            ) : status === "connecting" || status === "qr" ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                <Loader2 size={20} className="animate-spin text-yellow-600" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <WifiOff size={20} className="text-muted-foreground" />
              </div>
            )}
            <div>
              <div className="font-semibold">
                {status === "ready"
                  ? "Connected"
                  : status === "qr"
                    ? "Scan QR Code"
                    : status === "connecting"
                      ? "Connecting..."
                      : "Disconnected"}
              </div>
              {connectedPhone && (
                <div className="text-sm text-muted-foreground">
                  +{connectedPhone}
                </div>
              )}
              {status === "disconnected" && (
                <div className="text-sm text-muted-foreground">
                  Connect to auto-sync all WhatsApp chats
                </div>
              )}
            </div>
          </div>

          {status === "disconnected" && (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="rounded-xl bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:opacity-50"
            >
              {connecting ? "Starting..." : "Connect"}
            </button>
          )}
        </div>
      </div>

      {/* QR Code Area */}
      {(status === "qr" || (status === "connecting" && !qrDataUrl)) && (
        <div className="mb-6 rounded-2xl bg-card p-6 shadow-sm">
          <div className="text-center">
            {qrDataUrl ? (
              <>
                <div className="mb-3 inline-block rounded-xl bg-white p-3">
                  <Image
                    src={qrDataUrl}
                    alt="WhatsApp QR Code"
                    width={256}
                    height={256}
                    unoptimized
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Open WhatsApp on your phone → Settings → Linked Devices → Link
                  a Device
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2
                  size={32}
                  className="animate-spin text-muted-foreground"
                />
                <p className="text-sm text-muted-foreground">
                  Preparing QR code...
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connected State */}
      {status === "ready" && (
        <>
          {/* Auto-sync info */}
          <div className="mb-6 rounded-2xl border-2 border-green-200 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">
              Auto-sync is active. New messages are automatically imported and
              contacts are created for any new numbers.
            </p>
          </div>

          {/* Synced Contacts */}
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Synced Chats</h2>
              <button
                onClick={fetchChats}
                disabled={loadingChats}
                className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline disabled:opacity-50"
              >
                <RefreshCw
                  size={14}
                  className={loadingChats ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>

            {loadingChats && chats.length === 0 ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-muted p-8">
                <Loader2
                  size={20}
                  className="animate-spin text-muted-foreground"
                />
                <span className="text-sm text-muted-foreground">
                  Loading chats...
                </span>
              </div>
            ) : chats.length === 0 ? (
              <div className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">
                No chats found yet. Messages will appear here as they sync.
              </div>
            ) : (
              <ul className="space-y-2">
                {chats.map((chat) => (
                  <li
                    key={chat.id}
                    className="rounded-2xl bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">
                            {chat.name}
                          </span>
                          {chat.matchedContact && (
                            <Link
                              href={`/person/${chat.matchedContact.id}`}
                              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-200"
                            >
                              <LinkIcon size={10} />
                              {chat.matchedContact.name}
                            </Link>
                          )}
                        </div>
                        {chat.lastMessage && (
                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            {chat.lastMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Disconnect */}
          <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5">
            <h3 className="mb-2 text-sm font-semibold text-red-800">
              Danger Zone
            </h3>
            <p className="mb-3 text-sm text-red-600">
              Disconnect will end the WhatsApp session. You&apos;ll need to scan
              the QR code again to reconnect.
            </p>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
            >
              <Trash2 size={14} />
              {disconnecting ? "Disconnecting..." : "Disconnect WhatsApp"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
