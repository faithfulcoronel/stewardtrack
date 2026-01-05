"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { svgPaths } from "./svg-paths";

function BackgroundVectors() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 scale-[0.6] md:scale-[0.8] lg:scale-100 w-[1744px] h-[861px] opacity-10">
        <div className="absolute contents left-[calc(50%-1.79px)] top-[-1730.35px] translate-x-[-50%]">
          <div className="absolute flex inset-[33.1%_-24.54%_-246.18%_-24.3%] items-center justify-center mix-blend-soft-light">
            <div className="flex-none h-[2134.24px] rotate-[216.674deg] scale-y-[-100%] w-[1647.26px]">
              <div className="relative size-full">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1648 2135">
                  <g style={{ mixBlendMode: "soft-light" }}>
                    <path d={svgPaths.p1a8af200} fill="url(#paint0_linear_1_3133_slide)" />
                  </g>
                  <defs>
                    <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_3133_slide" x1="823.629" x2="823.629" y1="0" y2="2134.24">
                      <stop stopColor="white" />
                      <stop offset="0.677885" stopColor="#999999" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
          <div className="absolute h-[1816.56px] left-[-1607.71px] mix-blend-soft-light top-[194.98px] w-[2383.62px]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2384 1817">
              <g style={{ mixBlendMode: "soft-light" }}>
                <path d={svgPaths.pc49ab80} fill="url(#paint0_linear_1_3146_slide)" />
              </g>
              <defs>
                <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_3146_slide" x1="2382.44" x2="1.17413" y1="966.869" y2="963.788">
                  <stop stopColor="white" />
                  <stop offset="0.677885" stopColor="#999999" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="absolute flex h-[1816.56px] items-center justify-center left-[-1645.9px] mix-blend-soft-light top-[-1730.35px] w-[2498.19px]">
            <div className="flex-none scale-y-[-100%]">
              <div className="h-[1816.56px] relative w-[2498.19px]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2499 1817">
                  <g style={{ mixBlendMode: "soft-light" }}>
                    <path d={svgPaths.p37228480} fill="url(#paint0_linear_1_3179_slide)" />
                  </g>
                  <defs>
                    <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_3179_slide" x1="2496.96" x2="1.23098" y1="966.869" y2="963.485">
                      <stop stopColor="white" />
                      <stop offset="0.677885" stopColor="#999999" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
          <div className="absolute inset-[20.68%_-94.17%_-199.03%_54.27%] mix-blend-soft-light">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2440 2397">
              <g style={{ mixBlendMode: "soft-light" }}>
                <path d={svgPaths.p19254000} fill="url(#paint0_linear_1_3086_slide)" fillOpacity="0.61" />
              </g>
              <defs>
                <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_3086_slide" x1="107.792" x2="3448.24" y1="147.691" y2="1500.54">
                  <stop stopColor="white" />
                  <stop offset="0.953184" stopColor="#999999" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

interface HeroSlideProps {
  isActive?: boolean;
}

