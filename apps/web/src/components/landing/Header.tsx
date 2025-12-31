"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";

export function LandingHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = ["Overview", "Features", "Testimonials", "Pricing", "FAQ"];

  const scrollToSection = (id: string) => {
    setIsMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center pt-4 md:pt-8 px-4 pointer-events-none"
    >
      {/* The header container */}
      <div className="bg-white/90 backdrop-blur-md rounded-full shadow-lg pl-6 pr-4 py-3 flex items-center justify-between gap-4 md:gap-8 pointer-events-auto border border-gray-100 max-w-full md:max-w-none w-full md:w-auto">

        {/* Logo */}
        <Link
          href="/"
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="flex-shrink-0"
        >
          <Image
            src="/landing/logo-light.png"
            alt="StewardTrack"
            width={160}
            height={32}
            className="h-6 md:h-8 w-auto"
          />
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8">
          {menuItems.map((item) => (
            <button
              key={item}
              onClick={() => scrollToSection(item.toLowerCase())}
              className="text-gray-600 hover:text-[#179a65] font-semibold text-sm transition-colors"
            >
              {item}
            </button>
          ))}
        </nav>

        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/login"
            className="text-[#179a65] font-bold text-sm hover:text-green-700 transition-colors border-2 border-[#179a65] rounded-full px-6 py-2 hover:bg-green-50"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="bg-[#179a65] text-white font-bold text-sm hover:bg-green-600 transition-colors rounded-full px-6 py-2.5 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            Try for Free
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-gray-600 hover:text-[#179a65] transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-4 w-[calc(100%-2rem)] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden pointer-events-auto md:hidden"
          >
            <nav className="flex flex-col p-6 gap-4">
              {menuItems.map((item) => (
                <button
                  key={item}
                  onClick={() => scrollToSection(item.toLowerCase())}
                  className="text-lg font-semibold text-gray-800 py-3 border-b border-gray-100 last:border-0 text-left hover:text-[#179a65] transition-colors"
                >
                  {item}
                </button>
              ))}
              <div className="flex flex-col gap-3 mt-4">
                <Link
                  href="/signup"
                  className="w-full bg-[#179a65] text-white font-bold text-lg py-3 rounded-xl shadow-md hover:bg-green-600 transition-colors text-center"
                >
                  Try for Free
                </Link>
                <Link
                  href="/login"
                  className="w-full text-[#179a65] font-bold text-lg py-3 border-2 border-[#179a65] rounded-xl hover:bg-green-50 transition-colors text-center"
                >
                  Sign In
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
