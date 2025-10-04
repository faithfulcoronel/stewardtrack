# Quick Start Guide - New Public Pages

## Overview
This guide helps you quickly understand and work with the redesigned public-facing pages.

## Quick Links

### Key Files
- **Home Page**: `src/app/(public)/page.tsx`
- **Login Page**: `src/app/(public)/login/page.tsx`
- **Signup Page**: `src/app/(public)/signup/page.tsx`
- **Layout**: `src/app/(public)/layout.tsx`
- **Components**: `src/components/marketing/`

### Documentation
- **Full Details**: See `REDESIGN_NOTES.md`
- **Implementation**: See `IMPLEMENTATION_SUMMARY.md`

## Running the Project

```bash
# Install dependencies (if needed)
npm install

# Run development server
npm run dev

# Open browser
# Navigate to http://localhost:3000
```

## Component Usage

### Hero Section
```tsx
import { Hero } from '@/components/marketing';

<Hero
  headline="Your Headline"
  subheadline="Your subheadline"
  primaryCTA={{ text: "Get Started", href: "/signup" }}
  secondaryCTA={{ text: "Learn More", href: "#features" }}
/>
```

### Feature Cards
```tsx
import { FeatureCard } from '@/components/marketing';
import { Users } from 'lucide-react';

<FeatureCard
  icon={Users}
  title="Feature Title"
  description="Feature description"
/>
```

### Pricing Cards
```tsx
import { PricingCard } from '@/components/marketing';

<PricingCard
  tier="Professional"
  price={99}
  period="/month"
  description="For growing churches"
  features={['Feature 1', 'Feature 2']}
  isFeatured={true}
  ctaText="Start Free Trial"
  ctaHref="/signup"
/>
```

## Editing Content

### Update Home Page Content

Edit `src/app/(public)/page.tsx`:

```tsx
// Change headline
headline="Your New Headline"

// Update features
const features = [
  {
    icon: Users,
    title: 'Your Feature',
    description: 'Your description',
  },
  // Add more...
];

// Update testimonials
const testimonials = [
  {
    quote: 'Your quote',
    author: {
      name: 'Name',
      role: 'Role',
      church: 'Church Name',
    },
  },
];
```

### Update Pricing

Edit the `pricingTiers` array in `src/app/(public)/page.tsx`:

```tsx
const pricingTiers = [
  {
    tier: 'Starter',
    price: 0, // or 'Custom'
    period: '/month',
    description: 'Perfect for...',
    features: ['Feature 1', 'Feature 2'],
    ctaText: 'Start Free Trial',
    ctaHref: '/signup',
  },
];
```

### Update Navigation

Edit `src/app/(public)/layout.tsx`:

```tsx
// Add new nav item
<Link href="/your-page">Your Page</Link>

// Update footer links
<Link href="/your-link">Your Link</Link>
```

## Common Customizations

### Change Color Scheme

The design uses theme colors from `tailwind.config.ts`:
- **primary**: Main brand color (indigo)
- **accent**: Accent color (amber)
- **success**: Success states (emerald)

To change colors, modify the theme in your Tailwind config.

### Add New Section

1. Create component in `src/components/marketing/`
2. Export from `src/components/marketing/index.ts`
3. Import and use in page:

```tsx
import { YourComponent } from '@/components/marketing';

// In page
<YourComponent
  prop1="value1"
  prop2="value2"
/>
```

### Update SEO Metadata

Edit metadata in each page:

```tsx
export const metadata: Metadata = {
  title: 'Your Page Title',
  description: 'Your description',
  keywords: ['keyword1', 'keyword2'],
};
```

Or use the utility:

```tsx
import { generatePageMetadata } from '@/lib/metadata';

export const metadata = generatePageMetadata({
  title: 'Your Page',
  description: 'Description',
  keywords: ['keyword1'],
  path: '/your-page',
});
```

## Styling Guide

### Responsive Design

Use Tailwind's responsive prefixes:

