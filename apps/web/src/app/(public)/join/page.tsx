'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  Mail,
  Lock,
  Shield,
  LogIn,
  Church,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Turnstile } from '@marsidev/react-turnstile';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

// ============================================================================
// Types
// ============================================================================

interface InvitationDetails {
  id: string;
  member_id: string;
  email: string;
  status: string;
  invited_at: string;
  expires_at: string;
  assigned_role_id?: string;
  member?: {
    first_name?: string;
    last_name?: string;
  };
  tenant?: {
    name: string;
    logo_url?: string;
    cover_url?: string;
  };
  assigned_role?: {
    id: string;
    name: string;
    description?: string;
  };
}

interface AuthenticatedUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

// ============================================================================
// Invitation Acceptance Page Content
// ============================================================================

function InvitationAcceptanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Signup form state
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupData, setSignupData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  });
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvitationAndAuth() {
      if (!token) {
        setError('No invitation token provided');
        setIsLoading(false);
        return;
      }

      const supabase = createSupabaseBrowserClient();

      try {
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setAuthenticatedUser({
            id: user.id,
            email: user.email || '',
            firstName: user.user_metadata?.first_name,
            lastName: user.user_metadata?.last_name,
          });
        }

        // Fetch invitation details
        const response = await fetch(`/api/member-invitations/accept?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Invalid invitation');
          setIsLoading(false);
          return;
        }

        setInvitation(data.invitation);
      } catch (err) {
        console.error('Error loading invitation:', err);
        setError('Failed to load invitation details');
      } finally {
        setIsLoading(false);
      }
    }

    loadInvitationAndAuth();
  }, [token]);

  // Accept invitation (for authenticated users)
  const handleAcceptInvitation = async () => {
    if (!token || !authenticatedUser) return;

    setIsAccepting(true);

    try {
      const response = await fetch('/api/member-invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      setIsSuccess(true);
      toast.success('Invitation accepted successfully!');

      // Redirect to admin after a short delay
      setTimeout(() => {
        router.push('/admin');
      }, 2000);
    } catch (err) {
      console.error('Error accepting invitation:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  // Signup and accept invitation
  const handleSignupAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const errors: Record<string, string> = {};

    if (!signupData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!signupData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    if (!signupData.password) {
      errors.password = 'Password is required';
    } else if (signupData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (signupData.password !== signupData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (!turnstileToken) {
      errors.turnstile = 'Please complete the security check';
    }

    if (Object.keys(errors).length > 0) {
      setSignupErrors(errors);
      return;
    }

    setIsSigningUp(true);

    try {
      const supabase = createSupabaseBrowserClient();

      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation?.email || '',
        password: signupData.password,
        options: {
          data: {
            first_name: signupData.firstName,
            last_name: signupData.lastName,
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Failed to create account');
      }

      // Update authenticated user state
      setAuthenticatedUser({
        id: authData.user.id,
        email: authData.user.email || '',
        firstName: signupData.firstName,
        lastName: signupData.lastName,
      });

      toast.success('Account created! Accepting invitation...');

      // Now accept the invitation
      const acceptResponse = await fetch('/api/member-invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const acceptData = await acceptResponse.json();

      if (!acceptResponse.ok) {
        throw new Error(acceptData.error || 'Failed to accept invitation');
      }

      setIsSuccess(true);
      toast.success('Welcome! Redirecting to dashboard...');

      // Redirect to admin
      setTimeout(() => {
        router.push('/admin');
      }, 2000);
    } catch (err) {
      console.error('Error signing up:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsSigningUp(false);
    }
  };

  const tenantName = invitation?.tenant?.name || 'the organization';

  // Validate logo URL - must be a non-empty string starting with https://
  const rawLogoUrl = invitation?.tenant?.logo_url;
  const tenantLogo = rawLogoUrl && rawLogoUrl.startsWith('https://') ? rawLogoUrl : null;

  // Validate cover URL similarly
  const rawCoverUrl = invitation?.tenant?.cover_url;
  const tenantCover = rawCoverUrl && rawCoverUrl.startsWith('https://') ? rawCoverUrl : null;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="h-8 w-8 text-white" />
          </motion.div>
          <p className="text-white/70 text-sm">Loading your invitation...</p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="rounded-full bg-red-100 p-3 w-fit mx-auto mb-4"
          >
            <AlertCircle className="h-8 w-8 text-red-600" />
          </motion.div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Invitation</h1>
          <p className="text-gray-600 text-sm mb-6">{error}</p>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/">Go to Homepage</Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full text-center overflow-hidden relative"
        >
          {/* Confetti animation */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: -20, x: Math.random() * 300 - 150 }}
                animate={{
                  opacity: [0, 1, 0],
                  y: [0, 250],
                  rotate: Math.random() * 360,
                }}
                transition={{
                  duration: 2,
                  delay: Math.random() * 0.5,
                  repeat: Infinity,
                  repeatDelay: Math.random() * 2,
                }}
                className={`absolute w-2 h-2 rounded-full ${
                  ['bg-emerald-400', 'bg-yellow-400', 'bg-teal-400', 'bg-green-300'][i % 4]
                }`}
              />
            ))}
          </div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="rounded-full bg-green-100 p-3 w-fit mx-auto mb-4 relative z-10"
          >
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </motion.div>
          <h1 className="text-xl font-bold text-gray-900 mb-2 relative z-10">
            Welcome to {tenantName}!
          </h1>
          <p className="text-gray-600 text-sm mb-4 relative z-10">
            Your invitation has been accepted. Redirecting to your dashboard...
          </p>
          <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto relative z-10" />
        </motion.div>
      </div>
    );
  }

  // Main content - Mobile first design with animations
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 relative overflow-hidden">
      {/* Background cover photo (if available) */}
      {tenantCover && (
        <div className="absolute inset-0 z-0">
          <Image
            src={tenantCover}
            alt=""
            fill
            className="object-cover opacity-20"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/80 via-emerald-800/90 to-teal-900" />
        </div>
      )}

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-20 left-1/4 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute bottom-20 right-1/4 w-80 h-80 bg-teal-400/15 rounded-full blur-3xl"
        />
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center px-4 py-8 pt-24 sm:pt-28">
        {/* Church Logo or Icon */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4"
        >
          {tenantLogo ? (
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-white shadow-xl ring-4 ring-white/20">
              <Image
                src={tenantLogo}
                alt={`${tenantName} logo`}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-xl"
            >
              <Church className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            </motion.div>
          )}
        </motion.div>

        {/* Church Name */}
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="text-xl sm:text-2xl md:text-3xl font-bold text-white text-center mb-6 px-2"
        >
          {tenantName}
        </motion.h1>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5, type: 'spring', stiffness: 100 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Invitation Details Header */}
            <div className="bg-gray-50 p-4 sm:p-6 border-b border-gray-100">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
                className="flex items-center gap-3"
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">Join as team member</p>
                  <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                    {invitation?.email}
                  </p>
                </div>
              </motion.div>

              {invitation?.assigned_role && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 }}
                  className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200"
                >
                  <Shield className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 text-sm">
                        {invitation.assigned_role.name}
                      </span>
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                        Auto-assigned
                      </Badge>
                    </div>
                    {invitation.assigned_role.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {invitation.assigned_role.description}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Action Area */}
            <AnimatePresence mode="wait">
              {authenticatedUser ? (
                // Authenticated user - just accept
                <motion.div
                  key="authenticated"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4 sm:p-6"
                >
                  <div className="text-center mb-4">
                    <p className="text-gray-600 text-sm">
                      Signed in as <strong className="text-gray-900">{authenticatedUser.email}</strong>
                    </p>
                  </div>

                  {authenticatedUser.email.toLowerCase() === invitation?.email.toLowerCase() ? (
                    <motion.div whileTap={{ scale: 0.98 }}>
                      <Button
                        onClick={handleAcceptInvitation}
                        disabled={isAccepting}
                        className="w-full h-11 sm:h-12 text-sm sm:text-base font-medium"
                        size="lg"
                      >
                        {isAccepting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                            Accepting...
                          </>
                        ) : (
                          <>
                            Accept Invitation
                            <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                          </>
                        )}
                      </Button>
                    </motion.div>
                  ) : (
                    <div>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl bg-amber-50 border border-amber-200 p-3 sm:p-4 mb-4"
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs sm:text-sm text-amber-800 font-medium">Email mismatch</p>
                            <p className="text-xs sm:text-sm text-amber-700 mt-1">
                              This invitation was sent to <strong>{invitation?.email}</strong>.
                            </p>
                          </div>
                        </div>
                      </motion.div>
                      <Button
                        variant="outline"
                        className="w-full h-11"
                        onClick={async () => {
                          const supabase = createSupabaseBrowserClient();
                          await supabase.auth.signOut();
                          setAuthenticatedUser(null);
                        }}
                      >
                        <LogIn className="mr-2 h-4 w-4" />
                        Sign Out & Use Correct Account
                      </Button>
                    </div>
                  )}
                </motion.div>
              ) : (
                // Not authenticated - signup form
                <motion.form
                  key="signup"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSignupAndAccept}
                  className="p-4 sm:p-6 space-y-4"
                >
                  <p className="text-center text-gray-600 text-sm">
                    Create your account to join {tenantName}
                  </p>

                  {/* Email (read-only) */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-1.5"
                  >
                    <label className="text-xs sm:text-sm font-medium text-gray-700">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={invitation?.email || ''}
                        disabled
                        className="bg-gray-50 pl-10 h-10 sm:h-11 text-sm"
                      />
                    </div>
                  </motion.div>

                  {/* Name fields */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="grid grid-cols-2 gap-3"
                  >
                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-medium text-gray-700">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={signupData.firstName}
                        onChange={(e) => {
                          setSignupData({ ...signupData, firstName: e.target.value });
                          if (signupErrors.firstName) {
                            setSignupErrors({ ...signupErrors, firstName: '' });
                          }
                        }}
                        placeholder="John"
                        disabled={isSigningUp}
                        className={`h-10 sm:h-11 text-sm ${signupErrors.firstName ? 'border-red-500' : ''}`}
                      />
                      {signupErrors.firstName && (
                        <p className="text-xs text-red-500">{signupErrors.firstName}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-medium text-gray-700">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={signupData.lastName}
                        onChange={(e) => {
                          setSignupData({ ...signupData, lastName: e.target.value });
                          if (signupErrors.lastName) {
                            setSignupErrors({ ...signupErrors, lastName: '' });
                          }
                        }}
                        placeholder="Doe"
                        disabled={isSigningUp}
                        className={`h-10 sm:h-11 text-sm ${signupErrors.lastName ? 'border-red-500' : ''}`}
                      />
                      {signupErrors.lastName && (
                        <p className="text-xs text-red-500">{signupErrors.lastName}</p>
                      )}
                    </div>
                  </motion.div>

                  {/* Password fields */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-1.5"
                  >
                    <label className="text-xs sm:text-sm font-medium text-gray-700">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        value={signupData.password}
                        onChange={(e) => {
                          setSignupData({ ...signupData, password: e.target.value });
                          if (signupErrors.password) {
                            setSignupErrors({ ...signupErrors, password: '' });
                          }
                        }}
                        placeholder="Minimum 8 characters"
                        disabled={isSigningUp}
                        className={`pl-10 h-10 sm:h-11 text-sm ${signupErrors.password ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {signupErrors.password && (
                      <p className="text-xs text-red-500">{signupErrors.password}</p>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="space-y-1.5"
                  >
                    <label className="text-xs sm:text-sm font-medium text-gray-700">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        value={signupData.confirmPassword}
                        onChange={(e) => {
                          setSignupData({ ...signupData, confirmPassword: e.target.value });
                          if (signupErrors.confirmPassword) {
                            setSignupErrors({ ...signupErrors, confirmPassword: '' });
                          }
                        }}
                        placeholder="Re-enter password"
                        disabled={isSigningUp}
                        className={`pl-10 h-10 sm:h-11 text-sm ${signupErrors.confirmPassword ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {signupErrors.confirmPassword && (
                      <p className="text-xs text-red-500">{signupErrors.confirmPassword}</p>
                    )}
                  </motion.div>

                  {/* Turnstile */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex justify-center py-2"
                  >
                    <Turnstile
                      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
                      onSuccess={(token) => {
                        setTurnstileToken(token);
                        if (signupErrors.turnstile) {
                          setSignupErrors({ ...signupErrors, turnstile: '' });
                        }
                      }}
                      onError={() => {
                        setTurnstileToken(null);
                        setSignupErrors({
                          ...signupErrors,
                          turnstile: 'Security check failed. Please try again.',
                        });
                      }}
                      onExpire={() => {
                        setTurnstileToken(null);
                      }}
                      options={{
                        theme: 'light',
                        size: 'normal',
                      }}
                    />
                  </motion.div>
                  {signupErrors.turnstile && (
                    <p className="text-xs text-red-500 text-center">{signupErrors.turnstile}</p>
                  )}

                  {/* Terms and Privacy Policy */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="text-xs text-center text-gray-500"
                  >
                    By creating an account, you agree to our{' '}
                    <Link href="/terms" className="text-primary hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-primary hover:underline">
                      Privacy Policy
                    </Link>
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="submit"
                      disabled={isSigningUp}
                      className="w-full h-11 sm:h-12 text-sm sm:text-base font-medium"
                      size="lg"
                    >
                      {isSigningUp ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        <>
                          Create Account & Join
                          <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                        </>
                      )}
                    </Button>
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45 }}
                    className="text-xs text-center text-gray-500"
                  >
                    Already have an account?{' '}
                    <Link
                      href={`/login?redirect=/join?token=${token}`}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign in instead
                    </Link>
                  </motion.p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-white/50 text-xs mt-6"
          >
            Powered by StewardTrack
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 px-4">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
            <p className="text-white/70 text-sm">Loading...</p>
          </div>
        </div>
      }
    >
      <InvitationAcceptanceContent />
    </Suspense>
  );
}
