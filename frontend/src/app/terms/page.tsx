import { LegalArticle, PublicPage } from "@/components/landing/PublicPage";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using Navisha.",
};

export default function TermsPage() {
  return (
    <PublicPage title="Terms of" accent="Service" meta="Last updated: October 14, 2026">
      <LegalArticle>
          <section>
            <h2>1. Acceptance</h2>
            <p className="text-muted-foreground">By using Navisha, you agree to these Terms. If you do not agree, do not use the Service.</p>
          </section>
          <section>
            <h2>2. The Service</h2>
            <p className="text-muted-foreground">Navisha is a travel planning tool for creating itineraries, tracking expenses, viewing maps, and generating AI-powered travel suggestions. The Service is provided &ldquo;as is&rdquo; and may change without notice.</p>
          </section>
          <section>
            <h2>3. Accounts</h2>
            <p className="text-muted-foreground">Google sign-in required. You are responsible for your account security. Must be 13+. We may refuse service at our discretion.</p>
          </section>
          <section>
            <h2>4. Acceptable Use</h2>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1"><li>No illegal use</li><li>No unauthorized access to other accounts</li><li>No bots, scrapers, or automated tools</li><li>No harmful or abusive content</li><li>No circumvention of rate limits</li><li>No resale or redistribution</li></ul>
          </section>
          <section>
            <h2>5. AI-Generated Content</h2>
            <p className="text-muted-foreground">AI trip generation and summaries use third-party LLMs. AI content may contain errors — always verify critical details independently. We are not responsible for actions based on AI recommendations.</p>
          </section>
          <section>
            <h2>6. Third-Party Services</h2>
            <p className="text-muted-foreground">Geoapify (location search), OpenFreeMap (map tiles), Google Maps (optional maps and links), DeepSeek/OpenRouter (AI), CurrencyFreaks (exchange rates). Use is subject to each provider&rsquo;s terms.</p>
          </section>
          <section>
            <h2>7. Intellectual Property</h2>
            <p className="text-muted-foreground">You own your trip data. We store it solely to provide the Service. Navisha name, logo, and code are our IP.</p>
          </section>
          <section>
            <h2>8. Limitation of Liability</h2>
            <p className="text-muted-foreground">Navisha is not liable for damages from: travel disruptions, financial losses from inaccurate data or rates, missed bookings, or reliance on AI suggestions. Our total liability is limited to amounts paid (if any) in the 12 months preceding any claim.</p>
          </section>
          <section>
            <h2>9. Termination</h2>
            <p className="text-muted-foreground">You may stop using the Service anytime. We may suspend or terminate access for violations. Data deleted per our Privacy Policy.</p>
          </section>
          <section>
            <h2>10. Contact</h2>
            <p className="text-muted-foreground">Questions? Visit our <Link href="/contact" className="font-semibold text-primary hover:underline">contact page</Link> or email <a href="mailto:legal@navisha.cloud" className="font-semibold text-primary hover:underline">legal@navisha.cloud</a>.</p>
          </section>
      </LegalArticle>
    </PublicPage>
  );
}