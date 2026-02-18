This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Run 24/7 on a Mac mini (Gateway setup)

### 1) Configure environment

Create/update `.env.local`:

```bash
TELEGRAM_BOT_TOKEN=your_botfather_token
WHATSAPP_AUTO_INIT=true
TELEGRAM_STANDUP_TIME=08:00
REMINDER_LLM_PROVIDER=openai-compatible
REMINDER_LLM_BASE_URL=https://api.openai.com/v1
REMINDER_LLM_CHAT_PATH=/chat/completions
REMINDER_LLM_MODEL=gpt-4.1-mini
REMINDER_LLM_API_KEY=your_api_key
# Optional: {"HTTP-Referer":"https://your-app.example","X-Title":"Recallect"}
REMINDER_LLM_HEADERS_JSON=
# Optional if provider=ollama (model must exist locally)
# REMINDER_LLM_PROVIDER=ollama
# REMINDER_LLM_BASE_URL=http://127.0.0.1:11434
# REMINDER_LLM_MODEL=llama3.1:8b
# Optional tuning
# AUTO_REMINDER_MIN_CONFIDENCE=0.72
```

- `TELEGRAM_BOT_TOKEN` enables Telegram auto-connect on server boot.
- `WHATSAPP_AUTO_INIT=true` makes the server auto-start WhatsApp on boot (session is reused from `data/.wwebjs_auth` after first QR scan).
- `TELEGRAM_STANDUP_TIME` sets local daily standup send time in `HH:MM` (24h).
- `REMINDER_LLM_*` configures auto-generated reminder suggestions. `openai-compatible` works with most hosted/local providers that expose a Chat Completions API.
- If no `REMINDER_LLM_MODEL` is set, reminders still use deterministic follow-up rules.

### 2) Create the local database on the Mac mini

Fresh DB (empty, tables only):

```bash
mkdir -p data
npm ci
npm run db:push
```

Restore existing data from your current machine (optional):

```bash
# run from your current machine
scp /path/to/recallect/data/recallect.db <mac-mini-user>@<mac-mini-host>:/Users/<mac-mini-user>/www/recallect/data/recallect.db
```

Then on Mac mini, make sure schema is current:

```bash
cd /Users/<mac-mini-user>/www/recallect
npm run db:push
```

### 3) Build for production

```bash
npm run build
```

### 4) Start as a gateway process

```bash
npm run start:gateway
```

This binds the app on `0.0.0.0:3000` so other devices can connect.

### 5) Keep it running across reboot (launchd)

Create `~/Library/LaunchAgents/com.recallect.gateway.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.recallect.gateway</string>

  <key>WorkingDirectory</key>
  <string>/ABSOLUTE/PATH/TO/recallect</string>

  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>npm run start:gateway</string>
  </array>

  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    <key>NODE_ENV</key>
    <string>production</string>
  </dict>

  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>

  <key>StandardOutPath</key>
  <string>/tmp/recallect.out.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/recallect.err.log</string>
</dict>
</plist>
```

Load it:

```bash
launchctl unload ~/Library/LaunchAgents/com.recallect.gateway.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.recallect.gateway.plist
launchctl start com.recallect.gateway
```

Check status/logs:

```bash
launchctl list | rg recallect
tail -f /tmp/recallect.out.log /tmp/recallect.err.log
```

### 6) First-time WhatsApp link

Open `/whatsapp`, scan QR once, then LocalAuth persists in `data/.wwebjs_auth`.

### 7) Access from other devices safely

Prefer Tailscale over public port forwarding. Keep this app private; it has no built-in authentication.

- Install Tailscale on Mac mini and your other device.
- Open `http://<mac-mini-tailscale-ip>:3000`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
