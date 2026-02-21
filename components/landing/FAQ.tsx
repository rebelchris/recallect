"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What is Recallect?",
    answer:
      "Recallect is a personal CRM (Customer Relationship Management) tool designed for individuals who want to maintain meaningful friendships and relationships. It helps you track conversations, set reminders, and stay connected with the people who matter most.",
  },
  {
    question: "Is Recallect really free?",
    answer:
      "Yes! Recallect is 100% open source and free to use. You can self-host it on your own infrastructure without any subscription fees. The source code is available on GitHub under the MIT license.",
  },
  {
    question: "How does Telegram/WhatsApp integration work?",
    answer:
      "Recallect connects to your Telegram and WhatsApp accounts through their official APIs (Telegram Bot API and WhatsApp Web). Your conversations are synced locally to your database, so your data never leaves your server.",
  },
  {
    question: "What are the system requirements?",
    answer:
      "Recallect runs on any machine with Node.js 18+ installed. It uses SQLite for the database, so there are no external database dependencies. A Mac mini, Raspberry Pi 4+, or any VPS with 1GB RAM works perfectly.",
  },
  {
    question: "How does the AI-powered reminders feature work?",
    answer:
      "Recallect can integrate with local LLMs (like Ollama) or cloud providers to analyze your conversations and suggest follow-up reminders. The AI can detect when you promised to do something or when an important topic was discussed.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Absolutely. Since Recallect is self-hosted, your data stays on your own server. There's no cloud component, no telemetry, and no data collection. You have complete control over your personal information.",
  },
  {
    question: "Can I contribute to the project?",
    answer:
      "Yes! We welcome contributions from the community. Check out our GitHub repository for open issues, feature requests, and contribution guidelines. Whether it's code, documentation, or bug reports, every contribution helps.",
  },
  {
    question: "What's the tech stack?",
    answer:
      "Recallect is built with Next.js 16, React 19, SQLite with Drizzle ORM, and Tailwind CSS. It's designed to be simple to deploy and maintain, with no complex infrastructure requirements.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6">
        {/* Section Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to know about Recallect
          </p>
        </div>

        {/* FAQ List */}
        <div className="mt-12 space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-muted/50"
              >
                <span className="font-medium">{faq.question}</span>
                <ChevronDown
                  size={20}
                  className={`shrink-0 text-muted-foreground transition-transform duration-200 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`grid transition-all duration-200 ease-out ${
                  openIndex === index ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="px-6 pb-5 text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Schema for SEO - rendered as JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqs.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: faq.answer,
                },
              })),
            }),
          }}
        />
      </div>
    </section>
  );
}
