"use client"

import { motion } from "framer-motion"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const FAQS = [
  {
    q: "Who can apply for membership?",
    a: "eclat is open to any adult (18+) who passes our identity and liveness verification. We look for genuine intent — professionals, entrepreneurs, and executives tend to find the most value here, but there is no formal occupational requirement. We do not discriminate on the basis of religion, caste, or community.",
  },
  {
    q: "How does human verification actually work?",
    a: "After submitting your application, you complete a 60-second video liveness check and upload a government-issued ID (passport, Aadhaar, or driving licence). Our team cross-references both within 48 hours. Your ID is encrypted, stored under strict compliance controls, and never shared with other members or third parties.",
  },
  {
    q: "Can I upgrade or downgrade my plan?",
    a: "Yes — you can change your tier at any time from your account settings. Upgrades take effect immediately and are prorated. Downgrades take effect at the end of your current billing cycle. Annual plans can be cancelled for a prorated refund within the first 14 days.",
  },
  {
    q: "How are daily introductions selected?",
    a: "Our algorithm considers location, lifestyle preferences, and compatibility signals you set during onboarding. It deliberately avoids purely appearance-based ranking. Your daily queue is assembled fresh each morning, and introductions you haven't acted on expire after 7 days — keeping the experience intentional rather than accumulative.",
  },
  {
    q: "Are my messages and photos private?",
    a: "All messages are encrypted at rest using AES-256. Profile photos are blurred until both members express mutual interest. We do not scan message content for advertising, and we never sell your data. You can permanently delete your account — and all associated data — at any time from settings.",
  },
  {
    q: "Is eclat available outside India?",
    a: "Yes. We have members in Dubai, London, New York, Singapore, and Sydney. NRI members can pay in USD, AED, or GBP at checkout. The curated queue is location-aware and works well for members who split time between cities.",
  },
]

export default function FAQ() {
  return (
    <section id="faq" className="section bg-[#080808]" aria-label="Frequently asked questions">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-16 md:gap-24 items-start">

          {/* Left — sticky header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="md:sticky md:top-28"
          >
            <span className="block divider-gold mb-6" aria-hidden="true" />
            <h2
              className="font-[family-name:var(--font-heading)] font-bold text-[#F5F0E8] leading-[1.05] tracking-[-0.03em] mb-4"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
            >
              Questions,
              <br />answered.
            </h2>
            <p className="text-[#555555] text-sm leading-relaxed">
              Anything else?{" "}
              <a
                href="mailto:hello@eclat.app"
                className="text-[#C9A84C] hover:underline underline-offset-2 transition-colors"
              >
                Write to us.
              </a>
            </p>
          </motion.div>

          {/* Right — accordion */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.65, ease: "easeOut", delay: 0.1 }}
          >
            <Accordion className="flex flex-col gap-0">
              {FAQS.map((faq, i) => (
                <AccordionItem
                  key={i}
                  className="border-b border-white/[0.07] last:border-b-0 py-1"
                >
                  <AccordionTrigger
                    className="
                      flex items-center justify-between w-full
                      py-5 text-left gap-6
                      font-[family-name:var(--font-heading)] font-semibold
                      text-[#CCCCCC] hover:text-[#F5F0E8]
                      text-base tracking-[-0.01em]
                      transition-colors duration-200
                      [&>svg]:text-[#C9A84C] [&>svg]:opacity-60 [&>svg]:shrink-0
                      [&[data-state=open]]:text-[#F5F0E8]
                    "
                  >
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 text-[#666666] text-sm leading-relaxed pr-8">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
