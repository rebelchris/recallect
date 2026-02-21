import {
  Header,
  Hero,
  Features,
  SelfHosting,
  SocialProof,
  FAQ,
  CTA,
  Footer,
} from "@/components/landing";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Recallect",
            applicationCategory: "LifestyleApplication",
            operatingSystem: "Web, macOS, Linux, Windows",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
            description:
              "Open-source personal CRM for maintaining friendships and relationships. Features Telegram & WhatsApp integration, AI-powered reminders, and relationship health tracking.",
            featureList: [
              "Telegram integration",
              "WhatsApp integration",
              "AI-powered reminders",
              "Relationship health tracking",
              "Contact frequency management",
              "Today Focus prioritization",
              "Weekly review",
              "Self-hosted",
            ],
            softwareVersion: "0.2.0",
            author: {
              "@type": "Person",
              name: "Chris Bongers",
              url: "https://github.com/rebelchris",
            },
            license: "https://opensource.org/licenses/MIT",
            codeRepository: "https://github.com/rebelchris/recallect",
            programmingLanguage: ["TypeScript", "JavaScript"],
            runtimePlatform: "Node.js",
          }),
        }}
      />

      {/* Organization Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Recallect",
            url: "https://recallect.app",
            logo: "https://recallect.app/icon.png",
            sameAs: [
              "https://github.com/rebelchris/recallect",
              "https://twitter.com/AskDeployGuy",
            ],
          }),
        }}
      />

      <Header />
      <main>
        <Hero />
        <Features />
        <SelfHosting />
        <SocialProof />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
