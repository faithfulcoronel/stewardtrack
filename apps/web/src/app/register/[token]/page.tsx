'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  Mail,
  Phone,
  Building2,
  ChevronDown,
  PartyPopper,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ============================================================================
// Types
// ============================================================================

interface ScheduleInfo {
  scheduleId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  capacity?: number | null;
  coverPhotoUrl?: string | null;
  ministryName: string;
  tenantName: string;
  formSchema?: FormField[] | null;
  timezone: string;
  registrationCount: number;
  waitlistCount: number;
  expiresAt: string;
  upcomingOccurrences: Array<{
    id: string;
    event_date: string;
    start_time: string;
    end_time: string | null;
    status: string;
  }>;
}

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  helpText?: string;
}

interface RegistrationResult {
  success: boolean;
  status: 'registered' | 'waitlisted';
  waitlistPosition?: number;
  confirmationCode?: string;
}

type PageState = 'loading' | 'form' | 'success' | 'expired' | 'error';

// ============================================================================
// Animation Variants
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

const heroVariants = {
  hidden: { opacity: 0, scale: 1.1 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

const formatDate = (dateString: string, timezone?: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone,
  });
};

const formatTime = (timeString: string | null | undefined, timezone?: string): string => {
  if (!timeString) return '';
  const date = timeString.includes('T')
    ? new Date(timeString)
    : new Date(`1970-01-01T${timeString}`);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  });
};

const fireConfetti = () => {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  const interval = window.setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#179a65', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0'],
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#179a65', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0'],
    });
  }, 250);
};

// ============================================================================
// Sub-Components
// ============================================================================

function RegistrationHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/landing_logo_with_name.svg"
            alt="StewardTrack"
            width={160}
            height={40}
            className="h-8 w-auto"
            priority
          />
        </Link>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Shield className="w-4 h-4 text-[#179a65]" />
          <span className="hidden sm:inline">Secure Registration</span>
        </div>
      </div>
    </header>
  );
}

function EventHero({
  title,
  ministryName,
  tenantName,
  coverPhotoUrl,
}: {
  title: string;
  ministryName: string;
  tenantName: string;
  coverPhotoUrl?: string | null;
}) {
  return (
    <motion.div
      variants={heroVariants}
      initial="hidden"
      animate="visible"
      className="relative w-full aspect-[21/9] rounded-2xl overflow-hidden shadow-xl shadow-[#179a65]/10"
    >
      {coverPhotoUrl ? (
        <Image
          src={coverPhotoUrl}
          alt={title}
          fill
          className="object-cover"
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#179a65] to-[#10B981]" />
      )}
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white font-heading mb-2 drop-shadow-lg">
          {title}
        </h1>
        <p className="text-white/90 text-sm sm:text-base flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          {ministryName} &bull; {tenantName}
        </p>
      </div>
    </motion.div>
  );
}

