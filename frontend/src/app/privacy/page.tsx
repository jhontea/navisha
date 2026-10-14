import { LegalArticle, PublicPage } from "@/components/landing/PublicPage";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy",
  description: "How Navisha collects, uses, and protects your travel data.",
};

export default function PrivacyPage() {
  return (
    <PublicPage title="Privacy" accent="Policy" meta="Last updated: October 14, 2026">
      <LegalArticle>
          <section>
            <h2>1. Overview</h2>
            <p className="text-muted-foreground">Navisha is a travel planning platform that helps you create trips, build itineraries, track expenses, and generate AI-powered travel suggestions. This Privacy Policy explains what data we collect and how we use it.</p>
          </section>
          <section>
            <h2>2. Data We Collect</h2>
            <p className="text-muted-foreground font-medium">Account</p>
            <p className="text-muted-foreground">When you sign in with Google, we receive your name, email, and profile picture. We do not receive your password.</p>
            <p className="text-muted-foreground font-medium mt-4">Trip content</p>
            <p className="text-muted-foreground">Trip names, destinations, itineraries, activities, accommodations, transportation, expenses, and AI-generated summaries.</p>
            <p className="text-muted-foreground font-medium mt-4">Technical</p>
            <p className="text-muted-foreground">Authentication cookies (HTTP-only, Secure). Operational request logs may include method, route, status, latency, IP address, request ID, and account ID. We do not use advertising trackers.</p>
          </section>
          <section>
            <h2>3. Third-Party Services</h2>
            <div className="overflow-x-auto"><table className="w-full text-sm text-muted-foreground"><thead><tr className="border-b"><th className="py-2 text-left font-medium text-foreground">Service</th><th className="py-2 text-left font-medium text-foreground">Purpose</th><th className="py-2 text-left font-medium text-foreground">Data shared</th></tr></thead><tbody><tr className="border-b"><td className="py-2">Google OAuth</td><td className="py-2">Sign-in</td><td className="py-2">Account identity</td></tr><tr className="border-b"><td className="py-2">Geoapify</td><td className="py-2">Location search</td><td className="py-2">Search text, coordinates</td></tr><tr className="border-b"><td className="py-2">OpenFreeMap</td><td className="py-2">Map tiles</td><td className="py-2">Map area being viewed</td></tr><tr className="border-b"><td className="py-2">Google Maps/Places (optional)</td><td className="py-2">Maps, location search when enabled; &quot;Open in Google Maps&quot; links</td><td className="py-2">Queries, coordinates</td></tr><tr className="border-b"><td className="py-2">DeepSeek / OpenRouter</td><td className="py-2">AI trip generation, summaries</td><td className="py-2">Trip data (destinations, dates, activities)</td></tr><tr><td className="py-2">CurrencyFreaks</td><td className="py-2">Exchange rates</td><td className="py-2">Currency codes only</td></tr></tbody></table></div>
          </section>
          <section>
            <h2>4. AI Processing</h2>
            <p className="text-muted-foreground">When you use AI features, the trip details needed for the requested result may be sent to DeepSeek, OpenRouter, and a model provider selected through OpenRouter. This can include destinations, travel dates, activities, accommodation names and locations, transportation details, budget totals, and expense summaries. We do not intentionally send booking confirmation numbers or authentication credentials. Provider retention and model-training practices are governed by the selected provider&apos;s policies and our configured privacy settings; they may vary by provider and model.</p>
            <p className="mt-3 text-muted-foreground">To make the dashboard faster, selected trip and expense responses may be cached in your browser&apos;s IndexedDB for up to 30 minutes. The cache is scoped to the signed-in account and cleared on logout or session expiry.</p>
          </section>
          <section>
            <h2>5. Storage & Security</h2>
            <p className="text-muted-foreground">Data stored in PostgreSQL on servers we control. Auth tokens as HTTP-only Secure cookies. All traffic encrypted via HTTPS. Redis used for caching and rate limiting only.</p>
          </section>
          <section>
            <h2>6. Your Rights</h2>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1"><li>Access all your data through the app</li><li>Delete individual trips and all associated data</li><li>Request full account deletion by contacting us</li></ul>
          </section>
          <section>
            <h2>7. Contact</h2>
            <p className="text-muted-foreground">For privacy inquiries: <Link href="/contact" className="font-semibold text-primary hover:underline">contact page</Link> or <a href="mailto:privacy@navisha.cloud" className="font-semibold text-primary hover:underline">privacy@navisha.cloud</a>.</p>
          </section>
      </LegalArticle>
    </PublicPage>
  );
}
