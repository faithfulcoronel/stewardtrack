"use client";

import { motion } from "motion/react";
import Image from "next/image";

const features = [
  {
    title: "Record Offerings and Expenses with Ease",
    desc: "Works like Excel, but simpler, easier, and built specifically for church needs.",
    img: "/landing/feature-offerings.png",
  },
  {
    title: "See Your Finances at a Glance",
    desc: "Clear charts and easy-to-read reports to help you and your team track finances at a glance.",
    img: "/landing/feature-finance.png",
  },
  {
    title: "Keep Member Records in One Safe Place",
    desc: "Quickly store and look up your church members' information. Simple, private, and distraction-free.",
    img: "/landing/feature-members.png",
  }
];

export function Features() {
  return (
    <section className="py-24 bg-gray-50" id="features">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Discover What&apos;s <span className="text-[#179a65]">Possible</span> with StewardTrack
          </h2>
          <p className="text-xl text-gray-500 max-w-3xl mx-auto">
            Make your work faster and simpler with smarter tools built for ministry needs.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.2 }}
              className="bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col transform hover:-translate-y-2 transition-transform duration-300 border border-gray-100 group"
            >
              <div className="p-8 pb-0">
                <h3 className="text-2xl font-bold text-[#179a65] mb-4 leading-tight group-hover:text-green-700 transition-colors">{f.title}</h3>
                <p className="text-gray-600 text-lg">{f.desc}</p>
              </div>
              <div className="mt-8 flex-1 relative min-h-[250px] overflow-hidden">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.5 }}
                  className="absolute bottom-0 left-0 w-full h-auto"
                >
                  <Image
                    src={f.img}
                    alt={f.title}
                    width={400}
                    height={300}
                    className="w-full h-auto object-cover object-top"
                  />
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