```tsx
// Mobile first
<div className="text-sm md:text-base lg:text-lg">

// Grid layouts
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

### Animations

Components use framer-motion. Basic pattern:

```tsx
import { motion } from 'motion/react';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  Your content
</motion.div>
```

### Common Utilities

```tsx
// Glass effect
className="backdrop-blur-xl bg-white/10 border border-white/20"

// Gradient text
className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent"

// Card style
className="rounded-2xl border border-border/60 bg-card/50 p-8 shadow-lg"
```

## Troubleshooting

### Animations Not Working
- Ensure `motion` package is installed
- Check for syntax errors in motion components
- Verify imports: `import { motion } from 'motion/react'`

### Layout Issues
- Check responsive classes (sm:, md:, lg:)
- Verify flex/grid containers
- Inspect with browser dev tools

### SEO Not Updating
- Clear Next.js cache: `rm -rf .next`
- Rebuild: `npm run build`
- Check metadata exports

### Icons Not Showing
- Verify lucide-react import
- Check icon name (case-sensitive)
- Example: `import { Users } from 'lucide-react'`

## Adding New Pages

1. Create page file: `src/app/(public)/your-page/page.tsx`
2. Add metadata
3. Use marketing components
4. Add to navigation in `layout.tsx`

Example:

```tsx
import type { Metadata } from 'next';
import { Hero, CTASection } from '@/components/marketing';

export const metadata: Metadata = {
  title: 'Your Page | StewardTrack',
  description: 'Page description',
};

export default function YourPage() {
  return (
    <div>
      <Hero
        headline="Page Headline"
        subheadline="Page subheadline"
        primaryCTA={{ text: "CTA", href: "/signup" }}
      />

      <CTASection
        headline="Ready to start?"
        primaryCTA={{ text: "Get Started", href: "/signup" }}
      />
    </div>
  );
}
```

## Best Practices

### Content
- Keep headlines clear and benefit-focused
- Use church-specific language
- Include social proof (testimonials, stats)
- Add clear CTAs every 2-3 sections

### Design
- Maintain consistent spacing (use theme variables)
- Follow existing component patterns
- Test on mobile devices
- Ensure good color contrast

### Performance
- Optimize images (use Next.js Image component)
- Lazy load below-fold content
- Keep animations GPU-accelerated
- Monitor bundle size

### Accessibility
- Use semantic HTML
- Add ARIA labels to icon buttons
- Ensure keyboard navigation
- Test with screen readers
- Maintain color contrast

## Getting Help

### Resources
- **Components**: Check `src/components/marketing/` for examples
- **Patterns**: Review existing page implementations
- **Documentation**: See `REDESIGN_NOTES.md` for details

### Common Questions

**Q: How do I change the primary color?**
A: Modify `--color-primary` in your theme configuration.

**Q: Can I add my own components?**
A: Yes! Follow the pattern in `src/components/marketing/`.

**Q: How do I add a new FAQ?**
A: Add to the `faqItems` array in `src/app/(public)/page.tsx`.

**Q: Where do I add testimonials?**
A: Update the `testimonials` array in the home page.

**Q: How do I change the footer?**
A: Edit `src/app/(public)/layout.tsx` footer section.

## Quick Wins

### Easy Updates
1. **Change headline**: Edit home page headline prop
2. **Add FAQ**: Push new item to faqItems array
3. **Update stats**: Modify stats array
4. **Add testimonial**: Push to testimonials array
5. **Change CTA text**: Update primaryCTA/secondaryCTA text

### Testing Checklist
- [ ] Test on mobile device
- [ ] Check all links work
- [ ] Verify forms submit
- [ ] Test animations perform well
- [ ] Check accessibility with keyboard

## Next Steps

1. Replace placeholder content with real data
2. Add actual product screenshots
3. Include real testimonials
4. Set up analytics tracking
5. Test conversion funnel

---

**Need more help?** See `REDESIGN_NOTES.md` for comprehensive documentation.
