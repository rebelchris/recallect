import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recallect — Personal CRM for Meaningful Relationships",
  description:
    "Open-source personal CRM that helps you maintain friendships and relationships. Telegram & WhatsApp integration, AI-powered reminders, relationship health tracking. Self-hosted on Mac mini or any server.",
  keywords: [
    "personal CRM",
    "relationship management",
    "contact management",
    "friendship tracker",
    "WhatsApp integration",
    "Telegram integration",
    "open source CRM",
    "self-hosted CRM",
    "relationship health",
    "contact frequency",
    "AI reminders",
  ],
  authors: [{ name: "Chris Bongers", url: "https://github.com/rebelchris" }],
  creator: "Chris Bongers",
  publisher: "Recallect",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://recallect.app",
    siteName: "Recallect",
    title: "Recallect — Personal CRM for Meaningful Relationships",
    description:
      "Open-source personal CRM that helps you maintain friendships and relationships. Telegram & WhatsApp integration, AI-powered reminders, relationship health tracking.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Recallect - Personal CRM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Recallect — Personal CRM for Meaningful Relationships",
    description:
      "Open-source personal CRM with Telegram & WhatsApp integration, AI-powered reminders, and relationship health tracking. Self-hosted.",
    images: ["/og-image.png"],
    creator: "@AskDeployGuy",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://recallect.app",
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
