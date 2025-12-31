"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    question: "Is StewardTrack secure for church finances?",
    answer: "Absolutely. We use bank-grade encryption (AES-256) to protect all financial data. Your records are stored securely in the cloud with daily backups, ensuring your ministry's sensitive information is never lost or compromised."
  },
  {
    question: "Can I import data from Excel or other tools?",
    answer: "Yes! StewardTrack includes a simple import tool that allows you to upload your existing member lists and financial records from CSV or Excel files. Our support team is also available to help you migrate if needed."
  },
  {
    question: "Do I need to install any software?",
    answer: "No installation is required. StewardTrack is 100% cloud-based, meaning you can access it from any computer, tablet, or smartphone with an internet connection. Updates happen automatically."
  },
  {
    question: "Is there a limit to how many admins I can have?",
    answer: "It depends on your plan. The Free plan includes 1 admin, while our Basic and Premium plans allow for multiple admin users with different role-based permissions (e.g., Treasurer, Secretary, Pastor)."
  },
  {
    question: "Can I cancel my subscription at any time?",
    answer: "Yes, there are no long-term contracts. You can upgrade, downgrade, or cancel your subscription at any time directly from your dashboard. We believe you should stay because you love the product, not because you're locked in."
  }
];

function FAQItem({ question, answer, isOpen, onClick, index }: {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="mb-4 border border-gray-200 rounded-2xl overflow-hidden bg-white hover:border-green-200 transition-colors"
    >
      <button
        onClick={onClick}
        className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none group"
      >
        <span className="text-lg font-bold text-gray-800 group-hover:text-[#179a65] transition-colors pr-4">
          {question}
        </span>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${isOpen ? 'bg-[#179a65] text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-green-50'}`}>
          {isOpen ? <Minus size={16} /> : <Plus size={16} />}
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-6 pb-6 text-gray-600 leading-relaxed">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 bg-white" id="faq">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked <span className="text-[#179a65]">Questions</span>
          </h2>
          <p className="text-gray-500 text-xl">
            Everything you need to know about getting started with StewardTrack
          </p>
        </motion.div>

        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              index={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
