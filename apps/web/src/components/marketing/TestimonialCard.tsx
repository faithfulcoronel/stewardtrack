'use client';

import { motion } from 'motion/react';
import { Quote } from 'lucide-react';

interface TestimonialCardProps {
  quote: string;
  author: {
    name: string;
    role: string;
    church: string;
    image?: string;
  };
  index?: number;
}

export function TestimonialCard({ quote, author, index = 0 }: TestimonialCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-8 shadow-sm backdrop-blur-sm"
    >
      <div className="absolute right-4 top-4 opacity-10">
        <Quote className="size-16 text-primary" />
      </div>

      <div className="relative space-y-6">
        <p className="text-base leading-relaxed text-foreground">
          "{quote}"
        </p>

        <div className="flex items-center gap-4">
          {author.image ? (
            <img
              src={author.image}
              alt={author.name}
              className="size-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
              {author.name.charAt(0)}
            </div>
          )}

          <div>
            <p className="font-semibold text-foreground">{author.name}</p>
            <p className="text-sm text-muted-foreground">
              {author.role}, {author.church}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
