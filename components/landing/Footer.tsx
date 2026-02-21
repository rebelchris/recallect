"use client";

import { Heart, Github, Twitter } from "lucide-react";

const footerLinks = {
  product: [
    { label: "Features", href: "#features" },
    { label: "Self-Hosting", href: "#self-hosting" },
    { label: "FAQ", href: "#faq" },
  ],
  resources: [
    { label: "Documentation", href: "https://github.com/rebelchris/recallect#readme" },
    { label: "Changelog", href: "https://github.com/rebelchris/recallect/releases" },
    { label: "Roadmap", href: "https://github.com/rebelchris/recallect/issues" },
  ],
  community: [
    { label: "GitHub", href: "https://github.com/rebelchris/recallect" },
    { label: "Discussions", href: "https://github.com/rebelchris/recallect/discussions" },
    { label: "Issues", href: "https://github.com/rebelchris/recallect/issues" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2">
              <Heart size={24} className="text-danger" />
              <span className="text-xl font-bold">Recallect</span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Open-source personal CRM for maintaining friendships and relationships.
              Self-hosted, private, and free.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <a
                href="https://github.com/rebelchris/recallect"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="GitHub"
              >
                <Github size={20} />
              </a>
              <a
                href="https://twitter.com/AskDeployGuy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Twitter"
              >
                <Twitter size={20} />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Product
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Resources
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Community
            </h3>
            <ul className="mt-4 space-y-3">
              {footerLinks.community.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 border-t border-border pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Recallect. Open source under MIT License.
            </p>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              Built with <Heart size={14} className="text-danger" fill="currentColor" /> by{" "}
              <a
                href="https://github.com/rebelchris"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 transition-colors hover:text-foreground"
              >
                Chris Bongers
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
