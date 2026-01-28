"use client";

import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { svgPaths } from "./svg-paths";

function BackgroundVectors() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 scale-[0.5] md:scale-[0.6] lg:scale-[0.8] w-[1446px] h-[935px] opacity-10">
        <div className="absolute contents left-[calc(50%+309.11px)] top-[-2232.65px] translate-x-[-50%]">
          <div className="absolute flex inset-[24.69%_-81.36%_-277.12%_-37.95%] items-center justify-center mix-blend-soft-light">
            <div className="flex-none h-[2608.31px] rotate-[216.691deg] scale-y-[-100%] skew-x-[359.963deg] w-[2012.79px]">
              <div className="relative size-full">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2013 2609">
                  <g style={{ mixBlendMode: "soft-light" }}>
                    <path d={svgPaths.p3320a480} fill="url(#paint0_linear_1_3007_intro)" />
                  </g>
                  <defs>
                    <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_3007_intro" x1="1006.4" x2="1006.4" y1="0" y2="2608.31">
                      <stop stopColor="white" />
                      <stop offset="0.677885" stopColor="#999999" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
          <div className="absolute h-[2220.55px] left-[-1995.01px] mix-blend-soft-light top-[120.86px] w-[2911.91px]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2912 2221">
              <g style={{ mixBlendMode: "soft-light" }}>
                <path d={svgPaths.p2a2c6300} fill="url(#paint0_linear_1_3049_intro)" />
              </g>
              <defs>
                <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_3049_intro" x1="2910.48" x2="1.43436" y1="1181.89" y2="1178.13">
                  <stop stopColor="white" />
                  <stop offset="0.677885" stopColor="#999999" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="absolute flex h-[2220.55px] items-center justify-center left-[-2041.66px] mix-blend-soft-light top-[-2232.65px] w-[3051.88px]">
            <div className="flex-none scale-y-[-100%]">
              <div className="h-[2220.55px] relative w-[3051.88px]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 3052 2221">
                  <g style={{ mixBlendMode: "soft-light" }}>
                    <path d={svgPaths.p27146000} fill="url(#paint0_linear_1_3165_intro)" />
                  </g>
                  <defs>
                    <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_3165_intro" x1="3050.37" x2="1.5038" y1="1181.89" y2="1177.76">
                      <stop stopColor="white" />
                      <stop offset="0.677885" stopColor="#999999" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
          <div className="absolute inset-[10.72%_-183.95%_-224.04%_77.83%] mix-blend-soft-light">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2981 2930">
              <g style={{ mixBlendMode: "soft-light" }}>
                <path d={svgPaths.p40308b0} fill="url(#paint0_linear_1_3032_intro)" fillOpacity="0.61" />
              </g>
              <defs>
                <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_3032_intro" x1="131.683" x2="4213.21" y1="180.536" y2="1832.49">
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

export function Introduction() {
  return (
    <div id="overview" className="relative w-full min-h-screen overflow-hidden bg-[#179a65] font-sans flex flex-col items-center justify-start">
      {/* Gradient Background from design */}
      <div className="absolute inset-0 pointer-events-none">
        <svg className="block w-full h-full object-cover" preserveAspectRatio="none" viewBox="0 0 1752 939">
          <path d="M0 0H1752V939H0V0Z" fill="url(#paint0_linear_1_3131_intro)" />
          <defs>
            <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_1_3131_intro" x1="-593.711" x2="2369.46" y1="-59.1374" y2="661.211">
              <stop offset="0.144231" stopColor="#279A6C" />
              <stop offset="0.274038" stopColor="#179A65" />
              <stop offset="0.399038" stopColor="#20BF5B" />
              <stop offset="0.524038" stopColor="#1CAD52" />
              <stop offset="0.658654" stopColor="#20BD5C" />
              <stop offset="0.807692" stopColor="#0F766E" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <BackgroundVectors />

      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(93,191,108,0)] to-[rgba(33,33,33,0.68)] mix-blend-overlay pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-7xl px-6 pt-20 md:pt-32 pb-0 h-full">

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-12 md:mb-16 max-w-4xl"
        >
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight drop-shadow-sm">
            Introducing StewardTrack
          </h1>
          <p className="text-lg md:text-xl text-white/90 font-sans max-w-2xl mx-auto leading-relaxed">
            Make your work faster and simpler with smarter tools built for ministry needs.
          </p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Link
            href="/signup"
            className="px-8 py-3 bg-white rounded-full text-[#179a65] text-base md:text-lg font-semibold shadow-lg hover:shadow-xl hover:bg-green-50 transition-all z-20 mb-16 md:mb-20 inline-block"
          >
            Register for Free
          </Link>
        </motion.div>

        {/* Dashboard Image Stack */}
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.9 }}
          whileInView={{ y: 0, opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-[1000px]"
        >
          {/* Refined Background Layers */}
          <div className="absolute top-[-32px] left-[6%] right-[6%] h-40 bg-white/10 rounded-t-[32px] z-0 border border-white/5" />
          <div className="absolute top-[-16px] left-[3%] right-[3%] h-40 bg-white/20 rounded-t-[32px] z-0 border border-white/10" />

          {/* Main Image Container */}
          <div className="relative z-10 rounded-t-[24px] overflow-hidden shadow-2xl shadow-black/30 bg-white ring-1 ring-white/20">
            <Image
              src="/landing/dashboard.png"
              alt="StewardTrack Dashboard"
              width={1000}
              height={600}
              className="w-full h-auto object-cover object-top"
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
