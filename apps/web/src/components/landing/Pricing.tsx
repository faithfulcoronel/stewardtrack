"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "₱0",
    period: "/month",
    desc: "For small churches starting out",
    features: [
      "25 member profiles",
      "1,000 transactions",
      "Basic reports",
      "1 admin user"
    ],
    highlight: false,
  },
  {
    name: "Basic",
    price: "₱499",
    period: "/month",
    desc: "For growing churches with more needs",
    features: [
      "100 member profiles",
      "5,000 transactions",
      "Standard reports",
      "3 admin users",
      "Email Support Service"
    ],
    highlight: true,
  },
  {
    name: "Advanced",
    price: "₱999",
    period: "/month",
    desc: "For established churches managing complex finances",
    features: [
      "250 member profiles",
      "10,000 transactions",
      "Advanced reports",
      "5 admin users",
      "Custom Branding Features"
    ],
    highlight: false,
  },
  {
    name: "Premium",
    price: "₱1,999",
    period: "/month",
    desc: "For large churches managing multiple ministries",
    features: [
      "1,000 member profiles",
      "50,000 transactions",
      "Full reporting suite",
      "10 admin users",
      "Role-based access control",
      "Advanced analytics Tools"
    ],
    highlight: false,
  }
];

const customPlan = {
  name: "Custom",
  price: "Contact Us",
  desc: "For unique church needs with tailored solutions. Get unlimited access and premium support.",
  features: [
    "Unlimited member profiles",
    "Unlimited transactions",
    "Dedicated Account Manager",
    "Custom API Integrations",
    "Everything in Premium"
  ]
};

export function Pricing() {
  return (
    <section className="py-24 bg-gray-900 relative overflow-hidden" id="pricing">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 opacity-50 pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16 text-white"
        >
          <h2 className="text-4xl font-bold mb-4">
            Find the <span className="text-[#179a65]">Right Plan</span> for Your Church
          </h2>
          <p className="text-xl text-gray-300">
            Get started today with tools built to meet your ministry needs
          </p>
        </motion.div>

        {/* Main Grid Plans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-8">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: plan.highlight ? 1.05 : 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`
                relative flex flex-col w-full rounded-2xl p-6 transition-all duration-300
                ${plan.highlight
                  ? 'bg-gradient-to-b from-[#179a65] to-green-700 text-white shadow-2xl z-20 border-none transform md:-translate-y-4'
                  : 'bg-white text-gray-900 border border-gray-200 hover:shadow-xl hover:-translate-y-1'
                }
              `}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-0 right-0 text-center">
                  <span className="bg-white text-[#179a65] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-sm">Most Popular</span>
                </div>
              )}

              <div className="mb-6">
                <h3 className={`text-2xl font-bold mb-2 ${plan.highlight ? 'text-white' : 'text-[#179a65]'}`}>{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className={`text-sm ${plan.highlight ? 'text-green-100' : 'text-gray-500'}`}>{plan.period}</span>
                </div>
                <p className={`mt-4 text-sm ${plan.highlight ? 'text-green-50' : 'text-gray-500'}`}>
                  {plan.desc}
                </p>
              </div>

              <div className="flex-1 mb-8">
                <ul className="space-y-3">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm">
                      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.highlight ? 'text-green-200' : 'text-[#179a65]'}`} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href="/signup"
                  className={`
                    w-full py-3 px-6 rounded-lg font-bold text-sm transition-colors text-center block
                    ${plan.highlight
                      ? 'bg-white text-[#179a65] hover:bg-gray-50'
                      : 'bg-[#179a65] text-white hover:bg-green-600'
                    }
                  `}
                >
                  Get Started
                </Link>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Custom Plan - Full Width Banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="max-w-7xl mx-auto bg-gradient-to-r from-gray-800 to-gray-800 border border-gray-700 rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 hover:border-[#179a65]/50 transition-colors"
        >
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">{customPlan.name}</h3>
            <p className="text-gray-400 mb-6 max-w-xl">{customPlan.desc}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-3">
              {customPlan.features.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                  <Check className="w-4 h-4 text-[#179a65]" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end gap-4 min-w-[200px]">
            <div className="text-center md:text-right">
              <span className="block text-2xl font-bold text-white">{customPlan.price}</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-transparent border-2 border-[#179a65] text-green-400 font-bold py-3 px-8 rounded-lg hover:bg-[#179a65] hover:text-white transition-all flex items-center gap-2"
            >
              Contact Sales <ArrowRight size={18} />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
