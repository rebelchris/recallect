function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  if (telegramToken) {
    const { initTelegram } = await import("./lib/telegram");
    initTelegram(telegramToken).catch((err) => {
      console.error("Telegram auto-init error:", err);
    });
  }

  if (isTruthy(process.env.WHATSAPP_AUTO_INIT)) {
    const { initWhatsApp } = await import("./lib/whatsapp");
    initWhatsApp().catch((err) => {
      console.error("WhatsApp auto-init error:", err);
    });
  }
}
