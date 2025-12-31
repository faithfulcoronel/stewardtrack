"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { CheckCircle2, Users, PieChart, DollarSign } from "lucide-react";

// Activity bubbles data
const activities = [
  { text: "Budget Approved", icon: <CheckCircle2 size={14} />, color: "text-[#179a65]", bg: "bg-green-100", pos: "top-0 -left-12 md:-left-24" },
  { text: "New Member Added", icon: <Users size={14} />, color: "text-blue-600", bg: "bg-blue-100", pos: "top-12 -right-16 md:-right-32" },
  { text: "Report Generated", icon: <PieChart size={14} />, color: "text-purple-600", bg: "bg-purple-100", pos: "bottom-8 -left-16 md:-left-36" },
  { text: "Donation Received", icon: <DollarSign size={14} />, color: "text-amber-600", bg: "bg-amber-100", pos: "bottom-0 -right-8 md:-right-24" },
];

export function TeamHighlight() {
  return (
    <section className="py-32 bg-[#179a65] relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#179a65] to-green-600 opacity-90" />

      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />

      <div className="container mx-auto px-4 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto mb-20"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Church Management Made Simple for Your Team
          </h2>
          <p className="text-xl text-green-50 max-w-2xl mx-auto">
            Equip your team with the tools to lead, organize, and serve better. Real-time updates keep everyone on the same page.
          </p>
        </motion.div>

        {/* Central Avatar with Orbiting Activities */}
        <div className="relative h-64 w-64 mx-auto flex items-center justify-center">

          {/* The Leader Avatar */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
            className="relative z-20 w-48 h-48 rounded-full border-4 border-white/30 shadow-2xl overflow-hidden bg-green-800"
          >
            <Image src="/landing/team-leader.png" alt="Team Lead" width={192} height={192} className="w-full h-full object-cover" />
          </motion.div>

          {/* Decorative pulsing rings */}
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-8 border border-white/20 rounded-full pointer-events-none"
          />
          <motion.div
            animate={{ scale: [1.2, 1.5, 1.2], opacity: [0.2, 0, 0.2] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute inset-8 border border-white/10 rounded-full pointer-events-none"
          />

          {/* Activity Bubbles */}
          {activities.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              className={`absolute ${item.pos} z-30 hidden sm:flex items-center gap-2 bg-white py-2 px-4 rounded-full shadow-lg shadow-black/10 whitespace-nowrap`}
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i
              }}
            >
              <div className={`p-1 rounded-full ${item.bg} ${item.color}`}>
                {item.icon}
              </div>
              <span className="text-sm font-bold text-gray-800">{item.text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
