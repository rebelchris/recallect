import { Client, LocalAuth } from "whatsapp-web.js";
import * as QRCode from "qrcode";
import path from "path";
import { syncMessage, importAllChats } from "./whatsapp-sync";

export type WhatsAppStatus = "disconnected" | "qr" | "connecting" | "ready";

interface WhatsAppState {
  client: Client | null;
  status: WhatsAppStatus;
  qrDataUrl: string | null;
  connectedPhone: string | null;
  qrListeners: Set<(qr: string) => void>;
  statusListeners: Set<(status: WhatsAppStatus) => void>;
}

declare global {
  var _whatsapp: WhatsAppState | undefined;
}

function getState(): WhatsAppState {
  if (!global._whatsapp) {
    global._whatsapp = {
      client: null,
      status: "disconnected",
      qrDataUrl: null,
      connectedPhone: null,
      qrListeners: new Set(),
      statusListeners: new Set(),
    };
  }
  return global._whatsapp;
}

function setStatus(status: WhatsAppStatus) {
  const state = getState();
  state.status = status;
  for (const listener of state.statusListeners) {
    listener(status);
  }
}

export function getWhatsAppStatus() {
  const state = getState();
  return {
    status: state.status,
    qrDataUrl: state.qrDataUrl,
    connectedPhone: state.connectedPhone,
  };
}

export function onQrUpdate(listener: (qrDataUrl: string) => void): () => void {
  const state = getState();
  state.qrListeners.add(listener);
  return () => {
    state.qrListeners.delete(listener);
  };
}

export function onStatusUpdate(
  listener: (status: WhatsAppStatus) => void
): () => void {
  const state = getState();
  state.statusListeners.add(listener);
  return () => {
    state.statusListeners.delete(listener);
  };
}

export async function initWhatsApp(): Promise<void> {
  const state = getState();

  if (state.client) {
    return;
  }

  const authPath = path.join(process.cwd(), "data", ".wwebjs_auth");

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: authPath }),
    puppeteer: {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    },
  });

  state.client = client;
  setStatus("connecting");

  client.on("qr", async (qr: string) => {
    const dataUrl = await QRCode.toDataURL(qr, { width: 256 });
    state.qrDataUrl = dataUrl;
    setStatus("qr");
    for (const listener of state.qrListeners) {
      listener(dataUrl);
    }
  });

  client.on("ready", async () => {
    state.qrDataUrl = null;
    const info = client.info;
    state.connectedPhone = info?.wid?.user || null;
    setStatus("ready");

    // Auto-import all chat history on connect
    importAllChats(50).then((result) => {
      console.log(
        `WhatsApp auto-import: ${result.chatsProcessed} chats, ${result.imported} messages imported, ${result.skipped} skipped`
      );
    }).catch((err) => {
      console.error("WhatsApp auto-import error:", err);
    });
  });

  client.on("authenticated", () => {
    state.qrDataUrl = null;
  });

  client.on("disconnected", () => {
    state.client = null;
    state.connectedPhone = null;
    state.qrDataUrl = null;
    setStatus("disconnected");
  });

  client.on("message", async (msg) => {
    try {
      await syncMessage(msg);
    } catch (err) {
      console.error("WhatsApp sync error:", err);
    }
  });

  await client.initialize();
}

export function getWhatsAppClient(): Client | null {
  return getState().client;
}

export async function destroyWhatsApp(): Promise<void> {
  const state = getState();
  if (state.client) {
    try {
      await state.client.destroy();
    } catch {
      // client may already be disconnected
    }
    state.client = null;
    state.connectedPhone = null;
    state.qrDataUrl = null;
    setStatus("disconnected");
  }
}
