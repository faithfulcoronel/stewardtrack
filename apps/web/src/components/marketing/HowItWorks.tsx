'use client';

import { motion } from 'motion/react';
import * as LucideIcons from 'lucide-react';

type IconName = keyof typeof LucideIcons;

interface Step {
  number: number;
  icon: IconName;
  title: string;
  description: string;
}

interface HowItWorksProps {
  headline?: string;
  description?: string;
  steps: Step[];
}

export function HowItWorks({
  headline = 'How It Works',
  description = 'Get started in minutes with our simple three-step process',
  steps,
}: HowItWorksProps) {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            {headline}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {description}
          </p>
        </motion.div>

        <div className="relative">
          {/* Connection Line */}
          <div className="absolute left-8 top-8 hidden h-full w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent lg:block" />

          <div className="space-y-12">
            {steps.map((step, index) => {
              const Icon = LucideIcons[step.icon] as LucideIcons.LucideIcon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  viewport={{ once: true }}
                  className="relative flex gap-6 lg:gap-12"
                >
                  {/* Step Number Circle */}
                  <div className="relative flex size-16 shrink-0 items-center justify-center rounded-full border-4 border-background bg-primary shadow-lg">
                    <span className="text-2xl font-bold text-primary-foreground">
                      {step.number}
                    </span>
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur-sm lg:p-8">
                    <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                      {Icon && <Icon className="size-6 text-primary" />}
                    </div>
                    <h3 className="mb-3 text-xl font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
