"use client";

import { Terminal, Check, Copy } from "lucide-react";
import { useState } from "react";

const installSteps = [
  "git clone https://github.com/rebelchris/recallect.git",
  "cd recallect && npm install",
  "npm run db:push",
  "npm run dev",
];

export function SelfHosting() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(installSteps.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="self-hosting" className="py-24 sm:py-32 bg-muted/30">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Content */}
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Self-Host in Minutes
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              No Docker required. No complex infrastructure. Just clone, install, and run.
              Perfect for your Mac mini, home server, or VPS.
            </p>

            <ul className="mt-8 space-y-4">
              {[
                "Works on any machine with Node.js",
                "SQLite database - no external dependencies",
                "Automatic Telegram & WhatsApp connection",
                "Optional LLM integration for AI features",
                "Full data export & backup support",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-muted text-success">
                    <Check size={14} />
                  </div>
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Terminal */}
          <div className="rounded-2xl border border-border bg-[#0a0a0a] p-1 shadow-2xl">
            {/* Terminal Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-danger/80" />
                <div className="h-3 w-3 rounded-full bg-warning/80" />
                <div className="h-3 w-3 rounded-full bg-success/80" />
              </div>
              <span className="ml-2 text-xs text-muted-foreground font-mono">
                terminal
              </span>
              <button
                onClick={copyToClipboard}
                className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {copied ? (
                  <>
                    <Check size={12} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    Copy
                  </>
                )}
              </button>
            </div>

            {/* Terminal Content */}
            <div className="p-4 font-mono text-sm">
              {installSteps.map((step, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-success select-none">$</span>
                  <span className="text-foreground/90">{step}</span>
                </div>
              ))}
              <div className="mt-4 flex gap-2">
                <span className="text-muted-foreground">#</span>
                <span className="text-muted-foreground">
                  Open http://localhost:3000 and start tracking!
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
