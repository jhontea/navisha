import { Navbar } from "@/components/landing/Navbar"
import { HeroSection } from "@/components/landing/HeroSection"
import { FeatureGrid } from "@/components/landing/FeatureGrid"
import { CTASection } from "@/components/landing/CTASection"
import { Footer } from "@/components/landing/Footer"

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-surface text-on-surface">
      <Navbar />
      <HeroSection />
      <FeatureGrid />
      <CTASection />
      <Footer />
    </main>
  )
}
