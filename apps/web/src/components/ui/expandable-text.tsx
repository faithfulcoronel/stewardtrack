'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ExpandableTextProps {
  text: string;
  /** Max number of lines before truncation. Default: 4 */
  maxLines?: number;
  className?: string;
  /** Class for the "see more/less" button */
  toggleClassName?: string;
}

export function ExpandableText({
  text,
  maxLines = 4,
  className,
  toggleClassName,
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    // Check if text is actually overflowing
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    const maxHeight = lineHeight * maxLines;
    setIsClamped(el.scrollHeight > maxHeight + 1);
  }, [text, maxLines]);

  return (
    <div>
      <p
        ref={textRef}
        className={cn(
          className,
          !isExpanded && 'overflow-hidden'
        )}
        style={
          !isExpanded
            ? {
                display: '-webkit-box',
                WebkitLineClamp: maxLines,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }
            : undefined
        }
      >
        {text}
      </p>
      {isClamped && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className={cn(
            'text-xs font-medium mt-1 cursor-pointer hover:underline focus:outline-none',
            toggleClassName
          )}
        >
          {isExpanded ? 'See less' : 'See more'}
        </button>
      )}
    </div>
  );
}