export function HeroSlide1({ isActive = true }: HeroSlideProps) {
  return (
    <div className="relative w-full h-full bg-[#179a65] overflow-hidden font-sans">
      <BackgroundVectors />

      {/* Background Paper Piles (High Density) */}
      <div className="absolute inset-0 flex items-end justify-center z-10">
        <Image
          src="/landing/hero-papers-1.png"
          alt="Heavy Paperwork"
          fill
          className="object-cover object-bottom"
          priority
        />
      </div>

      {/* Person - Consistent Position across slides */}
      <div className="absolute inset-0 flex items-end justify-center z-20 pointer-events-none">
        <Image
          src="/landing/hero-person.png"
          alt="Stressed Accountant"
          width={600}
          height={800}
          className="h-[75vh] md:h-[85vh] lg:h-[90vh] w-auto max-w-none object-contain translate-y-[5%] md:translate-x-2 lg:translate-x-4"
          priority
        />
      </div>

      {/* Text Content - Center */}
      <div className="absolute top-[20%] landscape:top-[25%] md:top-[15%] left-0 w-full z-30 flex justify-center px-4 pointer-events-none">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={isActive ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center text-white max-w-4xl drop-shadow-xl"
        >
          <h1 className="text-2xl landscape:text-xl sm:text-3xl md:text-5xl lg:text-[56px] font-bold leading-[1.1] text-white">
            Is Church Accounting taking up <br className="hidden sm:block" />
            much of your God-given time?
          </h1>
        </motion.div>
      </div>
    </div>
  );
}

export function HeroSlide2({ isActive = false }: HeroSlideProps) {
  return (
    <div className="relative w-full h-full bg-[#179a65] overflow-hidden font-sans">
      <BackgroundVectors />

      {/* Background Paper Piles (Medium Density) */}
      <div className="absolute inset-0 flex items-end justify-center z-10">
        <Image
          src="/landing/hero-papers-2.png"
          alt="Paperwork"
          fill
          className="object-cover object-bottom"
        />
      </div>

      {/* Person - Consistent Position */}
      <div className="absolute inset-0 flex items-end justify-center z-20 pointer-events-none">
        <Image
          src="/landing/hero-person.png"
          alt="Stressed Accountant"
          width={600}
          height={800}
          className="h-[75vh] md:h-[85vh] lg:h-[90vh] w-auto max-w-none object-contain translate-y-[5%] md:translate-x-2 lg:translate-x-4"
        />
      </div>

      {/* Text Content - Right Aligned */}
      <div className="absolute top-[20%] landscape:top-[25%] md:top-[18%] right-0 md:right-[5%] lg:right-[8%] w-full md:w-auto z-30 flex flex-col items-center md:items-end px-4 pointer-events-none">
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={isActive ? { x: 0, opacity: 1 } : { x: 50, opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center md:text-right text-white max-w-lg drop-shadow-xl pointer-events-auto"
        >
          <h2 className="text-2xl landscape:text-lg sm:text-3xl md:text-4xl lg:text-[42px] font-bold leading-[1.2] mb-4 landscape:mb-2 md:mb-6 text-white">
            Because caring for <br className="hidden landscape:hidden sm:block" />
            God&apos;s work shouldn&apos;t <br className="hidden landscape:hidden sm:block" />
            feel complicated.
          </h2>

          <div className="flex justify-center md:justify-end">
            <div className="relative group cursor-pointer inline-flex">
              <div className="absolute inset-0 bg-white/20 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center gap-3 px-8 py-3 border-2 border-white rounded-full text-white font-semibold hover:bg-white hover:text-[#179a65] transition-all">
                <span>Keep Scrolling</span>
                <svg className="w-5 h-5 rotate-90" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={svgPaths.p1100880} />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function HeroSlide3({ isActive = false }: HeroSlideProps) {
  return (
    <div className="relative w-full h-full bg-[#179a65] overflow-hidden font-sans">
      <BackgroundVectors />

      {/* Background Paper Piles (Low Density) */}
      <div className="absolute inset-0 flex items-end justify-center z-10">
        <Image
          src="/landing/hero-papers-3.png"
          alt="Reduced Paperwork"
          fill
          className="object-cover object-bottom"
        />
      </div>

      {/* Person - Consistent Position */}
      <div className="absolute inset-0 flex items-end justify-center z-20 pointer-events-none">
        <Image
          src="/landing/hero-person.png"
          alt="Focusing Accountant"
          width={600}
          height={800}
          className="h-[75vh] md:h-[85vh] lg:h-[90vh] w-auto max-w-none object-contain translate-y-[5%] md:translate-x-2 lg:translate-x-4"
        />
      </div>

      {/* Text Content - Left Aligned */}
      <div className="absolute top-[20%] landscape:top-[25%] md:top-[20%] left-0 md:left-[5%] lg:left-[8%] w-full md:w-auto z-30 flex flex-col items-center md:items-start px-4 pointer-events-none">
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={isActive ? { x: 0, opacity: 1 } : { x: -50, opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center md:text-left text-white max-w-lg drop-shadow-xl pointer-events-auto"
        >
          <h2 className="text-2xl landscape:text-lg sm:text-3xl md:text-4xl lg:text-[42px] font-bold leading-[1.2] mb-4 landscape:mb-2 md:mb-6 text-white">
            Because you deserve to <br className="hidden landscape:hidden sm:block" />
            focus on what truly <br className="hidden landscape:hidden sm:block" />
            matters, not paperwork.
          </h2>

          <div className="flex justify-center md:justify-start">
            <div className="relative group cursor-pointer inline-flex">
              <div className="absolute inset-0 bg-white/20 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center gap-3 px-8 py-3 border-2 border-white rounded-full text-white font-semibold hover:bg-white hover:text-[#179a65] transition-all">
                <span>Keep Scrolling</span>
                <svg className="w-5 h-5 rotate-90" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={svgPaths.p1100880} />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function HeroSlide4({ isActive = false }: HeroSlideProps) {
  return (
    <div className="relative w-full h-full bg-transparent overflow-hidden flex flex-col justify-between">
      {/* Background Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(93,255,155,0.286)] via-transparent to-[rgba(33,33,33,0.3)] mix-blend-overlay pointer-events-none" />

      {/* Complex Vectors */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isActive ? 0.2 : 0 }}
        transition={{ duration: 1.5 }}
        className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none"
      >
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 scale-[0.6] md:scale-[0.8] lg:scale-100 w-[1744px] h-[861px]">
          <div className="absolute contents left-[calc(50%-1.79px)] top-[-1730.35px] translate-x-[-50%]">
            <div className="absolute flex inset-[33.1%_-24.54%_-246.18%_-24.3%] items-center justify-center mix-blend-soft-light">
              <div className="flex-none h-[2134.24px] rotate-[216.674deg] scale-y-[-100%] w-[1647.26px]">
                <div className="relative size-full">
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1648 2135">
                    <g style={{ mixBlendMode: "soft-light" }}>
                      <path d={svgPaths.p1a8af200} fill="url(#paint0_linear_1_3133_4)" />
                    </g>
                    <defs>
                      <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_3133_4" x1="823.629" x2="823.629" y1="0" y2="2134.24">
                        <stop stopColor="white" />
                        <stop offset="0.677885" stopColor="#999999" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Large Central Image */}
      <motion.div
        initial={{ y: 100, opacity: 0, scale: 0.95 }}
        animate={isActive ? { y: 0, opacity: 1, scale: 1 } : { y: 100, opacity: 0, scale: 0.95 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="absolute inset-0 flex items-end justify-center pointer-events-none"
      >
        <Image
          src="/landing/hero-final.png"
          alt="StewardTrack User"
          width={1200}
          height={900}
          className="h-[80vh] md:h-[90%] lg:h-[95%] w-auto max-w-none object-contain object-bottom md:object-center translate-y-[5%] md:translate-y-0"
        />
      </motion.div>

      <div className="relative z-10 container mx-auto px-6 md:px-16 lg:px-24 h-full flex flex-col lg:flex-row items-center lg:items-start justify-between pt-44 pb-12 lg:pt-32 lg:pb-0 gap-8 lg:gap-0">

        {/* Left Content - Top on mobile */}
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={isActive ? { x: 0, opacity: 1 } : { x: -50, opacity: 0 }}
          transition={{ duration: 0.8, delay: isActive ? 0.2 : 0, ease: "easeOut" }}
          className="flex flex-col items-center lg:items-start text-center lg:text-left max-w-md lg:w-1/3"
        >
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight font-sans drop-shadow-md">
            Simplify Church Finances in Minutes with StewardTrack
          </h2>
          <p className="text-lg text-white/90 mb-8 leading-relaxed font-sans drop-shadow-sm">
            Go Paperless with automated reports, transparent records, and secure accounting.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group relative inline-flex h-[47px] w-[232px] items-center justify-center overflow-hidden rounded-full border-2 border-white bg-transparent text-base font-semibold text-white transition-all hover:bg-white hover:text-[#179a65] shadow-lg"
          >
            <span className="z-10">Try for Free</span>
          </motion.button>
        </motion.div>

        {/* Right Content */}
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={isActive ? { x: 0, opacity: 1 } : { x: 50, opacity: 0 }}
          transition={{ duration: 0.8, delay: isActive ? 0.4 : 0, ease: "easeOut" }}
          className="hidden lg:flex flex-col items-center lg:items-end text-center lg:text-right max-w-md lg:w-1/3"
        >
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight font-sans drop-shadow-md">
            Take your Finance further with Smarter Tools.
          </h2>
          <p className="text-lg text-white/90 mb-8 leading-relaxed font-sans drop-shadow-sm">
            Discover advanced features and tailored plans built to help your ministry grow.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group relative inline-flex h-[47px] w-[232px] items-center justify-center overflow-hidden rounded-full border-2 border-white bg-transparent text-base font-semibold text-white transition-all hover:bg-white hover:text-[#179a65] shadow-lg"
          >
            <span className="z-10">Discover Plans</span>
          </motion.button>
        </motion.div>

      </div>
    </div>
  );
}
