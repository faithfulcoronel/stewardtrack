'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, Sparkles, PartyPopper } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface CompletionCelebrationProps {
  tenantName?: string;
}

// ============================================================================
// Confetti Particle Component
// ============================================================================

interface ConfettiParticleProps {
  color: string;
  delay: number;
  x: number;
}

function ConfettiParticle({ color, delay, x }: ConfettiParticleProps) {
  return (
    <motion.div
      className="absolute w-3 h-3 rounded-sm"
      style={{ backgroundColor: color, left: `${x}%` }}
      initial={{ y: -20, opacity: 1, rotate: 0 }}
      animate={{
        y: ['0vh', '100vh'],
        opacity: [1, 1, 0],
        rotate: [0, 360, 720],
        x: [0, Math.random() * 100 - 50],
      }}
      transition={{
        duration: 3,
        delay,
        ease: 'easeOut',
      }}
    />
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CompletionCelebration({ tenantName }: CompletionCelebrationProps) {
  const [confettiParticles, setConfettiParticles] = useState<
    { id: number; color: string; delay: number; x: number }[]
  >([]);

  // Generate confetti particles on mount
  useEffect(() => {
    const colors = [
      '#FF6B6B', // Red
      '#4ECDC4', // Teal
      '#45B7D1', // Blue
      '#96CEB4', // Green
      '#FFEAA7', // Yellow
      '#DDA0DD', // Purple
      '#98D8C8', // Mint
      '#F7DC6F', // Gold
    ];

    const particles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.5,
      x: Math.random() * 100,
    }));

    setConfettiParticles(particles);
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center overflow-hidden">
      {/* Confetti Container */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {confettiParticles.map((particle) => (
          <ConfettiParticle
            key={particle.id}
            color={particle.color}
            delay={particle.delay}
            x={particle.x}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center px-4">
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 20,
            delay: 0.2,
          }}
          className="inline-block mb-6"
        >
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            {/* Sparkle Effects */}
            <motion.div
              className="absolute -top-2 -right-2"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Sparkles className="h-8 w-8 text-yellow-500" />
            </motion.div>
            <motion.div
              className="absolute -bottom-1 -left-3"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <PartyPopper className="h-6 w-6 text-primary" />
            </motion.div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-4xl md:text-5xl font-bold mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            You're All Set!
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-xl text-muted-foreground mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {tenantName ? `Welcome to ${tenantName}!` : 'Welcome to StewardTrack!'}
        </motion.p>

        <motion.p
          className="text-muted-foreground"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          Taking you to your dashboard...
        </motion.p>

        {/* Loading Dots */}
        <motion.div
          className="flex justify-center gap-2 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
