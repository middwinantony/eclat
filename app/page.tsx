import Navbar from "@/components/sections/Navbar"
import Hero from "@/components/sections/Hero"
import SocialProof from "@/components/sections/SocialProof"
import Features from "@/components/sections/Features"
import HowItWorks from "@/components/sections/HowItWorks"
import Testimonials from "@/components/sections/Testimonials"
import Pricing from "@/components/sections/Pricing"
import FAQ from "@/components/sections/FAQ"
import CTABanner from "@/components/sections/CTABanner"
import Footer from "@/components/sections/Footer"

export default function Home() {
  return (
    <main className="bg-[#080808]">
      <Navbar />
      <Hero />
      <SocialProof />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTABanner />
      <Footer />
    </main>
  )
}
