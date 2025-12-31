'use client';

import { motion } from 'motion/react';
import * as LucideIcons from 'lucide-react';

type IconName = keyof typeof LucideIcons;

interface FeatureCardProps {
  icon: IconName;
  title: string;
  description: string;
  index?: number;
}

export function FeatureCard({ icon, title, description, index = 0 }: FeatureCardProps) {
  const Icon = LucideIcons[icon] as LucideIcons.LucideIcon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 p-6 shadow-sm backdrop-blur-sm transition-all hover:shadow-lg hover:border-primary/20"
    >
      {/* Gradient Background on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative space-y-4">
        <div className="inline-flex rounded-lg bg-primary/10 p-3 transition-all group-hover:bg-primary/20">
          {Icon && <Icon className="size-6 text-primary" />}
        </div>

        <h3 className="text-lg font-semibold text-foreground">
          {title}
        </h3>

        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      </div>
    </motion.div>
  );
}
