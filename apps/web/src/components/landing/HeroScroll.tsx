"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "motion/react";
import { HeroSlide1, HeroSlide2, HeroSlide3, HeroSlide4 } from "./HeroSlides";

export function HeroScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const [activeSlide, setActiveSlide] = useState(1);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    // Determine active slide based on scroll progress
    if (latest < 0.20) {
      setActiveSlide(1);
    } else if (latest < 0.45) {
      setActiveSlide(2);
    } else if (latest < 0.70) {
      setActiveSlide(3);
    } else {
      setActiveSlide(4);
    }
  });

  // Fade out logic for each slide
  const opacity1 = useTransform(scrollYProgress, [0.15, 0.25], [1, 0]);
  const opacity2 = useTransform(scrollYProgress, [0.40, 0.50], [1, 0]);
  const opacity3 = useTransform(scrollYProgress, [0.65, 0.75], [1, 0]);

  // Transition for Slide 4 (Fade out/scale down at the end)
  const opacity4 = useTransform(scrollYProgress, [0.9, 1], [1, 0]);
  const scale4 = useTransform(scrollYProgress, [0.9, 1], [1, 0.95]);
  const y4 = useTransform(scrollYProgress, [0.9, 1], ["0%", "-5%"]);

  // Consistent background for all slides
  const cardClass = "absolute inset-0 w-full h-full overflow-hidden bg-[#179a65]";

  return (
    <div ref={containerRef} className="relative h-[400vh] bg-[#179a65]">
      <div className="sticky top-0 h-screen overflow-hidden">

        {/* Slide 4 - Bottom Layer (Always visible, revealed last) */}
        <motion.div
          style={{ opacity: opacity4, scale: scale4, y: y4 }}
          className={`${cardClass} z-10`}
        >
          <HeroSlide4 isActive={activeSlide === 4} />
        </motion.div>

        {/* Slide 3 - Fades out to reveal Slide 4 */}
        <motion.div
          style={{ opacity: opacity3 }}
          className={`${cardClass} z-20`}
        >
          <HeroSlide3 isActive={activeSlide === 3} />
        </motion.div>

        {/* Slide 2 - Fades out to reveal Slide 3 */}
        <motion.div
          style={{ opacity: opacity2 }}
          className={`${cardClass} z-30`}
        >
          <HeroSlide2 isActive={activeSlide === 2} />
        </motion.div>

        {/* Slide 1 - Top Layer - Fades out to reveal Slide 2 */}
        <motion.div
          style={{ opacity: opacity1 }}
          className={`${cardClass} z-40`}
        >
          <HeroSlide1 isActive={activeSlide === 1} />
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          style={{ opacity: useTransform(scrollYProgress, [0, 0.05], [1, 0]) }}
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-50 text-white flex flex-col items-center gap-2 pointer-events-none"
        >
          <p className="text-sm font-medium tracking-widest uppercase text-green-50">Keep Scrolling</p>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
            </svg>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
