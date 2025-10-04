'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { ProductOffering } from '@/models/productOffering.model';

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const offeringId = searchParams.get('offering');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    churchName: '',
    firstName: '',
    lastName: '',
  });

  const [selectedOffering, setSelectedOffering] = useState<ProductOffering | null>(null);
  const [isLoadingOffering, setIsLoadingOffering] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (offeringId) {
      loadOffering(offeringId);
    } else {
      setIsLoadingOffering(false);
      toast.error('No plan selected. Redirecting to signup...');
      setTimeout(() => router.push('/signup'), 2000);
    }
  }, [offeringId, router]);

  async function loadOffering(id: string) {
    try {
      const response = await fetch(`/api/licensing/product-offerings/${id}`);
      const result = await response.json();

      if (result.success && result.data) {
        setSelectedOffering(result.data);
      } else {
        toast.error('Failed to load selected plan');
        router.push('/signup');
      }
    } catch (error) {
      console.error('Error loading offering:', error);
      toast.error('Failed to load selected plan');
      router.push('/signup');
    } finally {
      setIsLoadingOffering(false);
    }
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Church name validation
    if (!formData.churchName || formData.churchName.trim().length === 0) {
      newErrors.churchName = 'Church name is required';
    }

    // First name validation
    if (!formData.firstName || formData.firstName.trim().length === 0) {
      newErrors.firstName = 'First name is required';
    }

    // Last name validation
    if (!formData.lastName || formData.lastName.trim().length === 0) {
      newErrors.lastName = 'Last name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please correct the errors in the form');
      return;
    }

    if (!offeringId) {
      toast.error('No plan selected');
      return;
    }

    setIsRegistering(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          offeringId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Registration successful! Redirecting to onboarding...');
        router.push('/onboarding');
      } else {
        toast.error(result.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed. Please try again.');
    } finally {
      setIsRegistering(false);
    }
  }

  function handleInputChange(field: string, value: string) {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  }

  function formatPrice(offering: ProductOffering): string {
    if (!offering.base_price || offering.base_price === 0) {
      return 'Free';
    }

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: offering.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

    return formatter.format(offering.base_price);
  }

  if (isLoadingOffering) {
    return (
      <div className="container max-w-md mx-auto px-4 py-12">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-foreground">
          Create Your Account
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Get started with StewardTrack in just a few steps
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Registration Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Fill in your details to create your church account
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Church Name */}
              <div className="space-y-2">
                <Label htmlFor="churchName">
                  Church Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="churchName"
                  type="text"
                  placeholder="First Community Church"
                  value={formData.churchName}
                  onChange={(e) => handleInputChange('churchName', e.target.value)}
                  disabled={isRegistering}
                  className={errors.churchName ? 'border-destructive' : ''}
                />
                {errors.churchName && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.churchName}
                  </p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* First Name */}
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={isRegistering}
                    className={errors.firstName ? 'border-destructive' : ''}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.firstName}
                    </p>
                  )}
                </div>

                {/* Last Name */}
                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={isRegistering}
                    className={errors.lastName ? 'border-destructive' : ''}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={isRegistering}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  disabled={isRegistering}
                  className={errors.password ? 'border-destructive' : ''}
                />
                {errors.password && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  disabled={isRegistering}
                  className={errors.confirmPassword ? 'border-destructive' : ''}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isRegistering}
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Create Account
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground pt-2">
                By creating an account, you agree to our{' '}
                <a href="/terms" className="underline hover:text-foreground">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="underline hover:text-foreground">
                  Privacy Policy
                </a>
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Selected Plan Summary */}
        {selectedOffering && (
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="text-lg">Your Plan</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground capitalize mb-1">
                  {selectedOffering.tier}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-foreground">
                    {formatPrice(selectedOffering)}
                  </span>
                  {selectedOffering.base_price && selectedOffering.base_price > 0 && (
                    <span className="text-sm text-muted-foreground">
                      /{selectedOffering.billing_cycle}
                    </span>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Includes:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {selectedOffering.max_users ? (
                    <li>Up to {selectedOffering.max_users} users</li>
                  ) : (
                    <li>Unlimited users</li>
                  )}
                  {selectedOffering.offering_type === 'trial' && (
                    <li>30-day trial period</li>
                  )}
                  <li>Full access to features</li>
                  <li>Email support</li>
                </ul>
              </div>

              {selectedOffering.offering_type !== 'trial' && (
                <>
                  <Separator />
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      30-day money-back guarantee. Cancel anytime.
                    </p>
                  </div>
                </>
              )}
            </CardContent>

            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/signup')}
                disabled={isRegistering}
              >
                Change Plan
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="container max-w-md mx-auto px-4 py-12">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    }>
      <RegisterFormContent />
    </Suspense>
  );
}
