"use client";

import { Heart, Github, Star, ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-24 sm:pt-32 sm:pb-32">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-r from-success/10 via-warning/5 to-danger/10 blur-3xl" />
        <div className="absolute right-0 bottom-0 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-success/5 to-transparent blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl px-6">
        {/* Open Source Badge */}
        <div className="flex justify-center mb-8">
          <a
            href="https://github.com/rebelchris/recallect"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 rounded-full border border-success/30 bg-success-muted px-4 py-2 text-sm font-medium text-success transition-all hover:border-success/50 hover:bg-success-muted/80"
          >
            <Github size={16} />
            <span>Open Source & Free</span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>

        {/* Main Heading */}
        <h1 className="text-center text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          <span className="block">Never Forget</span>
          <span className="block mt-2 bg-gradient-to-r from-success via-warning to-danger bg-clip-text text-transparent">
            The People Who Matter
          </span>
        </h1>

        {/* Subheading */}
        <p className="mx-auto mt-8 max-w-2xl text-center text-lg text-muted-foreground sm:text-xl">
          Recallect is a personal CRM that helps you maintain meaningful friendships and relationships.
          Auto-sync conversations from Telegram & WhatsApp, get AI-powered reminders, and track relationship health.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://github.com/rebelchris/recallect"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 rounded-xl bg-foreground px-6 py-3.5 text-base font-semibold text-background transition-all hover:bg-foreground/90 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Github size={20} />
            <span>View on GitHub</span>
            <Star size={16} className="ml-1 transition-transform group-hover:rotate-12" />
          </a>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 text-base font-semibold text-foreground transition-all hover:bg-muted hover:border-muted-foreground/20"
          >
            <span>Explore Features</span>
            <ArrowRight size={18} />
          </a>
        </div>

        {/* Stats */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 sm:gap-16">
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">100%</p>
            <p className="mt-1 text-sm text-muted-foreground">Open Source</p>
          </div>
          <div className="hidden sm:block h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">Self-Hosted</p>
            <p className="mt-1 text-sm text-muted-foreground">Your data stays yours</p>
          </div>
          <div className="hidden sm:block h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground flex items-center gap-1.5">
              <Heart size={24} className="text-danger" />
              Built with love
            </p>
            <p className="mt-1 text-sm text-muted-foreground">For meaningful connections</p>
          </div>
        </div>
      </div>
    </section>
  );
}
