import { Footer } from "@/components/landing/Footer";
import { BackLink } from "@/components/BackLink";

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
              <span className="material-symbols-outlined text-2xl text-primary">
                mail
              </span>
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
              <span className="material-symbols-outlined text-base">arrow_outward</span>
            </a>
          </div>

          {/* Support */}
          <div className="rounded-2xl border bg-card p-6">
            <div className="mb-3 flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-primary">
                support_agent
              </span>
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
              <span className="material-symbols-outlined text-base">arrow_outward</span>
            </a>
          </div>

          {/* Privacy & Legal */}
          <div className="rounded-2xl border bg-card p-6">
            <div className="mb-3 flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-primary">
                gavel
              </span>
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
                <span className="material-symbols-outlined text-base">arrow_outward</span>
              </a>
              <a
                href="mailto:legal@navisha.cloud"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                legal@navisha.cloud
                <span className="material-symbols-outlined text-base">arrow_outward</span>
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
                <span className="material-symbols-outlined mt-0.5 text-base text-primary">
                  schedule
                </span>
                We aim to respond to all inquiries within 24 hours on business days.
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined mt-0.5 text-base text-primary">
                  security
                </span>
                For security issues, please do not include sensitive data (passwords,
                tokens) in your initial email — we&apos;ll provide a secure channel.
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined mt-0.5 text-base text-primary">
                  bug_report
                </span>
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
