'use client';

import type { Metadata } from "next";
import Link from "next/link";
import { motion } from "motion/react";
import { Church, Shield, CheckCircle2, Users } from "lucide-react";

import { SignInForm } from "./sign-in-form";
import { TrustBadges } from "@/components/marketing";

// Note: Metadata export removed as this is now a client component
// SEO metadata should be handled in layout or parent server component

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-120px)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2 lg:items-center">
        {/* Left Column - Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="order-2 lg:order-1"
        >
          <div className="rounded-2xl border border-border/60 bg-card/50 p-8 shadow-lg backdrop-blur-sm sm:p-10">
            <div className="mb-8 space-y-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Church className="size-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
              </div>
              <p className="text-base text-muted-foreground">
                Sign in to your church dashboard and continue managing your ministry
              </p>
            </div>

            <SignInForm />

            <div className="mt-6 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    New to StewardTrack?
                  </span>
                </div>
              </div>

              <div className="text-center text-sm">
                <Link
                  href="/signup"
                  className="font-medium text-primary hover:underline"
                >
                  Start your free 14-day trial
                </Link>
                <span className="mx-2 text-muted-foreground">•</span>
                <span className="text-muted-foreground">No credit card required</span>
              </div>
            </div>

            <div className="mt-8 border-t border-border/60 pt-6">
              <TrustBadges
                badges={[
                  { icon: 'shield', text: 'Bank-level Security' },
                  { icon: 'lock', text: '256-bit Encryption' },
                ]}
                variant="horizontal"
              />
            </div>
          </div>
        </motion.div>

        {/* Right Column - Marketing Content */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="order-1 space-y-8 lg:order-2"
        >
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Your Church Management Hub
            </h2>
            <p className="text-lg text-muted-foreground">
              Access all your church tools in one place. Manage members, events, giving, and communications with ease.
            </p>
          </div>

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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                className="flex gap-4 rounded-xl border border-border/60 bg-card/30 p-4 backdrop-blur-sm"
              >
                <div className="flex-shrink-0">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <feature.icon className="size-6 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="rounded-xl border border-primary/20 bg-primary/5 p-6 backdrop-blur-sm"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <CheckCircle2 className="size-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  "StewardTrack has saved our church 10+ hours per week on administrative tasks."
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  - Pastor Michael J., Grace Community Church
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
