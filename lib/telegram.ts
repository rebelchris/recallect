import TelegramBot from "node-telegram-bot-api";
import { registerCommands } from "./telegram-commands";
import { startStandupScheduler, stopStandupScheduler } from "./telegram-standup";

export type TelegramStatus = "disconnected" | "connected";

interface TelegramState {
  bot: TelegramBot | null;
  status: TelegramStatus;
  botUsername: string | null;
}

declare global {
  var _telegram: TelegramState | undefined;
}

function getState(): TelegramState {
  if (!global._telegram) {
    global._telegram = {
      bot: null,
      status: "disconnected",
      botUsername: null,
    };
  }
  return global._telegram;
}

export function getTelegramStatus() {
  const state = getState();
  return {
    status: state.status,
    botUsername: state.botUsername,
  };
}

export async function initTelegram(token: string): Promise<void> {
  const state = getState();

  if (state.bot) {
    return;
  }

  const bot = new TelegramBot(token, { polling: true });

  const me = await bot.getMe();
  state.bot = bot;
  state.botUsername = me.username || null;
  state.status = "connected";

  registerCommands(bot);
  startStandupScheduler(bot);

  console.log(`Telegram bot connected as @${state.botUsername}`);
}

export async function destroyTelegram(): Promise<void> {
  const state = getState();
  if (state.bot) {
    stopStandupScheduler();
    await state.bot.stopPolling();
    state.bot = null;
    state.botUsername = null;
    state.status = "disconnected";
    console.log("Telegram bot disconnected");
  }
}