function EventInfoCard({
  scheduleInfo,
  selectedOccurrence,
}: {
  scheduleInfo: ScheduleInfo;
  selectedOccurrence: string;
}) {
  const occurrence = scheduleInfo.upcomingOccurrences.find(
    (o) => o.id === selectedOccurrence
  ) || scheduleInfo.upcomingOccurrences[0];

  const spotsLeft = scheduleInfo.capacity
    ? scheduleInfo.capacity - scheduleInfo.registrationCount
    : null;
  const isFull = scheduleInfo.capacity && scheduleInfo.registrationCount >= scheduleInfo.capacity;
  const percentFilled = scheduleInfo.capacity
    ? Math.min((scheduleInfo.registrationCount / scheduleInfo.capacity) * 100, 100)
    : 0;

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="relative backdrop-blur-xl bg-white/70 border border-white/50 rounded-2xl p-6 shadow-lg shadow-[#179a65]/5"
    >
      <div className="space-y-4">
        {/* Date & Time */}
        {occurrence && (
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#179a65] to-[#10B981] flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {formatDate(occurrence.event_date, scheduleInfo.timezone)}
              </p>
              <p className="text-sm text-gray-600">
                {formatTime(occurrence.start_time, scheduleInfo.timezone)}
                {occurrence.end_time &&
                  ` - ${formatTime(occurrence.end_time, scheduleInfo.timezone)}`}
              </p>
            </div>
          </div>
        )}

        {/* Location */}
        {scheduleInfo.location && (
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#179a65]/20 to-[#10B981]/20 flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6 text-[#179a65]" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Location</p>
              <p className="text-sm text-gray-600">{scheduleInfo.location}</p>
            </div>
          </div>
        )}

        {/* Capacity Progress */}
        {scheduleInfo.capacity && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>
                  <AnimatedCounter value={scheduleInfo.registrationCount} /> /{' '}
                  {scheduleInfo.capacity} registered
                </span>
              </div>
              {spotsLeft !== null && (
                <span
                  className={cn(
                    'text-sm font-medium px-2 py-0.5 rounded-full',
                    isFull
                      ? 'bg-amber-100 text-amber-700'
                      : spotsLeft <= 5
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-emerald-100 text-emerald-700'
                  )}
                >
                  {isFull ? 'Waitlist Open' : `${spotsLeft} spots left`}
                </span>
              )}
            </div>
            {/* Animated Progress Bar */}
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full',
                  isFull
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                    : 'bg-gradient-to-r from-[#179a65] to-[#10B981]'
                )}
                initial={{ width: 0 }}
                animate={{ width: `${percentFilled}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
              />
            </div>
            {scheduleInfo.waitlistCount > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {scheduleInfo.waitlistCount} on waitlist
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AnimatedCounter({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.5,
      ease: 'easeOut',
    });
    return controls.stop;
  }, [value, motionValue]);

  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => setDisplayValue(v));
    return unsubscribe;
  }, [rounded]);

  return <span>{displayValue}</span>;
}

function ProgressDots({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: totalSteps }, (_, i) => (
        <motion.div
          key={i}
          className={cn(
            'w-2 h-2 rounded-full transition-colors duration-300',
            i <= currentStep
              ? 'bg-gradient-to-r from-[#179a65] to-[#10B981]'
              : 'bg-gray-200'
          )}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.1, duration: 0.3 }}
        />
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] via-white to-[#ecfdf5]">
      <RegistrationHeader />
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="backdrop-blur-xl bg-white/70 rounded-2xl p-8 shadow-lg text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-[#179a65]/20 border-t-[#179a65]"
          />
          <p className="text-gray-600 font-medium">Loading event details...</p>
        </motion.div>
      </div>
    </div>
  );
}

function ExpiredState() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] via-white to-[#ecfdf5]">
      <RegistrationHeader />
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-xl bg-white/70 rounded-2xl p-8 shadow-lg text-center max-w-md"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 font-heading mb-2">Link Expired</h2>
          <p className="text-gray-600">
            This registration link has expired. Please request a new link from the event
            organizer.
          </p>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] via-white to-[#ecfdf5]">
      <RegistrationHeader />
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-xl bg-white/70 rounded-2xl p-8 shadow-lg text-center max-w-md"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 font-heading mb-2">
            Unable to Load Event
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button
            onClick={onRetry}
            className="bg-gradient-to-r from-[#179a65] to-[#10B981] hover:from-[#148a5a] hover:to-[#0fa076] text-white"
          >
            Try Again
          </Button>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}

function SuccessState({
  result,
  scheduleInfo,
}: {
  result: RegistrationResult;
  scheduleInfo: ScheduleInfo;
}) {
  useEffect(() => {
    if (result.status === 'registered') {
      fireConfetti();
    }
  }, [result.status]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] via-white to-[#ecfdf5]">
      <RegistrationHeader />
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="backdrop-blur-xl bg-white/70 rounded-2xl p-8 shadow-xl shadow-[#179a65]/10 text-center max-w-md w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className={cn(
              'w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center',
              result.status === 'registered'
                ? 'bg-gradient-to-br from-[#179a65] to-[#10B981]'
                : 'bg-gradient-to-br from-amber-400 to-amber-500'
            )}
          >
            {result.status === 'registered' ? (
              <PartyPopper className="w-12 h-12 text-white" />
            ) : (
              <Clock className="w-12 h-12 text-white" />
            )}
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl sm:text-3xl font-bold text-gray-900 font-heading mb-2"
          >
            {result.status === 'registered' ? 'You\'re In!' : 'Added to Waitlist'}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-gray-600 mb-6"
          >
            {result.status === 'registered'
              ? 'We look forward to seeing you there!'
              : result.waitlistPosition
                ? `You're #${result.waitlistPosition} on the waitlist. We'll notify you if a spot opens up.`
                : "We'll notify you if a spot opens up."}
          </motion.p>

          {result.confirmationCode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gray-50 rounded-xl p-4 mb-6"
            >
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                Confirmation Code
              </p>
              <p className="text-3xl font-mono font-bold tracking-wider text-[#179a65]">
                {result.confirmationCode}
              </p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="border-t border-gray-200 pt-6 text-left space-y-3"
          >
            <h3 className="font-semibold text-gray-900">{scheduleInfo.title}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building2 className="w-4 h-4" />
              {scheduleInfo.tenantName}
            </div>
            {scheduleInfo.location && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                {scheduleInfo.location}
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="py-8 text-center">
      <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
        <span>Powered by</span>
        <Image
          src="/landing_logo_with_name.svg"
          alt="StewardTrack"
          width={100}
          height={24}
          className="h-5 w-auto opacity-50"
        />
      </div>
    </footer>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function PublicRegistrationPage() {
  const params = useParams();
  const token = params.token as string;
  const { toast } = useToast();

  const [state, setState] = useState<PageState>('loading');
  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<RegistrationResult | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState('1');
  const [specialRequests, setSpecialRequests] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, string | boolean>>({});
  const [selectedOccurrence, setSelectedOccurrence] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // Turnstile ref
  const turnstileRef = useRef<TurnstileInstance>(null);

  // Calculate form step for progress dots
  const formStep = name && email ? (termsAccepted ? 3 : 2) : name || email ? 1 : 0;

  // Fetch schedule info
  const fetchScheduleInfo = useCallback(async () => {
    try {
      const response = await fetch(`/api/register/${token}`);
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 400 && result.error?.includes('expired')) {
          setState('expired');
        } else {
          setError(result.error || 'Failed to load event');
          setState('error');
        }
        return;
      }

      setScheduleInfo(result.data);

      // Initialize custom fields
      if (result.data.formSchema) {
        const initial: Record<string, string | boolean> = {};
        result.data.formSchema.forEach((field: FormField) => {
          initial[field.id] = field.type === 'checkbox' ? false : '';
        });
        setCustomFields(initial);
      }

      // Select first occurrence by default
      if (result.data.upcomingOccurrences?.length > 0) {
        setSelectedOccurrence(result.data.upcomingOccurrences[0].id);
      }

      setState('form');
    } catch (err) {
      console.error('Error fetching schedule:', err);
      setError('Failed to load event details');
      setState('error');
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchScheduleInfo();
    }
  }, [token, fetchScheduleInfo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!name.trim() || !email.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter your name and email address.',
        variant: 'destructive',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    // Validate terms acceptance
    if (!termsAccepted) {
      toast({
        title: 'Terms Required',
        description: 'Please accept the Terms of Service and Privacy Policy.',
        variant: 'destructive',
      });
      return;
    }

    // Validate CAPTCHA
    if (!turnstileToken) {
      toast({
        title: 'Security Check Required',
        description: 'Please complete the security verification.',
        variant: 'destructive',
      });
      return;
    }

    // Validate required custom fields
    if (scheduleInfo?.formSchema) {
      for (const field of scheduleInfo.formSchema) {
        if (field.required) {
          const value = customFields[field.id];
          if (field.type === 'checkbox') {
            if (value !== true) {
              toast({
                title: 'Missing Information',
                description: `${field.label} is required.`,
                variant: 'destructive',
              });
              return;
            }
          } else if (!value || (typeof value === 'string' && !value.trim())) {
            toast({
              title: 'Missing Information',
              description: `${field.label} is required.`,
              variant: 'destructive',
            });
            return;
          }
        }
      }
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/register/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: name.trim(),
          guest_email: email.trim(),
          guest_phone: phone.trim() || null,
          party_size: parseInt(partySize),
          special_requests: specialRequests.trim() || null,
          form_responses: Object.keys(customFields).length > 0 ? customFields : null,
          occurrence_id: selectedOccurrence || undefined,
          turnstile_token: turnstileToken,
          terms_accepted: termsAccepted,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Reset CAPTCHA on error
        turnstileRef.current?.reset();
        setTurnstileToken(null);
        throw new Error(result.error || 'Registration failed');
      }

      setRegistrationResult({
        success: true,
        status: result.data.status,
        waitlistPosition: result.data.waitlist_position,
        confirmationCode: result.data.confirmation_code,
      });

      setState('success');
    } catch (err) {
      console.error('Registration error:', err);
      toast({
        title: 'Registration Failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCustomField = (field: FormField) => {
    const value = customFields[field.id];
    const onChange = (newValue: string | boolean) => {
      setCustomFields((prev) => ({ ...prev, [field.id]: newValue }));
    };

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="min-h-[100px] bg-white/50 border-gray-200 focus:border-[#179a65] focus:ring-[#179a65]/20"
          />
        );

      case 'select':
        return (
          <Select value={(value as string) || ''} onValueChange={(v) => onChange(v)}>
            <SelectTrigger className="h-12 bg-white/50 border-gray-200 focus:border-[#179a65] focus:ring-[#179a65]/20">
              <SelectValue placeholder={field.placeholder || 'Select...'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-3">
            <Checkbox
              id={field.id}
              checked={(value as boolean) || false}
              onCheckedChange={(checked) => onChange(checked === true)}
              className="data-[state=checked]:bg-[#179a65] data-[state=checked]:border-[#179a65]"
            />
            <Label htmlFor={field.id} className="text-sm font-normal cursor-pointer text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
          </div>
        );

      default:
        return (
          <Input
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="h-12 bg-white/50 border-gray-200 focus:border-[#179a65] focus:ring-[#179a65]/20"
          />
        );
    }
  };

  // Loading state
  if (state === 'loading') {
    return <LoadingState />;
  }

  // Expired state
  if (state === 'expired') {
    return <ExpiredState />;
  }

  // Error state
  if (state === 'error') {
    return <ErrorState error={error || 'An error occurred'} onRetry={() => window.location.reload()} />;
  }

  // Success state
  if (state === 'success' && registrationResult && scheduleInfo) {
    return <SuccessState result={registrationResult} scheduleInfo={scheduleInfo} />;
  }

  // Form state
  if (!scheduleInfo) return null;

  const isFull =
    scheduleInfo.capacity && scheduleInfo.registrationCount >= scheduleInfo.capacity;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] via-white to-[#ecfdf5]">
      <RegistrationHeader />

      <main className="max-w-2xl mx-auto px-4 py-8 pb-24">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Hero */}
          <EventHero
            title={scheduleInfo.title}
            ministryName={scheduleInfo.ministryName}
            tenantName={scheduleInfo.tenantName}
            coverPhotoUrl={scheduleInfo.coverPhotoUrl}
          />

          {/* Description */}
          {scheduleInfo.description && (
            <motion.p variants={itemVariants} className="text-gray-600 text-center">
              {scheduleInfo.description}
            </motion.p>
          )}

          {/* Event Info Card */}
          <EventInfoCard
            scheduleInfo={scheduleInfo}
            selectedOccurrence={selectedOccurrence}
          />

          {/* No upcoming events */}
          {scheduleInfo.upcomingOccurrences.length === 0 ? (
            <motion.div
              variants={cardVariants}
              className="backdrop-blur-xl bg-white/70 rounded-2xl p-6 text-center"
            >
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">No Upcoming Events</h3>
              <p className="text-gray-600">
                There are currently no upcoming events scheduled. Please check back later.
              </p>
            </motion.div>
          ) : (
            /* Registration Form */
            <motion.div
              variants={cardVariants}
              className="backdrop-blur-xl bg-white/70 border border-white/50 rounded-2xl p-6 sm:p-8 shadow-lg shadow-[#179a65]/5"
            >
              <div className="text-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 font-heading mb-2">
                  {isFull ? 'Join the Waitlist' : 'Register for this Event'}
                </h2>
                <p className="text-gray-600 text-sm">
                  {isFull
                    ? "The event is full, but you can join the waitlist."
                    : 'Fill out the form below to secure your spot.'}
                </p>
              </div>

              <ProgressDots currentStep={formStep} totalSteps={4} />

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Select Event Date */}
                {scheduleInfo.upcomingOccurrences.length > 1 && (
                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label className="text-gray-700">
                      Select Date <span className="text-red-500">*</span>
                    </Label>
                    <Select value={selectedOccurrence} onValueChange={setSelectedOccurrence}>
                      <SelectTrigger className="h-12 bg-white/50 border-gray-200 focus:border-[#179a65]">
                        <SelectValue placeholder="Select an event date" />
                      </SelectTrigger>
                      <SelectContent>
                        {scheduleInfo.upcomingOccurrences.map((occ) => (
                          <SelectItem key={occ.id} value={occ.id}>
                            <span className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {formatDate(occ.event_date, scheduleInfo.timezone)} at{' '}
                              {formatTime(occ.start_time, scheduleInfo.timezone)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}

                {/* Contact Info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="name" className="text-gray-700">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="h-12 pl-12 bg-white/50 border-gray-200 focus:border-[#179a65] focus:ring-[#179a65]/20 text-base"
                        required
                      />
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="h-12 pl-12 bg-white/50 border-gray-200 focus:border-[#179a65] focus:ring-[#179a65]/20 text-base"
                        required
                      />
                    </div>
                  </motion.div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-700">
                      Phone <span className="text-gray-400 text-sm">(optional)</span>
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        className="h-12 pl-12 bg-white/50 border-gray-200 focus:border-[#179a65] focus:ring-[#179a65]/20 text-base"
                      />
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="partySize" className="text-gray-700">
                      Party Size
                    </Label>
                    <Select value={partySize} onValueChange={setPartySize}>
                      <SelectTrigger className="h-12 bg-white/50 border-gray-200 focus:border-[#179a65]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} {num === 1 ? 'person' : 'people'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                </div>

                {/* Custom Fields */}
                {scheduleInfo.formSchema && scheduleInfo.formSchema.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <div className="h-px bg-gray-200" />
                    {scheduleInfo.formSchema.map((field) => (
                      <motion.div key={field.id} variants={itemVariants} className="space-y-2">
                        {field.type !== 'checkbox' && (
                          <Label htmlFor={field.id} className="text-gray-700">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                        )}
                        {renderCustomField(field)}
                        {field.helpText && (
                          <p className="text-xs text-gray-500">{field.helpText}</p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Special Requests */}
                <motion.div variants={itemVariants} className="space-y-2">
                  <Label htmlFor="specialRequests" className="text-gray-700">
                    Special Requests <span className="text-gray-400 text-sm">(optional)</span>
                  </Label>
                  <Textarea
                    id="specialRequests"
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Any dietary restrictions, accessibility needs, etc."
                    rows={3}
                    className="bg-white/50 border-gray-200 focus:border-[#179a65] focus:ring-[#179a65]/20 text-base"
                  />
                </motion.div>

                {/* Terms & Privacy */}
                <motion.div variants={itemVariants} className="pt-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                      className="mt-1 data-[state=checked]:bg-[#179a65] data-[state=checked]:border-[#179a65]"
                    />
                    <Label
                      htmlFor="terms"
                      className="text-sm text-gray-600 cursor-pointer leading-relaxed"
                    >
                      I agree to the{' '}
                      <Link
                        href="/terms"
                        target="_blank"
                        className="text-[#179a65] hover:underline font-medium"
                      >
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link
                        href="/privacy"
                        target="_blank"
                        className="text-[#179a65] hover:underline font-medium"
                      >
                        Privacy Policy
                      </Link>
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                  </div>
                </motion.div>

                {/* Turnstile CAPTCHA */}
                <motion.div variants={itemVariants} className="flex justify-center pt-2">
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                    onSuccess={setTurnstileToken}
                    onError={() => setTurnstileToken(null)}
                    onExpire={() => setTurnstileToken(null)}
                    options={{
                      theme: 'light',
                      size: 'normal',
                    }}
                  />
                </motion.div>

                {/* Submit Button */}
                <motion.div variants={itemVariants}>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !turnstileToken || !termsAccepted}
                    className={cn(
                      'w-full h-14 text-lg font-semibold rounded-xl shadow-lg transition-all duration-300',
                      'bg-gradient-to-r from-[#179a65] to-[#10B981]',
                      'hover:from-[#148a5a] hover:to-[#0fa076]',
                      'hover:shadow-xl hover:shadow-[#179a65]/25',
                      'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
                    )}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </span>
                    ) : isFull ? (
                      'Join Waitlist'
                    ) : (
                      'Register Now'
                    )}
                  </Button>
                </motion.div>
              </form>
            </motion.div>
          )}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
