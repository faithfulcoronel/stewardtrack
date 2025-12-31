'use client';

import Link from "next/link";
import { motion } from "motion/react";
import { Shield, CheckCircle2, Users } from "lucide-react";

import { SignInForm } from "./sign-in-form";

export default function LoginPage() {
  return (
    <div className="relative overflow-hidden min-h-[calc(100vh-200px)]">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#179a65] via-green-600 to-[#0F766E]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.08),transparent_40%)]" />

      <div className="relative z-10 flex items-center justify-center px-4 py-24 md:py-32">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left Column - Marketing Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="hidden lg:flex flex-col text-white"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold leading-tight mb-6"
            >
              Welcome back to your <span className="text-green-200">Church Management Hub</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-white/80 mb-10"
            >
              Access all your church tools in one place. Manage members, events, giving, and communications with ease.
            </motion.p>

            <div className="space-y-4">
              {[
                {
                  icon: Users,
                  title: 'Member Management',
                  description: 'Access member profiles, attendance records, and engagement metrics',
                },
                {
                  icon: CheckCircle2,
                  title: 'Real-time Updates',
                  description: 'Stay connected with instant notifications and live data synchronization',
                },
                {
                  icon: Shield,
                  title: 'Secure & Private',
                  description: 'Your church data is protected with enterprise-grade security',
                },
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  className="flex gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10"
                >
                  <div className="flex-shrink-0">
                    <div className="rounded-lg bg-white/20 p-3">
                      <feature.icon className="size-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{feature.title}</h3>
                    <p className="mt-1 text-sm text-white/70">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Testimonial */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mt-10 p-6 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-white/20 p-2">
                  <CheckCircle2 className="size-5 text-green-200" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white/90">
                    &ldquo;StewardTrack has saved our church 10+ hours per week on administrative tasks.&rdquo;
                  </p>
                  <p className="mt-2 text-xs text-white/60">
                    - Pastor Michael J., Grace Community Church
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Sign In Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="w-full max-w-md mx-auto lg:mx-0"
          >
            <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10">
              <div className="mb-8 space-y-2">
                <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
                <p className="text-gray-500">
                  Sign in to your church dashboard and continue managing your ministry
                </p>
              </div>

              <SignInForm />

              <div className="mt-6 space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-400">
                      New to StewardTrack?
                    </span>
                  </div>
                </div>

                <div className="text-center text-sm">
                  <Link
                    href="/signup"
                    className="font-semibold text-[#179a65] hover:text-green-700 transition-colors"
                  >
                    Start your free 14-day trial
                  </Link>
                  <span className="mx-2 text-gray-400">&bull;</span>
                  <span className="text-gray-400">No credit card required</span>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-center gap-6">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="rounded-full bg-[#179a65]/10 p-1.5">
                      <Shield className="size-3 text-[#179a65]" />
                    </div>
                    <span>Bank-level Security</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="rounded-full bg-[#179a65]/10 p-1.5">
                      <CheckCircle2 className="size-3 text-[#179a65]" />
                    </div>
                    <span>256-bit Encryption</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile-only tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="lg:hidden mt-6 text-center text-white/80 text-sm"
            >
              Trusted by 500+ churches worldwide
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
