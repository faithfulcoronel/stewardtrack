"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUp } from "lucide-react";
import {
  LandingHeader,
  HeroScroll,
  Introduction,
  Features,
  Testimonials,
  Pricing,
  LandingFAQ,
  TeamHighlight,
  FinalCTA,
  LandingFooter,
} from "@/components/landing";

export default function Home() {
  const [showTopBtn, setShowTopBtn] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 800) {
        setShowTopBtn(true);
      } else {
        setShowTopBtn(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;500;700&family=Gochi+Hand&family=Urbanist:wght@400;600;700;900&display=swap');

        :root {
          --font-sans: 'DM Sans', sans-serif;
          --font-heading: 'Urbanist', sans-serif;
          --font-hand: 'Gochi Hand', cursive;
        }

        body {
          font-family: var(--font-sans);
        }

        h1, h2, h3, h4, h5, h6, button {
          font-family: var(--font-heading);
        }

        .font-handwriting {
          font-family: var(--font-hand);
        }
      `}</style>

      <div className="font-sans text-gray-900 bg-white antialiased selection:bg-green-200 selection:text-green-900">
        <LandingHeader />
        <main>
          <HeroScroll />
          <Introduction />
          <Features />
          <Testimonials />
          <Pricing />
          <LandingFAQ />
          <TeamHighlight />
          <FinalCTA />
        </main>
        <LandingFooter />

        {/* Back to Top Button */}
        <AnimatePresence>
          {showTopBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              onClick={scrollToTop}
              className="fixed bottom-8 right-8 z-50 p-3 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 hover:shadow-xl transition-colors focus:outline-none"
              aria-label="Back to top"
            >
              <ArrowUp size={24} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
