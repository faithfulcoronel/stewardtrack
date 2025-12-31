import type { Metadata } from 'next';

import {
  Hero,
  FeatureCard,
  TestimonialCard,
  PricingCard,
  StatsSection,
  CTASection,
  FAQ,
  TrustBadges,
  HowItWorks,
} from '@/components/marketing';

export const metadata: Metadata = {
  title: 'StewardTrack - Modern Church Management System',
  description:
    'Simplify church management with StewardTrack. All-in-one platform for member management, events, giving, and communications. Trusted by 500+ churches.',
  keywords: [
    'church management software',
    'church management system',
    'church database',
    'church member management',
    'church giving software',
    'church event planning',
    'ministry management',
    'church communication',
  ],
  openGraph: {
    title: 'StewardTrack - Modern Church Management System',
    description:
      'Simplify church management with StewardTrack. All-in-one platform for member management, events, giving, and communications.',
    type: 'website',
    siteName: 'StewardTrack',
  },
};

export default function Home() {
  // Features data
  const features = [
    {
      icon: 'Users' as const,
      title: 'Member Management',
      description:
        'Track attendance, contact info, family relationships, and member engagement. Keep your congregation connected and organized.',
    },
    {
      icon: 'DollarSign' as const,
      title: 'Giving & Finance',
      description:
        'Online giving, donation tracking, financial reports, and pledge management. Simplify stewardship and transparency.',
    },
    {
      icon: 'Calendar' as const,
      title: 'Events & Calendar',
      description:
        'Schedule services, events, ministry activities, and room bookings. Keep everyone informed and engaged.',
    },
    {
      icon: 'MessageSquare' as const,
      title: 'Communication Tools',
      description:
        'Send email, SMS, and push notifications to members. Segment groups for targeted messaging.',
    },
    {
      icon: 'BarChart3' as const,
      title: 'Reporting & Analytics',
      description:
        'Gain insights into church growth, attendance trends, giving patterns, and ministry effectiveness.',
    },
    {
      icon: 'Smartphone' as const,
      title: 'Mobile Access',
      description:
        'Manage your church on the go with our mobile-optimized interface. Access everything from any device.',
    },
  ];

  // Statistics
  const stats = [
    { value: '500', suffix: '+', label: 'Churches Served' },
    { value: '10', suffix: 'hrs', label: 'Saved Per Week' },
    { value: '99.9', suffix: '%', label: 'Uptime' },
    { value: '24/7', label: 'Support Available' },
  ];

  // How it works steps
  const steps = [
    {
      number: 1,
      icon: 'UserPlus' as const,
      title: 'Sign Up',
      description:
        'Create your account in minutes. Choose the plan that fits your church size and needs. No credit card required for trial.',
    },
    {
      number: 2,
      icon: 'Settings' as const,
      title: 'Set Up Your Church',
      description:
        'Import your existing member data, configure your ministries, and customize settings. Our onboarding wizard makes it easy.',
    },
    {
      number: 3,
      icon: 'CheckCircle2' as const,
      title: 'Start Managing',
      description:
        'Begin managing members, events, giving, and communications from one unified platform. Your team will love the simplicity.',
    },
  ];

  // Testimonials
  const testimonials = [
    {
      quote:
        'StewardTrack has transformed how we manage our church. What used to take hours now takes minutes. Our staff can focus on ministry instead of administration.',
      author: {
        name: 'Pastor Michael Johnson',
        role: 'Senior Pastor',
        church: 'Grace Community Church',
      },
    },
    {
      quote:
        'The member management and communication tools are incredible. We can now reach our entire congregation instantly and track engagement like never before.',
      author: {
        name: 'Sarah Martinez',
        role: 'Church Administrator',
        church: 'First Baptist Church',
      },
    },
    {
      quote:
        'Online giving has increased by 40% since we started using StewardTrack. The system is intuitive for our members and easy for us to manage.',
      author: {
        name: 'David Thompson',
        role: 'Finance Director',
        church: 'New Hope Fellowship',
      },
    },
  ];

  // Pricing tiers
  const pricingTiers = [
    {
      tier: 'Starter',
      price: 0,
      period: '/month',
      description: 'Perfect for small churches getting started',
      features: [
        'Up to 100 members',
        'Basic member management',
        'Event calendar',
        'Email communication',
        'Mobile access',
        'Community support',
      ],
      ctaText: 'Start Free Trial',
      ctaHref: '/signup',
    },
    {
      tier: 'Professional',
      price: 99,
      period: '/month',
      description: 'For growing churches with advanced needs',
      features: [
        'Up to 500 members',
        'Advanced member management',
        'Online giving & donations',
        'SMS & email communication',
        'Custom reports & analytics',
        'Ministry & volunteer management',
        'Priority support',
        'Custom branding',
      ],
      isFeatured: true,
      ctaText: 'Start Free Trial',
      ctaHref: '/signup',
    },
    {
      tier: 'Enterprise',
      price: 'Custom',
      description: 'For large churches and multi-campus organizations',
      features: [
        'Unlimited members',
        'Multi-campus support',
        'Advanced security & permissions',
        'Custom integrations',
        'Dedicated account manager',
        'White-label options',
        'Custom training',
        'SLA guarantee',
      ],
      ctaText: 'Contact Sales',
      ctaHref: '/contact',
    },
  ];

  // FAQ items
  const faqItems = [
    {
      question: 'How long does it take to get started?',
      answer:
        'Most churches are up and running within a day. Our onboarding wizard guides you through importing member data, setting up ministries, and configuring your preferences. We also offer personalized onboarding assistance for all plans.',
    },
    {
      question: 'Can I import my existing member data?',
      answer:
        'Yes! StewardTrack supports importing from Excel, CSV, and most popular church management systems. Our team can help migrate your data to ensure a smooth transition.',
    },
    {
      question: 'Is my church data secure?',
      answer:
        'Absolutely. We use bank-level 256-bit encryption, regular security audits, and comply with GDPR and SOC 2 standards. Your data is backed up daily and stored in secure, redundant data centers.',
    },
    {
      question: 'Do you offer training for our staff?',
      answer:
        'Yes! All plans include access to our comprehensive video tutorials and knowledge base. Professional and Enterprise plans also include live training sessions for your team.',
    },
    {
      question: 'Can members access their own information?',
      answer:
        'Yes! Members can have their own login to update contact information, view giving history, register for events, and access church resources through our member portal.',
    },
    {
      question: 'What happens if I need to cancel?',
      answer:
        'You can cancel anytime with no penalties. We offer a 30-day money-back guarantee, and you can export all your data before canceling. We believe in earning your business every month.',
    },
    {
      question: 'Do you support multiple campuses?',
      answer:
        'Yes! Our Enterprise plan includes multi-campus support with centralized reporting and campus-specific management. Perfect for churches with multiple locations.',
    },
    {
      question: 'Is there a mobile app?',
      answer:
        'StewardTrack is fully responsive and optimized for mobile devices. You can access all features from your smartphone or tablet browser. Native iOS and Android apps are coming soon.',
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <Hero
        badge={{
          icon: <span className="size-2 rounded-full bg-primary" />,
          text: 'Trusted by 500+ Churches',
        }}
        headline="Simplify Church Management, Amplify Ministry Impact"
        subheadline="All-in-one platform to manage members, events, giving, and communications. Spend less time on administration, more time on ministry."
        primaryCTA={{
          text: 'Start Free Trial',
          href: '/signup',
        }}
        secondaryCTA={{
          text: 'See How It Works',
          href: '#how-it-works',
        }}
        trustIndicator="No credit card required • 14-day free trial • Setup in minutes"
      />

      {/* Stats Section */}
      <StatsSection stats={stats} />

      {/* Features Section */}
      <section id="features" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Everything You Need to Manage Your Church
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Powerful features designed specifically for churches and ministries
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <HowItWorks
        headline="Get Started in Three Simple Steps"
        description="Go from signup to managing your church in less than a day"
        steps={steps}
      />

      {/* Pricing Section */}
      <section id="pricing" className="bg-muted/30 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Choose the plan that fits your church. All plans include a 14-day free trial.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {pricingTiers.map((tier, index) => (
              <PricingCard key={index} {...tier} index={index} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <TrustBadges />
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              What Churches Are Saying
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join hundreds of churches already using StewardTrack
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard key={index} {...testimonial} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQ items={faqItems} />

      {/* Final CTA Section */}
      <CTASection
        headline="Ready to Simplify Your Church Management?"
        description="Join 500+ churches already saving time and growing their impact"
        primaryCTA={{
          text: 'Start Your Free Trial',
          href: '/signup',
        }}
        secondaryCTA={{
          text: 'Schedule a Demo',
          href: '/contact',
        }}
        variant="gradient"
      />
    </div>
  );
}
