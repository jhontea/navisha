import { Footer } from "@/components/landing/Footer";
import { BackLink } from "@/components/BackLink";
import { ArrowUpRight, Bug, Clock3, Headset, Mail, Scale, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Contact",
  description: "Get in touch with the Navisha team.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <BackLink href="/" label="Back to Home" className="mb-8" />

        <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Contact Us
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          We&apos;d love to hear from you. Choose the right channel below.
        </p>

        <div className="glass-lg rounded-2xl p-8 space-y-6">
          {/* General */}
          <div className="rounded-2xl border bg-card p-6">
            <div className="mb-3 flex items-center gap-3">
              <Mail className="h-6 w-6 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-foreground">
                General Inquiries
              </h2>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              Questions about the app, feature requests, or just want to say hi?
            </p>
            <a
              href="mailto:hello@navisha.cloud"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              hello@navisha.cloud
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>

          {/* Support */}
          <div className="rounded-2xl border bg-card p-6">
            <div className="mb-3 flex items-center gap-3">
              <Headset className="h-6 w-6 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-foreground">
                Support
              </h2>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              Need help with your account, trips, or encountering a bug? We&apos;ll
              get back to you within 24 hours.
            </p>
            <a
              href="mailto:support@navisha.cloud"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              support@navisha.cloud
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>

          {/* Privacy & Legal */}
          <div className="rounded-2xl border bg-card p-6">
            <div className="mb-3 flex items-center gap-3">
              <Scale className="h-6 w-6 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-foreground">
                Privacy &amp; Legal
              </h2>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              Data access requests, privacy concerns, or legal inquiries.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="mailto:privacy@navisha.cloud"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                privacy@navisha.cloud
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="mailto:legal@navisha.cloud"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                legal@navisha.cloud
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Response Time */}
          <div className="rounded-2xl bg-muted/40 p-6">
            <h2 className="mb-2 text-sm font-semibold text-foreground">
              What to Expect
            </h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                We aim to respond to all inquiries within 24 hours on business days.
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                For security issues, please do not include sensitive data (passwords,
                tokens) in your initial email — we&apos;ll provide a secure channel.
              </li>
              <li className="flex items-start gap-2">
                <Bug className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                When reporting bugs, include your browser, device, and steps to
                reproduce — it helps us fix things faster.
              </li>
            </ul>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
