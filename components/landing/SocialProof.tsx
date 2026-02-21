"use client";

import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    quote:
      "Finally, a CRM that feels personal. I no longer forget to check in with old friends, and the WhatsApp sync is magical.",
    author: "Alex Chen",
    role: "Software Developer",
    avatar: "AC",
  },
  {
    quote:
      "Self-hosting was a breeze. Had it running on my Mac mini in under 5 minutes. My data stays mine, and the UI is beautiful.",
    author: "Sarah Miller",
    role: "Privacy Enthusiast",
    avatar: "SM",
  },
  {
    quote:
      "The 'Today Focus' feature is a game-changer. It tells me exactly who I should reach out to and why. My relationships have never been healthier.",
    author: "James Park",
    role: "Community Manager",
    avatar: "JP",
  },
];

export function SocialProof() {
  return (
    <section id="testimonials" className="py-24 sm:py-32 bg-muted/30">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-warning mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={20} fill="currentColor" />
            ))}
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Loved by Relationship Builders
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join hundreds of people who use Recallect to nurture their connections
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <article
              key={index}
              className="relative rounded-2xl border border-border bg-card p-6"
            >
              <Quote
                size={40}
                className="absolute -top-4 left-6 text-muted-foreground/20"
              />
              <p className="relative z-10 text-muted-foreground leading-relaxed">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-success to-warning text-sm font-semibold text-white">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-medium">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* GitHub CTA */}
        <div className="mt-16 flex flex-col items-center text-center">
          <p className="text-muted-foreground">
            Want to try it yourself?
          </p>
          <a
            href="https://github.com/rebelchris/recallect"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-foreground px-6 py-3 text-sm font-semibold text-background transition-all hover:bg-foreground/90"
          >
            <Star size={16} />
            Star on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
