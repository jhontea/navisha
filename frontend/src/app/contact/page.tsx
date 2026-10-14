import { PublicPage } from "@/components/landing/PublicPage";
import { ArrowUpRight, Bug, Clock3, Headset, Mail, Scale, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Contact",
  description: "Get in touch with the Navisha team.",
};

export default function ContactPage() {
  return (
    <PublicPage title="Contact" accent="us" intro="We'd love to hear from you. Choose the right channel below.">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* General */}
          <div className="rounded-3xl border bg-card p-6 shadow-card">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground"><Mail className="h-5 w-5" aria-hidden="true" /></span>
              <h2 className="font-display text-xl font-extrabold text-foreground">
                General questions
              </h2>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              Questions about the app, feature requests, or just want to say hi?
            </p>
            <a
              href="mailto:hello@navisha.cloud"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-bold text-primary-soft-foreground hover:bg-primary-soft/70"
            >
              hello@navisha.cloud
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>

          {/* Support */}
          <div className="rounded-3xl border bg-card p-6 shadow-card">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground"><Headset className="h-5 w-5" aria-hidden="true" /></span>
              <h2 className="font-display text-xl font-extrabold text-foreground">
                Support
              </h2>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              Need help with your account, trips, or encountering a bug? We&apos;ll
              get back to you within 24 hours.
            </p>
            <a
              href="mailto:support@navisha.cloud"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-bold text-primary-soft-foreground hover:bg-primary-soft/70"
            >
              support@navisha.cloud
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>

          {/* Privacy & Legal */}
          <div className="rounded-3xl border bg-card p-6 shadow-card">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground"><Scale className="h-5 w-5" aria-hidden="true" /></span>
              <h2 className="font-display text-xl font-extrabold text-foreground">
                Privacy &amp; Legal
              </h2>
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              Data access requests, privacy concerns, or legal inquiries.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="mailto:privacy@navisha.cloud"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-bold text-primary-soft-foreground hover:bg-primary-soft/70"
              >
                privacy@navisha.cloud
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="mailto:legal@navisha.cloud"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-bold text-primary-soft-foreground hover:bg-primary-soft/70"
              >
                legal@navisha.cloud
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Response Time */}
          <div className="rounded-3xl border bg-card p-6 shadow-card">
            <h2 className="mb-3 font-display text-xl font-extrabold text-foreground">
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
    </PublicPage>
  );
}
