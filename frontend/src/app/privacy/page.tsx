import { Footer } from "@/components/landing/Footer";
import { BackLink } from "@/components/BackLink";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy",
  description: "How Navisha collects, uses, and protects your travel data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <BackLink href="/" label="Back to Home" className="mb-8" />
        <div className="glass-lg rounded-2xl p-8">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Privacy Policy</h1>
        <p className="mb-8 text-sm text-muted-foreground">Last updated: June 26, 2026</p>
        <div className="prose prose-sm prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Overview</h2>
            <p className="text-muted-foreground">Navisha is a travel planning platform that helps you create trips, build itineraries, track expenses, and generate AI-powered travel suggestions. This Privacy Policy explains what data we collect and how we use it.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Data We Collect</h2>
            <p className="text-muted-foreground font-medium">Account</p>
            <p className="text-muted-foreground">When you sign in with Google, we receive your name, email, and profile picture. We do not receive your password.</p>
            <p className="text-muted-foreground font-medium mt-4">Trip Content</p>
            <p className="text-muted-foreground">Trip names, destinations, itineraries, activities, accommodations, transportation, expenses, and AI-generated summaries.</p>
            <p className="text-muted-foreground font-medium mt-4">Technical</p>
            <p className="text-muted-foreground">Authentication cookies (HTTP-only, Secure). Request logs (method, path, status, latency). No analytics or tracking.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Third-Party Services</h2>
            <div className="overflow-x-auto"><table className="w-full text-sm text-muted-foreground"><thead><tr className="border-b"><th className="py-2 text-left font-medium text-foreground">Service</th><th className="py-2 text-left font-medium text-foreground">Purpose</th><th className="py-2 text-left font-medium text-foreground">Data Shared</th></tr></thead><tbody><tr className="border-b"><td className="py-2">Google OAuth</td><td className="py-2">Sign-in</td><td className="py-2">Account identity</td></tr><tr className="border-b"><td className="py-2">Google Maps/Places</td><td className="py-2">Maps, location search</td><td className="py-2">Queries, coordinates</td></tr><tr className="border-b"><td className="py-2">DeepSeek / OpenRouter</td><td className="py-2">AI trip generation, summaries</td><td className="py-2">Trip data (destinations, dates, activities)</td></tr><tr><td className="py-2">CurrencyFreaks</td><td className="py-2">Exchange rates</td><td className="py-2">Currency codes only</td></tr></tbody></table></div>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground">4. AI Processing</h2>
            <p className="text-muted-foreground">When you use AI features, trip data is sent to our LLM providers solely to generate your requested content. Data is not used for model training.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Storage & Security</h2>
            <p className="text-muted-foreground">Data stored in PostgreSQL on servers we control. Auth tokens as HTTP-only Secure cookies. All traffic encrypted via HTTPS. Redis used for caching and rate limiting only.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Your Rights</h2>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1"><li>Access all your data through the app</li><li>Delete individual trips and all associated data</li><li>Request full account deletion by contacting us</li></ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Contact</h2>
            <p className="text-muted-foreground">For privacy inquiries: <Link href="/contact" className="text-primary hover:underline">contact page</Link> or <a href="mailto:privacy@navisha.cloud" className="text-primary hover:underline">privacy@navisha.cloud</a>.</p>
          </section>
        </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}