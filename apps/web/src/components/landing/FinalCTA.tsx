"use client";

import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="pt-24 pb-0 bg-white relative overflow-hidden">
      <div className="container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Feeling Unsure? We got you. <br />
            Try <span className="text-[#179a65]">StewardTrack for Free.</span>
          </h2>
          <p className="text-xl text-gray-600">
            Get started with StewardTrack and make the most of your church finances for free.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col md:flex-row items-center justify-center gap-6 mb-16"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
              href="/signup"
              className="bg-[#179a65] text-white font-bold text-lg px-10 py-4 rounded-full hover:bg-green-600 transition-all shadow-lg w-full md:w-auto text-center inline-block"
            >
              Register
            </Link>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
              href="/login"
              className="bg-white text-[#179a65] border-2 border-[#179a65] font-bold text-lg px-10 py-4 rounded-full hover:bg-green-50 transition-all w-full md:w-auto text-center inline-block"
            >
              Sign In
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
          className="relative max-w-5xl mx-auto"
        >
          <Image
            src="/landing/laptop.png"
            alt="StewardTrack Dashboard on Laptop"
            width={1200}
            height={800}
            className="relative left-1/2 -translate-x-1/2 w-screen max-w-none h-auto drop-shadow-2xl -mt-10"
          />
        </motion.div>
      </div>
    </section>
  );
}
