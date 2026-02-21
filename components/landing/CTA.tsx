"use client";

import { Github, ArrowRight, Heart } from "lucide-react";

export function CTA() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-muted/50 p-8 sm:p-12 lg:p-16">
          {/* Background decoration */}
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-success/20 to-warning/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-gradient-to-br from-danger/20 to-warning/20 blur-3xl" />

          <div className="relative z-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Start Nurturing Your
              <br />
              <span className="bg-gradient-to-r from-success via-warning to-danger bg-clip-text text-transparent">
                Relationships Today
              </span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              Clone the repo, run the setup, and start tracking your connections in minutes.
              No subscriptions. No cloud. Just you and your relationships.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://github.com/rebelchris/recallect"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-xl bg-foreground px-8 py-4 text-base font-semibold text-background transition-all hover:bg-foreground/90 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Github size={20} />
                <span>Get Started on GitHub</span>
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>

            <p className="mt-8 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              Made with <Heart size={14} className="text-danger" fill="currentColor" /> for meaningful connections
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
