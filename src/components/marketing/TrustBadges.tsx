'use client';

import { motion } from 'motion/react';
import { Shield, Lock, Check, Award } from 'lucide-react';

interface TrustBadge {
  icon: 'shield' | 'lock' | 'check' | 'award';
  text: string;
}

interface TrustBadgesProps {
  badges?: TrustBadge[];
  variant?: 'horizontal' | 'vertical';
}

const iconMap = {
  shield: Shield,
  lock: Lock,
  check: Check,
  award: Award,
};

const defaultBadges: TrustBadge[] = [
  { icon: 'shield', text: 'SOC 2 Compliant' },
  { icon: 'lock', text: '256-bit Encryption' },
  { icon: 'check', text: 'GDPR Ready' },
  { icon: 'award', text: 'Trusted by 500+ Churches' },
];

export function TrustBadges({ badges = defaultBadges, variant = 'horizontal' }: TrustBadgesProps) {
  return (
    <div
      className={`flex ${
        variant === 'horizontal' ? 'flex-wrap justify-center gap-6' : 'flex-col gap-4'
      }`}
    >
      {badges.map((badge, index) => {
        const Icon = iconMap[badge.icon];
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            viewport={{ once: true }}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Icon className="size-4 text-primary" />
            <span>{badge.text}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
