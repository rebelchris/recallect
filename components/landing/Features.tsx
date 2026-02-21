"use client";

import {
  MessageCircle,
  Bell,
  HeartPulse,
  Calendar,
  Sparkles,
  RefreshCw,
  Server,
  Database,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: MessageCircle,
    title: "Telegram & WhatsApp Sync",
    description:
      "Automatically sync conversations from your favorite messaging apps. Never lose track of important discussions.",
    color: "text-success",
    bgColor: "bg-success-muted",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Reminders",
    description:
      "Smart suggestions powered by LLM integration. Get reminded about follow-ups, birthdays, and important moments.",
    color: "text-warning",
    bgColor: "bg-warning-muted",
  },
  {
    icon: HeartPulse,
    title: "Relationship Health Tracking",
    description:
      "Visual indicators show the health of your relationships. Know when it's time to reach out to someone.",
    color: "text-danger",
    bgColor: "bg-danger-muted",
  },
  {
    icon: Calendar,
    title: "Contact Frequency Management",
    description:
      "Set how often you want to connect with each person. Recallect tracks and reminds you when you're falling behind.",
    color: "text-success",
    bgColor: "bg-success-muted",
  },
  {
    icon: Zap,
    title: "Today Focus Prioritization",
    description:
      "Each day, see who you should reach out to first. Prioritized by urgency, relationship health, and upcoming events.",
    color: "text-warning",
    bgColor: "bg-warning-muted",
  },
  {
    icon: RefreshCw,
    title: "Weekly Review",
    description:
      "Reflect on your connections with weekly summaries. See who you talked to, who you missed, and plan ahead.",
    color: "text-danger",
    bgColor: "bg-danger-muted",
  },
];

const techStack = [
  {
    icon: Server,
    title: "Self-Hosted",
    description: "Run on Mac mini, Raspberry Pi, or any server. Your data never leaves your infrastructure.",
  },
  {
    icon: Database,
    title: "SQLite Database",
    description: "Simple, portable database. Easy backups, no complex setup required.",
  },
  {
    icon: Zap,
    title: "Next.js + Drizzle",
    description: "Modern tech stack with excellent performance and developer experience.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need to Stay Connected
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Recallect combines smart automation with thoughtful design to help you nurture the relationships that matter most.
          </p>
        </div>

        {/* Features Grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-muted-foreground/20 hover:shadow-lg"
            >
              <div
                className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.bgColor} ${feature.color}`}
              >
                <feature.icon size={24} />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </article>
          ))}
        </div>

        {/* Tech Stack */}
        <div className="mt-24">
          <div className="text-center">
            <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Built for Privacy & Simplicity
            </h3>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              No cloud subscriptions, no data harvesting. Just a clean, modern app you run yourself.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {techStack.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-4 rounded-xl border border-border bg-card p-5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <item.icon size={20} />
                </div>
                <div>
                  <h4 className="font-semibold">{item.title}</h4>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
